# LIORA COIN — Sprint 3A Integration Report: Immutable Token Testnet Integration & End-to-End Verification

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Genesis Launch:** 4 December 2026  
**Primary Blockchain:** BNB Smart Chain (BSC Testnet #97 / BSC Mainnet #56)  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented by confirmed manual cash payout and collateral-return arrangement.

---

## 1. Executive Summary

Sprint 3A establishes the verification baseline for the transition to the immutable LIORA token architecture (`LioraTokenImmutable.sol`) on BNB Smart Chain Testnet (Chain ID 97) while rigorously testing and distinguishing live blockchain functionality from prototype simulations.

In strict compliance with management instructions:
- **Zero Real-Money Operations:** No real fiat, USDT, or BNB funds are accepted, held, or disbursed.
- **Zero BSC Mainnet Operations:** All interactions are strictly isolated to BSC Testnet (Chain ID 97).
- **Zero Automatic Deployments:** Contract bytecode and migration scripts are prepared and audited, but no deployment transactions were broadcast to create new tokens or pairs without explicit management authorization.
- **Preservation of Existing Infrastructure:** The currently operational testnet token (`0xeD155E37D0a400E63202cE031Fc1C984B18E7999`) and PancakeSwap V2 liquidity pool (`0x64beE3847a766D35E6611985F3c3e51C78Af5D2c`) remain active for ongoing testnet trading and UI verification.

All 57 automated unit, integration, and security tests pass across the repository (4.0s execution time), and the TypeScript web application compiles with zero errors.

---

## 2. Sprint 2 Implementation & Verification Audit

The following table distinguishes real on-chain functionality broadcast to BSC Testnet from local simulation and client-side prototype behavior:

| Capability / Module | Execution Layer | Verification Method | On-Chain Tx / Evidence | Status |
|---|---|---|---|---|
| **MetaMask & Binance Wallet Connection** | Client / Web3 Provider | `useWeb3Wallet.ts`, EIP-1193 | Window injection, chain detection (`0x61`) | **VERIFIED (Live Client)** |
| **BSC Testnet Network Switching** | Client / RPC | `wallet_switchEthereumChain` | Fallback `wallet_addEthereumChain` (RPC 97) | **VERIFIED (Live Client)** |
| **Live Balances (tBNB, LIORA, mUSDT, Cake-LP)** | On-Chain Query (Viem / RPC) | `useTestnetBalances.ts`, `verify-liquidity-onchain.js` | Direct query to BSC Testnet RPC (`0xeD15...`, `0x0b41...`, `0x64be...`) | **VERIFIED (Live On-Chain)** |
| **PancakeSwap V2 LIORA -> mUSDT Swap** | On-Chain Execution | `LioraDexSwapTerminal.tsx`, PancakeSwap V2 Router | Tx: `0x40f7a98ac32fe4ab7ad5ce7a55b81e47945aee1c682da1f8c82417a7a87ad315` (Block 143063078) | **VERIFIED (Live On-Chain Tx)** |
| **PancakeSwap V2 mUSDT -> LIORA Swap** | On-Chain Execution | `LioraDexSwapTerminal.tsx`, PancakeSwap V2 Router | Tx: `0x6b39b1f4484cc76fcbf1a8b7a78e495422bec4b5e224691de276d52b24993a2f` (Block 143063092) | **VERIFIED (Live On-Chain Tx)** |
| **Initial Pool Liquidity Provisioning** | On-Chain Execution | PancakeSwap V2 Factory & Router | Tx: `0x33cc7b5b45463bf4ff8d4d119f879762d6a46e741e0e6c01d91f88d2abbd6cc1` (Block 143062946) | **VERIFIED (Live On-Chain Tx)** |
| **Two-Step ERC-20 Approvals** | On-Chain Execution | ERC-20 `approve(spender, amount)` | Allowance verified on-chain before swap dispatch | **VERIFIED (Live On-Chain)** |
| **Slippage & Failure Handling** | Contract / UI Engine | `calculateOnChainSwapQuote`, Router `amountOutMin` | Automated edge-case tests & UI error catchers | **VERIFIED (Client & EVM Revert)** |
| **Investor & Admin Settlement Dashboards** | Web Application UI | `/dashboard`, `/admin`, `/settlement` | Role-gated via connected wallet (`isAdmin` check) | **VERIFIED (UI / State)** |
| **Manual Fiat Settlement & Collateral Return** | Local Memory / Storage Engine | `manualSettlementModel.ts`, `useManualSettlement.ts` | State machine: Payout -> Confirmation -> Collateral Return | **PROTOTYPE (Simulated Engine)** |
| **Primary Token Sale Execution** | UI & Engine (Guarded) | `primaryTokenSaleEngine.ts` | Execution blocked (`isExecutable = false`), unapproved warning | **DISABLED (Guarded by Design)** |

---

## 3. Core Technical Audits

### 3.1 Immutable Token Readiness (`LioraTokenImmutable.sol`)
- **Supply Invariant:** Exactly 1,000,000,000 LIORA (10^27 atomic units with 18 decimals) minted once during construction to `initialHolder`.
- **Zero Privileged Controls:** No `owner`, no `onlyOwner`, no administrative addresses, no access-control roles.
- **Zero Transfer Restrictions:** No token-level pause, blacklist, whitelist, anti-whale limit, or transaction fees (0% fee-on-transfer).
- **Non-Upgradeable:** Pure standard Solidity contract with no proxy pattern, UUPS dispatcher, or delegatecall mechanism.
- **Non-Custodial Burning:** Built-in OpenZeppelin `ERC20Burnable` allows holders to burn their own tokens to verifiably reduce circulating supply.

### 3.2 Live PancakeSwap V2 On-Chain Status (BSC Testnet #97)
Verified via direct RPC call to node `https://data-seed-prebsc-1-s1.bnbchain.org:8545`:
- **Pair Contract:** `0x64beE3847a766D35E6611985F3c3e51C78Af5D2c`
- **Token0 (mUSDT):** `0x0b419a33e8a6448547906DCB191b037Db5ac926e`
- **Token1 (LIORA):** `0xeD155E37D0a400E63202cE031Fc1C984B18E7999`
- **Current Reserves:** `501.0978 mUSDT` / `215,797.1977 LIORA`
- **Total LP Tokens:** `10,398.8049 Cake-LP`
- **Current AMM Spot Ratio:** 1 mUSDT = 430.6488 LIORA (1 LIORA = 0.00232208 mUSDT ≈ ₹0.2008 at ₹86.50/USD).
- **Test Wallet (`0xf28D...12aD`):**
  - tBNB (Gas): `0.260667 tBNB`
  - LIORA: `51.9873 LIORA`
  - mUSDT: `4.8791 mUSDT`
  - Cake-LP: `0.48188 Cake-LP`

### 3.3 Authorization & Treasury Security Boundaries
- **Multi-Layer Defense:** Security does not rely on disabled frontend buttons. Sensitive actions are guarded by client-side hooks, domain engines, and smart-contract level cryptographic validations.
- **Credential Hygiene:** Zero private keys, seed phrases, or sensitive credentials exist in the Git repository.
- **Settlement Integrity:** The manual payout prototype requires two-way validation: the owner submits a fiat transaction reference (UTR), but collateral return is blocked until the investor cryptographically confirms receipt or an independent arbitrator resolves a dispute.

---

## 4. Unresolved Management Decisions Impacting Integration

1. **Pricing Finalization Contradiction (Q14 vs Q16):**
   - Checklist (3) Q14 asserts price is finalized at plan selection.
   - Checklist (3) Q16 asserts price is recalculated at payment confirmation.
   - Primary-sale execution remains disabled until management approves the exact rule.
2. **Collateral Custody Architecture:**
   - Management must approve whether collateral tokens are held in an on-chain escrow contract (`LioraCollateralEscrow.sol`) or transferred directly to the investor's self-custody wallet.
3. **Multi-Sig Treasury Signers:**
   - The proposed 3-of-5 multisig requires management to formally appoint signers and configure hardware custody before contract deployment.

---

## 5. Verification Sign-Off

- **Solidity Compiler:** 0.8.20 (`runs: 200, evm: paris`)
- **Automated Tests:** 57 passing (0 failed, 0 skipped)
- **TypeScript Typecheck:** 0 errors across entire web codebase
- **On-Chain Testnet Status:** Operational on BSC Testnet (Chain ID 97)
- **Next Phase:** Sprint 3B — Execution of Immutable Token Migration on BSC Testnet upon management authorization.
