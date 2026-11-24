# LIORA — Reference Pricing Schedule Implementation & Verification Report

**Schedule Specification:** Fixed Interval Step-Increment Engine  
**Initial Price:** ₹0.20 (20 paise) at $t = 0$  
**Step Increment:** +₹0.20 (20 paise) every 18,000 seconds (5 hours)  
**Maximum Ceiling:** ₹30.00 (3,000 paise) reached at $t = 745$ hours (Interval 149)  
**Arithmetic Precision:** Exact Integer Arithmetic in Sub-Units (Paise) — Zero Floating-Point Drift  
**Persistence Layer:** PostgreSQL Table `pricing_schedule_configs` (Prisma ORM)  
**Verification Suite:** `test/Phase2B_LioraPricingSchedule.test.js` — 9 / 9 Passing Tests (100%)  

---

## 1. Mathematical Formulation

To prevent decimal inaccuracy and floating-point rounding errors across client devices and database records, the pricing engine computes token valuation entirely using 64-bit integer paise ($1 \text{ INR} = 100 \text{ paise}$).

### 1.1 Step Increment Formula
For any given elapsed time $T_{\text{elapsed}} = T_{\text{current}} - T_{\text{activated}}$ in seconds:

$$\text{interval} = \left\lfloor \frac{\max(0, T_{\text{elapsed}})}{18,000} \right\rfloor$$

$$\text{pricePaise} = \min(20 + 20 \times \text{interval}, 3000)$$

$$\text{priceInr} = \frac{\text{pricePaise}}{100}$$

### 1.2 Schedule Progression Milestones

| Elapsed Time (Hours) | Interval Index | Reference Price (Paise) | Reference Price (₹ INR) | Status |
|---|---|---|---|---|
| **0h 00m** | 0 | 20 paise | **₹0.20** | Initial Baseline |
| **5h 00m** | 1 | 40 paise | **₹0.40** | Step 1 Increment |
| **10h 00m** | 2 | 60 paise | **₹0.60** | Step 2 Increment |
| **24h 00m (1 day)** | 4 | 100 paise | **₹1.00** | Day 1 Milestone |
| **120h 00m (5 days)**| 24 | 500 paise | **₹5.00** | Day 5 Milestone |
| **240h 00m (10 days)**| 48 | 980 paise | **₹9.80** | Day 10 Milestone |
| **480h 00m (20 days)**| 96 | 1,940 paise | **₹19.40** | Day 20 Milestone |
| **720h 00m (30 days)**| 144 | 2,900 paise | **₹29.00** | Day 30 Milestone |
| **745h 00m (31.04d)**| **149** | **3,000 paise** | **₹30.00** | **Final Ceiling Reached** |
| **800h+** | 160 | 3,000 paise | **₹30.00** | Hard Ceiling Clamped |

---

## 2. PostgreSQL Schema & Durability

The pricing configuration is persisted in the PostgreSQL database using Prisma ORM.

### 2.1 Prisma Schema Definition
```prisma
model PricingScheduleConfig {
  id               String   @id @default(uuid())
  name             String   @unique @default("LIORA_REFERENCE_SCHEDULE")
  startPricePaise  Int      @default(20)      // ₹0.20
  stepPricePaise   Int      @default(20)      // ₹0.20 per interval
  intervalSeconds  Int      @default(18000)   // 5 hours
  maxPricePaise    Int      @default(3000)    // ₹30.00 ceiling
  activatedAt      DateTime @default(now())
  isActive         Boolean  @default(true)
  updatedAt        DateTime @updatedAt
  createdAt        DateTime @default(now())

  @@map("pricing_schedule_configs")
}
```

### 2.2 Migration Execution
The database table was applied via SQL migration in `scripts/migrate-pricing-schedule.js` into PostgreSQL database `liora_dev`:
```sql
CREATE TABLE IF NOT EXISTS pricing_schedule_configs (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    start_price_paise INTEGER NOT NULL DEFAULT 20,
    step_price_paise INTEGER NOT NULL DEFAULT 20,
    interval_seconds INTEGER NOT NULL DEFAULT 18000,
    max_price_paise INTEGER NOT NULL DEFAULT 3000,
    activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## 3. Server-Side API Architecture

### 3.1 Public Reference Price Endpoint
- **Route:** `GET /api/pricing/reference-price`
- **Access:** Public (Read-Only)
- **Response Format:**
  ```json
  {
    "token": "LIORA",
    "currency": "INR",
    "referencePriceInr": 0.20,
    "referencePricePaise": 20,
    "intervalSeconds": 18000,
    "elapsedHours": 0.0,
    "isCapped": false,
    "maxPriceInr": 30.00,
    "hoursUntilCap": 745.0,
    "disclaimer": "Reference pricing is an informational indicative schedule and NOT a guaranteed return or DEX market price."
  }
  ```

### 3.2 Administrative Configuration Endpoint
- **Route:** `POST /api/pricing/configure`
- **Access:** Restricted to Settlement Admin (`requireSettlementAdmin` session validation)
- **Payload Validation:** Enforces positive integer increments, valid ceiling limits, and logs administrative audit events.

---

## 4. Test Verification Results

Dedicated test suite `test/Phase2B_LioraPricingSchedule.test.js` was executed and achieved 100% pass rate (9/9):

```text
  LIORA — Confirmed Reference Pricing Schedule & Auditability Suite
    1. Initial Reference Price Invariants
      √ Should start at exactly ₹0.20 (20 paise) at elapsed time = 0 (84ms)
      √ Should clamp negative elapsed time to 0 and return starting price ₹0.20
    2. Scheduled Five-Hour Increment Progression
      √ Should increase by exactly ₹0.20 at every 5-hour boundary (89ms)
      √ Should maintain the current step price during intermediate periods (49ms)
    3. Maximum Reference Price Ceiling (₹30.00) & Invariants
      √ Should reach exactly ₹30.00 after 745 hours (149 intervals)
      √ Should strictly enforce ₹30.00 cap for any duration after 745 hours (55ms)
    4. Administrative Configuration & Persistence
      √ Should allow authorized configuration and persist activation timestamp (783ms)
      √ Should provide mandatory disclaimer on all responses
      √ Should serve reference price via public GET /api/pricing/reference-price

  9 passing (1s)
```

### Invariants Proven:
1. **Mathematical Monotonicity:** Price is non-decreasing across time.
2. **Ceiling Invariance:** Price cannot exceed ₹30.00 (3,000 paise) under any elapsed duration.
3. **Integer Purity:** All calculations are performed in integer paise before decimal presentation formatting.
4. **Compliance Disclaimer:** Every response carries the mandatory disclosure clarifying reference pricing is not guaranteed liquidity or exchange valuation.
