const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("LIORA — UUPS Upgradeable Architecture Evaluation Suite", function () {
  let LioraTokenUUPSV1;
  let LioraTokenUUPSV2;
  let proxy;
  let proxyAddress;

  let owner;
  let treasury;
  let reserve;
  let governance; // Represents Corporate Governance / Timelock / Safe Multisig
  let attacker;
  let recipient;

  const TOTAL_100B = ethers.parseEther("100000000000"); // 100 Billion
  const TREASURY_1B = ethers.parseEther("1000000000");   // 1 Billion
  const RESERVE_99B = ethers.parseEther("99000000000");  // 99 Billion

  beforeEach(async function () {
    [owner, treasury, reserve, governance, attacker, recipient] = await ethers.getSigners();

    LioraTokenUUPSV1 = await ethers.getContractFactory("LioraTokenUUPSV1");
    LioraTokenUUPSV2 = await ethers.getContractFactory("LioraTokenUUPSV2");

    // Deploy V1 UUPS proxy
    proxy = await upgrades.deployProxy(
      LioraTokenUUPSV1,
      [treasury.address, reserve.address, governance.address],
      { kind: "uups", initializer: "initialize" }
    );
    await proxy.waitForDeployment();
    proxyAddress = await proxy.getAddress();
  });

  // =========================================================================
  // 1. INITIALIZATION & FIXED SUPPLY INVARIANTS (Requirements 1, 2, 3)
  // =========================================================================
  describe("1. Initializer Patterns & Fixed Supply Invariants", function () {
    it("Should deploy with correct name, symbol, and 18 decimals", async function () {
      expect(await proxy.name()).to.equal("LIORA");
      expect(await proxy.symbol()).to.equal("LIORA");
      expect(await proxy.decimals()).to.equal(18);
      expect(await proxy.version()).to.equal("1.0.0");
    });

    it("Should mint exactly 100 Billion LIORA once at initialization", async function () {
      expect(await proxy.totalSupply()).to.equal(TOTAL_100B);
      expect(await proxy.balanceOf(treasury.address)).to.equal(TREASURY_1B);
      expect(await proxy.balanceOf(reserve.address)).to.equal(RESERVE_99B);
      expect(await proxy.operatingTreasury()).to.equal(treasury.address);
      expect(await proxy.reserveVault()).to.equal(reserve.address);
    });

    it("Requirement 2: Should reject re-initialization of proxy (mint once invariant)", async function () {
      await expect(
        proxy.initialize(treasury.address, reserve.address, governance.address)
      ).to.be.revertedWithCustomError(proxy, "InvalidInitialization");
    });

    it("Requirement 3: Implementation contract initializers must be permanently disabled", async function () {
      const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      const implContract = await ethers.getContractAt("LioraTokenUUPSV1", implAddress);

      // Attempting to call initialize on implementation directly must fail
      await expect(
        implContract.initialize(treasury.address, reserve.address, governance.address)
      ).to.be.revertedWithCustomError(implContract, "InvalidInitialization");
    });

    it("Should reject zero-address or duplicate addresses during initialization", async function () {
      const UninitV1 = await ethers.getContractFactory("LioraTokenUUPSV1");
      await expect(
        upgrades.deployProxy(
          UninitV1,
          [ethers.ZeroAddress, reserve.address, governance.address],
          { kind: "uups" }
        )
      ).to.be.revertedWithCustomError(UninitV1, "InvalidZeroAddress");

      await expect(
        upgrades.deployProxy(
          UninitV1,
          [treasury.address, treasury.address, governance.address],
          { kind: "uups" }
        )
      ).to.be.revertedWithCustomError(UninitV1, "DuplicateAddresses");
    });
  });

  // =========================================================================
  // 2. STANDARD ERC-20 OPERATIONS & FRACTIONAL TRANSFERS
  // =========================================================================
  describe("2. Standard ERC-20 Compatibility & Zero Fee Transfers", function () {
    it("Should execute 5 Million LIORA transfer with 100% 1:1 conservation (0% fee)", async function () {
      const transferAmount = ethers.parseEther("5000000");
      await proxy.connect(treasury).transfer(recipient.address, transferAmount);

      expect(await proxy.balanceOf(recipient.address)).to.equal(transferAmount);
      expect(await proxy.balanceOf(treasury.address)).to.equal(
        TREASURY_1B - transferAmount
      );
    });

    it("Should support fractional transfers down to 0.5 LIORA and 1 atomic wei", async function () {
      // Transfer 0.5 LIORA
      const halfLiora = ethers.parseEther("0.5");
      await proxy.connect(treasury).transfer(recipient.address, halfLiora);
      expect(await proxy.balanceOf(recipient.address)).to.equal(halfLiora);

      // Transfer 1 wei
      await proxy.connect(treasury).transfer(recipient.address, 1n);
      expect(await proxy.balanceOf(recipient.address)).to.equal(halfLiora + 1n);
    });

    it("Should allow token holder to burn tokens, reducing total supply permanently", async function () {
      const burnAmount = ethers.parseEther("1000000"); // 1 Million
      await proxy.connect(treasury).burn(burnAmount);

      expect(await proxy.balanceOf(treasury.address)).to.equal(
        TREASURY_1B - burnAmount
      );
      expect(await proxy.totalSupply()).to.equal(TOTAL_100B - burnAmount);
    });
  });

  // =========================================================================
  // 3. UNAUTHORIZED UPGRADE REJECTION (Requirement 4 & 7)
  // =========================================================================
  describe("3. Governance & Unauthorized Upgrade Rejection", function () {
    it("Requirement 7: Attacker cannot upgrade proxy implementation", async function () {
      const v2Impl = await LioraTokenUUPSV2.deploy();
      await v2Impl.waitForDeployment();
      const v2ImplAddress = await v2Impl.getAddress();

      // Attacker attempts to upgrade proxy directly via upgradeToAndCall
      await expect(
        proxy.connect(attacker).upgradeToAndCall(v2ImplAddress, "0x")
      ).to.be.revertedWithCustomError(proxy, "AccessControlUnauthorizedAccount");
    });

    it("Requirement 4: Only account with UPGRADER_ROLE can authorize upgrades", async function () {
      const upgraderRole = await proxy.UPGRADER_ROLE();
      expect(await proxy.hasRole(upgraderRole, governance.address)).to.be.true;
      expect(await proxy.hasRole(upgraderRole, attacker.address)).to.be.false;
      expect(await proxy.hasRole(upgraderRole, owner.address)).to.be.false;
    });
  });

  // =========================================================================
  // 4. V1 TO V2 UPGRADE & STATE PRESERVATION (Requirement 6, 8, 9)
  // =========================================================================
  describe("4. V1 to V2 Upgrade & State Invariant Preservation", function () {
    let preUpgradeTreasuryBal;
    let preUpgradeRecipientBal;
    let preUpgradeReserveBal;
    let preUpgradeTotalSupply;
    let preUpgradeImplAddress;

    beforeEach(async function () {
      // Execute some transfers and burns prior to upgrade
      await proxy.connect(treasury).transfer(recipient.address, ethers.parseEther("1250000"));
      await proxy.connect(treasury).burn(ethers.parseEther("250000"));

      preUpgradeTreasuryBal = await proxy.balanceOf(treasury.address);
      preUpgradeRecipientBal = await proxy.balanceOf(recipient.address);
      preUpgradeReserveBal = await proxy.balanceOf(reserve.address);
      preUpgradeTotalSupply = await proxy.totalSupply();
      preUpgradeImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    });

    it("Requirement 6: Storage layout between V1 and V2 must be strictly compatible", async function () {
      // Validate storage layout via OpenZeppelin upgrade validator
      await expect(
        upgrades.validateUpgrade(LioraTokenUUPSV1, LioraTokenUUPSV2, { kind: "uups" })
      ).to.not.be.rejected;
    });

    it("Requirement 8: Upgrade to V2 preserves proxy address and all state balances", async function () {
      // Governance executes upgrade to V2
      const upgradedProxy = await upgrades.upgradeProxy(proxyAddress, LioraTokenUUPSV2.connect(governance));
      await upgradedProxy.waitForDeployment();

      // 1. Proxy address MUST be identical
      expect(await upgradedProxy.getAddress()).to.equal(proxyAddress);

      // 2. Implementation address MUST be new
      const newImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      expect(newImplAddress).to.not.equal(preUpgradeImplAddress);

      // 3. Version is now 2.0.0
      expect(await upgradedProxy.version()).to.equal("2.0.0");
      expect(await upgradedProxy.isSupplyCapEnforced()).to.be.true;

      // 4. Balances are 100% preserved down to atomic wei
      expect(await upgradedProxy.balanceOf(treasury.address)).to.equal(preUpgradeTreasuryBal);
      expect(await upgradedProxy.balanceOf(recipient.address)).to.equal(preUpgradeRecipientBal);
      expect(await upgradedProxy.balanceOf(reserve.address)).to.equal(preUpgradeReserveBal);
      expect(await upgradedProxy.totalSupply()).to.equal(preUpgradeTotalSupply);

      // 5. Operating treasury and reserve vault addresses preserved
      expect(await upgradedProxy.operatingTreasury()).to.equal(treasury.address);
      expect(await upgradedProxy.reserveVault()).to.equal(reserve.address);
    });

    it("Requirement 9: Fixed-supply rule remains enforced after upgrade (no mint function)", async function () {
      const upgradedProxy = await upgrades.upgradeProxy(proxyAddress, LioraTokenUUPSV2.connect(governance));
      
      // Confirm that no mint() function exists on the ABI
      expect(upgradedProxy.mint).to.be.undefined;
      
      // Total supply cannot exceed 100B
      expect(await upgradedProxy.totalSupply()).to.be.at.most(TOTAL_100B);

      // Token transfers continue working normally on V2
      await upgradedProxy.connect(recipient).transfer(treasury.address, ethers.parseEther("250000"));
      expect(await upgradedProxy.balanceOf(recipient.address)).to.equal(
        preUpgradeRecipientBal - ethers.parseEther("250000")
      );
    });

    it("Allowance and transferFrom must be preserved across upgrades", async function () {
      const approvedAmount = ethers.parseEther("500000");
      // Approve on V1
      await proxy.connect(treasury).approve(recipient.address, approvedAmount);
      expect(await proxy.allowance(treasury.address, recipient.address)).to.equal(approvedAmount);

      // Upgrade to V2
      const upgradedProxy = await upgrades.upgradeProxy(proxyAddress, LioraTokenUUPSV2.connect(governance));

      // Allowance must be preserved
      expect(await upgradedProxy.allowance(treasury.address, recipient.address)).to.equal(approvedAmount);

      // transferFrom on V2 must execute cleanly
      await upgradedProxy.connect(recipient).transferFrom(treasury.address, attacker.address, approvedAmount);
      expect(await upgradedProxy.balanceOf(attacker.address)).to.equal(approvedAmount);
      expect(await upgradedProxy.allowance(treasury.address, recipient.address)).to.equal(0n);
    });

    it("Reinitializer initializeV2 should execute once and lock against re-execution", async function () {
      const upgradedProxy = await upgrades.upgradeProxy(proxyAddress, LioraTokenUUPSV2.connect(governance));
      
      // First execution of reinitializer(2) succeeds
      await expect(upgradedProxy.initializeV2())
        .to.emit(upgradedProxy, "VersionUpdated")
        .withArgs("2.0.0");

      // Second execution must fail
      await expect(upgradedProxy.initializeV2())
        .to.be.revertedWithCustomError(upgradedProxy, "InvalidInitialization");
    });
  });

  // =========================================================================
  // 5. TIMELOCK GOVERNANCE INTEGRATION EVALUATION (Requirement 5)
  // =========================================================================
  describe("5. Timelock Governance Model Evaluation", function () {
    let timelock;
    const minDelay = 2 * 24 * 3600; // 48-hour delay

    beforeEach(async function () {
      // Deploy LioraTimelock (OpenZeppelin TimelockController)
      // Proposers: [governance.address], Executors: [ethers.ZeroAddress] (anyone can execute after delay), Admin: governance.address
      const TimelockFactory = await ethers.getContractFactory("LioraTimelock");
      timelock = await TimelockFactory.deploy(
        minDelay,
        [governance.address],
        [ethers.ZeroAddress],
        governance.address
      );
      await timelock.waitForDeployment();

      // Transfer UPGRADER_ROLE to timelock contract
      const upgraderRole = await proxy.UPGRADER_ROLE();
      await proxy.connect(governance).grantRole(upgraderRole, await timelock.getAddress());
      await proxy.connect(governance).revokeRole(upgraderRole, governance.address);
    });

    it("Should reject instantaneous upgrade when governed by Timelock", async function () {
      const v2Impl = await LioraTokenUUPSV2.deploy();
      await v2Impl.waitForDeployment();
      const v2ImplAddress = await v2Impl.getAddress();

      // Governance directly calling upgradeToAndCall reverts because timelock holds the role
      await expect(
        proxy.connect(governance).upgradeToAndCall(v2ImplAddress, "0x")
      ).to.be.revertedWithCustomError(proxy, "AccessControlUnauthorizedAccount");
    });

    it("Should enforce minDelay timelock schedule and execution for upgrades", async function () {
      const v2Impl = await LioraTokenUUPSV2.deploy();
      await v2Impl.waitForDeployment();
      const v2ImplAddress = await v2Impl.getAddress();

      const callData = proxy.interface.encodeFunctionData("upgradeToAndCall", [v2ImplAddress, "0x"]);

      // 1. Governance schedules upgrade through timelock
      await timelock.connect(governance).schedule(
        proxyAddress,
        0,
        callData,
        ethers.ZeroHash,
        ethers.ZeroHash,
        minDelay
      );

      // 2. Immediate execution must fail (timelock not ready)
      await expect(
        timelock.execute(
          proxyAddress,
          0,
          callData,
          ethers.ZeroHash,
          ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(timelock, "TimelockUnexpectedOperationState");

      // 3. Fast-forward time past 48 hours
      await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
      await ethers.provider.send("evm_mine", []);

      // 4. Execution now succeeds
      await timelock.execute(
        proxyAddress,
        0,
        callData,
        ethers.ZeroHash,
        ethers.ZeroHash
      );

      // 5. Proxy is now upgraded to V2!
      const upgradedProxy = await ethers.getContractAt("LioraTokenUUPSV2", proxyAddress);
      expect(await upgradedProxy.version()).to.equal("2.0.0");
    });
  });

  // =========================================================================
  // 6. RESERVE VAULT INTEGRATION & ATOMIC INITIALIZATION
  // =========================================================================
  describe("6. Reserve Vault Integration & Atomic Proxy Deployment", function () {
    it("Should integrate with LioraReserveVault and enforce 99B restricted custody", async function () {
      // 1. Deploy LioraReserveVault with governance
      const VaultFactory = await ethers.getContractFactory("LioraReserveVault");
      const vault = await VaultFactory.deploy(governance.address);
      await vault.waitForDeployment();
      const vaultAddress = await vault.getAddress();

      // 2. Deploy UUPS Proxy with vaultAddress as reserve
      const freshProxy = await upgrades.deployProxy(
        LioraTokenUUPSV1,
        [treasury.address, vaultAddress, governance.address],
        { kind: "uups" }
      );
      await freshProxy.waitForDeployment();
      const freshProxyAddress = await freshProxy.getAddress();

      // 3. Vault binds token
      await vault.connect(governance).setToken(freshProxyAddress);

      // 4. Verify 99B LIORA is held in vault
      expect(await freshProxy.balanceOf(vaultAddress)).to.equal(RESERVE_99B);

      // 5. Attacker attempts to withdraw from vault -> rejected
      await expect(
        vault.connect(attacker).releaseReserveTokens(attacker.address, ethers.parseEther("100"), "Exploit attempt")
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");

      // 6. Authorized governance can release tokens with audit event
      const releaseAmount = ethers.parseEther("1000000");
      await expect(
        vault.connect(governance).releaseReserveTokens(recipient.address, releaseAmount, "Authorized corporate expansion")
      ).to.emit(vault, "ReserveTokensReleased");

      expect(await freshProxy.balanceOf(recipient.address)).to.equal(releaseAmount);
      expect(await freshProxy.balanceOf(vaultAddress)).to.equal(RESERVE_99B - releaseAmount);
    });
  });
});
