# LIORA COIN — Gate C9 Treasury Accounting Architecture
## Double-Entry Supply Ledger, Bucket Segregation & Automated Reconciliation

**Project Root:** `D:\Projects\OXENIQ`  
**Network:** BNB Smart Chain Testnet (Chain ID: `97`)  
**Authorized Treasury Signer:** `0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350`  
**Status:** Implemented & Verified  

---

## 1. Overview & Core Accounting Rules

The LIORA Treasury Accounting Engine ([apps/web/src/lib/treasury/treasuryAccountingEngine.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/treasury/treasuryAccountingEngine.ts)) enforces a deterministic double-entry accounting state machine. It guarantees zero token dilution, prevents double-counting, ensures 100% USDT proceeds tracking, and audits corporate reserve isolation.

```
Total LIORA Supply: 1,000,000,000.0000 LIORA (10^27 Base Units)
│
├── 70% Client Allocation Bucket (700,000,000.0000 LIORA)
│   ├── Available for Primary Purchases / Rewards
│   ├── Delivered to Primary Sale Buyers (Cumulative)
│   ├── Paired into PancakeSwap V2 Protocol Liquidity (Cumulative)
│   └── Committed for Pending Batch Liquidity
│
└── 30% Company Emergency / Crisis Reserve (300,000,000.0000 LIORA)
    ├── Held offline / locked for existential corporate defense
    └── STRICT RULE: Cannot be drawn, sold, or paired into AMM pools
```

---

## 2. Invariants & Conservation Proofs

### 2.1 Total Supply Invariant
The overall supply cannot expand or contract:
$$\sum \text{SubAccounts}_{\text{LIORA}} \equiv 1,000,000,000 \times 10^{18} \text{ base units}$$

### 2.2 Client Bucket Conservation
$$\text{TokensDeliveredToBuyers} + \text{TokensPairedIntoLiquidity} + \text{TokensCommittedPending} + \text{AvailableClientAllocation} \equiv 700,000,000 \times 10^{18}$$

### 2.3 Company Reserve Conservation
$$\text{CompanyReserveTotal} \equiv 300,000,000 \times 10^{18}$$

### 2.4 Anti-Double-Counting Invariant
Tokens delivered to external buyer wallets or paired into liquidity pools cannot simultaneously be claimed or reported as treasury liquid holdings. Every deduction from `AvailableClientAllocation` increases either `TokensDeliveredToBuyers` or `TokensPairedIntoLiquidity` by the identical base unit integer amount.

### 2.5 100% USDT Liquidity Routing Invariant
$$\text{CumulativePrimarySaleUSDT} \equiv \text{USDT}_{\text{allocated\_to\_liquidity}} + \text{USDT}_{\text{pending\_liquidity}}$$
No leakage: difference between gross proceeds and tracked liquidity destination is strictly zero.

---

## 3. Real-Time Treasury State (BSC Testnet)

As established from on-chain Gate C5, C6, C7, and C7B operations:

| Metric | Amount | Raw Base Units ($10^{18}$) | Notes |
| :--- | :--- | :--- | :--- |
| **Total LIORA Supply** | 1,000,000,000.0000 | $1,000,000,000 \times 10^{18}$ | Hardcoded fixed supply |
| **Client Allocation (70%)** | 700,000,000.0000 | $700,000,000 \times 10^{18}$ | Client purchases & rewards |
| **Company Reserve (30%)** | 300,000,000.0000 | $300,000,000 \times 10^{18}$ | Offline crisis defense fund |
| **Delivered to Buyers** | 20.0000 | $20 \times 10^{18}$ | Manual MetaMask Gate C5 transfer |
| **Paired into Liquidity** | 215,797.4326 | $215,797,432,600,000,000,000,000$ | Current PancakeSwap V2 pool reserve |
| **Committed Pending Liquidity** | 0.0000 | $0$ | Awaiting new primary sale batches |
| **Available Client Allocation** | 699,784,182.5674 | $699,784,182,567,400,000,000,000$ | Clean remaining client balance |
| **USDT Allocated to Liquidity** | 500.9769 mUSDT | $500,976,900,000,000,000,000$ | On-chain pool quote asset reserve |
| **USDT Pending Liquidity** | 0.0000 mUSDT | $0$ | Buffer ready for next batch |
| **Treasury Cake-LP Holdings** | 10,398.2432 LP | $10,398,243,200,000,000,000,000$ | Owned by `0xe31A...9350` |

---

## 4. Automated 5-Point Reconciliation Process

The engine provides an automated audit function: `treasuryAccounting.performTreasuryReconciliation()`. It evaluates 5 deterministic boolean checks:

1. **Check 1: Total Supply Conservation**
   $$\text{Delivered} + \text{Paired} + \text{Committed} + \text{Available} + \text{Reserve} \stackrel{?}{=} 10^{27}$$
2. **Check 2: Client 70% Allocation Conservation**
   $$\text{Delivered} + \text{Paired} + \text{Committed} + \text{Available} \stackrel{?}{=} 7 \times 10^{26}$$
3. **Check 3: Company 30% Reserve Integrity**
   $$\text{CompanyReserveTotalRaw} \stackrel{?}{=} 3 \times 10^{26}$$
4. **Check 4: 100% USDT Proceeds Conservation**
   $$\text{USDT}_{\text{allocated}} + \text{USDT}_{\text{pending}} \stackrel{?}{=} \text{GrossPrimarySaleUSDT}$$
5. **Check 5: Treasury LP Custody Integrity**
   $$\text{TreasuryLPBalance} \ge \text{CumulativeLpMintedFromPrimarySales}$$

If any check fails, `discrepancyLioraRaw` or `discrepancyUsdtRaw` is computed and transactions are blocked until reconciled.

---

## 5. Treasury Overview Dashboard (UI Component)

A dedicated operational dashboard is exposed at `/treasury`:
- **File:** [apps/web/src/components/treasury/TreasuryOverviewDashboard.tsx](file:///d:/Projects/OXENIQ/apps/web/src/components/treasury/TreasuryOverviewDashboard.tsx)
- **Features:**
  - Visual breakdown of the 700M Client vs 300M Company Reserve buckets.
  - Interactive "Run Reconciliation Audit" button triggering the live 5-point verification.
  - Pending Liquidity Batch planner with single-click review for the authorized treasury wallet.
  - Warning banner if connected wallet is not the authorized treasury signer (`0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350`).
