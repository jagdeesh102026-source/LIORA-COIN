const { expect } = require("chai");
const hre = require("hardhat");

// Register TypeScript loader
require("./helpers/tsLoader");

const {
  DexService,
  PANCAKESWAP_V2_FACTORY_TESTNET,
  PANCAKESWAP_V2_ROUTER_TESTNET
} = require("../apps/web/src/lib/dex/dexService.ts");

const {
  ReferencePriceSimulator
} = require("../apps/web/src/lib/prelaunch/referencePriceSimulator.ts");

const {
  InvestmentPlanModel,
  CONFIRMED_BUSINESS_PROPOSAL_TIERS
} = require("../apps/web/src/lib/investment/investmentPlanModel.ts");

describe("LIORA COIN — Gate C5: LIORA/USDT Liquidity Sandbox & End-to-End DEX Suite", function () {
  this.timeout(20000);

  let deployer, trader1, trader2;
  let lioraToken, mockUsdt;
  let dexService;

  beforeEach(async function () {
    [deployer, trader1, trader2] = await hre.ethers.getSigners();

    // 1. Deploy LioraToken (Canonical LIORA COIN metadata)
    const LioraTokenFactory = await hre.ethers.getContractFactory("LioraToken");
    lioraToken = await LioraTokenFactory.deploy(deployer.address);
    await lioraToken.waitForDeployment();

    // 2. Deploy MockUSDT (Clearly labeled testnet sandbox asset)
    const MockUsdtFactory = await hre.ethers.getContractFactory("MockUSDT");
    mockUsdt = await MockUsdtFactory.deploy(deployer.address);
    await mockUsdt.waitForDeployment();

    dexService = new DexService(97);
  });

  // =========================================================================
  // JOURNEY 1: Token Identity & Canonical Contract Invariants
  // =========================================================================
  describe("Journey 1: Token Identity & Canonical Contract Invariants", function () {
    it("Should deploy LioraToken with correct name, symbol, decimals and 1 Billion supply", async function () {
      expect(await lioraToken.name()).to.equal("LIORA COIN");
      expect(await lioraToken.symbol()).to.equal("LIORA");
      expect(await lioraToken.decimals()).to.equal(18);

      const expectedSupply = hre.ethers.parseUnits("1000000000", 18);
      expect(await lioraToken.totalSupply()).to.equal(expectedSupply);
      expect(await lioraToken.balanceOf(deployer.address)).to.equal(expectedSupply);
    });

    it("Should enforce zero fees-on-transfer (exact conservation across transfers)", async function () {
      const transferAmount = hre.ethers.parseUnits("50000", 18);
      await lioraToken.transfer(trader1.address, transferAmount);

      expect(await lioraToken.balanceOf(trader1.address)).to.equal(transferAmount);

      // Trader1 transfers 20,000 to Trader2
      const subAmount = hre.ethers.parseUnits("20000", 18);
      await lioraToken.connect(trader1).transfer(trader2.address, subAmount);

      expect(await lioraToken.balanceOf(trader2.address)).to.equal(subAmount);
      expect(await lioraToken.balanceOf(trader1.address)).to.equal(transferAmount - subAmount);
    });

    it("Should allow token burning to reduce total supply permanently", async function () {
      const burnAmount = hre.ethers.parseUnits("100000", 18);
      const supplyBefore = await lioraToken.totalSupply();

      await lioraToken.burn(burnAmount);

      const supplyAfter = await lioraToken.totalSupply();
      expect(supplyAfter).to.equal(supplyBefore - burnAmount);
    });

    it("Should enforce Pausable circuit breaker restricting transfers when paused", async function () {
      await lioraToken.pause();
      expect(await lioraToken.paused()).to.be.true;

      await expect(
        lioraToken.transfer(trader1.address, hre.ethers.parseUnits("100", 18))
      ).to.be.revertedWithCustomError(lioraToken, "EnforcedPause");

      await lioraToken.unpause();
      expect(await lioraToken.paused()).to.be.false;

      // Transfer succeeds when unpaused
      await lioraToken.transfer(trader1.address, hre.ethers.parseUnits("100", 18));
      expect(await lioraToken.balanceOf(trader1.address)).to.equal(hre.ethers.parseUnits("100", 18));
    });

    it("Should enforce two-step ownership transfer (Ownable2Step)", async function () {
      await lioraToken.transferOwnership(trader1.address);
      expect(await lioraToken.owner()).to.equal(deployer.address);
      expect(await lioraToken.pendingOwner()).to.equal(trader1.address);

      await lioraToken.connect(trader1).acceptOwnership();
      expect(await lioraToken.owner()).to.equal(trader1.address);
    });
  });

  // =========================================================================
  // JOURNEY 2: Testnet USDT Verification & Mock USDT Properties
  // =========================================================================
  describe("Journey 2: Testnet USDT Verification & Mock USDT Properties", function () {
    it("Should deploy MockUSDT with clearly labeled testnet sandbox name and symbol", async function () {
      expect(await mockUsdt.name()).to.equal("Mock Tether USD (Testnet Sandbox)");
      expect(await mockUsdt.symbol()).to.equal("mUSDT");
      expect(await mockUsdt.decimals()).to.equal(18);

      const initialSupply = hre.ethers.parseUnits("1000000", 18);
      expect(await mockUsdt.totalSupply()).to.equal(initialSupply);
      expect(await mockUsdt.balanceOf(deployer.address)).to.equal(initialSupply);
    });

    it("Should allow owner to mint testnet tokens for sandbox faucet operations", async function () {
      const mintAmount = hre.ethers.parseUnits("5000", 18);
      await mockUsdt.mint(trader1.address, mintAmount);

      expect(await mockUsdt.balanceOf(trader1.address)).to.equal(mintAmount);
    });

    it("Should reject mint calls from non-owner accounts", async function () {
      const mintAmount = hre.ethers.parseUnits("1000", 18);
      await expect(
        mockUsdt.connect(trader1).mint(trader1.address, mintAmount)
      ).to.be.revertedWithCustomError(mockUsdt, "OwnableUnauthorizedAccount");
    });
  });

  // =========================================================================
  // JOURNEY 3: Local AMM Sandbox Pool Modeling & Reserve Calculations
  // =========================================================================
  describe("Journey 3: Local AMM Sandbox Pool Modeling & Reserve Calculations", function () {
    it("Should calculate accurate initial pool parameters for $1,000 total pool ($500 LIORA + $500 USDT)", function () {
      const tokenA = { address: "0x1111111111111111111111111111111111111111", symbol: "LIORA", name: "LIORA COIN", decimals: 18 };
      const tokenB = { address: "0x2222222222222222222222222222222222222222", symbol: "USDT", name: "Mock USDT", decimals: 18 };

      // At ₹0.20 ($0.00231214), $500 = 216,250 LIORA
      const lioraAmount = hre.ethers.parseUnits("216250", 18);
      const usdtAmount = hre.ethers.parseUnits("500", 18);

      const quote = DexService.calculateLiquidityProvision(
        tokenA,
        tokenB,
        lioraAmount,
        usdtAmount,
        0n,
        0n,
        0n,
        0.5
      );

      expect(quote.amountADesired).to.equal(lioraAmount);
      expect(quote.amountBDesired).to.equal(usdtAmount);
      expect(quote.expectedLpTokens).to.be.greaterThan(0n);
      expect(quote.poolSharePercent).to.equal(100);
      expect(quote.amountAMin).to.equal((lioraAmount * 9950n) / 10000n);
      expect(quote.amountBMin).to.equal((usdtAmount * 9950n) / 10000n);
    });

    it("Should model proportional reserves after subsequent liquidity deposits", function () {
      const reserveLiora = hre.ethers.parseUnits("216250", 18);
      const reserveUsdt = hre.ethers.parseUnits("500", 18);
      const totalLp = hre.ethers.parseUnits("10000", 18);

      const tokenA = { address: "0x1111111111111111111111111111111111111111", symbol: "LIORA", name: "LIORA COIN", decimals: 18 };
      const tokenB = { address: "0x2222222222222222222222222222222222222222", symbol: "USDT", name: "Mock USDT", decimals: 18 };

      // Deposit 10% more LIORA (21,625 LIORA)
      const addLiora = hre.ethers.parseUnits("21625", 18);
      const addUsdtMax = hre.ethers.parseUnits("100", 18); // Willing to provide up to 100 USDT

      const quote = DexService.calculateLiquidityProvision(
        tokenA,
        tokenB,
        addLiora,
        addUsdtMax,
        reserveLiora,
        reserveUsdt,
        totalLp,
        0.5
      );

      // Optimal USDT required must equal exactly 50 USDT (10% of 500)
      expect(quote.amountBDesired).to.equal(hre.ethers.parseUnits("50", 18));
      // LP tokens minted: 10% of 10,000 = 1,000 LP tokens
      expect(quote.expectedLpTokens).to.equal(hre.ethers.parseUnits("1000", 18));
      expect(quote.poolSharePercent).to.be.closeTo(9.09, 0.05);
    });
  });

  // =========================================================================
  // JOURNEY 4: End-to-End AMM Swaps in Both Directions (LIORA <-> USDT)
  // =========================================================================
  describe("Journey 4: End-to-End AMM Swaps in Both Directions (LIORA <-> USDT)", function () {
    // Pool state: 216,250 LIORA & 500 USDT ($1,000 Total Pool)
    const reserveLiora = hre.ethers.parseUnits("216250", 18);
    const reserveUsdt = hre.ethers.parseUnits("500", 18);

    it("Direction 1 (LIORA -> USDT): Should calculate accurate quotes for $10, $25, $50, $100 trades", function () {
      const tradeSizesUSD = [10, 25, 50, 100];
      const tokenIn = { address: "0x1111111111111111111111111111111111111111", symbol: "LIORA", name: "LIORA COIN", decimals: 18 };
      const tokenOut = { address: "0x2222222222222222222222222222222222222222", symbol: "USDT", name: "Mock USDT", decimals: 18 };

      for (const tradeUSD of tradeSizesUSD) {
        // Tokens to sell = tradeUSD / 0.00231214 ≈ tradeUSD * 432.5
        const tokensToSell = (tradeUSD * 432.5).toFixed(4);
        const quote = dexService.getExecutableQuote(
          { tokenIn, tokenOut, amountIn: tokensToSell, slippageTolerancePercent: 0.5 },
          {
            pairAddress: "0x1234567890123456789012345678901234567890",
            token0: tokenIn.address,
            token1: tokenOut.address,
            reserve0: reserveLiora,
            reserve1: reserveUsdt,
            blockTimestampLast: Math.floor(Date.now() / 1000),
            hasLiquidity: true
          }
        );

        expect(quote.hasSufficientLiquidity).to.be.true;
        const usdtOut = parseFloat(quote.expectedAmountOutFormatted);
        expect(usdtOut).to.be.greaterThan(0);
        expect(usdtOut).to.be.lessThan(tradeUSD); // Due to price impact & 0.25% fee

        // Price impact checks
        if (tradeUSD === 10) expect(quote.priceImpactPercent).to.be.closeTo(1.96, 0.5);
        if (tradeUSD === 50) expect(quote.priceImpactPercent).to.be.closeTo(9.09, 0.8);
        if (tradeUSD === 100) expect(quote.priceImpactPercent).to.be.closeTo(16.67, 1.2);
      }
    });

    it("Direction 2 (USDT -> LIORA): Should calculate accurate quotes buying LIORA with USDT", function () {
      const tokenIn = { address: "0x2222222222222222222222222222222222222222", symbol: "USDT", name: "Mock USDT", decimals: 18 };
      const tokenOut = { address: "0x1111111111111111111111111111111111111111", symbol: "LIORA", name: "LIORA COIN", decimals: 18 };

      // Buy with 50 USDT
      const quote = dexService.getExecutableQuote(
        { tokenIn, tokenOut, amountIn: "50", slippageTolerancePercent: 0.5 },
        {
          pairAddress: "0x1234567890123456789012345678901234567890",
          token0: tokenOut.address, // LIORA is token0
          token1: tokenIn.address,  // USDT is token1
          reserve0: reserveLiora,
          reserve1: reserveUsdt,
          blockTimestampLast: Math.floor(Date.now() / 1000),
          hasLiquidity: true
        }
      );

      expect(quote.hasSufficientLiquidity).to.be.true;
      const lioraReceived = parseFloat(quote.expectedAmountOutFormatted);
      // In unimpacted world, 50 USDT buys ~21,625 LIORA.
      // With AMM impact against 500 USDT pool (10% trade size), receives ~19,636 LIORA.
      expect(lioraReceived).to.be.closeTo(19636, 200);
      expect(quote.priceImpactPercent).to.be.closeTo(9.09, 1.0);
    });

    it("Should verify constant product invariant k' >= k across swap execution", function () {
      const amountIn = hre.ethers.parseUnits("10000", 18); // 10,000 LIORA
      const amountOut = DexService.calculateAmountOut(amountIn, reserveLiora, reserveUsdt);

      const kBefore = reserveLiora * reserveUsdt;
      const newReserveIn = reserveLiora + amountIn;
      const newReserveOut = reserveUsdt - amountOut;
      const kAfter = newReserveIn * newReserveOut;

      // Due to 0.25% fee retained in pool, kAfter must be strictly greater than kBefore
      expect(kAfter).to.be.greaterThan(kBefore);
    });
  });

  // =========================================================================
  // JOURNEY 5: Security, Approvals, Reverts & Network Isolation
  // =========================================================================
  describe("Journey 5: Security, Approvals, Reverts & Network Isolation", function () {
    it("Should strictly enforce testnet network isolation against Mainnet (Chain ID 56)", function () {
      expect(() => new DexService(56)).to.throw("Mainnet chain ID 56 is strictly prohibited");
      expect(() => new DexService(1)).to.throw("Mainnet chain ID 1 is strictly prohibited");
    });

    it("Should enforce exact-amount approval over infinite MAX_UINT256", function () {
      const mockQuote = {
        amountInBaseUnits: hre.ethers.parseUnits("500", 18),
        hasSufficientLiquidity: true,
        estimatedGasUnits: 135000n,
        estimatedGasCostBnb: "0.000405"
      };

      // When allowance is 0 -> needsApproval is true
      const sim1 = dexService.simulateSwap(mockQuote, trader1.address, 0n);
      expect(sim1.needsApproval).to.be.true;
      expect(sim1.canExecute).to.be.false;

      // When allowance is exact -> needsApproval is false
      const sim2 = dexService.simulateSwap(mockQuote, trader1.address, hre.ethers.parseUnits("500", 18));
      expect(sim2.needsApproval).to.be.false;
      expect(sim2.canExecute).to.be.true;
    });

    it("Should decode standard PancakeSwap AMM reverts accurately", function () {
      expect(DexService.decodeSwapError(new Error("Pancake: K"))).to.include("SWAP_FAILED_TRANSFER");
      expect(DexService.decodeSwapError(new Error("PancakeRouter: EXPIRED"))).to.include("SWAP_FAILED_EXPIRED");
      expect(DexService.decodeSwapError(new Error("PancakeRouter: INSUFFICIENT_OUTPUT_AMOUNT"))).to.include("SWAP_FAILED_SLIPPAGE");
      expect(DexService.decodeSwapError(new Error("User rejected transaction"))).to.include("SWAP_USER_REJECTED");
    });

    it("Should enforce 5-minute transaction deadline preventing stale MEV sandwiching", function () {
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
        recipientAddress: trader1.address,
        deadlineSeconds: 300,
        confirmed: true
      });

      expect(tx.deadline).to.be.closeTo(nowSec + 300, 5);
    });
  });

  // =========================================================================
  // JOURNEY 6: Financial Independence & Redemption Disclaimers
  // =========================================================================
  describe("Journey 6: Financial Independence & Redemption Disclaimers", function () {
    it("Should verify reference-price schedule (₹0.20 to ₹30.00) remains separate from AMM reserves", function () {
      const pricePaise = ReferencePriceSimulator.calculatePricePaise(149 * 18000);
      expect(pricePaise).to.equal(3000); // ₹30.00 ceiling

      // Proves that reference price schedule is completely independent of AMM pool state
      const summary = ReferencePriceSimulator.getScheduleSummary(5);
      expect(summary.maxPriceINR).to.equal(30.00);
      expect(summary.totalHours).to.equal(745);
    });

    it("Should demonstrate that investment-plan liabilities cannot be settled from the $500 paired reserve", function () {
      const elite = InvestmentPlanModel.evaluateConfirmedProposalPlan("ELITE", "2026-11-30T10:00:00Z", 500.0);

      // Elite requires ₹45,00,000 ($52,023.12 USD) investor payout
      expect(elite.investorShareINR).to.equal(4500000);
      expect(elite.investorShareUSD).to.be.greaterThan(50000);

      // Coverage against $500 reserve is < 1%
      expect(elite.coverageRatioPercent).to.be.lessThan(1.0);
      expect(elite.isFullyFunded).to.be.false;
      expect(elite.conflicts.some(c => c.includes("INSOLVENCY_CONFLICT"))).to.be.true;
    });
  });

  // =========================================================================
  // JOURNEY 7: Gate C5 Pre-Broadcast Audits & Option 2 Exact Math
  // =========================================================================
  describe("Journey 7: Gate C5 Pre-Broadcast Audits & Option 2 Exact Math", function () {
    it("Should verify MockUSDT is explicitly identifiable as a valueless sandbox token", async function () {
      expect(await mockUsdt.name()).to.equal("Mock Tether USD (Testnet Sandbox)");
      expect(await mockUsdt.symbol()).to.equal("mUSDT");
      expect(await mockUsdt.decimals()).to.equal(18);
    });

    it("Should verify LioraToken has zero post-deployment mint capability and 1B max supply", async function () {
      expect(await lioraToken.totalSupply()).to.equal(hre.ethers.parseUnits("1000000000", 18));
      // lioraToken has no mint function
      expect(lioraToken.mint).to.be.undefined;
    });

    it("Should verify two-step ownership management (Ownable2Step) on LioraToken", async function () {
      expect(await lioraToken.owner()).to.equal(deployer.address);
      await lioraToken.connect(deployer).transferOwnership(trader1.address);
      // Owner does not change until accepted
      expect(await lioraToken.owner()).to.equal(deployer.address);
      expect(await lioraToken.pendingOwner()).to.equal(trader1.address);
      // Pending owner accepts
      await lioraToken.connect(trader1).acceptOwnership();
      expect(await lioraToken.owner()).to.equal(trader1.address);
    });

    it("Should verify Option 2 exact pool arithmetic (216,250 LIORA + 500 USDT = ₹0.20 at ₹86.50/USD)", function () {
      const lioraCount = 216250;
      const usdtCount = 500;
      const fxRate = 86.50;

      const priceUsd = usdtCount / lioraCount; // $0.0023121387...
      const priceInr = priceUsd * fxRate;      // exactly ₹0.200000...

      expect(priceInr).to.be.closeTo(0.20, 0.0001);
      const totalPoolUSD = usdtCount * 2; // $500 USDT + $500 worth of LIORA
      expect(totalPoolUSD).to.equal(1000.0);
    });

    it("Should confirm all four deployment & testnet scripts have strict chainId 56 mainnet blocking", function () {
      const fs = require("fs");
      const path = require("path");

      const scripts = [
        "deploy-liora-token.js",
        "deploy-mock-usdt.js",
        "provision-testnet-pool.js",
        "execute-testnet-swap.js"
      ];

      for (const script of scripts) {
        const content = fs.readFileSync(path.resolve(__dirname, "../scripts", script), "utf8");
        expect(content).to.include("chainId === 56");
        expect(content).to.include("SECURITY VIOLATION");
        expect(content).to.include("chainId !== 97 && chainId !== 31337");
      }
    });
  });
});

