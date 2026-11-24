/**
 * LIORA COIN — Trading Bot Store
 * Manages 48-hour free trials, paid subscriptions, access entitlement,
 * session revocation, and simulated ALGOX V6_1_24 Pine Script v5 signals.
 */

import {
  SubscriptionPlan,
  SubscriptionPlanId,
  SubscriptionStatus,
  UserBotSubscription,
  BotSignal,
  PaperTradeMetrics,
  BotAdminConfig,
  BotAccessCheckResult,
} from './botTypes';

const BOT_STORAGE_PREFIX = 'liora_bot_store_v1_';

export const DEFAULT_BOT_PLANS: SubscriptionPlan[] = [
  {
    id: 'TRIAL_48H',
    name: '48-Hour Free Trial',
    durationDays: 2,
    durationHours: 48,
    priceUsd: 0,
    priceLiora: 0,
    priceUsdt: 0,
    billingPeriodLabel: '48 Hours Free',
    features: [
      'Full access to ALGOX V6_1_24 signal feed',
      'Entry, TP1, TP2 and Stop-Loss levels',
      'Multi-timeframe trend indicators (15m, 1H, 4H)',
      'Simulated paper-trading dashboard',
      'Zero credit card or payment required',
      'One-time trial per verified wallet/account',
    ],
  },
  {
    id: 'PLAN_MONTHLY',
    name: 'Trader Monthly',
    durationDays: 30,
    priceUsd: 49,
    priceLiora: 980, // $49 / $0.05
    priceUsdt: 49,
    billingPeriodLabel: '30 Days Access',
    features: [
      'Unrestricted real-time ALGOX signal alerts',
      'Major pairs: BTC, ETH, BNB, LIORA',
      'Instant Webhook & Telegram alert dispatch (Staged)',
      'Automated paper-trading performance tracking',
      'Self-custodial BSC wallet payment (USDT / LIORA)',
      'Standard community support',
    ],
  },
  {
    id: 'PLAN_QUARTERLY',
    name: 'Pro Quarterly',
    durationDays: 90,
    priceUsd: 119,
    priceLiora: 2380, // $119 / $0.05 (20% discount)
    priceUsdt: 119,
    billingPeriodLabel: '90 Days Access (Save 20%)',
    isPopular: true,
    features: [
      'All Trader Monthly features included',
      'Priority alert delivery channel',
      'Dynamic ATR volatility risk management guide',
      'Full trade history export & CSV logs',
      'Multi-device active session support',
      'Dedicated technical onboarding channel',
    ],
  },
  {
    id: 'PLAN_ANNUAL',
    name: 'Institutional Annual',
    durationDays: 365,
    priceUsd: 399,
    priceLiora: 7980, // $399 / $0.05 (32% discount)
    priceUsdt: 399,
    billingPeriodLabel: '365 Days Access (Save 32%)',
    features: [
      'All Pro Quarterly features included',
      'Maximum priority webhook queue',
      'Custom webhook endpoint mapping (TradingView alert sync)',
      'Early access to future ALGOX strategy revisions',
      'Direct developer architectural consultation',
      'Guaranteed rate lock for renewals',
    ],
  },
];

export const INITIAL_BOT_ADMIN_CONFIG: BotAdminConfig = {
  trialDurationHours: 48,
  paymentNetwork: 'BNB Smart Chain (BEP-20)',
  paymentTreasuryAddress: '0x397B102030405060708090A0B0C0D0E0F0102030',
  acceptedPaymentTokens: ['USDT', 'LIORA'],
  plans: DEFAULT_BOT_PLANS,
  maxActiveSessionsPerUser: 2,
  requireWalletVerification: true,
};

export const INITIAL_SIMULATED_SIGNALS: BotSignal[] = [
  {
    id: 'sig_algox_001',
    strategy: 'ALGOX V6_1_24',
    strategyVersion: 'v6.1.24 (Pine Script v5)',
    pair: 'BTC/USDT',
    action: 'LONG',
    entryPrice: 95420.0,
    tp1: 96800.0,
    tp2: 98200.0,
    stopLoss: 94100.0,
    riskRewardRatio: 2.1,
    timeframe: '1H',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: 'TP2_HIT',
    pnlPercent: 2.91,
    isSimulated: true,
    notes: 'Bullish EMA ribbon crossover confirmed on 1H bar close.',
  },
  {
    id: 'sig_algox_002',
    strategy: 'ALGOX V6_1_24',
    strategyVersion: 'v6.1.24 (Pine Script v5)',
    pair: 'LIORA/USDT',
    action: 'LONG',
    entryPrice: 0.0485,
    tp1: 0.0515,
    tp2: 0.055,
    stopLoss: 0.0462,
    riskRewardRatio: 2.8,
    timeframe: '4H',
    timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
    status: 'TP1_HIT',
    pnlPercent: 6.18,
    isSimulated: true,
    notes: 'Breakout above 20-period ATR channel with volume confirmation.',
  },
  {
    id: 'sig_algox_003',
    strategy: 'ALGOX V6_1_24',
    strategyVersion: 'v6.1.24 (Pine Script v5)',
    pair: 'ETH/USDT',
    action: 'SHORT',
    entryPrice: 3485.5,
    tp1: 3420.0,
    tp2: 3350.0,
    stopLoss: 3535.0,
    riskRewardRatio: 1.9,
    timeframe: '1H',
    timestamp: new Date(Date.now() - 3600000 * 14).toISOString(),
    status: 'TP1_HIT',
    pnlPercent: 1.88,
    isSimulated: true,
    notes: 'Bearish divergence on momentum oscillator under resistance.',
  },
  {
    id: 'sig_algox_004',
    strategy: 'ALGOX V6_1_24',
    strategyVersion: 'v6.1.24 (Pine Script v5)',
    pair: 'BNB/USDT',
    action: 'LONG',
    entryPrice: 618.4,
    tp1: 630.0,
    tp2: 645.0,
    stopLoss: 606.0,
    riskRewardRatio: 2.15,
    timeframe: '15m',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    status: 'ACTIVE',
    pnlPercent: 0.82,
    isSimulated: true,
    notes: 'Active trade progressing toward TP1; trailing stop active.',
  },
  {
    id: 'sig_algox_005',
    strategy: 'ALGOX V6_1_24',
    strategyVersion: 'v6.1.24 (Pine Script v5)',
    pair: 'BTC/USDT',
    action: 'SHORT',
    entryPrice: 96900.0,
    tp1: 95500.0,
    tp2: 94200.0,
    stopLoss: 97650.0,
    riskRewardRatio: 1.85,
    timeframe: '1H',
    timestamp: new Date(Date.now() - 3600000 * 28).toISOString(),
    status: 'SL_HIT',
    pnlPercent: -0.77,
    isSimulated: true,
    notes: 'Strict stop loss triggered on false breakout; capital preserved.',
  },
  {
    id: 'sig_algox_006',
    strategy: 'ALGOX V6_1_24',
    strategyVersion: 'v6.1.24 (Pine Script v5)',
    pair: 'LIORA/BNB',
    action: 'LONG',
    entryPrice: 0.00008,
    tp1: 0.000086,
    tp2: 0.000092,
    stopLoss: 0.000076,
    riskRewardRatio: 2.5,
    timeframe: '4H',
    timestamp: new Date(Date.now() - 3600000 * 36).toISOString(),
    status: 'TP2_HIT',
    pnlPercent: 15.0,
    isSimulated: true,
    notes: 'Secondary pair momentum run following DEX liquidity depth expansion.',
  },
];

export const INITIAL_PAPER_METRICS: PaperTradeMetrics = {
  winRatePercent: 68.5,
  profitFactor: 2.18,
  totalSimulatedTrades: 146,
  winningTrades: 100,
  losingTrades: 46,
  maxDrawdownPercent: 6.4,
  netPnlPercent: 38.6,
  averageTradePnlPercent: 1.82,
  sharpeRatio: 1.84,
  benchmarkAsset: 'BTC/USDT & LIORA/USDT',
  periodLabel: 'Last 90 Days Backtest Simulation',
};

// Seed subscriptions for default demo users
export const SEED_BOT_SUBSCRIPTIONS: Record<string, UserBotSubscription> = {
  usr_demo_active_01: {
    userId: 'usr_demo_active_01',
    username: 'trader_alex',
    walletAddress: '0x71C8409e51E2063f1ff764b8C06f7E8Ea9F2309C',
    isWalletVerified: true,
    planId: 'TRIAL_48H',
    status: 'NO_SUBSCRIPTION', // starts unactivated so user can click "Start 48h Trial"
    trialStartedAt: null,
    trialExpiresAt: null,
    subscriptionStartedAt: null,
    subscriptionExpiresAt: null,
    trialUsed: false,
    autoRenew: false,
    paymentTxHash: null,
    paymentToken: null,
    paymentAmount: null,
    lastSessionId: null,
    sessionRevokedAt: null,
  },
  usr_admin_01: {
    userId: 'usr_admin_01',
    username: 'admin_dan',
    walletAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
    isWalletVerified: true,
    planId: 'PLAN_ANNUAL',
    status: 'ACTIVE_PAID',
    trialStartedAt: '2026-01-01T00:00:00Z',
    trialExpiresAt: '2026-01-03T00:00:00Z',
    subscriptionStartedAt: '2026-01-03T00:00:00Z',
    subscriptionExpiresAt: '2027-01-03T00:00:00Z',
    trialUsed: true,
    autoRenew: true,
    paymentTxHash: '0x4f8a9b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e3a4b92c81d7e5f30',
    paymentToken: 'USDT',
    paymentAmount: 399,
    lastSessionId: 'sess_admin_master',
    sessionRevokedAt: null,
  },
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(BOT_STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`[botStore] load error for ${key}:`, err);
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(BOT_STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[botStore] save error for ${key}:`, err);
  }
}

type BotSubscriber = () => void;

export class BotStoreManager {
  private subscribers: Set<BotSubscriber> = new Set();

  private adminConfig: BotAdminConfig = INITIAL_BOT_ADMIN_CONFIG;
  private subscriptions: Record<string, UserBotSubscription> = SEED_BOT_SUBSCRIPTIONS;
  private signals: BotSignal[] = INITIAL_SIMULATED_SIGNALS;
  private paperMetrics: PaperTradeMetrics = INITIAL_PAPER_METRICS;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    this.adminConfig = loadStorage<BotAdminConfig>('admin_config', INITIAL_BOT_ADMIN_CONFIG);
    this.subscriptions = loadStorage<Record<string, UserBotSubscription>>('subscriptions', SEED_BOT_SUBSCRIPTIONS);
    this.signals = loadStorage<BotSignal[]>('signals', INITIAL_SIMULATED_SIGNALS);
    this.paperMetrics = loadStorage<PaperTradeMetrics>('metrics', INITIAL_PAPER_METRICS);
    this.isInitialized = true;
  }

  public subscribe(sub: BotSubscriber): () => void {
    this.subscribers.add(sub);
    return () => this.subscribers.delete(sub);
  }

  private notify() {
    this.subscribers.forEach((s) => {
      try {
        s();
      } catch (err) {
        console.error('[botStore] Subscriber notify failed:', err);
      }
    });
  }

  // --- Subscription Queries ---
  public getSubscription(userId: string, walletAddress?: string | null): UserBotSubscription {
    const existing = this.subscriptions[userId];
    const now = Date.now();

    if (!existing) {
      const fresh: UserBotSubscription = {
        userId,
        username: userId,
        walletAddress: walletAddress || null,
        isWalletVerified: Boolean(walletAddress),
        planId: 'TRIAL_48H',
        status: 'NO_SUBSCRIPTION',
        trialStartedAt: null,
        trialExpiresAt: null,
        subscriptionStartedAt: null,
        subscriptionExpiresAt: null,
        trialUsed: false,
        autoRenew: false,
        paymentTxHash: null,
        paymentToken: null,
        paymentAmount: null,
        lastSessionId: null,
        sessionRevokedAt: null,
      };
      this.subscriptions[userId] = fresh;
      saveStorage('subscriptions', this.subscriptions);
      return fresh;
    }

    // Auto-compute status transitions based on timestamps
    let updatedStatus = existing.status;

    if (existing.status === 'TRIAL_ACTIVE') {
      if (existing.trialExpiresAt && new Date(existing.trialExpiresAt).getTime() <= now) {
        updatedStatus = 'TRIAL_EXPIRED';
      }
    } else if (existing.status === 'ACTIVE_PAID') {
      if (existing.subscriptionExpiresAt && new Date(existing.subscriptionExpiresAt).getTime() <= now) {
        updatedStatus = 'EXPIRED';
      }
    }

    if (updatedStatus !== existing.status) {
      existing.status = updatedStatus;
      saveStorage('subscriptions', this.subscriptions);
    }

    return existing;
  }

  public checkAccess(userId: string, walletAddress?: string | null): BotAccessCheckResult {
    const sub = this.getSubscription(userId, walletAddress);
    const now = Date.now();

    if (sub.status === 'REVOKED') {
      return {
        hasAccess: false,
        status: 'REVOKED',
        reason: 'Subscription access was administratively revoked or expired.',
        remainingTimeMs: 0,
        formattedRemaining: 'Revoked',
        expiresAt: sub.sessionRevokedAt,
      };
    }

    if (sub.status === 'TRIAL_EXPIRED') {
      return {
        hasAccess: false,
        status: 'TRIAL_EXPIRED',
        reason: 'Your 48-Hour Free Trial has expired. Upgrade to a paid plan to continue.',
        remainingTimeMs: 0,
        formattedRemaining: '00h 00m 00s',
        expiresAt: sub.trialExpiresAt,
      };
    }

    if (sub.status === 'EXPIRED') {
      return {
        hasAccess: false,
        status: 'EXPIRED',
        reason: 'Your paid subscription plan has expired. Recharge your subscription to resume.',
        remainingTimeMs: 0,
        formattedRemaining: 'Expired',
        expiresAt: sub.subscriptionExpiresAt,
      };
    }

    if (sub.status === 'TRIAL_ACTIVE' && sub.trialExpiresAt) {
      const expiresAtMs = new Date(sub.trialExpiresAt).getTime();
      const remainingMs = Math.max(0, expiresAtMs - now);

      if (remainingMs > 0) {
        return {
          hasAccess: true,
          status: 'TRIAL_ACTIVE',
          remainingTimeMs: remainingMs,
          formattedRemaining: this.formatRemaining(remainingMs),
          expiresAt: sub.trialExpiresAt,
        };
      } else {
        // Expired
        sub.status = 'TRIAL_EXPIRED';
        saveStorage('subscriptions', this.subscriptions);
        return {
          hasAccess: false,
          status: 'TRIAL_EXPIRED',
          reason: 'Your 48-Hour Free Trial has expired. Upgrade to a paid plan to continue.',
          remainingTimeMs: 0,
          formattedRemaining: '00h 00m 00s',
          expiresAt: sub.trialExpiresAt,
        };
      }
    }

    if (sub.status === 'ACTIVE_PAID' && sub.subscriptionExpiresAt) {
      const expiresAtMs = new Date(sub.subscriptionExpiresAt).getTime();
      const remainingMs = Math.max(0, expiresAtMs - now);

      if (remainingMs > 0) {
        return {
          hasAccess: true,
          status: 'ACTIVE_PAID',
          remainingTimeMs: remainingMs,
          formattedRemaining: this.formatRemaining(remainingMs),
          expiresAt: sub.subscriptionExpiresAt,
        };
      } else {
        sub.status = 'EXPIRED';
        saveStorage('subscriptions', this.subscriptions);
        return {
          hasAccess: false,
          status: 'EXPIRED',
          reason: 'Your paid subscription plan has expired. Recharge your subscription to resume.',
          remainingTimeMs: 0,
          formattedRemaining: 'Expired',
          expiresAt: sub.subscriptionExpiresAt,
        };
      }
    }

    return {
      hasAccess: false,
      status: sub.status,
      reason: sub.trialUsed
        ? 'Free trial has already been redeemed. Please activate a subscription plan.'
        : 'Free trial has not been activated. Click Start 48h Free Trial to begin.',
      remainingTimeMs: 0,
      formattedRemaining: 'Inactive',
      expiresAt: null,
    };
  }

  private formatRemaining(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }

  // --- Free Trial Activation ---
  public startFreeTrial(
    userId: string,
    walletAddress?: string | null,
    username?: string
  ): { success: boolean; subscription?: UserBotSubscription; error?: string } {
    const sub = this.getSubscription(userId, walletAddress);

    // Anti-abuse check 1: Has user account already used trial?
    if (sub.trialUsed) {
      return {
        success: false,
        error: 'Each eligible user is limited to one 48-Hour Free Trial. Your account has already redeemed its trial entitlement.',
      };
    }

    // Anti-abuse check 2: Is this wallet already linked to another trial?
    if (walletAddress) {
      const duplicateWalletSub = Object.values(this.subscriptions).find(
        (s) => s.userId !== userId && s.walletAddress?.toLowerCase() === walletAddress.toLowerCase() && s.trialUsed
      );
      if (duplicateWalletSub) {
        return {
          success: false,
          error: `The wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} has already redeemed a free trial on another account. A wallet can only be used once for trial entitlement.`,
        };
      }
    }

    const durationMs = this.adminConfig.trialDurationHours * 3600 * 1000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMs);

    sub.username = username || sub.username || userId;
    sub.walletAddress = walletAddress || sub.walletAddress;
    sub.isWalletVerified = Boolean(walletAddress);
    sub.planId = 'TRIAL_48H';
    sub.status = 'TRIAL_ACTIVE';
    sub.trialStartedAt = now.toISOString();
    sub.trialExpiresAt = expiresAt.toISOString();
    sub.trialUsed = true;
    sub.lastSessionId = `sess_trial_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    sub.sessionRevokedAt = null;

    saveStorage('subscriptions', this.subscriptions);
    this.notify();

    return {
      success: true,
      subscription: sub,
    };
  }

  // --- Paid Subscription Activation ---
  public subscribePlan(
    userId: string,
    planId: SubscriptionPlanId,
    paymentToken: 'USDT' | 'LIORA',
    walletAddress: string,
    txHash?: string
  ): { success: boolean; subscription?: UserBotSubscription; error?: string } {
    const plan = this.adminConfig.plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, error: 'Invalid subscription plan selection.' };
    }

    if (!walletAddress) {
      return { success: false, error: 'A verified Web3 wallet is required for bot subscription authorization.' };
    }

    const sub = this.getSubscription(userId, walletAddress);
    const now = new Date();
    const durationMs = plan.durationDays * 86400 * 1000;
    const expiresAt = new Date(now.getTime() + durationMs);

    const generatedTxHash =
      txHash ||
      '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    sub.walletAddress = walletAddress;
    sub.isWalletVerified = true;
    sub.planId = planId;
    sub.status = 'ACTIVE_PAID';
    sub.subscriptionStartedAt = now.toISOString();
    sub.subscriptionExpiresAt = expiresAt.toISOString();
    sub.paymentTxHash = generatedTxHash;
    sub.paymentToken = paymentToken;
    sub.paymentAmount = paymentToken === 'USDT' ? plan.priceUsdt : plan.priceLiora;
    sub.lastSessionId = `sess_paid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    sub.sessionRevokedAt = null;

    saveStorage('subscriptions', this.subscriptions);
    this.notify();

    return {
      success: true,
      subscription: sub,
    };
  }

  // --- Wallet Verification Binding ---
  public verifyWallet(userId: string, walletAddress: string): UserBotSubscription {
    const sub = this.getSubscription(userId, walletAddress);
    sub.walletAddress = walletAddress;
    sub.isWalletVerified = true;
    saveStorage('subscriptions', this.subscriptions);
    this.notify();
    return sub;
  }

  // --- Session & Access Revocation ---
  public revokeSession(userId: string, reason = 'Administrative revocation'): boolean {
    const sub = this.subscriptions[userId];
    if (!sub) return false;

    sub.status = 'REVOKED';
    sub.sessionRevokedAt = new Date().toISOString();
    sub.lastSessionId = null;

    saveStorage('subscriptions', this.subscriptions);
    this.notify();
    return true;
  }

  // --- Signals & Metrics ---
  public getSignals(): BotSignal[] {
    return [...this.signals];
  }

  public getPaperMetrics(): PaperTradeMetrics {
    return { ...this.paperMetrics };
  }

  // --- Admin Configuration ---
  public getAdminConfig(): BotAdminConfig {
    return { ...this.adminConfig };
  }

  public updateAdminConfig(updates: Partial<BotAdminConfig>) {
    this.adminConfig = { ...this.adminConfig, ...updates };
    saveStorage('admin_config', this.adminConfig);
    this.notify();
  }

  public adminSetTrialDuration(hours: number) {
    if (hours < 1) hours = 1;
    this.adminConfig.trialDurationHours = hours;
    saveStorage('admin_config', this.adminConfig);
    this.notify();
  }

  public adminExtendSubscription(userId: string, additionalDays: number): boolean {
    const sub = this.subscriptions[userId];
    if (!sub) return false;

    const baseMs = sub.subscriptionExpiresAt ? new Date(sub.subscriptionExpiresAt).getTime() : Date.now();
    const newExpiresMs = Math.max(Date.now(), baseMs) + additionalDays * 86400 * 1000;

    sub.subscriptionExpiresAt = new Date(newExpiresMs).toISOString();
    sub.status = 'ACTIVE_PAID';
    sub.sessionRevokedAt = null;

    saveStorage('subscriptions', this.subscriptions);
    this.notify();
    return true;
  }

  public getAllSubscriptions(): UserBotSubscription[] {
    return Object.values(this.subscriptions);
  }

  public resetToDefaults() {
    this.adminConfig = { ...INITIAL_BOT_ADMIN_CONFIG };
    this.subscriptions = { ...SEED_BOT_SUBSCRIPTIONS };
    this.signals = [...INITIAL_SIMULATED_SIGNALS];
    this.paperMetrics = { ...INITIAL_PAPER_METRICS };

    saveStorage('admin_config', this.adminConfig);
    saveStorage('subscriptions', this.subscriptions);
    saveStorage('signals', this.signals);
    saveStorage('metrics', this.paperMetrics);

    this.notify();
  }
}

export const botStore = new BotStoreManager();

