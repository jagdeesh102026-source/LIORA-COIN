import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';
import { verifyAndRecordPayment, OFFICIAL_TREASURY_ADDRESS } from '@/lib/server/paymentVerification';
import { getTradingBotAccess } from '@/lib/server/entitlementService';
import { getSessionTokenFromRequest } from '@/lib/server/adminAuth';

const subscribeSchema = z.object({
  userId: z.string().optional().default('usr_alex_001'),
  planId: z.enum(['PLAN_MONTHLY', 'PLAN_QUARTERLY', 'PLAN_ANNUAL']),
  paymentToken: z.enum(['USDT', 'LIORA']),
  payingWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'),
  txHash: z.string().min(10, 'Transaction hash required'),
  chainId: z.number().int().optional().default(97),
  isMockTest: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, planId, paymentToken, payingWallet, txHash, chainId, isMockTest } = parsed.data;

    // Resolve user: prioritize active authenticated session over client-supplied userId
    const sessionToken = getSessionTokenFromRequest(req);
    let effectiveUserId = userId;
    if (sessionToken) {
      const session = await serverDb.getSession(sessionToken);
      if (session) {
        effectiveUserId = session.userId;
      }
    }

    // 1. Verify User
    const user = await serverDb.findUserById(effectiveUserId);
    if (!user) {
      return NextResponse.json({ error: `User account ${effectiveUserId} not found` }, { status: 404 });
    }

    // 2. Fetch Plan
    const plan = await serverDb.getPlanById(planId);
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: `Subscription plan ${planId} is invalid or inactive` }, { status: 400 });
    }

    const expectedAmount = paymentToken === 'USDT' ? plan.priceUsdt : plan.priceLiora;
    const tokenAddress =
      paymentToken === 'USDT'
        ? '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'
        : '0xF30B72d8291f09c64B749a2631557d197Ce94a3D';

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

