const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkObj = await ethers.provider.getNetwork();
  const chainId = Number(networkObj.chainId);

  console.log("====================================================");
  console.log("OXENIQ Testnet Token Sale — Deployment Engine");
  console.log("Target Network:", network.name, "| Active Chain ID:", chainId);
  console.log("====================================================");

  // Strict network guardrails
  if (chainId === 56) {
    throw new Error(
      "CRITICAL SAFETY ABORT: BSC Mainnet (Chain ID 56) deployment is strictly blocked. TestnetTokenSale is testnet-only."
    );
  }

  if (network.name === "bscTestnet" && chainId !== 97) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Expected BSC Testnet (Chain ID 97), but active provider returned Chain ID ${chainId}.`
    );
  }

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const baseDeploymentPath = path.join(deploymentsDir, `${network.name}.json`);
  const saleOutputPath = path.join(deploymentsDir, `${network.name}-sale.json`);

  if (fs.existsSync(saleOutputPath)) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Sale deployment artifact already exists at '${saleOutputPath}'. Redeployment is blocked to prevent duplicate contracts. Archive or remove it if redeployment is intended.`
    );
  }

  // Load existing OxeniqToken address
  let tokenAddress = "0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";
  if (fs.existsSync(baseDeploymentPath)) {
    try {
      const baseDeployment = JSON.parse(fs.readFileSync(baseDeploymentPath, "utf8"));
      if (baseDeployment?.contracts?.OxeniqToken?.address) {
        tokenAddress = baseDeployment.contracts.OxeniqToken.address;
      }
    } catch (e) {
      console.warn("Could not parse existing base deployment, falling back to canonical address:", tokenAddress);
    }
  }

  console.log("Target OXENIQ Token Address:", tokenAddress);

  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      "BLOCKER: No deployer account configured. For BSC Testnet, set DEPLOYER_PRIVATE_KEY in .env with a testnet account funded with tBNB."
    );
  }

  const [deployer] = signers;
  console.log("Deployer account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "native gas tokens");

  if (balance === 0n && chainId === 97) {
    throw new Error(
      `BLOCKER: Deployer account ${deployer.address} has 0 tBNB balance on BSC Testnet. Please fund it with testnet tBNB before deploying.`
    );
  }

  console.log("\n1. Deploying TestnetTokenSale (Fixed Rate: 1 tBNB = 10,000 OXENIQ)...");
  const TestnetTokenSale = await ethers.getContractFactory("TestnetTokenSale");
  const sale = await TestnetTokenSale.deploy(tokenAddress, deployer.address);
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  const saleTx = sale.deploymentTransaction();

  console.log("✓ TestnetTokenSale deployed at:", saleAddress);
  console.log("  Tx Hash:", saleTx ? saleTx.hash : "N/A");

  const saleRecord = {
    network: network.name,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    tokenAddress,
    saleContractAddress: saleAddress,
    rate: "1 tBNB = 10,000 OXENIQ",
    tokensPerBnb: 10000,
    txHash: saleTx ? saleTx.hash : null,
  };

  fs.writeFileSync(saleOutputPath, JSON.stringify(saleRecord, null, 2), "utf8");
  console.log("✓ Deployment record saved to:", saleOutputPath);

  console.log("\n====================================================");
  console.log("NEXT STEPS TO FUND SALE INVENTORY (TESTNET ONLY):");
  console.log("====================================================");
  console.log("1. Transfer test OXENIQ tokens from deployer to sale contract:");
  console.log("   Destination:", saleAddress);
  console.log("   Suggested initial allocation: 50,000 OXENIQ (0.005% of supply)");
  console.log("2. Verify inventory using getAvailableInventory()");
  console.log("3. Update apps/web/src/config/tokenConfig.ts with saleContractAddress");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
