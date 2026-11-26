import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyMessage } from 'viem';
import { serverDb } from '@/lib/server/db';
import {
  getSessionTokenFromRequest,
  SESSION_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME
} from '@/lib/server/adminAuth';

const verifyWalletSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'),
  signature: z.string().min(10, 'Signature is required'),
  nonce: z.string().min(8, 'Nonce is required'),
  message: z.string().min(10, 'Challenge message is required'),
  chainId: z.number().int().positive().optional().default(97)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifyWalletSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { address, signature, nonce, message, chainId } = parsed.data;
    const cleanAddr = address.toLowerCase();

    // 0. Chain ID Validation: Restrict to authorized networks
    const isProd = process.env.NODE_ENV === 'production';
    const allowedChains = isProd ? [56] : [56, 97, 31337];
    if (!allowedChains.includes(chainId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNSUPPORTED_CHAIN_ID',
          message: isProd
            ? `Network chainId ${chainId} is not authorized in production. Authorized: 56 (BNB Smart Chain Mainnet).`
            : `Network chainId ${chainId} is not authorized for authentication. Authorized: 56 (BSC Mainnet), 97 (BSC Testnet), 31337 (Local Devnet).`
        },
        { status: 400 }
      );
    }

    // 1. Consume & Validate Single-Use Nonce (Replay Protection)
    const isNonceValid = await serverDb.consumeNonce(nonce, cleanAddr);
    if (!isNonceValid) {
      await serverDb.createAuditLog({
        action: 'WALLET_AUTH_FAILED_NONCE_INVALID',
        entity: 'VerifiedWallet',
        metadata: { address: cleanAddr, nonce }
      });

      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_NONCE',
          message: 'Invalid, reused, or expired authentication nonce. Please request a fresh challenge.'
        },
        { status: 401 }
      );
    }

    // 2. Validate SIWE Message Contents
    if (!message.includes(nonce)) {
      return NextResponse.json(
        { success: false, error: 'MALFORMED_CHALLENGE', message: 'Challenge message does not contain requested nonce.' },
        { status: 400 }
      );
    }

    if (!message.toLowerCase().includes(cleanAddr)) {
      return NextResponse.json(
        { success: false, error: 'ADDRESS_MISMATCH', message: 'Challenge message does not match signing address.' },
        { status: 400 }
      );
    }

    // 3. Cryptographic Signature Verification (Strict OpenZeppelin / viem Standards)
    // Production Security Guard: Mock signatures are strictly prohibited
    let isSignatureValid = false;
    try {
      isSignatureValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`
      });
    } catch (sigErr: any) {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      await serverDb.createAuditLog({
        action: 'WALLET_AUTH_FAILED_SIGNATURE_INVALID',
        entity: 'VerifiedWallet',
        metadata: { address: cleanAddr }
      });

      return NextResponse.json(
        {
          success: false,
          error: 'CRYPTOGRAPHIC_VERIFICATION_FAILED',
          message: 'Cryptographic signature verification failed. The provided signature does not match the signer address.'
        },
        { status: 401 }
      );
    }

    // 4. Resolve User Identity Safely (No Client-Controlled Identity Spoofing)
    // Check if an existing authenticated session is linking this wallet
    const existingSessionToken = getSessionTokenFromRequest(req);
    let resolvedUser = null;

    if (existingSessionToken) {
      const activeSession = await serverDb.getSession(existingSessionToken);
      if (activeSession) {
        resolvedUser = await serverDb.findUserById(activeSession.userId);
      }
    }

    // If not linking from an active session, check if wallet is already bound to an existing user
    if (!resolvedUser) {
      const existingWalletRecord = await serverDb.getVerifiedWallet(cleanAddr);
      if (existingWalletRecord) {
        resolvedUser = await serverDb.findUserById(existingWalletRecord.userId);
      }
    }

    // If still no user exists, create a new User account safely bound to this wallet
    if (!resolvedUser) {
      const shortAddr = cleanAddr.slice(2, 8);
      resolvedUser = await serverDb.createUser({
        username: `trader_${shortAddr}`,
        email: null,
        passwordHash: null,
        role: 'TRADER',
        accountStatus: 'ACTIVE'
      });
    }

    // 5. Link Verified Wallet Record
    let verifiedWallet;
    try {
      verifiedWallet = await serverDb.linkVerifiedWallet({
        walletAddress: cleanAddr,
        userId: resolvedUser.id,
        chainId,
        signatureProof: signature,
        nonceChallenge: nonce
      });
    } catch (linkErr: any) {
      return NextResponse.json(
        { success: false, error: 'WALLET_LINK_CONFLICT', message: linkErr.message },
        { status: 409 }
      );
    }

    // 6. Prevent Session Fixation: Revoke any existing session and generate fresh high-entropy session
    if (existingSessionToken) {
      await serverDb.revokeSession(existingSessionToken, 'SESSION_REGENERATION');
    }

    const session = await serverDb.createSession(
      resolvedUser.id,
      24,
      req.headers.get('x-forwarded-for') || '127.0.0.1'
    );

    await serverDb.createAuditLog({
      actorId: resolvedUser.id,
      action: 'WALLET_AUTHENTICATED',
      entity: 'VerifiedWallet',
      entityId: verifiedWallet.id,
      metadata: { walletAddress: cleanAddr, chainId }
    });

    const response = NextResponse.json({
      success: true,
      message: 'Wallet successfully authenticated and linked.',
      user: {
        id: resolvedUser.id,
        username: resolvedUser.username,
        role: resolvedUser.role
      },
      verifiedWallet: {
        address: verifiedWallet.walletAddress,
        chainId: verifiedWallet.chainId,
        verifiedAt: verifiedWallet.verifiedAt
      },
      session: {
        sessionId: session.sessionIdentifier,
        expiresAt: session.expiresAt
      }
    });

    // Set secure HttpOnly cookies (both primary and legacy for backwards compatibility)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 24 * 3600
    };

    response.cookies.set(SESSION_COOKIE_NAME, session.sessionIdentifier, cookieOptions);
    response.cookies.set(LEGACY_SESSION_COOKIE_NAME, session.sessionIdentifier, cookieOptions);

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during wallet verification' },
      { status: 500 }
    );
  }
}
