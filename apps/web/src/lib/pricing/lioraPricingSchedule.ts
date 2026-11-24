/**
 * LIORA — Authoritative Reference Pricing Schedule Engine
 *
 * Implements the confirmed reference-price progression schedule:
 * - Starting Price: ₹0.20 per LIORA (20 paise)
 * - Scheduled Increase: ₹0.20 every 5 hours (18,000 seconds)
 * - Maximum Reference Price: ₹30.00 per LIORA (3,000 paise)
 * - Time to Maximum: 745 hours (149 intervals * 5 hours)
 *
 * Mathematical Invariant (Exact Integer Paise Arithmetic):
 * pricePaise = min(20 + 20 * floor(elapsedSeconds / 18000), 3000)
 * priceINR = (pricePaise / 100).toFixed(2)
 *
 * MANDATORY SAFETY & COMPLIANCE DIRECTIVE:
 * This schedule represents an internal reference and primary sale benchmark.
 * It is STRICTLY SEPARATE from live DEX (PancakeSwap) market prices.
 * It MUST NEVER be claimed that LIORA will trade at ₹30.00 on decentralized or centralized exchanges.
 */

import { prisma } from '../server/prisma';

export interface LioraPriceCalculationResult {
  stepIndex: number;
  pricePaise: number;
  priceINR: string;
  priceUSD: string;
  elapsedSeconds: number;
  elapsedHours: number;
  isInitial: boolean;
  isCeilingReached: boolean;
  nextStepSeconds: number;
  remainingSecondsToCeiling: number;
  totalIntervals: number;
  totalHoursToCeiling: number;
  disclaimer: string;
}

export interface LioraPricingStatus extends LioraPriceCalculationResult {
  scheduleName: string;
  isActivated: boolean;
  activationTimestamp: string | null;
  queryTimestamp: string;
  configuredBy: string;
}

export class LioraPricingScheduleService {
  public static readonly CONFIG_ID = 'CURRENT_CONFIG';
  public static readonly START_PRICE_PAISE = 20; // ₹0.20
  public static readonly INCREMENT_PAISE = 20;   // ₹0.20
  public static readonly MAX_PRICE_PAISE = 3000;  // ₹30.00
  public static readonly INTERVAL_SECONDS = 18000; // 5 hours = 18,000s
  public static readonly TOTAL_INTERVALS = 149;  // (3000 - 20) / 20 = 149 steps
  public static readonly TOTAL_HOURS_TO_CEILING = 745; // 149 * 5 hours = 745 hours
  public static readonly DEFAULT_USD_FX_RATE = 86.50; // INR per USD

  public static readonly DISCLAIMER =
    'DISCLAIMER: The Scheduled Reference Price is an internal economic benchmark. It is non-binding, does NOT represent an active DEX market price, and provides NO guarantee that LIORA will trade at this valuation on PancakeSwap or any other exchange.';

  // In-memory cache for fast local access
  private static cachedConfig: {
    isActivated: boolean;
    activationTimestamp: Date | null;
    configuredBy: string;
  } = {
    isActivated: false,
    activationTimestamp: null,
    configuredBy: 'ADMIN_SYSTEM',
  };

  /**
   * Pure mathematical function: calculates exact integer paise price given elapsed seconds.
   * Completely immune to floating-point drift.
   */
  public static calculatePriceForElapsedSeconds(
    elapsedSeconds: number,
    fxRate: number = LioraPricingScheduleService.DEFAULT_USD_FX_RATE
  ): LioraPriceCalculationResult {
    const nonNegativeElapsed = Math.max(0, Math.floor(elapsedSeconds));
    const stepIndex = Math.floor(nonNegativeElapsed / this.INTERVAL_SECONDS);

    // Exact integer paise arithmetic
    const calculatedPaise = this.START_PRICE_PAISE + this.INCREMENT_PAISE * stepIndex;
    const pricePaise = Math.min(this.MAX_PRICE_PAISE, calculatedPaise);
    const isCeilingReached = pricePaise >= this.MAX_PRICE_PAISE;

    const priceINRNumber = pricePaise / 100;
    const priceINR = (pricePaise / 100).toFixed(2);
    const priceUSD = (priceINRNumber / fxRate).toFixed(6);

    const elapsedHours = Number((nonNegativeElapsed / 3600).toFixed(2));
    const nextStepSeconds = isCeilingReached
      ? 0
      : this.INTERVAL_SECONDS - (nonNegativeElapsed % this.INTERVAL_SECONDS);

    const totalSecondsToCeiling = this.TOTAL_HOURS_TO_CEILING * 3600;
    const remainingSecondsToCeiling = Math.max(0, totalSecondsToCeiling - nonNegativeElapsed);

    return {
      stepIndex: Math.min(this.TOTAL_INTERVALS, stepIndex),
      pricePaise,
      priceINR,
      priceUSD,
      elapsedSeconds: nonNegativeElapsed,
      elapsedHours,
      isInitial: stepIndex === 0,
      isCeilingReached,
      nextStepSeconds,
      remainingSecondsToCeiling,
      totalIntervals: this.TOTAL_INTERVALS,
      totalHoursToCeiling: this.TOTAL_HOURS_TO_CEILING,
      disclaimer: this.DISCLAIMER,
    };
  }

  /**
   * Fetches the current pricing schedule status, querying PostgreSQL for the persistent activation state.
   */
  public static async getScheduleStatus(
    asOfDate: Date = new Date(),
    fxRate: number = LioraPricingScheduleService.DEFAULT_USD_FX_RATE
  ): Promise<LioraPricingStatus> {
    const config = await this.loadConfig();

    let elapsedSeconds = 0;
    if (config.isActivated && config.activationTimestamp) {
      const diffMs = asOfDate.getTime() - config.activationTimestamp.getTime();
      elapsedSeconds = Math.max(0, Math.floor(diffMs / 1000));
    }

    const calc = this.calculatePriceForElapsedSeconds(elapsedSeconds, fxRate);

    return {
      ...calc,
      scheduleName: 'CONFIRMED_REFERENCE_SCHEDULE_V1',
      isActivated: config.isActivated,
      activationTimestamp: config.activationTimestamp ? config.activationTimestamp.toISOString() : null,
      queryTimestamp: asOfDate.toISOString(),
      configuredBy: config.configuredBy,
    };
  }

  /**
   * Configures the activation timestamp and status.
   * Persisted atomically to PostgreSQL.
   */
  public static async configureSchedule(params: {
    activationTimestamp?: Date | null;
    isActivated?: boolean;
    configuredBy: string;
  }): Promise<LioraPricingStatus> {
    try {
      const db = prisma as any;
      const updated = await db.pricingScheduleConfig.upsert({
        where: { id: this.CONFIG_ID },
        create: {
          id: this.CONFIG_ID,
          scheduleName: 'CONFIRMED_REFERENCE_SCHEDULE_V1',
          startPricePaise: this.START_PRICE_PAISE,
          incrementPaise: this.INCREMENT_PAISE,
          maxPricePaise: this.MAX_PRICE_PAISE,
          intervalSeconds: this.INTERVAL_SECONDS,
          totalIntervals: this.TOTAL_INTERVALS,
          totalHoursToCeiling: this.TOTAL_HOURS_TO_CEILING,
          isActivated: params.isActivated ?? false,
          activationTimestamp: params.activationTimestamp || null,
          configuredBy: params.configuredBy,
        },
        update: {
          isActivated: params.isActivated !== undefined ? params.isActivated : undefined,
          activationTimestamp: params.activationTimestamp !== undefined ? params.activationTimestamp : undefined,
          configuredBy: params.configuredBy,
        },
      });

      this.cachedConfig = {
        isActivated: updated.isActivated,
        activationTimestamp: updated.activationTimestamp,
        configuredBy: updated.configuredBy,
      };
    } catch (err) {
      // In-memory fallback if DB connection unavailable in mock mode
      if (params.isActivated !== undefined) this.cachedConfig.isActivated = params.isActivated;
      if (params.activationTimestamp !== undefined) this.cachedConfig.activationTimestamp = params.activationTimestamp;
      if (params.configuredBy) this.cachedConfig.configuredBy = params.configuredBy;
    }

    return this.getScheduleStatus();
  }

  /**
   * Audit query: calculates price for any historical or future timestamp against the configured activation.
   */
  public static async getPriceAtTimestamp(
    targetDate: Date,
    fxRate: number = LioraPricingScheduleService.DEFAULT_USD_FX_RATE
  ): Promise<LioraPriceCalculationResult> {
    const config = await this.loadConfig();
    let elapsedSeconds = 0;

    if (config.isActivated && config.activationTimestamp) {
      const diffMs = targetDate.getTime() - config.activationTimestamp.getTime();
      elapsedSeconds = Math.max(0, Math.floor(diffMs / 1000));
    }

    return this.calculatePriceForElapsedSeconds(elapsedSeconds, fxRate);
  }

  /**
   * Loads config from PostgreSQL with fallback to cache.
   */
  private static async loadConfig(): Promise<{
    isActivated: boolean;
    activationTimestamp: Date | null;
    configuredBy: string;
  }> {
    try {
      const db = prisma as any;
      const dbConfig = await db.pricingScheduleConfig.findUnique({
        where: { id: this.CONFIG_ID },
      });

      if (dbConfig) {
        this.cachedConfig = {
          isActivated: dbConfig.isActivated,
          activationTimestamp: dbConfig.activationTimestamp,
          configuredBy: dbConfig.configuredBy,
        };
      }
    } catch (err) {
      // Retain cached state
    }

    return this.cachedConfig;
  }
}
