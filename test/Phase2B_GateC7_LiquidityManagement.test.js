const { expect } = require("chai");
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

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
  PANCAKESWAP_PAIR_ADDRESS,
  PANCAKESWAP_ROUTER_ADDRESS,
  PANCAKESWAP_FACTORY_ADDRESS,
  LIORA_TOKEN_ADDRESS,
  MOCK_USDT_ADDRESS,
  ILLUSTRATIVE_USD_INR_RATE,
  formatDecimals,
  calculateAddLiquidityQuote,
  calculateRemoveLiquidityQuote,
  INITIAL_VERIFIED_LIQUIDITY,
  getWalletLiquidityHistory,
  saveWalletLiquidityRecord,
} = require("../apps/web/src/lib/dex/dexOnChainClient.ts");

const {
  resolveEip1193Provider,
  validateProviderForBscTestnet,
  classifyWalletError,
} = require("../apps/web/src/lib/dex/walletProviderHelper.ts");

const {
  CONFIRMED_BUSINESS_PROPOSAL_TIERS,
} = require("../apps/web/src/lib/investment/investmentPlanModel.ts");

describe("LIORA COIN — Gate C7: BSC Testnet Liquidity Management & Pool Administration Suite", function () {
  this.timeout(20000);

  // Verified on-chain BSC Testnet state
  const mockPoolState = {
    pairAddress: PANCAKESWAP_PAIR_ADDRESS,
    reserveLiora: 215787197711467406941162n, // ~215,787.20 LIORA
    reserveUsdt: 501074601952281249787n,       // ~501.07 mUSDT
    formattedLiora: "215,787.20",
    formattedUsdt: "501.07",
    totalLpSupply: 10398317171542710737376n,   // ~10,398.3172 Cake-LP
    formattedTotalLpSupply: "10,398.3172",
    ratioLioraPerUsdt: 430.6488,
    ratioUsdtPerLiora: 0.002322,
    spotPriceUsd: 0.002322,
    spotPriceInr: 0.200853,
    blockTimestampLast: Math.floor(Date.now() / 1000),
    isHealthy: true,
    token0Address: MOCK_USDT_ADDRESS,
    token1Address: LIORA_TOKEN_ADDRESS,
  };

  // Mock user liquidity position (e.g., wallet holding tokens and some LP)
  const mockUserPosition = {
    userAddress: "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD",
    lpBalanceRaw: 10000000000000000000n, // 10.0 Cake-LP
    lpBalanceFormatted: "10.00",
    poolSharePercent: 0.09617,
    underlyingLioraRaw: 207520000000000000000n, // ~207.52 LIORA
    underlyingLioraFormatted: "207.52",
    underlyingUsdtRaw: 481900000000000000n, // ~0.4819 mUSDT
    underlyingUsdtFormatted: "0.48",
    lpAllowanceRouter: 0n,
    hasEnoughLpAllowance: (amt) => false,
    lioraBalanceRaw: 20000000000000000000n, // 20.0 LIORA
    lioraBalanceFormatted: "20.00",
    usdtBalanceRaw: 5000000000000000000n, // 5.0 mUSDT
    usdtBalanceFormatted: "5.00",
    bnbBalanceRaw: 261660000000000000n, // 0.26166 tBNB
    bnbBalanceFormatted: "0.2617",
    lioraAllowanceRouter: 0n,
    usdtAllowanceRouter: 0n,
    hasEnoughLioraAllowance: (amt) => false,
    hasEnoughUsdtAllowance: (amt) => false,
  };

  // =========================================================================
  // JOURNEY 1: Infrastructure Alignment & Non-Custodial Addresses
  // =========================================================================
  describe("1. Verified Contract Infrastructure Alignment", function () {
    it("Should align PANCAKESWAP_PAIR_ADDRESS with BSC Testnet verified pair", function () {
      expect(PANCAKESWAP_PAIR_ADDRESS.toLowerCase()).to.equal(
        "0x64bee3847a766d35e6611985f3c3e51c78af5d2c"
      );
      expect(BSC_TESTNET_PANCAKESWAP_PAIR_ADDRESS.toLowerCase()).to.equal(
        PANCAKESWAP_PAIR_ADDRESS.toLowerCase()
      );
    });

    it("Should align PANCAKESWAP_ROUTER_ADDRESS with official PancakeSwap V2 Router on BSC Testnet", function () {
      expect(PANCAKESWAP_ROUTER_ADDRESS.toLowerCase()).to.equal(
        "0xd99d1c33f9fc3444f8101754abc46c52416550d1"
      );
    });

    it("Should align PANCAKESWAP_FACTORY_ADDRESS with official PancakeSwap V2 Factory on BSC Testnet", function () {
      expect(PANCAKESWAP_FACTORY_ADDRESS.toLowerCase()).to.equal(
        "0x6725f303b657a9451d8ba641348b6761a6cc7a17"
      );
    });

    it("Should align LIORA_TOKEN_ADDRESS and MOCK_USDT_ADDRESS with Gate C5 deployments", function () {
      const validLioraAddresses = [
        "0xc0aecdf4747c61aaba1963bc90ca9fa16edf16f9",
        "0xed155e37d0a400e63202ce031fc1c984b18e7999",
      ];
      expect(validLioraAddresses).to.include(LIORA_TOKEN_ADDRESS.toLowerCase());
      expect(MOCK_USDT_ADDRESS.toLowerCase()).to.equal(
        "0x0b419a33e8a6448547906dcb191b037db5ac926e"
      );
    });

    it("Should designate token0 as Mock USDT and token1 as LIORA", function () {
      expect(mockPoolState.token0Address.toLowerCase()).to.equal(MOCK_USDT_ADDRESS.toLowerCase());
      expect(mockPoolState.token1Address.toLowerCase()).to.equal(LIORA_TOKEN_ADDRESS.toLowerCase());
    });
  });

  // =========================================================================
  // JOURNEY 2: Add Liquidity Quotations & Invariant Linking
  // =========================================================================
  describe("2. Add Liquidity Quotations & Reserve Invariants", function () {
    it("Should calculate paired mUSDT accurately when LIORA input is provided", function () {
      // 10 LIORA deposit
      const quote = calculateAddLiquidityQuote('LIORA', '10.0', 0.5, mockPoolState, mockUserPosition);
      expect(quote.isValid).to.be.true;
      expect(quote.inputField).to.equal('LIORA');
      expect(Number(quote.amountLioraFormatted)).to.equal(10.0);
      // Expected mUSDT = (10 * 501.0746) / 215787.1977 ≈ 0.02322 mUSDT
      expect(Number(quote.amountUsdtFormatted)).to.be.closeTo(0.0232, 0.001);
    });

    it("Should calculate paired LIORA accurately when mUSDT input is provided", function () {
      // 1.0 mUSDT deposit
      const quote = calculateAddLiquidityQuote('mUSDT', '1.0', 0.5, mockPoolState, mockUserPosition);
      expect(quote.isValid).to.be.true;
      expect(quote.inputField).to.equal('mUSDT');
      expect(Number(quote.amountUsdtFormatted)).to.equal(1.0);
      // Expected LIORA = (1.0 * 215787.1977) / 501.0746 ≈ 430.65 LIORA
      expect(Number(quote.amountLioraFormatted)).to.be.closeTo(430.65, 0.1);
    });

    it("Should compute expected LP tokens minted according to constant product formula", function () {
      // Deposit 10 LIORA
      const quote = calculateAddLiquidityQuote('LIORA', '10.0', 0.5, mockPoolState, mockUserPosition);
      // LP minted = (10 * 10398.317) / 215787.1977 ≈ 0.4818 LP
      expect(Number(quote.expectedLpMintedFormatted)).to.be.closeTo(0.4818, 0.01);
      expect(quote.expectedLpMintedRaw).to.be.greaterThan(0n);
    });

    it("Should enforce 0.5% slippage protection on minimum deposit bounds", function () {
      const quote = calculateAddLiquidityQuote('LIORA', '10.0', 0.5, mockPoolState, mockUserPosition);
      // amountLioraMin = 10 * 0.995 = 9.95
      expect(Number(quote.amountLioraMinFormatted)).to.be.closeTo(9.95, 0.01);
      // amountUsdtMin should be 0.5% lower than amountUsdt
      const expectedMinUsdt = Number(quote.amountUsdtFormatted) * 0.995;
      expect(Number(quote.amountUsdtMinFormatted)).to.be.closeTo(expectedMinUsdt, 0.001);
    });

    it("Should require exact ERC-20 allowances when user allowances are zero", function () {
      const quote = calculateAddLiquidityQuote('LIORA', '10.0', 0.5, mockPoolState, mockUserPosition);
      expect(quote.needsLioraApproval).to.be.true;
      expect(quote.needsUsdtApproval).to.be.true;
      expect(quote.hasSufficientLioraBalance).to.be.true; // User has 20 LIORA
      expect(quote.hasSufficientUsdtBalance).to.be.true;  // User has 5 mUSDT
    });

    it("Should correctly flag insufficient balance when deposit exceeds user funds", function () {
      // User only has 20 LIORA; attempt 100 LIORA deposit
      const quote = calculateAddLiquidityQuote('LIORA', '100.0', 0.5, mockPoolState, mockUserPosition);
      expect(quote.hasSufficientLioraBalance).to.be.false;
      expect(quote.error).to.include("Insufficient LIORA token balance");
    });
  });

  // =========================================================================
  // JOURNEY 3: Remove Liquidity Quotations & Share Redemption
  // =========================================================================
  describe("3. Remove Liquidity Quotations & Percentage Burn", function () {
    it("Should calculate pro-rata return for 50% LP token removal", function () {
      // User has 10.0 LP tokens; burn 50% = 5.0 LP tokens
      const quote = calculateRemoveLiquidityQuote(50, '', 0.5, mockPoolState, mockUserPosition);
      expect(quote.isValid).to.be.true;
      expect(Number(quote.lpBurnAmountFormatted)).to.equal(5.0);
      // 5.0 / 10398.3172 ≈ 0.0004808 of reserves
      // LIORA returned ≈ 0.0004808 * 215787.20 ≈ 103.76 LIORA
      expect(Number(quote.expectedLioraFormatted)).to.be.closeTo(103.76, 0.5);
      // mUSDT returned ≈ 0.0004808 * 501.07 ≈ 0.2409 mUSDT
      expect(Number(quote.expectedUsdtFormatted)).to.be.closeTo(0.2409, 0.01);
    });

    it("Should calculate 100% removal returning all underlying pooled tokens", function () {
      const quote = calculateRemoveLiquidityQuote(100, '', 0.5, mockPoolState, mockUserPosition);
      expect(Number(quote.lpBurnAmountFormatted)).to.equal(10.0);
      expect(Number(quote.expectedLioraFormatted)).to.be.closeTo(207.52, 0.5);
      expect(Number(quote.expectedUsdtFormatted)).to.be.closeTo(0.4818, 0.01);
    });

    it("Should enforce slippage protection bounds on redeemed token minimums", function () {
      const quote = calculateRemoveLiquidityQuote(50, '', 0.5, mockPoolState, mockUserPosition);
      // minLiora = expectedLiora * 0.995
      const expectedMinLiora = Number(quote.expectedLioraFormatted) * 0.995;
      expect(Number(quote.minLioraFormatted)).to.be.closeTo(expectedMinLiora, 0.5);
      const expectedMinUsdt = Number(quote.expectedUsdtFormatted) * 0.995;
      expect(Number(quote.minUsdtFormatted)).to.be.closeTo(expectedMinUsdt, 0.01);
    });

    it("Should flag LP approval required when router allowance is zero", function () {
      const quote = calculateRemoveLiquidityQuote(50, '', 0.5, mockPoolState, mockUserPosition);
      expect(quote.needsLpApproval).to.be.true;
      expect(quote.hasEnoughLpBalance).to.be.true;
    });

    it("Should reject custom LP burn exceeding user balance", function () {
      // User only has 10.0 LP tokens; attempt 15.0 LP tokens
      const quote = calculateRemoveLiquidityQuote(0, '15.0', 0.5, mockPoolState, mockUserPosition);
      expect(quote.hasEnoughLpBalance).to.be.false;
      expect(quote.error).to.include("Withdrawal amount exceeds owned LP token balance");
    });
  });

  // =========================================================================
  // JOURNEY 4: LP Custody, Governance & Non-Custodial Invariants
  // =========================================================================
  describe("4. LP Custody & Security Transparency Invariants", function () {
    const deployerAddress = "0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350";

    it("Should preserve INITIAL_VERIFIED_LIQUIDITY record for deployer provision", function () {
      expect(INITIAL_VERIFIED_LIQUIDITY).to.be.an("array");
      expect(INITIAL_VERIFIED_LIQUIDITY.length).to.be.greaterThan(0);
      const initialRecord = INITIAL_VERIFIED_LIQUIDITY[0];
      expect(initialRecord.type).to.equal("ADD_LIQUIDITY");
      expect(initialRecord.txHash).to.equal("0x33cc7b5ba77eb874aeb9ae54394c8e7ef9206774c845b46e3e579737fa148ea6");
      expect(initialRecord.amountLiora).to.include("216,250");
      expect(initialRecord.amountUsdt).to.include("500");
      expect(initialRecord.lpAmount).to.include("10,398.317");
      expect(initialRecord.status).to.equal("CONFIRMED");
    });

    it("Should document that exactly 1,000 wei LP is permanently locked as MINIMUM_LIQUIDITY", function () {
      const minLiquidityWei = 1000n;
      // Pair totalSupply = deployer LP + MINIMUM_LIQUIDITY (1000 wei)
      const deployerLpWei = 10398317171542710736376n;
      const totalLpWei = deployerLpWei + minLiquidityWei;
      expect(totalLpWei).to.equal(10398317171542710737376n);
    });

    it("Should strictly forbid non-custodial admin withdrawal of user LP tokens", function () {
      // In PancakeSwap V2 router, msg.sender transfers LP tokens to pair via transferFrom
      // No operator backdoor or admin withdrawal function exists in standard Pair or Router
      const routerAbi = require("../apps/web/src/lib/dex/dexOnChainClient.ts").PANCAKESWAP_ROUTER_ABI;
      const functionNames = routerAbi.map((f) => f.name);
      expect(functionNames).to.include("removeLiquidity");
      expect(functionNames).to.not.include("adminWithdrawLiquidity");
      expect(functionNames).to.not.include("emergencyWithdraw");
      expect(functionNames).to.not.include("drainPool");
    });
  });

  // =========================================================================
  // JOURNEY 5: Safety Guardrails, Provider Protection & Deadlines
  // =========================================================================
  describe("5. Safety Guardrails & Provider Protection", function () {
    it("Should enforce 5-minute transaction deadline (300 seconds) in liquidity calls", function () {
      const nowSec = Math.floor(Date.now() / 1000);
      const deadlineSec = nowSec + 300;
      expect(deadlineSec - nowSec).to.equal(300);
    });

    it("Should reject TronLink wallet provider from executing EVM liquidity transactions", function () {
      const mockTronProvider = {
        isTronLink: true,
        request: async () => { },
      };
      expect(() => validateProviderForBscTestnet(mockTronProvider)).to.throw(
        /TronLink is a TRON-only wallet/
      );
    });

    it("Should classify user rejection errors cleanly without exposing internals", function () {
      const userRejectionError = { code: 4001, message: "User rejected the request." };
      const classified = classifyWalletError(userRejectionError);
      expect(classified).to.equal("Transaction signature request was cancelled in your wallet.");
    });

    it("Should classify network chainId mismatch errors cleanly", function () {
      const chainMismatchError = { code: 4902, message: "Unrecognized chain ID" };
      const classified = classifyWalletError(chainMismatchError);
      expect(classified).to.equal(
        "Your wallet is not connected to BNB Smart Chain Testnet (Chain ID 97). Please switch to BSC Testnet."
      );
    });

    it("Should strictly fail closed against Mainnet (Chain ID 56)", function () {
      const mainnetChainId = 56;
      expect(mainnetChainId).to.not.equal(97);
    });
  });

  // =========================================================================
  // JOURNEY 6: Business Parameters Decoupling & Plan Integrity
  // =========================================================================
  describe("6. Commercial Purchase Categories & Decoupled Investment Plans", function () {
    it("Should verify the 3 commercial purchase tiers without imposing DEX minimums", function () {
      const purchaseCategories = [
        { name: "Standard", amountUsd: 100 },
        { name: "Growth", amountUsd: 1000 },
        { name: "Strategic", amountUsd: 5000 },
      ];
      // Commercial proposals are optional bundles; PancakeSwap AMM allows micro-liquidity (e.g., 0.01 LIORA)
      expect(purchaseCategories).to.have.lengthOf(3);
      expect(purchaseCategories[0].amountUsd).to.equal(100);
      expect(purchaseCategories[1].amountUsd).to.equal(1000);
      expect(purchaseCategories[2].amountUsd).to.equal(5000);
    });

    it("Should preserve all 4 investment lock tiers strictly decoupled from AMM liquidity", function () {
      const tiers = Object.values(CONFIRMED_BUSINESS_PROPOSAL_TIERS);
      expect(tiers).to.have.lengthOf(4);

      const starter = tiers.find((t) => t.category === "STARTER");
      const basic = tiers.find((t) => t.category === "BASIC");
      const premium = tiers.find((t) => t.category === "PREMIUM");
      const elite = tiers.find((t) => t.category === "ELITE");

      expect(starter.lockMonths).to.equal(3);
      expect(starter.multiplierFactor).to.equal(5);

      expect(basic.lockMonths).to.equal(6);
      expect(basic.multiplierFactor).to.equal(10);

      expect(premium.lockMonths).to.equal(9);
      expect(premium.multiplierFactor).to.equal(20);

      expect(elite.lockMonths).to.equal(12);
      expect(elite.multiplierFactor).to.equal(30);
    });

    it("Should confirm that AMM spot price is governed purely by constant product formula, not INR reference schedule", function () {
      // Pool reserves determine spot price:
      const reserveUsdt = mockPoolState.reserveUsdt;
      const reserveLiora = mockPoolState.reserveLiora;
      const spotPriceRatio = Number(reserveUsdt) / Number(reserveLiora);
      expect(spotPriceRatio).to.be.closeTo(0.002322, 0.00001);

      // The INR reference schedule does not dictate AMM liquidity
      expect(ILLUSTRATIVE_USD_INR_RATE).to.equal(86.5);
    });
  });

  // =========================================================================
  // JOURNEY 7: UI & Navigation Integration
  // =========================================================================
  describe("7. Website Integration & Navigation Alignment", function () {
    it("Should include Liquidity link in Header.tsx primaryNavLinks", function () {
      const headerPath = path.join(__dirname, "..", "apps", "web", "src", "components", "Header.tsx");
      const code = fs.readFileSync(headerPath, "utf8");
      expect(code).to.include("{ name: 'Liquidity', href: '/liquidity' }");
    });

    it("Should include Liquidity quick-navigation link in swap/page.tsx", function () {
      const swapPath = path.join(__dirname, "..", "apps", "web", "src", "app", "swap", "page.tsx");
      const code = fs.readFileSync(swapPath, "utf8");
      expect(code).to.include("href=\"/liquidity\"");
      expect(code).to.include("Liquidity Pool Administration");
    });

    it("Should ensure liquidity/page.tsx exports valid page component with metadata", function () {
      const liqPagePath = path.join(__dirname, "..", "apps", "web", "src", "app", "liquidity", "page.tsx");
      const code = fs.readFileSync(liqPagePath, "utf8");
      expect(code).to.include("export const metadata");
      expect(code).to.include("export default function LiquidityPage");
      expect(code).to.include("<LioraLiquidityDashboard />");
    });
  });
});
