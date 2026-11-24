/**
 * LIORA COIN — Proportional Token Allocation Engine (Sprint 3B)
 *
 * Implements the authoritative management requirements from:
 * `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`
 *
 * CORE FORMULA:
 * Allocated LIORA = Fixed Plan Allocation Value ÷ Applicable LIORA Allocation Price
 *
 * INVARIANTS:
 * 1. Fixed Plan Allocation Value: Fixed contractual settlement amount per plan (e.g. ₹1,25,000 for Plan 01).
 * 2. Decimal-Safe 18-Decimal Arithmetic: Uses BigInt base units (10^18 wei); strictly avoids JS floating-point.
 * 3. Deterministic Rounding: Integer floor division with exact rounding remainder recorded in wei.
 * 4. Input Validation: Strictly rejects zero, negative, missing, or malformed prices and allocation values.
 * 5. Fixed Collateral Preservation: Once calculated and finalized, collateral quantity is stored permanently
 *    and cannot be modified by subsequent reference-price or DEX-price movements.
 * 6. Testable Calculation Service: Implemented as a pure calculation and evaluation service, not an executable sale.
 */

export interface ConfirmedPlanConfig {
  planId: 'TIER_01' | 'TIER_02' | 'TIER_03' | 'TIER_04' | 'TIER_05' | 'TIER_06';
  tierNumber: string; // '01' through '06'
  displayName: string;
  principalINR: number;
  principalUSD: number;
  multiplierFactor: number;
  contractualAllocationINR: number;
  contractualAllocationUSD: number;
  lockDurationMonths: number;
  settlementPayoutMonth: number;
  isRecommended: boolean;
  description: string;
}

/**
 * The Six Confirmed Investment Plans from Checklist (3)
 */
export const CONFIRMED_INVESTMENT_PLANS: Record<string, ConfirmedPlanConfig> = {
  TIER_01: {
    planId: 'TIER_01',
    tierNumber: '01',
    displayName: 'Tier 01 (Starter)',
    principalINR: 50000,
    principalUSD: 500,
    multiplierFactor: 2.5,
    contractualAllocationINR: 125000,
    contractualAllocationUSD: 1250,
    lockDurationMonths: 3,
    settlementPayoutMonth: 4,
    isRecommended: false,
    description: 'Tier 01: ₹50,000 investment ($500), 2.5× factor, ₹1,25,000 contractual settlement in Month 4.',
  },
  TIER_02: {
    planId: 'TIER_02',
    tierNumber: '02',
    displayName: 'Tier 02 (Basic)',
    principalINR: 100000,
    principalUSD: 1000,
    multiplierFactor: 6.0,
    contractualAllocationINR: 600000,
    contractualAllocationUSD: 6000,
    lockDurationMonths: 3,
    settlementPayoutMonth: 4,
    isRecommended: true,
    description: 'Tier 02: ₹1,00,000 investment ($1,000), 6.0× factor, ₹6,00,000 contractual settlement in Month 4. (Recommended)',
  },
  TIER_03: {
    planId: 'TIER_03',
    tierNumber: '03',
    displayName: 'Tier 03 (Standard)',
    principalINR: 200000,
    principalUSD: 2000,
    multiplierFactor: 5.0,
    contractualAllocationINR: 1000000,
    contractualAllocationUSD: 10000,
    lockDurationMonths: 3,
    settlementPayoutMonth: 4,
    isRecommended: false,
    description: 'Tier 03: ₹2,00,000 investment ($2,000), 5.0× factor, ₹10,00,000 contractual settlement in Month 4.',
  },
  TIER_04: {
    planId: 'TIER_04',
    tierNumber: '04',
    displayName: 'Tier 04 (Advanced)',
    principalINR: 300000,
    principalUSD: 3000,
    multiplierFactor: 8.0,
    contractualAllocationINR: 2400000,
    contractualAllocationUSD: 24000,
    lockDurationMonths: 9,
    settlementPayoutMonth: 10,
    isRecommended: true,
    description: 'Tier 04: ₹3,00,000 investment ($3,000), 8.0× factor, ₹24,00,000 contractual settlement in Month 10. (Recommended)',
  },
  TIER_05: {
    planId: 'TIER_05',
    tierNumber: '05',
    displayName: 'Tier 05 (Premium)',
    principalINR: 500000,
    principalUSD: 5000,
    multiplierFactor: 6.0,
    contractualAllocationINR: 3000000,
    contractualAllocationUSD: 30000,
    lockDurationMonths: 12,
    settlementPayoutMonth: 13,
    isRecommended: false,
    description: 'Tier 05: ₹5,00,000 investment ($5,000), 6.0× factor, ₹30,00,000 contractual settlement in Month 13.',
  },
  TIER_06: {
    planId: 'TIER_06',
    tierNumber: '06',
    displayName: 'Tier 06 (Elite)',
    principalINR: 1000000,
    principalUSD: 10000,
    multiplierFactor: 9.0,
    contractualAllocationINR: 9000000,
    contractualAllocationUSD: 90000,
    lockDurationMonths: 12,
    settlementPayoutMonth: 13,
    isRecommended: true,
    description: 'Tier 06: ₹10,00,000 investment ($10,000), 9.0× factor, ₹90,00,000 contractual settlement in Month 13. (Recommended)',
  },
};

export interface ProportionalAllocationQuote {
  planId: string;
  tierNumber: string;
  displayName: string;
  principalINR: number;
  contractualAllocationINR: number;
  lockDurationMonths: number;
  settlementPayoutMonth: number;
  allocationPriceINR: string; // Formatted price string (e.g. "0.20")
  allocationPriceWei: string; // Scaled 10^18 BigInt string
  allocatedTokensBaseUnits: string; // Exact 18-decimal BigInt string
  allocatedTokensFormatted: string; // Human readable decimal string (e.g. "625000")
  allocatedTokensNumber: number; // Approximate JS float for UI badges
  roundingRemainderWei: string; // Remainder in 10^-18 atomic units
  roundingMode: 'FLOOR_WITH_REMAINDER';
  calculatedAt: number;
  disclaimer: string;
}

export interface FinalizedCollateralRecord {
  recordId: string;
  investorAddress: string;
  planId: string;
  principalINR: number;
  contractualSettlementINR: number;
  finalizedAllocationPriceINR: string;
  finalizedCollateralQuantityBaseUnits: string;
  finalizedCollateralQuantityFormatted: string;
  roundingRemainderWei: string;
  finalizedAt: number;
  isImmutable: true;
}

/**
 * Parses numeric price string or number into scaled 18-decimal BigInt.
 * Strictly rejects negative, zero, NaN, empty, or invalid formats.
 */
export function parseDecimalToBigInt(val: string | number, decimals: number = 18): bigint {
  if (val === null || val === undefined) {
    throw new Error('PRICE_MISSING: Price value cannot be null or undefined.');
  }

  const str = typeof val === 'number' ? val.toString() : String(val).trim();
  if (!str) {
    throw new Error('PRICE_EMPTY: Price string cannot be empty.');
  }

  // Reject non-numeric
  if (!/^[0-9]+(\.[0-9]+)?$/.test(str)) {
    throw new Error(`INVALID_PRICE_FORMAT: "${str}" is not a valid positive decimal price.`);
  }

  const [intPart, fracPart = ''] = str.split('.');
  if (fracPart.length > decimals) {
    throw new Error(`EXCESS_DECIMALS: Price has ${fracPart.length} decimal places, exceeding maximum ${decimals}.`);
  }

  const paddedFrac = fracPart.padEnd(decimals, '0');
  const result = BigInt(intPart) * (10n ** BigInt(decimals)) + BigInt(paddedFrac);

  if (result === 0n) {
    throw new Error('PRICE_ZERO: Price must be strictly greater than zero.');
  }

  return result;
}

/**
 * Converts BigInt base units (18 decimals) into a clean decimal string.
 */
export function formatBaseUnitsToDecimal(baseUnits: bigint, decimals: number = 18): string {
  const isNeg = baseUnits < 0n;
  const abs = isNeg ? -baseUnits : baseUnits;
  const divisor = 10n ** BigInt(decimals);
  const intPart = abs / divisor;
  const fracPart = abs % divisor;

  if (fracPart === 0n) {
    return `${isNeg ? '-' : ''}${intPart.toString()}`;
  }

  const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${isNeg ? '-' : ''}${intPart.toString()}.${fracStr}`;
}

export class ProportionalAllocationEngine {
  public static readonly TOKEN_DECIMALS = 18;
  public static readonly WEI_PER_TOKEN = 10n ** 18n;

  /**
   * Calculates proportional token allocation for an approved investment plan.
   *
   * Formula:
   * Allocated LIORA (tokens) = Contractual Allocation INR ÷ Price INR
   *
   * Scaled base unit arithmetic (18 decimals):
   * Numerator = Contractual Allocation (INR) * 10^18 * 10^18
   * Denominator = Price (INR scaled to 10^18)
   * Result (wei) = Numerator / Denominator
   */
  public static calculateAllocation(
    planOrId: ConfirmedPlanConfig | string,
    allocationPriceINR: string | number
  ): ProportionalAllocationQuote {
    const plan: ConfirmedPlanConfig =
      typeof planOrId === 'string'
        ? CONFIRMED_INVESTMENT_PLANS[planOrId]
        : planOrId;

    if (!plan) {
      throw new Error(`UNKNOWN_PLAN: Investment plan "${planOrId}" is not recognized.`);
    }

    if (plan.contractualAllocationINR <= 0) {
      throw new Error(`INVALID_ALLOCATION_VALUE: Plan contractual allocation must be positive.`);
    }

    // Parse price with strict decimal safety
    const priceWei = parseDecimalToBigInt(allocationPriceINR, this.TOKEN_DECIMALS);
    const priceStr = typeof allocationPriceINR === 'number' ? allocationPriceINR.toString() : String(allocationPriceINR).trim();

    // Scale numerator by 10^36 so division by priceWei (10^18) yields exact token wei (10^18)
    const allocationINRBigInt = BigInt(plan.contractualAllocationINR);
    const numerator = allocationINRBigInt * this.WEI_PER_TOKEN * this.WEI_PER_TOKEN;

    const allocatedTokensBaseUnits = numerator / priceWei;
    const roundingRemainderWei = numerator % priceWei;

    const formattedTokens = formatBaseUnitsToDecimal(allocatedTokensBaseUnits, this.TOKEN_DECIMALS);
    const approximateTokensNumber = parseFloat(formattedTokens);

    return {
      planId: plan.planId,
      tierNumber: plan.tierNumber,
      displayName: plan.displayName,
      principalINR: plan.principalINR,
      contractualAllocationINR: plan.contractualAllocationINR,
      lockDurationMonths: plan.lockDurationMonths,
      settlementPayoutMonth: plan.settlementPayoutMonth,
      allocationPriceINR: priceStr,
      allocationPriceWei: priceWei.toString(),
      allocatedTokensBaseUnits: allocatedTokensBaseUnits.toString(),
      allocatedTokensFormatted: formattedTokens,
      allocatedTokensNumber: approximateTokensNumber,
      roundingRemainderWei: roundingRemainderWei.toString(),
      roundingMode: 'FLOOR_WITH_REMAINDER',
      calculatedAt: Date.now(),
      disclaimer:
        'Proportional allocation quantity calculated based on approved plan settlement value. ' +
        'Tokens serve as fixed upfront collateral; contractual settlement is manually paid in cash after lock-in.',
    };
  }

  /**
   * Finalizes and freezes the collateral allocation into an immutable record.
   * Once finalized, subsequent reference price or market price changes CANNOT alter the quantity.
   */
  public static finalizeCollateral(
    quote: ProportionalAllocationQuote,
    investorAddress: string,
    recordId?: string
  ): FinalizedCollateralRecord {
    if (!investorAddress || !investorAddress.startsWith('0x') || investorAddress.length < 10) {
      throw new Error('INVALID_INVESTOR_ADDRESS: A valid Ethereum/BSC address is required.');
    }

    return Object.freeze({
      recordId: recordId || `COLLATERAL-${Date.now()}-${quote.planId}`,
      investorAddress: investorAddress.toLowerCase(),
      planId: quote.planId,
      principalINR: quote.principalINR,
      contractualSettlementINR: quote.contractualAllocationINR,
      finalizedAllocationPriceINR: quote.allocationPriceINR,
      finalizedCollateralQuantityBaseUnits: quote.allocatedTokensBaseUnits,
      finalizedCollateralQuantityFormatted: quote.allocatedTokensFormatted,
      roundingRemainderWei: quote.roundingRemainderWei,
      finalizedAt: Date.now(),
      isImmutable: true,
    });
  }

  /**
   * Validates whether a returned collateral token amount strictly matches the original allocation.
   */
  public static verifyCollateralReturnQuantity(
    finalizedRecord: FinalizedCollateralRecord,
    returnedTokensBaseUnits: string | bigint
  ): { isValid: boolean; expected: string; received: string; differenceWei: string } {
    const expected = BigInt(finalizedRecord.finalizedCollateralQuantityBaseUnits);
    const received = typeof returnedTokensBaseUnits === 'bigint'
      ? returnedTokensBaseUnits
      : BigInt(returnedTokensBaseUnits);

    const diff = received - expected;

    return {
      isValid: diff === 0n,
      expected: expected.toString(),
      received: received.toString(),
      differenceWei: diff.toString(),
    };
  }

  /**
   * Verifies an incoming returned collateral token quantity against expected atomic base units.
   * Strictly avoids JavaScript floating-point arithmetic.
   *
   * Accepts:
   * - BigInt atomic base units (e.g. 625000000000000000000000n)
   * - String representation of atomic base units (e.g. "625000000000000000000000")
   * - String representation of formatted token units (e.g. "625000" or "4166.666666666666666666")
   * - Number formatted token units (e.g. 625000)
   */
  public static verifyExactCollateralReturn(
    expectedBaseUnits: string | bigint,
    received: string | number | bigint
  ): {
    isValid: boolean;
    expectedBaseUnits: string;
    receivedBaseUnits: string;
    differenceWei: string;
    error?: string;
  } {
    const expected = typeof expectedBaseUnits === 'bigint' ? expectedBaseUnits : BigInt(expectedBaseUnits);
    let receivedBaseUnits: bigint;

    try {
      if (typeof received === 'bigint') {
        receivedBaseUnits = received;
      } else if (typeof received === 'number') {
        if (!isFinite(received) || received < 0) {
          throw new Error('INVALID_TOKEN_AMOUNT: Returned token quantity must be a finite non-negative number.');
        }
        receivedBaseUnits = parseDecimalToBigInt(received.toString(), this.TOKEN_DECIMALS);
      } else if (typeof received === 'string') {
        const str = received.trim();
        if (!str) {
          throw new Error('EMPTY_TOKEN_AMOUNT: Returned token quantity string cannot be empty.');
        }
        if (str === expected.toString()) {
          receivedBaseUnits = expected;
        } else if (str.includes('.')) {
          receivedBaseUnits = parseDecimalToBigInt(str, this.TOKEN_DECIMALS);
        } else {
          // Whole number string without decimal point
          const asBigInt = BigInt(str);
          if (asBigInt === expected) {
            receivedBaseUnits = asBigInt;
          } else if (asBigInt * this.WEI_PER_TOKEN === expected) {
            receivedBaseUnits = asBigInt * this.WEI_PER_TOKEN;
          } else if (str.length >= expected.toString().length - 2) {
            // High magnitude integer: treat as atomic base units
            receivedBaseUnits = asBigInt;
          } else {
            // Low magnitude integer: treat as whole tokens
            receivedBaseUnits = asBigInt * this.WEI_PER_TOKEN;
          }
        }
      } else {
        throw new Error('UNSUPPORTED_TOKEN_TYPE: Unsupported token input type.');
      }
    } catch (err: any) {
      return {
        isValid: false,
        expectedBaseUnits: expected.toString(),
        receivedBaseUnits: '0',
        differenceWei: expected.toString(),
        error: err.message,
      };
    }

    const diff = receivedBaseUnits - expected;

    return {
      isValid: diff === 0n,
      expectedBaseUnits: expected.toString(),
      receivedBaseUnits: receivedBaseUnits.toString(),
      differenceWei: diff.toString(),
    };
  }

  /**
   * Returns all 6 confirmed plans.
   */
  public static getAllPlans(): ConfirmedPlanConfig[] {
    return Object.values(CONFIRMED_INVESTMENT_PLANS);
  }

  /**
   * Helper to fetch a plan by ID.
   */
  public static getPlan(planId: string): ConfirmedPlanConfig | undefined {
    return CONFIRMED_INVESTMENT_PLANS[planId];
  }
}
