import { NextRequest, NextResponse } from 'next/server';
import { CustodialAllocationLedger } from '@/lib/custody/custodialAllocationLedger';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/custody/treasury-balance
 * Returns the double-entry breakdown of company treasury holdings:
 * 1. Initial Minted Supply: 1,000,000,000 LIORA
 * 2. Maximum Supply Cap: 100,000,000,000 LIORA
 * 3. Total Holdings
 * 4. Reserved Investor Custodial Allocations (Protected)
 * 5. Unrestricted Free Balance (Available for treasury spend)
 */
export async function GET(req: NextRequest) {
  try {
    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    const balance = await CustodialAllocationLedger.getTreasuryCustodyBalance();

    return NextResponse.json({
      success: true,
      balance,
      custodyArchitecture: 'OPTION_A_COMPANY_CONTROLLED',
      disclaimer: 'Reserved custodial allocations are mathematically locked and cannot be spent by unrestricted treasury operations.',
      isSandboxSimulation: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'SERVER_EXCEPTION', message: err.message },
      { status: 500 }
    );
  }
}
