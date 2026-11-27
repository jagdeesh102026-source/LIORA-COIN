import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';
import {
  verifyAndRecordPayment,
  OFFICIAL_TREASURY_ADDRESS,
  TOKEN_CONTRACTS,
} from '@/lib/server/paymentVerification';
import { getTradingBotAccess } from '@/lib/server/entitlementService';
import { validateCsrfProtection, getAuthenticatedUser } from '@/lib/server/adminAuth';

const isProdEnv = process.env.NODE_ENV === 'production' || process.env.OXENIQ_ENV === 'production';

const subscribeSchema = z.object({
  userId: z.string().min(1).optional(),
  planId: z.enum(['PLAN_MONTHLY', 'PLAN_QUARTERLY', 'PLAN_ANNUAL']),
  paymentToken: z.enum(['USDT', 'LIORA']),
  payingWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'),
  txHash: z.string().min(10, 'Transaction hash required'),
  chainId: z.number().int().optional().default(isProdEnv ? 56 : 97),
  isMockTest: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrfProtection(req);
    if (!csrfCheck.valid) {
      return NextResponse.json(
        { error: 'CSRF_REJECTED', message: csrfCheck.reason },
        { status: 403 }
      );
    }

    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication session required for subscription activation.' },
        { status: 401 }
      );
    }

    if (process.env.NODE_ENV === 'production' || process.env.OXENIQ_ENV === 'production') {
      return NextResponse.json(
        {
          error: 'SUBSCRIPTION_PAYMENT_DISABLED',
          message: 'Live subscription payments are disabled in production.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, planId, paymentToken, payingWallet, txHash, chainId, isMockTest } = parsed.data;

    if (userId && userId !== auth.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN_IDENTITY_SPOOFING', message: 'Cannot activate subscription for another user.' },
        { status: 403 }
      );
    }

    const user = auth.user;

    // Verify Plan
    const plan = await serverDb.getPlanById(planId);
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: `Subscription plan ${planId} is invalid or inactive` }, { status: 400 });
    }

    const expectedAmount = paymentToken === 'USDT' ? plan.priceUsdt : plan.priceLiora;
    const tokenAddress =
      paymentToken === 'USDT'
        ? TOKEN_CONTRACTS.USDT_TESTNET
        : TOKEN_CONTRACTS.LIORA_TESTNET;

    // 3. Payment Verification via Read-Only Payment Engine
    const paymentResult = await verifyAndRecordPayment({
      txHash,
      chainId,
      tokenSymbol: paymentToken,
      tokenAddress,
      payingWallet,
      treasuryAddress: OFFICIAL_TREASURY_ADDRESS,
      expectedAmount,
      subscriptionPlanId: planId,
      userId: user.id,
      isMockTest,
    });

    if (!paymentResult.isValid) {
      return NextResponse.json(
        {
          error: 'PAYMENT_VERIFICATION_FAILED',
          message: paymentResult.error || 'On-chain payment verification failed',
        },
        { status: 400 }
      );
    }

    // 4. Execute Subscription Renewal / Activation with mathematical precision
    const updatedSub = await serverDb.renewSubscription(user.id, planId, txHash);

    // 5. Query updated access
    const access = await getTradingBotAccess(user.id, payingWallet);

    return NextResponse.json({
      success: true,
      message: `Successfully activated ${plan.name} subscription!`,
      subscription: updatedSub,
      access,
      payment: paymentResult,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('idempotency')) {
      return NextResponse.json({ error: 'DUPLICATE_PAYMENT', message: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Internal server error processing subscription' }, { status: 500 });
  }
}

