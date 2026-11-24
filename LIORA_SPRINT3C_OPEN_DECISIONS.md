# LIORA COIN — Sprint 3C Open Decisions and Management Approvals Status

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Genesis Launch:** 4 December 2026  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented exclusively by confirmed manual cash payout and collateral-return requirements.

---

## 1. Executive Summary

This document catalogues the exact approval status of all architectural, operational, and financial mechanisms across the LIORA COIN ecosystem following Sprint 3C.

In accordance with strict project instructions, **no prototype, simulation, or technical proposal may be treated as a management-approved decision** without explicit confirmation from executive leadership.

---

## 2. Decision Status Register

| Category | Decision / Feature | Status | Authoritative Baseline Reference | Technical Action & Current Boundary |
|---|---|:---:|---|---|
| **Tokenomics** | Fixed Supply: Exactly 1,000,000,000 LIORA | **APPROVED** | Checklist (3) Q17 | Implemented in `LioraTokenImmutable.sol`. 1B minted at deploy, zero post-deploy minting. |
| **Token Architecture** | Immutable Token without Pause, Fees, or Upgrades | **APPROVED** | Checklist (3) Q20, Q21 | Implemented in `LioraTokenImmutable.sol`. Standard OpenZeppelin ERC-20 + Burnable; no owner. |
| **Treasury Buckets** | 70% Client Allocation / 30% Emergency Reserve | **APPROVED** | Checklist (3) Q14 | Enforced in `treasuryAccountingEngine.ts` and automated balance tests. |
| **Investment Plans** | Six Confirmed Tiers (Tiers 01 to 06) | **APPROVED** | Checklist (3) Q10, Q11 | Enforced in `proportionalAllocationEngine.ts` (`CONFIRMED_INVESTMENT_PLANS`). |
| **Collateral Mechanics** | Proportional Upfront LIORA Collateral Allocation | **APPROVED** | Clarification (Nov 2026) | Computed as $\text{Allocation Value} \div \text{Price}$; frozen upon contract finalization. |
| **Settlement Payout** | Company Owner Manually Pays Cash Post-Lock | **APPROVED** | Clarification (Nov 2026) | For 3-month plan, paid in Month 4. Handled via off-chain bank transfer/M-Pesa. |
| **Collateral Return** | Investor Returns Collateral After Cash Receipt | **APPROVED** | Clarification (Nov 2026) | Enforced in `manualSettlementModel.ts` using exact 18-decimal integer base units. |
| **Operational Workflow** | 30-Minute Allocation Quote Lock | **PROPOSED / UNAPPROVED** | Technical Proposal | Must NOT be treated as approved policy until signed off. |
| **Custody Mechanism** | Escrow Vault Smart Contract Prototype | **PROPOSED / UNAPPROVED** | Technical Proposal | Smart contract escrow has NOT been approved. Direct wallet holding remains baseline. |
| **Receipt Verification** | Mandatory Investor UI Confirmation | **PROPOSED / UNAPPROVED** | Technical Proposal | Verification standard (bank NOC vs. investor UI click vs. third-party audit) pending management decision. |
| **Dispute Resolution** | Independent Multi-Sig Arbitration Council | **PROPOSED / UNAPPROVED** | Technical Proposal | Arbitration council structure is an unapproved technical concept. |
| **Primary Sale Pricing** | Scheduled Reference Price vs DEX Market Price | **UNRESOLVED / PENDING** | Checklist (3) Q8, Q9 | Primary sale execution remains blocked (`isExecutable = false`) pending pricing model approval. |
| **Deployment State** | Immutable Token Migration on BSC Testnet | **PENDING MIGRATION** | Sprint 3A Audit | Current active testnet token remains `0xeD15...` and pair `0x64be...`; redeployment awaiting approved migration plan. |

---

## 3. Analysis of Open Proposals (Must Not Be Treated as Approved)

### 3.1 Proposed 30-Minute Quote Lock
- **Proposal Origin:** Suggested to mitigate price slippage between when an investor calculates an allocation quote and when their off-chain fiat deposit is confirmed.
- **Current Legal / Architectural Status:** **UNAPPROVED.**
- **Implementation Boundary:** The system does not enforce a 30-minute lock window on reference pricing. Primary sale execution remains locked in simulated mode.

### 3.2 Escrow Vault Smart Contract Prototype
- **Proposal Origin:** Proposed as an automated intermediary smart contract that would custody collateral tokens and release them upon cryptographic proof of fiat payout.
- **Current Legal / Architectural Status:** **UNAPPROVED.**
- **Implementation Boundary:** No escrow smart contracts have been deployed. Collateral custody is modeled as non-custodial direct wallet holding.

### 3.3 Mandatory Investor Frontend Payment Confirmation
- **Proposal Origin:** Proposed as a required click in `InvestorSettlementPortal` before collateral return is permitted.
- **Current Legal / Architectural Status:** **UNAPPROVED.**
- **Operational Reality:** Management clarified that "the company owner calculates and manually pays the agreed cash amount after the lock-in period... After receiving the cash payment, the investor returns the collateral tokens." The precise verification standard (e.g. sending bank advice, investor acknowledgment, or partner desk confirmation) remains an open operational decision.

### 3.4 Independent Arbitration Council
- **Proposal Origin:** Proposed to arbitrate disputes when fiat bank transfers are delayed or reversed.
- **Current Legal / Architectural Status:** **UNAPPROVED.**
- **Implementation Boundary:** Modeled only as an administrative workflow prototype with audit logging.

---

## 4. Next Steps & Decision Roadmap for Management

Prior to mainnet launch on 4 December 2026:
1. **Approve Primary Sale Execution Price Model:** Choose between Fixed Baseline Presale ($0.10), AMM Spot Market, or hybrid pricing.
2. **Approve Token Migration Date:** Schedule migration of PancakeSwap V2 liquidity from `0xeD15...` to canonical `LioraTokenImmutable.sol`.
3. **Formalize Fiat Payment Verification Protocol:** Confirm whether bank UTR advice issued by GRANDIOSE TECH treasury is sufficient, or if investor dual-confirmation is mandatory.

---
*Report certified by LIORA Protocol Technical Governance Team.*
