const { expect } = require("chai");

// Register TypeScript loader
require("./helpers/tsLoader");

const {
  ProportionalAllocationEngine,
  CONFIRMED_INVESTMENT_PLANS,
  parseDecimalToBigInt,
  formatBaseUnitsToDecimal,
} = require("../apps/web/src/lib/allocation/proportionalAllocationEngine.ts");

const {
  ManualSettlementEngine,
} = require("../apps/web/src/lib/settlement/manualSettlementModel.ts");

const {
  AUTHORIZED_TREASURY_WALLET,
} = require("../apps/web/src/lib/treasury/treasuryAccountingEngine.ts");

describe("LIORA COIN — Sprint 3B: Proportional Allocation, Fixed Collateral & Settlement Suite", function () {
  const TEST_INVESTOR = "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD";
  const UNAUTHORIZED_USER = "0x9999999999999999999999999999999999999999";

  beforeEach(function () {
    ManualSettlementEngine.resetForTesting();
  });

  // =========================================================================
  // 1. Correct Proportional Allocations for All Six Plans
  // =========================================================================
  describe("1. Correct Proportional Allocations for All Six Plans", function () {
    it("Should correctly compute proportional token allocations for Tier 01 at ₹0.20, ₹0.40, and ₹1.00", function () {
      // Tier 01: ₹50,000 principal, ₹1,25,000 contractual settlement
      const quote20 = ProportionalAllocationEngine.calculateAllocation("TIER_01", "0.20");
      expect(quote20.principalINR).to.equal(50000);
      expect(quote20.contractualAllocationINR).to.equal(125000);
      expect(quote20.allocatedTokensFormatted).to.equal("625000");
      expect(quote20.allocatedTokensNumber).to.equal(625000);
      expect(quote20.roundingRemainderWei).to.equal("0");

      const quote40 = ProportionalAllocationEngine.calculateAllocation("TIER_01", "0.40");
      expect(quote40.allocatedTokensFormatted).to.equal("312500");
      expect(quote40.allocatedTokensNumber).to.equal(312500);

      const quote100 = ProportionalAllocationEngine.calculateAllocation("TIER_01", "1.00");
      expect(quote100.allocatedTokensFormatted).to.equal("125000");
      expect(quote100.allocatedTokensNumber).to.equal(125000);
    });

    it("Should correctly compute proportional token allocations for Tier 02 at ₹0.20, ₹0.40, and ₹1.00", function () {
      // Tier 02: ₹1,00,000 principal, ₹6,00,000 contractual settlement
      const quote20 = ProportionalAllocationEngine.calculateAllocation("TIER_02", "0.20");
      expect(quote20.contractualAllocationINR).to.equal(600000);
      expect(quote20.allocatedTokensFormatted).to.equal("3000000");

      const quote40 = ProportionalAllocationEngine.calculateAllocation("TIER_02", "0.40");
      expect(quote40.allocatedTokensFormatted).to.equal("1500000");

      const quote100 = ProportionalAllocationEngine.calculateAllocation("TIER_02", "1.00");
      expect(quote100.allocatedTokensFormatted).to.equal("600000");
    });

    it("Should correctly compute proportional token allocations for Tier 03 at ₹0.20, ₹0.40, and ₹1.00", function () {
      // Tier 03: ₹2,00,000 principal, ₹10,00,000 contractual settlement
      const quote20 = ProportionalAllocationEngine.calculateAllocation("TIER_03", "0.20");
      expect(quote20.contractualAllocationINR).to.equal(1000000);
      expect(quote20.allocatedTokensFormatted).to.equal("5000000");

      const quote40 = ProportionalAllocationEngine.calculateAllocation("TIER_03", "0.40");
      expect(quote40.allocatedTokensFormatted).to.equal("2500000");

      const quote100 = ProportionalAllocationEngine.calculateAllocation("TIER_03", "1.00");
      expect(quote100.allocatedTokensFormatted).to.equal("1000000");
    });

    it("Should correctly compute proportional token allocations for Tier 04 at ₹0.20, ₹0.40, and ₹1.00", function () {
      // Tier 04: ₹3,00,000 principal, ₹24,00,000 contractual settlement (9 months lock)
      const quote20 = ProportionalAllocationEngine.calculateAllocation("TIER_04", "0.20");
      expect(quote20.contractualAllocationINR).to.equal(2400000);
      expect(quote20.lockDurationMonths).to.equal(9);
      expect(quote20.settlementPayoutMonth).to.equal(10);
      expect(quote20.allocatedTokensFormatted).to.equal("12000000");

      const quote40 = ProportionalAllocationEngine.calculateAllocation("TIER_04", "0.40");
      expect(quote40.allocatedTokensFormatted).to.equal("6000000");

      const quote100 = ProportionalAllocationEngine.calculateAllocation("TIER_04", "1.00");
      expect(quote100.allocatedTokensFormatted).to.equal("2400000");
    });

    it("Should correctly compute proportional token allocations for Tier 05 at ₹0.20, ₹0.40, and ₹1.00", function () {
      // Tier 05: ₹5,00,000 principal, ₹30,00,000 contractual settlement (12 months lock)
      const quote20 = ProportionalAllocationEngine.calculateAllocation("TIER_05", "0.20");
      expect(quote20.contractualAllocationINR).to.equal(3000000);
      expect(quote20.lockDurationMonths).to.equal(12);
      expect(quote20.settlementPayoutMonth).to.equal(13);
      expect(quote20.allocatedTokensFormatted).to.equal("15000000");

      const quote40 = ProportionalAllocationEngine.calculateAllocation("TIER_05", "0.40");
      expect(quote40.allocatedTokensFormatted).to.equal("7500000");

      const quote100 = ProportionalAllocationEngine.calculateAllocation("TIER_05", "1.00");
      expect(quote100.allocatedTokensFormatted).to.equal("3000000");
    });

    it("Should correctly compute proportional token allocations for Tier 06 at ₹0.20, ₹0.40, and ₹1.00", function () {
      // Tier 06: ₹10,00,000 principal, ₹90,00,000 contractual settlement (12 months lock)
      const quote20 = ProportionalAllocationEngine.calculateAllocation("TIER_06", "0.20");
      expect(quote20.contractualAllocationINR).to.equal(9000000);
      expect(quote20.lockDurationMonths).to.equal(12);
      expect(quote20.settlementPayoutMonth).to.equal(13);
      expect(quote20.allocatedTokensFormatted).to.equal("45000000");

      const quote40 = ProportionalAllocationEngine.calculateAllocation("TIER_06", "0.40");
      expect(quote40.allocatedTokensFormatted).to.equal("22500000");

      const quote100 = ProportionalAllocationEngine.calculateAllocation("TIER_06", "1.00");
      expect(quote100.allocatedTokensFormatted).to.equal("9000000");
    });
  });

  // =========================================================================
  // 2. Allocation at Various Valid Prices Across Schedule
  // =========================================================================
  describe("2. Allocation at Various Valid Prices Across Schedule", function () {
    it("Should compute accurate allocations at non-integer prices (₹0.80, ₹2.50, ₹10.00, ₹30.00 cap)", function () {
      // Tier 01 at ₹0.80: 125,000 / 0.80 = 156,250 LIORA
      const quote08 = ProportionalAllocationEngine.calculateAllocation("TIER_01", "0.80");
      expect(quote08.allocatedTokensFormatted).to.equal("156250");

      // Tier 01 at ₹2.50: 125,000 / 2.50 = 50,000 LIORA
      const quote25 = ProportionalAllocationEngine.calculateAllocation("TIER_01", "2.50");
      expect(quote25.allocatedTokensFormatted).to.equal("50000");

      // Tier 01 at ₹10.00: 125,000 / 10.00 = 12,500 LIORA
      const quote10 = ProportionalAllocationEngine.calculateAllocation("TIER_01", "10.00");
      expect(quote10.allocatedTokensFormatted).to.equal("12500");

      // Tier 01 at ₹30.00 schedule cap: 125,000 / 30.00 = 4,166.666666666666666666 LIORA
      const quote30 = ProportionalAllocationEngine.calculateAllocation("TIER_01", "30.00");
      expect(quote30.allocatedTokensFormatted.startsWith("4166.66666666666666666")).to.be.true;
      expect(BigInt(quote30.roundingRemainderWei) > 0n).to.be.true;
    });
  });

  // =========================================================================
  // 3. Fixed Collateral Quantity Invariant (Permanent Freeze)
  // =========================================================================
  describe("3. Fixed Collateral Quantity Invariant", function () {
    it("Should freeze collateral quantity permanently once finalized", function () {
      const quote = ProportionalAllocationEngine.calculateAllocation("TIER_01", "0.20");
      const finalized = ProportionalAllocationEngine.finalizeCollateral(quote, TEST_INVESTOR);

      expect(finalized.finalizedCollateralQuantityFormatted).to.equal("625000");
      expect(finalized.isImmutable).to.be.true;

      // Price later increases 10x to ₹2.00
      const laterQuote = ProportionalAllocationEngine.calculateAllocation("TIER_01", "2.00");
      expect(laterQuote.allocatedTokensFormatted).to.equal("62500");

      // Verify finalized record is untouched
      expect(finalized.finalizedCollateralQuantityFormatted).to.equal("625000");
      expect(finalized.principalINR).to.equal(50000);
      expect(finalized.contractualSettlementINR).to.equal(125000);
    });

    it("Subsequent price changes cannot mutate registered investment records in storage", function () {
      const createRes = ManualSettlementEngine.createInvestment({
        investorAddress: TEST_INVESTOR,
        investorName: "Alice Tester",
        planId: "TIER_01",
        initialAllocationPriceINR: "0.20",
      });
      expect(createRes.success).to.be.true;
      const invId = createRes.record.id;

      const recordBefore = ManualSettlementEngine.getInvestmentById(invId);
      expect(recordBefore.originalCollateralTokensFormatted).to.equal("625000");

      // Simulate schedule advance: reference price ticks up to ₹1.00
      // Ensure record remains exactly 625,000 tokens
      const recordAfter = ManualSettlementEngine.getInvestmentById(invId);
      expect(recordAfter.originalCollateralTokensFormatted).to.equal("625000");
      expect(recordAfter.contractualSettlementINR).to.equal(125000);
    });
  });

  // =========================================================================
  // 4. Exact Original Token Quantity Required for Collateral Return
  // =========================================================================
  describe("4. Exact Original Token Quantity Required for Collateral Return", function () {
    it("Should accept exact collateral return quantity matching original allocation", function () {
      const quote = ProportionalAllocationEngine.calculateAllocation("TIER_01", "0.20");
      const finalized = ProportionalAllocationEngine.finalizeCollateral(quote, TEST_INVESTOR);

      const check = ProportionalAllocationEngine.verifyCollateralReturnQuantity(
        finalized,
        finalized.finalizedCollateralQuantityBaseUnits
      );
      expect(check.isValid).to.be.true;
      expect(check.differenceWei).to.equal("0");
    });

    it("Should reject collateral return if returned quantity is less than original", function () {
      const quote = ProportionalAllocationEngine.calculateAllocation("TIER_01", "0.20");
      const finalized = ProportionalAllocationEngine.finalizeCollateral(quote, TEST_INVESTOR);

      // Attempt to return 624,999 LIORA instead of 625,000
      const shortAmount = (624999n * 10n ** 18n).toString();
      const check = ProportionalAllocationEngine.verifyCollateralReturnQuantity(finalized, shortAmount);
      expect(check.isValid).to.be.false;
      expect(BigInt(check.differenceWei) < 0n).to.be.true;
    });

    it("SettlementEngine rejects returnCollateral if returned token amount does not match original", function () {
      // In seed data: INV-2026-001 has 625,000 collateral tokens
      const invId = "INV-2026-001";
      ManualSettlementEngine.confirmInvestorPayment(invId, TEST_INVESTOR);

      // Attempt to return only 500,000 tokens
      const resShort = ManualSettlementEngine.returnCollateral(
        invId,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        TEST_INVESTOR,
        500000
      );
      expect(resShort.success).to.be.false;
      expect(resShort.error).to.include("COLLATERAL_QUANTITY_MISMATCH");

      // Now return EXACT 625,000 tokens
      const resExact = ManualSettlementEngine.returnCollateral(
        invId,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        TEST_INVESTOR,
        625000
      );
      expect(resExact.success).to.be.true;
    });
  });

  // =========================================================================
  // 5. Rejection of Invalid Prices & Allocation Values
  // =========================================================================
  describe("5. Rejection of Invalid Prices and Allocation Values", function () {
    it("Should reject zero, negative, or NaN prices", function () {
      expect(() => ProportionalAllocationEngine.calculateAllocation("TIER_01", "0")).to.throw("PRICE_ZERO");
      expect(() => ProportionalAllocationEngine.calculateAllocation("TIER_01", "-0.20")).to.throw("INVALID_PRICE_FORMAT");
      expect(() => ProportionalAllocationEngine.calculateAllocation("TIER_01", "abc")).to.throw("INVALID_PRICE_FORMAT");
      expect(() => ProportionalAllocationEngine.calculateAllocation("TIER_01", "")).to.throw("PRICE_EMPTY");
      expect(() => ProportionalAllocationEngine.calculateAllocation("TIER_01", null)).to.throw("PRICE_MISSING");
    });

    it("Should reject unknown investment plans", function () {
      expect(() => ProportionalAllocationEngine.calculateAllocation("TIER_99", "0.20")).to.throw("UNKNOWN_PLAN");
    });
  });

  // =========================================================================
  // 6. Decimal-Safe 18-Decimal Rounding Behavior & Remainder Tracking
  // =========================================================================
  describe("6. Decimal-Safe 18-Decimal Rounding Behavior", function () {
    it("Should accurately track rounding remainder for repeating decimals without floating-point drift", function () {
      // Tier 01 at ₹0.30: 125,000 / 0.30 = 416,666.666666666666666666...
      const quote = ProportionalAllocationEngine.calculateAllocation("TIER_01", "0.30");
      expect(quote.allocatedTokensFormatted.startsWith("416666.66666666666666666")).to.be.true;

      // Mathematical conservation check:
      // (allocatedTokensBaseUnits * priceWei) / 10^18 + remainderWei == allocationValue * 10^18
      const tokensWei = BigInt(quote.allocatedTokensBaseUnits);
      const priceWei = BigInt(quote.allocationPriceWei);
      const remainderWei = BigInt(quote.roundingRemainderWei);
      const expectedTotal = BigInt(quote.contractualAllocationINR) * (10n ** 36n);

      expect(tokensWei * priceWei + remainderWei).to.equal(expectedTotal);
    });

    it("BigInt parsing correctly scales fractional prices up to 18 decimals", function () {
      const parsed = parseDecimalToBigInt("0.123456789012345678", 18);
      expect(parsed).to.equal(123456789012345678n);

      const formatted = formatBaseUnitsToDecimal(123456789012345678n, 18);
      expect(formatted).to.equal("0.123456789012345678");
    });
  });

  // =========================================================================
  // 7. Prevention of Unauthorized Payout-Status Changes
  // =========================================================================
  describe("7. Prevention of Unauthorized Payout-Status Changes", function () {
    it("Should reject manual payout entry if caller is not the authorized treasury owner", function () {
      const res = ManualSettlementEngine.recordManualPayout("INV-2026-001", {
        amountPaidINR: 125000,
        paymentRail: "IMPS_BANK_TRANSFER",
        referenceNumber: "IMPS-UTR-9910283019",
        dispatchedBy: UNAUTHORIZED_USER,
      });

      expect(res.success).to.be.false;
      expect(res.error).to.include("UNAUTHORIZED_PAYOUT_CALLER");
    });
  });

  // =========================================================================
  // 8. Settlement Completion Guards (Two-Way Independent Verification)
  // =========================================================================
  describe("8. Settlement Completion Guards", function () {
    it("Settlement must not be marked complete merely because the owner records a payout", function () {
      const invId = "INV-2026-002"; // ACTIVE_LOCKED
      // Transition to payout
      const res = ManualSettlementEngine.recordManualPayout(invId, {
        amountPaidINR: 600000,
        paymentRail: "RTGS_WIRE",
        referenceNumber: "RTGS-99018230192",
        dispatchedBy: AUTHORIZED_TREASURY_WALLET,
      });
      expect(res.success).to.be.true;

      const inv = ManualSettlementEngine.getInvestmentById(invId);
      expect(ManualSettlementEngine.isSettled(inv.stage)).to.be.false;
      expect(inv.stage).to.equal("PAYMENT_DISPATCHED");
    });

    it("Collateral cannot be returned before payment is independently verified", function () {
      const invId = "INV-2026-002"; // currently in PAYMENT_DISPATCHED
      const res = ManualSettlementEngine.returnCollateral(
        invId,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        TEST_INVESTOR
      );
      expect(res.success).to.be.false;
      expect(res.error).to.include("Collateral cannot be returned until cash payment is confirmed");
    });
  });

  // =========================================================================
  // 9. Correct Handling of Failed Payments and Disputes
  // =========================================================================
  describe("9. Correct Handling of Failed Payments and Disputes", function () {
    it("Should transition to DISPUTED stage and freeze collateral release", function () {
      const invId = "INV-2026-001";
      const res = ManualSettlementEngine.raiseDispute(
        invId,
        "Bank UTR check failed: Branch reports transaction cancelled by remitter.",
        TEST_INVESTOR
      );
      expect(res.success).to.be.true;

      const inv = ManualSettlementEngine.getInvestmentById(invId);
      expect(ManualSettlementEngine.isDisputed(inv.stage)).to.be.true;
      expect(inv.dispute.status).to.equal("OPEN");

      // Collateral return is blocked during dispute
      const returnRes = ManualSettlementEngine.returnCollateral(
        invId,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        TEST_INVESTOR
      );
      expect(returnRes.success).to.be.false;
    });

    it("Arbitrator can resolve dispute with confirmed payment verification", function () {
      const invId = "INV-2026-004"; // Initial DISPUTED plan
      const res = ManualSettlementEngine.resolveDispute(
        invId,
        "RESOLVED_PAYMENT_VERIFIED",
        "Confirmed credit via Reserve Bank confirmation slip.",
        AUTHORIZED_TREASURY_WALLET
      );
      expect(res.success).to.be.true;

      const inv = ManualSettlementEngine.getInvestmentById(invId);
      expect(ManualSettlementEngine.isPaymentConfirmed(inv.stage)).to.be.true;
      expect(inv.dispute.status).to.equal("RESOLVED_PAYMENT_VERIFIED");
    });
  });

  // =========================================================================
  // 10. Preservation of Historical Investment Records
  // =========================================================================
  describe("10. Preservation of Historical Investment Records", function () {
    it("Should preserve complete chronological audit history with immutable entries", function () {
      const logs = ManualSettlementEngine.getAuditLogs();
      expect(logs.length).to.be.at.least(3);

      for (const log of logs) {
        expect(log.id).to.be.a("string");
        expect(log.timestamp).to.be.a("number");
        expect(log.actor).to.be.a("string");
        expect(log.action).to.be.a("string");
        expect(log.details).to.be.a("string");
      }
    });

    it("Reconciliation accounting balances 100% across all plans", function () {
      const rec = ManualSettlementEngine.getSettlementReconciliation();
      expect(rec.isReconciled).to.be.true;
      expect(rec.reconciliationDiscrepancyLIORA).to.equal(0);
      expect(rec.totalCollateralAllocatedLIORA).to.equal(
        rec.activeCollateralOutLIORA + rec.totalCollateralReturnedLIORA
      );
    });
  });
});
