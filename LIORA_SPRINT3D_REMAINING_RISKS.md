# LIORA COIN — Sprint 3D: Remaining Risks and Operational Blockers

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Genesis Launch:** 4 December 2026  
**Primary Blockchain:** BNB Smart Chain (Testnet Chain ID `97`, Mainnet Chain ID `56`)  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented exclusively by confirmed manual cash payout and collateral-return requirements.

---

## 1. Executive Summary

Sprint 3D successfully eliminated all high-severity vulnerabilities identified in the Sprint 3C acceptance audit (SEC-01 through SEC-08).

While development and testnet sandbox environments are fully secured, several operational and infrastructure risks must be monitored or upgraded before mainnet Genesis launch on **4 December 2026**.

---

## 2. Technical & Operational Risk Assessment

### 2.1 Risk 1: Multi-Process Production Clustered Persistence
- **Current State:** Development uses `data/settlement_storage_dev.json` with an in-process JavaScript mutex (`SettlementPersistentStore.withLock`) and atomic temporary-file writes (`fs.renameSync`).
- **Limitation:** In a multi-worker production cluster (e.g. Next.js clustered workers, AWS Lambda, PM2 cluster), in-process mutex queues and in-memory idempotency caches do not coordinate across distinct OS processes.
- **Remediation Required Before Production:** Migrate settlement persistence to PostgreSQL using ACID transactions (`SELECT ... FOR UPDATE`) or Redis distributed locking before activating real-money transactions.
- **Severity for Sandbox/Testnet:** **LOW (Safe for development / testnet single-process execution).**
- **Severity for Production Mainnet:** **HIGH.**

### 2.2 Risk 2: Real Off-Chain Fiat Settlement Reconciliation
- **Current State:** The company owner manually computes cash payout amounts and manually remits fiat via bank wires (IMPS, RTGS, NEFT, M-Pesa). Reference numbers are recorded and deduplicated.
- **Risk:** Manual banking transfers are vulnerable to human clerical errors, bank network delays, and off-chain dispute friction.
- **Mitigation:** Dual-party verification (payout dispatch does NOT settle the contract; investor confirmation or independent audit is required before collateral return is unlocked) and append-only dispute logging.
- **Severity:** **MEDIUM.**

### 2.3 Risk 3: Testnet RPC Reliability vs. Mainnet Finality
- **Current State:** `TestnetCollateralVerifier` inspects transaction receipts via the public BSC Testnet RPC (`https://data-seed-prebsc-1-s1.bnbchain.org:8545`).
- **Risk:** Public testnet RPC endpoints frequently experience rate limiting, transient outages, and block reorganizations.
- **Mitigation:** Dedicated private RPC endpoints (e.g. QuickNode / Alchemy / Ankr) with automated retry and fallback nodes must be provisioned before production mainnet launch.
- **Severity:** **MEDIUM.**

---

## 3. Status of Operational Proposals (Strictly Unapproved)

Per project guidelines, the following 4 mechanisms remain **PROPOSALS ONLY** and have NOT been implemented as management-approved policies:
1. **30-Minute Allocation Quote Lock:** Proposed technical mechanism; awaiting executive sign-off.
2. **Smart Contract Escrow Vault Prototype:** Proposed architectural custody; direct investor token holding remains the confirmed baseline.
3. **Mandatory Investor Frontend Confirmation:** Proposed UI flow; formal legal receipt standard remains pending executive decision.
4. **Independent Arbitration Council:** Proposed framework; legal dispute arbitration structure remains unapproved.

---

## 4. Sprint 3E Go / No-Go Recommendation

### Verdict: **GO FOR SPRINT 3E**

Sprint 3D has satisfied all security remediation criteria:
- **SEC-01 (Backend Dashboard Integration):** PASS. Dashboards now communicate directly with authenticated REST API routes.
- **SEC-02 (Authentication Spoofing):** PASS. Replaced unverified headers with EIP-4361 SIWE cryptographic challenge verification and single-use nonces.
- **SEC-03 (Reference Retirement):** PASS. Corrected references are permanently retired.
- **SEC-04 (Collision-Resistant IDs):** PASS. Cryptographic entropy eliminates millisecond collisions.
- **SEC-05 (Atomic Writes & Corruption Recovery):** PASS. Atomic rename and non-destructive corrupted file backups prevent data loss.
- **SEC-06 (Concurrency Boundaries):** DOCUMENTED. Development mutex established; production distributed locking specified.
- **SEC-07 (Testnet Collateral Receipt Verification):** PASS. Viem on-chain receipt verification with txHash replay protection.
- **SEC-08 (Server-Side Sandbox Restrictions):** PASS. Server guards reject mainnet execution, real fiat transfers, and automatic seizure.
- **Automated Tests:** 110 / 110 passing (100%).
- **TypeScript & Contract Compilation:** 0 errors.

**Recommendation:** Proceed to Sprint 3E under standard protocol guardrails (no mainnet interaction, no real-money transactions).

---
*Report certified by LIORA Protocol Technical Audit Team.*
