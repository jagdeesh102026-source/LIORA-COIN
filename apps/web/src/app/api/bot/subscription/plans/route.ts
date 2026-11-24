import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/server/db';

export async function GET() {
  try {
    const plans = await serverDb.getPlans();
    return NextResponse.json({
      success: true,
      plans,
      disclaimer: 'All listed prices and tiers are illustrative demonstration benchmarks pending final executive governance approval.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error fetching plans' }, { status: 500 });
  }
}

