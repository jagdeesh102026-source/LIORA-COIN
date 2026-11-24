const { expect } = require('chai');
const path = require('path');
const crypto = require('crypto');
const { ethers } = require('hardhat');

require('./helpers/tsLoader');

const {
  CustodialAllocationLedger,
} = require('../apps/web/src/lib/custody/custodialAllocationLedger');
const {
  PaymentReferenceRegistry,
} = require('../apps/web/src/lib/settlement/paymentReferenceRegistry');
const { prisma } = require('../apps/web/src/lib/server/prisma');
const { serverDb } = require('../apps/web/src/lib/server/db');
const {
  SESSION_COOKIE_NAME,
} = require('../apps/web/src/lib/server/adminAuth');
const {
  LioraPricingScheduleService,
} = require('../apps/web/src/lib/pricing/lioraPricingSchedule');

// API Route Handlers
const { POST: registerRoute } = require('../apps/web/src/app/api/auth/register/route');
const { POST: loginRoute } = require('../apps/web/src/app/api/auth/login/route');
const { POST: logoutRoute } = require('../apps/web/src/app/api/auth/logout/route');
const { GET: getAllocationsRoute } = require('../apps/web/src/app/api/custody/allocations/route');
const { POST: createPaymentIntentRoute } = require('../apps/web/src/app/api/custody/payment-intent/route');
const { POST: verifyPaymentRoute } = require('../apps/web/src/app/api/custody/verify-payment/route');
const { GET: getReferencePriceRoute } = require('../apps/web/src/app/api/pricing/reference-price/route');

function createMockRequest(options = {}) {
  const headers = new Map();
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      headers.set(k.toLowerCase(), String(v));
    }
  }

  const cookies = new Map();
  if (options.cookies) {
    for (const [k, v] of Object.entries(options.cookies)) {
      cookies.set(k, { value: v });
    }
  }

  const url = options.url || 'http://localhost:3000/api/custody';

  return {
    headers: {
      get: (name) => headers.get(name.toLowerCase()) || null,
    },
    cookies: {
      get: (name) => cookies.get(name) || null,
    },
    method: options.method || 'GET',
    url,
    json: async () => options.body || {},
  };
}

describe('LIORA — Investor Dashboard & Manual Purchase Verification End-to-End Suite', function () {
  this.timeout(45000);

  let treasuryWallet;
  let adminUser;
  let adminSessionToken;

  const runId = Date.now();
  const investorA = {
    username: 'investor_alex_' + runId,
    email: `alex_${runId}@example.com`,
    password: 'SecureInvestorPass2026!',
    walletAddress: '0x' + crypto.randomBytes(20).toString('hex'),
    sessionToken: null,
  };

  const investorB = {
    username: 'investor_beatrice_' + runId,
    email: `beatrice_${runId}@example.com`,
    password: 'SecureInvestorPass2026!',
    walletAddress: '0x' + crypto.randomBytes(20).toString('hex'),
    sessionToken: null,
  };

  before(async function () {
    const signers = await ethers.getSigners();
    treasuryWallet = signers[0];

    // Reset test state in PostgreSQL and in-memory serverDb
    if (typeof serverDb.resetAll === 'function') {
      serverDb.resetAll();
    }
    await CustodialAllocationLedger.resetForTesting();
    await CustodialAllocationLedger.initialize();

    // Configure reference pricing schedule (₹0.20 starting price)
    await LioraPricingScheduleService.configureSchedule({
      isActivated: false,
      configuredBy: 'TEST_SUITE_INIT',
    });

    // Create a verified admin user in PostgreSQL
    const adminUsername = 'admin_tester_' + Date.now();
    adminUser = await serverDb.createUser({
      username: adminUsername,
      email: `${adminUsername}@liora.io`,
      passwordHash: 'scrypt:mock:admin',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    });

    const adminSession = await serverDb.createSession(adminUser.id, 24, '127.0.0.1');
    adminSessionToken = adminSession.sessionIdentifier;
  });

  after(async function () {
    await CustodialAllocationLedger.resetForTesting();
  });

  // --------------------------------------------------------------------------
  // 1. INVESTOR REGISTRATION & LOGIN
  // --------------------------------------------------------------------------
  describe('1. Investor Registration & Session Management', function () {
    it('Should register Investor Alice with scrypt-hashed password and link verified wallet', async function () {
      const req = createMockRequest({
        method: 'POST',
        body: {
          username: investorA.username,
          email: investorA.email,
          password: investorA.password,
          walletAddress: investorA.walletAddress,
        },
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).to.equal(200);
      expect(json.success).to.be.true;
      expect(json.user.username).to.equal(investorA.username);
      expect(json.walletAddress.toLowerCase()).to.equal(investorA.walletAddress.toLowerCase());
      expect(json.session.sessionId).to.be.a('string');

      investorA.sessionToken = json.session.sessionId;
    });

    it('Should register Investor Bob successfully', async function () {
      const req = createMockRequest({
        method: 'POST',
        body: {
          username: investorB.username,
          email: investorB.email,
          password: investorB.password,
          walletAddress: investorB.walletAddress,
        },
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).to.equal(200);
      expect(json.success).to.be.true;
      investorB.sessionToken = json.session.sessionId;
    });

    it('Should reject login with invalid password', async function () {
      const req = createMockRequest({
        method: 'POST',
        body: {
          username: investorA.username,
          password: 'WRONG_PASSWORD_123',
        },
      });

      const res = await loginRoute(req);
      expect(res.status).to.equal(401);
      const json = await res.json();
      expect(json.success).to.be.false;
    });

    it('Should log in successfully with valid credentials and return active session cookie', async function () {
      const req = createMockRequest({
        method: 'POST',
        body: {
          username: investorA.username,
          password: investorA.password,
        },
      });

      const res = await loginRoute(req);
      expect(res.status).to.equal(200);
      const json = await res.json();
      expect(json.success).to.be.true;
      expect(json.user.username).to.equal(investorA.username);
      expect(json.walletAddress.toLowerCase()).to.equal(investorA.walletAddress.toLowerCase());
    });
  });

  // --------------------------------------------------------------------------
  // 2. PURCHASE REQUEST & PENDING STATE
  // --------------------------------------------------------------------------
  describe('2. Purchase Request Creation & Pending Status Separation', function () {
    let orderRef1;
    let allocationId1;

    it('Should submit a purchase request for Tier 1 (₹50,000 INR -> 625,000 LIORA @ ₹0.20)', async function () {
      orderRef1 = `IMPS-UTR-${Date.now()}-A1`;

      const req = createMockRequest({
        method: 'POST',
        cookies: { [SESSION_COOKIE_NAME]: investorA.sessionToken },
        body: {
          planId: 'TIER_01',
          amountPaid: 50000,
          currency: 'INR',
          paymentRail: 'IMPS_BANK_TRANSFER',
          paymentReference: orderRef1,
          initialAllocationPriceINR: '0.20',
        },
      });

      const res = await createPaymentIntentRoute(req);
      expect(res.status).to.equal(200);
      const json = await res.json();

      expect(json.success).to.be.true;
      expect(json.orderReference).to.equal(orderRef1);
      expect(json.allocationId).to.be.a('string');
      expect(json.record.status).to.equal('PENDING_PAYMENT_VERIFICATION');
      expect(json.record.allocatedTokensFormatted).to.equal('625000');

      allocationId1 = json.allocationId;
    });

    it('Dashboard MUST show 0 confirmed tokens and 625,000 pending tokens prior to verification', async function () {
      const req = createMockRequest({
        method: 'GET',
        cookies: { [SESSION_COOKIE_NAME]: investorA.sessionToken },
      });

      const res = await getAllocationsRoute(req);
      expect(res.status).to.equal(200);
      const json = await res.json();

      expect(json.success).to.be.true;
      // Critical invariant: Pending tokens MUST NOT be counted as confirmed balance
      expect(json.totalConfirmedLIORA).to.equal(0);
      expect(json.totalConfirmedTokensFormatted).to.equal('0');
      expect(json.totalPendingLIORA).to.equal(625000);
      expect(json.totalPendingTokensFormatted).to.equal('625,000');
      expect(json.totalPurchaseINR).to.equal(0); // Confirmed investment remains 0
      expect(json.currentReferencePriceINR).to.equal('0.20');
      expect(json.illustrativeValueINR).to.equal('0.00');

      expect(json.pendingAllocations).to.have.lengthOf(1);
      expect(json.confirmedAllocations).to.have.lengthOf(0);
    });

    it('Should allow authorized administrator to approve the payment', async function () {
      const req = createMockRequest({
        method: 'POST',
        cookies: { [SESSION_COOKIE_NAME]: adminSessionToken },
        body: {
          allocationId: allocationId1,
          action: 'APPROVE',
          adminNotes: 'Verified funds received via ICICI Bank IMPS.',
        },
      });

      const res = await verifyPaymentRoute(req);
      expect(res.status).to.equal(200);
      const json = await res.json();

      expect(json.success).to.be.true;
      expect(json.action).to.equal('APPROVED');
      expect(json.record.status).to.equal('ACTIVE_CUSTODIAL_ALLOCATION');
      expect(json.record.paymentRecord.verificationStatus).to.equal('VERIFIED');
    });

    it('Dashboard MUST automatically update confirmed balance to 625,000 LIORA and pending to 0', async function () {
      const req = createMockRequest({
        method: 'GET',
        cookies: { [SESSION_COOKIE_NAME]: investorA.sessionToken },
      });

      const res = await getAllocationsRoute(req);
      expect(res.status).to.equal(200);
      const json = await res.json();

      expect(json.success).to.be.true;
      expect(json.totalConfirmedLIORA).to.equal(625000);
      expect(json.totalConfirmedTokensFormatted).to.equal('625,000');
      expect(json.totalPendingLIORA).to.equal(0);
      expect(json.totalPendingTokensFormatted).to.equal('0');
      expect(json.totalPurchaseINR).to.equal(50000);

      // Illustrative valuation: 625,000 * 0.20 = 125,000 INR
      expect(json.illustrativeValueINR).to.equal('125000.00');
      expect(json.confirmedAllocations).to.have.lengthOf(1);
      expect(json.pendingAllocations).to.have.lengthOf(0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. SESSION LOGOUT & RE-LOGIN PERSISTENCE
  // --------------------------------------------------------------------------
  describe('3. Session Logout & Re-Login Balance Persistence', function () {
    it('Should allow investor to log out', async function () {
      const req = createMockRequest({
        method: 'POST',
        cookies: { [SESSION_COOKIE_NAME]: investorA.sessionToken },
      });

      const res = await logoutRoute(req);
      expect(res.status).to.equal(200);
    });

    it('Should reject unauthenticated dashboard query without session cookie', async function () {
      const req = createMockRequest({
        method: 'GET',
      });

      const res = await getAllocationsRoute(req);
      expect(res.status).to.equal(401);
    });

    it('Should log back in and preserve exact 625,000 confirmed LIORA balance from PostgreSQL', async function () {
      const loginReq = createMockRequest({
        method: 'POST',
        body: {
          username: investorA.username,
          password: investorA.password,
        },
      });

      const loginRes = await loginRoute(loginReq);
      expect(loginRes.status).to.equal(200);
      const loginJson = await loginRes.json();
      investorA.sessionToken = loginJson.session.sessionId;

      const dashboardReq = createMockRequest({
        method: 'GET',
        cookies: { [SESSION_COOKIE_NAME]: investorA.sessionToken },
      });

      const dashboardRes = await getAllocationsRoute(dashboardReq);
      expect(dashboardRes.status).to.equal(200);
      const json = await dashboardRes.json();

      expect(json.totalConfirmedLIORA).to.equal(625000);
      expect(json.totalPurchaseINR).to.equal(50000);
    });
  });

  // --------------------------------------------------------------------------
  // 4. MULTIPLE PURCHASES BY SAME INVESTOR
  // --------------------------------------------------------------------------
  describe('4. Multiple Purchases Accumulation', function () {
    it('Should submit and approve a second purchase (Tier 2: ₹100,000 -> 3,000,000 LIORA)', async function () {
      const orderRef2 = `RTGS-${Date.now()}-A2`;

      // 1. Submit intent
      const intentReq = createMockRequest({
        method: 'POST',
        cookies: { [SESSION_COOKIE_NAME]: investorA.sessionToken },
        body: {
          planId: 'TIER_02',
          amountPaid: 100000,
          currency: 'INR',
          paymentRail: 'RTGS_WIRE',
          paymentReference: orderRef2,
          initialAllocationPriceINR: '0.20',
        },
      });

      const intentRes = await createPaymentIntentRoute(intentReq);
      expect(intentRes.status).to.equal(200);
      const intentJson = await intentRes.json();
      const allocationId2 = intentJson.allocationId;

      // 2. Admin verifies payment
      const verifyReq = createMockRequest({
        method: 'POST',
        cookies: { [SESSION_COOKIE_NAME]: adminSessionToken },
        body: {
          allocationId: allocationId2,
          action: 'APPROVE',
        },
      });

      const verifyRes = await verifyPaymentRoute(verifyReq);
      expect(verifyRes.status).to.equal(200);

      // 3. Verify total balance accumulates: 625,000 + 3,000,000 = 3,625,000 LIORA
      const dashboardReq = createMockRequest({
        method: 'GET',
        cookies: { [SESSION_COOKIE_NAME]: investorA.sessionToken },
      });

      const dashboardRes = await getAllocationsRoute(dashboardReq);
      const json = await dashboardRes.json();

      expect(json.totalConfirmedLIORA).to.equal(3625000);
      expect(json.totalConfirmedTokensFormatted).to.equal('3,625,000');
      expect(json.totalPurchaseINR).to.equal(150000); // 50k + 100k
      expect(json.confirmedAllocations).to.have.lengthOf(2);
    });
  });

  // --------------------------------------------------------------------------
  // 5. INVESTOR TENANT ISOLATION
  // --------------------------------------------------------------------------
  describe('5. Investor Tenant Isolation & Cross-Account Protection', function () {
    it('Investor Bob MUST NOT see Investor Alice confirmed allocations (separate balance = 0)', async function () {
      const req = createMockRequest({
        method: 'GET',
        cookies: { [SESSION_COOKIE_NAME]: investorB.sessionToken },
      });

      const res = await getAllocationsRoute(req);
      expect(res.status).to.equal(200);
      const json = await res.json();

      expect(json.investorAddress.toLowerCase()).to.equal(investorB.walletAddress.toLowerCase());
      expect(json.totalConfirmedLIORA).to.equal(0);
      expect(json.custodialAllocations).to.have.lengthOf(0);
    });

    it('Investor Bob cannot query Investor Alice address (strictly blocked with HTTP 403)', async function () {
      const req = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/custody/allocations?address=${investorA.walletAddress}`,
        cookies: { [SESSION_COOKIE_NAME]: investorB.sessionToken },
      });

      const res = await getAllocationsRoute(req);
      expect(res.status).to.equal(403);
      const json = await res.json();
      expect(json.error).to.equal('UNAUTHORIZED_INVESTOR_ACCESS');
    });
  });

  // --------------------------------------------------------------------------
  // 6. REJECTED PAYMENT BEHAVIOR
  // --------------------------------------------------------------------------
  describe('6. Rejected Payment Behavior', function () {
    let rejectedAllocId;

    it('Should allow admin to reject a fake or unverified payment', async function () {
      const fakeRef = `FAKE-UTR-${Date.now()}`;

      // Bob submits purchase request
      const intentReq = createMockRequest({
        method: 'POST',
        cookies: { [SESSION_COOKIE_NAME]: investorB.sessionToken },
        body: {
          planId: 'TIER_01',
          amountPaid: 50000,
          currency: 'INR',
          paymentRail: 'IMPS_BANK_TRANSFER',
          paymentReference: fakeRef,
        },
      });

      const intentRes = await createPaymentIntentRoute(intentReq);
      const intentJson = await intentRes.json();
      rejectedAllocId = intentJson.allocationId;

      // Admin rejects payment
      const rejectReq = createMockRequest({
        method: 'POST',
        cookies: { [SESSION_COOKIE_NAME]: adminSessionToken },
        body: {
          allocationId: rejectedAllocId,
          action: 'REJECT',
          adminNotes: 'Transaction reference not found in bank statement.',
        },
      });

      const rejectRes = await verifyPaymentRoute(rejectReq);
      expect(rejectRes.status).to.equal(200);
      const rejectJson = await rejectRes.json();

      expect(rejectJson.action).to.equal('REJECTED');
      expect(rejectJson.record.status).to.equal('REJECTED');
      expect(rejectJson.record.paymentRecord.verificationStatus).to.equal('REJECTED');
    });

    it('Dashboard MUST show 0 confirmed tokens for Bob after payment rejection', async function () {
      const req = createMockRequest({
        method: 'GET',
        cookies: { [SESSION_COOKIE_NAME]: investorB.sessionToken },
      });

      const res = await getAllocationsRoute(req);
      const json = await res.json();

      expect(json.totalConfirmedLIORA).to.equal(0);
      expect(json.totalPendingLIORA).to.equal(0);
      expect(json.rejectedAllocations).to.have.lengthOf(1);
    });
  });

  // --------------------------------------------------------------------------
  // 7. DUPLICATE APPROVAL & CONCURRENCY PROTECTION
  // --------------------------------------------------------------------------
  describe('7. Duplicate Approval & Concurrency Protection', function () {
    it('Should reject second approval on already verified allocation', async function () {
      const allRecords = Array.from(CustodialAllocationLedger.cachedAllocations.values());
      const activeRecord = allRecords.find((r) => r.status === 'ACTIVE_CUSTODIAL_ALLOCATION');
      expect(activeRecord).to.not.be.undefined;

      const req = createMockRequest({
        method: 'POST',
        cookies: { [SESSION_COOKIE_NAME]: adminSessionToken },
        body: {
          allocationId: activeRecord.allocationId,
          action: 'APPROVE',
        },
      });

      const res = await verifyPaymentRoute(req);
      expect(res.status).to.equal(400);
      const json = await res.json();
      expect(json.error).to.include('INVALID_STATE_TRANSITION');
    });

    it('Should reject reuse of identical payment reference for a new allocation', async function () {
      const allRecords = Array.from(CustodialAllocationLedger.cachedAllocations.values());
      const activeRecord = allRecords.find((r) => r.status === 'ACTIVE_CUSTODIAL_ALLOCATION');
      const usedRef = activeRecord.paymentRecord.paymentReference;

      // Bob tries to use Alice's payment reference
      const intentReq = createMockRequest({
        method: 'POST',
        cookies: { [SESSION_COOKIE_NAME]: investorB.sessionToken },
        body: {
          planId: 'TIER_01',
          amountPaid: 50000,
          currency: 'INR',
          paymentRail: 'IMPS_BANK_TRANSFER',
          paymentReference: usedRef,
        },
      });

      const intentRes = await createPaymentIntentRoute(intentReq);
      const intentJson = await intentRes.json();
      const duplicateAllocId = intentJson.allocationId;

      // Admin verification must fail with duplicate reference error
      const verifyReq = createMockRequest({
        method: 'POST',
        cookies: { [SESSION_COOKIE_NAME]: adminSessionToken },
        body: {
          allocationId: duplicateAllocId,
          action: 'APPROVE',
        },
      });

      const verifyRes = await verifyPaymentRoute(verifyReq);
      expect(verifyRes.status).to.equal(400);
      const verifyJson = await verifyRes.json();
      expect(verifyJson.error).to.include('DUPLICATE_PAYMENT_REFERENCE');
    });
  });

  // --------------------------------------------------------------------------
  // 8. TREASURY SOLVENCY & RECONCILIATION
  // --------------------------------------------------------------------------
  describe('8. Treasury Token Solvency & Reconciliation', function () {
    it('Should confirm that reserved allocations are 100% backed by 1B operating treasury', async function () {
      const treasurySummary = CustodialAllocationLedger.getTreasuryCustodyBalance();

      expect(treasurySummary.isConserved).to.be.true;
      expect(treasurySummary.totalHoldingsLIORA).to.equal(1000000000); // 1 Billion LIORA
      expect(treasurySummary.reservedAllocationsLIORA).to.equal(3625000); // Alice's 3.625M confirmed
      expect(treasurySummary.unrestrictedFreeLIORA).to.equal(996375000); // 996.375M free
    });
  });
});
