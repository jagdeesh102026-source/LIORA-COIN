const { expect } = require("chai");

// Activate zero-dependency TypeScript loader for production modules
require("./helpers/tsLoader");

// Import the production botStore and types
const { botStore, DEFAULT_BOT_PLANS, INITIAL_SIMULATED_SIGNALS, INITIAL_PAPER_METRICS } = require("../apps/web/src/lib/bot/botStore.ts");

describe("Phase 19 — Trading Bot (ALGOX V6_1_24) Integration & Subscription Access Control", function () {
  beforeEach(function () {
    botStore.resetToDefaults();
  });

  // =========================================================================
  // JOURNEY A: Plan Configuration & Pricing Model
  // =========================================================================
  describe("Journey A: Bot Subscription Plans & Parameter Invariants", function () {
    it("Should provide 4 configured plans including 48-Hour Free Trial", function () {
      const config = botStore.getAdminConfig();
      expect(config.plans.length).to.equal(4);

      const trial = config.plans.find((p) => p.id === "TRIAL_48H");
      expect(trial).to.exist;
      expect(trial.priceUsd).to.equal(0);
      expect(trial.durationHours).to.equal(48);

      const monthly = config.plans.find((p) => p.id === "PLAN_MONTHLY");
      expect(monthly).to.exist;
      expect(monthly.priceUsd).to.equal(49);
      expect(monthly.durationDays).to.equal(30);

      const quarterly = config.plans.find((p) => p.id === "PLAN_QUARTERLY");
      expect(quarterly).to.exist;
      expect(quarterly.priceUsd).to.equal(119);
      expect(quarterly.durationDays).to.equal(90);

      const annual = config.plans.find((p) => p.id === "PLAN_ANNUAL");
      expect(annual).to.exist;
      expect(annual.priceUsd).to.equal(399);
      expect(annual.durationDays).to.equal(365);
    });

    it("Should calculate exact LIORA pricing at $0.05 per token benchmark", function () {
      const config = botStore.getAdminConfig();
      const monthly = config.plans.find((p) => p.id === "PLAN_MONTHLY");
      const quarterly = config.plans.find((p) => p.id === "PLAN_QUARTERLY");
      const annual = config.plans.find((p) => p.id === "PLAN_ANNUAL");

      // $49 / 0.05 = 980
      expect(monthly.priceLiora).to.equal(980);
      // $119 / 0.05 = 2380
      expect(quarterly.priceLiora).to.equal(2380);
      // $399 / 0.05 = 7980
      expect(annual.priceLiora).to.equal(7980);
    });
  });

  // =========================================================================
  // JOURNEY B: 48-Hour Free Trial Entitlement & Anti-Abuse
  // =========================================================================
  describe("Journey B: 48-Hour Free Trial Activation & Anti-Abuse Controls", function () {
    const testUserId = "usr_tester_trial_01";
    const testWallet = "0x1111222233334444555566667777888899990000";

    it("Should successfully activate a 48-hour free trial for an eligible user", function () {
      const beforeAccess = botStore.checkAccess(testUserId, testWallet);
      expect(beforeAccess.hasAccess).to.be.false;
      expect(beforeAccess.status).to.equal("NO_SUBSCRIPTION");

      const startTime = Date.now();
      const res = botStore.startFreeTrial(testUserId, testWallet, "tester_01");

      expect(res.success).to.be.true;
      expect(res.subscription).to.exist;
      expect(res.subscription.status).to.equal("TRIAL_ACTIVE");
      expect(res.subscription.trialUsed).to.be.true;

      // Verify expiration timestamp is approximately 48 hours in the future
      const expiryMs = new Date(res.subscription.trialExpiresAt).getTime();
      const expectedExpiryMs = startTime + 48 * 3600 * 1000;
      expect(expiryMs).to.be.closeTo(expectedExpiryMs, 2000);

      // Verify immediate access is granted
      const afterAccess = botStore.checkAccess(testUserId, testWallet);
      expect(afterAccess.hasAccess).to.be.true;
      expect(afterAccess.status).to.equal("TRIAL_ACTIVE");
      expect(afterAccess.remainingTimeMs).to.be.greaterThan(0);
      expect(afterAccess.formattedRemaining).to.include("h");
    });

    it("Should prevent duplicate trial redemption on the same user account (anti-abuse)", function () {
      // First redemption
      const first = botStore.startFreeTrial(testUserId, testWallet, "tester_01");
      expect(first.success).to.be.true;

      // Second redemption attempt
      const second = botStore.startFreeTrial(testUserId, testWallet, "tester_01");
      expect(second.success).to.be.false;
      expect(second.error).to.include("already redeemed");
    });

    it("Should prevent duplicate trial redemption with the same wallet on another account (Sybil defense)", function () {
      // Account 1 redeems trial with testWallet
      const first = botStore.startFreeTrial("usr_sybil_01", testWallet, "sybil_01");
      expect(first.success).to.be.true;

      // Account 2 attempts to redeem with the exact same wallet
      const second = botStore.startFreeTrial("usr_sybil_02", testWallet, "sybil_02");
      expect(second.success).to.be.false;
      expect(second.error).to.include("already redeemed a free trial on another account");
    });
  });

  // =========================================================================
  // JOURNEY C: Subscription State Transitions & Automatic Revocation
  // =========================================================================
  describe("Journey C: Subscription Lifecycle, Expiry Enforcement & Session Revocation", function () {
    const testUserId = "usr_lifecycle_01";
    const testWallet = "0x2222333344445555666677778888999900001111";

    it("Should automatically report TRIAL_EXPIRED when trial timestamp has elapsed", function () {
      botStore.startFreeTrial(testUserId, testWallet, "lifecycle_user");

      // Artificially simulate trial expiration by setting trialExpiresAt in the past
      const sub = botStore.getSubscription(testUserId, testWallet);
      sub.trialExpiresAt = new Date(Date.now() - 1000).toISOString(); // 1 sec ago

      const access = botStore.checkAccess(testUserId, testWallet);
      expect(access.hasAccess).to.be.false;
      expect(access.status).to.equal("TRIAL_EXPIRED");
      expect(access.remainingTimeMs).to.equal(0);
      expect(access.reason).to.include("Free Trial has expired");
    });

    it("Should upgrade an expired trial user to ACTIVE_PAID when subscribing to a plan", function () {
      // Start and expire trial
      botStore.startFreeTrial(testUserId, testWallet, "lifecycle_user");
      const sub = botStore.getSubscription(testUserId, testWallet);
      sub.trialExpiresAt = new Date(Date.now() - 1000).toISOString();

      // Subscribe to Pro Quarterly (90 days)
      const subRes = botStore.subscribePlan(testUserId, "PLAN_QUARTERLY", "USDT", testWallet);
      expect(subRes.success).to.be.true;
      expect(subRes.subscription.status).to.equal("ACTIVE_PAID");
      expect(subRes.subscription.paymentToken).to.equal("USDT");
      expect(subRes.subscription.paymentAmount).to.equal(119);

      const access = botStore.checkAccess(testUserId, testWallet);
      expect(access.hasAccess).to.be.true;
      expect(access.status).to.equal("ACTIVE_PAID");
      expect(access.remainingTimeMs).to.be.greaterThan(89 * 86400 * 1000);
    });

    it("Should automatically report EXPIRED when paid subscription duration has elapsed", function () {
      botStore.subscribePlan(testUserId, "PLAN_MONTHLY", "LIORA", testWallet);

      // Artificially simulate paid plan expiration
      const sub = botStore.getSubscription(testUserId, testWallet);
      sub.subscriptionExpiresAt = new Date(Date.now() - 5000).toISOString();

      const access = botStore.checkAccess(testUserId, testWallet);
      expect(access.hasAccess).to.be.false;
      expect(access.status).to.equal("EXPIRED");
      expect(access.remainingTimeMs).to.equal(0);
    });

    it("Should immediately revoke session and access when revokeSession is called", function () {
      botStore.subscribePlan(testUserId, "PLAN_ANNUAL", "USDT", testWallet);
      expect(botStore.checkAccess(testUserId, testWallet).hasAccess).to.be.true;

      const revoked = botStore.revokeSession(testUserId, "Security breach test");
      expect(revoked).to.be.true;

      const access = botStore.checkAccess(testUserId, testWallet);
      expect(access.hasAccess).to.be.false;
      expect(access.status).to.equal("REVOKED");
      expect(access.reason).to.include("revoked");

      const sub = botStore.getSubscription(testUserId, testWallet);
      expect(sub.lastSessionId).to.be.null;
      expect(sub.sessionRevokedAt).to.exist;
    });
  });

  // =========================================================================
  // JOURNEY D: Administrative Management & Overrides
  // =========================================================================
  describe("Journey D: Admin Plan Settings & Access Extension", function () {
    it("Should allow admin to reconfigure trial duration parameter", function () {
      botStore.adminSetTrialDuration(72); // 72 hours
      const config = botStore.getAdminConfig();
      expect(config.trialDurationHours).to.equal(72);

      // Verify new trial activation uses 72 hours
      const res = botStore.startFreeTrial("usr_72h_test", "0x3333444455556666777788889999000011112222");
      const expiryMs = new Date(res.subscription.trialExpiresAt).getTime();
      const expectedMs = Date.now() + 72 * 3600 * 1000;
      expect(expiryMs).to.be.closeTo(expectedMs, 2000);
    });

    it("Should allow admin to manually extend subscription days for a user", function () {
      const targetUser = "usr_extend_test";
      const targetWallet = "0x4444555566667777888899990000111122223333";

      botStore.subscribePlan(targetUser, "PLAN_MONTHLY", "USDT", targetWallet);
      const beforeSub = botStore.getSubscription(targetUser);
      const beforeExpires = new Date(beforeSub.subscriptionExpiresAt).getTime();

      // Extend by 15 days
      const extended = botStore.adminExtendSubscription(targetUser, 15);
      expect(extended).to.be.true;

      const afterSub = botStore.getSubscription(targetUser);
      const afterExpires = new Date(afterSub.subscriptionExpiresAt).getTime();
      expect(afterExpires - beforeExpires).to.be.closeTo(15 * 86400 * 1000, 2000);
    });
  });

  // =========================================================================
  // JOURNEY E: ALGOX V6_1_24 Signal Structure & Paper Trading Integrity
  // =========================================================================
  describe("Journey E: ALGOX V6_1_24 Pine Script v5 Signal Schema & Metrics", function () {
    it("Should maintain required strategy identifier and signal telemetry fields", function () {
      const signals = botStore.getSignals();
      expect(signals.length).to.be.at.least(5);

      for (const sig of signals) {
        expect(sig.id).to.be.a("string");
        expect(sig.strategy).to.equal("ALGOX V6_1_24");
        expect(sig.strategyVersion).to.include("Pine Script v5");
        expect(["LONG", "SHORT", "EXIT"]).to.include(sig.action);
        expect(sig.entryPrice).to.be.greaterThan(0);
        expect(sig.tp1).to.be.greaterThan(0);
        expect(sig.tp2).to.be.greaterThan(0);
        expect(sig.stopLoss).to.be.greaterThan(0);
        expect(sig.riskRewardRatio).to.be.greaterThan(0);
        expect(sig.isSimulated).to.be.true; // Mandatory simulated flag
      }
    });

    it("Should preserve paper-trading analytics and mathematical consistency", function () {
      const metrics = botStore.getPaperMetrics();
      expect(metrics.winRatePercent).to.be.within(50, 95);
      expect(metrics.profitFactor).to.be.greaterThan(1.5);
      expect(metrics.totalSimulatedTrades).to.equal(metrics.winningTrades + metrics.losingTrades);
      expect(metrics.maxDrawdownPercent).to.be.within(1, 20);
      expect(metrics.netPnlPercent).to.be.greaterThan(0);
    });
  });
});

