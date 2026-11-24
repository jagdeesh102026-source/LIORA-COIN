/**
 * OXENIQ Allocation Calculation Engine
 * 
 * Provides integer-safe calculation utilities for the 70:30 token allocation models.
 * Operates in 18-decimal base units (wei equivalent) using BigInt to eliminate floating-point error.
 */

export interface AllocationResult {
  buyerAllocation: bigint;
  reserveAllocation: bigint;
  totalTokensDisbursed: bigint;
  model: 'INTERPRETATION_A' | 'INTERPRETATION_B' | 'LEGACY_SPLIT';
  buyerPercentage: number;
  reservePercentage: number;
}

export class AllocationEngine {
  public static readonly DECIMALS = 18n;
  public static readonly ONE_TOKEN = 10n ** 18n;

  /**
   * Interpretation A: Reserve receives 30% of buyer's allocation.
   * Buyer receives 100% of their purchased tokens (buyerTokens).
   * Reserve receives an additional 30% of the buyer's allocation.
   * 
   * Example:
   * Buyer = 700 tokens -> Reserve = 210 tokens (30% of 700) -> Total = 910 tokens
   * 
   * @param buyerTokens Base tokens calculated for the buyer's purchase
   */
  public static calculateInterpretationA(buyerTokens: bigint): AllocationResult {
    if (buyerTokens < 0n) {
      throw new Error("Token amount cannot be negative");
    }
    if (buyerTokens === 0n) {
      return {
        buyerAllocation: 0n,
        reserveAllocation: 0n,
        totalTokensDisbursed: 0n,
        model: 'INTERPRETATION_A',
        buyerPercentage: 76.92,
        reservePercentage: 23.08,
      };
    }

    // Reserve = floor(buyerTokens * 30 / 100)
    const reserveAllocation = (buyerTokens * 30n) / 100n;
    const totalTokensDisbursed = buyerTokens + reserveAllocation;

    return {
      buyerAllocation: buyerTokens,
      reserveAllocation,
      totalTokensDisbursed,
      model: 'INTERPRETATION_A',
      buyerPercentage: Number((buyerTokens * 10000n) / totalTokensDisbursed) / 100,
      reservePercentage: Number((reserveAllocation * 10000n) / totalTokensDisbursed) / 100,
    };
  }

  /**
   * Interpretation B: Buyer receives 70% of the combined allocation.
   * If customer purchases Q tokens, that amount represents 70% of the combined distribution.
   * Total = ceil(buyerTokens * 100 / 70)
   * Reserve = Total - Buyer
   * 
   * Example:
   * Buyer = 700 tokens -> Reserve = 300 tokens -> Total = 1,000 tokens
   * 
   * @param buyerTokens Desired token allocation for the buyer
   */
  public static calculateInterpretationB(buyerTokens: bigint): AllocationResult {
    if (buyerTokens < 0n) {
      throw new Error("Token amount cannot be negative");
    }
    if (buyerTokens === 0n) {
      return {
        buyerAllocation: 0n,
        reserveAllocation: 0n,
        totalTokensDisbursed: 0n,
        model: 'INTERPRETATION_B',
        buyerPercentage: 70.0,
        reservePercentage: 30.0,
      };
    }

    // Ceil division: (numerator + denominator - 1) / denominator
    const totalTokensDisbursed = (buyerTokens * 100n + 69n) / 70n;
    const reserveAllocation = totalTokensDisbursed - buyerTokens;

    return {
      buyerAllocation: buyerTokens,
      reserveAllocation,
      totalTokensDisbursed,
      model: 'INTERPRETATION_B',
      buyerPercentage: Number((buyerTokens * 10000n) / totalTokensDisbursed) / 100,
      reservePercentage: Number((reserveAllocation * 10000n) / totalTokensDisbursed) / 100,
    };
  }

  /**
   * Legacy Split Model (as in AllocationManager.sol):
   * A fixed total quantity is split 70% to primary recipient and 30% remainder to secondary recipient.
   * Share70 = floor(amount * 70 / 100)
   * Share30 = amount - Share70
   * 
   * @param totalAmount Total tokens to divide
   */
  public static calculateLegacySplit(totalAmount: bigint): { share70: bigint; share30: bigint } {
    if (totalAmount < 0n) {
      throw new Error("Amount cannot be negative");
    }
    if (totalAmount === 0n) {
      return { share70: 0n, share30: 0n };
    }
    const share70 = (totalAmount * 70n) / 100n;
    const share30 = totalAmount - share70;
    return { share70, share30 };
  }

  /**
   * Formats a bigint token quantity to a human-readable decimal string with up to maxDecimals.
   */
  public static formatTokens(amount: bigint, maxDecimals: number = 4): string {
    const isNegative = amount < 0n;
    const absVal = isNegative ? -amount : amount;

    const integerPart = absVal / AllocationEngine.ONE_TOKEN;
    const fractionalPart = absVal % AllocationEngine.ONE_TOKEN;

    if (fractionalPart === 0n || maxDecimals === 0) {
      return `${isNegative ? '-' : ''}${integerPart.toString()}`;
    }

    // Pad fractional part to 18 digits
    let fracStr = fractionalPart.toString().padStart(18, '0');
    // Truncate to maxDecimals
    fracStr = fracStr.slice(0, maxDecimals);
    // Remove trailing zeros
    fracStr = fracStr.replace(/0+$/, '');

    return fracStr.length > 0 
      ? `${isNegative ? '-' : ''}${integerPart.toString()}.${fracStr}`
      : `${isNegative ? '-' : ''}${integerPart.toString()}`;
  }

  /**
   * Parses a human-readable decimal string into 18-decimal base units (bigint).
   */
  public static parseTokens(input: string): bigint {
    const clean = input.trim();
    if (!/^\d+(\.\d+)?$/.test(clean)) {
      throw new Error(`Invalid token decimal format: "${input}"`);
    }

    const [integerPart, rawFractionalPart = ''] = clean.split('.');
    const fractionalPadded = rawFractionalPart.slice(0, 18).padEnd(18, '0');

    return BigInt(integerPart) * AllocationEngine.ONE_TOKEN + BigInt(fractionalPadded);
  }
}
