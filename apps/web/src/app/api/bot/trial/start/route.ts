import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';
import { getTradingBotAccess } from '@/lib/server/entitlementService';
import { getAuthenticatedUser, validateCsrfProtection } from '@/lib/server/adminAuth';

const startTrialSchema = z.object({
  userId: z.string().optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrfProtection(req);
    if (!csrfCheck.valid) {
      return NextResponse.json(
        { error: 'CSRF_REJECTED', message: csrfCheck.reason },
        { status: 403 }
      );
    }

    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required to activate a trading bot trial.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = startTrialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId: requestedUserId, walletAddress } = parsed.data;
    if (requestedUserId && requestedUserId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'FORBIDDEN_IDENTITY_SPOOFING', message: 'Cannot activate trials on behalf of another user account.' },
        { status: 403 }
      );
    }

    const user = auth.user;
    const cleanAddr = walletAddress.toLowerCase();

    if (user.accountStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Account is not active (${user.accountStatus})` },
        { status: 403 }
      );
    }

    // 2. Strict Anti-Abuse: Check User account trial record
    const existingUserTrial = await serverDb.getTrialByUserId(user.id);
    if (existingUserTrial) {
      return NextResponse.json(
        {
          error: 'TRIAL_ALREADY_USED',
          message: 'This user account has already redeemed the 48-Hour Free Trial.',
          trial: {
            startedAt: existingUserTrial.startedAt,
            expiresAt: existingUserTrial.expiresAt,
            isExpired: new Date(existingUserTrial.expiresAt).getTime() <= Date.now(),
          },
        },
        { status: 409 }
      );
    }

    // 3. Strict Sybil Anti-Abuse: Check Wallet address trial record across ALL user accounts
    const existingWalletTrial = await serverDb.getTrialByWallet(cleanAddr);
    if (existingWalletTrial) {
      return NextResponse.json(
        {
          error: 'WALLET_ALREADY_USED',
          message: 'This wallet address has already been used to redeem a 48-Hour Free Trial on another account.',
          trial: {
            startedAt: existingWalletTrial.startedAt,
            expiresAt: existingWalletTrial.expiresAt,
            isExpired: new Date(existingWalletTrial.expiresAt).getTime() <= Date.now(),
          },
        },
        { status: 409 }
      );
    }

    // 4. Verify wallet ownership (do not allow claiming wallets linked to other users; require verified wallet in production)
    const verifiedWallet = await serverDb.getVerifiedWallet(cleanAddr);
    if (verifiedWallet && verifiedWallet.userId !== user.id) {
      return NextResponse.json(
        {
          error: 'WALLET_OWNERSHIP_CONFLICT',
          message: 'This wallet address is already linked to a different user account.',
        },
        { status: 403 }
      );
    }

    if (!verifiedWallet) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          {
            error: 'WALLET_NOT_VERIFIED',
            message: 'Please cryptographically verify wallet ownership via signature challenge before activating a trial.',
          },
          { status: 403 }
        );
      }

      // Isolated local dev/test convenience binding only (non-production)
      await serverDb.linkVerifiedWallet({
        walletAddress: cleanAddr,
        userId: user.id,
        chainId: 97,
        signatureProof: 'pre_verified_trial_session',
        nonceChallenge: 'auto_challenge',
      });
    }

    // 5. Atomic Trial Creation with Server Time (Exactly 48 Hours)
    const trial = await serverDb.activateTrial(user.id, cleanAddr, 48);

    // 6. Fetch authoritative entitlement status
    const access = await getTradingBotAccess(user.id, cleanAddr);

    return NextResponse.json({
      success: true,
      message: '48-Hour Free Trial successfully activated! Welcome to ALGOX V6_1_24 Trading Desk.',
      trial: {
        id: trial.id,
        startedAt: trial.startedAt,
        expiresAt: trial.expiresAt,
        durationHours: trial.durationHours,
      },
      access,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('already')) {
      return NextResponse.json({ error: 'TRIAL_CONFLICT', message: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Internal server error activating trial' }, { status: 500 });
  }
}

