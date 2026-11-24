import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CustodialAllocationLedger } from '@/lib/custody/custodialAllocationLedger';
import { requireSettlementAdmin } from '@/lib/server/settlement/settlementAuth';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';

export const dynamic = 'force-dynamic';

const verifyPaymentSchema = z.object({
  allocationId: z.string().min(5),
  adminNotes: z.string().optional(),
  action: z.enum(['APPROVE', 'REJECT']).optional().default('APPROVE'),
});

/**
 * POST /api/custody/verify-payment
 * Restricted strictly to authorized company treasury administrators.
 * APPROVE: Verifies off-chain payment receipt, activates the custodial allocation,
 * and reserves tokens from the treasury pool.
 * REJECT: Explicitly rejects an invalid, unverified, or duplicate payment.
 */
export async function POST(req: NextRequest) {
  try {
    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    // Role-based authorization: Strictly requires administrator
    const adminAuth = await requireSettlementAdmin(req);
    if (!adminAuth.authorized) {
      return adminAuth.response!;
    }

    const body = await req.json();
    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 }
      );
    }

    if (parsed.data.action === 'REJECT') {
      const rejectResult = await CustodialAllocationLedger.rejectManualPayment({
        allocationId: parsed.data.allocationId,
        verifyingAdmin: adminAuth.actorAddress!,
        adminNotes: parsed.data.adminNotes || 'Payment rejected by administrator during manual review.',
      });

      if (!rejectResult.success) {
        return NextResponse.json({ success: false, error: rejectResult.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        record: rejectResult.record,
        action: 'REJECTED',
        message: 'Manual payment was rejected. No custodial tokens have been credited or reserved.',
        isSandboxSimulation: true,
      });
    }

    const result = await CustodialAllocationLedger.verifyManualPayment({
      allocationId: parsed.data.allocationId,
      verifyingAdmin: adminAuth.actorAddress!,
      adminNotes: parsed.data.adminNotes,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      record: result.record,
      action: 'APPROVED',
      message: 'Manual payment confirmed and custodial LIORA allocation successfully activated.',
      isSandboxSimulation: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'SERVER_EXCEPTION', message: err.message },
      { status: 500 }
    );
  }
}
