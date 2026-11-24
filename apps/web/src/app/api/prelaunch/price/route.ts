import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const timeParam = searchParams.get('serverTimeMs');
    const serverTimeMs = timeParam ? parseInt(timeParam, 10) : Date.now();

    const priceResult = await serverDb.getCurrentPrelaunchPrice(serverTimeMs);
    const config = await serverDb.getPrelaunchConfig();

    return NextResponse.json({
      success: true,
      priceResult,
      config: {
        enabled: config.enabled,
        status: config.status,
        durationDays: config.durationDays,
        pricingModel: config.pricingModel,
        updateMode: config.updateMode,
        startTimeUTC: config.startTimeUTC,
        lockedInrPerUsd: config.lockedInrPerUsd,
        fxRateSource: config.fxRateSource,
        version: config.version,
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate pre-launch price' },
      { status: 500 }
    );
  }
}

