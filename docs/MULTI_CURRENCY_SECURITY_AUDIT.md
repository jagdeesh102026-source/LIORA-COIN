# OXENIQ Multi-Currency Purchase Security & Architecture Audit

**Target System:** OXENIQ Token Purchase & Multi-Currency Staging Subsystem  
**Workspace:** `D:\Projects\OXENIQ`  
**Date:** October 2026  
**Auditor:** Senior Security Architect & Web3 Systems Reviewer  
**Audit Scope:** `fiatCurrencies.ts`, `exchangeRatePolicy.ts`, `paymentAdapterSkeleton.ts`, `apps/web/src/app/buy/page.tsx`, Web3 Wallet Integration, Legal/Tax Compliance Claims, and Backend Validation Boundaries.

---

## 1. Executive Summary & Production Readiness Verdict

### Production Readiness Verdict: **NOT PRODUCTION READY (STAGED PROTOTYPE ONLY)**

The current implementation of the OXENIQ multi-currency purchase subsystem is an **in-memory architectural skeleton and client-side simulation**. While the client interface correctly enforces button disablement (`disabled={true}`) and displays clear pre-launch warnings, **none of the core security, validation, or financial settlement boundaries required for live production operation currently exist**.

If live transactions or payments were enabled in the current state:
1. Users could bypass the ₹1,00,000 INR minimum purchase requirement via direct API calls or manipulated client state because **no server-side validation boundary exists**.
2. Severe currency arbitrage and financial losses would occur due to **static, hardcoded exchange rates**.
3. Duplicate token deliveries and replay vulnerabilities would be trivial to execute because **idempotency is stored only in an ephemeral in-memory JavaScript `Set`**.
4. Significant legal, tax, and criminal liabilities under Indian law (FIU-IND, PMLA, Income Tax Act Sec 194S TDS, and GST) would be triggered without formal regulatory registration or contracted Web3 on-ramps.

All live purchases, payments, swaps, and blockchain fulfillment operations must remain **strictly disabled** until the critical findings detailed below are remediated.

---

## 2. Audit Findings Summary Matrix

| ID | Title | Severity | Impact Area | Remediation Status |
| :--- | :--- | :---: | :--- | :---: |
| **SEC-01** | Absence of Server-Side Purchase & Quote Validation Boundary | **CRITICAL** | Core API / Purchase Boundary | Open (Architecture Proposed) |
| **SEC-02** | Ephemeral In-Memory Idempotency & Webhook Replay Vulnerability | **CRITICAL** | Payment Adapter / Token Delivery | Open (Database Store Needed) |
| **SEC-03** | Static & Hardcoded Exchange Rates with Arbitrage & Slippage Risk | **HIGH** | Forex Policy / Pricing Engine | Open (Oracle Integration Needed) |
| **SEC-04** | Disconnect Between UI Configured Currencies & Payment Providers | **HIGH** | Commerce Operations | Open (No Active Provider) |
| **SEC-05** | Unverified Indian Legal, FIU-IND, 1% TDS (Sec 194S) & GST Assumptions | **HIGH** | Regulatory / Tax Compliance | Open (CA/Legal Opinion Required) |
| **SEC-06** | Mobile Wallet Support Relies Exclusively on In-App Browsers | **MEDIUM** | User Experience / Wallet Layer | Documented (WalletConnect Planned) |
| **SEC-07** | Floating-Point Arithmetic & Client-Side Clock Dependency | **MEDIUM** | Exchange Policy / Validation | Open (Integer Math Hardening) |

---

## 3. Detailed Technical Findings

### Finding SEC-01: Complete Absence of a Server-Side Validation Boundary
- **Severity:** **CRITICAL**
- **Affected Files:** `apps/web/src/app/buy/page.tsx`, `apps/web/src/lib/commerce/exchangeRatePolicy.ts`
- **Description:**  
  The application currently operates solely as a static Next.js frontend with client-side React components (`'use client'`). There are **no Next.js API route handlers** (`/api/...`), server actions, or backend microservices in the repository.
- **Evidence:**  
  Validation of the canonical ₹1,00,000 INR minimum is executed exclusively inside the browser via `ExchangeRatePolicy.validatePurchase()` on lines 59–61 of `BuyPage.tsx`:
  ```typescript
  // apps/web/src/app/buy/page.tsx
  const numericAmount = Number(amountInput) || 0;
  const validation = useMemo(() => {
    return ExchangeRatePolicy.validatePurchase(numericAmount, quote);
  }, [numericAmount, quote]);
  ```
- **Exploitation / Failure Scenario:**  
  Client-side validation provides zero security boundary against an adversary. Any user inspecting network requests or sending payload directly to an eventual payment provider or smart contract could submit `amount: 100` or `amount: 1` and bypass the client check entirely.
- **Recommended Remediation (Minimal Safe Server Architecture):**  
  Implement a trusted server-side order boundary using Next.js App Router API endpoints:
  1. `POST /api/purchase/create-quote`: Server fetches validated rate from an authorized oracle, calculates ceiling minimum in integer sub-units (paise/cents), signs the quote using an HMAC server secret, and returns `{ quoteId, currency, rateToInr, minOrder, expiresAt, signature }`.
  2. `POST /api/purchase/initiate-order`: Server verifies the quote signature, checks `Date.now() < expiresAt`, converts input to integer paise, asserts `amountInPaise >= 10_000_000`, generates a pending order in a database, and returns the merchant session token to the client.

---

### Finding SEC-02: Ephemeral In-Memory Idempotency & Webhook Replay Vulnerability
- **Severity:** **CRITICAL**
- **Affected Files:** `apps/web/src/lib/commerce/paymentAdapterSkeleton.ts`
- **Description:**  
  The `IdempotencyStore` stores processed payment events in private JavaScript in-memory collections (`Set<string>` and `Map<string, PurchaseOrder>`). Furthermore, `verifyWebhookSignature` lacks a timestamp replay window check.
- **Evidence:**  
  In `paymentAdapterSkeleton.ts`:
  ```typescript
  export class IdempotencyStore {
    private processedKeys: Set<string> = new Set();
    private orders: Map<string, PurchaseOrder> = new Map();
    // ...
  }
  ```
- **Exploitation / Failure Scenario:**  
  1. **Server Restart / Serverless Scaling:** In Next.js, Node.js server instances, or serverless functions (e.g. AWS Lambda, Vercel), processes recycle frequently. Every restart or scale-out completely wipes `processedKeys`.
  2. **Duplicate Token Delivery:** If a payment gateway resends a webhook notification (standard practice during network blips) after a server restart, the idempotency check returns `false`, re-executing `fulfillmentAction` and delivering duplicate tokens on-chain without additional payment.
  3. **Replay Attacks:** Because `verifyWebhookSignature` only checks the HMAC signature of the payload without validating a maximum timestamp delta (`abs(now - timestamp) <= 300s`), an intercepted webhook payload can be maliciously replayed indefinitely.
- **Recommended Remediation:**  
  1. Replace the in-memory `Set` with a persistent, transactional database table (e.g., PostgreSQL with a `UNIQUE (provider_id, gateway_payment_id)` constraint or Redis with atomic `SETNX` commands with a 72-hour TTL).
  2. Implement strict webhook timestamp tolerance: reject any notification where `abs(serverTime - webhookTimestamp) > 300 seconds`.
  3. Enforce a two-phase state machine for fulfillment: `PAYMENT_RECEIVED` $\rightarrow$ `TX_SUBMITTED` $\rightarrow$ `CONFIRMED_ON_CHAIN`.

---

### Finding SEC-03: Static & Hardcoded Exchange Rates with Arbitrage & Slippage Risk
- **Severity:** **HIGH**
- **Affected Files:** `apps/web/src/lib/commerce/fiatCurrencies.ts`, `apps/web/src/app/buy/page.tsx`
- **Description:**  
  All fiat currency exchange rates to INR are static, hardcoded constants. Furthermore, `BuyPage.tsx` hardcodes the USD/INR conversion rate directly in the presentation calculation.
- **Evidence:**  
  In `fiatCurrencies.ts`:
  ```typescript
  USD: provisionalExchangeRateToInr: 84.50, // Reference: 1 USD ≈ 84.50 INR
  EUR: provisionalExchangeRateToInr: 91.80, // Reference: 1 EUR ≈ 91.80 INR
  GBP: provisionalExchangeRateToInr: 107.20, // Reference: 1 GBP ≈ 107.20 INR
  ```
  In `BuyPage.tsx` line 70:
  ```typescript
  // USD Equivalent for token calculation (assuming reference $0.10 token price)
  const usdEquivalent = inrEquivalent > 0 ? inrEquivalent / 84.50 : 0;
  ```
- **Exploitation / Failure Scenario:**  
  1. **Financial Arbitrage:** If the market rate of USD/INR fluctuates to 88.00, selling tokens using the hardcoded rate of 84.50 allows foreign purchasers to acquire tokens at a substantial discount, draining allocated inventory below intended protocol valuation.
  2. **Minimum Breach:** If USD/INR drops to 80.00, a minimum purchase of $1,183.44 converts to only ₹94,675.20, directly violating the canonical ₹1,00,000 INR requirement.
  3. **Currency Inconsistency:** `BuyPage.tsx` divides `inrEquivalent` by `84.50` regardless of whether the user selected EUR or GBP, introducing calculation errors for non-USD currencies.
- **Recommended Remediation:**  
  1. Connect quotes to an authorized live Forex data feed (e.g., Chainlink Forex Oracles on-chain, or RBI/FBIL reference feeds via an off-chain secure API).
  2. Remove hardcoded rate constants from calculation paths in `BuyPage.tsx`.

---

### Finding SEC-04: Disconnect Between UI Configured Currencies & Operational Payment Providers
- **Severity:** **HIGH**
- **Affected Files:** `apps/web/src/lib/commerce/fiatCurrencies.ts`, `docs/MULTI_CURRENCY_PURCHASE_SPEC.md`
- **Description:**  
  The user interface presents tabs for INR, USD, EUR, and GBP. However, **zero currencies have an approved, contracted, or operational payment gateway**.
- **Evidence:**  
  In `fiatCurrencies.ts`, status fields are set to `CANONICAL_STAGED` (INR) and `EVALUATING_PROVIDER_APPROVAL` (USD, EUR, GBP). In `paymentAdapterSkeleton.ts`, the implementation is labeled `ReferencePaymentAdapter` with mock verification.
- **Regulatory & Operational Barrier:**  
  - Domestic Indian aggregators (Razorpay, Cashfree, PayU, PhonePe) strictly prohibit processing payments for crypto token sales under RBI guidelines.
  - Specialized Web3 on-ramps (Transak, MoonPay, Stripe Crypto) require extensive corporate entity vetting, AML policies, and merchant licensing before activating production credentials.
- **Recommended Remediation:**  
  Maintain the current disabled state (`disabled={true}`) on the purchase button. Update UI badges to explicitly state "Provider Integration Staged" so users understand that payment gateways are not yet operational.

---

### Finding SEC-05: Unverified Indian Legal, FIU-IND, 1% TDS (Sec 194S) & GST Assumptions
- **Severity:** **HIGH**
- **Affected Documents:** `docs/MULTI_CURRENCY_PURCHASE_SPEC.md`, `docs/SECURITY.md`, `apps/web/src/app/buy/page.tsx`
- **Description:**  
  The documentation makes definitive claims regarding compliance with Indian Virtual Digital Asset (VDA) regulations that have not been formally confirmed by licensed legal and tax practitioners.
- **Specific Unverified Claims:**  
  1. **Section 194S 1% TDS Responsibility:** Documentation assumes that the payment on-ramp (e.g., Transak) will automatically handle 1% TDS withholding and Form 26Q reporting. In primary token issuances (where the project sells newly minted tokens directly), Indian tax law places obligations on the entity receiving consideration or transferring the VDA. The project has no formal tax opinion determining whether the issuer or the on-ramp is the statutory deducting entity.
  2. **FIU-IND Registration Mandate:** Under the Ministry of Finance notification (March 7, 2023), any entity engaging in the exchange between virtual digital assets and fiat currencies or transfer of VDAs is classified as a Reporting Entity (RE) under the Prevention of Money Laundering Act (PMLA). Selling tokens for INR without FIU-IND registration or using an unregistered gateway carries severe penal consequences.
  3. **Omission of GST (Goods and Services Tax):** The documentation extensively discusses 30% VDA income tax (Section 115BBH) and 1% TDS (Section 194S), but completely ignores GST. Token sales by an Indian corporate entity may attract 18% or 28% GST, which must be factored into order quotes.
  4. **FEMA (Foreign Exchange Management Act) Exposure:** Accepting USD, EUR, and GBP from non-resident individuals in exchange for digital tokens involves cross-border capital/current account transactions regulated by the Reserve Bank of India (RBI).
- **Recommended Remediation:**  
  Engage qualified Indian legal counsel and Chartered Accountants to issue formal, written legal and tax opinions on:
  - Applicability of Section 194S and TAN registration requirements.
  - Entity-level FIU-IND registration requirements.
  - GST classification and rate applicability on token issuance.
  - FEMA compliance for accepting international fiat payments.

---

### Finding SEC-06: Mobile Wallet Support Relies Exclusively on In-App Browsers
- **Severity:** **MEDIUM**
- **Affected Files:** `apps/web/src/components/WalletModal.tsx`, `apps/web/src/hooks/useWeb3Wallet.ts`, `apps/web/package.json`
- **Description:**  
  The project documentation states that mobile wallets are supported. In reality, **mobile support is limited to the in-app Web3 browser of installed mobile apps** (via `window.ethereum` injection). WalletConnect v2 QR pairing is not implemented.
- **Evidence:**  
  `apps/web/package.json` does not include `@walletconnect/ethereum-provider`, `@web3modal`, or `@reown/appkit`. `WalletModal.tsx` contains an informational guide explaining that WalletConnect requires a project ID and directs users to open the website inside mobile wallet in-app browsers.
- **Impact:**  
  Users visiting the site via standard mobile browsers (Chrome/Safari on iOS or Android) cannot connect their mobile wallets via deep-linking or QR code scanning.
- **Recommended Remediation:**  
  Clearly document in user-facing materials that Phase 1 mobile connectivity requires using the mobile wallet's built-in Web3 browser (Trust Wallet, MetaMask Mobile, Binance Web3 Wallet). Integrate WalletConnect v2 as a dedicated task once an official WalletConnect Project ID is provisioned.

---

### Finding SEC-07: Floating-Point Arithmetic & Client-Side Clock Dependency
- **Severity:** **MEDIUM**
- **Affected Files:** `apps/web/src/lib/commerce/exchangeRatePolicy.ts`
- **Description:**  
  1. `validatePurchase()` relies on `currentTimeMs = Date.now()`. When executed in the browser, `Date.now()` is controlled by the user's local operating system clock. A user can set their system clock back to prevent quotes from expiring.
  2. The minimum check on line 149 uses a floating-point epsilon subtraction:
     ```typescript
     inrEquivalent < (ExchangeRatePolicy.CANONICAL_MIN_INR - 0.001)
     ```
     Financial boundaries should use strict integer comparisons without arbitrary float tolerances.
- **Recommended Remediation:**  
  1. Perform all quote generation and validation on the server side using trusted NTP-synchronized server timestamps.
  2. Represent all fiat amounts as integer sub-units (`BigInt` paise for INR, cents for USD/EUR, pence for GBP) and reject any order where `inrPaise < 10_000_000n`.

---

## 4. Automated Testing & Verification Audit

### Test Execution Summary
The automated test suite was executed against all smart contracts, tokenomics models, payment helpers, and wallet boundaries.

**Command:** `npx hardhat test`  
**Result:** **89 passing tests (0 failures)**

```
  AllocationManager — Comprehensive Unit Tests
    ✔ 14 passing
  OxeniqToken Contract Unit Tests
    ✔ 13 passing
  Phase 12 — E-Commerce 70:30 Token Allocation Models
    ✔ 8 passing
  Phase 12 — Payment Validation, Webhook Authentication & Idempotency
    ✔ 16 passing
  Phase 12 — Token Supply Configuration & Security Safeguards
    ✔ 14 passing
  Phase 12 — Wallet Compatibility, EIP-6963 Discovery & BSC Network Isolation
    ✔ 24 passing

  89 passing (5s)
```

### TypeScript Compilation & Linting
**Command:** `npm run lint` (`tsc --noEmit`) in `apps/web`  
**Result:** **Exit Code 0 (No type errors)**

### Analysis of Test Coverage vs Production Reality:
- While the automated test suite thoroughly tests the logic of `ExchangeRatePolicy`, `ReferencePaymentAdapter`, and `IdempotencyStore`, **these tests execute against mock objects and in-memory test helpers**.
- Passing unit tests on an in-memory test harness does **not** equal production readiness. The tests confirm that the mathematical logic is sound *under simulated conditions*, but they do not eliminate the architectural gaps identified in Findings SEC-01 through SEC-05.

---

## 5. Unresolved Approvals & Launch Prerequisites

Before OXENIQ can transition from staged prototype to live production token purchases:

1. **Server Architecture Implementation:** Build secure server-side API routes for quote generation, order registration, and payment gateway webhooks backed by a persistent database (PostgreSQL/Redis).
2. **Web3 Payment On-Ramp Contract:** Formally select, contract with, and integrate an approved crypto on-ramp provider (e.g. Transak or MoonPay) supporting INR (UPI/IMPS) and international cards.
3. **Legal & Tax Opinions:** Obtain written legal opinions on FIU-IND registration, PMLA compliance, Section 194S TDS handling, and GST liability.
4. **Live Oracle Integration:** Connect foreign currency conversion rates to an authorized live market data oracle with strict staleness and slippage limits.
5. **Smart Contract Deployment Approval:** Smart contracts are currently undeployed on BSC Mainnet (`tokenAddress: null`). A formal, multi-signature deployment on BNB Smart Chain Mainnet (Chain ID 56) must be authorized and executed.
6. **Token Pricing Authorization:** Finalize official token sale price ($0.10 is currently provisional) and allocation inventory.

---

## 6. Conclusion

The OXENIQ codebase exhibits clean architectural separation, defensive coding practices, and strong contract security (89/89 tests passing, no mint functions, two-step ownership, BSC-only network guard). 

However, **it is strictly a staged demonstration at this phase**. Live payment capture, blockchain fulfillment, and real-money purchase operations must remain completely disabled until the server-side validation boundary, persistent idempotency store, and regulatory approvals documented in this audit are fully implemented.
