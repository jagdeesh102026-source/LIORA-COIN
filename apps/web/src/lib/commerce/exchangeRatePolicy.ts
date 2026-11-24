/**
 * OXENIQ Exchange Rate & Multi-Currency Minimum Purchase Policy
 * 
 * Enforces the canonical ₹1,00,000 INR minimum purchase requirement, computes strict
 * non-sub-minimum foreign currency equivalents (USD, EUR, GBP), manages quote validity TTL,
 * and defends against stale or arbitrary fiat conversion rates.
 */

import { 
  FiatCurrencyCode, 
  CANONICAL_MIN_PURCHASE_INR, 
  FIAT_CURRENCY_REGISTRY,
  getFiatConfig 
} from './fiatCurrencies';

export interface ExchangeRateQuote {
  quoteId: string;
  currency: FiatCurrencyCode;
  currencySymbol: string;
  rateToInr: number;            // How many INR per 1 unit of this currency (e.g., 84.50 for USD, 1.0 for INR)
  rateSource: string;           // e.g., "FBIL / RBI Reference Rate", "Provisional Staged Forex Reference"
  fetchedAt: number;            // Unix timestamp (ms)
  expiresAt: number;            // Unix timestamp (ms)
  canonicalMinOrderInr: number; // Always 100,000 INR
  minOrderInCurrency: number;   // Equivalent minimum in selected currency (ceil to 2 decimals)
  isStale: boolean;
  approvalStatus: string;
}

export interface QuoteValidationResult {
  isValid: boolean;
  errorCode?: 'BELOW_MINIMUM' | 'QUOTE_EXPIRED' | 'STALE_ORACLE_RATE' | 'INVALID_AMOUNT' | 'UNSUPPORTED_CURRENCY';
  errorMessage?: string;
  inrEquivalent?: number;
  calculatedTokens?: bigint;
}

export class ExchangeRatePolicy {
  public static readonly CANONICAL_MIN_INR = CANONICAL_MIN_PURCHASE_INR; // 100,000 INR
  public static readonly DEFAULT_QUOTE_TTL_MS = 15 * 60 * 1000;         // 15 Minutes
  public static readonly MAX_ORACLE_AGE_MS = 60 * 60 * 1000;            // 60 Minutes

  /**
   * Calculates the minimum order in a foreign currency such that its conversion to INR
   * meets or strictly exceeds the canonical ₹1,00,000 INR requirement after ceiling rounding.
   */
  public static calculateCeilingMinimum(rateToInr: number): number {
    if (rateToInr <= 0 || !isFinite(rateToInr)) {
      throw new Error(`Invalid exchange rate to INR: ${rateToInr}`);
    }
    // Ceil to 2 decimal places (cents/pence) so that minOrder * rateToInr >= 100,000
    return Math.ceil((ExchangeRatePolicy.CANONICAL_MIN_INR / rateToInr) * 100) / 100;
  }

  /**
   * Generates a validated exchange-rate quote for the specified fiat currency.
   */
  public static createQuote(
    currency: FiatCurrencyCode = 'INR',
    customRateToInr?: number,
    rateSource: string = 'Authorized Central Bank / Forex Reference',
    currentTimeMs: number = Date.now(),
    ttlMs: number = ExchangeRatePolicy.DEFAULT_QUOTE_TTL_MS
  ): ExchangeRateQuote {
    const config = getFiatConfig(currency);
    if (!config) {
      throw new Error(`Unsupported currency code: ${currency}`);
    }

    const rateToInr = customRateToInr !== undefined && customRateToInr > 0
      ? customRateToInr
      : config.provisionalExchangeRateToInr;

    if (rateToInr <= 0 || !isFinite(rateToInr)) {
      throw new Error(`Invalid exchange rate: ${rateToInr}`);
    }

    const minOrderInCurrency = currency === 'INR'
      ? ExchangeRatePolicy.CANONICAL_MIN_INR
      : ExchangeRatePolicy.calculateCeilingMinimum(rateToInr);

    return {
      quoteId: `quote_${currency}_${currentTimeMs}_${Math.random().toString(36).substring(2, 9)}`,
      currency,
      currencySymbol: config.symbol,
      rateToInr,
      rateSource: rateSource || config.rateSource,
      fetchedAt: currentTimeMs,
      expiresAt: currentTimeMs + ttlMs,
      canonicalMinOrderInr: ExchangeRatePolicy.CANONICAL_MIN_INR,
      minOrderInCurrency,
      isStale: false,
      approvalStatus: config.approvalStatus,
    };
  }

  /**
   * Validates whether a purchase amount in the specified fiat currency satisfies the
   * canonical ₹1,00,000 INR requirement and quote validity constraints.
   */
  public static validatePurchase(
    amount: number,
    quote: ExchangeRateQuote,
    currentTimeMs: number = Date.now()
  ): QuoteValidationResult {
    if (amount <= 0 || !isFinite(amount)) {
      return {
        isValid: false,
        errorCode: 'INVALID_AMOUNT',
        errorMessage: 'Purchase amount must be a positive number.',
      };
    }

    // Verify quote currency is supported
    if (!FIAT_CURRENCY_REGISTRY[quote.currency]) {
      return {
        isValid: false,
        errorCode: 'UNSUPPORTED_CURRENCY',
        errorMessage: `Currency ${quote.currency} is not currently supported for token purchases.`,
      };
    }

    // Check if the quote has expired
    if (currentTimeMs > quote.expiresAt) {
      return {
        isValid: false,
        errorCode: 'QUOTE_EXPIRED',
        errorMessage: 'The exchange rate quote has expired. Please refresh the quote to proceed.',
      };
    }

    // Check if the oracle rate itself is too old (stale)
    if (currentTimeMs - quote.fetchedAt > ExchangeRatePolicy.MAX_ORACLE_AGE_MS || quote.isStale) {
      return {
        isValid: false,
        errorCode: 'STALE_ORACLE_RATE',
        errorMessage: 'The exchange rate data is stale or unavailable. Live purchases are temporarily disabled.',
      };
    }

    // Calculate exact INR equivalent using safe integer arithmetic (in paise)
    // to eliminate floating-point precision inaccuracies
    const amountInCentsOrPaise = Math.round(amount * 100);
    const rateInScale = Math.round(quote.rateToInr * 10000); // 4 decimal precision
    const inrEquivalent = (amountInCentsOrPaise * rateInScale) / 1000000;

    // Check against the minimum requirement
    // In INR, must be at least 100,000. In foreign currency, must meet minOrderInCurrency
    if (amount < quote.minOrderInCurrency || inrEquivalent < (ExchangeRatePolicy.CANONICAL_MIN_INR - 0.001)) {
      const formattedAmount = `${quote.currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const formattedMin = `${quote.currencySymbol}${quote.minOrderInCurrency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return {
        isValid: false,
        errorCode: 'BELOW_MINIMUM',
        errorMessage: `Order amount (${formattedAmount}) is below the required minimum of ${formattedMin} (₹${ExchangeRatePolicy.CANONICAL_MIN_INR.toLocaleString('en-IN')} INR equivalent).`,
        inrEquivalent,
      };
    }

    return { 
      isValid: true,
      inrEquivalent,
    };
  }

  /**
   * Converts a given amount in the quote currency to its exact INR equivalent.
   */
  public static convertToInr(amount: number, quote: ExchangeRateQuote): number {
    if (amount <= 0 || quote.rateToInr <= 0) return 0;
    return Number((amount * quote.rateToInr).toFixed(2));
  }
}
