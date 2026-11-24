import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';

const quoteRequestSchema = z.object({
  investmentAmount: z.number().positive('Investment amount must be greater than 0').max(10_000_000, 'Maximum investment cap exceeded'),
  currency: z.enum(['USD', 'INR']),
  userId: z.string().min(1, 'User ID is required').max(128, 'User ID too long'),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM wallet address format')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = quoteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { investmentAmount, currency, userId, walletAddress } = parsed.data;

    const result = await serverDb.createInvestorQuote({
      investmentAmount,
      currency,
      userId,
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

