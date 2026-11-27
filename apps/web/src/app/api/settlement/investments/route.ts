import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';
import { requireSettlementAdmin, requireSettlementInvestor } from '@/lib/server/settlement/settlementAuth';
import { validateCsrfProtection } from '@/lib/server/adminAuth';

const createInvestmentSchema = z.object({
  investorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum/BSC address format'),
  investorName: z.string().min(2, 'Investor name required'),
  planId: z.enum(['TIER_01', 'TIER_02', 'TIER_03', 'TIER_04', 'TIER_05', 'TIER_06']),
  initialAllocationPriceINR: z.union([z.string(), z.number()]),
  idempotencyKey: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (address) {
      // Require caller to be authorized for this specific investor address or admin
      const auth = await requireSettlementInvestor(req, address);
      if (!auth.authorized) {
        return auth.response!;
      }
      const records = await SettlementPersistentStore.getAllInvestments(address);
      return NextResponse.json({
        success: true,
        investments: records,
        count: records.length,
        sandboxMode: true,
      });
    }

    // Viewing all records requires admin privileges
    const adminAuth = await requireSettlementAdmin(req);
    if (!adminAuth.authorized) {
      return adminAuth.response!;
    }

    const all = await SettlementPersistentStore.getAllInvestments();
    return NextResponse.json({
      success: true,
      investments: all,
      count: all.length,
      sandboxMode: true,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrfProtection(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ success: false, error: 'CSRF_REJECTED', message: csrfCheck.reason }, { status: 403 });
    }

    if (process.env.NODE_ENV === 'production' || process.env.OXENIQ_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'SETTLEMENT_EXECUTION_DISABLED', message: 'Investment settlement creation is disabled in production.' },
        { status: 403 }
      );
    }

    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createInvestmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { investorAddress, investorName, planId, initialAllocationPriceINR, idempotencyKey } = parsed.data;

    // Verify investor authorization
    const auth = await requireSettlementInvestor(req, investorAddress);
    if (!auth.authorized) {
      return auth.response!;
    }

    const result = await SettlementPersistentStore.createInvestment({
      investorAddress,
      investorName,
      planId,
      initialAllocationPriceINR,
      idempotencyKey,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      record: result.record,
      sandboxNote: 'SIMULATED_TESTNET_PROTOTYPE',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
