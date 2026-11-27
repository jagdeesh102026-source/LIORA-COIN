import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';
import { requireSettlementAdmin } from '@/lib/server/settlement/settlementAuth';
import { validateCsrfProtection } from '@/lib/server/adminAuth';

const recordPayoutSchema = z.object({
  investmentId: z.string().min(3),
  amountPaidINR: z.number().positive(),
  paymentRail: z.enum(['IMPS_BANK_TRANSFER', 'RTGS_WIRE', 'NEFT_BANK_TRANSFER', 'MPESA_MOBILE_MONEY', 'USDT_TESTNET_TRANSFER']),
  referenceNumber: z.string().min(5),
  adminNotes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const correctPayoutSchema = z.object({
  investmentId: z.string().min(3),
  newReferenceNumber: z.string().min(5),
  paymentRail: z.enum(['IMPS_BANK_TRANSFER', 'RTGS_WIRE', 'NEFT_BANK_TRANSFER', 'MPESA_MOBILE_MONEY', 'USDT_TESTNET_TRANSFER']),
  reason: z.string().min(10, 'Correction reason must be at least 10 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrfProtection(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ success: false, error: 'CSRF_REJECTED', message: csrfCheck.reason }, { status: 403 });
    }

    if (process.env.NODE_ENV === 'production' || process.env.OXENIQ_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'PAYOUT_EXECUTION_DISABLED', message: 'Manual payout execution is disabled in production.' },
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
    const parsed = recordPayoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await SettlementPersistentStore.recordManualPayout({
      ...parsed.data,
      dispatchedBy: adminAuth.actorAddress!,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Manual fiat payout recorded. Investment status moved to PAYMENT_DISPATCHED.',
      sandboxMode: true,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const csrfCheck = validateCsrfProtection(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ success: false, error: 'CSRF_REJECTED', message: csrfCheck.reason }, { status: 403 });
    }

    if (process.env.NODE_ENV === 'production' || process.env.OXENIQ_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'PAYOUT_EXECUTION_DISABLED', message: 'Payout modifications are disabled in production.' },
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
    const parsed = correctPayoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await SettlementPersistentStore.correctPayoutReference({
      ...parsed.data,
      correctedBy: adminAuth.actorAddress!,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment reference successfully corrected with audit trail.',
      sandboxMode: true,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
