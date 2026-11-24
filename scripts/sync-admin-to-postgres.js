const fs = require('fs');
const path = require('path');

// Ensure environment is loaded from apps/web/.env.local
require('dotenv').config({ path: path.resolve(__dirname, '../apps/web/.env.local') });
process.env.OXENIQ_PERSISTENCE_MODE = 'postgres';

require(path.join(__dirname, '../test/helpers/tsLoader'));
const { serverDb } = require('../apps/web/src/lib/server/db.ts');
const { hashPassword, verifyAdminCredentialsDetailed } = require('../apps/web/src/lib/server/adminAuth.ts');

async function main() {
  const credPath = path.resolve(__dirname, '../.test_credentials.local');
  const cred = fs.readFileSync(credPath, 'utf8');
  const username = cred.match(/ADMIN_USERNAME=(.*)/)[1].trim();
  const password = cred.match(/ADMIN_PASSWORD=(.*)/)[1].trim();

  const passwordHash = hashPassword(password);

  console.log(`Synchronizing admin '${username}' into PostgreSQL database...`);

  // Check if user exists in PostgreSQL
  const existing = await serverDb.findUserByUsername(username);
  let user;
  if (existing) {
    user = await serverDb.updateUser(existing.id, {
      passwordHash,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    console.log(`[UPDATED] Existing user ${username} updated with new password hash.`);
  } else {
    user = await serverDb.createUser({
      username,
      email: 'local_test_admin@liora.local',
      passwordHash,
      role: 'ADMIN',
      isDevelopmentOnly: false,
    });
    console.log(`[CREATED] User ${username} created in PostgreSQL with role ADMIN.`);
  }

  // Now verify credentials using the exact function called by /api/auth/admin-login
  const authResult = await verifyAdminCredentialsDetailed(username, password, { clientIp: '127.0.0.1' });
  if (authResult.user && authResult.user.role === 'ADMIN') {
    console.log(`[VERIFIED] Authentication test PASSED! Role: ${authResult.user.role}`);
  } else {
    console.error(`[FAILED] Authentication verification failed:`, authResult.error);
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
