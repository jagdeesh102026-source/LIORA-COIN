const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 12 — Token Supply Configuration & Security Safeguards", function () {
  let OxeniqToken;
  let oxeniq;
  let owner;
  let addr1;
  let addr2;

  // 1,000,000,000 OXENIQ tokens (1 Billion token units with 18 decimals)
  const ONE_BILLION_SUPPLY = ethers.parseEther("1000000000");

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    OxeniqToken = await ethers.getContractFactory("OxeniqToken");
    oxeniq = await OxeniqToken.deploy(
      "OXENIQ",
      "OXENIQ",
      ONE_BILLION_SUPPLY,
      owner.address
    );
    await oxeniq.waitForDeployment();
  });

  describe("Fixed 1 Billion Total Supply Verification", function () {
    it("Should deploy successfully with exactly 1,000,000,000 OXENIQ tokens", async function () {
      const supply = await oxeniq.totalSupply();
      expect(supply).to.equal(ONE_BILLION_SUPPLY);
      // 10^9 tokens * 10^18 base units = 10^27 atomic units
      expect(supply.toString()).to.equal("1000000000000000000000000000");
    });

    it("Should assign the entire 1 Billion supply to the deployer/owner at genesis", async function () {
      const balance = await oxeniq.balanceOf(owner.address);
      expect(balance).to.equal(ONE_BILLION_SUPPLY);
    });

    it("Should return standard 18 decimals", async function () {
      expect(await oxeniq.decimals()).to.equal(18);
    });

    it("Should revert if deployed with zero initial supply", async function () {
      await expect(
        OxeniqToken.deploy("OXENIQ", "OXENIQ", 0, owner.address)
      ).to.be.revertedWithCustomError(oxeniq, "InvalidInitialSupply");
    });
  });

  describe("Prohibition of Arbitrary Minting & Supply Inflation", function () {
    it("Should not expose any public or external mint function in contract ABI", function () {
      const functionNames = oxeniq.interface.fragments
        .filter(f => f.type === "function")
        .map(f => f.name);
      const mintFunctions = functionNames.filter(name => name.toLowerCase().includes("mint"));
      expect(mintFunctions.length).to.equal(0);
    });

    it("Should guarantee total supply cannot increase post-genesis", async function () {
      // Normal transfers and burns do not inflate supply
      const transferAmount = ethers.parseEther("50000");
      await oxeniq.transfer(addr1.address, transferAmount);

      expect(await oxeniq.totalSupply()).to.equal(ONE_BILLION_SUPPLY);

      // Deflationary burn decreases supply
      await oxeniq.connect(addr1).burn(ethers.parseEther("10000"));
      expect(await oxeniq.totalSupply()).to.equal(ONE_BILLION_SUPPLY - ethers.parseEther("10000"));
    });
  });

  describe("Access Control & Two-Step Governance Safeguards", function () {
    it("Should prevent unauthorized accounts from triggering emergency pause", async function () {
      await expect(
        oxeniq.connect(addr1).pause()
      ).to.be.revertedWithCustomError(oxeniq, "OwnableUnauthorizedAccount");
    });

    it("Should enforce two-step ownership to protect treasury & reserve administration", async function () {
      await oxeniq.transferOwnership(addr1.address);
      expect(await oxeniq.owner()).to.equal(owner.address);
      expect(await oxeniq.pendingOwner()).to.equal(addr1.address);

      // addr2 cannot hijack pending ownership
      await expect(
        oxeniq.connect(addr2).acceptOwnership()
      ).to.be.revertedWithCustomError(oxeniq, "OwnableUnauthorizedAccount");

      // Only addr1 can accept
      await oxeniq.connect(addr1).acceptOwnership();
      expect(await oxeniq.owner()).to.equal(addr1.address);
    });
  });

  describe("Borrowing & Lending Feature Verification (Postponed Guardrail)", function () {
    it("Should confirm no borrowing, lending, collateral, or liquidation functions exist", function () {
      const functionNames = oxeniq.interface.fragments
        .filter(f => f.type === "function")
        .map(f => f.name);
      const prohibitedKeywords = ["borrow", "lend", "collateral", "liquidate", "repay", "interest", "loan"];

      const prohibitedMatches = functionNames.filter(name => 
        prohibitedKeywords.some(keyword => name.toLowerCase().includes(keyword))
      );

      expect(prohibitedMatches.length).to.equal(0);
    });
  });
});
