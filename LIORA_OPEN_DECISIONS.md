# LIORA COIN — Master Register of Open Decisions
**Document File:** `LIORA_OPEN_DECISIONS.md`  
**Workspace:** `D:\Projects\OXENIQ`  
**Launch Target:** 4 December 2026  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Date:** November 23, 2026  

---

## 1. Executive Summary

This register catalogs the critical strategic, economic, legal, and governance decisions that remain unresolved by project management. 

In strict compliance with project safety guidelines:
> **No assumptions have been implemented.**  
> Every open decision is protected in the codebase by fail-closed boundaries, non-binding simulation disclaimers, or modular placeholders that can be activated without redeploying core infrastructure.

---

## 2. Decision Register Matrix

```
┌────┬───────────────────────────────────────┬──────────────┬──────────────┬─────────────────┐
│ #  │ Decision Title                        │ Category     │ Impact Level │ Decision Cutoff │
├────┼───────────────────────────────────────┼──────────────┼──────────────┼─────────────────┤
│ 1  │ Investor Settlement: Token vs. Cash   │ Financial    │ HIGH         │ 27 Nov 2026     │
│ 2  │ Pricing: Freeze vs. Recalculation     │ Commercial   │ HIGH         │ 27 Nov 2026     │
│ 3  │ Governance: Multi-Sig & Timelock      │ Security     │ CRITICAL     │ 28 Nov 2026     │
│ 4  │ Emergency Pause Removal for Mainnet   │ Smart Contract│ CRITICAL    │ 25 Nov 2026     │
│ 5  │ 100% Proceeds to Liquidity vs. OPEX   │ Treasury     │ HIGH         │ 26 Nov 2026     │
│ 6  │ INR Payment Gateway vs. Kenya Entity  │ Regulatory   │ CRITICAL     │ 26 Nov 2026     │
│ 7  │ Investment Lock-in Duration (3 vs 4m) │ Commercial   │ MEDIUM       │ 27 Nov 2026     │
│ 8  │ Marketing Return Multipliers (5x–30x) │ Compliance   │ HIGH         │ 28 Nov 2026     │
└────┴───────────────────────────────────────┴──────────────┴──────────────┴─────────────────┘
```

---

## 3. Detailed Decision Profiles

### Decision 1: Investor Settlement (LIORA Tokens vs. Cash / USDT Payout)
- **The Question:** When an investment plan matures (after the lock-in period), does the investor receive:
  - **Option A (Token Settlement):** Unlocked LIORA tokens delivered to their Web3 wallet, which they may hold or sell on PancakeSwap?
  - **Option B (Cash / Stablecoin Redemption):** Guaranteed redemption in USDT or fiat from the company treasury?
- **Analysis:**
  - *Option A Pros:* Fully decentralized, non-custodial, eliminates liability on the company treasury to maintain cash reserves. Standard Web3 model.
  - *Option B Risks:* Creates an off-chain debt obligation. If token price fluctuates, guaranteed redemptions could rapidly drain company treasury liquidity.
- **Current Safeguard:** Settlement is currently modeled as **Option A (Token Delivery)** only. Guaranteed cash redemption is not implemented.
- **Recommended Action:** Formally adopt Option A (Token Settlement) to preserve protocol liquidity and avoid classification as a banking or deposit-taking entity.

---

### Decision 2: Allocation-Price Finalization (Quote Freeze vs. Recalculation)
- **The Question:** When an investor initiates a purchase, is the token price frozen for a fixed window (e.g. 15-minute TTL), or is the exact token quantity recalculated at the exact blockchain confirmation block?
- **Analysis:**
  - *Option A (Time-Bound Quote Freeze):* Investor knows exact token delivery before signing. Requires a 15-minute expiration window.
  - *Option B (Block-Time Recalculation):* Eliminates slippage arbitrage against the treasury if the market price spikes while payment is pending.
- **Current Safeguard:** [primaryTokenSaleEngine.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/sale/primaryTokenSaleEngine.ts) generates immediate quotes without holding historical open-rate commitments.
- **Recommended Action:** Implement a **15-minute binding quote TTL** with automatic invalidation if unpaid.

---

### Decision 3: Governance Boundaries (Administrator, Multi-Sig & Timelock)
- **The Question:** What exact threshold and signers govern treasury transactions, liquidity withdrawals, and contract administration?
- **Analysis:**
  - Currently, all administrative powers and 99.98% of total supply reside in a single EOA (`0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350`).
  - Single-key ownership is a high-severity security finding (Finding SEC-01).
- **Recommended Action:**
  - Deploy a **3-of-5 Gnosis Safe multi-signature contract** for production treasury control.
  - Designate 5 trusted signers across distinct physical jurisdictions.
  - Attach an OpenZeppelin 48-hour `TimelockController` for any protocol-level parameter adjustments.

---

### Decision 4: Emergency Pause Removal for Mainnet Genesis
- **The Question:** How should the project fulfill Requirement 3 (*"No token-level transfer restrictions, emergency pause or transaction fees, according to the latest Q21 response"*), given that the existing testnet contract inherits `Pausable`?
- **Analysis:**
  - *Option A:* Keep testnet contract `0xeD15...7999` for sandbox testing, but author and deploy `LioraTokenMainnet.sol` (omitting `Pausable` and `Ownable`) for the 4 December mainnet launch.
  - *Option B:* Deploy a new non-pausable token on testnet now, requiring re-initialization of the PancakeSwap pair.
- **Current Safeguard:** The testnet contract remains unpaused (`paused() == false`).
- **Recommended Action:** Adopt **Option A**. Keep testnet infrastructure intact to avoid disrupting current integration tests; deploy clean `LioraTokenMainnet.sol` for mainnet genesis.

---

### Decision 5: 100% Proceeds-to-Liquidity vs. Operational Runway (OPEX)
- **The Question:** Should 100% of gross USDT from primary sales be allocated to PancakeSwap liquidity, or should a designated portion (e.g., 10%–15%) be reserved for operational costs?
- **Analysis:**
  - Allocating 100% to liquidity maximizes market depth and buyer confidence.
  - However, it starves GRANDIOSE TECH of operating cash to fund server hosting, node RPCs, legal compliance in Kenya, marketing, and developer maintenance.
- **Current Safeguard:** [liquidityProvisioningWorkflow.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/treasury/liquidityProvisioningWorkflow.ts) tracks 100% into pending liquidity buffers without executing automated transfers.
- **Recommended Action:** Management must either:
  1. Reaffirm 100% liquidity allocation and fund operational costs from a separate corporate budget; OR
  2. Approve an 85% Liquidity / 15% Protocol Operations & Gas split.

---

### Decision 6: INR Payment Gateway Integration under Kenyan Entity
- **The Question:** Can GRANDIOSE TECH (Kenya) legally and technically onboard an Indian payment aggregator (Razorpay, Cashfree, etc.) to collect INR retail payments?
- **Analysis:**
  - Indian payment aggregators require an active Indian entity (Pvt Ltd / LLP), GST registration, and compliance with RBI cross-border remittance guidelines. Foreign entities without Indian subsidiaries are rejected.
  - Collecting INR directly for an offshore crypto asset poses severe FEMA and taxation risks in India.
- **Current Safeguard:** The website UI provides a multi-currency calculation preview, but live payment gateway APIs are **NOT activated**.
- **Recommended Action:**
  - **Launch Strategy (4 Dec 2026):** Launch exclusively with **on-chain BEP-20 USDT and BNB payments**.
  - **Secondary Phase:** Contract a licensed third-party fiat-to-crypto aggregator (e.g., MoonPay, Transak, Onramper) with pre-existing global compliance coverage.

---

### Decision 7: Investment Lock-in Duration (3 Months vs. 4 Months)
- **The Question:** What is the mandatory lock-in period for client purchases (3 months vs. 4 months)?
- **Analysis:**
  - 3 months provides higher investor liquidity and earlier secondary market activity.
  - 4 months provides greater price stability during initial protocol bootstrapping.
- **Current Safeguard:** Zero programmatic lock-in is enforced in the token contract. The modular vesting vault (`LioraVestingVault.sol`) accepts lock duration as a constructor parameter.
- **Recommended Action:** Select either 3 or 4 months, or offer a 2-tier option (3 months standard vs 4 months with bonus rewards).

---

### Decision 8: Marketing Return Projections (5× – 30× Multipliers)
- **The Question:** Are promotional claims regarding 5× to 30× returns permissible on the official website and documentation?
- **Analysis:**
  - Promising fixed or multiplied returns creates legal risk under both Kenyan Capital Markets Authority (CMA) guidelines and international securities laws.
  - PancakeSwap secondary market prices are governed purely by supply and demand ($x \cdot y = k$) and cannot guarantee specific multipliers.
- **Current Safeguard:** All marketing return multipliers have been removed from smart contracts, calculation engines, and official whitepaper pages.
- **Recommended Action:** Maintain strict legal disclaimers. Ensure all references to price increases are clearly labeled as *"Illustrative Reference Benchmark — Not Guaranteed Investment Returns"*.
