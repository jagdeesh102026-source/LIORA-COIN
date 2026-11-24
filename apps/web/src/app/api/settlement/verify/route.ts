import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';
import { requireSettlementInvestor } from '@/lib/server/settlement/settlementAuth';

const verifyPaymentSchema = z.object({
  investmentId: z.string().min(3),
  method: z.enum(['INVESTOR_RECEIPT_CONFIRMATION', 'INDEPENDENT_BANK_NOC_AUDIT', 'ARBITRATION_VERIFICATION']),
  notes: z.string().optional(),
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
    const parsed = verifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { investmentId, method, notes, idempotencyKey } = parsed.data;

    const inv = await SettlementPersistentStore.getInvestmentById(investmentId);
    if (!inv) {
      return NextResponse.json({ success: false, error: 'Investment record not found.' }, { status: 404 });
    }

    // Role check: Only investor or admin can verify payment
    const auth = await requireSettlementInvestor(req, inv.investorAddress);
    if (!auth.authorized) {
      return auth.response!;
    }

    const result = await SettlementPersistentStore.verifyPayment({
      investmentId,
      verifierAddress: auth.actorAddress!,
      method,
      notes,
      idempotencyKey,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Fiat payment verified independently. Status moved to PAYMENT_INDEPENDENTLY_VERIFIED.',
      sandboxMode: true,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
