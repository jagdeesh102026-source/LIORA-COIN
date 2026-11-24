import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await serverDb.getPrelaunchConfig();
    return NextResponse.json({
      success: true,
      config
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pre-launch config' },
      { status: 500 }
    );
  }
}

