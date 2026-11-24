import { NextRequest, NextResponse } from 'next/server';
import { CustodialAllocationLedger } from '@/lib/custody/custodialAllocationLedger';
import { requireSettlementInvestor, requireSettlementAdmin } from '@/lib/server/settlement/settlementAuth';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';
import { getAuthenticatedUser } from '@/lib/server/adminAuth';
import { serverDb } from '@/lib/server/db';
import { LioraPricingScheduleService } from '@/lib/pricing/lioraPricingSchedule';

export const dynamic = 'force-dynamic';

/**
 * GET /api/custody/allocations
 * Returns custodial allocation records, confirmed balances, and pending purchase requests.
 * Automatically derives investor identity from authenticated session (SEC-01 / Option A).
 */
export async function GET(req: NextRequest) {
  try {
    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    let targetAddress = searchParams.get('address');
    const showAll = searchParams.get('all') === 'true';

    // Check if caller is authenticated admin
    const adminCheck = await requireSettlementAdmin(req);
    const isAdmin = adminCheck.authorized;

    // If admin explicitly requests all records
    if (isAdmin && (showAll || targetAddress === 'all')) {
      await CustodialAllocationLedger.initialize();
      const allRecords = Array.from(CustodialAllocationLedger.cachedAllocations.values());

      return NextResponse.json({
        success: true,
        scope: 'ALL_INVESTORS_ADMIN',
        totalCount: allRecords.length,
        custodialAllocations: allRecords,
        custodyModel: 'COMPANY_CONTROLLED_CUSTODY_OPTION_A',
      });
    }

    // 1. Derive investor identity from session if address is omitted
    if (!targetAddress) {
      const auth = await getAuthenticatedUser(req);
      if (!auth || !auth.user) {
        return NextResponse.json(
          {
            success: false,
            error: 'AUTHENTICATION_REQUIRED',
            message: 'You must be logged in to view your custodial token allocations.',
          },
          { status: 401 }
        );
      }

      const wallets = await serverDb.getWalletsByUserId(auth.user.id);
      if (!wallets || wallets.length === 0) {
        return NextResponse.json({
          success: true,
          investorAddress: null,
          totalConfirmedLIORA: 0,
          totalConfirmedTokensFormatted: '0',
          totalPendingLIORA: 0,
          totalPendingTokensFormatted: '0',
          totalPurchaseINR: 0,
          totalPurchaseUSD: 0,
          currentReferencePriceINR: '0.20',
          illustrativeValueINR: '0.00',
          illustrativeValueLabel: 'Illustrative Indicative Value (Non-guaranteed internal benchmark)',
          disclaimer: 'Custodial LIORA allocations are held in company treasury custody on behalf of the investor against agreed contractual cash settlement. Direct token withdrawals and transfers are disabled.',
          custodialAllocations: [],
          confirmedAllocations: [],
          pendingAllocations: [],
          rejectedAllocations: [],
        });
      }

      targetAddress = wallets[0].walletAddress;
    }

    // 2. Server-side authorization check: caller must be target investor or admin
    const auth = await requireSettlementInvestor(req, targetAddress);
    if (!auth.authorized) {
      return auth.response!;
    }

    // Fetch persisted allocations from PostgreSQL
    const records = await CustodialAllocationLedger.getInvestorAllocations(targetAddress);

    // Fetch current scheduled reference price
    let currentRefPriceINR = '0.20';
    try {
      const pricing = await LioraPricingScheduleService.getScheduleStatus();
      currentRefPriceINR = pricing.priceINR;
    } catch {
      currentRefPriceINR = '0.20';
    }
    const currentPriceNum = parseFloat(currentRefPriceINR) || 0.20;

    // Partition records into Confirmed, Pending, and Rejected
    const confirmedAllocations: any[] = [];
    const pendingAllocations: any[] = [];
    const rejectedAllocations: any[] = [];

    let totalConfirmedAtomic = 0n;
    let totalPendingAtomic = 0n;
    let totalPurchaseINR = 0;
    let totalPurchaseUSD = 0;

    for (const rec of records) {
      const atomicUnits = BigInt(rec.allocatedTokensBaseUnits || '0');
      if (
        rec.status === 'ACTIVE_CUSTODIAL_ALLOCATION' ||
        rec.status === 'PAYMENT_INDEPENDENTLY_VERIFIED' ||
        rec.status === 'MATURED_AWAITING_PAYOUT' ||
        rec.status === 'SETTLEMENT_COMPLETED'
      ) {
        confirmedAllocations.push(rec);
        totalConfirmedAtomic += atomicUnits;
        totalPurchaseINR += rec.principalINR || 0;
        totalPurchaseUSD += rec.principalUSD || 0;
      } else if (rec.status === 'PENDING_PAYMENT_VERIFICATION') {
        pendingAllocations.push(rec);
        totalPendingAtomic += atomicUnits;
      } else if (rec.status === 'REJECTED' || rec.status === 'CANCELLED') {
        rejectedAllocations.push(rec);
      }
    }

    const totalConfirmedLIORA = Number(totalConfirmedAtomic / 10n ** 18n);
    const totalPendingLIORA = Number(totalPendingAtomic / 10n ** 18n);
    const illustrativeValueINR = (totalConfirmedLIORA * currentPriceNum).toFixed(2);

    return NextResponse.json({
      success: true,
      investorAddress: targetAddress.toLowerCase(),
      totalConfirmedLIORA,
      totalConfirmedTokensFormatted: totalConfirmedLIORA.toLocaleString('en-US'),
      totalPendingLIORA,
      totalPendingTokensFormatted: totalPendingLIORA.toLocaleString('en-US'),
      totalPurchaseINR,
      totalPurchaseUSD,
      currentReferencePriceINR: currentRefPriceINR,
      illustrativeValueINR,
      illustrativeValueLabel: 'Illustrative Indicative Value (Non-guaranteed internal benchmark)',
      disclaimer: 'Custodial LIORA allocations are held in company treasury custody on behalf of the investor against agreed contractual cash settlement. Direct token withdrawals and transfers are disabled.',
      custodialAllocations: records,
      confirmedAllocations,
      pendingAllocations,
      rejectedAllocations,
      totalCount: records.length,
      custodyModel: 'COMPANY_CONTROLLED_CUSTODY_OPTION_A',
      isSandboxSimulation: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'SERVER_EXCEPTION', message: err.message },
      { status: 500 }
    );
  }
}
