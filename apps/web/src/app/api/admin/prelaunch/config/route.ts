import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/adminAuth';

const updatePrelaunchConfigSchema = z.object({
  enabled: z.boolean().optional(),
  startPriceINR: z.string().optional(),
  targetPriceUSD: z.string().optional(),
  durationDays: z.number().int().positive().optional(),
  updateMode: z.enum(['CONTINUOUS', 'DAILY_STEP']).optional(),
  startTimeUTC: z.string().nullable().optional(),
  lockedInrPerUsd: z.string().nullable().optional(),
  fxRateSource: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  investmentTiers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      minAmountUSD: z.number().nonnegative(),
      maxAmountUSD: z.number().positive().nullable(),
      lockMonths: z.union([z.literal(3), z.literal(6), z.literal(12)]),
      description: z.string()
    })
  ).optional()
});

export async function GET(req: NextRequest) {
  try {
    // Enforce administrative authentication for sensitive config history & audit logs
    const adminAuth = await requireAdmin(req);
    if (!adminAuth.authorized) {
      return adminAuth.response!;
    }

    const config = await serverDb.getPrelaunchConfig();
    const history = await serverDb.getPrelaunchConfigHistory();
    const auditLogs = await serverDb.getPrelaunchAuditLogs();

    return NextResponse.json({
      success: true,
      config,
      history,
      auditLogs
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch admin prelaunch config' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Enforce administrative authorization from verified server session
    const adminAuth = await requireAdmin(req);
    if (!adminAuth.authorized) {
      return adminAuth.response!;
    }

    const body = await req.json();
    const parsed = updatePrelaunchConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Execute update with server-verified admin actor ID
    const result = await serverDb.updatePrelaunchConfig(updates, adminAuth.user!.id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Configuration update rejected', details: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Pre-launch configuration successfully updated to version ${result.config?.version}`,
      config: result.config
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
