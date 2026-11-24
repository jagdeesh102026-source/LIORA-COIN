const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LioraTokenImmutable Contract Audit & Verification Suite", function () {
  this.timeout(40000);
  let LioraTokenImmutable;
  let token;
  let deployer;
  let initialHolder;
  let user1;
  let user2;

  const TOTAL_SUPPLY = ethers.parseUnits("1000000000", 18); // 1,000,000,000 * 10^18

  beforeEach(async function () {
    [deployer, initialHolder, user1, user2] = await ethers.getSigners();
    LioraTokenImmutable = await ethers.getContractFactory("LioraTokenImmutable");
    token = await LioraTokenImmutable.deploy(initialHolder.address);
    await token.waitForDeployment();
  });

  describe("1. Deployment & Fixed Supply Invariants", function () {
    it("Should correctly set token name to 'LIORA COIN'", async function () {
      expect(await token.name()).to.equal("LIORA COIN");
    });

    it("Should correctly set token symbol to 'LIORA'", async function () {
      expect(await token.symbol()).to.equal("LIORA");
    });

    it("Should return exactly 18 decimals via pure function", async function () {
      expect(await token.decimals()).to.equal(18);
    });

    it("Should set total supply to exactly 1,000,000,000 LIORA (10^27 atomic units)", async function () {
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it("Should credit the entire 1 Billion initial supply to the designated initial holder", async function () {
      expect(await token.balanceOf(initialHolder.address)).to.equal(TOTAL_SUPPLY);
      expect(await token.balanceOf(deployer.address)).to.equal(0n);
    });

    it("Should revert if initial holder is address(0)", async function () {
      await expect(
        LioraTokenImmutable.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(token, "InvalidZeroAddress");
    });
  });

  describe("2. Standard ERC-20 Transfers & Zero-Fee Invariants", function () {
    it("Should transfer tokens with exact 1:1 conservation (0% fee-on-transfer)", async function () {
      const transferAmount = ethers.parseUnits("5000", 18);
      const initialHolderBalBefore = await token.balanceOf(initialHolder.address);

      // Execute transfer
      const tx = await token.connect(initialHolder).transfer(user1.address, transferAmount);
      await expect(tx)
        .to.emit(token, "Transfer")
        .withArgs(initialHolder.address, user1.address, transferAmount);

      // Verify exact conservation
      expect(await token.balanceOf(initialHolder.address)).to.equal(initialHolderBalBefore - transferAmount);
      expect(await token.balanceOf(user1.address)).to.equal(transferAmount);
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it("Should revert if sender balance is insufficient", async function () {
      const transferAmount = ethers.parseUnits("100", 18);
      await expect(
        token.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("Should execute transferFrom with exact allowance deduction", async function () {
      const approveAmount = ethers.parseUnits("2000", 18);
      const transferAmount = ethers.parseUnits("1500", 18);

      await token.connect(initialHolder).approve(user1.address, approveAmount);
      expect(await token.allowance(initialHolder.address, user1.address)).to.equal(approveAmount);

      await token.connect(user1).transferFrom(initialHolder.address, user2.address, transferAmount);

      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await token.allowance(initialHolder.address, user1.address)).to.equal(approveAmount - transferAmount);
    });

    it("Should revert transferFrom if spender allowance is insufficient", async function () {
      const approveAmount = ethers.parseUnits("500", 18);
      const transferAmount = ethers.parseUnits("1000", 18);

      await token.connect(initialHolder).approve(user1.address, approveAmount);
      await expect(
        token.connect(user1).transferFrom(initialHolder.address, user2.address, transferAmount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
    });
  });

  describe("3. Non-Custodial Token Burning", function () {
    it("Should allow a holder to burn their own tokens, permanently reducing total supply", async function () {
      const burnAmount = ethers.parseUnits("1000000", 18); // 1 Million tokens

      const tx = await token.connect(initialHolder).burn(burnAmount);
      await expect(tx)
        .to.emit(token, "Transfer")
        .withArgs(initialHolder.address, ethers.ZeroAddress, burnAmount);

      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY - burnAmount);
      expect(await token.balanceOf(initialHolder.address)).to.equal(TOTAL_SUPPLY - burnAmount);
    });

    it("Should allow burnFrom within approved allowance", async function () {
      const approveAmount = ethers.parseUnits("50000", 18);
      const burnAmount = ethers.parseUnits("20000", 18);

      await token.connect(initialHolder).approve(user1.address, approveAmount);
      await token.connect(user1).burnFrom(initialHolder.address, burnAmount);

      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY - burnAmount);
      expect(await token.allowance(initialHolder.address, user1.address)).to.equal(approveAmount - burnAmount);
    });

    it("Should revert burn if balance is insufficient", async function () {
      const burnAmount = ethers.parseUnits("1", 18);
      await expect(
        token.connect(user1).burn(burnAmount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("4. Absence of Privileged & Centralized Controls (Q21 Requirements)", function () {
    it("Must NOT have an owner() function or Ownable interface", async function () {
      expect(token.owner).to.be.undefined;
    });

    it("Must NOT have a pause() or unpause() function", async function () {
      expect(token.pause).to.be.undefined;
      expect(token.unpause).to.be.undefined;
      expect(token.paused).to.be.undefined;
    });

    it("Must NOT have a post-deployment mint() function", async function () {
      expect(token.mint).to.be.undefined;
    });

    it("Must NOT have blacklisting, whitelisting, or freezing functions", async function () {
      expect(token.blacklist).to.be.undefined;
      expect(token.whitelist).to.be.undefined;
      expect(token.freeze).to.be.undefined;
      expect(token.isBlacklisted).to.be.undefined;
    });

    it("Must NOT have fee or tax setter functions", async function () {
      expect(token.setFee).to.be.undefined;
      expect(token.setTax).to.be.undefined;
      expect(token.taxFee).to.be.undefined;
    });

    it("Must NOT have upgradeable proxy functions (e.g., upgradeTo, implementation)", async function () {
      expect(token.upgradeTo).to.be.undefined;
      expect(token.upgradeToAndCall).to.be.undefined;
      expect(token.implementation).to.be.undefined;
    });

    it("Transfers must never be blocked or paused by any party", async function () {
      // User1 receives tokens
      await token.connect(initialHolder).transfer(user1.address, ethers.parseUnits("100", 18));
      // Deployer or any account cannot stop user1 from transferring to user2
      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseUnits("50", 18))
      ).to.not.be.reverted;
    });
  });
});
