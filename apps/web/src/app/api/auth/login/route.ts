import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/server/db';
import {
  verifyPassword,
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginRateLimit,
  SESSION_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME,
} from '@/lib/server/adminAuth';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const cleanInput = username.trim();
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitKey = `${clientIp}:${cleanInput.toLowerCase()}`;

    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Too many failed login attempts. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // Look up user by username or email in PostgreSQL
    let user = await serverDb.findUserByUsername(cleanInput);
    if (!user && cleanInput.includes('@')) {
      user = await serverDb.findUserByEmail(cleanInput.toLowerCase());
    }

    if (!user || !user.passwordHash) {
      recordFailedLoginAttempt(rateLimitKey);
      return NextResponse.json(
        { success: false, error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    // Verify password against stored scrypt hash
    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedLoginAttempt(rateLimitKey);
      await serverDb.createAuditLog({
        action: 'LOGIN_FAILED_INVALID_PASSWORD',
        entity: 'User',
        metadata: { usernameAttempt: cleanInput, ip: clientIp },
      });
      return NextResponse.json(
        { success: false, error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    resetLoginRateLimit(rateLimitKey);

    // Retrieve linked wallets for user
    const wallets = await serverDb.getWalletsByUserId(user.id);
    let primaryWallet = wallets[0]?.walletAddress || null;

    if (!primaryWallet) {
      // Auto-provision deterministic investor wallet if none linked
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(`liora:investor:${user.id}`).digest('hex');
      primaryWallet = '0x' + hash.slice(0, 40);
      await serverDb.linkVerifiedWallet({
        walletAddress: primaryWallet,
        userId: user.id,
        chainId: 97,
        signatureProof: `login_derived_${user.id}`,
        nonceChallenge: `login_${Date.now()}`,
      });
    }

    // Create session in PostgreSQL
    const session = await serverDb.createSession(user.id, 24, clientIp);

    await serverDb.createAuditLog({
      actorId: user.id,
      action: 'INVESTOR_LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      metadata: { username: user.username, ip: clientIp, primaryWallet },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      walletAddress: primaryWallet,
      session: {
        sessionId: session.sessionIdentifier,
        expiresAt: session.expiresAt,
      },
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 24 * 3600,
    };

    response.cookies.set(SESSION_COOKIE_NAME, session.sessionIdentifier, cookieOptions);
    response.cookies.set(LEGACY_SESSION_COOKIE_NAME, session.sessionIdentifier, cookieOptions);

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during login.' },
      { status: 500 }
    );
  }
}
