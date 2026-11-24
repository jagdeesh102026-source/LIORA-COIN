/**
 * LIORA COIN — Investment-Based Token Locking Policy
 *
 * Implements UTC calendar-month addition (3, 6, 12 months) with leap-year clamping,
 * non-overlapping tier validation, and token allocation calculations.
 */

import { InvestmentLockTier, LockPeriodMonths } from './prelaunchTypes';
import { toScaledBigInt, fromScaledBigInt } from './pricingEngine';

const SCALE = 10n ** 18n;

/**
 * Returns the number of days in a given UTC month and year.
 * Handles Gregorian leap years accurately:
 * A year is a leap year if divisible by 4, except end-of-century years which must be divisible by 400.
 */
export function getDaysInUTCMonth(year: number, monthIndex: number): number {
  // monthIndex is 0-based: 0 = January, 1 = February, ..., 11 = December
  switch (monthIndex) {
    case 1: // February
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      return isLeap ? 29 : 28;
    case 3: // April
    case 5: // June
    case 8: // September
    case 10: // November
      return 30;
    default:
      return 31;
  }
}

/**
 * Adds an exact number of calendar months in UTC, clamping to the last valid day of the target month.
 *
 * Examples:
 * - 2026-11-30T12:00:00Z + 3 months -> 2027-02-28T12:00:00Z (non-leap year clamping from 30 to 28)
 * - 2023-11-29T12:00:00Z + 3 months -> 2024-02-29T12:00:00Z (leap year: 2024 is divisible by 4)
 * - 2026-01-31T00:00:00Z + 1 month  -> 2026-02-28T00:00:00Z
 * - 2026-03-31T15:30:00Z + 6 months -> 2026-09-30T15:30:00Z
 * - 2026-05-15T10:00:00Z + 12 months-> 2027-05-15T10:00:00Z
 *
 * @param date Base Date object or ISO string
 * @param months Number of calendar months to add (e.g. 3, 6, 12)
 * @returns Date object in UTC with clamped day and preserved time
 */
export function addCalendarMonthsUTC(date: Date | string, months: number): Date {
  const base = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(base.getTime())) {
    throw new Error(`Invalid date provided to addCalendarMonthsUTC: "${date}"`);
  }

  const currentYear = base.getUTCFullYear();
  const currentMonth = base.getUTCMonth(); // 0 - 11
  const currentDay = base.getUTCDate();
  const hours = base.getUTCHours();
  const minutes = base.getUTCMinutes();
  const seconds = base.getUTCSeconds();
  const ms = base.getUTCMilliseconds();

  // Calculate target month and year
  const totalMonths = currentMonth + months;
  const targetYear = currentYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  // Clamp day to max days available in target month of target year
  const maxDays = getDaysInUTCMonth(targetYear, targetMonth);
  const clampedDay = Math.min(currentDay, maxDays);

  const targetUtcMs = Date.UTC(targetYear, targetMonth, clampedDay, hours, minutes, seconds, ms);
  return new Date(targetUtcMs);
}

/**
 * Validates that an array of InvestmentLockTiers is contiguous, sorted, and has no gaps or overlaps.
 */
export function validateInvestmentTiers(tiers: InvestmentLockTier[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(tiers) || tiers.length === 0) {
    return { valid: false, errors: ['At least one investment lock tier must be configured.'] };
  }

  // Check valid lock months
  const validMonths = [3, 6, 12];
  for (const tier of tiers) {
    if (!validMonths.includes(tier.lockMonths)) {
      errors.push(`Tier "${tier.name}" specifies invalid lock period ${tier.lockMonths} months. Allowed: 3, 6, 12.`);
    }
    if (tier.minAmountUSD < 0) {
      errors.push(`Tier "${tier.name}" minAmountUSD cannot be negative.`);
    }
    if (tier.maxAmountUSD !== null && tier.maxAmountUSD < tier.minAmountUSD) {
      errors.push(`Tier "${tier.name}" maxAmountUSD (${tier.maxAmountUSD}) cannot be less than minAmountUSD (${tier.minAmountUSD}).`);
    }
  }

  // Sort tiers by minAmountUSD ascending
  const sorted = [...tiers].sort((a, b) => a.minAmountUSD - b.minAmountUSD);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    // Only the last tier may have maxAmountUSD === null
    if (current.maxAmountUSD === null && i < sorted.length - 1) {
      errors.push(`Only the highest tier may have an unbounded maximum amount (null). Tier "${current.name}" is not the last tier.`);
    }

    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      if (current.maxAmountUSD !== null) {
        // Overlap check
        if (current.maxAmountUSD > next.minAmountUSD) {
          errors.push(
            `Tier overlap detected between "${current.name}" (max $${current.maxAmountUSD}) and "${next.name}" (min $${next.minAmountUSD}).`
          );
        }
        // Gap check (tolerance of 1 cent / $0.01)
        const gap = next.minAmountUSD - current.maxAmountUSD;
        if (gap > 1.0) {
          errors.push(
            `Tier gap detected between "${current.name}" (max $${current.maxAmountUSD}) and "${next.name}" (min $${next.minAmountUSD}). Tiers must be contiguous.`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Finds the matching investment lock tier for a given USD investment amount.
 */
export function getTierForInvestmentUSD(
  amountUSD: number,
  tiers: InvestmentLockTier[]
): InvestmentLockTier {
  if (isNaN(amountUSD) || amountUSD <= 0) {
    throw new Error(`Investment amount must be greater than 0 USD. Received: ${amountUSD}`);
  }

  const sorted = [...tiers].sort((a, b) => a.minAmountUSD - b.minAmountUSD);

  // Check below minimum threshold
  if (amountUSD < sorted[0].minAmountUSD) {
    throw new Error(
      `Investment amount of $${amountUSD.toFixed(2)} is below the minimum allocation threshold of $${sorted[0].minAmountUSD.toFixed(2)}.`
    );
  }

  for (const tier of sorted) {
    if (amountUSD >= tier.minAmountUSD) {
      if (tier.maxAmountUSD === null || amountUSD <= tier.maxAmountUSD) {
        return tier;
      }
    }
  }

  throw new Error(`No matching investment tier found for amount $${amountUSD.toFixed(2)}.`);
}

/**
 * Calculates token allocation from USD investment amount and USD token price using 18-decimal fixed-point division.
 */
export function calculateTokenAllocation(amountUSD: number, tokenPriceUSD: string): string {
  const amountScaled = toScaledBigInt(amountUSD.toFixed(4));
  const priceScaled = toScaledBigInt(tokenPriceUSD);

  if (priceScaled <= 0n) {
    throw new Error('Token price must be positive for allocation calculation.');
  }

  // Token quantity = (amountScaled * SCALE) / priceScaled
  const tokensScaled = (amountScaled * SCALE) / priceScaled;
  return fromScaledBigInt(tokensScaled, 4);
}

