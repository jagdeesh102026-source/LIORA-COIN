import { NextRequest, NextResponse } from 'next/server';
import { getTradingBotAccess } from '@/lib/server/entitlementService';
import { serverDb } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionCookie = req.cookies.get('liora_bot_session')?.value;
    let userId = searchParams.get('userId');
    const walletAddress = searchParams.get('walletAddress');

    // If session cookie is provided, resolve userId from session
    if (sessionCookie) {
      const session = await serverDb.getSession(sessionCookie);
      if (session) {
        userId = session.userId;
      }
    }

    // Fallback to default demo user if unauthenticated demo visit
    if (!userId) {
      userId = 'usr_alex_001';
    }

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

