# OXENIQ — Multi-Currency Fiat Purchase Architecture & Payment Provider Assessment

**Date:** October 2026  
**Status:** Architecture Implemented & Staged (Live Processing Inactive)  
**Target Chain:** BNB Smart Chain (BEP-20)  
**Canonical Minimum:** **₹1,00,000 INR (One Lakh Rupees)**  

---

## 1. Executive Summary & Core Rules

This specification establishes the business rules, currency conversion policies, payment provider evaluations, and security architecture for purchasing OXENIQ tokens directly with fiat currency.

### Canonical Principles
1. **Canonical Base Currency:** **Indian Rupee (INR)** is the definitive business benchmark.
2. **Canonical Minimum Purchase:** Exactly **₹1,00,000 INR**. Purchase amounts below ₹1,00,000 are rejected unconditionally across both client and server layers.
3. **Multi-Currency Ceiling Invariant:** For foreign fiat currencies (USD, EUR, GBP), the minimum amount is calculated using ceiling rounding (`Math.ceil((100,000 / rate) * 100) / 100`) such that the converted INR value is guaranteed to satisfy or exceed ₹1,00,000 INR. Rounding that permits sub-minimum purchases (even by 1 paisa) is strictly prohibited.
4. **Single Transaction Network:** Purchased tokens are minted/transferred exclusively on **BNB Smart Chain (BEP-20)**. Supporting a wallet app or displaying a currency symbol does not imply multi-chain deployment.
5. **Pre-Launch Guardrail:** Real fund processing, live checkout, and blockchain disbursements remain **disabled** until payment gateway approval, legal VDA compliance clearance, and official token pricing are completed.

---

## 2. Multi-Currency Registry & Configuration

The purchase architecture decouples currency configuration from UI layout via `apps/web/src/lib/commerce/fiatCurrencies.ts`.

| Currency Code | Currency Name | Symbol | Status | Reference Rate to INR | Minimum Purchase Required | Regulatory / Provider Notes |
|---|---|---|---|---|---|---|
| **INR** | Indian Rupee | `₹` | **CANONICAL_STAGED** | `1.00` | **₹1,00,000.00** | Canonical benchmark. Requires FIU-IND registration, 1% TDS under Sec 194S, and PMLA AML compliance. |
| **USD** | US Dollar | `$` | **EVALUATING_APPROVAL** | `84.50` (Staged) | **$1,183.44** | Evaluated international on-ramp. Subject to FATF Travel Rule and international passport KYC. |
| **EUR** | Euro | `€` | **EVALUATING_APPROVAL** | `91.80` (Staged) | **€1,089.33** | Evaluated for EU residents. Subject to EU Markets in Crypto-Assets (MiCA) regulation. |
| **GBP** | British Pound | `£` | **EVALUATING_APPROVAL** | `107.20` (Staged) | **£932.84** | Evaluated for UK residents. Subject to UK Financial Conduct Authority (FCA) financial promotion rules. |

> **Ceiling Calculation Proof (USD Example):**  
> `100,000 / 84.50 = 1183.43195...`  
> - If rounded to `$1,183.43`: `1,183.43 * 84.50 = ₹99,999.835` (Below ₹1,00,000 -> **REJECTED**).  
> - Ceiling rounded to `$1,183.44`: `1,183.44 * 84.50 = ₹100,000.68` (Above ₹1,00,000 -> **ACCEPTED**).

---

## 3. Payment Gateway Provider Assessment

A critical distinction must be drawn between **standard e-commerce gateways** and **regulated crypto fiat on-ramps**:

### 3.1 Standard Domestic Indian Gateways (Razorpay / Cashfree)
- **Crypto Business Model Compatibility:** **Not Permitted.** Under RBI and Indian banking circulars, domestic Indian payment aggregators (Razorpay, Cashfree, PayU, CCAvenue) prohibit merchants from processing direct retail fiat transactions for cryptocurrency or Virtual Digital Asset (VDA) sales.
- **Verdict:** Cannot be used for direct OXENIQ token sales in India without a licensed VDA exchange / NBFC partnership.

### 3.2 Regulated Web3 Fiat On-Ramps (Transak / MoonPay / Stripe Crypto)
- **Transak / MoonPay:**
  - **Supported Currencies:** INR (via UPI / IMPS), USD, EUR, GBP, CAD, AUD.
  - **Crypto Business Model Compatibility:** Supported. Built specifically as non-custodial crypto on-ramps that handle fiat capture, automated user KYC/AML, and direct BEP-20 token delivery to the user's wallet.
  - **Indian Regulatory Compliance:** Transak is registered with FIU-IND as a reporting entity. Handles mandatory 1% TDS withholding under Section 194S of the Indian Income Tax Act.
  - **Onboarding Requirements:** Requires corporate entity verification, source-of-funds compliance, smart contract audit submission, and commercial agreement.
- **Stripe Crypto Onramp:**
  - **Supported Currencies:** USD, EUR.
  - **Crypto Business Model Compatibility:** Supported in US / EU jurisdictions; INR not currently supported for crypto on-ramping.
  - **Verdict:** Viable for international USD/EUR orders once international corporate entity is established.

### 3.3 Provider Comparison Summary
| Provider | Supported Currencies | Direct Crypto Sale Permitted? | INR Processing (UPI/IMPS) | KYC / AML Built-In | Webhook Auth | Status |
|---|---|---|---|---|---|---|
| **Transak** | INR, USD, EUR, GBP | **Yes (Specialized)** | Yes (UPI/IMPS) | Yes (Mandatory) | HMAC-SHA256 | **Recommended for Production Integration** |
| **MoonPay** | USD, EUR, GBP (INR limited) | **Yes (Specialized)** | Limited | Yes (Mandatory) | HMAC-SHA256 | Viable Secondary / International |
| **Stripe Crypto** | USD, EUR | **Yes (Specialized)** | No | Yes (Mandatory) | Stripe Signature | International Only |
| **Razorpay / Cashfree**| INR | **No (Standard E-Commerce Only)**| Yes | Standard | HMAC-SHA256 | **Prohibited for Token Sales** |

---

## 4. Purchase Lifecycle & Security Controls

```
+--------------------------------------------------------------------------------------------------------+
|                                  OXENIQ PURCHASE LIFECYCLE                                             |
|                                                                                                        |
|  [ User Input ] ──► [ Multi-Currency Quote ] ──► [ Validation Engine ] ──► [ Idempotency Store ]       |
|  - Amount           - Rate: 1 Foreign = X INR    - Amount >= ₹1,00,000      - Unique Order Key         |
|  - Currency         - TTL: 15 Minutes            - Rate Age <= 60 Mins      - Prevents Double Delivery |
|  - BEP-20 Address   - Ceiling Minimum            - Network: BSC Valid                                  |
+--------------------------------------------------------------------------------------------------------+
                                                    │
                                                    ▼
+--------------------------------------------------------------------------------------------------------+
|                                    STAGED GATEWAY BOUNDARY                                             |
|   - Real payments strictly disabled until provider commercial contract signed                          |
|   - Authenticated HMAC-SHA256 Webhook Verification                                                     |
|   - Two-Step Ownership / AllocationManager (70:30 Split) Ready                                         |
+--------------------------------------------------------------------------------------------------------+
```

### Security Defenses
1. **Client-Side Callback Prohibition:** Tokens are **never** minted or delivered based on a client-side frontend redirect or callback. Only cryptographically verified, idempotent backend webhooks may trigger fulfillment.
2. **Timing-Safe Webhook Verification:** The reference adapter uses `crypto.timingSafeEqual` to prevent timing-attack exploits on HMAC signatures.
3. **Idempotency Guarantee:** Duplicate webhook notifications (from network retries or replay attacks) return the original transaction receipt without triggering duplicate token transfers.
4. **Stale Oracle Defense:** If exchange-rate data exceeds 60 minutes or is explicitly flagged stale, order creation is halted immediately.

---

## 5. Unresolved Decisions & Pre-Launch Roadmap

1. **Payment Provider Commercial Onboarding:** Formally apply for Transak / MoonPay institutional merchant accounts for VDA on-ramping.
2. **Indian Tax & TDS Compliance:** Retain specialized chartered accountants to set up Section 194S automated 1% TDS withholding and quarterly Form 26Q filing pipelines.
3. **Official Genesis Token Sale Price:** Confirm whether the provisional reference price of `$0.10 USD` (~₹8.45 INR) is adopted for the Genesis round.
4. **Candidate Allocation Interpretation:** Formally approve Candidate Interpretation A (30% additional reserve) or Candidate Interpretation B (buyer receives 70% of total pool).
