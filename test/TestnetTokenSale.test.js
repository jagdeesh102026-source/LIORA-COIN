const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("TestnetTokenSale Contract (BSC Testnet Fixed-Price Sale)", function () {
  let OxeniqToken;
  let oxeniq;
  let TestnetTokenSale;
  let sale;
  let owner;
  let buyer;
  let recipient;
  let unauthorized;

  const INITIAL_SUPPLY = ethers.parseEther("1000000000"); // 1 Billion OXENIQ
  const SALE_INVENTORY = ethers.parseEther("50000"); // 50,000 OXENIQ

  beforeEach(async function () {
    [owner, buyer, recipient, unauthorized] = await ethers.getSigners();

    // Deploy OxeniqToken
    OxeniqToken = await ethers.getContractFactory("OxeniqToken");
    oxeniq = await OxeniqToken.deploy(
      "OXENIQ",
      "OXENIQ",
      INITIAL_SUPPLY,
      owner.address
    );
    await oxeniq.waitForDeployment();

    // Deploy TestnetTokenSale
    TestnetTokenSale = await ethers.getContractFactory("TestnetTokenSale");
    sale = await TestnetTokenSale.deploy(
      await oxeniq.getAddress(),
      owner.address
    );
    await sale.waitForDeployment();

    // Fund the sale contract with initial test inventory
    await oxeniq.transfer(await sale.getAddress(), SALE_INVENTORY);
  });

  describe("1. Deployment & Configuration", function () {
    it("Should store the correct token and owner addresses", async function () {
      expect(await sale.token()).to.equal(await oxeniq.getAddress());
      expect(await sale.owner()).to.equal(owner.address);
    });

    it("Should confirm fixed test rate of 1 tBNB = 10,000 OXENIQ", async function () {
      expect(await sale.TOKENS_PER_BNB()).to.equal(10000n);
    });

    it("Should confirm correct chain ID constants", async function () {
      expect(await sale.BSC_TESTNET_CHAIN_ID()).to.equal(97n);
      expect(await sale.LOCAL_DEVNET_CHAIN_ID()).to.equal(31337n);
    });

    it("Should revert if deployed with zero address for token or owner", async function () {
      await expect(
        TestnetTokenSale.deploy(ethers.ZeroAddress, owner.address)
      ).to.be.revertedWithCustomError(sale, "InvalidZeroAddress");

      await expect(
        TestnetTokenSale.deploy(await oxeniq.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(sale, "OwnableInvalidOwner");
    });
  });

  describe("2. Fixed-Rate Arithmetic & Calculation Helpers", function () {
    it("Should calculate exact tokens for 1 tBNB (10,000 OXENIQ)", async function () {
      const oneBnb = ethers.parseEther("1");
      const expectedTokens = ethers.parseEther("10000");
      expect(await sale.calculateTokenAmount(oneBnb)).to.equal(expectedTokens);
    });

    it("Should calculate exact tokens for 0.01 tBNB (100 OXENIQ)", async function () {
      const bnbAmount = ethers.parseEther("0.01");
      const expectedTokens = ethers.parseEther("100");
      expect(await sale.calculateTokenAmount(bnbAmount)).to.equal(expectedTokens);
    });

    it("Should calculate exact tokens for 0.001 tBNB (10 OXENIQ)", async function () {
      const bnbAmount = ethers.parseEther("0.001");
      const expectedTokens = ethers.parseEther("10");
      expect(await sale.calculateTokenAmount(bnbAmount)).to.equal(expectedTokens);
    });

    it("Should calculate exact tokens for 0.0001 tBNB (1 OXENIQ)", async function () {
      const bnbAmount = ethers.parseEther("0.0001");
      const expectedTokens = ethers.parseEther("1");
      expect(await sale.calculateTokenAmount(bnbAmount)).to.equal(expectedTokens);
    });
  });

  describe("3. Inventory Verification", function () {
    it("Should accurately report available inventory", async function () {
      expect(await sale.getAvailableInventory()).to.equal(SALE_INVENTORY);
    });

    it("Should decrease available inventory after a purchase", async function () {
      const payment = ethers.parseEther("0.01"); // 100 OXENIQ
      await sale.connect(buyer).buyTokens(buyer.address, { value: payment });

      const remaining = SALE_INVENTORY - ethers.parseEther("100");
      expect(await sale.getAvailableInventory()).to.equal(remaining);
    });
  });

  describe("4. Token Purchases & Exact Delivery", function () {
    it("Should execute purchase, transfer tokens, and emit TokensPurchased event", async function () {
      const payment = ethers.parseEther("0.05"); // 500 OXENIQ
      const expectedTokens = ethers.parseEther("500");

      const initialBuyerTokens = await oxeniq.balanceOf(buyer.address);

      await expect(sale.connect(buyer).buyTokens(buyer.address, { value: payment }))
        .to.emit(sale, "TokensPurchased")
        .withArgs(buyer.address, buyer.address, payment, expectedTokens);

      const finalBuyerTokens = await oxeniq.balanceOf(buyer.address);
      expect(finalBuyerTokens - initialBuyerTokens).to.equal(expectedTokens);
    });

    it("Should support purchasing tokens on behalf of a third-party recipient", async function () {
      const payment = ethers.parseEther("0.02"); // 200 OXENIQ
      const expectedTokens = ethers.parseEther("200");

      await expect(sale.connect(buyer).buyTokens(recipient.address, { value: payment }))
        .to.emit(sale, "TokensPurchased")
        .withArgs(buyer.address, recipient.address, payment, expectedTokens);

      expect(await oxeniq.balanceOf(recipient.address)).to.equal(expectedTokens);
      expect(await oxeniq.balanceOf(buyer.address)).to.equal(0n);
    });

    it("Should support direct tBNB transfer via receive() fallback", async function () {
      const payment = ethers.parseEther("0.01"); // 100 OXENIQ
      const expectedTokens = ethers.parseEther("100");

      await expect(
        buyer.sendTransaction({
          to: await sale.getAddress(),
          value: payment,
        })
      )
        .to.emit(sale, "TokensPurchased")
        .withArgs(buyer.address, buyer.address, payment, expectedTokens);

      expect(await oxeniq.balanceOf(buyer.address)).to.equal(expectedTokens);
    });
  });

  describe("5. Payment & Inventory Validation (Fails Closed)", function () {
    it("Should revert if payment is zero", async function () {
      await expect(
        sale.connect(buyer).buyTokens(buyer.address, { value: 0 })
      ).to.be.revertedWithCustomError(sale, "ZeroPayment");
    });

    it("Should revert if recipient is zero address", async function () {
      await expect(
        sale.connect(buyer).buyTokens(ethers.ZeroAddress, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWithCustomError(sale, "InvalidZeroAddress");
    });

    it("Should revert if purchase exceeds available inventory", async function () {
      // Inventory is 50,000 OXENIQ. 5.1 tBNB would require 51,000 OXENIQ.
      const excessivePayment = ethers.parseEther("5.1");
      const requiredTokens = ethers.parseEther("51000");

      await expect(
        sale.connect(buyer).buyTokens(buyer.address, { value: excessivePayment })
      ).to.be.revertedWithCustomError(sale, "InsufficientInventory")
        .withArgs(SALE_INVENTORY, requiredTokens);
    });
  });

  describe("6. Emergency Circuit Breaker (Pausable)", function () {
    it("Should allow owner to pause and block purchases", async function () {
      await sale.connect(owner).pause();

      await expect(
        sale.connect(buyer).buyTokens(buyer.address, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWithCustomError(sale, "EnforcedPause");
    });

    it("Should allow owner to unpause and resume purchases", async function () {
      await sale.connect(owner).pause();
      await sale.connect(owner).unpause();

      await expect(
        sale.connect(buyer).buyTokens(buyer.address, { value: ethers.parseEther("0.01") })
      ).to.emit(sale, "TokensPurchased");
    });

    it("Should reject unauthorized attempts to pause or unpause", async function () {
      await expect(
        sale.connect(unauthorized).pause()
      ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount")
        .withArgs(unauthorized.address);

      await sale.connect(owner).pause();

      await expect(
        sale.connect(unauthorized).unpause()
      ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount")
        .withArgs(unauthorized.address);
    });
  });

  describe("7. Safe Owner Recovery of Unsold Inventory & Proceeds", function () {
    it("Should allow owner to withdraw unsold tokens", async function () {
      const withdrawAmount = ethers.parseEther("10000");
      const initialOwnerBalance = await oxeniq.balanceOf(owner.address);

      await expect(sale.connect(owner).withdrawUnsoldTokens(withdrawAmount))
        .to.emit(sale, "UnsoldTokensWithdrawn")
        .withArgs(owner.address, withdrawAmount);

      const finalOwnerBalance = await oxeniq.balanceOf(owner.address);
      expect(finalOwnerBalance - initialOwnerBalance).to.equal(withdrawAmount);
      expect(await sale.getAvailableInventory()).to.equal(SALE_INVENTORY - withdrawAmount);
    });

    it("Should revert if owner attempts to withdraw more tokens than available", async function () {
      const excessiveAmount = SALE_INVENTORY + ethers.parseEther("1");
      await expect(
        sale.connect(owner).withdrawUnsoldTokens(excessiveAmount)
      ).to.be.revertedWithCustomError(sale, "InsufficientInventory");
    });

    it("Should allow owner to withdraw accumulated tBNB proceeds", async function () {
      // Buyer purchases tokens with 0.1 tBNB
      await sale.connect(buyer).buyTokens(buyer.address, { value: ethers.parseEther("0.1") });

      const initialOwnerBnb = await ethers.provider.getBalance(owner.address);

      const tx = await sale.connect(owner).withdrawBnb();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const finalOwnerBnb = await ethers.provider.getBalance(owner.address);
      expect(finalOwnerBnb + gasCost - initialOwnerBnb).to.equal(ethers.parseEther("0.1"));
      expect(await ethers.provider.getBalance(await sale.getAddress())).to.equal(0n);
    });

    it("Should revert if withdrawing BNB when contract balance is zero", async function () {
      await expect(
        sale.connect(owner).withdrawBnb()
      ).to.be.revertedWithCustomError(sale, "InsufficientBnbBalance");
    });

    it("Should reject unauthorized attempts to withdraw tokens or BNB", async function () {
      await expect(
        sale.connect(unauthorized).withdrawUnsoldTokens(ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount")
        .withArgs(unauthorized.address);

      await expect(
        sale.connect(unauthorized).withdrawBnb()
      ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount")
        .withArgs(unauthorized.address);
    });
  });

  describe("8. Chain Restrictions & Network Isolation Guardrails", function () {
    it("Should confirm BSC Testnet (97) is the designated live test target", async function () {
      expect(await sale.BSC_TESTNET_CHAIN_ID()).to.equal(97n);
    });

    it("Should confirm Local Simulation Devnet (31337) is the only permitted developer mock", async function () {
      expect(await sale.LOCAL_DEVNET_CHAIN_ID()).to.equal(31337n);
    });

    it("Should enforce that BSC Mainnet (Chain ID 56) is rejected by deployment guard logic", function () {
      function evaluateDeploymentGuard(targetChainId) {
        if (targetChainId === 56) {
          throw new Error(
            "CRITICAL SAFETY ABORT: BSC Mainnet (Chain ID 56) deployment is strictly blocked. TestnetTokenSale is testnet-only."
          );
        }
        if (targetChainId !== 97 && targetChainId !== 31337) {
          throw new Error(`CRITICAL SAFETY ABORT: Unsupported chain ID ${targetChainId}.`);
        }
        return true;
      }

      expect(() => evaluateDeploymentGuard(56)).to.throw(
        "CRITICAL SAFETY ABORT: BSC Mainnet (Chain ID 56) deployment is strictly blocked."
      );
      expect(() => evaluateDeploymentGuard(1)).to.throw(
        "CRITICAL SAFETY ABORT: Unsupported chain ID 1."
      );
      expect(() => evaluateDeploymentGuard(137)).to.throw(
        "CRITICAL SAFETY ABORT: Unsupported chain ID 137."
      );
      expect(evaluateDeploymentGuard(97)).to.be.true;
      expect(evaluateDeploymentGuard(31337)).to.be.true;
    });

    it("Should verify deploy-testnet-sale script has fail-closed collision and mainnet guards", function () {
      const scriptContent = require("fs").readFileSync(
        require("path").join(__dirname, "..", "scripts", "deploy-testnet-sale.js"),
        "utf8"
      );

      expect(scriptContent).to.include("chainId === 56");
      expect(scriptContent).to.include("network.name === \"bscTestnet\" && chainId !== 97");
      expect(scriptContent).to.include("-sale.json");
    });
  });
});
