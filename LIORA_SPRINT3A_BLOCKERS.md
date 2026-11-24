# LIORA COIN — Sprint 3A Architectural Blockers, Pricing Review & Safety Audit

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Genesis Launch:** 4 December 2026  
**Primary Blockchain:** BNB Smart Chain (BSC Testnet #97 / BSC Mainnet #56)  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented by confirmed manual cash payout and collateral-return arrangement.

---

## 1. Executive Summary

This register synthesizes the architectural blockers, conflicting management requirements, pricing discrepancies, and safety audits identified during Sprint 3A.

Until management formally resolves these items, sensitive financial executions (including primary token sales, automated collateral distribution, and multi-sig contract deployments) remain guarded and disabled to prevent capital loss, arbitrage exploitation, or legal exposure.

---

## 2. Pricing Requirements Audit (Checklist 3 Analysis)

### 2.1 Confirmed Baseline Pricing Rules
According to `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx` (Section B, Q11–Q13):
1. **Initial Primary-Sale Price:** Exactly **₹0.20 per LIORA** (Q11: "✅ ₹0.20 per LIORA").
2. **Reference Price Escalation Schedule:** Increases by **₹0.20 every 5 hours**, capped at **₹30.00** (Q13: "yes✅").
3. **Decoupled DEX Market Pricing:** The PancakeSwap V2 market price is determined strictly by the AMM liquidity pool curve ($x \cdot y = k$). The company's reference price cannot dictate the open market price.
4. **Rejection of $0.10 Baseline:** The previous engineering suggestion of a $0.10 USD (₹8.65) baseline price is **NOT an approved management rule** and has been completely purged from business logic.

---

### 2.2 Critical Pricing Contradiction: Plan Selection (Q14) vs. Payment Recalculation (Q16)

A direct contradiction exists between two answers provided in Checklist (3):

| Question | Text in Checklist (3) | Management Response | Architectural Interpretation |
|---|---|---|---|
| **Q14** | *"When is the allocation price finalized?<br>A. When the investor selects the plan.<br>B. When payment is confirmed."* | **A. When the investor selects the plan. ✅** | Price is locked at the instant the user chooses a plan. Quoted collateral tokens are fixed for the transaction. |
| **Q16** | *"What happens if the price changes during an investment transaction? Should the original quote remain valid for a limited period, or should the system recalculate before payment confirmation?"* | **system should recalculate before payment confirmation ✅** | Price is NOT locked at plan selection. If the 5-hour reference timer ticks before the fiat payment is verified, the system recalculates token quantity. |

#### Risk & Impact Analysis:
- **Scenario:** An investor selects Tier 01 (₹50,000) at Hour 4.5 when the reference price is ₹0.20. The system displays an allocation of `250,000 LIORA` collateral tokens. The investor initiates bank transfer. By Hour 5.5, when the bank transfer clears and payment is confirmed, the reference schedule has stepped to ₹0.40.
- **Under Q14:** The company must disburse 250,000 LIORA. The investor gets what they saw.
- **Under Q16:** The system recalculates to `125,000 LIORA` (`₹50,000 / 0.40`). The investor receives half the tokens they expected without having approved the new quote, creating high risk of investor disputes, fraud allegations, and chargebacks.
- **Under Reverse Price Movement:** If the token price were ever adjusted downward, recalculating would disburse more tokens than budgeted.
- **Defensive Implementation:** Primary token sale execution remains strictly disabled (`isExecutable = false`) in `primaryTokenSaleEngine.ts` until management formally issues a single unified specification.

---

## 3. Treasury & Settlement Safety Review

### 3.1 Defense-in-Depth vs. Frontend-Only Security
The system enforces a 4-tier security model:
1. **Presentation Layer (UI):** Disables buttons for unapproved actions (e.g. Primary Sale Execute button disabled, Admin actions disabled for non-whitelisted addresses).
2. **Client State Layer (Hooks):** Hooks (`useManualSettlement`, `useTreasuryAccounting`) validate the connected wallet address and reject unauthorized mutations pre-flight.
3. **Application & Engine Layer:** `manualSettlementModel.ts` and `primaryTokenSaleEngine.ts` enforce state-machine rules, rejection codes, and ledger immutability independent of the UI.
4. **On-Chain EVM Boundary:** Smart contracts (`LioraTokenImmutable.sol`, PancakeSwap Pair/Router) enforce cryptographic signature checks (`msg.sender`) and revert invalid transactions at the bytecode level.

### 3.2 Private Key Hygiene
- **Zero Exposed Keys:** Verified that no private keys, seed phrases, or sensitive API secrets exist in the source code or git history.
- **Deployer Keys:** Isolated to local `.env` (git-ignored) for automated testnet scripts only.

### 3.3 Protection Against Fraudulent Manual Settlement
- **Investor Cannot Falsify Payout:** Only the authorized company owner address can invoke `recordManualPayout` and record a bank UTR reference. If an ordinary investor calls this function, the engine throws an `UNAUTHORIZED_PAYOUT_CALLER` error.
- **Company Cannot Seize Collateral Arbitrarily:** When the company records a manual payout, the state moves to `PAYOUT_DISPATCHED`. Collateral tokens are NOT returned to the company treasury at this stage. Collateral can only be returned after:
  1. The investor explicitly confirms receipt via `confirmInvestorPayment`, OR
  2. An independent dispute arbitrator verifies bank proof and resolves the dispute via `resolveDispute`.
- **Investor Dispute Window:** If an investor does not receive the funds, they can file a dispute via `raiseDispute(planId, explanation)`, immediately freezing collateral release until arbitration concludes.

### 3.4 Multi-Sig Signer Status (3-of-5 Multisig)
- Although a 3-of-5 multi-signature governance scheme was evaluated during Phase 8, **management has NOT confirmed the 5 signer identities, public keys, or hardware custody policies**.
- In strict adherence to management requirements, **no 3-of-5 multisig contract has been deployed or activated**.

---

## 4. Master Blockers Register

| Blocker ID | Category | Severity | Description | Required Management Action | Target Resolution |
|---|---|---|---|---|---|
| **BLK-01** | Tokenomics / Legal | **CRITICAL (Launch Blocker)** | **Collateral Custody Architecture:** Unconfirmed whether collateral tokens are held in smart contract escrow (`LioraCollateralEscrow.sol`) or sent to investor's personal wallet. If sent to wallet, immutable token (Q21) allows investor to dump tokens on DEX. | Formally approve Option B (`LioraCollateralEscrow.sol`). | 26 Nov 2026 |
| **BLK-02** | Pricing / Finance | **CRITICAL (Launch Blocker)** | **Pricing Contradiction (Q14 vs Q16):** Plan selection finalization vs payment recalculation. Causes token allocation discrepancies. | Decide whether quote locks at plan selection (with expiration timer) or recalculates with user re-confirmation. | 26 Nov 2026 |
| **BLK-03** | Treasury / Security | **HIGH (Pre-Deploy Blocker)** | **Multi-Sig Signer Appointments:** 5 signer identities and threshold configuration remain unconfirmed by management. | Designate 5 signers with hardware wallet addresses for company treasury. | 28 Nov 2026 |
| **BLK-04** | Banking / Fiat | **HIGH (Operational Blocker)** | **Off-Chain Fiat Payout Pipeline:** Kenya banking / M-Pesa business accounts for GRANDIOSE TECH manual payouts require operational procedures and reconciliation tools. | Establish authorized corporate banking rail for Month 4 investor payouts. | 30 Nov 2026 |
| **BLK-05** | On-Chain Migration | **MEDIUM (Action Required)** | **Immutable Token Testnet Deployment Authorization:** `LioraTokenImmutable.sol` and new PancakeSwap pair require management written approval to deploy. | Authorize broadcast of `deploy-liora-immutable.js` to BSC Testnet. | Sprint 3B |

---

## 5. Recommended Next Phase: Sprint 3B

Upon management authorization:
1. **Execute Sprint 3B Migration:** Deploy `LioraTokenImmutable.sol` to BSC Testnet (#97).
2. **Create New Testnet Pair:** Instantiate PancakeSwap V2 Pair with Mock USDT.
3. **Seed Test Liquidity:** Provision initial testnet liquidity and withdraw old pool funds.
4. **Author `LioraCollateralEscrow.sol`:** Formalize the on-chain collateral locking contract based on approved custody architecture.
