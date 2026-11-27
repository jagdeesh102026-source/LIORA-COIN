import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { serverDb, hashPasswordScrypt } from '@/lib/server/db';
import {
  validateCsrfProtection,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME,
} from '@/lib/server/adminAuth';

export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  sponsorCode: z.string().optional(),
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

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { username, email, password, walletAddress, sponsorCode } = parsed.data;
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await serverDb.findUserByUsername(cleanUsername);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this username already exists.' },
        { status: 409 }
      );
    }

    const existingEmail = await serverDb.findUserByEmail(cleanEmail);
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // Scrypt hash
    const passwordHash = hashPasswordScrypt(password);

    // Create user in PostgreSQL
    const user = await serverDb.createUser({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role: 'USER',
      accountStatus: 'ACTIVE',
    });

    // Determine primary wallet: user provided, or deterministically generated based on user ID
    let assignedWallet = walletAddress ? walletAddress.toLowerCase() : null;
    if (!assignedWallet) {
      const hash = crypto.createHash('sha256').update(`liora:investor:${user.id}`).digest('hex');
      assignedWallet = '0x' + hash.slice(0, 40);
    }

    // Link verified wallet in database (default to BSC Mainnet 56 in production, 97 in dev)
    const defaultChainId = process.env.NODE_ENV === 'production' ? 56 : 97;
    await serverDb.linkVerifiedWallet({
      walletAddress: assignedWallet,
      userId: user.id,
      chainId: defaultChainId,
      signatureProof: `registration_derived_${user.id}`,
      nonceChallenge: `reg_${Date.now()}`,
    });

    // Create active session
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const session = await serverDb.createSession(user.id, 24, clientIp);

    await serverDb.createAuditLog({
      actorId: user.id,
      action: 'INVESTOR_REGISTERED',
      entity: 'User',
      entityId: user.id,
      metadata: { username: cleanUsername, walletAddress: assignedWallet, sponsorCode },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Investor registration successful.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      walletAddress: assignedWallet,
      session: {
        sessionId: session.sessionIdentifier,
        expiresAt: session.expiresAt,
      },
    });

    const cookieOptions = getSessionCookieOptions(24 * 3600);

    response.cookies.set(SESSION_COOKIE_NAME, session.sessionIdentifier, cookieOptions);
    response.cookies.set(LEGACY_SESSION_COOKIE_NAME, session.sessionIdentifier, cookieOptions);

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}
