# LIORA COIN — Sprint 3B Automated Test Results & Verification Audit

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Network:** Local EVM Devnet & BSC Testnet Environment  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Genesis Launch:** 4 December 2026  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented by confirmed manual cash payout and collateral-return arrangement.

---

## 1. Executive Summary

This report documents the automated test execution results for Sprint 3B, verifying the proportional token allocation engine, fixed collateral quantities, manual settlement state machine, and double-entry reconciliation integrity.

### Overall Test Execution Metrics:
- **Total Test Suites Executed:** 4
- **Total Passing Tests:** 80
- **Total Failing Tests:** 0
- **Total Skipped Tests:** 0
- **Execution Time:** 5.0 seconds
- **TypeScript Static Compilation:** 0 errors (`npx tsc --noEmit -p apps/web/tsconfig.json`)

---

## 2. Test Execution Command & Console Output

### Execution Command:
```bash
npx hardhat test \
  test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js \
  test/Phase2B_Sprint2_ManualSettlementAndTrading.test.js \
  test/LioraTokenImmutable.test.js \
  test/Phase2B_GateC9_TreasuryAndTokenSale.test.js
```

### Actual Hardhat Console Output:
```
◇ injected env (5) from .env

  LIORA COIN — Sprint 3B: Proportional Allocation, Fixed Collateral & Settlement Suite
    1. Correct Proportional Allocations for All Six Plans
      √ Should correctly compute proportional token allocations for Tier 01 at ₹0.20, ₹0.40, and ₹1.00 (211ms)
      √ Should correctly compute proportional token allocations for Tier 02 at ₹0.20, ₹0.40, and ₹1.00 (85ms)
      √ Should correctly compute proportional token allocations for Tier 03 at ₹0.20, ₹0.40, and ₹1.00 (93ms)
      √ Should correctly compute proportional token allocations for Tier 04 at ₹0.20, ₹0.40, and ₹1.00 (129ms)
      √ Should correctly compute proportional token allocations for Tier 05 at ₹0.20, ₹0.40, and ₹1.00 (88ms)
      √ Should correctly compute proportional token allocations for Tier 06 at ₹0.20, ₹0.40, and ₹1.00 (82ms)
    2. Allocation at Various Valid Prices Across Schedule
      √ Should compute accurate allocations at non-integer prices (₹0.80, ₹2.50, ₹10.00, ₹30.00 cap)
    3. Fixed Collateral Quantity Invariant
      √ Should freeze collateral quantity permanently once finalized (57ms)
      √ Subsequent price changes cannot mutate registered investment records in storage (69ms)
    4. Exact Original Token Quantity Required for Collateral Return
      √ Should accept exact collateral return quantity matching original allocation
      √ Should reject collateral return if returned quantity is less than original
      √ SettlementEngine rejects returnCollateral if returned token amount does not match original
    5. Rejection of Invalid Prices and Allocation Values
      √ Should reject zero, negative, or NaN prices
      √ Should reject unknown investment plans
    6. Decimal-Safe 18-Decimal Rounding Behavior
      √ Should accurately track rounding remainder for repeating decimals without floating-point drift
      √ BigInt parsing correctly scales fractional prices up to 18 decimals
    7. Prevention of Unauthorized Payout-Status Changes
      √ Should reject manual payout entry if caller is not the authorized treasury owner
    8. Settlement Completion Guards
      √ Settlement must not be marked complete merely because the owner records a payout
      √ Collateral cannot be returned before payment is independently verified
    9. Correct Handling of Failed Payments and Disputes
      √ Should transition to DISPUTED stage and freeze collateral release
      √ Arbitrator can resolve dispute with confirmed payment verification
    10. Preservation of Historical Investment Records
      √ Should preserve complete chronological audit history with immutable entries
      √ Reconciliation accounting balances 100% across all plans

  LIORA COIN — Sprint 2: Website, Testnet Trading & Manual Settlement Suite
    1. PancakeSwap V2 Testnet AMM Quotation & Price Mechanics
      √ Should accurately compute AMM constant-product output with 0.25% fee (LIORA -> mUSDT)
      √ Should compute buy quotes (mUSDT -> LIORA) with dynamic price impact
      √ Should return zero amounts if swap input is empty or zero
      √ Should enforce strict separation between company reference schedule and DEX market price (55ms)
    2. Manual Investment Settlement Lifecycle & State Transitions
      √ Should load initial seeded investment records across diverse stages
      √ Owner can record manual fiat cash payout for Month 4 matured plan
      √ Reject manual payout entry without valid reference number
      √ Investor confirms cash payment and transitions stage to PAYMENT_CONFIRMED
      √ Reject confirmation if caller is not the registered investor
      √ Return collateral tokens to treasury after payment is confirmed
      √ Reject collateral return before payment is confirmed
    3. Payment Disputes & Independent Arbitration Workflows
      √ Investor can raise dispute if dispatched payment is not received
      √ Reject dispute if explanation is too short
      √ Arbitrator can resolve dispute with verified payment confirmation
    4. Double-Entry Collateral Reconciliation Integrity
      √ Total collateral allocated must strictly equal active collateral plus returned collateral
      √ Audit log trail must preserve complete chronological ledger history

  LioraTokenImmutable Contract Audit & Verification Suite
    1. Deployment & Fixed Supply Invariants
      √ Should correctly set token name to 'LIORA COIN'
      √ Should correctly set token symbol to 'LIORA'
      √ Should return exactly 18 decimals via pure function
      √ Should set total supply to exactly 1,000,000,000 LIORA (10^27 atomic units)
      √ Should credit the entire 1 Billion initial supply to the designated initial holder
      √ Should revert if initial holder is address(0)
    2. Standard ERC-20 Transfers & Zero-Fee Invariants
      √ Should transfer tokens with exact 1:1 conservation (0% fee-on-transfer) (46ms)
      √ Should revert if sender balance is insufficient
      √ Should execute transferFrom with exact allowance deduction
      √ Should revert transferFrom if spender allowance is insufficient
    3. Non-Custodial Token Burning
      √ Should allow a holder to burn their own tokens, permanently reducing total supply
      √ Should allow burnFrom within approved allowance
      √ Should revert burn if balance is insufficient
    4. Absence of Privileged & Centralized Controls (Q21 Requirements)
      √ Must NOT have an owner() function or Ownable interface
      √ Must NOT have a pause() or unpause() function
      √ Must NOT have a post-deployment mint() function
      √ Must NOT have blacklisting, whitelisting, or freezing functions
      √ Must NOT have fee or tax setter functions
      √ Must NOT have upgradeable proxy functions (e.g., upgradeTo, implementation)
      √ Transfers must never be blocked or paused by any party

  LIORA COIN — Gate C9: Primary Token Sale, Treasury Architecture & Liquidity Accounting Suite
    1. Fixed Supply & 70:30 Bucket Separation Invariants
      √ Should strictly enforce 1,000,000,000 LIORA total supply (10^27 base units)
      √ Should allocate exactly 70% (700,000,000 LIORA) to the client allocation bucket
      √ Should allocate exactly 30% (300,000,000 LIORA) to the company emergency reserve bucket
      √ Should maintain exact double-entry mathematical conservation across all sub-accounts
      √ Should ensure tokens cannot be counted simultaneously as investor holdings and treasury liquidity reserves
    2. Primary Token-Sale Quotation & Unapproved Pricing Guards
      √ Should accurately calculate token delivery for Fixed Baseline price ($0.10 USD / ₹8.65)
      √ Should calculate Reference Schedule quotation, flag it with UNAPPROVED warning, and block execution
      √ Should calculate live PancakeSwap DEX Spot Market quotation
      √ Should reject primary sale quotes with zero or negative amounts
      √ Should reject primary sale purchases if requested tokens exceed available client allocation
    3. 100% Proceeds Allocation & Liquidity Provisioning Workflow
      √ Primary sale must allocate 100% of USDT proceeds into pending liquidity
      √ Pending liquidity must never be labeled as deposited pool liquidity
      √ Should plan a liquidity provision batch calculating exact matching LIORA from pool ratio
      √ Executing a provision batch must credit 100% of Cake-LP tokens to the company treasury
    4. Treasury Authority & Automated Double-Entry Reconciliation
      √ Should verify single company-controlled wallet authority
      √ Should reject liquidity batch execution from unauthorized caller addresses
      √ Should pass all 5 reconciliation integrity checks
    5. Decoupled Dual Price Display Service
      √ Should return independent values for scheduled reference price and DEX spot price
    6. Network Isolation & Security Guardrails
      √ PrimaryTokenSaleEngine must target BSC Testnet (Chain ID 97)
      √ Primary sale must use Mock USDT contract 0x0b419a33e8a6448547906DCB191b037Db5ac926e
      √ Codebase must not contain hardcoded private keys or seed phrases

  80 passing (5s)
```

---

## 3. Detailed Audit of the 10 Task E Verification Areas

| Test Area | Description | Test Assertions | Status |
|---|---|---|---|
| **Area 1: Six Confirmed Plans** | Validates proportional allocation for all 6 tiers at ₹0.20, ₹0.40, and ₹1.00. | 18 individual quote calculations matching exact mathematical formulas. | **PASSED** |
| **Area 2: Various Schedule Prices** | Tests allocation at ₹0.80, ₹2.50, ₹10.00, and schedule cap ₹30.00. | Verifies fractional output and non-overflow at extreme schedule values. | **PASSED** |
| **Area 3: Fixed Collateral Invariant** | Verifies finalized collateral records cannot be altered by later prices. | Freezes quote into immutable object; asserts subsequent price swings do not mutate storage. | **PASSED** |
| **Area 4: Exact Collateral Return** | Enforces that returned tokens must strictly equal original allocation. | Returns with diff = 0 pass; partial returns (e.g. 624,999 vs 625,000) revert with `COLLATERAL_QUANTITY_MISMATCH`. | **PASSED** |
| **Area 5: Input Validation & Rejection** | Rejects zero, negative, NaN, empty, or unknown plan inputs. | Explicit errors (`PRICE_ZERO`, `INVALID_PRICE_FORMAT`, `UNKNOWN_PLAN`) thrown and asserted. | **PASSED** |
| **Area 6: 18-Decimal Rounding** | Tests repeating fractional decimals (e.g. ₹0.30) with BigInt. | Floor division verified; exact `roundingRemainderWei` preserved with conservation identity. | **PASSED** |
| **Area 7: Role-Based Authorization** | Rejects unauthorized callers attempting to record manual payouts. | Unauthenticated address calling `recordManualPayout` rejected with `UNAUTHORIZED_PAYOUT_CALLER`. | **PASSED** |
| **Area 8: Settlement Completion Guards** | Prevents marking settlement complete on payout dispatch alone. | Calling `returnCollateral` while `MANUAL_PAYOUT_INITIATED` fails with `PRECONDITION_FAILED`. | **PASSED** |
| **Area 9: Disputes & Arbitration** | Validates investor dispute filing and arbitrator rulings. | Transitions to `DISPUTED_OR_FAILED_SETTLEMENT`; arbitrated resolution verified. | **PASSED** |
| **Area 10: Audit Trail & Ledger** | Asserts complete chronological ledger and double-entry balance. | Audit log verified; discrepancy between allocated and (active + returned) equals exactly 0. | **PASSED** |

---

## 4. TypeScript Static Typecheck Audit

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```
- **Exit Code:** `0`
- **Errors Reported:** `0`
- **Scope:** Complete Next.js 14 frontend application, hooks, components, and calculation engines.
