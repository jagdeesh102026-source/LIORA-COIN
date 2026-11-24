import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CustodialAllocationLedger } from '@/lib/custody/custodialAllocationLedger';
import { requireSettlementInvestor } from '@/lib/server/settlement/settlementAuth';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';
import { getAuthenticatedUser } from '@/lib/server/adminAuth';
import { serverDb } from '@/lib/server/db';
import { LioraPricingScheduleService } from '@/lib/pricing/lioraPricingSchedule';

export const dynamic = 'force-dynamic';

const createIntentSchema = z.object({
  investorAddress: z.string().startsWith('0x').length(42).optional(),
  investorName: z.string().min(2).optional(),
  planId: z.enum(['TIER_01', 'TIER_02', 'TIER_03', 'TIER_04', 'TIER_05', 'TIER_06']),
  initialAllocationPriceINR: z.union([z.string(), z.number()]).optional(),
  paymentRail: z.enum([
    'IMPS_BANK_TRANSFER',
    'RTGS_WIRE',
    'NEFT_BANK_TRANSFER',
    'MPESA_MOBILE_MONEY',
    'DIRECT_BANK_DEPOSIT',
  ]),
  paymentReference: z.string().min(5),
  amountPaid: z.number().positive(),
  currency: z.enum(['INR', 'USD']).optional(),
  idempotencyKey: z.string().optional(),
});

/**
 * POST /api/custody/payment-intent
 * Registers an intended manual purchase. Record remains PENDING until authorized admin confirms receipt.
 * Automatically derives investor address and name from authenticated session if omitted.
 */
export async function POST(req: NextRequest) {
  try {
    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createIntentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 }
      );
    }

    let targetAddress = parsed.data.investorAddress;
    let targetName = parsed.data.investorName;

    // Derive from session if omitted
    const authSession = await getAuthenticatedUser(req);
    if (authSession && authSession.user) {
      if (!targetAddress) {
        const wallets = await serverDb.getWalletsByUserId(authSession.user.id);
        if (wallets && wallets.length > 0) {
          targetAddress = wallets[0].walletAddress;
        }
      }
      if (!targetName) {
        targetName = authSession.user.username;
      }
    }

    if (!targetAddress) {
      return NextResponse.json(
        { success: false, error: 'MISSING_INVESTOR_ADDRESS: An investor wallet address is required.' },
        { status: 400 }
      );
    }
    if (!targetName) {
      targetName = `Investor_${targetAddress.slice(2, 8)}`;
    }

    // Authenticate investor
    const auth = await requireSettlementInvestor(req, targetAddress);
    if (!auth.authorized) {
      return auth.response!;
    }

    // Determine reference price (scheduled reference price default)
    let allocationPriceINR = parsed.data.initialAllocationPriceINR;
    if (!allocationPriceINR) {
      try {
        const pricing = await LioraPricingScheduleService.getScheduleStatus();
        allocationPriceINR = pricing.priceINR;
      } catch {
        allocationPriceINR = '0.20';
      }
    }

    const result = await CustodialAllocationLedger.createCustodialPaymentIntent({
      ...parsed.data,
      investorAddress: targetAddress,
      investorName: targetName,
      initialAllocationPriceINR: allocationPriceINR,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      record: result.record,
      orderReference: result.record?.paymentRecord.paymentReference,
      allocationId: result.record?.allocationId,
      message: 'Manual payment intent registered successfully. Awaiting administrative confirmation.',
      isSandboxSimulation: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'SERVER_EXCEPTION', message: err.message },
      { status: 500 }
    );
  }
}
