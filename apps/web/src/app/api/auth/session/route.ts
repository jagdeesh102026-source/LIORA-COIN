import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server/db';
import { getSessionTokenFromRequest } from '@/lib/server/adminAuth';

export async function GET(req: NextRequest) {
  try {
    const sessionToken = getSessionTokenFromRequest(req);

    if (!sessionToken) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        wallets: []
      });
    }

    const session = await serverDb.getSession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: 'Session expired or revoked', user: null, wallets: [] },
        { status: 401 }
      );
    }

    const user = await serverDb.findUserById(session.userId);
    if (!user || user.accountStatus !== 'ACTIVE') {
      return NextResponse.json(
        { authenticated: false, error: 'User not found or account inactive', user: null, wallets: [] },
        { status: 403 }
      );
    }

    const isProdOrStaging =
      process.env.NODE_ENV === 'production' ||
      process.env.STAGING === 'true' ||
      process.env.OXENIQ_ENV === 'production' ||
      process.env.OXENIQ_ENV === 'staging';

    if (user.isDevelopmentOnly && isProdOrStaging) {
      return NextResponse.json(
        { authenticated: false, error: 'DEVELOPMENT_ACCOUNT_PROHIBITED', user: null, wallets: [] },
        { status: 403 }
      );
    }

    const wallets = await serverDb.getWalletsByUserId(user.id);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        accountStatus: user.accountStatus
      },
      wallets: wallets.map((w) => ({
        address: w.walletAddress,
        chainId: w.chainId,
        verifiedAt: w.verifiedAt,
        isPrimary: w.isPrimary
      })),
      session: {
        sessionId: session.sessionIdentifier,
        expiresAt: session.expiresAt
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
