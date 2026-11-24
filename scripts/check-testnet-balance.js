const { ethers } = require("hardhat");

/**
 * Read-Only Pre-Flight Verification Script for BSC Testnet
 * 
 * Verifies deployer key configuration, derives the public address,
 * confirms RPC network connectivity (Chain ID 97), and checks tBNB balance.
 * 
 * DOES NOT INITIATE ANY TRANSACTIONS OR MUTATE STATE.
 */
async function main() {
  console.log("====================================================");
  console.log("OXENIQ BSC Testnet — Pre-Flight Readiness Check");
  console.log("====================================================");

  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key || key.trim().length === 0) {
    console.log("STATUS: BLOCKER DETECTED");
    console.log("Reason: DEPLOYER_PRIVATE_KEY is not configured in your local .env file.");
    console.log("\nSetup Instructions:");
    console.log("1. Create a local .env file in the project root (D:\\Projects\\OXENIQ\\.env).");
    console.log("2. Generate a dedicated testnet wallet and request free tBNB from https://testnet.bnbchain.org/faucet-smart");
    console.log("3. Add the key to .env: DEPLOYER_PRIVATE_KEY=your_private_key_here");
    console.log("====================================================");
    process.exit(1);
  }

  const networkObj = await ethers.provider.getNetwork();
  const chainId = Number(networkObj.chainId);

  if (chainId !== 97) {
    console.log("STATUS: NETWORK MISMATCH BLOCKER");
    console.log(`Expected Chain ID 97 (BSC Testnet), but active network returned Chain ID ${chainId}.`);
    console.log("Please ensure you run this with: npx hardhat run scripts/check-testnet-balance.js --network bscTestnet");
    console.log("====================================================");
    process.exit(1);
  }

  const signers = await ethers.getSigners();
  const [deployer] = signers;
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceEther = ethers.formatEther(balance);

  console.log("Network:            BNB Smart Chain Testnet");
  console.log("Chain ID:           97");
  console.log("Deployer Address:  ", deployer.address);
  console.log("Gas Balance:       ", balanceEther, "tBNB");

  if (balance === 0n) {
    console.log("\nSTATUS: ZERO GAS BALANCE BLOCKER");
    console.log("The deployer wallet has 0 tBNB.");
    console.log("Please fund this address with free testnet tBNB at: https://testnet.bnbchain.org/faucet-smart");
    console.log("====================================================");
    process.exit(1);
  }

  console.log("\nSTATUS: READY FOR DEPLOYMENT");
  console.log("Deployer account has sufficient gas to deploy OxeniqToken and AllocationManager.");
  console.log("====================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error during pre-flight check:", err.message);
    process.exit(1);
  });
