import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';
import { requireSettlementInvestor, requireSettlementAdmin } from '@/lib/server/settlement/settlementAuth';
import { validateCsrfProtection } from '@/lib/server/adminAuth';

const disputeSchema = z.object({
  investmentId: z.string().min(3),
  reason: z.string().min(10, 'Dispute reason must be at least 10 characters long'),
});

const resolveDisputeSchema = z.object({
  investmentId: z.string().min(3),
  resolution: z.enum(['RESOLVED_PAYMENT_VERIFIED', 'RESOLVED_COLLATERAL_RELEASED']),
  arbitrationNotes: z.string().min(5, 'Arbitration notes required'),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrfProtection(req);
    if (!csrfCheck.valid) {
      return NextResponse.json({ success: false, error: 'CSRF_REJECTED', message: csrfCheck.reason }, { status: 403 });
    }

    if (process.env.NODE_ENV === 'production' || process.env.OXENIQ_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'SETTLEMENT_EXECUTION_DISABLED', message: 'Settlement mutations are disabled in production.' },
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
    const parsed = disputeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { investmentId, reason } = parsed.data;
    const inv = await SettlementPersistentStore.getInvestmentById(investmentId);
    if (!inv) {
      return NextResponse.json({ success: false, error: 'Investment record not found.' }, { status: 404 });
    }

    // Role check: Only the designated investor can file a dispute
    const auth = await requireSettlementInvestor(req, inv.investorAddress);
    if (!auth.authorized) {
      return auth.response!;
    }

    const result = await SettlementPersistentStore.raiseDispute({
      investmentId,
      reason,
      investorAddress: auth.actorAddress!,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment dispute registered. Investment status frozen under DISPUTED_OR_FAILED_SETTLEMENT.',
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
        { success: false, error: 'SETTLEMENT_EXECUTION_DISABLED', message: 'Settlement arbitration mutations are disabled in production.' },
        { status: 403 }
      );
    }

    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    // Only Admin / Arbitrator can resolve disputes
    const adminAuth = await requireSettlementAdmin(req);
    if (!adminAuth.authorized) {
      return adminAuth.response!;
    }

    const body = await req.json();
    const parsed = resolveDisputeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { investmentId, resolution, arbitrationNotes } = parsed.data;

    const result = await SettlementPersistentStore.resolveDispute({
      investmentId,
      resolution,
      arbitrationNotes,
      arbitratorAddress: adminAuth.actorAddress!,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Dispute arbitrated: ${resolution}.`,
      sandboxMode: true,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
