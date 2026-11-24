const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

// Register TypeScript loader
require("./helpers/tsLoader");

// Import wallet helper
const {
  LIORA_WALLET_STORAGE_KEY,
  detectWalletProviderMeta,
  getPersistedWalletPreference,
  setPersistedWalletPreference,
  clearPersistedWalletPreference,
  findMatchingEvmProvider,
  resolveEip1193Provider,
  validateProviderForBscTestnet,
  classifyWalletError,
  UnsupportedWalletProviderError,
} = require("../apps/web/src/lib/dex/walletProviderHelper.ts");

describe("LIORA COIN — Gate C7B Hotfix: Wallet Provider Persistence & Multi-Wallet Isolation", function () {
  let mockStorage = {};

  beforeEach(function () {
    mockStorage = {};
    global.window = {
      localStorage: {
        getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
        setItem: (key, val) => {
          mockStorage[key] = String(val);
        },
        removeItem: (key) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
      },
    };
  });

  afterEach(function () {
    delete global.window;
  });

  describe("1. LocalStorage Preference Persistence & Round-Trip", function () {
    it("Should use the canonical storage key 'liora_selected_wallet_provider'", function () {
      expect(LIORA_WALLET_STORAGE_KEY).to.equal("liora_selected_wallet_provider");
    });

    it("Should return null when storage is empty", function () {
      expect(getPersistedWalletPreference()).to.be.null;
    });

    it("Should successfully save and retrieve a MetaMask preference", function () {
      const pref = {
        rdns: "io.metamask",
        name: "MetaMask",
        uuid: "meta-mask-uuid-1234",
        account: "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD",
        connectedAt: Date.now(),
      };

      setPersistedWalletPreference(pref);
      const retrieved = getPersistedWalletPreference();

      expect(retrieved).to.not.be.null;
      expect(retrieved.rdns).to.equal("io.metamask");
      expect(retrieved.name).to.equal("MetaMask");
      expect(retrieved.account).to.equal("0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD");
    });

    it("Should safely clear the persisted preference upon disconnect", function () {
      setPersistedWalletPreference({ name: "MetaMask", rdns: "io.metamask" });
      expect(getPersistedWalletPreference()).to.not.be.null;

      clearPersistedWalletPreference();
      expect(getPersistedWalletPreference()).to.be.null;
      expect(mockStorage[LIORA_WALLET_STORAGE_KEY]).to.be.undefined;
    });

    it("Should handle corrupted JSON in localStorage gracefully without throwing", function () {
      mockStorage[LIORA_WALLET_STORAGE_KEY] = "{ corrupt_json: ";
      expect(getPersistedWalletPreference()).to.be.null;
    });
  });

  describe("2. Provider Discovery & Matching (EIP-6963 & Multi-Provider)", function () {
    const mockMetaMaskProvider = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === "eth_accounts") return ["0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD"];
        if (method === "eth_chainId") return "0x61"; // 97
        return null;
      },
    };

    const mockRabbyProvider = {
      isRabby: true,
      request: async ({ method }) => {
        if (method === "eth_accounts") return ["0x1111111111111111111111111111111111111111"];
        if (method === "eth_chainId") return "0x61";
        return null;
      },
    };

    const mockTronLinkProvider = {
      isTronLink: true,
      isTron: true,
      request: async ({ method }) => {
        if (method === "eth_accounts") return ["0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350"];
        return null;
      },
    };

    it("Should match MetaMask from EIP-6963 announced providers when preference specifies rdns 'io.metamask'", function () {
      const discovered = [
        {
          info: { uuid: "mm-uuid", name: "MetaMask", rdns: "io.metamask", icon: "" },
          provider: mockMetaMaskProvider,
        },
        {
          info: { uuid: "rabby-uuid", name: "Rabby", rdns: "io.rabby", icon: "" },
          provider: mockRabbyProvider,
        },
      ];

      const matched = findMatchingEvmProvider({ rdns: "io.metamask", name: "MetaMask" }, discovered);
      expect(matched).to.not.be.null;
      expect(matched.source).to.equal("EIP6963");
      expect(matched.provider).to.equal(mockMetaMaskProvider);
      expect(matched.info.name).to.equal("MetaMask");
    });

    it("Should match MetaMask from window.ethereum.providers array when EIP-6963 is absent", function () {
      const injectedEthereum = {
        providers: [mockTronLinkProvider, mockMetaMaskProvider],
      };

      const matched = findMatchingEvmProvider(
        { rdns: "io.metamask", name: "MetaMask" },
        [],
        injectedEthereum
      );

      expect(matched).to.not.be.null;
      expect(matched.source).to.equal("PROVIDERS_ARRAY");
      expect(matched.provider).to.equal(mockMetaMaskProvider);
      expect(matched.info.name).to.equal("MetaMask");
    });

    it("Should match single window.ethereum fallback when provider is MetaMask", function () {
      const matched = findMatchingEvmProvider(
        { name: "MetaMask" },
        [],
        mockMetaMaskProvider
      );

      expect(matched).to.not.be.null;
      expect(matched.source).to.equal("INJECTED_ETHEREUM");
      expect(matched.provider).to.equal(mockMetaMaskProvider);
    });
  });

  describe("3. Strict TronLink Rejection & Hijack Prevention", function () {
    const mockTronLinkProvider = {
      isTronLink: true,
      isTron: true,
      request: async ({ method }) => {
        if (method === "eth_accounts") return ["0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350"];
        return null;
      },
    };

    it("Should never match TronLink even if preference mistakenly names TronLink", function () {
      const discovered = [
        {
          info: { uuid: "tron-uuid", name: "TronLink", rdns: "org.tronlink", icon: "" },
          provider: mockTronLinkProvider,
        },
      ];

      const matched = findMatchingEvmProvider({ name: "TronLink" }, discovered, mockTronLinkProvider);
      expect(matched).to.be.null;
    });

    it("Should return null instead of silently falling back to TronLink when TronLink is the only provider", function () {
      // Simulate page refresh where user had MetaMask, but on this browser window only TronLink is injected
      const pref = {
        name: "MetaMask",
        rdns: "io.metamask",
        account: "0xf28D702684cA539cCeBd69ba8be30d35d9ca12aD",
      };

      const matched = findMatchingEvmProvider(pref, [], mockTronLinkProvider);
      // Must NOT return TronLink!
      expect(matched).to.be.null;
    });

    it("Should throw UnsupportedWalletProviderError when TronLink is passed to validateProviderForBscTestnet", function () {
      expect(() => validateProviderForBscTestnet(mockTronLinkProvider)).to.throw(
        UnsupportedWalletProviderError
      );
    });

    it("Should filter out TronLink in resolveEip1193Provider when activeProvider has TronLink flags", function () {
      const mockMetaMask = { isMetaMask: true, request: async () => {} };
      global.window.ethereum = {
        providers: [mockTronLinkProvider, mockMetaMask],
      };

      const resolved = resolveEip1193Provider(mockTronLinkProvider);
      expect(resolved).to.equal(mockMetaMask);
      expect(resolved.isMetaMask).to.be.true;
    });
  });

  describe("4. Live Execution Pre-Flight Validation", function () {
    it("Should classify unsupported TronLink wallet with clear guidance", function () {
      const err = new UnsupportedWalletProviderError("TronLink", "TronLink is a TRON-only wallet.");
      const msg = classifyWalletError(err);
      expect(msg).to.include("TronLink");
    });

    it("Should classify user rejection errors cleanly", function () {
      const err = { code: 4001, message: "User rejected the request." };
      const msg = classifyWalletError(err);
      expect(msg).to.equal("Transaction signature request was cancelled in your wallet.");
    });

    it("Should classify gas / chain estimation errors without exposing private details", function () {
      const err = { message: "insufficient funds for gas * price + value" };
      const msg = classifyWalletError(err);
      expect(msg).to.include("Insufficient tBNB balance");
    });
  });

  describe("5. Codebase & Hook Integration Invariants", function () {
    const contextPath = path.join(__dirname, "..", "apps", "web", "src", "context", "Web3WalletContext.tsx");
    const liquidityHookPath = path.join(__dirname, "..", "apps", "web", "src", "hooks", "useDexOnChainLiquidity.ts");
    const swapHookPath = path.join(__dirname, "..", "apps", "web", "src", "hooks", "useDexOnChainSwap.ts");
    const dashboardPath = path.join(__dirname, "..", "apps", "web", "src", "components", "exchange", "LioraLiquidityDashboard.tsx");

    it("Web3WalletContext must store provider preference to localStorage on connect()", function () {
      const code = fs.readFileSync(contextPath, "utf8");
      expect(code).to.include("setPersistedWalletPreference(");
      expect(code).to.include("clearPersistedWalletPreference()");
      expect(code).to.include("getPersistedWalletPreference()");
    });

    it("Web3WalletContext must guard localStorage reading with isClientReady hydration guard", function () {
      const code = fs.readFileSync(contextPath, "utf8");
      expect(code).to.include("const [isClientReady, setIsClientReady] = useState<boolean>(false);");
      expect(code).to.include("if (!isClientReady || typeof window === 'undefined') return;");
    });

    it("Web3WalletContext must use passive eth_accounts on silent refresh rather than eth_requestAccounts", function () {
      const code = fs.readFileSync(contextPath, "utf8");
      expect(code).to.include("await match.provider.request({ method: 'eth_accounts' })");
      expect(code).to.not.include("await match.provider.request({ method: 'eth_requestAccounts' }) // on silent refresh");
    });

    it("useDexOnChainLiquidity must immediately clear stale position on address change", function () {
      const code = fs.readFileSync(liquidityHookPath, "utf8");
      expect(code).to.include("setPosition(null);");
      expect(code).to.include("setPendingTxHash(null);");
      expect(code).to.include("clearActionError();");
    });

    it("useDexOnChainLiquidity must verify provider, live account, and chainId 97 before transaction execution", function () {
      const code = fs.readFileSync(liquidityHookPath, "utf8");
      expect(code).to.include("verifyExecutionPrerequisites");
      expect(code).to.include("currentAccount.toLowerCase() !== address.toLowerCase()");
      expect(code).to.include("currentChain !== 97");
    });

    it("useDexOnChainSwap must immediately clear balances on address change", function () {
      const code = fs.readFileSync(swapHookPath, "utf8");
      expect(code).to.include("setBalances(null);");
      expect(code).to.include("setPendingTxHash(null);");
      expect(code).to.include("clearErrors();");
    });

    it("LioraLiquidityDashboard must render the connected EVM provider badge and shortened address", function () {
      const code = fs.readFileSync(dashboardPath, "utf8");
      expect(code).to.include("walletName");
      expect(code).to.include("activeWalletInfo");
      expect(code).to.include("<span>{walletName || 'MetaMask'}: {address.slice(0, 6)}...{address.slice(-4)}</span>");
    });
  });
});
