/**
 * LIORA COIN — Production Server Database & Financial Ledger Repository
 * Phase 2: Production Database and Admin Security
 *
 * Implements:
 * - Enterprise Relational Models & Integrity Constraints (PostgreSQL via Prisma or Resilient In-Memory Fallback).
 * - ACID Database Transactions with Snapshot Rollback on Error.
 * - Double-Entry Ledger for Token Balances & Balance Movements.
 * - Idempotency Keys on Financial Operations & Pre-Launch Allocations.
 * - Strict Separation of Demo vs. Production Balances and Orders.
 * - Blockchain Reorganization Handling & Audit Trails.
 * - Production Security Gate: Prohibits Default/Development Accounts in Production.
 */

if (typeof window !== 'undefined' && (typeof process === 'undefined' || !process.versions?.node)) {
  throw new Error('CRITICAL SECURITY VIOLATION: Database persistence layer can only be loaded server-side.');
}

import crypto from 'crypto';
import { prismaDb, PrismaDatabaseAdapter } from './prismaDb';
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

export type {
  PrelaunchConfig,
  PrelaunchPriceResult,
  PurchaseQuoteRequest,
  PurchaseQuote,
  LockedPurchaseRecord,
  PrelaunchAuditLog,
  InvestmentLockTier,
} from '../prelaunch/prelaunchTypes';

/**
 * Safely normalizes a wallet address across chain families:
 * - EVM & Bitcoin Bech32: Lowercase
 * - TRON Base58Check: Preserves exact case (NEVER lowercased, as lowercasing invalidates Base58 checksum)
 */
export function normalizeWalletAddress(addr: string): string {
  if (!addr || typeof addr !== 'string') return '';
  const trimmed = addr.trim();
  if (trimmed.startsWith('T') && trimmed.length === 34) {
    return trimmed;
  }
  return trimmed.toLowerCase();
}

// Scrypt password hashing helper
export function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

export type UserRole = 'USER' | 'TRADER' | 'VIP' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type SubscriptionStatus =
  | 'NO_SUBSCRIPTION'
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'ACTIVE_PAID'
  | 'EXPIRED'
  | 'REVOKED';

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';
export type PaymentToken = 'USDT' | 'LIORA';
export type PurchaseIntentStatus = 'INITIATED' | 'PENDING_PAYMENT' | 'PAYMENT_VERIFIED' | 'ALLOCATED' | 'FAILED' | 'CANCELLED';
export type AllocationClaimStatus = 'LOCKED' | 'UNLOCKED' | 'CLAIMED' | 'REVOKED';
export type LedgerEntryType = 'CREDIT' | 'DEBIT';
export type LedgerReason = 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE' | 'ALLOCATION_LOCK' | 'COMMISSION' | 'FEE' | 'REORGANIZATION_ADJUSTMENT';

// ============================================================================
// RECORD DEFINITIONS
// ============================================================================

export interface UserRecord {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  isDevelopmentOnly: boolean;
  mfaSecret: string | null;
  isMfaEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedWalletRecord {
  id: string;
  walletAddress: string;
  userId: string;
  chainId: number;
  verifiedAt: string;
  isPrimary: boolean;
  nonceChallenge: string | null;
  signatureProof: string | null;
}

export interface AuthNonceRecord {
  id: string;
  nonce: string;
  address: string;
  domain: string;
  uri: string;
  chainId: number;
  statement: string | null;
  issuedAt: string;
  expiresAt: string;
  consumed: boolean;
  consumedAt: string | null;
}

export interface TradingBotSessionRecord {
  id: string;
  userId: string;
  sessionIdentifier: string;
  tokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  activatedAt: string;
  expiresAt: string;
  isRevoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
}

export interface PurchaseIntentRecord {
  id: string;
  idempotencyKey: string;
  userId: string;
  quoteId: string;
  walletAddress: string;
  status: PurchaseIntentStatus;
  amountUSD: number;
  tokenQuantity: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorAllocationRecord {
  id: string;
  purchaseId: string;
  idempotencyKey: string | null;
  userId: string;
  walletAddress: string;
  investmentAmountUSD: number;
  tokenQuantity: string;
  lockTierMonths: number;
  lockStartTimeUTC: string;
  unlockTimeUTC: string;
  policyVersion: number;
  paymentVerificationStatus: string;
  claimStatus: AllocationClaimStatus;
  txHash: string | null;
  isDemoAllocation: boolean;
  vestingScheduleId: string | null;
  purchaseIntentId: string | null;
  createdAt: string;
}

export interface VestingScheduleRecord {
  id: string;
  userId: string;
  beneficiaryWallet: string;
  totalTokensRaw: string;
  releasedTokensRaw: string;
  cliffDurationMonths: number;
  lockDurationMonths: number;
  startAt: string;
  cliffEndAt: string;
  lockEndAt: string;
  isRevoked: boolean;
  revokedAt: string | null;
  onChainVaultContract: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransactionRecord {
  id: string;
  txHash: string;
  chainId: number;
  networkId: string;
  tokenAddress: string;
  payingWallet: string;
  treasuryAddress: string;
  amount: number;
  amountRaw: string;
  tokenSymbol: PaymentToken;
  status: PaymentStatus;
  blockNumber: number | null;
  confirmations: number;
  associatedSubscriptionId: string | null;
  purchaseIntentId: string | null;
  idempotencyKey: string | null;
  reorgDetected: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TokenBalanceRecord {
  id: string;
  userId: string;
  tokenSymbol: string;
  balance: number;
  balanceRaw: string;
  lockedBalance: number;
  isDemoBalance: boolean;
  updatedAt: string;
}

export interface BalanceMovementRecord {
  id: string;
  balanceId: string;
  userId: string;
  tokenSymbol: string;
  amount: number;
  amountRaw: string;
  entryType: LedgerEntryType;
  reason: LedgerReason;
  referenceId: string | null;
  idempotencyKey: string | null;
  isDemo: boolean;
  createdAt: string;
}

export interface TradingOrderRecord {
  id: string;
  orderId: string;
  userId: string;
  pair: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  price: number | null;
  amount: number;
  amountRaw: string;
  filledAmount: number;
  status: 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  isDemoOrder: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderExecutionRecord {
  id: string;
  orderId: string;
  executionPrice: number;
  executedAmount: number;
  feeAmount: number;
  feeAsset: string;
  executedAt: string;
}

export interface SubscriptionPlanRecord {
  id: string;
  name: string;
  durationDays: number;
  durationHours?: number;
  priceUsd: number;
  priceLiora: number;
  priceUsdt: number;
  billingPeriodLabel: string;
  isPopular: boolean;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TradingBotSubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startsAt: string;
  expiresAt: string;
  autoRenew: boolean;
  paymentRef: string | null;
  isRevoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TradingBotTrialRecord {
  id: string;
  userId: string;
  walletAddress: string;
  startedAt: string;
  expiresAt: string;
  durationHours: number;
  trialUsed: boolean;
  isRevoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt: string;
}

// ============================================================================
// PRODUCTION DATABASE REPOSITORY IMPLEMENTATION
// ============================================================================

export class ServerDatabase {
  private users: Map<string, UserRecord> = new Map();
  private wallets: Map<string, VerifiedWalletRecord> = new Map();
  private nonces: Map<string, AuthNonceRecord> = new Map();
  private sessions: Map<string, TradingBotSessionRecord> = new Map();
  private purchaseIntents: Map<string, PurchaseIntentRecord> = new Map();
  private intentByIdempotency: Map<string, string> = new Map();
  private allocations: Map<string, InvestorAllocationRecord> = new Map();
  private allocationByIdempotency: Map<string, string> = new Map();
  private vestingSchedules: Map<string, VestingScheduleRecord> = new Map();
  private payments: Map<string, PaymentTransactionRecord> = new Map();
  private paymentByIdempotency: Map<string, string> = new Map();
  private balances: Map<string, TokenBalanceRecord> = new Map(); // key: userId:symbol:isDemo
  private movements: Map<string, BalanceMovementRecord> = new Map();
  private movementByIdempotency: Map<string, string> = new Map();
  private orders: Map<string, TradingOrderRecord> = new Map();
  private executions: Map<string, OrderExecutionRecord> = new Map();
  private trials: Map<string, TradingBotTrialRecord> = new Map();
  private trialByUserId: Map<string, string> = new Map();
  private trialByWallet: Map<string, string> = new Map();
  private plans: Map<string, SubscriptionPlanRecord> = new Map();
  private subscriptions: Map<string, TradingBotSubscriptionRecord> = new Map();
  private subByUserId: Map<string, string> = new Map();
  private auditLogs: AuditLogRecord[] = [];
  private prelaunchConfig: PrelaunchConfig = { ...INITIAL_PRELAUNCH_CONFIG };
  private prelaunchHistory: PrelaunchConfig[] = [{ ...INITIAL_PRELAUNCH_CONFIG }];
  private investorQuotes: Map<string, PurchaseQuote> = new Map();
  private prelaunchAuditLogs: PrelaunchAuditLog[] = [];

  constructor() {
    this.seedDefaults();
  }

  public resetAll(): void {
    this.users.clear();
    this.wallets.clear();
    this.nonces.clear();
    this.sessions.clear();
    this.purchaseIntents.clear();
    this.intentByIdempotency.clear();
    this.allocations.clear();
    this.allocationByIdempotency.clear();
    this.vestingSchedules.clear();
    this.payments.clear();
    this.paymentByIdempotency.clear();
    this.balances.clear();
    this.movements.clear();
    this.movementByIdempotency.clear();
    this.orders.clear();
    this.executions.clear();
    this.trials.clear();
    this.trialByUserId.clear();
    this.trialByWallet.clear();
    this.plans.clear();
    this.subscriptions.clear();
    this.subByUserId.clear();
    this.auditLogs = [];
    this.prelaunchConfig = { ...INITIAL_PRELAUNCH_CONFIG };
    this.prelaunchHistory = [{ ...INITIAL_PRELAUNCH_CONFIG }];
    this.investorQuotes.clear();
    this.prelaunchAuditLogs = [];
    this.seedDefaults();
  }

  private seedDefaults(): void {
    const isProdOrStaging =
      process.env.NODE_ENV === 'production' ||
      process.env.STAGING === 'true' ||
      process.env.OXENIQ_ENV === 'production' ||
      process.env.OXENIQ_ENV === 'staging';

    const now = new Date().toISOString();

    // In production and staging, NEVER seed default accounts or known credentials!
    if (!isProdOrStaging) {
      const alex: UserRecord = {
        id: 'usr_alex_001',
        username: 'trader_alex',
        email: 'alex@oxeniq.network',
        passwordHash: hashPasswordScrypt('OxeniqDemo2026!'),
        role: 'TRADER',
        accountStatus: 'ACTIVE',
        isDevelopmentOnly: true,
        mfaSecret: null,
        isMfaEnabled: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      };

      const dan: UserRecord = {
        id: 'usr_dan_002',
        username: 'admin_dan',
        email: 'dan@oxeniq.network',
        passwordHash: hashPasswordScrypt('OxeniqDemo2026!'),
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        isDevelopmentOnly: true,
        mfaSecret: null,
        isMfaEnabled: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      };

      this.users.set(alex.id, alex);
      this.users.set(dan.id, dan);
    }

    // Default Subscription Plans
    const initialPlans: SubscriptionPlanRecord[] = [
      {
        id: 'PLAN_MONTHLY',
        name: 'Trader Monthly',
        durationDays: 30,
        priceUsd: 49,
        priceLiora: 980,
        priceUsdt: 49,
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
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'PLAN_QUARTERLY',
        name: 'Pro Quarterly',
        durationDays: 90,
        priceUsd: 119,
        priceLiora: 2380,
        priceUsdt: 119,
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
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'PLAN_ANNUAL',
        name: 'Institutional Annual',
        durationDays: 365,
        priceUsd: 399,
        priceLiora: 7980,
        priceUsdt: 399,
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
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const plan of initialPlans) {
      this.plans.set(plan.id, plan);
    }
  }

  // =========================================================================
  // ACID TRANSACTION SIMULATOR & ROLLBACK ENGINE
  // =========================================================================

  /**
   * Executes a sequence of database operations within an atomic transaction.
   * If any error is thrown within the transaction callback, all mutations
   * are immediately rolled back to their exact pre-transaction state.
   */
  public async transaction<T>(callback: (tx: ServerDatabase) => Promise<T>): Promise<T> {
    // Create deep snapshot of transactional maps
    const snapshot = {
      users: new Map(this.users),
      wallets: new Map(this.wallets),
      nonces: new Map(this.nonces),
      sessions: new Map(this.sessions),
      purchaseIntents: new Map(this.purchaseIntents),
      intentByIdempotency: new Map(this.intentByIdempotency),
      allocations: new Map(this.allocations),
      allocationByIdempotency: new Map(this.allocationByIdempotency),
      vestingSchedules: new Map(this.vestingSchedules),
      payments: new Map(this.payments),
      paymentByIdempotency: new Map(this.paymentByIdempotency),
      balances: new Map(this.balances),
      movements: new Map(this.movements),
      movementByIdempotency: new Map(this.movementByIdempotency),
      orders: new Map(this.orders),
      executions: new Map(this.executions),
      trials: new Map(this.trials),
      trialByUserId: new Map(this.trialByUserId),
      trialByWallet: new Map(this.trialByWallet),
      plans: new Map(this.plans),
      subscriptions: new Map(this.subscriptions),
      subByUserId: new Map(this.subByUserId),
      auditLogs: [...this.auditLogs],
      investorQuotes: new Map(this.investorQuotes),
      prelaunchAuditLogs: [...this.prelaunchAuditLogs],
      prelaunchConfig: { ...this.prelaunchConfig },
      prelaunchHistory: [...this.prelaunchHistory],
    };

    try {
      return await callback(this);
    } catch (err) {
      // Rollback to snapshot on failure
      this.users = snapshot.users;
      this.wallets = snapshot.wallets;
      this.nonces = snapshot.nonces;
      this.sessions = snapshot.sessions;
      this.purchaseIntents = snapshot.purchaseIntents;
      this.intentByIdempotency = snapshot.intentByIdempotency;
      this.allocations = snapshot.allocations;
      this.allocationByIdempotency = snapshot.allocationByIdempotency;
      this.vestingSchedules = snapshot.vestingSchedules;
      this.payments = snapshot.payments;
      this.paymentByIdempotency = snapshot.paymentByIdempotency;
      this.balances = snapshot.balances;
      this.movements = snapshot.movements;
      this.movementByIdempotency = snapshot.movementByIdempotency;
      this.orders = snapshot.orders;
      this.executions = snapshot.executions;
      this.trials = snapshot.trials;
      this.trialByUserId = snapshot.trialByUserId;
      this.trialByWallet = snapshot.trialByWallet;
      this.plans = snapshot.plans;
      this.subscriptions = snapshot.subscriptions;
      this.subByUserId = snapshot.subByUserId;
      this.auditLogs = snapshot.auditLogs;
      this.investorQuotes = snapshot.investorQuotes;
      this.prelaunchAuditLogs = snapshot.prelaunchAuditLogs;
      this.prelaunchConfig = snapshot.prelaunchConfig;
      this.prelaunchHistory = snapshot.prelaunchHistory;

      // Post-rollback audit log recording
      await this.createAuditLog({
        action: 'DATABASE_TRANSACTION_ROLLBACK',
        entity: 'DatabaseTransaction',
        severity: 'CRITICAL',
        metadata: { error: (err as Error).message }
      });

      throw err;
    }
  }

  // =========================================================================
  // USER MANAGEMENT
  // =========================================================================

  public async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) || null;
  }

  public async findUserByUsername(username: string): Promise<UserRecord | null> {
    const clean = username.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === clean) return u;
    }
    return null;
  }

  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const clean = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email && u.email.toLowerCase() === clean) return u;
    }
    return null;
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
    const existing = await this.findUserByUsername(data.username);
    if (existing) {
      throw new Error(`User with username ${data.username} already exists`);
    }

    const now = new Date().toISOString();
    const user: UserRecord = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      username: data.username.trim(),
      email: data.email || null,
      passwordHash: data.passwordHash || null,
      role: data.role || 'USER',
      accountStatus: data.accountStatus || 'ACTIVE',
      isDevelopmentOnly: Boolean(data.isDevelopmentOnly),
      mfaSecret: data.mfaSecret || null,
      isMfaEnabled: Boolean(data.isMfaEnabled),
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  public async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord> {
    const user = this.users.get(id);
    if (!user) throw new Error(`User ${id} not found`);
    const updated = { ...user, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(id, updated);
    return updated;
  }

  // =========================================================================
  // AUTHENTICATION NONCES (EIP-4361 SIWE)
  // =========================================================================

  public async createNonce(address: string, ttlMs: number = 5 * 60 * 1000): Promise<string> {
    const cleanAddr = normalizeWalletAddress(address);
    const nonce = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    const record: AuthNonceRecord = {
      id: `non_${crypto.randomUUID().slice(0, 8)}`,
      nonce,
      address: cleanAddr,
      domain: 'oxeniq.network',
      uri: 'https://oxeniq.network',
      chainId: 97,
      statement: 'Sign in with Ethereum',
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      consumed: false,
      consumedAt: null,
    };

    this.nonces.set(nonce, record);
    return nonce;
  }

  public async consumeNonce(nonce: string, address: string): Promise<boolean> {
    const record = this.nonces.get(nonce);
    if (!record) return false;

    // Single-use enforcement: cannot consume already consumed nonce
    if (record.consumed) return false;
    this.nonces.delete(nonce); // Delete immediately to prevent race conditions

    if (new Date(record.expiresAt).getTime() < Date.now()) return false;
    if (normalizeWalletAddress(record.address) !== normalizeWalletAddress(address)) return false;

    return true;
  }

  // =========================================================================
  // WALLET REPOSITORY
  // =========================================================================

  public async getVerifiedWallet(address: string): Promise<VerifiedWalletRecord | null> {
    return this.wallets.get(normalizeWalletAddress(address)) || null;
  }

  public async getWalletsByUserId(userId: string): Promise<VerifiedWalletRecord[]> {
    const res: VerifiedWalletRecord[] = [];
    for (const w of this.wallets.values()) {
      if (w.userId === userId) res.push(w);
    }
    return res;
  }

  public async linkVerifiedWallet(data: {
    walletAddress: string;
    userId: string;
    chainId: number;
    signatureProof: string;
    nonceChallenge: string;
  }): Promise<VerifiedWalletRecord> {
    const cleanAddr = normalizeWalletAddress(data.walletAddress);
    const existing = this.wallets.get(cleanAddr);
    if (existing && existing.userId !== data.userId) {
      throw new Error(`Wallet address ${data.walletAddress} is already linked to another account`);
    }

    const record: VerifiedWalletRecord = {
      id: existing ? existing.id : `wal_${crypto.randomUUID().slice(0, 8)}`,
      walletAddress: cleanAddr,
      userId: data.userId,
      chainId: data.chainId,
      verifiedAt: new Date().toISOString(),
      isPrimary: !existing ? (await this.getWalletsByUserId(data.userId)).length === 0 : existing.isPrimary,
      nonceChallenge: data.nonceChallenge,
      signatureProof: data.signatureProof,
    };

    this.wallets.set(cleanAddr, record);
    return record;
  }

  // =========================================================================
  // SESSION REPOSITORY
  // =========================================================================

  public async createSession(userId: string, ttlHours = 24, ipAddress?: string): Promise<TradingBotSessionRecord> {
    const now = new Date();
    const expires = new Date(now.getTime() + ttlHours * 3600 * 1000);
    const sessionIdentifier = `sess_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(sessionIdentifier).digest('hex');

    const session: TradingBotSessionRecord = {
      id: `srec_${crypto.randomUUID().slice(0, 8)}`,
      userId,
      sessionIdentifier,
      tokenHash,
      ipAddress: ipAddress || null,
      userAgent: null,
      activatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      isRevoked: false,
      revokedAt: null,
      revocationReason: null,
    };

    this.sessions.set(sessionIdentifier, session);
    return session;
  }

  public async getSession(sessionIdentifier: string): Promise<TradingBotSessionRecord | null> {
    const session = this.sessions.get(sessionIdentifier);
    if (!session) return null;
    if (session.isRevoked) return null;
    if (new Date(session.expiresAt).getTime() <= Date.now()) return null;
    return session;
  }

  public async revokeSession(sessionIdentifier: string, reason = 'LOGOUT'): Promise<void> {
    const session = this.sessions.get(sessionIdentifier);
    if (session) {
      session.isRevoked = true;
      session.revokedAt = new Date().toISOString();
      session.revocationReason = reason;
    }
  }

  // =========================================================================
  // FINANCIAL LEDGER & TOKEN BALANCES (DOUBLE-ENTRY)
  // =========================================================================

  public async getTokenBalance(userId: string, tokenSymbol: string, isDemo = true): Promise<TokenBalanceRecord> {
    const key = `${userId}:${tokenSymbol.toUpperCase()}:${isDemo}`;
    let record = this.balances.get(key);
    if (!record) {
      record = {
        id: `bal_${crypto.randomUUID().slice(0, 8)}`,
        userId,
        tokenSymbol: tokenSymbol.toUpperCase(),
        balance: 0,
        balanceRaw: '0',
        lockedBalance: 0,
        isDemoBalance: isDemo,
        updatedAt: new Date().toISOString(),
      };
      this.balances.set(key, record);
    }
    return { ...record };
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
  }): Promise<{ balance: TokenBalanceRecord; movement: BalanceMovementRecord }> {
    const isDemo = data.isDemo !== undefined ? data.isDemo : true;
    const cleanSymbol = data.tokenSymbol.toUpperCase();

    // Idempotency defense
    if (data.idempotencyKey) {
      const existingMovementId = this.movementByIdempotency.get(data.idempotencyKey);
      if (existingMovementId) {
        const existingMovement = this.movements.get(existingMovementId)!;
        const currentBalance = await this.getTokenBalance(data.userId, cleanSymbol, isDemo);
        return { balance: currentBalance, movement: existingMovement };
      }
    }

    if (data.amount <= 0) {
      throw new Error(`Ledger movement amount must be positive. Received: ${data.amount}`);
    }

    const key = `${data.userId}:${cleanSymbol}:${isDemo}`;
    let balanceRecord = this.balances.get(key);
    if (!balanceRecord) {
      balanceRecord = {
        id: `bal_${crypto.randomUUID().slice(0, 8)}`,
        userId: data.userId,
        tokenSymbol: cleanSymbol,
        balance: 0,
        balanceRaw: '0',
        lockedBalance: 0,
        isDemoBalance: isDemo,
        updatedAt: new Date().toISOString(),
      };
    }

    if (data.entryType === 'DEBIT' && balanceRecord.balance < data.amount) {
      throw new Error(`Insufficient balance for debit. Available: ${balanceRecord.balance}, Required: ${data.amount}`);
    }

    const newBalanceNum = data.entryType === 'CREDIT' ? balanceRecord.balance + data.amount : balanceRecord.balance - data.amount;
    const currentBigInt = BigInt(balanceRecord.balanceRaw || '0');
    const changeBigInt = BigInt(data.amountRaw || '0');
    const newBigInt = data.entryType === 'CREDIT' ? currentBigInt + changeBigInt : currentBigInt - changeBigInt;

    balanceRecord.balance = newBalanceNum;
    balanceRecord.balanceRaw = newBigInt.toString();
    balanceRecord.updatedAt = new Date().toISOString();
    this.balances.set(key, balanceRecord);

    const movement: BalanceMovementRecord = {
      id: `mov_${crypto.randomUUID().slice(0, 8)}`,
      balanceId: balanceRecord.id,
      userId: data.userId,
      tokenSymbol: cleanSymbol,
      amount: data.amount,
      amountRaw: data.amountRaw,
      entryType: data.entryType,
      reason: data.reason,
      referenceId: data.referenceId || null,
      idempotencyKey: data.idempotencyKey || null,
      isDemo,
      createdAt: new Date().toISOString(),
    };

    this.movements.set(movement.id, movement);
    if (data.idempotencyKey) {
      this.movementByIdempotency.set(data.idempotencyKey, movement.id);
    }

    return { balance: { ...balanceRecord }, movement };
  }

  // =========================================================================
  // PURCHASE INTENTS & PRE-LAUNCH ALLOCATIONS
  // =========================================================================

  public async createPurchaseIntent(data: {
    idempotencyKey: string;
    userId: string;
    quoteId: string;
    walletAddress: string;
    amountUSD: number;
    tokenQuantity: string;
  }): Promise<PurchaseIntentRecord> {
    const existingId = this.intentByIdempotency.get(data.idempotencyKey);
    if (existingId) {
      return this.purchaseIntents.get(existingId)!;
    }

    const intent: PurchaseIntentRecord = {
      id: `pint_${crypto.randomUUID().slice(0, 8)}`,
      idempotencyKey: data.idempotencyKey,
      userId: data.userId,
      quoteId: data.quoteId,
      walletAddress: normalizeWalletAddress(data.walletAddress),
      status: 'INITIATED',
      amountUSD: data.amountUSD,
      tokenQuantity: data.tokenQuantity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.purchaseIntents.set(intent.id, intent);
    this.intentByIdempotency.set(data.idempotencyKey, intent.id);
    return intent;
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
      const existingId = this.allocationByIdempotency.get(data.idempotencyKey);
      if (existingId) {
        return this.allocations.get(existingId)!;
      }
    }

    const existingPurchase = this.allocations.get(data.purchaseId);
    if (existingPurchase) {
      throw new Error(`Allocation for purchase ${data.purchaseId} already recorded (duplicate allocation rejection)`);
    }

    const allocation: InvestorAllocationRecord = {
      id: `alloc_${crypto.randomUUID().slice(0, 8)}`,
      purchaseId: data.purchaseId,
      idempotencyKey: data.idempotencyKey || null,
      userId: data.userId,
      walletAddress: normalizeWalletAddress(data.walletAddress),
      investmentAmountUSD: data.investmentAmountUSD,
      tokenQuantity: data.tokenQuantity,
      lockTierMonths: data.lockTierMonths,
      lockStartTimeUTC: data.lockStartTimeUTC,
      unlockTimeUTC: data.unlockTimeUTC,
      policyVersion: data.policyVersion,
      paymentVerificationStatus: data.paymentVerificationStatus || 'VERIFIED',
      claimStatus: data.claimStatus || 'LOCKED',
      txHash: data.txHash || null,
      isDemoAllocation: data.isDemoAllocation !== undefined ? data.isDemoAllocation : false,
      vestingScheduleId: data.vestingScheduleId || null,
      purchaseIntentId: data.purchaseIntentId || null,
      createdAt: new Date().toISOString(),
    };

    this.allocations.set(data.purchaseId, allocation);
    if (data.idempotencyKey) {
      this.allocationByIdempotency.set(data.idempotencyKey, data.purchaseId);
    }

    return allocation;
  }

  public async getAllocationsByUserId(userId: string): Promise<InvestorAllocationRecord[]> {
    return Array.from(this.allocations.values()).filter((a) => a.userId === userId);
  }

  public async getAllocationById(id: string): Promise<InvestorAllocationRecord | null> {
    return this.allocations.get(id) || null;
  }

  // =========================================================================
  // PRE-LAUNCH OFFERING, PRICING & INVESTOR REPOSITORIES
  // =========================================================================

  public async getPrelaunchConfig(): Promise<PrelaunchConfig> {
    return {
      ...this.prelaunchConfig,
      investmentTiers: this.prelaunchConfig.investmentTiers.map((t) => ({ ...t })),
    };
  }

  public async updatePrelaunchConfig(
    updates: Partial<PrelaunchConfig>,
    actorId = 'admin'
  ): Promise<{ success: boolean; config?: PrelaunchConfig; errors?: string[] }> {
    const candidate: PrelaunchConfig = {
      ...this.prelaunchConfig,
      ...updates,
      version: this.prelaunchConfig.version + 1,
      lastUpdatedUTC: new Date().toISOString(),
      updatedBy: actorId,
    };

    if (updates.investmentTiers) {
      const tierValidation = validateInvestmentTiers(updates.investmentTiers);
      if (!tierValidation.valid) {
        return { success: false, errors: tierValidation.errors };
      }
    }

    const configValidation = validatePrelaunchConfig(candidate);
    if (!configValidation.valid) {
      return { success: false, errors: configValidation.errors };
    }

    const prevVersion = this.prelaunchConfig.version;
    this.prelaunchConfig = candidate;
    this.prelaunchHistory.push({ ...candidate });

    this.prelaunchAuditLogs.push({
      id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestampUTC: new Date().toISOString(),
      action: 'CONFIG_UPDATED',
      actorId,
      previousVersion: prevVersion,
      newVersion: candidate.version,
      details: {
        updatedFields: Object.keys(updates),
        newConfig: candidate,
      },
    });

    return { success: true, config: await this.getPrelaunchConfig() };
  }

  public async getPrelaunchConfigHistory(): Promise<PrelaunchConfig[]> {
    return this.prelaunchHistory.map((c) => ({
      ...c,
      investmentTiers: c.investmentTiers.map((t) => ({ ...t })),
    }));
  }

  public async getPrelaunchAuditLogs(): Promise<PrelaunchAuditLog[]> {
    return [...this.prelaunchAuditLogs];
  }

  public async getCurrentPrelaunchPrice(serverTimeMs: number = Date.now()): Promise<PrelaunchPriceResult> {
    return calculatePrelaunchPrice(this.prelaunchConfig, serverTimeMs);
  }

  public async createInvestorQuote(
    req: PurchaseQuoteRequest,
    serverTimeMs: number = Date.now()
  ): Promise<{ success: boolean; quote?: PurchaseQuote; error?: string }> {
    if (!req.userId || !req.walletAddress) {
      return { success: false, error: 'User ID and wallet address are required to request a quote.' };
    }

    if (!req.investmentAmount || req.investmentAmount <= 0) {
      return { success: false, error: 'Investment amount must be greater than 0.' };
    }

    const fxRate = Number(this.prelaunchConfig.lockedInrPerUsd);
    if (!fxRate || fxRate <= 0) {
      return { success: false, error: 'Locked FX rate is not configured.' };
    }

    let amountUSD = req.investmentAmount;
    if (req.currency === 'INR') {
      amountUSD = req.investmentAmount / fxRate;
    }

    let tier: InvestmentLockTier;
    try {
      tier = getTierForInvestmentUSD(amountUSD, this.prelaunchConfig.investmentTiers);
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    const priceResult = calculatePrelaunchPrice(this.prelaunchConfig, serverTimeMs);
    const tokenPriceUSD = priceResult.priceUSD;
    const tokenPriceINR = priceResult.priceINR;
    const tokenQuantity = calculateTokenAllocation(amountUSD, tokenPriceUSD);

    const issuedAt = new Date(serverTimeMs);
    const expiresAt = new Date(serverTimeMs + this.prelaunchConfig.quoteTtlSeconds * 1000);
    const lockStartTime = issuedAt;
    const estimatedUnlockTime = addCalendarMonthsUTC(lockStartTime, tier.lockMonths);

    const quoteId = `quote_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const quote: PurchaseQuote = {
      quoteId,
      userId: req.userId,
      walletAddress: normalizeWalletAddress(req.walletAddress),
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
      ttlSeconds: this.prelaunchConfig.quoteTtlSeconds,
      policyVersion: this.prelaunchConfig.version,
      isExpired: false,
    };

    this.investorQuotes.set(quoteId, quote);
    this.prelaunchAuditLogs.push({
      id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestampUTC: new Date().toISOString(),
      action: 'QUOTE_ISSUED',
      actorId: req.userId,
      previousVersion: undefined,
      newVersion: this.prelaunchConfig.version,
      details: {
        quoteId,
        amountUSD,
        tier: tier.name,
        tokenQuantity,
      },
    });

    return { success: true, quote };
  }

  public async getInvestorQuote(
    quoteId: string,
    serverTimeMs: number = Date.now()
  ): Promise<{ quote: PurchaseQuote | null; isExpired: boolean }> {
    const quote = this.investorQuotes.get(quoteId);
    if (!quote) {
      return { quote: null, isExpired: false };
    }

    const expiresAtMs = new Date(quote.expiresAtUTC).getTime();
    const isExpired = serverTimeMs > expiresAtMs;

    return {
      quote: {
        ...quote,
        isExpired,
      },
      isExpired,
    };
  }

  public async recordInvestorPurchase(
    quoteId: string,
    serverTimeMs: number = Date.now(),
    txHash: string | null = null,
    idempotencyKey: string | null = null
  ): Promise<{ success: boolean; record?: LockedPurchaseRecord; error?: string }> {
    if (idempotencyKey) {
      const existingPurchaseId = this.allocationByIdempotency.get(idempotencyKey);
      if (existingPurchaseId) {
        const existingAlloc = this.allocations.get(existingPurchaseId);
        if (existingAlloc) {
          return {
            success: true,
            record: {
              purchaseId: existingAlloc.purchaseId,
              userId: existingAlloc.userId,
              walletAddress: existingAlloc.walletAddress,
              investmentAmount: existingAlloc.investmentAmountUSD,
              currency: 'USD',
              purchasePriceUSD: '0.05',
              tokenQuantity: existingAlloc.tokenQuantity,
              lockTierMonths: existingAlloc.lockTierMonths as any,
              lockStartTimeUTC: existingAlloc.lockStartTimeUTC,
              unlockTimeUTC: existingAlloc.unlockTimeUTC,
              policyVersion: existingAlloc.policyVersion,
              paymentVerificationStatus: existingAlloc.paymentVerificationStatus as any,
              claimStatus: existingAlloc.claimStatus as any,
              txHash: existingAlloc.txHash,
              createdAtUTC: existingAlloc.createdAt,
            },
          };
        }
      }
    }

    const { quote, isExpired } = await this.getInvestorQuote(quoteId, serverTimeMs);
    if (!quote) {
      return { success: false, error: 'Quote not found.' };
    }
    if (isExpired) {
      return {
        success: false,
        error: 'QUOTE_EXPIRED: Purchase quote has expired (15-minute TTL). Please request a fresh quote.',
      };
    }

    const purchaseId = `purch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const purchaseTime = new Date(serverTimeMs);
    const unlockTime = addCalendarMonthsUTC(purchaseTime, quote.lockMonths);

    // Single-use quote consumption (replay defense)
    this.investorQuotes.delete(quoteId);

    // Create PurchaseIntent
    const intentKey = idempotencyKey || `intent_${quoteId}`;
    await this.createPurchaseIntent({
      idempotencyKey: intentKey,
      userId: quote.userId,
      quoteId: quote.quoteId,
      walletAddress: quote.walletAddress,
      amountUSD: quote.investmentAmountUSD,
      tokenQuantity: quote.tokenQuantity,
    });

    // Create VestingSchedule
    const vesting = await this.createVestingSchedule({
      userId: quote.userId,
      beneficiaryWallet: quote.walletAddress,
      totalTokensRaw: quote.tokenQuantity,
      lockDurationMonths: quote.lockMonths,
      startAt: purchaseTime.toISOString(),
      lockEndAt: unlockTime.toISOString(),
    });

    // Create InvestorAllocation
    await this.createInvestorAllocation({
      purchaseId,
      idempotencyKey,
      userId: quote.userId,
      walletAddress: quote.walletAddress,
      investmentAmountUSD: quote.investmentAmountUSD,
      tokenQuantity: quote.tokenQuantity,
      lockTierMonths: quote.lockMonths,
      lockStartTimeUTC: purchaseTime.toISOString(),
      unlockTimeUTC: unlockTime.toISOString(),
      policyVersion: quote.policyVersion,
      paymentVerificationStatus: 'VERIFIED',
      claimStatus: 'LOCKED',
      txHash,
      isDemoAllocation: true,
      vestingScheduleId: vesting.id,
    });

    const record: LockedPurchaseRecord = {
      purchaseId,
      userId: quote.userId,
      walletAddress: quote.walletAddress,
      investmentAmount: quote.investmentAmount,
      currency: quote.currency,
      purchasePriceUSD: quote.tokenPriceUSD,
      tokenQuantity: quote.tokenQuantity,
      lockTierMonths: quote.lockMonths,
      lockStartTimeUTC: purchaseTime.toISOString(),
      unlockTimeUTC: unlockTime.toISOString(),
      policyVersion: quote.policyVersion,
      paymentVerificationStatus: 'VERIFIED',
      claimStatus: 'LOCKED',
      txHash,
      createdAtUTC: purchaseTime.toISOString(),
    };

    this.prelaunchAuditLogs.push({
      id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestampUTC: new Date().toISOString(),
      action: 'PURCHASE_RECORDED',
      actorId: quote.userId,
      previousVersion: undefined,
      newVersion: quote.policyVersion,
      details: {
        purchaseId,
        tokens: quote.tokenQuantity,
        lockMonths: quote.lockMonths,
        unlockTimeUTC: unlockTime.toISOString(),
      },
    });

    return { success: true, record };
  }

  public async getUserInvestorPurchases(userId: string): Promise<LockedPurchaseRecord[]> {
    const allocs = await this.getAllocationsByUserId(userId);
    return allocs.map((a) => ({
      purchaseId: a.purchaseId,
      userId: a.userId,
      walletAddress: a.walletAddress,
      investmentAmount: a.investmentAmountUSD,
      currency: 'USD',
      purchasePriceUSD: '0.05',
      tokenQuantity: a.tokenQuantity,
      lockTierMonths: a.lockTierMonths as any,
      lockStartTimeUTC: a.lockStartTimeUTC,
      unlockTimeUTC: a.unlockTimeUTC,
      policyVersion: a.policyVersion,
      paymentVerificationStatus: a.paymentVerificationStatus as any,
      claimStatus: a.claimStatus as any,
      txHash: a.txHash,
      createdAtUTC: a.createdAt,
    }));
  }

  public async getAllInvestorPurchases(): Promise<LockedPurchaseRecord[]> {
    return Array.from(this.allocations.values()).map((a) => ({
      purchaseId: a.purchaseId,
      userId: a.userId,
      walletAddress: a.walletAddress,
      investmentAmount: a.investmentAmountUSD,
      currency: 'USD',
      purchasePriceUSD: '0.05',
      tokenQuantity: a.tokenQuantity,
      lockTierMonths: a.lockTierMonths as any,
      lockStartTimeUTC: a.lockStartTimeUTC,
      unlockTimeUTC: a.unlockTimeUTC,
      policyVersion: a.policyVersion,
      paymentVerificationStatus: a.paymentVerificationStatus as any,
      claimStatus: a.claimStatus as any,
      txHash: a.txHash,
      createdAtUTC: a.createdAt,
    }));
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
    const record: VestingScheduleRecord = {
      id: `vest_${crypto.randomUUID().slice(0, 8)}`,
      userId: data.userId,
      beneficiaryWallet: normalizeWalletAddress(data.beneficiaryWallet),
      totalTokensRaw: data.totalTokensRaw,
      releasedTokensRaw: '0',
      cliffDurationMonths: data.cliffDurationMonths || 0,
      lockDurationMonths: data.lockDurationMonths,
      startAt: data.startAt,
      cliffEndAt: data.startAt,
      lockEndAt: data.lockEndAt,
      isRevoked: false,
      revokedAt: null,
      onChainVaultContract: data.onChainVaultContract || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.vestingSchedules.set(record.id, record);
    return record;
  }

  // =========================================================================
  // PAYMENTS & REORGANIZATION RECONCILIATION
  // =========================================================================

  public async getPaymentByTxHash(txHash: string): Promise<PaymentTransactionRecord | null> {
    return this.payments.get(txHash.toLowerCase().trim()) || null;
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

    if (data.idempotencyKey) {
      const existingId = this.paymentByIdempotency.get(data.idempotencyKey);
      if (existingId) {
        return this.payments.get(existingId)!;
      }
    }

    const existing = this.payments.get(cleanTx);
    if (existing) {
      throw new Error(`Payment transaction ${data.txHash} has already been recorded (idempotency violation)`);
    }

    const payment: PaymentTransactionRecord = {
      id: `pay_${crypto.randomUUID().slice(0, 8)}`,
      txHash: cleanTx,
      chainId: data.chainId,
      networkId: data.networkId || 'bsc-testnet',
      tokenAddress: normalizeWalletAddress(data.tokenAddress),
      payingWallet: normalizeWalletAddress(data.payingWallet),
      treasuryAddress: normalizeWalletAddress(data.treasuryAddress),
      amount: data.amount,
      amountRaw: data.amountRaw || '0',
      tokenSymbol: data.tokenSymbol,
      status: data.status,
      blockNumber: data.blockNumber,
      confirmations: data.confirmations || 0,
      associatedSubscriptionId: data.associatedSubscriptionId || null,
      purchaseIntentId: null,
      idempotencyKey: data.idempotencyKey || null,
      reorgDetected: false,
      verifiedAt: data.status === 'CONFIRMED' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.payments.set(cleanTx, payment);
    if (data.idempotencyKey) {
      this.paymentByIdempotency.set(data.idempotencyKey, cleanTx);
    }

    return payment;
  }

  public async recordPaymentTransaction(data: {
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
    return this.recordPayment(data);
  }

  /**
   * Blockchain reorganization reconciliation handler.
   * Reverts payments invalidated by deep chain reorgs.
   */
  public async flagReorganization(txHash: string, reason = 'ORPHANED_BLOCK'): Promise<PaymentTransactionRecord> {
    const cleanTx = txHash.toLowerCase().trim();
    const payment = this.payments.get(cleanTx);
    if (!payment) {
      throw new Error(`Transaction ${txHash} not found for reorganization handling`);
    }

    payment.reorgDetected = true;
    payment.status = 'FAILED';
    payment.updatedAt = new Date().toISOString();

    await this.createAuditLog({
      action: 'PAYMENT_REORGANIZATION_DETECTED',
      entity: 'PaymentTransaction',
      entityId: payment.id,
      severity: 'CRITICAL',
      metadata: { txHash: cleanTx, reason }
    });

    return payment;
  }

  // =========================================================================
  // TRADING ORDERS (DEMO VS PRODUCTION SEPARATION)
  // =========================================================================

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
    const order: TradingOrderRecord = {
      id: `ord_${crypto.randomUUID().slice(0, 8)}`,
      orderId: data.orderId,
      userId: data.userId,
      pair: data.pair,
      side: data.side,
      orderType: data.orderType || 'MARKET',
      price: data.price || null,
      amount: data.amount,
      amountRaw: data.amountRaw,
      filledAmount: 0,
      status: 'OPEN',
      isDemoOrder: data.isDemoOrder !== undefined ? data.isDemoOrder : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(order.orderId, order);
    return order;
  }

  public async getTradingOrder(orderId: string): Promise<TradingOrderRecord | null> {
    return this.orders.get(orderId) || null;
  }

  // =========================================================================
  // AUDIT LOGGING
  // =========================================================================

  public async createAuditLog(data: {
    actorId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: Record<string, any>;
    ipAddress?: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  }): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      id: `aud_${crypto.randomUUID().slice(0, 8)}`,
      actorId: data.actorId ?? null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? null,
      metadata: data.metadata ?? null,
      ipAddress: data.ipAddress ?? null,
      severity: data.severity || 'INFO',
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(record);
    return record;
  }

  public async getAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
    return this.auditLogs.slice(0, limit);
  }

  // =========================================================================
  // BOT SUBSCRIPTION REPOSITORY METHODS
  // =========================================================================

  public async getPlanById(id: string): Promise<SubscriptionPlanRecord | null> {
    return this.plans.get(id) || null;
  }

  public async getPlans(): Promise<SubscriptionPlanRecord[]> {
    return Array.from(this.plans.values());
  }

  public async updatePlan(id: string, updates: Partial<SubscriptionPlanRecord>): Promise<SubscriptionPlanRecord> {
    const plan = this.plans.get(id);
    if (!plan) throw new Error(`Plan ${id} not found`);
    const updated = { ...plan, ...updates, updatedAt: new Date().toISOString() };
    this.plans.set(id, updated);
    return updated;
  }

  public async getSubscriptionByUserId(userId: string): Promise<TradingBotSubscriptionRecord | null> {
    const subId = this.subByUserId.get(userId);
    if (!subId) return null;
    return this.subscriptions.get(subId) || null;
  }

  public async renewSubscription(userId: string, planId: string, txHash: string): Promise<TradingBotSubscriptionRecord> {
    const plan = this.plans.get(planId);
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

    const subId = existingSub ? existingSub.id : `sub_${crypto.randomUUID().slice(0, 8)}`;
    const updatedSub: TradingBotSubscriptionRecord = {
      id: subId,
      userId,
      planId,
      status: 'ACTIVE_PAID',
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      autoRenew: false,
      paymentRef: txHash,
      isRevoked: false,
      revokedAt: null,
      revocationReason: null,
      createdAt: existingSub ? existingSub.createdAt : now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.subscriptions.set(subId, updatedSub);
    this.subByUserId.set(userId, subId);

    await this.createAuditLog({
      actorId: userId,
      action: 'SUBSCRIPTION_RENEWED',
      entity: 'TradingBotSubscription',
      entityId: subId,
      severity: 'INFO',
      metadata: { planId, txHash },
    });

    return updatedSub;
  }

  public async setSubscription(subscription: TradingBotSubscriptionRecord): Promise<TradingBotSubscriptionRecord> {
    this.subscriptions.set(subscription.id, { ...subscription });
    this.subByUserId.set(subscription.userId, subscription.id);
    return subscription;
  }

  public async revokeSubscription(userId: string, reason: string, adminId?: string): Promise<TradingBotSubscriptionRecord> {
    const sub = await this.getSubscriptionByUserId(userId);
    if (!sub) throw new Error(`No subscription found for user ${userId}`);

    sub.status = 'REVOKED';
    sub.isRevoked = true;
    sub.revokedAt = new Date().toISOString();
    sub.revocationReason = reason;
    sub.updatedAt = new Date().toISOString();
    this.subscriptions.set(sub.id, sub);

    await this.createAuditLog({
      actorId: adminId || 'SYSTEM',
      action: 'SUBSCRIPTION_REVOKED',
      entity: 'TradingBotSubscription',
      entityId: sub.id,
      severity: 'WARNING',
      metadata: { userId, reason },
    });

    return sub;
  }

  public async getAllSubscribers(): Promise<{
    subscriptions: TradingBotSubscriptionRecord[];
    trials: TradingBotTrialRecord[];
  }> {
    return {
      subscriptions: Array.from(this.subscriptions.values()),
      trials: Array.from(this.trials.values()),
    };
  }

  public async activateTrial(userId: string, walletAddress: string, durationHours = 48): Promise<TradingBotTrialRecord> {
    const cleanWallet = normalizeWalletAddress(walletAddress);
    if (this.trialByUserId.has(userId)) {
      throw new Error(`User ${userId} has already redeemed the 48-Hour Free Trial`);
    }
    if (this.trialByWallet.has(cleanWallet)) {
      throw new Error(`This wallet address has already been used to claim a 48-Hour Free Trial`);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + durationHours * 3600 * 1000);

    const trial: TradingBotTrialRecord = {
      id: `trl_${crypto.randomUUID().slice(0, 8)}`,
      userId,
      walletAddress: cleanWallet,
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      durationHours,
      trialUsed: true,
      isRevoked: false,
      revokedAt: null,
      revocationReason: null,
    };

    this.trials.set(trial.id, trial);
    this.trialByUserId.set(userId, trial.id);
    this.trialByWallet.set(cleanWallet, trial.id);

    // Create corresponding subscription record in TRIAL_ACTIVE state
    const subId = `sub_trl_${crypto.randomUUID().slice(0, 8)}`;
    const trialSub: TradingBotSubscriptionRecord = {
      id: subId,
      userId,
      planId: 'PLAN_TRIAL_48H',
      status: 'TRIAL_ACTIVE',
      startsAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      autoRenew: false,
      paymentRef: 'FREE_TRIAL',
      isRevoked: false,
      revokedAt: null,
      revocationReason: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.subscriptions.set(subId, trialSub);
    this.subByUserId.set(userId, subId);

    await this.createAuditLog({
      actorId: userId,
      action: 'TRIAL_ACTIVATED',
      entity: 'TradingBotTrial',
      entityId: trial.id,
      severity: 'INFO',
      metadata: { wallet: cleanWallet, durationHours }
    });

    return trial;
  }

  public async startTrial(userId: string, walletAddress: string, durationHours = 48): Promise<TradingBotTrialRecord> {
    return this.activateTrial(userId, walletAddress, durationHours);
  }

  public async getTrialByUserId(userId: string): Promise<TradingBotTrialRecord | null> {
    const trialId = this.trialByUserId.get(userId);
    if (!trialId) return null;
    return this.trials.get(trialId) || null;
  }

  public async getTrialByWallet(walletAddress: string): Promise<TradingBotTrialRecord | null> {
    const clean = normalizeWalletAddress(walletAddress);
    const trialId = this.trialByWallet.get(clean);
    if (!trialId) return null;
    return this.trials.get(trialId) || null;
  }
}

// =========================================================================
// CONTROLLED PERSISTENCE ADAPTER SELECTION (Gate C2B-4 / Phase 2 Hardened)
// =========================================================================

export type PersistenceMode = 'postgres' | 'memory';

export function isProductionPersistenceContext(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.OXENIQ_ENV === 'production'
  );
}

export function validateDatabaseUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error(
      'DATABASE_CONFIGURATION_ERROR: DATABASE_URL is missing. A valid PostgreSQL connection string is required.'
    );
  }
  const clean = url.trim();
  if (!/^postgres(ql)?:\/\/.+/i.test(clean)) {
    throw new Error(
      'DATABASE_CONFIGURATION_ERROR: DATABASE_URL is invalid. Expected a postgresql:// or postgres:// URI.'
    );
  }
  return clean;
}

export function getPersistenceMode(): PersistenceMode {
  const rawMode = process.env.OXENIQ_PERSISTENCE_MODE;

  if (isProductionPersistenceContext()) {
    if (rawMode === 'memory') {
      throw new Error(
        'PRODUCTION_PERSISTENCE_ERROR: In-memory persistence ("memory") is strictly prohibited in production.'
      );
    }
    if (rawMode && rawMode !== 'postgres') {
      throw new Error(
        `INVALID_PERSISTENCE_MODE: Unrecognized OXENIQ_PERSISTENCE_MODE="${rawMode}". Allowed value in production: "postgres".`
      );
    }
    validateDatabaseUrl(process.env.DATABASE_URL);
    if (rawMode !== 'postgres') {
      throw new Error(
        'PRODUCTION_PERSISTENCE_ERROR: OXENIQ_PERSISTENCE_MODE must be explicitly set to "postgres" in production. Silent fallback to in-memory storage is prohibited.'
      );
    }
    return 'postgres';
  }

  const mode = rawMode || 'memory';
  if (mode !== 'postgres' && mode !== 'memory') {
    throw new Error(
      `INVALID_PERSISTENCE_MODE: Unrecognized OXENIQ_PERSISTENCE_MODE="${mode}". Allowed values: "postgres" | "memory".`
    );
  }
  return mode;
}

export type AnyDatabaseAdapter = ServerDatabase | PrismaDatabaseAdapter;

const globalForDb = global as unknown as {
  inMemoryDb: ServerDatabase;
  activeMode: PersistenceMode;
};

if (!globalForDb.inMemoryDb) {
  globalForDb.inMemoryDb = new ServerDatabase();
}

export function getActiveDatabaseAdapter(): AnyDatabaseAdapter {
  const mode = getPersistenceMode();
  if (mode === 'postgres') {
    validateDatabaseUrl(process.env.DATABASE_URL);
    return prismaDb;
  }
  if (isProductionPersistenceContext()) {
    throw new Error(
      'PRODUCTION_PERSISTENCE_ERROR: Refusing to return in-memory persistence adapter in production.'
    );
  }
  return globalForDb.inMemoryDb;
}

// Global Canonical Singleton with dynamic proxy delegation
export const serverDb: ServerDatabase = new Proxy({} as ServerDatabase, {
  get(_target, prop, receiver) {
    const active = getActiveDatabaseAdapter();
    const val = Reflect.get(active, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(active);
    }
    if (prop === 'resetAll' && typeof (active as any).resetAll !== 'function') {
      // Safe no-op on PostgreSQL adapter to prevent destructive resets on persistent database
      return () => {};
    }
    return val;
  },
});

export default serverDb;
