const { expect } = require("chai");
const path = require("path");
const fs = require("fs");

// Activate zero-dependency TypeScript loader for production modules
require("./helpers/tsLoader");

const React = require("../apps/web/node_modules/react");
const ReactDOMServer = require("../apps/web/node_modules/react-dom/server");

// Provide minimal global browser stubs for static server-side rendering
if (typeof global.window === "undefined") {
  global.window = {};
}

// 1. Direct imports of the shared production TypeScript modules
const {
  parseBnbInput,
  validateBnbBalance,
  validateSaleInventory,
  getPurchaseButtonState,
} = require("../apps/web/src/lib/purchase/purchaseLogic.ts");

const {
  validatePurchaseReceiptEvents,
} = require("../apps/web/src/lib/contracts/receiptValidation.ts");

const {
  Web3WalletContext,
} = require("../apps/web/src/context/Web3WalletContext.tsx");

const {
  TestnetPurchaseTerminal,
} = require("../apps/web/src/components/TestnetPurchaseTerminal.tsx");

const {
  createMockPurchaseLog,
  createMockTransferLog,
} = require("./helpers/receiptValidator");

const viemPath = path.resolve(__dirname, "../apps/web/node_modules/viem");
const { parseEther } = require(viemPath);

describe("Phase 17 — Production-Connected Frontend Test Coverage", function () {
  const configuredSaleAddress = "0x48c25fb4027CDeCB68bf616A4717e5692AbfbDE8";
  const connectedBuyerAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";
  const intendedRecipientAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";

  // =========================================================================
  // SECTION 1: DIRECT UNIT TESTING OF SHARED PRODUCTION MODULES
  // =========================================================================
  describe("1. Shared Production Module — parseBnbInput", function () {
    it("Should reject empty, whitespace, and non-numeric inputs", function () {
      expect(parseBnbInput("").isBnbValid).to.be.false;
      expect(parseBnbInput("   ").isBnbValid).to.be.false;
      expect(parseBnbInput("abc").isBnbValid).to.be.false;
      expect(parseBnbInput("NaN").isBnbValid).to.be.false;
      expect(parseBnbInput("0x12").isBnbValid).to.be.false;
    });

    it("Should reject zero and negative payment amounts", function () {
      expect(parseBnbInput("0").isBnbValid).to.be.false;
      expect(parseBnbInput("0.0").isBnbValid).to.be.false;
      expect(parseBnbInput("-1").isBnbValid).to.be.false;
      expect(parseBnbInput("-0.01").isBnbValid).to.be.false;
    });

    it("Should reject scientific notation inputs with format error", function () {
      const res = parseBnbInput("1e-5");
      expect(res.isBnbValid).to.be.false;
      expect(res.parseError).to.equal("Invalid BNB amount format");
    });

    it("Should reject sub-wei fractional amounts (< 1 wei) without throwing", function () {
      const res = parseBnbInput("0.0000000000000000001"); // 10^-19 BNB (< 1 wei)
      expect(res.isBnbValid).to.be.false;
      expect(res.bnbWei).to.equal(0n);
    });

    it("Should accurately parse standard test amounts and calculate exact integer delivery", function () {
      const res01 = parseBnbInput("0.01", 10000);
      expect(res01.isBnbValid).to.be.true;
      expect(res01.bnbWei).to.equal(parseEther("0.01"));
      expect(res01.calculatedTokensWei).to.equal(parseEther("100"));

      // Dynamic rate verification
      const resRate5k = parseBnbInput("0.01", 5000);
      expect(resRate5k.calculatedTokensWei).to.equal(parseEther("50"));
    });
  });

  describe("2. Shared Production Module — validateBnbBalance & validateSaleInventory", function () {
    it("Should validate buyer wallet balance boundaries correctly", function () {
      const bnbWei = parseEther("0.01");

      // Sufficient
      expect(validateBnbBalance(bnbWei, "0.05").hasSufficientBalance).to.be.true;
      // Exact balance
      expect(validateBnbBalance(bnbWei, "0.01").hasSufficientBalance).to.be.true;
      // Insufficient
      const insufficient = validateBnbBalance(bnbWei, "0.005");
      expect(insufficient.hasSufficientBalance).to.be.false;
      expect(insufficient.error).to.equal("Insufficient tBNB Balance");
      // Null balance (fallback to on-chain check)
      expect(validateBnbBalance(bnbWei, null).hasSufficientBalance).to.be.true;
    });

    it("Should validate sale contract inventory boundaries correctly", function () {
      const deliveryWei = parseEther("100");

      // Sufficient
      expect(validateSaleInventory(deliveryWei, parseEther("1000")).isInventorySufficient).to.be.true;
      // Exact inventory
      expect(validateSaleInventory(deliveryWei, parseEther("100")).isInventorySufficient).to.be.true;
      // Zero inventory (exhausted)
      const exhausted = validateSaleInventory(deliveryWei, 0n);
      expect(exhausted.isInventorySufficient).to.be.false;
      expect(exhausted.error).to.equal("Test Inventory Exhausted (Awaiting Funding)");
      // Exceeds inventory
      const exceeded = validateSaleInventory(deliveryWei, parseEther("50"));
      expect(exceeded.isInventorySufficient).to.be.false;
      expect(exceeded.error).to.equal("Exceeds Available Test Inventory");
    });
  });

  describe("3. Shared Production Module — getPurchaseButtonState", function () {
    const baseParams = {
      isSaleConfigured: true,
      isConnected: true,
      isBscTestnet: true,
      isContractPaused: false,
      isBnbValid: true,
      bnbWei: parseEther("0.01"),
      calculatedTokensWei: parseEther("100"),
      parseError: null,
      availableInventory: parseEther("1000"),
      userBnbBalance: "0.5",
      bnbAmount: "0.01",
      txStatus: "idle",
    };

    it("Should lock button when sale contract is unconfigured", function () {
      const state = getPurchaseButtonState({ ...baseParams, isSaleConfigured: false });
      expect(state.disabled).to.be.true;
      expect(state.label).to.equal("Checkout Staged — Awaiting Sale Deployment");
      expect(state.actionType).to.equal("none");
    });

    it("Should route to connect when wallet is disconnected", function () {
      const state = getPurchaseButtonState({ ...baseParams, isConnected: false });
      expect(state.disabled).to.be.false;
      expect(state.label).to.equal("Connect Testnet Wallet");
      expect(state.actionType).to.equal("connect");
    });

    it("Should route to switch network when wrong network (or BSC Mainnet #56) is active", function () {
      const state = getPurchaseButtonState({ ...baseParams, isBscTestnet: false });
      expect(state.disabled).to.be.false;
      expect(state.label).to.equal("Switch to BSC Testnet (Chain #97)");
      expect(state.actionType).to.equal("switchToBscTestnet");
    });

    it("Should lock button when sale contract is paused", function () {
      const state = getPurchaseButtonState({ ...baseParams, isContractPaused: true });
      expect(state.disabled).to.be.true;
      expect(state.label).to.equal("Sale Contract Paused (Circuit Breaker)");
    });

    it("Should lock button and prevent double-clicks during broadcasting and confirming", function () {
      const broadcasting = getPurchaseButtonState({ ...baseParams, txStatus: "broadcasting" });
      expect(broadcasting.disabled).to.be.true;
      expect(broadcasting.label).to.equal("Awaiting Wallet Approval...");
      expect(broadcasting.actionType).to.equal("none");

      const confirming = getPurchaseButtonState({ ...baseParams, txStatus: "confirming" });
      expect(confirming.disabled).to.be.true;
      expect(confirming.label).to.equal("Confirming On-Chain...");
      expect(confirming.actionType).to.equal("none");
    });

    it("Should enable purchase when all parameters are valid", function () {
      const state = getPurchaseButtonState(baseParams);
      expect(state.disabled).to.be.false;
      expect(state.label).to.equal("Purchase with Test BNB (0.01 tBNB)");
      expect(state.actionType).to.equal("purchase");
    });
  });

  describe("4. Shared Production Module — validatePurchaseReceiptEvents", function () {
    it("Should validate successful on-chain purchase receipt using production implementation", function () {
      const purchaseLog = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: connectedBuyerAddress,
        recipient: intendedRecipientAddress,
        bnbPaid: parseEther("0.01"),
        tokensDelivered: parseEther("100"),
      });
      const transferLog = createMockTransferLog({
        from: configuredSaleAddress,
        to: intendedRecipientAddress,
        value: parseEther("100"),
      });

      const receipt = { status: "success", logs: [transferLog, purchaseLog] };
      const res = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: parseEther("0.01"),
        expectedTokensDeliveredWei: parseEther("100"),
      });

      expect(res.isValid).to.be.true;
      expect(res.event.bnbPaid).to.equal(parseEther("0.01"));
      expect(res.event.tokensDelivered).to.equal(parseEther("100"));
    });

    it("Should reject reverted receipts using production implementation", function () {
      const receipt = { status: "reverted", logs: [] };
      const res = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: parseEther("0.01"),
        expectedTokensDeliveredWei: parseEther("100"),
      });

      expect(res.isValid).to.be.false;
      expect(res.error).to.include("Reverted transaction");
    });
  });

  // =========================================================================
  // SECTION 2: RENDERED COMPONENT MARKUP VERIFICATION (LIGHTWEIGHT SSR)
  // =========================================================================
  describe("5. Rendered Component Markup Verification (<TestnetPurchaseTerminal />)", function () {
    /**
     * NOTE ON TESTING LIMITATION:
     * Static markup rendering verifies the actual rendered HTML, element attributes (e.g. disabled=""),
     * and visible labels output by the React component. It does NOT claim to test interactive browser
     * events (e.g. user clicks or dynamic React state updates), which are tested via the pure state
     * machines in Section 1 and provider mocks.
     */
    const defaultMockContext = {
      isConnected: false,
      address: null,
      chainId: null,
      chainName: "Unknown Network",
      balance: null,
      isConnecting: false,
      error: null,
      isBscTestnet: false,
      isBscMainnet: false,
      isLocalDevnet: false,
      isSupportedChain: false,
      isWrongNetwork: false,
      activeWalletInfo: null,
      discoveredProviders: [],
      connect: async () => false,
      disconnect: () => {},
      switchToBscTestnet: async () => false,
      switchToBscMainnet: async () => false,
      switchNetwork: async () => false,
      clearError: () => {},
      assertBscTransactionReady: () => ({ ready: false }),
    };

    function renderTerminalWithContext(contextOverrides = {}) {
      const contextValue = { ...defaultMockContext, ...contextOverrides };
      const tree = React.createElement(
        Web3WalletContext.Provider,
        { value: contextValue },
        React.createElement(TestnetPurchaseTerminal, null)
      );
      return ReactDOMServer.renderToStaticMarkup(tree);
    }

    it("Should render 'Connect Testnet Wallet' button in markup when disconnected", function () {
      const html = renderTerminalWithContext({ isConnected: false });

      expect(html).to.include("Connect Testnet Wallet");
      expect(html).to.include("BSC Testnet #97");
      expect(html).to.include("Strict Testnet Sandbox Only — Zero Monetary Value");
      expect(html).to.include("Fixed test price: <strong>1 tBNB = 10,000 OXENIQ</strong>");

      // Verify the button element is rendered without disabled attribute
      const buttonMatches = html.match(/<button[^>]*>.*?Connect Testnet Wallet.*?<\/button>/s);
      expect(buttonMatches).to.not.be.null;
      // Connect button must NOT be disabled
      expect(buttonMatches[0]).to.not.include('disabled=""');
    });

    it("Should render 'Switch to BSC Testnet (Chain #97)' in markup when BSC Mainnet (#56) is connected", function () {
      const html = renderTerminalWithContext({
        isConnected: true,
        address: "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E",
        chainId: 56,
        chainName: "BNB Smart Chain Mainnet",
        isBscTestnet: false,
        isBscMainnet: true,
        isSupportedChain: true,
      });

      expect(html).to.include("Switch to BSC Testnet (Chain #97)");
      const buttonMatches = html.match(/<button[^>]*>.*?Switch to BSC Testnet.*?<\/button>/s);
      expect(buttonMatches).to.not.be.null;
      expect(buttonMatches[0]).to.not.include('disabled=""');
    });

    it("Should render preset tBNB amount selection chips in component markup", function () {
      const html = renderTerminalWithContext();

      expect(html).to.include("0.001 tBNB");
      expect(html).to.include("0.005 tBNB");
      expect(html).to.include("0.01 tBNB");
      expect(html).to.include("0.05 tBNB");
      expect(html).to.include("0.1 tBNB");
    });
  });
});
