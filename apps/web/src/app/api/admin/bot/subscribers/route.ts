import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/adminAuth';

export async function GET(req: NextRequest) {
  try {
    // Enforce strict administrative authorization
    const adminAuth = await requireAdmin(req);
    if (!adminAuth.authorized) {
      return adminAuth.response!;
    }

    const { subscriptions, trials } = await serverDb.getAllSubscribers();
    const plans = await serverDb.getPlans();

    return NextResponse.json({
      success: true,
      subscribersCount: subscriptions.length,
      trialsCount: trials.length,
      activeTrials: trials.filter((t) => !t.isRevoked && new Date(t.expiresAt).getTime() > Date.now()),
      expiredTrials: trials.filter((t) => new Date(t.expiresAt).getTime() <= Date.now()),
      activeSubscriptions: subscriptions.filter((s) => s.status === 'ACTIVE_PAID' && !s.isRevoked),
      expiredSubscriptions: subscriptions.filter((s) => s.status === 'EXPIRED'),
      revokedSubscriptions: subscriptions.filter((s) => s.status === 'REVOKED'),
      subscriptions,
      trials,
      plans,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
