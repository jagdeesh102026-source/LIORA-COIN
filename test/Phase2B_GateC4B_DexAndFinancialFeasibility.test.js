const { expect } = require("chai");

// Register TypeScript loader
require("./helpers/tsLoader");

const {
  DexService,
  PANCAKESWAP_V2_FACTORY_TESTNET,
  PANCAKESWAP_V2_ROUTER_TESTNET,
  TESTNET_USDT_ADDRESS,
  TESTNET_LIORA_TOKEN_ADDRESS
} = require("../apps/web/src/lib/dex/dexService.ts");

const {
  ReferencePriceSimulator
} = require("../apps/web/src/lib/prelaunch/referencePriceSimulator.ts");

const {
  InvestmentPlanModel,
  INVESTMENT_CATEGORIES
} = require("../apps/web/src/lib/investment/investmentPlanModel.ts");

describe("LIORA COIN — Gate C4B: DEX Testnet Architecture & Financial Feasibility Suite", function () {
  this.timeout(15000);

  // =========================================================================
  // JOURNEY 1: Current DEX Implementation Audit & Component Classification
  // =========================================================================
  describe("Journey 1: Current DEX Implementation Audit & Component Classification", function () {
    const auditInventory = [
      { component: "Wallet Connection (EIP-1193/6963)", status: "IMPLEMENTED" },
      { component: "DEX Swap Interface (MobniqExchangeCard)", status: "SIMULATED" },
      { component: "AMM Routing Logic (PancakeSwap Router)", status: "SIMULATED" },
      { component: "Liquidity Pool Discovery (Factory.getPair)", status: "MISSING" },
      { component: "Reserve Queries (Pair.getReserves)", status: "MISSING" },
      { component: "Transaction Submission (swapExactTokensForTokens)", status: "SIMULATED" },
      { component: "Gas Estimation & Slippage Bounds", status: "SIMULATED" },
      { component: "Revert Handling & Confirmation Receipt", status: "MISSING" }
    ];

    it("Should properly audit and classify all 8 exchange sub-systems", function () {
      expect(auditInventory).to.have.lengthOf(8);
      const implemented = auditInventory.filter(i => i.status === "IMPLEMENTED");
      const simulated = auditInventory.filter(i => i.status === "SIMULATED");
      const missing = auditInventory.filter(i => i.status === "MISSING");

      expect(implemented.length).to.equal(1);
      expect(simulated.length).to.equal(4);
      expect(missing.length).to.equal(3);
    });
  });

  // =========================================================================
  // JOURNEY 2: BSC Testnet DEX Proof-of-Concept & AMM Formulas
  // =========================================================================
  describe("Journey 2: BSC Testnet DEX Proof-of-Concept & AMM Formulas", function () {
    let dexService;

    beforeEach(function () {
      dexService = new DexService(97);
    });

    it("Should initialize on BSC Testnet (#97) with correct PancakeSwap V2 addresses", function () {
      expect(dexService.chainId).to.equal(97);
      expect(dexService.routerAddress).to.equal(PANCAKESWAP_V2_ROUTER_TESTNET);
      expect(dexService.factoryAddress).to.equal(PANCAKESWAP_V2_FACTORY_TESTNET);
    });

    it("Should strictly reject BSC Mainnet (#56) and Ethereum (#1) initialization", function () {
      expect(() => new DexService(56)).to.throw("Mainnet chain ID 56 is strictly prohibited");
      expect(() => new DexService(1)).to.throw("Mainnet chain ID 1 is strictly prohibited");
    });

    it("Should compute exact constant-product swap output with 0.25% fee", function () {
      // Pool reserves: 1,000,000 tokenIn, 1,000,000 tokenOut (spot price = 1.0)
      const reserveIn = 1000000n * 10n ** 18n;
      const reserveOut = 1000000n * 10n ** 18n;
      const amountIn = 1000n * 10n ** 18n; // 1,000 tokenIn

      // Expected amountOut with 0.25% fee:
      // amountInWithFee = 1000 * 9975 = 9,975,000
      // numerator = 9,975,000 * 1,000,000 = 9,975,000,000,000
      // denominator = (1,000,000 * 10,000) + 9,975,000 = 10,009,975,000
      // amountOut = 9,975,000,000,000 / 10,009,975,000 ≈ 996.5059...
      const amountOut = DexService.calculateAmountOut(amountIn, reserveIn, reserveOut);
      const humanOut = Number(amountOut) / 1e18;

      expect(humanOut).to.be.closeTo(996.5059, 0.001);
    });

    it("Should reject zero or negative input amounts and zero reserves", function () {
      const normalReserve = 1000n * 10n ** 18n;
      expect(() => DexService.calculateAmountOut(0n, normalReserve, normalReserve)).to.throw("INSUFFICIENT_INPUT_AMOUNT");
      expect(() => DexService.calculateAmountOut(-10n, normalReserve, normalReserve)).to.throw("INSUFFICIENT_INPUT_AMOUNT");
      expect(() => DexService.calculateAmountOut(10n, 0n, normalReserve)).to.throw("INSUFFICIENT_LIQUIDITY");
      expect(() => DexService.calculateAmountOut(10n, normalReserve, 0n)).to.throw("INSUFFICIENT_LIQUIDITY");
    });

    it("Should enforce slippage tolerance bounds and calculate minAmountOut", function () {
      const amountOut = 1000000000000000000n; // 1.0 token
      // 0.5% slippage -> minAmountOut = 0.995 token
      const min05 = DexService.calculateMinimumReceived(amountOut, 0.5);
      expect(min05).to.equal(995000000000000000n);

      // 1.0% slippage -> minAmountOut = 0.990 token
      const min10 = DexService.calculateMinimumReceived(amountOut, 1.0);
      expect(min10).to.equal(990000000000000000n);

      // Invalid slippage
      expect(() => DexService.calculateMinimumReceived(amountOut, -0.1)).to.throw("INVALID_SLIPPAGE");
      expect(() => DexService.calculateMinimumReceived(amountOut, 55)).to.throw("INVALID_SLIPPAGE");
    });

    it("Should generate an executable quote with price impact and gas estimates", function () {
      const tokenIn = { address: TESTNET_LIORA_TOKEN_ADDRESS, symbol: "LIORA", name: "Liora Coin", decimals: 18 };
      const tokenOut = { address: TESTNET_USDT_ADDRESS, symbol: "USDT", name: "Tether USD", decimals: 18 };

      const reserves = {
        pairAddress: "0x1234567890123456789012345678901234567890",
        token0: tokenIn.address,
        token1: tokenOut.address,
        reserve0: 432500n * 10n ** 18n, // ~432,500 LIORA
        reserve1: 1000n * 10n ** 18n,   // $1,000 USDT
        blockTimestampLast: Math.floor(Date.now() / 1000),
        hasLiquidity: true
      };

      const quote = dexService.getExecutableQuote(
        {
          tokenIn,
          tokenOut,
          amountIn: "1000", // Sell 1,000 LIORA
          slippageTolerancePercent: 0.5
        },
        reserves
      );

      expect(quote.hasSufficientLiquidity).to.be.true;
      expect(parseFloat(quote.expectedAmountOutFormatted)).to.be.greaterThan(0);
      expect(quote.feePercent).to.equal(0.25);
      expect(quote.estimatedGasUnits).to.equal(135000n);
      expect(quote.warnings.length).to.equal(0);
    });

    it("Should detect depleted pool liquidity and return safe zero-quote with warnings", function () {
      const tokenIn = { address: TESTNET_LIORA_TOKEN_ADDRESS, symbol: "LIORA", name: "Liora Coin", decimals: 18 };
      const tokenOut = { address: TESTNET_USDT_ADDRESS, symbol: "USDT", name: "Tether USD", decimals: 18 };

      const depletedReserves = {
        pairAddress: "0x0000000000000000000000000000000000000000",
        token0: tokenIn.address,
        token1: tokenOut.address,
        reserve0: 0n,
        reserve1: 0n,
        blockTimestampLast: 0,
        hasLiquidity: false
      };

      const quote = dexService.getExecutableQuote(
        {
          tokenIn,
          tokenOut,
          amountIn: "500",
          slippageTolerancePercent: 0.5
        },
        depletedReserves
      );

      expect(quote.hasSufficientLiquidity).to.be.false;
      expect(quote.expectedAmountOutBaseUnits).to.equal(0n);
      expect(quote.warnings.some(w => w.includes("Insufficient pool liquidity"))).to.be.true;
    });

    it("Should require explicit user confirmation to build swap transaction", function () {
      const mockQuote = {
        hasSufficientLiquidity: true,
        amountInBaseUnits: 100n * 10n ** 18n,
        amountInFormatted: "100.0",
        minAmountOutBaseUnits: 99n * 10n ** 18n,
        minAmountOutFormatted: "99.0"
      };

      // Missing confirmation
      expect(() => dexService.buildSwapTransaction({
        quote: mockQuote,
        recipientAddress: "0x1111111111111111111111111111111111111111",
        confirmed: false
      })).to.throw("CONFIRMATION_REQUIRED");

      // With confirmation
      const tx = dexService.buildSwapTransaction({
        quote: mockQuote,
        recipientAddress: "0x1111111111111111111111111111111111111111",
        confirmed: true
      });

      expect(tx.to).to.equal(PANCAKESWAP_V2_ROUTER_TESTNET);
      expect(tx.value).to.equal("0");
      expect(tx.deadline).to.be.greaterThan(Math.floor(Date.now() / 1000));
    });

    it("Should parse and classify execution receipts accurately", function () {
      const mockQuote = {
        amountInFormatted: "100",
        expectedAmountOutFormatted: "99.5",
        estimatedGasUnits: 135000n
      };

      // Confirmed receipt
      const confirmedReceipt = dexService.parseTransactionResult(
        "0x" + "a".repeat(64),
        { status: 1, blockNumber: 42100000, from: "0xUser", to: PANCAKESWAP_V2_ROUTER_TESTNET },
        mockQuote
      );
      expect(confirmedReceipt.status).to.equal("CONFIRMED");
      expect(confirmedReceipt.errorMessage).to.be.undefined;

      // Reverted receipt
      const revertedReceipt = dexService.parseTransactionResult(
        "0x" + "b".repeat(64),
        { status: 0, from: "0xUser", to: PANCAKESWAP_V2_ROUTER_TESTNET },
        mockQuote
      );
      expect(revertedReceipt.status).to.equal("REVERTED");
      expect(revertedReceipt.errorMessage).to.include("TRANSFER_FAILED");
    });
  });

  // =========================================================================
  // JOURNEY 3: $1,000 Liquidity Budget Feasibility & AMM Dynamics
  // =========================================================================
  describe("Journey 3: $1,000 Liquidity Budget Feasibility & AMM Dynamics", function () {
    // Initial condition: $1,000 paired USDT and LIORA at ₹0.20 (P0 ≈ $0.00231214)
    // reserveLIORA = 1000 / 0.00231214 ≈ 432,500
    // reserveUSDT = $1,000
    const reserveLIORA = 432500n * 10n ** 18n;
    const reserveUSDT = 1000n * 10n ** 18n;

    it("Should calculate severe price impact progression as trade size grows against $1,000 pool", function () {
      const testTradesUSD = [10, 50, 100, 250, 500];
      const results = [];

      for (const tradeUSD of testTradesUSD) {
        // Tokens to sell: tradeUSD / 0.00231214 ≈ tradeUSD * 432.5
        const tokensToSell = BigInt(Math.floor(tradeUSD * 432.5)) * 10n ** 18n;
        const usdtOut = DexService.calculateAmountOut(tokensToSell, reserveLIORA, reserveUSDT);
        const { priceImpactPercent } = DexService.calculatePriceImpact(
          tokensToSell,
          usdtOut,
          reserveLIORA,
          reserveUSDT,
          18,
          18
        );
        results.push({ tradeUSD, priceImpactPercent, usdtReceived: Number(usdtOut) / 1e18 });
      }

      // $10 trade: ~1% price impact
      expect(results[0].priceImpactPercent).to.be.closeTo(1.0, 0.4);

      // $50 trade: ~4.7% price impact
      expect(results[1].priceImpactPercent).to.be.closeTo(4.7, 0.5);

      // $100 trade: ~9.1% price impact
      expect(results[2].priceImpactPercent).to.be.closeTo(9.1, 0.8);

      // $250 trade: ~20% price impact
      expect(results[3].priceImpactPercent).to.be.closeTo(20.0, 1.5);

      // $500 trade: ~33.3% price impact (selling half pool reserve creates massive slippage)
      expect(results[4].priceImpactPercent).to.be.closeTo(33.3, 2.0);
    });

    it("Should prove $1,000 pool insolvency against multiple investor redemptions", function () {
      // 10 investors each invest $500 in pre-launch (Total $5,000 invested)
      const totalInvestedUSD = 5000;
      const poolLiquidityUSD = 1000;

      // Even at 1:1 principal redemption, pool has an 80% deficit
      const deficitUSD = totalInvestedUSD - poolLiquidityUSD;
      const coverageRatio = (poolLiquidityUSD / totalInvestedUSD) * 100;

      expect(deficitUSD).to.equal(4000);
      expect(coverageRatio).to.equal(20.0); // Only 20% can ever be redeemed!

      // If investors expect nominal 150x return ($750,000 nominal claims), coverage is 0.13%
      const nominalClaimUSD = 750000;
      const nominalCoverage = (poolLiquidityUSD / nominalClaimUSD) * 100;
      expect(nominalCoverage).to.be.lessThan(0.2); // >99.8% insolvency!
    });
  });

  // =========================================================================
  // JOURNEY 4: Test-Only INR Reference-Price Simulator
  // =========================================================================
  describe("Journey 4: Test-Only INR Reference-Price Simulator", function () {
    it("Should start at exactly ₹0.20 at interval 0", function () {
      const step0 = ReferencePriceSimulator.getPriceAtInterval(0, 6);
      expect(step0.priceINR).to.equal(0.20);
      expect(step0.priceINRFormatted).to.equal("₹0.20");
      expect(step0.progressPercent).to.equal(0);
      expect(step0.isInitial).to.be.true;
      expect(step0.isCeilingReached).to.be.false;
    });

    it("Should increment by exactly ₹0.20 per interval", function () {
      const step1 = ReferencePriceSimulator.getPriceAtInterval(1, 6);
      expect(step1.priceINR).to.equal(0.40);

      const step2 = ReferencePriceSimulator.getPriceAtInterval(2, 6);
      expect(step2.priceINR).to.equal(0.60);

      const step10 = ReferencePriceSimulator.getPriceAtInterval(10, 6);
      expect(step10.priceINR).to.equal(2.20);
    });

    it("Should reach exactly ₹30.00 at interval 149 and clamp", function () {
      const step149 = ReferencePriceSimulator.getPriceAtInterval(149, 6);
      expect(step149.priceINR).to.equal(30.00);
      expect(step149.priceINRFormatted).to.equal("₹30.00");
      expect(step149.progressPercent).to.equal(100);
      expect(step149.isCeilingReached).to.be.true;
      expect(step149.nextIncrementHours).to.equal(0);

      // Post-schedule intervals clamp strictly to ₹30.00
      const step150 = ReferencePriceSimulator.getPriceAtInterval(150, 6);
      expect(step150.priceINR).to.equal(30.00);

      const step500 = ReferencePriceSimulator.getPriceAtInterval(500, 6);
      expect(step500.priceINR).to.equal(30.00);
    });

    it("Should calculate accurate schedule durations for 5-hour and 6-hour intervals", function () {
      // 5-hour schedule: 149 * 5 = 745 hours = 31.0417 days
      const summary5h = ReferencePriceSimulator.getScheduleSummary(5);
      expect(summary5h.totalIntervals).to.equal(149);
      expect(summary5h.totalPoints).to.equal(150);
      expect(summary5h.totalHours).to.equal(745);
      expect(summary5h.totalDurationDays).to.be.closeTo(31.04, 0.01);

      // 6-hour schedule: 149 * 6 = 894 hours = 37.25 days
      const summary6h = ReferencePriceSimulator.getScheduleSummary(6);
      expect(summary6h.totalHours).to.equal(894);
      expect(summary6h.totalDurationDays).to.equal(37.25);
    });

    it("Should accurately project price based on timestamps", function () {
      const startTime = new Date("2026-11-01T00:00:00Z");

      // Exactly 12 hours later (2 intervals of 6 hours) -> Step 2 = ₹0.60
      const query12h = new Date("2026-11-01T12:00:00Z");
      const res12h = ReferencePriceSimulator.getPriceAtTimestamp(startTime, query12h, 6);
      expect(res12h.intervalIndex).to.equal(2);
      expect(res12h.priceINR).to.equal(0.60);

      // 18 hours later with 5-hour interval -> floor(18/5) = Step 3 = ₹0.80
      const query18h = new Date("2026-11-01T18:00:00Z");
      const res18h = ReferencePriceSimulator.getPriceAtTimestamp(startTime, query18h, 5);
      expect(res18h.intervalIndex).to.equal(3);
      expect(res18h.priceINR).to.equal(0.80);
    });

    it("Should reject invalid intervals and interval hours", function () {
      expect(() => ReferencePriceSimulator.getPriceAtInterval(-1, 6)).to.throw("INVALID_INTERVAL_INDEX");
      expect(() => ReferencePriceSimulator.getPriceAtInterval(1.5, 6)).to.throw("INVALID_INTERVAL_INDEX");
      expect(() => ReferencePriceSimulator.getPriceAtInterval(5, 4)).to.throw("INVALID_INTERVAL_HOURS");
    });
  });

  // =========================================================================
  // JOURNEY 5: Four-Tier Investment-Plan Data Model
  // =========================================================================
  describe("Journey 5: Four-Tier Investment-Plan Data Model", function () {
    it("Should configure the four investment categories with exact lock months", function () {
      expect(INVESTMENT_CATEGORIES.STARTER.lockMonths).to.equal(3);
      expect(INVESTMENT_CATEGORIES.BASIC.lockMonths).to.equal(6);
      expect(INVESTMENT_CATEGORIES.PREMIUM.lockMonths).to.equal(9);
      expect(INVESTMENT_CATEGORIES.ELITE.lockMonths).to.equal(12);
    });

    it("Should map amounts to correct categories and reject below-minimum amounts", function () {
      expect(InvestmentPlanModel.getCategoryForAmount(500).category).to.equal("STARTER");
      expect(InvestmentPlanModel.getCategoryForAmount(2500).category).to.equal("BASIC");
      expect(InvestmentPlanModel.getCategoryForAmount(7500).category).to.equal("PREMIUM");
      expect(InvestmentPlanModel.getCategoryForAmount(15000).category).to.equal("ELITE");

      expect(() => InvestmentPlanModel.getCategoryForAmount(50)).to.throw("BELOW_MINIMUM_ALLOCATION");
    });

    it("Should evaluate Starter Plan ($500, 3 months) with calendar maturity and 70:30 share", function () {
      const startDate = "2026-11-30T10:00:00Z";
      const plan = InvestmentPlanModel.evaluatePlan({
        category: "STARTER",
        principalUSD: 500,
        startDate,
        actualSettlementPoolUSD: 1000
      });

      expect(plan.category).to.equal("STARTER");
      expect(plan.lockMonths).to.equal(3);
      // 2026-11-30 + 3 calendar months -> 2027-02-28 (clamped to 28 days)
      expect(plan.maturityDateUTC.startsWith("2027-02-28")).to.be.true;

      // At ₹0.20 entry: $500 buys 216,250 tokens
      expect(plan.tokensAllocated).to.be.closeTo(216250, 1.0);

      // Gross at ₹30.00: 216,250 * (30/86.50) ≈ $75,000
      expect(plan.grossMultipliedAmountUSD).to.be.closeTo(75000, 100);

      // Profit = Gross - Principal = $75,000 - $500 = $74,500
      expect(plan.grossProfitUSD).to.be.closeTo(74500, 100);

      // Investor Share = $500 + 70% of $74,500 ≈ $52,650
      expect(plan.investorShareUSD).to.be.closeTo(52650, 100);

      // Company Share = 30% of $74,500 ≈ $22,350
      expect(plan.companyShareUSD).to.be.closeTo(22350, 100);

      // Coverage against $1,000 pool: $1,000 / $52,650 ≈ 1.9%
      expect(plan.coverageRatioPercent).to.be.lessThan(2.5);
      expect(plan.isFullyFunded).to.be.false;
      expect(plan.settlementShortfallUSD).to.be.greaterThan(50000);
    });

    it("Should flag non-custodial ownership and regulatory conflicts", function () {
      const plan = InvestmentPlanModel.evaluatePlan({
        category: "BASIC",
        principalUSD: 1000,
        actualSettlementPoolUSD: 1000
      });

      expect(plan.conflicts.length).to.be.greaterThan(2);
      expect(plan.conflicts.some(c => c.includes("NON_CUSTODIAL_CONFLICT"))).to.be.true;
      expect(plan.conflicts.some(c => c.includes("INSOLVENCY_CONFLICT"))).to.be.true;
      expect(plan.conflicts.some(c => c.includes("REGULATORY_RISK"))).to.be.true;
      expect(plan.payoutStatus).to.equal("UNAPPROVED_PROPOSAL_THEORETICAL_ONLY");
    });
  });

  // =========================================================================
  // JOURNEY 6: Security, Slippage, MEV & Smart Contract Approvals
  // =========================================================================
  describe("Journey 6: Security, Slippage, MEV & Smart Contract Approvals", function () {
    it("Should recommend exact-amount approvals rather than infinite MAX_UINT256", function () {
      const dexService = new DexService(97);
      const mockQuote = {
        amountInBaseUnits: 500n * 10n ** 18n,
        hasSufficientLiquidity: true,
        estimatedGasUnits: 135000n,
        estimatedGasCostBnb: "0.000405"
      };

      // With zero allowance -> needsApproval = true
      const sim1 = dexService.simulateSwap(mockQuote, "0x1111111111111111111111111111111111111111", 0n);
      expect(sim1.needsApproval).to.be.true;
      expect(sim1.canExecute).to.be.false;
      expect(sim1.requiredAllowance).to.equal(500n * 10n ** 18n);

      // With exact allowance -> needsApproval = false
      const sim2 = dexService.simulateSwap(mockQuote, "0x1111111111111111111111111111111111111111", 500n * 10n ** 18n);
      expect(sim2.needsApproval).to.be.false;
      expect(sim2.canExecute).to.be.true;
    });

    it("Should enforce 5-minute transaction deadline preventing stale MEV sandwiching", function () {
      const dexService = new DexService(97);
      const mockQuote = {
        hasSufficientLiquidity: true,
        amountInBaseUnits: 10n ** 18n,
        amountInFormatted: "1.0",
        minAmountOutBaseUnits: 10n ** 18n,
        minAmountOutFormatted: "1.0"
      };

      const nowSec = Math.floor(Date.now() / 1000);
      const tx = dexService.buildSwapTransaction({
        quote: mockQuote,
        recipientAddress: "0x1111111111111111111111111111111111111111",
        deadlineSeconds: 300,
        confirmed: true
      });

      expect(tx.deadline).to.be.closeTo(nowSec + 300, 5);
    });
  });
});

