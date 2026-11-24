# LIORA COIN — Sprint 3C Security and Data Integrity Report

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Genesis Launch:** 4 December 2026  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented exclusively by confirmed manual cash payout and collateral-return requirements.

---

## 1. Security Architecture & Threat Model

Sprint 3C hardens the LIORA COIN investment and settlement system against financial, operational, and concurrency risks.

### Core Security Threat Matrix & Defenses:

| Threat Category | Potential Attack / Vulnerability Vector | Sprint 3C Defense Mechanism |
|---|---|---|
| **Precision & Floating-Point Drift** | Truncation or floating-point rounding exploits allow returning partial collateral or draining funds. | **Atomic Wei Base Unit Comparison (`BigInt`):** Strict integer comparison `diff === 0n` in $10^{-18}$ wei units. Eliminates JavaScript IEEE 754 float comparison. |
| **Payment Reference Replay** | Malicious or careless operator uses one bank UTR or M-Pesa receipt to settle multiple investment contracts. | **Global Unique Reference Registry (`PaymentReferenceRegistry`):** Canonical key scoping `${rail}:${normalizedRef}:${env}` rejects cross-investment reuse. |
| **Premature Settlement Completion** | Operator initiates payout and marks investment as settled without investor bank receipt or collateral return. | **Two-Party Evidence Separation:** Stage cannot transition to `SETTLED` without BOTH verified fiat receipt AND confirmed original collateral return. |
| **Client-Side Role Spoofing** | Attacker modifies request headers or browser state (e.g. `x-user-role: ADMIN`) to record payouts or resolve disputes. | **Server-Side Identity Verification (`settlementAuth.ts`):** Session cookie verification, SIWE challenge validation, and cryptographic wallet address verification. |
| **Race Conditions & Double-Settlement** | Rapid concurrent requests trigger parallel state changes, bypassing balance checks or uniqueness validations. | **In-Process Mutex Queue (`withLock`):** Mutating operations are sequentially chained; duplicate requests are handled via idempotency keys. |
| **Post-Allocation Repricing Risk** | Token price shifts on PancakeSwap or scheduled price increments alter an investor's collateral or payout entitlement. | **Service-Layer Immutability Guards:** Allocation records stamped with `isImmutable: true`; any update altering base units or contractual settlement value throws `IMMUTABLE_ALLOCATION_VIOLATION`. |
| **Custodial Risk & Centralized Seizure** | Platform administrators attempt to claw back or seize tokens from user wallets. | **Non-Custodial Smart Contract Invariants (`LioraTokenImmutable.sol`):** Zero administrative transfer controls, zero blacklists, zero pause, zero token seizure functions. |

---

## 2. In-Depth Security & Integrity Implementations

### 2.1 Exact Base-Unit Integer Verification
- JavaScript `number` uses IEEE 754 double-precision floating-point, providing only 53 bits of mantissa (approx. 15–17 decimal digits of precision). Because LIORA uses 18 decimal places ($10^{18}$ wei), token amounts exceeding a few thousand tokens cannot be accurately represented by standard floating-point numbers.
- In `ProportionalAllocationEngine.verifyExactCollateralReturn`:
  - Quantities are strictly handled as `bigint`.
  - Scaled integer division is computed as:
    $$\text{diff} = \text{receivedBaseUnits} - \text{expectedBaseUnits}$$
  - A difference of even $+1$ wei ($10^{-18}$ LIORA) or $-1$ wei results in an immediate `COLLATERAL_QUANTITY_MISMATCH` rejection.

### 2.2 Global Payment Reference Registry & Deduplication
- Banking rails (IMPS, RTGS, NEFT) and mobile money systems (Kenyan M-Pesa) issue unique transaction reference numbers.
- To prevent accidental or fraudulent replay:
  1. References are normalized to remove punctuation, whitespace, and formatting variations:
     `"  HDFC-UTR-8923471029481  "` $\rightarrow$ `"HDFCUTR8923471029481"`.
  2. A canonical key is generated: `IMPS:HDFCUTR8923471029481:BSC_TESTNET`.
  3. When an admin attempts to record a payout for `Investment B` with a reference already registered to `Investment A`, the operation is aborted with:
     ```text
     DUPLICATE_PAYMENT_REFERENCE: Payment reference "HDFC-UTR-8923471029481" 
     (normalized key: IMPS:HDFCUTR8923471029481:BSC_TESTNET) has already been 
     registered for investment INV-2026-001. One verified payment reference 
     cannot settle multiple investments.
     ```
  4. If a typo occurred during administrative entry, an explicit `correctPayoutReference` workflow allows updating the reference, which marks the old reference as `CORRECTED` with a mandatory reason in the audit log.

### 2.3 Two-Party Separation of Evidence
- Under the manual settlement model confirmed by management:
  - Step 1: Lock-in term completes (matured).
  - Step 2: Company owner manually transfers cash fiat to investor off-chain (`PAYMENT_DISPATCHED`).
  - Step 3: Independent verification or investor confirmation of cash receipt (`PAYMENT_INDEPENDENTLY_VERIFIED`).
  - Step 4: Investor returns the exact original collateral tokens (`SETTLEMENT_COMPLETED`).
- The state machine strictly prohibits skipping Step 3:
  - `recordCollateralReturn` verifies that `paymentVerification` exists.
  - Payout initiation alone (`recordManualPayout`) sets stage to `PAYMENT_DISPATCHED`, strictly preventing premature closure.

### 2.4 Server-Side Role-Based Authorization
- `apps/web/src/lib/server/settlement/settlementAuth.ts` enforces that:
  - Admin endpoints (`recordManualPayout`, `correctPayoutReference`, `resolveDispute`) verify either an authenticated session with `role === 'ADMIN'` or the authorized treasury wallet (`0x000000000000000000000000000000000000dEaD`).
  - Investor endpoints (`investor investments`, `verifyPayment`, `recordCollateralReturn`, `raiseDispute`) verify that the caller is the registered investor address for that contract.
  - Browser-supplied query parameters or unverified headers are strictly rejected.

### 2.5 Blockchain Collateral Return Verification Boundary
- When an investor submits a collateral return transaction:
  - Format is verified as a valid 66-character hex string starting with `0x`.
  - Token address is pinned to LIORA Testnet Contract (`0xeD155E37D0a400E63202cE031Fc1C984B18E7999`).
  - Destination address is verified against `AUTHORIZED_TREASURY_WALLET`.
  - Network is pinned to BSC Testnet (Chain ID `97`).
  - Because testnet transactions do not involve real money, all completed returns are marked with `sandboxMode: "TESTNET_SANDBOX_SIMULATION"`, explicitly preventing production settlement until mainnet on-chain oracle verification is activated.

---

## 3. Immutability & Audit Trail Integrity

Every lifecycle action produces an immutable audit event recorded in `SettlementAuditLog`:
```typescript
interface SettlementAuditLog {
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
```
- Audit events are append-only.
- The service layer contains no deletion or update methods for audit logs.
- In `data/settlement_storage_dev.json`, the audit trail preserves the complete provenance of every investment from creation to final settlement.

---
*Report certified by LIORA Protocol Security & Compliance Team.*
