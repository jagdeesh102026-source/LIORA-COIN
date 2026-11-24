# LIORA — Final Launch Status & Production Configuration Report

**Document Date:** November 24, 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Target Networks:** BSC Testnet (Chain ID 97 — Active) | BSC Mainnet (Chain ID 56 — **STRICTLY BLOCKED**)  
**Overall Status:** **TESTNET & WEB APPLICATION READY / MAINNET GOVERNANCE BLOCKED**

---

## Executive Summary

The LIORA BNB Smart Chain token ecosystem, custodial allocation ledger, manual payment verification engine, reference pricing progression model, and Next.js investor web application have completed full end-to-end implementation and automated test verification.

All **834 automated tests across 13 test suites** are passing (100% pass rate). The Next.js production build (`npm --prefix apps/web run build`) compiled 45 static and dynamic pages with 0 TypeScript errors. Protected emergency non-upgradeable contracts match their verified SHA-256 checksum bit-for-bit.

BSC Mainnet deployment (Chain ID 56) is **fail-closed and intentionally blocked** pending executive multisig deployment, hardware signer provisioning, and external security audit sign-off.

---

## 1. Component Status Dashboard

| Component / Subsystem | Status | Verification Evidence |
|---|:---:|---|
| **Protected Contract Integrity** | `READY` | Exact SHA-256 match `d20f39c6...eb4d1` on both `LioraTokenCustodial.sol` and backup |
| **UUPS V1/V2 Token Contracts** | `READY` | 100B fixed supply, zero minting post-init, 1B treasury, 99B reserve vault, storage layout preserved |
| **48-Hour Governance Timelock** | `READY` | `minDelay: 172,800s`, `UPGRADER_ROLE` and `DEFAULT_ADMIN_ROLE` restricted to timelock |
| **BSC Testnet Deployment** | `READY` | Verified live contracts at Proxy `0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9` |
| **Investor Dashboard & Auth** | `READY` | Session-derived auth, 8 live metrics, tenant isolation, verified via Chrome automated browser session |
| **Investment Plans (6 Tiers)** | `READY` | Authoritative checklist preserved (Tier 01: ₹50k, 2.5×, ₹1.25L, ₹0.20, 625k LIORA fixed, 3m lock) |
| **Pricing Engine (₹0.20 - ₹30)** | `READY` | 5-hour boundary step progression, 745h cap, immutable historical snapshot tracking |
| **PostgreSQL Custodial Ledger** | `READY` | Real Prisma schema, double-entry audit trails, atomic compare-and-swap concurrency locks |
| **Manual Payment Workflow** | `READY` | Order quote -> off-chain payment -> admin manual verification -> atomic allocation activation |
| **Next.js Production Build** | `READY` | Compiled 45 static/dynamic routes, 0 TS errors, Turbopack bundle verified |
| **Production Web Hosting** | `NEEDS CONFIGURATION` | Requires production domain DNS mapping, SSL/TLS certificate, and cloud host provisioning |
| **Corporate Safe 3-of-5 Multisig** | `BLOCKED` | Awaiting hardware signer addresses and multisig contract creation on BSC Mainnet |
| **Third-Party Security Audit** | `BLOCKED` | Formal external audit report sign-off required prior to Mainnet broadcast |

---

## 2. Investment Plans & Calculation Invariants

All calculations strictly adhere to the authoritative management checklist:

| Plan | Tier | Investment (INR) | USD Equivalent | Factor | Contractual Value | Lock-in | Payout Month | Token Allocation @ ₹0.20 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Starter** | Tier 01 | ₹50,000 | $500 | 2.5× | ₹1,25,000 | 3 Months | Month 4 | **625,000 LIORA** |
| **Basic** | Tier 02 | ₹1,00,000 | $1,000 | 6.0× | ₹6,00,000 | 3 Months | Month 4 | **3,000,000 LIORA** |
| **Standard** | Tier 03 | ₹2,00,000 | $2,000 | 5.0× | ₹10,00,000 | 3 Months | Month 4 | **5,000,000 LIORA** |
| **Advanced** | Tier 04 | ₹3,00,000 | $3,000 | 8.0× | ₹24,00,000 | 9 Months | Month 10 | **12,000,000 LIORA** |
| **Premium** | Tier 05 | ₹5,00,000 | $5,000 | 6.0× | ₹30,00,000 | 12 Months | Month 13 | **15,000,000 LIORA** |
| **Elite** | Tier 06 | ₹10,00,000 | $10,000 | 9.0× | ₹90,00,000 | 12 Months | Month 13 | **45,000,000 LIORA** |

### Accounting Separation Safeguards:
1. **Fixed Token Quantity:** Once an allocation is confirmed, the allocated token quantity is immutable and cannot fluctuate with subsequent reference price or AMM price movements.
2. **Tri-Partite Accounting Distinction:** The investor dashboard, database schema, and admin console maintain strict visual and transactional separation between:
   - **Custodial Token Allocations:** Held securely on behalf of the investor.
   - **Contractual Cash Settlements:** Off-chain fiat payouts recorded via bank UTR references.
   - **On-Chain Token Deliveries:** Optional self-custodial withdrawals post-lock-in.

---

## 3. Production Infrastructure Analysis

### Current Working Environment:
- **Application Engine:** Next.js 16.4.3 (App Router, Turbopack, React 19).
- **Database Engine:** PostgreSQL (`liora_dev` on `localhost:5432`) operating in `OXENIQ_PERSISTENCE_MODE=postgres`.
- **ORM / Driver:** Prisma 6.2 with `@prisma/adapter-pg` connection pool.

### Production Deployment Requirements:
1. **Hosting Environment:**
   - Standalone Node.js server (AWS EC2 / ECS / DigitalOcean App Platform / Vercel Enterprise).
   - PM2 process manager configured for zero-downtime clustering (`ecosystem.config.js`).
2. **Production Domain & SSL:**
   - Production domain DNS A/AAAA records pointed to cloud load balancer / reverse proxy.
   - Managed SSL/TLS certificate via AWS Certificate Manager (ACM) or Let's Encrypt with automated renewal.
3. **Managed PostgreSQL Database:**
   - AWS RDS PostgreSQL 16+ or Neon/Supabase with automated multi-AZ replication, point-in-time recovery (PITR), and encrypted storage at rest.
4. **Environment Variables & Secrets:**
   - Production secrets managed via AWS Secrets Manager or cloud environment vaults:
     - `DATABASE_URL`: Production PostgreSQL connection string (strictly using SSL mode `require`).
     - `SESSION_SECRET`: Cryptographically secure 256-bit entropy string.
     - `ADMIN_SECRET`: Separate master authorization secret.
     - `INITIAL_ADMIN_PASSWORD`: Strong password meeting complexity validation (>=12 chars, upper, lower, digit, symbol).
     - `BSCSCAN_API_KEY`: API key for contract source code verification.

---

## 4. Mainnet Deployment Blockers (Mandatory Governance Gates)

BSC Mainnet (Chain ID 56) deployment is **strictly blocked** by automated guardrails in `scripts/deploymentGuards.js` and Hardhat configuration.

### Blocking Items:
1. **Corporate 3-of-5 Safe Multisig Address:**
   - Management must supply 5 independent hardware wallet addresses (Ledger/Trezor) held by corporate officers.
   - Safe multisig contract must be deployed on BSC Mainnet with threshold set to 3 of 5.
   - Temporary deployment EOA must renounce all roles immediately upon contract initialization.
2. **Designated Corporate Operating Treasury Address:**
   - Confirmed corporate treasury wallet on BSC Mainnet to receive the initial 1,000,000,000 LIORA operational allocation.
3. **External Smart Contract Security Audit:**
   - Formal sign-off by a reputable smart contract auditing firm certifying zero High or Critical vulnerabilities in `LioraTokenUUPSV1.sol`, `LioraTimelock.sol`, and `LioraReserveVault.sol`.
4. **Gas Funding:**
   - Deployment wallet funded with approximately 0.25 BNB on BSC Mainnet solely for contract deployment transaction fees.

---

## 5. Answers to Management Launch Questions

### 1. What is fully completed and verified?
- **Protected Smart Contracts:** Original non-upgradeable contract verified bitwise identical to recorded SHA-256 hash.
- **UUPS Upgradeable Architecture:** V1 token, V2 upgrade simulation, 48-hour timelock, 100B fixed supply (1B treasury, 99B restricted reserve vault) tested and verified.
- **BSC Testnet Deployment:** Live contracts operational on Chain ID 97.
- **PostgreSQL Persistence & ACID Ledger:** 27 relational models, double-entry audit logging, duplicate payment prevention, atomic compare-and-swap concurrency locks.
- **Manual Purchase Workflow & Admin Verification:** Order quote submission, off-chain payment reference recording, admin manual review, and dashboard balance updates.
- **Reference Pricing Engine:** Scheduled ₹0.20 to ₹30.00 curve across 745 hours with immutable snapshot history.
- **Web Application Build:** Next.js production build cleanly compiled with 0 errors across 45 routes.
- **Automated Regression Suite:** 834 of 834 tests passing across 13 test suites.

### 2. What tasks are pending before launch?
- Cloud hosting provisioning (AWS ECS / EC2 / Vercel).
- Managed production PostgreSQL database creation and migration execution (`npx prisma migrate deploy`).
- Production domain DNS configuration and SSL/TLS certificate installation.
- Production environment variable configuration in cloud secret store.
- Initial production administrator account provisioning via `scripts/provisionAdmin.js`.

### 3. What specific management decisions or inputs are required?
1. **Production Domain Name:** Final URL where the investor portal will be hosted.
2. **Multisig Signers (5 Hardware Wallets):** Five public addresses for the 3-of-5 Safe multisig committee on BSC Mainnet.
3. **Corporate Operating Treasury Address:** Secure corporate address for the 1B operational tokens.
4. **External Audit Schedule:** Selection and authorization of independent audit firm.
5. **Off-Chain Fiat Bank Details:** Corporate bank account / UPI / IMPS coordinates to display on investor purchase quote screens.

### 4. Is the website ready for public deployment?
**Yes.** The Next.js web application is completely built, typechecked, and verified. It can be deployed immediately to a staging or public production web host once the hosting environment and production PostgreSQL database are provisioned.

### 5. Is the token ready for BSC Mainnet deployment?
**No. BSC Mainnet deployment is strictly blocked.** While the smart contracts are functionally complete, verified on Testnet, and 100% covered by automated tests, deploying to BSC Mainnet without the corporate 3-of-5 Safe multisig and formal security audit approval would violate corporate governance controls.

### 6. What is the next exact action you will take?
Awaiting management direction on hosting provisioning (AWS/Vercel) and receipt of the corporate multisig signer addresses for Mainnet configuration.
