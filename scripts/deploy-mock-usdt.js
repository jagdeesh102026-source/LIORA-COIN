const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`\n=== LIORA COIN — Clearly Labeled Mock USDT Deployment ===`);
  console.log(`Target Network: ${hre.network.name} (Chain ID: ${chainId})`);

  // Security guardrail: Strictly block Mainnet (Chain ID 56)
  if (chainId === 56) {
    throw new Error("SECURITY VIOLATION: Deploying mock tokens to BSC Mainnet (#56) is strictly prohibited.");
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

  console.log("\nDeploying MockUSDT.sol...");
  console.log("- Name: Mock Tether USD (Testnet Sandbox)");
  console.log("- Symbol: mUSDT");
  console.log("- Decimals: 18");
  console.log("- Initial Mint: 1,000,000 mUSDT (Valueless sandbox test tokens)");
  console.log(`- Initial Owner & Faucet: ${deployer.address}`);

  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUsdt = await MockUSDT.deploy(deployer.address);
  await mockUsdt.waitForDeployment();

  const usdtAddress = await mockUsdt.getAddress();
  console.log(`\n>>> MockUSDT successfully deployed to: ${usdtAddress}`);

  const deployTx = mockUsdt.deploymentTransaction();
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
    contractName: "MockUSDT",
    address: usdtAddress,
    deployer: deployer.address,
    txHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    deployedAt: new Date().toISOString(),
    name: "Mock Tether USD (Testnet Sandbox)",
    symbol: "mUSDT",
    decimals: 18,
    initialSupply: "1000000000000000000000000",
    disclaimer: "STRICTLY FOR BSC TESTNET SANDBOX TESTING. ZERO REAL MONETARY VALUE."
  };

  const filePath = path.join(deploymentDir, `bscTestnet-mock-usdt.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));
  console.log(`Deployment metadata saved to: ${filePath}`);
}

main().catch((error) => {
  console.error("Mock USDT deployment failed:", error);
  process.exitCode = 1;
});

