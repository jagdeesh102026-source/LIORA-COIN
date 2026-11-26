const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * LIORA UUPS Governance Migration Engine
 * Target: Seamless Migration from Single Governance Wallet to Corporate Safe 3-of-5 Multisig
 *
 * Guarantees:
 * 1. Token Proxy Address NEVER changes.
 * 2. Token supply, balances, and DEX pools remain 100% undisturbed.
 * 3. Lockout Protection: Role grant occurs and is verified BEFORE single-wallet renunciation.
 * 4. Two-Step Vault Ownership: Vault remains under Governance EOA protection until Safe accepts.
 */
async function main() {
  console.log("======================================================================");
  console.log("LIORA — Governance Migration Engine (Single Wallet -> Safe Multisig)");
  console.log("======================================================================");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`Network: ${hre.network.name} (Chain ID: ${chainId})`);

  const deploymentsDir = path.resolve(__dirname, "../deployments");
  const artifactPath = path.join(deploymentsDir, "bscMainnet-uups.json");

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`CRITICAL ERROR: Deployment record not found at '${artifactPath}'. Cannot migrate un-deployed system.`);
  }

  const deployment = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const { proxyAddress, timelockAddress, reserveVaultAddress } = deployment.contracts;

  console.log("\nActive Deployed Contracts:");
  console.log(`- Token Proxy:   ${proxyAddress}`);
  console.log(`- Timelock:      ${timelockAddress}`);
  console.log(`- Reserve Vault: ${reserveVaultAddress}`);

  // Retrieve Target Safe Multisig Address
  const safeMultisigAddress = process.env.LIORA_MAINNET_SAFE_MULTISIG;
  if (!safeMultisigAddress || !ethers.isAddress(safeMultisigAddress) || safeMultisigAddress === ethers.ZeroAddress) {
    throw new Error("CRITICAL ERROR: Valid LIORA_MAINNET_SAFE_MULTISIG environment variable is required for migration.");
  }

  // Retrieve Signer (Current Governance Wallet)
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error("CRITICAL ERROR: No signer found. Must be executed with the active Governance Wallet.");
  }
  const governanceSigner = signers[0];
  console.log(`\nExecuting Governance Signer: ${governanceSigner.address}`);
  console.log(`Target Corporate Safe:       ${safeMultisigAddress}`);

  // 1. Vault Ownership Migration via Ownable2Step
  console.log("\n[1/3] Migrating LioraReserveVault (Ownable2Step)...");
  const VaultFactory = await ethers.getContractFactory("LioraReserveVault");
  const vault = VaultFactory.attach(reserveVaultAddress).connect(governanceSigner);

  const currentVaultOwner = await vault.owner();
  if (currentVaultOwner.toLowerCase() !== governanceSigner.address.toLowerCase()) {
    throw new Error(`CRITICAL ERROR: Signer ${governanceSigner.address} is not the current vault owner (${currentVaultOwner}).`);
  }

  const pendingVaultOwner = await vault.pendingOwner();
  if (pendingVaultOwner.toLowerCase() !== safeMultisigAddress.toLowerCase()) {
    console.log(`- Calling vault.transferOwnership(${safeMultisigAddress})...`);
    const tx1 = await vault.transferOwnership(safeMultisigAddress);
    await tx1.wait();
    console.log(`  ✓ Transfer initiated. Pending owner set to: ${safeMultisigAddress}`);
  } else {
    console.log(`- Pending owner is already set to ${safeMultisigAddress}.`);
  }

  // 2. Timelock Role Migration (AccessControl)
  console.log("\n[2/3] Migrating LioraTimelock Roles...");
  const TimelockFactory = await ethers.getContractFactory("LioraTimelock");
  const timelock = TimelockFactory.attach(timelockAddress).connect(governanceSigner);

  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  const TIMELOCK_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

  // Verify governanceSigner is Timelock admin
  const isTimelockAdmin = await timelock.hasRole(TIMELOCK_ADMIN_ROLE, governanceSigner.address);
  if (!isTimelockAdmin) {
    throw new Error(`CRITICAL ERROR: Signer ${governanceSigner.address} is not an admin on Timelock.`);
  }

  // Grant roles to Safe Multisig first (Lockout Prevention)
  const roles = [
    { name: "PROPOSER_ROLE", role: PROPOSER_ROLE },
    { name: "CANCELLER_ROLE", role: CANCELLER_ROLE },
    { name: "EXECUTOR_ROLE", role: EXECUTOR_ROLE },
    { name: "DEFAULT_ADMIN_ROLE", role: TIMELOCK_ADMIN_ROLE },
  ];

  for (const r of roles) {
    const has = await timelock.hasRole(r.role, safeMultisigAddress);
    if (!has) {
      console.log(`- Granting ${r.name} to Safe Multisig...`);
      const gtx = await timelock.grantRole(r.role, safeMultisigAddress);
      await gtx.wait();
      console.log(`  ✓ ${r.name} granted.`);
    } else {
      console.log(`  ✓ Safe Multisig already holds ${r.name}.`);
    }
  }

  // Verify Safe has all roles BEFORE renouncing
  for (const r of roles) {
    const verified = await timelock.hasRole(r.role, safeMultisigAddress);
    if (!verified) {
      throw new Error(`CRITICAL SAFETY ABORT: Safe Multisig failed verification for ${r.name}. Renunciation blocked to prevent lockout.`);
    }
  }

  // Renounce roles from governanceSigner
  console.log("\n[3/3] Renouncing Single Governance Wallet Roles on Timelock...");
  for (const r of roles) {
    const stillHas = await timelock.hasRole(r.role, governanceSigner.address);
    if (stillHas) {
      console.log(`- Renouncing ${r.name}...`);
      const rtx = await timelock.renounceRole(r.role, governanceSigner.address);
      await rtx.wait();
      console.log(`  ✓ ${r.name} renounced.`);
    }
  }

  // Update Deployment Record
  deployment.governanceModel = "CORPORATE_SAFE_MULTISIG";
  deployment.migratedAt = new Date().toISOString();
  deployment.governance.safeMultisigAddress = safeMultisigAddress;
  deployment.governance.isMultisig = true;
  fs.writeFileSync(artifactPath, JSON.stringify(deployment, null, 2));

  console.log("\n======================================================================");
  console.log("MIGRATION EXECUTION PHASE COMPLETED SUCCESSFULLY");
  console.log("======================================================================");
  console.log("\nFinal Handover Action Required:");
  console.log("The Corporate Safe Multisig keyholders must execute a transaction on");
  console.log(`LioraReserveVault (${reserveVaultAddress}) calling:`);
  console.log("  => acceptOwnership()");
  console.log("This will finalize full 3-of-5 multisig control over the 99 Billion LIORA reserve.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
