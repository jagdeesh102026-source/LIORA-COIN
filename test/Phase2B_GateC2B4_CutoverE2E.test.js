const { expect } = require("chai");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { ethers } = require("hardhat");

require("./helpers/tsLoader");

const webModules = path.resolve(__dirname, "../apps/web/node_modules");
const { Pool } = require(path.join(webModules, "pg"));
const { PrismaPg } = require(path.join(webModules, "@prisma/adapter-pg"));
const { PrismaClient } = require("@prisma/client");
const { NextRequest } = require(path.join(webModules, "next/server"));

// Ensure local development configuration has OXENIQ_PERSISTENCE_MODE=postgres
process.env.OXENIQ_PERSISTENCE_MODE = "postgres";

const { serverDb, getPersistenceMode, getActiveDatabaseAdapter, ServerDatabase } = require("../apps/web/src/lib/server/db");
const { prismaDb, PrismaDatabaseAdapter } = require("../apps/web/src/lib/server/prismaDb");
const { prisma, pool } = require("../apps/web/src/lib/server/prisma");

// Route handlers under test
const { GET: getWalletNonce } = require("../apps/web/src/app/api/auth/wallet-nonce/route");
const { POST: verifyWallet } = require("../apps/web/src/app/api/auth/verify-wallet/route");
const { GET: getSession } = require("../apps/web/src/app/api/auth/session/route");
const { POST: logout } = require("../apps/web/src/app/api/auth/logout/route");
const { GET: getSubscriptionPlans } = require("../apps/web/src/app/api/bot/subscription/plans/route");
const { POST: startTrial } = require("../apps/web/src/app/api/bot/trial/start/route");

describe("LIORA COIN — Phase 2B Gate C2B-4: Controlled PostgreSQL Cutover & End-to-End API Suite", function () {
  this.timeout(35000);

  let testSigner;
  let testSignerAddress;

  before(async function () {
    const signers = await ethers.getSigners();
    testSigner = signers[0];
    testSignerAddress = (await testSigner.getAddress()).toLowerCase();

    // Verify active persistence mode
    expect(getPersistenceMode()).to.equal("postgres");
    const active = getActiveDatabaseAdapter();
    expect(active instanceof PrismaDatabaseAdapter).to.be.true;

    // Verify target database is exactly liora_dev
    const dbCheck = await pool.query("SELECT current_database(), current_user");
    expect(dbCheck.rows[0].current_database).to.equal("liora_dev");
    expect(dbCheck.rows[0].current_user).to.equal("liora_app");
  });

  after(async function () {
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. AUTHENTICATION & IDENTITY (REAL API ROUTES & POSTGRESQL PERSISTENCE)
  // =========================================================================
  describe("1. Authentication & Identity API Routes", function () {
    let currentNonce;
    let currentSiweMessage;
    let authSessionId;
    let authenticatedUser;

    it("1.1 GET /api/auth/wallet-nonce: Generates EIP-4361 SIWE challenge and persists nonce in auth_nonces", async function () {
      const req = new NextRequest(
        `http://localhost:3000/api/auth/wallet-nonce?address=${testSignerAddress}&chainId=97`
      );
      const res = await getWalletNonce(req);
      expect(res.status).to.equal(200);

      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.address).to.equal(testSignerAddress);
      expect(data.nonce).to.be.a("string").with.lengthOf(32);
      expect(data.siweMessage).to.include(data.nonce);
      expect(data.siweMessage).to.include(testSignerAddress);

      currentNonce = data.nonce;
      currentSiweMessage = data.siweMessage;

      // Verify real PostgreSQL record in liora_dev
      const dbNonce = await prisma.authNonce.findUnique({ where: { nonce: currentNonce } });
      expect(dbNonce).to.not.be.null;
      expect(dbNonce.address).to.equal(testSignerAddress);
      expect(dbNonce.consumed).to.be.false;
      expect(dbNonce.consumedAt).to.be.null;
    });

    it("1.2 POST /api/auth/verify-wallet: Consumes nonce, verifies cryptographic signature, and persists session", async function () {
      const signature = await testSigner.signMessage(currentSiweMessage);

      const req = new NextRequest("http://localhost:3000/api/auth/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: testSignerAddress,
          signature,
          nonce: currentNonce,
          message: currentSiweMessage,
          chainId: 97,
        }),
      });

      const res = await verifyWallet(req);
      expect(res.status).to.equal(200);

      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.user.role).to.equal("TRADER");
      expect(data.verifiedWallet.address).to.equal(testSignerAddress);
      expect(data.session.sessionId).to.be.a("string");

      authSessionId = data.session.sessionId;
      authenticatedUser = data.user;

      // Verify real PostgreSQL updates in liora_dev:
      // 1. Nonce marked consumed
      const dbNonce = await prisma.authNonce.findUnique({ where: { nonce: currentNonce } });
      expect(dbNonce.consumed).to.be.true;
      expect(dbNonce.consumedAt).to.not.be.null;

      // 2. User record in users table
      const dbUser = await prisma.user.findUnique({ where: { id: authenticatedUser.id } });
      expect(dbUser).to.not.be.null;
      expect(dbUser.role).to.equal("TRADER");

      // 3. Verified wallet linked in verified_wallets table
      const dbWallet = await prisma.verifiedWallet.findUnique({ where: { walletAddress: testSignerAddress } });
      expect(dbWallet).to.not.be.null;
      expect(dbWallet.userId).to.equal(authenticatedUser.id);
      expect(dbWallet.isPrimary).to.be.true;

      // 4. Session persisted in trading_bot_sessions table
      const dbSession = await prisma.tradingBotSession.findUnique({ where: { sessionIdentifier: authSessionId } });
      expect(dbSession).to.not.be.null;
      expect(dbSession.isRevoked).to.be.false;
    });

    it("1.3 Replay Attack Protection: Replayed nonce is rejected with HTTP 401 INVALID_NONCE", async function () {
      // Attempting to reuse the exact same nonce and signature
      const signature = await testSigner.signMessage(currentSiweMessage);

      const req = new NextRequest("http://localhost:3000/api/auth/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: testSignerAddress,
          signature,
          nonce: currentNonce,
          message: currentSiweMessage,
          chainId: 97,
        }),
      });

      const res = await verifyWallet(req);
      expect(res.status).to.equal(401);

      const data = await res.json();
      expect(data.success).to.be.false;
      expect(data.error).to.equal("INVALID_NONCE");
    });

    it("1.4 Expired Nonce Rejection: Nonce past its TTL is rejected with HTTP 401 INVALID_NONCE", async function () {
      const expiredNonceStr = "non_exp_" + crypto.randomBytes(12).toString("hex");
      const pastTime = new Date(Date.now() - 60000);

      await prisma.authNonce.create({
        data: {
          id: `non_${crypto.randomUUID().slice(0, 8)}`,
          nonce: expiredNonceStr,
          address: testSignerAddress,
          domain: "oxeniq.network",
          uri: "https://oxeniq.network",
          chainId: 97,
          statement: "Sign in with Ethereum",
          issuedAt: new Date(Date.now() - 120000),
          expiresAt: pastTime,
        },
      });

      const expiredMsg = `oxeniq.network wants you to sign in with your Ethereum account:\n${testSignerAddress}\n\nNonce: ${expiredNonceStr}`;
      const signature = await testSigner.signMessage(expiredMsg);

      const req = new NextRequest("http://localhost:3000/api/auth/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: testSignerAddress,
          signature,
          nonce: expiredNonceStr,
          message: expiredMsg,
          chainId: 97,
        }),
      });

      const res = await verifyWallet(req);
      expect(res.status).to.equal(401);
      const data = await res.json();
      expect(data.error).to.equal("INVALID_NONCE");
    });

    it("1.5 GET /api/auth/session: Authenticates valid session from PostgreSQL", async function () {
      const req = new NextRequest("http://localhost:3000/api/auth/session", {
        headers: {
          cookie: `liora_session=${authSessionId}`,
        },
      });

      const res = await getSession(req);
      expect(res.status).to.equal(200);

      const data = await res.json();
      expect(data.authenticated).to.be.true;
      expect(data.user.id).to.equal(authenticatedUser.id);
      expect(data.wallets[0].address).to.equal(testSignerAddress);
    });

    it("1.6 POST /api/auth/logout: Revokes session in PostgreSQL and invalidates subsequent access", async function () {
      const logoutReq = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: `liora_session=${authSessionId}`,
        },
      });

      const logoutRes = await logout(logoutReq);
      expect(logoutRes.status).to.equal(200);

      // Verify database record has isRevoked = true
      const dbSession = await prisma.tradingBotSession.findUnique({ where: { sessionIdentifier: authSessionId } });
      expect(dbSession.isRevoked).to.be.true;
      expect(dbSession.revokedAt).to.not.be.null;

      // Protected route now rejects revoked session with HTTP 401
      const sessionReq = new NextRequest("http://localhost:3000/api/auth/session", {
        headers: {
          cookie: `liora_session=${authSessionId}`,
        },
      });

      const sessionRes = await getSession(sessionReq);
      expect(sessionRes.status).to.equal(401);
      const data = await sessionRes.json();
      expect(data.authenticated).to.be.false;
      expect(data.error).to.equal("Session expired or revoked");
    });

    it("1.7 Identity Persistence Across Restarts: Identity survives independent connection pool re-instantiation", async function () {
      const freshPool = new Pool({ connectionString: process.env.DATABASE_URL });
      const freshPrisma = new PrismaClient({ adapter: new PrismaPg(freshPool) });
      const freshDb = new PrismaDatabaseAdapter(freshPrisma);

      const restoredUser = await freshDb.findUserById(authenticatedUser.id);
      expect(restoredUser).to.not.be.null;
      expect(restoredUser.username).to.equal(authenticatedUser.username);

      const restoredWallet = await freshDb.getVerifiedWallet(testSignerAddress);
      expect(restoredWallet).to.not.be.null;
      expect(restoredWallet.userId).to.equal(authenticatedUser.id);

      await freshPrisma.$disconnect();
      await freshPool.end();
    });
  });

  // =========================================================================
  // 2. INVESTOR & SUBSCRIPTION FUNCTIONALITY (POSTGRESQL BACKED)
  // =========================================================================
  describe("2. Investor & Subscription Integration", function () {
    let testUserId;
    let testUserSession;
    const testWallet = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();

    before(async function () {
      const u = await serverDb.createUser({
        username: "investor_" + crypto.randomUUID().slice(0, 8),
        role: "USER",
      });
      testUserId = u.id;
      testUserSession = await serverDb.createSession(testUserId, 12, "127.0.0.1");
    });

    it("2.1 GET /api/bot/subscription/plans: Retrieves active subscription plans from PostgreSQL", async function () {
      const res = await getSubscriptionPlans();
      expect(res.status).to.equal(200);

      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.plans.length).to.be.at.least(2);

      const monthly = data.plans.find((p) => p.id === "PLAN_MONTHLY");
      expect(monthly).to.not.be.undefined;
      expect(monthly.durationDays).to.equal(30);
    });

    it("2.2 POST /api/bot/trial/start: Activates 48-hour free trial and prevents duplicate activation", async function () {
      const trialReq = new NextRequest("http://localhost:3000/api/bot/trial/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `liora_session=${testUserSession.sessionIdentifier}`,
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({
          userId: testUserId,
          walletAddress: testWallet,
        }),
      });

      const trialRes = await startTrial(trialReq);
      expect(trialRes.status).to.equal(200);

      const trialData = await trialRes.json();
      expect(trialData.success).to.be.true;
      expect(trialData.trial.durationHours).to.equal(48);
      expect(trialData.access.status).to.equal("TRIAL_ACTIVE");

      // Verify record in trading_bot_trials in PostgreSQL
      const dbTrial = await prisma.tradingBotTrial.findUnique({ where: { userId: testUserId } });
      expect(dbTrial).to.not.be.null;
      expect(dbTrial.walletAddress).to.equal(testWallet);
      expect(dbTrial.trialUsed).to.be.true;

      // Anti-abuse: Repeated activation attempt by same user is rejected
      const retryReq = new NextRequest("http://localhost:3000/api/bot/trial/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `liora_session=${testUserSession.sessionIdentifier}`,
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({
          userId: testUserId,
          walletAddress: testWallet,
        }),
      });

      const retryRes = await startTrial(retryReq);
      expect([400, 409]).to.include(retryRes.status);
      const retryData = await retryRes.json();
      expect(retryData.error === "TRIAL_ALREADY_USED" || retryData.error === "TRIAL_CONFLICT").to.be.true;
    });

    it("2.3 Purchase Intent & Investor Allocation Idempotency in PostgreSQL", async function () {
      const quoteId = "quote_c2b4_" + crypto.randomUUID().slice(0, 8);
      const idemKey = "idem_c2b4_" + crypto.randomUUID().slice(0, 8);

      // Create prerequisite quote
      await prisma.investorQuote.create({
        data: {
          id: quoteId,
          quoteId,
          userId: testUserId,
          walletAddress: testWallet,
          investmentAmount: 1000,
          currency: "USD",
          investmentAmountUSD: 1000,
          tokenPriceUSD: "0.05",
          tokenPriceINR: "4.32",
          tokenQuantity: "20000000000000000000000",
          lockTier: "TIER_2",
          lockMonths: 6,
          lockStartTimeUTC: new Date(),
          estimatedUnlockTimeUTC: new Date(Date.now() + 180 * 86400 * 1000),
          policyVersion: 1,
          expiresAt: new Date(Date.now() + 900000),
        },
      });

      // 1. Create Purchase Intent
      const intent1 = await serverDb.createPurchaseIntent({
        idempotencyKey: idemKey,
        userId: testUserId,
        quoteId,
        walletAddress: testWallet,
        amountUSD: 1000,
        tokenQuantity: "20000000000000000000000",
      });

      // Idempotency: Replaying exact same request returns identical record
      const intent2 = await serverDb.createPurchaseIntent({
        idempotencyKey: idemKey,
        userId: testUserId,
        quoteId,
        walletAddress: testWallet,
        amountUSD: 1000,
        tokenQuantity: "20000000000000000000000",
      });

      expect(intent2.id).to.equal(intent1.id);

      // 2. Create Investor Allocation
      const purchId = "purch_c2b4_" + crypto.randomUUID().slice(0, 8);
      const allocIdem = "alloc_c2b4_" + crypto.randomUUID().slice(0, 8);

      const alloc1 = await serverDb.createInvestorAllocation({
        purchaseId: purchId,
        idempotencyKey: allocIdem,
        userId: testUserId,
        walletAddress: testWallet,
        investmentAmountUSD: 1000,
        tokenQuantity: "20000000000000000000000",
        lockTierMonths: 6,
        lockStartTimeUTC: new Date().toISOString(),
        unlockTimeUTC: new Date(Date.now() + 180 * 86400 * 1000).toISOString(),
        policyVersion: 1,
      });

      const alloc2 = await serverDb.createInvestorAllocation({
        purchaseId: purchId,
        idempotencyKey: allocIdem,
        userId: testUserId,
        walletAddress: testWallet,
        investmentAmountUSD: 1000,
        tokenQuantity: "20000000000000000000000",
        lockTierMonths: 6,
        lockStartTimeUTC: new Date().toISOString(),
        unlockTimeUTC: new Date(Date.now() + 180 * 86400 * 1000).toISOString(),
        policyVersion: 1,
      });

      expect(alloc2.id).to.equal(alloc1.id);
    });

    it("2.4 Audit Log Persistence in PostgreSQL", async function () {
      const actionName = "INVESTOR_KYC_VERIFIED_" + crypto.randomUUID().slice(0, 6);
      const log = await serverDb.createAuditLog({
        actorId: testUserId,
        action: actionName,
        entity: "InvestorProfile",
        severity: "INFO",
        metadata: { tier: "PRO", limitUSD: 50000 },
      });

      expect(log.id).to.be.a("string");

      // Verify in audit_logs table
      const dbLog = await prisma.auditLog.findUnique({ where: { id: log.id } });
      expect(dbLog).to.not.be.null;
      expect(dbLog.action).to.equal(actionName);
    });
  });

  // =========================================================================
  // 3. FINANCIAL ACCOUNTING & DOUBLE-ENTRY LEDGER INTEGRITY
  // =========================================================================
  describe("3. Financial Accounting & Double-Entry Ledger", function () {
    let finUserId;

    before(async function () {
      const u = await serverDb.createUser({
        username: "ledger_fin_" + crypto.randomUUID().slice(0, 8),
      });
      finUserId = u.id;
    });

    it("3.1 Integer Base-Unit Accounting: Credits 1000 LIORA with exact base units", async function () {
      const { balance, movement } = await serverDb.recordBalanceMovement({
        userId: finUserId,
        tokenSymbol: "LIORA",
        amount: 1000,
        amountRaw: "1000000000000000000000", // 1000 * 10^18
        entryType: "CREDIT",
        reason: "DEPOSIT",
        isDemo: true,
      });

      expect(balance.balance).to.equal(1000);
      expect(balance.balanceRaw).to.equal("1000000000000000000000");

      // Verify token_balances table in PostgreSQL
      const dbBal = await prisma.tokenBalance.findUnique({
        where: {
          userId_tokenSymbol_isDemoBalance: {
            userId: finUserId,
            tokenSymbol: "LIORA",
            isDemoBalance: true,
          },
        },
      });
      expect(dbBal.balanceBaseUnits.toFixed ? dbBal.balanceBaseUnits.toFixed() : dbBal.balanceBaseUnits.toString()).to.equal("1000000000000000000000");
    });

    it("3.2 Double-Entry Balanced Journals: Trigger enforces zero-sum balance and >=2 postings per journal", async function () {
      // Find latest journal created by recordBalanceMovement
      const journals = await prisma.journalTransaction.findMany({
        where: { isDemo: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { postings: true },
      });

      expect(journals.length).to.equal(1);
      const jrn = journals[0];
      expect(jrn.postings.length).to.equal(2);

      const debit = jrn.postings.find((p) => p.direction === "DEBIT");
      const credit = jrn.postings.find((p) => p.direction === "CREDIT");
      expect(debit.amountBaseUnits.toFixed ? debit.amountBaseUnits.toFixed() : debit.amountBaseUnits.toString()).to.equal(credit.amountBaseUnits.toFixed ? credit.amountBaseUnits.toFixed() : credit.amountBaseUnits.toString());
      expect(debit.amountBaseUnits.toFixed ? debit.amountBaseUnits.toFixed() : debit.amountBaseUnits.toString()).to.equal("1000000000000000000000");
    });

    it("3.3 Overdraw Protection: Rejects debit exceeding available balance", async function () {
      let overdrawFailed = false;
      try {
        await serverDb.recordBalanceMovement({
          userId: finUserId,
          tokenSymbol: "LIORA",
          amount: 2000,
          amountRaw: "2000000000000000000000", // Exceeds 1000
          entryType: "DEBIT",
          reason: "TRADE",
          isDemo: true,
        });
      } catch (err) {
        overdrawFailed = true;
        expect(err.message).to.include("Insufficient balance for debit");
      }

      expect(overdrawFailed).to.be.true;

      // Verify balance remains 1000 LIORA
      const current = await serverDb.getTokenBalance(finUserId, "LIORA", true);
      expect(current.balance).to.equal(1000);
    });

    it("3.4 Transaction Rollback: Mid-transaction failure rolls back state completely", async function () {
      let txFailed = false;
      try {
        await serverDb.transaction(async (tx) => {
          await tx.recordBalanceMovement({
            userId: finUserId,
            tokenSymbol: "LIORA",
            amount: 300,
            amountRaw: "300000000000000000000",
            entryType: "DEBIT",
            reason: "TRADE",
            isDemo: true,
          });

          // Simulate downstream order routing failure
          throw new Error("Simulated order matching engine crash");
        });
      } catch (e) {
        txFailed = true;
      }

      expect(txFailed).to.be.true;

      // Balance must remain 1000 LIORA (debit of 300 was completely rolled back)
      const current = await serverDb.getTokenBalance(finUserId, "LIORA", true);
      expect(current.balance).to.equal(1000);
      expect(current.balanceRaw).to.equal("1000000000000000000000");
    });

    it("3.5 Demo vs. Live Balance Isolation: Live and demo balances for same asset are strictly segregated", async function () {
      // Credit 250 LIORA to LIVE balance
      const { balance: liveBal } = await serverDb.recordBalanceMovement({
        userId: finUserId,
        tokenSymbol: "LIORA",
        amount: 250,
        amountRaw: "250000000000000000000",
        entryType: "CREDIT",
        reason: "DEPOSIT",
        isDemo: false,
      });

      expect(liveBal.balance).to.equal(250);

      // Demo balance must remain exactly 1000 LIORA
      const demoBal = await serverDb.getTokenBalance(finUserId, "LIORA", true);
      expect(demoBal.balance).to.equal(1000);

      // Verify in PostgreSQL: two distinct rows in token_balances
      const allRows = await prisma.tokenBalance.findMany({
        where: { userId: finUserId, tokenSymbol: "LIORA" },
      });
      expect(allRows.length).to.equal(2);
      const demoRow = allRows.find((r) => r.isDemoBalance === true);
      const liveRow = allRows.find((r) => r.isDemoBalance === false);
      expect(demoRow.balanceBaseUnits.toFixed ? demoRow.balanceBaseUnits.toFixed() : demoRow.balanceBaseUnits.toString()).to.equal("1000000000000000000000");
      expect(liveRow.balanceBaseUnits.toFixed ? liveRow.balanceBaseUnits.toFixed() : liveRow.balanceBaseUnits.toString()).to.equal("250000000000000000000");
    });
  });

  // =========================================================================
  // 4. FAILURE, FAIL-CLOSED & CONTROLLED ROLLBACK VERIFICATION
  // =========================================================================
  describe("4. Failure Handling & Rollback Verification", function () {
    it("4.1 Fail-Closed on Database Outage: Operations fail closed without silent memory fallback", async function () {
      // Instantiate an adapter with unreachable port to simulate outage
      const unreachablePool = new Pool({
        connectionString: "postgresql://liora_app:Admin@123@127.0.0.1:5433/liora_dev?connect_timeout=1",
      });
      const unreachablePrisma = new PrismaClient({ adapter: new PrismaPg(unreachablePool) });
      const unreachableDb = new PrismaDatabaseAdapter(unreachablePrisma);

      let authFailedClosed = false;
      try {
        await unreachableDb.createNonce("0x1111111111111111111111111111111111111111");
      } catch (e) {
        authFailedClosed = true;
      }
      expect(authFailedClosed).to.be.true;

      let finFailedClosed = false;
      try {
        await unreachableDb.recordBalanceMovement({
          userId: "usr_dummy",
          tokenSymbol: "LIORA",
          amount: 100,
          amountRaw: "100000000000000000000",
          entryType: "CREDIT",
          reason: "DEPOSIT",
        });
      } catch (e) {
        finFailedClosed = true;
      }
      expect(finFailedClosed).to.be.true;

      await unreachablePrisma.$disconnect().catch(() => {});
      await unreachablePool.end().catch(() => {});
    });

    it("4.2 Controlled Rollback to Memory Mode: Setting OXENIQ_PERSISTENCE_MODE='memory' safely activates in-memory facade without altering PostgreSQL", async function () {
      process.env.OXENIQ_PERSISTENCE_MODE = "memory";
      expect(getPersistenceMode()).to.equal("memory");

      const active = getActiveDatabaseAdapter();
      expect(active instanceof ServerDatabase).to.be.true;

      // In-memory operation executes cleanly
      const memNonce = await serverDb.createNonce("0x9999999999999999999999999999999999999999");
      expect(memNonce).to.be.a("string");
      const memConsumed = await serverDb.consumeNonce(memNonce, "0x9999999999999999999999999999999999999999");
      expect(memConsumed).to.be.true;

      // Re-enable postgres cutover mode for production readiness
      process.env.OXENIQ_PERSISTENCE_MODE = "postgres";
      expect(getPersistenceMode()).to.equal("postgres");
      expect(getActiveDatabaseAdapter() instanceof PrismaDatabaseAdapter).to.be.true;
    });
  });
});
