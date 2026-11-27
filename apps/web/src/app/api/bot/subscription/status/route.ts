import { NextRequest, NextResponse } from 'next/server';
import { getTradingBotAccess } from '@/lib/server/entitlementService';
import { serverDb } from '@/lib/server/db';
import { getAuthenticatedUser } from '@/lib/server/adminAuth';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication session required to inspect subscription status.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');
    const walletAddress = searchParams.get('walletAddress');

    if (requestedUserId && requestedUserId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'FORBIDDEN_IDENTITY_SPOOFING', message: 'Cannot inspect subscription status for another user.' },
        { status: 403 }
      );
    }

    const userId = requestedUserId && auth.user.role === 'ADMIN' ? requestedUserId : auth.user.id;

    const access = await getTradingBotAccess(userId, walletAddress);
    const trialRecord = await serverDb.getTrialByUserId(userId);
    const subRecord = await serverDb.getSubscriptionByUserId(userId);

    return NextResponse.json({
      success: true,
      serverTime: new Date().toISOString(),
      access,
      trial: trialRecord
        ? {
            id: trialRecord.id,
            startedAt: trialRecord.startedAt,
            expiresAt: trialRecord.expiresAt,
            durationHours: trialRecord.durationHours,
            trialUsed: trialRecord.trialUsed,
            isRevoked: trialRecord.isRevoked,
          }
        : null,
      subscription: subRecord
        ? {
            id: subRecord.id,
            planId: subRecord.planId,
            status: subRecord.status,
            startsAt: subRecord.startsAt,
            expiresAt: subRecord.expiresAt,
            autoRenew: subRecord.autoRenew,
            isRevoked: subRecord.isRevoked,
          }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error checking bot access' }, { status: 500 });
  }
}

