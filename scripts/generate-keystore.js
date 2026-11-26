const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { promptPassword, promptText } = require("./prompt-helper");

/**
 * LIORA COIN — Encrypted Keystore Generator for Mainnet Deployer
 *
 * Converts a raw deployer private key into an AES-128-CTR encrypted JSON keystore.
 * - Prompts for private key and password with masked terminal input.
 * - Confirms derived address matches official Mainnet Deployer.
 * - Writes encrypted deployer-keystore.json (strictly git-ignored).
 */
async function main() {
  console.log("======================================================================");
  console.log("LIORA — Mainnet Deployer Encrypted Keystore Generator");
  console.log("======================================================================");
  console.log("This utility securely encrypts your deployer private key into an");
  console.log("encrypted keystore JSON file using standard AES-128-CTR.\n");

  const outputPath = path.resolve(__dirname, "../deployer-keystore.json");
  if (fs.existsSync(outputPath)) {
    console.log(`[NOTICE] Existing keystore detected at: ${outputPath}`);
    const overwrite = await promptText("Do you want to regenerate and overwrite this keystore? (yes/no): ");
    if (overwrite.toLowerCase() !== "yes") {
      console.log("\n[ABORTED] Keystore generation cancelled. Existing keystore preserved.");
      process.exit(0);
    }
    console.log();
  }

  const rawKey = await promptPassword("Enter Deployer Private Key: ");
  if (!rawKey || rawKey.trim().length < 64) {
    console.error("\n[ERROR] Invalid private key format.");
    process.exit(1);
  }

  const trimmedKey = rawKey.trim();
  const cleanKey = trimmedKey.startsWith("0x") ? trimmedKey : "0x" + trimmedKey;

  let wallet;
  try {
    wallet = new ethers.Wallet(cleanKey);
  } catch (err) {
    console.error("\n[ERROR] Invalid private key:", err.message);
    process.exit(1);
  }

  console.log(`\nDerived Wallet Address: ${wallet.address}`);
  const EXPECTED_DEPLOYER = "0xb75c5d303fBC41430ee5731Bdf7Fad7A98da173c";
  if (wallet.address.toLowerCase() !== EXPECTED_DEPLOYER.toLowerCase()) {
    console.warn(`WARNING: Derived address (${wallet.address}) does NOT match official deployer (${EXPECTED_DEPLOYER})!`);
  } else {
    console.log("✓ Matches designated Mainnet Deployer address (0xb75c5d303fBC41430ee5731Bdf7Fad7A98da173c)");
  }

  const password = await promptPassword("\nEnter Encryption Password: ");
  if (!password || password.length < 8) {
    console.error("\n[ERROR] Password must be at least 8 characters long.");
    process.exit(1);
  }

  const confirmPassword = await promptPassword("Confirm Encryption Password: ");
  if (password !== confirmPassword) {
    console.error("\n[ERROR] Passwords do not match.");
    process.exit(1);
  }

  console.log("\nEncrypting keystore (this may take a few seconds)...");
  const encryptedJson = await wallet.encrypt(password);

  fs.writeFileSync(outputPath, encryptedJson, "utf8");

  console.log(`\n✓ Encrypted keystore created successfully!`);
  console.log(`Saved to: ${outputPath}`);
  console.log("Note: This file is strictly excluded by .gitignore (*keystore*.json).");
}

main().catch((err) => {
  console.error("Keystore generation error:", err);
  process.exit(1);
});
