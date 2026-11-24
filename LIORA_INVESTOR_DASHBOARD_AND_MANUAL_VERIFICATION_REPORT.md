# LIORA — Investor Dashboard & Manual Purchase Verification Report

**Status:** FULLY VERIFIED & OPERATIONAL  
**Release Target:** Immediate 6-Hour MVP Launch  
**Persistence Engine:** PostgreSQL (Prisma ORM) via `liora_dev`  
**Test Automation Outcome:** 213 / 213 Passing Tests across 13 suites (100% Pass Rate)  
**Acceptance Criterion:** **MET & PROVEN ON-SCREEN**  

---

## 1. Executive Summary

In compliance with management's urgent launch directive, the LIORA investor portal (`apps/web/src/app/dashboard/page.tsx`) and manual purchase verification workflow have been successfully developed, integrated with the PostgreSQL custodial ledger (`CustodialAllocationLedger`), and validated through both automated test suites and a live automated Chrome browser execution.

All 8 mandated dashboard metrics are live and authoritative:
1. **Total Confirmed LIORA Allocation:** Displays real-time confirmed tokens (`625,000 LIORA`), 100% backed by company treasury custody.
2. **Pending Purchase Requests Separated:** Unverified orders (`0 LIORA` or requested amount) are strictly isolated and never added to confirmed balances.
3. **Total Confirmed Investment & Currency:** Displays fiat investment amounts (`₹50,000 INR` / `$500 USD`).
4. **Historical Purchase Price:** Retains the exact unit price (`₹0.20 / LIORA`) established at transaction time.
5. **Current Reference Price Benchmark:** Displays live scheduled reference price (`₹0.20 / LIORA`) from the 5-hour incremental schedule engine.
6. **Clearly Labeled Illustrative Value:** Displays benchmark valuation (`₹125,000.00 INR`) with prominent compliance disclaimer.
7. **Purchase & Allocation History:** Comprehensive tabular ledger showing order IDs, plans, payment rails, amounts, token quantities, and timestamps.
8. **Manual Verification Status:** Real-time badge indicators (`Confirmed & Active`, `Pending Verification`, `Rejected`).

---

## 2. Visual Browser Test Evidence

A headless Chrome browser driven through Chrome DevTools automation verified the entire user journey:

### 2.1 Confirmed LIORA Balance After Admin Approval
The test investor (`test_investor_alex`) submitted a Tier 01 purchase request (`₹50,000 INR`), had the IMPS payment verified by the administrator, and the dashboard immediately credited **625,000 LIORA** with **₹125,000.00 INR** illustrative value.

![Confirmed LIORA Allocation Dashboard](C:/Users/Dell/.gemini/antigravity/brain/9777f2dd-8cbc-435e-b3c6-1d14ccd2412e/investor_dashboard_confirmed.png)

### 2.2 Persistence Across Logout and Re-Login
The user clicked "Sign Out", cleared browser state, and re-authenticated. The exact **625,000 LIORA** allocation persisted seamlessly from PostgreSQL.

![Post-Relogin Persistence](C:/Users/Dell/.gemini/antigravity/brain/9777f2dd-8cbc-435e-b3c6-1d14ccd2412e/investor_dashboard_relogin.png)

---

## 3. Backend API Architecture

| HTTP Method | Route | Authorization Barrier | Function |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Registers investor, hashes password via scrypt, links primary wallet in PostgreSQL, issues HttpOnly session cookie. |
| `POST` | `/api/auth/login` | Public (Rate-Limited) | Authenticates credentials, checks sliding-window lockout, issues HttpOnly session cookie. |
| `POST` | `/api/auth/logout` | Session | Revokes server session in PostgreSQL and clears cookies. |
| `GET` | `/api/custody/allocations` | Session / Investor Auth | Derives investor identity from authenticated session. Queries PostgreSQL for confirmed/pending allocations, reference price, and illustrative value. Prohibits cross-investor snooping (403). |
| `POST` | `/api/custody/payment-intent` | Session / Investor Auth | Registers purchase intent with quoted reference price and payment reference (IMPS/RTGS/NEFT). Enforces status `PENDING_PAYMENT_VERIFICATION`. |
| `POST` | `/api/custody/verify-payment` | Admin Only (`requireSettlementAdmin`) | Verifies fiat receipt (`APPROVE`) or rejects (`REJECT`). Atomically updates database, reserves treasury collateral, and posts double-entry audit records. |
| `GET` | `/api/pricing/reference-price` | Public | Returns current reference schedule benchmark (₹0.20 starting price, +₹0.20 every 5 hours, ₹30 cap). |

---

## 4. PostgreSQL Persistence & Financial Ledger Schema

The following PostgreSQL tables in database `liora_dev` persist all records:

1. **`custodial_allocations`:**
   - Columns: `id`, `allocation_id`, `investor_address`, `investor_name`, `plan_id`, `principal_inr`, `contractual_settlement_inr`, `multiplier_factor`, `allocated_tokens_formatted`, `allocated_tokens_base_units`, `status`, `created_at`, `activated_at`, `matures_at`.
2. **`custodial_payment_records`:**
   - Columns: `id`, `allocation_id`, `payment_reference`, `canonical_reference_key` (unique), `amount_paid`, `currency`, `payment_rail`, `verification_status`, `submitted_at`, `verified_at`, `verifying_admin`, `admin_notes`.
3. **`custodial_treasury_snapshots`:**
   - Double-entry balance table tracking `total_holdings_base_units`, `reserved_custodial_allocations_base_units`, and `unrestricted_free_base_units`. Enforces `is_solvent`.
4. **`custodial_treasury_movements`:**
   - Append-only journal of all treasury reserve deductions and payouts.
5. **`custodial_ledger_audits`:**
   - Immutable audit trail recording actor, action, timestamp, and metadata.
6. **`pricing_schedule_configs`:**
   - Stores authoritative reference price schedule activation state and timestamps.
7. **`users`, `verified_wallets`, `trading_bot_sessions`:**
   - Handles investor identities, password hashes, linked wallets, and authenticated sessions.

---

## 5. End-to-End Automated Test Results

Total Suites Executed: **13 suites**  
Total Passing Tests: **213 tests**  
Failing Tests: **0**  
Pass Rate: **100%**  

```text
  LIORA — Investor Dashboard & Manual Purchase Verification End-to-End Suite (19/19)
    √ 1. Investor Registration & Session Management (4 tests)
    √ 2. Purchase Request Creation & Pending Status Separation (4 tests)
    √ 3. Session Logout & Re-Login Balance Persistence (3 tests)
    √ 4. Multiple Purchases Accumulation (1 test)
    √ 5. Investor Tenant Isolation & Cross-Account Protection (2 tests)
    √ 6. Rejected Payment Behavior (2 tests)
    √ 7. Duplicate Approval & Concurrency Protection (2 tests)
    √ 8. Treasury Token Solvency & Reconciliation (1 test)

  LIORA — Confirmed Reference Pricing Schedule & Auditability Suite (9/9)
  LIORA — UUPS Upgradeable Architecture Evaluation Suite (16/16)
  LIORA — PostgreSQL Custodial Persistence & ACID Integrity Suite (8/8)
  LIORA — Final Fixed Supply Architecture & Mainnet MVP Verification Suite (15/15)
  LIORA — Sprint 3E Custodial Ledger & Manual Payment Verification Suite (16/16)
  LIORA — Sprint 3E End-to-End Sandbox & Security Hardening Suite (18/18)
  LIORA — Sprint 3D Security Remediation & Access Control Suite (22/22)
  LIORA — Sprint 3C Settlement Backend & Data Integrity Suite (19/19)
  LIORA — Sprint 3B Proportional Allocation & Settlement Suite (21/21)
  LIORA — Sprint 2 Manual Settlement & Order State Suite (24/24)
  LIORA COIN — Gate C9 Primary Token Sale & Treasury Accounting Suite (15/15)
  LioraTokenImmutable Contract Audit & Verification Suite (11/11)

  TOTAL: 213 passing (15s)
```

---

## 6. Six-Hour LIORA Launch Readiness Assessment

### 6.1 Ready for Staging / Controlled Pre-Launch (Green Light)
- Investor Registration & Login: **Fully Operational**
- Manual Purchase Request Submission: **Fully Operational**
- Admin Payment Verification & Token Reservation: **Fully Operational**
- PostgreSQL ACID Transactions & Idempotency: **Fully Operational**
- Investor Dashboard UI: **Live & Fully Integrated**
- Reference Pricing Engine: **Active at ₹0.20**
- Testnet Deployed Contracts: **Confirmed Operational** (Proxy: `0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9`)

### 6.2 Pre-Launch Operational Checklist (Prior to Public Link Sharing)
1. **Designate Official Admin Account:** Run `npm run seed:admin` or promote the corporate treasury administrator account.
2. **Bank Account Details on Modal:** Ensure bank transfer details (Beneficiary, IFSC, Account Number) match the official corporate account for investor wire receipts.
3. **BSC Mainnet Gate Enforced:** Keep BSC Mainnet deployment locked pending formal corporate 3-of-5 Safe multisig deployment.
