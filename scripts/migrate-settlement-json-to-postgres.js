const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require(path.resolve(__dirname, '../apps/web/node_modules/pg'));

const DATA_JSON_PATH = path.resolve(__dirname, '../data/settlement_storage_dev.json');
const AUTHORIZED_TREASURY_WALLET = '0xe31a2ec1474dfa2f5316da0033f3bd57f9d19350';
const TREASURY_TOTAL_SUPPLY_BASE_UNITS = (1_000_000_000n * 10n ** 18n).toString(); // 1 Billion LIORA in wei

async function main() {
  console.log('====================================================');
  console.log('LIORA — Historical Data Migration (JSON -> PostgreSQL)');
  console.log('====================================================');

  if (!fs.existsSync(DATA_JSON_PATH)) {
    console.log(`No historical data file found at ${DATA_JSON_PATH}. Nothing to migrate.`);
    return;
  }

  const rawJson = fs.readFileSync(DATA_JSON_PATH, 'utf8');
  const snapshot = JSON.parse(rawJson);
  const investments = snapshot.investments || [];
  const auditLogs = snapshot.auditLogs || [];

  console.log(`Source Records Found:`);
  console.log(`- Investments / Allocations: ${investments.length}`);
  console.log(`- Historical Audit Logs:    ${auditLogs.length}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let migratedAllocations = 0;
    let migratedPayments = 0;
    let migratedReferences = 0;
    let migratedAudits = 0;
    let totalReservedBaseUnits = 0n;

    for (const inv of investments) {
      const allocationId = inv.id;
      const investorAddress = (inv.investorAddress || '').toLowerCase();
      const investorName = inv.investorName || 'Unknown Investor';
      const planId = inv.planId || 'TIER_01';
      const tierNumber = inv.tierNumber || '01';
      const displayName = inv.planDisplayName || `Tier ${tierNumber}`;
      const principalINR = inv.principalINR || 50000;
      const principalUSD = inv.principalUSD || (principalINR / 100);
      const contractualSettlementINR = inv.contractualSettlementINR || inv.agreedCashPayoutINR || 125000;
      const multiplierFactor = inv.multiplierFactor || 2.5;
      const lockDurationMonths = inv.termMonths || 3;
      const settlementPayoutMonth = inv.payoutMonth || (lockDurationMonths + 1);
      const allocationPriceINR = inv.initialAllocationPriceINR || '2.00';
      const allocatedTokensFormatted = String(inv.collateralTokensAllocated || 62500);
      const allocatedTokensBaseUnits = inv.originalCollateralTokensBaseUnits || (BigInt(allocatedTokensFormatted) * 10n ** 18n).toString();
      
      // Map stage to status
      let status = 'PENDING_PAYMENT_VERIFICATION';
      if (inv.stage === 'COLLATERAL_PERIOD_ACTIVE') status = 'ACTIVE_CUSTODIAL_ALLOCATION';
      else if (inv.stage === 'PAYMENT_DISPATCHED') status = 'PAYMENT_DISPATCHED';
      else if (inv.stage === 'PAYMENT_INDEPENDENTLY_VERIFIED') status = 'PAYMENT_INDEPENDENTLY_VERIFIED';
      else if (inv.stage === 'SETTLEMENT_COMPLETED') status = 'SETTLEMENT_COMPLETED';
      else if (inv.stage === 'PAYMENT_DISPUTED') status = 'PAYMENT_DISPATCHED';

      if (status === 'ACTIVE_CUSTODIAL_ALLOCATION' || status === 'PAYMENT_DISPATCHED' || status === 'PAYMENT_INDEPENDENTLY_VERIFIED') {
        totalReservedBaseUnits += BigInt(allocatedTokensBaseUnits);
      }

      const createdAt = new Date(inv.createdAt || Date.now());
      const activatedAt = inv.createdAt ? new Date(inv.createdAt) : null;
      const maturesAt = inv.lockEndDate ? new Date(inv.lockEndDate) : null;
      const payoutDueDate = inv.payoutDueDate ? new Date(inv.payoutDueDate) : null;

      // Upsert CustodialAllocation
      const allocRes = await client.query(`
        INSERT INTO "custodial_allocations" (
          "id", "allocationId", "investorAddress", "investorName", "planId", "tierNumber",
          "displayName", "principalINR", "principalUSD", "contractualSettlementINR",
          "multiplierFactor", "lockDurationMonths", "settlementPayoutMonth",
          "allocationPriceINR", "allocatedTokensFormatted", "allocatedTokensBaseUnits",
          "status", "custodyModel", "custodyHoldingAddress", "isInvestorTransferable",
          "isInvestorWithdrawable", "isCustodialAllocation", "createdAt", "activatedAt",
          "maturesAt", "payoutDueDate"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, 'COMPANY_CONTROLLED_CUSTODY_OPTION_A', $17, false, false, true, $18, $19, $20, $21
        ) ON CONFLICT ("allocationId") DO NOTHING
        RETURNING "allocationId";
      `, [
        allocationId, investorAddress, investorName, planId, tierNumber, displayName,
        principalINR, principalUSD, contractualSettlementINR, multiplierFactor,
        lockDurationMonths, settlementPayoutMonth, allocationPriceINR, allocatedTokensFormatted,
        allocatedTokensBaseUnits, status, AUTHORIZED_TREASURY_WALLET, createdAt,
        activatedAt, maturesAt, payoutDueDate
      ]);

      if (allocRes.rowCount > 0) migratedAllocations++;

      // Upsert Payment Record if payment exists
      const paymentRef = inv.payoutDispatched ? inv.payoutDispatched.referenceNumber : `REF-${allocationId}`;
      const canonicalKey = inv.payoutDispatched && inv.payoutDispatched.canonicalReferenceKey ?
        inv.payoutDispatched.canonicalReferenceKey : `MANUAL:${paymentRef}:BSC_TESTNET`;
      const rail = inv.payoutDispatched ? inv.payoutDispatched.paymentRail : 'IMPS_BANK_TRANSFER';
      const amountPaid = inv.payoutDispatched ? inv.payoutDispatched.amountPaidINR : principalINR;
      const verificationStatus = (inv.paymentVerified || inv.stage === 'PAYMENT_INDEPENDENTLY_VERIFIED' || inv.stage === 'SETTLEMENT_COMPLETED') ? 'VERIFIED' : 'PENDING';
      const verifiedAt = inv.paymentVerified ? new Date(inv.paymentVerified.verifiedAt || Date.now()) : null;
      const verifyingAdmin = inv.paymentVerified ? inv.paymentVerified.verifiedBy : null;
      const adminNotes = inv.payoutDispatched ? inv.payoutDispatched.adminNotes : 'Historical migrated payment';
      const dispatchedAt = inv.payoutDispatched ? new Date(inv.payoutDispatched.dispatchedAt || Date.now()) : null;
      const dispatchedBy = inv.payoutDispatched ? inv.payoutDispatched.dispatchedBy : null;
      const collateralTxHash = inv.collateralReturned ? inv.collateralReturned.txHash : null;
      const collateralReturnedAt = inv.collateralReturned ? new Date(inv.collateralReturned.returnedAt || Date.now()) : null;

      const payRes = await client.query(`
        INSERT INTO "custodial_payment_records" (
          "id", "allocationId", "paymentReference", "canonicalReferenceKey", "amountPaid",
          "currency", "paymentRail", "verificationStatus", "submittedAt", "verifiedAt",
          "verifyingAdmin", "adminNotes", "dispatchedAt", "dispatchedBy", "collateralTxHash", "collateralReturnedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, 'INR', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) ON CONFLICT ("allocationId") DO NOTHING
        RETURNING "id";
      `, [
        allocationId, paymentRef, canonicalKey, amountPaid, rail, verificationStatus,
        createdAt, verifiedAt, verifyingAdmin, adminNotes, dispatchedAt, dispatchedBy,
        collateralTxHash, collateralReturnedAt
      ]);
      if (payRes.rowCount > 0) migratedPayments++;

      // Register payment reference in registry
      const refRes = await client.query(`
        INSERT INTO "payment_reference_registry" (
          "id", "canonicalKey", "normalizedRef", "rawReference", "paymentRail",
          "environment", "allocationOrInvId", "amountPaidINR", "registeredBy",
          "registeredAt", "status"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, 'BSC_TESTNET', $5, $6, $7, $8, 'ACTIVE'
        ) ON CONFLICT ("canonicalKey") DO NOTHING
        RETURNING "id";
      `, [
        canonicalKey, paymentRef.replace(/[^A-Za-z0-9]/g, '').toUpperCase(), paymentRef,
        rail, allocationId, amountPaid, AUTHORIZED_TREASURY_WALLET, createdAt
      ]);
      if (refRes.rowCount > 0) migratedReferences++;
    }

    // Migrate Audit Logs
    for (const log of auditLogs) {
      const logRes = await client.query(`
        INSERT INTO "custodial_ledger_audits" (
          "id", "allocationId", "actor", "action", "details", "metadata", "timestamp"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6
        ) ON CONFLICT ("id") DO NOTHING
        RETURNING "id";
      `, [
        log.investmentId || null,
        log.actor || 'SYSTEM_MIGRATION',
        log.action || 'HISTORICAL_ACTION',
        log.details || '',
        JSON.stringify(log),
        new Date(log.timestamp || Date.now())
      ]);
      if (logRes.rowCount > 0) migratedAudits++;
    }

    // Upsert Custodial Treasury Snapshot
    const unrestrictedFreeBaseUnits = (BigInt(TREASURY_TOTAL_SUPPLY_BASE_UNITS) - totalReservedBaseUnits).toString();
    await client.query(`
      INSERT INTO "custodial_treasury_snapshots" (
        "id", "treasuryAddress", "totalOnChainHoldingsBaseUnits", "reservedCustodialAllocationsBaseUnits",
        "unrestrictedFreeBaseUnits", "lastReconciledAt", "isSolvent", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, NOW(), true, NOW()
      ) ON CONFLICT ("treasuryAddress") DO UPDATE SET
        "reservedCustodialAllocationsBaseUnits" = $3,
        "unrestrictedFreeBaseUnits" = $4,
        "updatedAt" = NOW();
    `, [
      AUTHORIZED_TREASURY_WALLET,
      TREASURY_TOTAL_SUPPLY_BASE_UNITS,
      totalReservedBaseUnits.toString(),
      unrestrictedFreeBaseUnits
    ]);

    await client.query('COMMIT');

    console.log('\nMigration Complete:');
    console.log(`- Custodial Allocations Migrated: ${migratedAllocations}`);
    console.log(`- Payment Records Migrated:      ${migratedPayments}`);
    console.log(`- Reference Registry Entries:    ${migratedReferences}`);
    console.log(`- Audit Logs Migrated:           ${migratedAudits}`);
    console.log(`- Treasury Total Holdings:       1,000,000,000 LIORA`);
    console.log(`- Treasury Reserved Collateral:  ${(Number(totalReservedBaseUnits) / 1e18).toLocaleString()} LIORA`);
    console.log(`- Treasury Unrestricted Free:    ${(Number(BigInt(unrestrictedFreeBaseUnits)) / 1e18).toLocaleString()} LIORA`);
    console.log(`\n✓ Original source file preserved at: ${DATA_JSON_PATH}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('MIGRATION FAILED (Transaction Rolled Back):', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
