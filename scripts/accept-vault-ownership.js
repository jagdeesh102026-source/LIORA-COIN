const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * LIORA — Post-Deployment Reserve Vault Ownership Acceptance Helper
 *
 * Executed by the Governance Wallet (0x491d37ab13E66f6fd544Cdb3A4C57015D7fc2d54)
 * to accept the two-step ownership handover of LioraReserveVault from the Deployer.
 *
 * This completes the final handover of the 99 Billion LIORA Reserve Vault.
 */
async function main() {
  console.log("======================================================================");
  console.log("LIORA — Reserve Vault Ownership Acceptance Handover");
  console.log("======================================================================");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`Network: ${hre.network.name} (Chain ID: ${chainId})`);

  const deploymentsDir = path.resolve(__dirname, "../deployments");
  const artifactPath = path.join(deploymentsDir, "bscMainnet-uups.json");

  let vaultAddress;
  if (fs.existsSync(artifactPath)) {
    const deployment = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    vaultAddress = deployment.contracts.reserveVaultAddress;
  } else if (process.env.LIORA_RESERVE_VAULT_ADDRESS) {
    vaultAddress = process.env.LIORA_RESERVE_VAULT_ADDRESS;
  } else {
    throw new Error(
      `Deployment record not found at '${artifactPath}' and LIORA_RESERVE_VAULT_ADDRESS is not set.`
    );
  }

  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error("No signer available. Provide GOVERNANCE_PRIVATE_KEY or run with configured signer.");
  }
  const governanceSigner = signers[0];
  console.log(`Executing Signer: ${governanceSigner.address}`);
  console.log(`Reserve Vault:    ${vaultAddress}`);

  const VaultFactory = await ethers.getContractFactory("LioraReserveVault");
  const vault = VaultFactory.attach(vaultAddress).connect(governanceSigner);

  const currentOwner = await vault.owner();
  const pendingOwner = await vault.pendingOwner();

  console.log(`\nCurrent Vault Owner: ${currentOwner}`);
  console.log(`Pending Vault Owner: ${pendingOwner}`);

  if (currentOwner.toLowerCase() === governanceSigner.address.toLowerCase()) {
    console.log("\n✓ SUCCESS: This signer is already the confirmed Owner of LioraReserveVault!");
    return;
  }

  if (pendingOwner.toLowerCase() !== governanceSigner.address.toLowerCase()) {
    throw new Error(
      `ABORT: Signer ${governanceSigner.address} is NOT the pending owner (pending is: ${pendingOwner}).`
    );
  }

  console.log("\nSubmitting acceptOwnership() transaction...");
  const tx = await vault.acceptOwnership();
  console.log(`Tx submitted: ${tx.hash}. Waiting for confirmation...`);
  await tx.wait(1);

  const newOwner = await vault.owner();
  console.log(`\n✓ SUCCESS: Ownership successfully accepted! New Owner: ${newOwner}`);
}

main().catch((err) => {
  console.error("Acceptance failed:", err);
  process.exitCode = 1;
});
