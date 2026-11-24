/**
 * LIORA COIN — Four-Tier Investment-Plan Data Model & Liability Evaluation
 *
 * Models the proposed business-plan investment categories and lock-in periods:
 * - Categories: Starter, Basic, Premium, Elite
 * - Durations: 3, 6, 9, and 12 calendar months
 *
 * ARCHITECTURAL DIRECTIVE:
 * - Distinguishes between paper nominal liabilities and actual available settlement funds.
 * - Flags legal and technical conflicts with non-custodial token ownership.
 * - Enforces simulation guards: NO token confiscation, NO hidden balance reductions,
 *   NO guaranteed redemption, and NO automated financial payouts.
 */

import { addCalendarMonthsUTC } from '../prelaunch/lockingPolicy';

export type InvestmentCategory = 'STARTER' | 'BASIC' | 'PREMIUM' | 'ELITE';
export type LockDurationMonths = 3 | 6 | 9 | 12;

export interface InvestmentCategoryConfig {
  category: InvestmentCategory;
  displayName: string;
  lockMonths: LockDurationMonths;
  minAmountUSD: number;
  maxAmountUSD: number | null; // null represents infinity / no upper ceiling
  proposedInvestorSharePercent: number; // e.g. 70%
  proposedCompanySharePercent: number; // e.g. 30%
  description: string;
}

export const INVESTMENT_CATEGORIES: Record<InvestmentCategory, InvestmentCategoryConfig> = {
  STARTER: {
    category: 'STARTER',
    displayName: 'Starter Plan',
    lockMonths: 3,
    minAmountUSD: 100,
    maxAmountUSD: 999.99,
    proposedInvestorSharePercent: 70,
    proposedCompanySharePercent: 30,
    description: 'Entry allocation tier with a 3-calendar-month lock-in period.',
  },
  BASIC: {
    category: 'BASIC',
    displayName: 'Basic Plan',
    lockMonths: 6,
    minAmountUSD: 1000,
    maxAmountUSD: 4999.99,
    proposedInvestorSharePercent: 70,
    proposedCompanySharePercent: 30,
    description: 'Intermediate allocation tier with a 6-calendar-month lock-in period.',
  },
  PREMIUM: {
    category: 'PREMIUM',
    displayName: 'Premium Plan',
    lockMonths: 9,
    minAmountUSD: 5000,
    maxAmountUSD: 9999.99,
    proposedInvestorSharePercent: 70,
    proposedCompanySharePercent: 30,
    description: 'Advanced allocation tier with a 9-calendar-month lock-in period.',
  },
  ELITE: {
    category: 'ELITE',
    displayName: 'Elite Plan',
    lockMonths: 12,
    minAmountUSD: 10000,
    maxAmountUSD: null,
    proposedInvestorSharePercent: 70,
    proposedCompanySharePercent: 30,
    description: 'Institutional allocation tier with a 12-calendar-month lock-in period.',
  },
};

/**
 * Confirmed Business Proposal Parameters (Gate C4C)
 * - Starter: ₹50,000, 5× multiplier, 3-month lock
 * - Basic: ₹1,00,000, 10× multiplier, 6-month lock
 * - Premium: ₹2,00,000, 20× multiplier, 9-month lock
 * - Elite: ₹3,00,000, 30× multiplier, 12-month lock
 * - Divides each multiplied amount 50:50 between investor and company.
 * - These figures are proposed contractual calculations, not guaranteed market profits.
 */
export interface ConfirmedBusinessProposalTier {
  category: InvestmentCategory;
  displayName: string;
  principalINR: number;
  multiplierFactor: number;
  lockMonths: LockDurationMonths;
  grossMultipliedAmountINR: number;
  investorShareINR: number; // 50%
  companyShareINR: number; // 50%
  proposedSplitPercent: number; // 50%
  description: string;
}

export const CONFIRMED_BUSINESS_PROPOSAL_TIERS: Record<InvestmentCategory, ConfirmedBusinessProposalTier> = {
  STARTER: {
    category: 'STARTER',
    displayName: 'Starter Plan',
    principalINR: 50000,
    multiplierFactor: 5,
    lockMonths: 3,
    grossMultipliedAmountINR: 250000,
    investorShareINR: 125000,
    companyShareINR: 125000,
    proposedSplitPercent: 50,
    description: 'Starter tier: ₹50,000 principal, 5× multiplier, 3-month lock, 50:50 contractual split.',
  },
  BASIC: {
    category: 'BASIC',
    displayName: 'Basic Plan',
    principalINR: 100000,
    multiplierFactor: 10,
    lockMonths: 6,
    grossMultipliedAmountINR: 1000000,
    investorShareINR: 500000,
    companyShareINR: 500000,
    proposedSplitPercent: 50,
    description: 'Basic tier: ₹1,00,000 principal, 10× multiplier, 6-month lock, 50:50 contractual split.',
  },
  PREMIUM: {
    category: 'PREMIUM',
    displayName: 'Premium Plan',
    principalINR: 200000,
    multiplierFactor: 20,
    lockMonths: 9,
    grossMultipliedAmountINR: 4000000,
    investorShareINR: 2000000,
    companyShareINR: 2000000,
    proposedSplitPercent: 50,
    description: 'Premium tier: ₹2,00,000 principal, 20× multiplier, 9-month lock, 50:50 contractual split.',
  },
  ELITE: {
    category: 'ELITE',
    displayName: 'Elite Plan',
    principalINR: 300000,
    multiplierFactor: 30,
    lockMonths: 12,
    grossMultipliedAmountINR: 9000000,
    investorShareINR: 4500000,
    companyShareINR: 4500000,
    proposedSplitPercent: 50,
    description: 'Elite tier: ₹3,00,000 principal, 30× multiplier, 12-month lock, 50:50 contractual split.',
  },
};

export interface ConfirmedProposalEvaluationResult {
  category: InvestmentCategory;
  displayName: string;
  principalINR: number;
  principalUSD: number;
  multiplierFactor: number;
  lockMonths: LockDurationMonths;
  startDateUTC: string;
  maturityDateUTC: string;
  isMature: boolean;
  grossMultipliedAmountINR: number;
  grossMultipliedAmountUSD: number;
  investorShareINR: number;
  investorShareUSD: number;
  companyShareINR: number;
  companyShareUSD: number;
  actualAvailableSettlementFundsUSD: number;
  settlementShortfallUSD: number;
  coverageRatioPercent: number;
  isFullyFunded: boolean;
  payoutStatus: 'UNAPPROVED_PROPOSAL_THEORETICAL_ONLY';
  conflicts: string[];
}

export interface PlanEvaluationParams {
  category: InvestmentCategory;
  principalUSD: number;
  entryPriceINR?: number; // default ₹0.20
  terminalPriceINR?: number; // default ₹30.00
  lockedFxRate?: number; // default 86.50 INR per USD
  startDate?: Date | string;
  actualSettlementPoolUSD?: number; // e.g. $1,000 liquidity budget
}

export interface PlanEvaluationResult {
  category: InvestmentCategory;
  displayName: string;
  lockMonths: LockDurationMonths;
  startDateUTC: string;
  maturityDateUTC: string;
  isMature: boolean;
  
  // Principal & Tokens
  investorPrincipalUSD: number;
  investorPrincipalINR: number;
  entryPriceUSD: number;
  tokensAllocated: number;
  
  // Projected Gross Valuation (Theoretical)
  terminalPriceUSD: number;
  grossMultipliedAmountUSD: number;
  grossMultipliedAmountINR: number;
  growthMultiplier: number;
  
  // Profit & Proposed Share Breakdown
  grossProfitUSD: number;
  proposedInvestorSharePercent: number;
  proposedCompanySharePercent: number;
  investorShareUSD: number;
  companyShareUSD: number;
  
  // Liquidity Feasibility & Settlement Reality Check
  actualAvailableSettlementFundsUSD: number;
  settlementShortfallUSD: number;
  coverageRatioPercent: number;
  isFullyFunded: boolean;
  
  // Non-Custodial Ownership & Governance Status
  investorTokenOwnership: 'NON_CUSTODIAL_WALLET' | 'LOCKED_TIMELOCK_CONTRACT';
  payoutStatus: 'UNAPPROVED_PROPOSAL_THEORETICAL_ONLY';
  conflicts: string[];
}

export class InvestmentPlanModel {
  public static readonly DEFAULT_ENTRY_PRICE_INR = 0.20;
  public static readonly DEFAULT_TERMINAL_PRICE_INR = 30.00;
  public static readonly DEFAULT_FX_RATE = 86.50;

  /**
   * Identifies the appropriate category for a given investment principal.
   */
  public static getCategoryForAmount(amountUSD: number): InvestmentCategoryConfig {
    if (amountUSD < 100) {
      throw new Error(`BELOW_MINIMUM_ALLOCATION: Minimum investment is $100 USD. Received: $${amountUSD}`);
    }

    const configs = Object.values(INVESTMENT_CATEGORIES);
    for (const cfg of configs) {
      const withinMin = amountUSD >= cfg.minAmountUSD;
      const withinMax = cfg.maxAmountUSD === null || amountUSD <= cfg.maxAmountUSD;
      if (withinMin && withinMax) {
        return cfg;
      }
    }

    // Default to ELITE for high amounts
    return INVESTMENT_CATEGORIES.ELITE;
  }

  /**
   * Models the investment plan calculations while rigorously isolating theoretical returns
   * from actual available settlement liquidity.
   */
  public static evaluatePlan(params: PlanEvaluationParams): PlanEvaluationResult {
    const config = INVESTMENT_CATEGORIES[params.category];
    if (!config) {
      throw new Error(`INVALID_CATEGORY: Unknown investment category: ${params.category}`);
    }

    const principalUSD = params.principalUSD;
    if (principalUSD < config.minAmountUSD) {
      throw new Error(`AMOUNT_TOO_LOW: ${config.displayName} requires minimum $${config.minAmountUSD}. Received: $${principalUSD}`);
    }
    if (config.maxAmountUSD !== null && principalUSD > config.maxAmountUSD) {
      throw new Error(`AMOUNT_TOO_HIGH: ${config.displayName} maximum is $${config.maxAmountUSD}. Received: $${principalUSD}`);
    }

    const entryPriceINR = params.entryPriceINR ?? InvestmentPlanModel.DEFAULT_ENTRY_PRICE_INR;
    const terminalPriceINR = params.terminalPriceINR ?? InvestmentPlanModel.DEFAULT_TERMINAL_PRICE_INR;
    const lockedFxRate = params.lockedFxRate ?? InvestmentPlanModel.DEFAULT_FX_RATE;
    const actualSettlementPoolUSD = params.actualSettlementPoolUSD ?? 1000.0;

    // Dates
    const startDate = params.startDate ? new Date(params.startDate) : new Date();
    const maturityDate = addCalendarMonthsUTC(startDate, config.lockMonths);
    const now = new Date();
    const isMature = now >= maturityDate;

    // Currency & Unit conversions
    const investorPrincipalUSD = principalUSD;
    const investorPrincipalINR = Number((principalUSD * lockedFxRate).toFixed(2));
    const entryPriceUSD = entryPriceINR / lockedFxRate;
    const terminalPriceUSD = terminalPriceINR / lockedFxRate;

    // Token allocation: Principal / Entry Price
    const tokensAllocated = Number((principalUSD / entryPriceUSD).toFixed(4));

    // Gross Multiplied Amount: Tokens * Terminal Price
    const grossMultipliedAmountUSD = Number((tokensAllocated * terminalPriceUSD).toFixed(2));
    const grossMultipliedAmountINR = Number((grossMultipliedAmountUSD * lockedFxRate).toFixed(2));
    const growthMultiplier = Number((grossMultipliedAmountUSD / principalUSD).toFixed(2));

    // Profit: Gross - Principal
    const grossProfitUSD = Math.max(0, grossMultipliedAmountUSD - principalUSD);

    // Share breakdown: Investor gets Principal + 70% Profit, Company gets 30% Profit
    const investorProfitShare = grossProfitUSD * (config.proposedInvestorSharePercent / 100);
    const companyProfitShare = grossProfitUSD * (config.proposedCompanySharePercent / 100);

    const investorShareUSD = Number((principalUSD + investorProfitShare).toFixed(2));
    const companyShareUSD = Number(companyProfitShare.toFixed(2));

    // Liquidity Coverage & Feasibility Analysis
    const settlementShortfallUSD = Math.max(0, investorShareUSD - actualSettlementPoolUSD);
    const coverageRatioPercent = Number(
      Math.min(100, (actualSettlementPoolUSD / investorShareUSD) * 100).toFixed(2)
    );
    const isFullyFunded = actualSettlementPoolUSD >= investorShareUSD;

    // Architectural Conflicts & Risk Flags
    const conflicts: string[] = [
      'NON_CUSTODIAL_CONFLICT: True non-custodial Web3 tokens are held directly by the user in self-custody. A smart contract cannot unilaterally extract a 30% "Company Share" upon token transfer without custodial backdoors or transfer taxes (which violate standard AMM compatibility).',
      'INSOLVENCY_CONFLICT: The $1,000 liquidity pool cannot settle this liability. Redeeming the investor share ($' + investorShareUSD.toLocaleString() + ') against a $' + actualSettlementPoolUSD.toLocaleString() + ' pool would completely drain liquidity and fail by ' + (100 - coverageRatioPercent).toFixed(1) + '%.',
      'UNAPPROVED_PAYOUT_OBLIGATION: Payout obligations and funding sources remain unapproved. Payouts must NOT be guaranteed or automated in smart contracts.',
      'REGULATORY_RISK: Promised fixed returns and profit-sharing models fall under Collective Investment Scheme (CIS) regulations in India and require statutory disclosures and licenses.',
    ];

    return {
      category: config.category,
      displayName: config.displayName,
      lockMonths: config.lockMonths,
      startDateUTC: startDate.toISOString(),
      maturityDateUTC: maturityDate.toISOString(),
      isMature,
      investorPrincipalUSD,
      investorPrincipalINR,
      entryPriceUSD: Number(entryPriceUSD.toFixed(8)),
      tokensAllocated,
      terminalPriceUSD: Number(terminalPriceUSD.toFixed(4)),
      grossMultipliedAmountUSD,
      grossMultipliedAmountINR,
      growthMultiplier,
      grossProfitUSD,
      proposedInvestorSharePercent: config.proposedInvestorSharePercent,
      proposedCompanySharePercent: config.proposedCompanySharePercent,
      investorShareUSD,
      companyShareUSD,
      actualAvailableSettlementFundsUSD: actualSettlementPoolUSD,
      settlementShortfallUSD,
      coverageRatioPercent,
      isFullyFunded,
      investorTokenOwnership: 'LOCKED_TIMELOCK_CONTRACT',
      payoutStatus: 'UNAPPROVED_PROPOSAL_THEORETICAL_ONLY',
      conflicts,
    };
  }

  /**
   * Evaluates the confirmed Gate C4C business proposal parameters:
   * - Starter: ₹50,000, 5× multiplier, 3-month lock
   * - Basic: ₹1,00,000, 10× multiplier, 6-month lock
   * - Premium: ₹2,00,000, 20× multiplier, 9-month lock
   * - Elite: ₹3,00,000, 30× multiplier, 12-month lock
   * - Contractual 50:50 division of the gross multiplied amount.
   */
  public static evaluateConfirmedProposalPlan(
    category: InvestmentCategory,
    startDate?: Date | string,
    actualSettlementPoolUSD: number = 500.0, // $500 paired quote asset reserve in a $1,000 pool
    lockedFxRate: number = InvestmentPlanModel.DEFAULT_FX_RATE
  ): ConfirmedProposalEvaluationResult {
    const tier = CONFIRMED_BUSINESS_PROPOSAL_TIERS[category];
    if (!tier) {
      throw new Error(`INVALID_CATEGORY: Unknown investment category: ${category}`);
    }

    const start = startDate ? new Date(startDate) : new Date();
    const maturityDate = addCalendarMonthsUTC(start, tier.lockMonths);
    const isMature = new Date() >= maturityDate;

    const principalUSD = Number((tier.principalINR / lockedFxRate).toFixed(2));
    const grossMultipliedAmountUSD = Number((tier.grossMultipliedAmountINR / lockedFxRate).toFixed(2));
    const investorShareUSD = Number((tier.investorShareINR / lockedFxRate).toFixed(2));
    const companyShareUSD = Number((tier.companyShareINR / lockedFxRate).toFixed(2));

    const settlementShortfallUSD = Math.max(0, investorShareUSD - actualSettlementPoolUSD);
    const coverageRatioPercent = Number(
      Math.min(100, (actualSettlementPoolUSD / investorShareUSD) * 100).toFixed(2)
    );
    const isFullyFunded = actualSettlementPoolUSD >= investorShareUSD;

    const conflicts: string[] = [
      `NON_CUSTODIAL_CONFLICT: Tokens owned in non-custodial wallets cannot be subject to a 50% company cut without custodial backdoors or custom transfer taxes.`,
      `INSOLVENCY_CONFLICT: The $1,000 liquidity pool ($500 paired reserve) cannot redeem the investor share of ₹${tier.investorShareINR.toLocaleString()} ($${investorShareUSD.toLocaleString()}). Liquidity deficit is $${settlementShortfallUSD.toLocaleString()} (${(100 - coverageRatioPercent).toFixed(1)}% unfunded).`,
      `UNAPPROVED_PAYOUT_OBLIGATION: These figures are contractual proposals only. No automated on-chain payouts or guarantees are approved.`,
      `REGULATORY_RISK: Promised 5× to 30× returns with 50:50 profit sharing qualify as a Collective Investment Scheme (CIS) under SEBI regulations.`,
    ];

    return {
      category: tier.category,
      displayName: tier.displayName,
      principalINR: tier.principalINR,
      principalUSD,
      multiplierFactor: tier.multiplierFactor,
      lockMonths: tier.lockMonths,
      startDateUTC: start.toISOString(),
      maturityDateUTC: maturityDate.toISOString(),
      isMature,
      grossMultipliedAmountINR: tier.grossMultipliedAmountINR,
      grossMultipliedAmountUSD,
      investorShareINR: tier.investorShareINR,
      investorShareUSD,
      companyShareINR: tier.companyShareINR,
      companyShareUSD,
      actualAvailableSettlementFundsUSD: actualSettlementPoolUSD,
      settlementShortfallUSD,
      coverageRatioPercent,
      isFullyFunded,
      payoutStatus: 'UNAPPROVED_PROPOSAL_THEORETICAL_ONLY',
      conflicts,
    };
  }
}
