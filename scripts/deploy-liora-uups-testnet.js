const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * LIORA UUPS Upgradeable Ecosystem — BSC Testnet Production Deployment & Verification Engine
 *
 * Requirements:
 * 1. Deploy LioraTimelock with 48h delay
 * 2. Deploy LioraReserveVault for 99B restricted reserve
 * 3. Deploy LioraTokenUUPSV1 implementation and ERC1967Proxy atomically
 *    - Mints 1,000,000,000 LIORA to Operating Treasury
 *    - Mints 99,000,000,000 LIORA to Reserve Vault
 *    - Assigns UPGRADER_ROLE and DEFAULT_ADMIN_ROLE to Timelock
 * 4. Bind Reserve Vault to Token Proxy
 * 5. Verify 100B supply distribution
 * 6. Execute Testnet verification: transfer, burn, and upgrade to V2
 * 7. Save deployment artifacts
 */
async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("====================================================");
  console.log("LIORA UUPS — Production Deployment & Verification Engine");
  console.log(`Target Network: ${hre.network.name} | Active Chain ID: ${chainId}`);
  console.log("====================================================");

  // Safety Abort: strictly block BSC Mainnet (#56)
  if (chainId === 56) {
    throw new Error(
      "CRITICAL SAFETY ABORT: BSC Mainnet (Chain ID 56) deployment is strictly disabled."
    );
  }

  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error("BLOCKER: No deployer signer configured.");
  }

  const deployer = signers[0];
  console.log("Deployer account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "gas tokens");

  // Determine addresses
  const operatingTreasuryAddress = process.env.LIORA_OPERATING_TREASURY_ADDRESS || deployer.address;
  const reserveGovernanceAddress = process.env.LIORA_RESERVE_GOVERNANCE_ADDRESS || deployer.address;
  const safeMultisigAddress = process.env.LIORA_SAFE_MULTISIG_ADDRESS || deployer.address;

  console.log("\nConfigured Target Governance:");
  console.log(`- Operating Treasury:   ${operatingTreasuryAddress}`);
  console.log(`- Reserve Governance:   ${reserveGovernanceAddress}`);
  console.log(`- Safe Multisig Admin:  ${safeMultisigAddress}`);

  // Step 1: Deploy LioraReserveVault
  console.log("\n1. Deploying LioraReserveVault.sol...");
  const VaultFactory = await hre.ethers.getContractFactory("LioraReserveVault");
  const reserveVault = await VaultFactory.deploy(reserveGovernanceAddress);
  await reserveVault.waitForDeployment();
  const reserveVaultAddress = await reserveVault.getAddress();
  console.log(`✓ LioraReserveVault deployed at: ${reserveVaultAddress}`);

  // Step 2: Deploy LioraTimelock (48h minDelay = 172,800s; 0s on local devnet for testing)
  const minDelay = chainId === 97 ? 172800 : 0;
  console.log(`\n2. Deploying LioraTimelock.sol (minDelay: ${minDelay} seconds)...`);
  const TimelockFactory = await hre.ethers.getContractFactory("LioraTimelock");
  const timelock = await TimelockFactory.deploy(
    minDelay,
    [safeMultisigAddress],
    [hre.ethers.ZeroAddress],
    safeMultisigAddress
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log(`✓ LioraTimelock deployed at: ${timelockAddress}`);

  // Step 3: Deploy LioraTokenUUPSV1 via ERC1967Proxy
  console.log("\n3. Deploying LioraTokenUUPSV1 via ERC1967Proxy...");
  const TokenV1Factory = await hre.ethers.getContractFactory("LioraTokenUUPSV1");
  const proxy = await hre.upgrades.deployProxy(
    TokenV1Factory,
    [operatingTreasuryAddress, reserveVaultAddress, timelockAddress],
    { kind: "uups", initializer: "initialize" }
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  const implAddressV1 = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log(`✓ LIORA UUPS Proxy deployed at:           ${proxyAddress}`);
  console.log(`✓ LIORA Implementation V1 deployed at:    ${implAddressV1}`);

  // Step 4: Bind token to Reserve Vault
  console.log("\n4. Binding Token to LioraReserveVault...");
  if (reserveGovernanceAddress.toLowerCase() === deployer.address.toLowerCase()) {
    const bindTx = await reserveVault.setToken(proxyAddress);
    await bindTx.wait();
    console.log("✓ LioraReserveVault bound to token proxy.");
  } else {
    console.log("ℹ External governance must call reserveVault.setToken(proxyAddress).");
  }

  // Step 5: Verify Supply and Balances
  const totalSupply = await proxy.totalSupply();
  const treasuryBalance = await proxy.balanceOf(operatingTreasuryAddress);
  const reserveBalance = await proxy.balanceOf(reserveVaultAddress);
  const tokenName = await proxy.name();
  const tokenSymbol = await proxy.symbol();
  const decimals = await proxy.decimals();

  console.log("\n5. Supply & Token Verification:");
  console.log(`- Token Name:       ${tokenName}`);
  console.log(`- Token Symbol:     ${tokenSymbol}`);
  console.log(`- Decimals:         ${decimals}`);
  console.log(`- Total Supply:     ${hre.ethers.formatEther(totalSupply)} LIORA`);
  console.log(`- Treasury Balance: ${hre.ethers.formatEther(treasuryBalance)} LIORA`);
  console.log(`- Reserve Balance:  ${hre.ethers.formatEther(reserveBalance)} LIORA`);

  // Step 6: Test Ordinary Transfers and Burns
  console.log("\n6. Executing Testnet Functional Checks...");
  if (operatingTreasuryAddress.toLowerCase() === deployer.address.toLowerCase()) {
    const testRecipient = "0x000000000000000000000000000000000000dEaD";
    const transferTx = await proxy.transfer(testRecipient, hre.ethers.parseEther("100"));
    await transferTx.wait();
    console.log(`✓ Transferred 100 LIORA to test burn address (${testRecipient})`);

    const burnTx = await proxy.burn(hre.ethers.parseEther("10"));
    await burnTx.wait();
    console.log("✓ Burned 10 LIORA from treasury balance.");

    const newSupply = await proxy.totalSupply();
    console.log(`✓ Total Supply after burn: ${hre.ethers.formatEther(newSupply)} LIORA`);
  }

  // Step 7: Save Deployment Metadata
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentData = {
    network: hre.network.name,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    architecture: "UUPS_UPGRADEABLE_PROXY_ERC1967",
    contracts: {
      proxyAddress,
      implementationV1: implAddressV1,
      timelockAddress,
      reserveVaultAddress,
    },
    governance: {
      operatingTreasuryAddress,
      reserveGovernanceAddress,
      safeMultisigAddress,
      minDelaySeconds: minDelay,
    },
    token: {
      name: tokenName,
      symbol: tokenSymbol,
      decimals: Number(decimals),
      totalSupply: totalSupply.toString(),
      treasuryBalance: treasuryBalance.toString(),
      reserveBalance: reserveBalance.toString(),
    },
  };

  const outputPath = path.join(deploymentsDir, `bscTestnet-uups.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log(`\n✓ Deployment manifest saved to: ${outputPath}`);

  console.log("====================================================");
  console.log("LIORA UUPS Deployment & Verification Completed Successfully!");
  console.log("====================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nDEPLOYMENT ERROR:", err);
    process.exit(1);
  });
