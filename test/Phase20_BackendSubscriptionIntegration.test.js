const { expect } = require("chai");

// Activate zero-dependency TypeScript loader for production modules
require("./helpers/tsLoader");

// Import the production backend modules
const { serverDb } = require("../apps/web/src/lib/server/db.ts");
const { getTradingBotAccess, formatDuration } = require("../apps/web/src/lib/server/entitlementService.ts");
const {
  verifyAndRecordPayment,
  OFFICIAL_TREASURY_ADDRESS,
  ACCEPTED_CHAINS,
  TOKEN_CONTRACTS,
} = require("../apps/web/src/lib/server/paymentVerification.ts");

describe("Phase 20 — Backend, Wallet Authentication, 48h Free Trial & Subscriptions", function () {
  before(function () {
    process.env.OXENIQ_PERSISTENCE_MODE = "memory";
  });

  after(function () {
    process.env.OXENIQ_PERSISTENCE_MODE = "postgres";
  });

  beforeEach(function () {
    serverDb.resetAll();
  });

  // =========================================================================
  // JOURNEY A: Cryptographic Wallet Authentication & SIWE Replay Defense
  // =========================================================================
  describe("Journey A: Cryptographic Wallet Authentication (SIWE / EIP-4361)", function () {
    const testWallet = "0x71c8409e51e2063f1ff764b8c06f7e8ea9f2309c";
    const userAlexId = "usr_alex_001";
    const userDanId = "usr_dan_002";

    it("Should generate single-use nonce with 5-minute TTL", async function () {
      const nonce = await serverDb.createNonce(testWallet, 5 * 60 * 1000);
      expect(nonce).to.be.a("string");
      expect(nonce.length).to.be.at.least(16);
    });

    it("Should successfully consume a valid nonce once", async function () {
      const nonce = await serverDb.createNonce(testWallet);
      const isValid = await serverDb.consumeNonce(nonce, testWallet);
      expect(isValid).to.be.true;
    });

    it("Should reject replayed nonces immediately (replay defense)", async function () {
      const nonce = await serverDb.createNonce(testWallet);
      const firstUse = await serverDb.consumeNonce(nonce, testWallet);
      expect(firstUse).to.be.true;

      // Second attempt with the same nonce MUST fail
      const secondUse = await serverDb.consumeNonce(nonce, testWallet);
      expect(secondUse).to.be.false;
    });

    it("Should reject an expired nonce past its TTL", async function () {
      // 1 millisecond TTL
      const nonce = await serverDb.createNonce(testWallet, -100);
      const isValid = await serverDb.consumeNonce(nonce, testWallet);
      expect(isValid).to.be.false;
    });

    it("Should reject nonce verification if presented by an address mismatch", async function () {
      const nonce = await serverDb.createNonce(testWallet);
      const wrongWallet = "0x1111111111111111111111111111111111111111";
      const isValid = await serverDb.consumeNonce(nonce, wrongWallet);
      expect(isValid).to.be.false;
    });

    it("Should link verified wallet to user account and prevent cross-account theft", async function () {
      // Alex links testWallet
      const record = await serverDb.linkVerifiedWallet({
        walletAddress: testWallet,
        userId: userAlexId,
        chainId: 97,
        signatureProof: "valid_mock_sig",
        nonceChallenge: "valid_nonce_1",
      });
      expect(record.walletAddress).to.equal(testWallet.toLowerCase());
      expect(record.userId).to.equal(userAlexId);

      // Dan attempts to claim the same verified wallet -> MUST REJECT
      let errorThrown = false;
      try {
        await serverDb.linkVerifiedWallet({
          walletAddress: testWallet,
          userId: userDanId,
          chainId: 97,
          signatureProof: "malicious_spoof_sig",
          nonceChallenge: "valid_nonce_2",
        });
      } catch (err) {
        errorThrown = true;
        expect(err.message).to.include("already linked to another account");
      }
      expect(errorThrown).to.be.true;
    });
  });

  // =========================================================================
  // JOURNEY B: Authoritative 48-Hour Free Trial Backend & Anti-Abuse
  // =========================================================================
  describe("Journey B: Real 48-Hour Free Trial Backend & Anti-Abuse Controls", function () {
    const userAlexId = "usr_alex_001";
    const userDanId = "usr_dan_002";
    const walletAlex = "0x71c8409e51e2063f1ff764b8c06f7e8ea9f2309c";
    const walletDan = "0x8888888888888888888888888888888888888888";

    it("Should activate trial with server-authoritative 48-hour expiration", async function () {
      const trial = await serverDb.activateTrial(userAlexId, walletAlex, 48);

      expect(trial.userId).to.equal(userAlexId);
      expect(trial.walletAddress).to.equal(walletAlex.toLowerCase());
      expect(trial.trialUsed).to.equal(true);

      const startMs = new Date(trial.startedAt).getTime();
      const expMs = new Date(trial.expiresAt).getTime();
      const durationHours = (expMs - startMs) / (3600 * 1000);
      expect(Math.round(durationHours)).to.equal(48);

      const access = await getTradingBotAccess(userAlexId, walletAlex);
      expect(access.hasAccess).to.be.true;
      expect(access.status).to.equal("TRIAL_ACTIVE");
      expect(access.accessType).to.equal("TRIAL");
    });

    it("Should enforce UNIQUE(userId): reject duplicate trial activation on the same account", async function () {
      await serverDb.activateTrial(userAlexId, walletAlex, 48);

      let duplicateBlocked = false;
      try {
        await serverDb.activateTrial(userAlexId, "0x9999999999999999999999999999999999999999", 48);
      } catch (err) {
        duplicateBlocked = true;
        expect(err.message).to.include("already redeemed the 48-Hour Free Trial");
      }
      expect(duplicateBlocked).to.be.true;
    });

    it("Should enforce UNIQUE(walletAddress): reject Sybil abuse where same wallet is used on a new account", async function () {
      // Alex uses walletAlex
      await serverDb.activateTrial(userAlexId, walletAlex, 48);

      // Dan tries to use walletAlex on a separate user account
      let sybilBlocked = false;
      try {
        await serverDb.activateTrial(userDanId, walletAlex, 48);
      } catch (err) {
        sybilBlocked = true;
        expect(err.message).to.include("wallet address has already been used");
      }
      expect(sybilBlocked).to.be.true;
    });

    it("Should automatically report TRIAL_EXPIRED when server time exceeds 48 hours", async function () {
      // Create an expired trial
      const trial = await serverDb.activateTrial(userAlexId, walletAlex, 48);

      // Mutate expiresAt to the past (server time simulation)
      const pastDate = new Date(Date.now() - 1000 * 60).toISOString(); // 1 minute ago
      const sub = await serverDb.getSubscriptionByUserId(userAlexId);
      sub.expiresAt = pastDate;
      await serverDb.setSubscription(sub);

      const access = await getTradingBotAccess(userAlexId, walletAlex);
      expect(access.hasAccess).to.be.false;
      expect(access.status).to.equal("TRIAL_EXPIRED");
      expect(access.reason).to.include("48-Hour Free Trial has expired");
    });
  });

  // =========================================================================
  // JOURNEY C: Subscription Plans & Precision Renewal Mathematics
  // =========================================================================
  describe("Journey C: Subscription Plans & Precision Renewal Mathematics", function () {
    const userAlexId = "usr_alex_001";
    const walletAlex = "0x71c8409e51e2063f1ff764b8c06f7e8ea9f2309c";

    it("Should retrieve the 3 configured active subscription plans", async function () {
      const plans = await serverDb.getPlans();
      expect(plans.length).to.equal(3);

      const monthly = plans.find((p) => p.id === "PLAN_MONTHLY");
      expect(monthly.durationDays).to.equal(30);
      expect(monthly.priceUsd).to.equal(49);
      expect(monthly.priceLiora).to.equal(980);

      const quarterly = plans.find((p) => p.id === "PLAN_QUARTERLY");
      expect(quarterly.durationDays).to.equal(90);
      expect(quarterly.priceUsd).to.equal(119);
      expect(quarterly.priceLiora).to.equal(2380);

      const annual = plans.find((p) => p.id === "PLAN_ANNUAL");
      expect(annual.durationDays).to.equal(365);
      expect(annual.priceUsd).to.equal(399);
      expect(annual.priceLiora).to.equal(7980);
    });

    it("Should upgrade an expired trial user to ACTIVE_PAID upon subscription", async function () {
      // First activate trial
      await serverDb.activateTrial(userAlexId, walletAlex, 48);

      // Now subscribe to Trader Monthly
      const sub = await serverDb.renewSubscription(userAlexId, "PLAN_MONTHLY", "tx_valid_001");
      expect(sub.status).to.equal("ACTIVE_PAID");
      expect(sub.planId).to.equal("PLAN_MONTHLY");

      const access = await getTradingBotAccess(userAlexId, walletAlex);
      expect(access.hasAccess).to.be.true;
      expect(access.status).to.equal("ACTIVE_PAID");
      expect(access.accessType).to.equal("PAID");
    });

    it("Should correctly perform early renewal by extending existing expiration without truncation", async function () {
      // First subscription: 30 days
      const firstSub = await serverDb.renewSubscription(userAlexId, "PLAN_MONTHLY", "tx_first_001");
      const firstExpMs = new Date(firstSub.expiresAt).getTime();

      // Early renewal: User renews with Pro Quarterly (90 days) while 30-day plan is still active
      const renewedSub = await serverDb.renewSubscription(userAlexId, "PLAN_QUARTERLY", "tx_second_002");
      const renewedExpMs = new Date(renewedSub.expiresAt).getTime();

      // The new expiration MUST equal firstExpMs + (90 * 24 * 3600 * 1000)
      const expectedExpMs = firstExpMs + 90 * 24 * 3600 * 1000;
      expect(Math.abs(renewedExpMs - expectedExpMs)).to.be.lessThan(2000); // within 2s tolerance
    });

    it("Should immediately revoke access when revokeSubscription is called", async function () {
      await serverDb.renewSubscription(userAlexId, "PLAN_MONTHLY", "tx_paid_001");

      const revoked = await serverDb.revokeSubscription(userAlexId, "Manual admin fraud check", "usr_dan_002");
      expect(revoked.status).to.equal("REVOKED");
      expect(revoked.isRevoked).to.be.true;

      const access = await getTradingBotAccess(userAlexId, walletAlex);
      expect(access.hasAccess).to.be.false;
      expect(access.status).to.equal("REVOKED");
      expect(access.reason).to.include("Manual admin fraud check");
    });
  });

  // =========================================================================
  // JOURNEY D: On-Chain Payment Verification & Double-Spend Idempotency
  // =========================================================================
  describe("Journey D: On-Chain Payment Verification & Idempotency", function () {
    const userAlexId = "usr_alex_001";
    const walletAlex = "0x71c8409e51e2063f1ff764b8c06f7e8ea9f2309c";
    const validTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    it("Should verify and record a valid simulated BSC Testnet payment", async function () {
      const result = await verifyAndRecordPayment({
        txHash: validTxHash,
        chainId: ACCEPTED_CHAINS.BSC_TESTNET,
        tokenSymbol: "USDT",
        tokenAddress: TOKEN_CONTRACTS.USDT_TESTNET,
        payingWallet: walletAlex,
        treasuryAddress: OFFICIAL_TREASURY_ADDRESS,
        expectedAmount: 49,
        subscriptionPlanId: "PLAN_MONTHLY",
        userId: userAlexId,
        isMockTest: true,
      });

      expect(result.isValid).to.be.true;
      expect(result.status).to.equal("CONFIRMED");
      expect(result.confirmations).to.be.at.least(1);
    });

    it("Should enforce UNIQUE(txHash): reject duplicate transaction hash replay (double-spending)", async function () {
      // First submission succeeds
      const firstRes = await verifyAndRecordPayment({
        txHash: validTxHash,
        chainId: ACCEPTED_CHAINS.BSC_TESTNET,
        tokenSymbol: "USDT",
        tokenAddress: TOKEN_CONTRACTS.USDT_TESTNET,
        payingWallet: walletAlex,
        treasuryAddress: OFFICIAL_TREASURY_ADDRESS,
        expectedAmount: 49,
        subscriptionPlanId: "PLAN_MONTHLY",
        userId: userAlexId,
        isMockTest: true,
      });
      expect(firstRes.isValid).to.be.true;

      // Second submission with identical txHash MUST fail closed
      const duplicateRes = await verifyAndRecordPayment({
        txHash: validTxHash,
        chainId: ACCEPTED_CHAINS.BSC_TESTNET,
        tokenSymbol: "USDT",
        tokenAddress: TOKEN_CONTRACTS.USDT_TESTNET,
        payingWallet: walletAlex,
        treasuryAddress: OFFICIAL_TREASURY_ADDRESS,
        expectedAmount: 49,
        subscriptionPlanId: "PLAN_MONTHLY",
        userId: userAlexId,
        isMockTest: true,
      });

      expect(duplicateRes.isValid).to.be.false;
      expect(duplicateRes.error).to.include("already been credited");
    });

    it("Should reject payments sent to an incorrect treasury address", async function () {
      const wrongTreasury = "0x2222222222222222222222222222222222222222";
      const result = await verifyAndRecordPayment({
        txHash: "0x1111222233334444555566667777888899990000111122223333444455556666",
        chainId: ACCEPTED_CHAINS.BSC_TESTNET,
        tokenSymbol: "USDT",
        tokenAddress: TOKEN_CONTRACTS.USDT_TESTNET,
        payingWallet: walletAlex,
        treasuryAddress: wrongTreasury,
        expectedAmount: 49,
        subscriptionPlanId: "PLAN_MONTHLY",
        userId: userAlexId,
        isMockTest: true,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Invalid recipient treasury address");
    });

    it("Should reject payments on an unsupported blockchain network", async function () {
      const unsupportedChain = 1; // Ethereum Mainnet (only BSC accepted)
      const result = await verifyAndRecordPayment({
        txHash: "0x9999888877776666555544443333222211110000999988887777666655554444",
        chainId: unsupportedChain,
        tokenSymbol: "USDT",
        tokenAddress: TOKEN_CONTRACTS.USDT_TESTNET,
        payingWallet: walletAlex,
        treasuryAddress: OFFICIAL_TREASURY_ADDRESS,
        expectedAmount: 49,
        subscriptionPlanId: "PLAN_MONTHLY",
        userId: userAlexId,
        isMockTest: true,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Unsupported chain ID");
    });
  });

  // =========================================================================
  // JOURNEY E: Security, Audit Logging & Access Cutoffs
  // =========================================================================
  describe("Journey E: Security, Audit Logging & Access Cutoffs", function () {
    const userAlexId = "usr_alex_001";
    const walletAlex = "0x71c8409e51e2063f1ff764b8c06f7e8ea9f2309c";

    it("Should deny access for non-existent user accounts", async function () {
      const access = await getTradingBotAccess("usr_ghost_999", walletAlex);
      expect(access.hasAccess).to.be.false;
      expect(access.reason).to.include("User account not found");
    });

    it("Should deny access for suspended or banned user accounts", async function () {
      await serverDb.updateUser(userAlexId, { accountStatus: "BANNED" });
      const access = await getTradingBotAccess(userAlexId, walletAlex);
      expect(access.hasAccess).to.be.false;
      expect(access.isRevoked).to.be.true;
      expect(access.reason).to.include("Account status is BANNED");
    });

    it("Should record structured audit logs for trial activation and subscription events", async function () {
      await serverDb.activateTrial(userAlexId, walletAlex, 48);
      await serverDb.renewSubscription(userAlexId, "PLAN_MONTHLY", "tx_audit_test_01");

      const logs = await serverDb.getAuditLogs(10);
      expect(logs.length).to.be.at.least(2);

      const trialLog = logs.find((l) => l.action === "TRIAL_ACTIVATED");
      expect(trialLog).to.exist;
      expect(trialLog.actorId).to.equal(userAlexId);
      expect(trialLog.entity).to.equal("TradingBotTrial");

      const subLog = logs.find((l) => l.action === "SUBSCRIPTION_RENEWED");
      expect(subLog).to.exist;
      expect(subLog.actorId).to.equal(userAlexId);
      expect(subLog.entity).to.equal("TradingBotSubscription");
    });

    it("Should correctly format countdown duration string in HH:MM:SS", function () {
      const oneHourFortyMinutes = (1 * 3600 + 40 * 60 + 25) * 1000;
      expect(formatDuration(oneHourFortyMinutes)).to.equal("01:40:25");

      const zeroMs = 0;
      expect(formatDuration(zeroMs)).to.equal("00:00:00");
    });
  });
});

