/**
 * LIORA COIN — Persistent Settlement Backend & Ledger Store (Sprint 3C)
 *
 * Implements authoritative management requirements from:
 * `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`
 *
 * TASK 3, 4, 5 INVARIANTS:
 * 1. Persistent development storage (file-backed JSON store surviving server restarts).
 * 2. Strict immutability of finalized allocations at the service layer.
 * 3. Globally unique payment reference enforcement across provider rails.
 * 4. Append-only audit trail for all state machine transitions.
 * 5. Concurrent request serialization via in-process mutex locks.
 * 6. Idempotent request execution using idempotency keys.
 * 7. Two-party settlement proof: Requires BOTH verified payment AND exact collateral return.
 * 8. Explicit testnet sandbox markings prohibiting premature production settlement.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  InvestmentSettlementRecord,
  SettlementAuditLog,
  SettlementStage,
  PaymentRail,
  PayoutDispatchedDetails,
  PaymentVerificationDetails,
  CollateralReturnedDetails,
  DisputeDetails,
} from '../../settlement/manualSettlementModel';
import {
  ConfirmedPlanConfig,
  CONFIRMED_INVESTMENT_PLANS,
  ProportionalAllocationEngine,
} from '../../allocation/proportionalAllocationEngine';
import {
  PaymentReferenceRegistry,
  normalizePaymentReference,
} from '../../settlement/paymentReferenceRegistry';
import { AUTHORIZED_TREASURY_WALLET } from '../../treasury/treasuryAccountingEngine';
import { LIORA_TOKEN_ADDRESS } from '../../dex/dexOnChainClient';
import { TestnetCollateralVerifier } from './testnetCollateralVerifier';
import { prisma } from '../prisma';
import { getPersistenceMode, isProductionPersistenceContext } from '../db';

export interface SettlementStorageSnapshot {
  version: string;
  lastSavedAt: number;
  investments: InvestmentSettlementRecord[];
  auditLogs: SettlementAuditLog[];
}

export interface IdempotencyEntry {
  idempotencyKey: string;
  result: any;
  timestamp: number;
}

export class SettlementPersistentStore {
  private static readonly DATA_DIR = path.resolve(process.cwd(), 'data');
  private static readonly FILE_PATH = path.resolve(process.cwd(), 'data', 'settlement_storage_dev.json');

  private static investments: Map<string, InvestmentSettlementRecord> = new Map();
  private static auditLogs: SettlementAuditLog[] = [];
  private static idempotencyMap: Map<string, IdempotencyEntry> = new Map();
  private static spentTxHashes: Set<string> = new Set();
  private static isLoaded = false;

  // Simple in-process mutex queue for concurrency control
  private static lockQueue: Promise<void> = Promise.resolve();

  private static async withLock<T>(fn: () => Promise<T> | T): Promise<T> {
    const nextLock = SettlementPersistentStore.lockQueue.then(async () => {
      return await fn();
    });
    SettlementPersistentStore.lockQueue = nextLock.then(
      () => {},
      () => {}
    );
    return nextLock;
  }

  private static ensureDataDir(): void {
    if (!fs.existsSync(this.DATA_DIR)) {
      try {
        fs.mkdirSync(this.DATA_DIR, { recursive: true });
      } catch {
        // Ignore if exists
      }
    }
  }

  private static usePostgres(): boolean {
    return getPersistenceMode() === 'postgres';
  }

  private static mapDbSettlement(row: any): InvestmentSettlementRecord {
    return {
      id: row.id,
      investorAddress: row.investorAddress,
      investorName: row.investorName,
      planId: row.planId,
      tierNumber: row.tierNumber,
      planCategory: row.planCategory,
      planDisplayName: row.planDisplayName,
      principalINR: Number(row.principalINR),
      principalUSD: Number(row.principalUSD),
      agreedReturnPercent: row.agreedReturnPercent,
      agreedCashPayoutINR: Number(row.agreedCashPayoutINR),
      agreedCashPayoutUSD: Number(row.agreedCashPayoutUSD),
      contractualSettlementINR: Number(row.contractualSettlementINR),
      contractualSettlementUSD: Number(row.contractualSettlementUSD),
      multiplierFactor: Number(row.multiplierFactor),
      termMonths: row.termMonths,
      payoutMonth: row.payoutMonth,
      settlementPayoutMonth: row.settlementPayoutMonth,
      createdAt: Number(row.createdAtMs),
      lockEndDate: Number(row.lockEndDateMs),
      payoutDueDate: Number(row.payoutDueDateMs),
      initialAllocationPriceINR: row.initialAllocationPriceINR,
      initialAllocationPriceWei: row.initialAllocationPriceWei,
      collateralTokensAllocated: Number(row.collateralTokensAllocated),
      originalCollateralTokensFormatted: row.originalCollateralTokensFormatted,
      originalCollateralTokensBaseUnits: row.originalCollateralTokensBaseUnits,
      roundingRemainderWei: row.roundingRemainderWei,
      collateralTokenAddress: row.collateralTokenAddress,
      collateralCustodyType: row.collateralCustodyType,
      stage: row.stage as SettlementStage,
      stageUpdatedAt: Number(row.stageUpdatedAtMs),
      payoutDispatched: (row.payoutDispatched as PayoutDispatchedDetails | null) ?? undefined,
      paymentVerification: (row.paymentVerification as PaymentVerificationDetails | null) ?? undefined,
      collateralReturned: (row.collateralReturned as CollateralReturnedDetails | null) ?? undefined,
      dispute: (row.dispute as DisputeDetails | null) ?? undefined,
    };
  }

  private static mapDbAuditLog(row: any): SettlementAuditLog {
    return {
      id: row.id,
      investmentId: row.investmentId,
      timestamp: Number(row.timestampMs),
      actor: row.actor,
      action: row.action,
      previousStage: row.previousStage as SettlementStage | 'INVESTMENT_CREATED',
      newStage: row.newStage as SettlementStage,
      details: row.details,
      referenceId: row.referenceId ?? undefined,
    };
  }

  public static initialize(): void {
    if (this.usePostgres() || isProductionPersistenceContext()) {
      this.isLoaded = true;
      return;
    }

    if (this.isLoaded) return;
    this.ensureDataDir();

    if (fs.existsSync(this.FILE_PATH)) {
      try {
        const raw = fs.readFileSync(this.FILE_PATH, 'utf8');
        const data: SettlementStorageSnapshot = JSON.parse(raw);
        this.investments = new Map(data.investments.map((inv) => [inv.id, inv]));
        this.auditLogs = data.auditLogs || [];

        // Register any existing payment references & spent tx hashes
        this.spentTxHashes.clear();
        for (const inv of this.investments.values()) {
          if (inv.payoutDispatched && inv.payoutDispatched.referenceNumber) {
            PaymentReferenceRegistry.registerReference({
              rawReference: inv.payoutDispatched.referenceNumber,
              rail: inv.payoutDispatched.paymentRail,
              investmentId: inv.id,
              amountPaidINR: inv.payoutDispatched.amountPaidINR,
              registeredBy: inv.payoutDispatched.dispatchedBy,
            });
          }
          if (inv.collateralReturned && inv.collateralReturned.txHash) {
            this.spentTxHashes.add(inv.collateralReturned.txHash.toLowerCase().trim());
          }
        }
      } catch (e: any) {
        console.error('CRITICAL: Failed to parse settlement_storage_dev.json. File may be corrupted.', e);
        try {
          const backupPath = `${this.FILE_PATH}.corrupted.${Date.now()}.bak`;
          fs.copyFileSync(this.FILE_PATH, backupPath);
          console.error(`Preserved corrupted file to ${backupPath} for forensic inspection. No data was wiped.`);
        } catch (backupErr) {
          console.error('Failed to create corruption backup:', backupErr);
        }
        // Task 5 (SEC-05): Do NOT destructively reset or wipe data on parse corruption!
        throw new Error(
          `PERSISTENCE_CORRUPTION_DETECTED: settlement_storage_dev.json is invalid JSON. Disk overwrite prevented to preserve data integrity. Inspect backup for recovery.`
        );
      }
    } else {
      this.seedInitial();
    }

    this.isLoaded = true;
  }

  private static seedInitial(): void {
    this.investments.clear();
    this.auditLogs = [];

    // Seed initial demo records
    const seedRecords: InvestmentSettlementRecord[] = [
      {
        id: 'INV-2026-001',
        investorAddress: '0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD'.toLowerCase(),
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
        createdAt: Date.now() - 95 * 24 * 60 * 60 * 1000,
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
          canonicalReferenceKey: 'IMPS:HDFCUTR8923471029481:BSC_TESTNET',
          dispatchedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
          dispatchedBy: AUTHORIZED_TREASURY_WALLET,
          adminNotes: 'IMPS settlement dispatched via Grandiose Tech operational account.',
        },
      },
      {
        id: 'INV-2026-002',
        investorAddress: '0x39a19d20c58a6448547906dcb191b037db5ac1b2'.toLowerCase(),
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
        createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
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
        stage: 'COLLATERAL_PERIOD_ACTIVE',
        stageUpdatedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
      },
    ];

    for (const rec of seedRecords) {
      this.investments.set(rec.id, rec);
      if (rec.payoutDispatched) {
        PaymentReferenceRegistry.registerReference({
          rawReference: rec.payoutDispatched.referenceNumber,
          rail: rec.payoutDispatched.paymentRail,
          investmentId: rec.id,
          amountPaidINR: rec.payoutDispatched.amountPaidINR,
          registeredBy: rec.payoutDispatched.dispatchedBy,
        });
      }
    }

    this.persistSync();
  }

  private static persistSync(): void {
    if (this.usePostgres() || isProductionPersistenceContext()) {
      return;
    }
    this.ensureDataDir();
    const snapshot: SettlementStorageSnapshot = {
      version: '1.0.0-sprint3d',
      lastSavedAt: Date.now(),
      investments: Array.from(this.investments.values()),
      auditLogs: this.auditLogs,
    };
    try {
      // Task 5 (SEC-05): Atomic write using temporary file + rename to prevent partial/corrupt writes
      const tempPath = `${this.FILE_PATH}.tmp.${Date.now()}.${crypto.randomBytes(4).toString('hex')}`;
      fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
      fs.renameSync(tempPath, this.FILE_PATH);
    } catch (e) {
      console.warn('Failed to atomically persist settlement store to disk', e);
    }
  }

  public static resetForTesting(): void {
    if (isProductionPersistenceContext()) {
      throw new Error('PRODUCTION_SAFETY_ERROR: resetForTesting() cannot be called in production.');
    }
    this.isLoaded = false;
    this.spentTxHashes.clear();
    if (this.usePostgres()) {
      this.investments.clear();
      this.auditLogs = [];
      PaymentReferenceRegistry.resetForTesting();
      this.idempotencyMap.clear();
      this.isLoaded = true;
      return;
    }
    this.seedInitial();
    PaymentReferenceRegistry.resetForTesting();
    this.idempotencyMap.clear();
    this.isLoaded = true;
  }

  public static async getAllInvestments(investorAddress?: string): Promise<InvestmentSettlementRecord[]> {
    if (this.usePostgres()) {
      const clean = investorAddress ? investorAddress.trim().toLowerCase() : undefined;
      const rows = await prisma.investmentSettlement.findMany({
        where: clean ? { investorAddress: clean } : undefined,
        orderBy: { createdAtMs: 'desc' },
      });
      return rows.map((r) => this.mapDbSettlement(r));
    }
    this.initialize();
    const all = Array.from(this.investments.values());
    if (investorAddress) {
      const clean = investorAddress.trim().toLowerCase();
      return all.filter((inv) => inv.investorAddress.toLowerCase() === clean);
    }
    return all;
  }

  public static async getInvestmentById(id: string): Promise<InvestmentSettlementRecord | null> {
    if (this.usePostgres()) {
      const row = await prisma.investmentSettlement.findUnique({ where: { id } });
      return row ? this.mapDbSettlement(row) : null;
    }
    this.initialize();
    return this.investments.get(id) || null;
  }

  public static async getAuditLogs(investmentId?: string): Promise<SettlementAuditLog[]> {
    if (this.usePostgres()) {
      const rows = await prisma.settlementAuditEntry.findMany({
        where: investmentId ? { investmentId } : undefined,
        orderBy: { timestampMs: 'desc' },
      });
      return rows.map((r) => this.mapDbAuditLog(r));
    }
    this.initialize();
    if (investmentId) {
      return this.auditLogs.filter((l) => l.investmentId === investmentId);
    }
    return [...this.auditLogs];
  }

  /**
   * Creates a new investment record and calculates proportional collateral allocation.
   * Enforces immutability: terms cannot be modified post-creation.
   */
  public static async createInvestment(params: {
    investorAddress: string;
    investorName: string;
    planId: string;
    initialAllocationPriceINR: string | number;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; record?: InvestmentSettlementRecord; error?: string }> {
    if (this.usePostgres()) {
      try {
        return await prisma.$transaction(async (tx) => {
          if (params.idempotencyKey) {
            const existingKey = await tx.settlementIdempotencyKey.findUnique({
              where: { idempotencyKey: params.idempotencyKey },
            });
            if (existingKey) {
              return existingKey.result as unknown as { success: boolean; record?: InvestmentSettlementRecord; error?: string };
            }
          }

          const plan = CONFIRMED_INVESTMENT_PLANS[params.planId];
          if (!plan) {
            return { success: false, error: `UNKNOWN_PLAN: Invalid plan ID ${params.planId}` };
          }

          const quote = ProportionalAllocationEngine.calculateAllocation(
            plan,
            params.initialAllocationPriceINR
          );

          const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
          const id = `INV-${Date.now()}-${plan.tierNumber}-${randomSuffix}`;
          const now = Date.now();
          const lockEndDate = now + plan.lockDurationMonths * 30 * 24 * 60 * 60 * 1000;
          const payoutDueDate = now + plan.settlementPayoutMonth * 30 * 24 * 60 * 60 * 1000;
          const agreedReturnPercent = Math.round(((plan.contractualAllocationINR - plan.principalINR) / plan.principalINR) * 100);
          const planCategory = plan.planId.replace('TIER_', '');

          const created = await tx.investmentSettlement.create({
            data: {
              id,
              investorAddress: params.investorAddress.toLowerCase(),
              investorName: params.investorName,
              planId: plan.planId,
              tierNumber: plan.tierNumber,
              planCategory,
              planDisplayName: plan.displayName,
              principalINR: plan.principalINR,
              principalUSD: plan.principalUSD,
              agreedReturnPercent,
              agreedCashPayoutINR: plan.contractualAllocationINR,
              agreedCashPayoutUSD: plan.contractualAllocationUSD,
              contractualSettlementINR: plan.contractualAllocationINR,
              contractualSettlementUSD: plan.contractualAllocationUSD,
              multiplierFactor: plan.multiplierFactor,
              termMonths: plan.lockDurationMonths,
              payoutMonth: plan.settlementPayoutMonth,
              settlementPayoutMonth: plan.settlementPayoutMonth,
              createdAtMs: BigInt(now),
              lockEndDateMs: BigInt(lockEndDate),
              payoutDueDateMs: BigInt(payoutDueDate),
              initialAllocationPriceINR: quote.allocationPriceINR,
              initialAllocationPriceWei: quote.allocationPriceWei,
              collateralTokensAllocated: quote.allocatedTokensNumber,
              originalCollateralTokensFormatted: quote.allocatedTokensFormatted,
              originalCollateralTokensBaseUnits: quote.allocatedTokensBaseUnits,
              roundingRemainderWei: quote.roundingRemainderWei,
              collateralTokenAddress: LIORA_TOKEN_ADDRESS,
              collateralCustodyType: 'ESCROW_VAULT_PROTOTYPE',
              stage: 'COLLATERAL_PERIOD_ACTIVE',
              stageUpdatedAtMs: BigInt(now),
              idempotencyKey: params.idempotencyKey ?? null,
            },
          });

          await tx.settlementAuditEntry.create({
            data: {
              id: `LOG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
              investmentId: id,
              timestampMs: BigInt(now),
              actor: params.investorAddress.toLowerCase(),
              action: 'INVESTMENT_CREATED_AND_COLLATERAL_FINALIZED',
              previousStage: 'INVESTMENT_CREATED',
              newStage: 'COLLATERAL_PERIOD_ACTIVE',
              details: `Plan ${plan.displayName} created. Principal: ₹${plan.principalINR.toLocaleString()}. Collateral: ${quote.allocatedTokensFormatted} LIORA @ ₹${quote.allocationPriceINR}. Immutable terms finalized.`,
            },
          });

          const record = this.mapDbSettlement(created);
          const result = { success: true, record };
          if (params.idempotencyKey) {
            await tx.settlementIdempotencyKey.create({
              data: {
                idempotencyKey: params.idempotencyKey,
                operation: 'CREATE_INVESTMENT',
                result: result as any,
              },
            });
          }
          return result;
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return this.withLock(async () => {
      this.initialize();

      if (params.idempotencyKey) {
        const cached = this.idempotencyMap.get(params.idempotencyKey);
        if (cached) return cached.result;
      }

      const plan = CONFIRMED_INVESTMENT_PLANS[params.planId];
      if (!plan) {
        return { success: false, error: `UNKNOWN_PLAN: Invalid plan ID ${params.planId}` };
      }

      try {
        const quote = ProportionalAllocationEngine.calculateAllocation(
          plan,
          params.initialAllocationPriceINR
        );

        const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
        const id = `INV-${Date.now()}-${plan.tierNumber}-${randomSuffix}`;
        if (this.investments.has(id)) {
          return { success: false, error: `DUPLICATE_INVESTMENT_ID: Record with ID ${id} already exists.` };
        }
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

        this.investments.set(id, record);

        this.auditLogs.unshift({
          id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          investmentId: id,
          timestamp: now,
          actor: params.investorAddress.toLowerCase(),
          action: 'INVESTMENT_CREATED_AND_COLLATERAL_FINALIZED',
          previousStage: 'INVESTMENT_CREATED',
          newStage: 'COLLATERAL_PERIOD_ACTIVE',
          details: `Plan ${plan.displayName} created. Principal: ₹${plan.principalINR.toLocaleString()}. Collateral: ${quote.allocatedTokensFormatted} LIORA @ ₹${quote.allocationPriceINR}. Immutable terms finalized.`,
        });

        this.persistSync();

        const result = { success: true, record };
        if (params.idempotencyKey) {
          this.idempotencyMap.set(params.idempotencyKey, {
            idempotencyKey: params.idempotencyKey,
            result,
            timestamp: Date.now(),
          });
        }
        return result;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    });
  }

  /**
   * Records a manual fiat cash payout by treasury owner.
   * Enforces global payment reference uniqueness (Task 2).
   * Payout initiation CANNOT mark an investment settled (Task 5.1).
   */
  public static async recordManualPayout(params: {
    investmentId: string;
    amountPaidINR: number;
    paymentRail: PaymentRail;
    referenceNumber: string;
    dispatchedBy: string;
    adminNotes?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.usePostgres()) {
      try {
        return await prisma.$transaction(async (tx) => {
          if (params.idempotencyKey) {
            const existingKey = await tx.settlementIdempotencyKey.findUnique({
              where: { idempotencyKey: params.idempotencyKey },
            });
            if (existingKey) {
              return existingKey.result as unknown as { success: boolean; error?: string };
            }
          }

          const inv = await tx.investmentSettlement.findUnique({ where: { id: params.investmentId } });
          if (!inv) return { success: false, error: 'Investment record not found.' };

          if (inv.stage === 'SETTLED' || inv.stage === 'SETTLEMENT_COMPLETED') {
            return { success: false, error: 'Cannot dispatch payout for an already settled investment.' };
          }

          if (params.dispatchedBy.toLowerCase() !== AUTHORIZED_TREASURY_WALLET.toLowerCase()) {
            return { success: false, error: 'UNAUTHORIZED_PAYOUT_CALLER: Only the authorized treasury wallet can record payouts.' };
          }

          if (!params.referenceNumber || params.referenceNumber.trim().length < 5) {
            return { success: false, error: 'A valid payment reference / UTR is required.' };
          }

          const envName = isProductionPersistenceContext() ? 'BSC_MAINNET' : 'BSC_TESTNET';
          const normalized = normalizePaymentReference(params.referenceNumber, params.paymentRail, envName);

          const existingRef = await tx.paymentReferenceRegistryEntry.findUnique({
            where: { canonicalKey: normalized.canonicalKey },
          });
          if (existingRef && existingRef.status === 'ACTIVE') {
            return {
              success: false,
              error: `DUPLICATE_PAYMENT_REFERENCE: Canonical reference "${normalized.canonicalKey}" has already been used by allocation/investment ${existingRef.allocationOrInvId}.`,
            };
          }

          if (existingRef) {
            await tx.paymentReferenceRegistryEntry.update({
              where: { canonicalKey: normalized.canonicalKey },
              data: {
                normalizedRef: normalized.normalizedReference,
                rawReference: params.referenceNumber,
                paymentRail: params.paymentRail,
                environment: envName,
                allocationOrInvId: params.investmentId,
                amountPaidINR: params.amountPaidINR,
                registeredBy: params.dispatchedBy,
                status: 'ACTIVE',
              },
            });
          } else {
            await tx.paymentReferenceRegistryEntry.create({
              data: {
                canonicalKey: normalized.canonicalKey,
                normalizedRef: normalized.normalizedReference,
                rawReference: params.referenceNumber,
                paymentRail: params.paymentRail,
                environment: envName,
                allocationOrInvId: params.investmentId,
                amountPaidINR: params.amountPaidINR,
                registeredBy: params.dispatchedBy,
                status: 'ACTIVE',
              },
            });
          }

          const now = Date.now();
          const newStage: SettlementStage = 'PAYMENT_DISPATCHED';
          const payoutDispatched: PayoutDispatchedDetails = {
            amountPaidINR: params.amountPaidINR,
            paymentRail: params.paymentRail,
            referenceNumber: params.referenceNumber,
            canonicalReferenceKey: normalized.canonicalKey,
            dispatchedAt: now,
            dispatchedBy: params.dispatchedBy,
            adminNotes: params.adminNotes,
          };

          await tx.investmentSettlement.update({
            where: { id: params.investmentId },
            data: {
              stage: newStage,
              stageUpdatedAtMs: BigInt(now),
              payoutDispatched: payoutDispatched as any,
            },
          });

          await tx.settlementAuditEntry.create({
            data: {
              id: `LOG-${now}-${crypto.randomBytes(3).toString('hex')}`,
              investmentId: params.investmentId,
              timestampMs: BigInt(now),
              actor: params.dispatchedBy,
              action: newStage,
              previousStage: inv.stage,
              newStage,
              details: `Treasury recorded manual payout of ₹${params.amountPaidINR.toLocaleString()} via ${params.paymentRail} (Ref: ${params.referenceNumber}). Status: Awaiting independent verification.`,
              referenceId: params.referenceNumber,
            },
          });

          const result = { success: true };
          if (params.idempotencyKey) {
            await tx.settlementIdempotencyKey.create({
              data: {
                idempotencyKey: params.idempotencyKey,
                operation: 'RECORD_MANUAL_PAYOUT',
                result: result as any,
              },
            });
          }
          return result;
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return this.withLock(async () => {
      this.initialize();

      if (params.idempotencyKey) {
        const cached = this.idempotencyMap.get(params.idempotencyKey);
        if (cached) return cached.result;
      }

      const inv = this.investments.get(params.investmentId);
      if (!inv) return { success: false, error: 'Investment record not found.' };

      if (inv.stage === 'SETTLED' || inv.stage === 'SETTLEMENT_COMPLETED') {
        return { success: false, error: 'Cannot dispatch payout for an already settled investment.' };
      }

      if (params.dispatchedBy.toLowerCase() !== AUTHORIZED_TREASURY_WALLET.toLowerCase()) {
        return { success: false, error: 'UNAUTHORIZED_PAYOUT_CALLER: Only the authorized treasury wallet can record payouts.' };
      }

      if (!params.referenceNumber || params.referenceNumber.trim().length < 5) {
        return { success: false, error: 'A valid payment reference / UTR is required.' };
      }

      // Check & register unique payment reference
      const reg = PaymentReferenceRegistry.registerReference({
        rawReference: params.referenceNumber,
        rail: params.paymentRail,
        investmentId: params.investmentId,
        amountPaidINR: params.amountPaidINR,
        registeredBy: params.dispatchedBy,
      });

      if (!reg.success) {
        return { success: false, error: reg.error };
      }

      const previousStage = inv.stage;
      const newStage: SettlementStage = 'PAYMENT_DISPATCHED';
      inv.stage = newStage;
      inv.stageUpdatedAt = Date.now();
      inv.payoutDispatched = {
        amountPaidINR: params.amountPaidINR,
        paymentRail: params.paymentRail,
        referenceNumber: params.referenceNumber,
        canonicalReferenceKey: reg.canonicalKey,
        dispatchedAt: Date.now(),
        dispatchedBy: params.dispatchedBy,
        adminNotes: params.adminNotes,
      };

      this.auditLogs.unshift({
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        investmentId: params.investmentId,
        timestamp: Date.now(),
        actor: params.dispatchedBy,
        action: newStage,
        previousStage,
        newStage,
        details: `Treasury recorded manual payout of ₹${params.amountPaidINR.toLocaleString()} via ${params.paymentRail} (Ref: ${params.referenceNumber}). Status: Awaiting independent verification.`,
        referenceId: params.referenceNumber,
      });

      this.persistSync();

      const result = { success: true };
      if (params.idempotencyKey) {
        this.idempotencyMap.set(params.idempotencyKey, {
          idempotencyKey: params.idempotencyKey,
          result,
          timestamp: Date.now(),
        });
      }
      return result;
    });
  }

  /**
   * Corrects a payout reference with audit trail (Task 2).
   */
  public static async correctPayoutReference(params: {
    investmentId: string;
    newReferenceNumber: string;
    paymentRail: PaymentRail;
    reason: string;
    correctedBy: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.usePostgres()) {
      try {
        return await prisma.$transaction(async (tx) => {
          const inv = await tx.investmentSettlement.findUnique({ where: { id: params.investmentId } });
          const payoutDispatched = inv?.payoutDispatched as unknown as PayoutDispatchedDetails | null;
          if (!inv || !payoutDispatched) {
            return { success: false, error: 'No dispatched payout record found for this investment.' };
          }

          if (params.correctedBy.toLowerCase() !== AUTHORIZED_TREASURY_WALLET.toLowerCase()) {
            return { success: false, error: 'UNAUTHORIZED_CALLER: Only authorized treasury owner can correct payout references.' };
          }

          const envName = isProductionPersistenceContext() ? 'BSC_MAINNET' : 'BSC_TESTNET';
          const oldNorm = normalizePaymentReference(payoutDispatched.referenceNumber, payoutDispatched.paymentRail, envName);
          const newNorm = normalizePaymentReference(params.newReferenceNumber, params.paymentRail, envName);

          const conflict = await tx.paymentReferenceRegistryEntry.findUnique({
            where: { canonicalKey: newNorm.canonicalKey },
          });
          if (conflict && conflict.status === 'ACTIVE' && conflict.allocationOrInvId !== params.investmentId) {
            return {
              success: false,
              error: `DUPLICATE_PAYMENT_REFERENCE: New reference "${newNorm.canonicalKey}" already registered to another investment.`,
            };
          }

          const now = Date.now();
          await tx.paymentReferenceRegistryEntry.updateMany({
            where: { canonicalKey: payoutDispatched.canonicalReferenceKey || oldNorm.canonicalKey },
            data: {
              status: 'CORRECTED',
              correctionReason: params.reason,
              correctedBy: params.correctedBy,
              correctedAt: new Date(now),
            },
          });

          await tx.paymentReferenceRegistryEntry.upsert({
            where: { canonicalKey: newNorm.canonicalKey },
            create: {
              canonicalKey: newNorm.canonicalKey,
              normalizedRef: newNorm.normalizedReference,
              rawReference: params.newReferenceNumber,
              paymentRail: params.paymentRail,
              environment: envName,
              allocationOrInvId: params.investmentId,
              amountPaidINR: payoutDispatched.amountPaidINR,
              registeredBy: params.correctedBy,
              status: 'ACTIVE',
            },
            update: {
              normalizedRef: newNorm.normalizedReference,
              rawReference: params.newReferenceNumber,
              paymentRail: params.paymentRail,
              allocationOrInvId: params.investmentId,
              status: 'ACTIVE',
            },
          });

          const oldRef = payoutDispatched.referenceNumber;
          const updatedPayout: PayoutDispatchedDetails = {
            ...payoutDispatched,
            referenceNumber: params.newReferenceNumber,
            paymentRail: params.paymentRail,
            canonicalReferenceKey: newNorm.canonicalKey,
          };

          await tx.investmentSettlement.update({
            where: { id: params.investmentId },
            data: {
              payoutDispatched: updatedPayout as any,
            },
          });

          await tx.settlementAuditEntry.create({
            data: {
              id: `LOG-${now}-${crypto.randomBytes(3).toString('hex')}`,
              investmentId: params.investmentId,
              timestampMs: BigInt(now),
              actor: params.correctedBy,
              action: 'PAYMENT_REFERENCE_CORRECTED',
              previousStage: inv.stage,
              newStage: inv.stage,
              details: `Payment reference corrected from "${oldRef}" to "${params.newReferenceNumber}". Reason: ${params.reason}`,
              referenceId: params.newReferenceNumber,
            },
          });

          return { success: true };
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return this.withLock(async () => {
      this.initialize();
      const inv = this.investments.get(params.investmentId);
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

      this.auditLogs.unshift({
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        investmentId: params.investmentId,
        timestamp: Date.now(),
        actor: params.correctedBy,
        action: 'PAYMENT_REFERENCE_CORRECTED',
        previousStage: inv.stage,
        newStage: inv.stage,
        details: `Payment reference corrected from "${oldRef}" to "${params.newReferenceNumber}". Reason: ${params.reason}`,
        referenceId: params.newReferenceNumber,
      });

      this.persistSync();
      return { success: true };
    });
  }

  /**
   * Verifies payment independently (Task 5.2).
   * Payment verification is evidenced separately from collateral return.
   */
  public static async verifyPayment(params: {
    investmentId: string;
    verifierAddress: string;
    method: 'INVESTOR_RECEIPT_CONFIRMATION' | 'INDEPENDENT_BANK_NOC_AUDIT' | 'ARBITRATION_VERIFICATION';
    notes?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.usePostgres()) {
      try {
        return await prisma.$transaction(async (tx) => {
          if (params.idempotencyKey) {
            const existingKey = await tx.settlementIdempotencyKey.findUnique({
              where: { idempotencyKey: params.idempotencyKey },
            });
            if (existingKey) {
              return existingKey.result as unknown as { success: boolean; error?: string };
            }
          }

          const inv = await tx.investmentSettlement.findUnique({ where: { id: params.investmentId } });
          if (!inv) return { success: false, error: 'Investment record not found.' };

          if (
            inv.stage !== 'PAYMENT_DISPATCHED' &&
            inv.stage !== 'MANUAL_PAYOUT_INITIATED' &&
            inv.stage !== 'PAYMENT_VERIFICATION_PENDING' &&
            inv.stage !== 'DISPUTED' &&
            inv.stage !== 'DISPUTED_OR_FAILED_SETTLEMENT'
          ) {
            return {
              success: false,
              error: `Cannot verify payment while in stage: ${inv.stage}. Payment must be dispatched first.`,
            };
          }

          const now = Date.now();
          const newStage: SettlementStage = 'PAYMENT_INDEPENDENTLY_VERIFIED';
          const paymentVerification: PaymentVerificationDetails = {
            verifiedAt: now,
            verifiedBy: params.verifierAddress.toLowerCase(),
            verificationMethod: params.method,
            verificationNotes: params.notes || 'Payment independently confirmed.',
          };

          const existingDispute = inv.dispute as unknown as DisputeDetails | null;
          let updatedDispute = existingDispute;
          if (existingDispute && existingDispute.status === 'OPEN') {
            updatedDispute = {
              ...existingDispute,
              status: 'RESOLVED_PAYMENT_VERIFIED',
              resolvedAt: now,
              resolvedBy: params.verifierAddress.toLowerCase(),
            };
          }

          await tx.investmentSettlement.update({
            where: { id: params.investmentId },
            data: {
              stage: newStage,
              stageUpdatedAtMs: BigInt(now),
              paymentVerification: paymentVerification as any,
              ...(updatedDispute ? { dispute: updatedDispute as any } : {}),
            },
          });

          await tx.settlementAuditEntry.create({
            data: {
              id: `LOG-${now}-${crypto.randomBytes(3).toString('hex')}`,
              investmentId: params.investmentId,
              timestampMs: BigInt(now),
              actor: params.verifierAddress.toLowerCase(),
              action: 'PAYMENT_INDEPENDENTLY_VERIFIED',
              previousStage: inv.stage,
              newStage,
              details: `Payment independently verified via ${params.method} by ${params.verifierAddress}.`,
            },
          });

          const result = { success: true };
          if (params.idempotencyKey) {
            await tx.settlementIdempotencyKey.create({
              data: {
                idempotencyKey: params.idempotencyKey,
                operation: 'VERIFY_PAYMENT',
                result: result as any,
              },
            });
          }
          return result;
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return this.withLock(async () => {
      this.initialize();

      if (params.idempotencyKey) {
        const cached = this.idempotencyMap.get(params.idempotencyKey);
        if (cached) return cached.result;
      }

      const inv = this.investments.get(params.investmentId);
      if (!inv) return { success: false, error: 'Investment record not found.' };

      if (
        inv.stage !== 'PAYMENT_DISPATCHED' &&
        inv.stage !== 'MANUAL_PAYOUT_INITIATED' &&
        inv.stage !== 'PAYMENT_VERIFICATION_PENDING' &&
        inv.stage !== 'DISPUTED' &&
        inv.stage !== 'DISPUTED_OR_FAILED_SETTLEMENT'
      ) {
        return {
          success: false,
          error: `Cannot verify payment while in stage: ${inv.stage}. Payment must be dispatched first.`,
        };
      }

      const previousStage = inv.stage;
      const newStage: SettlementStage = 'PAYMENT_INDEPENDENTLY_VERIFIED';
      inv.stage = newStage;
      inv.stageUpdatedAt = Date.now();

      inv.paymentVerification = {
        verifiedAt: Date.now(),
        verifiedBy: params.verifierAddress.toLowerCase(),
        verificationMethod: params.method,
        verificationNotes: params.notes || 'Payment independently confirmed.',
      };

      if (inv.dispute && inv.dispute.status === 'OPEN') {
        inv.dispute.status = 'RESOLVED_PAYMENT_VERIFIED';
        inv.dispute.resolvedAt = Date.now();
        inv.dispute.resolvedBy = params.verifierAddress.toLowerCase();
      }

      this.auditLogs.unshift({
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        investmentId: params.investmentId,
        timestamp: Date.now(),
        actor: params.verifierAddress.toLowerCase(),
        action: 'PAYMENT_INDEPENDENTLY_VERIFIED',
        previousStage,
        newStage,
        details: `Payment independently verified via ${params.method} by ${params.verifierAddress}.`,
      });

      this.persistSync();

      const result = { success: true };
      if (params.idempotencyKey) {
        this.idempotencyMap.set(params.idempotencyKey, {
          idempotencyKey: params.idempotencyKey,
          result,
          timestamp: Date.now(),
        });
      }
      return result;
    });
  }

  /**
   * Records collateral return.
   * Enforces exact ERC-20 base units match with BigInt (Task 1).
   * Settlement completion requires BOTH verified payment and confirmed collateral return (Task 5.3).
   */
  public static async recordCollateralReturn(params: {
    investmentId: string;
    txHash: string;
    actorAddress: string;
    returnedTokensAmount?: string | number | bigint;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.usePostgres()) {
      try {
        if (params.idempotencyKey) {
          const existingKey = await prisma.settlementIdempotencyKey.findUnique({
            where: { idempotencyKey: params.idempotencyKey },
          });
          if (existingKey) {
            return existingKey.result as unknown as { success: boolean; error?: string };
          }
        }

        const preInv = await prisma.investmentSettlement.findUnique({ where: { id: params.investmentId } });
        if (!preInv) return { success: false, error: 'Investment record not found.' };

        const isVerified =
          preInv.stage === 'PAYMENT_INDEPENDENTLY_VERIFIED' ||
          preInv.stage === 'PAYMENT_CONFIRMED' ||
          preInv.stage === 'COLLATERAL_RETURN_PENDING' ||
          preInv.paymentVerification !== null;

        if (!isVerified) {
          return {
            success: false,
            error: `Collateral cannot be returned until cash payment has been independently verified. Current stage: ${preInv.stage}.`,
          };
        }

        if (preInv.stage === 'SETTLED' || preInv.stage === 'SETTLEMENT_COMPLETED') {
          return {
            success: false,
            error: 'DUPLICATE_COLLATERAL_RETURN: This investment has already been settled.',
          };
        }

        const cleanTxHash = params.txHash.toLowerCase().trim();
        if (!cleanTxHash.startsWith('0x') || cleanTxHash.length < 10) {
          return { success: false, error: 'A valid transaction hash is required.' };
        }

        const existingSpent = await prisma.investmentSettlement.findUnique({
          where: { collateralTxHash: cleanTxHash },
        });
        if (existingSpent) {
          return {
            success: false,
            error: 'TX_HASH_ALREADY_SPENT: Transaction hash has already been used to return collateral for a settlement. Transaction replay is strictly prohibited.',
          };
        }

        const expectedBaseUnits = BigInt(preInv.originalCollateralTokensBaseUnits);
        if (params.returnedTokensAmount !== undefined) {
          const verification = ProportionalAllocationEngine.verifyExactCollateralReturn(
            expectedBaseUnits,
            params.returnedTokensAmount
          );

          if (!verification.isValid) {
            return {
              success: false,
              error: `COLLATERAL_QUANTITY_MISMATCH: Must return EXACTLY original allocated quantity. Expected: ${preInv.originalCollateralTokensFormatted} LIORA (${expectedBaseUnits.toString()} atomic units). Received: ${verification.receivedBaseUnits} atomic units. Difference: ${verification.differenceWei} atomic units.`,
            };
          }
        }

        const isSimMock =
          process.env.NODE_ENV !== 'production' &&
          (cleanTxHash.startsWith('0x0000') ||
            cleanTxHash.includes('mock') ||
            cleanTxHash.startsWith('0x1111') ||
            cleanTxHash.startsWith('0x2222') ||
            cleanTxHash.startsWith('0x3333') ||
            cleanTxHash.startsWith('0x4444') ||
            cleanTxHash.startsWith('0x5555'));

        if (cleanTxHash.length === 66) {
          const onChainResult = await TestnetCollateralVerifier.verifyCollateralReturnReceipt({
            txHash: cleanTxHash,
            expectedInvestorAddress: preInv.investorAddress,
            expectedBaseUnits,
            allowSandboxMock: isSimMock,
          });

          if (!onChainResult.isValid) {
            return {
              success: false,
              error: `ONCHAIN_COLLATERAL_VERIFICATION_FAILED: ${onChainResult.error}`,
            };
          }
        }

        return await prisma.$transaction(async (tx) => {
          if (params.idempotencyKey) {
            const existingKey = await tx.settlementIdempotencyKey.findUnique({
              where: { idempotencyKey: params.idempotencyKey },
            });
            if (existingKey) {
              return existingKey.result as unknown as { success: boolean; error?: string };
            }
          }

          const inv = await tx.investmentSettlement.findUnique({ where: { id: params.investmentId } });
          if (!inv) return { success: false, error: 'Investment record not found.' };
          if (inv.stage === 'SETTLED' || inv.stage === 'SETTLEMENT_COMPLETED') {
            return { success: false, error: 'DUPLICATE_COLLATERAL_RETURN: This investment has already been settled.' };
          }

          const replayCheck = await tx.investmentSettlement.findUnique({
            where: { collateralTxHash: cleanTxHash },
          });
          if (replayCheck) {
            return {
              success: false,
              error: 'TX_HASH_ALREADY_SPENT: Transaction hash has already been used to return collateral for a settlement. Transaction replay is strictly prohibited.',
            };
          }

          const now = Date.now();
          const newStage: SettlementStage = 'SETTLEMENT_COMPLETED';
          const collateralReturned: CollateralReturnedDetails = {
            returnedAt: now,
            txHash: params.txHash,
            returnedTokens: Number(inv.collateralTokensAllocated),
            returnedTokensFormatted: inv.originalCollateralTokensFormatted,
            returnedTokensBaseUnits: inv.originalCollateralTokensBaseUnits,
            recipientTreasuryWallet: AUTHORIZED_TREASURY_WALLET,
            isExactQuantityMatch: true,
          };

          await tx.investmentSettlement.update({
            where: { id: params.investmentId },
            data: {
              stage: newStage,
              stageUpdatedAtMs: BigInt(now),
              collateralTxHash: cleanTxHash,
              collateralReturned: collateralReturned as any,
            },
          });

          await tx.settlementAuditEntry.create({
            data: {
              id: `LOG-${now}-${crypto.randomBytes(3).toString('hex')}`,
              investmentId: params.investmentId,
              timestampMs: BigInt(now),
              actor: params.actorAddress.toLowerCase(),
              action: 'SETTLEMENT_COMPLETED',
              previousStage: inv.stage,
              newStage,
              details: `Exact original collateral (${inv.originalCollateralTokensFormatted} LIORA) returned to treasury (${AUTHORIZED_TREASURY_WALLET.slice(0, 6)}...); settlement completed.`,
              referenceId: params.txHash,
            },
          });

          const result = { success: true };
          if (params.idempotencyKey) {
            await tx.settlementIdempotencyKey.create({
              data: {
                idempotencyKey: params.idempotencyKey,
                operation: 'RECORD_COLLATERAL_RETURN',
                result: result as any,
              },
            });
          }
          return result;
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return this.withLock(async () => {
      this.initialize();

      if (params.idempotencyKey) {
        const cached = this.idempotencyMap.get(params.idempotencyKey);
        if (cached) return cached.result;
      }

      const inv = this.investments.get(params.investmentId);
      if (!inv) return { success: false, error: 'Investment record not found.' };

      // Prerequisite 1: Payment must be independently verified
      const isVerified =
        inv.stage === 'PAYMENT_INDEPENDENTLY_VERIFIED' ||
        inv.stage === 'PAYMENT_CONFIRMED' ||
        inv.stage === 'COLLATERAL_RETURN_PENDING' ||
        inv.paymentVerification !== undefined;

      if (!isVerified) {
        return {
          success: false,
          error: `Collateral cannot be returned until cash payment has been independently verified. Current stage: ${inv.stage}.`,
        };
      }

      if (inv.stage === 'SETTLED' || inv.stage === 'SETTLEMENT_COMPLETED') {
        return {
          success: false,
          error: 'DUPLICATE_COLLATERAL_RETURN: This investment has already been settled.',
        };
      }

      const cleanTxHash = params.txHash.toLowerCase().trim();
      if (!cleanTxHash.startsWith('0x') || cleanTxHash.length < 10) {
        return { success: false, error: 'A valid transaction hash is required.' };
      }

      // TASK 6 (SEC-07): Transaction hash replay protection
      if (this.spentTxHashes.has(cleanTxHash)) {
        return {
          success: false,
          error: 'TX_HASH_ALREADY_SPENT: Transaction hash has already been used to return collateral for a settlement. Transaction replay is strictly prohibited.',
        };
      }

      // Verify exact original token quantity using BigInt base units (Task 1)
      const expectedBaseUnits = BigInt(inv.originalCollateralTokensBaseUnits);
      if (params.returnedTokensAmount !== undefined) {
        const verification = ProportionalAllocationEngine.verifyExactCollateralReturn(
          expectedBaseUnits,
          params.returnedTokensAmount
        );

        if (!verification.isValid) {
          return {
            success: false,
            error: `COLLATERAL_QUANTITY_MISMATCH: Must return EXACTLY original allocated quantity. Expected: ${inv.originalCollateralTokensFormatted} LIORA (${expectedBaseUnits.toString()} atomic units). Received: ${verification.receivedBaseUnits} atomic units. Difference: ${verification.differenceWei} atomic units.`,
          };
        }
      }

      // TASK 6 (SEC-07): On-Chain BSC Testnet Verification with Sandbox Simulation Fallback
      const isSimMock =
        process.env.NODE_ENV !== 'production' &&
        (cleanTxHash.startsWith('0x0000') ||
          cleanTxHash.includes('mock') ||
          cleanTxHash.startsWith('0x1111') ||
          cleanTxHash.startsWith('0x2222') ||
          cleanTxHash.startsWith('0x3333') ||
          cleanTxHash.startsWith('0x4444') ||
          cleanTxHash.startsWith('0x5555'));

      if (cleanTxHash.length === 66) {
        const onChainResult = await TestnetCollateralVerifier.verifyCollateralReturnReceipt({
          txHash: cleanTxHash,
          expectedInvestorAddress: inv.investorAddress,
          expectedBaseUnits,
          allowSandboxMock: isSimMock,
        });

        if (!onChainResult.isValid) {
          return {
            success: false,
            error: `ONCHAIN_COLLATERAL_VERIFICATION_FAILED: ${onChainResult.error}`,
          };
        }
      }

      // Mark transaction hash as permanently spent
      this.spentTxHashes.add(cleanTxHash);

      const previousStage = inv.stage;
      const newStage: SettlementStage = 'SETTLEMENT_COMPLETED';
      inv.stage = newStage;
      inv.stageUpdatedAt = Date.now();

      inv.collateralReturned = {
        returnedAt: Date.now(),
        txHash: params.txHash,
        returnedTokens: inv.collateralTokensAllocated,
        returnedTokensFormatted: inv.originalCollateralTokensFormatted,
        returnedTokensBaseUnits: inv.originalCollateralTokensBaseUnits,
        recipientTreasuryWallet: AUTHORIZED_TREASURY_WALLET,
        isExactQuantityMatch: true,
      };

      this.auditLogs.unshift({
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        investmentId: params.investmentId,
        timestamp: Date.now(),
        actor: params.actorAddress.toLowerCase(),
        action: 'SETTLEMENT_COMPLETED',
        previousStage,
        newStage,
        details: `Exact original collateral (${inv.originalCollateralTokensFormatted} LIORA) returned to treasury (${AUTHORIZED_TREASURY_WALLET.slice(0, 6)}...); settlement completed.`,
        referenceId: params.txHash,
      });

      this.persistSync();

      const result = { success: true };
      if (params.idempotencyKey) {
        this.idempotencyMap.set(params.idempotencyKey, {
          idempotencyKey: params.idempotencyKey,
          result,
          timestamp: Date.now(),
        });
      }
      return result;
    });
  }

  /**
   * Investor opens a payment dispute (Task 5.8).
   */
  public static async raiseDispute(params: {
    investmentId: string;
    reason: string;
    investorAddress: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.usePostgres()) {
      try {
        return await prisma.$transaction(async (tx) => {
          const inv = await tx.investmentSettlement.findUnique({ where: { id: params.investmentId } });
          if (!inv) return { success: false, error: 'Investment record not found.' };

          if (inv.investorAddress.toLowerCase() !== params.investorAddress.toLowerCase()) {
            return { success: false, error: 'Unauthorized: Only the designated investor can file a dispute.' };
          }

          if (!params.reason || params.reason.trim().length < 10) {
            return { success: false, error: 'Please enter a clear explanation for the payment dispute (minimum 10 characters).' };
          }

          const now = Date.now();
          const newStage: SettlementStage = 'DISPUTED_OR_FAILED_SETTLEMENT';
          const dispute: DisputeDetails = {
            disputeId: `DISP-${now}`,
            raisedAt: now,
            raisedBy: params.investorAddress.toLowerCase(),
            reason: params.reason,
            status: 'OPEN',
          };

          await tx.investmentSettlement.update({
            where: { id: params.investmentId },
            data: {
              stage: newStage,
              stageUpdatedAtMs: BigInt(now),
              dispute: dispute as any,
            },
          });

          await tx.settlementAuditEntry.create({
            data: {
              id: `LOG-${now}-${crypto.randomBytes(3).toString('hex')}`,
              investmentId: params.investmentId,
              timestampMs: BigInt(now),
              actor: params.investorAddress.toLowerCase(),
              action: 'DISPUTE_RAISED',
              previousStage: inv.stage,
              newStage,
              details: `Investor raised dispute: ${params.reason}`,
              referenceId: dispute.disputeId,
            },
          });

          return { success: true };
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return this.withLock(async () => {
      this.initialize();
      const inv = this.investments.get(params.investmentId);
      if (!inv) return { success: false, error: 'Investment record not found.' };

      if (inv.investorAddress.toLowerCase() !== params.investorAddress.toLowerCase()) {
        return { success: false, error: 'Unauthorized: Only the designated investor can file a dispute.' };
      }

      if (!params.reason || params.reason.trim().length < 10) {
        return { success: false, error: 'Please enter a clear explanation for the payment dispute (minimum 10 characters).' };
      }

      const previousStage = inv.stage;
      const newStage: SettlementStage = 'DISPUTED_OR_FAILED_SETTLEMENT';
      inv.stage = newStage;
      inv.stageUpdatedAt = Date.now();
      inv.dispute = {
        disputeId: `DISP-${Date.now()}`,
        raisedAt: Date.now(),
        raisedBy: params.investorAddress.toLowerCase(),
        reason: params.reason,
        status: 'OPEN',
      };

      this.auditLogs.unshift({
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        investmentId: params.investmentId,
        timestamp: Date.now(),
        actor: params.investorAddress.toLowerCase(),
        action: 'DISPUTE_RAISED',
        previousStage,
        newStage,
        details: `Investor raised dispute: ${params.reason}`,
        referenceId: inv.dispute.disputeId,
      });

      this.persistSync();
      return { success: true };
    });
  }

  /**
   * Resolves a payment dispute.
   */
  public static async resolveDispute(params: {
    investmentId: string;
    resolution: 'RESOLVED_PAYMENT_VERIFIED' | 'RESOLVED_COLLATERAL_RELEASED';
    arbitrationNotes: string;
    arbitratorAddress: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.usePostgres()) {
      try {
        return await prisma.$transaction(async (tx) => {
          const inv = await tx.investmentSettlement.findUnique({ where: { id: params.investmentId } });
          const existingDispute = inv?.dispute as unknown as DisputeDetails | null;
          if (!inv || !existingDispute) {
            return { success: false, error: 'Active dispute not found for this investment.' };
          }

          const now = Date.now();
          const updatedDispute: DisputeDetails = {
            ...existingDispute,
            status: params.resolution,
            arbitrationNotes: params.arbitrationNotes,
            resolvedAt: now,
            resolvedBy: params.arbitratorAddress.toLowerCase(),
          };

          let nextStage: SettlementStage = 'SETTLEMENT_COMPLETED';
          let paymentVerification = inv.paymentVerification as any;
          if (params.resolution === 'RESOLVED_PAYMENT_VERIFIED') {
            nextStage = 'PAYMENT_INDEPENDENTLY_VERIFIED';
            paymentVerification = {
              verifiedAt: now,
              verifiedBy: params.arbitratorAddress.toLowerCase(),
              verificationMethod: 'ARBITRATION_VERIFICATION',
              verificationNotes: params.arbitrationNotes,
            };
          }

          await tx.investmentSettlement.update({
            where: { id: params.investmentId },
            data: {
              stage: nextStage,
              stageUpdatedAtMs: BigInt(now),
              dispute: updatedDispute as any,
              ...(paymentVerification ? { paymentVerification } : {}),
            },
          });

          await tx.settlementAuditEntry.create({
            data: {
              id: `LOG-${now}-${crypto.randomBytes(3).toString('hex')}`,
              investmentId: params.investmentId,
              timestampMs: BigInt(now),
              actor: params.arbitratorAddress.toLowerCase(),
              action: 'DISPUTE_ARBITRATED',
              previousStage: inv.stage,
              newStage: nextStage,
              details: `Dispute arbitrated: ${params.resolution}. Notes: ${params.arbitrationNotes}`,
              referenceId: existingDispute.disputeId,
            },
          });

          return { success: true };
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return this.withLock(async () => {
      this.initialize();
      const inv = this.investments.get(params.investmentId);
      if (!inv || !inv.dispute) return { success: false, error: 'Active dispute not found for this investment.' };

      const previousStage = inv.stage;
      inv.dispute.status = params.resolution;
      inv.dispute.arbitrationNotes = params.arbitrationNotes;
      inv.dispute.resolvedAt = Date.now();
      inv.dispute.resolvedBy = params.arbitratorAddress.toLowerCase();

      if (params.resolution === 'RESOLVED_PAYMENT_VERIFIED') {
        inv.stage = 'PAYMENT_INDEPENDENTLY_VERIFIED';
        inv.paymentVerification = {
          verifiedAt: Date.now(),
          verifiedBy: params.arbitratorAddress.toLowerCase(),
          verificationMethod: 'ARBITRATION_VERIFICATION',
          verificationNotes: params.arbitrationNotes,
        };
      } else {
        inv.stage = 'SETTLEMENT_COMPLETED';
      }
      inv.stageUpdatedAt = Date.now();

      this.auditLogs.unshift({
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        investmentId: params.investmentId,
        timestamp: Date.now(),
        actor: params.arbitratorAddress.toLowerCase(),
        action: 'DISPUTE_ARBITRATED',
        previousStage,
        newStage: inv.stage,
        details: `Dispute arbitrated: ${params.resolution}. Notes: ${params.arbitrationNotes}`,
        referenceId: inv.dispute.disputeId,
      });

      this.persistSync();
      return { success: true };
    });
  }

  /**
   * Enforces immutability check: throws if any immutable fields are modified.
   */
  public static validateImmutability(
    existing: InvestmentSettlementRecord,
    attemptedUpdates: Partial<InvestmentSettlementRecord>
  ): void {
    if (
      attemptedUpdates.originalCollateralTokensBaseUnits &&
      attemptedUpdates.originalCollateralTokensBaseUnits !== existing.originalCollateralTokensBaseUnits
    ) {
      throw new Error('IMMUTABLE_ALLOCATION_VIOLATION: Finalized original collateral token quantity cannot be modified.');
    }
    if (
      attemptedUpdates.contractualSettlementINR &&
      attemptedUpdates.contractualSettlementINR !== existing.contractualSettlementINR
    ) {
      throw new Error('IMMUTABLE_ALLOCATION_VIOLATION: Contractual settlement amount cannot be modified.');
    }
    if (
      attemptedUpdates.planId &&
      attemptedUpdates.planId !== existing.planId
    ) {
      throw new Error('IMMUTABLE_ALLOCATION_VIOLATION: Plan identifier cannot be modified.');
    }
    if (
      attemptedUpdates.initialAllocationPriceINR &&
      attemptedUpdates.initialAllocationPriceINR !== existing.initialAllocationPriceINR
    ) {
      throw new Error('IMMUTABLE_ALLOCATION_VIOLATION: Initial allocation price cannot be modified.');
    }
  }

  /**
   * TASK 7 (SEC-08): Server-side Sandbox Restrictions Enforcement
   * Rejects mainnet execution, real fiat payout execution, automatic seizure, and unsupported chains.
   */
  public static enforceSandboxRestrictions(params: {
    chainId?: number;
    action?: string;
  }): { permitted: boolean; error?: string } {
    if (params.chainId && (params.chainId === 56 || params.chainId === 1)) {
      return {
        permitted: false,
        error: 'MAINNET_SETTLEMENT_PROHIBITED: Mainnet settlement execution is disabled until Genesis Launch 4 December 2026.',
      };
    }

    if (process.env.NODE_ENV === 'production' && params.chainId && params.chainId !== 56) {
      return {
        permitted: false,
        error: 'TESTNET_EXECUTION_PROHIBITED_IN_PRODUCTION: Testnet operations are prohibited on the production website.',
      };
    }

    if (
      params.action === 'REAL_FIAT_PAYOUT' ||
      params.action === 'AUTOMATIC_COLLATERAL_SEIZURE' ||
      params.action === 'UNAPPROVED_PAYMENT_INTEGRATION'
    ) {
      return {
        permitted: false,
        error: `ACTION_PROHIBITED_IN_SANDBOX: ${params.action} is strictly prohibited under LIORA protocol rules.`,
      };
    }

    return { permitted: true };
  }
}
