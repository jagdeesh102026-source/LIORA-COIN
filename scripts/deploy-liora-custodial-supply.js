const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * LIORA Token Ecosystem — Deployment Engine (Fixed 100B Supply Architecture)
 * 
 * Target Network: BSC Testnet (#97) / Local Hardhat (#31337)
 * Prohibited: BSC Mainnet (#56) strictly blocked unless explicit management authorization
 *
 * Architecture:
 * 1. Deploy LioraReserveVault(reserveGovernanceAddress)
 * 2. Deploy LioraTokenCustodial(operatingTreasuryAddress, reserveVaultAddress)
 *    - Mints 1,000,000,000 LIORA (1B) to Operating Treasury
 *    - Mints 99,000,000,000 LIORA (99B) to Restricted Reserve Vault
 *    - Future minting is permanently DISABLED
 * 3. Bind LioraReserveVault.setToken(lioraTokenCustodialAddress)
 */
async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("====================================================");
  console.log("LIORA COIN — Authoritative Fixed Supply Deployment Engine");
  console.log(`Target Network: ${hre.network.name} | Active Chain ID: ${chainId}`);
  console.log("====================================================");

  // Safety Abort: strictly block BSC Mainnet (#56)
  if (chainId === 56) {
    throw new Error(
      "CRITICAL SAFETY ABORT: BSC Mainnet (Chain ID 56) deployment is strictly disabled without explicit authorization."
    );
  }

  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error("BLOCKER: No deployer signer configured.");
  }

  const [deployer, treasurySigner, reserveGovernanceSigner] = signers;
  console.log("Deployer account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "native gas tokens");

  if (balance === 0n && chainId === 97) {
    throw new Error(
      `BLOCKER: Deployer account ${deployer.address} has 0 tBNB balance on BSC Testnet. Please fund with tBNB.`
    );
  }

  // Determine addresses
  const operatingTreasuryAddress = process.env.LIORA_OPERATING_TREASURY_ADDRESS || 
    (treasurySigner ? treasurySigner.address : deployer.address);

  const reserveGovernanceAddress = process.env.LIORA_RESERVE_GOVERNANCE_ADDRESS || 
    (reserveGovernanceSigner ? reserveGovernanceSigner.address : deployer.address);

  console.log("\nConfigured Target Addresses:");
  console.log(`- Operating Treasury (1B LIORA recipient):   ${operatingTreasuryAddress}`);
  console.log(`- Reserve Governance (99B multi-sig admin):  ${reserveGovernanceAddress}`);

  // Step 1: Deploy LioraReserveVault
  console.log("\n1. Deploying LioraReserveVault.sol...");
  const VaultFactory = await hre.ethers.getContractFactory("LioraReserveVault");
  const reserveVault = await VaultFactory.deploy(reserveGovernanceAddress);
  await reserveVault.waitForDeployment();
  const reserveVaultAddress = await reserveVault.getAddress();
  const vaultTx = reserveVault.deploymentTransaction();
  const vaultReceipt = await vaultTx.wait();
  console.log(`✓ LioraReserveVault deployed at: ${reserveVaultAddress}`);
  console.log(`  Tx Hash: ${vaultTx.hash} | Gas Used: ${vaultReceipt.gasUsed.toString()}`);

  // Step 2: Deploy LioraTokenCustodial
  console.log("\n2. Deploying LioraTokenCustodial.sol (Fixed 100B Supply)...");
  console.log("   - Total Supply: 100,000,000,000 LIORA (18 decimals)");
  console.log("   - Treasury Allocation: 1,000,000,000 LIORA");
  console.log("   - Reserve Allocation: 99,000,000,000 LIORA");
  console.log("   - Post-deployment minting: DISABLED");
  const TokenFactory = await hre.ethers.getContractFactory("contracts/LioraTokenCustodial.sol:LioraTokenCustodial");
  const lioraToken = await TokenFactory.deploy(operatingTreasuryAddress, reserveVaultAddress);
  await lioraToken.waitForDeployment();
  const lioraTokenAddress = await lioraToken.getAddress();
  const tokenTx = lioraToken.deploymentTransaction();
  const tokenReceipt = await tokenTx.wait();
  console.log(`✓ LioraTokenCustodial deployed at: ${lioraTokenAddress}`);
  console.log(`  Tx Hash: ${tokenTx.hash} | Gas Used: ${tokenReceipt.gasUsed.toString()}`);

  // Step 3: Bind token to Reserve Vault (if deployer is governance or temporary admin)
  console.log("\n3. Binding Canonical Token to LioraReserveVault...");
  const currentVaultOwner = await reserveVault.owner();
  if (currentVaultOwner.toLowerCase() === deployer.address.toLowerCase()) {
    const bindTx = await reserveVault.setToken(lioraTokenAddress);
    await bindTx.wait();
    console.log("✓ LioraReserveVault bound to token address.");
  } else {
    console.log("ℹ Vault owner is external governance. setToken() must be called by governance account:", currentVaultOwner);
  }

  // Step 4: Verification of Balances
  const totalSupply = await lioraToken.totalSupply();
  const treasuryBalance = await lioraToken.balanceOf(operatingTreasuryAddress);
  const reserveBalance = await lioraToken.balanceOf(reserveVaultAddress);

  console.log("\n4. Verification of Supply Distribution:");
  console.log(`- Total Supply:     ${hre.ethers.formatEther(totalSupply)} LIORA`);
  console.log(`- Treasury Balance: ${hre.ethers.formatEther(treasuryBalance)} LIORA`);
  console.log(`- Reserve Balance:  ${hre.ethers.formatEther(reserveBalance)} LIORA`);

  // Step 5: Save Deployment Metadata
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentData = {
    network: hre.network.name,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      LioraReserveVault: {
        address: reserveVaultAddress,
        txHash: vaultTx.hash,
        gasUsed: vaultReceipt.gasUsed.toString(),
        governanceOwner: reserveGovernanceAddress,
        allocatedTokens: "99000000000000000000000000000",
      },
      LioraTokenCustodial: {
        address: lioraTokenAddress,
        txHash: tokenTx.hash,
        gasUsed: tokenReceipt.gasUsed.toString(),
        name: "LIORA COIN",
        symbol: "LIORA",
        decimals: 18,
        totalSupply: "100000000000000000000000000000",
        operatingTreasury: operatingTreasuryAddress,
        treasuryAllocation: "1000000000000000000000000000",
        reserveVault: reserveVaultAddress,
        futureMinting: "DISABLED",
        burnEnabled: true,
        transferEnabled: true,
      },
    },
  };

  const outputPath = path.join(deploymentsDir, `${hre.network.name}-liora-custodial.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2), "utf8");
  console.log(`\n✓ Deployment summary saved to: ${outputPath}`);
  console.log("====================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
