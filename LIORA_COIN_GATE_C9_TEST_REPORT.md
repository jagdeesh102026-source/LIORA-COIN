# LIORA COIN — Gate C9 Verification & Test Report
## Comprehensive Test Execution, Invariant Proofs & Code Quality Audit

**Project Root:** `D:\Projects\OXENIQ`  
**Network:** BNB Smart Chain Testnet (Chain ID: `97`)  
**Suite Executed:** Mocha, Chai, Hardhat, TypeScript  
**Date:** November 2026  
**Final Verdict:** **PASS (100% Passing, 0 Errors)**  

---

## 1. Test Execution Summary

| Suite / Check | Test File / Command | Tests Run | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gate C9 Core Suite** | `test/Phase2B_GateC9_TreasuryAndTokenSale.test.js` | 20 | 20 | 0 | **PASS** |
| **Gate C7B Hotfix Suite** | `test/Phase2B_GateC7B_WalletPersistence.test.js` | 21 | 21 | 0 | **PASS** |
| **Gate C7 Liquidity Suite**| `test/Phase2B_GateC7_LiquidityManagement.test.js` | 26 | 26 | 0 | **PASS** |
| **Gate C6B Hotfix Suite** | `test/Phase2B_GateC6B_HotfixWalletAndHydration.test.js` | 20 | 20 | 0 | **PASS** |
| **Gate C6 DEX Integration**| `test/Phase2B_GateC6_WebsiteDexIntegration.test.js` | 20 | 20 | 0 | **PASS** |
| **Hardhat Core Contracts** | `npx hardhat test` | 641 | 641 | 0 | **PASS** |
| **TypeScript Typecheck** | `npx tsc --noEmit -p apps/web/tsconfig.json` | Typecheck | N/A | 0 errors | **PASS** |
| **Total Test Count** | **All Combined Test Suites** | **748** | **748** | **0** | **PASS** |

---

## 2. Gate C9 Test Breakdown

### 2.1 Fixed Supply & 70:30 Bucket Separation Invariants
- `√ Should strictly enforce 1,000,000,000 LIORA total supply (10^27 base units)`
- `√ Should allocate exactly 70% (700,000,000 LIORA) to the client allocation bucket`
- `√ Should allocate exactly 30% (300,000,000 LIORA) to the company emergency reserve bucket`
- `√ Should maintain exact double-entry mathematical conservation across all sub-accounts`
- `√ Should ensure tokens cannot be counted simultaneously as investor holdings and treasury liquidity reserves`

### 2.2 Primary Token-Sale Quotation & Unapproved Pricing Guards
- `√ Should accurately calculate token delivery for Fixed Baseline price ($0.10 USD / ₹8.65)`
- `√ Should calculate Reference Schedule quotation and flag it with an explicit UNAPPROVED warning note`
- `√ Should calculate live PancakeSwap DEX Spot Market quotation`
- `√ Should reject primary sale quotes with zero or negative amounts`
- `√ Should reject primary sale purchases if requested tokens exceed available client allocation`

### 2.3 100% Proceeds Allocation & Liquidity Provisioning Workflow
- `√ Primary sale must allocate 100% of USDT proceeds into pending liquidity`
- `√ Pending liquidity must never be labeled as deposited pool liquidity`
- `√ Should plan a liquidity provision batch calculating exact matching LIORA from pool ratio`
- `√ Executing a provision batch must credit 100% of Cake-LP tokens to the company treasury`

### 2.4 Treasury Authority & Automated Double-Entry Reconciliation
- `√ Should verify single company-controlled wallet authority`
- `√ Should pass all 5 reconciliation integrity checks`

### 2.5 Decoupled Dual Price Display Service
- `√ Should return independent values for scheduled reference price and DEX spot price`

### 2.6 Network Isolation & Security Guardrails
- `√ PrimaryTokenSaleEngine must target BSC Testnet (Chain ID 97)`
- `√ Primary sale must use Mock USDT contract 0x0b419a33e8a6448547906DCB191b037Db5ac926e`
- `√ Codebase must not contain hardcoded private keys or seed phrases`

---

## 3. Invariant Verification Matrix

| Invariant | Mathematical Formulation | Test Assertion Result |
| :--- | :--- | :--- |
| **Supply Conservation** | $\sum \text{SubAccounts}_{\text{LIORA}} \equiv 10^{27} \text{ wei}$ | **PASS** (Zero discrepancy) |
| **Client Ceiling** | $\text{Delivered} + \text{Paired} + \text{Committed} + \text{Available} \equiv 7 \times 10^{26}$ | **PASS** (Exact equality) |
| **Company Reserve** | $\text{Reserve} \equiv 3 \times 10^{26}$ | **PASS** (Untouched) |
| **100% USDT Proceeds** | $\text{GrossUSDT} \equiv \text{AllocatedUSDT} + \text{PendingUSDT}$ | **PASS** (0.00% leakage) |
| **Treasury LP Ownership** | $\text{Recipient} == \text{0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350}$ | **PASS** (Verified) |
| **Decoupled Pricing** | $\text{ScheduledPrice} \neq \text{AMMSpotPrice}$ | **PASS** (Decoupled & distinct) |

---

## 4. Edge Cases Tested

1. **Floating Point Rounding:** Verified that `0.10` float does not introduce IEEE 754 precision loss (`parseUnits("0.1", 18)` yields exactly $1,000$ LIORA for $100$ USDT).
2. **Allocation Depletion:** Verified that requesting tokens beyond the remaining 700M client supply triggers an immediate error before any transaction is built.
3. **Unauthorized Signer:** Verified that the test investor wallet (`0xf28D...12aD`) is recognized as a non-treasury address and blocked from initiating liquidity batches.
4. **Zero & Negative Inputs:** Verified that empty, zero, or negative inputs are rejected cleanly with helpful user messages.
5. **Network Boundaries:** Verified that switching chain ID away from 97 immediately halts operations.
