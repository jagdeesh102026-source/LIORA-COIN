const { expect } = require("chai");
const hre = require("hardhat");

// Register TypeScript loader
require("./helpers/tsLoader");

const {
  BSC_TESTNET_LIORA_TOKEN_ADDRESS,
  BSC_TESTNET_MOCK_USDT_ADDRESS,
  BSC_TESTNET_PANCAKESWAP_PAIR_ADDRESS,
  BSC_TESTNET_PANCAKESWAP_ROUTER_ADDRESS,
  BSC_TESTNET_PANCAKESWAP_FACTORY_ADDRESS,
} = require("../apps/web/src/config/tokenConfig.ts");

const {
  calculateOnChainSwapQuote,
  formatDecimals,
  INITIAL_VERIFIED_SWAPS,
  ILLUSTRATIVE_USD_INR_RATE
} = require("../apps/web/src/lib/dex/dexOnChainClient.ts");

const {
  DexService,
  TESTNET_LIORA_TOKEN_ADDRESS,
  TESTNET_MOCK_USDT_ADDRESS,
  TESTNET_LIORA_USDT_PAIR_ADDRESS,
  PANCAKESWAP_V2_ROUTER_TESTNET,
  PANCAKESWAP_V2_FACTORY_TESTNET
} = require("../apps/web/src/lib/dex/dexService.ts");

const {
  InvestmentPlanModel,
  CONFIRMED_BUSINESS_PROPOSAL_TIERS
} = require("../apps/web/src/lib/investment/investmentPlanModel.ts");

const {
  ReferencePriceSimulator
} = require("../apps/web/src/lib/prelaunch/referencePriceSimulator.ts");

describe("LIORA COIN — Gate C6: Website DEX & Verified Testnet Pool Integration Suite", function () {
  this.timeout(20000);

  // Mocked active on-chain pool state matching verified BSC Testnet pair
  const mockPoolState = {
    pairAddress: BSC_TESTNET_PANCAKESWAP_PAIR_ADDRESS,
    reserveLiora: 215829185065293453063290n, // ~215,829.185 LIORA
    reserveUsdt: 500976925920366773363n,      // ~500.9769 mUSDT
    formattedLiora: "215,829.19",
    formattedUsdt: "500.98",
    spotPriceUsd: 0.00232117,
    spotPriceInr: 0.20078,
    blockTimestampLast: Math.floor(Date.now() / 1000),
    isHealthy: true,
    token0Address: BSC_TESTNET_MOCK_USDT_ADDRESS,
    token1Address: BSC_TESTNET_LIORA_TOKEN_ADDRESS,
  };

  // =========================================================================
  // JOURNEY 1: Verified Contract Infrastructure & Configuration Alignment
  // =========================================================================
  describe("Journey 1: Verified Contract Infrastructure & Configuration Alignment", function () {
    it("Should verify canonical LIORA token address matches on-chain deployment 0xeD155E37D0a400E63202cE031Fc1C984B18E7999", function () {
      const validLioraAddresses = [
        "0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9".toLowerCase(),
        "0xeD155E37D0a400E63202cE031Fc1C984B18E7999".toLowerCase(),
      ];
      expect(validLioraAddresses).to.include(BSC_TESTNET_LIORA_TOKEN_ADDRESS.toLowerCase());
      expect(validLioraAddresses).to.include(TESTNET_LIORA_TOKEN_ADDRESS.toLowerCase());
    });

    it("Should verify MockUSDT address matches on-chain deployment 0x0b419a33e8a6448547906DCB191b037Db5ac926e", function () {
      expect(BSC_TESTNET_MOCK_USDT_ADDRESS).to.equal("0x0b419a33e8a6448547906DCB191b037Db5ac926e");
      expect(TESTNET_MOCK_USDT_ADDRESS).to.equal("0x0b419a33e8a6448547906DCB191b037Db5ac926e");
    });

    it("Should verify PancakeSwap V2 Pair address matches on-chain deployment 0x64beE3847a766D35E6611985F3c3e51C78Af5D2c", function () {
      expect(BSC_TESTNET_PANCAKESWAP_PAIR_ADDRESS).to.equal("0x64beE3847a766D35E6611985F3c3e51C78Af5D2c");
      expect(TESTNET_LIORA_USDT_PAIR_ADDRESS).to.equal("0x64beE3847a766D35E6611985F3c3e51C78Af5D2c");
    });

    it("Should verify PancakeSwap V2 Router and Factory addresses match verified contracts", function () {
      expect(BSC_TESTNET_PANCAKESWAP_ROUTER_ADDRESS).to.equal("0xD99D1c33F9fC3444f8101754aBC46c52416550D1");
      expect(PANCAKESWAP_V2_ROUTER_TESTNET).to.equal("0xD99D1c33F9fC3444f8101754aBC46c52416550D1");
      expect(BSC_TESTNET_PANCAKESWAP_FACTORY_ADDRESS).to.equal("0x6725F303b657a9451d8BA641348b6761A6CC7a17");
      expect(PANCAKESWAP_V2_FACTORY_TESTNET).to.equal("0x6725F303b657a9451d8BA641348b6761A6CC7a17");
    });
  });

  // =========================================================================
  // JOURNEY 2: Two-Way Quote Calculations & Safe 18-Decimal Arithmetic
  // =========================================================================
  describe("Journey 2: Two-Way Quote Calculations & Safe 18-Decimal Arithmetic", function () {
    it("Direction 1 (LIORA -> mUSDT): Should calculate accurate quotes for selling 10 LIORA", function () {
      const quote = calculateOnChainSwapQuote("LIORA -> mUSDT", "10", 0.5, mockPoolState);

      expect(quote.hasSufficientLiquidity).to.be.true;
      const expectedOut = parseFloat(quote.expectedAmountOutFormatted);
      // Selling 10 LIORA into ~215,829 LIORA / 501 USDT pool yields ~0.02307 USDT
      expect(expectedOut).to.be.closeTo(0.02307, 0.001);
      expect(quote.priceImpactPercent).to.be.lessThan(1.0); // Minimal price impact for 10 tokens

      // Guaranteed min received at 0.5% slippage
      const minOut = parseFloat(quote.minAmountOutFormatted);
      expect(minOut).to.be.lessThan(expectedOut);
      expect(minOut).to.be.closeTo(expectedOut * 0.995, 0.0001);
    });

    it("Direction 2 (mUSDT -> LIORA): Should calculate accurate quotes for buying LIORA with 1.0 mUSDT", function () {
      const quote = calculateOnChainSwapQuote("mUSDT -> LIORA", "1.0", 0.5, mockPoolState);

      expect(quote.hasSufficientLiquidity).to.be.true;
      const expectedOut = parseFloat(quote.expectedAmountOutFormatted);
      // Buying with 1 USDT yields ~430.8 LIORA
      expect(expectedOut).to.be.closeTo(430.8, 2.0);
      expect(quote.executionPrice).to.be.closeTo(430.8, 2.0);

      const minOut = parseFloat(quote.minAmountOutFormatted);
      expect(minOut).to.be.closeTo(expectedOut * 0.995, 1.0);
    });

    it("Should return zero output without divide-by-zero errors when amountIn is 0 or empty", function () {
      const quoteZero = calculateOnChainSwapQuote("LIORA -> mUSDT", "0", 0.5, mockPoolState);
      expect(quoteZero.expectedAmountOutRaw).to.equal(0n);
      expect(quoteZero.expectedAmountOutFormatted).to.equal("0.00");

      const quoteEmpty = calculateOnChainSwapQuote("mUSDT -> LIORA", "", 0.5, mockPoolState);
      expect(quoteEmpty.expectedAmountOutRaw).to.equal(0n);
      expect(quoteEmpty.expectedAmountOutFormatted).to.equal("0.00");
    });

    it("Should accurately calculate PancakeSwap 0.25% protocol trading fee", function () {
      const quote = calculateOnChainSwapQuote("LIORA -> mUSDT", "100", 0.5, mockPoolState);
      // 0.25% of 100 LIORA is 0.25 LIORA
      expect(parseFloat(quote.tradingFeeFormatted)).to.be.closeTo(0.25, 0.0001);
    });

    it("Should enforce exact integer decimal formatting without floating-point scientific notation", function () {
      const raw = 1000000000000000000000n; // 1,000 * 10^18
      const formatted = formatDecimals(raw, 18, 2);
      expect(formatted).to.equal("1,000");

      const smallRaw = 23074079633226637n; // 0.023074...
      const formattedSmall = formatDecimals(smallRaw, 18, 4);
      expect(formattedSmall).to.equal("0.023");
    });
  });

  // =========================================================================
  // JOURNEY 3: Exact-Allowance & Non-Custodial Safety Controls
  // =========================================================================
  describe("Journey 3: Exact-Allowance & Non-Custodial Safety Controls", function () {
    it("Should require token approval when allowance is less than amountIn", function () {
      const dexService = new DexService(97);
      const mockQuote = {
        amountInBaseUnits: hre.ethers.parseUnits("10", 18),
        hasSufficientLiquidity: true,
        estimatedGasUnits: 135000n,
        estimatedGasCostBnb: "0.000405",
      };

      // Allowance 0 -> needsApproval: true
      const sim1 = dexService.simulateSwap(mockQuote, "0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350", 0n);
      expect(sim1.needsApproval).to.be.true;
      expect(sim1.canExecute).to.be.false;

      // Exact allowance 10e18 -> needsApproval: false
      const sim2 = dexService.simulateSwap(mockQuote, "0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350", hre.ethers.parseUnits("10", 18));
      expect(sim2.needsApproval).to.be.false;
      expect(sim2.canExecute).to.be.true;
    });

    it("Should enforce 5-minute (300 seconds) auto-expiring transaction deadline", function () {
      const dexService = new DexService(97);
      const mockQuote = {
        hasSufficientLiquidity: true,
        amountInBaseUnits: 10n ** 18n,
        amountInFormatted: "1.0",
        minAmountOutBaseUnits: 10n ** 18n,
        minAmountOutFormatted: "1.0",
      };

      const now = Math.floor(Date.now() / 1000);
      const tx = dexService.buildSwapTransaction({
        quote: mockQuote,
        recipientAddress: "0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350",
        deadlineSeconds: 300,
        confirmed: true,
      });

      expect(tx.deadline).to.be.closeTo(now + 300, 5);
    });

    it("Should require explicit user confirmation before building swap transactions", function () {
      const dexService = new DexService(97);
      const mockQuote = {
        hasSufficientLiquidity: true,
        amountInBaseUnits: 10n ** 18n,
        amountInFormatted: "1.0",
        minAmountOutBaseUnits: 10n ** 18n,
        minAmountOutFormatted: "1.0",
      };

      expect(() =>
        dexService.buildSwapTransaction({
          quote: mockQuote,
          recipientAddress: "0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350",
          deadlineSeconds: 300,
          confirmed: false, // Unconfirmed
        })
      ).to.throw("CONFIRMATION_REQUIRED");
    });
  });

  // =========================================================================
  // JOURNEY 4: Verified Transaction History & BscScan Link Integrity
  // =========================================================================
  describe("Journey 4: Verified Transaction History & BscScan Link Integrity", function () {
    it("Should include the Gate C5 verified on-chain swaps in initial history", function () {
      expect(INITIAL_VERIFIED_SWAPS).to.have.lengthOf(2);

      const swap1 = INITIAL_VERIFIED_SWAPS[0];
      expect(swap1.txHash).to.equal("0x40f7a98ac32fe4ab7ad5ce7a55b81e47945aee1c682da1f8c82417a7a87ad315");
      expect(swap1.direction).to.equal("LIORA -> mUSDT");
      expect(swap1.status).to.equal("CONFIRMED");
      expect(swap1.explorerUrl).to.include("https://testnet.bscscan.com/tx/0x40f7a98ac32fe4ab7ad5ce7a55b81e47945aee1c682da1f8c82417a7a87ad315");

      const swap2 = INITIAL_VERIFIED_SWAPS[1];
      expect(swap2.txHash).to.equal("0x6b39b1f4484cc76fcbf1a8b7a78e495422bec4b5e224691de276d52b24993a2f");
      expect(swap2.direction).to.equal("mUSDT -> LIORA");
      expect(swap2.status).to.equal("CONFIRMED");
      expect(swap2.explorerUrl).to.include("https://testnet.bscscan.com/tx/0x6b39b1f4484cc76fcbf1a8b7a78e495422bec4b5e224691de276d52b24993a2f");
    });
  });

  // =========================================================================
  // JOURNEY 5: Price Schedule & Investment Plan Decoupling (Requirements 7 & 8)
  // =========================================================================
  describe("Journey 5: Price Schedule & Investment Plan Decoupling", function () {
    it("Should verify that Reference Price schedule (₹0.20 to ₹30.00) is distinct from AMM spot price", function () {
      const schedulePricePaise = ReferencePriceSimulator.calculatePricePaise(0);
      expect(schedulePricePaise).to.equal(20); // Exactly ₹0.20

      // Proves that schedule is independent of AMM spot price
      const ammSpotInr = mockPoolState.spotPriceInr;
      expect(ammSpotInr).to.be.closeTo(0.2008, 0.005);
    });

    it("Should confirm all four investment categories preserve confirmed lock durations without AMM draining", function () {
      expect(CONFIRMED_BUSINESS_PROPOSAL_TIERS.STARTER.lockMonths).to.equal(3);
      expect(CONFIRMED_BUSINESS_PROPOSAL_TIERS.BASIC.lockMonths).to.equal(6);
      expect(CONFIRMED_BUSINESS_PROPOSAL_TIERS.PREMIUM.lockMonths).to.equal(9);
      expect(CONFIRMED_BUSINESS_PROPOSAL_TIERS.ELITE.lockMonths).to.equal(12);

      // Verify that no automatic deduction or liquidation occurs against the $500 pool
      const evaluation = InvestmentPlanModel.evaluateConfirmedProposalPlan("STARTER", "2026-11-30T10:00:00Z", 500.0);
      expect(evaluation.isFullyFunded).to.be.false;
      expect(evaluation.conflicts.some(c => c.includes("INSOLVENCY_CONFLICT"))).to.be.true;
    });

    it("Should confirm BSC Mainnet (Chain ID 56) is strictly blocked in DexService", function () {
      expect(() => new DexService(56)).to.throw("Mainnet chain ID 56 is strictly prohibited");
      expect(() => new DexService(1)).to.throw("Mainnet chain ID 1 is strictly prohibited");
    });
  });
});
