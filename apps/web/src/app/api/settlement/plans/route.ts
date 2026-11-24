import { NextRequest, NextResponse } from 'next/server';
import {
  CONFIRMED_INVESTMENT_PLANS,
  ProportionalAllocationEngine,
} from '@/lib/allocation/proportionalAllocationEngine';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settlement/plans
 * Returns the 6 approved investment plans from Checklist (3)
 */
export async function GET(req: NextRequest) {
  try {
    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    const plans = ProportionalAllocationEngine.getAllPlans();

    return NextResponse.json({
      success: true,
      plans,
      totalPlans: plans.length,
      isSandboxSimulation: true,
      sourceDocument: 'LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'FAILED_TO_LOAD_PLANS', message: err.message },
      { status: 500 }
    );
  }
}
