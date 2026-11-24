import { NextRequest, NextResponse } from 'next/server';
import { LioraPricingScheduleService } from '@/lib/pricing/lioraPricingSchedule';
import { requireSettlementAdmin } from '@/lib/server/settlement/settlementAuth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pricing/configure
 * Protected administrative route to configure or activate the reference price schedule.
 */
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireSettlementAdmin(req);
    if (!adminAuth.authorized) {
      return (
        adminAuth.response ||
        NextResponse.json({ error: 'FORBIDDEN: Requires administrator role.' }, { status: 403 })
      );
    }

    const body = await req.json();
    const { activationTimestamp, isActivated } = body;

    let parsedDate: Date | null = null;
    if (activationTimestamp) {
      parsedDate = new Date(activationTimestamp);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'INVALID_TIMESTAMP: Could not parse activation timestamp.' },
          { status: 400 }
        );
      }
    }

    const updated = await LioraPricingScheduleService.configureSchedule({
      activationTimestamp: parsedDate,
      isActivated: typeof isActivated === 'boolean' ? isActivated : undefined,
      configuredBy: adminAuth.actorAddress || adminAuth.userId || 'ADMIN',
    });

    return NextResponse.json({ success: true, schedule: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'CONFIGURATION_ERROR', details: error.message },
      { status: 500 }
    );
  }
}
