# LIORA COIN — Current Project & Repository Audit
**Document File:** `LIORA_CURRENT_PROJECT_AUDIT.md`  
**Workspace:** `D:\Projects\OXENIQ`  
**Audited Target Network:** BNB Smart Chain Testnet (Chain ID `97`)  
**Target Mainnet Network:** BNB Smart Chain Mainnet (Chain ID `56`)  
**Target Launch Date:** 4 December 2026  
**Operating Entity & Jurisdiction:** GRANDIOSE TECH (Kenya)  
**Date:** November 23, 2026  

---

## 1. Executive Summary

This repository audit provides an exhaustive evaluation of the existing **LIORA COIN** codebase, on-chain smart contracts, decentralized exchange (PancakeSwap V2) integrations, frontend Next.js applications, backend API services, relational PostgreSQL/Prisma schemas, and automated test suites.

### Key Audit Findings:
1. **Core Token State:** The canonical LIORA token contract (`0xeD155E37D0a400E63202cE031Fc1C984B18E7999`) is deployed and active on BSC Testnet. Total supply is fixed at exactly 1,000,000,000 LIORA ($10^{27}$ atomic units) with 18 decimals and 0% transfer fees.
2. **Pausable Conflict with Latest Requirements:** The deployed token contract inherits OpenZeppelin's `Pausable` and contains `pause()` / `unpause()`. However, the latest management requirement (Requirement 3 / Q21 response) specifies: *"No token-level transfer restrictions, emergency pause or transaction fees"*. Because the deployed token is immutable, removing pause functionality requires either permanently executing `renounceOwnership()` on testnet or deploying a clean, non-pausable ERC-20 contract for production.
3. **PancakeSwap V2 Infrastructure:** The LIORA/mUSDT liquidity pool (`0x64beE3847a766D35E6611985F3c3e51C78Af5D2c`) is fully initialized and verified on BSC Testnet with 2-way swaps and liquidity add/remove workflows working.
4. **Primary Token Sale & Reference Schedule:** The frontend features both `/sale` and `/treasury` terminals. The dual pricing service correctly isolates the theoretical ₹0.20-to-₹30 reference price schedule from the independent AMM spot market. However, primary sales currently operate as client-side/in-memory simulations without an on-chain treasury sale smart contract.
5. **Backend, Database & Payments:** A comprehensive enterprise PostgreSQL schema exists via Prisma (covering identity, SIWE wallet nonces, investor allocations, vesting schedules, and double-entry financial ledgers). However, INR fiat payment integrations are currently mock/simulated, and the legal entity (GRANDIOSE TECH in Kenya) has no operational Indian payment gateway or Kenyan VASP license.

---

## 2. On-Chain Smart Contract & Deployment Audit

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        BSC TESTNET DEPLOYMENT STATUS                            │
├───────────────────────────────┬──────────────────────────────────┬──────────────┤
│ Contract / Entity             │ Deployed Address                 │ Status       │
├───────────────────────────────┼──────────────────────────────────┼──────────────┤
│ LIORA BEP-20 Token            │ 0xeD155E37D0a400E63202cE031Fc1C984B18E7999      │ Live / Active│
│ Mock USDT (mUSDT) Sandbox     │ 0x0b419a33e8a6448547906DCB191b037Db5ac926e      │ Live / Active│
│ PancakeSwap V2 Pair           │ 0x64beE3847a766D35E6611985F3c3e51C78Af5D2c      │ Live / Active│
│ PancakeSwap V2 Router         │ 0xD99D1c33F9fC3444f8101754aBC46c52416550D1      │ Live / Active│
│ PancakeSwap V2 Factory        │ 0x6725F303b657a9451d8BA641348b6761A6CC7a17      │ Live / Active│
│ Authorized Deployer / Treasury│ 0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350      │ Single EOA   │
└───────────────────────────────┴──────────────────────────────────┴──────────────┘
```

### Module 2.1: `LioraToken.sol`
- **File:** [contracts/LioraToken.sol](file:///d:/Projects/OXENIQ/contracts/LioraToken.sol)
- **Deployment Artifact:** [deployments/bscTestnet-liora.json](file:///d:/Projects/OXENIQ/deployments/bscTestnet-liora.json)
- **Existing Implementation:** Clean OpenZeppelin v5 contract inheriting `ERC20`, `ERC20Burnable`, `Pausable`, `Ownable2Step`.
- **Verified Working Functionality:**
  - Total supply minted at construction: exactly 1,000,000,000 LIORA ($10^{27}$ base units).
  - 18 decimals, 0% transfer tax, full PancakeSwap V2 AMM compatibility.
  - Ownership managed via two-step transfer pattern.
- **Missing Functionality:** No built-in lockup, vesting, or allocation partitions (handled modularly).
- **Bugs & Security Concerns:**
  - **Pausability Conflict:** Contract has `pause()` / `unpause()`, which violates the latest confirmed requirement: *"No token-level transfer restrictions, emergency pause or transaction fees"*.
  - **Centralization Risk:** Contract owner and 99.98% of total supply reside in a single EOA (`0xe31A...9350`).
- **Required Changes:**
  - Option A (Testnet continuity): Retain deployed testnet contract but permanently call `renounceOwnership()` or leave unpaused.
  - Option B (Mainnet preparation): Author `LioraTokenMainnet.sol` omitting `Pausable` completely to strictly enforce zero emergency pause.
- **Dependencies:** Hardhat toolchain, OpenZeppelin v5.
- **Estimated Complexity:** Low (1 day).
- **Can Development Proceed Now?** YES.
- **Management Clarification Required?** YES: Confirm whether testnet continues with `0xeD15...7999` while deploying clean non-pausable token for mainnet genesis.

### Module 2.2: Legacy Contracts (`AllocationManager.sol`, `TestnetTokenSale.sol`, `OxeniqToken.sol`)
- **Files:** `contracts/AllocationManager.sol`, `contracts/TestnetTokenSale.sol`, `contracts/OxeniqToken.sol`
- **Existing Implementation:** Older phase contracts bound to previous token name ("OXENIQ").
- **Verified Working Functionality:** Hardhat unit tests pass (641 passing tests).
- **Missing Functionality:** Not connected to canonical LIORA token (`0xeD15...7999`).
- **Required Changes:** Deprecate or refactor for LIORA modular architecture (e.g., `LioraTokenSale.sol`, `LioraVestingVault.sol`).
- **Dependencies:** `LioraToken.sol`.
- **Estimated Complexity:** Medium (2–3 days).
- **Can Development Proceed Now?** YES.

---

## 3. Decentralized Exchange (DEX) & Liquidity Audit

### Module 3.1: PancakeSwap V2 Swap & Liquidity Hooks
- **Files:** [apps/web/src/hooks/useDexOnChainSwap.ts](file:///d:/Projects/OXENIQ/apps/web/src/hooks/useDexOnChainSwap.ts), [apps/web/src/hooks/useDexOnChainLiquidity.ts](file:///d:/Projects/OXENIQ/apps/web/src/hooks/useDexOnChainLiquidity.ts)
- **Website Routes:** `/swap`, `/liquidity`
- **Verified Working Functionality:**
  - Live on-chain reserve reading via RPC (`reserveLiora: ~215,829`, `reserveUsdt: ~500.97`).
  - Two-way swap quotes (LIORA -> mUSDT and mUSDT -> LIORA) with 0.25% protocol fee calculation.
  - Multi-provider wallet execution with EIP-6963 discovery and TronLink isolation.
  - Exact token allowance checks and single-click approval workflows.
  - 50% and 100% liquidity removal calculations with slippage tolerance bounds.
- **Missing Functionality:** No multi-hop router support (only direct LIORA/USDT pair).
- **Bugs & Security Concerns:** Front-running/sandwich risk mitigated by 0.5% default slippage and 5-minute deadline.
- **Required Changes:** Update brand assets and ensure clean error reporting if RPC nodes fail.
- **Estimated Complexity:** Low (Already verified passing in Gates C6, C6B, C7, C7B).
- **Can Development Proceed Now?** YES.
- **Management Clarification Required?** NO.

### Module 3.2: 100% Proceeds-to-Liquidity Workflow
- **File:** [apps/web/src/lib/treasury/liquidityProvisioningWorkflow.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/treasury/liquidityProvisioningWorkflow.ts)
- **Verified Working Functionality:**
  - Ratio-matched pairing calculation:
    $$\text{Required LIORA} = \frac{\Delta\text{USDT} \times \text{Reserve}_{\text{LIORA}}}{\text{Reserve}_{\text{USDT}}}$$
  - Matching LIORA is drawn strictly from the 70% client allocation.
  - 100% of Cake-LP tokens are assigned to the company treasury wallet (`0xe31A...9350`).
- **Missing Functionality:** Batch execution currently simulated in frontend state rather than triggering multi-sig or automated smart-contract deposit.
- **Bugs & Security Concerns:** Economic sustainability of 100% proceeds allocation (see Gap Analysis).
- **Required Changes:** Create on-chain router caller or multi-sig batch execution script.
- **Dependencies:** PancakeSwap V2 Router.
- **Estimated Complexity:** Medium (2 days).
- **Can Development Proceed Now?** YES.

---

## 4. Primary Token Sale, Treasury & Pricing Audit

### Module 4.1: Primary Token Sale Terminal (`/sale`)
- **Files:** [apps/web/src/components/sale/PrimarySaleTerminal.tsx](file:///d:/Projects/OXENIQ/apps/web/src/components/sale/PrimarySaleTerminal.tsx), [apps/web/src/lib/sale/primaryTokenSaleEngine.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/sale/primaryTokenSaleEngine.ts)
- **Verified Working Functionality:**
  - Multi-model quotation preview: Fixed Baseline ($0.10 / ₹8.65), Live AMM Spot, and Reference Schedule.
  - Allocation sufficiency verification (rejects purchases exceeding remaining 700M allocation).
  - Decoupled pricing display with live DEX divergence indicators.
- **Missing Functionality:**
  - **No On-Chain Primary Sale Contract:** Purchases do not execute against an on-chain smart contract; they generate client-side `SIMULATED` receipts.
  - **Execution Guard Defect (Gate C9B finding):** In `primaryTokenSaleEngine.ts`, selecting `REFERENCE_SCHEDULE` leaves `error = undefined`, enabling the purchase button for an unapproved schedule.
- **Required Changes:**
  1. Add strict guard blocking purchase execution when `REFERENCE_SCHEDULE` is selected.
  2. Implement/deploy a dedicated `LioraTokenSale.sol` contract on testnet for on-chain USDT deposit and LIORA delivery.
- **Dependencies:** Treasury wallet inventory.
- **Estimated Complexity:** Medium (3 days).
- **Can Development Proceed Now?** YES.

### Module 4.2: Treasury Accounting Engine (`/treasury`)
- **Files:** [apps/web/src/components/treasury/TreasuryOverviewDashboard.tsx](file:///d:/Projects/OXENIQ/apps/web/src/components/treasury/TreasuryOverviewDashboard.tsx), [apps/web/src/lib/treasury/treasuryAccountingEngine.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/treasury/treasuryAccountingEngine.ts)
- **Verified Working Functionality:**
  - Enforces double-entry conservation invariant across all sub-accounts:
    $$\text{Delivered} + \text{Paired} + \text{Committed} + \text{Available} + \text{Reserve} \equiv 1,000,000,000 \text{ LIORA}$$
  - Automated 5-point reconciliation engine.
  - Strict separation: 700,000,000 Client bucket vs 300,000,000 Company Reserve.
- **Missing Functionality:** The 300M reserve is maintained in ledger memory, not in an on-chain timelock/escrow vault.
- **Bugs & Security Concerns:**
  - Non-treasury wallets connected to the page see an active "Allocate Batch" button if pending USDT > 0 (Gate C9B finding: needs `isTreasuryAuthority` check).
- **Required Changes:** Restrict batch execution UI button to `isTreasuryAuthority`.
- **Estimated Complexity:** Low (1 day).
- **Can Development Proceed Now?** YES.

---

## 5. Website Routes & User Portals Audit

A comprehensive route audit across [apps/web/src/app](file:///d:/Projects/OXENIQ/apps/web/src/app) reveals:

| Route | Purpose | Current Implementation Status | Production Readiness |
| :--- | :--- | :--- | :--- |
| `/` | Landing Homepage & Ecosystem Portal | Implemented (Brand: LIORA COIN) | Ready (85%) |
| `/swap` | PancakeSwap V2 DEX Trading | Implemented & verified on BSC Testnet | Ready (95%) |
| `/liquidity`| PancakeSwap V2 Pool Management | Implemented & verified on BSC Testnet | Ready (95%) |
| `/sale` | Primary Token Sale Terminal | Implemented (Simulated Engine) | Needs On-Chain Contract (70%) |
| `/treasury`| 70:30 Supply Ledger & Reserve Audit | Implemented (Double-Entry Engine) | Ready for Testnet (90%) |
| `/buy` | Legacy Pre-Launch / Multi-Currency | Implemented (Simulated INR/USD) | Requires Refactoring (50%) |
| `/dashboard`| User Portfolio & Asset Balances | Implemented (Demo Store / Local State) | Needs Real Backend Sync (60%) |
| `/history` | Transaction Settlement History | Implemented (Demo Store Filter) | Needs On-Chain/DB Sync (65%) |
| `/auth` | Web3 & Email Authentication | Implemented (SIWE Nonces in Prisma) | Ready for DB Cutover (75%) |
| `/profile` | User Profile & Security Settings | Implemented (Demo State) | Needs Real DB Binding (60%) |
| `/admin` | Administrator Management Console | Implemented (Password / Session) | Needs Multi-Sig Role Guard (60%) |
| `/commissions`| Referral & Affiliate Network | Implemented (Demo Simulation) | Needs Smart Contract or DB (40%) |
| `/referrals`| Referral Tree & Link Sharing | Implemented (Demo Simulation) | Needs Smart Contract or DB (40%) |
| `/trading-bot`| Automated Trading Subscription | Implemented (Phase 19/20 Architecture)| Deferred / Non-Core for Genesis |
| `/cross-chain`| Multi-Chain Asset Bridge | Informational / Placeholder | Correctly Disabled for Genesis |
| `/token` | Tokenomics & Metrics Overview | Implemented (1B Fixed Supply Specs) | Ready (90%) |
| `/docs` | Ecosystem Documentation & Whitepaper| Implemented | Ready (85%) |

---

## 6. Backend Services, Database & Payments Audit

### Module 6.1: Relational Database (Prisma / PostgreSQL)
- **File:** [prisma/schema.prisma](file:///d:/Projects/OXENIQ/prisma/schema.prisma)
- **Models:** 22 relational models including `User`, `VerifiedWallet`, `AuthNonce`, `InvestorQuote`, `PurchaseIntent`, `InvestorAllocation`, `VestingSchedule`, `PaymentTransaction`, `TokenBalance`, `LedgerAccount`, `LedgerPosting`.
- **Verified Working Functionality:** Schema complies with enterprise double-entry standards and passes automated PostgreSQL integration tests (`Phase2B_RealPostgresPersistence.test.js`).
- **Missing Functionality:** Production environment currently uses in-memory / demo state fallback in the Next.js client (`useDemoStore`) when PostgreSQL connection string is unset.
- **Required Changes:** Run Prisma migration on staging database; connect API routes directly to Prisma client.
- **Estimated Complexity:** Medium (3 days).
- **Can Development Proceed Now?** YES.

### Module 6.2: Payment Integrations (USDT & INR)
- **Existing Implementation:**
  - **USDT:** BSC Testnet Mock USDT (`0x0b41...926e`) transfer verification implemented and tested.
  - **INR:** Mathematical conversions implemented in [fiatCurrencies.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/commerce/fiatCurrencies.ts). Webhook validation models exist in Prisma (`PaymentTransaction`).
- **Missing Functionality:** No live payment gateway (e.g., Razorpay, Cashfree, Stripe, or P2P escrow) is integrated or active.
- **Bugs & Legal/Regulatory Concerns:** Operating an INR fiat payment on-ramp from a Kenyan registered entity (GRANDIOSE TECH) presents severe cross-border compliance, FEMA/RBI restrictions, and banking onboarding hurdles.
- **Required Changes:**
  1. Primary launch must rely on on-chain BEP-20 USDT / BNB payments.
  2. INR fiat integration must remain in sandbox mode until payment aggregator approval is secured in writing.
- **Dependencies:** Payment provider commercial approval.
- **Estimated Complexity:** High (Requires external banking approval).
- **Can Development Proceed Now?** Crypto payments: YES. Fiat INR: BLOCKED awaiting provider contract.
- **Management Clarification Required?** YES: Confirm if 4 Dec 2026 launch will launch crypto-only (USDT on BSC) if INR aggregator is unapproved.

---

## 7. Automated Test Suite Status

The project contains a comprehensive, multi-layer testing harness:

| Suite | Scope | Tests Run | Result |
| :--- | :--- | :---: | :---: |
| **Hardhat Unit Suite** | Contracts, splits, supply invariants, pausable, Ownable2Step | 641 | **641 / 641 PASSED** (53s) |
| **Gate C9 Suite** | Primary sale, treasury double-entry, proceeds routing | 20 | **20 / 20 PASSED** (181ms) |
| **Gate C7B Suite** | Multi-wallet persistence, EIP-6963, TronLink rejection | 21 | **21 / 21 PASSED** |
| **Gate C7 Suite** | PancakeSwap V2 liquidity management & pool quotes | 26 | **26 / 26 PASSED** |
| **Gate C6B Suite** | Hydration mismatch prevention & wallet approval hardening | 20 | **20 / 20 PASSED** |
| **Gate C6 Suite** | Verified PancakeSwap swaps on BSC Testnet | 20 | **20 / 20 PASSED** |
| **TypeScript Check** | Complete Next.js frontend compilation (`tsc --noEmit`) | Full app | **0 ERRORS** |
| **TOTAL** | **Entire Project Regression Harness** | **748** | **748 / 748 PASSED** |

---

## 8. Summary Audit Scorecard

| Dimension | Rating (1–5) | Current State Summary |
| :--- | :---: | :--- |
| **Smart Contract Security** | 4.5 / 5 | Clean OpenZeppelin v5, 0% fees, 1B fixed supply. Needs pause removal for mainnet. |
| **DEX / Liquidity Readiness**| 4.8 / 5 | PancakeSwap V2 pool, router, swaps, and liquidity fully verified on testnet. |
| **Frontend UI Completeness** | 4.2 / 5 | Modern, responsive dark UI; needs transition from demo store to live DB on user pages. |
| **Backend & DB Architecture**| 4.0 / 5 | Enterprise Prisma schema; needs active PostgreSQL cutover. |
| **Regulatory & Payment Feasibility**| 2.0 / 5 | High risk on INR fiat onboarding from Kenya entity; crypto USDT on BSC is ready. |
| **Launch Preparedness (Dec 4)**| 3.8 / 5 | Highly achievable for BSC crypto launch; unrealistic for regulated fiat banking. |
