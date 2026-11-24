import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';
import { requireSettlementInvestor } from '@/lib/server/settlement/settlementAuth';

const returnCollateralSchema = z.object({
  investmentId: z.string().min(3),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid 66-character transaction hash format'),
  returnedTokensAmount: z.union([z.string(), z.number()]).optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    const body = await req.json();
    const parsed = returnCollateralSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { investmentId, txHash, returnedTokensAmount, idempotencyKey } = parsed.data;

    const inv = await SettlementPersistentStore.getInvestmentById(investmentId);
    if (!inv) {
      return NextResponse.json({ success: false, error: 'Investment record not found.' }, { status: 404 });
    }

    // Role check: Investor or Admin
    const auth = await requireSettlementInvestor(req, inv.investorAddress);
    if (!auth.authorized) {
      return auth.response!;
    }

    const result = await SettlementPersistentStore.recordCollateralReturn({
      investmentId,
      txHash,
      actorAddress: auth.actorAddress!,
      returnedTokensAmount,
      idempotencyKey,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Exact collateral returned to company treasury. Status moved to SETTLEMENT_COMPLETED.',
      sandboxMode: true,
      verificationNote: 'TESTNET_SANDBOX_SIMULATION — Production on-chain completion prohibited.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
