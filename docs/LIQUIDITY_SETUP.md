# OXENIQ — Initial Liquidity Deployment & Verification Guide

## 1. Overview
The project has allocated an initial liquidity budget of **$1,000**.
This document outlines the step-by-step checklist to deploy, fund, and verify the initial trading pool on BNB Smart Chain.

> **CRITICAL RULE**: Do NOT execute any real liquidity creation on BNB Smart Chain Mainnet without written authorization and confirmed trading pair parameters.

---

## 2. Approved Parameters Checklist (Prior to Pool Creation)

- [ ] Target DEX: PancakeSwap (V2 or V3) on BSC
- [ ] Base Token: OXENIQ (BEP-20 verified contract)
- [ ] Paired Asset: USDT (BEP-20: `0x55d398326f99059fF775485246999027B3197955` on BSC Mainnet) or WBNB
- [ ] Pool Budget: Confirm whether $1,000 is 1,000 USDT + $X$ OXENIQ or $500 USDT + $500 OXENIQ
- [ ] Initial Pricing: Confirm the opening exchange rate $\frac{\text{USDT}}{\text{OXENIQ}}$
- [ ] Multi-sig Deployer: Confirm Gnosis Safe / multi-sig admin address
- [ ] LP Locker: PinkSale / Team Finance / Uncx locker contract

---

## 3. Step-by-Step Deployment Workflow

### Step 1: Deploy & Verify OXENIQ on BSC
Deploy `OxeniqToken.sol` and verify source code on BscScan.

### Step 2: Approve Router for Liquidity
Approve the PancakeSwap Router contract to spend the exact designated amount of OXENIQ and paired quote tokens. Never approve `type(uint256).max` from hot wallets.

### Step 3: Add Liquidity
Call `addLiquidity` on the PancakeSwap Router:
```solidity
router.addLiquidity(
    tokenA,
    tokenB,
    amountADesired,
    amountBDesired,
    amountAMin,
    amountBMin,
    lpRecipient,
    deadline
);
```

### Step 4: Lock LP Tokens
Immediately transfer the received LP tokens to a certified locker contract with public lock verification.

### Step 5: Verify Pool State
Verify pool reserves, price impact for test swaps, and ensure router and pair addresses are accurately configured in the DApp.
