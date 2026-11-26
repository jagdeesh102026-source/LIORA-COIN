const { expect } = require("chai");
const path = require("path");

require("./helpers/tsLoader");

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const {
  BSC_MAINNET_CONFIG,
  BSC_TESTNET_CONFIG,
  BSC_MAINNET_LIORA_TOKEN_ADDRESS,
  BSC_MAINNET_LIORA_PROXY_ADDRESS,
  BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS,
  BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS,
  BSC_MAINNET_LIORA_TIMELOCK_ADDRESS,
  BSC_MAINNET_OPERATING_TREASURY_ADDRESS,
  BSC_MAINNET_GOVERNANCE_ADDRESS,
  BSC_MAINNET_TOKEN_ADDRESS,
  getTokenContractAddress,
  isProductionChain,
  isTestnetChain,
  isTestnetSandboxEnabled,
  isProductionWebsite,
} = require("../apps/web/src/config/tokenConfig");

const {
  BLOCKCHAIN_REGISTRY,
  CHAIN_AWARE_TOKENS,
} = require("../apps/web/src/lib/chains/blockchainRegistry");

const {
  PREVIEW_CONFIG,
} = require("../apps/web/src/config/previewConfig");

const {
  fetchMainnetTokenOverview,
  fetchMainnetUserTokenBalance,
  bscMainnetPublicClient,
} = require("../apps/web/src/lib/contracts/client");

const {
  treasuryAccounting,
  BSC_MAINNET_TREASURY_WALLET,
  BSC_TESTNET_TREASURY_WALLET,
  AUTHORIZED_TREASURY_WALLET,
} = require("../apps/web/src/lib/treasury/treasuryAccountingEngine");

const {
  SettlementPersistentStore,
} = require("../apps/web/src/lib/server/settlement/settlementPersistentStore");

describe("LIORA — Phase 1 Mainnet Website Integration & Safety Guardrails Suite", function () {
  this.timeout(30000); // 30s for live RPC queries

  // =========================================================================
  // 1. OFFICIAL CONTRACT ADDRESSES & CONFIGURATION VERIFICATION
  // =========================================================================
  describe("1. Official BSC Mainnet Configuration & Addresses", function () {
    it("Should configure the official LIORA Mainnet Proxy contract address", function () {
      expect(BSC_MAINNET_LIORA_TOKEN_ADDRESS).to.equal("0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A");
      expect(BSC_MAINNET_LIORA_PROXY_ADDRESS).to.equal("0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A");
      expect(BSC_MAINNET_TOKEN_ADDRESS).to.equal("0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A");
    });

    it("Should configure the official Mainnet Implementation, Vault, Timelock, and Treasury addresses", function () {
      expect(BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS).to.equal("0x22C6F5B2e9b03e99FB030a96A2ada0c28BA280a0");
      expect(BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS).to.equal("0x244865302a1643702ACB66181DBd898F714EF6e0");
      expect(BSC_MAINNET_LIORA_TIMELOCK_ADDRESS).to.equal("0xd03A64C31E2464DD2A7d69B538729A690b4ab177");
      expect(BSC_MAINNET_OPERATING_TREASURY_ADDRESS).to.equal("0xD546c3263663C193447bAdF60741f3915b349064");
      expect(BSC_MAINNET_GOVERNANCE_ADDRESS).to.equal("0x491d37ab13E66f6fd544Cdb3A4C57015D7fc2d54");
    });

    it("Should resolve the correct contract address for Chain ID 56 and Chain ID 97", function () {
      expect(getTokenContractAddress(56)).to.equal("0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A");
      expect(getTokenContractAddress(97)).to.equal(BSC_TESTNET_CONFIG.contractAddress);
      expect(getTokenContractAddress(1)).to.be.null;
    });

    it("Should correctly validate production vs testnet chain identifiers", function () {
      expect(isProductionChain(56)).to.be.true;
      expect(isProductionChain(97)).to.be.false;
      expect(isTestnetChain(97)).to.be.true;
      expect(isTestnetChain(56)).to.be.false;
    });
  });

  // =========================================================================
  // 2. MULTI-CHAIN BLOCKCHAIN REGISTRY INVARIANTS
  // =========================================================================
  describe("2. Multi-Chain Registry State & Security Invariants", function () {
    it("Should enable bsc-mainnet for read-only connectivity while disabling mutating transactions", function () {
      const mainnetConfig = BLOCKCHAIN_REGISTRY["bsc-mainnet"];
      expect(mainnetConfig).to.exist;
      expect(mainnetConfig.chainId).to.equal(56);
      expect(mainnetConfig.enabled).to.be.true; // Enabled for read-only queries
      expect(mainnetConfig.status).to.equal("READ_ONLY_MAINNET");

      // Strict feature invariants: smart contracts read enabled, but all writes disabled
      expect(mainnetConfig.features.smartContracts).to.be.true;
      expect(mainnetConfig.features.tokenTransfers).to.be.false;
      expect(mainnetConfig.features.tradingBotPayments).to.be.false;
      expect(mainnetConfig.features.investorLocking).to.be.false;
    });

    it("Should register bsc-mainnet:liora with official Mainnet proxy address", function () {
      const token = CHAIN_AWARE_TOKENS["bsc-mainnet:liora"];
      expect(token).to.exist;
      expect(token.symbol).to.equal("LIORA");
      expect(token.networkId).to.equal("bsc-mainnet");
      expect(token.contractAddress).to.equal("0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A");
      expect(token.decimals).to.equal(18);
    });

    it("Should keep testnet tokens properly isolated in registry", function () {
      const testnetToken = CHAIN_AWARE_TOKENS["bsc:liora"];
      expect(testnetToken).to.exist;
      expect(testnetToken.networkId).to.equal("bsc-testnet");
      expect(testnetToken.contractAddress).to.not.equal(BSC_MAINNET_LIORA_TOKEN_ADDRESS);
    });
  });

  // =========================================================================
  // 3. LIVE BSC MAINNET RPC DATA RETRIEVAL
  // =========================================================================
  describe("3. Live BSC Mainnet On-Chain Data Retrieval", function () {
    it("Should read authentic token metadata directly from BSC Mainnet (Chain ID 56)", async function () {
      const overview = await fetchMainnetTokenOverview();
      expect(overview).to.exist;
      expect(overview.name).to.equal("LIORA");
      expect(overview.symbol).to.equal("LIORA");
      expect(overview.decimals).to.equal(18);
      expect(overview.chainId).to.equal(56);
      expect(overview.address).to.equal("0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A");
    });

    it("Should retrieve the exact 100 Billion total supply from Mainnet", async function () {
      const overview = await fetchMainnetTokenOverview();
      const expectedCapWei = 100000000000n * 10n ** 18n; // 100 Billion
      expect(overview.totalSupplyRaw).to.equal(expectedCapWei);
      expect(overview.totalSupply).to.equal("100,000,000,000");
    });

    it("Should retrieve the exact 1 Billion Operating Treasury balance from Mainnet", async function () {
      const overview = await fetchMainnetTokenOverview();
      const expectedTreasuryWei = 1000000000n * 10n ** 18n; // 1 Billion
      expect(overview.treasuryBalanceRaw).to.equal(expectedTreasuryWei);
      expect(overview.treasuryBalance).to.equal("1,000,000,000");
      expect(overview.operatingTreasuryAddress.toLowerCase()).to.equal("0xd546c3263663c193447badf60741f3915b349064");
    });

    it("Should retrieve the exact 99 Billion Reserve Vault balance from Mainnet", async function () {
      const overview = await fetchMainnetTokenOverview();
      const expectedVaultWei = 99000000000n * 10n ** 18n; // 99 Billion
      expect(overview.reserveVaultBalanceRaw).to.equal(expectedVaultWei);
      expect(overview.reserveVaultBalance).to.equal("99,000,000,000");
      expect(overview.reserveVaultAddress.toLowerCase()).to.equal("0x244865302a1643702acb66181dbd898f714ef6e0");
    });

    it("Should query user LIORA balance from Mainnet and return 0.00 for arbitrary address", async function () {
      const arbitraryAddress = "0x0000000000000000000000000000000000000001";
      const balance = await fetchMainnetUserTokenBalance(arbitraryAddress);
      expect(balance).to.exist;
      expect(balance.raw).to.equal(0n);
      expect(balance.formatted).to.equal("0.00");
    });
  });

  // =========================================================================
  // 4. FINANCIAL TRANSACTION GUARDRAIL ENFORCEMENT
  // =========================================================================
  describe("4. Security Guardrails & Transaction Blockades", function () {
    it("Should block Mainnet settlement execution in server-side persistent store", function () {
      const result = SettlementPersistentStore.enforceSandboxRestrictions({ chainId: 56 });
      expect(result.permitted).to.be.false;
      expect(result.error).to.include("MAINNET_SETTLEMENT_PROHIBITED");
    });

    it("Should block real fiat payouts in server-side persistent store", function () {
      const result = SettlementPersistentStore.enforceSandboxRestrictions({
        chainId: 97,
        action: "REAL_FIAT_PAYOUT",
      });
      expect(result.permitted).to.be.false;
      expect(result.error).to.include("ACTION_PROHIBITED_IN_SANDBOX");
    });

    it("Should recognize BSC Mainnet treasury address while distinguishing testnet treasury", function () {
      expect(AUTHORIZED_TREASURY_WALLET).to.equal("0xd546c3263663c193447badf60741f3915b349064");
      expect(treasuryAccounting.isAuthorizedTreasuryWallet(BSC_MAINNET_TREASURY_WALLET)).to.be.true;
      expect(treasuryAccounting.isAuthorizedTreasuryWallet(BSC_TESTNET_TREASURY_WALLET)).to.be.true;
      expect(treasuryAccounting.isAuthorizedTreasuryWallet("0x1111111111111111111111111111111111111111")).to.be.false;
    });

    it("Should maintain preview banner message reflecting BSC Mainnet live status", function () {
      expect(PREVIEW_CONFIG.previewBadgeText).to.include("BSC Mainnet Verified");
      expect(PREVIEW_CONFIG.previewBannerMessage).to.include("BSC MAINNET LIVE");
      expect(PREVIEW_CONFIG.previewBannerMessage).to.include("read-only mode");
    });
  });

  // =========================================================================
  // 5. PRODUCTION ISOLATION INVARIANTS (TESTNET EXCLUSION)
  // =========================================================================
  describe("5. Production Isolation Invariants (Testnet Exclusion)", function () {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalSandboxFlag = process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX;

    afterEach(function () {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalSandboxFlag !== undefined) {
        process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX = originalSandboxFlag;
      } else {
        delete process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX;
      }
    });

    it("Should exclude testnet sandbox in production environment", function () {
      delete process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX;
      process.env.NODE_ENV = "production";
      expect(isTestnetSandboxEnabled()).to.be.false;
      expect(isProductionWebsite()).to.be.true;
    });

    it("Should permit testnet sandbox only when explicit development flag is set", function () {
      process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX = "true";
      expect(isTestnetSandboxEnabled()).to.be.true;
      expect(isProductionWebsite()).to.be.false;
    });

    it("Should prohibit testnet settlement execution in production mode", function () {
      process.env.NODE_ENV = "production";
      const result = SettlementPersistentStore.enforceSandboxRestrictions({ chainId: 97 });
      expect(result.permitted).to.be.false;
      expect(result.error).to.include("TESTNET_EXECUTION_PROHIBITED_IN_PRODUCTION");
    });
  });
});
