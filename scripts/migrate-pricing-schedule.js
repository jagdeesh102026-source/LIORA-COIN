const path = require('path');
const { Pool } = require(path.resolve(__dirname, '../apps/web/node_modules/pg'));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://liora_app:Admin@123@localhost:5432/liora_dev?schema=public'
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "pricing_schedule_configs" (
        "id" TEXT NOT NULL,
        "scheduleName" TEXT NOT NULL DEFAULT 'CONFIRMED_REFERENCE_SCHEDULE_V1',
        "startPricePaise" INTEGER NOT NULL DEFAULT 20,
        "incrementPaise" INTEGER NOT NULL DEFAULT 20,
        "maxPricePaise" INTEGER NOT NULL DEFAULT 3000,
        "intervalSeconds" INTEGER NOT NULL DEFAULT 18000,
        "totalIntervals" INTEGER NOT NULL DEFAULT 149,
        "totalHoursToCeiling" INTEGER NOT NULL DEFAULT 745,
        "isActivated" BOOLEAN NOT NULL DEFAULT false,
        "activationTimestamp" TIMESTAMP(3),
        "configuredBy" TEXT NOT NULL DEFAULT 'ADMIN_SYSTEM',
        "disclaimer" TEXT NOT NULL DEFAULT 'Scheduled reference price is an internal benchmark, not a guaranteed exchange trading price.',
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pricing_schedule_configs_pkey" PRIMARY KEY ("id")
      );
    `);

    // Insert or keep default row
    await client.query(`
      INSERT INTO "pricing_schedule_configs" ("id", "scheduleName", "startPricePaise", "incrementPaise", "maxPricePaise", "intervalSeconds", "totalIntervals", "totalHoursToCeiling", "isActivated", "configuredBy", "updatedAt")
      VALUES ('CURRENT_CONFIG', 'CONFIRMED_REFERENCE_SCHEDULE_V1', 20, 20, 3000, 18000, 149, 745, false, 'ADMIN_SYSTEM', CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO NOTHING;
    `);

    console.log('✓ pricing_schedule_configs table created and seeded in PostgreSQL.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
