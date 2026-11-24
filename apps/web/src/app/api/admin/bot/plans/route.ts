import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/adminAuth';

const updatePlanSchema = z.object({
  planId: z.string(),
  name: z.string().optional(),
  durationDays: z.number().int().positive().optional(),
  priceUsd: z.number().positive().optional(),
  priceLiora: z.number().positive().optional(),
  priceUsdt: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    // Enforce administrative authorization
    const adminAuth = await requireAdmin(req);
    if (!adminAuth.authorized) {
      return adminAuth.response!;
    }

    const body = await req.json();
    const parsed = updatePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { planId, ...updates } = parsed.data;

    const updated = await serverDb.updatePlan(planId, updates);

    await serverDb.createAuditLog({
      actorId: adminAuth.user!.id,
      action: 'PLAN_UPDATED',
      entity: 'SubscriptionPlan',
      entityId: planId,
      metadata: updates,
    });

    return NextResponse.json({
      success: true,
      message: `Plan ${planId} updated successfully`,
      plan: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error updating plan' }, { status: 500 });
  }
}
