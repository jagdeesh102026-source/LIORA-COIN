const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { assertNoArtifactCollision } = require("./deploymentGuards");

async function main() {
  const networkObj = await ethers.provider.getNetwork();
  const chainId = Number(networkObj.chainId);

  console.log("====================================================");
  console.log("OXENIQ Token Ecosystem — Deployment Engine");
  console.log("Target Network:", network.name, "| Active Chain ID:", chainId);
  console.log("====================================================");

  // Strict safety guardrails
  if (chainId === 56) {
    throw new Error(
      "CRITICAL SAFETY ABORT: BSC Mainnet (Chain ID 56) deployment is strictly disabled in this testing phase."
    );
  }

  if (network.name === "bscTestnet" && chainId !== 97) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Expected BSC Testnet (Chain ID 97), but active provider returned Chain ID ${chainId}.`
    );
  }

  const deploymentsDir = path.join(__dirname, "..", "deployments");

  // Fail-closed artifact collision guard: abort immediately before any transaction
  // Checks both <network>.json (complete deployment) and <network>.partial.json (partial failure recovery)
  const { outputPath, partialPath } = assertNoArtifactCollision(deploymentsDir, network.name);

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
      `BLOCKER: Deployer account ${deployer.address} has 0 tBNB balance on BSC Testnet. Please fund it with testnet tBNB from the official BSC Testnet faucet before deploying.`
    );
  }

  // Canonical token supply: exactly 1,000,000,000 (1 Billion) OXENIQ with 18 decimals
  const TOTAL_SUPPLY_TOKENS = "1000000000";
  const INITIAL_SUPPLY = ethers.parseEther(TOTAL_SUPPLY_TOKENS);

  console.log("\n1. Deploying OxeniqToken (BEP-20 / ERC-20)...");
  console.log("   Initial Supply:", TOTAL_SUPPLY_TOKENS, "OXENIQ (18 decimals)");
  const OxeniqToken = await ethers.getContractFactory("OxeniqToken");
  const oxeniq = await OxeniqToken.deploy(
    "OXENIQ",
    "OXENIQ",
    INITIAL_SUPPLY,
    deployer.address
  );
  await oxeniq.waitForDeployment();
  const oxeniqAddress = await oxeniq.getAddress();
  const oxeniqTx = oxeniq.deploymentTransaction();
  console.log("✓ OxeniqToken deployed at:", oxeniqAddress);
  console.log("  Tx Hash:", oxeniqTx ? oxeniqTx.hash : "N/A");

  console.log("\n2. Deploying AllocationManager (70:30 Split Controller)...");
  let allocationAddress;
  let allocationTx;
  try {
    const AllocationManager = await ethers.getContractFactory("AllocationManager");
    // For testnet deployment, recipient70 and recipient30 default to deployer
    const allocationManager = await AllocationManager.deploy(
      oxeniqAddress,
      deployer.address,
      deployer.address,
      deployer.address
    );
    await allocationManager.waitForDeployment();
    allocationAddress = await allocationManager.getAddress();
    allocationTx = allocationManager.deploymentTransaction();
    console.log("✓ AllocationManager deployed at:", allocationAddress);
    console.log("  Tx Hash:", allocationTx ? allocationTx.hash : "N/A");
  } catch (allocError) {
    console.error("\n====================================================");
    console.error("CRITICAL ERROR: PARTIAL DEPLOYMENT DETECTED");
    console.error("====================================================");
    console.error("OxeniqToken deployed successfully, but AllocationManager failed to deploy.");
    console.error("Deployed OxeniqToken Address:", oxeniqAddress);
    console.error("OxeniqToken Tx Hash:        ", oxeniqTx ? oxeniqTx.hash : "N/A");
    console.error("Failure Reason:             ", allocError.message);
    console.error("\nSAFE RECOVERY GUIDANCE:");
    console.error("1. DO NOT rerun scripts/deploy.js directly; doing so would deploy a duplicate token contract and fragment supply.");
    console.error("2. A partial recovery record is being saved to: deployments/" + network.name + ".partial.json");
    console.error("3. Deploy AllocationManager individually by referencing the existing OxeniqToken address (" + oxeniqAddress + ").");
    console.error("4. See docs/DEPLOYMENT.md for complete manual recovery steps.");
    console.error("====================================================");

    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    const partialData = {
      network: network.name,
      chainId,
      status: "PARTIAL_DEPLOYMENT_FAILURE",
      failedAt: new Date().toISOString(),
      deployer: deployer.address,
      error: allocError.message,
      contracts: {
        OxeniqToken: {
          address: oxeniqAddress,
          txHash: oxeniqTx ? oxeniqTx.hash : null,
          name: "OXENIQ",
          symbol: "OXENIQ",
          decimals: 18,
          initialSupply: INITIAL_SUPPLY.toString(),
        },
        AllocationManager: {
          status: "FAILED_DEPLOYMENT",
          address: null,
        },
      },
      recoveryInstructions:
        "Deploy AllocationManager with tokenAddress set to " +
        oxeniqAddress +
        ". Do not redeploy OxeniqToken.",
    };
    fs.writeFileSync(partialPath, JSON.stringify(partialData, null, 2), "utf8");
    throw allocError;
  }

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

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

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
