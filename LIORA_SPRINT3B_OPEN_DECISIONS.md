# LIORA COIN — Sprint 3B Open Decisions & Architectural Risk Register

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Genesis Launch:** 4 December 2026  
**Primary Blockchain:** BNB Smart Chain (BSC Testnet #97 / Mainnet #56)  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented by confirmed manual cash payout and collateral-return arrangement.

---

## 1. Executive Summary

In strict accordance with Sprint 3B instructions, **engineering has NOT silently made decisions** on unapproved management questions.

This register formally articulates the four critical open architectural decisions identified in Section 1.E of the sprint prompt. Until management reviews these options and issues explicit written decisions, the corresponding execution mechanisms remain in testable prototype mode with real-money and contract deployments blocked.

---

## 2. The Four Unresolved Architectural Decisions

### DECISION-01: Exact Point at which Initial Allocation Price Becomes Final

- **Context:** Checklist (3) contains an unresolved conflict between **Q14** ("Price finalized when investor selects plan") and **Q16** ("System should recalculate before payment confirmation if price changes").
- **Core Dilemma:** The company's reference schedule increases by ₹0.20 every 5 hours. Off-chain fiat bank transfers typically take 1 to 24 hours to clear.
- **Architectural Options:**
  - **Option A (Fixed Quote with Expiration Countdown Timer):** When the investor selects a plan, the quote is locked for a defined window (e.g. 30 or 60 minutes) to complete the deposit. If payment arrives within the window, the original price applies. If expired, a new quote must be re-confirmed.
  - **Option B (Floating Recalculation with Mandatory Re-Approval):** If the price steps up before bank confirmation, the system recalculates token quantity. However, to prevent fraud claims, the investor must explicitly approve the revised token quantity before funds are accepted.
  - **Option C (Epoch / Daily Pricing):** Allocation price updates daily or per epoch rather than every 5 hours, eliminating intra-day settlement drift.
- **Engineering Recommendation:** **Option A (30-Minute Reservation Window)**. This provides certainty for the investor while bounding the company's liability window.
- **Required Management Action:** Formally choose Option A, B, or C, and specify the valid reservation window duration.

---

### DECISION-02: Escrow Custody vs. Direct Wallet Delivery

- **Context:** Management clarified that investors receive LIORA tokens upfront as collateral, receive cash in Month 4, and return collateral tokens to the company.
- **Fatal Flaw of Direct Wallet Delivery:** Under Q21, `LioraTokenImmutable.sol` contains **zero transfer restrictions, zero pausing, zero blacklists, and zero transaction fees**. If collateral tokens are delivered directly to an investor's personal MetaMask/Binance Wallet, the company **cannot prevent** the investor from:
  1. Selling the collateral tokens immediately on PancakeSwap during the lock-in period, draining liquidity.
  2. Keeping the collateral tokens even after receiving the manual cash payout in Month 4.
- **Architectural Options:**
  - **Option A (Direct Self-Custody Wallet Delivery):** Deliver tokens directly to investor wallet. Relies purely on off-chain legal contracts and criminal/civil recourse in Kenyan courts. High financial and pool drain risk.
  - **Option B (Smart Contract Collateral Escrow Vault — `LioraCollateralEscrow.sol`):** Collateral tokens are transferred into an audited smart contract. The contract issues an on-chain non-transferable cryptographic claim receipt (ERC-721 or soulbound receipt). When the cash payout is verified in Month 4, the escrow automatically returns the collateral to treasury. If the company defaults, the escrow releases the collateral to the investor.
- **Engineering Recommendation:** **Option B (`LioraCollateralEscrow.sol`)**. Direct delivery creates an unacceptable liquidity drain vector for the entire ecosystem.
- **Required Management Action:** Formally authorize the specification and testnet development of `LioraCollateralEscrow.sol`.

---

### DECISION-03: Detailed Independent Fiat-Payment Verification Mechanism

- **Context:** The company owner manually pays the contractual settlement amount in cash (e.g. ₹1,25,000 for Tier 01 in Month 4). The state machine requires independent verification before collateral can be returned.
- **Architectural Options:**
  - **Option A (Investor Self-Confirmation):** The investor connects their wallet and cryptographically signs a confirmation button in the portal. *Risk:* Investor could refuse to confirm despite receiving cash, holding collateral hostage.
  - **Option B (Corporate Banking API / Open Banking Webhook):** Integrate automated bank statement scrapers or banking APIs (e.g. Decentro, Cashfree, or Kenyan corporate banking webhooks) to verify inward credit.
  - **Option C (Independent Accounting Firm / Escrow Partner Verification):** A designated third-party auditor, law firm, or chartered accountant in Nairobi verifies bank NOC certificates and co-signs the settlement.
- **Engineering Recommendation:** **Hybrid Model**: Primary path is Option A (investor confirmation within 7 business days). If the investor is unresponsive, secondary fallback is Option C (auditor review with bank NOC).
- **Required Management Action:** Approve the operational verification mechanism and designate the independent verification entity.

---

### DECISION-04: Dispute Resolution & Collateral-Release Authority

- **Context:** If a fiat payout fails, is reversed by the bank, or the investor disputes receiving funds, a formal authority must resolve the dispute and release or award the collateral.
- **Architectural Options:**
  - **Option A (Owner Unilateral Authority):** The company owner decides all disputes. *Risk:* Complete counterparty centralization; destroys investor trust as the owner can unilaterally seize collateral.
  - **Option B (Multi-Signature Arbitration Council — 2-of-3):** A 2-of-3 multisig comprising:
    1. Grandiose Tech Treasury Owner
    2. Investor (or Investor Representative)
    3. Independent Legal Arbitrator / Escrow Agent in Nairobi
  - **Option C (Time-Delayed Challenge Protocol):** When an owner records a payout with a valid UTR, a 14-day challenge window opens. If the investor does not raise a dispute with bank evidence within 14 days, collateral automatically returns to treasury. If a dispute is raised, collateral is locked until court or arbitration order.
- **Engineering Recommendation:** **Option C (Time-Delayed Challenge Protocol with Option B Multi-Sig Fallback)**.
- **Required Management Action:** Formally appoint the dispute resolution authority and approve the challenge window duration.

---

## 3. Summary of Open Decisions & Action Items

| Item ID | Category | Criticality | Decision Title | Proposed Solution | Required Management Response Date |
|---|---|---|---|---|---|
| **DEC-01** | Pricing / Sale | **HIGH** | Initial Allocation Price Finalization Point | 30-Minute Reservation Window (Option A) | 26 Nov 2026 |
| **DEC-02** | Tokenomics / Security | **CRITICAL (Launch Blocker)** | Collateral Custody Mechanism | Smart Contract Escrow Vault (`LioraCollateralEscrow.sol`) | 26 Nov 2026 |
| **DEC-03** | Operations / Fiat | **HIGH** | Fiat Payment Verification Mechanism | Investor confirmation with Bank NOC fallback | 28 Nov 2026 |
| **DEC-04** | Legal / Governance | **HIGH** | Dispute Resolution & Release Authority | 14-Day Challenge Window with 2-of-3 Arbitration | 30 Nov 2026 |

---

## 4. Recommended Next Development Phase: Sprint 3C

Upon management feedback on the four open decisions:
1. **Author `LioraCollateralEscrow.sol` Specification:** Model the non-transferable collateral vault.
2. **Implement Reservation Timer in UI:** Add 30-minute quote reservation countdown in `apps/web/src/components/sale/PrimarySaleTerminal.tsx`.
3. **Draft Bank NOC Upload Interface:** Allow owner to attach bank transaction slips and bank statements in the admin console.
