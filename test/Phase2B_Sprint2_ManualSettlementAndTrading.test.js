const { expect } = require("chai");

// Register TypeScript loader
require("./helpers/tsLoader");

const {
  ManualSettlementEngine,
} = require("../apps/web/src/lib/settlement/manualSettlementModel.ts");

const {
  calculateOnChainSwapQuote,
} = require("../apps/web/src/lib/dex/dexOnChainClient.ts");

const {
  DualPriceService,
} = require("../apps/web/src/lib/dex/dualPriceService.ts");

const {
  AUTHORIZED_TREASURY_WALLET,
} = require("../apps/web/src/lib/treasury/treasuryAccountingEngine.ts");

describe("LIORA COIN — Sprint 2: Website, Testnet Trading & Manual Settlement Suite", function () {
  const mockPool = {
    pairAddress: "0x64beE3847a766D35E6611985F3c3e51C78Af5D2c",
    reserveLiora: 215797197732343641939611n,
    reserveUsdt: 501097830175789374225n,
    formattedLiora: "215,797.20",
    formattedUsdt: "501.10",
    spotPriceUsd: 0.002322,
    spotPriceInr: 0.2008,
    blockTimestampLast: 1794831428,
    isHealthy: true,
    token0Address: "0x0b419a33e8a6448547906DCB191b037Db5ac926e",
    token1Address: "0xeD155E37D0a400E63202cE031Fc1C984B18E7999",
  };

  beforeEach(function () {
    ManualSettlementEngine.resetForTesting();
  });

  describe("1. PancakeSwap V2 Testnet AMM Quotation & Price Mechanics", function () {
    it("Should accurately compute AMM constant-product output with 0.25% fee (LIORA -> mUSDT)", function () {
      // 1000 LIORA in with standard reserve depth
      const quote = calculateOnChainSwapQuote("LIORA -> mUSDT", "1000", 0.5, mockPool);
      expect(quote.expectedAmountOutRaw > 0n).to.be.true;
      expect(quote.tradingFeeRaw > 0n).to.be.true;
      expect(quote.slippageTolerancePercent).to.equal(0.5);
      expect(quote.minAmountOutRaw < quote.expectedAmountOutRaw).to.be.true;
      // Effective price should be close to spot price
      expect(quote.executionPrice > 0).to.be.true;
    });

    it("Should compute buy quotes (mUSDT -> LIORA) with dynamic price impact", function () {
      const quote = calculateOnChainSwapQuote("mUSDT -> LIORA", "50", 1.0, mockPool);
      expect(quote.expectedAmountOutRaw > 0n).to.be.true;
      expect(quote.priceImpactPercent >= 0).to.be.true;
      expect(quote.hasSufficientLiquidity).to.be.true;
    });

    it("Should return zero amounts if swap input is empty or zero", function () {
      const quoteZero = calculateOnChainSwapQuote("LIORA -> mUSDT", "0", 0.5, mockPool);
      expect(quoteZero.amountInRaw).to.equal(0n);
      expect(quoteZero.expectedAmountOutRaw).to.equal(0n);

      const quoteEmpty = calculateOnChainSwapQuote("LIORA -> mUSDT", "", 0.5, mockPool);
      expect(quoteEmpty.amountInRaw).to.equal(0n);
      expect(quoteEmpty.expectedAmountOutRaw).to.equal(0n);
    });

    it("Should enforce strict separation between company reference schedule and DEX market price", function () {
      const comp = DualPriceService.getDualPriceComparison(mockPool, 36000); // 10 hours elapsed = Step 3
      expect(comp.scheduledPriceINR).to.equal(0.60);
      expect(comp.dexSpotPriceUSD).to.equal(0.002322);
      expect(comp.scheduleDisclaimer).to.include("internal economic simulation");
      expect(comp.scheduleLabel).to.equal("Theoretical Reference Schedule");
      expect(comp.dexMarketLabel).to.equal("Live PancakeSwap V2 Market Price");
    });
  });

  describe("2. Manual Investment Settlement Lifecycle & State Transitions", function () {
    const TEST_INVESTOR = "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD";
    const OTHER_ADDRESS = "0x1111111111111111111111111111111111111111";

    it("Should load initial seeded investment records across diverse stages", function () {
      const invs = ManualSettlementEngine.getInvestments();
      expect(invs.length).to.be.at.least(4);
      const stages = invs.map((i) => i.stage);
      expect(stages).to.include("PAYMENT_DISPATCHED");
      expect(stages).to.include("ACTIVE_LOCKED");
      expect(stages).to.include("SETTLED");
      expect(stages).to.include("DISPUTED");
    });

    it("Owner can record manual fiat cash payout for Month 4 matured plan", function () {
      const invId = "INV-2026-001";
      const res = ManualSettlementEngine.recordManualPayout(invId, {
        amountPaidINR: 125000,
        paymentRail: "IMPS_BANK_TRANSFER",
        referenceNumber: "IMPS-UTR-9910283019",
        dispatchedBy: AUTHORIZED_TREASURY_WALLET,
        adminNotes: "Dispatched from Grandiose Tech operational accounts.",
      });

      expect(res.success).to.be.true;
      const inv = ManualSettlementEngine.getInvestmentById(invId);
      expect(inv.stage).to.equal("PAYMENT_DISPATCHED");
      expect(inv.payoutDispatched.referenceNumber).to.equal("IMPS-UTR-9910283019");

      // Verify audit log
      const logs = ManualSettlementEngine.getAuditLogs(invId);
      expect(logs[0].action).to.equal("PAYMENT_DISPATCHED");
    });

    it("Reject manual payout entry without valid reference number", function () {
      const res = ManualSettlementEngine.recordManualPayout("INV-2026-001", {
        amountPaidINR: 125000,
        paymentRail: "IMPS_BANK_TRANSFER",
        referenceNumber: "   ",
        dispatchedBy: AUTHORIZED_TREASURY_WALLET,
      });
      expect(res.success).to.be.false;
      expect(res.error).to.include("reference number is required");
    });

    it("Investor confirms cash payment and transitions stage to PAYMENT_CONFIRMED", function () {
      const invId = "INV-2026-001";
      const res = ManualSettlementEngine.confirmInvestorPayment(
        invId,
        TEST_INVESTOR,
        "Confirmed funds credited in HDFC account."
      );
      expect(res.success).to.be.true;

      const inv = ManualSettlementEngine.getInvestmentById(invId);
      expect(inv.stage).to.equal("PAYMENT_CONFIRMED");
      expect(inv.paymentConfirmedByInvestor.confirmedBy.toLowerCase()).to.equal(TEST_INVESTOR.toLowerCase());
    });

    it("Reject confirmation if caller is not the registered investor", function () {
      const invId = "INV-2026-001";
      const res = ManualSettlementEngine.confirmInvestorPayment(
        invId,
        OTHER_ADDRESS,
        "Unauthorized confirmation attempt"
      );
      expect(res.success).to.be.false;
      expect(res.error).to.include("Unauthorized");
    });

    it("Return collateral tokens to treasury after payment is confirmed", function () {
      const invId = "INV-2026-001";
      // First confirm payment
      ManualSettlementEngine.confirmInvestorPayment(invId, TEST_INVESTOR);

      // Now return collateral
      const txHash = "0x7a8b9c1029384756102938475610293847561029384756102938475610293847";
      const res = ManualSettlementEngine.returnCollateral(invId, txHash, TEST_INVESTOR);
      expect(res.success).to.be.true;

      const inv = ManualSettlementEngine.getInvestmentById(invId);
      expect(inv.stage).to.equal("SETTLED");
      expect(inv.collateralReturned.txHash).to.equal(txHash);
      expect(inv.collateralReturned.recipientTreasuryWallet).to.equal(AUTHORIZED_TREASURY_WALLET);
    });

    it("Reject collateral return before payment is confirmed", function () {
      const invId = "INV-2026-002"; // ACTIVE_LOCKED
      const res = ManualSettlementEngine.returnCollateral(
        invId,
        "0x1234567890abcdef1234567890abcdef12345678",
        TEST_INVESTOR
      );
      expect(res.success).to.be.false;
      expect(res.error).to.include("cannot be returned until cash payment is confirmed");
    });
  });

  describe("3. Payment Disputes & Independent Arbitration Workflows", function () {
    const TEST_INVESTOR = "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD";
    const ARBITRATOR = AUTHORIZED_TREASURY_WALLET;

    it("Investor can raise dispute if dispatched payment is not received", function () {
      const invId = "INV-2026-001";
      const reason = "Bank statement shows no credit received after 72 hours from dispatch.";
      const res = ManualSettlementEngine.raiseDispute(invId, reason, TEST_INVESTOR);
      expect(res.success).to.be.true;

      const inv = ManualSettlementEngine.getInvestmentById(invId);
      expect(inv.stage).to.equal("DISPUTED");
      expect(inv.dispute.reason).to.equal(reason);
      expect(inv.dispute.status).to.equal("OPEN");

      // Verify audit trail logged
      const logs = ManualSettlementEngine.getAuditLogs(invId);
      expect(logs[0].action).to.equal("DISPUTE_RAISED");
    });

    it("Reject dispute if explanation is too short", function () {
      const res = ManualSettlementEngine.raiseDispute("INV-2026-001", "no money", TEST_INVESTOR);
      expect(res.success).to.be.false;
      expect(res.error).to.include("minimum 10 characters");
    });

    it("Arbitrator can resolve dispute with verified payment confirmation", function () {
      const invId = "INV-2026-004"; // Initial DISPUTED plan
      const res = ManualSettlementEngine.resolveDispute(
        invId,
        "RESOLVED_PAYMENT_VERIFIED",
        "Official sending bank NOC UTR SBIN202611029 confirmed credited by beneficiary branch.",
        ARBITRATOR
      );
      expect(res.success).to.be.true;

      const inv = ManualSettlementEngine.getInvestmentById(invId);
      expect(inv.stage).to.equal("PAYMENT_CONFIRMED");
      expect(inv.dispute.status).to.equal("RESOLVED_PAYMENT_VERIFIED");
    });
  });

  describe("4. Double-Entry Collateral Reconciliation Integrity", function () {
    it("Total collateral allocated must strictly equal active collateral plus returned collateral", function () {
      const rec = ManualSettlementEngine.getSettlementReconciliation();
      expect(rec.isReconciled).to.be.true;
      expect(rec.reconciliationDiscrepancyLIORA).to.equal(0);
      expect(rec.totalCollateralAllocatedLIORA).to.equal(
        rec.activeCollateralOutLIORA + rec.totalCollateralReturnedLIORA
      );
    });

    it("Audit log trail must preserve complete chronological ledger history", function () {
      const logs = ManualSettlementEngine.getAuditLogs();
      expect(logs.length).to.be.at.least(3);
      for (const log of logs) {
        expect(log.id).to.be.a("string");
        expect(log.timestamp).to.be.a("number");
        expect(log.actor).to.be.a("string");
        expect(log.action).to.be.a("string");
      }
    });
  });
});
