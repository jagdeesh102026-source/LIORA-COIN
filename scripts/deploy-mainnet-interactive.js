const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { promptPassword, promptText } = require("./prompt-helper");

/**
 * LIORA COIN — Interactive Production Mainnet Deployment Launcher
 *
 * Provides a secure, zero-leak workflow for Mainnet deployment:
 * 1. Prompts for keystore password with masked terminal input.
 * 2. Decrypts keystore in-memory only.
 * 3. Asserts signer address strictly matches 0xb75c5d303fBC41430ee5731Bdf7Fad7A98da173c.
 * 4. Displays comprehensive transaction and governance parameters for human review.
 * 5. Requires explicit typed confirmation ("CONFIRM") before broadcasting any transaction.
 * 6. Spawns Hardhat deployment child process with in-memory credentials only.
 * 7. Never writes unencrypted private keys to disk or version control.
 */
async function main() {
  console.log("======================================================================");
  console.log("LIORA COIN — BNB Smart Chain Mainnet Production Deployment Launcher");
  console.log("======================================================================");

  const keystorePath = path.resolve(__dirname, "../deployer-keystore.json");
  if (!fs.existsSync(keystorePath)) {
    console.error(`[CRITICAL ERROR] deployer-keystore.json not found at ${keystorePath}`);
    process.exit(1);
  }

  // 1. Password Prompt & In-Memory Decryption
  const password = await promptPassword("Enter Deployer Keystore Password: ");
  if (!password) {
    console.error("[ABORT] No password entered.");
    process.exit(1);
  }

  process.stdout.write("\nDecrypting keystore in memory... ");
  let wallet;
  try {
    const keystoreContent = fs.readFileSync(keystorePath, "utf8");
    wallet = await ethers.Wallet.fromEncryptedJson(keystoreContent, password);
    console.log("Done.");
  } catch (err) {
    console.log("Failed.");
    console.error("\n[CRITICAL ERROR] Keystore decryption failed. Invalid password or corrupted keystore.");
    process.exit(1);
  }

  const EXPECTED_DEPLOYER = "0xb75c5d303fBC41430ee5731Bdf7Fad7A98da173c";
  if (wallet.address.toLowerCase() !== EXPECTED_DEPLOYER.toLowerCase()) {
    console.error(`\n[CRITICAL ERROR] Derived address (${wallet.address}) does not match expected deployer (${EXPECTED_DEPLOYER})!`);
    process.exit(1);
  }

  // 2. Mainnet Network & Balance Pre-Flight Check
  process.stdout.write("Checking BSC Mainnet connection & balance... ");
  const rpcCandidates = [
    process.env.NEXT_PUBLIC_BSC_MAINNET_RPC,
    "https://bsc-dataseed.binance.org/",
    "https://bsc-dataseed1.defibit.io/",
    "https://bsc-dataseed1.ninicoin.io/",
    "https://binance.llamarpc.com",
  ].filter(Boolean);

  let provider;
  let activeRpc = "";
  let balanceWei = 0n;
  let feeData = { gasPrice: 50000000n };

  for (const rpc of rpcCandidates) {
    try {
      const p = new ethers.JsonRpcProvider(rpc);
      const network = await Promise.race([
        p.getNetwork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("RPC Timeout")), 4000)),
      ]);
      if (Number(network.chainId) === 56) {
        provider = p;
        activeRpc = rpc;
        [balanceWei, feeData] = await Promise.all([
          p.getBalance(wallet.address),
          p.getFeeData().catch(() => ({ gasPrice: 50000000n })),
        ]);
        break;
      }
    } catch (_) { }
  }

  if (!provider) {
    console.log("Failed.");
    console.error(`\n[CRITICAL ERROR] Failed to connect to BSC Mainnet (Chain ID 56) across RPC endpoints.`);
    process.exit(1);
  }
  console.log("Done.");

  const balanceBnb = ethers.formatEther(balanceWei);
  if (balanceWei < ethers.parseEther("0.02")) {
    console.error(`\n[CRITICAL ERROR] Insufficient deployer balance: ${balanceBnb} BNB (Required minimum: 0.02 BNB).`);
    process.exit(1);
  }

  // 3. Display Final Production Deployment Parameters
  const treasuryAddress = process.env.LIORA_MAINNET_OPERATING_TREASURY || "0xD546c3263663C193447bAdF60741f3915b349064";
  const governanceAddress = process.env.LIORA_MAINNET_GOVERNANCE_WALLET || "0x491d37ab13E66f6fd544Cdb3A4C57015D7fc2d54";
  const timelockDelay = process.env.LIORA_MAINNET_TIMELOCK_DELAY || "172800";

  console.log("\n======================================================================");
  console.log("CONFIRM MAINNET DEPLOYMENT PARAMETERS");
  console.log("======================================================================");
  console.log(`- Network:              BNB Smart Chain Mainnet (Chain ID 56)`);
  console.log(`- Gas Price:            ${ethers.formatUnits(feeData.gasPrice, "gwei")} Gwei`);
  console.log(`- Deployer EOA:         ${wallet.address} (Balance: ${balanceBnb} BNB)`);
  console.log(`- Operating Treasury:   ${treasuryAddress} (Receives 1,000,000,000 LIORA)`);
  console.log(`- Reserve Vault:        LioraReserveVault (Receives 99,000,000,000 LIORA)`);
  console.log(`- Governance Admin:     ${governanceAddress} (Timelock Admin + Vault Owner)`);
  console.log(`- Timelock Delay:       ${timelockDelay} seconds (48 Hours)`);
  console.log(`- Token Architecture:   UUPS Upgradeable BEP-20 (ERC1967 Proxy)`);
  console.log(`- Total Initial Supply: 100,000,000,000 LIORA (Exact Invariant)`);
  console.log(`- Deployer Post-State:  0 LIORA tokens, 0 Admin privileges`);
  console.log("======================================================================");
  console.log("\nATTENTION: This will broadcast live, irreversible transactions on BSC Mainnet.");
  console.log("Real BNB gas fees will be consumed from the Deployer account.\n");

  const confirmation = await promptText("Type 'CONFIRM' to authorize and broadcast Mainnet deployment: ");
  if (confirmation !== "CONFIRM") {
    console.log("\n[ABORTED] Deployment cancelled by operator. No transactions broadcast.");
    process.exit(0);
  }

  console.log("\n======================================================================");
  console.log("BROADCASTING MAINNET TRANSACTIONS...");
  console.log("======================================================================\n");

  // 4. Execute Deployment via Hardhat directly via process.execPath (Zero npx.cmd / Zero shell overhead)
  const env = {
    ...process.env,
    ENABLE_MAINNET_DEPLOYMENT: "true",
    ALLOW_SINGLE_WALLET_GOVERNANCE: "true",
    MAINNET_DEPLOYER_PRIVATE_KEY: wallet.privateKey,
    LIORA_MAINNET_OPERATING_TREASURY: treasuryAddress,
    LIORA_MAINNET_GOVERNANCE_WALLET: governanceAddress,
    LIORA_MAINNET_TIMELOCK_DELAY: timelockDelay,
  };

  // Resolve local Hardhat CLI directly to avoid npx.cmd and shell execution (fixes spawn EINVAL on Windows/Node v22)
  const hardhatPkgPath = require.resolve("hardhat/package.json");
  const hardhatPkg = require(hardhatPkgPath);
  const hardhatRel = typeof hardhatPkg.bin === "string" ? hardhatPkg.bin : hardhatPkg.bin.hardhat;
  const hardhatCli = path.resolve(path.dirname(hardhatPkgPath), hardhatRel);

  const cmd = process.execPath;
  const args = [hardhatCli, "run", "scripts/deploy-liora-uups-mainnet.js", "--network", "bscMainnet"];

  const deployProcess = spawn(cmd, args, {
    env: env,
    stdio: "inherit",
    cwd: path.resolve(__dirname, ".."),
  });

  deployProcess.on("error", (err) => {
    console.error(`\n[CRITICAL ERROR] Failed to start deployment process: ${err.message}`);
    // Secure in-memory cleanup
    delete env.MAINNET_DEPLOYER_PRIVATE_KEY;
    process.exit(1);
  });

  deployProcess.on("close", (code) => {
    // Secure in-memory cleanup
    delete env.MAINNET_DEPLOYER_PRIVATE_KEY;
    if (code === 0) {
      console.log("\n======================================================================");
      console.log(">>> MAINNET DEPLOYMENT BROADCAST SUCCESSFUL <<<");
      console.log("======================================================================");
      console.log("Next Step: Complete BscScan contract verification and Governance acceptance.\n");
    } else {
      console.error(`\n[ERROR] Deployment process exited with status code ${code}`);
    }
    process.exit(code);
  });
}

main().catch((err) => {
  console.error("Launcher error:", err);
  process.exit(1);
});
