const { expect } = require("chai");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

require("./helpers/tsLoader");

const webModules = path.resolve(__dirname, "../apps/web/node_modules");
const { NextRequest } = require(path.join(webModules, "next/server"));

process.env.OXENIQ_PERSISTENCE_MODE = "postgres";

const { isTestnetSandboxEnabled, isProductionWebsite } = require("../apps/web/src/config/tokenConfig");
const { SESSION_COOKIE_NAME } = require("../apps/web/src/lib/server/adminAuth");
const { serverDb } = require("../apps/web/src/lib/server/db");
const { SettlementPersistentStore } = require("../apps/web/src/lib/server/settlement/settlementPersistentStore");
const { BLOCKCHAIN_REGISTRY } = require("../apps/web/src/lib/chains/blockchainRegistry");

const { POST: createQuoteRoute, GET: getQuoteRoute } = require("../apps/web/src/app/api/prelaunch/quote/route");
const { POST: executePurchaseRoute, GET: getPurchasesRoute } = require("../apps/web/src/app/api/prelaunch/purchases/route");
const { POST: startTrialRoute } = require("../apps/web/src/app/api/bot/trial/start/route");
const { POST: custodyTransferRoute } = require("../apps/web/src/app/api/custody/investor-transfer/route");

describe("LIORA COIN — Phase 1 Critical Security Remediation Regression Suite", function () {
  this.timeout(30000);

  let userA;
  let userB;
  let sessionA;
  let sessionB;
  const walletA = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();
  const walletB = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();

  let origNodeEnv;
  let origSandboxFlag;
  let origWindow;

  before(async function () {
    userA = await serverDb.createUser({
      username: "phase1_user_a_" + crypto.randomUUID().slice(0, 8),
      role: "USER",
    });
    userB = await serverDb.createUser({
      username: "phase1_user_b_" + crypto.randomUUID().slice(0, 8),
      role: "USER",
    });
    await serverDb.linkVerifiedWallet({
      walletAddress: walletB,
      userId: userB.id,
      chainId: 97,
      signatureProof: "phase1_test_signature",
      nonceChallenge: "phase1_test_challenge",
    });
    sessionA = await serverDb.createSession(userA.id, 12, "127.0.0.1");
    sessionB = await serverDb.createSession(userB.id, 12, "127.0.0.1");
  });

  beforeEach(function () {
    origNodeEnv = process.env.NODE_ENV;
    origSandboxFlag = process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX;
    origWindow = globalThis.window;
  });

  afterEach(function () {
    process.env.NODE_ENV = origNodeEnv;
    if (origSandboxFlag === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX = origSandboxFlag;
    }
    if (origWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = origWindow;
    }
  });

  describe("1. Production Sandbox Isolation (tokenConfig.ts)", function () {
    it("should ALWAYS return false for isTestnetSandboxEnabled() in production even if NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX=true", function () {
      process.env.NODE_ENV = "production";
      process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX = "true";
      delete globalThis.window;

      expect(isTestnetSandboxEnabled()).to.equal(false);
    });

    it("should return false for isTestnetSandboxEnabled() on lioracoin.com and subdomains even in non-production NODE_ENV", function () {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX = "true";

      globalThis.window = { location: { hostname: "lioracoin.com" } };
      expect(isProductionWebsite()).to.equal(true);
      expect(isTestnetSandboxEnabled()).to.equal(false);

      globalThis.window = { location: { hostname: "www.lioracoin.com" } };
      expect(isTestnetSandboxEnabled()).to.equal(false);
    });

    it("should preserve isolated local Testnet sandbox when NODE_ENV=development and NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX=true", function () {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_ENABLE_TESTNET_SANDBOX = "true";
      globalThis.window = { location: { hostname: "localhost" } };

      expect(isProductionWebsite()).to.equal(false);
      expect(isTestnetSandboxEnabled()).to.equal(true);
    });
  });

  describe("2. Unauthorized API Access & CSRF Enforcement", function () {
    it("should reject unauthenticated requests to /api/prelaunch/quote (POST and GET) with HTTP 401", async function () {
      const postRes = await createQuoteRoute(
        new NextRequest("http://localhost:3000/api/prelaunch/quote", {
          method: "POST",
          headers: { "x-requested-with": "XMLHttpRequest" },
          body: JSON.stringify({
            walletAddress: walletA,
            investmentAmount: 1000,
            currency: "USD",
          }),
        })
      );
      expect(postRes.status).to.equal(401);

      const getRes = await getQuoteRoute(
        new NextRequest("http://localhost:3000/api/prelaunch/quote?quoteId=qt_test")
      );
      expect(getRes.status).to.equal(401);
    });

    it("should reject unauthenticated requests to /api/prelaunch/purchases (POST and GET) with HTTP 401", async function () {
      const postRes = await executePurchaseRoute(
        new NextRequest("http://localhost:3000/api/prelaunch/purchases", {
          method: "POST",
          headers: { "x-requested-with": "XMLHttpRequest" },
          body: JSON.stringify({
            quoteId: "qt_test",
            txHash: "0x123",
            idempotencyKey: "idemp_unauth_" + Date.now(),
          }),
        })
      );
      expect(postRes.status).to.equal(401);

      const getRes = await getPurchasesRoute(
        new NextRequest("http://localhost:3000/api/prelaunch/purchases")
      );
      expect(getRes.status).to.equal(401);
    });

    it("should reject unauthenticated requests to /api/bot/trial/start with HTTP 401", async function () {
      const res = await startTrialRoute(
        new NextRequest("http://localhost:3000/api/bot/trial/start", {
          method: "POST",
          headers: { "x-requested-with": "XMLHttpRequest" },
          body: JSON.stringify({ walletAddress: walletA }),
        })
      );
      expect(res.status).to.equal(401);
    });

    it("should reject cross-origin POST requests with HTTP 403", async function () {
      const res = await createQuoteRoute(
        new NextRequest("http://localhost:3000/api/prelaunch/quote", {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionA.sessionIdentifier}`,
            origin: "https://attacker.example",
          },
          body: JSON.stringify({
            walletAddress: walletA,
            investmentAmount: 500,
            currency: "USD",
          }),
        })
      );
      expect(res.status).to.equal(403);
    });
  });

  describe("3. Identity Spoofing Prevention", function () {
    let userBQuoteId;

    before(async function () {
      const quoteRes = await serverDb.createInvestorQuote({
        userId: userB.id,
        walletAddress: walletB,
        investmentAmount: 1000,
        currency: "USD",
      });
      userBQuoteId = quoteRes.quote.quoteId;
    });

    it("should reject userA spoofing userId=userB.id on POST /api/prelaunch/quote with HTTP 403", async function () {
      const res = await createQuoteRoute(
        new NextRequest("http://localhost:3000/api/prelaunch/quote", {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionA.sessionIdentifier}`,
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({
            userId: userB.id,
            walletAddress: walletA,
            investmentAmount: 1000,
            currency: "USD",
          }),
        })
      );
      expect(res.status).to.equal(403);
      const data = await res.json();
      expect(data.error).to.equal("FORBIDDEN_IDENTITY_SPOOFING");
    });

    it("should reject userA reading userB's quote on GET /api/prelaunch/quote with HTTP 403", async function () {
      const res = await getQuoteRoute(
        new NextRequest(`http://localhost:3000/api/prelaunch/quote?quoteId=${userBQuoteId}`, {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionA.sessionIdentifier}` },
        })
      );
      expect(res.status).to.equal(403);
    });

    it("should reject userA executing userB's quote on POST /api/prelaunch/purchases with HTTP 403", async function () {
      const res = await executePurchaseRoute(
        new NextRequest("http://localhost:3000/api/prelaunch/purchases", {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionA.sessionIdentifier}`,
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({
            quoteId: userBQuoteId,
            txHash: "0xspoofed_tx",
            idempotencyKey: "idemp_spoof_" + Date.now(),
          }),
        })
      );
      expect(res.status).to.equal(403);
    });

    it("should reject userA listing userB's purchases on GET /api/prelaunch/purchases?userId=userB with HTTP 403", async function () {
      const res = await getPurchasesRoute(
        new NextRequest(`http://localhost:3000/api/prelaunch/purchases?userId=${userB.id}`, {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionA.sessionIdentifier}` },
        })
      );
      expect(res.status).to.equal(403);
      const data = await res.json();
      expect(data.error).to.equal("FORBIDDEN_IDENTITY_SPOOFING");
    });

    it("should reject userA spoofing userB's userId or claiming userB's verified wallet on POST /api/bot/trial/start", async function () {
      const spoofUserRes = await startTrialRoute(
        new NextRequest("http://localhost:3000/api/bot/trial/start", {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionA.sessionIdentifier}`,
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({
            userId: userB.id,
            walletAddress: walletA,
          }),
        })
      );
      expect(spoofUserRes.status).to.equal(403);
      const spoofUserData = await spoofUserRes.json();
      expect(spoofUserData.error).to.equal("FORBIDDEN_IDENTITY_SPOOFING");

      const spoofWalletRes = await startTrialRoute(
        new NextRequest("http://localhost:3000/api/bot/trial/start", {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionA.sessionIdentifier}`,
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({
            walletAddress: walletB,
          }),
        })
      );
      expect(spoofWalletRes.status).to.equal(403);
      const spoofWalletData = await spoofWalletRes.json();
      expect(spoofWalletData.error).to.equal("WALLET_OWNERSHIP_CONFLICT");
    });
  });

  describe("4. Disabled Production Financial & Testnet Execution Guards", function () {
    it("should block prelaunch quote creation and purchase execution in NODE_ENV=production", async function () {
      process.env.NODE_ENV = "production";

      const quoteRes = await createQuoteRoute(
        new NextRequest("http://localhost:3000/api/prelaunch/quote", {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionA.sessionIdentifier}`,
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({
            walletAddress: walletA,
            investmentAmount: 1000,
            currency: "USD",
          }),
        })
      );
      expect(quoteRes.status).to.equal(403);
      expect((await quoteRes.json()).error).to.equal("PRELAUNCH_EXECUTION_DISABLED");

      const purchaseRes = await executePurchaseRoute(
        new NextRequest("http://localhost:3000/api/prelaunch/purchases", {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionA.sessionIdentifier}`,
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({
            quoteId: "qt_prod_blocked",
            txHash: "0xprod_blocked",
            idempotencyKey: "idemp_prod_" + Date.now(),
          }),
        })
      );
      expect(purchaseRes.status).to.equal(403);
      expect((await purchaseRes.json()).error).to.equal("PRELAUNCH_EXECUTION_DISABLED");
    });

    it("should block custody withdrawals, swaps, and transfers on /api/custody/investor-transfer with HTTP 403", async function () {
      const res = await custodyTransferRoute(
        new NextRequest("http://localhost:3000/api/custody/investor-transfer", {
          method: "POST",
          headers: {
            cookie: `${SESSION_COOKIE_NAME}=${sessionA.sessionIdentifier}`,
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({
            allocationId: "alloc_phase1_test",
            callerAddress: walletA,
            action: "WITHDRAW",
          }),
        })
      );
      expect(res.status).to.equal(403);
      const data = await res.json();
      expect(data.success).to.equal(false);
    });

    it("should enforce Mainnet settlement block and disabled write features in BSC Mainnet registry", function () {
      const mainnetResult = SettlementPersistentStore.enforceSandboxRestrictions({ chainId: 56 });
      expect(mainnetResult.permitted).to.equal(false);
      expect(mainnetResult.error).to.include("MAINNET_SETTLEMENT_PROHIBITED");

      const fiatResult = SettlementPersistentStore.enforceSandboxRestrictions({
        chainId: 97,
        action: "REAL_FIAT_PAYOUT",
      });
      expect(fiatResult.permitted).to.equal(false);

      expect(BLOCKCHAIN_REGISTRY["bsc-mainnet"].features.tokenTransfers).to.equal(false);
      expect(BLOCKCHAIN_REGISTRY["bsc-mainnet"].features.tradingBotPayments).to.equal(false);
      expect(BLOCKCHAIN_REGISTRY["bsc-mainnet"].features.investorLocking).to.equal(false);
    });

    it("should verify /buy, /sale, PrelaunchOfferingCard, WalletModal, and useDexOnChainSwap gate Testnet exposure & remove demo identities", function () {
      const buyPage = fs.readFileSync(path.resolve(__dirname, "../apps/web/src/app/buy/page.tsx"), "utf8");
      const prelaunchCard = fs.readFileSync(path.resolve(__dirname, "../apps/web/src/components/prelaunch/PrelaunchOfferingCard.tsx"), "utf8");
      const saleTerminal = fs.readFileSync(path.resolve(__dirname, "../apps/web/src/components/sale/PrimarySaleTerminal.tsx"), "utf8");
      const walletModal = fs.readFileSync(path.resolve(__dirname, "../apps/web/src/components/WalletModal.tsx"), "utf8");
      const swapHook = fs.readFileSync(path.resolve(__dirname, "../apps/web/src/hooks/useDexOnChainSwap.ts"), "utf8");

      expect(buyPage).to.include("isTestnetSandboxEnabled");
      expect(buyPage).to.not.include("usr_demo_buyer");
      expect(buyPage).to.not.include("proposed symbol: LIORA");

      expect(prelaunchCard).to.include("isTestnetSandboxEnabled");
      expect(prelaunchCard).to.not.include("usr_guest_demo");
      expect(prelaunchCard).to.not.include("0x71C...demo");

      expect(saleTerminal).to.include("isTestnetSandboxEnabled");
      expect(walletModal).to.include("isTestnetSandboxEnabled");
      expect(swapHook).to.include("isTestnetSandboxEnabled");
    });
  });
});
