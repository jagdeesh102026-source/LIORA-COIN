const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

// Activate zero-dependency TypeScript loader for production modules
require("./helpers/tsLoader");

// Import the production demoStore directly
const { demoStore, DEFAULT_ACTIVE_USER, SEED_USERS } = require("../apps/web/src/lib/demo/demoStore.ts");

describe("Phase 18 — Liora Coin (LIORA) Exchange Demo Readiness & Authentication Journeys", function () {
  beforeEach(function () {
    // Reset store to fresh default seed state before each test
    demoStore.resetToDefaults();
  });

  // =========================================================================
  // JOURNEY A: Login, Profile, Balances & Logout
  // =========================================================================
  describe("Journey A: Demo User Login, Profile Verification & Logout", function () {
    it("Should successfully log in with valid username @trader_alex and demo password", function () {
      const res = demoStore.login("trader_alex", "OxeniqDemo2026!");
      expect(res.success).to.be.true;
      expect(res.user).to.exist;
      expect(res.user.username).to.equal("trader_alex");
      expect(res.user.email).to.equal("trader@oxeniq.com");
      expect(res.user.referralCode).to.equal("OX-789421");

      const active = demoStore.getActiveUser();
      expect(active).to.exist;
      expect(active.id).to.equal(DEFAULT_ACTIVE_USER.id);
      expect(active.username).to.equal("trader_alex");
    });

    it("Should allow login by email address (case-insensitive)", function () {
      const res = demoStore.login("TRADER@OXENIQ.COM", "OxeniqDemo2026!");
      expect(res.success).to.be.true;
      expect(res.user.username).to.equal("trader_alex");
    });

    it("Should provide isolated, correct initial balances for Alex Mercer", function () {
      demoStore.login("trader_alex", "OxeniqDemo2026!");
      const tokens = demoStore.getTokens();

      const liora = tokens.find((t) => t.symbol === "LIORA");
      const usdt = tokens.find((t) => t.symbol === "USDT");
      const bnb = tokens.find((t) => t.symbol === "BNB");

      expect(liora).to.exist;
      expect(liora.name).to.equal("Liora Coin");
      expect(liora.userBalance).to.equal(12500);
      expect(usdt.userBalance).to.equal(2450.0);
      expect(bnb.userBalance).to.equal(4.85);
    });

    it("Should successfully clear active user session on logout", function () {
      demoStore.login("trader_alex", "OxeniqDemo2026!");
      expect(demoStore.getActiveUser()).to.exist;

      demoStore.logout();
      expect(demoStore.getActiveUser()).to.be.null;
    });
  });

  // =========================================================================
  // JOURNEY B: Invalid Login Rejected & No Duplicate Accounts
  // =========================================================================
  describe("Journey B: Input Validation, Invalid Login & Safe Registration", function () {
    it("Should reject login with empty username or whitespace", function () {
      const res = demoStore.login("   ", "OxeniqDemo2026!");
      expect(res.success).to.be.false;
      expect(res.error).to.include("username or email");
    });

    it("Should reject login with empty password", function () {
      const res = demoStore.login("trader_alex", "   ");
      expect(res.success).to.be.false;
      expect(res.error).to.include("password");
    });

    it("Should reject unknown username and NEVER create duplicate or phantom accounts", function () {
      const initialUserCount = demoStore.getAllUsers().length;
      const res = demoStore.login("non_existent_ghost_trader", "SomePassword123!");

      expect(res.success).to.be.false;
      expect(res.error).to.include("not found");

      // Verify no account was auto-created in users collection
      const postUserCount = demoStore.getAllUsers().length;
      expect(postUserCount).to.equal(initialUserCount);
      expect(demoStore.getActiveUser()).to.not.equal("non_existent_ghost_trader");
    });

    it("Should reject login with incorrect password for an existing account", function () {
      const res = demoStore.login("trader_alex", "WrongPassword123!");
      expect(res.success).to.be.false;
      expect(res.error).to.include("Incorrect password");
    });

    it("Should validate registration inputs (minimum length, email format)", function () {
      const shortUser = demoStore.register("al", "al@test.com", "pass123");
      expect(shortUser.success).to.be.false;
      expect(shortUser.error).to.include("at least 3 characters");

      const invalidEmail = demoStore.register("valid_user", "invalid-email", "pass123");
      expect(invalidEmail.success).to.be.false;
      expect(invalidEmail.error).to.include("valid email");
    });

    it("Should prevent duplicate account creation if username or email is already taken", function () {
      const res = demoStore.register("trader_alex", "different_email@oxeniq.com", "Pass123!");
      expect(res.success).to.be.false;
      expect(res.error).to.include("already exists");

      const res2 = demoStore.register("brand_new_user", "trader@oxeniq.com", "Pass123!");
      expect(res2.success).to.be.false;
      expect(res2.error).to.include("already exists");
    });

    it("Should register a new user and assign isolated default portfolio balances", function () {
      const initialCount = demoStore.getAllUsers().length;
      const reg = demoStore.register("crypto_novice", "novice@oxeniq.com", "OxeniqDemo2026!");

      expect(reg.success).to.be.true;
      expect(reg.user.username).to.equal("crypto_novice");
      expect(demoStore.getAllUsers().length).to.equal(initialCount + 1);

      // Verify novice gets isolated new-user balances, NOT Alex's balances
      const noviceTokens = demoStore.getTokens(reg.user.id);
      const noviceLiora = noviceTokens.find((t) => t.symbol === "LIORA");
      expect(noviceLiora.userBalance).to.equal(2500); // Default starting balance
      expect(noviceLiora.userBalance).to.not.equal(12500);
    });
  });

  // =========================================================================
  // JOURNEY C: Exchange Quotes & Swap Execution
  // =========================================================================
  describe("Journey C: Mobniq-Inspired Exchange Card, Rate Calculations & Swaps", function () {
    it("Should return accurate SwapQuote for USDT -> LIORA", function () {
      // 100 USDT at $1.00 each = $100 USD. 1 LIORA = $0.05, so 100 USDT = 2,000 LIORA
      const quote = demoStore.calculateQuote("USDT", "LIORA", 100, 0.5);

      expect(quote).to.exist;
      expect(quote.toToken).to.equal("LIORA");
      expect(quote.fromAmount).to.equal(100);
      expect(quote.toAmount).to.equal(2000);
      expect(quote.exchangeRate).to.equal(20);
      expect(quote.slippagePercent).to.equal(0.5);
      expect(quote.minimumReceived).to.be.closeTo(1990, 0.1);
      expect(quote.estimatedFeeBnb).to.be.greaterThan(0);
      expect(quote.routing).to.include("PancakeSwap");
    });

    it("Should preserve backward-compatible symbol normalization for legacy OXENIQ lookups and quotes", function () {
      const legacyToken = demoStore.getToken("OXENIQ");
      expect(legacyToken).to.exist;
      expect(legacyToken.symbol).to.equal("LIORA");

      const legacyQuote = demoStore.calculateQuote("USDT", "OXENIQ", 50, 0.5);
      expect(legacyQuote).to.exist;
      expect(legacyQuote.toToken).to.equal("LIORA");
      expect(legacyQuote.toAmount).to.equal(1000);
    });

    it("Should calculate quotes accurately for LIORA/BNB, LIORA/BTC, and LIORA/ETH demo pairs", function () {
      const bnbQuote = demoStore.calculateQuote("BNB", "LIORA", 1, 0.5);
      const btcQuote = demoStore.calculateQuote("BTC", "LIORA", 0.01, 0.5);
      const ethQuote = demoStore.calculateQuote("ETH", "LIORA", 0.1, 0.5);

      expect(bnbQuote.toAmount).to.be.greaterThan(0);
      expect(btcQuote.toAmount).to.be.greaterThan(0);
      expect(ethQuote.toAmount).to.be.greaterThan(0);
    });

    it("Should return null for zero or negative amount quotes", function () {
      expect(demoStore.calculateQuote("USDT", "LIORA", 0)).to.be.null;
      expect(demoStore.calculateQuote("USDT", "LIORA", -50)).to.be.null;
    });

    it("Should execute swap, update balances, and generate simulated transaction", function () {
      demoStore.login("trader_alex", "OxeniqDemo2026!");
      const beforeTokens = demoStore.getTokens();
      const beforeUsdt = beforeTokens.find((t) => t.symbol === "USDT").userBalance;
      const beforeLiora = beforeTokens.find((t) => t.symbol === "LIORA").userBalance;

      const quote = demoStore.calculateQuote("USDT", "LIORA", 200, 0.5);
      const tx = demoStore.executeSwap(quote);

      expect(tx).to.exist;
      expect(tx.isSimulated).to.be.true;
      expect(tx.status).to.equal("COMPLETED");
      expect(tx.fromAmount).to.equal(200);
      expect(tx.toAmount).to.equal(4000);

      // Check balance updates
      const afterTokens = demoStore.getTokens();
      const afterUsdt = afterTokens.find((t) => t.symbol === "USDT").userBalance;
      const afterLiora = afterTokens.find((t) => t.symbol === "LIORA").userBalance;

      expect(afterUsdt).to.equal(beforeUsdt - 200);
      expect(afterLiora).to.equal(beforeLiora + 4000);

      // Verify transaction is recorded in user history
      const history = demoStore.getTransactions();
      expect(history[0].id).to.equal(tx.id);
    });
  });

  // =========================================================================
  // JOURNEY D: 3-Level Referral Tree & Commission Claiming
  // =========================================================================
  describe("Journey D: 3-Level Referral Network & Commission Attribution", function () {
    it("Should attribute commissions to upline sponsors (L1: 5%, L2: 3%, L3: 1%) when a member trades", function () {
      // Alex Mercer (OX-789421) has sponsor Emily (OX-MASTER7), who has sponsor David (OX-VIP88), who has Sarah (OX-ELITE1)
      demoStore.login("trader_alex", "OxeniqDemo2026!");
      const quote = demoStore.calculateQuote("USDT", "LIORA", 1000, 0.5); // $1000 volume
      const tx = demoStore.executeSwap(quote);

      const allComms = demoStore.getAllCommissions();

      // Find commissions originating from this transaction
      const txComms = allComms.filter((c) => c.transactionId === tx.id);
      expect(txComms.length).to.be.at.least(3);

      const l1 = txComms.find((c) => c.level === 1);
      const l2 = txComms.find((c) => c.level === 2);
      const l3 = txComms.find((c) => c.level === 3);

      expect(l1.commissionRatePercent).to.equal(5.0);
      expect(l2.commissionRatePercent).to.equal(3.0);
      expect(l3.commissionRatePercent).to.equal(1.0);

      // 5% of $1000 = $50 = 1,000 LIORA (at $0.05/LIORA)
      expect(l1.amount).to.equal(1000);
      // 3% of $1000 = $30 = 600 LIORA
      expect(l2.amount).to.equal(600);
      // 1% of $1000 = $10 = 200 LIORA
      expect(l3.amount).to.equal(200);
    });

    it("Should accurately compute referral summaries and network member counts", function () {
      demoStore.login("trader_alex", "OxeniqDemo2026!");
      const summaries = demoStore.getReferralSummaries();

      expect(summaries.level1.memberCount).to.equal(3); // 3 direct downlines in seed
      expect(summaries.level2.memberCount).to.equal(2); // 2 level 2 downlines in seed
      expect(summaries.level3.memberCount).to.equal(1); // 1 level 3 downline in seed
      expect(summaries.totalNetworkCount).to.equal(6);
    });

    it("Should allow claiming approved commissions and credit user balances", function () {
      demoStore.login("trader_alex", "OxeniqDemo2026!");
      const beforeTokens = demoStore.getTokens();
      const beforeLiora = beforeTokens.find((t) => t.symbol === "LIORA").userBalance;

      // Seed has comm_seed_001 with 1200 LIORA in APPROVED status for Alex
      const claimResult = demoStore.claimAllCommissions();
      expect(claimResult.claimedLiora).to.be.greaterThan(0);
      expect(claimResult.claimedOxeniq).to.equal(claimResult.claimedLiora);

      const afterTokens = demoStore.getTokens();
      const afterLiora = afterTokens.find((t) => t.symbol === "LIORA").userBalance;
      expect(afterLiora).to.equal(beforeLiora + claimResult.claimedLiora);

      // Verify status changed to PAID
      const remainingUnclaimed = demoStore
        .getCommissions()
        .filter((c) => c.status === "APPROVED");
      expect(remainingUnclaimed.length).to.equal(0);
    });
  });

  // =========================================================================
  // JOURNEY E: Admin Console & Security Role Safeguard
  // =========================================================================
  describe("Journey E: Admin Authorization & Role Management", function () {
    it("Should assign USER role to standard traders and ADMIN role to demo admin", function () {
      const alex = demoStore.getAllUsers().find((u) => u.username === "trader_alex");
      expect(alex.role).to.equal("USER");

      const admin = demoStore.getAllUsers().find((u) => u.username === "admin_dan");
      expect(admin.role).to.equal("ADMIN");
    });

    it("Should correctly report platform statistics for admin dashboard", function () {
      const stats = demoStore.getPlatformStats();
      expect(stats.totalDemoUsers).to.be.at.least(7);
      expect(stats.totalSwapsCount).to.be.at.least(3);
      expect(stats.totalVolumeUsd).to.be.greaterThan(0);
    });

    it("Should allow updating commission tier percentages through admin config", function () {
      demoStore.updateAdminConfig({
        level1Percent: 6.0,
        level2Percent: 3.5,
        level3Percent: 1.5,
      });

      const config = demoStore.getAdminConfig();
      expect(config.level1Percent).to.equal(6.0);
      expect(config.level2Percent).to.equal(3.5);
      expect(config.level3Percent).to.equal(1.5);
    });
  });

  // =========================================================================
  // JOURNEY F: Official Liora Coin Branding & Asset Integrity
  // =========================================================================
  describe("Journey F: Liora Coin Logo Assets & Rebranding Integrity", function () {
    it("Should serve all required Liora Coin official logo and favicon assets", function () {
      const publicDir = path.join(__dirname, "..", "apps", "web", "public");
      const requiredAssets = [
        "assets/liora-logo-original.png",
        "assets/liora-logo.png",
        "assets/liora-logo-512.png",
        "assets/liora-logo-128.png",
        "favicon.ico",
        "favicon.png",
        "apple-touch-icon.png",
      ];

      for (const rel of requiredAssets) {
        const full = path.join(publicDir, rel);
        expect(fs.existsSync(full), `Missing asset: ${rel}`).to.be.true;
        expect(fs.statSync(full).size, `Empty asset: ${rel}`).to.be.greaterThan(0);
      }
    });
  });
});

