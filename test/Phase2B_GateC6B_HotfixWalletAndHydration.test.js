const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

// Register TypeScript loader
require("./helpers/tsLoader");

// Import wallet helper
const {
  detectWalletProviderMeta,
  resolveEip1193Provider,
  validateProviderForBscTestnet,
  classifyWalletError,
  UnsupportedWalletProviderError,
} = require("../apps/web/src/lib/dex/walletProviderHelper.ts");

describe("LIORA COIN — Gate C6B Hotfix: Hydration Mismatch & Wallet Approval Hardening", function () {
  describe("1. Hydration Mismatch Guardrails & Initial Render Identity", function () {
    const headerPath = path.join(__dirname, "..", "apps", "web", "src", "components", "Header.tsx");
    const useDemoStorePath = path.join(__dirname, "..", "apps", "web", "src", "lib", "demo", "useDemoStore.ts");

    it("Should guard activeUser in useDemoStore with isClientReady to ensure SSR / initial client equality", function () {
      const code = fs.readFileSync(useDemoStorePath, "utf8");
      expect(code).to.include("const activeUser = isClientReady ? demoStore.getActiveUser() : null;");
      expect(code).to.include("setIsClientReady(true);");
    });

    it("Should guard Header Logo and navigation links with client mount state to prevent hydration mismatches", function () {
      const code = fs.readFileSync(headerPath, "utf8");
      expect(code).to.include("const [mounted, setMounted] = useState(false);");
      expect(code).to.include("setMounted(true);");
      expect(code).to.include("const isUserAuthenticated = mounted && Boolean(activeUser);");
      expect(code).to.include("<Logo size=\"md\" href={isUserAuthenticated ? '/dashboard' : '/auth'} />");
    });

    it("Should ensure initial server and client render produce href='/auth' when unmounted", function () {
      const code = fs.readFileSync(headerPath, "utf8");
      // Initially mounted is false on both server and initial client render
      // Therefore isUserAuthenticated is false on both, producing href='/auth'
      expect(code).to.not.include("<Logo size=\"md\" href={activeUser ? '/dashboard' : '/auth'} />");
    });
  });

  describe("2. Wallet Provider Conflict & TronLink Detection", function () {
    it("Should accurately identify TronLink provider flags", function () {
      const mockTronLink = {
        isTronLink: true,
        request: async () => {},
      };
      const meta = detectWalletProviderMeta(mockTronLink);
      expect(meta.isTronLink).to.be.true;
      expect(meta.isMetaMask).to.be.false;
      expect(meta.displayName).to.equal("TronLink");
    });

    it("Should accurately identify standard MetaMask provider flags", function () {
      const mockMetaMask = {
        isMetaMask: true,
        isTronLink: false,
        request: async () => {},
      };
      const meta = detectWalletProviderMeta(mockMetaMask);
      expect(meta.isTronLink).to.be.false;
      expect(meta.isMetaMask).to.be.true;
      expect(meta.displayName).to.equal("MetaMask");
    });

    it("Should prioritize MetaMask over TronLink when multiple injected providers exist in window.ethereum.providers", function () {
      const mockTron = { isTronLink: true, request: async () => "tron" };
      const mockMM = { isMetaMask: true, request: async () => "mm" };

      // Simulate browser with both extensions installed
      const globalWindow = {
        ethereum: {
          providers: [mockTron, mockMM],
        },
      };

      // Mock global window
      const prevWindow = global.window;
      global.window = globalWindow;

      try {
        const resolved = resolveEip1193Provider();
        expect(resolved).to.equal(mockMM);
        expect(resolved.isMetaMask).to.be.true;
        expect(resolved.isTronLink).to.be.undefined;
      } finally {
        global.window = prevWindow;
      }
    });

    it("Should strictly throw UnsupportedWalletProviderError when TronLink is validated on BSC Testnet", function () {
      const mockTron = { isTronLink: true, request: async () => {} };
      expect(() => validateProviderForBscTestnet(mockTron)).to.throw(UnsupportedWalletProviderError);
      try {
        validateProviderForBscTestnet(mockTron);
      } catch (err) {
        expect(err.message).to.include("TronLink is a TRON-only wallet");
        expect(err.message).to.include("BNB Smart Chain Testnet (Chain ID 97)");
        expect(err.message).to.include("MetaMask");
      }
    });

    it("Should accept valid EVM provider for BSC Testnet without throwing", function () {
      const mockEVM = { isMetaMask: true, request: async () => {} };
      expect(() => validateProviderForBscTestnet(mockEVM)).to.not.throw();
    });
  });

  describe("3. Robust Wallet & RPC Error Classification", function () {
    it("Should classify user cancellation / signature rejection safely", function () {
      const rejectionError = { code: 4001, message: "User rejected the request." };
      const msg = classifyWalletError(rejectionError);
      expect(msg).to.equal("Transaction signature request was cancelled in your wallet.");
    });

    it("Should classify action rejected with custom reason", function () {
      const err = { message: "User denied transaction signature" };
      const msg = classifyWalletError(err);
      expect(msg).to.equal("Transaction signature request was cancelled in your wallet.");
    });

    it("Should classify TronLink incompatibility error", function () {
      const err = new UnsupportedWalletProviderError(
        "TronLink",
        "TronLink is a TRON-only wallet and does not support EVM smart contract transactions on BNB Smart Chain Testnet (Chain ID 97)."
      );
      const msg = classifyWalletError(err);
      expect(msg).to.include("TronLink is a TRON-only wallet");
    });

    it("Should classify insufficient gas error safely", function () {
      const err = { message: "insufficient funds for gas * price + value: balance 0, tx cost 1000000" };
      const msg = classifyWalletError(err);
      expect(msg).to.include("Insufficient tBNB balance to pay for network gas on BSC Testnet");
    });

    it("Should classify chain ID / network mismatch error", function () {
      const err = { code: 4902, message: "Unrecognized chain ID" };
      const msg = classifyWalletError(err);
      expect(msg).to.include("Your wallet is not connected to BNB Smart Chain Testnet");
    });

    it("Should classify RPC connection failure", function () {
      const err = { code: -32000, message: "network error: failed to fetch" };
      const msg = classifyWalletError(err);
      expect(msg).to.include("RPC network communication failed on BSC Testnet");
    });

    it("Should classify contract revert safely without leaking internal memory", function () {
      const err = { message: "execution reverted: TRANSFER_FAILED" };
      const msg = classifyWalletError(err);
      expect(msg).to.include("Contract execution reverted on-chain");
    });
  });

  describe("4. Approval State Safety & Zero Auto-Retry Invariants", function () {
    const hookPath = path.join(__dirname, "..", "apps", "web", "src", "hooks", "useDexOnChainSwap.ts");

    it("Should ensure approveToken always resets isApproving in finally block", function () {
      const code = fs.readFileSync(hookPath, "utf8");
      expect(code).to.include("setIsApproving(true);");
      expect(code).to.include("finally {\n      setIsApproving(false);\n    }");
    });

    it("Should ensure executeSwap always resets isSwapping in finally block", function () {
      const code = fs.readFileSync(hookPath, "utf8");
      expect(code).to.include("setIsSwapping(true);");
      expect(code).to.include("finally {\n      setIsSwapping(false);\n    }");
    });

    it("Should verify approveToken and executeSwap do not contain recursive auto-retry logic", function () {
      const code = fs.readFileSync(hookPath, "utf8");
      // Must not call approveToken inside catch block of approveToken
      const approveCatchMatch = code.match(/catch\s*\(err:\s*any\)\s*\{[\s\S]*?return false;/);
      expect(approveCatchMatch).to.exist;
      expect(approveCatchMatch[0]).to.not.include("approveToken(");
      expect(approveCatchMatch[0]).to.not.include("executeSwap(");
    });

    it("Should verify gas balance guard is active before broadcasting transactions", function () {
      const code = fs.readFileSync(hookPath, "utf8");
      expect(code).to.include("parseFloat(balances.bnbFormatted) <= 0.0001");
      expect(code).to.include("Insufficient tBNB balance to pay for transaction gas on BSC Testnet");
    });
  });
});
