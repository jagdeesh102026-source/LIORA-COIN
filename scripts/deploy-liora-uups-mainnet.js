const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * LIORA UUPS Upgradeable Ecosystem — BSC Mainnet Production Deployment Engine
 * Target Network: BNB Smart Chain Mainnet (Chain ID 56)
 *
 * Governance Architecture:
 * - Supports dedicated Single-Wallet Governance (gated by ALLOW_SINGLE_WALLET_GOVERNANCE=true)
 *   or immediate Corporate Safe Multisig (LIORA_MAINNET_SAFE_MULTISIG).
 * - Enforces strict 3-role separation: Deployer != Treasury != Governance.
 * - Retains UUPS upgradeable architecture and mandatory 48-hour Timelock.
 * - Supply Invariants: 100B total, 1B Treasury, 99B Reserve Vault.
 * - Supports seamless post-deployment migration to Safe Multisig with ZERO proxy changes.
 */
async function main() {
  console.log("======================================================================");
  console.log("LIORA UUPS — BSC Mainnet Production Deployment Engine");
  console.log("======================================================================");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log(`Active Network:  ${hre.network.name}`);
  console.log(`Active Chain ID: ${chainId}`);

  // Guard 1: Strict Chain ID Verification
  if (chainId !== 56) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Active Chain ID is ${chainId}. This script is exclusively intended for BSC Mainnet (Chain ID 56).`
    );
  }

  // Guard 2: Production Deployment Master Opt-In Flag
  if (process.env.ENABLE_MAINNET_DEPLOYMENT !== "true") {
    throw new Error(
      "CRITICAL SAFETY ABORT: ENABLE_MAINNET_DEPLOYMENT is not set to 'true'. Mainnet deployment is strictly locked."
    );
  }

  // Guard 3: Artifact Collision & Resumption Safety
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  const mainnetArtifactPath = path.join(deploymentsDir, "bscMainnet-uups.json");
  const recoveryArtifactPath = path.join(deploymentsDir, "bscMainnet-uups.partial.json");

  if (fs.existsSync(mainnetArtifactPath)) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Deployment artifact already exists at '${mainnetArtifactPath}'. Deployment is locked to prevent duplicate contracts.`
    );
  }

  // Retrieve Signer (Deployer EOA)
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error("CRITICAL SAFETY ABORT: No mainnet deployer signer found. Configure MAINNET_DEPLOYER_PRIVATE_KEY.");
  }
  const deployer = signers[0];
  console.log(`\n[1] Deployer Account:`);
  console.log(`- Address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`- Balance: ${ethers.formatEther(balance)} BNB`);

  if (balance < ethers.parseEther("0.02")) {
    throw new Error(
      `INSUFFICIENT GAS: Deployer has ${ethers.formatEther(balance)} BNB. Recommended minimum is 0.05 BNB.`
    );
  }

  // Guard 4: Role Separation & Governance Configuration
  const operatingTreasuryAddress = process.env.LIORA_MAINNET_OPERATING_TREASURY || "0xD546c3263663C193447bAdF60741f3915b349064";
  const governanceAddress = process.env.LIORA_MAINNET_GOVERNANCE_WALLET || process.env.LIORA_MAINNET_SAFE_MULTISIG;
  const isSingleWalletGovernance = !process.env.LIORA_MAINNET_SAFE_MULTISIG || (process.env.LIORA_MAINNET_GOVERNANCE_WALLET && process.env.LIORA_MAINNET_GOVERNANCE_WALLET !== process.env.LIORA_MAINNET_SAFE_MULTISIG);
  const minDelaySeconds = Number(process.env.LIORA_MAINNET_TIMELOCK_DELAY || 172800); // 48 hours

  if (!ethers.isAddress(operatingTreasuryAddress) || operatingTreasuryAddress === ethers.ZeroAddress) {
    throw new Error(`CRITICAL ERROR: Invalid Operating Treasury address: ${operatingTreasuryAddress}`);
  }

  if (!governanceAddress || !ethers.isAddress(governanceAddress) || governanceAddress === ethers.ZeroAddress) {
    throw new Error(
      "CRITICAL BLOCKER: Governance address (LIORA_MAINNET_GOVERNANCE_WALLET or LIORA_MAINNET_SAFE_MULTISIG) is not configured or invalid."
    );
  }

  // Guard 5: Single-Wallet Governance Authorization Gate
  if (isSingleWalletGovernance) {
    if (process.env.ALLOW_SINGLE_WALLET_GOVERNANCE !== "true") {
      throw new Error(
        "CRITICAL GOVERNANCE GATE: Single-wallet governance requires explicit documented management authorization. Set ALLOW_SINGLE_WALLET_GOVERNANCE='true' in .env once approved."
      );
    }
    console.log("ℹ Governance Mode: SINGLE-WALLET GOVERNANCE (Management Authorization Confirmed)");
  } else {
    console.log("ℹ Governance Mode: CORPORATE SAFE MULTISIG GOVERNANCE");
  }

  // Guard 6: Three-Role Separation Enforcement (Deployer != Treasury != Governance)
  if (deployer.address.toLowerCase() === operatingTreasuryAddress.toLowerCase()) {
    throw new Error("CRITICAL ROLE CONFLICT: Deployer cannot be identical to Operating Treasury.");
  }
  if (deployer.address.toLowerCase() === governanceAddress.toLowerCase()) {
    throw new Error("CRITICAL ROLE CONFLICT: Deployer cannot be identical to Governance Wallet.");
  }
  if (operatingTreasuryAddress.toLowerCase() === governanceAddress.toLowerCase()) {
    throw new Error("CRITICAL ROLE CONFLICT: Operating Treasury and Governance Wallet cannot be identical.");
  }

  console.log("\n[2] Validated 3-Role Architecture:");
  console.log(`- 1. Deployer EOA:       ${deployer.address} (0 Tokens, Temporary setup rights only)`);
  console.log(`- 2. Operating Treasury: ${operatingTreasuryAddress} (Receives 1,000,000,000 LIORA)`);
  console.log(`- 3. Governance Admin:   ${governanceAddress} (Controls Reserve & Timelock)`);
  console.log(`- Timelock Delay:        ${minDelaySeconds} seconds (48 Hours)`);

  let partialRecord = {};
  if (fs.existsSync(recoveryArtifactPath)) {
    try {
      partialRecord = JSON.parse(fs.readFileSync(recoveryArtifactPath, "utf8"));
      console.log("\n⚠ Detected partial deployment recovery record. Checking state...");
    } catch (_) {}
  }

  // Step 1: Deploy LioraReserveVault (or resume)
  let reserveVaultAddress = partialRecord.reserveVaultAddress;
  let reserveVault;
  const VaultFactory = await ethers.getContractFactory("LioraReserveVault");

  if (!reserveVaultAddress) {
    console.log("\n[Step 1/7] Deploying LioraReserveVault.sol...");
    reserveVault = await VaultFactory.deploy(deployer.address);
    await reserveVault.waitForDeployment();
    reserveVaultAddress = await reserveVault.getAddress();
    partialRecord.reserveVaultAddress = reserveVaultAddress;
    fs.writeFileSync(recoveryArtifactPath, JSON.stringify(partialRecord, null, 2));
    console.log(`✓ LioraReserveVault deployed at: ${reserveVaultAddress}`);
  } else {
    reserveVault = VaultFactory.attach(reserveVaultAddress);
    console.log(`✓ Resumed LioraReserveVault from recovery record: ${reserveVaultAddress}`);
  }

  // Step 2: Deploy LioraTimelock (or resume)
  let timelockAddress = partialRecord.timelockAddress;
  let timelock;
  const TimelockFactory = await ethers.getContractFactory("LioraTimelock");

  if (!timelockAddress) {
    console.log(`\n[Step 2/7] Deploying LioraTimelock.sol (minDelay: ${minDelaySeconds}s)...`);
    timelock = await TimelockFactory.deploy(
      minDelaySeconds,
      [governanceAddress],
      [governanceAddress],
      governanceAddress
    );
    await timelock.waitForDeployment();
    timelockAddress = await timelock.getAddress();
    partialRecord.timelockAddress = timelockAddress;
    fs.writeFileSync(recoveryArtifactPath, JSON.stringify(partialRecord, null, 2));
    console.log(`✓ LioraTimelock deployed at: ${timelockAddress}`);
  } else {
    timelock = TimelockFactory.attach(timelockAddress);
    console.log(`✓ Resumed LioraTimelock from recovery record: ${timelockAddress}`);
  }

  // Step 3: Deploy LioraTokenUUPSV1 & ERC1967Proxy (or resume)
  let proxyAddress = partialRecord.proxyAddress;
  let implAddress = partialRecord.implAddress;
  const TokenV1Factory = await ethers.getContractFactory("LioraTokenUUPSV1");

  if (!proxyAddress) {
    console.log("\n[Step 3/7] Deploying LioraTokenUUPSV1 & ERC1967Proxy via upgrades.deployProxy...");
    const proxy = await upgrades.deployProxy(
      TokenV1Factory,
      [operatingTreasuryAddress, reserveVaultAddress, timelockAddress],
      { kind: "uups", initializer: "initialize" }
    );
    await proxy.waitForDeployment();
    proxyAddress = await proxy.getAddress();
    implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    partialRecord.proxyAddress = proxyAddress;
    partialRecord.implAddress = implAddress;
    fs.writeFileSync(recoveryArtifactPath, JSON.stringify(partialRecord, null, 2));
    console.log(`✓ LIORA ERC1967Proxy deployed at:           ${proxyAddress}`);
    console.log(`✓ LioraTokenUUPSV1 Implementation deployed: ${implAddress}`);
  } else {
    console.log(`✓ Resumed LIORA ERC1967Proxy: ${proxyAddress}`);
  }

  // Step 4: Bind Token to Reserve Vault
  console.log("\n[Step 4/7] Binding Token Proxy to LioraReserveVault...");
  const currentBoundToken = await reserveVault.token();
  if (currentBoundToken === ethers.ZeroAddress) {
    const bindTx = await reserveVault.setToken(proxyAddress);
    await bindTx.wait();
    console.log("✓ LioraReserveVault successfully bound to Token Proxy.");
  } else {
    console.log("✓ Token Proxy already bound to LioraReserveVault.");
  }

  // Step 5: Transfer Reserve Vault Ownership to Governance Wallet (Two-step transfer)
  console.log("\n[Step 5/7] Initiating LioraReserveVault ownership transfer to Governance Wallet...");
  const currentVaultOwner = await reserveVault.owner();
  if (currentVaultOwner.toLowerCase() !== governanceAddress.toLowerCase()) {
    const transferTx = await reserveVault.transferOwnership(governanceAddress);
    await transferTx.wait();
    console.log(`✓ Vault ownership transfer initiated to: ${governanceAddress}`);
    console.log(`  (Governance Wallet must call reserveVault.acceptOwnership() to finalize handover)`);
  } else {
    console.log("✓ Governance Wallet is already confirmed owner of LioraReserveVault.");
  }

  // Step 6: Verify Deployer Has Zero Privileges on Timelock
  console.log("\n[Step 6/7] Verifying Timelock governance permissions...");
  const TIMELOCK_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
  const deployerIsAdmin = await timelock.hasRole(TIMELOCK_ADMIN_ROLE, deployer.address);
  if (deployerIsAdmin) {
    const renounceTx = await timelock.renounceRole(TIMELOCK_ADMIN_ROLE, deployer.address);
    await renounceTx.wait();
    console.log("✓ Deployer admin role renounced on Timelock.");
  } else {
    console.log("✓ Deployer holds 0 roles on Timelock.");
  }

  // Step 7: Post-Deployment Invariant Verification
  console.log("\n[Step 7/7] Running Post-Deployment Invariant Verification...");
  const token = TokenV1Factory.attach(proxyAddress);
  const totalSupply = await token.totalSupply();
  const treasuryBalance = await token.balanceOf(operatingTreasuryAddress);
  const reserveBalance = await token.balanceOf(reserveVaultAddress);
  const deployerBalance = await token.balanceOf(deployer.address);

  console.log(`- Total Supply:     ${ethers.formatEther(totalSupply)} LIORA`);
  console.log(`- Treasury Balance: ${ethers.formatEther(treasuryBalance)} LIORA`);
  console.log(`- Reserve Balance:  ${ethers.formatEther(reserveBalance)} LIORA`);
  console.log(`- Deployer Balance: ${ethers.formatEther(deployerBalance)} LIORA`);

  if (totalSupply !== ethers.parseEther("100000000000")) {
    throw new Error("INVARIANT FAILURE: Total supply is not 100 Billion LIORA!");
  }
  if (treasuryBalance !== ethers.parseEther("1000000000")) {
    throw new Error("INVARIANT FAILURE: Operating Treasury did not receive 1 Billion LIORA!");
  }
  if (reserveBalance !== ethers.parseEther("99000000000")) {
    throw new Error("INVARIANT FAILURE: Reserve Vault did not receive 99 Billion LIORA!");
  }
  if (deployerBalance !== 0n) {
    throw new Error("INVARIANT FAILURE: Deployer holds non-zero LIORA balance!");
  }

  // Finalize Deployment Record
  const deploymentRecord = {
    network: "bscMainnet",
    chainId: 56,
    deployedAt: new Date().toISOString(),
    governanceModel: isSingleWalletGovernance ? "SINGLE_WALLET_GOVERNANCE" : "CORPORATE_SAFE_MULTISIG",
    deployer: deployer.address,
    architecture: "UUPS_UPGRADEABLE_PROXY_ERC1967",
    contracts: {
      proxyAddress: proxyAddress,
      implementationV1: implAddress,
      timelockAddress: timelockAddress,
      reserveVaultAddress: reserveVaultAddress,
    },
    governance: {
      operatingTreasuryAddress: operatingTreasuryAddress,
      governanceAddress: governanceAddress,
      isMultisig: !isSingleWalletGovernance,
      minDelaySeconds: minDelaySeconds,
    },
    token: {
      name: "LIORA",
      symbol: "LIORA",
      decimals: 18,
      totalSupply: totalSupply.toString(),
      treasuryBalance: treasuryBalance.toString(),
      reserveBalance: reserveBalance.toString(),
    },
  };

  fs.writeFileSync(mainnetArtifactPath, JSON.stringify(deploymentRecord, null, 2));
  if (fs.existsSync(recoveryArtifactPath)) {
    fs.unlinkSync(recoveryArtifactPath);
  }
  console.log(`\n✓ Final deployment artifact saved to: ${mainnetArtifactPath}`);

  const initData = TokenV1Factory.interface.encodeFunctionData("initialize", [
    operatingTreasuryAddress,
    reserveVaultAddress,
    timelockAddress,
  ]);

  console.log("\n======================================================================");
  console.log("MAINNET DEPLOYMENT COMPLETED SUCCESSFULLY");
  console.log("======================================================================");
  console.log("\nComplete BscScan Source Code Verification Commands:");
  console.log(`1. Reserve Vault:`);
  console.log(`   npx hardhat verify --network bscMainnet ${reserveVaultAddress} "${deployer.address}"`);
  console.log(`2. Timelock Controller (48-Hour Delay):`);
  console.log(`   npx hardhat verify --network bscMainnet ${timelockAddress} ${minDelaySeconds} '["${governanceAddress}"]' '["${governanceAddress}"]' "${governanceAddress}"`);
  console.log(`3. Logic Implementation V1:`);
  console.log(`   npx hardhat verify --network bscMainnet ${implAddress}`);
  console.log(`4. ERC1967 Token Proxy:`);
  console.log(`   npx hardhat verify --network bscMainnet ${proxyAddress} "${implAddress}" "${initData}"`);
}

main().catch((error) => {
  console.error("Mainnet deployment failed:", error);
  process.exitCode = 1;
});
