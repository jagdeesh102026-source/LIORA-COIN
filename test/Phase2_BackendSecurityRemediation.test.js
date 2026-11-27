const { expect } = require("chai");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

require("./helpers/tsLoader");

const webModules = path.resolve(__dirname, "../apps/web/node_modules");
const { NextRequest } = require(path.join(webModules, "next/server"));

process.env.OXENIQ_PERSISTENCE_MODE = "postgres";

const {
  serverDb,
  getPersistenceMode,
  getActiveDatabaseAdapter,
  hashPasswordScrypt,
} = require("../apps/web/src/lib/server/db");
const { prisma } = require("../apps/web/src/lib/server/prisma");
const {
  SESSION_COOKIE_NAME,
  hashPassword,
  verifyPassword,
  validateCsrfProtection,
  requireAdmin,
  verifyAdminCredentialsDetailed,
  getSessionCookieOptions,
  resetLoginRateLimit,
} = require("../apps/web/src/lib/server/adminAuth");
const {
  verifyAndRecordPayment,
  OFFICIAL_TREASURY_ADDRESS,
  TOKEN_CONTRACTS,
  ACCEPTED_CHAINS,
} = require("../apps/web/src/lib/server/paymentVerification");
const {
  BSC_MAINNET_OPERATING_TREASURY_ADDRESS,
  BSC_TESTNET_LIORA_TOKEN_ADDRESS,
} = require("../apps/web/src/config/tokenConfig");
const {
  BSC_MAINNET_RPC_URLS,
  bscMainnetPublicClient,
} = require("../apps/web/src/lib/contracts/client");
const {
  SettlementPersistentStore,
} = require("../apps/web/src/lib/server/settlement/settlementPersistentStore");
const { AUTHORIZED_TREASURY_WALLET } = require("../apps/web/src/lib/treasury/treasuryAccountingEngine");
const { demoStore, SEED_USERS } = require("../apps/web/src/lib/demo/demoStore");

const { POST: loginRoute } = require("../apps/web/src/app/api/auth/login/route");
const { GET: sessionRoute } = require("../apps/web/src/app/api/auth/session/route");
const { POST: verifyWalletRoute } = require("../apps/web/src/app/api/auth/verify-wallet/route");
const { GET: walletNonceRoute } = require("../apps/web/src/app/api/auth/wallet-nonce/route");
const { POST: subscribeRoute } = require("../apps/web/src/app/api/bot/subscription/subscribe/route");
const { GET: statusRoute } = require("../apps/web/src/app/api/bot/subscription/status/route");
const { GET: signalsRoute } = require("../apps/web/src/app/api/bot/signals/route");
const { POST: custodyVerifyPaymentRoute } = require("../apps/web/src/app/api/custody/verify-payment/route");
const { POST: custodyPaymentIntentRoute } = require("../apps/web/src/app/api/custody/payment-intent/route");
const { POST: settlementPayoutRoute } = require("../apps/web/src/app/api/settlement/payout/route");
const { POST: settlementCollateralRoute } = require("../apps/web/src/app/api/settlement/collateral/route");
const { ethers } = require("hardhat");

describe("LIORA COIN — Phase 2 Backend, Database & Auth Security Remediation Suite", function () {
  this.timeout(40000);

  let origNodeEnv;
  let origPersistenceMode;
  let origDatabaseUrl;
  let origOxeniqEnv;

  let activeUser;
  let otherUser;
  let suspendedUser;
  let devOnlyUser;
  let adminUser;
  let activeSession;
  let otherSession;
  let adminSession;

  const userSecretFixture = "P2_" + crypto.randomBytes(12).toString("hex") + "!9";

  before(async function () {
    const suffix = crypto.randomUUID().slice(0, 8);
    activeUser = await serverDb.createUser({
      username: `p2_active_${suffix}`,
      email: `p2_active_${suffix}@example.com`,
      passwordHash: hashPasswordScrypt(userSecretFixture),
      role: "USER",
      accountStatus: "ACTIVE",
      isDevelopmentOnly: false,
    });
    otherUser = await serverDb.createUser({
      username: `p2_other_${suffix}`,
      email: `p2_other_${suffix}@example.com`,
      passwordHash: hashPasswordScrypt(userSecretFixture),
      role: "USER",
      accountStatus: "ACTIVE",
      isDevelopmentOnly: false,
    });
    suspendedUser = await serverDb.createUser({
      username: `p2_suspended_${suffix}`,
      email: `p2_suspended_${suffix}@example.com`,
      passwordHash: hashPasswordScrypt(userSecretFixture),
      role: "USER",
      accountStatus: "SUSPENDED",
      isDevelopmentOnly: false,
    });
    devOnlyUser = await serverDb.createUser({
      username: `p2_devonly_${suffix}`,
      email: `p2_devonly_${suffix}@example.com`,
      passwordHash: hashPasswordScrypt(userSecretFixture),
      role: "ADMIN",
      accountStatus: "ACTIVE",
      isDevelopmentOnly: true,
    });
    adminUser = await serverDb.createUser({
      username: `p2_admin_${suffix}`,
      email: `p2_admin_${suffix}@example.com`,
      passwordHash: hashPasswordScrypt(userSecretFixture),
      role: "ADMIN",
      accountStatus: "ACTIVE",
      isDevelopmentOnly: false,
    });

    activeSession = await serverDb.createSession(activeUser.id, 12, "127.0.0.1");
    otherSession = await serverDb.createSession(otherUser.id, 12, "127.0.0.1");
    adminSession = await serverDb.createSession(adminUser.id, 12, "127.0.0.1");
  });

  beforeEach(function () {
    origNodeEnv = process.env.NODE_ENV;
    origPersistenceMode = process.env.OXENIQ_PERSISTENCE_MODE;
    origDatabaseUrl = process.env.DATABASE_URL;
    origOxeniqEnv = process.env.OXENIQ_ENV;
    resetLoginRateLimit(`127.0.0.1:${activeUser.username.toLowerCase()}`);
    resetLoginRateLimit(`127.0.0.1:${devOnlyUser.username.toLowerCase()}`);
  });

  afterEach(function () {
    process.env.NODE_ENV = origNodeEnv;
    if (origPersistenceMode === undefined) delete process.env.OXENIQ_PERSISTENCE_MODE;
    else process.env.OXENIQ_PERSISTENCE_MODE = origPersistenceMode;
    if (origDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = origDatabaseUrl;
    if (origOxeniqEnv === undefined) delete process.env.OXENIQ_ENV;
    else process.env.OXENIQ_ENV = origOxeniqEnv;
  });

  describe("1. Production PostgreSQL Enforcement & Fail-Closed DB Config", function () {
    it("should fail closed in production when OXENIQ_PERSISTENCE_MODE is unset or set to memory", function () {
      process.env.NODE_ENV = "production";
      delete process.env.OXENIQ_PERSISTENCE_MODE;
      expect(() => getPersistenceMode()).to.throw("PRODUCTION_PERSISTENCE_ERROR");

      process.env.OXENIQ_PERSISTENCE_MODE = "memory";
      expect(() => getPersistenceMode()).to.throw("PRODUCTION_PERSISTENCE_ERROR");
      expect(() => getActiveDatabaseAdapter()).to.throw("PRODUCTION_PERSISTENCE_ERROR");
    });

    it("should fail closed when DATABASE_URL is missing or invalid in postgres/production mode", function () {
      process.env.NODE_ENV = "production";
      process.env.OXENIQ_PERSISTENCE_MODE = "postgres";

      delete process.env.DATABASE_URL;
      expect(() => getPersistenceMode()).to.throw("DATABASE_CONFIGURATION_ERROR");

      process.env.DATABASE_URL = "mysql://invalid-not-postgres";
      expect(() => getActiveDatabaseAdapter()).to.throw("DATABASE_CONFIGURATION_ERROR");
    });

    it("should enforce postgres mode cleanly in production when properly configured", function () {
      process.env.NODE_ENV = "production";
      process.env.OXENIQ_PERSISTENCE_MODE = "postgres";
      expect(getPersistenceMode()).to.equal("postgres");
    });
  });

  describe("2. Hardened Login, Account Status, Dev Barrier & Secure Cookies", function () {
    it("should reject suspended/inactive accounts at login with HTTP 403 and create no session", async function () {
      const sessionsBefore = await prisma.tradingBotSession.count({ where: { userId: suspendedUser.id } });
      const res = await loginRoute(
        new NextRequest("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "x-requested-with": "XMLHttpRequest" },
          body: JSON.stringify({ username: suspendedUser.username, password: userSecretFixture }),
        })
      );
      expect(res.status).to.equal(403);
      const data = await res.json();
      expect(data.error).to.equal("ACCOUNT_INACTIVE");
      const sessionsAfter = await prisma.tradingBotSession.count({ where: { userId: suspendedUser.id } });
      expect(sessionsAfter).to.equal(sessionsBefore);
    });

    it("should reject development-only accounts at login and /api/auth/session in production", async function () {
      process.env.NODE_ENV = "production";
      process.env.OXENIQ_PERSISTENCE_MODE = "postgres";

      const loginRes = await loginRoute(
        new NextRequest("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "x-requested-with": "XMLHttpRequest" },
          body: JSON.stringify({ username: devOnlyUser.username, password: userSecretFixture }),
        })
      );
      expect(loginRes.status).to.equal(403);
      expect((await loginRes.json()).error).to.equal("DEVELOPMENT_ACCOUNT_PROHIBITED");

      const devSession = await serverDb.createSession(devOnlyUser.id, 1, "127.0.0.1");
      const sessionRes = await sessionRoute(
        new NextRequest("http://localhost:3000/api/auth/session", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${devSession.sessionIdentifier}` },
        })
      );
      expect(sessionRes.status).to.equal(403);
    });

    it("should issue HttpOnly, SameSite=Lax, and production Secure cookie flags", async function () {
      process.env.NODE_ENV = "production";
      const prodOpts = getSessionCookieOptions(3600);
      expect(prodOpts.httpOnly).to.equal(true);
      expect(prodOpts.secure).to.equal(true);
      expect(prodOpts.sameSite).to.equal("lax");
      expect(prodOpts.maxAge).to.equal(3600);
      expect(prodOpts.path).to.equal("/");

      process.env.NODE_ENV = "development";
      const res = await loginRoute(
        new NextRequest("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "x-requested-with": "XMLHttpRequest" },
          body: JSON.stringify({ username: activeUser.username, password: userSecretFixture }),
        })
      );
      expect(res.status).to.equal(200);
      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).to.include("HttpOnly");
      expect(setCookie).to.include("SameSite=lax");
    });

    it("should enforce non-active account barrier on SIWE wallet verification", async function () {
      const [signer] = await ethers.getSigners();
      const addr = (await signer.getAddress()).toLowerCase();
      // Ensure wallet belongs to suspendedUser via session link attempt
      const suspSession = await serverDb.createSession(suspendedUser.id, 1, "127.0.0.1");
      const nonce = await serverDb.createNonce(addr, 300000);
      const msg = `localhost:3000 wants you to sign in with your Ethereum account:\n${addr}\nNonce: ${nonce}`;
      const sig = await signer.signMessage(msg);

      const res = await verifyWalletRoute(
        new NextRequest("http://localhost:3000/api/auth/verify-wallet", {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${suspSession.sessionIdentifier}`,
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({ address: addr, signature: sig, nonce, message: msg, chainId: 97 }),
        })
      );
      expect(res.status).to.equal(403);
      expect((await res.json()).error).to.equal("ACCOUNT_INACTIVE");
    });

    it("should disable demo authentication in production and contain zero seeded passwords in demoStore", function () {
      for (const seed of SEED_USERS) {
        expect(seed.password).to.be.undefined;
      }
      process.env.NODE_ENV = "production";
      const res = demoStore.login("trader_alex", "anything");
      expect(res.success).to.equal(false);
      expect(res.error).to.include("disabled in production");
    });
  });

  describe("3. Hardened Admin Auth, Plaintext Hash Rejection & CSRF Protection", function () {
    it("should strictly reject plaintext or malformed hashes in verifyPassword()", function () {
      const pass = "MyAdminSecret!2026";
      const validHash = hashPassword(pass);
      expect(verifyPassword(pass, validHash)).to.equal(true);
      expect(verifyPassword(pass, pass)).to.equal(false);
      expect(verifyPassword(pass, "scrypt:bad:hash")).to.equal(false);
    });

    it("should reject cross-origin POST requests even when custom CSRF headers are forged", function () {
      const req = new NextRequest("https://lioracoin.com/api/admin/prelaunch/config", {
        method: "POST",
        headers: {
          origin: "https://evil-site.example",
          host: "lioracoin.com",
          "x-requested-with": "XMLHttpRequest",
          "x-liora-admin": "1",
        },
      });
      const check = validateCsrfProtection(req);
      expect(check.valid).to.equal(false);
      expect(check.reason).to.include("Cross-origin");
    });

    it("should reject forged x-admin-role headers in requireAdmin() with HTTP 403", async function () {
      const req = new NextRequest("http://localhost:3000/api/admin/prelaunch/config", {
        method: "GET",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminSession.sessionIdentifier}`,
          "x-admin-role": "ADMIN",
        },
      });
      const check = await requireAdmin(req);
      expect(check.authorized).to.equal(false);
      expect(check.response.status).to.equal(403);
      expect((await check.response.json()).error).to.equal("FORBIDDEN_HEADER_TAMPERING");
    });

    it("should block development-only admin credentials in verifyAdminCredentialsDetailed() during production", async function () {
      process.env.NODE_ENV = "production";
      const res = await verifyAdminCredentialsDetailed(devOnlyUser.username, userSecretFixture, { clientIp: "127.0.0.1" });
      expect(res.user).to.be.null;
      expect(res.error).to.equal("DEVELOPMENT_ACCOUNT_PROHIBITED");
    });
  });

  describe("4. Payment Verification Canonical Addresses, Sensitive APIs & Dashboard Guards", function () {
    it("should use canonical operating treasury & UUPS testnet addresses and disable production execution", async function () {
      expect(OFFICIAL_TREASURY_ADDRESS).to.equal(BSC_MAINNET_OPERATING_TREASURY_ADDRESS.toLowerCase());
      expect(OFFICIAL_TREASURY_ADDRESS).to.not.equal("0x1111111111111111111111111111111111111111");
      expect(TOKEN_CONTRACTS.LIORA_TESTNET).to.equal(BSC_TESTNET_LIORA_TOKEN_ADDRESS.toLowerCase());

      process.env.NODE_ENV = "production";
      const res = await verifyAndRecordPayment({
        txHash: "0x" + "a".repeat(64),
        chainId: ACCEPTED_CHAINS.BSC_TESTNET,
        tokenSymbol: "USDT",
        tokenAddress: TOKEN_CONTRACTS.USDT_TESTNET,
        payingWallet: "0x" + "b".repeat(40),
        treasuryAddress: OFFICIAL_TREASURY_ADDRESS,
        expectedAmount: 49,
        subscriptionPlanId: "PLAN_MONTHLY",
        userId: activeUser.id,
        isMockTest: true,
      });
      expect(res.isValid).to.equal(false);
      expect(res.error).to.include("PAYMENT_EXECUTION_DISABLED");
    });

    it("should enforce authentication and anti-spoofing on bot subscription status, subscribe, and signals APIs", async function () {
      const unauthStatus = await statusRoute(new NextRequest("http://localhost:3000/api/bot/subscription/status"));
      expect(unauthStatus.status).to.equal(401);

      const spoofStatus = await statusRoute(
        new NextRequest(`http://localhost:3000/api/bot/subscription/status?userId=${otherUser.id}`, {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${activeSession.sessionIdentifier}` },
        })
      );
      expect(spoofStatus.status).to.equal(403);

      const unauthSub = await subscribeRoute(
        new NextRequest("http://localhost:3000/api/bot/subscription/subscribe", {
          method: "POST",
          headers: { "x-requested-with": "XMLHttpRequest" },
          body: JSON.stringify({
            planId: "PLAN_MONTHLY",
            paymentToken: "USDT",
            payingWallet: "0x" + "c".repeat(40),
            txHash: "0x" + "d".repeat(64),
          }),
        })
      );
      expect(unauthSub.status).to.equal(401);

      const unauthSignals = await signalsRoute(new NextRequest("http://localhost:3000/api/bot/signals"));
      expect([401, 403]).to.include(unauthSignals.status);
    });

    it("should default wallet-nonce to Chain 56 in production and reject Testnet 97 nonce generation", async function () {
      process.env.NODE_ENV = "production";
      const addr = "0x" + "1".repeat(40);
      const okRes = await walletNonceRoute(new NextRequest(`https://lioracoin.com/api/auth/wallet-nonce?address=${addr}`));
      expect(okRes.status).to.equal(200);
      const okData = await okRes.json();
      expect(okData.chainId).to.equal(56);

      const testnetRes = await walletNonceRoute(new NextRequest(`https://lioracoin.com/api/auth/wallet-nonce?address=${addr}&chainId=97`));
      expect(testnetRes.status).to.equal(400);
    });

    it("should verify investor dashboard removed Approve/Reject admin buttons and /settlement gates admin tab", async function () {
      const dashSrc = fs.readFileSync(path.resolve(__dirname, "../apps/web/src/app/dashboard/page.tsx"), "utf8");
      expect(dashSrc).to.not.include("handleAdminVerify");
      expect(dashSrc).to.not.include("/api/custody/verify-payment");

      const settlementSrc = fs.readFileSync(path.resolve(__dirname, "../apps/web/src/app/settlement/page.tsx"), "utf8");
      expect(settlementSrc).to.include("canViewAdminConsole");

      const nonAdminVerify = await custodyVerifyPaymentRoute(
        new NextRequest("http://localhost:3000/api/custody/verify-payment", {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${activeSession.sessionIdentifier}`,
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({ allocationId: "alloc_fake_01", action: "APPROVE" }),
        })
      );
      expect(nonAdminVerify.status).to.equal(403);
    });
  });

  describe("5. Settlement PostgreSQL Migration & BSC Mainnet RPC Fallback", function () {
    it("should persist settlement lifecycle and audit entries directly in PostgreSQL", async function () {
      const investorAddr = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();
      const idempCreate = `p2_settle_create_${crypto.randomUUID()}`;
      const refNum = `IMPS-P2-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
      const txHash = "0x0000" + crypto.randomBytes(30).toString("hex");

      const created = await SettlementPersistentStore.createInvestment({
        investorAddress: investorAddr,
        investorName: "Phase2 DB Investor",
        planId: "TIER_01",
        initialAllocationPriceINR: "0.20",
        idempotencyKey: idempCreate,
      });
      expect(created.success).to.equal(true);
      const invId = created.record.id;

      // Confirm row exists in PostgreSQL investment_settlements table
      const dbRow = await prisma.investmentSettlement.findUnique({ where: { id: invId } });
      expect(dbRow).to.not.be.null;
      expect(dbRow.investorAddress).to.equal(investorAddr);

      // Dispatch payout
      const payoutRes = await SettlementPersistentStore.recordManualPayout({
        investmentId: invId,
        amountPaidINR: 125000,
        paymentRail: "IMPS_BANK_TRANSFER",
        referenceNumber: refNum,
        dispatchedBy: AUTHORIZED_TREASURY_WALLET,
        idempotencyKey: `p2_payout_${crypto.randomUUID()}`,
      });
      expect(payoutRes.success).to.equal(true);

      // Verify payment
      const verifyRes = await SettlementPersistentStore.verifyPayment({
        investmentId: invId,
        verifierAddress: investorAddr,
        method: "INVESTOR_RECEIPT_CONFIRMATION",
        idempotencyKey: `p2_verify_${crypto.randomUUID()}`,
      });
      expect(verifyRes.success).to.equal(true);

      // Return collateral
      const colRes = await SettlementPersistentStore.recordCollateralReturn({
        investmentId: invId,
        txHash,
        actorAddress: investorAddr,
        returnedTokensAmount: created.record.originalCollateralTokensBaseUnits,
        idempotencyKey: `p2_col_${crypto.randomUUID()}`,
      });
      expect(colRes.success).to.equal(true);

      const finalRow = await SettlementPersistentStore.getInvestmentById(invId);
      expect(finalRow.stage).to.equal("SETTLEMENT_COMPLETED");
      const logs = await SettlementPersistentStore.getAuditLogs(invId);
      expect(logs.length).to.be.at.least(4);

      // Clean up test investment rows
      await prisma.investmentSettlement.delete({ where: { id: invId } });
    });

    it("should block settlement & payment-intent mutations in NODE_ENV=production even without x-chain-id header", async function () {
      process.env.NODE_ENV = "production";
      const headers = {
        cookie: `${SESSION_COOKIE_NAME}=${adminSession.sessionIdentifier}`,
        "x-requested-with": "XMLHttpRequest",
      };

      const p1 = await custodyPaymentIntentRoute(
        new NextRequest("http://localhost:3000/api/custody/payment-intent", {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        })
      );
      expect(p1.status).to.equal(403);

      const p2 = await settlementPayoutRoute(
        new NextRequest("http://localhost:3000/api/settlement/payout", {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        })
      );
      expect(p2.status).to.equal(403);

      const p3 = await settlementCollateralRoute(
        new NextRequest("http://localhost:3000/api/settlement/collateral", {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        })
      );
      expect(p3.status).to.equal(403);
    });

    it("should configure multi-provider fallback URLs for BSC Mainnet RPC client", function () {
      expect(BSC_MAINNET_RPC_URLS).to.be.an("array");
      expect(BSC_MAINNET_RPC_URLS.length).to.be.at.least(4);
      expect(bscMainnetPublicClient).to.exist;
    });
  });
});
