# LIORA COIN — Sprint 3B Proportional Token Allocation Engine Implementation Report

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Target Genesis Launch:** 4 December 2026  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented by confirmed manual cash payout and collateral-return arrangement.

---

## 1. Executive Summary

Sprint 3B establishes the mathematical and architectural implementation of the proportional token allocation engine for the LIORA blockchain ecosystem.

In accordance with management instructions:
- Token allocation is strictly proportional:
  $$\text{Allocated LIORA} = \frac{\text{Fixed Plan Allocation Value}}{\text{Applicable LIORA Allocation Price}}$$
- These token quantities represent **fixed upfront collateral**, not guaranteed open-market liquidation values.
- Once allocated and finalized, the collateral quantity is permanently frozen. Later reference-price increments or DEX market movements **never** modify the investor's collateral quantity or contractual cash payout entitlement.

The implementation is encapsulated in `apps/web/src/lib/allocation/proportionalAllocationEngine.ts` and uses exact 18-decimal BigInt arithmetic to eliminate JavaScript floating-point inaccuracies.

---

## 2. Confirmed Investment Plans & Mathematical Proofs

The six investment plans approved in Checklist (3) are modeled with their respective investment amounts, multipliers, fixed allocation values, and lock-in durations:

| Plan ID | Tier Number | Plan Display Name | Principal Investment (INR / USD) | Multiplier Factor | Fixed Contractual Allocation / Payout Value | Lock-In Duration | Settlement Payout Month | Recommended? |
|---|---|---|---|---|---|---|---|---|
| `TIER_01` | 01 | Tier 01 (Starter) | ₹50,000 / $500 | 2.5× | ₹1,25,000 / $1,250 | 3 Months | Month 4 | Standard |
| `TIER_02` | 02 | Tier 02 (Basic) | ₹1,00,000 / $1,000 | 6.0× | ₹6,00,000 / $6,000 | 3 Months | Month 4 | **Recommended** |
| `TIER_03` | 03 | Tier 03 (Standard) | ₹2,00,000 / $2,000 | 5.0× | ₹10,00,000 / $10,000 | 3 Months | Month 4 | Standard |
| `TIER_04` | 04 | Tier 04 (Advanced) | ₹3,00,000 / $3,000 | 8.0× | ₹24,00,000 / $24,000 | 9 Months | Month 10 | **Recommended** |
| `TIER_05` | 05 | Tier 05 (Premium) | ₹5,00,000 / $5,000 | 6.0× | ₹30,00,000 / $30,000 | 12 Months | Month 13 | Standard |
| `TIER_06` | 06 | Tier 06 (Elite) | ₹10,00,000 / $10,000 | 9.0× | ₹90,00,000 / $90,000 | 12 Months | Month 13 | **Recommended** |

*Note: In accordance with Q10, USD and INR figures are fixed alternative contractual values without live FX recalculation (e.g. Tier 01 is always ₹50,000 or $500).*

---

## 3. Allocation Quotes Across Sample Schedule Prices

Because proportional allocation divides the fixed allocation value by the price, higher prices yield fewer tokens for the same contractual entitlement:

$$\text{Tokens} = \frac{\text{Contractual Allocation Value}}{\text{Price}}$$

### Detailed Matrix by Plan:

| Tier | Fixed Allocation Value | Quantity @ ₹0.20 (Launch Start) | Quantity @ ₹0.40 (Hour 5) | Quantity @ ₹1.00 (Hour 20) | Quantity @ ₹2.50 | Quantity @ ₹30.00 (Cap) |
|---|---|---|---|---|---|---|
| **Tier 01** | ₹1,25,000 | **625,000 LIORA** | **312,500 LIORA** | **125,000 LIORA** | 50,000 LIORA | 4,166.6666... LIORA |
| **Tier 02** | ₹6,00,000 | **3,000,000 LIORA** | **1,500,000 LIORA** | **600,000 LIORA** | 240,000 LIORA | 20,000 LIORA |
| **Tier 03** | ₹10,00,000 | **5,000,000 LIORA** | **2,500,000 LIORA** | **1,000,000 LIORA** | 400,000 LIORA | 33,333.3333... LIORA |
| **Tier 04** | ₹24,00,000 | **12,000,000 LIORA** | **6,000,000 LIORA** | **2,400,000 LIORA** | 960,000 LIORA | 80,000 LIORA |
| **Tier 05** | ₹30,00,000 | **15,000,000 LIORA** | **7,500,000 LIORA** | **3,000,000 LIORA** | 1,200,000 LIORA | 100,000 LIORA |
| **Tier 06** | ₹90,00,000 | **45,000,000 LIORA** | **22,500,000 LIORA** | **9,000,000 LIORA** | 3,600,000 LIORA | 300,000 LIORA |

---

## 4. Decimal-Safe 18-Decimal Arithmetic Specification

Financial computations in JavaScript frequently suffer from IEEE 754 floating-point inaccuracies (e.g. `0.1 + 0.2 !== 0.3`). Because LIORA is an ERC-20 token with 18 decimals ($10^{18}$ wei base units), the allocation engine implements scaled BigInt arithmetic:

### 4.1 Price Parsing (`parseDecimalToBigInt`)
- String inputs like `"0.20"` are split into integer and fractional components.
- The fractional part is right-padded with zeros up to 18 characters.
- `"0.20"` becomes `200000000000000000n` ($2 \times 10^{17}$ wei).
- Rejects non-numeric strings, negative values, and zero prices with explicit errors (`PRICE_ZERO`, `INVALID_PRICE_FORMAT`).

### 4.2 Proportional Division Formula
To compute tokens in 18-decimal base units ($10^{18}$ wei):

$$\text{Numerator} = \text{Allocation INR} \times 10^{18} \times 10^{18} = \text{Allocation INR} \times 10^{36}$$
$$\text{Allocated Tokens Base Units} = \lfloor \frac{\text{Numerator}}{\text{Price Wei}} \rfloor$$
$$\text{Rounding Remainder Wei} = \text{Numerator} \pmod{\text{Price Wei}}$$

### 4.3 Deterministic Conservation Verification
Every quote guarantees the exact mathematical identity:
$$(\text{Allocated Tokens Base Units} \times \text{Price Wei}) + \text{Rounding Remainder Wei} \equiv \text{Allocation INR} \times 10^{36}$$
This guarantees zero loss of value, exact remainder auditing, and deterministic truncation.

---

## 5. Fixed Collateral Invariant & Immutability

Management clarified that the collateral tokens issued upfront serve as security, while the cash payout is made off-chain.

To prevent collateral volatility risks:
1. **Permanent Freeze:** When an investment is finalized, `finalizedCollateralQuantityBaseUnits` is stamped into an immutable record (`isImmutable = true`).
2. **Zero Post-Allocation Repricing:** The engine contains **no setter, cron, or trigger** to adjust allocated collateral based on DEX pool swings or reference price updates.
3. **Exact Return Requirement:** When the investment matures and cash payment is independently verified, the investor must return **exactly** the original quantity (`originalCollateralTokensFormatted`). Attempting to return partial or modified tokens is strictly rejected by `verifyCollateralReturnQuantity`.

---

## 6. Files Changed & Added

1. `apps/web/src/lib/allocation/proportionalAllocationEngine.ts` (New module: 285 lines)
   - `CONFIRMED_INVESTMENT_PLANS` dictionary (Tiers 01–06).
   - `parseDecimalToBigInt` & `formatBaseUnitsToDecimal`.
   - `calculateAllocation` with 18-decimal precision and remainder recording.
   - `finalizeCollateral` immutable freezing method.
   - `verifyCollateralReturnQuantity` exact return validator.
2. `apps/web/src/lib/settlement/manualSettlementModel.ts` (Updated)
   - Integrated with `ProportionalAllocationEngine`.
   - Enforced exact collateral quantity checks on return.
3. `test/Phase2B_Sprint3B_ProportionalAllocationAndSettlement.test.js` (New test suite: 295 lines)
   - 23 comprehensive tests covering all allocation formulas, rounding, immutability, and rejection rules.
