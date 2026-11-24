# OXENIQ — Security Policy & Threat Model

## 1. Security Architecture Principles

1. **Least Privilege & Role Segregation**: Administrative privileges are restricted to strictly necessary operations (emergency pause, two-step recipient updates). Hot fulfillment wallets have bounded allowances.
2. **Two-Step Ownership Transfer**: OpenZeppelin `Ownable2Step` eliminates accidental burns or lost keys when transferring contract administration.
3. **No Fees-On-Transfer**: The base BEP-20 token does NOT apply transfer fees or balance deductions inside `transfer()` or `transferFrom()`. This eliminates integration vulnerabilities with DEX routers, AMM pools, and bridges.
4. **Zero Floating-Point Math**: All token accounting and allocation calculations use integer arithmetic with explicit rounding guards in 18-decimal base units (`BigInt` / `uint256`).
5. **No Private Credentials**: Private keys, seed phrases, database passwords, and webhook secrets are never stored in version control or client bundles.
6. **Non-Custodial Architecture**: The platform never requests, collects, or stores customer wallet private keys or seed phrases. Tokens are delivered directly to customer-owned BEP-20 addresses.

---

## 2. Threat Analysis & Mitigations

| Threat Vector | Severity | Mitigation Strategy |
|---|---|---|
| **Arbitrary Supply Inflation** | Critical | Verified zero `mint()` function in contract ABI. 1,000,000,000 supply minted once at deployment. |
| **Payment Webhook Spoofing / Replay** | High | Timing-safe HMAC-SHA256 signature verification. Replay attacks blocked via composite idempotency key (`providerId:paymentId:orderId`). |
| **Duplicate Token Delivery** | High | Atomic fulfillment lock in backend state machine. Webhook retries return cached transaction hash without re-initiating on-chain transfers. |
| **Fiat Oracle Arbitrage (Stale Rates)** | Medium | 15-minute quote validity TTL. Automatic fail-safe suspension if rate oracle data exceeds 60 minutes. |
| **Reentrancy Attacks** | High | Standard Checks-Effects-Interactions pattern; OpenZeppelin `ReentrancyGuard` on allocation contracts. |
| **Integer Truncation & Lost Dust** | Low | Remainder derived by exact subtraction: $\text{share30} = \text{total} - \text{share70}$. Fuzz tested across comprehensive ranges. |
| **MEV Front-Running / Sandwiching** | Medium | Slippage tolerance capped at 0.5% and strict 5-minute deadline on all DEX liquidity operations. |
| **Single Key Compromise** | Critical | Liquidity reserve and treasury governed by Gnosis Safe multi-signature wallet (3-of-5 threshold recommended). |

---

## 3. Indian Regulatory, Tax & Compliance Readiness

Because the system facilitates INR fiat payments for cryptocurrency tokens (Virtual Digital Assets / VDA), formal review by qualified Indian legal and tax counsel is required prior to mainnet launch:

1. **Virtual Digital Asset Taxation (Section 115BBH)**: Indian Income Tax Act mandates a flat 30% tax (plus applicable surcharge and cess) on transfer of VDAs, with no deduction allowed except cost of acquisition.
2. **Tax Deducted at Source (Section 194S)**: Mandates 1% TDS withholding on payment for transfer of VDAs above statutory thresholds. The e-commerce backend must incorporate TDS reporting or verify merchant exemption.
3. **FIU-IND & PMLA Registration**: Entities providing exchange, transfer, or safekeeping of VDAs in India must register as reporting entities with the Financial Intelligence Unit - India (FIU-IND) and implement KYC/AML controls under the Prevention of Money Laundering Act (PMLA).
4. **Payment Aggregator Guidelines**: RBI regulations require payment aggregators to conduct enhanced due diligence on crypto-related merchants. The selected gateway must have written approval for VDA transactions.

> **AUDIT STATUS DISCLOSURE**:  
> No independent third-party security or regulatory audit has been completed as of Phase 12. Smart contracts have undergone rigorous internal testing (59 passing tests). A formal audit by a certified Web3 security firm must be completed before mainnet deployment.
