# LIORA COIN — Sprint 3C Backend Implementation Report

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Genesis Launch:** 4 December 2026  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented exclusively by confirmed manual cash payout and collateral-return requirements.

---

## 1. Executive Summary

Sprint 3C elevates the LIORA COIN investment settlement architecture from a frontend prototype into a persistent, authenticated, and mathematically rigorous backend system. 

Key technical deliverables implemented in Sprint 3C:
1. **Exact 18-Decimal ERC-20 Integer Precision (`BigInt`):** Completely eliminated floating-point approximations in `ManualSettlementEngine.returnCollateral` and `ProportionalAllocationEngine.verifyExactCollateralReturn`. Verification compares atomic base units ($10^{-18}$ wei) with zero floating-point drift.
2. **Global Payment Reference Registry & Normalization (`PaymentReferenceRegistry`):** Provider-specific normalization for IMPS, RTGS, NEFT, Kenyan M-Pesa, and USDT on BSC Testnet. Canonical scoping `${provider}:${normalizedRef}:${environment}` prevents a single payment reference from settling multiple investment plans, while providing an auditable correction workflow.
3. **Persistent Settlement Ledger Store (`SettlementPersistentStore`):** Development database backed by persistent storage (`data/settlement_storage_dev.json`) surviving server restarts, equipped with an in-process concurrency mutex, idempotency manager, and strict service-layer immutability guards.
4. **Authenticated REST APIs:** Development backend routes under `/api/settlement/*` with server-side role-based authorization, rejecting unverified browser-provided roles or raw query parameters.
5. **Settlement Integrity Guardrails:** Payout initiation cannot mark an investment settled; payment verification and collateral return are separately evidenced; and settlement completion requires both verified payment and exact original token return.

---

## 2. Architecture & Component Specifications

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           OXENIQ FRONTEND                              │
  │  ┌──────────────────────────────┐    ┌──────────────────────────────┐  │
  │  │  InvestorSettlementPortal    │    │    AdminSettlementConsole    │  │
  │  └──────────────┬───────────────┘    └──────────────┬───────────────┘  │
  └─────────────────┼───────────────────────────────────┼──────────────────┘
                    │                                   │
                    ▼                                   ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │              CLIENT HOOK & CACHE: useManualSettlement                  │
  │     (Synchronizes with backend APIs; gracefully handles sandbox)       │
  └─────────────────┬───────────────────────────────────┬──────────────────┘
                    │                                   │
                    ▼                                   ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                    NEXT.JS SERVER-SIDE REST APIs                       │
  │  • GET  /api/settlement/investments  • POST /api/settlement/payout     │
  │  • GET  /api/settlement/status       • POST /api/settlement/verify     │
  │  • POST /api/settlement/collateral   • POST /api/settlement/dispute    │
  └─────────────────┬───────────────────────────────────┬──────────────────┘
                    │                                   │
                    ▼                                   ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                 SETTLEMENT BACKEND SERVICES & LEDGER                   │
  │                                                                        │
  │  ┌───────────────────────────┐       ┌──────────────────────────────┐  │
  │  │  SettlementPersistentStore│◄──────┤   PaymentReferenceRegistry   │  │
  │  │  • Atomic Mutex Lock      │       │   • Provider Normalization   │  │
  │  │  • Idempotency Engine     │       │   • Global Uniqueness Check  │  │
  │  │  • Immutability Guards    │       │   • Audited Correction Flow  │  │
  │  └─────────────┬─────────────┘       └──────────────────────────────┘  │
  │                │                                                       │
  │                ▼                                                       │
  │  ┌───────────────────────────┐       ┌──────────────────────────────┐  │
  │  │ProportionalAllocationEng. │       │      SettlementAuth (RBAC)   │  │
  │  │• verifyExactCollateralRet │       │   • Session Token / SIWE     │  │
  │  │• BigInt 18-Decimal Base   │       │   • Treasury Owner Validation│  │
  │  └───────────────────────────┘       └──────────────────────────────┘  │
  └─────────────────┬──────────────────────────────────────────────────────┘
                    │
                    ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                     PERSISTENT STORAGE ENGINE                          │
  │   data/settlement_storage_dev.json (Development Persistent Store)      │
  │   Prisma / PostgreSQL Relational Mirror (Production Ready)             │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Implementations

### 3.1 Task 1: Exact Base Unit Precision (`ProportionalAllocationEngine`)
- **File:** `apps/web/src/lib/allocation/proportionalAllocationEngine.ts`
- **Method:** `ProportionalAllocationEngine.verifyExactCollateralReturn(expectedBaseUnits, received)`
- **Logic:**
  - Evaluates both expected and received quantities in atomic wei base units ($10^{18}$).
  - Accepts BigInt atomic base units (`625000000000000000000000n`), formatted decimal strings (`"625000"` or `"4166.666666666666666666"`), or formatted numbers.
  - Computes `diff = receivedBaseUnits - expectedBaseUnits`.
  - Equality is valid if and only if `diff === 0n`.
  - Any drift (even $\pm 1$ wei) returns `isValid: false` and records the exact discrepancy in wei.

### 3.2 Task 2: Payment Reference Registry & Provider Normalization
- **File:** `apps/web/src/lib/settlement/paymentReferenceRegistry.ts`
- **Normalization Engine (`normalizePaymentReference`):**
  - **IMPS (`IMPS_BANK_TRANSFER`):** Strips bank prefix, "UTR", hyphens, spaces; converts to uppercase alphanumeric. Example: `'HDFC-UTR-8923471029481'` $\rightarrow$ `'HDFCUTR8923471029481'`. Canonical key: `IMPS:HDFCUTR8923471029481:BSC_TESTNET`.
  - **RTGS (`RTGS_WIRE`):** Strips prefixes and delimiters. Example: `'RTGS/SBIN/2026/998877'` $\rightarrow$ `RTGS:SBIN2026998877:BSC_TESTNET`.
  - **NEFT (`NEFT_BANK_TRANSFER`):** Canonical uppercase alphanumeric key.
  - **M-Pesa (`MPESA_MOBILE_MONEY`):** Kenyan mobile money receipt codes (e.g. `'MPESA-QGH8910234'` $\rightarrow$ `MPESA:QGH8910234:BSC_TESTNET`).
  - **USDT Testnet (`USDT_TESTNET_TRANSFER`):** Enforces 66-character lowercase hex hash starting with `0x`.
- **Global Uniqueness:**
  - When `registerReference` is called, the canonical key is queried. If active for a different investment, it is rejected with `DUPLICATE_PAYMENT_REFERENCE`.
  - Re-registering for the *same* investment is idempotent.
- **Correction Workflow:**
  - `PaymentReferenceRegistry.correctReference`: Marks the erroneous reference as `CORRECTED`, logs reason and timestamp, and activates the new reference.

### 3.3 Task 3: Persistent Settlement Store (`SettlementPersistentStore`)
- **File:** `apps/web/src/lib/server/settlement/settlementPersistentStore.ts`
- **Persistence:** Stored in `data/settlement_storage_dev.json`, retaining all investments, dispatched payout details, payment verification receipts, collateral return transaction hashes, and append-only audit events.
- **Allocation Immutability:** `validateImmutability` verifies that `originalCollateralTokensBaseUnits`, `contractualSettlementINR`, `planId`, and `initialAllocationPriceINR` cannot be mutated after creation.
- **Concurrency Control:** `withLock` chains promises to serialize state-changing operations, preventing race conditions during concurrent payouts or returns.
- **Idempotency:** Mutating operations accept an optional `idempotencyKey` and cache results to prevent double-execution.

### 3.4 Task 4: Authenticated REST APIs
- **Routes Created:**
  1. `GET /api/settlement/investments`: Fetches investments. Scoped by investor wallet when called by an investor; all investments returned when called by verified admin.
  2. `GET /api/settlement/status?id=INV-xxx`: Fetches status, reconciliation, and audit logs.
  3. `POST /api/settlement/payout`: Admin records fiat payout (enforcing reference uniqueness).
  4. `PUT /api/settlement/payout`: Admin corrects payout reference with audit reason.
  5. `POST /api/settlement/verify`: Records independent payment confirmation.
  6. `POST /api/settlement/collateral`: Records collateral return transaction and verifies exact base units.
  7. `POST /api/settlement/dispute`: Investor opens payment dispute.
  8. `PUT /api/settlement/dispute`: Admin resolves dispute.

---

## 4. Verification & Conformance

- **Task 1 Precision:** Verified by automated unit tests covering whole tokens, fractional tokens, 18-decimal precision, high magnitude values, and 1-wei mismatch rejections.
- **Task 2 Uniqueness:** Verified by duplicate UTR registration tests and correction workflow validations.
- **Task 3 Persistence:** Tested by simulating server restart and re-loading persisted records from `data/settlement_storage_dev.json`.
- **Task 4 RBAC:** Validated by rejection of unauthorized callers and session verification tests.
- **Task 5 Integrity:** All 8 integrity constraints tested and enforced.

---
*Certified by LIORA Protocol Technical Architecture Team.*
