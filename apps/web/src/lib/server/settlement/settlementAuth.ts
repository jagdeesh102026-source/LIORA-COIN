/**
 * LIORA COIN — Server-Side Settlement Authorization & Role Enforcement (Sprint 3D)
 *
 * Implements Task 2 (SEC-02):
 * - Eliminates authorization based solely on raw headers (x-investor-wallet, x-liora-treasury-auth).
 * - Requires either an authenticated server session (liora_session cookie) OR
 *   a cryptographically verified wallet signature (EIP-4361 SIWE challenge with single-use nonce).
 * - Enforces server-side identity validation with verified wallet bindings in serverDb.
 * - Strict separation of Investor vs. Treasury Owner/Admin privileges.
 * - Fails closed: Rejects any unverified, expired, or spoofed request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { getAuthenticatedUser, requireAdmin } from '../adminAuth';
import { AUTHORIZED_TREASURY_WALLET } from '../../treasury/treasuryAccountingEngine';
import { serverDb } from '../db';

export interface SettlementAuthResult {
  authorized: boolean;
  actorAddress?: string;
  role?: 'ADMIN' | 'INVESTOR' | 'SYSTEM';
  userId?: string;
  response?: NextResponse;
}

/**
 * Cryptographically verifies wallet ownership using EIP-4361 challenge headers and a single-use nonce.
 */
async function verifyCryptographicWalletChallenge(
  req: NextRequest,
  expectedAddress: string
): Promise<{ valid: boolean; error?: string }> {
  const addressHeader = req.headers.get('x-wallet-address');
  const signatureHeader = req.headers.get('x-wallet-signature');
  const nonceHeader = req.headers.get('x-wallet-nonce');
  const messageHeader = req.headers.get('x-wallet-message');

  if (!addressHeader || !signatureHeader || !nonceHeader || !messageHeader) {
    return { valid: false, error: 'MISSING_CRYPTO_AUTH_HEADERS' };
  }

  const cleanAddr = addressHeader.trim().toLowerCase();
  const cleanExpected = expectedAddress.trim().toLowerCase();
  if (cleanAddr !== cleanExpected) {
    return { valid: false, error: 'SIGNER_ADDRESS_MISMATCH' };
  }

  // 1. Consume and validate single-use nonce (replay protection)
  const isNonceValid = await serverDb.consumeNonce(nonceHeader.trim(), cleanAddr);
  if (!isNonceValid) {
    return { valid: false, error: 'INVALID_OR_EXPIRED_NONCE' };
  }

  // 2. Validate challenge message contents
  if (!messageHeader.includes(nonceHeader.trim())) {
    return { valid: false, error: 'CHALLENGE_NONCE_MISMATCH' };
  }
  if (!messageHeader.toLowerCase().includes(cleanAddr)) {
    return { valid: false, error: 'CHALLENGE_ADDRESS_MISMATCH' };
  }

  // 3. Cryptographic signature verification via viem
  try {
    const isValid = await verifyMessage({
      address: cleanAddr as `0x${string}`,
      message: messageHeader,
      signature: signatureHeader.trim() as `0x${string}`,
    });
    if (!isValid) {
      return { valid: false, error: 'CRYPTOGRAPHIC_SIGNATURE_INVALID' };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `SIGNATURE_VERIFICATION_EXCEPTION: ${err.message || err}` };
  }
}

/**
 * Validates that the request is made by an authorized administrator or treasury wallet.
 * Strictly prohibits header-only spoofing (SEC-02).
 */
export async function requireSettlementAdmin(req: NextRequest): Promise<SettlementAuthResult> {
  // 1. Check standard admin session cookie/header
  const adminCheck = await requireAdmin(req);
  if (adminCheck.authorized && adminCheck.user) {
    return {
      authorized: true,
      actorAddress: AUTHORIZED_TREASURY_WALLET,
      role: 'ADMIN',
      userId: adminCheck.user.id,
    };
  }

  // 2. Check cryptographically signed treasury challenge
  const cryptoCheck = await verifyCryptographicWalletChallenge(req, AUTHORIZED_TREASURY_WALLET);
  if (cryptoCheck.valid) {
    return {
      authorized: true,
      actorAddress: AUTHORIZED_TREASURY_WALLET,
      role: 'ADMIN',
    };
  }

  // Fail closed: Unverified x-liora-treasury-auth or other headers are strictly rejected
  return {
    authorized: false,
    response: NextResponse.json(
      {
        success: false,
        error: 'UNAUTHORIZED_SETTLEMENT_ADMIN',
        message: 'This operation requires authorized Grandiose Tech treasury administrative privileges. A cryptographically signed challenge or verified administrator session is required.',
      },
      { status: 403 }
    ),
  };
}

/**
 * Validates that the request is made by the designated investor or an administrator.
 * Strictly prohibits header-only spoofing (SEC-02).
 */
export async function requireSettlementInvestor(
  req: NextRequest,
  expectedInvestorAddress: string
): Promise<SettlementAuthResult> {
  const cleanExpected = expectedInvestorAddress.trim().toLowerCase();

  // 1. Admin override: admins can view/audit any investor record
  const adminCheck = await requireSettlementAdmin(req);
  if (adminCheck.authorized) {
    return {
      authorized: true,
      actorAddress: adminCheck.actorAddress,
      role: 'ADMIN',
      userId: adminCheck.userId,
    };
  }

  // 2. Check authenticated user session
  const auth = await getAuthenticatedUser(req);
  if (auth && auth.user) {
    // Check if user has a verified wallet matching the investor address
    const wallets = await serverDb.getWalletsByUserId(auth.user.id);
    const hasMatchingWallet = wallets.some(
      (w: { walletAddress: string }) => w.walletAddress.toLowerCase() === cleanExpected
    );

    if (hasMatchingWallet) {
      return {
        authorized: true,
        actorAddress: cleanExpected,
        role: 'INVESTOR',
        userId: auth.user.id,
      };
    }
  }

  // 3. Check cryptographically signed investor challenge
  const cryptoCheck = await verifyCryptographicWalletChallenge(req, cleanExpected);
  if (cryptoCheck.valid) {
    return {
      authorized: true,
      actorAddress: cleanExpected,
      role: 'INVESTOR',
    };
  }

  // Fail closed: Raw client-supplied headers without cryptographic proof are strictly rejected
  return {
    authorized: false,
    response: NextResponse.json(
      {
        success: false,
        error: 'UNAUTHORIZED_INVESTOR_ACCESS',
        message: `Caller is not authorized to access or modify records for wallet ${expectedInvestorAddress}. A valid cryptographic signature challenge or authenticated user session is required.`,
      },
      { status: 403 }
    ),
  };
}
