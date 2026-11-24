# LIORA COIN — Management Requirements Traceability Matrix

**Project Workspace:** `D:\Projects\OXENIQ`  
**Target Genesis Launch:** 4 December 2026  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Primary Authoritative Source:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`  
**Supplemented By:** Latest Confirmed Custody Architecture (Option A) & Manual Payment Requirements Update  
**Date:** 2026-11-23  

---

## 1. Traceability Matrix

| Req ID | Source Document | Question / Row | Confirmed Management Requirement | Implementing File & Function | Automated Test Evidence | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **REQ-01** | Checklist (3) | Unanswered Baseline | Initial launch will support LIORA only; 1B planned supply; 70% client allocation, 30% company reserve. | `contracts/LioraTokenImmutable.sol`<br>`contracts/LioraTokenCustodial.sol`<br>`primaryTokenSaleEngine.ts` | `test/LioraTokenImmutable.test.js` (Lines 20–50)<br>`test/Phase2B_GateC9_TreasuryAndTokenSale.test.js` | **CONFIRMED** |
| **REQ-02** | Checklist (3) | Plan Row 01 | Tier 01: ₹50,000 principal ($500), 2.5× factor, ₹1,25,000 contractual settlement, 3-month lock, Month 4 payout. | `proportionalAllocationEngine.ts`<br>`CONFIRMED_INVESTMENT_PLANS['TIER_01']` | `test/Phase2B_Sprint3E_EndToEndSandboxAndSecurityValidation.test.js` (Task 1B) | **CONFIRMED** |
| **REQ-03** | Checklist (3) | Plan Row 02 | Tier 02 (Recommended): ₹1,00,000 principal ($1,000), 6.0× factor, ₹6,00,000 contractual settlement, 3-month lock, Month 4 payout. | `proportionalAllocationEngine.ts`<br>`CONFIRMED_INVESTMENT_PLANS['TIER_02']` | `test/Phase2B_Sprint3E_EndToEndSandboxAndSecurityValidation.test.js` (Task 1B) | **CONFIRMED** |
| **REQ-04** | Checklist (3) | Plan Row 03 | Tier 03: ₹2,00,000 principal ($2,000), 5.0× factor, ₹10,00,000 contractual settlement, 3-month lock, Month 4 payout. | `proportionalAllocationEngine.ts`<br>`CONFIRMED_INVESTMENT_PLANS['TIER_03']` | `test/Phase2B_Sprint3E_EndToEndSandboxAndSecurityValidation.test.js` (Task 1B) | **CONFIRMED** |
| **REQ-05** | Checklist (3) | Plan Row 04 | Tier 04 (Recommended): ₹3,00,000 principal ($3,000), 8.0× factor, ₹24,00,000 contractual settlement, 9-month lock, Month 10 payout. | `proportionalAllocationEngine.ts`<br>`CONFIRMED_INVESTMENT_PLANS['TIER_04']` | `test/Phase2B_Sprint3E_EndToEndSandboxAndSecurityValidation.test.js` (Task 1B) | **CONFIRMED** |
| **REQ-06** | Checklist (3) | Plan Row 05 | Tier 05: ₹5,00,000 principal ($5,000), 6.0× factor, ₹30,00,000 contractual settlement, 12-month lock, Month 13 payout. | `proportionalAllocationEngine.ts`<br>`CONFIRMED_INVESTMENT_PLANS['TIER_05']` | `test/Phase2B_Sprint3E_EndToEndSandboxAndSecurityValidation.test.js` (Task 1B) | **CONFIRMED** |
| **REQ-07** | Checklist (3) | Plan Row 06 | Tier 06 (Recommended): ₹10,00,000 principal ($10,000), 9.0× factor, ₹90,00,000 contractual settlement, 12-month lock, Month 13 payout. | `proportionalAllocationEngine.ts`<br>`CONFIRMED_INVESTMENT_PLANS['TIER_06']` | `test/Phase2B_Sprint3E_EndToEndSandboxAndSecurityValidation.test.js` (Task 1B) | **CONFIRMED** |
| **REQ-08** | Checklist (3) | Section A, Q1 | Investors receive LIORA tokens held as collateral against separately defined cash payout. | `manualSettlementModel.ts`<br>`custodialAllocationLedger.ts` | `test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js` | **CONFIRMED** |
| **REQ-09** | Checklist (3) | Section A, Q2 | Both allocated LIORA tokens and investor deposited funds are locked during the investment period. | `manualSettlementModel.ts`<br>`isMatured()` | `test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js` | **CONFIRMED** |
| **REQ-10** | Checklist (3) | Section A, Q3 | Lock-in period begins when tokens are allocated. | `manualSettlementModel.ts`<br>`createInvestment()` | `test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js` | **CONFIRMED** |
| **REQ-11** | Checklist (3) | Section A, Q7 | Payouts are made manually by company owner/administration. | `settlementPersistentStore.ts`<br>`recordManualPayout()` | `test/Phase2B_Sprint3C_SettlementBackendAndDataIntegrity.test.js` | **CONFIRMED** |
| **REQ-12** | Checklist (3) | Section A, Q8 | Withdrawal before maturity is strictly prohibited. | `manualSettlementModel.ts`<br>`custodialAllocationLedger.ts` | `test/Phase2B_Sprint3E_CustodialAndManualPaymentMVP.test.js` | **CONFIRMED** |
| **REQ-13** | Checklist (3) | Section A, Q9 | Company retains excess tokens if collateral value exceeds agreed entitlement. | `manualSettlementModel.ts`<br>`returnCollateral()` | `test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js` | **CONFIRMED** |
| **REQ-14** | Checklist (3) | Section A, Q10 | USD and INR amounts are fixed alternatives (no live FX conversions during investment). | `proportionalAllocationEngine.ts`<br>`CONFIRMED_INVESTMENT_PLANS` | `test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js` | **CONFIRMED** |
| **REQ-15** | Checklist (3) | Section B, Q11 | Initial primary-sale allocation price is ₹0.20 per LIORA. | `proportionalAllocationEngine.ts`<br>`INITIAL_ALLOCATION_PRICE_INR` | `test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js` | **CONFIRMED** |
| **REQ-16** | Checklist (3) | Section B, Q14 | Collateral quantity is permanently fixed once calculated and finalized. | `settlementPersistentStore.ts`<br>`originalCollateralTokensBaseUnits` | `test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js` | **CONFIRMED** |
| **REQ-17** | Custody Update | Option A, Req 1–2 | Initial minted supply: 1B; Maximum supply cap: 100B; standard ERC-20 compatibility. | `contracts/LioraTokenCustodial.sol`<br>`INITIAL_SUPPLY`<br>`MAX_SUPPLY` | `test/Phase2B_Sprint3E_CustodialAndManualPaymentMVP.test.js` (Section 1) | **CONFIRMED** |
| **REQ-18** | Custody Update | Option A, Req 3–6 | Company-controlled custody holds tokens; investors receive allocation records, not wallet transfers; read-only portal; cannot transfer/swap/burn/withdraw. | `custodialAllocationLedger.ts`<br>`apps/web/src/app/api/custody/*` | `test/Phase2B_Sprint3E_CustodialAndManualPaymentMVP.test.js` (Section 2 & 3) | **CONFIRMED** |
| **REQ-19** | Custody Update | Option A, Req 8–10| Server-side RBAC on every sensitive endpoint; zero investor withdrawal paths; reserved investor allocations protected from treasury spend. | `api/custody/investor-transfer`<br>`api/custody/treasury-spend` | `test/Phase2B_Sprint3E_CustodialAndManualPaymentMVP.test.js` (Section 3 & 4) | **CONFIRMED** |
| **REQ-20** | Payment Update | Manual Pay, Req 1–5| Automated payment gateways deferred; manual payment verification by authorized admin; deduplication; allocations activate only after verified payment. | `custodialAllocationLedger.ts`<br>`api/custody/verify-payment` | `test/Phase2B_Sprint3E_CustodialAndManualPaymentMVP.test.js` (Section 2) | **CONFIRMED** |
| **PROP-01**| Technical Proposal | Unapproved | 30-minute price quote lock. | Not implemented in management baseline. | Segregated as proposal | **PROPOSED** |
| **PROP-02**| Technical Proposal | Unapproved | On-chain multi-sig escrow smart contract vault. | Not implemented; Option A company custody active. | Segregated as proposal | **PROPOSED** |
| **PROP-03**| Technical Proposal | Unapproved | Third-party independent arbitration council. | Grandiose Tech retains sole authority. | Segregated as proposal | **PROPOSED** |

---

## 2. Integrity Verification Notes
- The original source document `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx` remains preserved and unaltered in the repository.
- No business decisions have been altered without explicit management instruction.
- Option A company-controlled custody and the manual payment verification updates have been cleanly mapped to their respective modules and tests.
