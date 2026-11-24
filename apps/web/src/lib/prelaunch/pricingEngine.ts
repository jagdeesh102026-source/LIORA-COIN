/**
 * LIORA COIN — Pre-Launch Scheduled Pricing Engine
 *
 * Implements configurable linear price progression with high-precision fixed-point math,
 * supporting Continuous and Daily-Step modes, 30-day duration, locked INR/USD FX rate,
 * and future targets ($0.30, $0.50, $1.00+).
 */

import { PrelaunchConfig, PrelaunchPriceResult } from './prelaunchTypes';

// 18-decimal fixed-point scale for settlement-critical precision
const SCALE = 10n ** 18n;

/**
 * Converts a decimal string or number to an 18-decimal scaled BigInt.
 * Avoids standard IEEE-754 binary floating-point representation errors.
 */
export function toScaledBigInt(val: string | number): bigint {
  const str = typeof val === 'number' ? val.toFixed(18) : val.trim();
  if (!str || isNaN(Number(str))) {
    throw new Error(`Invalid number format for fixed-point conversion: "${val}"`);
  }

  const [intPart, fracPart = ''] = str.split('.');
  const paddedFrac = fracPart.padEnd(18, '0').slice(0, 18);
  const sign = intPart.startsWith('-') ? -1n : 1n;
  const absInt = intPart.replace('-', '');

  const bigIntValue = BigInt(absInt || '0') * SCALE + BigInt(paddedFrac || '0');
  return sign * bigIntValue;
}

/**
 * Formats an 18-decimal scaled BigInt back to a standard decimal string with specified decimal places,
 * applying standard half-up rounding at the chosen display precision.
 */
export function fromScaledBigInt(val: bigint, displayDecimals: number = 8): string {
  const isNegative = val < 0n;
  const absVal = isNegative ? -val : val;

  if (displayDecimals >= 18) {
    const intPart = absVal / SCALE;
    const fracPart = absVal % SCALE;
    const fracStr = fracPart.toString().padStart(18, '0');
    return `${isNegative ? '-' : ''}${intPart.toString()}.${fracStr}`;
  }

  // Round half up to displayDecimals
  const roundFactor = 10n ** BigInt(18 - displayDecimals);
  const roundedVal = (absVal + roundFactor / 2n) / roundFactor;

  const displayScale = 10n ** BigInt(displayDecimals);
  const intPart = roundedVal / displayScale;
  const fracPart = roundedVal % displayScale;

  const fracStr = fracPart.toString().padStart(displayDecimals, '0');
  return `${isNegative ? '-' : ''}${intPart.toString()}.${fracStr}`;
}

/**
 * Validates Prelaunch Configuration parameters according to business rules.
 */
export function validatePrelaunchConfig(config: Partial<PrelaunchConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Duration check
  if (config.durationDays === undefined || config.durationDays === null || config.durationDays <= 0 || !Number.isInteger(config.durationDays)) {
    errors.push('Duration must be a positive integer number of days (e.g. 30).');
  }

  // 2. Start Price INR
  if (!config.startPriceINR || isNaN(Number(config.startPriceINR)) || Number(config.startPriceINR) <= 0) {
    errors.push('Starting price in INR must be a positive number (e.g. "0.20").');
  }

  // 3. Locked FX Rate (INR per USD)
  if (!config.lockedInrPerUsd || isNaN(Number(config.lockedInrPerUsd)) || Number(config.lockedInrPerUsd) <= 0) {
    errors.push('Locked INR/USD FX rate is required and must be a positive number (e.g. "86.50").');
  }

  // 4. Target Price USD
  if (!config.targetPriceUSD || isNaN(Number(config.targetPriceUSD)) || Number(config.targetPriceUSD) <= 0) {
    errors.push('Target price in USD must be a positive number (e.g. "0.30").');
  }

  // 5. FX Rate source
  if (!config.fxRateSource || config.fxRateSource.trim().length === 0) {
    errors.push('Documented FX rate source is required before activating schedule.');
  }

  // 6. Target Price must exceed Starting USD Price
  if (config.startPriceINR && config.lockedInrPerUsd && config.targetPriceUSD) {
    try {
      const startInrScaled = toScaledBigInt(config.startPriceINR);
      const fxScaled = toScaledBigInt(config.lockedInrPerUsd);
      const targetUsdScaled = toScaledBigInt(config.targetPriceUSD);

      if (fxScaled > 0n) {
        const startUsdScaled = (startInrScaled * SCALE) / fxScaled;
        if (targetUsdScaled <= startUsdScaled) {
          errors.push(
            `Target price ($${config.targetPriceUSD}) must be strictly greater than initial USD offering price ($${fromScaledBigInt(startUsdScaled, 6)}).`
          );
        }
      }
    } catch {
      errors.push('Error calculating starting USD price for validation.');
    }
  }

  // 7. Pricing Model check
  if (config.pricingModel && config.pricingModel !== 'LINEAR') {
    errors.push(`Unsupported pricing model: "${config.pricingModel}". Only LINEAR is supported.`);
  }

  // 8. Update Mode check
  if (config.updateMode && config.updateMode !== 'CONTINUOUS' && config.updateMode !== 'DAILY_STEP') {
    errors.push(`Invalid update mode: "${config.updateMode}". Supported modes: CONTINUOUS, DAILY_STEP.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculates the exact pre-launch price at a specific server timestamp using fixed-point math.
 * 
 * Formula:
 * startUSD = startPriceINR / lockedInrPerUsd
 * elapsed = clamp(currentServerTime - startTimeUTC, 0, durationDays * 86400)
 * progress = elapsed / (durationDays * 86400)
 * priceUSD = startUSD + (targetPriceUSD - startUSD) * progress
 * Clamped strictly to [startUSD, targetPriceUSD].
 * 
 * @param config Active PrelaunchConfig
 * @param currentServerTimeMs Authoritative server time in milliseconds
 */
export function calculatePrelaunchPrice(
  config: PrelaunchConfig,
  currentServerTimeMs: number
): PrelaunchPriceResult {
  const validation = validatePrelaunchConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid Prelaunch Configuration: ${validation.errors.join('; ')}`);
  }

  const serverTimeSec = BigInt(Math.floor(currentServerTimeMs / 1000));
  const durationSec = BigInt(config.durationDays * 86400);

  const startInrScaled = toScaledBigInt(config.startPriceINR);
  const fxScaled = toScaledBigInt(config.lockedInrPerUsd!);
  const targetUsdScaled = toScaledBigInt(config.targetPriceUSD);

  // Exact startUSD = (startPriceINR * SCALE) / lockedInrPerUsd with round-half-up
  const startUsdScaled = (startInrScaled * SCALE + fxScaled / 2n) / fxScaled;
  const priceDeltaScaled = targetUsdScaled - startUsdScaled;

  let elapsedSec = 0n;
  let isStarted = false;
  let isCompleted = false;

  if (config.startTimeUTC) {
    const startTimeSec = BigInt(Math.floor(new Date(config.startTimeUTC).getTime() / 1000));
    if (serverTimeSec >= startTimeSec) {
      isStarted = true;
      const rawElapsed = serverTimeSec - startTimeSec;
      if (rawElapsed >= durationSec) {
        elapsedSec = durationSec;
        isCompleted = true;
      } else {
        elapsedSec = rawElapsed;
      }
    } else {
      // Sale configured for future start
      elapsedSec = 0n;
      isStarted = false;
    }
  }

  let progressRatioScaled = 0n;

  if (durationSec > 0n && elapsedSec > 0n) {
    if (config.updateMode === 'DAILY_STEP') {
      // Daily-step model: step updates once per 24 hours (86,400s)
      const elapsedDays = elapsedSec / 86400n;
      const totalDays = BigInt(config.durationDays);
      const clampedDays = elapsedDays > totalDays ? totalDays : elapsedDays;
      progressRatioScaled = (clampedDays * SCALE) / totalDays;
    } else {
      // CONTINUOUS model
      progressRatioScaled = (elapsedSec * SCALE) / durationSec;
    }
  }

  // Calculate current price in USD
  let currentPriceUsdScaled = startUsdScaled + (priceDeltaScaled * progressRatioScaled) / SCALE;

  // Enforce boundary clamping: never lower than startUSD, never exceeding targetPriceUSD
  if (currentPriceUsdScaled < startUsdScaled) {
    currentPriceUsdScaled = startUsdScaled;
  }
  if (currentPriceUsdScaled > targetUsdScaled || elapsedSec >= durationSec) {
    currentPriceUsdScaled = targetUsdScaled;
  }

  // Derived price in INR = (currentPriceUsdScaled * fxScaled + SCALE / 2n) / SCALE with round-half-up
  const currentPriceInrScaled = (currentPriceUsdScaled * fxScaled + SCALE / 2n) / SCALE;

  // Progress percentage (0.00% to 100.00%)
  const progressPercent = Number((progressRatioScaled * 10000n) / SCALE) / 100;
  const remainingSec = Number(durationSec - elapsedSec);

  return {
    currentServerTimeUTC: new Date(currentServerTimeMs).toISOString(),
    priceUSD: fromScaledBigInt(currentPriceUsdScaled, 8),
    priceINR: fromScaledBigInt(currentPriceInrScaled, 4),
    startPriceUSD: fromScaledBigInt(startUsdScaled, 8),
    targetPriceUSD: fromScaledBigInt(targetUsdScaled, 8),
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    elapsedSeconds: Number(elapsedSec),
    totalDurationSeconds: Number(durationSec),
    remainingSeconds: Math.max(0, remainingSec),
    isStarted,
    isCompleted,
    pricingModel: config.pricingModel,
    updateMode: config.updateMode,
    configVersion: config.version
  };
}
