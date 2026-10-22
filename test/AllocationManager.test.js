const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AllocationManager Contract (70:30 Split Logic)", function () {
  let OxeniqToken;
  let oxeniq;
  let AllocationManager;
  let allocationManager;
  let owner;
  let recipient70;
  let recipient30;
  let buyer;
  let other;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, recipient70, recipient30, buyer, other] = await ethers.getSigners();

    OxeniqToken = await ethers.getContractFactory("OxeniqToken");
    oxeniq = await OxeniqToken.deploy(
      "OXENIQ",
      "OXENIQ",
      INITIAL_SUPPLY,
      owner.address
    );
    await oxeniq.waitForDeployment();

    AllocationManager = await ethers.getContractFactory("AllocationManager");
    allocationManager = await AllocationManager.deploy(
      await oxeniq.getAddress(),
      recipient70.address,
      recipient30.address,
      owner.address
    );
    await allocationManager.waitForDeployment();

    // Fund buyer with some tokens
    await oxeniq.transfer(buyer.address, ethers.parseEther("10000"));
  });

  describe("Deployment & Configuration", function () {
    it("Should store the correct token and recipient addresses", async function () {
      expect(await allocationManager.token()).to.equal(await oxeniq.getAddress());
      expect(await allocationManager.recipient70()).to.equal(recipient70.address);
      expect(await allocationManager.recipient30()).to.equal(recipient30.address);
      expect(await allocationManager.owner()).to.equal(owner.address);
    });

    it("Should revert if deployed with zero address for any parameter", async function () {
      await expect(
        AllocationManager.deploy(ethers.ZeroAddress, recipient70.address, recipient30.address, owner.address)
      ).to.be.revertedWithCustomError(allocationManager, "InvalidZeroAddress");

      await expect(
        AllocationManager.deploy(await oxeniq.getAddress(), ethers.ZeroAddress, recipient30.address, owner.address)
      ).to.be.revertedWithCustomError(allocationManager, "InvalidZeroAddress");

      await expect(
        AllocationManager.deploy(await oxeniq.getAddress(), recipient70.address, ethers.ZeroAddress, owner.address)
      ).to.be.revertedWithCustomError(allocationManager, "InvalidZeroAddress");
    });
  });

  describe("Split Mathematics & Exact Conservation", function () {
    it("Should calculate exact 70:30 split for standard round numbers", async function () {
      const [share70, share30] = await allocationManager.calculateSplit(100);
      expect(share70).to.equal(70);
      expect(share30).to.equal(30);
      expect(share70 + share30).to.equal(100);
    });

    it("Should calculate exact conservation for odd numbers (no lost dust)", async function () {
      const testCases = [1, 2, 3, 7, 33, 99, 101, 333, 1001, 9999999];
      for (const amount of testCases) {
        const [share70, share30] = await allocationManager.calculateSplit(amount);
        expect(share70 + share30).to.equal(amount);
        expect(share70).to.equal(BigInt(Math.floor((Number(amount) * 70) / 100)));
      }
    });

    it("Should return (0, 0) for zero amount", async function () {
      const [share70, share30] = await allocationManager.calculateSplit(0);
      expect(share70).to.equal(0);
      expect(share30).to.equal(0);
    });

    it("Should preserve exact conservation across a comprehensive fuzz range (1..200)", async function () {
      for (let i = 1; i <= 200; i++) {
        const [s70, s30] = await allocationManager.calculateSplit(i);
        expect(s70 + s30).to.equal(BigInt(i));
      }
    });
  });

  describe("Allocation Execution", function () {
    it("Should execute 70:30 allocation and transfer tokens to designated recipients", async function () {
      const purchaseAmount = ethers.parseEther("1000");

      // Buyer approves allocation manager
      await oxeniq.connect(buyer).approve(await allocationManager.getAddress(), purchaseAmount);

      const recipient70Before = await oxeniq.balanceOf(recipient70.address);
      const recipient30Before = await oxeniq.balanceOf(recipient30.address);
      const buyerBefore = await oxeniq.balanceOf(buyer.address);

      // Execute allocation
      const tx = await allocationManager.executeAllocation(buyer.address, purchaseAmount);
      await expect(tx)
        .to.emit(allocationManager, "AllocationExecuted")
        .withArgs(
          buyer.address,
          recipient70.address,
          recipient30.address,
          ethers.parseEther("700"),
          ethers.parseEther("300"),
          purchaseAmount
        );

      expect(await oxeniq.balanceOf(recipient70.address) - recipient70Before).to.equal(ethers.parseEther("700"));
      expect(await oxeniq.balanceOf(recipient30.address) - recipient30Before).to.equal(ethers.parseEther("300"));
      expect(buyerBefore - await oxeniq.balanceOf(buyer.address)).to.equal(purchaseAmount);
    });

    it("Should revert if purchase amount is 0", async function () {
      await expect(
        allocationManager.executeAllocation(buyer.address, 0)
      ).to.be.revertedWithCustomError(allocationManager, "InvalidZeroAmount");
    });

    it("Should revert if buyer is address(0)", async function () {
      await expect(
        allocationManager.executeAllocation(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(allocationManager, "InvalidZeroAddress");
    });
  });

  describe("Administrative Recipient Management", function () {
    it("Should allow the owner to update recipient addresses", async function () {
      await expect(
        allocationManager.updateRecipients(other.address, buyer.address)
      )
        .to.emit(allocationManager, "RecipientsUpdated")
        .withArgs(other.address, buyer.address);

      expect(await allocationManager.recipient70()).to.equal(other.address);
      expect(await allocationManager.recipient30()).to.equal(buyer.address);
    });

    it("Should prevent non-owners from updating recipients", async function () {
      await expect(
        allocationManager.connect(other).updateRecipients(other.address, buyer.address)
      ).to.be.revertedWithCustomError(allocationManager, "OwnableUnauthorizedAccount");
    });

    it("Should revert if updating recipient to address(0)", async function () {
      await expect(
        allocationManager.updateRecipients(ethers.ZeroAddress, buyer.address)
      ).to.be.revertedWithCustomError(allocationManager, "InvalidZeroAddress");
    });
  });
});
