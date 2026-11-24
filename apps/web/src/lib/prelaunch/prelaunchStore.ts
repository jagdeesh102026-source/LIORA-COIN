/**
 * LIORA COIN — Pre-Launch Configuration & Quote Store
 *
 * Manages configuration state, versioning history, binding 15-minute purchase quotes,
 * locked purchase records, and administrator audit logging.
 */

import crypto from 'crypto';
import {
  PrelaunchConfig,
  PrelaunchPriceResult,
  PurchaseQuote,
  PurchaseQuoteRequest,
  LockedPurchaseRecord,
  PrelaunchAuditLog,
  InvestmentLockTier
} from './prelaunchTypes';
import { calculatePrelaunchPrice, validatePrelaunchConfig } from './pricingEngine';
import {
  validateInvestmentTiers,
  getTierForInvestmentUSD,
  calculateTokenAllocation,
  addCalendarMonthsUTC
} from './lockingPolicy';

export const DEFAULT_INVESTMENT_TIERS: InvestmentLockTier[] = [
  {
    id: 'tier-3m',
    name: 'Standard Allocation',
    minAmountUSD: 100,
    maxAmountUSD: 999.99,
    lockMonths: 3,
    description: '3-calendar-month lockup for entries up to $999.99'
  },
  {
    id: 'tier-6m',
    name: 'Growth Allocation',
    minAmountUSD: 1000,
    maxAmountUSD: 4999.99,
    lockMonths: 6,
    description: '6-calendar-month lockup for entries from $1,000 to $4,999.99'
  },
  {
    id: 'tier-12m',
    name: 'Strategic Allocation',
    minAmountUSD: 5000,
    maxAmountUSD: null,
    lockMonths: 12,
    description: '12-calendar-month lockup for entries of $5,000 and above'
  }
];

export const INITIAL_PRELAUNCH_CONFIG: PrelaunchConfig = {
  version: 1,
  enabled: false,
  startPriceINR: '0.20',
  targetPriceUSD: '0.30',
  durationDays: 30,
  pricingModel: 'LINEAR',
  updateMode: 'CONTINUOUS',
  startTimeUTC: null,
  lockedInrPerUsd: '86.50',
  fxRateSource: 'Reserve Bank of India (RBI) Reference Rate',
  lockPeriodsMonths: [3, 6, 12],
  status: 'DRAFT',
  investmentTiers: DEFAULT_INVESTMENT_TIERS,
  quoteTtlSeconds: 900, // 15 minutes
  lastUpdatedUTC: new Date().toISOString(),
  updatedBy: 'SYSTEM_GENESIS'
};

class PrelaunchRepository {
  private currentConfig: PrelaunchConfig;
  private configHistory: PrelaunchConfig[] = [];
  private quotes: Map<string, PurchaseQuote> = new Map();
  private purchases: Map<string, LockedPurchaseRecord> = new Map();
  private auditLogs: PrelaunchAuditLog[] = [];

  constructor() {
    this.currentConfig = { ...INITIAL_PRELAUNCH_CONFIG };
    this.configHistory.push({ ...INITIAL_PRELAUNCH_CONFIG });
    this.recordAuditLog('CONFIG_CREATED', 'SYSTEM_GENESIS', undefined, 1, {
      status: 'DRAFT',
      note: 'Initial draft configuration seeded.'
    });
  }

  public getConfig(): PrelaunchConfig {
    return {
      ...this.currentConfig,
      investmentTiers: this.currentConfig.investmentTiers.map(t => ({ ...t }))
    };
  }

  public getConfigHistory(): PrelaunchConfig[] {
    return this.configHistory.map(c => ({
      ...c,
      investmentTiers: c.investmentTiers.map(t => ({ ...t }))
    }));
  }

  public updateConfig(
    updates: Partial<PrelaunchConfig>,
    actorId: string = 'admin'
  ): { success: boolean; config?: PrelaunchConfig; errors?: string[] } {
    const candidate: PrelaunchConfig = {
      ...this.currentConfig,
      ...updates,
      version: this.currentConfig.version + 1,
      lastUpdatedUTC: new Date().toISOString(),
      updatedBy: actorId
    };

    // If tiers were provided, validate them
    if (updates.investmentTiers) {
      const tierValidation = validateInvestmentTiers(updates.investmentTiers);
      if (!tierValidation.valid) {
        return { success: false, errors: tierValidation.errors };
      }
    }

    // Validate overall prelaunch config
    const configValidation = validatePrelaunchConfig(candidate);
    if (!configValidation.valid) {
      return { success: false, errors: configValidation.errors };
    }

    const previousVersion = this.currentConfig.version;
    this.currentConfig = candidate;
    this.configHistory.push({ ...candidate });

    this.recordAuditLog('CONFIG_UPDATED', actorId, previousVersion, candidate.version, {
      updatedFields: Object.keys(updates),
      newConfig: candidate
    });

    return { success: true, config: this.getConfig() };
  }

  public getCurrentPrice(serverTimeMs: number = Date.now()): PrelaunchPriceResult {
    return calculatePrelaunchPrice(this.currentConfig, serverTimeMs);
  }

  public createQuote(
    req: PurchaseQuoteRequest,
    serverTimeMs: number = Date.now()
  ): { success: boolean; quote?: PurchaseQuote; error?: string } {
    if (!req.userId || !req.walletAddress) {
      return { success: false, error: 'User ID and wallet address are required to request a quote.' };
    }

    if (!req.investmentAmount || req.investmentAmount <= 0) {
      return { success: false, error: 'Investment amount must be greater than 0.' };
    }

    const fxRate = Number(this.currentConfig.lockedInrPerUsd);
    if (!fxRate || fxRate <= 0) {
      return { success: false, error: 'Locked FX rate is not configured.' };
    }

    let amountUSD = req.investmentAmount;
    if (req.currency === 'INR') {
      amountUSD = req.investmentAmount / fxRate;
    }

    let tier: InvestmentLockTier;
    try {
      tier = getTierForInvestmentUSD(amountUSD, this.currentConfig.investmentTiers);
    } catch (err: any) {
      return { success: false, error: err.message };
    }

    const priceResult = calculatePrelaunchPrice(this.currentConfig, serverTimeMs);
    const tokenPriceUSD = priceResult.priceUSD;
    const tokenPriceINR = priceResult.priceINR;
    const tokenQuantity = calculateTokenAllocation(amountUSD, tokenPriceUSD);

    const issuedAt = new Date(serverTimeMs);
    const expiresAt = new Date(serverTimeMs + this.currentConfig.quoteTtlSeconds * 1000);
    const lockStartTime = issuedAt;
    const estimatedUnlockTime = addCalendarMonthsUTC(lockStartTime, tier.lockMonths);

    const quoteId = `quote_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const quote: PurchaseQuote = {
      quoteId,
      userId: req.userId,
      walletAddress: req.walletAddress.toLowerCase(),
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
      ttlSeconds: this.currentConfig.quoteTtlSeconds,
      policyVersion: this.currentConfig.version,
      isExpired: false
    };

    this.quotes.set(quoteId, quote);
    this.recordAuditLog('QUOTE_ISSUED', req.userId, undefined, this.currentConfig.version, {
      quoteId,
      amountUSD,
      tier: tier.name,
      tokenQuantity
    });

    return { success: true, quote };
  }

  public getQuote(
    quoteId: string,
    serverTimeMs: number = Date.now()
  ): { quote: PurchaseQuote | null; isExpired: boolean } {
    const quote = this.quotes.get(quoteId);
    if (!quote) {
      return { quote: null, isExpired: false };
    }

    const expiresAtMs = new Date(quote.expiresAtUTC).getTime();
    const isExpired = serverTimeMs > expiresAtMs;

    return {
      quote: {
        ...quote,
        isExpired
      },
      isExpired
    };
  }

  public recordPurchase(
    quoteId: string,
    serverTimeMs: number = Date.now(),
    txHash: string | null = null
  ): { success: boolean; record?: LockedPurchaseRecord; error?: string } {
    const { quote, isExpired } = this.getQuote(quoteId, serverTimeMs);
    if (!quote) {
      return { success: false, error: 'Quote not found.' };
    }
    if (isExpired) {
      return { success: false, error: 'Purchase quote has expired (15-minute TTL). Please request a fresh quote.' };
    }

    const purchaseId = `purch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const purchaseTime = new Date(serverTimeMs);
    const unlockTime = addCalendarMonthsUTC(purchaseTime, quote.lockMonths);

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
      createdAtUTC: purchaseTime.toISOString()
    };

    this.purchases.set(purchaseId, record);
    // Single-use quote consumption (replay defense)
    this.quotes.delete(quoteId);

    this.recordAuditLog('PURCHASE_RECORDED', quote.userId, undefined, quote.policyVersion, {
      purchaseId,
      tokens: quote.tokenQuantity,
      lockMonths: quote.lockMonths,
      unlockTimeUTC: unlockTime.toISOString()
    });

    return { success: true, record };
  }

  public getUserPurchases(userId: string): LockedPurchaseRecord[] {
    const result: LockedPurchaseRecord[] = [];
    for (const record of this.purchases.values()) {
      if (record.userId === userId) {
        result.push({ ...record });
      }
    }
    return result.sort((a, b) => new Date(b.createdAtUTC).getTime() - new Date(a.createdAtUTC).getTime());
  }

  public getAllPurchases(): LockedPurchaseRecord[] {
    return Array.from(this.purchases.values());
  }

  public getAuditLogs(): PrelaunchAuditLog[] {
    return [...this.auditLogs];
  }

  public resetToDefault(): void {
    this.currentConfig = { ...INITIAL_PRELAUNCH_CONFIG };
    this.configHistory = [{ ...INITIAL_PRELAUNCH_CONFIG }];
    this.quotes.clear();
    this.purchases.clear();
    this.auditLogs = [];
    this.recordAuditLog('CONFIG_CREATED', 'SYSTEM_GENESIS', undefined, 1, {
      status: 'DRAFT',
      note: 'Reset to initial draft state'
    });
  }

  private recordAuditLog(
    action: PrelaunchAuditLog['action'],
    actorId: string,
    previousVersion?: number,
    newVersion?: number,
    details: Record<string, any> = {}
  ): void {
    this.auditLogs.push({
      id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestampUTC: new Date().toISOString(),
      action,
      actorId,
      previousVersion,
      newVersion,
      details
    });
  }
}

// Singleton repository
export const prelaunchStore = new PrelaunchRepository();

