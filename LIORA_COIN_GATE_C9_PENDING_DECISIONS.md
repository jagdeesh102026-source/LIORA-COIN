# LIORA COIN — Gate C9 Pending Management Decisions
## Comprehensive Register of Unresolved Strategic, Economic & Governance Policies

**Project Root:** `D:\Projects\OXENIQ`  
**Network:** BNB Smart Chain Testnet (Chain ID: `97`)  
**Status:** Documented & Architecturally Guarded (Zero Assumptions Made)  

---

## 1. Executive Summary

As explicitly instructed in the Gate C9 mandate, the engineering team has **NOT made any assumptions** regarding unapproved business decisions. All pending items remain safely disabled, mocked, or protected behind clear visual disclaimers in the codebase.

This document compiles the 5 unresolved strategic decisions, their current architectural safeguard, and the implementation pathway once formal management consensus is provided.

---

## 2. Decision Register

### Decision 1: Primary Token Sale Pricing Formula
- **The Question:** Does the theoretical reference-price schedule (₹0.20 stepping to ₹30.00 every 5 hours) determine the primary token-sale execution price, or is it display-only alongside a fixed presale tier (e.g. $0.10) or DEX market price?
- **Current Safeguard:**
  - The `REFERENCE_SCHEDULE` model is flagged with an explicit `UNAPPROVED PRICING DECISION` warning.
  - Transactions cannot be executed on-chain against this schedule without explicit managerial approval.
  - The UI presents `/sale` with a transparent toggle demonstrating `Fixed Baseline ($0.10)`, `Live DEX Spot`, and `Reference Schedule (Preview)`.
- **Action Required from Management:** Formally approve which pricing model is legally and commercially binding for primary investor capital formation.

---

### Decision 2: Investment Lock-in Duration (3 vs 4 Months)
- **The Question:** What is the mandatory lock-in period for client purchases (3 months vs 4 months)?
- **Current Safeguard:**
  - Neither lock-in duration has been activated on-chain.
  - No smart contract has been deployed to enforce transfer restrictions or token timelocks.
  - Tokens delivered via primary sale in testing remain standard BEP-20 transfers with zero contractual lock-in.
- **Action Required from Management:** Determine the definitive lock duration (3 months, 4 months, or tiered schedules).

---

### Decision 3: Investment Withdrawal & Liquidity Redemption Mechanism
- **The Question:** How will investors exit or redeem their investments upon lock-in maturity? Will there be an automated smart contract liquidity redemption vault, an internal company buyback desk, or direct open-market DEX selling?
- **Current Safeguard:**
  - Liquidity removal remains strictly non-custodial and restricted to holders of LP tokens.
  - No automated redemption contract has been deployed or enabled.
  - Company treasury LP tokens cannot be burnt or redeemed by client wallets.
- **Action Required from Management:** Approve the technical and legal redemption workflow for mature investor capital.

---

### Decision 4: Investment Return Multipliers (5× – 30×)
- **The Question:** Are marketing projections regarding 5× to 30× investment returns legally permitted or enforceable in application contracts?
- **Current Safeguard:**
  - All marketing multipliers have been completely omitted from smart contracts, transaction routines, and pricing engines.
  - The DEX AMM continues to operate strictly on the constant product formula $x \cdot y = k$, where token price is determined solely by pool supply and demand.
- **Action Required from Management:** Issue written compliance guidelines regarding return representations and disclaimers.

---

### Decision 5: Treasury LP Token Governance & Timelock Policy
- **The Question:** Will the company treasury wallet (`0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350`) hold Cake-LP tokens in standard multi-sig custody, or will they be committed to a third-party timelock vault (e.g., Unicrypt, PinkSale, or a custom TimelockController)?
- **Current Safeguard:**
  - Cake-LP tokens are minted directly into `0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350`.
  - The single-wallet authority model is enforced in the treasury accounting state machine.
  - No external locking contract has been engaged.
- **Action Required from Management:** Decide whether LP tokens will be locked in a public timelock smart contract to enhance public market confidence.

---

## 3. Activation Readiness

All components in `apps/web/src/lib/treasury` and `apps/web/src/lib/sale` have been modularly constructed. When management renders a formal decision on any of the five items above, the corresponding module can be enabled via configuration parameters without requiring smart contract redeployments or breaking existing accounting invariants.
