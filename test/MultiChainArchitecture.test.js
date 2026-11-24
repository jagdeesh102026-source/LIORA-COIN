const { expect } = require("chai");

// Activate zero-dependency TypeScript loader for production modules
require("./helpers/tsLoader");

const {
  BLOCKCHAIN_REGISTRY,
  CHAIN_AWARE_TOKENS,
  getChainConfig,
  getChainConfigByChainId,
  getEnabledChains,
  getAllChains,
  isChainEnabled,
  assertChainEnabled,
  UnsupportedChainError,
  parseTokenUnits,
  formatTokenUnits
} = require("../apps/web/src/lib/chains/blockchainRegistry.ts");

const {
  validateEvmAddress,
  validateTronAddress,
  validateBitcoinAddress,
  validateAddressForNetwork,
  normalizeAddressForNetwork
} = require("../apps/web/src/lib/chains/addressValidator.ts");

const {
  BscChainAdapter,
  defaultBscAdapter
} = require("../apps/web/src/lib/chains/bscAdapter.ts");

describe("LIORA COIN — Multi-Chain Architecture & Readiness Suite", function () {

  // =========================================================================
  // JOURNEY A: Central Blockchain Registry & Fail-Closed Feature Flags
  // =========================================================================
  describe("Journey A: Central Blockchain Registry & Fail-Closed Feature Flags", function () {
    it("Should confirm BSC Testnet (#97) is ENABLED for sandbox testing", function () {
      const bscTestnet = getChainConfig("bsc-testnet");
      expect(bscTestnet).to.not.be.null;
      expect(bscTestnet.enabled).to.be.true;
      expect(bscTestnet.status).to.equal("TESTING_ONLY");
      expect(bscTestnet.family).to.equal("EVM");
      expect(bscTestnet.chainId).to.equal(97);
      expect(bscTestnet.features.tokenTransfers).to.be.true;
    });

    it("Should confirm BSC Mainnet (#56) is strictly DISABLED until approved", function () {
      const bscMainnet = getChainConfig("bsc-mainnet");
      expect(bscMainnet).to.not.be.null;
      expect(bscMainnet.enabled).to.be.false;
      expect(bscMainnet.status).to.equal("DISABLED_UNTIL_APPROVED");
      expect(bscMainnet.family).to.equal("EVM");
      expect(bscMainnet.chainId).to.equal(56);
      expect(bscMainnet.features.tokenTransfers).to.be.false;
    });

    it("Should confirm Polygon, TRON, and Bitcoin networks are strictly DISABLED", function () {
      const futureChains = [
        "polygon-mainnet",
        "polygon-amoy",
        "tron-mainnet",
        "tron-shasta",
        "bitcoin-mainnet",
        "bitcoin-testnet"
      ];

      for (const netId of futureChains) {
        const config = getChainConfig(netId);
        expect(config, `Network ${netId} should exist in registry`).to.not.be.null;
        expect(config.enabled, `Network ${netId} must be disabled`).to.be.false;
        expect(config.status).to.equal("DISABLED_FUTURE_PHASE");
        expect(config.features.smartContracts).to.be.false;
        expect(config.features.tokenTransfers).to.be.false;
        expect(isChainEnabled(netId)).to.be.false;
      }
    });

    it("Should throw UnsupportedChainError when asserting disabled networks", function () {
      expect(() => assertChainEnabled("polygon-mainnet")).to.throw(UnsupportedChainError);
      expect(() => assertChainEnabled("tron-mainnet")).to.throw(UnsupportedChainError);
      expect(() => assertChainEnabled("bitcoin-mainnet")).to.throw(UnsupportedChainError);
      expect(() => assertChainEnabled("bsc-mainnet")).to.throw(UnsupportedChainError);

      // BSC Testnet must succeed
      const active = assertChainEnabled("bsc-testnet");
      expect(active.networkId).to.equal("bsc-testnet");
    });

    it("Should lookup network configurations by EVM chainId correctly", function () {
      const bscTest = getChainConfigByChainId(97);
      expect(bscTest.networkId).to.equal("bsc-testnet");

      const bscMain = getChainConfigByChainId(56);
      expect(bscMain.networkId).to.equal("bsc-mainnet");

      const polygon = getChainConfigByChainId(137);
      expect(polygon.networkId).to.equal("polygon-mainnet");

      // Bitcoin has no numeric chain ID
      const btc = getChainConfig("bitcoin-mainnet");
      expect(btc.chainId).to.be.null;
    });
  });

  // =========================================================================
  // JOURNEY B: Checksum-Aware, Chain-Specific Address Validation
  // =========================================================================
  describe("Journey B: Checksum-Aware, Chain-Specific Address Validation", function () {
    const validEvmAddress = "0x71C8409E51E2063f1fF764B8c06F7e8EA9f2309c";
    const validTronAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // Official TRON Tether contract
    const validBtcP2pkh = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"; // Bitcoin Genesis P2PKH
    const validBtcP2sh = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"; // Bitcoin P2SH
    const validBtcBech32 = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"; // Bitcoin Native SegWit Bech32

    it("Should validate EVM addresses and normalize to lowercase", function () {
      expect(validateEvmAddress(validEvmAddress)).to.be.true;
      expect(validateEvmAddress(validEvmAddress.toLowerCase())).to.be.true;

      // Reject non-hex or malformed EVM addresses
      expect(validateEvmAddress("0xZZZZ409E51E2063f1fF764B8c06F7e8EA9f2309c")).to.be.false;
      expect(validateEvmAddress("0x1234")).to.be.false;
      expect(validateEvmAddress(validTronAddress)).to.be.false;

      const norm = normalizeAddressForNetwork(validEvmAddress, "bsc-testnet");
      expect(norm).to.equal(validEvmAddress.toLowerCase());
    });

    it("Should validate TRON Base58Check addresses and STRICTLY PRESERVE CASE", function () {
      expect(validateTronAddress(validTronAddress)).to.be.true;

      // CRITICAL: Lowercasing a TRON address invalidates the Base58 checksum
      const lowercasedTron = validTronAddress.toLowerCase();
      expect(validateTronAddress(lowercasedTron)).to.be.false;

      // Normalization MUST preserve exact case
      const norm = normalizeAddressForNetwork(validTronAddress, "tron-mainnet");
      expect(norm).to.equal(validTronAddress);
      expect(norm).to.not.equal(lowercasedTron);

      // Reject EVM or Bitcoin addresses on TRON
      expect(validateTronAddress(validEvmAddress)).to.be.false;
      expect(validateTronAddress(validBtcP2pkh)).to.be.false;
    });

    it("Should validate Bitcoin P2PKH, P2SH, and Bech32 addresses", function () {
      expect(validateBitcoinAddress(validBtcP2pkh)).to.be.true;
      expect(validateBitcoinAddress(validBtcP2sh)).to.be.true;
      expect(validateBitcoinAddress(validBtcBech32)).to.be.true;

      // Reject invalid or cross-chain addresses on Bitcoin
      expect(validateBitcoinAddress(validEvmAddress)).to.be.false;
      expect(validateBitcoinAddress(validTronAddress)).to.be.false;
      expect(validateBitcoinAddress("invalid_bitcoin_string")).to.be.false;
    });

    it("Should reject cross-chain address confusion via validateAddressForNetwork", function () {
      // EVM address submitted to TRON network
      const evmOnTron = validateAddressForNetwork(validEvmAddress, "tron-mainnet");
      expect(evmOnTron.valid).to.be.false;
      expect(evmOnTron.error).to.include("Invalid TRON address");

      // TRON address submitted to BSC network
      const tronOnBsc = validateAddressForNetwork(validTronAddress, "bsc-testnet");
      expect(tronOnBsc.valid).to.be.false;
      expect(tronOnBsc.error).to.include("Invalid EVM address");

      // Bitcoin address submitted to Polygon network
      const btcOnPolygon = validateAddressForNetwork(validBtcBech32, "polygon-mainnet");
      expect(btcOnPolygon.valid).to.be.false;
      expect(btcOnPolygon.error).to.include("Invalid EVM address");
    });
  });

  // =========================================================================
  // JOURNEY C: Multi-Chain Token Registry & Decimal Precision Handling
  // =========================================================================
  describe("Journey C: Multi-Chain Token Registry & Decimal Precision Handling", function () {
    it("Should record accurate token decimals per blockchain standard", function () {
      // BSC Tokens (18 decimals)
      const bscLiora = CHAIN_AWARE_TOKENS["bsc:liora"];
      expect(bscLiora.decimals).to.equal(18);
      expect(bscLiora.standard).to.equal("BEP-20");

      const bscUsdt = CHAIN_AWARE_TOKENS["bsc:usdt"];
      expect(bscUsdt.decimals).to.equal(18);
      expect(bscUsdt.standard).to.equal("BEP-20");

      // Polygon USDT (6 decimals - NOT 18)
      const polyUsdt = CHAIN_AWARE_TOKENS["polygon:usdt"];
      expect(polyUsdt.decimals).to.equal(6);
      expect(polyUsdt.standard).to.equal("ERC-20");

      // TRON USDT (6 decimals - NOT 18)
      const tronUsdt = CHAIN_AWARE_TOKENS["tron:usdt"];
      expect(tronUsdt.decimals).to.equal(6);
      expect(tronUsdt.standard).to.equal("TRC-20");

      // Bitcoin BTC (8 decimals - Satoshis)
      const btcNative = CHAIN_AWARE_TOKENS["btc:native"];
      expect(btcNative.decimals).to.equal(8);
      expect(btcNative.standard).to.equal("NATIVE_UTXO");
    });

    it("Should accurately parse and format arbitrary token units without floating-point drift", function () {
      // 6 decimals: 1.5 USDT -> 1,500,000 units
      const units6 = parseTokenUnits("1.5", 6);
      expect(units6).to.equal(1500000n);
      expect(formatTokenUnits(units6, 6)).to.equal("1.500000");

      // 18 decimals: 1.5 LIORA -> 1,500,000,000,000,000,000 units
      const units18 = parseTokenUnits("1.5", 18);
      expect(units18).to.equal(1500000000000000000n);
      expect(formatTokenUnits(units18, 18)).to.equal("1.500000000000000000");

      // 8 decimals: 0.0005 BTC -> 50,000 Satoshis
      const units8 = parseTokenUnits("0.0005", 8);
      expect(units8).to.equal(50000n);
      expect(formatTokenUnits(units8, 8)).to.equal("0.00050000");
    });
  });

  // =========================================================================
  // JOURNEY D: BSC Chain Adapter Functionality & Fee Estimation
  // =========================================================================
  describe("Journey D: BSC Chain Adapter Functionality & Fee Estimation", function () {
    it("Should instantiate BscChainAdapter and validate addresses", function () {
      const adapter = new BscChainAdapter("bsc-testnet");
      expect(adapter.networkId).to.equal("bsc-testnet");
      expect(adapter.family).to.equal("EVM");

      const validAddr = "0x71c8409e51e2063f1ff764b8c06f7e8ea9f2309c";
      expect(adapter.validateAddress(validAddr)).to.be.true;
      expect(adapter.normalizeAddress(validAddr)).to.equal(validAddr);
      expect(adapter.formatDisplayAddress(validAddr)).to.equal("0x71c8...309c");
    });

    it("Should estimate fees in native BNB with 18 decimals", async function () {
      const adapter = defaultBscAdapter;
      const feeRes = await adapter.estimateFee({
        toAddress: "0x71c8409e51e2063f1ff764b8c06f7e8ea9f2309c",
        amount: "100"
      });

      expect(feeRes.networkId).to.equal("bsc-testnet");
      expect(feeRes.feeAssetSymbol).to.equal("BNB");
      expect(feeRes.feeAssetDecimals).to.equal(18);
      expect(parseFloat(feeRes.feeAmount)).to.be.greaterThan(0);
    });

    it("Should verify transaction status for valid BSC transaction hash", async function () {
      const adapter = defaultBscAdapter;
      const txHash = "0x" + "a".repeat(64);
      const status = await adapter.getTransactionStatus(txHash);

      expect(status.txHash).to.equal(txHash);
      expect(status.confirmed).to.be.true;
      expect(status.confirmations).to.be.greaterThan(0);
      expect(status.failed).to.be.false;
    });

    it("Should reject operations on disabled BSC Mainnet adapter", async function () {
      const mainnetAdapter = new BscChainAdapter("bsc-mainnet");
      try {
        await mainnetAdapter.getBalance("0x71c8409e51e2063f1ff764b8c06f7e8ea9f2309c");
        expect.fail("Should have thrown UnsupportedChainError");
      } catch (err) {
        expect(err).to.be.instanceOf(UnsupportedChainError);
      }
    });
  });
});
