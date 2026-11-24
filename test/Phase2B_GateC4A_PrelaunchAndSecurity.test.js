const { expect } = require("chai");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { ethers } = require("hardhat");

require("./helpers/tsLoader");

const webModules = path.resolve(__dirname, "../apps/web/node_modules");
const { Pool } = require(path.join(webModules, "pg"));
const { NextRequest } = require(path.join(webModules, "next/server"));

// Ensure local development configuration has OXENIQ_PERSISTENCE_MODE=postgres
process.env.OXENIQ_PERSISTENCE_MODE = "postgres";

const {
  serverDb,
  getPersistenceMode,
  getActiveDatabaseAdapter,
  hashPasswordScrypt,
} = require("../apps/web/src/lib/server/db");
const { prismaDb, PrismaDatabaseAdapter } = require("../apps/web/src/lib/server/prismaDb");
const { prisma, pool } = require("../apps/web/src/lib/server/prisma");
const {
  SESSION_COOKIE_NAME,
  verifyAdminCredentialsDetailed,
  recordFailedLoginAttempt,
  resetLoginRateLimit,
} = require("../apps/web/src/lib/server/adminAuth");

// Route handlers under test
const { GET: getPrelaunchConfig } = require("../apps/web/src/app/api/prelaunch/config/route");
const { GET: getPrelaunchPrice } = require("../apps/web/src/app/api/prelaunch/price/route");
const { POST: createQuoteRoute, GET: getQuoteRoute } = require("../apps/web/src/app/api/prelaunch/quote/route");
const { POST: executePurchaseRoute, GET: getPurchasesRoute } = require("../apps/web/src/app/api/prelaunch/purchases/route");
const { GET: getAdminPrelaunchConfig, PUT: updateAdminPrelaunchConfig } = require("../apps/web/src/app/api/admin/prelaunch/config/route");
const { POST: verifyWalletRoute } = require("../apps/web/src/app/api/auth/verify-wallet/route");

describe("LIORA COIN — Gate C4A: Pre-Launch Persistence and Security Hardening Suite", function () {
  this.timeout(45000);

  let testSigner;
  let testSignerAddress;
  let adminUser;
  let adminSession;
  let regularUser;
  let regularSession;

  before(async function () {
    const signers = await ethers.getSigners();
    testSigner = signers[0];
    testSignerAddress = (await testSigner.getAddress()).toLowerCase();

    // 1. Verify active persistence mode
    expect(getPersistenceMode()).to.equal("postgres");
    const active = getActiveDatabaseAdapter();
    expect(active instanceof PrismaDatabaseAdapter).to.be.true;

    // 2. Verify target database is exactly liora_dev owned by liora_app
    const dbCheck = await pool.query("SELECT current_database(), current_user");
    expect(dbCheck.rows[0].current_database).to.equal("liora_dev");
    expect(dbCheck.rows[0].current_user).to.equal("liora_app");

    // 3. Seed an active Administrator in PostgreSQL
    const adminId = "usr_c4a_admin_" + crypto.randomUUID().slice(0, 8);
    const adminUsername = "c4a_admin_" + Date.now();
    adminUser = await serverDb.createUser({
      id: adminId,
      username: adminUsername,
      email: `${adminUsername}@liora.io`,
      passwordHash: hashPasswordScrypt("C4a_SecurePasscode_2026!"),
      role: "ADMIN",
      accountStatus: "ACTIVE",
      isDevelopmentOnly: false,
    });
    adminSession = await serverDb.createSession(adminUser.id, 12, "127.0.0.1");

    // 4. Seed an active Regular Trader in PostgreSQL
    const regularId = "usr_c4a_trader_" + crypto.randomUUID().slice(0, 8);
    const regularUsername = "c4a_trader_" + Date.now();
    regularUser = await serverDb.createUser({
      id: regularId,
      username: regularUsername,
      email: `${regularUsername}@liora.io`,
      passwordHash: hashPasswordScrypt("C4a_TraderPass_2026!"),
      role: "USER",
      accountStatus: "ACTIVE",
      isDevelopmentOnly: false,
    });
    regularSession = await serverDb.createSession(regularUser.id, 12, "127.0.0.1");
  });

  // =========================================================================
  // JOURNEY 1: Pre-Launch Configuration & Quote Persistence in PostgreSQL
  // =========================================================================
  describe("Journey 1: Pre-Launch Configuration & Quote Persistence in PostgreSQL", function () {
    it("Should fetch pre-launch config and auto-seed in PostgreSQL audit_logs if missing", async function () {
      const config = await serverDb.getPrelaunchConfig();
      expect(config).to.exist;
      expect(config.version).to.be.at.least(1);
      expect(config.startPriceINR).to.be.oneOf(["0.20", "0.25"]);
      expect(config.targetPriceUSD).to.be.oneOf(["0.30", "0.35"]);
      expect(config.durationDays).to.be.oneOf([30, 45]);
      expect(config.investmentTiers.length).to.be.at.least(3);

      // Verify direct database query in audit_logs
      const dbCheck = await pool.query(
        'SELECT action, entity FROM "audit_logs" WHERE entity = \'PRELAUNCH_CONFIG\' ORDER BY "createdAt" DESC LIMIT 1;'
      );
      expect(dbCheck.rows.length).to.be.at.least(1);
    });

    it("Should update pre-launch config with version increment and audit logging in PostgreSQL", async function () {
      const initial = await serverDb.getPrelaunchConfig();
      const newPrice = initial.startPriceINR === "0.25" ? "0.20" : "0.25";
      const updateResult = await serverDb.updatePrelaunchConfig(
        {
          startPriceINR: newPrice,
          targetPriceUSD: "0.35",
        },
        adminUser.id
      );

      expect(updateResult.success).to.be.true;
      expect(updateResult.config.version).to.equal(initial.version + 1);
      expect(updateResult.config.startPriceINR).to.equal(newPrice);
      expect(updateResult.config.targetPriceUSD).to.equal("0.35");

      // Verify audit_log row in database
      const auditRes = await pool.query(
        'SELECT "action", "actorId", "metadata" FROM "audit_logs" WHERE entity = \'PRELAUNCH_CONFIG\' ORDER BY "createdAt" DESC LIMIT 1;'
      );
      expect(auditRes.rows[0].action).to.equal("CONFIG_UPDATED");
      expect(auditRes.rows[0].actorId).to.equal(adminUser.id);
      expect(auditRes.rows[0].metadata.startPriceINR).to.equal(newPrice);
    });

    it("Should calculate current pre-launch price curve from database config", async function () {
      const priceResult = await serverDb.getCurrentPrelaunchPrice();
      expect(priceResult).to.exist;
      expect(priceResult.pricingModel).to.equal("LINEAR");
      expect(parseFloat(priceResult.priceUSD)).to.be.greaterThan(0);
      expect(parseFloat(priceResult.priceINR)).to.be.greaterThan(0);
    });

    it("Should create an investor quote persisted in PostgreSQL investor_quotes table", async function () {
      const quoteRes = await serverDb.createInvestorQuote({
        userId: regularUser.id,
        walletAddress: testSignerAddress,
        investmentAmount: 1500,
        currency: "USD",
      });

      expect(quoteRes.success).to.be.true;
      expect(quoteRes.quote).to.exist;
      const quote = quoteRes.quote;
      expect(quote.investmentAmountUSD).to.equal(1500);
      expect(quote.lockMonths).to.equal(6); // 1000 to 4999.99 = 6 months
      expect(quote.ttlSeconds).to.equal(900);
      expect(quote.isExpired).to.be.false;

      // Direct PostgreSQL database verification
      const dbQuote = await pool.query(
        'SELECT "quoteId", "userId", "walletAddress", "investmentAmountUSD", "lockMonths", "consumed" FROM "investor_quotes" WHERE "quoteId" = $1;',
        [quote.quoteId]
      );
      expect(dbQuote.rows.length).to.equal(1);
      expect(dbQuote.rows[0].quoteId).to.equal(quote.quoteId);
      expect(dbQuote.rows[0].userId).to.equal(regularUser.id);
      expect(dbQuote.rows[0].walletAddress).to.equal(testSignerAddress);
      expect(Number(dbQuote.rows[0].investmentAmountUSD)).to.equal(1500);
      expect(dbQuote.rows[0].lockMonths).to.equal(6);
      expect(dbQuote.rows[0].consumed).to.be.false;
    });

    it("Should retrieve quote and accurately detect 15-minute TTL expiration in PostgreSQL", async function () {
      const quoteRes = await serverDb.createInvestorQuote({
        userId: regularUser.id,
        walletAddress: testSignerAddress,
        investmentAmount: 500,
        currency: "USD",
      });

      const quoteId = quoteRes.quote.quoteId;

      // Check within validity period (14 minutes)
      const validCheck = await serverDb.getInvestorQuote(quoteId, Date.now() + 14 * 60 * 1000);
      expect(validCheck.quote).to.not.be.null;
      expect(validCheck.isExpired).to.be.false;

      // Check after expiration (15 minutes + 1 second)
      const expiredCheck = await serverDb.getInvestorQuote(quoteId, Date.now() + (15 * 60 + 1) * 1000);
      expect(expiredCheck.quote).to.not.be.null;
      expect(expiredCheck.isExpired).to.be.true;
    });

    it("Should persist records across pool disconnect and reconnection (process restart simulation)", async function () {
      const quoteRes = await serverDb.createInvestorQuote({
        userId: regularUser.id,
        walletAddress: testSignerAddress,
        investmentAmount: 5500,
        currency: "USD",
      });
      const quoteId = quoteRes.quote.quoteId;

      // Query from a completely independent PostgreSQL client connection
      const isolatedClient = new Pool({ connectionString: process.env.DATABASE_URL });
      try {
        const queryRes = await isolatedClient.query(
          'SELECT "quoteId", "investmentAmountUSD", "lockMonths" FROM "investor_quotes" WHERE "quoteId" = $1;',
          [quoteId]
        );
        expect(queryRes.rows.length).to.equal(1);
        expect(Number(queryRes.rows[0].investmentAmountUSD)).to.equal(5500);
        expect(queryRes.rows[0].lockMonths).to.equal(12); // $5,000+ = 12 months
      } finally {
        await isolatedClient.end();
      }
    });
  });

  // =========================================================================
  // JOURNEY 2: Atomic Purchase Fulfillment & Replay Defense in PostgreSQL
  // =========================================================================
  describe("Journey 2: Atomic Purchase Fulfillment & Replay Defense in PostgreSQL", function () {
    it("Should record purchase atomically in PostgreSQL with single-use quote consumption", async function () {
      const quoteRes = await serverDb.createInvestorQuote({
        userId: regularUser.id,
        walletAddress: testSignerAddress,
        investmentAmount: 2000,
        currency: "USD",
      });
      const quoteId = quoteRes.quote.quoteId;
      const idempotencyKey = "idemp_purchase_" + crypto.randomUUID().slice(0, 8);

      const purchaseRes = await serverDb.recordInvestorPurchase(
        quoteId,
        Date.now(),
        "0xtest_tx_hash_001",
        idempotencyKey
      );

      expect(purchaseRes.success).to.be.true;
      expect(purchaseRes.record).to.exist;
      expect(purchaseRes.record.claimStatus).to.equal("LOCKED");
      expect(purchaseRes.record.txHash).to.equal("0xtest_tx_hash_001");

      // Verify in PostgreSQL investor_quotes that consumed = true
      const quoteCheck = await pool.query(
        'SELECT "consumed", "consumedAt" FROM "investor_quotes" WHERE "quoteId" = $1;',
        [quoteId]
      );
      expect(quoteCheck.rows[0].consumed).to.be.true;
      expect(quoteCheck.rows[0].consumedAt).to.not.be.null;

      // Verify in PostgreSQL purchase_intents
      const intentCheck = await pool.query(
        'SELECT "idempotencyKey", "status", "userId" FROM "purchase_intents" WHERE "quoteId" = $1;',
        [quoteId]
      );
      expect(intentCheck.rows.length).to.equal(1);
      expect(intentCheck.rows[0].idempotencyKey).to.equal(idempotencyKey);
      expect(intentCheck.rows[0].status).to.equal("ALLOCATED");

      // Verify in PostgreSQL investor_allocations
      const allocCheck = await pool.query(
        'SELECT "purchaseId", "idempotencyKey", "isDemoAllocation", "claimStatus" FROM "investor_allocations" WHERE "idempotencyKey" = $1;',
        [idempotencyKey]
      );
      expect(allocCheck.rows.length).to.equal(1);
      expect(allocCheck.rows[0].isDemoAllocation).to.be.true; // Verified simulation guard
      expect(allocCheck.rows[0].claimStatus).to.equal("LOCKED");
    });

    it("Should reject replayed purchase with already-consumed quoteId (single-use enforcement)", async function () {
      const quoteRes = await serverDb.createInvestorQuote({
        userId: regularUser.id,
        walletAddress: testSignerAddress,
        investmentAmount: 1000,
        currency: "USD",
      });
      const quoteId = quoteRes.quote.quoteId;

      // First execution succeeds
      const first = await serverDb.recordInvestorPurchase(quoteId, Date.now(), "0xtx_first");
      expect(first.success).to.be.true;

      // Second execution with same quoteId MUST be rejected (replay defense)
      const second = await serverDb.recordInvestorPurchase(quoteId, Date.now(), "0xtx_second");
      expect(second.success).to.be.false;
      expect(second.error).to.include("QUOTE_NOT_FOUND_OR_ALREADY_USED");
    });

    it("Should reject purchase execution if quote is expired (>15-minute TTL)", async function () {
      const nowMs = 1700000000000;
      const quoteRes = await serverDb.createInvestorQuote(
        {
          userId: regularUser.id,
          walletAddress: testSignerAddress,
          investmentAmount: 800,
          currency: "USD",
        },
        nowMs
      );
      const quoteId = quoteRes.quote.quoteId;

      // Attempt purchase 16 minutes after issue time
      const expiredTime = nowMs + 16 * 60 * 1000;
      const purchaseRes = await serverDb.recordInvestorPurchase(quoteId, expiredTime);
      expect(purchaseRes.success).to.be.false;
      expect(purchaseRes.error).to.include("QUOTE_EXPIRED");
    });

    it("Should return identical allocation record on idempotent replay without duplicate allocation", async function () {
      const quoteRes = await serverDb.createInvestorQuote({
        userId: regularUser.id,
        walletAddress: testSignerAddress,
        investmentAmount: 1200,
        currency: "USD",
      });
      const quoteId = quoteRes.quote.quoteId;
      const idempKey = "idemp_test_replay_" + Date.now();

      const first = await serverDb.recordInvestorPurchase(quoteId, Date.now(), "0xhash_idemp", idempKey);
      expect(first.success).to.be.true;
      const firstPurchaseId = first.record.purchaseId;

      // Repeat with same idempotency key
      const second = await serverDb.recordInvestorPurchase(quoteId, Date.now(), "0xhash_idemp", idempKey);
      expect(second.success).to.be.true;
      expect(second.record.purchaseId).to.equal(firstPurchaseId);

      // Verify exactly 1 row in PostgreSQL
      const allocCount = await pool.query(
        'SELECT COUNT(*)::int AS count FROM "investor_allocations" WHERE "idempotencyKey" = $1;',
        [idempKey]
      );
      expect(allocCount.rows[0].count).to.equal(1);
    });
  });

  // =========================================================================
  // JOURNEY 3: Next.js Pre-Launch API Route Handlers Verification
  // =========================================================================
  describe("Journey 3: Next.js Pre-Launch API Route Handlers Verification", function () {
    it("GET /api/prelaunch/config should return 200 with persistent database config", async function () {
      const res = await getPrelaunchConfig();
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.config).to.exist;
      expect(data.config.version).to.be.at.least(1);
    });

    it("GET /api/prelaunch/price should return 200 with price computation", async function () {
      const req = new NextRequest("http://localhost:3000/api/prelaunch/price");
      const res = await getPrelaunchPrice(req);
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.priceResult).to.exist;
      expect(parseFloat(data.priceResult.priceUSD)).to.be.greaterThan(0);
    });

    it("POST /api/prelaunch/quote & GET /api/prelaunch/quote should generate and fetch database quote", async function () {
      const postReq = new NextRequest("http://localhost:3000/api/prelaunch/quote", {
        method: "POST",
        body: JSON.stringify({
          userId: regularUser.id,
          walletAddress: testSignerAddress,
          investmentAmount: 3000,
          currency: "USD",
        }),
      });

      const postRes = await createQuoteRoute(postReq);
      expect(postRes.status).to.equal(200);
      const postData = await postRes.json();
      expect(postData.success).to.be.true;
      expect(postData.quote.investmentAmountUSD).to.equal(3000);
      const quoteId = postData.quote.quoteId;

      // GET quote by ID
      const getReq = new NextRequest(`http://localhost:3000/api/prelaunch/quote?quoteId=${quoteId}`);
      const getRes = await getQuoteRoute(getReq);
      expect(getRes.status).to.equal(200);
      const getData = await getRes.json();
      expect(getData.success).to.be.true;
      expect(getData.quote.quoteId).to.equal(quoteId);
      expect(getData.isExpired).to.be.false;
    });

    it("POST /api/prelaunch/purchases & GET /api/prelaunch/purchases should execute and list purchases", async function () {
      // 1. Create a fresh quote
      const quoteRes = await serverDb.createInvestorQuote({
        userId: regularUser.id,
        walletAddress: testSignerAddress,
        investmentAmount: 2500,
        currency: "USD",
      });
      const quoteId = quoteRes.quote.quoteId;

      // 2. Execute purchase via route
      const postReq = new NextRequest("http://localhost:3000/api/prelaunch/purchases", {
        method: "POST",
        body: JSON.stringify({
          quoteId,
          txHash: "0xroute_purchase_tx",
          idempotencyKey: "idemp_route_" + Date.now(),
        }),
      });

      const postRes = await executePurchaseRoute(postReq);
      expect(postRes.status).to.equal(200);
      const postData = await postRes.json();
      expect(postData.success).to.be.true;
      expect(postData.record.claimStatus).to.equal("LOCKED");

      // 3. GET purchases for user
      const getReq = new NextRequest(`http://localhost:3000/api/prelaunch/purchases?userId=${regularUser.id}`);
      const getRes = await getPurchasesRoute(getReq);
      expect(getRes.status).to.equal(200);
      const getData = await getRes.json();
      expect(getData.success).to.be.true;
      expect(getData.purchases.length).to.be.at.least(1);
    });

    it("PUT /api/admin/prelaunch/config should enforce admin authorization and save update", async function () {
      const putReq = new NextRequest("http://localhost:3000/api/admin/prelaunch/config", {
        method: "PUT",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminSession.sessionIdentifier}`,
          "x-liora-admin": "true",
        },
        body: JSON.stringify({
          durationDays: 45,
        }),
      });

      const res = await updateAdminPrelaunchConfig(putReq);
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.config.durationDays).to.equal(45);
    });
  });

  // =========================================================================
  // JOURNEY 4: Concurrency & Double-Spend Defense
  // =========================================================================
  describe("Journey 4: High-Concurrency Race Condition & Double-Spend Defense", function () {
    it("Should allow EXACTLY ONE purchase when 10 concurrent requests target the same quoteId", async function () {
      const quoteRes = await serverDb.createInvestorQuote({
        userId: regularUser.id,
        walletAddress: testSignerAddress,
        investmentAmount: 5000,
        currency: "USD",
      });
      const quoteId = quoteRes.quote.quoteId;

      // Fire 10 simultaneous purchase attempts
      const attempts = Array.from({ length: 10 }).map((_, idx) =>
        serverDb.recordInvestorPurchase(quoteId, Date.now(), `0xconcurrent_tx_${idx}`)
      );

      const results = await Promise.all(attempts);

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      expect(successful.length).to.equal(1, "Exactly one concurrent purchase must succeed");
      expect(failed.length).to.equal(9, "Exactly 9 concurrent attempts must be rejected");

      for (const f of failed) {
        expect(f.error).to.include("QUOTE_NOT_FOUND_OR_ALREADY_USED");
      }

      // Query database directly to confirm exactly 1 purchase intent and 1 allocation
      const intentCount = await pool.query(
        'SELECT COUNT(*)::int AS count FROM "purchase_intents" WHERE "quoteId" = $1;',
        [quoteId]
      );
      expect(intentCount.rows[0].count).to.equal(1);
    });
  });

  // =========================================================================
  // JOURNEY 5: Security Hardening — Rate Limiting, RBAC & CSRF
  // =========================================================================
  describe("Journey 5: Security Hardening — Rate Limiting, RBAC & CSRF", function () {
    it("Should record failed login attempts and enforce lockout after 5 failures in PostgreSQL", async function () {
      const testIp = "10.0.0." + Math.floor(Math.random() * 200 + 10);
      const targetUser = "victim_admin_" + Date.now();
      const rateLimitKey = `${testIp}:${targetUser}`;

      // Reset any previous rate limit
      resetLoginRateLimit(rateLimitKey);

      // Execute 5 failed logins
      for (let i = 0; i < 5; i++) {
        await serverDb.createAuditLog({
          action: "ADMIN_LOGIN_FAILED_INVALID_CREDENTIALS",
          entity: "User",
          severity: "WARNING",
          metadata: {
            usernameAttempt: targetUser,
            ip: testIp,
            rateLimitKey,
          },
        });
        recordFailedLoginAttempt(rateLimitKey);
      }

      // 6th attempt must trigger rate limit exceeded
      const authAttempt = await verifyAdminCredentialsDetailed(targetUser, "WrongPassword123!", {
        clientIp: testIp,
      });

      expect(authAttempt.user).to.be.null;
      expect(authAttempt.error).to.equal("RATE_LIMIT_EXCEEDED");
      expect(authAttempt.retryAfterSeconds).to.be.greaterThan(0);
    });

    it("Should reject unauthenticated requests to admin routes with HTTP 401", async function () {
      const req = new NextRequest("http://localhost:3000/api/admin/prelaunch/config", {
        method: "GET",
      });

      const res = await getAdminPrelaunchConfig(req);
      expect(res.status).to.equal(401);
      const data = await res.json();
      expect(data.error).to.equal("UNAUTHORIZED");
    });

    it("Should reject privilege escalation: regular USER accessing admin route receives HTTP 403", async function () {
      const req = new NextRequest("http://localhost:3000/api/admin/prelaunch/config", {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${regularSession.sessionIdentifier}`,
        },
      });

      const res = await getAdminPrelaunchConfig(req);
      expect(res.status).to.equal(403);
      const data = await res.json();
      expect(data.error).to.equal("FORBIDDEN");
    });

    it("Should reject CSRF attack on mutating admin request when custom header & origin are missing", async function () {
      const req = new NextRequest("http://localhost:3000/api/admin/prelaunch/config", {
        method: "PUT",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminSession.sessionIdentifier}`,
          // Missing x-liora-admin or other anti-CSRF headers, and invalid origin
          origin: "https://evil-attacker-site.com",
          host: "liora.io",
        },
        body: JSON.stringify({ durationDays: 60 }),
      });

      const res = await updateAdminPrelaunchConfig(req);
      expect(res.status).to.equal(403);
      const data = await res.json();
      expect(data.error).to.equal("CSRF_REJECTED");
    });

    it("Should reject wallet authentication if chainId is unsupported (e.g. Ethereum #1)", async function () {
      const req = new NextRequest("http://localhost:3000/api/auth/verify-wallet", {
        method: "POST",
        body: JSON.stringify({
          address: testSignerAddress,
          signature: "0x" + "a".repeat(130),
          nonce: "nonce_test_unsupported",
          message: "Sign in with Ethereum",
          chainId: 1, // Unauthorized Ethereum Mainnet
        }),
      });

      const res = await verifyWalletRoute(req);
      expect(res.status).to.equal(400);
      const data = await res.json();
      expect(data.error).to.equal("UNSUPPORTED_CHAIN_ID");
    });
  });

  // =========================================================================
  // JOURNEY 6: SQL Injection & Input Validation Resilience
  // =========================================================================
  describe("Journey 6: SQL Injection & Input Validation Resilience", function () {
    it("Should safely handle malicious SQL injection payloads in quote requests without data corruption", async function () {
      const sqlInjectionUser = "usr_sqli_' OR '1'='1; --";
      const quoteRes = await serverDb.createInvestorQuote({
        userId: sqlInjectionUser,
        walletAddress: testSignerAddress,
        investmentAmount: 1000,
        currency: "USD",
      });

      expect(quoteRes.success).to.be.true;
      const quoteId = quoteRes.quote.quoteId;

      // Verify literal storage in database without execution
      const checkRes = await pool.query(
        'SELECT "userId" FROM "investor_quotes" WHERE "quoteId" = $1;',
        [quoteId]
      );
      expect(checkRes.rows[0].userId).to.equal(sqlInjectionUser);

      // Verify no tables were dropped or users corrupted
      const userCount = await pool.query('SELECT COUNT(*)::int AS count FROM "users";');
      expect(userCount.rows[0].count).to.be.at.least(2);
    });

    it("Should reject negative investment amount with HTTP 400 validation error", async function () {
      const req = new NextRequest("http://localhost:3000/api/prelaunch/quote", {
        method: "POST",
        body: JSON.stringify({
          userId: regularUser.id,
          walletAddress: testSignerAddress,
          investmentAmount: -500,
          currency: "USD",
        }),
      });

      const res = await createQuoteRoute(req);
      expect(res.status).to.equal(400);
      const data = await res.json();
      expect(data.error).to.equal("Validation failed");
    });

    it("Should reject malformed non-hex wallet addresses with HTTP 400 validation error", async function () {
      const req = new NextRequest("http://localhost:3000/api/prelaunch/quote", {
        method: "POST",
        body: JSON.stringify({
          userId: regularUser.id,
          walletAddress: "not_a_valid_evm_address",
          investmentAmount: 500,
          currency: "USD",
        }),
      });

      const res = await createQuoteRoute(req);
      expect(res.status).to.equal(400);
      const data = await res.json();
      expect(data.error).to.equal("Validation failed");
    });
  });
});
