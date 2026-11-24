# LIORA COIN — Sprint 3D: Backend Integration & Architecture Report

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Primary Blockchain:** BNB Smart Chain (Testnet Chain ID `97`, Mainnet Chain ID `56`)  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented exclusively by confirmed manual cash payout and collateral-return requirements.

---

## 1. Integration Architecture Overview

Sprint 3D establishes the unified end-to-end integration between the client frontend dashboards and the authoritative backend settlement service.

```mermaid
sequenceDiagram
    autonumber
    actor Investor as Investor Web3 Client
    participant Frontend as useManualSettlement (React Hook)
    participant Auth as settlementAuth Gateway
    participant API as Next.js REST API (/api/settlement/*)
    participant Store as SettlementPersistentStore
    participant Blockchain as BSC Testnet RPC (viem)
    actor Owner as Grandiose Tech Treasury Owner

    %% Phase 1: Creation & Collateral Locking
    Note over Investor,Store: Phase 1: Proportional Allocation & Collateral Finalization
    Investor->>Frontend: Select Plan & Request Allocation Quote
    Frontend->>API: POST /api/settlement/investments (with SIWE auth)
    API->>Auth: Validate Investor Session / Signed Challenge
    Auth-->>API: Authorized (INVESTOR)
    API->>Store: createInvestment (Calculates exact quote & assigns collision-resistant ID)
    Store-->>API: Investment Created (Original Collateral Fixed)
    API-->>Frontend: Investment Record JSON

    %% Phase 2: Lock-in Period & Matured State
    Note over Investor,Store: Phase 2: Lock-In Duration Active (e.g. 3 Months for Tier 01)
    Store->>Store: Term expires; enters Matured state (Month 4)

    %% Phase 3: Manual Off-Chain Payout Dispatch
    Note over Owner,Store: Phase 3: Off-Chain Manual Cash Remittance
    Owner->>Frontend: Dispatches Bank Wire (IMPS/RTGS/M-Pesa)
    Frontend->>API: POST /api/settlement/payout (with Admin Session)
    API->>Auth: requireSettlementAdmin
    Auth-->>API: Authorized (ADMIN)
    API->>Store: recordManualPayout (Validates and registers unique reference)
    Store-->>API: Payout Dispatched Status
    API-->>Frontend: Status: PAYMENT_DISPATCHED

    %% Phase 4: Independent Payment Verification
    Note over Investor,Store: Phase 4: Independent Payment Verification
    Investor->>Frontend: Confirm Cash Received in Bank Account
    Frontend->>API: POST /api/settlement/verify (with Investor Session)
    API->>Auth: requireSettlementInvestor
    Auth-->>API: Authorized (INVESTOR)
    API->>Store: verifyPayment
    Store-->>API: Status: PAYMENT_INDEPENDENTLY_VERIFIED
    API-->>Frontend: Ready for Exact Collateral Return

    %% Phase 5: On-Chain Collateral Return & Settlement Completion
    Note over Investor,Blockchain: Phase 5: Exact Collateral Return on BSC Testnet
    Investor->>Blockchain: Transfer(to: Treasury, amount: Exact Base Units)
    Blockchain-->>Investor: txHash
    Investor->>Frontend: Submit txHash for Settlement
    Frontend->>API: POST /api/settlement/collateral (txHash, amount)
    API->>Auth: requireSettlementInvestor
    API->>Store: recordCollateralReturn
    Store->>Blockchain: TestnetCollateralVerifier: Verify Receipt & Event Logs
    Blockchain-->>Store: Receipt Valid (from: Investor, to: Treasury, value: exact wei, conf >= 1)
    Store->>Store: Mark txHash permanently spent; transition to SETTLEMENT_COMPLETED
    Store-->>API: Settlement Completed
    API-->>Frontend: Final Settlement Verified
```

---

## 2. Authenticated REST API Specifications

### 2.1 `GET /api/settlement/investments`
- **Access Control:**
  - `?address=0x...`: Caller must be the designated investor or admin (`requireSettlementInvestor`). Returns investor's records.
  - Omitted address: Caller must be admin (`requireSettlementAdmin`). Returns all records.
- **Headers:** `x-chain-id` (validated by `enforceSandboxRestrictions`).
- **Response:**
  ```json
  {
    "success": true,
    "investments": [...],
    "count": 4,
    "sandboxMode": true
  }
  ```

### 2.2 `POST /api/settlement/investments`
- **Payload:**
  - `investorAddress`: `0x...` (42-char hex)
  - `investorName`: string ($\ge 2$ chars)
  - `planId`: `'TIER_01'` to `'TIER_06'`
  - `initialAllocationPriceINR`: string or number
  - `idempotencyKey`: string (optional)
- **Access Control:** Designated investor or admin (`requireSettlementInvestor`).
- **Immutability Assurance:** Computes proportional allocation, assigns collision-resistant ID `INV-${Date.now()}-${tierNumber}-${randomHex}`, and permanently freezes terms.

### 2.3 `POST /api/settlement/payout` & `PUT /api/settlement/payout`
- **POST Payload:**
  - `investmentId`: string
  - `amountPaidINR`: number (positive)
  - `paymentRail`: `'IMPS_BANK_TRANSFER' | 'RTGS_WIRE' | 'NEFT_BANK_TRANSFER' | 'MPESA_MOBILE_MONEY' | 'USDT_TESTNET_TRANSFER'`
  - `referenceNumber`: string
  - `adminNotes`: string (optional)
- **Access Control:** Admin only (`requireSettlementAdmin`).
- **PUT Payload (Reference Correction):**
  - `investmentId`: string
  - `newReferenceNumber`: string
  - `paymentRail`: PaymentRail
  - `reason`: string ($\ge 10$ chars)
- **Integrity Rule:** Old reference is permanently retired; new reference cannot collide with any active or retired reference.

### 2.4 `POST /api/settlement/verify`
- **Payload:**
  - `investmentId`: string
  - `method`: `'INVESTOR_RECEIPT_CONFIRMATION' | 'INDEPENDENT_BANK_NOC_AUDIT' | 'ARBITRATION_VERIFICATION'`
  - `notes`: string (optional)
- **Access Control:** Designated investor or admin (`requireSettlementInvestor`).
- **State Transition:** Moves from `PAYMENT_DISPATCHED` to `PAYMENT_INDEPENDENTLY_VERIFIED`.

### 2.5 `POST /api/settlement/collateral`
- **Payload:**
  - `investmentId`: string
  - `txHash`: string (66-char hex starting with `0x`)
  - `returnedTokensAmount`: string or number (optional, evaluated in exact atomic units)
- **Access Control:** Designated investor or admin (`requireSettlementInvestor`).
- **Verification Pipeline:**
  1. Replay check: Rejects if `txHash` has already been recorded for any investment.
  2. Precision check: Compares returned units to `originalCollateralTokensBaseUnits` using `diff === 0n`.
  3. On-chain receipt verification: Via `TestnetCollateralVerifier` against BSC Testnet RPC.
  4. Final state transition: Moves record to `SETTLEMENT_COMPLETED`.

### 2.6 `POST /api/settlement/dispute` & `PUT /api/settlement/dispute`
- **POST (Open Dispute):** Investor registers non-receipt of payment. Freezes collateral return.
- **PUT (Resolve Dispute):** Admin / Arbitrator records arbitration resolution.

---

## 3. Frontend Architecture & State Management

### 3.1 Hook: `useManualSettlement.ts`
- **Authoritative Backend Persistence:** Completely replaced browser `localStorage` reliance with asynchronous network synchronization.
- **Reactive State Elements:**
  - `investments`: Full array of verified investment records returned from server.
  - `userInvestments`: Filtered view based on the active Web3 wallet address.
  - `reconciliation`: Computed live using `ManualSettlementEngine.calculateReconciliation(investments)`.
  - `isLoading`: Boolean indicator during background fetch.
  - `fetchError`: Error string if network or server error occurs.
  - `isSessionExpired`: Set to `true` when API returns HTTP 401 or 403, prompting user re-authentication.
  - `retryFetch`: Callback to immediately re-trigger server synchronization.

### 3.2 Component: `InvestorSettlementPortal.tsx`
- **Dynamic Loading & Sync Banners:** Displays active sync spinner and alert modals on session expiration.
- **Proportional Allocation Disclosure:** Highlights that initial token allocation is calculated proportionally and fixed permanently for the duration of the plan.
- **Dispute Filing:** Allows investors to raise disputes if cash has not arrived after payout dispatch.
- **Collateral Return Action:** Connects directly to backend API and validates transaction receipt.

### 3.3 Component: `AdminSettlementConsole.tsx`
- **Treasury Overview:** Displays real-time reconciliation totals, dispatched payout sums, and active collateral liabilities.
- **Payout Dispatch Modal:** Validates amount and payment reference rail prior to dispatching REST call.
- **Payment Reference Correction:** Supports correcting bank typos with full audit notes.
- **Dispute Resolution:** Provides dispute resolution workflow.

---
*Report certified by LIORA Protocol Technical Audit Team.*
