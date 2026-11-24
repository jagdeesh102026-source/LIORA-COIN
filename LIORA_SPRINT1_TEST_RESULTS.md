# LIORA COIN — Sprint 1 Automated Test Execution & Verification Report
**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Execution Environment:** Hardhat v2.22.0 / Mocha / Chai / Ethers.js v6 / Node.js  
**Workspace:** `D:\Projects\OXENIQ`  
**Total Tests Executed:** 40  
**Passed:** 40  
**Failed:** 0  
**Success Rate:** 100%

---

## 1. Executive Summary

During Sprint 1, two comprehensive automated test suites were verified:
1. **`test/LioraTokenImmutable.test.js`** — 20 tests validating the newly implemented immutable ERC-20 token contract, asserting exact 1 Billion supply, fee-free transfers, burning, and the complete absence of privileged or administrative backdoors (in accordance with management clarification Q21).
2. **`test/Phase2B_GateC9_TreasuryAndTokenSale.test.js`** — 20 tests validating the Gate C9 treasury architecture, double-entry mathematical conservation, 70:30 bucket separation, 100% proceeds-to-liquidity allocation, LP token custody, dual pricing service, and the newly applied execution guard blocking unapproved reference-schedule purchases.

All 40 automated tests passed with zero failures.

---

## 2. Test Execution Output (Full Log)

```
◇ injected env (5) from .env

  LIORA COIN — Gate C9: Primary Token Sale, Treasury Architecture & Liquidity Accounting Suite
    1. Fixed Supply & 70:30 Bucket Separation Invariants
      ✔ Should strictly enforce 1,000,000,000 LIORA total supply (10^27 base units) (18ms)
      ✔ Should allocate exactly 70% (700,000,000 LIORA) to the client allocation bucket (15ms)
      ✔ Should allocate exactly 30% (300,000,000 LIORA) to the company emergency reserve bucket (14ms)
      ✔ Should maintain exact double-entry mathematical conservation across all sub-accounts (144ms)
      ✔ Should ensure tokens cannot be counted simultaneously as investor holdings and treasury liquidity reserves (16ms)
    2. Primary Token-Sale Quotation & Unapproved Pricing Guards
      ✔ Should accurately calculate token delivery for Fixed Baseline price ($0.10 USD / ₹8.65) (42ms)
      ✔ Should calculate Reference Schedule quotation, flag it with UNAPPROVED warning, and block execution (22ms)
      ✔ Should calculate live PancakeSwap DEX Spot Market quotation (19ms)
      ✔ Should reject primary sale quotes with zero or negative amounts (15ms)
      ✔ Should reject primary sale purchases if requested tokens exceed available client allocation (18ms)
    3. 100% Proceeds Allocation & Liquidity Provisioning Workflow
      ✔ Primary sale must allocate 100% of USDT proceeds into pending liquidity (21ms)
      ✔ Pending liquidity must never be labeled as deposited pool liquidity (56ms)
      ✔ Should plan a liquidity provision batch calculating exact matching LIORA from pool ratio (48ms)
      ✔ Executing a provision batch must credit 100% of Cake-LP tokens to the company treasury (25ms)
    4. Treasury Authority & Automated Double-Entry Reconciliation
      ✔ Should verify single company-controlled wallet authority (12ms)
      ✔ Should pass all 5 reconciliation integrity checks (53ms)
    5. Decoupled Dual Price Display Service
      ✔ Should return independent values for scheduled reference price and DEX spot price (137ms)
    6. Network Isolation & Security Guardrails
      ✔ PrimaryTokenSaleEngine must target BSC Testnet (Chain ID 97) (11ms)
      ✔ Primary sale must use Mock USDT contract 0x0b419a33e8a6448547906DCB191b037Db5ac926e (10ms)
      ✔ Codebase must not contain hardcoded private keys or seed phrases (14ms)

  LioraTokenImmutable Contract Audit & Verification Suite
    1. Deployment & Fixed Supply Invariants
      ✔ Should correctly set token name to 'LIORA COIN' (24ms)
      ✔ Should correctly set token symbol to 'LIORA' (18ms)
      ✔ Should return exactly 18 decimals via pure function (15ms)
      ✔ Should set total supply to exactly 1,000,000,000 LIORA (10^27 atomic units) (19ms)
      ✔ Should credit the entire 1 Billion initial supply to the designated initial holder (22ms)
      ✔ Should revert if initial holder is address(0) (51ms)
    2. Standard ERC-20 Transfers & Zero-Fee Invariants
      ✔ Should transfer tokens with exact 1:1 conservation (0% fee-on-transfer) (53ms)
      ✔ Should revert if sender balance is insufficient (32ms)
      ✔ Should execute transferFrom with exact allowance deduction (41ms)
      ✔ Should revert transferFrom if spender allowance is insufficient (28ms)
    3. Non-Custodial Token Burning
      ✔ Should allow a holder to burn their own tokens, permanently reducing total supply (51ms)
      ✔ Should allow burnFrom within approved allowance (39ms)
      ✔ Should revert burn if balance is insufficient (27ms)
    4. Absence of Privileged & Centralized Controls (Q21 Requirements)
      ✔ Must NOT have an owner() function or Ownable interface (12ms)
      ✔ Must NOT have a pause() or unpause() function (14ms)
      ✔ Must NOT have a post-deployment mint() function (11ms)
      ✔ Must NOT have blacklisting, whitelisting, or freezing functions (15ms)
      ✔ Must NOT have fee or tax setter functions (12ms)
      ✔ Must NOT have upgradeable proxy functions (e.g., upgradeTo, implementation) (10ms)
      ✔ Transfers must never be blocked or paused by any party (44ms)

  40 passing (5s)
```

---

## 3. Detailed Verification Breakdown

### 3.1 Suite 1: `LioraTokenImmutable.sol` Contract Verification

| # | Test Case Description | Assertion Checked | Result |
|---|---|---|---|
| 1 | Name verification | `token.name() === "LIORA COIN"` | **PASS** |
| 2 | Symbol verification | `token.symbol() === "LIORA"` | **PASS** |
| 3 | Decimals verification | `token.decimals() === 18` | **PASS** |
| 4 | Fixed total supply | `token.totalSupply() === 1_000_000_000 * 10^18` | **PASS** |
| 5 | Initial allocation credit | `balanceOf(initialHolder) === 1_000_000_000 * 10^18` | **PASS** |
| 6 | Zero address guard | Reverts on `deploy(address(0))` | **PASS** |
| 7 | Zero-fee transfers | Transfer 5,000 LIORA: Sender balance drops exactly 5,000, recipient balance increases exactly 5,000 (0% fee). | **PASS** |
| 8 | Balance underflow protection | Transfers exceeding balance revert. | **PASS** |
| 9 | Allowance & `transferFrom` | Allowance decreases by exact amount transferred; recipient receives 100%. | **PASS** |
| 10 | Allowance underflow protection | `transferFrom` exceeding allowance reverts. | **PASS** |
| 11 | Non-custodial burn | User burns 1,000 LIORA; user balance drops 1,000, total supply decreases to $999,999,000 \times 10^{18}$. | **PASS** |
| 12 | `burnFrom` allowance | Spender burns within approved allowance. | **PASS** |
| 13 | Burn underflow protection | Burning more tokens than held reverts. | **PASS** |
| 14 | Absence of `owner()` | `token.owner` is `undefined`. | **PASS** |
| 15 | Absence of `pause()` | `token.pause`, `token.unpause`, `token.paused` are `undefined`. | **PASS** |
| 16 | Absence of `mint()` | `token.mint` is `undefined`. | **PASS** |
| 17 | Absence of blacklist/whitelist | `token.blacklist`, `token.whitelist`, `token.freeze` are `undefined`. | **PASS** |
| 18 | Absence of fee setters | `token.setFee`, `token.setTax` are `undefined`. | **PASS** |
| 19 | Absence of proxy functions | `token.upgradeTo`, `token.implementation` are `undefined`. | **PASS** |
| 20 | Unrestricted transfers | Repeated peer-to-peer transfers execute with no blocking mechanism. | **PASS** |

### 3.2 Suite 2: Treasury, Token Sale & Liquidity Accounting Verification

| # | Test Case Description | Assertion Checked | Result |
|---|---|---|---|
| 1 | Total supply invariant | Double-entry ledger strictly enforces 1B tokens. | **PASS** |
| 2 | 70% Client allocation | Exactly 700,000,000 LIORA allocated to client bucket. | **PASS** |
| 3 | 30% Company reserve | Exactly 300,000,000 LIORA allocated to emergency reserve bucket. | **PASS** |
| 4 | Double-entry conservation | $\text{Delivered} + \text{Paired} + \text{Committed} + \text{Available} + \text{Reserve} \equiv 1\text{B}$. | **PASS** |
| 5 | Anti-double-counting | Primary sale delivery decrements available allocation by exact delivered tokens. | **PASS** |
| 6 | Baseline pricing quote | 100 USDT @ $0.10 baseline yields 1,000 LIORA. | **PASS** |
| 7 | **Unapproved pricing guard (Fixed in Sprint 1)** | `REFERENCE_SCHEDULE` returns `isExecutable = false` with `UNAPPROVED_PRICING_MODEL` error and rejects purchase execution. | **PASS** |
| 8 | Live DEX AMM spot quote | Live pool ratio computes dynamic expected tokens. | **PASS** |
| 9 | Zero/negative input guard | Rejects non-positive USDT amounts. | **PASS** |
| 10 | Allocation overflow guard | Rejects orders requesting more tokens than available in client bucket. | **PASS** |
| 11 | 100% USDT proceeds to liquidity | 500 USDT primary sale credits exactly 500 USDT to `usdtPendingLiquidityAllocation`. | **PASS** |
| 12 | Pending vs Deposited separation | Pending USDT is never counted as pool liquidity until confirmed on-chain. | **PASS** |
| 13 | Liquidity provision batch planner | Calculates exact matching LIORA required based on live pool ratio. | **PASS** |
| 14 | Treasury LP token custody | 100% of Cake-LP tokens minted from batch are credited to company treasury. | **PASS** |
| 15 | Single-wallet treasury authority | Validates `0xe31A2...` as authorized; rejects other addresses. | **PASS** |
| 16 | 5-Point reconciliation audit | 5 automated reconciliation checks pass with 0 discrepancy. | **PASS** |
| 17 | Decoupled dual pricing | Scheduled reference curve and DEX spot market report independent prices. | **PASS** |
| 18 | Chain ID isolation | Enforces BSC Testnet (Chain ID 97) only. | **PASS** |
| 19 | Test token contract isolation | Primary sale strictly references Mock USDT (`0x0b41...`). | **PASS** |
| 20 | Zero hardcoded private keys | Static code audit confirms no private keys or secrets exist in repository. | **PASS** |

---

## 4. TypeScript Type-Check Verification

In addition to the Mocha/Hardhat tests, the Next.js TypeScript project was compiled to verify frontend type safety:

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```
**Output:** Exited with code `0` (Zero compilation errors).
