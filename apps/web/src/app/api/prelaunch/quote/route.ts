import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';
import { getAuthenticatedUser, validateCsrfProtection } from '@/lib/server/adminAuth';

const quoteRequestSchema = z.object({
  investmentAmount: z.number().positive('Investment amount must be greater than 0').max(10_000_000, 'Maximum investment cap exceeded'),
  currency: z.enum(['USD', 'INR']),
  userId: z.string().min(1).max(128).optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM wallet address format')
});

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
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required to generate an allocation quote.' },
        { status: 401 }
      );
    }

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          success: false,
          error: 'PRELAUNCH_EXECUTION_DISABLED',
          message: 'Pre-launch quote generation and purchase execution are disabled in production until authorized.'
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = quoteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { investmentAmount, currency, userId: requestedUserId, walletAddress } = parsed.data;
    if (requestedUserId && requestedUserId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN_IDENTITY_SPOOFING', message: 'Cannot generate quotes on behalf of another user.' },
        { status: 403 }
      );
    }

    const effectiveUserId = auth.user.role === 'ADMIN' && requestedUserId ? requestedUserId : auth.user.id;

    const result = await serverDb.createInvestorQuote({
      investmentAmount,
      currency,
      userId: effectiveUserId,
      walletAddress
    });

    if (!result.success || !result.quote) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create quote' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      quote: result.quote
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Server error while generating quote' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required to view allocation quotes.' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const quoteId = searchParams.get('quoteId');

    if (!quoteId) {
      return NextResponse.json(
        { success: false, error: 'Missing quoteId parameter' },
        { status: 400 }
      );
    }

    const { quote, isExpired } = await serverDb.getInvestorQuote(quoteId);
    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      );
    }

    if (quote.userId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Not authorized to access another investor quote.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      quote,
      isExpired
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Server error fetching quote' },
      { status: 500 }
    );
  }
}

