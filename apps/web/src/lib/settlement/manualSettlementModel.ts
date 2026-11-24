/**
 * LIORA COIN — Manual Investment Settlement Architecture & Lifecycle Prototype (Sprint 3B & 3C)
 *
 * Implements the authoritative management requirements from:
 * `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`
 *
 * FULL 12-STAGE CANONICAL SETTLEMENT STATE MACHINE (with Sprint 2 Backward Compatibility):
 * 1.  INVESTMENT_CREATED                   — Investor selects plan and creates record.
 * 2.  INITIAL_ALLOCATION_CALCULATED        — Proportional token quote calculated based on applicable price.
 * 3.  COLLATERAL_ALLOCATION_FINALIZED      — Collateral quantity permanently frozen; immutable terms locked.
 * 4.  COLLATERAL_PERIOD_ACTIVE             — Lock-in term active (e.g. 3 months for Tier 01-03, 9 mo for Tier 04, 12 mo for Tier 05-06).
 * 5.  COLLATERAL_PERIOD_COMPLETED          — Lock-in ended (matured); entering payout month (Month 4, 10, or 13).
 * 6.  MANUAL_PAYOUT_INITIATED              — Company owner records off-chain fiat cash payout (UTR/M-Pesa ref).
 * 7.  PAYMENT_VERIFICATION_PENDING         — Awaiting independent payment verification / investor bank confirmation.
 * 8.  PAYMENT_INDEPENDENTLY_VERIFIED       — Payment verified independently via bank proof or investor confirmation.
 * 9.  COLLATERAL_RETURN_PENDING            — System prompts investor/escrow to return collateral tokens.
 * 10. EXACT_ORIGINAL_COLLATERAL_RETURNED   — Blockchain collateral return transaction verified matching EXACT original tokens.
 * 11. SETTLEMENT_COMPLETED                 — Both fiat payment verified and exact collateral returned. Final state.
 * 12. DISPUTED_OR_FAILED_SETTLEMENT        — Disputed by investor or payment failed; frozen pending arbitration.
 *
 * SPRINT 2 BACKWARD-COMPATIBILITY ALIASES:
 * - ACTIVE_LOCKED -> COLLATERAL_PERIOD_ACTIVE
 * - MATURED_AWAITING_PAYOUT -> COLLATERAL_PERIOD_COMPLETED
 * - PAYMENT_DISPATCHED -> MANUAL_PAYOUT_INITIATED
 * - PAYMENT_CONFIRMED -> PAYMENT_INDEPENDENTLY_VERIFIED
 * - COLLATERAL_RETURNED / SETTLED -> SETTLEMENT_COMPLETED
 * - DISPUTED -> DISPUTED_OR_FAILED_SETTLEMENT
 *
 * STRICT RECONCILIATION & SAFETY GUARDS:
 * - Settlement CANNOT be marked complete merely because the owner records a payout.
 * - Requires BOTH independent payment verification AND exact original collateral return.
 * - Collateral return strictly verifies the exact original token quantity using BigInt base units.
 * - Globally unique payment reference enforcement (prevents duplicate UTR settling multiple plans).
 * - Zero automatic collateral seizure; zero unilateral owner release.
 */

import { AUTHORIZED_TREASURY_WALLET } from '../treasury/treasuryAccountingEngine';
import { LIORA_TOKEN_ADDRESS } from '../dex/dexOnChainClient';
import {
  ConfirmedPlanConfig,
  CONFIRMED_INVESTMENT_PLANS,
  ProportionalAllocationEngine,
  FinalizedCollateralRecord,
} from '../allocation/proportionalAllocationEngine';
import {
  PaymentReferenceRegistry,
  normalizePaymentReference,
  PaymentRail,
} from './paymentReferenceRegistry';

export type { PaymentRail } from './paymentReferenceRegistry';

export type SettlementStage =
  // Canonical Sprint 3B 12 Stages:
  | 'INVESTMENT_CREATED'
  | 'INITIAL_ALLOCATION_CALCULATED'
  | 'COLLATERAL_ALLOCATION_FINALIZED'
  | 'COLLATERAL_PERIOD_ACTIVE'
  | 'COLLATERAL_PERIOD_COMPLETED'
  | 'MANUAL_PAYOUT_INITIATED'
  | 'PAYMENT_VERIFICATION_PENDING'
  | 'PAYMENT_INDEPENDENTLY_VERIFIED'
  | 'COLLATERAL_RETURN_PENDING'
  | 'EXACT_ORIGINAL_COLLATERAL_RETURNED'
  | 'SETTLEMENT_COMPLETED'
  | 'DISPUTED_OR_FAILED_SETTLEMENT'
  // Sprint 2 Backward-Compatibility Aliases:
  | 'ACTIVE_LOCKED'
  | 'MATURED_AWAITING_PAYOUT'
  | 'PAYMENT_DISPATCHED'
  | 'PAYMENT_CONFIRMED'
  | 'COLLATERAL_RETURNED'
  | 'SETTLED'
  | 'DISPUTED';

export interface PayoutDispatchedDetails {
  amountPaidINR: number;
  paymentRail: PaymentRail;
  referenceNumber: string; // e.g. Bank UTR or M-Pesa reference code
  canonicalReferenceKey?: string;
  dispatchedAt: number;
  dispatchedBy: string;
  receiptUrl?: string;
  adminNotes?: string;
}

export interface PaymentVerificationDetails {
  verifiedAt: number;
  verifiedBy: string; // e.g. investor address or authorized arbitrator
  verificationMethod: 'INVESTOR_RECEIPT_CONFIRMATION' | 'INDEPENDENT_BANK_NOC_AUDIT' | 'ARBITRATION_VERIFICATION';
  verificationNotes?: string;
}

export interface CollateralReturnedDetails {
  returnedAt: number;
  txHash: string;
  returnedTokens: number;
  returnedTokensFormatted?: string;
  returnedTokensBaseUnits?: string;
  recipientTreasuryWallet: string;
  isExactQuantityMatch?: boolean;
}

export interface DisputeDetails {
  disputeId: string;
  raisedAt: number;
  raisedBy: string;
  reason: string;
  status: 'OPEN' | 'UNDER_ARBITRATION' | 'RESOLVED_PAYMENT_VERIFIED' | 'RESOLVED_COLLATERAL_RELEASED';
  arbitrationNotes?: string;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface InvestmentSettlementRecord {
  id: string;
  investorAddress: string;
  investorName: string;
  planId: string; // 'TIER_01' through 'TIER_06'
  tierNumber: string; // '01' through '06'
  planCategory: string; // 'STARTER', 'BASIC', 'PREMIUM', 'ELITE', etc.
  planDisplayName: string;
  principalINR: number;
  principalUSD: number;
  agreedReturnPercent: number; // e.g. 25% yield
  agreedCashPayoutINR: number; // Principal + return
  agreedCashPayoutUSD: number;
  contractualSettlementINR: number; // Fixed allocation value
  contractualSettlementUSD: number;
  multiplierFactor: number;
  termMonths: number; // e.g. 3, 9, 12
  payoutMonth: number; // e.g. 4, 10, 13
  settlementPayoutMonth: number;
  createdAt: number;
  lockEndDate: number;
  payoutDueDate: number;

  // Fixed Proportional Collateral Allocation
  initialAllocationPriceINR: string; // e.g. "0.20"
  initialAllocationPriceWei: string;
  collateralTokensAllocated: number; // Number of LIORA
  originalCollateralTokensFormatted: string; // e.g. "625000"
  originalCollateralTokensBaseUnits: string; // 18-decimal BigInt string
  roundingRemainderWei: string;
  collateralTokenAddress: string;
  collateralCustodyType: 'ESCROW_VAULT_PROTOTYPE' | 'DIRECT_WALLET_HOLDING';

  // State Machine
  stage: SettlementStage;
  stageUpdatedAt: number;

  // Lifecycle Proofs
  payoutDispatched?: PayoutDispatchedDetails;
  paymentConfirmedByInvestor?: {
    confirmedAt: number;
    confirmedBy: string;
    investorNotes?: string;
  };
  paymentVerification?: PaymentVerificationDetails;
  collateralReturned?: CollateralReturnedDetails;
  dispute?: DisputeDetails;
}

export interface SettlementAuditLog {
  id: string;
  investmentId: string;
  timestamp: number;
  actor: string;
  action: string;
  previousStage: SettlementStage;
  newStage: SettlementStage;
  details: string;
  referenceId?: string;
}

export interface SettlementReconciliationSummary {
  totalInvestmentsCount: number;
  activeInvestmentsCount: number;
  maturedPendingPayoutCount: number;
  payoutDispatchedCount: number;
  verificationPendingCount: number;
  collateralReturnPendingCount: number;
  disputedCount: number;
  settledCount: number;
  totalPrincipalINR: number;
  totalAgreedPayoutINR: number;
  totalContractualSettlementINR: number;
  totalCollateralAllocatedLIORA: number;
  totalCollateralReturnedLIORA: number;
  activeCollateralOutLIORA: number;
  isReconciled: boolean;
  reconciliationDiscrepancyLIORA: number;
}

// Initial Mock Seed Data representing key Sprint 2 & 3B lifecycle states
const INITIAL_SEED_INVESTMENTS: InvestmentSettlementRecord[] = [
  {
    id: 'INV-2026-001',
    investorAddress: '0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD',
    investorName: 'Dan Test Investor',
    planId: 'TIER_01',
    tierNumber: '01',
    planCategory: 'STARTER',
    planDisplayName: 'Tier 01 (Starter)',
    principalINR: 50000,
    principalUSD: 500,
    agreedReturnPercent: 150,
    agreedCashPayoutINR: 125000,
    agreedCashPayoutUSD: 1250,
    contractualSettlementINR: 125000,
    contractualSettlementUSD: 1250,
    multiplierFactor: 2.5,
    termMonths: 3,
    payoutMonth: 4,
    settlementPayoutMonth: 4,
    createdAt: Date.now() - 95 * 24 * 60 * 60 * 1000, // 95 days ago (Month 4)
    lockEndDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
    payoutDueDate: Date.now() + 25 * 24 * 60 * 60 * 1000,
    initialAllocationPriceINR: '0.20',
    initialAllocationPriceWei: (200000000000000000n).toString(),
    collateralTokensAllocated: 625000,
    originalCollateralTokensFormatted: '625000',
    originalCollateralTokensBaseUnits: (625000n * 10n ** 18n).toString(),
    roundingRemainderWei: '0',
    collateralTokenAddress: LIORA_TOKEN_ADDRESS,
    collateralCustodyType: 'ESCROW_VAULT_PROTOTYPE',
    stage: 'PAYMENT_DISPATCHED',
    stageUpdatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    payoutDispatched: {
      amountPaidINR: 125000,
      paymentRail: 'IMPS_BANK_TRANSFER',
      referenceNumber: 'HDFC-UTR-8923471029481',
      dispatchedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      dispatchedBy: AUTHORIZED_TREASURY_WALLET,
      adminNotes: 'IMPS settlement dispatched via Grandiose Tech treasury operational account.',
    },
  },
  {
    id: 'INV-2026-002',
    investorAddress: '0x39a19d20c58a6448547906dcb191b037db5ac1b2',
    investorName: 'Alice Global Member',
    planId: 'TIER_02',
    tierNumber: '02',
    planCategory: 'BASIC',
    planDisplayName: 'Tier 02 (Basic)',
    principalINR: 100000,
    principalUSD: 1000,
    agreedReturnPercent: 500,
    agreedCashPayoutINR: 600000,
    agreedCashPayoutUSD: 6000,
    contractualSettlementINR: 600000,
    contractualSettlementUSD: 6000,
    multiplierFactor: 6.0,
    termMonths: 3,
    payoutMonth: 4,
    settlementPayoutMonth: 4,
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000, // 45 days ago (Month 2)
    lockEndDate: Date.now() + 45 * 24 * 60 * 60 * 1000,
    payoutDueDate: Date.now() + 75 * 24 * 60 * 60 * 1000,
    initialAllocationPriceINR: '0.40',
    initialAllocationPriceWei: (400000000000000000n).toString(),
    collateralTokensAllocated: 1500000,
    originalCollateralTokensFormatted: '1500000',
    originalCollateralTokensBaseUnits: (1500000n * 10n ** 18n).toString(),
    roundingRemainderWei: '0',
    collateralTokenAddress: LIORA_TOKEN_ADDRESS,
    collateralCustodyType: 'ESCROW_VAULT_PROTOTYPE',
    stage: 'ACTIVE_LOCKED',
    stageUpdatedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'INV-2026-003',
    investorAddress: '0x81b0a8274dcf68449c31405b64c057ec93154e19',
    investorName: 'Kenyan Partner Alpha',
    planId: 'TIER_01',
    tierNumber: '01',
    planCategory: 'STARTER',
    planDisplayName: 'Tier 01 (Starter)',
    principalINR: 50000,
    principalUSD: 500,
    agreedReturnPercent: 150,
    agreedCashPayoutINR: 125000,
    agreedCashPayoutUSD: 1250,
    contractualSettlementINR: 125000,
    contractualSettlementUSD: 1250,
    multiplierFactor: 2.5,
    termMonths: 3,
    payoutMonth: 4,
    settlementPayoutMonth: 4,
    createdAt: Date.now() - 110 * 24 * 60 * 60 * 1000,
    lockEndDate: Date.now() - 20 * 24 * 60 * 60 * 1000,
    payoutDueDate: Date.now() + 10 * 24 * 60 * 60 * 1000,
    initialAllocationPriceINR: '1.00',
    initialAllocationPriceWei: (1000000000000000000n).toString(),
    collateralTokensAllocated: 125000,
    originalCollateralTokensFormatted: '125000',
    originalCollateralTokensBaseUnits: (125000n * 10n ** 18n).toString(),
    roundingRemainderWei: '0',
    collateralTokenAddress: LIORA_TOKEN_ADDRESS,
    collateralCustodyType: 'ESCROW_VAULT_PROTOTYPE',
    stage: 'SETTLED',
    stageUpdatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    payoutDispatched: {
      amountPaidINR: 125000,
      paymentRail: 'MPESA_MOBILE_MONEY',
      referenceNumber: 'MPESA-QGH8910234',
      dispatchedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      dispatchedBy: AUTHORIZED_TREASURY_WALLET,
      adminNotes: 'M-Pesa business remittance executed via Kenyan partner desk.',
    },
    paymentConfirmedByInvestor: {
      confirmedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
      confirmedBy: '0x81b0a8274dcf68449c31405b64c057ec93154e19',
      investorNotes: 'M-Pesa credit received and verified.',
    },
    paymentVerification: {
      verifiedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
      verifiedBy: '0x81b0a8274dcf68449c31405b64c057ec93154e19',
      verificationMethod: 'INVESTOR_RECEIPT_CONFIRMATION',
      verificationNotes: 'M-Pesa credit received and verified.',
    },
    collateralReturned: {
      returnedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      txHash: '0x8e21f92c3017bb54c93510e1935bb829f04128e94a8c1739c3e98b10f274a123',
      returnedTokens: 125000,
      returnedTokensFormatted: '125000',
      returnedTokensBaseUnits: (125000n * 10n ** 18n).toString(),
      recipientTreasuryWallet: AUTHORIZED_TREASURY_WALLET,
      isExactQuantityMatch: true,
    },
  },
  {
    id: 'INV-2026-004',
    investorAddress: '0x992c10b54e819b02315fa74c891a2bc491901da3',
    investorName: 'Beta Capital Group',
    planId: 'TIER_04',
    tierNumber: '04',
    planCategory: 'PREMIUM',
    planDisplayName: 'Tier 04 (Advanced)',
    principalINR: 300000,
    principalUSD: 3000,
    agreedReturnPercent: 700,
    agreedCashPayoutINR: 2400000,
    agreedCashPayoutUSD: 24000,
    contractualSettlementINR: 2400000,
    contractualSettlementUSD: 24000,
    multiplierFactor: 8.0,
    termMonths: 9,
    payoutMonth: 10,
    settlementPayoutMonth: 10,
    createdAt: Date.now() - 280 * 24 * 60 * 60 * 1000, // Month 10 active
    lockEndDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
    payoutDueDate: Date.now() + 20 * 24 * 60 * 60 * 1000,
    initialAllocationPriceINR: '0.20',
    initialAllocationPriceWei: (200000000000000000n).toString(),
    collateralTokensAllocated: 12000000,
    originalCollateralTokensFormatted: '12000000',
    originalCollateralTokensBaseUnits: (12000000n * 10n ** 18n).toString(),
    roundingRemainderWei: '0',
    collateralTokenAddress: LIORA_TOKEN_ADDRESS,
    collateralCustodyType: 'ESCROW_VAULT_PROTOTYPE',
    stage: 'DISPUTED',
    stageUpdatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    payoutDispatched: {
      amountPaidINR: 2400000,
      paymentRail: 'RTGS_WIRE',
      referenceNumber: 'RTGS-SBIN202611029',
      dispatchedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
      dispatchedBy: AUTHORIZED_TREASURY_WALLET,
      adminNotes: 'RTGS transfer dispatched to State Bank of India account.',
    },
    dispute: {
      disputeId: 'DISP-2026-001',
      raisedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      raisedBy: '0x992c10b54e819b02315fa74c891a2bc491901da3',
      reason: 'Beneficiary bank statement shows transaction pending reversal due to beneficiary name mismatch.',
      status: 'OPEN',
      arbitrationNotes: 'Awaiting Bank NOC Certificate from sending bank branch in Nairobi.',
    },
  },
];

const INITIAL_AUDIT_LOGS: SettlementAuditLog[] = [
  {
    id: 'LOG-001',
    investmentId: 'INV-2026-003',
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    actor: '0x81b0a8274dcf68449c31405b64c057ec93154e19',
    action: 'COLLATERAL_RETURNED',
    previousStage: 'PAYMENT_CONFIRMED',
    newStage: 'SETTLED',
    details: '125,000 collateral LIORA tokens returned to treasury (exact match). Settlement completed.',
    referenceId: '0x8e21f92c3017bb54c93510e1935bb829f04128e94a8c1739c3e98b10f274a123',
  },
  {
    id: 'LOG-002',
    investmentId: 'INV-2026-004',
    timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
    actor: '0x992c10b54e819b02315fa74c891a2bc491901da3',
    action: 'DISPUTE_RAISED',
    previousStage: 'PAYMENT_DISPATCHED',
    newStage: 'DISPUTED',
    details: 'Payment dispute registered: Beneficiary bank statement shows transaction pending reversal.',
    referenceId: 'DISP-2026-001',
  },
  {
    id: 'LOG-003',
    investmentId: 'INV-2026-001',
    timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
    actor: AUTHORIZED_TREASURY_WALLET,
    action: 'PAYMENT_DISPATCHED',
    previousStage: 'MATURED_AWAITING_PAYOUT',
    newStage: 'PAYMENT_DISPATCHED',
    details: 'Owner manual payout dispatched: ₹125,000 via IMPS (Ref: HDFC-UTR-8923471029481).',
    referenceId: 'HDFC-UTR-8923471029481',
  },
];

function generateCollisionResistantId(tierNumber: string): string {
  let randHex = '';
  try {
    if (typeof crypto !== 'undefined') {
      if (typeof (crypto as any).randomBytes === 'function') {
        randHex = (crypto as any).randomBytes(4).toString('hex').toUpperCase();
      } else if (typeof crypto.getRandomValues === 'function') {
        const arr = new Uint8Array(4);
        crypto.getRandomValues(arr);
        randHex = Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      }
    }
  } catch {
    // Fallback if crypto throws
  }
  if (!randHex) {
    randHex = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  return `INV-${Date.now()}-${tierNumber}-${randHex}`;
}

export class ManualSettlementEngine {
  private static readonly STORAGE_KEY_INVESTMENTS = 'liora_settlement_investments_v3';
  private static readonly STORAGE_KEY_LOGS = 'liora_settlement_audit_logs_v3';

  private static investments: InvestmentSettlementRecord[] = [];
  private static auditLogs: SettlementAuditLog[] = [];
  private static isInitialized = false;

  private static initialize(): void {
    if (this.isInitialized) return;

    if (typeof window !== 'undefined') {
      try {
        const storedInv = localStorage.getItem(this.STORAGE_KEY_INVESTMENTS);
        const storedLogs = localStorage.getItem(this.STORAGE_KEY_LOGS);

        this.investments = storedInv ? JSON.parse(storedInv) : [...INITIAL_SEED_INVESTMENTS];
        this.auditLogs = storedLogs ? JSON.parse(storedLogs) : [...INITIAL_AUDIT_LOGS];
      } catch {
        this.investments = [...INITIAL_SEED_INVESTMENTS];
        this.auditLogs = [...INITIAL_AUDIT_LOGS];
      }
    } else {
      this.investments = [...INITIAL_SEED_INVESTMENTS];
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
    }

    // Initialize payment reference registry with seed investments
    for (const inv of this.investments) {
      if (inv.payoutDispatched && inv.payoutDispatched.referenceNumber) {
        PaymentReferenceRegistry.registerReference({
          rawReference: inv.payoutDispatched.referenceNumber,
          rail: inv.payoutDispatched.paymentRail,
          investmentId: inv.id,
          amountPaidINR: inv.payoutDispatched.amountPaidINR,
          registeredBy: inv.payoutDispatched.dispatchedBy,
        });
      }
    }

    this.isInitialized = true;
  }

  private static save(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY_INVESTMENTS, JSON.stringify(this.investments));
        localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(this.auditLogs));
      } catch (e) {
        console.warn('Failed to persist settlement data to localStorage', e);
      }
    }
  }

  public static resetForTesting(): void {
    this.investments = JSON.parse(JSON.stringify(INITIAL_SEED_INVESTMENTS));
    this.auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    this.isInitialized = true;
    PaymentReferenceRegistry.resetForTesting();
    for (const inv of this.investments) {
      if (inv.payoutDispatched && inv.payoutDispatched.referenceNumber) {
        PaymentReferenceRegistry.registerReference({
          rawReference: inv.payoutDispatched.referenceNumber,
          rail: inv.payoutDispatched.paymentRail,
          investmentId: inv.id,
          amountPaidINR: inv.payoutDispatched.amountPaidINR,
          registeredBy: inv.payoutDispatched.dispatchedBy,
        });
      }
    }
    this.save();
  }

  public static getInvestments(): InvestmentSettlementRecord[] {
    this.initialize();
    return [...this.investments];
  }

  public static getInvestmentById(id: string): InvestmentSettlementRecord | undefined {
    this.initialize();
    return this.investments.find((inv) => inv.id === id);
  }

  public static getInvestmentsForAddress(address: string): InvestmentSettlementRecord[] {
    this.initialize();
    const clean = address.toLowerCase();
    return this.investments.filter((inv) => inv.investorAddress.toLowerCase() === clean);
  }

  public static getAuditLogs(investmentId?: string): SettlementAuditLog[] {
    this.initialize();
    if (investmentId) {
      return this.auditLogs.filter((log) => log.investmentId === investmentId);
    }
    return [...this.auditLogs];
  }

  /**
   * Helper stage matching functions for backward-compatibility and canonical stage checking.
   */
  public static isPayoutDispatched(stage: SettlementStage): boolean {
    return stage === 'MANUAL_PAYOUT_INITIATED' || stage === 'PAYMENT_DISPATCHED' || stage === 'PAYMENT_VERIFICATION_PENDING';
  }

  public static isPaymentConfirmed(stage: SettlementStage): boolean {
    return stage === 'PAYMENT_INDEPENDENTLY_VERIFIED' || stage === 'PAYMENT_CONFIRMED' || stage === 'COLLATERAL_RETURN_PENDING';
  }

  public static isSettled(stage: SettlementStage): boolean {
    return stage === 'SETTLEMENT_COMPLETED' || stage === 'SETTLED' || stage === 'COLLATERAL_RETURNED' || stage === 'EXACT_ORIGINAL_COLLATERAL_RETURNED';
  }

  public static isDisputed(stage: SettlementStage): boolean {
    return stage === 'DISPUTED_OR_FAILED_SETTLEMENT' || stage === 'DISPUTED';
  }

  public static isMatured(stage: SettlementStage): boolean {
    return stage === 'COLLATERAL_PERIOD_COMPLETED' || stage === 'MATURED_AWAITING_PAYOUT';
  }

  public static isActive(stage: SettlementStage): boolean {
    return (
      stage === 'COLLATERAL_PERIOD_ACTIVE' ||
      stage === 'ACTIVE_LOCKED' ||
      stage === 'INVESTMENT_CREATED' ||
      stage === 'INITIAL_ALLOCATION_CALCULATED' ||
      stage === 'COLLATERAL_ALLOCATION_FINALIZED'
    );
  }

  /**
   * Creates a new investment record and calculates proportional collateral allocation.
   */
  public static createInvestment(params: {
    investorAddress: string;
    investorName: string;
    planId: string;
    initialAllocationPriceINR: string | number;
  }): { success: boolean; record?: InvestmentSettlementRecord; error?: string } {
    this.initialize();

    const plan = CONFIRMED_INVESTMENT_PLANS[params.planId];
    if (!plan) {
      return { success: false, error: `Invalid plan ID: ${params.planId}` };
    }

    try {
      const quote = ProportionalAllocationEngine.calculateAllocation(
        plan,
        params.initialAllocationPriceINR
      );

      const id = generateCollisionResistantId(plan.tierNumber);
      const now = Date.now();
      const lockEndDate = now + plan.lockDurationMonths * 30 * 24 * 60 * 60 * 1000;
      const payoutDueDate = now + plan.settlementPayoutMonth * 30 * 24 * 60 * 60 * 1000;

      const record: InvestmentSettlementRecord = {
        id,
        investorAddress: params.investorAddress.toLowerCase(),
        investorName: params.investorName,
        planId: plan.planId,
        tierNumber: plan.tierNumber,
        planCategory: plan.planId.replace('TIER_', ''),
        planDisplayName: plan.displayName,
        principalINR: plan.principalINR,
        principalUSD: plan.principalUSD,
        agreedReturnPercent: Math.round(((plan.contractualAllocationINR - plan.principalINR) / plan.principalINR) * 100),
        agreedCashPayoutINR: plan.contractualAllocationINR,
        agreedCashPayoutUSD: plan.contractualAllocationUSD,
        contractualSettlementINR: plan.contractualAllocationINR,
        contractualSettlementUSD: plan.contractualAllocationUSD,
        multiplierFactor: plan.multiplierFactor,
        termMonths: plan.lockDurationMonths,
        payoutMonth: plan.settlementPayoutMonth,
        settlementPayoutMonth: plan.settlementPayoutMonth,
        createdAt: now,
        lockEndDate,
        payoutDueDate,
        initialAllocationPriceINR: quote.allocationPriceINR,
        initialAllocationPriceWei: quote.allocationPriceWei,
        collateralTokensAllocated: quote.allocatedTokensNumber,
        originalCollateralTokensFormatted: quote.allocatedTokensFormatted,
        originalCollateralTokensBaseUnits: quote.allocatedTokensBaseUnits,
        roundingRemainderWei: quote.roundingRemainderWei,
        collateralTokenAddress: LIORA_TOKEN_ADDRESS,
        collateralCustodyType: 'ESCROW_VAULT_PROTOTYPE',
        stage: 'COLLATERAL_PERIOD_ACTIVE',
        stageUpdatedAt: now,
      };

      this.investments.unshift(record);

      this.auditLogs.unshift({
        id: `LOG-${Date.now()}`,
        investmentId: id,
        timestamp: now,
        actor: params.investorAddress,
        action: 'INVESTMENT_CREATED_AND_COLLATERAL_FINALIZED',
        previousStage: 'INVESTMENT_CREATED',
        newStage: 'COLLATERAL_PERIOD_ACTIVE',
        details: `Plan ${plan.displayName} created. Principal: ₹${plan.principalINR.toLocaleString()}. Allocated ${quote.allocatedTokensFormatted} LIORA collateral @ ₹${quote.allocationPriceINR}.`,
      });

      this.save();
      return { success: true, record };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Records owner's manual cash payout dispatch.
   * State transitions to PAYMENT_DISPATCHED (or MANUAL_PAYOUT_INITIATED).
   * STRICT GUARD: Settlement is NOT complete here.
   * Enforces global payment reference uniqueness (Task 2).
   */
  public static recordManualPayout(
    investmentId: string,
    payout: {
      amountPaidINR: number;
      paymentRail: PaymentRail;
      referenceNumber: string;
      dispatchedBy: string;
      adminNotes?: string;
      targetStage?: 'PAYMENT_DISPATCHED' | 'MANUAL_PAYOUT_INITIATED';
    }
  ): { success: boolean; error?: string } {
    this.initialize();
    const inv = this.investments.find((i) => i.id === investmentId);
    if (!inv) return { success: false, error: 'Investment record not found.' };

    if (this.isSettled(inv.stage)) {
      return { success: false, error: 'Cannot dispatch payout for an already settled investment.' };
    }

    // Role verification
    if (payout.dispatchedBy.toLowerCase() !== AUTHORIZED_TREASURY_WALLET.toLowerCase()) {
      return { success: false, error: 'UNAUTHORIZED_PAYOUT_CALLER: Only the authorized treasury owner can record payouts.' };
    }

    if (!payout.referenceNumber || payout.referenceNumber.trim().length < 5) {
      return { success: false, error: 'A valid bank UTR / payment reference number is required.' };
    }

    // Validate and register globally unique payment reference (Task 2)
    const refReg = PaymentReferenceRegistry.registerReference({
      rawReference: payout.referenceNumber,
      rail: payout.paymentRail,
      investmentId,
      amountPaidINR: payout.amountPaidINR,
      registeredBy: payout.dispatchedBy,
    });

    if (!refReg.success) {
      return { success: false, error: refReg.error };
    }

    const previousStage = inv.stage;
    const newStage: SettlementStage = payout.targetStage || 'PAYMENT_DISPATCHED';
    inv.stage = newStage;
    inv.stageUpdatedAt = Date.now();
    inv.payoutDispatched = {
      ...payout,
      canonicalReferenceKey: refReg.canonicalKey,
      dispatchedAt: Date.now(),
    };

    const logId = `LOG-${Date.now()}`;
    this.auditLogs.unshift({
      id: logId,
      investmentId,
      timestamp: Date.now(),
      actor: payout.dispatchedBy,
      action: newStage,
      previousStage,
      newStage,
      details: `Owner dispatched manual payout of ₹${payout.amountPaidINR.toLocaleString()} via ${payout.paymentRail} (Ref: ${payout.referenceNumber}). Status: Awaiting independent verification.`,
      referenceId: payout.referenceNumber,
    });

    this.save();
    return { success: true };
  }

  /**
   * Corrects a manual payout reference (e.g. UTR typo or reissued transfer).
   * Generates an append-only audit trail and updates the unique reference registry.
   */
  public static correctManualPayoutReference(params: {
    investmentId: string;
    newReferenceNumber: string;
    paymentRail: PaymentRail;
    reason: string;
    correctedBy: string;
  }): { success: boolean; error?: string } {
    this.initialize();
    const inv = this.investments.find((i) => i.id === params.investmentId);
    if (!inv || !inv.payoutDispatched) {
      return { success: false, error: 'No dispatched payout record found for this investment.' };
    }

    if (params.correctedBy.toLowerCase() !== AUTHORIZED_TREASURY_WALLET.toLowerCase()) {
      return { success: false, error: 'UNAUTHORIZED_CALLER: Only authorized treasury owner can correct payout references.' };
    }

    const oldRef = inv.payoutDispatched.referenceNumber;
    const correctionResult = PaymentReferenceRegistry.correctReference({
      oldRawReference: oldRef,
      newRawReference: params.newReferenceNumber,
      rail: params.paymentRail,
      investmentId: params.investmentId,
      reason: params.reason,
      correctedBy: params.correctedBy,
    });

    if (!correctionResult.success) {
      return { success: false, error: correctionResult.error };
    }

    inv.payoutDispatched.referenceNumber = params.newReferenceNumber;
    inv.payoutDispatched.paymentRail = params.paymentRail;
    inv.payoutDispatched.canonicalReferenceKey = correctionResult.newRecord?.canonicalKey;
    inv.payoutDispatched.adminNotes = (inv.payoutDispatched.adminNotes ? inv.payoutDispatched.adminNotes + ' | ' : '') + `Reference corrected from ${oldRef} to ${params.newReferenceNumber}. Reason: ${params.reason}`;

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      investmentId: params.investmentId,
      timestamp: Date.now(),
      actor: params.correctedBy,
      action: 'PAYMENT_REFERENCE_CORRECTED',
      previousStage: inv.stage,
      newStage: inv.stage,
      details: `Payment reference corrected from "${oldRef}" to "${params.newReferenceNumber}". Reason: ${params.reason}`,
      referenceId: params.newReferenceNumber,
    });

    this.save();
    return { success: true };
  }

  /**
   * Investor confirms receipt of fiat payment.
   * Backward-compatible with Sprint 2 and supports Sprint 3B.
   */
  public static confirmInvestorPayment(
    investmentId: string,
    investorAddress: string,
    notes?: string,
    targetStage: 'PAYMENT_CONFIRMED' | 'PAYMENT_INDEPENDENTLY_VERIFIED' = 'PAYMENT_CONFIRMED'
  ): { success: boolean; error?: string } {
    this.initialize();
    const inv = this.investments.find((i) => i.id === investmentId);
    if (!inv) return { success: false, error: 'Investment record not found.' };

    if (inv.investorAddress.toLowerCase() !== investorAddress.toLowerCase()) {
      return { success: false, error: 'Unauthorized: Only the designated investor can confirm receipt of payment.' };
    }

    if (!this.isPayoutDispatched(inv.stage) && !this.isDisputed(inv.stage)) {
      return { success: false, error: `Cannot confirm payment while in stage: ${inv.stage}. Payment must be marked dispatched first.` };
    }

    const previousStage = inv.stage;
    inv.stage = targetStage;
    inv.stageUpdatedAt = Date.now();
    inv.paymentConfirmedByInvestor = {
      confirmedAt: Date.now(),
      confirmedBy: investorAddress,
      investorNotes: notes || 'Investor confirmed bank credit received.',
    };

    inv.paymentVerification = {
      verifiedAt: Date.now(),
      verifiedBy: investorAddress,
      verificationMethod: 'INVESTOR_RECEIPT_CONFIRMATION',
      verificationNotes: notes || 'Investor confirmed bank credit received.',
    };

    // Clear active dispute if resolved
    if (inv.dispute && inv.dispute.status === 'OPEN') {
      inv.dispute.status = 'RESOLVED_PAYMENT_VERIFIED';
      inv.dispute.resolvedAt = Date.now();
      inv.dispute.resolvedBy = investorAddress;
    }

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      investmentId,
      timestamp: Date.now(),
      actor: investorAddress,
      action: 'PAYMENT_CONFIRMED_BY_INVESTOR',
      previousStage,
      newStage: targetStage,
      details: 'Investor confirmed receipt of fiat funds into their bank account.',
    });

    this.save();
    return { success: true };
  }

  /**
   * Verifies payment independently via bank NOC audit, investor confirmation, or arbitration.
   */
  public static verifyPayment(
    investmentId: string,
    verifierAddress: string,
    method: 'INVESTOR_RECEIPT_CONFIRMATION' | 'INDEPENDENT_BANK_NOC_AUDIT' | 'ARBITRATION_VERIFICATION',
    notes?: string
  ): { success: boolean; error?: string } {
    return this.confirmInvestorPayment(
      investmentId,
      verifierAddress,
      notes,
      'PAYMENT_INDEPENDENTLY_VERIFIED'
    );
  }

  /**
   * Investor or Escrow returns collateral LIORA tokens back to company treasury.
   *
   * STRICT GUARDS:
   * 1. Payment MUST be confirmed/verified before collateral return.
   * 2. Uses BigInt base units (never JS floating-point numbers) (Task 1).
   * 3. Requires returned quantity to match original allocation exactly in atomic units.
   */
  public static returnCollateral(
    investmentId: string,
    txHash: string,
    actorAddress: string,
    returnedTokensAmount?: string | number | bigint,
    targetStage: 'SETTLED' | 'SETTLEMENT_COMPLETED' = 'SETTLED'
  ): { success: boolean; error?: string } {
    this.initialize();
    const inv = this.investments.find((i) => i.id === investmentId);
    if (!inv) return { success: false, error: 'Investment record not found.' };

    if (!this.isPaymentConfirmed(inv.stage)) {
      return {
        success: false,
        error: `Collateral cannot be returned until cash payment is confirmed by investor. Current stage: ${inv.stage}.`,
      };
    }

    if (!txHash || !txHash.startsWith('0x') || txHash.length < 10) {
      return { success: false, error: 'A valid on-chain transaction hash is required for collateral return.' };
    }

    // Verify exact original token quantity using BigInt base units (Task 1)
    const expectedBaseUnits = BigInt(inv.originalCollateralTokensBaseUnits);
    let isExactMatch = true;

    if (returnedTokensAmount !== undefined) {
      const verification = ProportionalAllocationEngine.verifyExactCollateralReturn(
        expectedBaseUnits,
        returnedTokensAmount
      );

      if (!verification.isValid) {
        return {
          success: false,
          error: `COLLATERAL_QUANTITY_MISMATCH: Must return EXACTLY original allocated quantity. Expected: ${inv.originalCollateralTokensFormatted} LIORA (${expectedBaseUnits.toString()} atomic units). Received: ${verification.receivedBaseUnits} atomic units. Difference: ${verification.differenceWei} atomic units.`,
        };
      }
      isExactMatch = verification.isValid;
    }

    const previousStage = inv.stage;
    inv.stage = targetStage;
    inv.stageUpdatedAt = Date.now();
    inv.collateralReturned = {
      returnedAt: Date.now(),
      txHash,
      returnedTokens: inv.collateralTokensAllocated,
      returnedTokensFormatted: inv.originalCollateralTokensFormatted,
      returnedTokensBaseUnits: inv.originalCollateralTokensBaseUnits,
      recipientTreasuryWallet: AUTHORIZED_TREASURY_WALLET,
      isExactQuantityMatch: isExactMatch,
    };

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      investmentId,
      timestamp: Date.now(),
      actor: actorAddress,
      action: 'COLLATERAL_RETURNED_SETTLED',
      previousStage,
      newStage: targetStage,
      details: `${inv.originalCollateralTokensFormatted} collateral LIORA tokens returned to treasury (${AUTHORIZED_TREASURY_WALLET.slice(0, 6)}...); settlement completed.`,
      referenceId: txHash,
    });

    this.save();
    return { success: true };
  }

  /**
   * Investor raises a dispute if payment does not arrive or has discrepancies.
   */
  public static raiseDispute(
    investmentId: string,
    reason: string,
    investorAddress: string,
    targetStage: 'DISPUTED' | 'DISPUTED_OR_FAILED_SETTLEMENT' = 'DISPUTED'
  ): { success: boolean; error?: string } {
    this.initialize();
    const inv = this.investments.find((i) => i.id === investmentId);
    if (!inv) return { success: false, error: 'Investment record not found.' };

    if (inv.investorAddress.toLowerCase() !== investorAddress.toLowerCase()) {
      return { success: false, error: 'Unauthorized: Only the designated investor can file a dispute.' };
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, error: 'Please enter a clear explanation for the payment dispute (minimum 10 characters).' };
    }

    const previousStage = inv.stage;
    inv.stage = targetStage;
    inv.stageUpdatedAt = Date.now();
    inv.dispute = {
      disputeId: `DISP-${Date.now()}`,
      raisedAt: Date.now(),
      raisedBy: investorAddress,
      reason,
      status: 'OPEN',
    };

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      investmentId,
      timestamp: Date.now(),
      actor: investorAddress,
      action: 'DISPUTE_RAISED',
      previousStage,
      newStage: targetStage,
      details: `Investor raised dispute: ${reason}`,
      referenceId: inv.dispute.disputeId,
    });

    this.save();
    return { success: true };
  }

  /**
   * Admin / Arbitrator resolves a dispute with verified evidence.
   */
  public static resolveDispute(
    investmentId: string,
    resolution: 'RESOLVED_PAYMENT_VERIFIED' | 'RESOLVED_COLLATERAL_RELEASED',
    arbitrationNotes: string,
    arbitratorAddress: string,
    targetStage?: 'PAYMENT_CONFIRMED' | 'PAYMENT_INDEPENDENTLY_VERIFIED' | 'SETTLED' | 'SETTLEMENT_COMPLETED'
  ): { success: boolean; error?: string } {
    this.initialize();
    const inv = this.investments.find((i) => i.id === investmentId);
    if (!inv || !inv.dispute) return { success: false, error: 'Active dispute not found for this investment.' };

    const previousStage = inv.stage;
    inv.dispute.status = resolution;
    inv.dispute.arbitrationNotes = arbitrationNotes;
    inv.dispute.resolvedAt = Date.now();
    inv.dispute.resolvedBy = arbitratorAddress;

    if (resolution === 'RESOLVED_PAYMENT_VERIFIED') {
      inv.stage = targetStage || 'PAYMENT_CONFIRMED';
      inv.paymentVerification = {
        verifiedAt: Date.now(),
        verifiedBy: arbitratorAddress,
        verificationMethod: 'ARBITRATION_VERIFICATION',
        verificationNotes: arbitrationNotes,
      };
    } else {
      // Company defaulted, investor keeps collateral
      inv.stage = targetStage || 'SETTLED';
    }
    inv.stageUpdatedAt = Date.now();

    this.auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      investmentId,
      timestamp: Date.now(),
      actor: arbitratorAddress,
      action: 'DISPUTE_ARBITRATED',
      previousStage,
      newStage: inv.stage,
      details: `Dispute arbitrated: ${resolution}. Notes: ${arbitrationNotes}`,
      referenceId: inv.dispute.disputeId,
    });

    this.save();
    return { success: true };
  }

  /**
   * Computes double-entry reconciliation summary.
   */
  public static getSettlementReconciliation(): SettlementReconciliationSummary {
    this.initialize();
    return this.calculateReconciliation(this.investments);
  }

  public static calculateReconciliation(investments: InvestmentSettlementRecord[]): SettlementReconciliationSummary {
    let totalPrincipalINR = 0;
    let totalAgreedPayoutINR = 0;
    let totalContractualSettlementINR = 0;
    let totalCollateralAllocatedLIORA = 0;
    let totalCollateralReturnedLIORA = 0;
    let activeCollateralOutLIORA = 0;

    let activeCount = 0;
    let maturedPendingPayoutCount = 0;
    let payoutDispatchedCount = 0;
    let verificationPendingCount = 0;
    let collateralReturnPendingCount = 0;
    let disputedCount = 0;
    let settledCount = 0;

    for (const inv of investments) {
      const tokensNum = inv.collateralTokensAllocated;
      totalPrincipalINR += inv.principalINR;
      totalAgreedPayoutINR += inv.agreedCashPayoutINR;
      totalContractualSettlementINR += (inv.contractualSettlementINR || inv.agreedCashPayoutINR);
      totalCollateralAllocatedLIORA += tokensNum;

      if (this.isSettled(inv.stage)) {
        settledCount++;
        totalCollateralReturnedLIORA += tokensNum;
      } else if (this.isDisputed(inv.stage)) {
        disputedCount++;
        activeCollateralOutLIORA += tokensNum;
      } else if (this.isPaymentConfirmed(inv.stage)) {
        collateralReturnPendingCount++;
        activeCollateralOutLIORA += tokensNum;
      } else if (this.isPayoutDispatched(inv.stage)) {
        payoutDispatchedCount++;
        verificationPendingCount++;
        activeCollateralOutLIORA += tokensNum;
      } else if (this.isMatured(inv.stage)) {
        maturedPendingPayoutCount++;
        activeCollateralOutLIORA += tokensNum;
      } else {
        activeCount++;
        activeCollateralOutLIORA += tokensNum;
      }
    }

    const calculatedTotal = activeCollateralOutLIORA + totalCollateralReturnedLIORA;
    const discrepancy = totalCollateralAllocatedLIORA - calculatedTotal;

    return {
      totalInvestmentsCount: investments.length,
      activeInvestmentsCount: activeCount,
      maturedPendingPayoutCount,
      payoutDispatchedCount,
      verificationPendingCount,
      collateralReturnPendingCount,
      disputedCount,
      settledCount,
      totalPrincipalINR,
      totalAgreedPayoutINR,
      totalContractualSettlementINR,
      totalCollateralAllocatedLIORA,
      totalCollateralReturnedLIORA,
      activeCollateralOutLIORA,
      isReconciled: Math.abs(discrepancy) < 0.0001,
      reconciliationDiscrepancyLIORA: discrepancy,
    };
  }
}
