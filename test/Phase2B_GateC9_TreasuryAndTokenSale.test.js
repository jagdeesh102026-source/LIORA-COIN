const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

// Register TypeScript loader
require("./helpers/tsLoader");

// Import Gate C9 modules
const {
  treasuryAccounting,
  AUTHORIZED_TREASURY_WALLET,
  TOTAL_SUPPLY_LIORA,
  CLIENT_ALLOCATION_TOTAL_LIORA,
  COMPANY_RESERVE_TOTAL_LIORA,
} = require("../apps/web/src/lib/treasury/treasuryAccountingEngine.ts");

const {
  PrimaryTokenSaleEngine,
} = require("../apps/web/src/lib/sale/primaryTokenSaleEngine.ts");

const {
  LiquidityProvisioningWorkflow,
} = require("../apps/web/src/lib/treasury/liquidityProvisioningWorkflow.ts");

const {
  DualPriceService,
} = require("../apps/web/src/lib/dex/dualPriceService.ts");

describe("LIORA COIN — Gate C9: Primary Token Sale, Treasury Architecture & Liquidity Accounting Suite", function () {
  const mockPool = {
    pairAddress: "0x64beE3847a766D35E6611985F3c3e51C78Af5D2c",
    reserveLiora: 215797197732343641939611n,
    reserveUsdt: 501097830175789374225n,
    totalLpSupply: 10398804890209343669682n,
    ratioLioraPerUsdt: 430.6488,
    ratioUsdtPerLiora: 0.002322,
    spotPriceUsd: 0.002322,
    spotPriceInr: 0.2008,
    isHealthy: true,
    formattedLiora: "215,797.20",
    formattedUsdt: "501.10",
    formattedTotalLpSupply: "10,398.80",
    blockTimestampLast: 1794831428,
    token0Address: "0x0b419a33e8a6448547906DCB191b037Db5ac926e",
    token1Address: "0xeD155E37D0a400E63202cE031Fc1C984B18E7999",
  };

  beforeEach(function () {
    treasuryAccounting.resetForTesting();
  });

  describe("1. Fixed Supply & 70:30 Bucket Separation Invariants", function () {
    it("Should strictly enforce 1,000,000,000 LIORA total supply (10^27 base units)", function () {
      expect(TOTAL_SUPPLY_LIORA).to.equal(1_000_000_000n * 10n ** 18n);
    });

    it("Should allocate exactly 70% (700,000,000 LIORA) to the client allocation bucket", function () {
      expect(CLIENT_ALLOCATION_TOTAL_LIORA).to.equal(700_000_000n * 10n ** 18n);
      const ratio = Number(CLIENT_ALLOCATION_TOTAL_LIORA) / Number(TOTAL_SUPPLY_LIORA);
      expect(ratio).to.equal(0.7);
    });

    it("Should allocate exactly 30% (300,000,000 LIORA) to the company emergency reserve bucket", function () {
      expect(COMPANY_RESERVE_TOTAL_LIORA).to.equal(300_000_000n * 10n ** 18n);
      const ratio = Number(COMPANY_RESERVE_TOTAL_LIORA) / Number(TOTAL_SUPPLY_LIORA);
      expect(ratio).to.equal(0.3);
    });

    it("Should maintain exact double-entry mathematical conservation across all sub-accounts", function () {
      const state = treasuryAccounting.getTreasuryState();
      const sum =
        state.tokensDeliveredToBuyersRaw +
        state.tokensPairedIntoLiquidityRaw +
        state.tokensCommittedForPendingLiquidityRaw +
        state.availableClientAllocationRaw +
        state.companyReserveTotalRaw;

      expect(sum).to.equal(TOTAL_SUPPLY_LIORA);
      expect(state.isReconciled).to.be.true;
    });

    it("Should ensure tokens cannot be counted simultaneously as investor holdings and treasury liquidity reserves", function () {
      // Simulate sale of 1,000 LIORA
      const quote = PrimaryTokenSaleEngine.calculateSaleQuote("100", "FIXED_BASELINE", 0.002322);
      const res = PrimaryTokenSaleEngine.executePurchase(quote, "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD", false);
      expect(res.success).to.be.true;

      const stateAfter = treasuryAccounting.getTreasuryState();
      // Tokens delivered to buyer must be deducted from available client allocation
      expect(stateAfter.tokensDeliveredToBuyersRaw).to.equal(quote.expectedLioraRaw);
      expect(stateAfter.availableClientAllocationRaw).to.equal(
        CLIENT_ALLOCATION_TOTAL_LIORA - (stateAfter.tokensPairedIntoLiquidityRaw + quote.expectedLioraRaw)
      );

      // Re-verify conservation
      const sum =
        stateAfter.tokensDeliveredToBuyersRaw +
        stateAfter.tokensPairedIntoLiquidityRaw +
        stateAfter.tokensCommittedForPendingLiquidityRaw +
        stateAfter.availableClientAllocationRaw +
        stateAfter.companyReserveTotalRaw;
      expect(sum).to.equal(TOTAL_SUPPLY_LIORA);
    });
  });

  describe("2. Primary Token-Sale Quotation & Unapproved Pricing Guards", function () {
    it("Should accurately calculate token delivery for Fixed Baseline price ($0.10 USD / ₹8.65)", function () {
      const quote = PrimaryTokenSaleEngine.calculateSaleQuote("100", "FIXED_BASELINE");
      expect(quote.isValid).to.be.true;
      expect(quote.tokenPriceUSD).to.equal(0.10);
      expect(quote.tokenPriceINR).to.equal(8.65);
      // 100 USDT / 0.10 USD = 1,000 LIORA
      expect(quote.expectedLioraRaw).to.equal(1_000n * 10n ** 18n);
      expect(quote.expectedLioraFormatted).to.equal("1,000");
    });

    it("Should calculate Reference Schedule quotation, flag it with UNAPPROVED warning, and block execution", function () {
      const quote = PrimaryTokenSaleEngine.calculateSaleQuote("100", "REFERENCE_SCHEDULE", 0.002322, 0);
      expect(quote.isValid).to.be.true;
      expect(quote.isExecutable).to.be.false;
      expect(quote.executionDisabledReason).to.include("UNAPPROVED_PRICING_MODEL");
      expect(quote.tokenPriceINR).to.equal(0.20);
      expect(quote.warningNote).to.include("UNAPPROVED PRICING DECISION");
      expect(quote.warningNote).to.include("theoretical simulation and has NOT been approved");

      // Execution attempt must fail
      const result = PrimaryTokenSaleEngine.executePurchase(quote, "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD");
      expect(result.success).to.be.false;
      expect(result.error).to.include("UNAPPROVED_PRICING_MODEL");
    });

    it("Should calculate live PancakeSwap DEX Spot Market quotation", function () {
      const quote = PrimaryTokenSaleEngine.calculateSaleQuote("100", "DEX_SPOT_MARKET", 0.002322);
      expect(quote.isValid).to.be.true;
      expect(quote.tokenPriceUSD).to.equal(0.002322);
      expect(quote.expectedLioraRaw > 40_000n * 10n ** 18n).to.be.true;
    });

    it("Should reject primary sale quotes with zero or negative amounts", function () {
      const quoteZero = PrimaryTokenSaleEngine.calculateSaleQuote("0");
      expect(quoteZero.isValid).to.be.false;
      expect(quoteZero.error).to.include("Enter an investment amount");

      const quoteNeg = PrimaryTokenSaleEngine.calculateSaleQuote("-50");
      expect(quoteNeg.isValid).to.be.false;
    });

    it("Should reject primary sale purchases if requested tokens exceed available client allocation", function () {
      // 800 Million tokens would exceed 700M allocation
      const quoteExcess = PrimaryTokenSaleEngine.calculateSaleQuote("80000000", "FIXED_BASELINE");
      expect(quoteExcess.isValid).to.be.false;
      expect(quoteExcess.error).to.include("exceed available client allocation");
    });
  });

  describe("3. 100% Proceeds Allocation & Liquidity Provisioning Workflow", function () {
    it("Primary sale must allocate 100% of USDT proceeds into pending liquidity", function () {
      const quote = PrimaryTokenSaleEngine.calculateSaleQuote("500", "FIXED_BASELINE");
      const res = PrimaryTokenSaleEngine.executePurchase(quote, "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD");
      expect(res.success).to.be.true;

      const state = treasuryAccounting.getTreasuryState();
      expect(state.totalUsdtProceedsReceivedRaw).to.equal(500n * 10n ** 18n);
      expect(state.usdtPendingLiquidityAllocationRaw).to.equal(500n * 10n ** 18n);
      expect(state.usdtAllocatedToLiquidityRaw).to.equal(500976925920366773363n); // Gate C5 baseline
    });

    it("Pending liquidity must never be labeled as deposited pool liquidity", function () {
      const quote = PrimaryTokenSaleEngine.calculateSaleQuote("250", "FIXED_BASELINE");
      PrimaryTokenSaleEngine.executePurchase(quote, "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD");

      const state = treasuryAccounting.getTreasuryState();
      expect(state.usdtPendingLiquidityAllocationFormatted).to.equal("250.0000");
      // Pending proceeds are held separate and not added to usdtAllocatedToLiquidity
      expect(state.usdtAllocatedToLiquidityFormatted).to.equal("500.9769");
    });

    it("Should plan a liquidity provision batch calculating exact matching LIORA from pool ratio", function () {
      const quote = PrimaryTokenSaleEngine.calculateSaleQuote("500", "FIXED_BASELINE");
      PrimaryTokenSaleEngine.executePurchase(quote, "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD");

      const plan = LiquidityProvisioningWorkflow.planProvisioningBatch(mockPool);
      expect(plan.canExecute).to.be.true;
      expect(plan.usdtToAllocateRaw).to.equal(500n * 10n ** 18n);
      // requiredLiora = (500 * 215797) / 501 = ~215,324 LIORA
      expect(plan.requiredLioraRaw > 215_000n * 10n ** 18n).to.be.true;
      expect(plan.recipientTreasuryWallet).to.equal(AUTHORIZED_TREASURY_WALLET);
    });

    it("Executing a provision batch must credit 100% of Cake-LP tokens to the company treasury", function () {
      const quote = PrimaryTokenSaleEngine.calculateSaleQuote("500", "FIXED_BASELINE");
      PrimaryTokenSaleEngine.executePurchase(quote, "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD");

      const plan = LiquidityProvisioningWorkflow.planProvisioningBatch(mockPool);
      const res = LiquidityProvisioningWorkflow.executeProvisionBatch(plan, true);
      expect(res.success).to.be.true;

      const stateAfter = treasuryAccounting.getTreasuryState();
      // Pending USDT should now be zero (all allocated)
      expect(stateAfter.usdtPendingLiquidityAllocationRaw).to.equal(0n);
      // Treasury LP balance must increase by expected LP minted
      expect(stateAfter.treasuryLpTokensRaw > 10_398n * 10n ** 18n).to.be.true;
    });
  });

  describe("4. Treasury Authority & Automated Double-Entry Reconciliation", function () {
    it("Should verify single company-controlled wallet authority", function () {
      expect(treasuryAccounting.isAuthorizedTreasuryWallet(AUTHORIZED_TREASURY_WALLET)).to.be.true;
      expect(treasuryAccounting.isAuthorizedTreasuryWallet("0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD")).to.be.false;
      expect(treasuryAccounting.isAuthorizedTreasuryWallet(null)).to.be.false;
    });

    it("Should reject liquidity batch execution from unauthorized caller addresses", function () {
      const quote = PrimaryTokenSaleEngine.calculateSaleQuote("200", "FIXED_BASELINE");
      PrimaryTokenSaleEngine.executePurchase(quote, "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD");

      const plan = LiquidityProvisioningWorkflow.planProvisioningBatch(mockPool);
      // Unauthorized caller attempt
      const resUnauthorized = LiquidityProvisioningWorkflow.executeProvisionBatch(
        plan,
        false,
        undefined,
        "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD"
      );
      expect(resUnauthorized.success).to.be.false;
      expect(resUnauthorized.error).to.include("UNAUTHORIZED_TREASURY_WALLET");

      // Authorized caller attempt
      const resAuthorized = LiquidityProvisioningWorkflow.executeProvisionBatch(
        plan,
        false,
        undefined,
        AUTHORIZED_TREASURY_WALLET
      );
      expect(resAuthorized.success).to.be.true;
    });

    it("Should pass all 5 reconciliation integrity checks", function () {
      const rep = treasuryAccounting.performTreasuryReconciliation();
      expect(rep.isValid).to.be.true;
      expect(rep.discrepancyLioraRaw).to.equal(0n);
      expect(rep.discrepancyUsdtRaw).to.equal(0n);
      expect(rep.checks).to.have.lengthOf(5);
      rep.checks.forEach((c) => expect(c.passed).to.be.true);
    });
  });

  describe("5. Decoupled Dual Price Display Service", function () {
    it("Should return independent values for scheduled reference price and DEX spot price", function () {
      const comp = DualPriceService.getDualPriceComparison(null, 18000); // 1 interval = ₹0.40
      expect(comp.scheduledPriceINR).to.equal(0.40);
      expect(comp.scheduledPriceFormattedINR).to.equal("₹0.40");
      expect(comp.dexSpotPriceUSD).to.equal(0.002322);
      expect(comp.scheduleLabel).to.equal("Theoretical Reference Schedule");
      expect(comp.dexMarketLabel).to.equal("Live PancakeSwap V2 Market Price");
      expect(comp.scheduleDisclaimer).to.include("internal economic simulation");
    });
  });

  describe("6. Network Isolation & Security Guardrails", function () {
    it("PrimaryTokenSaleEngine must target BSC Testnet (Chain ID 97)", function () {
      expect(PrimaryTokenSaleEngine.BSC_TESTNET_CHAIN_ID).to.equal(97);
    });

    it("Primary sale must use Mock USDT contract 0x0b419a33e8a6448547906DCB191b037Db5ac926e", function () {
      expect(PrimaryTokenSaleEngine.MOCK_USDT_ADDRESS.toLowerCase()).to.equal(
        "0x0b419a33e8a6448547906DCB191b037Db5ac926e".toLowerCase()
      );
    });

    it("Codebase must not contain hardcoded private keys or seed phrases", function () {
      const engineCode = fs.readFileSync(
        path.join(__dirname, "..", "apps", "web", "src", "lib", "treasury", "treasuryAccountingEngine.ts"),
        "utf8"
      );
      expect(engineCode).to.not.include("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
      expect(engineCode).to.not.include("privateKey");
    });
  });
});
