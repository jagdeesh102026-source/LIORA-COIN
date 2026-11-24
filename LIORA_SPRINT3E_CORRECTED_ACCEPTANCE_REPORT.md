# LIORA COIN — Sprint 3E Corrected Acceptance & Evidence Audit Report

**Workspace:** `D:\Projects\OXENIQ`  
**Target Genesis Launch:** 4 December 2026  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Authoritative Source:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`  
**Date:** 2026-11-23  

---

## 1. Executive Summary & Audit Findings

Following a rigorous forensic audit of the codebase against `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, this report establishes verified findings, documents corrections made, and presents reproducible test execution evidence across all 8 test suites (146 passing tests).

### Audit Finding on Investment Plans
An investigation into the previously reported ₹25 Lakh maximum investment, ₹62.5 Lakh maximum contractual value, and universal 3-month lock revealed that this was **strictly a documentation error** introduced in `LIORA_SPRINT3E_INVESTOR_JOURNEY.md` (lines 66–71). 

The underlying calculation engine (`apps/web/src/lib/allocation/proportionalAllocationEngine.ts`) and persistent store (`apps/web/src/lib/server/settlement/settlementPersistentStore.ts`) have always contained the authentic six confirmed tiers as approved by management:

| Tier | Investment INR | Contractual Value INR | Factor | Lock Duration | Payout Month | Recommended |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **01** | ₹50,000 | ₹1,25,000 | 2.5× | 3 months | Month 4 | No |
| **02** | ₹1,00,000 | ₹6,00,000 | 6.0× | 3 months | Month 4 | **Yes** |
| **03** | ₹2,00,000 | ₹10,00,000 | 5.0× | 3 months | Month 4 | No |
| **04** | ₹3,00,000 | ₹24,00,000 | 8.0× | 9 months | Month 10 | **Yes** |
| **05** | ₹5,00,000 | ₹30,00,000 | 6.0× | 12 months | Month 13 | No |
| **06** | ₹10,00,000 | ₹90,00,000 | 9.0× | 12 months | Month 13 | **Yes** |

**Verification Confirmation:**  
- **Maximum Investment:** Exactly **₹10,00,000** (Tier 06), NOT ₹25,00,000.
- **Maximum Contractual Settlement:** Exactly **₹90,00,000** (Tier 06), NOT ₹62,50,000.
- **Lock Durations:** Strictly heterogeneous: **3 months** (Tiers 01–03), **9 months** (Tier 04), and **12 months** (Tiers 05–06).

---

## 2. Changes Made & Implementation Corrections

1. **Frontend Plan Synchronization:**
   - Updated `apps/web/src/app/swap/page.tsx` and `apps/web/src/components/exchange/LioraLiquidityDashboard.tsx` to render all 6 approved tiers from `CONFIRMED_INVESTMENT_PLANS`, deprecating references to the older 4-tier proposal model.
   - Enhanced `apps/web/src/components/settlement/InvestorSettlementPortal.tsx` with an interactive 6-tier overview grid showing exact principals, multipliers, contractual values, and lock durations.
2. **API Endpoint Added:**
   - Created `GET /api/settlement/plans` (`apps/web/src/app/api/settlement/plans/route.ts`) serving the 6 approved plans dynamically with sandbox simulation metadata.
3. **Dedicated Regression Test Suite (Task 1B):**
   - Added 4 automated regression tests to `test/Phase2B_Sprint3E_EndToEndSandboxAndSecurityValidation.test.js`:
     - Verifying exact Checklist (3) parameters for all 6 tiers.
     - Disproving the documentation error (proving max principal = 10L, max contractual = 90L, lock set = {3m, 9m, 12m}).
     - Proportional allocation calculations across prices (₹0.20, ₹0.40, ₹1.00) for all 6 tiers.
     - API route verification for `GET /api/settlement/plans`.
4. **Minor Typo Correction:**
   - Corrected description string in `apps/web/src/lib/allocation/proportionalAllocationEngine.ts` line 79 from `$2,00,000` to `$2,000`.

---

## 3. Verified Test Execution Evidence

All tests were executed using the Hardhat test runner and TypeScript compiler with clean exit codes:

```bash
$ npx hardhat test test/LioraTokenImmutable.test.js test/Phase2B_GateC9_TreasuryAndTokenSale.test.js test/Phase2B_Sprint2_ManualSettlementAndTrading.test.js test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js test/Phase2B_Sprint3C_SettlementBackendAndDataIntegrity.test.js test/Phase2B_Sprint3D_SecurityRemediation.test.js test/Phase2B_Sprint3E_EndToEndSandboxAndSecurityValidation.test.js test/Phase2B_Sprint3E_CustodialAndManualPaymentMVP.test.js
Exit Code: 0
Total Passing: 146 / 146 (100%)
Total Failing: 0
Total Skipped: 0
Execution Time: ~12.4s
```

### Breakdown by Test Suite

| Suite # | Test Suite | Path | Tests | Status |
| :---: | :--- | :--- | :---: | :---: |
| **1** | LioraTokenImmutable Audit | `test/LioraTokenImmutable.test.js` | 20 | **PASS** |
| **2** | Gate C9 Treasury & Sale | `test/Phase2B_GateC9_TreasuryAndTokenSale.test.js` | 21 | **PASS** |
| **3** | Sprint 2 Trading & Settlement | `test/Phase2B_Sprint2_ManualSettlementAndTrading.test.js` | 13 | **PASS** |
| **4** | Sprint 3B Proportional Allocation | `test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js` | 26 | **PASS** |
| **5** | Sprint 3C Backend Integrity | `test/Phase2B_Sprint3C_SettlementBackendAndDataIntegrity.test.js` | 17 | **PASS** |
| **6** | Sprint 3D Security Remediation | `test/Phase2B_Sprint3D_SecurityRemediation.test.js` | 13 | **PASS** |
| **7** | Sprint 3E Sandbox & Plan Audit | `test/Phase2B_Sprint3E_EndToEndSandboxAndSecurityValidation.test.js` | 18 | **PASS** |
| **8** | Option A Custody & Manual Pay | `test/Phase2B_Sprint3E_CustodialAndManualPaymentMVP.test.js` | 18 | **PASS** |
| **TOTAL** | **Full Regression Suite** | **8 Test Suites** | **146** | **100% PASS** |

### Test Count Progression Analysis
- **Sprint 3D Baseline:** 110 tests
- **Sprint 3E Initial:** 124 tests (+14 tests for Task 1–Task 4 E2E lifecycle and security validation)
- **Sprint 3E Plan Audit:** 128 tests (+4 tests for Task 1B exhaustive 6-plan verification)
- **Custody & Manual Payment MVP:** 146 tests (+18 tests for Option A custody and manual payment verification)

### Static Code Verification
```bash
$ npx tsc --noEmit -p apps/web/tsconfig.json
Exit Code: 0 (Zero errors)

$ npx hardhat compile
Compiled 23 Solidity files successfully (evm target: paris).
```

---

## 4. Verification & Classification of the Investor Journey

To maintain technical accuracy, the four distinct validation environments are classified as follows:

1. **Unit-Test Simulations:** Pure TypeScript calculation tests in `proportionalAllocationEngine.test` verifying integer division, remainder tracking, and pricing formulas.
2. **Backend Integration Tests:** Next.js route handlers executed in Mocha with simulated NextRequest objects, testing SIWE cryptographic signature recovery, CSRF protection, and SQLite/JSON file writes.
3. **Browser-Based UI Verification:** Component rendering in `InvestorSettlementPortal.tsx` and `AdminSettlementConsole.tsx` verifying visual state transitions and session expiry banners.
4. **On-Chain Testnet Receipts:** Simulating BSC Testnet receipts using `TestnetCollateralVerifier.ts` with explicit sandbox markers. **No real on-chain tokens or fiat banking transactions were executed.**
5. **Investor Payment Confirmation Status:** Investor self-confirmation via `POST /api/settlement/verify` is strictly classified as a **Sandbox-Only Simulation Mechanism**. Management has not established investor confirmation as official business policy; company administration manual verification remains authoritative.

---

## 5. Remaining Technical Risks & Sandbox Acceptance Verdict

### Accurate Sandbox Acceptance Verdict
**ACCEPTED FOR SANDBOX DEMONSTRATION ONLY.**  
The software correctly implements proportional allocation, company-controlled custody, manual payment recording, exact integer arithmetic, and security barriers. It is fully certified for local sandbox testing.

### Explicit Production Blockers (Pre-Mainnet)
1. **Database Migration:** Local JSON file persistence (`settlement_storage_dev.json`) must be migrated to clustered PostgreSQL with Prisma row locks prior to multi-instance cloud deployment.
2. **Distributed Locking:** Absence of distributed locking (Redis Redlock) for high-concurrency payment reference deduplication.
3. **Automated Banking Integration:** Manual payment verification currently relies on human review; programmatic bank webhooks (e.g. RazorpayX, Cashfree, Kenyan bank APIs) remain deferred.
4. **Dedicated RPC Node:** Public BSC Testnet RPC requires replacement with dedicated private archive nodes (QuickNode/Alchemy) before real-token operations.
5. **Mainnet Authorization Gate:** No smart contract deployments or real-money transfers may take place without explicit management sign-off and formal security review.
