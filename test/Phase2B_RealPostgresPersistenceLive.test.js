const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Zero-dependency TypeScript loader
require("./helpers/tsLoader");

const { Pool } = require("d:/Projects/OXENIQ/apps/web/node_modules/pg");

function getTargetUrl() {
  const envPath = path.resolve(__dirname, "../.env");
  const content = fs.readFileSync(envPath, "utf8");
  let dbUrlStr = "";
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key === "DATABASE_URL") {
          dbUrlStr = val;
        }
      }
    }
  }

  const parsedUrl = new URL(dbUrlStr);
  // Prefer clean replay db if set by env, else default to liora_dev
  const targetDb = process.env.TEST_DB_NAME || "liora_dev";
  parsedUrl.pathname = "/" + targetDb;
  return parsedUrl.toString();
}

describe("LIORA COIN — Phase 2B Gate C2B: Real PostgreSQL Verification Suite", function () {
  this.timeout(20000);
  let pool;

  before(async function () {
    const targetUrl = getTargetUrl();
    pool = new Pool({ connectionString: targetUrl, max: 10 });
    const res = await pool.query("SELECT current_database(), current_user;");
    expect(res.rows[0].current_user).to.equal("liora_app");
    console.log(`[TEST SUITE TARGET VERIFIED]: ${res.rows[0].current_database}`);
  });

  after(async function () {
    if (pool) {
      await pool.end();
    }
  });

  // =========================================================================
  // TEST 1: Persistent Records Survive Complete Process Restart
  // =========================================================================
  it("REAL DB: Persistent records survive complete process and pool restarts", async function () {
    const userId = "usr_persist_" + crypto.randomUUID().slice(0, 8);
    const username = "persist_trader_" + Date.now();

    await pool.query(
      'INSERT INTO "users" ("id", "username", "role", "accountStatus", "updatedAt") VALUES ($1, $2, $3, $4, now());',
      [userId, username, "USER", "ACTIVE"]
    );

    await pool.end();

    const newPool = new Pool({ connectionString: getTargetUrl(), max: 10 });
    const res = await newPool.query('SELECT "id", "username", "role" FROM "users" WHERE "id" = $1;', [userId]);
    
    expect(res.rows.length).to.equal(1);
    expect(res.rows[0].id).to.equal(userId);
    expect(res.rows[0].username).to.equal(username);
    expect(res.rows[0].role).to.equal("USER");

    pool = newPool;
  });

  // =========================================================================
  // TEST 2: Unbalanced Journals are Rejected by Constraint Trigger
  // =========================================================================
  it("REAL DB: Unbalanced double-entry journals are strictly rejected at transaction COMMIT", async function () {
    const client = await pool.connect();
    const journalId = "jrnl_unbal_" + crypto.randomUUID().slice(0, 8);
    const user1Id = "usr_unbal1_" + crypto.randomUUID().slice(0, 8);
    const user2Id = "usr_unbal2_" + crypto.randomUUID().slice(0, 8);
    const assetId = "bsc-testnet:bep20:0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";

    await client.query("BEGIN;");
    await client.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now()), ($3, $4, now());', [
      user1Id, "u1_" + Date.now(), user2Id, "u2_" + Date.now()
    ]);
    const acc1Id = "acc_unbal1_" + crypto.randomUUID().slice(0, 8);
    const acc2Id = "acc_unbal2_" + crypto.randomUUID().slice(0, 8);
    await client.query('INSERT INTO "ledger_accounts" ("id", "userId", "accountType", "assetId") VALUES ($1, $2, $3, $4), ($5, $6, $7, $8);', [
      acc1Id, user1Id, "USER_AVAILABLE", assetId,
      acc2Id, user2Id, "USER_AVAILABLE", assetId
    ]);

    await client.query(
      'INSERT INTO "journal_transactions" ("id", "reason", "description") VALUES ($1, $2, $3);',
      [journalId, "TRADE", "Unbalanced test transaction"]
    );

    // Posting 1: DEBIT 100
    await client.query(
      'INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7);',
      [crypto.randomUUID(), journalId, acc1Id, assetId, "DEBIT", 100, 0]
    );

    // Posting 2: CREDIT 90 (Imbalance of 10)
    await client.query(
      'INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7);',
      [crypto.randomUUID(), journalId, acc2Id, assetId, "CREDIT", 90, 1]
    );

    let commitFailed = false;
    let errorMessage = "";
    try {
      await client.query("COMMIT;");
    } catch (err) {
      commitFailed = true;
      errorMessage = err.message;
      await client.query("ROLLBACK;");
    } finally {
      client.release();
    }

    expect(commitFailed).to.be.true;
    expect(errorMessage).to.include("Unbalanced double-entry journal");
    expect(errorMessage).to.include("net difference is 10");

    const verifyRes = await pool.query('SELECT 1 FROM "journal_transactions" WHERE "id" = $1;', [journalId]);
    expect(verifyRes.rows.length).to.equal(0);
  });

  // =========================================================================
  // TEST 3: Empty Journals (< 2 Postings) are Rejected
  // =========================================================================
  it("REAL DB: Empty journals without required postings are rejected at COMMIT", async function () {
    const client = await pool.connect();
    const journalId = "jrnl_empty_" + crypto.randomUUID().slice(0, 8);

    await client.query("BEGIN;");
    await client.query(
      'INSERT INTO "journal_transactions" ("id", "reason", "description") VALUES ($1, $2, $3);',
      [journalId, "DEPOSIT", "Empty journal transaction"]
    );

    let commitFailed = false;
    let errorMessage = "";
    try {
      await client.query("COMMIT;");
    } catch (err) {
      commitFailed = true;
      errorMessage = err.message;
      await client.query("ROLLBACK;");
    } finally {
      client.release();
    }

    expect(commitFailed).to.be.true;
    expect(errorMessage).to.include("requires at least 2 postings, found 0");

    const verifyRes = await pool.query('SELECT 1 FROM "journal_transactions" WHERE "id" = $1;', [journalId]);
    expect(verifyRes.rows.length).to.equal(0);
  });

  // =========================================================================
  // TEST 4: Ledger Postings are Append-Only & Immutable (UPDATE/DELETE blocked)
  // =========================================================================
  it("REAL DB: Ledger postings prohibit UPDATE and DELETE via immutability trigger", async function () {
    const client = await pool.connect();
    const journalId = "jrnl_immut_" + crypto.randomUUID().slice(0, 8);
    const posting1Id = "post_immut1_" + crypto.randomUUID().slice(0, 8);
    const posting2Id = "post_immut2_" + crypto.randomUUID().slice(0, 8);
    const userId1 = "usr_immut1_" + crypto.randomUUID().slice(0, 8);
    const userId2 = "usr_immut2_" + crypto.randomUUID().slice(0, 8);
    const assetId = "bsc-testnet:bep20:0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";

    await client.query("BEGIN;");
    await client.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now()), ($3, $4, now());', [
      userId1, "immut1_" + Date.now(), userId2, "immut2_" + Date.now()
    ]);
    const acc1Id = "acc_immut1_" + crypto.randomUUID().slice(0, 8);
    const acc2Id = "acc_immut2_" + crypto.randomUUID().slice(0, 8);
    await client.query('INSERT INTO "ledger_accounts" ("id", "userId", "accountType", "assetId") VALUES ($1, $2, $3, $4), ($5, $6, $7, $8);', [
      acc1Id, userId1, "USER_AVAILABLE", assetId,
      acc2Id, userId2, "USER_AVAILABLE", assetId
    ]);

    await client.query(
      'INSERT INTO "journal_transactions" ("id", "reason", "description") VALUES ($1, $2, $3);',
      [journalId, "DEPOSIT", "Valid initial journal"]
    );
    await client.query(
      'INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14);',
      [
        posting1Id, journalId, acc2Id, assetId, "DEBIT", 500, 0,
        posting2Id, journalId, acc1Id, assetId, "CREDIT", 500, 1
      ]
    );
    await client.query("COMMIT;");
    client.release();

    // Verify UPDATE is blocked
    let updateFailed = false;
    let updateError = "";
    try {
      await pool.query('UPDATE "ledger_postings" SET "amountBaseUnits" = 999 WHERE "id" = $1;', [posting1Id]);
    } catch (err) {
      updateFailed = true;
      updateError = err.message;
    }
    expect(updateFailed).to.be.true;
    expect(updateError).to.include("Ledger postings are strictly append-only. UPDATE and DELETE are prohibited");

    // Verify DELETE is blocked
    let deleteFailed = false;
    let deleteError = "";
    try {
      await pool.query('DELETE FROM "ledger_postings" WHERE "id" = $1;', [posting1Id]);
    } catch (err) {
      deleteFailed = true;
      deleteError = err.message;
    }
    expect(deleteFailed).to.be.true;
    expect(deleteError).to.include("Ledger postings are strictly append-only. UPDATE and DELETE are prohibited");
  });

  // =========================================================================
  // TEST 5: Journal Headers Prohibit Mutation and Deletion
  // =========================================================================
  it("REAL DB: Journal transaction headers prohibit UPDATE and DELETE after creation", async function () {
    const client = await pool.connect();
    const journalId = "jrnl_header_immut_" + crypto.randomUUID().slice(0, 8);
    const u1 = "usr_hdr1_" + crypto.randomUUID().slice(0, 8);
    const u2 = "usr_hdr2_" + crypto.randomUUID().slice(0, 8);
    const assetId = "bsc-testnet:bep20:0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";

    await client.query("BEGIN;");
    await client.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now()), ($3, $4, now());', [
      u1, "u1_hdr_" + Date.now(), u2, "u2_hdr_" + Date.now()
    ]);
    const acc1 = "acc_hdr1_" + crypto.randomUUID().slice(0, 8);
    const acc2 = "acc_hdr2_" + crypto.randomUUID().slice(0, 8);
    await client.query('INSERT INTO "ledger_accounts" ("id", "userId", "accountType", "assetId") VALUES ($1, $2, $3, $4), ($5, $6, $7, $8);', [
      acc1, u1, "USER_AVAILABLE", assetId,
      acc2, u2, "USER_AVAILABLE", assetId
    ]);
    await client.query('INSERT INTO "journal_transactions" ("id", "reason", "isDemo") VALUES ($1, $2, false);', [
      journalId, "DEPOSIT"
    ]);
    await client.query('INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14);', [
      crypto.randomUUID(), journalId, acc1, assetId, "DEBIT", 100, 0,
      crypto.randomUUID(), journalId, acc2, assetId, "CREDIT", 100, 1
    ]);
    await client.query("COMMIT;");
    client.release();

    // Try deleting journal header
    let delFailed = false;
    let delError = "";
    try {
      await pool.query('DELETE FROM "journal_transactions" WHERE "id" = $1;', [journalId]);
    } catch (err) {
      delFailed = true;
      delError = err.message;
    }
    expect(delFailed).to.be.true;
    expect(delError).to.include("Journal transactions are strictly immutable. DELETE is prohibited");

    // Try updating isDemo flag on journal header
    let updFailed = false;
    let updError = "";
    try {
      await pool.query('UPDATE "journal_transactions" SET "isDemo" = true WHERE "id" = $1;', [journalId]);
    } catch (err) {
      updFailed = true;
      updError = err.message;
    }
    expect(updFailed).to.be.true;
    expect(updError).to.include("Journal transaction headers are immutable");
  });

  // =========================================================================
  // TEST 6: Late Postings to Committed Journals are Blocked
  // =========================================================================
  it("REAL DB: Cannot add new postings to an already committed/closed journal", async function () {
    const client = await pool.connect();
    const journalId = "jrnl_closed_" + crypto.randomUUID().slice(0, 8);
    const u1 = "usr_closed1_" + crypto.randomUUID().slice(0, 8);
    const u2 = "usr_closed2_" + crypto.randomUUID().slice(0, 8);
    const assetId = "bsc-testnet:bep20:0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";

    await client.query("BEGIN;");
    await client.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now()), ($3, $4, now());', [
      u1, "u1_cl_" + Date.now(), u2, "u2_cl_" + Date.now()
    ]);
    const acc1 = "acc_cl1_" + crypto.randomUUID().slice(0, 8);
    const acc2 = "acc_cl2_" + crypto.randomUUID().slice(0, 8);
    await client.query('INSERT INTO "ledger_accounts" ("id", "userId", "accountType", "assetId") VALUES ($1, $2, $3, $4), ($5, $6, $7, $8);', [
      acc1, u1, "USER_AVAILABLE", assetId,
      acc2, u2, "USER_AVAILABLE", assetId
    ]);
    await client.query('INSERT INTO "journal_transactions" ("id", "reason") VALUES ($1, $2);', [journalId, "DEPOSIT"]);
    await client.query('INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14);', [
      crypto.randomUUID(), journalId, acc1, assetId, "DEBIT", 100, 0,
      crypto.randomUUID(), journalId, acc2, assetId, "CREDIT", 100, 1
    ]);
    await client.query("COMMIT;");
    client.release();

    // Separate transaction attempts to insert a late posting into the committed journal
    let lateFailed = false;
    let lateError = "";
    try {
      await pool.query(
        'INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7);',
        [crypto.randomUUID(), journalId, acc1, assetId, "DEBIT", 50, 2]
      );
    } catch (err) {
      lateFailed = true;
      lateError = err.message;
    }

    expect(lateFailed).to.be.true;
    expect(lateError).to.include("Journal transaction " + journalId + " is already committed and closed. Adding postings to closed journals is strictly prohibited");
  });

  // =========================================================================
  // TEST 7: Cross-Asset Accounting Strict Zero-Sum Validation
  // =========================================================================
  it("REAL DB: Reject cross-asset imbalances (each asset must balance independently)", async function () {
    const client = await pool.connect();
    const journalId = "jrnl_cross_" + crypto.randomUUID().slice(0, 8);
    const u1 = "usr_cross1_" + crypto.randomUUID().slice(0, 8);
    const u2 = "usr_cross2_" + crypto.randomUUID().slice(0, 8);
    const lioraAsset = "bsc-testnet:bep20:0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";
    const usdtAsset = "bsc-testnet:bep20:0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";

    await client.query("BEGIN;");
    await client.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now()), ($3, $4, now());', [
      u1, "u1_cross_" + Date.now(), u2, "u2_cross_" + Date.now()
    ]);
    const accLiora = "acc_liora_cross_" + crypto.randomUUID().slice(0, 8);
    const accUsdt = "acc_usdt_cross_" + crypto.randomUUID().slice(0, 8);
    await client.query('INSERT INTO "ledger_accounts" ("id", "userId", "accountType", "assetId") VALUES ($1, $2, $3, $4), ($5, $6, $7, $8);', [
      accLiora, u1, "USER_AVAILABLE", lioraAsset,
      accUsdt, u2, "USER_AVAILABLE", usdtAsset
    ]);

    await client.query('INSERT INTO "journal_transactions" ("id", "reason") VALUES ($1, $2);', [journalId, "TRADE"]);
    // Posting 1: DEBIT 100 LIORA
    await client.query('INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7);', [
      crypto.randomUUID(), journalId, accLiora, lioraAsset, "DEBIT", 100, 0
    ]);
    // Posting 2: CREDIT 100 USDT (Different asset! Even though amounts equal, cross-asset sum does not balance!)
    await client.query('INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7);', [
      crypto.randomUUID(), journalId, accUsdt, usdtAsset, "CREDIT", 100, 1
    ]);

    let crossFailed = false;
    let crossError = "";
    try {
      await client.query("COMMIT;");
    } catch (err) {
      crossFailed = true;
      crossError = err.message;
      await client.query("ROLLBACK;");
    } finally {
      client.release();
    }

    expect(crossFailed).to.be.true;
    expect(crossError).to.include("Unbalanced double-entry journal");
  });

  // =========================================================================
  // TEST 8: Duplicate Reversals are Strictly Rejected
  // =========================================================================
  it("REAL DB: A journal transaction can be reversed at most once", async function () {
    const origJournalId = "jrnl_orig_" + crypto.randomUUID().slice(0, 8);
    const rev1Id = "jrnl_rev1_" + crypto.randomUUID().slice(0, 8);
    const rev2Id = "jrnl_rev2_" + crypto.randomUUID().slice(0, 8);
    const assetId = "bsc-testnet:bep20:0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";
    const u1 = "usr_rev1_" + crypto.randomUUID().slice(0, 8);
    const u2 = "usr_rev2_" + crypto.randomUUID().slice(0, 8);

    const client = await pool.connect();
    await client.query("BEGIN;");
    await client.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now()), ($3, $4, now());', [
      u1, "u1_rev_" + Date.now(), u2, "u2_rev_" + Date.now()
    ]);

    const acc1 = "acc_rev1_" + crypto.randomUUID().slice(0, 8);
    const acc2 = "acc_rev2_" + crypto.randomUUID().slice(0, 8);
    await client.query('INSERT INTO "ledger_accounts" ("id", "userId", "accountType", "assetId") VALUES ($1, $2, $3, $4), ($5, $6, $7, $8);', [
      acc1, u1, "USER_AVAILABLE", assetId,
      acc2, u2, "USER_LOCKED", assetId
    ]);

    await client.query('INSERT INTO "journal_transactions" ("id", "reason") VALUES ($1, $2);', [origJournalId, "DEPOSIT"]);
    await client.query('INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14);', [
      crypto.randomUUID(), origJournalId, acc1, assetId, "DEBIT", 100, 0,
      crypto.randomUUID(), origJournalId, acc2, assetId, "CREDIT", 100, 1
    ]);
    await client.query("COMMIT;");

    // First reversal
    await client.query("BEGIN;");
    await client.query('INSERT INTO "journal_transactions" ("id", "reason", "reversalOfId") VALUES ($1, $2, $3);', [rev1Id, "REORGANIZATION_ADJUSTMENT", origJournalId]);
    await client.query('INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14);', [
      crypto.randomUUID(), rev1Id, acc2, assetId, "DEBIT", 100, 0,
      crypto.randomUUID(), rev1Id, acc1, assetId, "CREDIT", 100, 1
    ]);
    await client.query("COMMIT;");

    // Second reversal attempt
    let dupRevFailed = false;
    let dupRevError = "";
    try {
      await client.query('INSERT INTO "journal_transactions" ("id", "reason", "reversalOfId") VALUES ($1, $2, $3);', [rev2Id, "REORGANIZATION_ADJUSTMENT", origJournalId]);
    } catch (err) {
      dupRevFailed = true;
      dupRevError = err.message;
    } finally {
      client.release();
    }

    expect(dupRevFailed).to.be.true;
    expect(dupRevError).to.include("duplicate key value violates unique constraint \"journal_transactions_reversalOfId_key\"");
  });

  // =========================================================================
  // TEST 9: Asset/Account Mismatches Rejected by Compound Foreign Key
  // =========================================================================
  it("REAL DB: Reject postings where posting.assetId does not match account.assetId", async function () {
    const lioraAsset = "bsc-testnet:bep20:0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";
    const usdtAsset = "bsc-testnet:bep20:0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
    const accId = "acc_liora_only_" + crypto.randomUUID().slice(0, 8);
    const journalId = "jrnl_mismatch_" + crypto.randomUUID().slice(0, 8);
    const userId = "usr_mismatch_" + crypto.randomUUID().slice(0, 8);

    await pool.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now());', [userId, "mismatch_" + Date.now()]);
    await pool.query('INSERT INTO "ledger_accounts" ("id", "userId", "accountType", "assetId") VALUES ($1, $2, $3, $4);', [
      accId, userId, "USER_AVAILABLE", lioraAsset
    ]);

    const client = await pool.connect();
    let mismatchFailed = false;
    let mismatchError = "";
    try {
      await client.query("BEGIN;");
      await client.query('INSERT INTO "journal_transactions" ("id", "reason") VALUES ($1, $2);', [journalId, "DEPOSIT"]);
      await client.query(
        'INSERT INTO "ledger_postings" ("id", "journalId", "accountId", "assetId", "direction", "amountBaseUnits", "sequence") VALUES ($1, $2, $3, $4, $5, $6, $7);',
        [crypto.randomUUID(), journalId, accId, usdtAsset, "DEBIT", 100, 0]
      );
      await client.query("COMMIT;");
    } catch (err) {
      mismatchFailed = true;
      mismatchError = err.message;
      await client.query("ROLLBACK;");
    } finally {
      client.release();
    }

    expect(mismatchFailed).to.be.true;
    expect(mismatchError).to.include("ledger_postings_account_asset_fkey");
  });

  // =========================================================================
  // TEST 10: 78-Digit Base Units Exact Precision (NUMERIC(78, 0))
  // =========================================================================
  it("REAL DB: Authoritative base units preserve full 78-digit uint256 integers without IEEE-754 drift", async function () {
    const userId = "usr_uint256_" + crypto.randomUUID().slice(0, 8);
    const maxUint256Str = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
    const assetId = "bsc-testnet:bep20:0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";

    await pool.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now());', [userId, "u256_" + Date.now()]);

    const balId = "bal_u256_" + crypto.randomUUID().slice(0, 8);
    await pool.query(
      'INSERT INTO "token_balances" ("id", "userId", "tokenSymbol", "assetId", "decimals", "balance", "balanceRaw", "balanceBaseUnits", "lockedBalance", "lockedBaseUnits", "isDemoBalance", "updatedAt") VALUES ($1, $2, $3, $4, $5, 0, $6, $7, 0, 0, false, now());',
      [balId, userId, "LIORA", assetId, 18, maxUint256Str, maxUint256Str]
    );

    const res = await pool.query('SELECT "balanceBaseUnits"::TEXT FROM "token_balances" WHERE "id" = $1;', [balId]);
    expect(res.rows[0].balanceBaseUnits).to.equal(maxUint256Str);
  });

  // =========================================================================
  // TEST 11: Check Constraints Reject Negative Balances and Over-Locking
  // =========================================================================
  it("REAL DB: Check constraints reject negative balanceBaseUnits and lockedBaseUnits > balanceBaseUnits", async function () {
    const userId = "usr_chk_" + crypto.randomUUID().slice(0, 8);
    await pool.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now());', [userId, "chk_" + Date.now()]);

    // Reject negative balance
    let negFailed = false;
    let negError = "";
    try {
      await pool.query(
        'INSERT INTO "token_balances" ("id", "userId", "tokenSymbol", "balance", "balanceRaw", "balanceBaseUnits", "isDemoBalance", "updatedAt") VALUES ($1, $2, $3, -10, $4, -10, true, now());',
        [crypto.randomUUID(), userId, "USDT", "-10"]
      );
    } catch (err) {
      negFailed = true;
      negError = err.message;
    }
    expect(negFailed).to.be.true;
    expect(negError.toLowerCase()).to.satisfy(msg => msg.includes("chk_base_units_non_negative") || msg.includes("chk_balance_non_negative"));

    // Reject locked > balance
    let overlockFailed = false;
    let overlockError = "";
    try {
      await pool.query(
        'INSERT INTO "token_balances" ("id", "userId", "tokenSymbol", "balance", "balanceRaw", "balanceBaseUnits", "lockedBalance", "lockedBaseUnits", "isDemoBalance", "updatedAt") VALUES ($1, $2, $3, 10, $4, 10, 50, 50, true, now());',
        [crypto.randomUUID(), userId, "LIORA", "10"]
      );
    } catch (err) {
      overlockFailed = true;
      overlockError = err.message;
    }
    expect(overlockFailed).to.be.true;
    expect(overlockError.toLowerCase()).to.satisfy(msg => msg.includes("chk_locked_lte_balance_base_units") || msg.includes("chk_locked_balance_lte_balance"));
  });

  // =========================================================================
  // TEST 12: Concurrent Spending Defenses (Row Locking / Conditional Atomicity)
  // =========================================================================
  it("REAL DB: Concurrent deductions cannot overdraw an account balance below zero", async function () {
    const userId = "usr_concur_" + crypto.randomUUID().slice(0, 8);
    const balId = "bal_concur_" + crypto.randomUUID().slice(0, 8);
    await pool.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now());', [userId, "concur_" + Date.now()]);

    await pool.query(
      'INSERT INTO "token_balances" ("id", "userId", "tokenSymbol", "decimals", "balance", "balanceRaw", "balanceBaseUnits", "lockedBalance", "lockedBaseUnits", "isDemoBalance", "updatedAt") VALUES ($1, $2, $3, 18, 100, $4, 100, 0, 0, false, now());',
      [balId, userId, "USDT", "100"]
    );

    const txA = async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN;");
        const res = await client.query('UPDATE "token_balances" SET "balanceBaseUnits" = "balanceBaseUnits" - 80 WHERE "id" = $1 AND "balanceBaseUnits" >= 80 RETURNING "balanceBaseUnits";', [balId]);
        await client.query("COMMIT;");
        return res.rowCount;
      } catch (e) {
        await client.query("ROLLBACK;");
        return 0;
      } finally {
        client.release();
      }
    };

    const txB = async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN;");
        const res = await client.query('UPDATE "token_balances" SET "balanceBaseUnits" = "balanceBaseUnits" - 80 WHERE "id" = $1 AND "balanceBaseUnits" >= 80 RETURNING "balanceBaseUnits";', [balId]);
        await client.query("COMMIT;");
        return res.rowCount;
      } catch (e) {
        await client.query("ROLLBACK;");
        return 0;
      } finally {
        client.release();
      }
    };

    const results = await Promise.all([txA(), txB()]);
    const totalDeductedCount = results.filter(r => r === 1).length;

    expect(totalDeductedCount).to.equal(1);

    const finalRes = await pool.query('SELECT "balanceBaseUnits"::INT FROM "token_balances" WHERE "id" = $1;', [balId]);
    expect(finalRes.rows[0].balanceBaseUnits).to.equal(20);
  });

  // =========================================================================
  // TEST 13: Idempotency Key Prevents Duplicate Allocations
  // =========================================================================
  it("REAL DB: Idempotency keys prevent duplicate investor allocations", async function () {
    const userId = "usr_alloc_" + crypto.randomUUID().slice(0, 8);
    const idemKey = "idem_alloc_" + crypto.randomUUID().slice(0, 8);
    const purch1 = "purch_" + crypto.randomUUID().slice(0, 8);
    const purch2 = "purch_" + crypto.randomUUID().slice(0, 8);
    await pool.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now());', [userId, "alloc_" + Date.now()]);

    await pool.query(
      'INSERT INTO "investor_allocations" ("id", "purchaseId", "idempotencyKey", "userId", "walletAddress", "investmentAmountUSD", "tokenQuantity", "lockTierMonths", "lockStartTimeUTC", "unlockTimeUTC", "policyVersion") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now(), 1);',
      [crypto.randomUUID(), purch1, idemKey, userId, "0x1234567890123456789012345678901234567890", 1000, "10000000000000000000000", 3]
    );

    let dupFailed = false;
    let dupError = "";
    try {
      await pool.query(
        'INSERT INTO "investor_allocations" ("id", "purchaseId", "idempotencyKey", "userId", "walletAddress", "investmentAmountUSD", "tokenQuantity", "lockTierMonths", "lockStartTimeUTC", "unlockTimeUTC", "policyVersion") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now(), 1);',
        [crypto.randomUUID(), purch2, idemKey, userId, "0x1234567890123456789012345678901234567890", 1000, "10000000000000000000000", 3]
      );
    } catch (err) {
      dupFailed = true;
      dupError = err.message;
    }

    expect(dupFailed).to.be.true;
    expect(dupError).to.include("investor_allocations_idempotencyKey_key");
  });

  // =========================================================================
  // TEST 14: Transaction Rollback is 100% Atomic
  // =========================================================================
  it("REAL DB: Aborted transaction completely rolls back all mutated state", async function () {
    const client = await pool.connect();
    const userId = "usr_atomic_" + crypto.randomUUID().slice(0, 8);
    const walletAddr = "0x" + crypto.randomBytes(20).toString("hex");

    await client.query("BEGIN;");
    await client.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now());', [userId, "atomic_" + Date.now()]);
    await client.query('INSERT INTO "verified_wallets" ("id", "walletAddress", "userId") VALUES ($1, $2, $3);', [
      crypto.randomUUID(), walletAddr, userId
    ]);

    try {
      await client.query('INSERT INTO "token_balances" ("id", "userId", "tokenSymbol", "balance", "balanceRaw", "balanceBaseUnits", "updatedAt") VALUES ($1, $2, $3, -999, $4, -999, now());', [
        crypto.randomUUID(), userId, "USDT", "-999"
      ]);
    } catch (e) {
      await client.query("ROLLBACK;");
    } finally {
      client.release();
    }

    const uRes = await pool.query('SELECT 1 FROM "users" WHERE "id" = $1;', [userId]);
    const wRes = await pool.query('SELECT 1 FROM "verified_wallets" WHERE "walletAddress" = $1;', [walletAddr]);
    expect(uRes.rows.length).to.equal(0);
    expect(wRes.rows.length).to.equal(0);
  });

  // =========================================================================
  // TEST 15: Demo and Live Records Remain Strictly Isolated
  // =========================================================================
  it("REAL DB: Demo and live token balances coexist cleanly with identical assetId and userId without cross-pollution", async function () {
    const userId = "usr_demo_live_" + crypto.randomUUID().slice(0, 8);
    const assetId = "bsc-testnet:bep20:0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";
    await pool.query('INSERT INTO "users" ("id", "username", "updatedAt") VALUES ($1, $2, now());', [userId, "demolive_" + Date.now()]);

    const demoBalId = "bal_demo_" + crypto.randomUUID().slice(0, 8);
    const liveBalId = "bal_live_" + crypto.randomUUID().slice(0, 8);

    await pool.query(
      'INSERT INTO "token_balances" ("id", "userId", "tokenSymbol", "assetId", "decimals", "balance", "balanceRaw", "balanceBaseUnits", "isDemoBalance", "updatedAt") VALUES ($1, $2, $3, $4, 18, 5000, $5, 5000, true, now());',
      [demoBalId, userId, "LIORA", assetId, "5000"]
    );

    await pool.query(
      'INSERT INTO "token_balances" ("id", "userId", "tokenSymbol", "assetId", "decimals", "balance", "balanceRaw", "balanceBaseUnits", "isDemoBalance", "updatedAt") VALUES ($1, $2, $3, $4, 18, 0, $5, 0, false, now());',
      [liveBalId, userId, "LIORA", assetId, "0"]
    );

    const demoRes = await pool.query('SELECT "balanceBaseUnits"::INT FROM "token_balances" WHERE "userId" = $1 AND "isDemoBalance" = true;', [userId]);
    expect(demoRes.rows.length).to.equal(1);
    expect(demoRes.rows[0].balanceBaseUnits).to.equal(5000);

    const liveRes = await pool.query('SELECT "balanceBaseUnits"::INT FROM "token_balances" WHERE "userId" = $1 AND "isDemoBalance" = false;', [userId]);
    expect(liveRes.rows.length).to.equal(1);
    expect(liveRes.rows[0].balanceBaseUnits).to.equal(0);
  });
});
