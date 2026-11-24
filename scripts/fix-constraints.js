const path = require('path');
const { Pool } = require(path.resolve(__dirname, '../apps/web/node_modules/pg'));
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://liora_app:Admin@123@localhost:5432/liora_dev?schema=public' });

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('DROP INDEX IF EXISTS "custodial_payment_records_canonicalReferenceKey_key" CASCADE;');
    console.log('Successfully dropped custodial_payment_records_canonicalReferenceKey_key');
    await client.query('ALTER TABLE "custodial_ledger_audits" DROP CONSTRAINT IF EXISTS "custodial_ledger_audits_allocationId_fkey";');
    console.log('Successfully dropped custodial_ledger_audits_allocationId_fkey');
  } finally {
    client.release();
    await pool.end();
  }
}

fix()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
