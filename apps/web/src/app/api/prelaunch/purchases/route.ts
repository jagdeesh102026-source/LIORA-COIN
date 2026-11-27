import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';
import { getAuthenticatedUser, validateCsrfProtection } from '@/lib/server/adminAuth';

const executePurchaseSchema = z.object({
  quoteId: z.string().min(1, 'Quote ID is required').max(100),
  txHash: z.string().nullable().optional(),
  idempotencyKey: z.string().max(128).optional()
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required to view allocation purchases.' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const requestedUserId = searchParams.get('userId');

    if (requestedUserId && requestedUserId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN_IDENTITY_SPOOFING', message: 'Cannot query purchase records belonging to another user.' },
        { status: 403 }
      );
    }

    const targetUserId = auth.user.role === 'ADMIN' && requestedUserId ? requestedUserId : auth.user.id;
    const purchases = await serverDb.getUserInvestorPurchases(targetUserId);
    return NextResponse.json({
      success: true,
      purchases
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user purchases' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = validateCsrfProtection(req);
    if (!csrfCheck.valid) {
      return NextResponse.json(
        { success: false, error: 'CSRF_REJECTED', message: csrfCheck.reason },
        { status: 403 }
      );
    }

    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required to execute an allocation purchase.' },
        { status: 401 }
      );
    }

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          success: false,
          error: 'PRELAUNCH_EXECUTION_DISABLED',
          message: 'Pre-launch token purchases and investment locking are disabled in production until authorized.'
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = executePurchaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { quoteId, txHash, idempotencyKey } = parsed.data;

    // Reject purchase if quote does not exist or was already consumed
    const { quote, isExpired } = await serverDb.getInvestorQuote(quoteId);
    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'QUOTE_NOT_FOUND_OR_ALREADY_USED', message: 'Quote does not exist or has already been consumed (replay defense).' },
        { status: 400 }
      );
    }

    // Ownership enforcement: prevent consuming another user's quote
    if (quote.userId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN_IDENTITY_SPOOFING', message: 'Cannot execute a purchase using another user quote.' },
        { status: 403 }
      );
    }

    if (isExpired) {
      return NextResponse.json(
        { success: false, error: 'QUOTE_EXPIRED', message: 'Purchase quote has expired. Please request a fresh quote.' },
        { status: 400 }
      );
    }

    const result = await serverDb.recordInvestorPurchase(quoteId, Date.now(), txHash, idempotencyKey);

    if (!result.success || !result.record) {
      const err = result.error || 'Failed to record purchase';
      const isReplay = err.includes('QUOTE_NOT_FOUND_OR_ALREADY_USED') || err.includes('already been consumed');
      const isExp = err.includes('QUOTE_EXPIRED') || err.includes('expired');

      return NextResponse.json(
        {
          success: false,
          error: isReplay ? 'QUOTE_NOT_FOUND_OR_ALREADY_USED' : isExp ? 'QUOTE_EXPIRED' : 'PURCHASE_FAILED',
          message: err
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pre-launch allocation successfully confirmed and locked. Single-use quote consumed.',
      record: result.record
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute purchase' },
      { status: 500 }
    );
  }
}
