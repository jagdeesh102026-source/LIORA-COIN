const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`\n=== LIORA COIN — Clean BEP-20 Token Deployment ===`);
  console.log(`Target Network: ${hre.network.name} (Chain ID: ${chainId})`);

  // Security guardrail: Strictly block Mainnet (Chain ID 56)
  if (chainId === 56) {
    throw new Error("SECURITY VIOLATION: Deploying to BSC Mainnet (#56) is strictly prohibited in this phase.");
  }
  if (chainId !== 97 && chainId !== 31337) {
    throw new Error(`Unsupported network Chain ID ${chainId}. Only BSC Testnet (#97) and Local Devnet (#31337) are authorized.`);
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer configured.");
  }

  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Deployer tBNB Balance: ${hre.ethers.formatEther(deployerBalance)} tBNB`);

  if (deployerBalance < hre.ethers.parseEther("0.01")) {
    throw new Error("Insufficient tBNB balance for deployment gas (minimum 0.01 tBNB required).");
  }

  console.log("\nDeploying LioraToken.sol...");
  console.log("- Name: LIORA COIN");
  console.log("- Symbol: LIORA");
  console.log("- Decimals: 18");
  console.log("- Initial Supply: 1,000,000,000 LIORA (10^27 base units)");
  console.log(`- Initial Owner: ${deployer.address}`);

  const LioraToken = await hre.ethers.getContractFactory("LioraToken");
  const liora = await LioraToken.deploy(deployer.address);
  await liora.waitForDeployment();

  const lioraAddress = await liora.getAddress();
  console.log(`\n>>> LioraToken successfully deployed to: ${lioraAddress}`);

  const deployTx = liora.deploymentTransaction();
  const receipt = await deployTx.wait();
  console.log(`- Transaction Hash: ${deployTx.hash}`);
  console.log(`- Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`- Block Number: ${receipt.blockNumber}`);

  // Save deployment artifact
  const deploymentDir = path.resolve(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentData = {
    network: hre.network.name,
    chainId,
    contractName: "LioraToken",
    address: lioraAddress,
    deployer: deployer.address,
    txHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    deployedAt: new Date().toISOString(),
    name: "LIORA COIN",
    symbol: "LIORA",
    decimals: 18,
    initialSupply: "1000000000000000000000000000"
  };

  const filePath = path.join(deploymentDir, `bscTestnet-liora.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));
  console.log(`Deployment metadata saved to: ${filePath}`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});

