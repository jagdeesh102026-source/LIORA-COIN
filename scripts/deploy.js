const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("====================================================");
  console.log("Deploying OXENIQ Token Ecosystem");
  console.log("Network:", network.name, "(Chain ID:", (await ethers.provider.getNetwork()).chainId, ")");
  console.log("====================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "native gas tokens");

  // Safe provisional initial supply: 1,000,000 OXENIQ with 18 decimals
  const INITIAL_SUPPLY = ethers.parseEther("1000000");

  console.log("\n1. Deploying OxeniqToken (BEP-20 / ERC-20)...");
  const OxeniqToken = await ethers.getContractFactory("OxeniqToken");
  const oxeniq = await OxeniqToken.deploy(
    "OXENIQ",
    "OXENIQ",
    INITIAL_SUPPLY,
    deployer.address
  );
  await oxeniq.waitForDeployment();
  const oxeniqAddress = await oxeniq.getAddress();
  console.log("✓ OxeniqToken deployed at:", oxeniqAddress);

  console.log("\n2. Deploying AllocationManager (70:30 Split Controller)...");
  const AllocationManager = await ethers.getContractFactory("AllocationManager");
  // For provisional deployment, recipient70 and recipient30 default to deployer
  const allocationManager = await AllocationManager.deploy(
    oxeniqAddress,
    deployer.address,
    deployer.address,
    deployer.address
  );
  await allocationManager.waitForDeployment();
  const allocationAddress = await allocationManager.getAddress();
  console.log("✓ AllocationManager deployed at:", allocationAddress);

  const deploymentData = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      OxeniqToken: {
        address: oxeniqAddress,
        name: "OXENIQ",
        symbol: "OXENIQ",
        decimals: 18,
        initialSupply: INITIAL_SUPPLY.toString(),
      },
      AllocationManager: {
        address: allocationAddress,
        ratio: "70:30",
        recipient70: deployer.address,
        recipient30: deployer.address,
      },
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outputPath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2), "utf8");
  console.log("\n✓ Deployment summary saved to:", outputPath);
  console.log("====================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
