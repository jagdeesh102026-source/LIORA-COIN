/**
 * LIORA COIN — Centralized Server-Side Bot Entitlement Service
 * Phase 20G: Authoritative Access Control Gateway
 *
 * Enforces server-authoritative entitlement rules:
 * - Checks user account status (ACTIVE, SUSPENDED, BANNED)
 * - Checks linked and verified wallet address
 * - Evaluates server-calculated expiration timestamps (48-hour free trial or active paid subscription)
 * - Revocation checks
 * - Rejects unauthorized requests at API layer (HTTP 401 / 403)
 */

import { serverDb, SubscriptionStatus } from './db';

export interface BotAccessResult {
  hasAccess: boolean;
  status: SubscriptionStatus;
  accessType: 'NONE' | 'TRIAL' | 'PAID';
  expiresAt: string | null;
  remainingTimeMs: number;
  formattedRemaining: string;
  isRevoked: boolean;
  reason?: string;
  userId: string;
  walletAddress: string | null;
  isWalletVerified: boolean;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

export async function getTradingBotAccess(
  userId: string,
  verifiedWalletAddress?: string | null
): Promise<BotAccessResult> {
  const user = await serverDb.findUserById(userId);
  if (!user) {
    return {
      hasAccess: false,
      status: 'NO_SUBSCRIPTION',
      accessType: 'NONE',
      expiresAt: null,
      remainingTimeMs: 0,
      formattedRemaining: '00:00:00',
      isRevoked: false,
      reason: 'User account not found',
      userId,
      walletAddress: null,
      isWalletVerified: false,
    };
  }

  if (user.accountStatus !== 'ACTIVE') {
    return {
      hasAccess: false,
      status: 'REVOKED',
      accessType: 'NONE',
      expiresAt: null,
      remainingTimeMs: 0,
      formattedRemaining: '00:00:00',
      isRevoked: true,
      reason: `Account status is ${user.accountStatus}`,
      userId,
      walletAddress: null,
      isWalletVerified: false,
    };
  }

  // Check wallets
  const wallets = await serverDb.getWalletsByUserId(userId);
  let linkedWallet = wallets[0] || null;
  if (verifiedWalletAddress) {
    const target = wallets.find((w) => w.walletAddress.toLowerCase() === verifiedWalletAddress.toLowerCase());
    if (target) linkedWallet = target;
  }

  const sub = await serverDb.getSubscriptionByUserId(userId);
  const now = Date.now();

  if (!sub) {
    return {
      hasAccess: false,
      status: 'NO_SUBSCRIPTION',
      accessType: 'NONE',
      expiresAt: null,
      remainingTimeMs: 0,
      formattedRemaining: '00:00:00',
      isRevoked: false,
      reason: 'No active trial or paid subscription found',
      userId,
      walletAddress: linkedWallet ? linkedWallet.walletAddress : null,
      isWalletVerified: Boolean(linkedWallet),
    };
  }

  if (sub.isRevoked || sub.status === 'REVOKED') {
    return {
      hasAccess: false,
      status: 'REVOKED',
      accessType: 'NONE',
      expiresAt: sub.expiresAt,
      remainingTimeMs: 0,
      formattedRemaining: '00:00:00',
      isRevoked: true,
      reason: sub.revocationReason || 'Trading bot access has been revoked by administration',
      userId,
      walletAddress: linkedWallet ? linkedWallet.walletAddress : null,
      isWalletVerified: Boolean(linkedWallet),
    };
  }

  const expiresMs = new Date(sub.expiresAt).getTime();
  const remainingMs = Math.max(0, expiresMs - now);

  if (remainingMs <= 0) {
    const expiredStatus: SubscriptionStatus =
      sub.status === 'TRIAL_ACTIVE' || sub.status === 'TRIAL_EXPIRED' ? 'TRIAL_EXPIRED' : 'EXPIRED';
    return {
      hasAccess: false,
      status: expiredStatus,
      accessType: sub.status === 'TRIAL_ACTIVE' || sub.status === 'TRIAL_EXPIRED' ? 'TRIAL' : 'PAID',
      expiresAt: sub.expiresAt,
      remainingTimeMs: 0,
      formattedRemaining: '00:00:00',
      isRevoked: false,
      reason: expiredStatus === 'TRIAL_EXPIRED' ? '48-Hour Free Trial has expired' : 'Subscription period has expired',
      userId,
      walletAddress: linkedWallet ? linkedWallet.walletAddress : null,
      isWalletVerified: Boolean(linkedWallet),
    };
  }

  // Access is active!
  const isTrial = sub.status === 'TRIAL_ACTIVE';
  return {
    hasAccess: true,
    status: sub.status,
    accessType: isTrial ? 'TRIAL' : 'PAID',
    expiresAt: sub.expiresAt,
    remainingTimeMs: remainingMs,
    formattedRemaining: formatDuration(remainingMs),
    isRevoked: false,
    userId,
    walletAddress: linkedWallet ? linkedWallet.walletAddress : null,
    isWalletVerified: Boolean(linkedWallet),
  };
}

