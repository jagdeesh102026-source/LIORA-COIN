const { expect } = require("chai");
const path = require("path");

require("./helpers/tsLoader");

const { LioraPricingScheduleService } = require("../apps/web/src/lib/pricing/lioraPricingSchedule");
const { GET: getReferencePriceRoute } = require("../apps/web/src/app/api/pricing/reference-price/route");

describe("LIORA — Confirmed Reference Pricing Schedule & Auditability Suite", function () {
  const START_PAISE = 20;      // ₹0.20
  const INCREMENT_PAISE = 20;  // ₹0.20
  const MAX_PAISE = 3000;      // ₹30.00
  const INTERVAL_SECONDS = 18000; // 5 Hours (18,000 seconds)
  const TOTAL_HOURS = 745;     // 149 steps * 5 hours

  // =========================================================================
  // 1. STARTING PRICE & ZERO-TIME INVARIANTS
  // =========================================================================
  describe("1. Initial Reference Price Invariants", function () {
    it("Should start at exactly ₹0.20 (20 paise) at elapsed time = 0", function () {
      const res = LioraPricingScheduleService.calculatePriceForElapsedSeconds(0);
      expect(res.stepIndex).to.equal(0);
      expect(res.pricePaise).to.equal(START_PAISE);
      expect(res.priceINR).to.equal("0.20");
      expect(res.isInitial).to.be.true;
      expect(res.isCeilingReached).to.be.false;
      expect(res.nextStepSeconds).to.equal(INTERVAL_SECONDS);
      expect(res.remainingSecondsToCeiling).to.equal(TOTAL_HOURS * 3600);
    });

    it("Should clamp negative elapsed time to 0 and return starting price ₹0.20", function () {
      const res = LioraPricingScheduleService.calculatePriceForElapsedSeconds(-5000);
      expect(res.stepIndex).to.equal(0);
      expect(res.pricePaise).to.equal(START_PAISE);
      expect(res.priceINR).to.equal("0.20");
    });
  });

  // =========================================================================
  // 2. FIVE-HOUR INCREMENT PROGRESSION
  // =========================================================================
  describe("2. Scheduled Five-Hour Increment Progression", function () {
    it("Should increase by exactly ₹0.20 at every 5-hour boundary", function () {
      // Step 1: 5 Hours (18,000s) -> ₹0.40
      const step1 = LioraPricingScheduleService.calculatePriceForElapsedSeconds(18000);
      expect(step1.stepIndex).to.equal(1);
      expect(step1.pricePaise).to.equal(40);
      expect(step1.priceINR).to.equal("0.40");
      expect(step1.isInitial).to.be.false;

      // Step 2: 10 Hours (36,000s) -> ₹0.60
      const step2 = LioraPricingScheduleService.calculatePriceForElapsedSeconds(36000);
      expect(step2.stepIndex).to.equal(2);
      expect(step2.pricePaise).to.equal(60);
      expect(step2.priceINR).to.equal("0.60");

      // Step 3: 15 Hours (54,000s) -> ₹0.80
      const step3 = LioraPricingScheduleService.calculatePriceForElapsedSeconds(54000);
      expect(step3.stepIndex).to.equal(3);
      expect(step3.pricePaise).to.equal(80);
      expect(step3.priceINR).to.equal("0.80");

      // Step 4: 20 Hours (72,000s) -> ₹1.00
      const step4 = LioraPricingScheduleService.calculatePriceForElapsedSeconds(72000);
      expect(step4.stepIndex).to.equal(4);
      expect(step4.pricePaise).to.equal(100);
      expect(step4.priceINR).to.equal("1.00");
    });

    it("Should maintain the current step price during intermediate periods", function () {
      // 2 Hours into Step 0 (7,200s) -> still ₹0.20
      const at2h = LioraPricingScheduleService.calculatePriceForElapsedSeconds(7200);
      expect(at2h.priceINR).to.equal("0.20");
      expect(at2h.nextStepSeconds).to.equal(18000 - 7200);

      // 4 Hours 59 Min 59 Sec (17,999s) -> still ₹0.20
      const at4h59m = LioraPricingScheduleService.calculatePriceForElapsedSeconds(17999);
      expect(at4h59m.priceINR).to.equal("0.20");
      expect(at4h59m.nextStepSeconds).to.equal(1);

      // 5 Hours 0 Min 1 Sec (18,001s) -> stepped to ₹0.40
      const at5h01s = LioraPricingScheduleService.calculatePriceForElapsedSeconds(18001);
      expect(at5h01s.priceINR).to.equal("0.40");

      // 7 Hours (25,200s) -> still ₹0.40
      const at7h = LioraPricingScheduleService.calculatePriceForElapsedSeconds(25200);
      expect(at7h.priceINR).to.equal("0.40");
      expect(at7h.nextStepSeconds).to.equal(36000 - 25200);
    });
  });

  // =========================================================================
  // 3. MAXIMUM CEILING (₹30.00) AND POST-CAP BEHAVIOR
  // =========================================================================
  describe("3. Maximum Reference Price Ceiling (₹30.00) & Invariants", function () {
    it("Should reach exactly ₹30.00 after 745 hours (149 intervals)", function () {
      const elapsed745Hours = 745 * 3600; // 2,682,000 seconds
      const res = LioraPricingScheduleService.calculatePriceForElapsedSeconds(elapsed745Hours);

      expect(res.stepIndex).to.equal(149);
      expect(res.pricePaise).to.equal(MAX_PAISE);
      expect(res.priceINR).to.equal("30.00");
      expect(res.isCeilingReached).to.be.true;
      expect(res.nextStepSeconds).to.equal(0);
      expect(res.remainingSecondsToCeiling).to.equal(0);
    });

    it("Should strictly enforce ₹30.00 cap for any duration after 745 hours", function () {
      // 750 Hours (5 hours post-cap)
      const at750h = LioraPricingScheduleService.calculatePriceForElapsedSeconds(750 * 3600);
      expect(at750h.pricePaise).to.equal(MAX_PAISE);
      expect(at750h.priceINR).to.equal("30.00");
      expect(at750h.isCeilingReached).to.be.true;

      // 1,000 Hours
      const at1000h = LioraPricingScheduleService.calculatePriceForElapsedSeconds(1000 * 3600);
      expect(at1000h.pricePaise).to.equal(MAX_PAISE);
      expect(at1000h.priceINR).to.equal("30.00");

      // 10,000 Hours (Over a year later)
      const at10000h = LioraPricingScheduleService.calculatePriceForElapsedSeconds(10000 * 3600);
      expect(at10000h.pricePaise).to.equal(MAX_PAISE);
      expect(at10000h.priceINR).to.equal("30.00");
    });
  });

  // =========================================================================
  // 4. PERSISTENT CONFIGURATION & RESTART INTEGRITY
  // =========================================================================
  describe("4. Administrative Configuration & Persistence", function () {
    it("Should allow authorized configuration and persist activation timestamp", async function () {
      const activationDate = new Date("2026-12-01T00:00:00.000Z");
      const status = await LioraPricingScheduleService.configureSchedule({
        activationTimestamp: activationDate,
        isActivated: true,
        configuredBy: "corporate_treasury_admin",
      });

      expect(status.isActivated).to.be.true;
      expect(status.activationTimestamp).to.equal(activationDate.toISOString());

      // Query as of 10 hours after activation
      const queryDate = new Date(activationDate.getTime() + 10 * 3600 * 1000);
      const queriedStatus = await LioraPricingScheduleService.getScheduleStatus(queryDate);
      expect(queriedStatus.elapsedHours).to.equal(10);
      expect(queriedStatus.priceINR).to.equal("0.60"); // 10h = 2 steps = ₹0.60
    });

    it("Should provide mandatory disclaimer on all responses", async function () {
      const status = await LioraPricingScheduleService.getScheduleStatus();
      expect(status.disclaimer).to.include("DISCLAIMER");
      expect(status.disclaimer).to.match(/no guarantee/i);
    });

    it("Should serve reference price via public GET /api/pricing/reference-price", async function () {
      const res = await getReferencePriceRoute();
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data).to.have.property("priceINR");
      expect(data).to.have.property("pricePaise");
      expect(data).to.have.property("disclaimer");
      expect(data.scheduleName).to.equal("CONFIRMED_REFERENCE_SCHEDULE_V1");
    });
  });
});
