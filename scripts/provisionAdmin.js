#!/usr/bin/env node
/**
 * LIORA COIN — Secure Administrator Provisioning CLI Script
 * Phase 2: Production Database and Admin Security
 *
 * Provisions production administrators with:
 * - Minimum 12-character password complexity validation.
 * - Rejection of common/default passcodes ('admin123', 'oxeniq', etc.).
 * - Cryptographic scrypt password hashing with 16-byte cryptographically secure random salt.
 * - Explicit production clearance: `isDevelopmentOnly: false` (allows authentication in production/staging).
 * - Optional MFA secret configuration.
 * - Audited action trail.
 * - Strict credential sanitization: plaintext passwords and secrets are NEVER logged or output.
 *
 * Usage:
 *   node scripts/provisionAdmin.js --username <username> --password <password> [--email <email>]
 *   OR via environment variables:
 *   INITIAL_ADMIN_USERNAME=admin_sec INITIAL_ADMIN_PASSWORD=... node scripts/provisionAdmin.js
 */

const path = require("path");
const crypto = require("crypto");

// Zero-dependency TypeScript loader for production modules
require(path.join(__dirname, "../test/helpers/tsLoader"));

const { serverDb } = require("../apps/web/src/lib/server/db.ts");
const { hashPassword } = require("../apps/web/src/lib/server/adminAuth.ts");

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--username" || arg === "-u") {
      options.username = args[++i];
    } else if (arg === "--password" || arg === "-p") {
      options.password = args[++i];
    } else if (arg === "--email" || arg === "-e") {
      options.email = args[++i];
    } else if (arg === "--mfa-secret" || arg === "-m") {
      options.mfaSecret = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }
  return options;
}

function validatePasswordComplexity(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, reason: "Password is required" };
  }

  if (password.length < 12) {
    return { valid: false, reason: "Password must be at least 12 characters long" };
  }

  // Reject known banned or default development passwords
  const normalized = password.toLowerCase().trim();
  const banned = ["admin123", "oxeniq", "password", "12345678", "admin", "oxeniqdemo2026!"];
  if (banned.includes(normalized)) {
    return { valid: false, reason: "Password cannot be a default or known dictionary value" };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return {
      valid: false,
      reason: "Password must contain uppercase letters, lowercase letters, numbers, and special characters",
    };
  }

  return { valid: true };
}

async function provisionAdministrator() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
LIORA COIN — Administrator Provisioning Utility
Usage:
  node scripts/provisionAdmin.js --username <username> --password <password> [--email <email>] [--mfa-secret <secret>]

Or use environment variables:
  INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_MFA_SECRET
    `);
    process.exit(0);
  }

  const username = (options.username || process.env.INITIAL_ADMIN_USERNAME || "").trim().toLowerCase();
  const password = options.password || process.env.INITIAL_ADMIN_PASSWORD || "";
  const email = (options.email || process.env.INITIAL_ADMIN_EMAIL || "").trim().toLowerCase() || null;
  const mfaSecret = options.mfaSecret || process.env.INITIAL_ADMIN_MFA_SECRET || null;

  if (!username) {
    console.error("[ERROR] Provisioning failed: Username is required (--username or INITIAL_ADMIN_USERNAME).");
    process.exit(1);
  }

  const validation = validatePasswordComplexity(password);
  if (!validation.valid) {
    console.error(`[ERROR] Provisioning failed: ${validation.reason}.`);
    process.exit(1);
  }

  console.log(`[PROVISIONING] Verifying administrator account: "${username}"...`);

  // Generate scrypt hash with 16-byte salt
  const passwordHash = hashPassword(password);

  let existingUser = await serverDb.findUserByUsername(username);

  if (existingUser) {
    console.log(`[PROVISIONING] Updating existing user "${username}" to role ADMIN...`);
    const updated = await serverDb.updateUser(existingUser.id, {
      role: "ADMIN",
      accountStatus: "ACTIVE",
      isDevelopmentOnly: false, // Production clearance
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      email: email || existingUser.email,
      mfaSecret: mfaSecret || existingUser.mfaSecret,
      isMfaEnabled: mfaSecret ? true : existingUser.isMfaEnabled,
    });

    await serverDb.createAuditLog({
      actorId: existingUser.id,
      action: "ADMIN_USER_PROVISIONED_UPDATE",
      entity: "User",
      entityId: existingUser.id,
      severity: "INFO",
      metadata: {
        username,
        role: "ADMIN",
        isDevelopmentOnly: false,
        mfaConfigured: !!(mfaSecret || existingUser.mfaSecret),
      },
    });

    console.log(`[SUCCESS] Administrator "${username}" successfully updated.`);
    console.log(`[DETAILS] Role: ADMIN | isDevelopmentOnly: false | Status: ACTIVE | Scrypt Hash: Configured`);
  } else {
    console.log(`[PROVISIONING] Creating new administrator user "${username}"...`);
    const newAdmin = await serverDb.createUser({
      username,
      email,
      passwordHash,
      role: "ADMIN",
      accountStatus: "ACTIVE",
      isDevelopmentOnly: false, // Production clearance
      mfaSecret: mfaSecret || null,
      isMfaEnabled: !!mfaSecret,
    });

    await serverDb.createAuditLog({
      actorId: newAdmin.id,
      action: "ADMIN_USER_PROVISIONED_CREATE",
      entity: "User",
      entityId: newAdmin.id,
      severity: "INFO",
      metadata: {
        username,
        role: "ADMIN",
        isDevelopmentOnly: false,
        mfaConfigured: !!mfaSecret,
      },
    });

    console.log(`[SUCCESS] New administrator "${username}" created with ID: ${newAdmin.id}.`);
    console.log(`[DETAILS] Role: ADMIN | isDevelopmentOnly: false | Status: ACTIVE | Scrypt Hash: Configured`);
  }

  console.log(`[SECURITY] Plaintext credentials were not stored or logged.`);
}

if (require.main === module) {
  provisionAdministrator().catch((err) => {
    console.error(`[ERROR] Provisioning failed:`, err.message);
    process.exit(1);
  });
}

module.exports = {
  validatePasswordComplexity,
  provisionAdministrator,
};

