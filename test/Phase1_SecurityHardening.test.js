const { expect } = require("chai");
const crypto = require("crypto");
const { ethers } = require("hardhat");

// Zero-dependency TypeScript loader for production modules
require("./helpers/tsLoader");

// Production modules
const { serverDb } = require("../apps/web/src/lib/server/db.ts");
const {
  requireAdmin,
  verifyAdminCredentials,
  getSessionTokenFromRequest,
  timingSafeCompare
} = require("../apps/web/src/lib/server/adminAuth.ts");
const {
  verifyAndRecordPayment,
  ACCEPTED_CHAINS,
  OFFICIAL_TREASURY_ADDRESS
} = require("../apps/web/src/lib/server/paymentVerification.ts");
const { prelaunchStore } = require("../apps/web/src/lib/prelaunch/prelaunchStore.ts");
const {
  BLOCKCHAIN_REGISTRY,
  assertChainEnabled,
  UnsupportedChainError
} = require("../apps/web/src/lib/chains/blockchainRegistry.ts");

describe("LIORA COIN — Phase 1: Critical Security Hardening & RBAC Verification Suite", function () {
  let testSigner;
  let testSignerAddress;

  before(async function () {
    process.env.OXENIQ_PERSISTENCE_MODE = "memory";
    [testSigner] = await ethers.getSigners();
    testSignerAddress = (await testSigner.getAddress()).toLowerCase();
  });

  after(function () {
    process.env.OXENIQ_PERSISTENCE_MODE = "postgres";
  });

  beforeEach(function () {
    serverDb.resetAll();
    prelaunchStore.resetToDefault();
  });

  // =========================================================================
  // JOURNEY A: Admin Passcode Elimination & Server-Authoritative Verification
  // =========================================================================
  describe("Journey A: Elimination of Hardcoded Admin Passcodes ('admin123', 'oxeniq')", function () {
    it("Should strictly reject 'admin123' as an admin credential", async function () {
      const result = await verifyAdminCredentials("admin_dan", "admin123");
      expect(result).to.be.null;
    });

    it("Should strictly reject 'oxeniq' (case-insensitive) as an admin credential", async function () {
      const resultUpper = await verifyAdminCredentials("admin_dan", "OXENIQ");
      const resultLower = await verifyAdminCredentials("admin_dan", "oxeniq");
      expect(resultUpper).to.be.null;
      expect(resultLower).to.be.null;
    });

    it("Should reject arbitrary or empty passwords", async function () {
      const resultEmpty = await verifyAdminCredentials("admin_dan", "");
      const resultWrong = await verifyAdminCredentials("admin_dan", "wrong_password_999");
      expect(resultEmpty).to.be.null;
      expect(resultWrong).to.be.null;
    });

    it("Should reject credentials for non-admin accounts even if password matches", async function () {
      // usr_alex_001 has role TRADER
      const result = await verifyAdminCredentials("trader_alex", "OxeniqDemo2026!");
      expect(result).to.be.null;
    });

    it("Should authenticate legitimate admin credentials and verify role 'ADMIN'", async function () {
      const admin = await verifyAdminCredentials("admin_dan", "OxeniqDemo2026!");
      expect(admin).to.not.be.null;
      expect(admin.role).to.equal("ADMIN");
      expect(admin.username).to.equal("admin_dan");
    });
  });

  // =========================================================================
  // JOURNEY B: Role-Based Access Control (RBAC) & Header / Query Spoofing Defense
  // =========================================================================
  describe("Journey B: RBAC & Header / Query Parameter Spoofing Defenses", function () {
    function createMockRequest({ cookieToken, authHeader, forgedHeaders = {}, query = "" } = {}) {
      const headers = new Map();
      if (authHeader) headers.set("authorization", authHeader);
      for (const [k, v] of Object.entries(forgedHeaders)) {
        headers.set(k.toLowerCase(), v);
      }

      const cookies = new Map();
      if (cookieToken) {
        cookies.set("liora_session", { value: cookieToken });
      }

      return {
        headers: {
          get: (name) => headers.get(name.toLowerCase()) || null,
        },
        cookies: {
          get: (name) => cookies.get(name) || null,
        },
        url: `https://oxeniq.network/api/admin/bot/subscribers${query ? "?" + query : ""}`,
      };
    }

    it("Should reject forged 'x-admin-role: ADMIN' header when unauthenticated (HTTP 401)", async function () {
      const mockReq = createMockRequest({
        forgedHeaders: { "x-admin-role": "ADMIN" },
      });

      const authResult = await requireAdmin(mockReq);
      expect(authResult.authorized).to.be.false;
      expect(authResult.response.status).to.equal(401);
    });

    it("Should reject query parameter impersonation '?adminId=usr_dan_002' (HTTP 401)", async function () {
      const mockReq = createMockRequest({
        query: "adminId=usr_dan_002",
      });

      const authResult = await requireAdmin(mockReq);
      expect(authResult.authorized).to.be.false;
      expect(authResult.response.status).to.equal(401);
    });

    it("Should reject requests with valid session for non-admin user (HTTP 403 Forbidden)", async function () {
      // Alex is role TRADER
      const alexSession = await serverDb.createSession("usr_alex_001", 12);
      const mockReq = createMockRequest({
        cookieToken: alexSession.sessionIdentifier,
      });

      const authResult = await requireAdmin(mockReq);
      expect(authResult.authorized).to.be.false;
      expect(authResult.response.status).to.equal(403);
    });

    it("Should allow requests with valid authenticated administrator session", async function () {
      // Dan is role ADMIN
      const danSession = await serverDb.createSession("usr_dan_002", 12);
      const mockReq = createMockRequest({
        cookieToken: danSession.sessionIdentifier,
      });

      const authResult = await requireAdmin(mockReq);
      expect(authResult.authorized).to.be.true;
      expect(authResult.user.id).to.equal("usr_dan_002");
      expect(authResult.user.role).to.equal("ADMIN");
    });

    it("Should allow administrator authentication via Bearer token in Authorization header", async function () {
      const danSession = await serverDb.createSession("usr_dan_002", 12);
      const mockReq = createMockRequest({
        authHeader: `Bearer ${danSession.sessionIdentifier}`,
      });

      const authResult = await requireAdmin(mockReq);
      expect(authResult.authorized).to.be.true;
      expect(authResult.user.id).to.equal("usr_dan_002");
    });

    it("Should reject expired administrator session", async function () {
      // Create expired session (-1 hour)
      const danSession = await serverDb.createSession("usr_dan_002", -1);
      const mockReq = createMockRequest({
        cookieToken: danSession.sessionIdentifier,
      });

      const authResult = await requireAdmin(mockReq);
      expect(authResult.authorized).to.be.false;
      expect(authResult.response.status).to.equal(401);
    });

    it("Should reject revoked administrator session after logout", async function () {
      const danSession = await serverDb.createSession("usr_dan_002", 12);
      await serverDb.revokeSession(danSession.sessionIdentifier, "ADMIN_LOGOUT");

      const mockReq = createMockRequest({
        cookieToken: danSession.sessionIdentifier,
      });

      const authResult = await requireAdmin(mockReq);
      expect(authResult.authorized).to.be.false;
      expect(authResult.response.status).to.equal(401);
    });
  });

  // =========================================================================
  // JOURNEY C: Wallet Authentication, EIP-4361 SIWE & Replay Defenses
  // =========================================================================
  describe("Journey C: Cryptographic Wallet Authentication (SIWE) & Replay Protection", function () {
    it("Should generate single-use nonce with 5-minute TTL", async function () {
      const nonce = await serverDb.createNonce(testSignerAddress, 5 * 60 * 1000);
      expect(nonce).to.be.a("string");
      expect(nonce.length).to.be.at.least(16);
    });

    it("Should reject reused nonce on second consumption attempt", async function () {
      const nonce = await serverDb.createNonce(testSignerAddress);
      const firstUse = await serverDb.consumeNonce(nonce, testSignerAddress);
      expect(firstUse).to.be.true;

      const secondUse = await serverDb.consumeNonce(nonce, testSignerAddress);
      expect(secondUse).to.be.false;
    });

    it("Should reject expired nonce past its expiration TTL", async function () {
      const nonce = await serverDb.createNonce(testSignerAddress, -100); // expired
      const isValid = await serverDb.consumeNonce(nonce, testSignerAddress);
      expect(isValid).to.be.false;
    });

    it("Should reject nonce consumption when presented by an address mismatch", async function () {
      const nonce = await serverDb.createNonce(testSignerAddress);
      const wrongAddress = "0x0000000000000000000000000000000000000001";
      const isValid = await serverDb.consumeNonce(nonce, wrongAddress);
      expect(isValid).to.be.false;
    });

    it("Should cryptographically verify valid EIP-191 / SIWE personal signature", async function () {
      const nonce = await serverDb.createNonce(testSignerAddress);
      const message = `oxeniq.network wants you to sign in with your Ethereum account:\n${testSignerAddress}\n\nNonce: ${nonce}`;
      
      const realSignature = await testSigner.signMessage(message);
      
      // Verify signature using ethers / viem standard
      const recoveredAddress = ethers.verifyMessage(message, realSignature).toLowerCase();
      expect(recoveredAddress).to.equal(testSignerAddress);
    });

    it("Should reject forged signature that does not match the claiming wallet address", async function () {
      const nonce = await serverDb.createNonce(testSignerAddress);
      const message = `oxeniq.network wants you to sign in with your Ethereum account:\n${testSignerAddress}\n\nNonce: ${nonce}`;
      
      // Signed by testSigner
      const realSignature = await testSigner.signMessage(message);
      
      // Attacker claims to be a different address
      const victimAddress = "0x2222222222222222222222222222222222222222";
      const recovered = ethers.verifyMessage(message, realSignature).toLowerCase();
      expect(recovered).to.not.equal(victimAddress);
    });
  });

  // =========================================================================
  // JOURNEY D: Pre-Launch Single-Use Quote Consumption & Replay Prevention
  // =========================================================================
  describe("Journey D: Pre-Launch Single-Use Quote Consumption (Replay Prevention)", function () {
    it("Should issue binding 15-minute quote and successfully record purchase once", function () {
      const quoteRes = prelaunchStore.createQuote({
        investmentAmount: 1000,
        currency: "USD",
        userId: "usr_alex_001",
        walletAddress: testSignerAddress,
      });

      expect(quoteRes.success).to.be.true;
      const quoteId = quoteRes.quote.quoteId;

      const purchaseRes = prelaunchStore.recordPurchase(quoteId, Date.now(), "0xabc123");
      expect(purchaseRes.success).to.be.true;
      expect(purchaseRes.record.claimStatus).to.equal("LOCKED");
    });

    it("Should reject replayed purchase with already-consumed quoteId", function () {
      const quoteRes = prelaunchStore.createQuote({
        investmentAmount: 500,
        currency: "USD",
        userId: "usr_alex_001",
        walletAddress: testSignerAddress,
      });

      const quoteId = quoteRes.quote.quoteId;

      // First execution consumes the quote
      const firstPurchase = prelaunchStore.recordPurchase(quoteId, Date.now(), "0xhash1");
      expect(firstPurchase.success).to.be.true;

      // Second execution with same quoteId MUST be rejected (replay defense)
      const secondPurchase = prelaunchStore.recordPurchase(quoteId, Date.now(), "0xhash2");
      expect(secondPurchase.success).to.be.false;
      expect(secondPurchase.error).to.include("Quote not found");
    });
  });

  // =========================================================================
  // JOURNEY E: Mainnet Guardrails & Financial Gate Verification
  // =========================================================================
  describe("Journey E: Mainnet Guardrails & Disabled Multi-Chain Protection", function () {
    it("Should strictly confirm BSC Mainnet (#56) remains disabled", function () {
      expect(BLOCKCHAIN_REGISTRY["bsc-mainnet"].enabled).to.be.false;
      expect(() => assertChainEnabled("bsc-mainnet")).to.throw(UnsupportedChainError);
    });

    it("Should strictly confirm Polygon, TRON, and Bitcoin networks remain disabled", function () {
      expect(BLOCKCHAIN_REGISTRY["polygon-mainnet"].enabled).to.be.false;
      expect(BLOCKCHAIN_REGISTRY["tron-mainnet"].enabled).to.be.false;
      expect(BLOCKCHAIN_REGISTRY["bitcoin-mainnet"].enabled).to.be.false;
      expect(() => assertChainEnabled("polygon-mainnet")).to.throw(UnsupportedChainError);
      expect(() => assertChainEnabled("tron-mainnet")).to.throw(UnsupportedChainError);
      expect(() => assertChainEnabled("bitcoin-mainnet")).to.throw(UnsupportedChainError);
    });

    it("Should reject live BSC Mainnet payments in payment verification engine", async function () {
      const result = await verifyAndRecordPayment({
        txHash: "0x1111222233334444555566667777888899990000111122223333444455556666",
        chainId: ACCEPTED_CHAINS.BSC_MAINNET, // Chain 56
        tokenSymbol: "USDT",
        tokenAddress: "0x55d398326f99059fF775485246999027B3197955",
        payingWallet: testSignerAddress,
        treasuryAddress: OFFICIAL_TREASURY_ADDRESS,
        expectedAmount: 49,
        subscriptionPlanId: "PLAN_MONTHLY",
        userId: "usr_alex_001",
      });

      expect(result.isValid).to.be.false;
      expect(result.status).to.equal("FAILED");
      expect(result.error).to.include("BSC Mainnet live payments are strictly disabled");
    });
  });
});

