/**
 * OXENIQ Multi-Currency Fiat Configuration & Registry
 * 
 * Defines the canonical base currency (INR) and evaluated international fiat currencies.
 * Separates structural currency support from payment-provider and legal compliance approvals.
 */

export type FiatCurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export type CurrencyApprovalStatus = 
  | 'CANONICAL_STAGED'               // Canonical baseline (INR) — staged awaiting VDA compliance
  | 'EVALUATING_PROVIDER_APPROVAL'   // Structurally supported in quote engine; pending crypto on-ramp provider
  | 'DISABLED_UNSUPPORTED';          // Not supported or prohibited

export interface FiatCurrencyConfig {
  code: FiatCurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
  isCanonicalBase: boolean;
  approvalStatus: CurrencyApprovalStatus;
  provisionalExchangeRateToInr: number; // 1 Unit of this currency = X INR
  rateSource: string;
  requiresPassportOrInternationalKyc: boolean;
  complianceNotes: string;
}

export const CANONICAL_MIN_PURCHASE_INR = 100_000; // ₹1,00,000 INR (One Lakh Rupees)

export const FIAT_CURRENCY_REGISTRY: Record<FiatCurrencyCode, FiatCurrencyConfig> = {
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimals: 2,
    isCanonicalBase: true,
    approvalStatus: 'CANONICAL_STAGED',
    provisionalExchangeRateToInr: 1.0,
    rateSource: 'Canonical Base Unit',
    requiresPassportOrInternationalKyc: false,
    complianceNotes: 'Requires Indian FIU-IND / PMLA reporting compliance and 1% TDS under Section 194S before live launch.',
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimals: 2,
    isCanonicalBase: false,
    approvalStatus: 'EVALUATING_PROVIDER_APPROVAL',
    provisionalExchangeRateToInr: 84.50, // Reference: 1 USD ≈ 84.50 INR
    rateSource: 'Provisional Staged Forex Reference',
    requiresPassportOrInternationalKyc: true,
    complianceNotes: 'Subject to cross-border crypto on-ramp availability (e.g. Stripe Crypto, MoonPay) and FATF Travel Rule.',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimals: 2,
    isCanonicalBase: false,
    approvalStatus: 'EVALUATING_PROVIDER_APPROVAL',
    provisionalExchangeRateToInr: 91.80, // Reference: 1 EUR ≈ 91.80 INR
    rateSource: 'Provisional Staged Forex Reference',
    requiresPassportOrInternationalKyc: true,
    complianceNotes: 'Subject to EU MiCA regulations for token distribution to EU residents.',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimals: 2,
    isCanonicalBase: false,
    approvalStatus: 'EVALUATING_PROVIDER_APPROVAL',
    provisionalExchangeRateToInr: 107.20, // Reference: 1 GBP ≈ 107.20 INR
    rateSource: 'Provisional Staged Forex Reference',
    requiresPassportOrInternationalKyc: true,
    complianceNotes: 'Subject to UK FCA financial promotion rules and cross-border crypto restrictions.',
  },
};

export const SUPPORTED_FIAT_CURRENCIES: FiatCurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP'];

/**
 * Returns the currency configuration for a given code, or undefined if not registered.
 */
export function getFiatConfig(code: string): FiatCurrencyConfig | undefined {
  if (code in FIAT_CURRENCY_REGISTRY) {
    return FIAT_CURRENCY_REGISTRY[code as FiatCurrencyCode];
  }
  return undefined;
}
