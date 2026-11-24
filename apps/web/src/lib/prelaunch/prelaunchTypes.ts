/**
 * LIORA COIN — Pre-Launch Scheduled Pricing & Token Locking Types
 *
 * Configurable 30-day offering curve from ₹0.20 INR equivalent to target USD price ($0.30+),
 * calendar-month investment locking tiers (3, 6, 12 months), and purchase quote records.
 */

export type PricingModel = 'LINEAR';
export type UpdateMode = 'CONTINUOUS' | 'DAILY_STEP';
export type PrelaunchStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
export type LockPeriodMonths = 3 | 6 | 12;

export interface InvestmentLockTier {
  id: string;
  name: string;
  minAmountUSD: number;
  maxAmountUSD: number | null; // null represents infinity / no upper ceiling
  lockMonths: LockPeriodMonths;
  description: string;
}

export interface PrelaunchConfig {
  version: number;
  enabled: boolean;
  startPriceINR: string; // e.g. "0.20"
  targetPriceUSD: string; // e.g. "0.30" or future "$1.00"
  durationDays: number; // e.g. 30
  pricingModel: PricingModel;
  updateMode: UpdateMode;
  startTimeUTC: string | null; // ISO 8601 string or null
  lockedInrPerUsd: string | null; // e.g. "86.50"
  fxRateSource: string; // Documented FX source e.g. "Reserve Bank of India (RBI) Reference Rate"
  lockPeriodsMonths: LockPeriodMonths[];
  status: PrelaunchStatus;
  investmentTiers: InvestmentLockTier[];
  quoteTtlSeconds: number; // 900 seconds (15 minutes)
  lastUpdatedUTC: string;
  updatedBy: string;
}

export interface PrelaunchPriceResult {
  currentServerTimeUTC: string;
  priceUSD: string; // high-precision decimal string
  priceINR: string; // derived INR equivalent
  startPriceUSD: string;
  targetPriceUSD: string;
  progressPercent: number; // 0 to 100
  elapsedSeconds: number;
  totalDurationSeconds: number;
  remainingSeconds: number;
  isStarted: boolean;
  isCompleted: boolean;
  pricingModel: PricingModel;
  updateMode: UpdateMode;
  configVersion: number;
}

export interface PurchaseQuoteRequest {
  investmentAmount: number;
  currency: 'USD' | 'INR';
  userId: string;
  walletAddress: string;
}

export interface PurchaseQuote {
  quoteId: string;
  userId: string;
  walletAddress: string;
  investmentAmount: number;
  currency: 'USD' | 'INR';
  investmentAmountUSD: number;
  tokenPriceUSD: string;
  tokenPriceINR: string;
  tokenQuantity: string; // exact token allocation
  lockTier: InvestmentLockTier;
  lockMonths: LockPeriodMonths;
  lockStartTimeUTC: string;
  estimatedUnlockTimeUTC: string;
  issuedAtUTC: string;
  expiresAtUTC: string;
  ttlSeconds: number;
  policyVersion: number;
  isExpired: boolean;
}

export interface LockedPurchaseRecord {
  purchaseId: string;
  userId: string;
  walletAddress: string;
  investmentAmount: number;
  currency: 'USD' | 'INR';
  purchasePriceUSD: string;
  tokenQuantity: string;
  lockTierMonths: LockPeriodMonths;
  lockStartTimeUTC: string;
  unlockTimeUTC: string;
  policyVersion: number;
  paymentVerificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  claimStatus: 'LOCKED' | 'UNLOCKED' | 'CLAIMED';
  txHash?: string | null;
  createdAtUTC: string;
}

export interface PrelaunchAuditLog {
  id: string;
  timestampUTC: string;
  action: 'CONFIG_CREATED' | 'CONFIG_UPDATED' | 'STATUS_CHANGED' | 'QUOTE_ISSUED' | 'PURCHASE_RECORDED';
  actorId: string;
  previousVersion?: number;
  newVersion?: number;
  details: Record<string, any>;
}

