# LIORA COIN — Sprint 2 Implementation Report: Website & Testnet Trading
**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Launch:** 4 December 2026  
**Primary Network:** BNB Smart Chain (BSC Testnet Chain ID `97`, Mainnet Chain ID `56`)  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented by confirmed manual cash payout and collateral-return arrangement.

---

## 1. Executive Summary

During Sprint 2, the actual LIORA user experience was built, verified, and audited on **BNB Smart Chain Testnet (Chain ID 97)** without activating real-money transactions or deploying unapproved mainnet contracts.

Key accomplishments achieved:
1. **Wallet & Token Integration:** Multi-provider EIP-6963 Web3 wallet infrastructure was verified for MetaMask and Binance Web3 Wallet, enforcing BSC Testnet isolation and displaying live on-chain LIORA, mock USDT, and native tBNB balances.
2. **PancakeSwap V2 On-Chain Trading:** Validated real on-chain buy, sell, and swap flows directly against the PancakeSwap V2 Router (`0xD99D...50D1`) and Pair (`0x64be...5D2c`), including constant-product output calculation, 0.25% LP trading fees, dynamic price impact, and slippage protection.
3. **Decoupled Pricing Model:** Maintained strict architectural separation between the company's internal ₹0.20 $\to$ ₹30.00 reference simulation and the live DEX market spot price. The reference-price schedule remains strictly non-executable for primary sales.
4. **Manual Settlement Architecture & Interactive Prototype:** Developed full interactive UI and state-machine prototypes for the newly confirmed investor settlement workflow:
   $$\text{Investment Created} \to \text{Collateral Allocated} \to \text{Lock-in Term} \to \text{Month 4 Manual Payout} \to \text{Investor Verified} \to \text{Collateral Returned} \to \text{Settled}$$
   Equipped with investor views, admin console, dispute arbitration, and double-entry reconciliation.
5. **Quality Assurance:** 57 automated unit and integration tests passed cleanly (100% passing) with zero TypeScript compilation errors.

---

## 2. Phase 1 — Wallet and Token Integration

### 2.1 Multi-Provider EIP-6963 Discovery
The wallet integration in [apps/web/src/context/Web3WalletContext.tsx](file:///d:/Projects/OXENIQ/apps/web/src/context/Web3WalletContext.tsx) implements EIP-6963 discovery (`eip6963:announceProvider` / `eip6963:requestProvider`):
- Explicitly recognizes and presents **MetaMask** (`io.metamask`), **Binance Web3 Wallet** (`com.binance`), Trust Wallet, and Coinbase Wallet.
- Automatically falls back to legacy `window.ethereum` or `window.BinanceChain` if standard discovery is absent.
- Persists user provider preferences across browser reloads via `localStorage`.

### 2.2 Network Isolation & Guardrails
- Strictly restricts operations to **BNB Smart Chain Testnet (Chain ID 97)** and Local Devnet (Chain ID 31337).
- Real transactions on BSC Mainnet (Chain ID 56) remain hardcoded as disabled at this stage (`SUPPORTED_CHAIN_IDS = [97, 31337]`).
- If an unsupported network is detected (e.g. Ethereum Mainnet, Polygon), the UI displays a network mismatch banner and provides a one-click RPC switch (`wallet_switchEthereumChain` / `wallet_addEthereumChain`).

### 2.3 Live Token Balances Display
- Created [apps/web/src/hooks/useTestnetBalances.ts](file:///d:/Projects/OXENIQ/apps/web/src/hooks/useTestnetBalances.ts) querying live on-chain balances:
  - **LIORA Token Balance:** `balanceOf(user)` from `0xeD155E37D0a400E63202cE031Fc1C984B18E7999`
  - **Mock USDT Balance:** `balanceOf(user)` from `0x0b419a33e8a6448547906DCB191b037Db5ac926e`
  - **Native tBNB Balance:** `getBalance({ address: user })`
- Integrated live balance pills directly into the primary navigation bar in [apps/web/src/components/Header.tsx](file:///d:/Projects/OXENIQ/apps/web/src/components/Header.tsx).

---

## 3. Phase 2 — Buying, Selling and Swapping (PancakeSwap V2)

### 3.1 Testnet AMM Architecture
Trading is executed against official PancakeSwap V2 Testnet infrastructure:
- **Router:** `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`
- **Pair (LIORA/mUSDT):** `0x64beE3847a766D35E6611985F3c3e51C78Af5D2c`
- **Quote Token:** Mock USDT (`0x0b419a33e8a6448547906DCB191b037Db5ac926e`)

### 3.2 Quote & Slippage Mechanics
The calculation engine in [apps/web/src/lib/dex/dexOnChainClient.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/dex/dexOnChainClient.ts) computes exact constant-product output:
$$\Delta y = \frac{0.9975 \cdot \Delta x \cdot y}{x + 0.9975 \cdot \Delta x}$$
- **Trading Fee:** Exactly 0.25% deducted from input amount before reserve calculation.
- **Price Impact %:** Measured dynamically as divergence between spot price and effective execution price.
- **Minimum Received:** Calculated based on user slippage tolerance (0.1%, 0.5%, 1.0%, or custom up to 50%):
  $$\text{AmountOutMin} = \text{ExpectedAmountOut} \cdot \left(1 - \frac{\text{SlippageTolerance}}{100}\right)$$

### 3.3 Transaction Approvals & Execution Flow
- **Approval Check:** Inspects `allowance(user, router)` before enabling swap. If allowance is insufficient, an "Approve [Token]" button is presented.
- **Execution:** Calls `swapExactTokensForTokens` with `deadline = block.timestamp + 1200`.
- **Receipts & History:** Confirmed transactions record the BSC Testnet transaction hash and provide direct explorer links to BSCScan.

### 3.4 Decoupled Pricing Invariant
The company's ₹0.20 $\to$ ₹30.00 reference schedule is tracked in [apps/web/src/lib/dex/dualPriceService.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/dex/dualPriceService.ts) and displayed as a theoretical simulation side-by-side with live PancakeSwap spot rates. It cannot execute primary sales or AMM swaps.

---

## 4. Phase 3 — Website and Dashboards Audit

| Route / Page | Verification Scope | Status | Notes |
|---|---|---|---|
| **`/` (Auth / Home)** | Login options, wallet auth, navigation | **WORKING** | Supports password demo auth & Web3 wallet signature auth. |
| **`/token`** | Token specs, on-chain metadata | **WORKING** | Displays 1B supply, 18 decimals, contract addresses. |
| **`/swap`** | On-chain AMM trading terminal | **WORKING** | Real PancakeSwap V2 swaps (Buy/Sell LIORA). |
| **`/liquidity`** | On-chain LP provision & removal | **WORKING** | Real Cake-LP mint/burn on BSC Testnet. |
| **`/settlement`** | Investor & admin settlement prototype | **NEW (WORKING)** | Prototype for Month 4 payouts and collateral tracking. |
| **`/sale`** | Primary Token Sale terminal | **GUARDED** | Reference schedule blocked; awaiting sale contract. |
| **`/treasury`** | Reserve accounting & 5-point audit | **GUARDED** | Authority restricted to `0xe31A2...`; double-entry balanced. |
| **`/buy`** | Offering curve calculator | **SIMULATION** | Educational multi-currency calculator. |
| **`/dashboard`** | Portfolio & investment dashboard | **WORKING** | Displays holdings and embedded settlement portal. |
| **`/history`** | Transaction history | **WORKING** | Demo ledger & verified DEX swap records. |
| **`/admin`** | Protocol administration console | **WORKING** | Embedded `AdminSettlementConsole` tab. |

---

## 5. Phase 4 — Manual Settlement Interfaces Prototype

In strict alignment with the confirmed management decision (collateral upfront $\to$ 3-month lock-in $\to$ Month 4 cash payment $\to$ collateral returned), full interactive prototype modules were built:

### 5.1 Architecture & Core Components
- **Data Model & Engine:** [apps/web/src/lib/settlement/manualSettlementModel.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/settlement/manualSettlementModel.ts)
- **React Hook:** [apps/web/src/hooks/useManualSettlement.ts](file:///d:/Projects/OXENIQ/apps/web/src/hooks/useManualSettlement.ts)
- **Investor Portal:** [apps/web/src/components/settlement/InvestorSettlementPortal.tsx](file:///d:/Projects/OXENIQ/apps/web/src/components/settlement/InvestorSettlementPortal.tsx)
- **Admin Console:** [apps/web/src/components/settlement/AdminSettlementConsole.tsx](file:///d:/Projects/OXENIQ/apps/web/src/components/settlement/AdminSettlementConsole.tsx)
- **Dedicated Route:** [apps/web/src/app/settlement/page.tsx](file:///d:/Projects/OXENIQ/apps/web/src/app/settlement/page.tsx)

### 5.2 Key Features Implemented
1. **Investment & Collateral Records:** Tracks principal (INR/USD), agreed yield, collateral tokens allocated, and maturity dates across 4 tiers (Starter, Basic, Premium, Elite).
2. **Lock-In Term Progress:** Visual indicator tracking 90-day progress toward Month 4 payout eligibility.
3. **Owner Payout Dispatch Form:** Administrator records manual cash payout amount, payment rail (IMPS, RTGS, M-Pesa, USDT), and bank reference (UTR).
4. **Investor Payment Confirmation:** Investor verifies bank credit and clicks "Confirm Bank Payment Received", transitioning status to `PAYMENT_CONFIRMED`.
5. **Collateral Return Action:** Once payment is confirmed, investor returns collateral tokens to the authorized treasury wallet (`0xe31A2...`), transitioning to `SETTLED`.
6. **Dispute Management & Arbitration:** Investor can file a dispute if funds do not reflect within 72 hours. Escrow enters frozen `DISPUTED` state until arbitrator submits verified bank NOC evidence.
7. **Immutable Audit Logs:** Every state transition and reference ID is recorded in chronological audit logs.
8. **Double-Entry Reconciliation:** Validates:
   $$\text{Active Collateral Out} + \text{Returned Collateral} \equiv \text{Total Collateral Allocated}$$

---

## 6. Phase 5 — Testing and Verification Results

- **TypeScript Type Safety:** `npx tsc --noEmit -p apps/web/tsconfig.json` $\to$ **0 errors (Pass)**.
- **Hardhat Test Suites:** `npx hardhat test` $\to$ **57 / 57 passing tests (100% Pass in 3s)**.
  - `Phase2B_Sprint2_ManualSettlementAndTrading.test.js`: 16 passing tests.
  - `Phase2B_GateC9_TreasuryAndTokenSale.test.js`: 21 passing tests.
  - `LioraTokenImmutable.test.js`: 20 passing tests.
