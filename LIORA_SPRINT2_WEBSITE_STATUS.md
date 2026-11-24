# LIORA COIN — Sprint 2 Website Status & Route Audit Report
**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Project Workspace:** `D:\Projects\OXENIQ`  
**Network Tested:** BNB Smart Chain Testnet (Chain ID `97`)  
**Frontend Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Viem, Lucide Icons  

---

## 1. Executive Summary

This report documents the status, functionality, execution boundaries, and responsiveness of all routes and portals within the LIORA COIN web application following Sprint 2 implementations.

Every user-facing feature has been rigorously inspected and categorized into:
1. **REAL ON-CHAIN TESTNET:** Broadcasts transactions to BSC Testnet (Chain ID 97), requires non-custodial wallet signatures (MetaMask / Binance Wallet), and mutates blockchain state.
2. **SIMULATED / DEMO LEDGER:** Runs client-side or against local mock stores for evaluation without broadcasting transactions to the blockchain.
3. **GUARDED / STAGED:** Financial operations deliberately blocked from execution until formal management authorization.

---

## 2. Route-by-Route Comprehensive Audit

| Route / Path | Portal / Page Name | Execution Classification | Real On-Chain Capabilities | Simulated / Guarded Aspects | Mobile & UX Status |
|---|---|---|---|---|---|
| **`/`** | Authentication & Welcome | Hybrid | EIP-1193 signature verification for wallet login (`/api/auth/verify-wallet`). | Demo account login credentials (`admin_dan`). | Fully responsive; clean sticky navbar. |
| **`/token`** | Tokenomics & Contracts | **REAL ON-CHAIN** | Queries live `totalSupply()`, `balanceOf()`, and token metadata from BSC Testnet (`0xeD155...7999`). | None; displays verified contract addresses. | Responsive table and card grids. |
| **`/swap`** | PancakeSwap V2 DEX Trading | **REAL ON-CHAIN** | Interacts with PancakeSwap V2 Router (`0xD99D...50D1`) and Pair (`0x64be...5D2c`). Performs ERC-20 `approve` and `swapExactTokensForTokens`. | Simulation tab available for educational comparison. | Responsive slippage modal and preset pills. |
| **`/liquidity`** | Liquidity Pool Management | **REAL ON-CHAIN** | Executes `addLiquidity` and `removeLiquidity` on PancakeSwap V2, minting and burning Cake-LP tokens. | Simulated tab available for slippage demonstration. | Responsive deposit/withdraw split view. |
| **`/settlement`** | **Manual Settlement Portal** | **NEW (PROTOTYPE)** | Connects Web3 wallet; reads live token addresses; tracks collateral allocations. | Payout references (UTR) and dispute arbitrations use seeded test store. | Multi-tab investor & admin console. |
| **`/sale`** | Primary Token Sale Terminal | **GUARDED** | Reads live PancakeSwap AMM spot rates and client allocation balances. | `REFERENCE_SCHEDULE` execution blocked; sale contract execution staged for Sprint 2. | Responsive dual-price comparison badge. |
| **`/treasury`** | Protocol Treasury Ledger | **GUARDED** | Reads on-chain pool reserves; tracks LP token custody. | Authority guarded to `0xe31A2...`; double-entry ledger verified. | Responsive 4-card metric grid. |
| **`/buy`** | Pre-Launch Offering Calculator| **SIMULATION** | None. | Educational 30-day prelaunch offering curve ($₹0.20 \to ₹30$) and multi-currency pricing calculator. | Responsive currency select dropdown. |
| **`/dashboard`** | Investor Portfolio & Portal | Hybrid | Displays live LIORA & USDT balances; renders embedded `InvestorSettlementPortal`. | Portfolio historical graph uses simulated session data. | Fully responsive cards and table. |
| **`/history`** | Settlement Ledger & History | Hybrid | On-chain swap history tracked via local wallet storage and BSCScan links. | Session transaction ledger reads from demo store. | Search and filter controls responsive. |
| **`/admin`** | Protocol Administration Console| Hybrid | Authenticated administrative session verification (`/api/auth/session`). | Embedded `AdminSettlementConsole` tab; mock commission configuration. | Responsive tab switcher and modal dialogs. |
| **`/referrals`** | 3-Level Referral MLM | **SIMULATION** | None. | Educational visualization of 3-tier commission matrix (Level 1: 5%, Level 2: 3%, Level 3: 2%). | Responsive network tree and code generator. |
| **`/commissions`**| Commission Accounting | **SIMULATION** | None. | Ledger tracking nominal referral commission claims. | Responsive ledger table. |
| **`/cross-chain`**| Multi-Chain Vision | **DISPLAY ONLY** | None. | Architectural blueprint for BNB Chain, Polygon, and Arbitrum. | Responsive educational diagrams. |
| **`/docs`** | Documentation Center | **STATIC CONTENT** | None. | Protocol architecture, tokenomics, and compliance specs. | Responsive documentation sidebar. |

---

## 3. Real On-Chain User Flow Verifications

### 3.1 Flow A: Web3 Wallet Connection & Network Guard
1. User clicks **"Connect Wallet"** in the navigation header.
2. The modal invokes EIP-6963 provider discovery, presenting installed providers (**MetaMask**, **Binance Web3 Wallet**, etc.).
3. User approves connection: Address and short identicon render immediately.
4. If connected to an unsupported network (e.g. Ethereum or Polygon), the UI displays a warning banner and offers a 1-click network switch:
   ```ts
   switchToBscTestnet() // calls wallet_switchEthereumChain (0x61)
   ```
5. Navigation bar displays live balances:
   - `[LIORA Logo] X,XXX.XX LIORA`
   - `[Green Dot] Y,YYY.YY USDT`

### 3.2 Flow B: PancakeSwap V2 Testnet Trading Flow (`/swap`)
1. User navigates to `/swap`.
2. Real-time reserves are fetched from the PancakeSwap pair (`0x64beE3847a766D35E6611985F3c3e51C78Af5D2c`).
3. User enters input amount (e.g., 500 LIORA).
4. AMM engine computes:
   - Expected Output (mUSDT) using constant product formula
   - Trading fee (0.25%)
   - Price impact %
   - Minimum received based on selected slippage tolerance (0.5%)
5. If allowance is insufficient, user clicks **"Approve LIORA"** $\to$ triggers `approve(router, amount)` on BSC Testnet.
6. Once confirmed, user clicks **"Swap LIORA for mUSDT"** $\to$ triggers `swapExactTokensForTokens`.
7. Transaction receipt modal displays confirmed BSC Testnet transaction hash with a clickable link to BSCScan.

### 3.3 Flow C: Manual Investment Settlement Workflow (`/settlement`)
1. Investor navigates to `/settlement` (or `/dashboard`).
2. Sees active plans: Principal (INR/USD), lock-in term (3 months), upfront collateral (e.g. 50,000 LIORA), and agreed cash payout (e.g. ₹125,000 in Month 4).
3. In Month 4, owner logs into `/settlement` (Admin Tab) and records fiat bank wire dispatch with reference code `HDFC-UTR-8923471029481`.
4. Investor sees status update to `PAYMENT_DISPATCHED`.
5. Investor verifies bank account and clicks **"Confirm Bank Payment Received"** $\to$ status advances to `PAYMENT_CONFIRMED`.
6. Investor clicks **"Return Collateral Tokens"** $\to$ collateral tokens return to treasury wallet, completing settlement (`SETTLED`).
7. If funds do not arrive, investor clicks **"Raise Dispute"** $\to$ freezes collateral and notifies treasury arbitration.

---

## 4. Mobile Responsiveness Evaluation

- **Navigation Bar:** Collapses into a clean slide-out drawer on screen widths $<1024$px, featuring one-click wallet access, live balance displays, and quick links.
- **Trading & Settlement Cards:** Full-width adaptive cards on mobile devices ($<640$px) with stacked inputs, touch-friendly preset buttons (25%, 50%, 75%, Max), and responsive table scrolls.
- **Modals & Dialogs:** Centered overlays with backdrop blur, touch-dismissable backgrounds, and padded scrolling for forms.
