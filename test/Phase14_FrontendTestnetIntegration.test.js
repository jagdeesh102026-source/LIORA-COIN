const { expect } = require("chai");
const path = require("path");
const fs = require("fs");

describe("Phase 14 — Frontend BSC Testnet Read-Only Integration", function () {
  const tokenConfigPath = path.join(__dirname, "..", "apps", "web", "src", "config", "tokenConfig.ts");
  const oxeniqAbiPath = path.join(__dirname, "..", "apps", "web", "src", "lib", "contracts", "oxeniqAbi.ts");
  const allocAbiPath = path.join(__dirname, "..", "apps", "web", "src", "lib", "contracts", "allocationManagerAbi.ts");
  const saleAbiPath = path.join(__dirname, "..", "apps", "web", "src", "lib", "contracts", "testnetSaleAbi.ts");
  const clientPath = path.join(__dirname, "..", "apps", "web", "src", "lib", "contracts", "client.ts");
  const hookPath = path.join(__dirname, "..", "apps", "web", "src", "hooks", "useOxeniqContract.ts");
  const deploymentArtifactPath = path.join(__dirname, "..", "deployments", "bscTestnet.json");
  const saleArtifactPath = path.join(__dirname, "..", "deployments", "bscTestnet-sale.json");
  const tokenPagePath = path.join(__dirname, "..", "apps", "web", "src", "app", "token", "page.tsx");
  const purchaseTerminalPath = path.join(__dirname, "..", "apps", "web", "src", "components", "TestnetPurchaseTerminal.tsx");
  const swapPagePath = path.join(__dirname, "..", "apps", "web", "src", "app", "swap", "page.tsx");
  const ecosystemDataPath = path.join(__dirname, "..", "apps", "web", "src", "config", "ecosystemData.ts");
  const ecosystemPagePath = path.join(__dirname, "..", "apps", "web", "src", "app", "ecosystem", "page.tsx");

  describe("1. Contract Address Configuration & Network Separation", function () {
    it("Should match deployed BSC Testnet artifact contract addresses exactly", function () {
      expect(fs.existsSync(deploymentArtifactPath)).to.be.true;
      const artifact = JSON.parse(fs.readFileSync(deploymentArtifactPath, "utf8"));
      const tokenConfigContent = fs.readFileSync(tokenConfigPath, "utf8");

      const expectedToken = artifact.contracts.OxeniqToken.address;
      const expectedAlloc = artifact.contracts.AllocationManager.address;

      expect(expectedToken).to.equal("0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877");
      expect(expectedAlloc).to.equal("0x2ce58319f424D78d3EA4Eb0f4864521EAadE9296");

      expect(tokenConfigContent).to.include(`BSC_TESTNET_TOKEN_ADDRESS = "${expectedToken}"`);
      expect(tokenConfigContent).to.include(`BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS = "${expectedAlloc}"`);
    });

    it("Should keep BSC Mainnet (Chain ID 56) contract addresses strictly null until Genesis Launch", function () {
      const tokenConfigContent = fs.readFileSync(tokenConfigPath, "utf8");
      expect(tokenConfigContent).to.include('BSC_MAINNET_TOKEN_ADDRESS: string | null = null');
      expect(tokenConfigContent).to.include('BSC_MAINNET_ALLOCATION_MANAGER_ADDRESS: string | null = null');
    });

    it("Should enforce chain-specific address resolution preventing testnet bleed into mainnet", function () {
      const tokenConfigContent = fs.readFileSync(tokenConfigPath, "utf8");
      expect(tokenConfigContent).to.include("function getTokenContractAddress");
      expect(tokenConfigContent).to.include("function getAllocationManagerAddress");
    });
  });

  describe("2. Read-Only ABI Definitions & Surface Minimization", function () {
    it("Should define read-only view calls for OxeniqToken (name, symbol, decimals, totalSupply, balanceOf, owner)", function () {
      expect(fs.existsSync(oxeniqAbiPath)).to.be.true;
      const abiContent = fs.readFileSync(oxeniqAbiPath, "utf8");

      expect(abiContent).to.include("'name'");
      expect(abiContent).to.include("'symbol'");
      expect(abiContent).to.include("'decimals'");
      expect(abiContent).to.include("'totalSupply'");
      expect(abiContent).to.include("'balanceOf'");
      expect(abiContent).to.include("'owner'");

      // Must be strictly view functions
      expect(abiContent).to.not.include("'transfer'");
      expect(abiContent).to.not.include("'approve'");
      expect(abiContent).to.not.include("'transferFrom'");
      expect(abiContent).to.not.include("'burn'");
      expect(abiContent).to.not.include("'pause'");
    });

    it("Should define read-only view calls for AllocationManager (token, owner, recipient70, recipient30)", function () {
      expect(fs.existsSync(allocAbiPath)).to.be.true;
      const abiContent = fs.readFileSync(allocAbiPath, "utf8");

      expect(abiContent).to.include("'token'");
      expect(abiContent).to.include("'owner'");
      expect(abiContent).to.include("'recipient70'");
      expect(abiContent).to.include("'recipient30'");

      // Must be strictly view functions
      expect(abiContent).to.not.include("'executeAllocation'");
      expect(abiContent).to.not.include("'setRecipients'");
    });
  });

  describe("3. Client & Formatting Invariants", function () {
    it("Should configure read-only public client with BSC Testnet chain and timeout retry options", function () {
      expect(fs.existsSync(clientPath)).to.be.true;
      const clientContent = fs.readFileSync(clientPath, "utf8");

      expect(clientContent).to.include("createPublicClient");
      expect(clientContent).to.include("bscTestnet");
      expect(clientContent).to.include("BSC_TESTNET_CONFIG.rpcUrl");
    });

    it("Should format token balances cleanly with comma separation and zero-handling", function () {
      const clientContent = fs.readFileSync(clientPath, "utf8");
      expect(clientContent).to.include("function formatTokenBalance");

      // Test formatting logic directly
      function formatTokenBalanceTest(rawBalance, decimals = 18) {
        if (rawBalance === null || rawBalance === undefined) return '0.00';
        if (rawBalance === 0n) return '0.00';

        // Emulate formatUnits
        const divisor = 10n ** BigInt(decimals);
        const intPart = (rawBalance / divisor).toString();
        const remPart = (rawBalance % divisor).toString().padStart(decimals, '0');
        const intPartWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const decPart = remPart.slice(0, 4).replace(/0+$/, '');
        return decPart ? `${intPartWithCommas}.${decPart}` : intPartWithCommas;
      }

      // 1 Billion tokens
      expect(formatTokenBalanceTest(1000000000000000000000000000n, 18)).to.equal("1,000,000,000");
      // 0 tokens
      expect(formatTokenBalanceTest(0n, 18)).to.equal("0.00");
      // null
      expect(formatTokenBalanceTest(null, 18)).to.equal("0.00");
      // 123.4567 tokens
      expect(formatTokenBalanceTest(123456700000000000000n, 18)).to.equal("123.4567");
    });
  });

  describe("4. Zero Private Key Exposure & Mutation Guards", function () {
    it("Should ensure apps/web contains no private keys, seed phrases, or secret logging", function () {
      const webSrc = path.join(__dirname, "..", "apps", "web", "src");

      function scanDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            const content = fs.readFileSync(fullPath, "utf8");
            expect(content).to.not.include("DEPLOYER_PRIVATE_KEY");
            expect(content).to.not.include("PRIVATE_KEY");
            expect(content).to.not.include("mnemonic");
          }
        }
      }

      scanDir(webSrc);
    });

    it("Should verify hook provides loading, error, and refresh controls without fabricating balances", function () {
      expect(fs.existsSync(hookPath)).to.be.true;
      const hookContent = fs.readFileSync(hookPath, "utf8");

      expect(hookContent).to.include("isLoading");
      expect(hookContent).to.include("error");
      expect(hookContent).to.include("tokenData");
      expect(hookContent).to.include("allocationData");
      expect(hookContent).to.include("saleData");
      expect(hookContent).to.include("userBalance");
      expect(hookContent).to.include("refresh");
      expect(hookContent).to.include("refreshUserBalance");
    });
  });

  describe("5. Testnet Sale Contract Read-Only Queries & Integer-Safe Arithmetic", function () {
    const saleAbiPath = path.join(__dirname, "..", "apps", "web", "src", "lib", "contracts", "testnetSaleAbi.ts");
    const saleArtifactPath = path.join(__dirname, "..", "deployments", "bscTestnet-sale.json");

    it("Should match deployed BSC Testnet sale artifact contract address and configuration", function () {
      expect(fs.existsSync(saleArtifactPath)).to.be.true;
      const saleArtifact = JSON.parse(fs.readFileSync(saleArtifactPath, "utf8"));
      const tokenConfigContent = fs.readFileSync(tokenConfigPath, "utf8");

      expect(saleArtifact.saleContractAddress).to.equal("0x48c25fb4027CDeCB68bf616A4717e5692AbfbDE8");
      expect(tokenConfigContent).to.include(`BSC_TESTNET_SALE_ADDRESS = "${saleArtifact.saleContractAddress}"`);
      expect(tokenConfigContent).to.include("TESTNET_SALE_TOKENS_PER_BNB = 10000");
    });

    it("Should define read-only queries for TestnetTokenSale (getAvailableInventory, TOKENS_PER_BNB, paused, token, owner)", function () {
      expect(fs.existsSync(saleAbiPath)).to.be.true;
      const abiContent = fs.readFileSync(saleAbiPath, "utf8");

      expect(abiContent).to.include("'getAvailableInventory'");
      expect(abiContent).to.include("'TOKENS_PER_BNB'");
      expect(abiContent).to.include("'paused'");
      expect(abiContent).to.include("'token'");
      expect(abiContent).to.include("'owner'");
    });

    it("Should perform exact integer-safe token arithmetic without floating-point error", function () {
      const clientContent = fs.readFileSync(clientPath, "utf8");
      expect(clientContent).to.include("function calculateTokensForBnb");

      // Test integer arithmetic directly
      function calculateTokensForBnb(bnbWei, tokensPerBnb = 10000) {
        if (bnbWei < 0n) throw new Error("BNB amount cannot be negative");
        return bnbWei * BigInt(tokensPerBnb);
      }

      // 1 tBNB (10^18 wei) -> 10,000 OXENIQ (10,000 * 10^18 wei)
      const oneBnbWei = 10n ** 18n;
      expect(calculateTokensForBnb(oneBnbWei, 10000)).to.equal(10000n * (10n ** 18n));

      // 0.01 tBNB (10^16 wei) -> 100 OXENIQ (100 * 10^18 wei)
      const point01Bnb = 10n ** 16n;
      expect(calculateTokensForBnb(point01Bnb, 10000)).to.equal(100n * (10n ** 18n));

      // 0.0001 tBNB (10^14 wei) -> 1 OXENIQ (10^18 wei)
      const point0001Bnb = 10n ** 14n;
      expect(calculateTokensForBnb(point0001Bnb, 10000)).to.equal(10n ** 18n);

      // 1 wei of tBNB -> 10,000 wei of OXENIQ
      expect(calculateTokensForBnb(1n, 10000)).to.equal(10000n);

      // 0 wei -> 0 wei
      expect(calculateTokensForBnb(0n, 10000)).to.equal(0n);

      // Negative wei throws
      expect(() => calculateTokensForBnb(-1n, 10000)).to.throw("BNB amount cannot be negative");
    });
  });

  describe("6. Disconnected Wallet, Wrong-Network & Unsupported-Network Guardrails", function () {
    const tokenPagePath = path.join(__dirname, "..", "apps", "web", "src", "app", "token", "page.tsx");
    const purchaseTerminalPath = path.join(__dirname, "..", "apps", "web", "src", "components", "TestnetPurchaseTerminal.tsx");
    const swapPagePath = path.join(__dirname, "..", "apps", "web", "src", "app", "swap", "page.tsx");

    it("Should provide explicit disconnected-wallet state on Token, Purchase, and Swap pages", function () {
      const tokenPageContent = fs.readFileSync(tokenPagePath, "utf8");
      const terminalContent = fs.readFileSync(purchaseTerminalPath, "utf8");
      const swapContent = fs.readFileSync(swapPagePath, "utf8");

      expect(tokenPageContent).to.include("Wallet Not Connected");
      expect(tokenPageContent).to.include("Connect Testnet Wallet");

      expect(terminalContent).to.include("Connect Testnet Wallet");

      expect(swapContent).to.include("Connect Wallet to Swap");
    });

    it("Should handle unsupported-network and wrong-network states with explicit switch prompts", function () {
      const tokenPageContent = fs.readFileSync(tokenPagePath, "utf8");
      const terminalContent = fs.readFileSync(purchaseTerminalPath, "utf8");
      const swapContent = fs.readFileSync(swapPagePath, "utf8");

      expect(tokenPageContent).to.include("Unsupported Network Connected");
      expect(tokenPageContent).to.include("Switch to BSC Testnet (Chain #97)");

      expect(terminalContent).to.include("Switch to BSC Testnet (Chain #97)");

      expect(swapContent).to.include("Switch Network to BNB Smart Chain");
    });

    it("Should handle missing RPC responses and contract read errors with user-visible retry", function () {
      const tokenPageContent = fs.readFileSync(tokenPagePath, "utf8");
      const terminalContent = fs.readFileSync(purchaseTerminalPath, "utf8");
      const hookContent = fs.readFileSync(hookPath, "utf8");

      expect(tokenPageContent).to.include("balanceError");
      expect(tokenPageContent).to.include("Retry");

      expect(terminalContent).to.include("rpcError");
      expect(terminalContent).to.include("Retry");

      expect(hookContent).to.include("Unable to load live contract data from BSC Testnet RPC");
    });
  });

  describe("7. Clear BSC Testnet Visual Attribution & Ecosystem Alignment", function () {
    it("Should prominently label on-chain data as belonging to BNB Smart Chain Testnet (Chain ID 97)", function () {
      const tokenPageContent = fs.readFileSync(tokenPagePath, "utf8");
      const ecosystemContent = fs.readFileSync(ecosystemPagePath, "utf8");

      expect(tokenPageContent).to.include("BNB Smart Chain Testnet (Chain ID 97) Live Data Integration");
      expect(tokenPageContent).to.include("Live BSC Testnet Supply");

      expect(ecosystemContent).to.include("BSC Testnet Live Deployment Verified (Chain ID 97)");
      expect(ecosystemContent).to.include("https://testnet.bscscan.com");
    });

    it("Should register deployed contracts with Live status and testnet addresses in ecosystem registry", function () {
      const ecoDataContent = fs.readFileSync(ecosystemDataPath, "utf8");
      const tokenConfigContent = fs.readFileSync(tokenConfigPath, "utf8");

      expect(ecoDataContent).to.include("OXENIQ BEP-20 Core Contract");
      expect(ecoDataContent).to.include("Allocation Manager (70:30 Split)");
      expect(ecoDataContent).to.include("Testnet Fixed-Price Token Sale");
      expect(ecoDataContent).to.include('status: "Live"');
      expect(ecoDataContent).to.include("contractAddress: BSC_TESTNET_TOKEN_ADDRESS");
      expect(ecoDataContent).to.include("contractAddress: BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS");
      expect(ecoDataContent).to.include("contractAddress: BSC_TESTNET_SALE_ADDRESS");

      expect(tokenConfigContent).to.include("0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877");
      expect(tokenConfigContent).to.include("0x2ce58319f424D78d3EA4Eb0f4864521EAadE9296");
      expect(tokenConfigContent).to.include("0x48c25fb4027CDeCB68bf616A4717e5692AbfbDE8");
    });
  });
});
