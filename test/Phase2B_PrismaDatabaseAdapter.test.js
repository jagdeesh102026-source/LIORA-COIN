const { expect } = require("chai");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

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

const { prismaDb } = require("../apps/web/src/lib/server/prismaDb");
const { prisma } = require("../apps/web/src/lib/server/prisma");

describe("LIORA COIN — Phase 2B Gate C2B-2: Prisma Database Adapter Integration Suite", function () {
  this.timeout(20000);

  after(async function () {
    await prisma.$disconnect();
  });

  // =========================================================================
  // STAGE A: IDENTITY & AUTHENTICATION
  // =========================================================================
  describe("Stage A: Identity & Authentication Integration", function () {
    it("STAGE A: Creates, retrieves, and updates users with strict role enforcement", async function () {
      const username = "adapter_user_" + crypto.randomUUID().slice(0, 8);
      const email = `${username}@oxeniq.network`;

      const created = await prismaDb.createUser({
        username,
        email,
        role: "TRADER",
        accountStatus: "ACTIVE",
        isDevelopmentOnly: true,
      });

      expect(created.id).to.be.a("string");
      expect(created.username).to.equal(username);
      expect(created.role).to.equal("TRADER");
      expect(created.accountStatus).to.equal("ACTIVE");

      const byId = await prismaDb.findUserById(created.id);
      expect(byId).to.not.be.null;
      expect(byId.id).to.equal(created.id);

      const byUsername = await prismaDb.findUserByUsername(username.toUpperCase());
      expect(byUsername).to.not.be.null;
      expect(byUsername.id).to.equal(created.id);

      const updated = await prismaDb.updateUser(created.id, {
        failedLoginAttempts: 3,
        role: "VIP",
      });
      expect(updated.failedLoginAttempts).to.equal(3);
      expect(updated.role).to.equal("VIP");
    });

    it("STAGE A: Links verified wallets with normalized lowercase and primary flag", async function () {
      const user = await prismaDb.createUser({
        username: "wallet_user_" + crypto.randomUUID().slice(0, 8),
      });

      const rawAddr1 = "0x" + crypto.randomBytes(20).toString("hex").toUpperCase();
      const rawAddr2 = "0x" + crypto.randomBytes(20).toString("hex").toUpperCase();

      const w1 = await prismaDb.linkVerifiedWallet({
        walletAddress: rawAddr1,
        userId: user.id,
        chainId: 97,
        nonceChallenge: "chal_1",
        signatureProof: "proof_1",
      });

      expect(w1.walletAddress).to.equal(rawAddr1.toLowerCase());
      expect(w1.isPrimary).to.be.true;

      const w2 = await prismaDb.linkVerifiedWallet({
        walletAddress: rawAddr2,
        userId: user.id,
        chainId: 97,
        nonceChallenge: "chal_2",
        signatureProof: "proof_2",
      });

      expect(w2.walletAddress).to.equal(rawAddr2.toLowerCase());
      expect(w2.isPrimary).to.be.false;

      const wallets = await prismaDb.getWalletsByUserId(user.id);
      expect(wallets.length).to.equal(2);
    });

    it("STAGE A: Issues and consumes single-use authentication nonces", async function () {
      const address = "0x" + crypto.randomBytes(20).toString("hex");
      const nonce = await prismaDb.createNonce(address, 60000);
      expect(nonce).to.be.a("string").with.lengthOf(32);

      const firstConsume = await prismaDb.consumeNonce(nonce, address);
      expect(firstConsume).to.be.true;

      // Replay attack defense
      const secondConsume = await prismaDb.consumeNonce(nonce, address);
      expect(secondConsume).to.be.false;
    });

    it("STAGE A: Creates, retrieves, and revokes trading bot sessions", async function () {
      const user = await prismaDb.createUser({
        username: "sess_user_" + crypto.randomUUID().slice(0, 8),
      });

      const session = await prismaDb.createSession(user.id, 12, "192.168.1.100");
      expect(session.sessionIdentifier).to.be.a("string");
      expect(session.isRevoked).to.be.false;

      const fetched = await prismaDb.getSession(session.sessionIdentifier);
      expect(fetched).to.not.be.null;
      expect(fetched.userId).to.equal(user.id);

      await prismaDb.revokeSession(session.sessionIdentifier, "SECURITY_LOGOUT");

      const afterRevoke = await prismaDb.getSession(session.sessionIdentifier);
      expect(afterRevoke).to.be.null;
    });

    it("STAGE A: Records structured audit logs with actor and severity", async function () {
      const user = await prismaDb.createUser({
        username: "auditor_" + crypto.randomUUID().slice(0, 8),
        role: "ADMIN",
      });

      const log = await prismaDb.createAuditLog({
        actorId: user.id,
        action: "CONFIG_UPDATE",
        entity: "SystemConfig",
        metadata: { key: "min_investment", val: 100 },
        severity: "WARNING",
      });

      expect(log.id).to.be.a("string");
      expect(log.severity).to.equal("WARNING");

      const logs = await prismaDb.getAuditLogs(10);
      const found = logs.find((l) => l.id === log.id);
      expect(found).to.not.be.undefined;
      expect(found.action).to.equal("CONFIG_UPDATE");
    });
  });

  // =========================================================================
  // STAGE B: INVESTOR & SUBSCRIPTION DATA
  // =========================================================================
  describe("Stage B: Investor & Subscription Integration", function () {
    it("STAGE B: Enforces idempotency on purchase intents", async function () {
      const user = await prismaDb.createUser({
        username: "intent_user_" + crypto.randomUUID().slice(0, 8),
      });
      const idemKey = "idem_intent_" + crypto.randomUUID().slice(0, 8);
      const wallet = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();
      const quoteId = "quote_intent_" + crypto.randomUUID().slice(0, 8);

      // Create prerequisite quote to satisfy quoteId foreign key
      await prisma.investorQuote.create({
        data: {
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

      const intent1 = await prismaDb.createPurchaseIntent({
        idempotencyKey: idemKey,
        userId: user.id,
        quoteId,
        walletAddress: wallet,
        amountUSD: 500,
        tokenQuantity: "10000000000000000000000",
      });

      const intent2 = await prismaDb.createPurchaseIntent({
        idempotencyKey: idemKey,
        userId: user.id,
        quoteId,
        walletAddress: wallet,
        amountUSD: 500,
        tokenQuantity: "10000000000000000000000",
      });

      expect(intent1.id).to.equal(intent2.id);
    });

    it("STAGE B: Creates investor allocations with duplicate purchase protection", async function () {
      const user = await prismaDb.createUser({
        username: "alloc_user_" + crypto.randomUUID().slice(0, 8),
      });
      const purchId = "purch_test_" + crypto.randomUUID().slice(0, 8);
      const idemKey = "idem_alloc_" + crypto.randomUUID().slice(0, 8);
      const wallet = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();

      const alloc = await prismaDb.createInvestorAllocation({
        purchaseId: purchId,
        idempotencyKey: idemKey,
        userId: user.id,
        walletAddress: wallet,
        investmentAmountUSD: 1000,
        tokenQuantity: "20000000000000000000000",
        lockTierMonths: 6,
        lockStartTimeUTC: new Date().toISOString(),
        unlockTimeUTC: new Date(Date.now() + 180 * 86400 * 1000).toISOString(),
        policyVersion: 1,
      });

      expect(alloc.purchaseId).to.equal(purchId);
      expect(alloc.investmentAmountUSD).to.equal(1000);

      // Re-execution with same idempotency key returns identical record
      const dupIdem = await prismaDb.createInvestorAllocation({
        purchaseId: purchId,
        idempotencyKey: idemKey,
        userId: user.id,
        walletAddress: wallet,
        investmentAmountUSD: 1000,
        tokenQuantity: "20000000000000000000000",
        lockTierMonths: 6,
        lockStartTimeUTC: new Date().toISOString(),
        unlockTimeUTC: new Date(Date.now() + 180 * 86400 * 1000).toISOString(),
        policyVersion: 1,
      });
      expect(dupIdem.id).to.equal(alloc.id);

      // Duplicate purchaseId without idempotency key throws error
      let dupFailed = false;
      try {
        await prismaDb.createInvestorAllocation({
          purchaseId: purchId,
          userId: user.id,
          walletAddress: wallet,
          investmentAmountUSD: 1000,
          tokenQuantity: "20000000000000000000000",
          lockTierMonths: 6,
          lockStartTimeUTC: new Date().toISOString(),
          unlockTimeUTC: new Date(Date.now() + 180 * 86400 * 1000).toISOString(),
          policyVersion: 1,
        });
      } catch (e) {
        dupFailed = true;
      }
      expect(dupFailed).to.be.true;
    });

    it("STAGE B: Records payments and reconciles blockchain reorganizations", async function () {
      const user = await prismaDb.createUser({
        username: "pay_user_" + crypto.randomUUID().slice(0, 8),
      });
      const wallet = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();
      await prismaDb.linkVerifiedWallet({
        walletAddress: wallet,
        userId: user.id,
        chainId: 97,
        nonceChallenge: "n",
        signatureProof: "p",
      });

      const txHash = "0x" + crypto.randomBytes(32).toString("hex").toLowerCase();

      const payment = await prismaDb.recordPayment({
        txHash,
        chainId: 97,
        tokenAddress: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
        payingWallet: wallet,
        treasuryAddress: "0x1111111111111111111111111111111111111111",
        amount: 250,
        tokenSymbol: "USDT",
        status: "CONFIRMED",
        blockNumber: 99887766,
      });

      expect(payment.txHash).to.equal(txHash);
      expect(payment.status).to.equal("CONFIRMED");

      // Flag deep blockchain reorganization
      const flagged = await prismaDb.flagReorganization(txHash, "DEEP_REORG_5_BLOCKS");
      expect(flagged.reorgDetected).to.be.true;
      expect(flagged.status).to.equal("FAILED");
    });

    it("STAGE B: Activates trial and enforces single-redemption rule per user and wallet", async function () {
      const user1 = await prismaDb.createUser({
        username: "trial_u1_" + crypto.randomUUID().slice(0, 8),
      });
      const user2 = await prismaDb.createUser({
        username: "trial_u2_" + crypto.randomUUID().slice(0, 8),
      });
      const wallet = "0x" + crypto.randomBytes(20).toString("hex").toLowerCase();

      const trial = await prismaDb.activateTrial(user1.id, wallet, 48);
      expect(trial.userId).to.equal(user1.id);
      expect(trial.trialUsed).to.be.true;

      // User cannot activate twice
      let userTwiceFailed = false;
      try {
        await prismaDb.activateTrial(user1.id, "0x" + crypto.randomBytes(20).toString("hex"), 48);
      } catch (e) {
        userTwiceFailed = true;
      }
      expect(userTwiceFailed).to.be.true;

      // Wallet cannot be used twice by different user
      let walletTwiceFailed = false;
      try {
        await prismaDb.activateTrial(user2.id, wallet, 48);
      } catch (e) {
        walletTwiceFailed = true;
      }
      expect(walletTwiceFailed).to.be.true;
    });
  });

  // =========================================================================
  // STAGE C: FINANCIAL ACCOUNTING & TRANSACTIONS
  // =========================================================================
  describe("Stage C: Financial Accounting & Balance Integration", function () {
    it("STAGE C: Records balance movements with exact integer base units", async function () {
      const user = await prismaDb.createUser({
        username: "fin_user_" + crypto.randomUUID().slice(0, 8),
      });

      const { balance: bal1, movement: mov1 } = await prismaDb.recordBalanceMovement({
        userId: user.id,
        tokenSymbol: "LIORA",
        amount: 100,
        amountRaw: "100000000000000000000",
        entryType: "CREDIT",
        reason: "DEPOSIT",
        isDemo: false,
      });

      expect(bal1.balance).to.equal(100);
      expect(bal1.balanceRaw).to.equal("100000000000000000000");

      const { balance: bal2, movement: mov2 } = await prismaDb.recordBalanceMovement({
        userId: user.id,
        tokenSymbol: "LIORA",
        amount: 30,
        amountRaw: "30000000000000000000",
        entryType: "DEBIT",
        reason: "TRADE",
        isDemo: false,
      });

      expect(bal2.balance).to.equal(70);
      expect(bal2.balanceRaw).to.equal("70000000000000000000");

      // Insufficient balance rejection
      let debitFailed = false;
      try {
        await prismaDb.recordBalanceMovement({
          userId: user.id,
          tokenSymbol: "LIORA",
          amount: 200,
          amountRaw: "200000000000000000000",
          entryType: "DEBIT",
          reason: "TRADE",
          isDemo: false,
        });
      } catch (e) {
        debitFailed = true;
      }
      expect(debitFailed).to.be.true;
    });

    it("STAGE C: Guarantees 100% atomic rollback on transaction errors", async function () {
      const user = await prismaDb.createUser({
        username: "atomic_user_" + crypto.randomUUID().slice(0, 8),
      });

      const orderId = "ord_fail_" + crypto.randomUUID().slice(0, 8);

      let txError = false;
      try {
        await prismaDb.transaction(async (tx) => {
          await tx.createTradingOrder({
            orderId,
            userId: user.id,
            pair: "LIORA/USDT",
            side: "BUY",
            amount: 50,
            amountRaw: "50000000000000000000",
            price: 0.1,
            isDemoOrder: false,
          });

          // Simulate downstream business exception
          throw new Error("SIMULATED_TRANSACTION_FAILURE");
        });
      } catch (err) {
        txError = true;
      }

      expect(txError).to.be.true;

      // Verify trading order was rolled back completely
      const order = await prismaDb.getTradingOrder(orderId);
      expect(order).to.be.null;
    });

    it("STAGE C: Maintains strict isolation between demo and live balances", async function () {
      const user = await prismaDb.createUser({
        username: "demo_iso_" + crypto.randomUUID().slice(0, 8),
      });

      await prismaDb.recordBalanceMovement({
        userId: user.id,
        tokenSymbol: "LIORA",
        amount: 10000,
        amountRaw: "10000000000000000000000",
        entryType: "CREDIT",
        reason: "DEPOSIT",
        isDemo: true,
      });

      await prismaDb.recordBalanceMovement({
        userId: user.id,
        tokenSymbol: "LIORA",
        amount: 250,
        amountRaw: "250000000000000000000",
        entryType: "CREDIT",
        reason: "DEPOSIT",
        isDemo: false,
      });

      const demoBal = await prismaDb.getTokenBalance(user.id, "LIORA", true);
      const liveBal = await prismaDb.getTokenBalance(user.id, "LIORA", false);

      expect(demoBal.balance).to.equal(10000);
      expect(demoBal.isDemoBalance).to.be.true;

      expect(liveBal.balance).to.equal(250);
      expect(liveBal.isDemoBalance).to.be.false;
    });
  });
});
