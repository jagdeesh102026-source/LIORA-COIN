const hre = require("hardhat");

/**
 * LIORA — User Test Wallet Funder
 *
 * Funds a designated user testnet address with:
 * - 50.0 LIORA (from Operating Treasury)
 * - 50.0 MockUSDT (from Deployer)
 * - 0.001 tBNB (for transaction gas fees)
 *
 * Usage:
 *   npx hardhat run scripts/fund-user-test-wallet.js --network bscTestnet
 *   (Requires TEST_WALLET_ADDRESS in .env or passed via env var)
 */
async function main() {
  const recipient = process.env.TEST_WALLET_ADDRESS;

  if (!recipient || !hre.ethers.isAddress(recipient)) {
    console.error("ERROR: Please specify a valid recipient address via TEST_WALLET_ADDRESS=<0xAddress>");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  const UUPS_LIORA_PROXY = "0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9";
  const MOCK_USDT_ADDRESS = "0x0b419a33e8a6448547906DCB191b037Db5ac926e";

  console.log("================================================================================");
  console.log("LIORA — Funding User Test Wallet on BSC Testnet");
  console.log(`Recipient Address: ${recipient}`);
  console.log("================================================================================");

  const erc20Abi = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)"
  ];
  const liora = new hre.ethers.Contract(UUPS_LIORA_PROXY, erc20Abi, deployer);
  const usdt = new hre.ethers.Contract(MOCK_USDT_ADDRESS, erc20Abi, deployer);

  // 1. Send 0.001 tBNB for gas
  console.log("\n1. Transferring 0.001 tBNB gas to recipient...");
  const txBnb = await deployer.sendTransaction({
    to: recipient,
    value: hre.ethers.parseEther("0.001")
  });
  console.log(`- tBNB Tx Hash: ${txBnb.hash}`);
  await txBnb.wait();
  console.log("  Confirmed!");

  // 2. Send 50 LIORA
  console.log("\n2. Transferring 50 LIORA tokens to recipient...");
  const txLiora = await liora.transfer(recipient, hre.ethers.parseUnits("50", 18));
  console.log(`- LIORA Tx Hash: ${txLiora.hash}`);
  await txLiora.wait();
  console.log("  Confirmed!");

  // 3. Send 50 MockUSDT
  console.log("\n3. Transferring 50 MockUSDT tokens to recipient...");
  const txUsdt = await usdt.transfer(recipient, hre.ethers.parseUnits("50", 18));
  console.log(`- MockUSDT Tx Hash: ${txUsdt.hash}`);
  await txUsdt.wait();
  console.log("  Confirmed!");

  console.log("\n================================================================================");
  console.log("USER TEST WALLET FUNDED SUCCESSFULLY!");
  console.log(`Recipient: ${recipient}`);
  console.log(`- LIORA Balance:   50.0 LIORA`);
  console.log(`- MockUSDT Balance: 50.0 mUSDT`);
  console.log(`- tBNB Gas Balance: 0.001 tBNB`);
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Funding failed:", err);
  process.exitCode = 1;
});
