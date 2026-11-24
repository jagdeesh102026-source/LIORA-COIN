const { expect } = require("chai");
const crypto = require("crypto");
const { ethers } = require("hardhat");

// Zero-dependency TypeScript loader for production modules
require("./helpers/tsLoader");

// Production modules
const {
  serverDb,
  hashPasswordScrypt,
  normalizeWalletAddress,
} = require("../apps/web/src/lib/server/db.ts");
const {
  verifyAdminCredentials,
  verifyAdminCredentialsDetailed,
  hashPassword,
  verifyPassword,
  validateCsrfProtection,
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginRateLimit,
} = require("../apps/web/src/lib/server/adminAuth.ts");
const { validatePasswordComplexity } = require("../scripts/provisionAdmin.js");
const {
  BLOCKCHAIN_REGISTRY,
  assertChainEnabled,
  UnsupportedChainError,
} = require("../apps/web/src/lib/chains/blockchainRegistry.ts");

describe("LIORA COIN — Phase 2: Production Database & Admin Security Verification Suite", function () {
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
    resetLoginRateLimit("127.0.0.1:admin_dan");
    resetLoginRateLimit("127.0.0.1:admin_prod");
    resetLoginRateLimit("127.0.0.1:trader_alex");
  });

  // =========================================================================
  // JOURNEY A: Production Administrator Provisioning & Credential Security
  // =========================================================================
  describe("Journey A: Production Administrator Provisioning & Credential Security", function () {
    it("Should reject weak or default passwords during complexity validation", function () {
      expect(validatePasswordComplexity("short").valid).to.be.false;
      expect(validatePasswordComplexity("admin123").valid).to.be.false;
      expect(validatePasswordComplexity("oxeniq").valid).to.be.false;
      expect(validatePasswordComplexity("oxeniqdemo2026!").valid).to.be.false;
      expect(validatePasswordComplexity("alllowercase123!").valid).to.be.false; // No uppercase
      expect(validatePasswordComplexity("ALLUPPERCASE123!").valid).to.be.false; // No lowercase
      expect(validatePasswordComplexity("NoSpecialChar1234").valid).to.be.false; // No special
    });

    it("Should accept valid high-entropy administrator passwords", function () {
      const validPass = "L1ora$ecure_Adm1n_2026!#";
      const result = validatePasswordComplexity(validPass);
      expect(result.valid).to.be.true;
    });

    it("Should generate cryptographic scrypt hash with unique 16-byte random salts", function () {
      const pass = "SuperSecret_Admin2026!#";
      const hash1 = hashPassword(pass);
      const hash2 = hashPassword(pass);

      expect(hash1).to.include("scrypt:");
      expect(hash2).to.include("scrypt:");
      expect(hash1).to.not.equal(hash2); // Distinct random salts per hash

      expect(verifyPassword(pass, hash1)).to.be.true;
      expect(verifyPassword(pass, hash2)).to.be.true;
      expect(verifyPassword("WrongPassword123!", hash1)).to.be.false;
    });

    it("Should block development-only accounts from authenticating in production mode", async function () {
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";

        // Create a development-only admin
        await serverDb.createUser({
          id: "usr_dev_dan",
          username: "dev_dan",
          email: "dan_dev@oxeniq.network",
          passwordHash: hashPassword("L1ora$ecure_DevAdmin!"),
          role: "ADMIN",
          accountStatus: "ACTIVE",
          isDevelopmentOnly: true,
        });

        const authResult = await verifyAdminCredentialsDetailed("dev_dan", "L1ora$ecure_DevAdmin!");
        expect(authResult.user).to.be.null;
        expect(authResult.error).to.equal("DEVELOPMENT_ACCOUNT_PROHIBITED");
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it("Should permit provisioned production accounts (isDevelopmentOnly: false) in production mode", async function () {
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";

        // Create a provisioned production admin
        await serverDb.createUser({
          id: "usr_prod_dan",
          username: "admin_prod",
          email: "admin_prod@oxeniq.network",
          passwordHash: hashPassword("L1ora$ecure_ProdAdmin2026!"),
          role: "ADMIN",
          accountStatus: "ACTIVE",
          isDevelopmentOnly: false,
        });

        const authResult = await verifyAdminCredentialsDetailed("admin_prod", "L1ora$ecure_ProdAdmin2026!");
        expect(authResult.user).to.not.be.null;
        expect(authResult.user.username).to.equal("admin_prod");
        expect(authResult.user.role).to.equal("ADMIN");
        expect(authResult.user.isDevelopmentOnly).to.be.false;
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it("Should enforce login rate limiting: lock out account after 5 failed attempts for 15 minutes", async function () {
      const clientIp = "192.168.1.100";
      const username = "admin_target";
      const key = `${clientIp}:${username}`;

      // Reset test bucket
      resetLoginRateLimit(key);

      // Provision user
      await serverDb.createUser({
        username,
        email: "target@oxeniq.network",
        passwordHash: hashPassword("ValidPassword123!#"),
        role: "ADMIN",
        accountStatus: "ACTIVE",
        isDevelopmentOnly: false,
      });

      // 5 consecutive failed attempts
      for (let i = 0; i < 5; i++) {
        const attempt = await verifyAdminCredentialsDetailed(username, "WrongGuess123!", { clientIp });
        expect(attempt.error).to.equal("INVALID_CREDENTIALS");
      }

      // 6th attempt should be blocked by RATE_LIMIT_EXCEEDED
      const lockedAttempt = await verifyAdminCredentialsDetailed(username, "ValidPassword123!#", { clientIp });
      expect(lockedAttempt.user).to.be.null;
      expect(lockedAttempt.error).to.equal("RATE_LIMIT_EXCEEDED");
      expect(lockedAttempt.retryAfterSeconds).to.be.at.least(800);

      // Reset and verify recovery
      resetLoginRateLimit(key);
      const recoveredAttempt = await verifyAdminCredentialsDetailed(username, "ValidPassword123!#", { clientIp });
      expect(recoveredAttempt.user).to.not.be.null;
    });

    it("Should require MFA token when MFA is enabled on administrator account", async function () {
      const mfaSecret = "SUPER_SECRET_MFA_KEY_123";
      await serverDb.createUser({
        username: "mfa_admin",
        email: "mfa@oxeniq.network",
        passwordHash: hashPassword("MfaAdmin$ecure2026!"),
        role: "ADMIN",
        accountStatus: "ACTIVE",
        isDevelopmentOnly: false,
        isMfaEnabled: true,
        mfaSecret,
      });

      // Attempt login without MFA token
      const noMfa = await verifyAdminCredentialsDetailed("mfa_admin", "MfaAdmin$ecure2026!");
      expect(noMfa.error).to.equal("MFA_REQUIRED");

      // Attempt login with invalid MFA token
      const badMfa = await verifyAdminCredentialsDetailed("mfa_admin", "MfaAdmin$ecure2026!", {
        mfaToken: "WRONG_TOKEN",
      });
      expect(badMfa.error).to.equal("INVALID_MFA_TOKEN");

      // Attempt login with valid MFA token
      const goodMfa = await verifyAdminCredentialsDetailed("mfa_admin", "MfaAdmin$ecure2026!", {
        mfaToken: mfaSecret,
      });
      expect(goodMfa.user).to.not.be.null;
      expect(goodMfa.user.username).to.equal("mfa_admin");
    });
  });

  // =========================================================================
  // JOURNEY B: Idempotency Keys & Financial Purchase Intent Handling
  // =========================================================================
  describe("Journey B: Idempotency Keys & Purchase Intent Handling", function () {
    it("Should create purchase intent and return identical record for repeated idempotency key", async function () {
      const idempotencyKey = "idemp_purchase_001_unique";
      const intentData = {
        idempotencyKey,
        userId: "usr_buyer_01",
        quoteId: "quote_test_01",
        walletAddress: testSignerAddress,
        amountUSD: 500,
        tokenQuantity: "2500000000000000000000", // 2,500 LIORA
        status: "INITIATED",
      };

      const firstCall = await serverDb.createPurchaseIntent(intentData);
      expect(firstCall.idempotencyKey).to.equal(idempotencyKey);
      expect(firstCall.amountUSD).to.equal(500);

      // Repeat request with exact same idempotency key
      const secondCall = await serverDb.createPurchaseIntent({
        ...intentData,
        amountUSD: 9999, // Attempted alteration
      });

      // Must return identical original record without duplicating or updating to malicious values
      expect(secondCall.id).to.equal(firstCall.id);
      expect(secondCall.amountUSD).to.equal(500);
    });

    it("Should enforce idempotency on investor allocations and prevent duplicate token credits", async function () {
      const idempotencyKey = "idemp_alloc_tx_0xabc123";
      const allocData = {
        purchaseId: "purch_001",
        idempotencyKey,
        userId: "usr_investor_01",
        walletAddress: testSignerAddress,
        investmentAmountUSD: 1000,
        tokenQuantity: "5000000000000000000000", // 5,000 LIORA
        lockTierMonths: 6,
        lockStartTimeUTC: new Date().toISOString(),
        unlockTimeUTC: new Date(Date.now() + 180 * 86400 * 1000).toISOString(),
        policyVersion: 1,
        paymentVerificationStatus: "VERIFIED",
        claimStatus: "LOCKED",
        txHash: "0xabc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        isDemoAllocation: false,
      };

      const alloc1 = await serverDb.createInvestorAllocation(allocData);
      expect(alloc1.idempotencyKey).to.equal(idempotencyKey);

      // Duplicate submission
      const alloc2 = await serverDb.createInvestorAllocation(allocData);
      expect(alloc2.id).to.equal(alloc1.id);

      const allUserAllocs = await serverDb.getAllocationsByUserId("usr_investor_01");
      expect(allUserAllocs.length).to.equal(1);
    });
  });

  // =========================================================================
  // JOURNEY C: Unique Payment Identifier & Multi-Chain Isolation
  // =========================================================================
  describe("Journey C: Unique Payment Identifiers & Multi-Chain Isolation", function () {
    it("Should record payment transaction and reject duplicate txHash on the same chain", async function () {
      const txHash = "0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef";
      const paymentData = {
        txHash,
        chainId: 97, // BSC Testnet
        networkId: "bsc-testnet",
        tokenAddress: "0x337610d27c682E347C9cD6081376450523220c60",
        payingWallet: testSignerAddress,
        treasuryAddress: "0x8888888888888888888888888888888888888888",
        amount: 250,
        amountRaw: "250000000000000000000",
        tokenSymbol: "USDT",
        status: "CONFIRMED",
        blockNumber: 1234567,
        confirmations: 12,
      };

      const record = await serverDb.recordPaymentTransaction(paymentData);
      expect(record.txHash).to.equal(txHash);

      // Attempt duplicate recording
      let duplicateError = false;
      try {
        await serverDb.recordPaymentTransaction(paymentData);
      } catch (err) {
        duplicateError = true;
        expect(err.message).to.include("already been recorded");
      }
      expect(duplicateError).to.be.true;
    });

    it("Should strictly confirm BSC Mainnet (#56), Polygon, TRON, and Bitcoin remain disabled in registry", function () {
      expect(BLOCKCHAIN_REGISTRY["bsc-mainnet"].enabled).to.be.false;
      expect(BLOCKCHAIN_REGISTRY["polygon-mainnet"].enabled).to.be.false;
      expect(BLOCKCHAIN_REGISTRY["tron-mainnet"].enabled).to.be.false;
      expect(BLOCKCHAIN_REGISTRY["bitcoin-mainnet"].enabled).to.be.false;

      expect(() => assertChainEnabled("bsc-mainnet")).to.throw(UnsupportedChainError);
      expect(() => assertChainEnabled("polygon-mainnet")).to.throw(UnsupportedChainError);
      expect(() => assertChainEnabled("tron-mainnet")).to.throw(UnsupportedChainError);
      expect(() => assertChainEnabled("bitcoin-mainnet")).to.throw(UnsupportedChainError);
    });
  });

  // =========================================================================
  // JOURNEY D: ACID Database Transactions & Snapshot Rollback
  // =========================================================================
  describe("Journey D: ACID Database Transactions & Snapshot Rollback", function () {
    it("Should commit all state mutations when a transaction finishes successfully", async function () {
      const userId = "usr_tx_commit_01";
      await serverDb.createUser({
        id: userId,
        username: "tx_committer",
        email: "tx@oxeniq.network",
        passwordHash: null,
        role: "USER",
        accountStatus: "ACTIVE",
        isDevelopmentOnly: false,
      });

      await serverDb.transaction(async (tx) => {
        await tx.recordBalanceMovement({
          userId,
          tokenSymbol: "LIORA",
          amount: 100,
          amountRaw: "100000000000000000000",
          entryType: "CREDIT",
          reason: "DEPOSIT",
          isDemo: false,
        });

        await tx.createTradingOrder({
          orderId: "ord_tx_001",
          userId,
          pair: "LIORA/USDT",
          side: "BUY",
          orderType: "LIMIT",
          price: 0.25,
          amount: 100,
          amountRaw: "100000000000000000000",
          status: "OPEN",
          isDemoOrder: false,
        });
      });

      const balance = await serverDb.getTokenBalance(userId, "LIORA", false);
      expect(balance.balance).to.equal(100);

      const order = await serverDb.getTradingOrder("ord_tx_001");
      expect(order).to.not.be.null;
      expect(order.status).to.equal("OPEN");
    });

    it("Should rollback all intermediate state mutations when a transaction encounters an error", async function () {
      const userId = "usr_tx_rollback_01";
      await serverDb.createUser({
        id: userId,
        username: "tx_rollbacker",
        email: "rollback@oxeniq.network",
        passwordHash: null,
        role: "USER",
        accountStatus: "ACTIVE",
        isDevelopmentOnly: false,
      });

      let txFailed = false;
      try {
        await serverDb.transaction(async (tx) => {
          // Mutate balance
          await tx.recordBalanceMovement({
            userId,
            tokenSymbol: "LIORA",
            amount: 500,
            amountRaw: "500000000000000000000",
            entryType: "CREDIT",
            reason: "DEPOSIT",
            isDemo: false,
          });

          // Mutate order
          await tx.createTradingOrder({
            orderId: "ord_tx_rollback_fail",
            userId,
            pair: "LIORA/USDT",
            side: "BUY",
            orderType: "MARKET",
            price: null,
            amount: 500,
            amountRaw: "500000000000000000000",
            status: "OPEN",
            isDemoOrder: false,
          });

          // Simulate downstream database failure (e.g., foreign key violation or network timeout)
          throw new Error("ACID_SIMULATED_DATABASE_FAILURE");
        });
      } catch (err) {
        txFailed = true;
        expect(err.message).to.equal("ACID_SIMULATED_DATABASE_FAILURE");
      }
      expect(txFailed).to.be.true;

      // Balance must remain exactly 0 (no uncommitted dirty reads or orphan balances)
      const balance = await serverDb.getTokenBalance(userId, "LIORA", false);
      expect(balance.balance).to.equal(0);

      // Order must NOT exist in the database
      const order = await serverDb.getTradingOrder("ord_tx_rollback_fail");
      expect(order).to.be.null;

      // Audit log must confirm transactional rollback
      const logs = await serverDb.getAuditLogs(10);
      const rollbackLog = logs.find((l) => l.action === "DATABASE_TRANSACTION_ROLLBACK");
      expect(rollbackLog).to.exist;
      expect(rollbackLog.severity).to.equal("CRITICAL");
    });
  });

  // =========================================================================
  // JOURNEY E: Double-Entry Ledger & Exact 18-Decimal Balances
  // =========================================================================
  describe("Journey E: Double-Entry Ledger & Exact 18-Decimal Balances", function () {
    const userLedgerId = "usr_ledger_001";

    it("Should accurately track balances using double-entry credits and debits", async function () {
      // 1. Credit 1,000 LIORA
      await serverDb.recordBalanceMovement({
        userId: userLedgerId,
        tokenSymbol: "LIORA",
        amount: 1000,
        amountRaw: "1000000000000000000000",
        entryType: "CREDIT",
        reason: "DEPOSIT",
        isDemo: false,
      });

      let bal = await serverDb.getTokenBalance(userLedgerId, "LIORA", false);
      expect(bal.balance).to.equal(1000);
      expect(bal.balanceRaw).to.equal("1000000000000000000000");

      // 2. Debit 400 LIORA
      await serverDb.recordBalanceMovement({
        userId: userLedgerId,
        tokenSymbol: "LIORA",
        amount: 400,
        amountRaw: "400000000000000000000",
        entryType: "DEBIT",
        reason: "TRADE",
        isDemo: false,
      });

      bal = await serverDb.getTokenBalance(userLedgerId, "LIORA", false);
      expect(bal.balance).to.equal(600);
      expect(bal.balanceRaw).to.equal("600000000000000000000");

      // 3. Reject overdraft debit exceeding available balance
      let overdraftRejected = false;
      try {
        await serverDb.recordBalanceMovement({
          userId: userLedgerId,
          tokenSymbol: "LIORA",
          amount: 700, // available is 600
          amountRaw: "700000000000000000000",
          entryType: "DEBIT",
          reason: "WITHDRAWAL",
          isDemo: false,
        });
      } catch (err) {
        overdraftRejected = true;
        expect(err.message).to.include("Insufficient balance");
      }
      expect(overdraftRejected).to.be.true;
    });

    it("Should strictly isolate demo balances from production balances", async function () {
      // Credit demo balance
      await serverDb.recordBalanceMovement({
        userId: userLedgerId,
        tokenSymbol: "LIORA",
        amount: 50000,
        amountRaw: "50000000000000000000000",
        entryType: "CREDIT",
        reason: "DEPOSIT",
        isDemo: true,
      });

      const demoBal = await serverDb.getTokenBalance(userLedgerId, "LIORA", true);
      const prodBal = await serverDb.getTokenBalance(userLedgerId, "LIORA", false);

      expect(demoBal.balance).to.equal(50000);
      expect(demoBal.isDemoBalance).to.be.true;

      expect(prodBal.balance).to.equal(0);
      expect(prodBal.isDemoBalance).to.be.false;
    });
  });

  // =========================================================================
  // JOURNEY F: Blockchain Reorganizations & Payment Audit Trails
  // =========================================================================
  describe("Journey F: Blockchain Reorganizations & Payment Audit Trails", function () {
    it("Should flag reorg-detected transactions and record high-severity audit logs", async function () {
      const txHash = "0xreorg_target_tx_hash_1234567890abcdef1234567890";
      await serverDb.recordPaymentTransaction({
        txHash,
        chainId: 97,
        networkId: "bsc-testnet",
        tokenAddress: "0x337610d27c682E347C9cD6081376450523220c60",
        payingWallet: testSignerAddress,
        treasuryAddress: "0x8888888888888888888888888888888888888888",
        amount: 100,
        amountRaw: "100000000000000000000",
        tokenSymbol: "USDT",
        status: "CONFIRMED",
        blockNumber: 500000,
        confirmations: 15,
      });

      const paymentBefore = await serverDb.getPaymentByTxHash(txHash);
      expect(paymentBefore.reorgDetected).to.be.false;

      // Flag reorganization
      const flagged = await serverDb.flagReorganization(txHash);
      expect(flagged.reorgDetected).to.be.true;

      const logs = await serverDb.getAuditLogs(10);
      const reorgLog = logs.find((l) => l.action === "PAYMENT_REORGANIZATION_DETECTED");
      expect(reorgLog).to.exist;
      expect(reorgLog.severity).to.equal("CRITICAL");
    });
  });

  // =========================================================================
  // JOURNEY G: CSRF Defense for Mutating Administrative Operations
  // =========================================================================
  describe("Journey G: CSRF Defense for Mutating Operations", function () {
    function createMockRequest({ method = "POST", origin = null, host = "localhost:3000", authHeader = null, customHeaders = {} }) {
      const headers = new Map();
      if (origin) headers.set("origin", origin);
      if (host) headers.set("host", host);
      if (authHeader) headers.set("authorization", authHeader);
      for (const [k, v] of Object.entries(customHeaders)) {
        headers.set(k.toLowerCase(), v);
      }

      return {
        method,
        headers: {
          get: (name) => headers.get(name.toLowerCase()) || null,
        },
      };
    }

    it("Should allow safe read methods (GET, HEAD, OPTIONS) without CSRF check", function () {
      const req = createMockRequest({ method: "GET" });
      const check = validateCsrfProtection(req);
      expect(check.valid).to.be.true;
    });

    it("Should allow Bearer token authenticated API requests", function () {
      const req = createMockRequest({
        method: "POST",
        authHeader: "Bearer valid_api_session_token",
      });
      const check = validateCsrfProtection(req);
      expect(check.valid).to.be.true;
    });

    it("Should allow requests with custom anti-CSRF headers", function () {
      const req = createMockRequest({
        method: "POST",
        customHeaders: { "x-liora-admin": "1" },
      });
      const check = validateCsrfProtection(req);
      expect(check.valid).to.be.true;
    });

    it("Should reject cross-origin mutating requests with mismatched Origin and Host", function () {
      const req = createMockRequest({
        method: "POST",
        origin: "https://evil-attacker.com",
        host: "oxeniq.network",
      });
      const check = validateCsrfProtection(req);
      expect(check.valid).to.be.false;
      expect(check.reason).to.include("CSRF validation failed");
    });
  });
});
