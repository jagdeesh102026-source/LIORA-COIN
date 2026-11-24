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
  CONFIRMED_BUSINESS_PROPOSAL_TIERS
} = require("../apps/web/src/lib/investment/investmentPlanModel.ts");

describe("LIORA COIN — Gate C4C: Confirmed Requirements & BSC Testnet DEX Integration Suite", function () {
  this.timeout(15000);

  // =========================================================================
  // JOURNEY 1: Confirmed Reference-Price Formula & Integer Paise Arithmetic
  // =========================================================================
  describe("Journey 1: Confirmed Reference-Price Formula & Integer Paise Arithmetic", function () {
    it("Should start at exactly 20 paise (₹0.20) at elapsed = 0 seconds", function () {
      const paise = ReferencePriceSimulator.calculatePricePaise(0);
      expect(paise).to.equal(20);
    });

    it("Should prevent negative elapsed time and clamp to 20 paise (₹0.20)", function () {
      const negativeElapsed = -3600;
      const paise = ReferencePriceSimulator.calculatePricePaise(negativeElapsed);
      expect(paise).to.equal(20);
    });

    it("Should remain at 20 paise just before 5 hours (elapsed = 17,999 seconds)", function () {
      const paise = ReferencePriceSimulator.calculatePricePaise(17999);
      expect(paise).to.equal(20);
    });

    it("Should increment to exactly 40 paise (₹0.40) at exactly 5 hours (18,000 seconds)", function () {
      const paise = ReferencePriceSimulator.calculatePricePaise(18000);
      expect(paise).to.equal(40);
    });

    it("Should increment to exactly 60 paise (₹0.60) at 10 hours (36,000 seconds)", function () {
      const paise = ReferencePriceSimulator.calculatePricePaise(36000);
      expect(paise).to.equal(60);
    });

    it("Should reach halfway milestone of 1,500 paise (₹15.00) at 74 intervals", function () {
      // 74 intervals * 18,000 seconds = 1,332,000 seconds (370 hours)
      // 20 + 20 * 74 = 20 + 1480 = 1,500 paise = ₹15.00
      const elapsed = 74 * 18000;
      const paise = ReferencePriceSimulator.calculatePricePaise(elapsed);
      expect(paise).to.equal(1500);
    });

    it("Should reach exactly 3,000 paise (₹30.00) at interval 149 (745 hours / 31 days 1 hour)", function () {
      // 149 intervals * 18,000 seconds = 2,682,000 seconds = 745 hours
      const elapsed = 149 * 18000;
      const paise = ReferencePriceSimulator.calculatePricePaise(elapsed);
      expect(paise).to.equal(3000);
      expect(elapsed / 3600).to.equal(745);
    });

    it("Should strictly clamp at 3,000 paise (₹30.00) for all elapsed times past 745 hours", function () {
      // 150 intervals, 200 intervals, 1000 intervals
      expect(ReferencePriceSimulator.calculatePricePaise(150 * 18000)).to.equal(3000);
      expect(ReferencePriceSimulator.calculatePricePaise(500 * 18000)).to.equal(3000);
      expect(ReferencePriceSimulator.calculatePricePaise(100000000)).to.equal(3000);
    });

    it("Should verify schedule summary matches confirmed 5-hour parameters exactly", function () {
      const summary = ReferencePriceSimulator.getScheduleSummary(5);
      expect(summary.startPriceINR).to.equal(0.20);
      expect(summary.incrementINR).to.equal(0.20);
      expect(summary.maxPriceINR).to.equal(30.00);
      expect(summary.totalIntervals).to.equal(149);
      expect(summary.totalPoints).to.equal(150);
      expect(summary.intervalHours).to.equal(5);
      expect(summary.totalHours).to.equal(745);
      expect(summary.totalDurationDays).to.be.closeTo(31.04, 0.01);
      expect(summary.growthMultiplier).to.equal(150);
    });
  });

  // =========================================================================
  // JOURNEY 2: Confirmed Investment Plans — Contractual 50:50 Multiplication
  // =========================================================================
  describe("Journey 2: Confirmed Investment Plans — Contractual 50:50 Multiplication", function () {
    it("Should define the four confirmed tiers with exact INR amounts and multiplier factors", function () {
      const starter = CONFIRMED_BUSINESS_PROPOSAL_TIERS.STARTER;
      expect(starter.principalINR).to.equal(50000);
      expect(starter.multiplierFactor).to.equal(5);
      expect(starter.lockMonths).to.equal(3);
      expect(starter.grossMultipliedAmountINR).to.equal(250000);
      expect(starter.investorShareINR).to.equal(125000);
      expect(starter.companyShareINR).to.equal(125000);

      const basic = CONFIRMED_BUSINESS_PROPOSAL_TIERS.BASIC;
      expect(basic.principalINR).to.equal(100000);
      expect(basic.multiplierFactor).to.equal(10);
      expect(basic.lockMonths).to.equal(6);
      expect(basic.grossMultipliedAmountINR).to.equal(1000000);
      expect(basic.investorShareINR).to.equal(500000);
      expect(basic.companyShareINR).to.equal(500000);

      const premium = CONFIRMED_BUSINESS_PROPOSAL_TIERS.PREMIUM;
      expect(premium.principalINR).to.equal(200000);
      expect(premium.multiplierFactor).to.equal(20);
      expect(premium.lockMonths).to.equal(9);
      expect(premium.grossMultipliedAmountINR).to.equal(4000000);
      expect(premium.investorShareINR).to.equal(2000000);
      expect(premium.companyShareINR).to.equal(2000000);

      const elite = CONFIRMED_BUSINESS_PROPOSAL_TIERS.ELITE;
      expect(elite.principalINR).to.equal(300000);
      expect(elite.multiplierFactor).to.equal(30);
      expect(elite.lockMonths).to.equal(12);
      expect(elite.grossMultipliedAmountINR).to.equal(9000000);
      expect(elite.investorShareINR).to.equal(4500000);
      expect(elite.companyShareINR).to.equal(4500000);
    });

    it("Should evaluate Starter Plan ($500 pool reserve) and demonstrate 65.4% liquidity shortfall", function () {
      const res = InvestmentPlanModel.evaluateConfirmedProposalPlan("STARTER", "2026-11-30T10:00:00Z", 500.0);

      expect(res.principalINR).to.equal(50000);
      expect(res.grossMultipliedAmountINR).to.equal(250000);
      expect(res.investorShareINR).to.equal(125000);
      expect(res.companyShareINR).to.equal(125000);

      // In USD at 86.50:
      // ₹125,000 / 86.50 = $1,445.09 USD
      expect(res.investorShareUSD).to.be.closeTo(1445.09, 0.5);

      // Available paired reserve is $500:
      // Coverage = 500 / 1445.09 = 34.6%
      expect(res.coverageRatioPercent).to.be.closeTo(34.6, 0.5);
      expect(res.isFullyFunded).to.be.false;
      expect(res.settlementShortfallUSD).to.be.closeTo(945.09, 0.5);

      // Contractual disclaimers
      expect(res.payoutStatus).to.equal("UNAPPROVED_PROPOSAL_THEORETICAL_ONLY");
      expect(res.conflicts.some(c => c.includes("INSOLVENCY_CONFLICT"))).to.be.true;
      expect(res.conflicts.some(c => c.includes("NON_CUSTODIAL_CONFLICT"))).to.be.true;
    });

    it("Should evaluate Elite Plan and prove 99% liquidity shortfall against $500 paired reserve", function () {
      const res = InvestmentPlanModel.evaluateConfirmedProposalPlan("ELITE", "2026-11-30T10:00:00Z", 500.0);

      expect(res.principalINR).to.equal(300000);
      expect(res.grossMultipliedAmountINR).to.equal(9000000); // ₹90 Lakhs
      expect(res.investorShareINR).to.equal(4500000); // ₹45 Lakhs

      // ₹45 Lakhs at 86.50 = $52,023.12 USD
      expect(res.investorShareUSD).to.be.closeTo(52023.12, 1.0);

      // Coverage against $500 pool = 500 / 52,023.12 ≈ 0.96%
      expect(res.coverageRatioPercent).to.be.lessThan(1.0);
      expect(res.settlementShortfallUSD).to.be.greaterThan(51000);
    });
  });

  // =========================================================================
  // JOURNEY 3: $1,000 Total Pool Liquidity Stress Testing ($500 + $500)
  // =========================================================================
  describe("Journey 3: $1,000 Total Pool Liquidity Stress Testing ($500 + $500)", function () {
    let stressTestResult;

    before(function () {
      stressTestResult = DexService.runLiquidityStressTest(
        1000, // $1,000 Total Pool
        0.00231214, // ₹0.20 at 86.50
        [10, 25, 50, 100, 250, 500],
        [10, 25, 50, 80]
      );
    });

    it("Should confirm pool allocation is exactly $500 paired asset + $500 token", function () {
      expect(stressTestResult.totalPoolValueUSD).to.equal(1000);
      expect(stressTestResult.pairedReserveUSD).to.equal(500);
      expect(stressTestResult.tokenReserveUSD).to.equal(500);
    });

    it("Should calculate severe price impact progression across trade sizes", function () {
      const table = stressTestResult.tradeStressTable;
      expect(table).to.have.lengthOf(6);

      // $10 trade: ~1.96% impact (Low)
      expect(table[0].tradeSizeUSD).to.equal(10);
      expect(table[0].priceImpactPercent).to.be.closeTo(1.96, 0.4);
      expect(table[0].severity).to.equal("LOW");

      // $25 trade: ~4.76% impact (Moderate)
      expect(table[1].tradeSizeUSD).to.equal(25);
      expect(table[1].priceImpactPercent).to.be.closeTo(4.76, 0.5);
      expect(table[1].severity).to.equal("MODERATE");

      // $50 trade: ~9.09% impact (Moderate/Severe)
      expect(table[2].tradeSizeUSD).to.equal(50);
      expect(table[2].priceImpactPercent).to.be.closeTo(9.09, 0.8);

      // $100 trade: ~16.67% impact (Severe)
      expect(table[3].tradeSizeUSD).to.equal(100);
      expect(table[3].priceImpactPercent).to.be.closeTo(16.67, 1.2);
      expect(table[3].severity).to.equal("SEVERE");

      // $250 trade: ~33.33% impact (Critical)
      expect(table[4].tradeSizeUSD).to.equal(250);
      expect(table[4].priceImpactPercent).to.be.closeTo(33.33, 2.0);
      expect(table[4].severity).to.equal("CRITICAL");

      // $500 trade: ~50.00% impact (Catastrophic: extracts half the USDT reserve)
      expect(table[5].tradeSizeUSD).to.equal(500);
      expect(table[5].priceImpactPercent).to.be.closeTo(50.00, 2.5);
      expect(table[5].severity).to.equal("CRITICAL");
    });

    it("Should model dramatic price impact degradation when liquidity is removed", function () {
      const remTable = stressTestResult.removalStressTable;
      expect(remTable).to.have.lengthOf(4);

      // 10% removed ($450 remaining): impact on $50 trade is ~10.0%
      expect(remTable[0].remainingPairedUSD).to.equal(450);
      expect(remTable[0].priceImpactOn50DollarTrade).to.be.closeTo(10.0, 1.0);

      // 50% removed ($250 remaining): impact on $50 trade rises to ~16.7%
      expect(remTable[2].remainingPairedUSD).to.equal(250);
      expect(remTable[2].priceImpactOn50DollarTrade).to.be.closeTo(16.7, 1.5);

      // 80% removed ($100 remaining): impact on $50 trade rises to ~33.3%
      expect(remTable[3].remainingPairedUSD).to.equal(100);
      expect(remTable[3].priceImpactOn50DollarTrade).to.be.closeTo(33.3, 2.5);
      expect(remTable[3].isPoolVulnerableToSandwich).to.be.true;
    });

    it("Should calculate micro arbitrage/manipulation thresholds", function () {
      const thresh = stressTestResult.arbitrageManipulationThresholds;
      // Moving price by 5% takes only ~$12.35
      expect(thresh.costToMovePrice5PercentUSD).to.be.closeTo(12.35, 1.0);
      // Moving price by 10% takes only ~$24.40
      expect(thresh.costToMovePrice10PercentUSD).to.be.closeTo(24.40, 1.5);
      // Moving price by 25% takes only ~$59.00
      expect(thresh.costToMovePrice25PercentUSD).to.be.closeTo(59.00, 3.0);
      // Moving price by 50% takes only ~$112.37
      expect(thresh.costToMovePrice50PercentUSD).to.be.closeTo(112.37, 5.0);
    });

    it("Should prove principal redemption insolvency for 10 investors", function () {
      const red = stressTestResult.redemptionFeasibility;
      expect(red.investorCountTested).to.equal(10);
      expect(red.totalPrincipalUSD).to.equal(5000);
      expect(red.availablePairedReserveUSD).to.equal(500);
      expect(red.principalDeficitUSD).to.equal(4500);
      expect(red.principalCoverageRatioPercent).to.equal(10.0);
      expect(red.isSolventForPrincipal).to.be.false;
    });
  });

  // =========================================================================
  // JOURNEY 4: DEX Testnet Liquidity Addition & Removal Calculations
  // =========================================================================
  describe("Journey 4: DEX Testnet Liquidity Addition & Removal Calculations", function () {
    const tokenA = { address: TESTNET_LIORA_TOKEN_ADDRESS, symbol: "LIORA", name: "Liora Coin", decimals: 18 };
    const tokenB = { address: TESTNET_USDT_ADDRESS, symbol: "USDT", name: "Tether USD", decimals: 18 };

    it("Should calculate initial pool creation parameters and lock 1,000 minimum LP units", function () {
      const amountA = 216250n * 10n ** 18n; // 216,250 LIORA ($500)
      const amountB = 500n * 10n ** 18n;    // 500 USDT ($500)

      const quote = DexService.calculateLiquidityProvision(
        tokenA,
        tokenB,
        amountA,
        amountB,
        0n, // empty reserve
        0n, // empty reserve
        0n, // zero total supply
        0.5 // 0.5% slippage
      );

      expect(quote.expectedLpTokens).to.be.greaterThan(0n);
      expect(quote.poolSharePercent).to.equal(100);
      expect(quote.amountAMin).to.equal((amountA * 9950n) / 10000n);
      expect(quote.amountBMin).to.equal((amountB * 9950n) / 10000n);
      expect(quote.deadline).to.be.greaterThan(Math.floor(Date.now() / 1000));
    });

    it("Should calculate subsequent liquidity addition maintaining optimal ratio", function () {
      const reserveA = 216250n * 10n ** 18n;
      const reserveB = 500n * 10n ** 18n;
      const totalLp = 10000n * 10n ** 18n;

      // Add $50 of LIORA (21,625 LIORA) and up to $100 USDT desired
      const addA = 21625n * 10n ** 18n;
      const maxB = 100n * 10n ** 18n;

      const quote = DexService.calculateLiquidityProvision(
        tokenA,
        tokenB,
        addA,
        maxB,
        reserveA,
        reserveB,
        totalLp,
        0.5
      );

      // Optimal B should be exactly 50 USDT (since addA is 10% of reserveA)
      expect(quote.amountBDesired).to.equal(50n * 10n ** 18n);
      // Expected LP should be 1,000 LP tokens (10% of existing 10,000)
      expect(quote.expectedLpTokens).to.equal(1000n * 10n ** 18n);
      // New pool share: 1,000 / 11,000 ≈ 9.09%
      expect(quote.poolSharePercent).to.be.closeTo(9.09, 0.05);
    });

    it("Should calculate exact liquidity removal returning proportional reserves", function () {
      const reserveA = 200000n * 10n ** 18n;
      const reserveB = 500n * 10n ** 18n;
      const totalLp = 10000n * 10n ** 18n;

      // Remove 5,000 LP tokens (50% of the pool)
      const lpToRemove = 5000n * 10n ** 18n;

      const remQuote = DexService.calculateLiquidityRemoval(
        lpToRemove,
        totalLp,
        reserveA,
        reserveB,
        0.5
      );

      expect(remQuote.poolShareRemovedPercent).to.equal(50.0);
      expect(remQuote.expectedAmountA).to.equal(100000n * 10n ** 18n); // 50% of 200,000
      expect(remQuote.expectedAmountB).to.equal(250n * 10n ** 18n);    // 50% of 500
      expect(remQuote.amountAMin).to.equal((100000n * 10n ** 18n * 9950n) / 10000n);
      expect(remQuote.amountBMin).to.equal((250n * 10n ** 18n * 9950n) / 10000n);
    });

    it("Should reject liquidity operations with invalid zero or excessive amounts", function () {
      expect(() => DexService.calculateLiquidityProvision(tokenA, tokenB, 0n, 100n, 100n, 100n, 100n)).to.throw(
        "INSUFFICIENT_DESIRED_AMOUNTS"
      );
      expect(() => DexService.calculateLiquidityRemoval(0n, 100n, 100n, 100n)).to.throw("INSUFFICIENT_LP_AMOUNT");
      expect(() => DexService.calculateLiquidityRemoval(200n, 100n, 100n, 100n)).to.throw("INVALID_TOTAL_SUPPLY");
    });
  });

  // =========================================================================
  // JOURNEY 5: Testnet Security, Reverts, Allowance & Explorer Links
  // =========================================================================
  describe("Journey 5: Testnet Security, Reverts, Allowance & Explorer Links", function () {
    let dexService;

    beforeEach(function () {
      dexService = new DexService(97);
    });

    it("Should generate valid BscScan testnet explorer URLs", function () {
      const txHash = "0x" + "c".repeat(64);
      const receipt = dexService.parseTransactionResult(
        txHash,
        { status: 1, blockNumber: 42100100, from: "0xUser", to: PANCAKESWAP_V2_ROUTER_TESTNET },
        { amountInFormatted: "100", expectedAmountOutFormatted: "50", estimatedGasUnits: 135000n }
      );

      expect(receipt.explorerUrl).to.equal(`https://testnet.bscscan.com/tx/${txHash}`);
    });

    it("Should decode standard AMM revert errors into descriptive diagnostics", function () {
      expect(DexService.decodeSwapError(new Error("Pancake: K"))).to.include("SWAP_FAILED_TRANSFER");
      expect(DexService.decodeSwapError(new Error("PancakeRouter: EXPIRED"))).to.include("SWAP_FAILED_EXPIRED");
      expect(DexService.decodeSwapError(new Error("PancakeRouter: INSUFFICIENT_OUTPUT_AMOUNT"))).to.include(
        "SWAP_FAILED_SLIPPAGE"
      );
      expect(DexService.decodeSwapError(new Error("Pancake: INSUFFICIENT_ALLOWANCE"))).to.include(
        "SWAP_FAILED_ALLOWANCE"
      );
      expect(DexService.decodeSwapError(new Error("User rejected transaction"))).to.include("SWAP_USER_REJECTED");
    });

    it("Should strictly enforce testnet network isolation against Mainnet (Chain ID 56)", function () {
      expect(() => new DexService(56)).to.throw("Mainnet chain ID 56 is strictly prohibited");
      expect(() => new DexService(1)).to.throw("Mainnet chain ID 1 is strictly prohibited");
      expect(() => new DexService(137)).to.throw("Unsupported network chain ID 137");
    });

    it("Should verify exact allowance approval recommendation over infinite MAX_UINT256", function () {
      const mockQuote = {
        amountInBaseUnits: 1000n * 10n ** 18n,
        hasSufficientLiquidity: true,
        estimatedGasUnits: 135000n,
        estimatedGasCostBnb: "0.000405"
      };

      // Below allowance
      const simBelow = dexService.simulateSwap(mockQuote, "0x1111111111111111111111111111111111111111", 500n * 10n ** 18n);
      expect(simBelow.needsApproval).to.be.true;
      expect(simBelow.canExecute).to.be.false;

      // Exact allowance
      const simExact = dexService.simulateSwap(mockQuote, "0x1111111111111111111111111111111111111111", 1000n * 10n ** 18n);
      expect(simExact.needsApproval).to.be.false;
      expect(simExact.canExecute).to.be.true;
    });
  });
});

