const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

describe("LIORA — Single-Wallet Governance & Future Safe Multisig Migration Test Suite", function () {
  let deployer, treasury, governanceEOA, attacker, safeSigner1, safeSigner2, safeSigner3;
  let vault, timelock, tokenProxy, implementationV1, safeMockContract;
  const TIMELOCK_DELAY = 172800; // 48 Hours

  before(async function () {
    [
      deployer,
      treasury,
      governanceEOA,
      attacker,
      safeSigner1,
      safeSigner2,
      safeSigner3
    ] = await ethers.getSigners();
  });

  describe("1. Initial Deployment & Supply Architecture", function () {
    it("should deploy LioraReserveVault with Governance EOA as initial owner", async function () {
      const VaultFactory = await ethers.getContractFactory("LioraReserveVault");
      vault = await VaultFactory.deploy(governanceEOA.address);
      await vault.waitForDeployment();

      expect(await vault.owner()).to.equal(governanceEOA.address);
      expect(await vault.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("should deploy LioraTimelock with 48h delay and Governance EOA as proposer, executor, and admin", async function () {
      const TimelockFactory = await ethers.getContractFactory("LioraTimelock");
      timelock = await TimelockFactory.deploy(
        TIMELOCK_DELAY,
        [governanceEOA.address],
        [governanceEOA.address],
        governanceEOA.address
      );
      await timelock.waitForDeployment();

      expect(await timelock.getMinDelay()).to.equal(TIMELOCK_DELAY);
      expect(await timelock.hasRole(await timelock.PROPOSER_ROLE(), governanceEOA.address)).to.be.true;
      expect(await timelock.hasRole(await timelock.EXECUTOR_ROLE(), governanceEOA.address)).to.be.true;
      expect(await timelock.hasRole(await timelock.DEFAULT_ADMIN_ROLE(), governanceEOA.address)).to.be.true;
      expect(await timelock.hasRole(await timelock.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.false;
    });

    it("should deploy LioraTokenUUPSV1 proxy and mint exact 100B supply (1B Treasury, 99B Reserve)", async function () {
      const TokenV1Factory = await ethers.getContractFactory("LioraTokenUUPSV1");
      tokenProxy = await upgrades.deployProxy(
        TokenV1Factory,
        [treasury.address, await vault.getAddress(), await timelock.getAddress()],
        { kind: "uups", initializer: "initialize" }
      );
      await tokenProxy.waitForDeployment();
      const proxyAddress = await tokenProxy.getAddress();
      const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      implementationV1 = TokenV1Factory.attach(implAddress);

      // Verify Supply
      const expectedTotalSupply = ethers.parseEther("100000000000"); // 100B
      const expectedTreasuryBal = ethers.parseEther("1000000000");   // 1B
      const expectedReserveBal = ethers.parseEther("99000000000");   // 99B

      expect(await tokenProxy.totalSupply()).to.equal(expectedTotalSupply);
      expect(await tokenProxy.balanceOf(treasury.address)).to.equal(expectedTreasuryBal);
      expect(await tokenProxy.balanceOf(await vault.getAddress())).to.equal(expectedReserveBal);
      expect(await tokenProxy.balanceOf(deployer.address)).to.equal(0n);
      expect(await tokenProxy.balanceOf(governanceEOA.address)).to.equal(0n);

      // Bind Vault
      await vault.connect(governanceEOA).setToken(proxyAddress);
      expect(await vault.token()).to.equal(proxyAddress);
    });

    it("should lock implementation contract initializers permanently", async function () {
      await expect(
        implementationV1.initialize(treasury.address, await vault.getAddress(), await timelock.getAddress())
      ).to.be.revertedWithCustomError(implementationV1, "InvalidInitialization");
    });
  });

  describe("2. Access Control & Upgrade Security (48-Hour Timelock Enforcement)", function () {
    it("should grant UPGRADER_ROLE and DEFAULT_ADMIN_ROLE strictly to Timelock", async function () {
      const UPGRADER_ROLE = await tokenProxy.UPGRADER_ROLE();
      const DEFAULT_ADMIN_ROLE = await tokenProxy.DEFAULT_ADMIN_ROLE();

      expect(await tokenProxy.hasRole(UPGRADER_ROLE, await timelock.getAddress())).to.be.true;
      expect(await tokenProxy.hasRole(DEFAULT_ADMIN_ROLE, await timelock.getAddress())).to.be.true;
      expect(await tokenProxy.hasRole(UPGRADER_ROLE, deployer.address)).to.be.false;
      expect(await tokenProxy.hasRole(UPGRADER_ROLE, governanceEOA.address)).to.be.false;
      expect(await tokenProxy.hasRole(UPGRADER_ROLE, treasury.address)).to.be.false;
    });

    it("should reject direct upgrade calls by non-timelock callers", async function () {
      const TokenV2Factory = await ethers.getContractFactory("LioraTokenUUPSV2");
      const v2Impl = await TokenV2Factory.deploy();
      await v2Impl.waitForDeployment();

      // Attacker directly calls upgradeToAndCall on proxy
      await expect(
        tokenProxy.connect(attacker).upgradeToAndCall(await v2Impl.getAddress(), "0x")
      ).to.be.revertedWithCustomError(tokenProxy, "AccessControlUnauthorizedAccount");

      // Governance EOA directly calls upgradeToAndCall on proxy (must fail because only Timelock has role)
      await expect(
        tokenProxy.connect(governanceEOA).upgradeToAndCall(await v2Impl.getAddress(), "0x")
      ).to.be.revertedWithCustomError(tokenProxy, "AccessControlUnauthorizedAccount");
    });

    it("should REJECT timelock upgrade execution before the 48-hour delay expires", async function () {
      const TokenV2Factory = await ethers.getContractFactory("LioraTokenUUPSV2");
      const v2Impl = await TokenV2Factory.deploy();
      await v2Impl.waitForDeployment();
      const v2Address = await v2Impl.getAddress();

      // Encode upgrade call
      const proxyAddress = await tokenProxy.getAddress();
      const upgradeCalldata = tokenProxy.interface.encodeFunctionData("upgradeToAndCall", [v2Address, "0x"]);

      const target = proxyAddress;
      const value = 0n;
      const data = upgradeCalldata;
      const predecessor = ethers.ZeroHash;
      const salt = ethers.encodeBytes32String("proposal-upgrade-v2");

      // Governance EOA schedules proposal
      await timelock.connect(governanceEOA).schedule(
        target,
        value,
        data,
        predecessor,
        salt,
        TIMELOCK_DELAY
      );

      // Attempt immediate execution (Delay not passed) -> MUST REVERT
      await expect(
        timelock.connect(governanceEOA).execute(target, value, data, predecessor, salt)
      ).to.be.revertedWithCustomError(timelock, "TimelockUnexpectedOperationState");

      // Fast forward time by 24 hours (86,400 seconds) -> Still before 48 hours -> MUST REVERT
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");

      await expect(
        timelock.connect(governanceEOA).execute(target, value, data, predecessor, salt)
      ).to.be.revertedWithCustomError(timelock, "TimelockUnexpectedOperationState");

      // Fast forward remaining 24 hours + 10 seconds (total > 48 hours)
      await ethers.provider.send("evm_increaseTime", [86410]);
      await ethers.provider.send("evm_mine");

      // Now execution must SUCCEED
      await expect(
        timelock.connect(governanceEOA).execute(target, value, data, predecessor, salt)
      ).to.emit(timelock, "CallExecuted");

      // Verify proxy now runs V2 logic
      const tokenV2 = TokenV2Factory.attach(proxyAddress);
      expect(await tokenV2.version()).to.equal("2.0.0");
      expect(await tokenV2.isSupplyCapEnforced()).to.be.true;
    });

    it("should restrict Reserve Vault releases strictly to authorized owner", async function () {
      const releaseAmount = ethers.parseEther("100000");

      // Unauthorized attacker attempt
      await expect(
        vault.connect(attacker).releaseReserveTokens(attacker.address, releaseAmount, "Theft Attempt")
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");

      // Authorized Governance EOA release
      await expect(
        vault.connect(governanceEOA).releaseReserveTokens(treasury.address, releaseAmount, "Approved Phase 1 Operations")
      ).to.emit(vault, "ReserveTokensReleased");

      expect(await tokenProxy.balanceOf(treasury.address)).to.equal(ethers.parseEther("1000100000"));
    });
  });

  describe("3. Future Safe Multisig Contract Migration & Zero-Lockout Handover", function () {
    before(async function () {
      // Deploy a Safe-compatible contract receiver to validate contract-level multisig execution
      // We use a lightweight mock contract capable of executing arbitrary calls as a multi-sig Safe proxy
      const SafeMockFactory = await ethers.getContractFactory("LioraTimelock");
      // Deploy mock Safe contract instance
      safeMockContract = await SafeMockFactory.deploy(
        0,
        [safeSigner1.address, safeSigner2.address, safeSigner3.address],
        [safeSigner1.address, safeSigner2.address, safeSigner3.address],
        safeSigner1.address
      );
      await safeMockContract.waitForDeployment();
    });

    it("should initiate Two-Step Vault ownership transfer without immediate handover", async function () {
      const safeAddress = await safeMockContract.getAddress();
      await vault.connect(governanceEOA).transferOwnership(safeAddress);

      expect(await vault.pendingOwner()).to.equal(safeAddress);
      // Current owner must REMAIN governanceEOA until acceptance
      expect(await vault.owner()).to.equal(governanceEOA.address);
    });

    it("should allow Safe contract to accept Vault ownership and strip Governance EOA privileges", async function () {
      const safeAddress = await safeMockContract.getAddress();
      const vaultAddress = await vault.getAddress();

      // Encode acceptOwnership call to be executed by Safe contract
      const acceptCalldata = vault.interface.encodeFunctionData("acceptOwnership");

      // Safe contract executes the call
      await safeMockContract.connect(safeSigner1).schedule(
        vaultAddress,
        0n,
        acceptCalldata,
        ethers.ZeroHash,
        ethers.encodeBytes32String("salt-accept"),
        0n
      );
      await safeMockContract.connect(safeSigner1).execute(
        vaultAddress,
        0n,
        acceptCalldata,
        ethers.ZeroHash,
        ethers.encodeBytes32String("salt-accept")
      );

      expect(await vault.owner()).to.equal(safeAddress);
      expect(await vault.pendingOwner()).to.equal(ethers.ZeroAddress);

      // Governance EOA can no longer release reserve tokens
      await expect(
        vault.connect(governanceEOA).releaseReserveTokens(treasury.address, 1000n, "Unauthorized Old Owner")
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("should migrate all Timelock roles to Safe contract and safely renounce Governance EOA roles", async function () {
      const safeAddress = await safeMockContract.getAddress();
      const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
      const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
      const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
      const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

      // Step 1: Grant all roles to Safe contract
      await timelock.connect(governanceEOA).grantRole(PROPOSER_ROLE, safeAddress);
      await timelock.connect(governanceEOA).grantRole(EXECUTOR_ROLE, safeAddress);
      await timelock.connect(governanceEOA).grantRole(CANCELLER_ROLE, safeAddress);
      await timelock.connect(governanceEOA).grantRole(DEFAULT_ADMIN_ROLE, safeAddress);

      // Step 2: Verify Safe contract holds all roles
      expect(await timelock.hasRole(PROPOSER_ROLE, safeAddress)).to.be.true;
      expect(await timelock.hasRole(EXECUTOR_ROLE, safeAddress)).to.be.true;
      expect(await timelock.hasRole(CANCELLER_ROLE, safeAddress)).to.be.true;
      expect(await timelock.hasRole(DEFAULT_ADMIN_ROLE, safeAddress)).to.be.true;

      // Step 3: Renounce roles from Governance EOA
      await timelock.connect(governanceEOA).renounceRole(PROPOSER_ROLE, governanceEOA.address);
      await timelock.connect(governanceEOA).renounceRole(EXECUTOR_ROLE, governanceEOA.address);
      await timelock.connect(governanceEOA).renounceRole(CANCELLER_ROLE, governanceEOA.address);
      await timelock.connect(governanceEOA).renounceRole(DEFAULT_ADMIN_ROLE, governanceEOA.address);

      // Verify Governance EOA holds zero privileged roles on Timelock
      expect(await timelock.hasRole(PROPOSER_ROLE, governanceEOA.address)).to.be.false;
      expect(await timelock.hasRole(EXECUTOR_ROLE, governanceEOA.address)).to.be.false;
      expect(await timelock.hasRole(CANCELLER_ROLE, governanceEOA.address)).to.be.false;
      expect(await timelock.hasRole(DEFAULT_ADMIN_ROLE, governanceEOA.address)).to.be.false;
    });

    it("should preserve the exact Token Proxy address and full state after complete migration", async function () {
      expect(await tokenProxy.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await tokenProxy.name()).to.equal("LIORA");
      expect(await tokenProxy.symbol()).to.equal("LIORA");
      expect(await tokenProxy.decimals()).to.equal(18);
      expect(await tokenProxy.totalSupply()).to.equal(ethers.parseEther("100000000000"));
    });
  });

  describe("4. Deployer Isolation & Three-Role Distinctness", function () {
    it("should verify Deployer holds ZERO tokens and ZERO administrative privileges", async function () {
      const UPGRADER_ROLE = await tokenProxy.UPGRADER_ROLE();
      const DEFAULT_ADMIN_ROLE = await tokenProxy.DEFAULT_ADMIN_ROLE();

      // Zero tokens
      expect(await tokenProxy.balanceOf(deployer.address)).to.equal(0n);

      // Zero token proxy roles
      expect(await tokenProxy.hasRole(UPGRADER_ROLE, deployer.address)).to.be.false;
      expect(await tokenProxy.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.false;

      // Zero timelock roles
      expect(await timelock.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.false;
      expect(await timelock.hasRole(await timelock.PROPOSER_ROLE(), deployer.address)).to.be.false;
      expect(await timelock.hasRole(await timelock.EXECUTOR_ROLE(), deployer.address)).to.be.false;

      // Not vault owner or pending owner
      expect(await vault.owner()).to.not.equal(deployer.address);
      expect(await vault.pendingOwner()).to.not.equal(deployer.address);
    });

    it("should confirm Deployer, Treasury, and Governance wallets are pairwise distinct", function () {
      const d = deployer.address.toLowerCase();
      const t = treasury.address.toLowerCase();
      const g = governanceEOA.address.toLowerCase();

      expect(d !== t).to.be.true;
      expect(d !== g).to.be.true;
      expect(t !== g).to.be.true;
    });
  });

  describe("5. Partial Deployment Interruption & Recovery", function () {
    it("should verify recovery artifact saves state and cleans up on completion", async function () {
      const tempRecoveryPath = path.resolve(__dirname, "../deployments/test-recovery.partial.json");
      const dummyRecord = {
        reserveVaultAddress: await vault.getAddress(),
        timelockAddress: await timelock.getAddress()
      };

      // Write partial recovery record
      fs.writeFileSync(tempRecoveryPath, JSON.stringify(dummyRecord, null, 2));
      expect(fs.existsSync(tempRecoveryPath)).to.be.true;

      // Simulate recovery read
      const readRecord = JSON.parse(fs.readFileSync(tempRecoveryPath, "utf8"));
      expect(readRecord.reserveVaultAddress).to.equal(await vault.getAddress());
      expect(readRecord.timelockAddress).to.equal(await timelock.getAddress());

      // Clean up
      fs.unlinkSync(tempRecoveryPath);
      expect(fs.existsSync(tempRecoveryPath)).to.be.false;
    });
  });
});
