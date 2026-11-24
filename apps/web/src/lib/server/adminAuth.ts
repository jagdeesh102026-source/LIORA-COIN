/**
 * LIORA COIN — Server-Side Administrative Authentication & RBAC Gateway
 * Phase 2: Production Database and Admin Security
 *
 * Implements:
 * - Scrypt-based cryptographic password hashing with unique random salts.
 * - Elimination of default/development administrator accounts in production/staging.
 * - Sliding-window login rate limiting with IP/account lockouts.
 * - CSRF validation for all state-changing administrative and financial operations.
 * - MFA-ready verification hooks.
 * - Zero credentials printed in source code, logs, or error responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { serverDb, UserRecord, TradingBotSessionRecord } from './db';
import { prisma } from './prisma';

export interface AdminAuthResult {
  authorized: boolean;
  user: UserRecord | null;
  session: TradingBotSessionRecord | null;
  response?: NextResponse;
}

export const SESSION_COOKIE_NAME = 'liora_session';
export const LEGACY_SESSION_COOKIE_NAME = 'liora_bot_session';

// ============================================================================
// RATE LIMITING (SLIDING WINDOW WITH TEMPORARY LOCKOUT)
// ============================================================================

interface RateLimitBucket {
  failedAttempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const loginRateLimitMap = new Map<string, RateLimitBucket>();
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const cleanKey = key.trim().toLowerCase();
  const now = Date.now();
  const bucket = loginRateLimitMap.get(cleanKey);

  if (!bucket) {
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  // Check if active lockout exists
  if (bucket.lockedUntil && bucket.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((bucket.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Reset window if expired
  if (now - bucket.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    loginRateLimitMap.delete(cleanKey);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  if (bucket.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    bucket.lockedUntil = now + LOCKOUT_DURATION_MS;
    const retryAfterSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - bucket.failedAttempts)
  };
}

export function recordFailedLoginAttempt(key: string): void {
  const cleanKey = key.trim().toLowerCase();
  const now = Date.now();
  const bucket = loginRateLimitMap.get(cleanKey);

  if (!bucket || now - bucket.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    loginRateLimitMap.set(cleanKey, {
      failedAttempts: 1,
      firstAttemptAt: now,
      lockedUntil: null
    });
  } else {
    bucket.failedAttempts += 1;
    if (bucket.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      bucket.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
  }
}

export function resetLoginRateLimit(key: string): void {
  loginRateLimitMap.delete(key.trim().toLowerCase());
}

// ============================================================================
// CSRF DEFENSE FOR COOKIE-AUTHENTICATED MUTATIONS
// ============================================================================

export function validateCsrfProtection(req: NextRequest): { valid: boolean; reason?: string } {
  // Safe read methods bypass CSRF checks
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return { valid: true };
  }

  // If request contains an explicit Bearer Authorization header, standard CSRF does not apply
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { valid: true };
  }

  // Custom anti-CSRF request header check (common for AJAX/fetch calls)
  const customHeader =
    req.headers.get('x-requested-with') ||
    req.headers.get('x-csrf-token') ||
    req.headers.get('x-liora-admin');
  if (customHeader) {
    return { valid: true };
  }

  // Origin / Host verification
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost.toLowerCase() === host.toLowerCase()) {
        return { valid: true };
      }
    } catch {
      return { valid: false, reason: 'Malformed request origin' };
    }
  }

  // Allow in non-production local development if Origin is omitted
  if (process.env.NODE_ENV !== 'production' && !origin) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: 'CSRF validation failed: Missing valid origin match or anti-CSRF custom header.'
  };
}

// ============================================================================
// CRYPTOGRAPHIC PASSWORD HASHING (SCRYPT + SALT)
// ============================================================================

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedHash = parts[2];
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return timingSafeCompare(derived, expectedHash);
  }

  // Fallback for environment secret comparison
  return timingSafeCompare(password, storedHash);
}

// ============================================================================
// SESSION EXTRACTION & AUTHORIZATION GATEWAY
// ============================================================================

export function getSessionTokenFromRequest(req: NextRequest): string | null {
  const primaryCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (primaryCookie && primaryCookie.trim().length > 0) {
    return primaryCookie.trim();
  }

  const legacyCookie = req.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value;
  if (legacyCookie && legacyCookie.trim().length > 0) {
    return legacyCookie.trim();
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer.length > 0) return bearer;
  }

  return null;
}

export async function getAuthenticatedUser(
  req: NextRequest
): Promise<{ user: UserRecord; session: TradingBotSessionRecord } | null> {
  const token = getSessionTokenFromRequest(req);
  if (!token) return null;

  const session = await serverDb.getSession(token);
  if (!session) return null;

  const user = await serverDb.findUserById(session.userId);
  if (!user || user.accountStatus !== 'ACTIVE') return null;

  // Development-only account barrier: block development accounts in production
  if (user.isDevelopmentOnly) {
    const isProdOrStaging =
      process.env.NODE_ENV === 'production' ||
      process.env.STAGING === 'true' ||
      process.env.OXENIQ_ENV === 'production' ||
      process.env.OXENIQ_ENV === 'staging';

    if (isProdOrStaging) {
      return null;
    }
  }

  return { user, session };
}

export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  // CSRF validation for mutating requests
  const csrfCheck = validateCsrfProtection(req);
  if (!csrfCheck.valid) {
    await serverDb.createAuditLog({
      action: 'SECURITY_ALERT_CSRF_REJECTION',
      entity: 'AdminAuth',
      severity: 'WARNING',
      metadata: { reason: csrfCheck.reason, method: req.method, url: req.url }
    });

    return {
      authorized: false,
      user: null,
      session: null,
      response: NextResponse.json(
        { success: false, error: 'CSRF_REJECTED', message: csrfCheck.reason },
        { status: 403 }
      )
    };
  }

  // Reject header tampering attempts
  const forgedHeader = req.headers.get('x-admin-role') || req.headers.get('x-admin-id');
  if (forgedHeader) {
    await serverDb.createAuditLog({
      action: 'SECURITY_ALERT_FORGED_HEADER_ATTEMPT',
      entity: 'AdminAuth',
      severity: 'CRITICAL',
      metadata: {
        forgedHeader,
        url: req.url,
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      }
    });
  }

  const auth = await getAuthenticatedUser(req);

  if (!auth) {
    return {
      authorized: false,
      user: null,
      session: null,
      response: NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required. Active administrator session must be provided.'
        },
        { status: 401 }
      )
    };
  }

  if (auth.user.role !== 'ADMIN') {
    await serverDb.createAuditLog({
      actorId: auth.user.id,
      action: 'ADMIN_ACCESS_DENIED_ROLE_MISMATCH',
      entity: 'AdminAuth',
      severity: 'WARNING',
      metadata: { role: auth.user.role, url: req.url }
    });

    return {
      authorized: false,
      user: auth.user,
      session: auth.session,
      response: NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Forbidden. Administrator privileges required to access this resource.'
        },
        { status: 403 }
      )
    };
  }

  return {
    authorized: true,
    user: auth.user,
    session: auth.session
  };
}

// ============================================================================
// ADMINISTRATOR CREDENTIAL VERIFICATION
// ============================================================================

export interface VerifyAdminOptions {
  mfaToken?: string;
  clientIp?: string;
}

export async function verifyAdminCredentialsDetailed(
  username: string,
  passcodeOrSecret: string,
  options: VerifyAdminOptions = {}
): Promise<{ user: UserRecord | null; error?: string; retryAfterSeconds?: number }> {
  const cleanUsername = username.trim().toLowerCase();
  const cleanSecret = passcodeOrSecret.trim();

  // Rate limit key combines client IP and username to mitigate distributed brute force
  const rateLimitKey = `${options.clientIp || '127.0.0.1'}:${cleanUsername}`;
  const rateLimitStatus = checkLoginRateLimit(rateLimitKey);

  if (!rateLimitStatus.allowed) {
    return {
      user: null,
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: rateLimitStatus.retryAfterSeconds
    };
  }

  // Distributed Rate Limiting via PostgreSQL in postgres mode
  if (process.env.OXENIQ_PERSISTENCE_MODE === 'postgres') {
    try {
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
      const dbFailedCount = await prisma.auditLog.count({
        where: {
          action: 'ADMIN_LOGIN_FAILED_INVALID_CREDENTIALS',
          metadata: {
            path: ['rateLimitKey'],
            equals: rateLimitKey,
          },
          createdAt: { gte: fifteenMinAgo },
        },
      });
      if (dbFailedCount >= 5) {
        return {
          user: null,
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: 900,
        };
      }
    } catch {
      // Safe fallback to in-memory check
    }
  }

  // Reject permanently banned default development passcodes
  if (cleanSecret === 'admin123' || cleanSecret.toLowerCase() === 'oxeniq') {
    recordFailedLoginAttempt(rateLimitKey);
    return { user: null, error: 'INVALID_CREDENTIALS' };
  }

  if (!cleanUsername || !cleanSecret) {
    return { user: null, error: 'INVALID_CREDENTIALS' };
  }

  const user = await serverDb.findUserByUsername(cleanUsername);
  if (!user || user.role !== 'ADMIN' || user.accountStatus !== 'ACTIVE') {
    recordFailedLoginAttempt(rateLimitKey);
    return { user: null, error: 'INVALID_CREDENTIALS' };
  }

  // Production Gate: Development-only accounts CANNOT authenticate in production or staging
  if (user.isDevelopmentOnly) {
    const isProdOrStaging =
      process.env.NODE_ENV === 'production' ||
      process.env.STAGING === 'true' ||
      process.env.OXENIQ_ENV === 'production' ||
      process.env.OXENIQ_ENV === 'staging';

    if (isProdOrStaging) {
      await serverDb.createAuditLog({
        action: 'SECURITY_ALERT_DEVELOPMENT_ADMIN_BLOCKED_IN_PRODUCTION',
        entity: 'User',
        entityId: user.id,
        severity: 'CRITICAL',
        metadata: { usernameAttempt: cleanUsername, ip: options.clientIp || 'unknown' }
      });
      return { user: null, error: 'DEVELOPMENT_ACCOUNT_PROHIBITED' };
    }
  }

  // Verify password using scrypt hash or server ADMIN_SECRET environment override
  const serverAdminSecret = process.env.ADMIN_SECRET || process.env.ADMIN_CONSOLE_PASSWORD;
  const isMatchServerSecret = serverAdminSecret ? timingSafeCompare(cleanSecret, serverAdminSecret) : false;
  const isMatchUserPassword = user.passwordHash ? verifyPassword(cleanSecret, user.passwordHash) : false;

  if (!isMatchServerSecret && !isMatchUserPassword) {
    recordFailedLoginAttempt(rateLimitKey);
    return { user: null, error: 'INVALID_CREDENTIALS' };
  }

  // MFA verification hook (MFA-ready architecture)
  if (user.isMfaEnabled) {
    if (!options.mfaToken) {
      return { user: null, error: 'MFA_REQUIRED' };
    }
    // Validate MFA token against user's mfaSecret
    const isMfaValid = timingSafeCompare(options.mfaToken.trim(), user.mfaSecret || '');
    if (!isMfaValid) {
      recordFailedLoginAttempt(rateLimitKey);
      return { user: null, error: 'INVALID_MFA_TOKEN' };
    }
  }

  // Reset rate limiting on successful login
  resetLoginRateLimit(rateLimitKey);
  return { user };
}

export async function verifyAdminCredentials(
  username: string,
  passcodeOrSecret: string,
  options: VerifyAdminOptions = {}
): Promise<UserRecord | null> {
  const result = await verifyAdminCredentialsDetailed(username, passcodeOrSecret, options);
  return result.user;
}
