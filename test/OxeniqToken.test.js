const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OxeniqToken Contract", function () {
  let OxeniqToken;
  let oxeniq;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 OXENIQ

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    OxeniqToken = await ethers.getContractFactory("OxeniqToken");
    oxeniq = await OxeniqToken.deploy(
      "OXENIQ",
      "OXENIQ",
      INITIAL_SUPPLY,
      owner.address
    );
    await oxeniq.waitForDeployment();
  });

  describe("Deployment & Configuration", function () {
    it("Should set the correct token name and symbol", async function () {
      expect(await oxeniq.name()).to.equal("OXENIQ");
      expect(await oxeniq.symbol()).to.equal("OXENIQ");
    });

    it("Should return 18 decimals", async function () {
      expect(await oxeniq.decimals()).to.equal(18);
    });

    it("Should assign the entire initial supply to the initial owner", async function () {
      const ownerBalance = await oxeniq.balanceOf(owner.address);
      expect(await oxeniq.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(ownerBalance).to.equal(INITIAL_SUPPLY);
    });

    it("Should set the correct initial owner", async function () {
      expect(await oxeniq.owner()).to.equal(owner.address);
    });

    it("Should revert if initial owner is address(0)", async function () {
      await expect(
        OxeniqToken.deploy("OXENIQ", "OXENIQ", INITIAL_SUPPLY, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(oxeniq, "OwnableInvalidOwner");
    });

    it("Should revert if initial supply is 0", async function () {
      await expect(
        OxeniqToken.deploy("OXENIQ", "OXENIQ", 0, owner.address)
      ).to.be.revertedWithCustomError(oxeniq, "InvalidInitialSupply");
    });
  });

  describe("Standard BEP-20 Transfers & Balances", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("500");
      await oxeniq.transfer(addr1.address, transferAmount);
      expect(await oxeniq.balanceOf(addr1.address)).to.equal(transferAmount);

      await oxeniq.connect(addr1).transfer(addr2.address, ethers.parseEther("200"));
      expect(await oxeniq.balanceOf(addr2.address)).to.equal(ethers.parseEther("200"));
      expect(await oxeniq.balanceOf(addr1.address)).to.equal(ethers.parseEther("300"));
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await oxeniq.balanceOf(owner.address);
      await expect(
        oxeniq.connect(addr1).transfer(owner.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(oxeniq, "ERC20InsufficientBalance");
      expect(await oxeniq.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });

    it("Should handle allowances and transferFrom correctly", async function () {
      const amount = ethers.parseEther("1000");
      await oxeniq.approve(addr1.address, amount);
      expect(await oxeniq.allowance(owner.address, addr1.address)).to.equal(amount);

      await oxeniq.connect(addr1).transferFrom(owner.address, addr2.address, amount);
      expect(await oxeniq.balanceOf(addr2.address)).to.equal(amount);
      expect(await oxeniq.allowance(owner.address, addr1.address)).to.equal(0);
    });
  });

  describe("Token Burning", function () {
    it("Should allow a token holder to burn their own tokens", async function () {
      const burnAmount = ethers.parseEther("10000");
      await oxeniq.burn(burnAmount);
      expect(await oxeniq.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
      expect(await oxeniq.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it("Should revert if an account tries to burn more tokens than owned", async function () {
      await expect(
        oxeniq.connect(addr1).burn(ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(oxeniq, "ERC20InsufficientBalance");
    });
  });

  describe("Pausable Circuit Breaker", function () {
    it("Should allow the owner to pause and unpause transfers", async function () {
      expect(await oxeniq.paused()).to.be.false;

      await oxeniq.pause();
      expect(await oxeniq.paused()).to.be.true;

      await expect(
        oxeniq.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(oxeniq, "EnforcedPause");

      await oxeniq.unpause();
      expect(await oxeniq.paused()).to.be.false;

      await oxeniq.transfer(addr1.address, ethers.parseEther("100"));
      expect(await oxeniq.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should prevent non-owners from pausing or unpausing", async function () {
      await expect(
        oxeniq.connect(addr1).pause()
      ).to.be.revertedWithCustomError(oxeniq, "OwnableUnauthorizedAccount");

      await oxeniq.pause();
      await expect(
        oxeniq.connect(addr1).unpause()
      ).to.be.revertedWithCustomError(oxeniq, "OwnableUnauthorizedAccount");
    });
  });

  describe("Two-Step Ownership Transfer (Ownable2Step)", function () {
    it("Should require the pending owner to explicitly accept ownership", async function () {
      await oxeniq.transferOwnership(addr1.address);
      expect(await oxeniq.owner()).to.equal(owner.address);
      expect(await oxeniq.pendingOwner()).to.equal(addr1.address);

      // Non-pending owner cannot accept
      await expect(
        oxeniq.connect(addr2).acceptOwnership()
      ).to.be.revertedWithCustomError(oxeniq, "OwnableUnauthorizedAccount");

      // Pending owner accepts
      await oxeniq.connect(addr1).acceptOwnership();
      expect(await oxeniq.owner()).to.equal(addr1.address);
      expect(await oxeniq.pendingOwner()).to.equal(ethers.ZeroAddress);
    });
  });
});
