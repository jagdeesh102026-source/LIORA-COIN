/**
 * LIORA COIN — Separate Test-Only INR Reference-Price Simulator
 *
 * Implements the theoretical reference-price progression schedule:
 * - Starting Price: ₹0.20 INR
 * - Fixed Increment: ₹0.20 INR per interval
 * - Maximum Ceiling: ₹30.00 INR (150x starting price)
 * - Configurable Step Interval: 5 Hours or 6 Hours
 *
 * ARCHITECTURAL SAFETY DIRECTIVE:
 * This module is a theoretical reference simulator for modeling prospective schedule progressions.
 * It is STRICTLY SEPARATE from actual decentralized exchange (DEX) automated market maker (AMM) pricing,
 * order book quotes, and investor wallet valuations.
 * It MUST NOT be used to fabricate trading volume, generate executable market quotations,
 * or imply guaranteed investor yields.
 */

export type ReferenceIntervalHours = 5 | 6;

export interface ReferenceScheduleSummary {
  startPriceINR: number;
  incrementINR: number;
  maxPriceINR: number;
  totalIntervals: number; // 149 intervals to reach ₹30.00 from ₹0.20
  totalPoints: number; // 150 price points (Step 0 to Step 149)
  intervalHours: ReferenceIntervalHours;
  totalHours: number; // 745 hours (5h) or 894 hours (6h)
  totalDurationDays: number; // 31.04 days (5h) or 37.25 days (6h)
  growthMultiplier: number; // 150x
  percentageGain: number; // 14,900%
  lockedFxRate: number; // e.g. 86.50 INR per USD
  startPriceUSD: number;
  maxPriceUSD: number;
}

export interface ReferencePriceStepResult {
  intervalIndex: number;
  priceINR: number;
  priceINRFormatted: string;
  priceUSD: number;
  priceUSDFormatted: string;
  progressPercent: number;
  elapsedHours: number;
  isInitial: boolean;
  isCeilingReached: boolean;
  nextIncrementHours: number;
}

export interface ReferenceTimestampResult extends ReferencePriceStepResult {
  startTimeUTC: string;
  queryTimeUTC: string;
  elapsedSeconds: number;
  remainingSecondsToCeiling: number;
}

export class ReferencePriceSimulator {
  public static readonly START_PRICE_INR = 0.20;
  public static readonly INCREMENT_INR = 0.20;
  public static readonly MAX_PRICE_INR = 30.00;
  public static readonly TOTAL_INTERVALS = 149; // (30.00 - 0.20) / 0.20 = 149 steps
  public static readonly DEFAULT_FX_RATE = 86.50; // INR per USD

  // Confirmed business parameters (Gate C4C)
  public static readonly CONFIRMED_INTERVAL_HOURS: ReferenceIntervalHours = 5;
  public static readonly CONFIRMED_INTERVAL_SECONDS: number = 18000; // 5 * 3600 = 18,000 seconds
  public static readonly CONFIRMED_TOTAL_HOURS: number = 745; // 149 * 5 hours = 31 days and 1 hour
  public static readonly CONFIRMED_START_PAISE: number = 20;
  public static readonly CONFIRMED_INCREMENT_PAISE: number = 20;
  public static readonly CONFIRMED_MAX_PAISE: number = 3000; // ₹30.00 = 3,000 paise

  /**
   * Evaluates the confirmed exact integer paise formula:
   * pricePaise = min(20 + 20 * floor(elapsedSeconds / 18000), 3000)
   * Prevents negative elapsed time and ensures strict integer arithmetic.
   */
  public static calculatePricePaise(elapsedSeconds: number): number {
    const nonNegativeElapsed = Math.max(0, Math.floor(elapsedSeconds));
    const stepCount = Math.floor(nonNegativeElapsed / ReferencePriceSimulator.CONFIRMED_INTERVAL_SECONDS);
    const calculatedPaise = ReferencePriceSimulator.CONFIRMED_START_PAISE + (ReferencePriceSimulator.CONFIRMED_INCREMENT_PAISE * stepCount);
    return Math.min(ReferencePriceSimulator.CONFIRMED_MAX_PAISE, calculatedPaise);
  }

  /**
   * Asserts valid interval hours (5 or 6 hours).
   */
  public static validateIntervalHours(hours: number): asserts hours is ReferenceIntervalHours {
    if (hours !== 5 && hours !== 6) {
      throw new Error(`INVALID_INTERVAL_HOURS: Reference interval must be strictly 5 or 6 hours. Received: ${hours}`);
    }
  }

  /**
   * Computes schedule summary metrics for 5-hour or 6-hour progression.
   */
  public static getScheduleSummary(
    intervalHours: ReferenceIntervalHours = 6,
    lockedFxRate: number = ReferencePriceSimulator.DEFAULT_FX_RATE
  ): ReferenceScheduleSummary {
    ReferencePriceSimulator.validateIntervalHours(intervalHours);

    const totalHours = ReferencePriceSimulator.TOTAL_INTERVALS * intervalHours;
    const totalDurationDays = Number((totalHours / 24).toFixed(4));
    const startPriceUSD = Number((ReferencePriceSimulator.START_PRICE_INR / lockedFxRate).toFixed(8));
    const maxPriceUSD = Number((ReferencePriceSimulator.MAX_PRICE_INR / lockedFxRate).toFixed(4));

    return {
      startPriceINR: ReferencePriceSimulator.START_PRICE_INR,
      incrementINR: ReferencePriceSimulator.INCREMENT_INR,
      maxPriceINR: ReferencePriceSimulator.MAX_PRICE_INR,
      totalIntervals: ReferencePriceSimulator.TOTAL_INTERVALS,
      totalPoints: ReferencePriceSimulator.TOTAL_INTERVALS + 1,
      intervalHours,
      totalHours,
      totalDurationDays,
      growthMultiplier: 150,
      percentageGain: 14900,
      lockedFxRate,
      startPriceUSD,
      maxPriceUSD,
    };
  }

  /**
   * Calculates the exact theoretical reference price at a given interval index (N).
   * Formula:
   *   price = min(30.00, 0.20 + (N * 0.20))
   */
  public static getPriceAtInterval(
    intervalIndex: number,
    intervalHours: ReferenceIntervalHours = 6,
    lockedFxRate: number = ReferencePriceSimulator.DEFAULT_FX_RATE
  ): ReferencePriceStepResult {
    ReferencePriceSimulator.validateIntervalHours(intervalHours);

    if (intervalIndex < 0 || !Number.isInteger(intervalIndex)) {
      throw new Error(`INVALID_INTERVAL_INDEX: Interval index must be a non-negative integer. Received: ${intervalIndex}`);
    }

    if (lockedFxRate <= 0) {
      throw new Error(`INVALID_FX_RATE: FX rate must be positive. Received: ${lockedFxRate}`);
    }

    // Exact arithmetic using integer cents to prevent IEEE-754 floating-point drift
    // 0.20 = 20 cents, 30.00 = 3000 cents
    const startCents = 20;
    const incrementCents = 20;
    const maxCents = 3000;

    const calculatedCents = startCents + intervalIndex * incrementCents;
    const clampedCents = Math.min(maxCents, calculatedCents);

    const priceINR = clampedCents / 100;
    const priceUSD = Number((priceINR / lockedFxRate).toFixed(8));
    const progressPercent = Number(((clampedCents - startCents) / (maxCents - startCents) * 100).toFixed(2));
    const elapsedHours = intervalIndex * intervalHours;
    const isCeilingReached = clampedCents >= maxCents;
    const nextIncrementHours = isCeilingReached ? 0 : intervalHours;

    return {
      intervalIndex,
      priceINR,
      priceINRFormatted: `₹${priceINR.toFixed(2)}`,
      priceUSD,
      priceUSDFormatted: `$${priceUSD.toFixed(6)}`,
      progressPercent,
      elapsedHours,
      isInitial: intervalIndex === 0,
      isCeilingReached,
      nextIncrementHours,
    };
  }

  /**
   * Projects the reference price for any timestamp relative to a schedule start time.
   */
  public static getPriceAtTimestamp(
    startTime: Date | string,
    queryTime: Date | string,
    intervalHours: ReferenceIntervalHours = 6,
    lockedFxRate: number = ReferencePriceSimulator.DEFAULT_FX_RATE
  ): ReferenceTimestampResult {
    ReferencePriceSimulator.validateIntervalHours(intervalHours);

    const startMs = typeof startTime === 'string' ? new Date(startTime).getTime() : startTime.getTime();
    const queryMs = typeof queryTime === 'string' ? new Date(queryTime).getTime() : queryTime.getTime();

    if (isNaN(startMs) || isNaN(queryMs)) {
      throw new Error('INVALID_TIMESTAMP: Provided startTime or queryTime is invalid.');
    }

    const elapsedSeconds = Math.max(0, Math.floor((queryMs - startMs) / 1000));
    const intervalSeconds = intervalHours * 3600;

    // Interval index N is floor(elapsedSeconds / intervalSeconds)
    const intervalIndex = Math.floor(elapsedSeconds / intervalSeconds);
    const stepResult = ReferencePriceSimulator.getPriceAtInterval(intervalIndex, intervalHours, lockedFxRate);

    const totalScheduleSeconds = ReferencePriceSimulator.TOTAL_INTERVALS * intervalSeconds;
    const remainingSecondsToCeiling = Math.max(0, totalScheduleSeconds - elapsedSeconds);

    return {
      ...stepResult,
      startTimeUTC: new Date(startMs).toISOString(),
      queryTimeUTC: new Date(queryMs).toISOString(),
      elapsedSeconds,
      remainingSecondsToCeiling,
    };
  }

  /**
   * Calculates key schedule milestones (₹1.00, ₹5.00, ₹10.00, ₹20.00, ₹30.00).
   */
  public static getScheduleMilestones(
    intervalHours: ReferenceIntervalHours = 6,
    lockedFxRate: number = ReferencePriceSimulator.DEFAULT_FX_RATE
  ): Array<{ milestoneINR: number; intervalIndex: number; elapsedHours: number; elapsedDays: number; priceUSD: string }> {
    const targetPrices = [1.00, 5.00, 10.00, 20.00, 30.00];

    return targetPrices.map((target) => {
      // (target - 0.20) / 0.20 = step
      const step = Math.round((target - ReferencePriceSimulator.START_PRICE_INR) / ReferencePriceSimulator.INCREMENT_INR);
      const res = ReferencePriceSimulator.getPriceAtInterval(step, intervalHours, lockedFxRate);
      return {
        milestoneINR: target,
        intervalIndex: step,
        elapsedHours: res.elapsedHours,
        elapsedDays: Number((res.elapsedHours / 24).toFixed(2)),
        priceUSD: res.priceUSDFormatted,
      };
    });
  }
}

