import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';
import {
  verifyAdminCredentialsDetailed,
  SESSION_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME
} from '@/lib/server/adminAuth';

const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  mfaToken: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { username, password, mfaToken } = parsed.data;
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // Verify credentials against server-authoritative store
    const authResult = await verifyAdminCredentialsDetailed(username, password, {
      clientIp,
      mfaToken
    });

    if (authResult.error === 'RATE_LIMIT_EXCEEDED') {
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Too many failed login attempts. Account temporarily locked. Please retry in ${authResult.retryAfterSeconds} seconds.`
        },
        { status: 429 }
      );
    }

    if (authResult.error === 'DEVELOPMENT_ACCOUNT_PROHIBITED') {
      return NextResponse.json(
        {
          success: false,
          error: 'DEVELOPMENT_ACCOUNT_PROHIBITED',
          message: 'Development-only administrator accounts are disabled in production and staging.'
        },
        { status: 403 }
      );
    }

    if (authResult.error === 'MFA_REQUIRED') {
      return NextResponse.json(
        {
          success: false,
          error: 'MFA_REQUIRED',
          message: 'Multi-factor authentication (MFA) token required for this administrator account.'
        },
        { status: 403 }
      );
    }

    const adminUser = authResult.user;

    if (!adminUser) {
      await serverDb.createAuditLog({
        action: 'ADMIN_LOGIN_FAILED_INVALID_CREDENTIALS',
        entity: 'User',
        severity: 'WARNING',
        metadata: {
          usernameAttempt: username,
          ip: clientIp,
          rateLimitKey: `${clientIp}:${username.trim().toLowerCase()}`,
        }
      });

      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid administrator credentials. Access denied.'
        },
        { status: 401 }
      );
    }

    // Create high-entropy server session (12 hours TTL)
    const session = await serverDb.createSession(adminUser.id, 12, clientIp);

    await serverDb.createAuditLog({
      actorId: adminUser.id,
      action: 'ADMIN_LOGIN_SUCCESS',
      entity: 'TradingBotSession',
      entityId: session.id,
      severity: 'INFO',
      metadata: {
        username: adminUser.username,
        role: adminUser.role
      }
    });

    const response = NextResponse.json({
      success: true,
      message: 'Administrator authentication successful.',
      user: {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role
      },
      session: {
        sessionId: session.sessionIdentifier,
        expiresAt: session.expiresAt
      }
    });

    // Set secure HttpOnly cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 12 * 3600 // 12 hours
    };

    response.cookies.set(SESSION_COOKIE_NAME, session.sessionIdentifier, cookieOptions);
    response.cookies.set(LEGACY_SESSION_COOKIE_NAME, session.sessionIdentifier, cookieOptions);

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
