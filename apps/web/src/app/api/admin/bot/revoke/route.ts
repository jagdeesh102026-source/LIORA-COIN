import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/adminAuth';

const revokeSchema = z.object({
  userId: z.string().min(1, 'Target user ID required'),
  reason: z.string().min(3, 'Revocation reason required'),
});

export async function POST(req: NextRequest) {
  try {
    // Enforce administrative authorization
    const adminAuth = await requireAdmin(req);
    if (!adminAuth.authorized) {
      return adminAuth.response!;
    }

    const body = await req.json();
    const parsed = revokeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, reason } = parsed.data;

    const updated = await serverDb.revokeSubscription(userId, reason, adminAuth.user!.id);

    return NextResponse.json({
      success: true,
      message: `Trading bot access successfully revoked for user ${userId}.`,
      subscription: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error revoking access' }, { status: 500 });
  }
}
