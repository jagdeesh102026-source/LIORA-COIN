const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * LIORA UUPS Upgradeable Ecosystem — BSC Mainnet Production Deployment Engine
 * Target Network: BNB Smart Chain Mainnet (Chain ID 56)
 *
 * Requirements & Invariants:
 * 1. Hardhat Chain ID must be 56 (BSC Mainnet).
 * 2. ENABLE_MAINNET_DEPLOYMENT=true must be explicitly defined in environment.
 * 3. Dedicated MAINNET_DEPLOYER_PRIVATE_KEY must be configured (strictly isolated from testnet).
 * 4. Operating Treasury receives exactly 1,000,000,000 LIORA (1B).
 * 5. LioraReserveVault receives exactly 99,000,000,000 LIORA (99B).
 * 6. Timelock delay configured to 48 hours (172,800 seconds).
 * 7. Deployer relinquishes all roles post-deployment, ending with 0 tokens and 0 admin roles.
 */
async function main() {
  console.log("======================================================================");
  console.log("LIORA UUPS — BSC Mainnet Production Deployment Engine");
  console.log("======================================================================");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log(`Active Network:  ${hre.network.name}`);
  console.log(`Active Chain ID: ${chainId}`);

  // Guard 1: Chain ID Verification
  if (chainId !== 56) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Active Chain ID is ${chainId}. This script is exclusively intended for BSC Mainnet (Chain ID 56).`
    );
  }

  // Guard 2: Explicit Production Opt-In Flag
  if (process.env.ENABLE_MAINNET_DEPLOYMENT !== "true") {
    throw new Error(
      "CRITICAL SAFETY ABORT: ENABLE_MAINNET_DEPLOYMENT is not set to 'true'. Mainnet deployment is strictly locked."
    );
  }

  // Guard 3: Prevent duplicate deployments / artifact collision
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  const mainnetArtifactPath = path.join(deploymentsDir, "bscMainnet-uups.json");
  if (fs.existsSync(mainnetArtifactPath)) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Deployment artifact already exists at '${mainnetArtifactPath}'. Deployment is locked to prevent duplicate contracts.`
    );
  }

  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error("CRITICAL SAFETY ABORT: No mainnet deployer signer found. Configure MAINNET_DEPLOYER_PRIVATE_KEY.");
  }
  const deployer = signers[0];
  console.log(`Deployer Address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} BNB`);

  if (balance < ethers.parseEther("0.02")) {
    throw new Error(
      `INSUFFICIENT GAS: Deployer has ${ethers.formatEther(balance)} BNB. Recommended minimum is 0.05 BNB.`
    );
  }

  // Validated Mainnet Treasury & Governance Addresses
  const operatingTreasuryAddress = process.env.LIORA_MAINNET_OPERATING_TREASURY || "0xD546c3263663C193447bAdF60741f3915b349064";
  const safeMultisigAddress = process.env.LIORA_MAINNET_SAFE_MULTISIG;
  const minDelaySeconds = Number(process.env.LIORA_MAINNET_TIMELOCK_DELAY || 172800); // 48 hours

  // Guard 4: Validate Addresses
  if (!ethers.isAddress(operatingTreasuryAddress) || operatingTreasuryAddress === ethers.ZeroAddress) {
    throw new Error(`CRITICAL ERROR: Invalid Operating Treasury address: ${operatingTreasuryAddress}`);
  }

  if (!safeMultisigAddress || !ethers.isAddress(safeMultisigAddress) || safeMultisigAddress === ethers.ZeroAddress) {
    throw new Error(
      "CRITICAL BLOCKER: Corporate Safe Multisig address (LIORA_MAINNET_SAFE_MULTISIG) is not configured or invalid."
    );
  }

  if (operatingTreasuryAddress.toLowerCase() === safeMultisigAddress.toLowerCase()) {
    throw new Error("CRITICAL ERROR: Operating Treasury and Safe Multisig cannot be identical addresses.");
  }

  if (deployer.address.toLowerCase() === operatingTreasuryAddress.toLowerCase()) {
    throw new Error("CRITICAL ERROR: Deployer cannot be the Operating Treasury wallet.");
  }

  console.log("\nDeployment Configuration Validated:");
  console.log(`- Operating Treasury:   ${operatingTreasuryAddress} (Receives 1,000,000,000 LIORA)`);
  console.log(`- Corporate Safe Admin: ${safeMultisigAddress} (Controls Reserve & Timelock)`);
  console.log(`- Timelock Delay:       ${minDelaySeconds} seconds (48 Hours)`);

  // Step 1: Deploy LioraReserveVault
  console.log("\n[Step 1/7] Deploying LioraReserveVault.sol...");
  const VaultFactory = await ethers.getContractFactory("LioraReserveVault");
  const reserveVault = await VaultFactory.deploy(deployer.address);
  await reserveVault.waitForDeployment();
  const reserveVaultAddress = await reserveVault.getAddress();
  console.log(`✓ LioraReserveVault deployed at: ${reserveVaultAddress}`);

  // Step 2: Deploy LioraTimelock
  console.log(`\n[Step 2/7] Deploying LioraTimelock.sol (minDelay: ${minDelaySeconds}s)...`);
  const TimelockFactory = await ethers.getContractFactory("LioraTimelock");
  const timelock = await TimelockFactory.deploy(
    minDelaySeconds,
    [safeMultisigAddress],
    [safeMultisigAddress],
    deployer.address
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log(`✓ LioraTimelock deployed at: ${timelockAddress}`);

  // Step 3: Deploy LioraTokenUUPSV1 & ERC1967Proxy
  console.log("\n[Step 3/7] Deploying LioraTokenUUPSV1 & ERC1967Proxy via upgrades.deployProxy...");
  const TokenV1Factory = await ethers.getContractFactory("LioraTokenUUPSV1");
  const proxy = await upgrades.deployProxy(
    TokenV1Factory,
    [operatingTreasuryAddress, reserveVaultAddress, timelockAddress],
    { kind: "uups", initializer: "initialize" }
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log(`✓ LIORA ERC1967Proxy deployed at:         ${proxyAddress}`);
  console.log(`✓ LioraTokenUUPSV1 Implementation deployed: ${implAddress}`);

  // Step 4: Bind Token to Reserve Vault
  console.log("\n[Step 4/7] Binding Token Proxy to LioraReserveVault...");
  const bindTx = await reserveVault.setToken(proxyAddress);
  await bindTx.wait();
  console.log("✓ LioraReserveVault successfully bound to Token Proxy.");

  // Step 5: Transfer Reserve Vault Ownership to Corporate Safe (Two-step transfer)
  console.log("\n[Step 5/7] Transferring LioraReserveVault ownership to Corporate Safe...");
  const transferTx = await reserveVault.transferOwnership(safeMultisigAddress);
  await transferTx.wait();
  console.log(`✓ Vault ownership transfer initiated to: ${safeMultisigAddress}`);
  console.log("  (Safe multisig must execute acceptOwnership() via Safe UI to finalize)");

  // Step 6: Renounce Deployer Admin on Timelock
  console.log("\n[Step 6/7] Renouncing Deployer Admin role on LioraTimelock...");
  const TIMELOCK_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
  const renounceTx = await timelock.renounceRole(TIMELOCK_ADMIN_ROLE, deployer.address);
  await renounceTx.wait();
  console.log("✓ Deployer admin role renounced on Timelock.");

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

  // Save Deployment Record
  const deploymentRecord = {
    network: "bscMainnet",
    chainId: 56,
    deployedAt: new Date().toISOString(),
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
      safeMultisigAddress: safeMultisigAddress,
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
  console.log(`\n✓ Deployment artifact successfully saved to: ${mainnetArtifactPath}`);

  console.log("\n======================================================================");
  console.log("MAINNET DEPLOYMENT COMPLETED SUCCESSFULLY");
  console.log("======================================================================");
  console.log("\nNext Steps for BscScan Verification:");
  console.log(`npx hardhat verify --network bscMainnet ${reserveVaultAddress} ${deployer.address}`);
  console.log(`npx hardhat verify --network bscMainnet ${timelockAddress} ${minDelaySeconds} '["${safeMultisigAddress}"]' '["${safeMultisigAddress}"]' ${deployer.address}`);
  console.log(`npx hardhat verify --network bscMainnet ${implAddress}`);
}

main().catch((error) => {
  console.error("Mainnet deployment failed:", error);
  process.exitCode = 1;
});
