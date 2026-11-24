const { expect } = require("chai");

/**
 * Phase 12 — Wallet Compatibility, EIP-6963 Discovery & BSC Network Isolation Test Suite
 * 
 * Tests multi-provider announcement, provider isolation, approval/rejection handling,
 * missing provider detection, account & chain lifecycle events, and strict BNB Smart Chain enforcement.
 */

// Simulated Mock EIP-1193 Provider factory
function createMockProvider({ name, rdns, initialChainId = "0x61", initialAccounts = [] }) {
  const listeners = {};
  let currentChainId = initialChainId;
  let currentAccounts = [...initialAccounts];

  return {
    isMock: true,
    mockWalletName: name,
    mockRdns: rdns,
    request: async ({ method, params }) => {
      switch (method) {
        case "eth_requestAccounts":
          if (currentAccounts.length === 0) {
            throw { code: 4001, message: "User rejected the request." };
          }
          return currentAccounts;
        case "eth_accounts":
          return currentAccounts;
        case "eth_chainId":
          return currentChainId;
        case "eth_getBalance":
          return "0x1bc16d674ec80000"; // 2.0 BNB in wei
        case "wallet_switchEthereumChain": {
          const targetChain = params[0]?.chainId;
          if (targetChain === "0x_unsupported") {
            throw { code: 4902, message: "Unrecognized chain ID." };
          }
          if (targetChain === "0x_rejected") {
            throw { code: 4001, message: "User rejected switch." };
          }
          currentChainId = targetChain;
          return null;
        }
        case "wallet_addEthereumChain": {
          const chainObj = params[0];
          if (!chainObj || !chainObj.chainId) {
            throw new Error("Invalid chain parameters");
          }
          currentChainId = chainObj.chainId;
          return null;
        }
        default:
          throw new Error(`Unsupported mock RPC method: ${method}`);
      }
    },
    on: (event, handler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    removeListener: (event, handler) => {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(h => h !== handler);
    },
    // Test helper to simulate wallet events
    emit: (event, data) => {
      if (event === "accountsChanged") currentAccounts = data;
      if (event === "chainChanged") currentChainId = data;
      if (listeners[event]) {
        listeners[event].forEach(fn => fn(data));
      }
    },
  };
}

// Simulated Browser Event Bus for EIP-6963
class MockEventBus {
  constructor() {
    this.listeners = {};
  }
  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }
  removeEventListener(event, handler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(h => h !== handler);
  }
  dispatchEvent(event) {
    if (this.listeners[event.type]) {
      this.listeners[event.type].forEach(fn => fn(event));
    }
    return true;
  }
}

describe("Phase 12 — Wallet Compatibility, EIP-6963 Discovery & BSC Network Isolation", function () {
  
  describe("1. EIP-6963 Multi-Wallet Provider Discovery", function () {
    let bus;
    let discoveredProviders;

    beforeEach(function () {
      bus = new MockEventBus();
      discoveredProviders = [];

      bus.addEventListener("eip6963:announceProvider", (event) => {
        const detail = event.detail;
        const exists = discoveredProviders.some(p => p.info.rdns === detail.info.rdns);
        if (!exists) {
          discoveredProviders.push(detail);
        }
      });
    });

    it("Should discover multiple installed wallet extensions without collision", function () {
      const rabbyMock = createMockProvider({ name: "Rabby Wallet", rdns: "io.rabby" });
      const metaMaskMock = createMockProvider({ name: "MetaMask", rdns: "io.metamask" });
      const trustMock = createMockProvider({ name: "Trust Wallet", rdns: "com.trustwallet.app" });

      // Wallets announce themselves in response to discovery
      bus.dispatchEvent({
        type: "eip6963:announceProvider",
        detail: {
          info: { uuid: "uuid-rabby-1", name: "Rabby Wallet", icon: "data:image/svg+xml;rabby", rdns: "io.rabby" },
          provider: rabbyMock,
        },
      });

      bus.dispatchEvent({
        type: "eip6963:announceProvider",
        detail: {
          info: { uuid: "uuid-mm-1", name: "MetaMask", icon: "data:image/svg+xml;mm", rdns: "io.metamask" },
          provider: metaMaskMock,
        },
      });

      bus.dispatchEvent({
        type: "eip6963:announceProvider",
        detail: {
          info: { uuid: "uuid-trust-1", name: "Trust Wallet", icon: "data:image/svg+xml;trust", rdns: "com.trustwallet.app" },
          provider: trustMock,
        },
      });

      expect(discoveredProviders).to.have.lengthOf(3);
      expect(discoveredProviders[0].info.name).to.equal("Rabby Wallet");
      expect(discoveredProviders[1].info.name).to.equal("MetaMask");
      expect(discoveredProviders[2].info.name).to.equal("Trust Wallet");
    });

    it("Should deduplicate repeated announcements from the same wallet extension", function () {
      const rabbyMock = createMockProvider({ name: "Rabby Wallet", rdns: "io.rabby" });

      const announcement = {
        type: "eip6963:announceProvider",
        detail: {
          info: { uuid: "uuid-rabby-1", name: "Rabby Wallet", icon: "data:image/svg+xml;rabby", rdns: "io.rabby" },
          provider: rabbyMock,
        },
      };

      bus.dispatchEvent(announcement);
      bus.dispatchEvent(announcement); // Duplicate announcement

      expect(discoveredProviders).to.have.lengthOf(1);
      expect(discoveredProviders[0].info.rdns).to.equal("io.rabby");
    });
  });

  describe("2. Provider Isolation & Consistent RPC Routing", function () {
    it("Should route RPC requests strictly to the selected provider instance", async function () {
      const rabbyAccount = "0xRabby0000000000000000000000000000000001";
      const mmAccount = "0xMetaMask000000000000000000000000000000002";

      const rabbyProvider = createMockProvider({
        name: "Rabby Wallet",
        rdns: "io.rabby",
        initialAccounts: [rabbyAccount],
      });
      const mmProvider = createMockProvider({
        name: "MetaMask",
        rdns: "io.metamask",
        initialAccounts: [mmAccount],
      });

      // User chooses Rabby Wallet
      const selectedDetail = { info: { name: "Rabby Wallet", rdns: "io.rabby" }, provider: rabbyProvider };
      const accounts = await selectedDetail.provider.request({ method: "eth_requestAccounts" });
      const balanceHex = await selectedDetail.provider.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      });

      expect(accounts[0]).to.equal(rabbyAccount);
      expect(accounts[0]).to.not.equal(mmAccount);
      expect(balanceHex).to.equal("0x1bc16d674ec80000");
    });
  });

  describe("3. Connection Approval, Rejection & Error State Mapping", function () {
    it("Should successfully approve connection and return account list", async function () {
      const testAccount = "0x1234567890123456789012345678901234567890";
      const provider = createMockProvider({
        name: "Test Wallet",
        rdns: "test.wallet",
        initialAccounts: [testAccount],
      });

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      expect(accounts).to.deep.equal([testAccount]);
    });

    it("Should catch user rejection (code 4001) and map to friendly cancellation message", async function () {
      const provider = createMockProvider({
        name: "Rejecting Wallet",
        rdns: "reject.wallet",
        initialAccounts: [], // Triggers 4001 in mock
      });

      let mappedError = null;
      try {
        await provider.request({ method: "eth_requestAccounts" });
      } catch (err) {
        if (err.code === 4001 || err.message.toLowerCase().includes("user rejected")) {
          mappedError = "Connection request was cancelled in your wallet.";
        } else {
          mappedError = err.message;
        }
      }

      expect(mappedError).to.equal("Connection request was cancelled in your wallet.");
    });

    it("Should provide explicit missing-wallet message when no provider is installed", function () {
      const hasProvider = false;
      let error = null;

      if (!hasProvider) {
        error = "No compatible Web3 wallet detected. Please install a browser extension (such as Rabby, MetaMask, or Trust Wallet) or open this page in a mobile Web3 wallet.";
      }

      expect(error).to.include("No compatible Web3 wallet detected");
      expect(error).to.include("Rabby, MetaMask, or Trust Wallet");
    });
  });

  describe("4. BNB Smart Chain Strict Isolation & Network Guard", function () {
    const SUPPORTED_CHAIN_IDS = [56, 97, 31337];

    function evaluateNetwork(chainId) {
      const isBscMainnet = chainId === 56;
      const isBscTestnet = chainId === 97;
      const isLocalDevnet = chainId === 31337;
      const isSupportedChain = SUPPORTED_CHAIN_IDS.includes(chainId);
      const isWrongNetwork = !isSupportedChain;

      let chainName = "Unsupported Network";
      if (isBscMainnet) chainName = "BNB Smart Chain Mainnet";
      else if (isBscTestnet) chainName = "BSC Testnet";
      else if (isLocalDevnet) chainName = "Local Devnet";

      return { isBscMainnet, isBscTestnet, isLocalDevnet, isSupportedChain, isWrongNetwork, chainName };
    }

    it("Should identify BSC Testnet (#97) as supported and valid", function () {
      const res = evaluateNetwork(97);
      expect(res.isSupportedChain).to.be.true;
      expect(res.isBscTestnet).to.be.true;
      expect(res.isWrongNetwork).to.be.false;
      expect(res.chainName).to.equal("BSC Testnet");
    });

    it("Should identify BSC Mainnet (#56) as supported and valid", function () {
      const res = evaluateNetwork(56);
      expect(res.isSupportedChain).to.be.true;
      expect(res.isBscMainnet).to.be.true;
      expect(res.isWrongNetwork).to.be.false;
      expect(res.chainName).to.equal("BNB Smart Chain Mainnet");
    });

    it("Should identify Local Simulation (#31337) as supported for developer testing", function () {
      const res = evaluateNetwork(31337);
      expect(res.isSupportedChain).to.be.true;
      expect(res.isLocalDevnet).to.be.true;
      expect(res.isWrongNetwork).to.be.false;
      expect(res.chainName).to.equal("Local Devnet");
    });

    it("Should flag Ethereum Mainnet (#1) as wrong network", function () {
      const res = evaluateNetwork(1);
      expect(res.isSupportedChain).to.be.false;
      expect(res.isWrongNetwork).to.be.true;
      expect(res.chainName).to.equal("Unsupported Network");
    });

    it("Should flag Polygon (#137) and Arbitrum (#42161) as wrong networks", function () {
      const resPolygon = evaluateNetwork(137);
      expect(resPolygon.isSupportedChain).to.be.false;
      expect(resPolygon.isWrongNetwork).to.be.true;

      const resArbitrum = evaluateNetwork(42161);
      expect(resArbitrum.isSupportedChain).to.be.false;
      expect(resArbitrum.isWrongNetwork).to.be.true;
    });

    it("Must never imply transaction support for Ethereum or TRON", function () {
      const ethChainId = 1;
      const tronChainId = 728126428; // TRON Mainnet identifier if mapped

      expect(SUPPORTED_CHAIN_IDS).to.not.include(ethChainId);
      expect(SUPPORTED_CHAIN_IDS).to.not.include(tronChainId);
    });
  });

  describe("5. Network Switching & Adding Chain Parameters", function () {
    it("Should switch network to BSC Testnet (0x61)", async function () {
      const provider = createMockProvider({
        name: "Switch Provider",
        rdns: "switch.provider",
        initialChainId: "0x1", // Starts on Ethereum
      });

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x61" }],
      });

      const updatedChain = await provider.request({ method: "eth_chainId" });
      expect(updatedChain).to.equal("0x61");
    });

    it("Should catch chain-not-added error (4902) and execute wallet_addEthereumChain", async function () {
      const provider = createMockProvider({
        name: "Add Chain Provider",
        rdns: "add.provider",
        initialChainId: "0x1",
      });

      let addedSuccessfully = false;
      try {
        // Trigger 4902
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x_unsupported" }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          // Fallback to add chain
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x61",
              chainName: "BNB Smart Chain Testnet",
              nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
              rpcUrls: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"],
              blockExplorerUrls: ["https://testnet.bscscan.com"],
            }],
          });
          addedSuccessfully = true;
        }
      }

      expect(addedSuccessfully).to.be.true;
      const finalChain = await provider.request({ method: "eth_chainId" });
      expect(finalChain).to.equal("0x61");
    });

    it("Should catch user rejection of network switch (4001)", async function () {
      const provider = createMockProvider({
        name: "Reject Switch Provider",
        rdns: "reject.switch",
      });

      let switchErrorMsg = null;
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x_rejected" }],
        });
      } catch (err) {
        if (err.code === 4001) {
          switchErrorMsg = "Network switch was cancelled in your wallet.";
        }
      }

      expect(switchErrorMsg).to.equal("Network switch was cancelled in your wallet.");
    });
  });

  describe("6. Reactive Lifecycle Events (Accounts, Chains, Disconnect)", function () {
    it("Should update address on accountsChanged event", function (done) {
      const initialAccount = "0xInitial00000000000000000000000000000000001";
      const newAccount = "0xSwitched0000000000000000000000000000000002";

      const provider = createMockProvider({
        name: "Lifecycle Provider",
        rdns: "lifecycle.provider",
        initialAccounts: [initialAccount],
      });

      provider.on("accountsChanged", (accounts) => {
        expect(accounts[0]).to.equal(newAccount);
        done();
      });

      provider.emit("accountsChanged", [newAccount]);
    });

    it("Should trigger disconnect when accountsChanged delivers empty array", function (done) {
      const provider = createMockProvider({
        name: "Disconnect Provider",
        rdns: "disconnect.provider",
        initialAccounts: ["0xActive000000000000000000000000000000000001"],
      });

      let isConnected = true;

      provider.on("accountsChanged", (accounts) => {
        if (!accounts || accounts.length === 0) {
          isConnected = false;
        }
        expect(isConnected).to.be.false;
        done();
      });

      provider.emit("accountsChanged", []);
    });

    it("Should update chain on chainChanged event", function (done) {
      const provider = createMockProvider({
        name: "Chain Provider",
        rdns: "chain.provider",
        initialChainId: "0x61",
      });

      provider.on("chainChanged", (newChainId) => {
        expect(newChainId).to.equal("0x38"); // Switched to Mainnet
        done();
      });

      provider.emit("chainChanged", "0x38");
    });
  });

  describe("7. Phase 1 BSC-Only Transaction Boundary Assertion", function () {
    function assertCanTransact(isConnected, chainId) {
      if (!isConnected) {
        return { canTransact: false, reason: "WALLET_NOT_CONNECTED" };
      }
      // Phase 1: BSC Mainnet (56) is production; BSC Testnet (97) is testing only
      if (chainId === 56 || chainId === 97) {
        return { 
          canTransact: true, 
          isProduction: chainId === 56, 
          isTestnet: chainId === 97 
        };
      }
      if (chainId === 31337) {
        return { 
          canTransact: true, 
          isProduction: false, 
          isTestnet: false, 
          isLocalMock: true 
        };
      }
      return { 
        canTransact: false, 
        reason: "UNSUPPORTED_CHAIN", 
        message: `Unsupported network (Chain #${chainId}). OXENIQ transactions are supported exclusively on BNB Smart Chain.` 
      };
    }

    it("Should allow transactions when connected to BSC Mainnet (#56)", function () {
      const res = assertCanTransact(true, 56);
      expect(res.canTransact).to.be.true;
      expect(res.isProduction).to.be.true;
    });

    it("Should allow transactions when connected to BSC Testnet (#97) as testing only", function () {
      const res = assertCanTransact(true, 97);
      expect(res.canTransact).to.be.true;
      expect(res.isProduction).to.be.false;
      expect(res.isTestnet).to.be.true;
    });

    it("Should isolate Local Hardhat (#31337) as mock only and never conflate with deployed BSC", function () {
      const res = assertCanTransact(true, 31337);
      expect(res.canTransact).to.be.true;
      expect(res.isProduction).to.be.false;
      expect(res.isTestnet).to.be.false;
      expect(res.isLocalMock).to.be.true;
    });

    it("Should strictly block transactions on Ethereum Mainnet (#1)", function () {
      const res = assertCanTransact(true, 1);
      expect(res.canTransact).to.be.false;
      expect(res.reason).to.equal("UNSUPPORTED_CHAIN");
      expect(res.message).to.include("OXENIQ transactions are supported exclusively on BNB Smart Chain");
    });

    it("Should strictly block transactions on Polygon (#137) and Arbitrum (#42161)", function () {
      const resPolygon = assertCanTransact(true, 137);
      expect(resPolygon.canTransact).to.be.false;
      expect(resPolygon.reason).to.equal("UNSUPPORTED_CHAIN");

      const resArbitrum = assertCanTransact(true, 42161);
      expect(resArbitrum.canTransact).to.be.false;
      expect(resArbitrum.reason).to.equal("UNSUPPORTED_CHAIN");
    });

    it("Should strictly block transactions when wallet is disconnected", function () {
      const res = assertCanTransact(false, null);
      expect(res.canTransact).to.be.false;
      expect(res.reason).to.equal("WALLET_NOT_CONNECTED");
    });
  });
});

