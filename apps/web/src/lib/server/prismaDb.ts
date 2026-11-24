/**
 * LIORA COIN — Production PostgreSQL Database Adapter via Prisma 7
 * Phase 2B: Real PostgreSQL Persistence Integration (Gate C2B-2)
 *
 * Implements:
 * - Direct PostgreSQL persistence using Prisma Client & driver adapter.
 * - ACID transactions with real database rollback via prisma.$transaction.
 * - Integer base unit tracking for token balances (NUMERIC 78, 0).
 * - Full canonical asset registry support.
 * - Exact type parity with existing ServerDatabase interface.
 */

if (typeof window !== 'undefined' && (typeof process === 'undefined' || !process.versions?.node)) {
  throw new Error('CRITICAL SECURITY VIOLATION: Prisma database adapter can only be loaded server-side.');
}

import crypto from 'crypto';
import { prisma, pool } from './prisma';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  UserRecord,
  VerifiedWalletRecord,
  AuthNonceRecord,
  TradingBotSessionRecord,
  PurchaseIntentRecord,
  InvestorAllocationRecord,
  VestingScheduleRecord,
  PaymentTransactionRecord,
  TokenBalanceRecord,
  BalanceMovementRecord,
  TradingOrderRecord,
  OrderExecutionRecord,
  SubscriptionPlanRecord,
  TradingBotSubscriptionRecord,
  TradingBotTrialRecord,
  AuditLogRecord,
  UserRole,
  AccountStatus,
  SubscriptionStatus,
  PaymentStatus,
  PaymentToken,
  PurchaseIntentStatus,
  AllocationClaimStatus,
  LedgerEntryType,
  LedgerReason,
  normalizeWalletAddress,
} from './db';
import {
  PrelaunchConfig,
  PrelaunchPriceResult,
  PurchaseQuoteRequest,
  PurchaseQuote,
  LockedPurchaseRecord,
  PrelaunchAuditLog,
  InvestmentLockTier,
} from '../prelaunch/prelaunchTypes';
import {
  calculatePrelaunchPrice,
  validatePrelaunchConfig,
} from '../prelaunch/pricingEngine';
import {
  validateInvestmentTiers,
  getTierForInvestmentUSD,
  calculateTokenAllocation,
  addCalendarMonthsUTC,
} from '../prelaunch/lockingPolicy';
import {
  DEFAULT_INVESTMENT_TIERS,
  INITIAL_PRELAUNCH_CONFIG,
} from '../prelaunch/prelaunchStore';

// In-memory fast nonce cache removed in Gate C2B-3: All nonces are strictly persisted and atomically consumed in PostgreSQL

export class PrismaDatabaseAdapter {
  protected client: PrismaClient | Prisma.TransactionClient;

  constructor(client: PrismaClient | Prisma.TransactionClient = prisma) {
    this.client = client;
  }

  // =========================================================================
  // ACID TRANSACTION ENGINE
  // =========================================================================

  public async transaction<T>(callback: (tx: PrismaDatabaseAdapter) => Promise<T>): Promise<T> {
    if ('$transaction' in this.client) {
      return (this.client as PrismaClient).$transaction(async (txClient) => {
        const txAdapter = new PrismaDatabaseAdapter(txClient);
        return callback(txAdapter);
      });
    } else {
      // Already inside a transaction context
      return callback(this);
    }
  }

  // =========================================================================
  // STAGE A: IDENTITY & AUTHENTICATION
  // =========================================================================

  public async findUserById(id: string): Promise<UserRecord | null> {
    const user = await this.client.user.findUnique({ where: { id } });
    return user ? this.mapUser(user) : null;
  }

  public async findUserByUsername(username: string): Promise<UserRecord | null> {
    const clean = username.trim();
    const user = await this.client.user.findFirst({
      where: { username: { equals: clean, mode: 'insensitive' } },
    });
    return user ? this.mapUser(user) : null;
  }

  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const clean = email.trim();
    const user = await this.client.user.findFirst({
      where: { email: { equals: clean, mode: 'insensitive' } },
    });
    return user ? this.mapUser(user) : null;
  }

  public async createUser(data: {
    username: string;
    email?: string | null;
    passwordHash?: string | null;
    role?: UserRole;
    accountStatus?: AccountStatus;
    isDevelopmentOnly?: boolean;
    mfaSecret?: string | null;
    isMfaEnabled?: boolean;
  }): Promise<UserRecord> {
    const cleanUsername = data.username.trim();
    const existing = await this.findUserByUsername(cleanUsername);
    if (existing) {
      throw new Error(`User with username ${cleanUsername} already exists`);
    }

    const user = await this.client.user.create({
      data: {
        id: `usr_${crypto.randomUUID().slice(0, 8)}`,
        username: cleanUsername,
        email: data.email || null,
        passwordHash: data.passwordHash || null,
        role: data.role || 'USER',
        accountStatus: data.accountStatus || 'ACTIVE',
        isDevelopmentOnly: Boolean(data.isDevelopmentOnly),
        mfaSecret: data.mfaSecret || null,
        isMfaEnabled: Boolean(data.isMfaEnabled),
      },
    });
    return this.mapUser(user);
  }

  public async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord> {
    const user = await this.client.user.update({
      where: { id },
      data: {
        username: updates.username !== undefined ? updates.username.trim() : undefined,
        email: updates.email !== undefined ? updates.email : undefined,
        passwordHash: updates.passwordHash !== undefined ? updates.passwordHash : undefined,
        role: updates.role !== undefined ? updates.role : undefined,
        accountStatus: updates.accountStatus !== undefined ? updates.accountStatus : undefined,
        isDevelopmentOnly: updates.isDevelopmentOnly !== undefined ? updates.isDevelopmentOnly : undefined,
        mfaSecret: updates.mfaSecret !== undefined ? updates.mfaSecret : undefined,
        isMfaEnabled: updates.isMfaEnabled !== undefined ? updates.isMfaEnabled : undefined,
        failedLoginAttempts: updates.failedLoginAttempts !== undefined ? updates.failedLoginAttempts : undefined,
        lockedUntil: updates.lockedUntil ? new Date(updates.lockedUntil) : updates.lockedUntil === null ? null : undefined,
      },
    });
    return this.mapUser(user);
  }

  // Nonces: Strictly asynchronous PostgreSQL persistence and single-use atomic consumption
  public async createNonce(address: string, ttlMs = 5 * 60 * 1000): Promise<string> {
    const cleanAddr = normalizeWalletAddress(address);
    const nonce = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    // Direct, awaited persistence to auth_nonces table; fails closed if database is unavailable
    await this.client.authNonce.create({
      data: {
        id: `non_${crypto.randomUUID().slice(0, 8)}`,
        nonce,
        address: cleanAddr,
        domain: 'oxeniq.network',
        uri: 'https://oxeniq.network',
        chainId: 97,
        statement: 'Sign in with Ethereum',
        issuedAt: now,
        expiresAt,
        consumed: false,
        consumedAt: null,
      },
    });

    return nonce;
  }

  public async consumeNonce(nonce: string, address: string): Promise<boolean> {
    const cleanAddr = normalizeWalletAddress(address);
    const now = new Date();

    // Single atomic conditional UPDATE in PostgreSQL:
    // UPDATE auth_nonces SET consumed = true, "consumedAt" = now
    // WHERE nonce = $1 AND address = $2 AND consumed = false AND "expiresAt" > now;
    // Row-level lock ensures only one concurrent request can succeed.
    const result = await this.client.authNonce.updateMany({
      where: {
        nonce,
        address: cleanAddr,
        consumed: false,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        consumed: true,
        consumedAt: now,
      },
    });

    return result.count === 1;
  }

  public async getVerifiedWallet(address: string): Promise<VerifiedWalletRecord | null> {
    const clean = normalizeWalletAddress(address);
    const wallet = await this.client.verifiedWallet.findUnique({
      where: { walletAddress: clean },
    });
    return wallet ? this.mapWallet(wallet) : null;
  }

  public async getWalletsByUserId(userId: string): Promise<VerifiedWalletRecord[]> {
    const wallets = await this.client.verifiedWallet.findMany({
      where: { userId },
    });
    return wallets.map(this.mapWallet);
  }

  public async linkVerifiedWallet(data: {
    walletAddress: string;
    userId: string;
    chainId: number;
    signatureProof: string;
    nonceChallenge: string;
  }): Promise<VerifiedWalletRecord> {
    const cleanAddr = normalizeWalletAddress(data.walletAddress);
    const existing = await this.client.verifiedWallet.findUnique({
      where: { walletAddress: cleanAddr },
    });

    if (existing && existing.userId !== data.userId) {
      throw new Error(`Wallet address ${data.walletAddress} is already linked to another account`);
    }

    const userWallets = await this.client.verifiedWallet.findMany({
      where: { userId: data.userId },
    });
    const isPrimary = !existing ? userWallets.length === 0 : existing.isPrimary;

    const wallet = await this.client.verifiedWallet.upsert({
      where: { walletAddress: cleanAddr },
      create: {
        id: `wal_${crypto.randomUUID().slice(0, 8)}`,
        walletAddress: cleanAddr,
        userId: data.userId,
        chainId: data.chainId,
        isPrimary,
        nonceChallenge: data.nonceChallenge,
        signatureProof: data.signatureProof,
      },
      update: {
        chainId: data.chainId,
        nonceChallenge: data.nonceChallenge,
        signatureProof: data.signatureProof,
        verifiedAt: new Date(),
      },
    });

    return this.mapWallet(wallet);
  }

  public async createSession(userId: string, ttlHours = 24, ipAddress?: string): Promise<TradingBotSessionRecord> {
    const now = new Date();
    const expires = new Date(now.getTime() + ttlHours * 3600 * 1000);
    const sessionIdentifier = `sess_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(sessionIdentifier).digest('hex');

    const session = await this.client.tradingBotSession.create({
      data: {
        id: `srec_${crypto.randomUUID().slice(0, 8)}`,
        userId,
        sessionIdentifier,
        tokenHash,
        ipAddress: ipAddress || null,
        activatedAt: now,
        expiresAt: expires,
        isRevoked: false,
      },
    });

    return this.mapSession(session);
  }

  public async getSession(sessionIdentifier: string): Promise<TradingBotSessionRecord | null> {
    const session = await this.client.tradingBotSession.findUnique({
      where: { sessionIdentifier },
    });
    if (!session || session.isRevoked || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    return this.mapSession(session);
  }

  public async revokeSession(sessionIdentifier: string, reason = 'LOGOUT'): Promise<void> {
    await this.client.tradingBotSession.updateMany({
      where: { sessionIdentifier },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });
  }

  public async createAuditLog(data: {
    actorId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: Record<string, any>;
    ipAddress?: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  }): Promise<AuditLogRecord> {
    const log = await this.client.auditLog.create({
      data: {
        id: `aud_${crypto.randomUUID().slice(0, 8)}`,
        actorId: data.actorId ?? null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? null,
        metadata: data.metadata ?? undefined,
        ipAddress: data.ipAddress ?? null,
        severity: data.severity || 'INFO',
      },
    });
    return this.mapAuditLog(log);
  }

  public async getAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
    const logs = await this.client.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return logs.map(this.mapAuditLog);
  }

  // =========================================================================
  // STAGE B: INVESTOR & SUBSCRIPTION DATA
  // =========================================================================

  public async createPurchaseIntent(data: {
    idempotencyKey: string;
    userId: string;
    quoteId: string;
    walletAddress: string;
    amountUSD: number;
    tokenQuantity: string;
  }): Promise<PurchaseIntentRecord> {
    const existing = await this.client.purchaseIntent.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (existing) {
      return this.mapPurchaseIntent(existing);
    }

    const intent = await this.client.purchaseIntent.create({
      data: {
        id: `pint_${crypto.randomUUID().slice(0, 8)}`,
        idempotencyKey: data.idempotencyKey,
        userId: data.userId,
        quoteId: data.quoteId,
        walletAddress: normalizeWalletAddress(data.walletAddress),
        status: 'INITIATED',
        amountUSD: new Prisma.Decimal(data.amountUSD),
        tokenQuantity: data.tokenQuantity,
      },
    });

    return this.mapPurchaseIntent(intent);
  }

  public async createInvestorAllocation(data: {
    purchaseId: string;
    userId: string;
    walletAddress: string;
    investmentAmountUSD: number;
    tokenQuantity: string;
    lockTierMonths: number;
    lockStartTimeUTC: string;
    unlockTimeUTC: string;
    policyVersion: number;
    paymentVerificationStatus?: string;
    claimStatus?: AllocationClaimStatus;
    txHash?: string | null;
    idempotencyKey?: string | null;
    vestingScheduleId?: string | null;
    purchaseIntentId?: string | null;
    isDemoAllocation?: boolean;
  }): Promise<InvestorAllocationRecord> {
    if (data.idempotencyKey) {
      const existing = await this.client.investorAllocation.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        return this.mapAllocation(existing);
      }
    }

    const existingPurchase = await this.client.investorAllocation.findUnique({
      where: { purchaseId: data.purchaseId },
    });
    if (existingPurchase) {
      throw new Error(`Allocation for purchase ${data.purchaseId} already recorded (duplicate allocation rejection)`);
    }

    const alloc = await this.client.investorAllocation.create({
      data: {
        id: `alloc_${crypto.randomUUID().slice(0, 8)}`,
        purchaseId: data.purchaseId,
        idempotencyKey: data.idempotencyKey || null,
        userId: data.userId,
        walletAddress: normalizeWalletAddress(data.walletAddress),
        investmentAmountUSD: new Prisma.Decimal(data.investmentAmountUSD),
        tokenQuantity: data.tokenQuantity,
        lockTierMonths: data.lockTierMonths,
        lockStartTimeUTC: new Date(data.lockStartTimeUTC),
        unlockTimeUTC: new Date(data.unlockTimeUTC),
        policyVersion: data.policyVersion,
        paymentVerificationStatus: data.paymentVerificationStatus || 'VERIFIED',
        claimStatus: (data.claimStatus as any) || 'LOCKED',
        txHash: data.txHash || null,
        isDemoAllocation: data.isDemoAllocation !== undefined ? data.isDemoAllocation : false,
        vestingScheduleId: data.vestingScheduleId || null,
        purchaseIntentId: data.purchaseIntentId || null,
      },
    });

    return this.mapAllocation(alloc);
  }

  public async getAllocationsByUserId(userId: string): Promise<InvestorAllocationRecord[]> {
    const allocs = await this.client.investorAllocation.findMany({
      where: { userId },
    });
    return allocs.map(this.mapAllocation);
  }

  public async getAllocationById(id: string): Promise<InvestorAllocationRecord | null> {
    const alloc = await this.client.investorAllocation.findUnique({
      where: { id },
    });
    return alloc ? this.mapAllocation(alloc) : null;
  }

  // =========================================================================
  // PRE-LAUNCH OFFERING, PRICING & INVESTOR REPOSITORIES
  // =========================================================================

  public async getPrelaunchConfig(): Promise<PrelaunchConfig> {
    const latest = await this.client.auditLog.findFirst({
      where: { entity: 'PRELAUNCH_CONFIG' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest || !latest.metadata) {
      try {
        await this.client.auditLog.create({
          data: {
            actorId: null,
            action: 'CONFIG_INITIALIZED',
            entity: 'PRELAUNCH_CONFIG',
            entityId: 'v1',
            metadata: INITIAL_PRELAUNCH_CONFIG as any,
            severity: 'INFO',
          },
        });
      } catch {
        // Safe ignore on concurrent creation
      }
      return { ...INITIAL_PRELAUNCH_CONFIG };
    }

    const cfg = latest.metadata as any;
    return {
      version: cfg.version || 1,
      enabled: Boolean(cfg.enabled),
      startPriceINR: String(cfg.startPriceINR || '0.20'),
      targetPriceUSD: String(cfg.targetPriceUSD || '0.30'),
      durationDays: Number(cfg.durationDays || 30),
      pricingModel: cfg.pricingModel || 'LINEAR',
      updateMode: cfg.updateMode || 'CONTINUOUS',
      startTimeUTC: cfg.startTimeUTC || null,
      lockedInrPerUsd: cfg.lockedInrPerUsd || '86.50',
      fxRateSource: cfg.fxRateSource || 'Reserve Bank of India (RBI) Reference Rate',
      lockPeriodsMonths: cfg.lockPeriodsMonths || [3, 6, 12],
      status: cfg.status || 'DRAFT',
      investmentTiers: cfg.investmentTiers || DEFAULT_INVESTMENT_TIERS,
      quoteTtlSeconds: Number(cfg.quoteTtlSeconds || 900),
      lastUpdatedUTC: cfg.lastUpdatedUTC || latest.createdAt.toISOString(),
      updatedBy: cfg.updatedBy || 'SYSTEM',
    };
  }

  public async updatePrelaunchConfig(
    updates: Partial<PrelaunchConfig>,
    actorId = 'admin'
  ): Promise<{ success: boolean; config?: PrelaunchConfig; errors?: string[] }> {
    const current = await this.getPrelaunchConfig();

    const candidate: PrelaunchConfig = {
      ...current,
      ...updates,
      version: current.version + 1,
      lastUpdatedUTC: new Date().toISOString(),
      updatedBy: actorId,
    };

    if (updates.investmentTiers) {
      const tierVal = validateInvestmentTiers(updates.investmentTiers);
      if (!tierVal.valid) {
        return { success: false, errors: tierVal.errors };
      }
    }

    const configVal = validatePrelaunchConfig(candidate);
    if (!configVal.valid) {
      return { success: false, errors: configVal.errors };
    }

    await this.client.auditLog.create({
      data: {
        actorId: actorId.startsWith('usr_') ? actorId : null,
        action: 'CONFIG_UPDATED',
        entity: 'PRELAUNCH_CONFIG',
        entityId: `v${candidate.version}`,
        metadata: candidate as any,
        severity: 'INFO',
      },
    });

    return { success: true, config: candidate };
  }

  public async getPrelaunchConfigHistory(): Promise<PrelaunchConfig[]> {
    const logs = await this.client.auditLog.findMany({
      where: { entity: 'PRELAUNCH_CONFIG' },
      orderBy: { createdAt: 'asc' },
    });

    if (logs.length === 0) {
      return [{ ...INITIAL_PRELAUNCH_CONFIG }];
    }

    return logs.map((l: any) => l.metadata as PrelaunchConfig);
  }

  public async getPrelaunchAuditLogs(): Promise<PrelaunchAuditLog[]> {
    const logs = await this.client.auditLog.findMany({
      where: {
        entity: { in: ['PRELAUNCH_CONFIG', 'PRELAUNCH', 'INVESTOR_ALLOCATION'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return logs.map((l) => ({
      id: l.id,
      timestampUTC: l.createdAt.toISOString(),
      action: (l.action as any) || 'CONFIG_UPDATED',
      actorId: l.actorId || 'SYSTEM',
      details: (l.metadata as any) || {},
    }));
  }

  public async getCurrentPrelaunchPrice(serverTimeMs = Date.now()): Promise<PrelaunchPriceResult> {
    const config = await this.getPrelaunchConfig();
    return calculatePrelaunchPrice(config, serverTimeMs);
  }

  public async createInvestorQuote(
    req: PurchaseQuoteRequest,
    serverTimeMs = Date.now()
  ): Promise<{ success: boolean; quote?: PurchaseQuote; error?: string }> {
    if (!req.userId || !req.walletAddress) {
      return { success: false, error: 'User ID and wallet address are required to request a quote.' };
    }

    if (!req.investmentAmount || req.investmentAmount <= 0) {
      return { success: false, error: 'Investment amount must be greater than 0.' };
    }

    const config = await this.getPrelaunchConfig();
    const fxRate = Number(config.lockedInrPerUsd);
    if (!fxRate || fxRate <= 0) {
      return { success: false, error: 'Locked FX rate is not configured.' };
    }

    let amountUSD = req.investmentAmount;
    if (req.currency === 'INR') {
      amountUSD = req.investmentAmount / fxRate;
    }

    let tier: InvestmentLockTier;
    try {
      tier = getTierForInvestmentUSD(amountUSD, config.investmentTiers);
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    const priceResult = calculatePrelaunchPrice(config, serverTimeMs);
    const tokenPriceUSD = priceResult.priceUSD;
    const tokenPriceINR = priceResult.priceINR;
    const tokenQuantity = calculateTokenAllocation(amountUSD, tokenPriceUSD);

    const issuedAt = new Date(serverTimeMs);
    const expiresAt = new Date(serverTimeMs + config.quoteTtlSeconds * 1000);
    const lockStartTime = issuedAt;
    const estimatedUnlockTime = addCalendarMonthsUTC(lockStartTime, tier.lockMonths);

    const quoteId = `quote_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanAddr = normalizeWalletAddress(req.walletAddress);

    await this.client.$transaction(async (tx) => {
      // Ensure user exists in users table to satisfy foreign key
      await tx.user.upsert({
        where: { id: req.userId },
        update: {},
        create: {
          id: req.userId,
          username: req.userId.startsWith('usr_') ? req.userId : `investor_${req.userId.slice(0, 10)}`,
          role: 'USER',
          accountStatus: 'ACTIVE',
        },
      });

      await tx.investorQuote.create({
        data: {
          quoteId,
          userId: req.userId,
          walletAddress: cleanAddr,
          investmentAmount: new Prisma.Decimal(req.investmentAmount),
          currency: req.currency,
          investmentAmountUSD: new Prisma.Decimal(amountUSD.toFixed(2)),
          tokenPriceUSD,
          tokenPriceINR,
          tokenQuantity,
          lockTier: tier.id,
          lockMonths: tier.lockMonths,
          lockStartTimeUTC: lockStartTime,
          estimatedUnlockTimeUTC: estimatedUnlockTime,
          policyVersion: config.version,
          issuedAt,
          expiresAt,
          consumed: false,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.userId,
          action: 'QUOTE_ISSUED',
          entity: 'PRELAUNCH',
          entityId: quoteId,
          metadata: {
            quoteId,
            amountUSD,
            tier: tier.name,
            tokenQuantity,
          },
        },
      });
    });

    const quote: PurchaseQuote = {
      quoteId,
      userId: req.userId,
      walletAddress: cleanAddr,
      investmentAmount: req.investmentAmount,
      currency: req.currency,
      investmentAmountUSD: Number(amountUSD.toFixed(2)),
      tokenPriceUSD,
      tokenPriceINR,
      tokenQuantity,
      lockTier: { ...tier },
      lockMonths: tier.lockMonths,
      lockStartTimeUTC: lockStartTime.toISOString(),
      estimatedUnlockTimeUTC: estimatedUnlockTime.toISOString(),
      issuedAtUTC: issuedAt.toISOString(),
      expiresAtUTC: expiresAt.toISOString(),
      ttlSeconds: config.quoteTtlSeconds,
      policyVersion: config.version,
      isExpired: false,
    };

    return { success: true, quote };
  }

  public async getInvestorQuote(
    quoteId: string,
    serverTimeMs = Date.now()
  ): Promise<{ quote: PurchaseQuote | null; isExpired: boolean }> {
    const quote = await this.client.investorQuote.findUnique({
      where: { quoteId },
    });

    if (!quote || quote.consumed) {
      return { quote: null, isExpired: false };
    }

    const expiresAtMs = quote.expiresAt.getTime();
    const isExpired = serverTimeMs > expiresAtMs;

    const mapped = this.mapInvestorQuote(quote);
    return {
      quote: {
        ...mapped,
        isExpired,
      },
      isExpired,
    };
  }

  public async recordInvestorPurchase(
    quoteId: string,
    serverTimeMs = Date.now(),
    txHash: string | null = null,
    idempotencyKey: string | null = null
  ): Promise<{ success: boolean; record?: LockedPurchaseRecord; error?: string }> {
    try {
      return await this.client.$transaction(async (tx) => {
        // 1. Idempotency Check on existing allocation
        if (idempotencyKey) {
          const existingAlloc = await tx.investorAllocation.findUnique({
            where: { idempotencyKey },
          });
          if (existingAlloc) {
            return {
              success: true,
              record: this.mapAllocationToPurchaseRecord(existingAlloc),
            };
          }
        }

        // 2. Atomically consume the quote (Conditional UPDATE preventing race conditions)
        const updateResult = await tx.investorQuote.updateMany({
          where: {
            quoteId,
            consumed: false,
          },
          data: {
            consumed: true,
            consumedAt: new Date(serverTimeMs),
          },
        });

        if (updateResult.count === 0) {
          const existingQuote = await tx.investorQuote.findUnique({ where: { quoteId } });
          if (!existingQuote) {
            return { success: false, error: 'Quote not found.' };
          }
          return {
            success: false,
            error: 'QUOTE_NOT_FOUND_OR_ALREADY_USED: Quote does not exist or has already been consumed (replay defense).',
          };
        }

        const quote = await tx.investorQuote.findUnique({ where: { quoteId } });
        if (!quote) {
          return { success: false, error: 'Quote not found.' };
        }

        // Check expiration
        const expiresAtMs = quote.expiresAt.getTime();
        if (serverTimeMs > expiresAtMs) {
          return {
            success: false,
            error: 'QUOTE_EXPIRED: Purchase quote has expired (15-minute TTL). Please request a fresh quote.',
          };
        }

        const purchaseId = `purch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const purchaseTime = new Date(serverTimeMs);
        const unlockTime = addCalendarMonthsUTC(purchaseTime, quote.lockMonths);

        // 3. Create PurchaseIntent
        const effectiveIntentKey = idempotencyKey || `intent_${quoteId}`;
        const intent = await tx.purchaseIntent.create({
          data: {
            id: `pint_${crypto.randomUUID().slice(0, 8)}`,
            idempotencyKey: effectiveIntentKey,
            userId: quote.userId,
            quoteId: quote.quoteId,
            walletAddress: quote.walletAddress,
            status: 'ALLOCATED',
            amountUSD: quote.investmentAmountUSD,
            tokenQuantity: quote.tokenQuantity,
          },
        });

        // 4. Create VestingSchedule
        const vesting = await tx.vestingSchedule.create({
          data: {
            id: `vest_${crypto.randomUUID().slice(0, 8)}`,
            userId: quote.userId,
            beneficiaryWallet: quote.walletAddress,
            totalTokensRaw: quote.tokenQuantity,
            releasedTokensRaw: '0',
            cliffDurationMonths: 0,
            lockDurationMonths: quote.lockMonths,
            startAt: purchaseTime,
            cliffEndAt: unlockTime,
            lockEndAt: unlockTime,
          },
        });

        // 5. Create InvestorAllocation
        const alloc = await tx.investorAllocation.create({
          data: {
            id: `alloc_${crypto.randomUUID().slice(0, 8)}`,
            purchaseId,
            idempotencyKey: idempotencyKey || null,
            userId: quote.userId,
            walletAddress: quote.walletAddress,
            investmentAmountUSD: quote.investmentAmountUSD,
            tokenQuantity: quote.tokenQuantity,
            lockTierMonths: quote.lockMonths,
            lockStartTimeUTC: purchaseTime,
            unlockTimeUTC: unlockTime,
            policyVersion: quote.policyVersion,
            paymentVerificationStatus: 'VERIFIED',
            claimStatus: 'LOCKED',
            txHash: txHash || null,
            isDemoAllocation: true, // Safety guard: simulated allocation
            vestingScheduleId: vesting.id,
            purchaseIntentId: intent.id,
          },
        });

        // 6. Audit Logging
        await tx.auditLog.create({
          data: {
            actorId: quote.userId,
            action: 'PURCHASE_RECORDED',
            entity: 'INVESTOR_ALLOCATION',
            entityId: alloc.id,
            metadata: {
              purchaseId,
              quoteId,
              tokens: quote.tokenQuantity,
              lockMonths: quote.lockMonths,
              unlockTimeUTC: unlockTime.toISOString(),
              isDemoAllocation: true,
            },
            severity: 'INFO',
          },
        });

        const record: LockedPurchaseRecord = {
          purchaseId,
          userId: quote.userId,
          walletAddress: quote.walletAddress,
          investmentAmount: Number(quote.investmentAmount),
          currency: quote.currency as any,
          purchasePriceUSD: quote.tokenPriceUSD,
          tokenQuantity: quote.tokenQuantity,
          lockTierMonths: quote.lockMonths as any,
          lockStartTimeUTC: purchaseTime.toISOString(),
          unlockTimeUTC: unlockTime.toISOString(),
          policyVersion: quote.policyVersion,
          paymentVerificationStatus: 'VERIFIED',
          claimStatus: 'LOCKED',
          txHash: txHash || null,
          createdAtUTC: purchaseTime.toISOString(),
        };

        return { success: true, record };
      });
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to record purchase' };
    }
  }

  public async getUserInvestorPurchases(userId: string): Promise<LockedPurchaseRecord[]> {
    const allocs = await this.client.investorAllocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return allocs.map(this.mapAllocationToPurchaseRecord);
  }

  public async getAllInvestorPurchases(): Promise<LockedPurchaseRecord[]> {
    const allocs = await this.client.investorAllocation.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return allocs.map(this.mapAllocationToPurchaseRecord);
  }

  public async createVestingSchedule(data: {
    userId: string;
    beneficiaryWallet: string;
    totalTokensRaw: string;
    cliffDurationMonths?: number;
    lockDurationMonths: number;
    startAt: string;
    lockEndAt: string;
    onChainVaultContract?: string | null;
  }): Promise<VestingScheduleRecord> {
    const record = await this.client.vestingSchedule.create({
      data: {
        id: `vest_${crypto.randomUUID().slice(0, 8)}`,
        userId: data.userId,
        beneficiaryWallet: normalizeWalletAddress(data.beneficiaryWallet),
        totalTokensRaw: data.totalTokensRaw,
        releasedTokensRaw: '0',
        cliffDurationMonths: data.cliffDurationMonths || 0,
        lockDurationMonths: data.lockDurationMonths,
        startAt: new Date(data.startAt),
        cliffEndAt: new Date(data.startAt),
        lockEndAt: new Date(data.lockEndAt),
        isRevoked: false,
        onChainVaultContract: data.onChainVaultContract || null,
      },
    });

    return this.mapVesting(record);
  }

  public async getPaymentByTxHash(txHash: string): Promise<PaymentTransactionRecord | null> {
    const clean = txHash.toLowerCase().trim();
    const payment = await this.client.paymentTransaction.findFirst({
      where: { txHash: clean },
    });
    return payment ? this.mapPayment(payment) : null;
  }

  public async recordPayment(data: {
    txHash: string;
    chainId: number;
    tokenAddress: string;
    payingWallet: string;
    treasuryAddress: string;
    amount: number;
    tokenSymbol: PaymentToken;
    status: PaymentStatus;
    blockNumber: number | null;
    confirmations?: number;
    associatedSubscriptionId?: string | null;
    idempotencyKey?: string | null;
    networkId?: string;
    amountRaw?: string;
  }): Promise<PaymentTransactionRecord> {
    const cleanTx = data.txHash.toLowerCase().trim();
    const cleanPaying = normalizeWalletAddress(data.payingWallet);

    if (data.idempotencyKey) {
      const existing = await this.client.paymentTransaction.findFirst({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) return this.mapPayment(existing);
    }

    const existingTx = await this.client.paymentTransaction.findFirst({
      where: { txHash: cleanTx, chainId: data.chainId },
    });
    if (existingTx) {
      throw new Error(`Payment transaction ${data.txHash} has already been recorded (idempotency violation)`);
    }

    // Ensure paying wallet exists in verified_wallets to satisfy foreign key
    const existingWallet = await this.client.verifiedWallet.findUnique({
      where: { walletAddress: cleanPaying },
    });
    if (!existingWallet) {
      // Find or create fallback shadow user for on-chain paying wallet
      const fallbackUser = await this.client.user.upsert({
        where: { username: `wallet_${cleanPaying.slice(0, 10)}` },
        create: {
          username: `wallet_${cleanPaying.slice(0, 10)}`,
          role: 'USER',
        },
        update: {},
      });
      await this.client.verifiedWallet.create({
        data: {
          walletAddress: cleanPaying,
          userId: fallbackUser.id,
          chainId: data.chainId,
        },
      });
    }

    const payment = await this.client.paymentTransaction.create({
      data: {
        id: `pay_${crypto.randomUUID().slice(0, 8)}`,
        txHash: cleanTx,
        chainId: data.chainId,
        networkId: data.networkId || 'bsc-testnet',
        tokenAddress: normalizeWalletAddress(data.tokenAddress),
        payingWallet: cleanPaying,
        treasuryAddress: normalizeWalletAddress(data.treasuryAddress),
        amount: new Prisma.Decimal(data.amount),
        amountRaw: data.amountRaw || '0',
        tokenSymbol: data.tokenSymbol,
        status: data.status,
        blockNumber: data.blockNumber !== null ? BigInt(data.blockNumber) : null,
        confirmations: data.confirmations || 0,
        associatedSubscriptionId: data.associatedSubscriptionId || null,
        idempotencyKey: data.idempotencyKey || null,
        verifiedAt: data.status === 'CONFIRMED' ? new Date() : null,
      },
    });

    return this.mapPayment(payment);
  }

  public async recordPaymentTransaction(data: Parameters<PrismaDatabaseAdapter['recordPayment']>[0]): Promise<PaymentTransactionRecord> {
    return this.recordPayment(data);
  }

  public async flagReorganization(txHash: string, reason = 'ORPHANED_BLOCK'): Promise<PaymentTransactionRecord> {
    const cleanTx = txHash.toLowerCase().trim();
    const existing = await this.client.paymentTransaction.findFirst({
      where: { txHash: cleanTx },
    });
    if (!existing) {
      throw new Error(`Transaction ${txHash} not found for reorganization handling`);
    }

    const updated = await this.client.paymentTransaction.update({
      where: { id: existing.id },
      data: {
        reorgDetected: true,
        status: 'FAILED',
      },
    });

    await this.createAuditLog({
      action: 'PAYMENT_REORGANIZATION_DETECTED',
      entity: 'PaymentTransaction',
      entityId: updated.id,
      severity: 'CRITICAL',
      metadata: { txHash: cleanTx, reason },
    });

    return this.mapPayment(updated);
  }

  public async getPlanById(id: string): Promise<SubscriptionPlanRecord | null> {
    const plan = await this.client.subscriptionPlan.findUnique({ where: { id } });
    return plan ? this.mapPlan(plan) : null;
  }

  public async ensureDefaultPlans(): Promise<void> {
    const plansToSeed = [
      {
        id: 'PLAN_MONTHLY',
        name: 'Trader Monthly',
        durationDays: 30,
        priceUsd: new Prisma.Decimal(49),
        priceLiora: new Prisma.Decimal(980),
        priceUsdt: new Prisma.Decimal(49),
        billingPeriodLabel: 'Per month',
        isPopular: false,
        features: [
          'Full ALGOX V6_1_24 Long/Short Signals',
          'Multi-timeframe Telemetry (15m, 1H, 4H)',
          'Automated Take-Profit 1 & 2 Targets',
          'Dynamic Trailing Stop-Loss Calculations',
          'Email & Webhook Signal Alerts',
          'Telegram Community Trading Desk',
        ],
        isActive: true,
      },
      {
        id: 'PLAN_QUARTERLY',
        name: 'Pro Quarterly',
        durationDays: 90,
        priceUsd: new Prisma.Decimal(119),
        priceLiora: new Prisma.Decimal(2380),
        priceUsdt: new Prisma.Decimal(119),
        billingPeriodLabel: 'Per 3 months',
        isPopular: true,
        features: [
          'All Monthly Plan Features Included',
          'VIP Priority Webhook Execution (<10ms)',
          'Private Trading Desk Group Access',
          'Custom Pine Script Alert Integrations',
          'Direct Strategy Optimization Consults',
          '20% Subscription Rate Savings',
        ],
        isActive: true,
      },
      {
        id: 'PLAN_ANNUAL',
        name: 'Institutional Annual',
        durationDays: 365,
        priceUsd: new Prisma.Decimal(399),
        priceLiora: new Prisma.Decimal(7980),
        priceUsdt: new Prisma.Decimal(399),
        billingPeriodLabel: 'Per year',
        isPopular: false,
        features: [
          'All Pro Quarterly Features Included',
          'Dedicated Private Strategy Webhook Relay',
          '1-on-1 Trading Desk Strategy Reviews',
          'Raw Webhook Payload Access & APIs',
          'Exclusive Multi-Chain Arbitrage Alerts',
          '33% Subscription Rate Savings',
        ],
        isActive: true,
      },
    ];

    for (const p of plansToSeed) {
      await this.client.subscriptionPlan.upsert({
        where: { id: p.id },
        create: p,
        update: {},
      });
    }
  }

  public async getPlans(): Promise<SubscriptionPlanRecord[]> {
    let plans = await this.client.subscriptionPlan.findMany({
      where: { isActive: true },
    });
    if (plans.length === 0 || !plans.some((p) => p.id === 'PLAN_MONTHLY')) {
      await this.ensureDefaultPlans();
      plans = await this.client.subscriptionPlan.findMany({
        where: { isActive: true },
      });
    }
    return plans.map(this.mapPlan);
  }

  public async updatePlan(id: string, updates: Partial<SubscriptionPlanRecord>): Promise<SubscriptionPlanRecord> {
    const plan = await this.client.subscriptionPlan.update({
      where: { id },
      data: {
        name: updates.name,
        durationDays: updates.durationDays,
        priceUsd: updates.priceUsd !== undefined ? new Prisma.Decimal(updates.priceUsd) : undefined,
        priceLiora: updates.priceLiora !== undefined ? new Prisma.Decimal(updates.priceLiora) : undefined,
        priceUsdt: updates.priceUsdt !== undefined ? new Prisma.Decimal(updates.priceUsdt) : undefined,
        billingPeriodLabel: updates.billingPeriodLabel,
        isPopular: updates.isPopular,
        features: updates.features,
        isActive: updates.isActive,
      },
    });
    return this.mapPlan(plan);
  }

  public async getSubscriptionByUserId(userId: string): Promise<TradingBotSubscriptionRecord | null> {
    const sub = await this.client.tradingBotSubscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return sub ? this.mapSubscription(sub) : null;
  }

  public async renewSubscription(userId: string, planId: string, txHash: string): Promise<TradingBotSubscriptionRecord> {
    const plan = await this.getPlanById(planId);
    if (!plan) throw new Error(`Subscription plan ${planId} not found`);

    const existingSub = await this.getSubscriptionByUserId(userId);
    const now = new Date();
    let startsAt = now;
    let expiresAt: Date;

    if (existingSub && existingSub.status === 'ACTIVE_PAID' && new Date(existingSub.expiresAt) > now) {
      startsAt = new Date(existingSub.startsAt);
      const currentExpiry = new Date(existingSub.expiresAt);
      expiresAt = new Date(currentExpiry.getTime() + plan.durationDays * 86400 * 1000);
    } else {
      expiresAt = new Date(now.getTime() + plan.durationDays * 86400 * 1000);
    }

    const sub = await this.client.tradingBotSubscription.create({
      data: {
        id: `sub_${crypto.randomUUID().slice(0, 8)}`,
        userId,
        planId,
        status: 'ACTIVE_PAID',
        startsAt,
        expiresAt,
        autoRenew: false,
        paymentRef: txHash,
      },
    });

    await this.createAuditLog({
      actorId: userId,
      action: 'SUBSCRIPTION_RENEWED',
      entity: 'TradingBotSubscription',
      entityId: sub.id,
      severity: 'INFO',
      metadata: { planId, txHash },
    });

    return this.mapSubscription(sub);
  }

  public async setSubscription(subscription: TradingBotSubscriptionRecord): Promise<TradingBotSubscriptionRecord> {
    const sub = await this.client.tradingBotSubscription.upsert({
      where: { id: subscription.id },
      create: {
        id: subscription.id,
        userId: subscription.userId,
        planId: subscription.planId,
        status: subscription.status,
        startsAt: new Date(subscription.startsAt),
        expiresAt: new Date(subscription.expiresAt),
        autoRenew: subscription.autoRenew,
        paymentRef: subscription.paymentRef,
        isRevoked: subscription.isRevoked,
        revokedAt: subscription.revokedAt ? new Date(subscription.revokedAt) : null,
        revocationReason: subscription.revocationReason,
      },
      update: {
        status: subscription.status,
        startsAt: new Date(subscription.startsAt),
        expiresAt: new Date(subscription.expiresAt),
        autoRenew: subscription.autoRenew,
        paymentRef: subscription.paymentRef,
        isRevoked: subscription.isRevoked,
        revokedAt: subscription.revokedAt ? new Date(subscription.revokedAt) : null,
        revocationReason: subscription.revocationReason,
      },
    });
    return this.mapSubscription(sub);
  }

  public async revokeSubscription(userId: string, reason: string, adminId?: string): Promise<TradingBotSubscriptionRecord> {
    const existing = await this.getSubscriptionByUserId(userId);
    if (!existing) throw new Error(`No subscription found for user ${userId}`);

    const sub = await this.client.tradingBotSubscription.update({
      where: { id: existing.id },
      data: {
        status: 'REVOKED',
        isRevoked: true,
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });

    await this.createAuditLog({
      actorId: adminId || 'SYSTEM',
      action: 'SUBSCRIPTION_REVOKED',
      entity: 'TradingBotSubscription',
      entityId: sub.id,
      severity: 'WARNING',
      metadata: { userId, reason },
    });

    return this.mapSubscription(sub);
  }

  public async getAllSubscribers(): Promise<{
    subscriptions: TradingBotSubscriptionRecord[];
    trials: TradingBotTrialRecord[];
  }> {
    const subscriptions = await this.client.tradingBotSubscription.findMany();
    const trials = await this.client.tradingBotTrial.findMany();
    return {
      subscriptions: subscriptions.map(this.mapSubscription),
      trials: trials.map(this.mapTrial),
    };
  }

  public async activateTrial(userId: string, walletAddress: string, durationHours = 48): Promise<TradingBotTrialRecord> {
    const cleanWallet = normalizeWalletAddress(walletAddress);
    const existingUserTrial = await this.client.tradingBotTrial.findFirst({
      where: { userId },
    });
    if (existingUserTrial) {
      throw new Error(`User ${userId} has already redeemed the 48-Hour Free Trial`);
    }

    const existingWalletTrial = await this.client.tradingBotTrial.findFirst({
      where: { walletAddress: cleanWallet },
    });
    if (existingWalletTrial) {
      throw new Error(`This wallet address has already been used to claim a 48-Hour Free Trial`);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + durationHours * 3600 * 1000);

    // Ensure trial plan exists to satisfy foreign key constraint
    await this.client.subscriptionPlan.upsert({
      where: { id: 'PLAN_TRIAL_48H' },
      create: {
        id: 'PLAN_TRIAL_48H',
        name: '48-Hour Free Trial',
        durationDays: 2,
        priceUsd: new Prisma.Decimal(0),
        priceLiora: new Prisma.Decimal(0),
        priceUsdt: new Prisma.Decimal(0),
        billingPeriodLabel: '48 Hours',
        features: ['Full ALGOX Signals', '48-Hour Sandbox'],
        isActive: true,
      },
      update: {},
    });

    const trial = await this.client.tradingBotTrial.create({
      data: {
        id: `trl_${crypto.randomUUID().slice(0, 8)}`,
        userId,
        walletAddress: cleanWallet,
        startedAt: now,
        expiresAt: expires,
        durationHours,
        trialUsed: true,
      },
    });

    // Create corresponding subscription record in TRIAL_ACTIVE state
    await this.client.tradingBotSubscription.create({
      data: {
        id: `sub_trl_${crypto.randomUUID().slice(0, 8)}`,
        userId,
        planId: 'PLAN_TRIAL_48H',
        status: 'TRIAL_ACTIVE',
        startsAt: now,
        expiresAt: expires,
        autoRenew: false,
        paymentRef: 'FREE_TRIAL',
      },
    });

    await this.createAuditLog({
      actorId: userId,
      action: 'TRIAL_ACTIVATED',
      entity: 'TradingBotTrial',
      entityId: trial.id,
      severity: 'INFO',
      metadata: { wallet: cleanWallet, durationHours },
    });

    return this.mapTrial(trial);
  }

  public async startTrial(userId: string, walletAddress: string, durationHours = 48): Promise<TradingBotTrialRecord> {
    return this.activateTrial(userId, walletAddress, durationHours);
  }

  public async getTrialByUserId(userId: string): Promise<TradingBotTrialRecord | null> {
    const trial = await this.client.tradingBotTrial.findFirst({
      where: { userId },
    });
    return trial ? this.mapTrial(trial) : null;
  }

  public async getTrialByWallet(walletAddress: string): Promise<TradingBotTrialRecord | null> {
    const clean = normalizeWalletAddress(walletAddress);
    const trial = await this.client.tradingBotTrial.findFirst({
      where: { walletAddress: clean },
    });
    return trial ? this.mapTrial(trial) : null;
  }

  // =========================================================================
  // STAGE C: FINANCIAL ACCOUNTING, BALANCES & DOUBLE-ENTRY LEDGER
  // =========================================================================

  public async getTokenBalance(userId: string, tokenSymbol: string, isDemo = true): Promise<TokenBalanceRecord> {
    const cleanSymbol = tokenSymbol.toUpperCase();
    const bal = await this.client.tokenBalance.findUnique({
      where: {
        userId_tokenSymbol_isDemoBalance: {
          userId,
          tokenSymbol: cleanSymbol,
          isDemoBalance: isDemo,
        },
      },
    });

    if (!bal) {
      return {
        id: `bal_${crypto.randomUUID().slice(0, 8)}`,
        userId,
        tokenSymbol: cleanSymbol,
        balance: 0,
        balanceRaw: '0',
        lockedBalance: 0,
        isDemoBalance: isDemo,
        updatedAt: new Date().toISOString(),
      };
    }

    return this.mapBalance(bal);
  }

  public async recordBalanceMovement(data: {
    userId: string;
    tokenSymbol: string;
    amount: number;
    amountRaw: string;
    entryType: LedgerEntryType;
    reason: LedgerReason;
    referenceId?: string | null;
    idempotencyKey?: string | null;
    isDemo?: boolean;
    assetId?: string;
  }): Promise<{ balance: TokenBalanceRecord; movement: BalanceMovementRecord }> {
    const isDemo = data.isDemo !== undefined ? data.isDemo : true;
    const cleanSymbol = data.tokenSymbol.toUpperCase();

    // Idempotency check
    if (data.idempotencyKey) {
      const existingMovement = await this.client.balanceMovement.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existingMovement) {
        const currentBal = await this.getTokenBalance(data.userId, cleanSymbol, isDemo);
        return { balance: currentBal, movement: this.mapMovement(existingMovement) };
      }
    }

    if (data.amount <= 0) {
      throw new Error(`Ledger movement amount must be positive. Received: ${data.amount}`);
    }

    // Default canonical asset keys if omitted
    const defaultAssetId =
      cleanSymbol === 'LIORA'
        ? 'bsc-testnet:bep20:0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877'
        : cleanSymbol === 'USDT'
        ? 'bsc-testnet:bep20:0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'
        : `bsc-testnet:native:${cleanSymbol.toLowerCase()}`;
    const assetId = data.assetId || defaultAssetId;

    return this.transaction(async (tx) => {
      // Find or create existing balance
      let currentBal = await tx.client.tokenBalance.findUnique({
        where: {
          userId_tokenSymbol_isDemoBalance: {
            userId: data.userId,
            tokenSymbol: cleanSymbol,
            isDemoBalance: isDemo,
          },
        },
      });

      if (!currentBal) {
        currentBal = await tx.client.tokenBalance.create({
          data: {
            id: `bal_${crypto.randomUUID().slice(0, 8)}`,
            userId: data.userId,
            tokenSymbol: cleanSymbol,
            assetId,
            decimals: 18,
            balance: new Prisma.Decimal(0),
            balanceRaw: '0',
            balanceBaseUnits: new Prisma.Decimal(0),
            lockedBalance: new Prisma.Decimal(0),
            lockedBaseUnits: new Prisma.Decimal(0),
            isDemoBalance: isDemo,
          },
        });
      }

      const currentBaseUnits = BigInt(
        (currentBal.balanceBaseUnits as any).toFixed
          ? (currentBal.balanceBaseUnits as any).toFixed()
          : currentBal.balanceBaseUnits.toString()
      );
      const changeBaseUnits = BigInt(data.amountRaw || '0');

      if (changeBaseUnits <= 0n) {
        throw new Error(`Ledger movement base units must be positive. Received: ${data.amountRaw}`);
      }

      if (data.entryType === 'DEBIT' && currentBaseUnits < changeBaseUnits) {
        throw new Error(`Insufficient balance for debit. Available: ${currentBal.balance.toNumber()}, Required: ${data.amount}`);
      }

      const newBaseUnits =
        data.entryType === 'CREDIT' ? currentBaseUnits + changeBaseUnits : currentBaseUnits - changeBaseUnits;

      const updatedBal = await tx.client.tokenBalance.update({
        where: { id: currentBal.id },
        data: {
          balanceBaseUnits: new Prisma.Decimal(newBaseUnits.toString()),
          balanceRaw: newBaseUnits.toString(),
        },
      });

      // Double-Entry Ledger: Ledger Accounts and Postings
      let counterType: 'PLATFORM_CUSTODY' | 'CLEARING' | 'FEE' = 'CLEARING';
      if (data.reason === 'FEE') {
        counterType = 'FEE';
      } else if (data.reason === 'DEPOSIT' || data.reason === 'WITHDRAWAL') {
        counterType = 'PLATFORM_CUSTODY';
      }

      let userAccount = await tx.client.ledgerAccount.findFirst({
        where: {
          userId: data.userId,
          accountType: 'USER_AVAILABLE',
          assetId,
          isDemo,
        },
      });

      if (!userAccount) {
        userAccount = await tx.client.ledgerAccount.create({
          data: {
            id: `acc_usr_${crypto.randomUUID().slice(0, 8)}`,
            userId: data.userId,
            accountType: 'USER_AVAILABLE',
            assetId,
            isDemo,
          },
        });
      }

      let counterAccount = await tx.client.ledgerAccount.findFirst({
        where: {
          userId: null,
          accountType: counterType,
          assetId,
          isDemo,
        },
      });

      if (!counterAccount) {
        counterAccount = await tx.client.ledgerAccount.create({
          data: {
            id: `acc_plt_${counterType.toLowerCase()}_${crypto.randomUUID().slice(0, 8)}`,
            userId: null,
            accountType: counterType,
            assetId,
            isDemo,
          },
        });
      }

      const journalId = `jrn_${crypto.randomUUID().slice(0, 8)}`;
      await tx.client.journalTransaction.create({
        data: {
          id: journalId,
          reason: data.reason,
          description: `Movement ${data.entryType} ${data.amount} ${cleanSymbol}`,
          referenceId: data.referenceId || null,
          isDemo,
          idempotencyKey: data.idempotencyKey ? `jrn_${data.idempotencyKey}` : null,
        },
      });

      const userDirection = data.entryType;
      const counterDirection = data.entryType === 'CREDIT' ? 'DEBIT' : 'CREDIT';

      await tx.client.ledgerPosting.create({
        data: {
          id: `pst_${crypto.randomUUID().slice(0, 8)}`,
          journalId,
          accountId: userAccount.id,
          assetId,
          direction: userDirection,
          amountBaseUnits: new Prisma.Decimal(changeBaseUnits.toString()),
          sequence: 0,
        },
      });

      await tx.client.ledgerPosting.create({
        data: {
          id: `pst_${crypto.randomUUID().slice(0, 8)}`,
          journalId,
          accountId: counterAccount.id,
          assetId,
          direction: counterDirection,
          amountBaseUnits: new Prisma.Decimal(changeBaseUnits.toString()),
          sequence: 1,
        },
      });

      const movement = await tx.client.balanceMovement.create({
        data: {
          id: `mov_${crypto.randomUUID().slice(0, 8)}`,
          balanceId: currentBal.id,
          userId: data.userId,
          tokenSymbol: cleanSymbol,
          amount: new Prisma.Decimal(data.amount),
          amountRaw: data.amountRaw,
          entryType: data.entryType,
          reason: data.reason,
          referenceId: data.referenceId || journalId,
          idempotencyKey: data.idempotencyKey || null,
          isDemo,
        },
      });

      return {
        balance: tx.mapBalance(updatedBal),
        movement: tx.mapMovement(movement),
      };
    });
  }

  public async createTradingOrder(data: {
    orderId: string;
    userId: string;
    pair: string;
    side: 'BUY' | 'SELL';
    orderType?: 'MARKET' | 'LIMIT';
    price?: number | null;
    amount: number;
    amountRaw: string;
    isDemoOrder?: boolean;
  }): Promise<TradingOrderRecord> {
    const order = await this.client.tradingOrder.create({
      data: {
        id: `ord_${crypto.randomUUID().slice(0, 8)}`,
        orderId: data.orderId,
        userId: data.userId,
        pair: data.pair,
        side: data.side,
        orderType: data.orderType || 'MARKET',
        price: data.price !== null && data.price !== undefined ? new Prisma.Decimal(data.price) : null,
        amount: new Prisma.Decimal(data.amount),
        amountRaw: data.amountRaw,
        filledAmount: new Prisma.Decimal(0),
        status: 'OPEN',
        isDemoOrder: data.isDemoOrder !== undefined ? data.isDemoOrder : true,
      },
    });

    return this.mapOrder(order);
  }

  public async getTradingOrder(orderId: string): Promise<TradingOrderRecord | null> {
    const order = await this.client.tradingOrder.findUnique({
      where: { orderId },
    });
    return order ? this.mapOrder(order) : null;
  }

  // =========================================================================
  // MODEL MAPPING HELPERS
  // =========================================================================

  private mapUser(u: any): UserRecord {
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role,
      accountStatus: u.accountStatus,
      isDevelopmentOnly: u.isDevelopmentOnly,
      mfaSecret: u.mfaSecret,
      isMfaEnabled: u.isMfaEnabled,
      failedLoginAttempts: u.failedLoginAttempts,
      lockedUntil: u.lockedUntil ? u.lockedUntil.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }

  private mapWallet(w: any): VerifiedWalletRecord {
    return {
      id: w.id,
      walletAddress: w.walletAddress,
      userId: w.userId,
      chainId: w.chainId,
      verifiedAt: w.verifiedAt.toISOString(),
      isPrimary: w.isPrimary,
      nonceChallenge: w.nonceChallenge,
      signatureProof: w.signatureProof,
    };
  }

  private mapSession(s: any): TradingBotSessionRecord {
    return {
      id: s.id,
      userId: s.userId,
      sessionIdentifier: s.sessionIdentifier,
      tokenHash: s.tokenHash,
      ipAddress: s.ipAddress,
      userAgent: null,
      activatedAt: s.activatedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isRevoked: s.isRevoked,
      revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
      revocationReason: s.revocationReason,
    };
  }

  private mapAuditLog(a: any): AuditLogRecord {
    return {
      id: a.id,
      actorId: a.actorId,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      metadata: a.metadata,
      ipAddress: a.ipAddress,
      severity: a.severity,
      createdAt: a.createdAt.toISOString(),
    };
  }

  private mapPurchaseIntent(p: any): PurchaseIntentRecord {
    return {
      id: p.id,
      idempotencyKey: p.idempotencyKey,
      userId: p.userId,
      quoteId: p.quoteId,
      walletAddress: p.walletAddress,
      status: p.status,
      amountUSD: Number(p.amountUSD),
      tokenQuantity: p.tokenQuantity,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private mapAllocation(a: any): InvestorAllocationRecord {
    return {
      id: a.id,
      purchaseId: a.purchaseId,
      idempotencyKey: a.idempotencyKey,
      userId: a.userId,
      walletAddress: a.walletAddress,
      investmentAmountUSD: Number(a.investmentAmountUSD),
      tokenQuantity: a.tokenQuantity,
      lockTierMonths: a.lockTierMonths,
      lockStartTimeUTC: a.lockStartTimeUTC.toISOString(),
      unlockTimeUTC: a.unlockTimeUTC.toISOString(),
      policyVersion: a.policyVersion,
      paymentVerificationStatus: a.paymentVerificationStatus,
      claimStatus: a.claimStatus,
      txHash: a.txHash,
      isDemoAllocation: a.isDemoAllocation,
      vestingScheduleId: a.vestingScheduleId,
      purchaseIntentId: a.purchaseIntentId,
      createdAt: a.createdAt.toISOString(),
    };
  }

  private mapInvestorQuote(q: any): PurchaseQuote {
    const tier = DEFAULT_INVESTMENT_TIERS.find((t) => t.id === q.lockTier) || {
      id: q.lockTier,
      name: `${q.lockMonths}-Month Allocation`,
      minAmountUSD: 100,
      maxAmountUSD: null,
      lockMonths: q.lockMonths as any,
      description: `${q.lockMonths}-month locking period`,
    };

    return {
      quoteId: q.quoteId,
      userId: q.userId,
      walletAddress: q.walletAddress,
      investmentAmount: Number(q.investmentAmount),
      currency: q.currency,
      investmentAmountUSD: Number(q.investmentAmountUSD),
      tokenPriceUSD: q.tokenPriceUSD,
      tokenPriceINR: q.tokenPriceINR,
      tokenQuantity: q.tokenQuantity,
      lockTier: tier,
      lockMonths: q.lockMonths as any,
      lockStartTimeUTC: q.lockStartTimeUTC.toISOString(),
      estimatedUnlockTimeUTC: q.estimatedUnlockTimeUTC.toISOString(),
      issuedAtUTC: q.issuedAt.toISOString(),
      expiresAtUTC: q.expiresAt.toISOString(),
      ttlSeconds: Math.round((q.expiresAt.getTime() - q.issuedAt.getTime()) / 1000),
      policyVersion: q.policyVersion,
      isExpired: Date.now() > q.expiresAt.getTime(),
    };
  }

  private mapAllocationToPurchaseRecord(a: any): LockedPurchaseRecord {
    return {
      purchaseId: a.purchaseId,
      userId: a.userId,
      walletAddress: a.walletAddress,
      investmentAmount: Number(a.investmentAmountUSD),
      currency: 'USD',
      purchasePriceUSD: '0.05',
      tokenQuantity: a.tokenQuantity,
      lockTierMonths: a.lockTierMonths as any,
      lockStartTimeUTC: a.lockStartTimeUTC.toISOString(),
      unlockTimeUTC: a.unlockTimeUTC.toISOString(),
      policyVersion: a.policyVersion,
      paymentVerificationStatus: (a.paymentVerificationStatus as any) || 'VERIFIED',
      claimStatus: (a.claimStatus as any) || 'LOCKED',
      txHash: a.txHash || null,
      createdAtUTC: a.createdAt.toISOString(),
    };
  }

  private mapVesting(v: any): VestingScheduleRecord {
    return {
      id: v.id,
      userId: v.userId,
      beneficiaryWallet: v.beneficiaryWallet,
      totalTokensRaw: v.totalTokensRaw,
      releasedTokensRaw: v.releasedTokensRaw,
      cliffDurationMonths: v.cliffDurationMonths,
      lockDurationMonths: v.lockDurationMonths,
      startAt: v.startAt.toISOString(),
      cliffEndAt: v.cliffEndAt.toISOString(),
      lockEndAt: v.lockEndAt.toISOString(),
      isRevoked: v.isRevoked,
      revokedAt: v.revokedAt ? v.revokedAt.toISOString() : null,
      onChainVaultContract: v.onChainVaultContract,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  }

  private mapPayment(p: any): PaymentTransactionRecord {
    return {
      id: p.id,
      txHash: p.txHash,
      chainId: p.chainId,
      networkId: p.networkId,
      tokenAddress: p.tokenAddress,
      payingWallet: p.payingWallet,
      treasuryAddress: p.treasuryAddress,
      amount: Number(p.amount),
      amountRaw: p.amountRaw,
      tokenSymbol: p.tokenSymbol,
      status: p.status,
      blockNumber: p.blockNumber !== null ? Number(p.blockNumber) : null,
      confirmations: p.confirmations,
      associatedSubscriptionId: p.associatedSubscriptionId,
      purchaseIntentId: p.purchaseIntentId,
      idempotencyKey: p.idempotencyKey,
      reorgDetected: p.reorgDetected,
      verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private mapPlan(p: any): SubscriptionPlanRecord {
    return {
      id: p.id,
      name: p.name,
      durationDays: p.durationDays,
      priceUsd: Number(p.priceUsd),
      priceLiora: Number(p.priceLiora),
      priceUsdt: Number(p.priceUsdt),
      billingPeriodLabel: p.billingPeriodLabel,
      isPopular: p.isPopular,
      features: p.features,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private mapSubscription(s: any): TradingBotSubscriptionRecord {
    return {
      id: s.id,
      userId: s.userId,
      planId: s.planId,
      status: s.status,
      startsAt: s.startsAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      autoRenew: s.autoRenew,
      paymentRef: s.paymentRef,
      isRevoked: s.isRevoked,
      revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
      revocationReason: s.revocationReason,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  private mapTrial(t: any): TradingBotTrialRecord {
    return {
      id: t.id,
      userId: t.userId,
      walletAddress: t.walletAddress,
      startedAt: t.startedAt.toISOString(),
      expiresAt: t.expiresAt.toISOString(),
      durationHours: t.durationHours,
      trialUsed: t.trialUsed,
      isRevoked: t.isRevoked,
      revokedAt: t.revokedAt ? t.revokedAt.toISOString() : null,
      revocationReason: t.revocationReason,
    };
  }

  private mapBalance(b: any): TokenBalanceRecord {
    return {
      id: b.id,
      userId: b.userId,
      tokenSymbol: b.tokenSymbol,
      balance: Number(b.balance),
      balanceRaw: b.balanceRaw,
      lockedBalance: Number(b.lockedBalance),
      isDemoBalance: b.isDemoBalance,
      updatedAt: b.updatedAt.toISOString(),
    };
  }

  private mapMovement(m: any): BalanceMovementRecord {
    return {
      id: m.id,
      balanceId: m.balanceId,
      userId: m.userId,
      tokenSymbol: m.tokenSymbol,
      amount: Number(m.amount),
      amountRaw: m.amountRaw,
      entryType: m.entryType,
      reason: m.reason,
      referenceId: m.referenceId,
      idempotencyKey: m.idempotencyKey,
      isDemo: m.isDemo,
      createdAt: m.createdAt.toISOString(),
    };
  }

  private mapOrder(o: any): TradingOrderRecord {
    return {
      id: o.id,
      orderId: o.orderId,
      userId: o.userId,
      pair: o.pair,
      side: o.side,
      orderType: o.orderType,
      price: o.price !== null && o.price !== undefined ? Number(o.price) : null,
      amount: Number(o.amount),
      amountRaw: o.amountRaw,
      filledAmount: Number(o.filledAmount),
      status: o.status,
      isDemoOrder: o.isDemoOrder,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  }
}

export const prismaDb = new PrismaDatabaseAdapter();
export default prismaDb;
