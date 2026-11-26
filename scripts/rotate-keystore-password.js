const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { promptPassword } = require("./prompt-helper");

/**
 * LIORA COIN — Deployer Keystore Password Rotation Utility
 *
 * Rotates the encryption password of the existing deployer keystore:
 * 1. Decrypts the existing keystore in-memory with the current password.
 * 2. Confirms derived address matches the official Mainnet Deployer.
 * 3. Securely prompts for and confirms the new encryption password.
 * 4. Re-encrypts the signer into a temporary keystore file.
 * 5. Verifies decryption and address match of the new keystore before replacing original.
 * 6. Preserves existing backup (deployer-keystore.backup.json).
 * 7. Zero exposure of private keys or passwords.
 */
async function main() {
  console.log("======================================================================");
  console.log("LIORA — Deployer Keystore Password Rotation Utility");
  console.log("======================================================================");
  console.log("Mode: In-Memory Key Rotation (Zero disk exposure of private keys)\n");

  const keystoreArg = process.argv[2] || "deployer-keystore.json";
  const expectedDeployerArg = process.argv[3] || "0xb75c5d303fBC41430ee5731Bdf7Fad7A98da173c";

  const targetPath = path.isAbsolute(keystoreArg)
    ? keystoreArg
    : path.resolve(process.cwd(), keystoreArg);

  if (!fs.existsSync(targetPath)) {
    console.error(`[CRITICAL ERROR] Target keystore file not found at: ${targetPath}`);
    process.exit(1);
  }
  console.log(`[1] Target Keystore:     ${path.basename(targetPath)} (Found)`);

  // 1. Decrypt existing keystore
  const currentPassword = await promptPassword("Enter Current Keystore Password: ");
  if (!currentPassword) {
    console.error("\n[ERROR] No password entered. Aborting.");
    process.exit(1);
  }

  process.stdout.write("\nDecrypting existing keystore in memory... ");
  let wallet;
  try {
    const currentContent = fs.readFileSync(targetPath, "utf8");
    wallet = await ethers.Wallet.fromEncryptedJson(currentContent, currentPassword);
    console.log("Done.");
  } catch (err) {
    console.log("Failed.");
    console.error("\n[CRITICAL ERROR] Failed to decrypt keystore. Incorrect password or corrupted file.");
    process.exit(1);
  }

  // 2. Validate Address
  console.log(`\n[2] Signer Validation:`);
  console.log(`- Derived Address:       ${wallet.address}`);
  console.log(`- Expected Deployer:     ${expectedDeployerArg}`);

  if (wallet.address.toLowerCase() !== expectedDeployerArg.toLowerCase()) {
    console.error(`\n[CRITICAL ERROR] Derived address (${wallet.address}) does not match expected deployer (${expectedDeployerArg})! Aborting.`);
    process.exit(1);
  }
  console.log("- Address Match:         PASS (Matches designated Mainnet Deployer)");

  // 3. Prompt for New Password
  console.log(`\n[3] Set New Encryption Password:`);
  const newPassword = await promptPassword("Enter New Encryption Password: ");
  if (!newPassword || newPassword.length < 8) {
    console.error("\n[ERROR] New password must be at least 8 characters long.");
    process.exit(1);
  }

  const confirmPassword = await promptPassword("Confirm New Encryption Password: ");
  if (newPassword !== confirmPassword) {
    console.error("\n[ERROR] Passwords do not match.");
    process.exit(1);
  }

  // 4. Re-Encrypt into Temporary Keystore
  const basePrefix = targetPath.endsWith(".json")
    ? targetPath.slice(0, -5)
    : targetPath;
  const tempPath = `${basePrefix}.tmp.json`;
  const backupPath = `${basePrefix}.backup.json`;

  console.log("\n[4] Re-encrypting signer into temporary file (this may take a few seconds)...");
  const newEncryptedJson = await wallet.encrypt(newPassword);
  fs.writeFileSync(tempPath, newEncryptedJson, "utf8");
  console.log(`✓ Temporary keystore written to: ${path.basename(tempPath)}`);

  // 5. Verify New Keystore Before Replacing
  process.stdout.write("\n[5] Verifying new keystore in memory... ");
  try {
    const testWallet = await ethers.Wallet.fromEncryptedJson(newEncryptedJson, newPassword);
    if (testWallet.address.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error("Address mismatch in newly encrypted keystore!");
    }
    console.log("Done (PASS).");
  } catch (testErr) {
    console.log("Failed (FAIL).");
    console.error(`\n[CRITICAL ERROR] Verification of new keystore failed: ${testErr.message}`);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    process.exit(1);
  }

  // 6. Preserve Backup & Finalize
  console.log(`\n[6] Finalizing Keystore Replacement:`);
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(targetPath, backupPath);
    console.log(`✓ Safety backup created at: ${path.basename(backupPath)}`);
  } else {
    console.log(`✓ Existing backup preserved at: ${path.basename(backupPath)}`);
  }

  fs.copyFileSync(tempPath, targetPath);
  fs.unlinkSync(tempPath);
  console.log(`✓ Successfully updated: ${path.basename(targetPath)}`);

  console.log("\n======================================================================");
  console.log("KEYSTORE PASSWORD ROTATION COMPLETED SUCCESSFULLY");
  console.log("======================================================================");
  console.log(`- Keystore:              ${path.basename(targetPath)}`);
  console.log(`- Signer Address:        ${wallet.address}`);
  console.log(`- Backup Keystore:       ${path.basename(backupPath)}`);
  console.log(`- Plaintext Key State:   ZERO EXPOSURE (In-memory rotation only)`);
  console.log(`- Ready for Signer Verification.`);
  console.log("======================================================================\n");
}

main().catch((err) => {
  console.error("Rotation error:", err.message);
  process.exit(1);
});
