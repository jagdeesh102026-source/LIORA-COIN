const { expect } = require("chai");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const webModules = path.resolve(__dirname, "../apps/web/node_modules");
const { Pool } = require(path.join(webModules, "pg"));
const { PrismaPg } = require(path.join(webModules, "@prisma/adapter-pg"));
const { PrismaClient } = require("@prisma/client");

require("./helpers/tsLoader");

// Safely ensure DATABASE_URL is in process.env
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
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
        if (key === "DATABASE_URL" && !process.env.DATABASE_URL) {
          process.env.DATABASE_URL = val;
        }
      }
    }
  }
}

const { prismaDb, PrismaDatabaseAdapter } = require("../apps/web/src/lib/server/prismaDb");
const { prisma } = require("../apps/web/src/lib/server/prisma");
const { serverDb } = require("../apps/web/src/lib/server/db");

describe("LIORA COIN — Phase 2B Gate C2B-3: PostgreSQL Cutover Readiness & Authentication Hardening Suite", function () {
  this.timeout(30000);

  let poolB;
  let prismaB;
  let prismaDbB;

  before(async function () {
    poolB = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapterB = new PrismaPg(poolB);
    prismaB = new PrismaClient({ adapter: adapterB });
    prismaDbB = new PrismaDatabaseAdapter(prismaB);
  });

  after(async function () {
    if (prismaB) await prismaB.$disconnect();
    if (poolB) await poolB.end();
    await prisma.$disconnect();
  });

  // Scenario 1: Concurrent Single-Use Nonce Consumption (Atomic Row Lock)
  it("Scenario 1: Concurrently consuming the same nonce succeeds exactly once across 5 racing requests", async function () {
    const address = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();
    const nonce = await prismaDb.createNonce(address, 60000);

    // Launch 5 simultaneous consumeNonce requests
    const promises = [
      prismaDb.consumeNonce(nonce, address),
      prismaDb.consumeNonce(nonce, address),
      prismaDb.consumeNonce(nonce, address),
      prismaDb.consumeNonce(nonce, address),
      prismaDb.consumeNonce(nonce, address),
    ];

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r === true);
    const failures = results.filter((r) => r === false);

    expect(successes.length).to.equal(1, "Exactly one concurrent request must successfully consume the nonce");
    expect(failures.length).to.equal(4, "All 4 competing concurrent requests must be rejected");

    // Verify in database: marked consumed
    const record = await prisma.authNonce.findUnique({ where: { nonce } });
    expect(record.consumed).to.be.true;
    expect(record.consumedAt).to.not.be.null;
  });

  // Scenario 2: Nonce Persistence Across Independent Instances / Restarts
  it("Scenario 2: Nonces persist across independent connection pools / simulated server restarts", async function () {
    const address = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();

    // Instance A creates nonce
    const nonce = await prismaDb.createNonce(address, 60000);

    // Instance B (independent process / pool) consumes nonce
    const consumedOnB = await prismaDbB.consumeNonce(nonce, address);
    expect(consumedOnB).to.be.true;

    // Instance A subsequent consume fails
    const consumedOnA = await prismaDb.consumeNonce(nonce, address);
    expect(consumedOnA).to.be.false;
  });

  // Scenario 3: Database Failure During Nonce Creation (Fails Closed)
  it("Scenario 3: Nonce creation fails closed when database is unavailable", async function () {
    const brokenPool = new Pool({
      connectionString: "postgresql://liora_app:invalid_pw_12345@127.0.0.1:5432/liora_dev?connect_timeout=1",
    });
    const brokenPrisma = new PrismaClient({ adapter: new PrismaPg(brokenPool) });
    const brokenDb = new PrismaDatabaseAdapter(brokenPrisma);

    let errorThrown = false;
    try {
      await brokenDb.createNonce("0x1234567890123456789012345678901234567890");
    } catch (err) {
      errorThrown = true;
    } finally {
      await brokenPrisma.$disconnect().catch(() => { });
      await brokenPool.end().catch(() => { });
    }

    expect(errorThrown).to.be.true;
  });

  // Scenario 4: Database Failure During Nonce Consumption (Fails Closed)
  it("Scenario 4: Nonce consumption fails closed when database is unavailable", async function () {
    const brokenPool = new Pool({
      connectionString: "postgresql://liora_app:invalid_pw_12345@127.0.0.1:5432/liora_dev?connect_timeout=1",
    });
    const brokenPrisma = new PrismaClient({ adapter: new PrismaPg(brokenPool) });
    const brokenDb = new PrismaDatabaseAdapter(brokenPrisma);

    let errorThrown = false;
    try {
      await brokenDb.consumeNonce("non_dummy_12345678", "0x1234567890123456789012345678901234567890");
    } catch (err) {
      errorThrown = true;
    } finally {
      await brokenPrisma.$disconnect().catch(() => { });
      await brokenPool.end().catch(() => { });
    }

    expect(errorThrown).to.be.true;
  });

  // Scenario 5: Session Revocation Enforced Across Instances & Survives Restarts
  it("Scenario 5: Session revocation is immediately visible across instances and survives server restarts", async function () {
    const user = await prismaDb.createUser({
      username: "sess_multi_" + crypto.randomUUID().slice(0, 8),
    });

    // Create session on Instance A
    const session = await prismaDb.createSession(user.id, 24, "10.0.0.1");

    // Fetch on Instance B -> valid
    const fetchedOnB = await prismaDbB.getSession(session.sessionIdentifier);
    expect(fetchedOnB).to.not.be.null;
    expect(fetchedOnB.userId).to.equal(user.id);

    // Revoke session on Instance A
    await prismaDb.revokeSession(session.sessionIdentifier, "ADMIN_REVOCATION");

    // Instance B immediately sees revocation
    const fetchedAfterRevokeB = await prismaDbB.getSession(session.sessionIdentifier);
    expect(fetchedAfterRevokeB).to.be.null;

    // Create Instance C simulating fresh process start
    const poolC = new Pool({ connectionString: process.env.DATABASE_URL });
    const prismaC = new PrismaClient({ adapter: new PrismaPg(poolC) });
    const prismaDbC = new PrismaDatabaseAdapter(prismaC);

    const fetchedOnC = await prismaDbC.getSession(session.sessionIdentifier);
    expect(fetchedOnC).to.be.null;

    await prismaC.$disconnect();
    await poolC.end();
  });

  // Scenario 6: User & Wallet Identity Persistence Across Instances
  it("Scenario 6: User records and linked verified wallets are persistently shared across instances", async function () {
    const username = "wallet_user_" + crypto.randomUUID().slice(0, 8);
    const user = await prismaDb.createUser({ username, role: "USER" });
    const wallet = "0x" + crypto.randomBytes(20).toString("hex");

    await prismaDb.linkVerifiedWallet({
      walletAddress: wallet,
      userId: user.id,
      chainId: 97,
      nonceChallenge: "chal_test",
      signatureProof: "sig_proof",
    });

    // Read on Instance B
    const fetchedWalletB = await prismaDbB.getVerifiedWallet(wallet);
    expect(fetchedWalletB).to.not.be.null;
    expect(fetchedWalletB.walletAddress).to.equal(wallet.toLowerCase());
    expect(fetchedWalletB.userId).to.equal(user.id);
    expect(fetchedWalletB.isPrimary).to.be.true;

    const userWalletsB = await prismaDbB.getWalletsByUserId(user.id);
    expect(userWalletsB.length).to.equal(1);
    expect(userWalletsB[0].walletAddress).to.equal(wallet.toLowerCase());
  });

  // Scenario 7: Purchase Intent & Allocation Idempotency Across Instances
  it("Scenario 7: Purchase intents and investor allocations guarantee idempotency across instances", async function () {
    const user = await prismaDb.createUser({
      username: "idem_usr_" + crypto.randomUUID().slice(0, 8),
    });
    const quoteId = "quote_c2b3_" + crypto.randomUUID().slice(0, 8);
    const wallet = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();
    const idemKey = "idem_c2b3_" + crypto.randomUUID().slice(0, 8);

    await prisma.investorQuote.create({
      data: {
        id: quoteId,
        quoteId,
        userId: user.id,
        walletAddress: wallet,
        investmentAmount: 500,
        currency: "USD",
        investmentAmountUSD: 500,
        tokenPriceUSD: "0.05",
        tokenPriceINR: "4.32",
        tokenQuantity: "10000000000000000000000",
        lockTier: "TIER_1",
        lockMonths: 6,
        lockStartTimeUTC: new Date(),
        estimatedUnlockTimeUTC: new Date(Date.now() + 180 * 86400 * 1000),
        policyVersion: 1,
        expiresAt: new Date(Date.now() + 900 * 1000),
      },
    });

    // Create intent on Instance A
    const intentA = await prismaDb.createPurchaseIntent({
      idempotencyKey: idemKey,
      userId: user.id,
      quoteId,
      walletAddress: wallet,
      amountUSD: 500,
      tokenQuantity: "10000000000000000000000",
    });

    // Retry exact same intent on Instance B -> returns identical record
    const intentB = await prismaDbB.createPurchaseIntent({
      idempotencyKey: idemKey,
      userId: user.id,
      quoteId,
      walletAddress: wallet,
      amountUSD: 500,
      tokenQuantity: "10000000000000000000000",
    });

    expect(intentB.id).to.equal(intentA.id);
    expect(intentB.idempotencyKey).to.equal(intentA.idempotencyKey);

    // Create allocation on Instance A
    const purchId = "purch_c2b3_" + crypto.randomUUID().slice(0, 8);
    const allocIdem = "alloc_idem_" + crypto.randomUUID().slice(0, 8);

    const allocA = await prismaDb.createInvestorAllocation({
      purchaseId: purchId,
      idempotencyKey: allocIdem,
      userId: user.id,
      walletAddress: wallet,
      investmentAmountUSD: 500,
      tokenQuantity: "10000000000000000000000",
      lockTierMonths: 3,
      lockStartTimeUTC: new Date().toISOString(),
      unlockTimeUTC: new Date(Date.now() + 90 * 86400 * 1000).toISOString(),
      policyVersion: 1,
    });

    // Replay on Instance B
    const allocB = await prismaDbB.createInvestorAllocation({
      purchaseId: purchId,
      idempotencyKey: allocIdem,
      userId: user.id,
      walletAddress: wallet,
      investmentAmountUSD: 500,
      tokenQuantity: "10000000000000000000000",
      lockTierMonths: 3,
      lockStartTimeUTC: new Date().toISOString(),
      unlockTimeUTC: new Date(Date.now() + 90 * 86400 * 1000).toISOString(),
      policyVersion: 1,
    });

    expect(allocB.id).to.equal(allocA.id);
  });

  // Scenario 8: Financial Rollback & Double-Entry Ledger Validation
  it("Scenario 8: Financial rollback restores balance and double-entry triggers verify balanced journals", async function () {
    const user = await prismaDb.createUser({
      username: "ledger_usr_" + crypto.randomUUID().slice(0, 8),
    });

    // Credit initial deposit: 500 LIORA
    const { balance: initialBal } = await prismaDb.recordBalanceMovement({
      userId: user.id,
      tokenSymbol: "LIORA",
      amount: 500,
      amountRaw: "500000000000000000000",
      entryType: "CREDIT",
      reason: "DEPOSIT",
      isDemo: false,
    });
    expect(initialBal.balance).to.equal(500);

    // Check that balanced postings and journal were recorded in DB
    const journals = await prisma.journalTransaction.findMany({
      where: { reason: "DEPOSIT" },
      orderBy: { createdAt: "desc" },
      take: 1,
      include: { postings: true },
    });
    expect(journals.length).to.equal(1);
    expect(journals[0].postings.length).to.equal(2);
    const debitPosting = journals[0].postings.find((p) => p.direction === "DEBIT");
    const creditPosting = journals[0].postings.find((p) => p.direction === "CREDIT");
    expect(debitPosting.amountBaseUnits.toString()).to.equal(creditPosting.amountBaseUnits.toString());

    // Transaction that throws error mid-way rolls back completely
    let txFailed = false;
    try {
      await prismaDb.transaction(async (tx) => {
        await tx.recordBalanceMovement({
          userId: user.id,
          tokenSymbol: "LIORA",
          amount: 100,
          amountRaw: "100000000000000000000",
          entryType: "DEBIT",
          reason: "TRADE",
          isDemo: false,
        });
        throw new Error("Simulated downstream settlement failure");
      });
    } catch (e) {
      txFailed = true;
    }
    expect(txFailed).to.be.true;

    // Verify balance was rolled back to 500
    const balAfterRollback = await prismaDb.getTokenBalance(user.id, "LIORA", false);
    expect(balAfterRollback.balance).to.equal(500);
    expect(balAfterRollback.balanceRaw).to.equal("500000000000000000000");

    // Directly test deferred trigger: attempting to commit an unbalanced journal transaction fails
    let unbalancedFailed = false;
    try {
      await prisma.$transaction(async (rawTx) => {
        const jrnId = "jrn_unbal_" + crypto.randomUUID().slice(0, 8);
        await rawTx.journalTransaction.create({
          data: {
            id: jrnId,
            reason: "TRADE",
            isDemo: false,
          },
        });
        // Only 1 posting (violates >= 2 postings rule)
        await rawTx.ledgerPosting.create({
          data: {
            id: "pst_unbal_" + crypto.randomUUID().slice(0, 8),
            journalId: jrnId,
            accountId: journals[0].postings[0].accountId,
            assetId: journals[0].postings[0].assetId,
            direction: "CREDIT",
            amountBaseUnits: new (require("@prisma/client").Prisma.Decimal)(100),
            sequence: 0,
          },
        });
      });
    } catch (err) {
      unbalancedFailed = true;
      expect(err.message).to.match(/trg_verify_journal_finalization|requires at least 2 postings/);
    }
    expect(unbalancedFailed).to.be.true;
  });

  // Scenario 9: Fail-Closed Behavior for Financial Operations on DB Outage
  it("Scenario 9: Financial transactions fail closed when database connection fails", async function () {
    const brokenPool = new Pool({
      connectionString: "postgresql://liora_app:invalid_pw_12345@127.0.0.1:5432/liora_dev?connect_timeout=1",
    });
    const brokenPrisma = new PrismaClient({ adapter: new PrismaPg(brokenPool) });
    const brokenDb = new PrismaDatabaseAdapter(brokenPrisma);

    let errorThrown = false;
    try {
      await brokenDb.recordBalanceMovement({
        userId: "usr_dummy",
        tokenSymbol: "LIORA",
        amount: 50,
        amountRaw: "50000000000000000000",
        entryType: "CREDIT",
        reason: "DEPOSIT",
      });
    } catch (err) {
      errorThrown = true;
    } finally {
      await brokenPrisma.$disconnect().catch(() => { });
      await brokenPool.end().catch(() => { });
    }

    expect(errorThrown).to.be.true;
  });

  // Scenario 10: API Contract Compatibility between ServerDatabase and PrismaDatabaseAdapter
  it("Scenario 10: PrismaDatabaseAdapter implements all required methods with compatible signatures", function () {
    const requiredMethods = [
      "transaction",
      "findUserById",
      "findUserByUsername",
      "findUserByEmail",
      "createUser",
      "updateUser",
      "createNonce",
      "consumeNonce",
      "getVerifiedWallet",
      "getWalletsByUserId",
      "linkVerifiedWallet",
      "createSession",
      "getSession",
      "revokeSession",
      "createAuditLog",
      "getAuditLogs",
      "createPurchaseIntent",
      "createInvestorAllocation",
      "getAllocationsByUserId",
      "getAllocationById",
      "createVestingSchedule",
      "getPaymentByTxHash",
      "recordPayment",
      "recordPaymentTransaction",
      "flagReorganization",
      "getPlanById",
      "getPlans",
      "updatePlan",
      "getSubscriptionByUserId",
      "renewSubscription",
      "setSubscription",
      "revokeSubscription",
      "getAllSubscribers",
      "activateTrial",
      "startTrial",
      "getTrialByUserId",
      "getTrialByWallet",
      "getTokenBalance",
      "recordBalanceMovement",
      "createTradingOrder",
      "getTradingOrder",
    ];

    for (const method of requiredMethods) {
      expect(typeof prismaDb[method], `Method ${method} must exist on prismaDb`).to.equal("function");
      expect(typeof serverDb[method], `Method ${method} must exist on serverDb`).to.equal("function");
    }
  });
});
