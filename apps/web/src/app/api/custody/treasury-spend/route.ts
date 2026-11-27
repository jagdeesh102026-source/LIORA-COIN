import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CustodialAllocationLedger } from '@/lib/custody/custodialAllocationLedger';
import { requireSettlementAdmin } from '@/lib/server/settlement/settlementAuth';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';
import { validateCsrfProtection } from '@/lib/server/adminAuth';

export const dynamic = 'force-dynamic';

const treasurySpendSchema = z.object({
  spendAmountBaseUnits: z.string().min(1),
  recipientAddress: z.string().startsWith('0x').length(42),
  purpose: z.string().min(3),
});

/**
 * POST /api/custody/treasury-spend
 * Admin-only operation to execute treasury spends (e.g. pool liquidity, operations).
 * INVIOLABLE ACCOUNTING GUARD: Strictly blocked if spend touches tokens reserved for investor custodial allocations.
 */
export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrfProtection(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ success: false, error: 'CSRF_REJECTED', message: csrfCheck.reason }, { status: 403 });
    }

    if (process.env.NODE_ENV === 'production' || process.env.OXENIQ_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'TREASURY_SPEND_DISABLED', message: 'Custodial treasury spend execution is disabled in production.' },
        { status: 403 }
      );
    }

    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    const adminAuth = await requireSettlementAdmin(req);
    if (!adminAuth.authorized) {
      return adminAuth.response!;
    }

    const body = await req.json();
    const parsed = treasurySpendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await CustodialAllocationLedger.executeTreasurySpend({
      spendAmountBaseUnits: parsed.data.spendAmountBaseUnits,
      recipientAddress: parsed.data.recipientAddress,
      purpose: parsed.data.purpose,
      authorizedBy: adminAuth.actorAddress!,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, code: 'INSUFFICIENT_UNRESERVED_TREASURY_BALANCE' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      remainingFreeBaseUnits: result.remainingFreeBaseUnits,
      message: 'Treasury spend executed successfully from unrestricted free balance.',
      isSandboxSimulation: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'SERVER_EXCEPTION', message: err.message },
      { status: 500 }
    );
  }
}
