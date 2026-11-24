import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server/db';
import {
  getSessionTokenFromRequest,
  SESSION_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME
} from '@/lib/server/adminAuth';

export async function POST(req: NextRequest) {
  try {
    const sessionToken = getSessionTokenFromRequest(req);

    if (sessionToken) {
      await serverDb.revokeSession(sessionToken, 'USER_LOGOUT');
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    const expireOptions = {
      path: '/',
      maxAge: 0,
      expires: new Date(0)
    };

    response.cookies.set(SESSION_COOKIE_NAME, '', expireOptions);
    response.cookies.set(LEGACY_SESSION_COOKIE_NAME, '', expireOptions);

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Logout failed' }, { status: 500 });
  }
}
