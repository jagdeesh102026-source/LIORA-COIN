# LIORA COIN — Sprint 1 Website Audit & Execution Verification
**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Project Workspace:** `D:\Projects\OXENIQ`  
**Network Under Test:** BNB Smart Chain Testnet (Chain ID `97`)  
**Frontend Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Viem, Lucide Icons  

---

## 1. Executive Summary

During Sprint 1, an end-to-end audit was conducted across all web application routes, wallet connectors, trading interfaces, dashboards, and administrative portals. 

The audit rigorously classified each user-facing feature as either:
- **REAL ON-CHAIN TESTNET EXECUTION:** Broadcasts transactions to BSC Testnet (Chain ID 97), requires wallet signature via MetaMask or Binance Wallet, mutates blockchain state, and waits for block confirmation.
- **SIMULATED / DEMO LEDGER EXECUTION:** Operates client-side or against local demo state, calculators, or mock receipt generators without broadcasting transactions to the blockchain.

Two isolated security and guardrail defects identified during Gate C9B were resolved and verified without altering underlying financial logic.

---

## 2. Comprehensive Route & Feature Classification

| Route / Module | Primary Component / File | Execution Mode | Blockchain Interaction | Status & Audit Verdict |
|---|---|---|---|---|
| **`/` (Homepage / Auth)** | `apps/web/src/app/auth/page.tsx` | Simulated & Hybrid | EIP-1193 signature verification (`/api/auth/verify-wallet`); demo store session initialization. | **WORKING:** Supports credential login and Web3 wallet address authentication. |
| **`/token` (Token Info)** | `apps/web/src/app/token/page.tsx` | **REAL ON-CHAIN** | Queries on-chain `totalSupply()`, `balanceOf()`, and user token balance from BSC Testnet (`0xeD155...7999`). | **WORKING:** Displays live on-chain token metadata and testnet contract addresses. |
| **Wallet Connection** | `Web3WalletContext.tsx` | **REAL ON-CHAIN** | Implements EIP-6963 multi-provider discovery (`io.metamask`, `com.binance`, Trust, Coinbase). Auto-prompts network switch to Chain 97. | **WORKING:** Connects seamlessly with MetaMask and Binance Web3 Wallet; enforces BSC Testnet isolation. |
| **`/swap` (DEX Swap)** | `apps/web/src/app/swap/page.tsx` | **REAL ON-CHAIN** | Interacts directly with PancakeSwap V2 Router (`0xD99D...50D1`) and Pair (`0x64be...5D2c`). Performs ERC-20 `approve` and `swapExactTokensForTokens`. | **WORKING:** Real on-chain swap execution with live AMM pricing and tx receipt tracking. |
| **`/liquidity` (Pool Liquidity)** | `apps/web/src/app/liquidity/page.tsx` | **REAL ON-CHAIN** | Interacts with PancakeSwap V2 Router and Pair. Executes `addLiquidity` and `removeLiquidity`, minting/burning Cake-LP tokens. | **WORKING:** Real on-chain liquidity provisioning with automated ratio calculation. |
| **`/sale` (Primary Token Sale)** | `apps/web/src/app/sale/page.tsx` | Simulated / Staged | Simulates primary sale purchase, generates structured receipt, and registers 100% of USDT proceeds into pending liquidity pipeline. | **WORKING & GUARDED:** Reference schedule execution strictly blocked; awaiting on-chain sale contract. |
| **`/treasury` (Treasury Accounting)** | `apps/web/src/app/treasury/page.tsx` | Hybrid (On-Chain + Ledger) | Reads live PancakeSwap pool reserves on-chain; executes liquidity batch provisioning; verifies 5-point reconciliation invariant. | **WORKING & GUARDED:** Authority restricted to `0xe31A2...`; double-entry ledger verified. |
| **`/buy` (Offering Calculator)** | `apps/web/src/app/buy/page.tsx` | Simulated Calculator | Multi-tier calculator simulating 30-day prelaunch offering curve ($₹0.20 \to ₹30$) and multi-currency conversions. | **WORKING:** Educational / display simulation; does not broadcast financial transactions. |
| **`/dashboard` (Investor Dashboard)** | `apps/web/src/app/dashboard/page.tsx` | Simulated (Demo Store) | Reads user profile, mock token holdings, and simulated referral earnings from `useDemoStore`. | **WORKING:** Functional demo portal awaiting integration with manual settlement architecture. |
| **`/history` (Transaction Ledger)** | `apps/web/src/app/history/page.tsx` | Simulated (Demo Store) | Displays demo user transaction history and hashes. On-chain swap history is separately tracked in `/swap` and `/liquidity`. | **WORKING:** Demo transaction viewer. |
| **`/admin` (Admin Console)** | `apps/web/src/app/admin/page.tsx` | Server API / Demo | Administrative configuration for prelaunch parameters, bot subscriptions, and commission overrides. | **WORKING:** Authenticated admin interface. |

---

## 3. Isolated Defect Fixes Applied in Sprint 1

### Defect 1: Unapproved Reference-Schedule Execution Guard
- **Source File:** [apps/web/src/lib/sale/primaryTokenSaleEngine.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/sale/primaryTokenSaleEngine.ts) & [apps/web/src/components/sale/PrimarySaleTerminal.tsx](file:///d:/Projects/OXENIQ/apps/web/src/components/sale/PrimarySaleTerminal.tsx)
- **Root Cause:** When `REFERENCE_SCHEDULE` was selected, the quotation engine populated price values and a warning note, but left `error = undefined` and `isValid = true`. Consequently, the UI purchase button remained active, permitting simulated purchase executions against an unapproved schedule.
- **Resolution:**
  1. Added `isExecutable: boolean` and `executionDisabledReason?: string` to `PrimarySaleQuote`.
  2. In `computeQuote`, when `model === 'REFERENCE_SCHEDULE'`, explicitly set `isExecutable = false` and `executionDisabledReason = 'UNAPPROVED_PRICING_MODEL: The reference-price schedule is a theoretical simulation and cannot execute purchases until approved by management.'`.
  3. In `executePurchase`, added an explicit check: `if (!quote.isValid || !quote.isExecutable ...) return { success: false, error: ... }`.
  4. In `PrimarySaleTerminal.tsx`, updated the purchase button disabled condition to `disabled={isPurchasing || !quote.isValid || !quote.isExecutable}` and displayed the descriptive reason in the button text.
- **Verification:** Verified by automated test in `test/Phase2B_GateC9_TreasuryAndTokenSale.test.js` (Test 7) and confirmed passing.

### Defect 2: Treasury Authority Access Guard on Liquidity Batch Allocation
- **Source File:** [apps/web/src/components/treasury/TreasuryOverviewDashboard.tsx](file:///d:/Projects/OXENIQ/apps/web/src/components/treasury/TreasuryOverviewDashboard.tsx)
- **Root Cause:** In the Treasury Overview Dashboard, the "Allocate Batch into AMM Pool" button checked `provisionPlan.canExecute`, but did not check `isTreasuryAuthority`. Any connected non-treasury wallet would see an enabled button, though the action was meant for the authorized treasury wallet only.
- **Resolution:**
  1. Added `!isTreasuryAuthority` to the button's `disabled` condition.
  2. Replaced the button label with `"Treasury Authority Required for Pool Allocation"` when connected with a non-treasury wallet.
  3. Rendered an explicit notification: `"Only authorized treasury wallet (0xe31A...9350) can execute liquidity provisioning."`
- **Verification:** Verified in component render logic and TypeScript type check.

---

## 4. Wallet Integration Audit (MetaMask & Binance Wallet)

The Web3 wallet provider infrastructure in `apps/web/src/context/Web3WalletContext.tsx` was verified:

1. **EIP-6963 Standard Compliance:**
   - Automatically listens for `eip6963:announceProvider` and dispatches `eip6963:requestProvider`.
   - Distinctly recognizes and displays MetaMask (`rdns: io.metamask`) and Binance Web3 Wallet (`rdns: com.binance`).
   - Gracefully falls back to `window.ethereum` or `window.BinanceChain` for legacy browser extension environments.
2. **Network Isolation Enforcement:**
   - Detects connected chain ID on every wallet event (`chainChanged`, `accountsChanged`).
   - If the connected network is not BSC Testnet (Chain ID 97) or Local Devnet (Chain ID 31337), the UI displays a network mismatch alert and provides a one-click RPC switch (`wallet_switchEthereumChain` / `wallet_addEthereumChain`).
   - Mainnet execution remains hardcoded as disabled at this stage (`SUPPORTED_CHAIN_IDS = [97, 31337]`).
3. **Session Persistence:**
   - Successfully retains the user's connected wallet preference in `localStorage` under `oxeniq_wallet_preference`.
