import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/adminAuth';

export async function GET(req: NextRequest) {
  try {
    // Enforce strict administrative authorization
    const adminAuth = await requireAdmin(req);
    if (!adminAuth.authorized) {
      return adminAuth.response!;
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const logs = await serverDb.getAuditLogs(limit);

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
