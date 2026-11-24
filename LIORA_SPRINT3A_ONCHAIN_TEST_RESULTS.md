# LIORA COIN — Sprint 3A On-Chain Test Results & Blockchain Verification Audit

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Network:** BNB Smart Chain Testnet (Chain ID 97)  
**Target Genesis Launch:** 4 December 2026  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented by confirmed manual cash payout and collateral-return arrangement.

---

## 1. Executive Summary

This report documents all verified on-chain transactions broadcast to the BNB Smart Chain Testnet, live pool reserve queries, and simulated automated tests.

In strict adherence to Sprint 3A objectives, on-chain execution is claimed ONLY where verifiable transaction hashes, block numbers, gas receipts, and event logs exist on BSC Testnet. Local simulation runs and unit test assertions are explicitly partitioned and identified.

---

## 2. Deployed Contract Infrastructure (BSC Testnet #97)

| Contract Role | On-Chain Address | Verification Transaction Hash | Block | Status |
|---|---|---|---|---|
| **LIORA Token (Deployed)** | `0xeD155E37D0a400E63202cE031Fc1C984B18E7999` | `0xb89905c9475d4be265ed13065b98ee8433ec2c0cb5243124dc2063a561da7d9f` | 143062788 | **Active on Testnet** |
| **Mock USDT (mUSDT)** | `0x0b419a33e8a6448547906DCB191b037Db5ac926e` | `0xc6d6da6b1564f6dc311469a660c2f83880e3d25dc8733fd3e3e079499e92c13e` | 143062853 | **Active on Testnet** |
| **PancakeSwap V2 Pair** | `0x64beE3847a766D35E6611985F3c3e51C78Af5D2c` | `0x33cc7b5b45463bf4ff8d4d119f879762d6a46e741e0e6c01d91f88d2abbd6cc1` | 143062946 | **Active on Testnet** |
| **PancakeSwap V2 Router** | `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` | *Official PancakeSwap V2 Router Deployment* | - | **Verified Canonical** |
| **PancakeSwap V2 Factory** | `0x6725F303b657a9451d8BA641348b6761A6CC7a17` | *Official PancakeSwap V2 Factory Deployment* | - | **Verified Canonical** |
| **Deployer / Treasury Wallet** | `0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350` | *Company-controlled Testnet Deployment Key* | - | **Authorized** |
| **Test Investor Wallet** | `0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD` | *Funded QA MetaMask Wallet* | - | **Authorized** |

---

## 3. Verified On-Chain Transactions (BSC Testnet #97)

### 3.1 Initial Liquidity Provisioning
- **Transaction Hash:** `0x33cc7b5b45463bf4ff8d4d119f879762d6a46e741e0e6c01d91f88d2abbd6cc1`
- **Block Number:** 143062946
- **Gas Used:** 2,196,038 units (Effective Gas Price: 1.0 Gwei)
- **Sender:** `0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350`
- **Target Contract:** PancakeSwap V2 Router (`0xD99D1c33F9fC3444f8101754aBC46c52416550D1`)
- **Assets Deposited:** `216,250.0 LIORA` + `500.0 mUSDT`
- **LP Tokens Minted:** `10,398.31717 Cake-LP` credited to deployer address.
- **Result:** Successfully bootstrapped initial constant-product pool with ratio 1 mUSDT = 432.5 LIORA.

### 3.2 Real On-Chain Swap 1: LIORA -> mUSDT (Sell LIORA)
- **Transaction Hash:** `0x40f7a98ac32fe4ab7ad5ce7a55b81e47945aee1c682da1f8c82417a7a87ad315`
- **Block Number:** 143063078
- **Gas Used:** 135,312 units (Effective Gas Price: 0.1 Gwei)
- **Input Amount:** `10.0 LIORA` (exact allowance approved prior to swap)
- **Output Amount:** `0.023074079633226637 mUSDT`
- **Recipient:** `0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350`
- **PancakeSwap Fee:** 0.25% AMM protocol fee deducted.
- **Slippage Tolerance:** 2.0% (executed with < 0.01% price impact).
- **Post-Swap Reserves:** LIORA: `216,260.0`, mUSDT: `499.9769`.

### 3.3 Real On-Chain Swap 2: mUSDT -> LIORA (Buy LIORA)
- **Transaction Hash:** `0x6b39b1f4484cc76fcbf1a8b7a78e495422bec4b5e224691de276d52b24993a2f`
- **Block Number:** 143063092
- **Gas Used:** 101,011 units (Effective Gas Price: 0.1 Gwei)
- **Input Amount:** `1.0 mUSDT`
- **Output Amount:** `430.81493470654693671 LIORA`
- **Recipient:** `0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350`
- **PancakeSwap Fee:** 0.25% AMM protocol fee deducted.
- **Post-Swap Reserves:** LIORA: `215,829.185`, mUSDT: `500.9769`.

---

## 4. Live On-Chain Reserve & Balance Verification (Timestamped 23 Nov 2026)

Verified via direct JSON-RPC query to BSC Testnet node (`https://data-seed-prebsc-1-s1.bnbchain.org:8545`):

```
=== ON-CHAIN STATE (BSC TESTNET #97) ===
Connected Chain ID: 97

--- PancakeSwap V2 Pool ---
Pair Address: 0x64beE3847a766D35E6611985F3c3e51C78Af5D2c
Token0: 0x0b419a33e8a6448547906DCB191b037Db5ac926e (mUSDT)
Token1: 0xeD155E37D0a400E63202cE031Fc1C984B18E7999 (LIORA)
Reserve mUSDT: 501.097830175789374225
Reserve LIORA: 215797.197732343641939611
Total LP Supply: 10398.804890209343669682 Cake-LP
Ratio: 1 mUSDT = 430.6488 LIORA
Ratio: 1 LIORA = 0.00232208 mUSDT

--- Test Wallet Balances (0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD) ---
tBNB (Gas): 0.26066705874 tBNB
LIORA Balance: 51.987332949811123679 LIORA
mUSDT Balance: 4.879095744577399138 mUSDT
Cake-LP Balance: 0.481878587835377285 Cake-LP
LIORA Router Allowance: 0.0
mUSDT Router Allowance: 0.0

--- Deployer Wallet (0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350) ---
Deployer Cake-LP Balance: 10398.317171542710736376 Cake-LP
```

---

## 5. Transaction Failure & Edge-Case Audit

The swap engine and smart contracts were audited for defensive handling under live failure modes:

| Failure Mode | Trigger Condition | EVM / UI Behavior | Status |
|---|---|---|---|
| **User Rejection** | User cancels prompt in MetaMask | Error code `4001` (`ACTION_REJECTED`); UI displays "Transaction rejected by user" without error boundary crash. | **VERIFIED** |
| **Insufficient Gas (tBNB)** | Balance < gas limit * gas price | Web3 provider rejects transaction pre-flight; UI prompts user to acquire testnet tBNB. | **VERIFIED** |
| **Insufficient Token Balance** | Spend > ERC-20 `balanceOf` | EVM reverts (`ERC20InsufficientBalance`); swap button disabled when amount > balance. | **VERIFIED** |
| **Insufficient Allowance** | Router spend > `allowance` | EVM reverts (`ERC20InsufficientAllowance`); UI enforces mandatory Approve step before Swap button activates. | **VERIFIED** |
| **Slippage Breach** | Output < `amountOutMin` | PancakeSwap Router reverts with `INSUFFICIENT_OUTPUT_AMOUNT`; input tokens safely preserved. | **VERIFIED** |
| **Expired Deadline** | Block timestamp > `deadline` | PancakeSwap Router reverts with `EXPIRED`; user funds untouched. | **VERIFIED** |
| **Excessive Price Impact** | Swap > 15% of pool reserve | UI displays critical warning and disables swap button until user confirms high impact. | **VERIFIED** |

---

## 6. Automated Test Suites Summary

The automated test suites execute in local memory devnet (`hardhat`) with TypeScript loader:

```
Total Test Suites: 3
Total Passing Tests: 57
Failing Tests: 0
Skipped Tests: 0
Execution Time: 4 seconds

Breakdown:
1. LioraTokenImmutable.test.js: 20 passing
   - Name, Symbol, Decimals (18), 1 Billion fixed supply
   - Standard ERC-20 transfers & zero fee-on-transfer conservation
   - ERC-20 burning functionality
   - Absolute absence of owner, pause, mint, blacklist, fee setters, proxies
2. Phase2B_GateC9_TreasuryAndTokenSale.test.js: 21 passing
   - 70:30 allocation math (700M client / 300M company reserve)
   - Unapproved reference schedule execution blocking
   - 100% proceeds liquidity allocation workflow
   - Treasury authority role enforcement
   - Dual-price independent display
3. Phase2B_Sprint2_ManualSettlementAndTrading.test.js: 16 passing
   - PancakeSwap V2 quote formulas and 0.25% fee mechanics
   - Strict separation of reference price from market price
   - Manual settlement state transitions (Active -> Dispatched -> Confirmed -> Returned)
   - Double-entry collateral reconciliation integrity
```

---

## 7. Conclusions & Boundary Declaration

1. **On-Chain Testnet Verification Complete:** Real BSC Testnet swaps and liquidity provisioning are fully verified with immutable on-chain receipts.
2. **Simulation Boundaries Maintained:** Manual settlement and primary token sale remain in prototype and guarded simulation modes respectively.
3. **Zero Mainnet Action:** BSC Mainnet (Chain ID 56) has NOT been contacted.
