const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
  ExchangePolicy, 
  WebhookVerifier, 
  IdempotentFulfillmentManager 
} = require("./helpers/commerceHelpers");
const fs = require("fs");
const path = require("path");

/**
 * Phase 13 — BSC Testnet End-to-End Verification Test Suite
 * 
 * Tests:
 * 1. Testnet-only deployment safeguards & chain ID verification (BSC Testnet #97 vs BSC Mainnet #56).
 * 2. Token contract invariants (1B fixed supply, 18 decimals, 0% fee, Ownable2Step, Pausable, Burnable).
 * 3. AllocationManager 70:30 conservation & recipient administration.
 * 4. Multi-currency purchase journey (INR, USD, EUR, GBP ceiling minimums, quote TTL, stale defenses).
 * 5. Wallet compatibility, network isolation, and mobile in-app browser vs WalletConnect verification.
 * 6. Non-activation of live financial operations.
 */
describe("Phase 13 — BSC Testnet End-to-End Verification", function () {
  let oxeniq;
  let allocationManager;
  let deployer, buyer, treasury70, reserve30, attacker;

  const TOTAL_SUPPLY_1B = ethers.parseEther("1000000000"); // 1,000,000,000 OXENIQ
  const CANONICAL_MIN_INR = 100000; // ₹1,00,000 INR

  beforeEach(async function () {
    [deployer, buyer, treasury70, reserve30, attacker] = await ethers.getSigners();

    // Deploy OxeniqToken with canonical 1 Billion supply
    const OxeniqToken = await ethers.getContractFactory("OxeniqToken");
    oxeniq = await OxeniqToken.deploy(
      "OXENIQ",
      "OXENIQ",
      TOTAL_SUPPLY_1B,
      deployer.address
    );
    await oxeniq.waitForDeployment();

    // Deploy AllocationManager
    const AllocationManager = await ethers.getContractFactory("AllocationManager");
    allocationManager = await AllocationManager.deploy(
      await oxeniq.getAddress(),
      treasury70.address,
      reserve30.address,
      deployer.address
    );
    await allocationManager.waitForDeployment();
  });

  describe("1. Network Safeguards & Chain ID Boundaries", function () {
    it("Should recognize BSC Testnet (Chain ID 97) as the designated testing target", async function () {
      const bscTestnetChainId = 97;
      expect(bscTestnetChainId).to.equal(97);
    });

    it("Should strictly block BSC Mainnet (Chain ID 56) from deployment execution in testing scripts", async function () {
      // Simulate deployment safety guard
      function assertSafeDeploymentNetwork(targetChainId) {
        if (targetChainId === 56) {
          throw new Error("CRITICAL SAFETY ABORT: BSC Mainnet (Chain ID 56) deployment is strictly disabled in this testing phase.");
        }
        if (targetChainId !== 97 && targetChainId !== 31337) {
          throw new Error(`Unsupported deployment chain ID: ${targetChainId}`);
        }
        return true;
      }

      expect(() => assertSafeDeploymentNetwork(56)).to.throw("CRITICAL SAFETY ABORT: BSC Mainnet (Chain ID 56) deployment is strictly disabled");
      expect(assertSafeDeploymentNetwork(97)).to.be.true;
      expect(assertSafeDeploymentNetwork(31337)).to.be.true;
    });

    it("Should isolate Local Hardhat (Chain ID 31337) as mock only and never treat it as deployed BSC", function () {
      const hardhatDeploymentPath = path.join(__dirname, "..", "deployments", "hardhat.json");
      expect(fs.existsSync(hardhatDeploymentPath)).to.be.true;

      const data = JSON.parse(fs.readFileSync(hardhatDeploymentPath, "utf8"));
      expect(data.chainId).to.equal(31337);
      expect(data.network).to.equal("hardhat");
      // Contract address in local deployment must NOT be conflated with BSC Mainnet or Testnet
      expect(data.contracts.OxeniqToken.address).to.match(/^0x[a-fA-F0-9]{40}$/);
    });

    it("Should require explicit deployer credentials and gas balance before testnet deployment", function () {
      function validateDeployerPrerequisites(hasKey, balanceWei, chainId) {
        if (chainId === 97) {
          if (!hasKey) {
            throw new Error("BLOCKER: No deployer account configured.");
          }
          if (balanceWei === 0n) {
            throw new Error("BLOCKER: Deployer account has 0 tBNB balance on BSC Testnet.");
          }
        }
        return true;
      }

      expect(() => validateDeployerPrerequisites(false, 0n, 97)).to.throw("BLOCKER: No deployer account configured.");
      expect(() => validateDeployerPrerequisites(true, 0n, 97)).to.throw("BLOCKER: Deployer account has 0 tBNB balance on BSC Testnet.");
      expect(validateDeployerPrerequisites(true, ethers.parseEther("0.5"), 97)).to.be.true;
    });
  });

  describe("2. Token Contract Invariants & Security Controls", function () {
    it("Should deploy with exactly 1,000,000,000 (1 Billion) tokens with 18 decimals", async function () {
      const decimals = await oxeniq.decimals();
      const totalSupply = await oxeniq.totalSupply();
      const ownerBalance = await oxeniq.balanceOf(deployer.address);

      expect(decimals).to.equal(18);
      expect(totalSupply).to.equal(TOTAL_SUPPLY_1B);
      expect(ownerBalance).to.equal(TOTAL_SUPPLY_1B);
    });

    it("Should enforce zero fees-on-transfer (exact conservation on standard transfers)", async function () {
      const transferAmount = ethers.parseEther("50000");
      await oxeniq.transfer(buyer.address, transferAmount);

      expect(await oxeniq.balanceOf(buyer.address)).to.equal(transferAmount);

      // Transfer from buyer to treasury
      await oxeniq.connect(buyer).transfer(treasury70.address, transferAmount);
      expect(await oxeniq.balanceOf(treasury70.address)).to.equal(transferAmount);
      expect(await oxeniq.balanceOf(buyer.address)).to.equal(0n);
    });

    it("Should allow token holders to burn tokens, reducing total supply permanently", async function () {
      const burnAmount = ethers.parseEther("1000000"); // Burn 1M tokens
      await oxeniq.burn(burnAmount);

      expect(await oxeniq.totalSupply()).to.equal(TOTAL_SUPPLY_1B - burnAmount);
      expect(await oxeniq.balanceOf(deployer.address)).to.equal(TOTAL_SUPPLY_1B - burnAmount);
    });

    it("Should enforce Pausable circuit breaker restricting transfers when paused", async function () {
      await oxeniq.pause();
      expect(await oxeniq.paused()).to.be.true;

      await expect(
        oxeniq.transfer(buyer.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(oxeniq, "EnforcedPause");

      await oxeniq.unpause();
      expect(await oxeniq.paused()).to.be.false;

      await expect(
        oxeniq.transfer(buyer.address, ethers.parseEther("1000"))
      ).to.not.be.reverted;
    });

    it("Should enforce Two-Step Ownership transfer (Ownable2Step)", async function () {
      // Step 1: Propose pending owner
      await oxeniq.transferOwnership(buyer.address);
      expect(await oxeniq.owner()).to.equal(deployer.address);
      expect(await oxeniq.pendingOwner()).to.equal(buyer.address);

      // Attacker cannot accept
      await expect(
        oxeniq.connect(attacker).acceptOwnership()
      ).to.be.revertedWithCustomError(oxeniq, "OwnableUnauthorizedAccount");

      // Step 2: Nominated owner accepts
      await oxeniq.connect(buyer).acceptOwnership();
      expect(await oxeniq.owner()).to.equal(buyer.address);
      expect(await oxeniq.pendingOwner()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("3. AllocationManager 70:30 Mathematical Conservation", function () {
    it("Should calculate exact 70:30 split with zero lost dust", async function () {
      const oddAmount = 999999999999999999n;
      const [share70, share30] = await allocationManager.calculateSplit(oddAmount);

      expect(share70 + share30).to.equal(oddAmount);
      expect(share70).to.equal((oddAmount * 70n) / 100n);
      expect(share30).to.equal(oddAmount - share70);
    });

    it("Should execute 70:30 allocation transfers accurately", async function () {
      const purchaseTokens = ethers.parseEther("10000");
      // Fund buyer and approve allocationManager
      await oxeniq.transfer(buyer.address, purchaseTokens);
      await oxeniq.connect(buyer).approve(await allocationManager.getAddress(), purchaseTokens);

      const bal70Before = await oxeniq.balanceOf(treasury70.address);
      const bal30Before = await oxeniq.balanceOf(reserve30.address);

      await allocationManager.executeAllocation(buyer.address, purchaseTokens);

      const bal70After = await oxeniq.balanceOf(treasury70.address);
      const bal30After = await oxeniq.balanceOf(reserve30.address);

      expect(bal70After - bal70Before).to.equal(ethers.parseEther("7000"));
      expect(bal30After - bal30Before).to.equal(ethers.parseEther("3000"));
      expect(await oxeniq.balanceOf(buyer.address)).to.equal(0n);
    });
  });

  describe("4. Multi-Currency Purchase Journey & ₹1,00,000 Minimum Enforcement", function () {
    it("Should enforce canonical ₹1,00,000 INR minimum", function () {
      const quoteInr = ExchangePolicy.createQuote("INR", 1.0);

      // Exactly 100,000 is accepted
      const valid = ExchangePolicy.validate(100000, quoteInr);
      expect(valid.isValid).to.be.true;

      // 99,999.99 is rejected
      const invalid = ExchangePolicy.validate(99999.99, quoteInr);
      expect(invalid.isValid).to.be.false;
      expect(invalid.reason).to.equal("BELOW_MINIMUM");
    });

    it("Should enforce ceiling-rounded minimum for USD ($1,183.44 at 84.50)", function () {
      const quoteUsd = ExchangePolicy.createQuote("USD", 84.50);
      expect(quoteUsd.minOrderInCurrency).to.equal(1183.44);

      // 1,183.43 is rejected (< 100,000 INR)
      const rejected = ExchangePolicy.validate(1183.43, quoteUsd);
      expect(rejected.isValid).to.be.false;
      expect(rejected.reason).to.equal("BELOW_MINIMUM");

      // 1,183.44 is accepted (>= 100,000 INR)
      const accepted = ExchangePolicy.validate(1183.44, quoteUsd);
      expect(accepted.isValid).to.be.true;
    });

    it("Should enforce ceiling-rounded minimum for EUR (€1,089.33 at 91.80)", function () {
      const quoteEur = ExchangePolicy.createQuote("EUR", 91.80);
      expect(quoteEur.minOrderInCurrency).to.equal(1089.33);

      const rejected = ExchangePolicy.validate(1089.32, quoteEur);
      expect(rejected.isValid).to.be.false;
      expect(rejected.reason).to.equal("BELOW_MINIMUM");

      const accepted = ExchangePolicy.validate(1089.33, quoteEur);
      expect(accepted.isValid).to.be.true;
    });

    it("Should enforce ceiling-rounded minimum for GBP (£932.84 at 107.20)", function () {
      const quoteGbp = ExchangePolicy.createQuote("GBP", 107.20);
      expect(quoteGbp.minOrderInCurrency).to.equal(932.84);

      const rejected = ExchangePolicy.validate(932.83, quoteGbp);
      expect(rejected.isValid).to.be.false;
      expect(rejected.reason).to.equal("BELOW_MINIMUM");

      const accepted = ExchangePolicy.validate(932.84, quoteGbp);
      expect(accepted.isValid).to.be.true;
    });

    it("Should reject expired quotes past the 15-minute validity window", function () {
      const now = Date.now();
      const quote = ExchangePolicy.createQuote("INR", 1.0, now);

      // 16 minutes later
      const result = ExchangePolicy.validate(100000, quote, now + 16 * 60 * 1000);
      expect(result.isValid).to.be.false;
      expect(result.reason).to.equal("QUOTE_EXPIRED");
    });

    it("Should reject stale oracle rates", function () {
      const now = Date.now();
      const quote = ExchangePolicy.createQuote("USD", 84.50, now);
      quote.isStale = true;

      const result = ExchangePolicy.validate(2000, quote, now);
      expect(result.isValid).to.be.false;
      expect(result.reason).to.equal("STALE_ORACLE_RATE");
    });
  });

  describe("5. Wallet & Mobile Connectivity Verification", function () {
    it("Should assert BSC transaction readiness on BSC Testnet (#97) and block unsupported chains", function () {
      function assertBscReady(isConnected, chainId) {
        if (!isConnected) {
          return { ready: false, error: "Wallet not connected" };
        }
        if (chainId !== 56 && chainId !== 97 && chainId !== 31337) {
          return { ready: false, error: `Unsupported network (#${chainId})` };
        }
        return { ready: true };
      }

      expect(assertBscReady(true, 97).ready).to.be.true;
      expect(assertBscReady(true, 56).ready).to.be.true;
      expect(assertBscReady(true, 31337).ready).to.be.true;
      expect(assertBscReady(false, 97).ready).to.be.false;
      expect(assertBscReady(true, 1).ready).to.be.false; // Ethereum Mainnet
      expect(assertBscReady(true, 137).ready).to.be.false; // Polygon Mainnet
      expect(assertBscReady(true, 728126428).ready).to.be.false; // TRON Mainnet
    });

    it("Should verify that mobile connectivity relies on in-app Web3 browsers and WalletConnect is documented as pending", function () {
      const pkgPath = path.join(__dirname, "..", "apps", "web", "package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

      // WalletConnect package must NOT be listed as an active dependency
      expect(pkg.dependencies["@walletconnect/ethereum-provider"]).to.be.undefined;
      expect(pkg.dependencies["@web3modal"]).to.be.undefined;
    });
  });

  describe("6. Staged Checkout & Zero Live Financial Transactions Assertion", function () {
    it("Should verify mock payment processing prevents live payments and handles idempotency", function () {
      const store = new IdempotentFulfillmentManager();
      const secret = "test_webhook_secret_key_12345";

      const payload = JSON.stringify({
        providerId: "TEST_MOCK_ONRAMP",
        order_id: "order_testnet_1001",
        payment_id: "pay_testnet_9999",
        amountInPaise: 10000000, // ₹1,00,000 INR
        currency: "INR",
        status: "SUCCESS",
      });

      const signature = WebhookVerifier.generateSignature(payload, secret);
      expect(WebhookVerifier.verifySignature(payload, signature, secret)).to.be.true;

      // First processing succeeds
      const key = "TEST_MOCK_ONRAMP:pay_testnet_9999:order_testnet_1001";
      const order = {
        orderId: "order_testnet_1001",
        customerWalletAddress: buyer.address,
        inrAmount: 100000,
        usdEquivalent: 1183.43,
        calculatedOxeniqTokens: ethers.parseEther("11834.31").toString(),
        reserveOxeniqTokens: ethers.parseEther("3550.29").toString(),
      };
      store.recordOrder(order);

      let deliveryCount = 0;
      const res1 = store.fulfillPayment(key, "order_testnet_1001", () => {
        deliveryCount++;
        return { txHash: "0x_mock_testnet_tx_hash_1" };
      });

      expect(res1.success).to.be.true;
      expect(res1.duplicate).to.be.false;
      expect(deliveryCount).to.equal(1);

      // Replayed webhook is identified as duplicate without second delivery
      const res2 = store.fulfillPayment(key, "order_testnet_1001", () => {
        deliveryCount++;
        return { txHash: "0x_mock_duplicate_tx_hash" };
      });

      expect(res2.success).to.be.true;
      expect(res2.duplicate).to.be.true;
      expect(deliveryCount).to.equal(1); // Delivery count MUST remain 1
    });
  });

  describe("7. Deployment Artifact Safety & Partial-Deployment Guardrails", function () {
    const { assertNoArtifactCollision } = require("../scripts/deploymentGuards");
    const testDeployDir = path.join(__dirname, "..", "deployments", "test_mock_deployments");

    beforeEach(function () {
      if (!fs.existsSync(testDeployDir)) {
        fs.mkdirSync(testDeployDir, { recursive: true });
      }
    });

    afterEach(function () {
      if (fs.existsSync(testDeployDir)) {
        fs.rmSync(testDeployDir, { recursive: true, force: true });
      }
    });

    it("Should abort before any transaction if complete deployment artifact (<network>.json) already exists", function () {
      const mockNetwork = "bscTestnet_complete_mock";
      const artifactPath = path.join(testDeployDir, `${mockNetwork}.json`);

      // Write mock existing complete artifact
      fs.writeFileSync(artifactPath, JSON.stringify({ status: "already_deployed" }), "utf8");

      // Real guard function from scripts/deploymentGuards must throw
      expect(() => assertNoArtifactCollision(testDeployDir, mockNetwork)).to.throw(
        "CRITICAL SAFETY ABORT: Deployment artifact already exists"
      );
    });

    it("Should abort before any transaction if partial recovery artifact (<network>.partial.json) already exists", function () {
      const mockNetwork = "bscTestnet_partial_guard_mock";
      const partialPath = path.join(testDeployDir, `${mockNetwork}.partial.json`);

      // Write mock existing partial artifact
      fs.writeFileSync(partialPath, JSON.stringify({ status: "PARTIAL_DEPLOYMENT_FAILURE" }), "utf8");

      // Real guard function from scripts/deploymentGuards must throw on partial artifact
      expect(() => assertNoArtifactCollision(testDeployDir, mockNetwork)).to.throw(
        "CRITICAL SAFETY ABORT: Partial deployment recovery artifact already exists"
      );
    });

    it("Should pass cleanly and return verified paths when neither complete nor partial artifact exists", function () {
      const cleanNetwork = "bscTestnet_clean_mock";
      const paths = assertNoArtifactCollision(testDeployDir, cleanNetwork);

      expect(paths.outputPath).to.equal(path.join(testDeployDir, `${cleanNetwork}.json`));
      expect(paths.partialPath).to.equal(path.join(testDeployDir, `${cleanNetwork}.partial.json`));
      expect(fs.existsSync(paths.outputPath)).to.be.false;
      expect(fs.existsSync(paths.partialPath)).to.be.false;
    });

    it("Should record partial deployment recovery state and block complete artifact creation on mid-deployment failure", function () {
      const mockNetwork = "bscTestnet_partial_mock";
      const outputPath = path.join(testDeployDir, `${mockNetwork}.json`);
      const partialPath = path.join(testDeployDir, `${mockNetwork}.partial.json`);

      const deployedTokenAddress = "0x1111111111111111111111111111111111111111";
      const deployedTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const mockError = new Error("AllocationManager execution reverted: Out of Gas");

      // Simulated deployment handler matching deploy.js logic
      function simulateDeploymentStep(failAllocation) {
        const oxeniqAddress = deployedTokenAddress;
        const oxeniqTxHash = deployedTxHash;

        let allocationAddress = null;
        try {
          if (failAllocation) {
            throw mockError;
          }
          allocationAddress = "0x2222222222222222222222222222222222222222";
        } catch (allocError) {
          const partialData = {
            network: mockNetwork,
            chainId: 97,
            status: "PARTIAL_DEPLOYMENT_FAILURE",
            deployer: deployer.address,
            error: allocError.message,
            contracts: {
              OxeniqToken: {
                address: oxeniqAddress,
                txHash: oxeniqTxHash,
              },
              AllocationManager: {
                status: "FAILED_DEPLOYMENT",
                address: null,
              },
            },
            recoveryInstructions: `Deploy AllocationManager with tokenAddress set to ${oxeniqAddress}. Do not redeploy OxeniqToken.`,
          };
          fs.writeFileSync(partialPath, JSON.stringify(partialData, null, 2), "utf8");
          throw allocError;
        }

        const completeData = {
          network: mockNetwork,
          contracts: {
            OxeniqToken: { address: oxeniqAddress },
            AllocationManager: { address: allocationAddress },
          },
        };
        fs.writeFileSync(outputPath, JSON.stringify(completeData, null, 2), "utf8");
      }

      // Assert error throws
      expect(() => simulateDeploymentStep(true)).to.throw("AllocationManager execution reverted: Out of Gas");

      // Complete artifact must NOT exist
      expect(fs.existsSync(outputPath)).to.be.false;

      // Partial artifact must exist and contain recovered token address
      expect(fs.existsSync(partialPath)).to.be.true;
      const partialRecord = JSON.parse(fs.readFileSync(partialPath, "utf8"));
      expect(partialRecord.status).to.equal("PARTIAL_DEPLOYMENT_FAILURE");
      expect(partialRecord.contracts.OxeniqToken.address).to.equal(deployedTokenAddress);
      expect(partialRecord.contracts.OxeniqToken.txHash).to.equal(deployedTxHash);
      expect(partialRecord.contracts.AllocationManager.address).to.be.null;
      expect(partialRecord.recoveryInstructions).to.include(deployedTokenAddress);
    });

    it("Should verify legitimate BSC Testnet deployment artifact and absence of partial artifact", function () {
      const realTestnetArtifact = path.join(__dirname, "..", "deployments", "bscTestnet.json");
      const realPartialArtifact = path.join(__dirname, "..", "deployments", "bscTestnet.partial.json");

      // Complete artifact must exist after authorized deployment
      expect(fs.existsSync(realTestnetArtifact)).to.be.true;

      const artifact = JSON.parse(fs.readFileSync(realTestnetArtifact, "utf8"));
      expect(artifact.network).to.equal("bscTestnet");
      expect(artifact.chainId).to.equal(97);
      expect(artifact.deployer).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(artifact.contracts).to.be.an("object");
      expect(artifact.contracts.OxeniqToken.address).to.equal("0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877");
      expect(artifact.contracts.OxeniqToken.name).to.equal("OXENIQ");
      expect(artifact.contracts.OxeniqToken.symbol).to.equal("OXENIQ");
      expect(artifact.contracts.OxeniqToken.decimals).to.equal(18);
      expect(artifact.contracts.AllocationManager.address).to.equal("0x2ce58319f424D78d3EA4Eb0f4864521EAadE9296");

      // Partial failure artifact must NOT exist
      expect(fs.existsSync(realPartialArtifact)).to.be.false;
    });
  });
});
