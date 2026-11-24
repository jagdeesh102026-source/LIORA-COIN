/**
 * LIORA COIN — Trading Bot & Subscription Types
 * Source Strategy: ALGOX V6_1_24 (TradingView Pine Script v5)
 *
 * All automated alerts and performance metrics are simulated demo data.
 * Proprietary trading strategy logic runs strictly on TradingView servers.
 */

export type SubscriptionPlanId = 'TRIAL_48H' | 'PLAN_MONTHLY' | 'PLAN_QUARTERLY' | 'PLAN_ANNUAL';

export type SubscriptionStatus =
  | 'NO_SUBSCRIPTION'
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'ACTIVE_PAID'
  | 'EXPIRED'
  | 'REVOKED';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  durationDays: number;
  durationHours?: number;
  priceUsd: number;
  priceLiora: number; // calculated at $0.05 per LIORA benchmark
  priceUsdt: number;
  billingPeriodLabel: string;
  isPopular?: boolean;
  features: string[];
}

export interface UserBotSubscription {
  userId: string;
  username: string;
  walletAddress: string | null;
  isWalletVerified: boolean;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  subscriptionStartedAt: string | null;
  subscriptionExpiresAt: string | null;
  trialUsed: boolean;
  autoRenew: boolean;
  paymentTxHash: string | null;
  paymentToken: 'USDT' | 'LIORA' | null;
  paymentAmount: number | null;
  lastSessionId: string | null;
  sessionRevokedAt: string | null;
}

export type SignalAction = 'LONG' | 'SHORT' | 'EXIT';
export type SignalStatus = 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'SL_HIT' | 'CLOSED';

export interface BotSignal {
  id: string;
  strategy: string; // 'ALGOX V6_1_24'
  strategyVersion: string;
  pair: string; // e.g. 'BTC/USDT', 'LIORA/USDT', 'ETH/USDT'
  action: SignalAction;
  entryPrice: number;
  tp1: number;
  tp2: number;
  stopLoss: number;
  riskRewardRatio: number;
  timeframe: string; // '15m' | '1H' | '4H'
  timestamp: string;
  status: SignalStatus;
  pnlPercent: number;
  isSimulated: true;
  notes?: string;
}

export interface PaperTradeMetrics {
  winRatePercent: number;
  profitFactor: number;
  totalSimulatedTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdownPercent: number;
  netPnlPercent: number;
  averageTradePnlPercent: number;
  sharpeRatio: number;
  benchmarkAsset: string;
  periodLabel: string;
}

export interface BotAdminConfig {
  trialDurationHours: number; // default: 48
  paymentNetwork: string; // default: 'BNB Smart Chain (BEP-20)'
  paymentTreasuryAddress: string;
  acceptedPaymentTokens: ('USDT' | 'LIORA')[];
  plans: SubscriptionPlan[];
  maxActiveSessionsPerUser: number;
  requireWalletVerification: boolean;
}

export interface BotAccessCheckResult {
  hasAccess: boolean;
  status: SubscriptionStatus;
  reason?: string;
  remainingTimeMs: number;
  formattedRemaining: string;
  expiresAt: string | null;
}

