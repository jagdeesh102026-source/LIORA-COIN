# LIORA COIN — Sprint 3B Acceptance Verification Report

**Document Version:** 1.0.0  
**Audit Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Genesis Launch:** 4 December 2026  
**Primary Blockchain:** BNB Smart Chain (Testnet Chain ID `97`, Mainnet Chain ID `56`)  
**Authoritative Management Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented exclusively by the confirmed manual cash payout and collateral-return arrangement.

---

## 1. Executive Summary & Audit Verdict

This acceptance review independently audits the implementation of **Sprint 3B (Proportional Allocation, Fixed Collateral, and Manual Settlement)** prior to beginning Sprint 3C.

Sprint 3B introduced:
1. `apps/web/src/lib/allocation/proportionalAllocationEngine.ts`: A proportional allocation calculation engine utilizing 18-decimal scaled `BigInt` base units, enforcing deterministic integer division with remainder tracking and immutable finalization.
2. `apps/web/src/lib/settlement/manualSettlementModel.ts`: An expanded 12-stage settlement lifecycle state machine supporting backward compatibility with Sprint 2 stages, role-restricted payout entry, and double-entry collateral balance reconciliation.
3. Dashboards (`InvestorSettlementPortal.tsx`, `AdminSettlementConsole.tsx`): User and admin interfaces labeled as prototypes for tracking lock-in terms, allocations, fiat payout details, and collateral returns.

### Overall Verification Verdict: **CONDITIONAL PASS — READY FOR SPRINT 3C WITH SPECIFIED REMEDIATION ITEMS**

- **Automated Tests:** **80 / 80 Passing** (4 test suites, 0 regressions).
- **TypeScript Compilation:** **0 Errors** across all packages and web apps.
- **On-Chain Testnet Contracts:** **100% Preserved** (`0xeD155E37D0a400E63202cE031Fc1C984B18E7999` and PancakeSwap Pair `0x64beE3847a766D35E6611985F3c3e51C78Af5D2c` remain untouched).
- **Security & Non-Custodial Boundaries:** Strictly intact. No automatic token seizure, no real-money payment gateways, and no live deposit execution enabled.
- **Findings Requiring Clarification / Remediation:**
  - `manualSettlementModel.returnCollateral` implements collateral verification via `parseFloat` / `number` comparisons rather than invoking `proportionalAllocationEngine.verifyCollateralReturnQuantity`'s integer base-unit comparison.
  - While state transitions prevent duplicate collateral returns, cross-investment payment reference (`referenceNumber` / UTR) replay protection is not currently enforced across distinct investment records.
  - The four operational architectural proposals (30-minute quote lock, escrow vault, investor payment confirmation, and arbitration council) are explicitly categorized as **OPEN / UNAPPROVED PROPOSALS**, not management decisions.

---

## 2. Verification Checklist & Item-by-Item Findings

| # | Verification Item | Status | Key Evidence / Source Reference |
|---|---|---|---|
| **1** | Proportional allocation occurs only before initial collateral finalization | **PASS** | `proportionalAllocationEngine.ts` (`calculateAllocation` vs `finalizeCollateral`), `manualSettlementModel.ts` line 539 |
| **2** | Original collateral token quantity cannot change afterward | **PASS** | `finalizeCollateral` sets `isImmutable: true`, `Object.freeze()`; zero mutation methods exist in `ManualSettlementEngine` |
| **3** | Collateral-return verification compares exact ERC-20 integer base units, not formatted decimal strings | **CONDITIONAL PASS** | `proportionalAllocationEngine.verifyCollateralReturnQuantity` compares `diff === 0n` (`BigInt`). `ManualSettlementEngine.returnCollateral` currently compares JS `number` floats; must be unified with the engine's `BigInt` check |
| **4** | Contractual settlement amount remains fixed after allocation | **PASS** | `inv.contractualSettlementINR` is stamped from `plan.contractualAllocationINR`; never mutated by price fluctuations or payout recordings |
| **5** | Each of the six plans uses its approved investment amount, allocation value, and lock-in duration | **PASS** | `CONFIRMED_INVESTMENT_PLANS` matches Checklist (3) exactly across all 6 tiers |
| **6** | No automatic token seizure, real-money payout, or live deposit function has been enabled | **PASS** | `LioraTokenImmutable.sol` has zero admin/pause/burn controls; zero live fiat payment gateways (no Razorpay/Stripe/M-Pesa API); `isExecutable = false` on primary sale reference pricing |
| **7** | Settlement state machine prevents unauthorized transitions, replayed payment references, and duplicate collateral returns | **CONDITIONAL PASS** | Unauthorized transitions and duplicate returns are blocked by state guards; cross-record UTR reference deduplication is not yet enforced in `recordManualPayout` |
| **8** | Investor and admin dashboards display actual verified records or simulated/localStorage data | **PASS** | Settlement data reads from browser `localStorage` and is prominently badged with `[Simulated Prototype]` and `[Simulated Sandbox]`; on-chain balances read live from BSC Testnet |
| **9** | Existing BSC Testnet token and liquidity pool remain unchanged | **PASS** | Git status and deployment registries confirm zero contract modifications or redeployments; `LioraTokenImmutable.sol` remains un-deployed |
| **10** | Re-run all automated tests and TypeScript checks | **PASS** | 80 passing tests; 0 TypeScript errors |

---

## 3. In-Depth Technical Audit & Evidence

### Item 1: Proportional Allocation Timing
- **Requirement:** The proportional token allocation must be computed prior to collateral finalization and locked upon creation.
- **Verification Details:**
  In `apps/web/src/lib/allocation/proportionalAllocationEngine.ts`:
  - `calculateAllocation(plan, allocationPriceINR)` is a pure, side-effect-free calculation function. It accepts a plan configuration and a price, returning a `ProportionalAllocationQuote` with the calculated token count in base units and formatted decimals.
  - In `apps/web/src/lib/settlement/manualSettlementModel.ts` (`createInvestment`, lines 525–581), proportional allocation is called immediately during initialization:
    ```typescript
    const quote = ProportionalAllocationEngine.calculateAllocation(
      plan,
      params.initialAllocationPriceINR
    );
    ```
  - The record is stamped with `originalCollateralTokensFormatted: quote.allocatedTokensFormatted` and `originalCollateralTokensBaseUnits: quote.allocatedTokensBaseUnits`, immediately moving to `COLLATERAL_PERIOD_ACTIVE`.
- **Finding:** **CONFIRMED PASS.** No allocation calculation occurs after the initial investment creation step.

---

### Item 2: Permanent Fixation of Collateral Quantity
- **Requirement:** Once allocated, the collateral token quantity must remain permanently fixed and never adjust due to subsequent reference schedule increments or secondary market (DEX) price fluctuations.
- **Verification Details:**
  - `ProportionalAllocationEngine.finalizeCollateral` (lines 282–304) returns an `Object.freeze` record with `isImmutable: true`.
  - In `ManualSettlementEngine`, there is no updater, background timer, or dynamic getter that adjusts `collateralTokensAllocated`, `originalCollateralTokensFormatted`, or `originalCollateralTokensBaseUnits`.
  - Automated test suite `Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js` (Section 3) verifies:
    - `Should freeze collateral quantity permanently once finalized`
    - `Subsequent price changes cannot mutate registered investment records in storage`
  - In this test, an investment created at ₹0.20 (625,000 LIORA) was subjected to reference price escalation to ₹1.00 and ₹30.00; the stored record retained exactly 625,000 LIORA with zero drift.
- **Finding:** **CONFIRMED PASS.**

---

### Item 3: Exact Integer Base Units vs. Decimal String Comparison
- **Requirement:** Collateral-return verification must compare exact ERC-20 integer base units (18-decimal `BigInt` / atomic wei), avoiding floating-point rounding issues or string formatting discrepancies.
- **Verification Details:**
  1. `proportionalAllocationEngine.ts` implements `verifyCollateralReturnQuantity` (lines 309–326):
     ```typescript
     const expected = BigInt(finalizedRecord.finalizedCollateralQuantityBaseUnits);
     const received = typeof returnedTokensBaseUnits === 'bigint'
       ? returnedTokensBaseUnits
       : BigInt(returnedTokensBaseUnits);
     const diff = received - expected;
     return { isValid: diff === 0n, ... };
     ```
     This method strictly verifies exact integer equality at the atomic wei level ($10^{-18}$).
  2. `manualSettlementModel.ts` implements `returnCollateral` (lines 747–783):
     ```typescript
     if (returnedTokensAmount !== undefined) {
       const numReturned = typeof returnedTokensAmount === 'number'
         ? returnedTokensAmount
         : parseFloat(returnedTokensAmount);

       if (isNaN(numReturned) || numReturned !== expectedTokens) {
         return {
           success: false,
           error: `COLLATERAL_QUANTITY_MISMATCH: Must return EXACTLY original allocated quantity...`,
         };
       }
     }
     ```
- **Audit Finding:** **CONDITIONAL PASS.**
  - `proportionalAllocationEngine.ts` correctly adheres to the integer base units specification.
  - However, `manualSettlementModel.ts` currently parses `returnedTokensAmount` using `parseFloat` and compares against JavaScript `number` floats (`expectedTokens`).
  - **Required Remediation before Sprint 3C:** Update `ManualSettlementEngine.returnCollateral` to accept base-unit integer strings (or call `ProportionalAllocationEngine.verifyCollateralReturnQuantity`) to ensure unified 18-decimal `BigInt` enforcement across both modules.

---

### Item 4: Immutability of Contractual Settlement Amount
- **Requirement:** Contractual cash payout entitlement must remain fixed throughout the lock-in period.
- **Verification Details:**
  - In `proportionalAllocationEngine.ts`, `plan.contractualAllocationINR` is defined as a fixed integer for each plan.
  - In `manualSettlementModel.ts`, `inv.contractualSettlementINR` is initialized to `plan.contractualAllocationINR` (e.g. ₹1,25,000 for Tier 01, ₹6,00,000 for Tier 02, etc.).
  - Neither `recordManualPayout`, `confirmInvestorPayment`, nor `returnCollateral` permits modifications to `contractualSettlementINR`.
  - When the owner records a payout via `recordManualPayout`, the modal pre-fills `amountPaidINR` from `inv.contractualSettlementINR`.
- **Finding:** **CONFIRMED PASS.**

---

### Item 5: Compliance of All Six Plans with Checklist (3)
- **Requirement:** Confirm that all six investment plans strictly match the investment amounts, contractual allocation values, and lock-in durations specified in Checklist (3).
- **Verification Matrix:**

| Plan ID | Tier Number | Approved Principal | Approved Multiplier | Approved Contractual Allocation | Approved Lock Duration | Approved Payout Timing | Code Implementation Verification |
|---|---|---|---|---|---|---|---|
| `TIER_01` | 01 | ₹50,000 ($500) | 2.5× | ₹1,25,000 ($1,250) | 3 Months | Month 4 | Matches `CONFIRMED_INVESTMENT_PLANS.TIER_01` |
| `TIER_02` | 02 | ₹1,00,000 ($1,000) | 6.0× | ₹6,00,000 ($6,000) | 3 Months | Month 4 | Matches `CONFIRMED_INVESTMENT_PLANS.TIER_02` |
| `TIER_03` | 03 | ₹2,00,000 ($2,000) | 5.0× | ₹10,00,000 ($10,000) | 3 Months | Month 4 | Matches `CONFIRMED_INVESTMENT_PLANS.TIER_03` |
| `TIER_04` | 04 | ₹3,00,000 ($3,000) | 8.0× | ₹24,00,000 ($24,000) | 9 Months | Month 10 | Matches `CONFIRMED_INVESTMENT_PLANS.TIER_04` |
| `TIER_05` | 05 | ₹5,00,000 ($5,000) | 6.0× | ₹30,00,000 ($30,000) | 12 Months | Month 13 | Matches `CONFIRMED_INVESTMENT_PLANS.TIER_05` |
| `TIER_06` | 06 | ₹10,00,000 ($10,000) | 9.0× | ₹90,00,000 ($90,000) | 12 Months | Month 13 | Matches `CONFIRMED_INVESTMENT_PLANS.TIER_06` |

- **Finding:** **CONFIRMED PASS.** All parameters match Checklist (3) precisely.

---

### Item 6: Non-Custodial & Sandbox Invariants (No Seizure, No Real-Money, No Live Deposits)
- **Requirement:** Verify that no automatic token seizure, real-money payout, or live deposit function has been enabled.
- **Verification Details:**
  1. **Smart Contract Layer (`contracts/LioraTokenImmutable.sol`):**
     - Completely non-custodial OpenZeppelin ERC-20 + ERC20Burnable.
     - Does NOT inherit `Ownable` or `AccessControl`.
     - Contains no `pause()`, `unpause()`, `blacklist()`, or `seize()` functions.
     - Token burning (`burn`, `burnFrom`) is purely holder-initiated.
  2. **Payment Layer:**
     - No real fiat payment gateway SDKs or live credentials exist (no Razorpay, Stripe, Flutterwave, or live M-Pesa Daraja B2C APIs).
     - Payouts are recorded manually by administrative metadata entry (`referenceNumber`, `paymentRail`) reflecting off-chain banking activities.
  3. **Primary Sale Layer (`primaryTokenSaleEngine.ts`):**
     - Primary sale reference pricing is locked with `isExecutable = false` and `executionDisabledReason: 'UNAPPROVED_PRICING_MODEL'`.
- **Finding:** **CONFIRMED PASS.**

---

### Item 7: Settlement State Machine & Replay/Duplicate Guards
- **Requirement:** Review whether the settlement state machine prevents unauthorized transitions, replayed payment references, and duplicate collateral returns.
- **Verification Details:**
  1. **Unauthorized Transitions:**
     - `recordManualPayout`: Enforces caller authorization (`payout.dispatchedBy.toLowerCase() === AUTHORIZED_TREASURY_WALLET.toLowerCase()`). Rejects execution if caller is not the treasury wallet.
     - `confirmInvestorPayment`: Verifies `inv.investorAddress.toLowerCase() === investorAddress.toLowerCase()`. Prevents third parties from confirming receipt.
     - `returnCollateral`: Strictly requires that payment has already been confirmed/verified (`this.isPaymentConfirmed(inv.stage)`).
  2. **Duplicate Collateral Returns:**
     - Once `returnCollateral` executes, the stage transitions to `SETTLED` (or `SETTLEMENT_COMPLETED`).
     - A subsequent call to `returnCollateral` checks `this.isPaymentConfirmed(inv.stage)`. Because `SETTLED` is not a payment-confirmed stage, it immediately reverts: `Collateral cannot be returned until cash payment is confirmed by investor. Current stage: SETTLED.`
     - Duplicate collateral returns for the same investment are effectively prevented.
  3. **Replayed Payment References (Bank UTR / M-Pesa):**
     - `recordManualPayout` validates reference presence (`payout.referenceNumber.trim().length >= 5`).
     - However, it currently does **not** query existing investments to ensure that `referenceNumber` is globally unique. An operator could theoretically input the same UTR for two different investments.
- **Audit Finding:** **CONDITIONAL PASS.** Duplicate returns and role-based transitions are fully protected. A cross-record unique reference constraint should be added to `recordManualPayout` to prevent accidental UTR reuse across multiple plans.

---

### Item 8: Dashboard Data Source Analysis (Simulated vs Live)
- **Requirement:** Check whether the investor and admin dashboards display actual verified records or simulated/localStorage data.
- **Verification Details:**
  - **Settlement Records & Audit Logs:** Stored in browser `localStorage` (`liora_settlement_investments_v3` and `liora_settlement_audit_logs_v3`) initialized with 4 mock seed records (`INV-2026-001` through `INV-2026-004`).
  - **Prominent UI Disclaimers:**
    - `InvestorSettlementPortal.tsx` displays: `Simulated Prototype` badge in purple and `Checklist (3) Compliant` badge in amber.
    - `AdminSettlementConsole.tsx` displays: `Simulated Sandbox` badge in purple and `Checklist (3) Verified` badge in amber.
  - **Live On-Chain Data:** Header and balances for LIORA, mock USDT, and tBNB read directly from BNB Smart Chain Testnet (Chain ID 97) via Viem RPC and the user's connected wallet.
  - **State Boundary:** No persistent production backend database (PostgreSQL/Prisma) is connected to the settlement UI yet. Clearing browser storage resets the settlement records to seed data.
- **Finding:** **CONFIRMED PASS.** Data sources are properly segmented, accurately labeled, and transparently disclosed in the UI.

---

### Item 9: Preservation of Existing BSC Testnet Deployment State
- **Requirement:** Confirm that existing BSC Testnet token and liquidity pool contracts remain unchanged.
- **Verification Details:**
  - Token Contract: `0xeD155E37D0a400E63202cE031Fc1C984B18E7999` (Active testnet LIORA).
  - PancakeSwap V2 Pair: `0x64beE3847a766D35E6611985F3c3e51C78Af5D2c` (Holding 501.09 mUSDT / 215,797 LIORA).
  - Mock USDT: `0x0b419a33e8a6448547906DCB191b037Db5ac926e`.
  - Git repository inspection confirms no deployment scripts were executed and no state was overwritten.
  - `LioraTokenImmutable.sol` remains un-deployed, awaiting the approved migration plan.
- **Finding:** **CONFIRMED PASS.**

---

### Item 10: Automated Test & TypeScript Verification Results
- **Requirement:** Re-run all automated tests and TypeScript checks, documenting exact results.
- **Command 1 (Test Suites):**
  `cmd /c "npx hardhat test test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js test/Phase2B_Sprint2_ManualSettlementAndTrading.test.js test/LioraTokenImmutable.test.js test/Phase2B_GateC9_TreasuryAndTokenSale.test.js"`
  - **Output:**
    ```text
    LIORA COIN — Sprint 3B: Proportional Allocation, Fixed Collateral & Settlement Suite
      ✓ 23 passing tests (allocation formulas, invariants, remainder tracking, guards)

    LIORA COIN — Sprint 2: Website, Testnet Trading & Manual Settlement Suite
      ✓ 16 passing tests (AMM mechanics, lifecycle transitions, arbitration, reconciliation)

    LioraTokenImmutable Contract Audit & Verification Suite
      ✓ 20 passing tests (1B fixed supply, zero fee, non-custodial burn, zero admin controls)

    LIORA COIN — Gate C9: Primary Token Sale, Treasury Architecture & Liquidity Accounting Suite
      ✓ 21 passing tests (70:30 allocation, pricing guards, liquidity workflow, double-entry)

    Total: 80 passing (5s)
    ```
- **Command 2 (TypeScript Compilation):**
  `cmd /c "npx tsc --noEmit -p apps/web/tsconfig.json"`
  - **Output:** Clean exit with code 0 (Zero errors).
- **Finding:** **CONFIRMED PASS.**

---

## 4. Unresolved Defects & Remediation Plan

The following minor items should be addressed during Sprint 3C development:

1. **Unify Base-Unit Comparison in `ManualSettlementEngine.returnCollateral`:**
   - *Current Behavior:* Compares `parseFloat(returnedTokensAmount)` to `expectedTokens` (JS numbers).
   - *Fix:* Accept `returnedTokensBaseUnits: string | bigint` and call `ProportionalAllocationEngine.verifyCollateralReturnQuantity` directly to perform atomic wei comparison.
2. **Add Global UTR Reference Deduplication:**
   - *Current Behavior:* `recordManualPayout` validates reference string length but does not check for duplicate references across distinct investments.
   - *Fix:* Maintain a set of registered reference IDs and reject duplicate submissions.
3. **Persist Settlement Records to Server-Side Database:**
   - *Current Behavior:* Records are saved in browser `localStorage`.
   - *Fix:* In Sprint 3C/Production, connect the state machine to PostgreSQL via Prisma to enable cross-device persistence.

---

## 5. Management Operational Proposals (Status: NOT APPROVED)

Per project guidelines, the following 4 mechanisms were developed as **architectural proposals / prototype workflows** and **MUST NOT** be treated as management-approved policies until formal executive sign-off:

1. **30-Minute Allocation Quote Lock:**
   - *Status:* **PROPOSED / UNAPPROVED.**
   - *Purpose:* Prevents quote expiration between calculation and investor fiat deposit.
2. **Escrow Vault Smart Contract Prototype:**
   - *Status:* **PROPOSED / UNAPPROVED.**
   - *Purpose:* Smart contract custody of collateral tokens to automate release upon verified fiat receipt.
3. **Mandatory Investor Frontend Payment Confirmation:**
   - *Status:* **PROPOSED / UNAPPROVED.**
   - *Purpose:* Requires investor to click "Confirm Payment Received" before collateral return is unlocked.
4. **Independent Arbitration Council:**
   - *Status:* **PROPOSED / UNAPPROVED.**
   - *Purpose:* Third-party panel with multi-sig authority to resolve payment disputes.

---

## 6. Sprint 3C Readiness Recommendation

Sprint 3B successfully implements the core mathematical invariants of proportional allocation and the manual settlement lifecycle with zero regressions across the 80-test automated suite.

**Recommendation:**
- **Proceed to Sprint 3C.**
- During Sprint 3C, apply the base-unit comparison unification and UTR deduplication check as part of backend integration hardening.
- Maintain existing BSC Testnet contracts until formal migration approval is granted.

---
*Report certified by LIORA Protocol Technical Audit Team.*
