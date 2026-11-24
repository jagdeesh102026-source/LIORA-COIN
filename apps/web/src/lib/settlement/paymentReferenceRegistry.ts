/**
 * LIORA COIN — Global Payment Reference Registry & Provider Normalization (Sprint 3C)
 *
 * Implements authoritative management requirements from:
 * `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`
 *
 * REQUIREMENTS:
 * 1. Globally unique payment reference validation in the settlement backend.
 * 2. Provider-specific normalization rules (IMPS, RTGS, NEFT, M-Pesa, USDT Testnet).
 * 3. Scope uniqueness appropriately by payment provider, transaction identity, and environment.
 * 4. Prevent one verified payment from settling multiple investments.
 * 5. Support correction workflows with complete audit trails.
 */

export type PaymentRail =
  | 'IMPS_BANK_TRANSFER'
  | 'RTGS_WIRE'
  | 'NEFT_BANK_TRANSFER'
  | 'MPESA_MOBILE_MONEY'
  | 'USDT_TESTNET_TRANSFER';

export interface NormalizedReferenceResult {
  rawReference: string;
  normalizedReference: string;
  canonicalKey: string;
  paymentRail: PaymentRail;
  environment: string;
}

export interface PaymentReferenceRecord {
  canonicalKey: string;
  normalizedRef: string;
  rawReference: string;
  paymentRail: PaymentRail;
  environment: string;
  investmentId: string;
  amountPaidINR: number;
  registeredBy: string;
  registeredAt: number;
  status: 'ACTIVE' | 'CORRECTED' | 'SUPERSEDED';
  correctionReason?: string;
  correctedBy?: string;
  correctedAt?: number;
}

/**
 * Normalizes payment reference strings according to provider-specific syntax rules.
 * Eliminates formatting discrepancies (hyphens, spaces, capitalization, prefixes).
 */
export function normalizePaymentReference(
  rawReference: string,
  rail: PaymentRail,
  environment: string = 'BSC_TESTNET'
): NormalizedReferenceResult {
  if (!rawReference || typeof rawReference !== 'string') {
    throw new Error('INVALID_PAYMENT_REFERENCE: Payment reference cannot be null, undefined, or non-string.');
  }

  const trimmed = rawReference.trim();
  if (trimmed.length < 4) {
    throw new Error('INVALID_PAYMENT_REFERENCE: Payment reference must be at least 4 characters long.');
  }

  let normalizedRef = '';
  let providerPrefix = '';

  switch (rail) {
    case 'IMPS_BANK_TRANSFER':
      providerPrefix = 'IMPS';
      // Strip common prefixes (e.g. "IMPS-", "UTR-"), whitespace, hyphens, slashes
      normalizedRef = trimmed
        .replace(/^(IMPS|UTR)[\-_:\s]*/i, '')
        .replace(/[\s\-_/\\.]/g, '')
        .toUpperCase();
      break;

    case 'RTGS_WIRE':
      providerPrefix = 'RTGS';
      normalizedRef = trimmed
        .replace(/^(RTGS|UTR)[\-_:\s]*/i, '')
        .replace(/[\s\-_/\\.]/g, '')
        .toUpperCase();
      break;

    case 'NEFT_BANK_TRANSFER':
      providerPrefix = 'NEFT';
      normalizedRef = trimmed
        .replace(/^(NEFT|UTR)[\-_:\s]*/i, '')
        .replace(/[\s\-_/\\.]/g, '')
        .toUpperCase();
      break;

    case 'MPESA_MOBILE_MONEY':
      providerPrefix = 'MPESA';
      // Kenyan M-Pesa receipt codes: e.g. "QGH8910234", "MPESA-QGH8910234"
      normalizedRef = trimmed
        .replace(/^(MPESA|M-PESA)[\-_:\s]*/i, '')
        .replace(/[\s\-_/\\.]/g, '')
        .toUpperCase();
      break;

    case 'USDT_TESTNET_TRANSFER':
      providerPrefix = 'TX_BSC97';
      normalizedRef = trimmed.toLowerCase();
      if (!/^0x[0-9a-f]{64}$/.test(normalizedRef)) {
        throw new Error('INVALID_TX_HASH: USDT Testnet transfer reference must be a valid 66-character hex hash starting with 0x.');
      }
      break;

    default:
      providerPrefix = 'GENERIC';
      normalizedRef = trimmed.toUpperCase();
      break;
  }

  if (normalizedRef.length < 3) {
    throw new Error(`INVALID_NORMALIZED_REF: Extracted reference "${normalizedRef}" is too short.`);
  }

  const canonicalKey = `${providerPrefix}:${normalizedRef}:${environment.toUpperCase()}`;

  return {
    rawReference: trimmed,
    normalizedReference: normalizedRef,
    canonicalKey,
    paymentRail: rail,
    environment: environment.toUpperCase(),
  };
}

export class PaymentReferenceRegistry {
  private static readonly STORAGE_KEY = 'liora_payment_references_v1';
  private static references: Map<string, PaymentReferenceRecord> = new Map();
  private static isInitialized = false;

  private static initialize(): void {
    if (this.isInitialized) return;

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const parsed: PaymentReferenceRecord[] = JSON.parse(stored);
          this.references = new Map(parsed.map((r) => [r.canonicalKey, r]));
        }
      } catch {
        // Fallback to empty map
      }
    }
    this.isInitialized = true;
  }

  private static save(): void {
    if (typeof window !== 'undefined') {
      try {
        const records = Array.from(this.references.values());
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
      } catch (e) {
        console.warn('Failed to persist payment references', e);
      }
    }
  }

  public static resetForTesting(): void {
    this.references.clear();
    this.isInitialized = true;
    this.save();
  }

  /**
   * Checks whether a payment reference is already active in the system.
   */
  public static isReferenceRegistered(
    rawReference: string,
    rail: PaymentRail,
    environment: string = 'BSC_TESTNET'
  ): { isRegistered: boolean; record?: PaymentReferenceRecord; canonicalKey: string } {
    this.initialize();
    const { canonicalKey } = normalizePaymentReference(rawReference, rail, environment);
    const existing = this.references.get(canonicalKey);
    const isRegistered = !!existing && existing.status === 'ACTIVE';
    return { isRegistered, record: existing, canonicalKey };
  }

  /**
   * Registers a payment reference to an investment.
   * Rejects duplicate registrations for different investments.
   * If re-submitted for the SAME investment with identical parameters, operation is idempotent.
   */
  public static registerReference(params: {
    rawReference: string;
    rail: PaymentRail;
    investmentId: string;
    amountPaidINR: number;
    registeredBy: string;
    environment?: string;
  }): { success: boolean; record?: PaymentReferenceRecord; canonicalKey?: string; error?: string } {
    this.initialize();

    try {
      const { canonicalKey, normalizedReference } = normalizePaymentReference(
        params.rawReference,
        params.rail,
        params.environment
      );

      const existing = this.references.get(canonicalKey);
      if (existing) {
        if (existing.status === 'ACTIVE') {
          if (existing.investmentId === params.investmentId) {
            // Idempotent retry for the same investment
            return { success: true, record: existing, canonicalKey };
          }
          // Cross-investment duplicate violation
          return {
            success: false,
            error: `DUPLICATE_PAYMENT_REFERENCE: Payment reference "${params.rawReference}" (normalized key: ${canonicalKey}) has already been registered for investment ${existing.investmentId}. One verified payment reference cannot settle multiple investments.`,
          };
        }

        // TASK 3 (SEC-03): Permanently retire corrected/superseded payment references.
        // A reference that was cancelled, rejected, or corrected can NEVER be reused to settle another investment.
        if (existing.status === 'CORRECTED' || existing.status === 'SUPERSEDED') {
          return {
            success: false,
            error: `RETIRED_PAYMENT_REFERENCE: Payment reference "${params.rawReference}" (normalized key: ${canonicalKey}) was previously corrected or superseded and is permanently retired. It cannot be reused for this or any other investment.`,
          };
        }
      }

      const record: PaymentReferenceRecord = {
        canonicalKey,
        normalizedRef: normalizedReference,
        rawReference: params.rawReference.trim(),
        paymentRail: params.rail,
        environment: (params.environment || 'BSC_TESTNET').toUpperCase(),
        investmentId: params.investmentId,
        amountPaidINR: params.amountPaidINR,
        registeredBy: params.registeredBy,
        registeredAt: Date.now(),
        status: 'ACTIVE',
      };

      this.references.set(canonicalKey, record);
      this.save();
      return { success: true, record, canonicalKey };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Corrects a previously recorded payment reference (e.g. after a bank typo or reissued wire).
   * Marks the old reference as CORRECTED with audit details and activates the new reference.
   */
  public static correctReference(params: {
    oldRawReference: string;
    newRawReference: string;
    rail: PaymentRail;
    investmentId: string;
    reason: string;
    correctedBy: string;
    environment?: string;
  }): {
    success: boolean;
    oldRecord?: PaymentReferenceRecord;
    newRecord?: PaymentReferenceRecord;
    error?: string;
  } {
    this.initialize();

    if (!params.reason || params.reason.trim().length < 10) {
      return { success: false, error: 'A valid correction reason (at least 10 characters) is required.' };
    }

    try {
      const oldNorm = normalizePaymentReference(params.oldRawReference, params.rail, params.environment);
      const newNorm = normalizePaymentReference(params.newRawReference, params.rail, params.environment);

      const oldRecord = this.references.get(oldNorm.canonicalKey);
      if (!oldRecord) {
        return { success: false, error: `Original payment reference "${params.oldRawReference}" not found in registry.` };
      }

      if (oldRecord.investmentId !== params.investmentId) {
        return { success: false, error: 'Reference does not belong to the specified investment.' };
      }

      const existingNew = this.references.get(newNorm.canonicalKey);
      if (existingNew) {
        if (existingNew.status === 'ACTIVE' && existingNew.investmentId !== params.investmentId) {
          return {
            success: false,
            error: `New payment reference "${params.newRawReference}" is already registered for investment ${existingNew.investmentId}.`,
          };
        }
        if (existingNew.status === 'CORRECTED' || existingNew.status === 'SUPERSEDED') {
          return {
            success: false,
            error: `New payment reference "${params.newRawReference}" was previously corrected or superseded and cannot be reused.`,
          };
        }
      }

      // Mark old as CORRECTED
      oldRecord.status = 'CORRECTED';
      oldRecord.correctionReason = params.reason;
      oldRecord.correctedBy = params.correctedBy;
      oldRecord.correctedAt = Date.now();

      // Register new as ACTIVE
      const newRecord: PaymentReferenceRecord = {
        canonicalKey: newNorm.canonicalKey,
        normalizedRef: newNorm.normalizedReference,
        rawReference: params.newRawReference.trim(),
        paymentRail: params.rail,
        environment: (params.environment || 'BSC_TESTNET').toUpperCase(),
        investmentId: params.investmentId,
        amountPaidINR: oldRecord.amountPaidINR,
        registeredBy: params.correctedBy,
        registeredAt: Date.now(),
        status: 'ACTIVE',
      };

      this.references.set(newNorm.canonicalKey, newRecord);
      this.save();

      return { success: true, oldRecord, newRecord };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public static getAllRecords(): PaymentReferenceRecord[] {
    this.initialize();
    return Array.from(this.references.values());
  }

  public static getRecord(canonicalKey: string): PaymentReferenceRecord | undefined {
    this.initialize();
    return this.references.get(canonicalKey);
  }
}
