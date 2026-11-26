const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { promptPassword } = require("./prompt-helper");

/**
 * LIORA COIN — Standalone Local Signer Verification Utility
 *
 * Verifies the local encrypted deployer keystore WITHOUT broadcasting any transactions.
 * - Prompts for keystore password with masked terminal input.
 * - Decrypts keystore in-memory only.
 * - Verifies signer address matches designated Deployer (0xb75c5d303fBC41430ee5731Bdf7Fad7A98da173c).
 * - Verifies BSC Mainnet connection & Chain ID 56.
 * - Inspects live deployer BNB balance.
 * - Never prints or logs private keys or passwords.
 */
async function verifySigner() {
  console.log("======================================================================");
  console.log("LIORA — Local Deployer Signer & Mainnet Verification Utility");
  console.log("======================================================================");
  console.log("Mode: READ-ONLY (No transactions will be broadcast)\n");

  const keystorePathArg = process.argv[2] || process.env.KEYSTORE_PATH || "deployer-keystore.json";
  const expectedDeployerArg = process.argv[3] || process.env.EXPECTED_DEPLOYER_ADDRESS || "0xb75c5d303fBC41430ee5731Bdf7Fad7A98da173c";

  const resolvedPath = path.isAbsolute(keystorePathArg)
    ? keystorePathArg
    : path.resolve(process.cwd(), keystorePathArg);

  // 1. Check Keystore File
  if (!fs.existsSync(resolvedPath)) {
    console.error(`[FAIL] Keystore file not found at: ${resolvedPath}`);
    process.exit(1);
  }
  console.log(`[1] Keystore File:       ${path.basename(resolvedPath)} (Found)`);

  const keystoreContent = fs.readFileSync(resolvedPath, "utf8");

  // 2. Request Password Securely
  const password = await promptPassword("Enter Keystore Password: ");
  if (!password || password.length === 0) {
    console.error("\n[FAIL] No password provided. Aborting verification.");
    process.exit(1);
  }

  // 3. In-Memory Decryption
  process.stdout.write("\nDecrypting keystore in memory... ");
  let wallet;
  try {
    wallet = await ethers.Wallet.fromEncryptedJson(keystoreContent, password);
    console.log("Done.");
  } catch (err) {
    console.log("Failed.");
    console.error("\n[FAIL] Decryption Failed: Invalid password or corrupted keystore file.");
    process.exit(1);
  }

  const derivedAddress = ethers.getAddress(wallet.address);
  const expectedAddress = ethers.getAddress(expectedDeployerArg);

  console.log(`\n[2] Signer Address Check:`);
  console.log(`- Derived Signer:        ${derivedAddress}`);
  console.log(`- Expected Deployer:     ${expectedAddress}`);

  let addressMatch = false;
  if (derivedAddress.toLowerCase() === expectedAddress.toLowerCase()) {
    console.log(`- Address Match:         PASS (Matches designated Mainnet Deployer)`);
    addressMatch = true;
  } else {
    console.error(`- Address Match:         FAIL (Derived address does not match expected deployer)`);
  }

  // 4. Connect to BSC Mainnet & Verify Chain ID
  console.log(`\n[3] Network & Chain ID Check:`);
  const rpcCandidates = [
    process.env.NEXT_PUBLIC_BSC_MAINNET_RPC,
    "https://bsc-dataseed.binance.org/",
    "https://bsc-dataseed1.defibit.io/",
    "https://bsc-dataseed1.ninicoin.io/",
    "https://binance.llamarpc.com",
  ].filter(Boolean);

  let provider;
  let activeRpc = "";
  let chainIdMatch = false;
  let balanceSufficient = false;
  let currentBalanceWei = 0n;

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
        chainIdMatch = true;
        break;
      }
    } catch (_) {}
  }

  if (provider && chainIdMatch) {
    console.log(`- Connected RPC:         ${activeRpc}`);
    console.log(`- Detected Chain ID:     56`);
    console.log(`- Chain ID Verification: PASS (BSC Mainnet, Chain ID 56)`);

    // 5. Inspect Deployer Balance
    console.log(`\n[4] Deployer Balance Check:`);
    try {
      currentBalanceWei = await provider.getBalance(derivedAddress);
      const balanceBnb = ethers.formatEther(currentBalanceWei);
      console.log(`- On-Chain Balance:      ${balanceBnb} BNB`);

      const minRecommendedWei = ethers.parseEther("0.02");
      const targetGasWei = ethers.parseEther("0.05");

      if (currentBalanceWei >= targetGasWei) {
        console.log(`- Balance Sufficiency:   PASS (Exceeds target of 0.05 BNB)`);
        balanceSufficient = true;
      } else if (currentBalanceWei >= minRecommendedWei) {
        console.log(`- Balance Sufficiency:   PASS (Meets minimum 0.02 BNB requirement)`);
        balanceSufficient = true;
      } else {
        console.error(`- Balance Sufficiency:   FAIL (Below minimum 0.02 BNB)`);
      }
    } catch (balErr) {
      console.error(`- Balance Query Error:   FAIL (${balErr.message})`);
    }
  } else {
    console.error(`- Chain ID Verification: FAIL (Could not connect to BSC Mainnet Chain ID 56)`);
  }

  // 6. Security & Invariant Summary
  console.log("\n======================================================================");
  console.log("SIGNER VERIFICATION SUMMARY");
  console.log("======================================================================");
  console.log(`- Keystore Decryption:   PASS`);
  console.log(`- Deployer Address:      ${addressMatch ? "PASS" : "FAIL"}`);
  console.log(`- BSC Mainnet (ID 56):   ${chainIdMatch ? "PASS" : "FAIL"}`);
  console.log(`- Gas Balance:           ${balanceSufficient ? "PASS" : "FAIL"}`);
  console.log(`- Broadcast State:       ZERO TRANSACTIONS BROADCAST (Read-Only)`);
  console.log(`- Credentials Exposed:   NONE (In-memory verification only)`);
  console.log(`- Mainnet Deploy Gate:   LOCKED (ENABLE_MAINNET_DEPLOYMENT=${process.env.ENABLE_MAINNET_DEPLOYMENT || "false"})`);
  console.log(`- Single-Gov Mode Gate:  LOCKED (ALLOW_SINGLE_WALLET_GOVERNANCE=${process.env.ALLOW_SINGLE_WALLET_GOVERNANCE || "false"})`);
  console.log("======================================================================");

  if (addressMatch && chainIdMatch && balanceSufficient) {
    console.log("\n>>> OVERALL RESULT: PASS <<<");
    console.log("The deployer keystore is valid, properly funded, and ready for deployment authorization.\n");
    process.exit(0);
  } else {
    console.log("\n>>> OVERALL RESULT: FAIL <<<");
    console.log("Resolve the failed checks above before proceeding.\n");
    process.exit(1);
  }
}

verifySigner().catch((err) => {
  console.error("Unexpected error during verification:", err.message);
  process.exit(1);
});
