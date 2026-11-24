import { NextResponse } from 'next/server';
import { LioraPricingScheduleService } from '@/lib/pricing/lioraPricingSchedule';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pricing/reference-price
 * Public read-only endpoint returning the current scheduled reference price.
 * Non-binding benchmark distinct from live DEX market quotes.
 */
export async function GET() {
  try {
    const status = await LioraPricingScheduleService.getScheduleStatus();
    return NextResponse.json(status, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'FAILED_TO_LOAD_PRICING_SCHEDULE', details: error.message },
      { status: 500 }
    );
  }
}
