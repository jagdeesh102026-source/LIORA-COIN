const { expect } = require("chai");

// Activate zero-dependency TypeScript loader for production modules
require("./helpers/tsLoader");

const {
  toScaledBigInt,
  fromScaledBigInt,
  validatePrelaunchConfig,
  calculatePrelaunchPrice
} = require("../apps/web/src/lib/prelaunch/pricingEngine.ts");

const {
  getDaysInUTCMonth,
  addCalendarMonthsUTC,
  validateInvestmentTiers,
  getTierForInvestmentUSD,
  calculateTokenAllocation
} = require("../apps/web/src/lib/prelaunch/lockingPolicy.ts");

const {
  prelaunchStore,
  INITIAL_PRELAUNCH_CONFIG,
  DEFAULT_INVESTMENT_TIERS
} = require("../apps/web/src/lib/prelaunch/prelaunchStore.ts");

describe("LIORA COIN — Configurable Pre-Launch Pricing & Token Locking Suite", function () {
  beforeEach(function () {
    prelaunchStore.resetToDefault();
  });

  // =========================================================================
  // SCENARIO 1: Initial ₹0.20 Conversion to USD Baseline
  // =========================================================================
  describe("Scenario 1: Initial ₹0.20 Conversion to USD Baseline", function () {
    it("Should compute accurate start USD from ₹0.20 INR using locked FX rate of 86.50", function () {
      const config = {
        ...INITIAL_PRELAUNCH_CONFIG,
        startPriceINR: "0.20",
        lockedInrPerUsd: "86.50",
        targetPriceUSD: "0.30",
        durationDays: 30
      };

      const baseTimeMs = 1700000000000;
      config.startTimeUTC = new Date(baseTimeMs).toISOString();

      const result = calculatePrelaunchPrice(config, baseTimeMs);

      // 0.20 / 86.50 = 0.002312138728...
      expect(result.startPriceUSD.startsWith("0.00231213") || result.startPriceUSD.startsWith("0.00231214")).to.be.true;
      expect(result.priceINR.startsWith("0.2000")).to.be.true;
    });
  });

  // =========================================================================
  // SCENARIO 2: Day 0 Price at Schedule Start
  // =========================================================================
  describe("Scenario 2: Day 0 Price at Schedule Start", function () {
    it("Should strictly return startUSD at elapsed = 0 seconds", function () {
      const baseTimeMs = 1700000000000;
      const config = {
        ...INITIAL_PRELAUNCH_CONFIG,
        startTimeUTC: new Date(baseTimeMs).toISOString(),
        startPriceINR: "0.20",
        lockedInrPerUsd: "86.50",
        targetPriceUSD: "0.30",
        durationDays: 30
      };

      const result = calculatePrelaunchPrice(config, baseTimeMs);
      expect(result.elapsedSeconds).to.equal(0);
      expect(result.progressPercent).to.equal(0);
      expect(result.priceUSD).to.equal(result.startPriceUSD);
      expect(result.isStarted).to.be.true;
      expect(result.isCompleted).to.be.false;
    });
  });

  // =========================================================================
  // SCENARIO 3: Halfway (Day 15) Price
  // =========================================================================
  describe("Scenario 3: Halfway (Day 15) Price Linear Progression", function () {
    it("Should accurately calculate Day 15 midpoint price at 50% progression", function () {
      const baseTimeMs = 1700000000000;
      const config = {
        ...INITIAL_PRELAUNCH_CONFIG,
        startTimeUTC: new Date(baseTimeMs).toISOString(),
        startPriceINR: "0.20",
        lockedInrPerUsd: "86.50",
        targetPriceUSD: "0.30",
        durationDays: 30
      };

      // Day 15 = 15 * 86400 seconds later
      const day15TimeMs = baseTimeMs + 15 * 86400 * 1000;
      const result = calculatePrelaunchPrice(config, day15TimeMs);

      expect(result.elapsedSeconds).to.equal(15 * 86400);
      expect(result.progressPercent).to.equal(50);

      // Midpoint = startUSD + (0.30 - startUSD) * 0.5
      // 0.00231214 + (0.30 - 0.00231214) * 0.5 = 0.15115607...
      const priceNum = parseFloat(result.priceUSD);
      expect(priceNum).to.be.closeTo(0.151156, 0.0001);
      expect(result.isCompleted).to.be.false;
    });
  });

  // =========================================================================
  // SCENARIO 4: Exactly Day 30 Price Reaches Target Cap ($0.30)
  // =========================================================================
  describe("Scenario 4: Exactly Day 30 Price Equals Target Cap", function () {
    it("Should equal exactly targetPriceUSD on Day 30 (elapsed = 30 * 86400)", function () {
      const baseTimeMs = 1700000000000;
      const config = {
        ...INITIAL_PRELAUNCH_CONFIG,
        startTimeUTC: new Date(baseTimeMs).toISOString(),
        startPriceINR: "0.20",
        lockedInrPerUsd: "86.50",
        targetPriceUSD: "0.30",
        durationDays: 30
      };

      const day30TimeMs = baseTimeMs + 30 * 86400 * 1000;
      const result = calculatePrelaunchPrice(config, day30TimeMs);

      expect(result.elapsedSeconds).to.equal(30 * 86400);
      expect(result.remainingSeconds).to.equal(0);
      expect(result.progressPercent).to.equal(100);
      expect(result.isCompleted).to.be.true;
      expect(result.priceUSD.startsWith("0.30000000")).to.be.true;
    });
  });

  // =========================================================================
  // SCENARIO 5: Post-Day 30 Price Clamping
  // =========================================================================
  describe("Scenario 5: Post-Day 30 Strict Boundary Clamping", function () {
    it("Should never exceed targetPriceUSD after Day 30 (e.g. Day 45, Day 100)", function () {
      const baseTimeMs = 1700000000000;
      const config = {
        ...INITIAL_PRELAUNCH_CONFIG,
        startTimeUTC: new Date(baseTimeMs).toISOString(),
        startPriceINR: "0.20",
        lockedInrPerUsd: "86.50",
        targetPriceUSD: "0.30",
        durationDays: 30
      };

      // Day 45 (15 days past duration)
      const day45TimeMs = baseTimeMs + 45 * 86400 * 1000;
      const resultDay45 = calculatePrelaunchPrice(config, day45TimeMs);
      expect(resultDay45.priceUSD.startsWith("0.30000000")).to.be.true;
      expect(resultDay45.progressPercent).to.equal(100);
      expect(resultDay45.isCompleted).to.be.true;

      // Day 100
      const day100TimeMs = baseTimeMs + 100 * 86400 * 1000;
      const resultDay100 = calculatePrelaunchPrice(config, day100TimeMs);
      expect(resultDay100.priceUSD.startsWith("0.30000000")).to.be.true;
    });
  });

  // =========================================================================
  // SCENARIO 6: Future Target Price of $1.00 (or $0.50)
  // =========================================================================
  describe("Scenario 6: Future Target Price of $1.00", function () {
    it("Should smoothly scale to future target of $1.00 USD at Day 30", function () {
      const baseTimeMs = 1700000000000;
      const config = {
        ...INITIAL_PRELAUNCH_CONFIG,
        startTimeUTC: new Date(baseTimeMs).toISOString(),
        startPriceINR: "0.20",
        lockedInrPerUsd: "86.50",
        targetPriceUSD: "1.00",
        durationDays: 30
      };

      // Day 15 midpoint for $1.00 target
      const day15TimeMs = baseTimeMs + 15 * 86400 * 1000;
      const resultDay15 = calculatePrelaunchPrice(config, day15TimeMs);
      const price15 = parseFloat(resultDay15.priceUSD);
      // Midpoint = startUSD + (1.00 - startUSD) * 0.5 ≈ 0.501156
      expect(price15).to.be.closeTo(0.501156, 0.001);

      // Day 30 terminal price
      const day30TimeMs = baseTimeMs + 30 * 86400 * 1000;
      const resultDay30 = calculatePrelaunchPrice(config, day30TimeMs);
      expect(resultDay30.priceUSD.startsWith("1.00000000")).to.be.true;
      expect(resultDay30.progressPercent).to.equal(100);
    });
  });

  // =========================================================================
  // SCENARIO 7: Invalid or Missing FX Rate Rejection
  // =========================================================================
  describe("Scenario 7: Invalid or Missing FX Rate Rejection", function () {
    it("Should reject null, empty, zero, or negative FX rates", function () {
      const testCases = [null, "", "0", "-86.50", "abc"];
      for (const invalidFx of testCases) {
        const validation = validatePrelaunchConfig({
          ...INITIAL_PRELAUNCH_CONFIG,
          lockedInrPerUsd: invalidFx
        });
        expect(validation.valid).to.be.false;
        expect(validation.errors.some(e => e.includes("FX rate"))).to.be.true;
      }
    });
  });

  // =========================================================================
  // SCENARIO 8: Invalid Config Rejection (Target < Start, Non-positive Duration)
  // =========================================================================
  describe("Scenario 8: Invalid Config Rejection (Target < Start, Non-positive Duration)", function () {
    it("Should reject target price lower than starting USD price", function () {
      // Start is ~0.002312, target is set to 0.001
      const validation = validatePrelaunchConfig({
        ...INITIAL_PRELAUNCH_CONFIG,
        startPriceINR: "0.20",
        lockedInrPerUsd: "86.50",
        targetPriceUSD: "0.001"
      });
      expect(validation.valid).to.be.false;
      expect(validation.errors.some(e => e.includes("greater than initial USD"))).to.be.true;
    });

    it("Should reject zero or negative durationDays", function () {
      const valZero = validatePrelaunchConfig({
        ...INITIAL_PRELAUNCH_CONFIG,
        durationDays: 0
      });
      expect(valZero.valid).to.be.false;

      const valNeg = validatePrelaunchConfig({
        ...INITIAL_PRELAUNCH_CONFIG,
        durationDays: -30
      });
      expect(valNeg.valid).to.be.false;
    });
  });

  // =========================================================================
  // SCENARIO 9: Precision & Rounding Verification
  // =========================================================================
  describe("Scenario 9: High-Precision Fixed-Point Arithmetic", function () {
    it("Should convert decimal strings to 18-decimal scaled BigInt without IEEE-754 drift", function () {
      const val = "0.20";
      const scaled = toScaledBigInt(val);
      expect(scaled).to.equal(200000000000000000n);

      const formatted = fromScaledBigInt(scaled, 2);
      expect(formatted).to.equal("0.20");
    });

    it("Should maintain exact precision across multiplication and division", function () {
      const tokens = calculateTokenAllocation(1000, "0.00231214");
      // 1000 / 0.00231214 ≈ 432499.7621
      expect(parseFloat(tokens)).to.be.closeTo(432499.76, 1.0);
    });
  });

  // =========================================================================
  // SCENARIO 10: 15-Minute Purchase Quote Expiration & Rejection
  // =========================================================================
  describe("Scenario 10: 15-Minute Binding Quote Expiration & Rejection", function () {
    it("Should issue quote with 15-minute TTL and reject expired execution", function () {
      const nowMs = 1700000000000;
      const res = prelaunchStore.createQuote(
        {
          investmentAmount: 500,
          currency: "USD",
          userId: "usr_buyer_1",
          walletAddress: "0x1111111111111111111111111111111111111111"
        },
        nowMs
      );

      expect(res.success).to.be.true;
      const quote = res.quote;
      expect(quote.ttlSeconds).to.equal(900);

      // Check at 14 minutes: Valid
      const check14 = prelaunchStore.getQuote(quote.quoteId, nowMs + 14 * 60 * 1000);
      expect(check14.isExpired).to.be.false;

      // Check at 15 minutes + 1 second: Expired
      const check15p = prelaunchStore.getQuote(quote.quoteId, nowMs + (15 * 60 + 1) * 1000);
      expect(check15p.isExpired).to.be.true;

      // Executing purchase with expired quote must fail
      const purchaseRes = prelaunchStore.recordPurchase(quote.quoteId, nowMs + (15 * 60 + 1) * 1000);
      expect(purchaseRes.success).to.be.false;
      expect(purchaseRes.error).to.include("expired");
    });
  });

  // =========================================================================
  // SCENARIO 11: Tier Boundary Gap & Overlap Rejection
  // =========================================================================
  describe("Scenario 11: Tier Boundary Gap & Overlap Rejection", function () {
    it("Should reject overlapping tier boundaries", function () {
      const overlappingTiers = [
        { id: "t1", name: "T1", minAmountUSD: 100, maxAmountUSD: 1500, lockMonths: 3, description: "" },
        { id: "t2", name: "T2", minAmountUSD: 1000, maxAmountUSD: 5000, lockMonths: 6, description: "" }
      ];

      const validation = validateInvestmentTiers(overlappingTiers);
      expect(validation.valid).to.be.false;
      expect(validation.errors.some(e => e.includes("overlap"))).to.be.true;
    });

    it("Should reject significant gaps between tiers", function () {
      const gapTiers = [
        { id: "t1", name: "T1", minAmountUSD: 100, maxAmountUSD: 500, lockMonths: 3, description: "" },
        { id: "t2", name: "T2", minAmountUSD: 1000, maxAmountUSD: 5000, lockMonths: 6, description: "" }
      ];

      const validation = validateInvestmentTiers(gapTiers);
      expect(validation.valid).to.be.false;
      expect(validation.errors.some(e => e.includes("gap"))).to.be.true;
    });

    it("Should accept valid contiguous default tiers", function () {
      const validation = validateInvestmentTiers(DEFAULT_INVESTMENT_TIERS);
      expect(validation.valid).to.be.true;
      expect(validation.errors.length).to.equal(0);
    });
  });

  // =========================================================================
  // SCENARIO 12: 3, 6, and 12-Month Investment Locking Calculations
  // =========================================================================
  describe("Scenario 12: 3, 6, and 12-Month Investment Locking Calculations", function () {
    it("Should match investment amounts to correct 3, 6, and 12-month tiers", function () {
      const tier3m = getTierForInvestmentUSD(500, DEFAULT_INVESTMENT_TIERS);
      expect(tier3m.lockMonths).to.equal(3);

      const tier6m = getTierForInvestmentUSD(2500, DEFAULT_INVESTMENT_TIERS);
      expect(tier6m.lockMonths).to.equal(6);

      const tier12m = getTierForInvestmentUSD(10000, DEFAULT_INVESTMENT_TIERS);
      expect(tier12m.lockMonths).to.equal(12);
    });

    it("Should reject investment amounts below the minimum threshold", function () {
      expect(() => getTierForInvestmentUSD(50, DEFAULT_INVESTMENT_TIERS)).to.throw(
        "below the minimum allocation threshold"
      );
    });
  });

  // =========================================================================
  // SCENARIO 13: Leap Year & UTC Calendar-Month Addition Boundaries
  // =========================================================================
  describe("Scenario 13: Leap Year & UTC Calendar-Month Boundaries", function () {
    it("Should clamp day to Feb 28 in a non-leap year (e.g. 2027)", function () {
      // 2026-11-30 + 3 calendar months -> 2027-02-28
      const date = new Date("2026-11-30T14:30:00.000Z");
      const target = addCalendarMonthsUTC(date, 3);

      expect(target.getUTCFullYear()).to.equal(2027);
      expect(target.getUTCMonth()).to.equal(1); // February is month 1
      expect(target.getUTCDate()).to.equal(28); // Clamped from 30 to 28
      expect(target.getUTCHours()).to.equal(14);
      expect(target.getUTCMinutes()).to.equal(30);
    });

    it("Should clamp day to Feb 29 in a leap year (e.g. 2024)", function () {
      // 2023-11-29 + 3 calendar months -> 2024-02-29 (2024 is divisible by 4)
      const date = new Date("2023-11-29T10:00:00.000Z");
      const target = addCalendarMonthsUTC(date, 3);

      expect(target.getUTCFullYear()).to.equal(2024);
      expect(target.getUTCMonth()).to.equal(1);
      expect(target.getUTCDate()).to.equal(29); // Preserved 29
    });

    it("Should clamp 31-day months to 30-day target months (e.g. March 31 + 6 months -> Sep 30)", function () {
      const date = new Date("2026-03-31T08:15:00.000Z");
      const target = addCalendarMonthsUTC(date, 6);

      expect(target.getUTCFullYear()).to.equal(2026);
      expect(target.getUTCMonth()).to.equal(8); // September is month 8
      expect(target.getUTCDate()).to.equal(30); // Clamped from 31 to 30
      expect(target.getUTCHours()).to.equal(8);
      expect(target.getUTCMinutes()).to.equal(15);
    });
  });

  // =========================================================================
  // SCENARIO 14: Historical Configuration Preservation & Versioning
  // =========================================================================
  describe("Scenario 14: Historical Configuration Preservation & Versioning", function () {
    it("Should increment version and preserve immutable historical snapshots", function () {
      const initialConfig = prelaunchStore.getConfig();
      expect(initialConfig.version).to.equal(1);

      // Update to v2: target $0.50
      const updateRes1 = prelaunchStore.updateConfig({ targetPriceUSD: "0.50" }, "admin_1");
      expect(updateRes1.success).to.be.true;
      expect(updateRes1.config.version).to.equal(2);

      // Update to v3: target $1.00
      const updateRes2 = prelaunchStore.updateConfig({ targetPriceUSD: "1.00" }, "admin_2");
      expect(updateRes2.success).to.be.true;
      expect(updateRes2.config.version).to.equal(3);

      // Verify history
      const history = prelaunchStore.getConfigHistory();
      expect(history.length).to.equal(3);
      expect(history[0].version).to.equal(1);
      expect(history[0].targetPriceUSD).to.equal("0.30");
      expect(history[1].version).to.equal(2);
      expect(history[1].targetPriceUSD).to.equal("0.50");
      expect(history[2].version).to.equal(3);
      expect(history[2].targetPriceUSD).to.equal("1.00");

      // Verify audit logs
      const logs = prelaunchStore.getAuditLogs();
      expect(logs.length).to.be.at.least(3);
      const lastLog = logs[logs.length - 1];
      expect(lastLog.action).to.equal("CONFIG_UPDATED");
      expect(lastLog.actorId).to.equal("admin_2");
      expect(lastLog.previousVersion).to.equal(2);
      expect(lastLog.newVersion).to.equal(3);
    });
  });

  // =========================================================================
  // SCENARIO 15: Unauthorized Admin Modification Rejection
  // =========================================================================
  describe("Scenario 15: Admin Authorization & Validation Enforcement", function () {
    it("Should reject updates with invalid parameters and preserve active config intact", function () {
      const activeBefore = prelaunchStore.getConfig();

      // Attempt to set invalid target price (less than start price)
      const res = prelaunchStore.updateConfig({ targetPriceUSD: "0.0001" }, "hacker");
      expect(res.success).to.be.false;
      expect(res.errors.length).to.be.greaterThan(0);

      // Active config must remain unaffected
      const activeAfter = prelaunchStore.getConfig();
      expect(activeAfter.version).to.equal(activeBefore.version);
      expect(activeAfter.targetPriceUSD).to.equal(activeBefore.targetPriceUSD);
    });
  });

  // =========================================================================
  // SCENARIO 16: Daily-Step Update Mode Schedule
  // =========================================================================
  describe("Scenario 16: Daily-Step Update Mode Progression", function () {
    it("Should step price once every 24 hours in DAILY_STEP mode", function () {
      const baseTimeMs = 1700000000000;
      const config = {
        ...INITIAL_PRELAUNCH_CONFIG,
        startTimeUTC: new Date(baseTimeMs).toISOString(),
        startPriceINR: "0.20",
        lockedInrPerUsd: "86.50",
        targetPriceUSD: "0.30",
        durationDays: 30,
        updateMode: "DAILY_STEP"
      };

      // Hour 12 of Day 0: Elapsed = 43200s (< 86400s). In DAILY_STEP mode, progress is 0 days.
      const hour12 = baseTimeMs + 12 * 3600 * 1000;
      const resultH12 = calculatePrelaunchPrice(config, hour12);
      expect(resultH12.progressPercent).to.equal(0);
      expect(resultH12.priceUSD).to.equal(resultH12.startPriceUSD);

      // Exactly Day 1 (86,400s): Progress = 1/30
      const day1 = baseTimeMs + 86400 * 1000;
      const resultDay1 = calculatePrelaunchPrice(config, day1);
      const expectedDay1Pct = (1 / 30) * 100;
      expect(resultDay1.progressPercent).to.be.closeTo(expectedDay1Pct, 0.05);

      // Day 30: Progress = 100% and price equals target
      const day30 = baseTimeMs + 30 * 86400 * 1000;
      const resultDay30 = calculatePrelaunchPrice(config, day30);
      expect(resultDay30.progressPercent).to.equal(100);
      expect(resultDay30.priceUSD.startsWith("0.30000000")).to.be.true;
    });
  });
});

