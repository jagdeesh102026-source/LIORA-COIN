# OXENIQ — Initial Liquidity Deployment & Verification Guide

## 1. Overview & Initial Liquidity Target ($1,000,000 USD)

The project owner has stated an initial liquidity deployment target of **$1,000,000 USD**.

This guide outlines the technical requirements, paired asset prerequisites, pool configuration, and multi-signature governance steps to deploy, fund, and lock the initial decentralized exchange (DEX) liquidity pool on BNB Smart Chain.

> **CRITICAL ARCHITECTURAL DIRECTIVE**:  
> OXENIQ tokens alone cannot form an automated market maker (AMM) liquidity pool. A paired quote asset (such as USDT) must be deposited in equivalent value.  
> **Do NOT execute real swaps, transfer real paired funds, or deploy live liquidity on BSC Mainnet without written authorization and confirmed capital allocation.**

---

## 2. Liquidity Target Scope Analysis

Management must formally confirm the scope of the $1,000,000 target (DEC-05):

| Parameter | Option A: Combined Pool Valuation | Option B: Paired Contribution Alone |
|---|---|---|
| **Target Meaning** | Total pool depth across both assets | Quote asset deposit alone |
| **Paired Quote Asset (USDT)** | $500,000 USDT | $1,000,000 USDT |
| **OXENIQ Token Contribution** | $500,000 worth of OXENIQ | $1,000,000 worth of OXENIQ |
| **Combined Initial Pool Depth** | **$1,000,000 USD** | **$2,000,000 USD** |
| **Slippage Resistance** | High for standard retail swaps | Institutional grade market depth |

---

## 3. Approved Parameters & Technical Verification Checklist

Before initiating liquidity pool creation, verify:

- [ ] **Target Blockchain:** BNB Smart Chain Mainnet (Chain ID: 56).
- [ ] **Target DEX:** PancakeSwap (V2 AMM).
- [ ] **PancakeSwap V2 Router:** `0x10ED43C718714eb63d5aA57B78B54704E256024E` (BSC Mainnet).
- [ ] **PancakeSwap V2 Factory:** `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` (BSC Mainnet).
- [ ] **Base Asset:** Verified `OxeniqToken.sol` deployment on BSC Mainnet.
- [ ] **Paired Asset:** USDT (BEP-20: `0x55d398326f99059fF775485246999027B3197955`).
- [ ] **Opening Price Determination:**
  $$\text{Initial Price} = \frac{\text{Deposited USDT}}{\text{Deposited OXENIQ}}$$
- [ ] **Deployer & LP Custody:** Gnosis Safe Multi-sig (3-of-5 threshold recommended).
- [ ] **LP Token Locker:** Certified smart contract locker (PinkSale / Team Finance / Uncx) with public on-chain verification.
- [ ] **Recommended Lock Duration:** Minimum 24 months.

---

## 4. Step-by-Step Liquidity Provision Workflow

### Step 1: Deploy & Verify `OxeniqToken.sol`
Deploy the contract to BNB Smart Chain Mainnet and submit source code for automated public verification on BscScan.

### Step 2: Fund Treasury & Paired Asset Wallets
Transfer the approved OXENIQ token allocation and the paired USDT capital to the governance Gnosis Safe. Hot wallets must never be used for multi-thousand dollar pool deployments.

### Step 3: Approve Router
From the Gnosis Safe, execute an exact-amount approval to the PancakeSwap Router:
```solidity
// Approve exact amount only — never approve type(uint256).max
IERC20(oxeniqAddress).approve(routerAddress, oxeniqAmount);
IERC20(usdtAddress).approve(routerAddress, usdtAmount);
```

### Step 4: Add Liquidity with Slippage & Deadline Guards
Execute `addLiquidity` on the PancakeSwap Router:
```solidity
router.addLiquidity(
    oxeniqAddress,
    usdtAddress,
    amountOxeniqDesired,
    amountUsdtDesired,
    amountOxeniqMin,    // Slippage protection: 0.5% max tolerance
    amountUsdtMin,      // Slippage protection: 0.5% max tolerance
    safeAddress,        // LP tokens routed directly to Gnosis Safe
    block.timestamp + 300 // Strict 5-minute deadline preventing MEV sandwiching
);
```

### Step 5: Transfer LP Tokens to Certified Locker
Immediately transfer 100% of the received LP tokens (`Cake-LP`) from the Gnosis Safe to the certified lock contract. Obtain the public locker verification URL for community disclosure.

### Step 6: Post-Deployment Pool State Verification
1. Verify pool reserves via `pair.getReserves()`.
2. Confirm the exact spot price matches the authorized initial opening price.
3. Test small swap routing on PancakeSwap test environment.
4. Update DApp DEX Swap terminal with verified pair contract address.
