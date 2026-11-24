const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const { ethers } = require('hardhat');

require('./helpers/tsLoader');

const {
  ProportionalAllocationEngine,
  CONFIRMED_INVESTMENT_PLANS,
} = require('../apps/web/src/lib/allocation/proportionalAllocationEngine');
const {
  ManualSettlementEngine,
} = require('../apps/web/src/lib/settlement/manualSettlementModel');
const {
  PaymentReferenceRegistry,
  normalizePaymentReference,
} = require('../apps/web/src/lib/settlement/paymentReferenceRegistry');
const {
  SettlementPersistentStore,
} = require('../apps/web/src/lib/server/settlement/settlementPersistentStore');
const {
  TestnetCollateralVerifier,
} = require('../apps/web/src/lib/server/settlement/testnetCollateralVerifier');
const {
  requireSettlementAdmin,
  requireSettlementInvestor,
} = require('../apps/web/src/lib/server/settlement/settlementAuth');
const {
  AUTHORIZED_TREASURY_WALLET,
} = require('../apps/web/src/lib/treasury/treasuryAccountingEngine');
const { serverDb } = require('../apps/web/src/lib/server/db');

// Route handlers
const { GET: getInvestmentsRoute, POST: createInvestmentRoute } = require('../apps/web/src/app/api/settlement/investments/route');
const { POST: recordPayoutRoute, PUT: correctPayoutRoute } = require('../apps/web/src/app/api/settlement/payout/route');
const { POST: verifyPaymentRoute } = require('../apps/web/src/app/api/settlement/verify/route');
const { POST: returnCollateralRoute } = require('../apps/web/src/app/api/settlement/collateral/route');
const { POST: raiseDisputeRoute, PUT: resolveDisputeRoute } = require('../apps/web/src/app/api/settlement/dispute/route');
const { GET: getStatusRoute } = require('../apps/web/src/app/api/settlement/status/route');
const { GET: getPlansRoute } = require('../apps/web/src/app/api/settlement/plans/route');

// NextRequest Mock Helper
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

  const url = options.url || 'http://localhost:3000/api/settlement/investments';

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

describe('LIORA COIN — Sprint 3E: End-to-End Sandbox Integration & Security Validation Suite', function () {
  this.timeout(40000);

  const TREASURY = AUTHORIZED_TREASURY_WALLET;
  let treasurySigner;
  let investorAlice;
  let investorBob;
  let attackerMallory;

  let aliceAddress;
  let bobAddress;
  let malloryAddress;

  before(async function () {
    const signers = await ethers.getSigners();
    treasurySigner = signers[0];
    investorAlice = signers[1];
    investorBob = signers[2];
    attackerMallory = signers[3];

    aliceAddress = (await investorAlice.getAddress()).toLowerCase();
    bobAddress = (await investorBob.getAddress()).toLowerCase();
    malloryAddress = (await attackerMallory.getAddress()).toLowerCase();
  });

  beforeEach(function () {
    ManualSettlementEngine.resetForTesting();
    PaymentReferenceRegistry.resetForTesting();
    SettlementPersistentStore.resetForTesting();
  });

  // Helper to construct cryptographically signed SIWE headers
  async function createSignedHeaders(signer, chainId = 97) {
    const address = (await signer.getAddress()).toLowerCase();
    const nonce = await serverDb.createNonce(address, 5 * 60 * 1000);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    const domain = 'localhost:3000';
    const uri = 'http://localhost:3000';

    const siweMessage = [
      `${domain} wants you to sign in with your Ethereum account:`,
      address,
      '',
      'Sign in with Ethereum to Liora Coin (OXENIQ) non-custodial exchange and trading terminal.',
      '',
      `URI: ${uri}`,
      `Version: 1`,
      `Chain ID: ${chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${now.toISOString()}`,
      `Expiration Time: ${expiresAt.toISOString()}`,
    ].join('\n');

    const signature = await signer.signMessage(siweMessage);

    return {
      'x-wallet-address': address,
      'x-wallet-signature': signature,
      'x-wallet-nonce': nonce,
      'x-wallet-message': siweMessage,
      'x-chain-id': String(chainId),
    };
  }

  // =========================================================================
  // TASK 1: COMPLETE 12-STEP INVESTOR JOURNEY IN CONTROLLED SANDBOX
  // =========================================================================
  describe('Task 1: Complete 12-Step Investor Journey Validation', function () {
    it('Should successfully execute the entire 12-step lifecycle from plan creation to post-restart persistence', async function () {
      // Step 1: Investor connects and authenticates wallet
      const aliceAuthHeaders = await createSignedHeaders(investorAlice);
      expect(aliceAuthHeaders['x-wallet-address']).to.equal(aliceAddress);

      // Step 2: Investor views the six approved investment plans
      const plans = CONFIRMED_INVESTMENT_PLANS;
      expect(Object.keys(plans).length).to.equal(6);
      expect(plans['TIER_01'].principalINR).to.equal(50000);
      expect(plans['TIER_01'].contractualAllocationINR).to.equal(125000);
      expect(plans['TIER_01'].lockDurationMonths).to.equal(3);
      expect(plans['TIER_01'].settlementPayoutMonth).to.equal(4);

      // Step 3 & 4: Investor selects Tier 01; engine calculates initial LIORA quantity proportionally
      const allocationQuote = ProportionalAllocationEngine.calculateAllocation('TIER_01', '0.20');
      // ₹125,000 / ₹0.20 = 625,000 LIORA
      expect(allocationQuote.allocatedTokensNumber).to.equal(625000);
      expect(allocationQuote.allocatedTokensBaseUnits).to.equal((625000n * 10n ** 18n).toString());

      // Step 5: Sandbox finalizes and preserves original token quantity via POST /api/settlement/investments
      const createReq = createMockRequest({
        method: 'POST',
        headers: aliceAuthHeaders,
        body: {
          investorAddress: aliceAddress,
          investorName: 'Alice E2E Investor',
          planId: 'TIER_01',
          initialAllocationPriceINR: '0.20',
          idempotencyKey: 'idem_create_alice_001',
        },
      });

      const createRes = await createInvestmentRoute(createReq);
      expect(createRes.status).to.equal(200);
      const createData = await createRes.json();
      expect(createData.success).to.be.true;
      const investmentId = createData.record.id;
      expect(investmentId).to.match(/^INV-\d+-01-[A-F0-9]{8}$/);
      expect(createData.record.originalCollateralTokensFormatted).to.equal('625000');
      expect(createData.record.originalCollateralTokensBaseUnits).to.equal((625000n * 10n ** 18n).toString());

      // Step 6: Investor dashboard displays correct investment via GET /api/settlement/investments?address=...
      const dashAuthHeaders = await createSignedHeaders(investorAlice);
      const dashReq = createMockRequest({
        url: `http://localhost:3000/api/settlement/investments?address=${aliceAddress}`,
        headers: dashAuthHeaders,
      });
      const dashRes = await getInvestmentsRoute(dashReq);
      expect(dashRes.status).to.equal(200);
      const dashData = await dashRes.json();
      const loadedInv = dashData.investments.find((i) => i.id === investmentId);
      expect(loadedInv).to.not.be.undefined;
      expect(loadedInv.contractualSettlementINR).to.equal(125000);
      expect(loadedInv.collateralTokensAllocated).to.equal(625000);

      // Step 7: Applicable lock-in period completes in controlled test scenario
      const recordInStore = await SettlementPersistentStore.getInvestmentById(investmentId);
      expect(recordInStore).to.not.be.null;
      recordInStore.lockEndDate = Date.now() - 1000; // Mature lock
      recordInStore.stage = 'COLLATERAL_PERIOD_COMPLETED';

      // Step 8: Authorized administrator records simulated manual cash payout via POST /api/settlement/payout
      // Create or reuse admin session in serverDb
      const adminUser =
        (await serverDb.findUserByUsername('treasury_admin_e2e')) ||
        (await serverDb.createUser({
          username: 'treasury_admin_e2e',
          email: 'admin@oxeniq.network',
          passwordHash: 'hash',
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
        }));
      const adminSession = await serverDb.createSession(adminUser.id, 24, '127.0.0.1');

      const payoutReq = createMockRequest({
        method: 'POST',
        cookies: { liora_session: adminSession.sessionIdentifier },
        headers: {
          'x-requested-with': 'XMLHttpRequest',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
        body: {
          investmentId,
          amountPaidINR: 125000,
          paymentRail: 'IMPS_BANK_TRANSFER',
          referenceNumber: 'HDFC-E2E-UTR-789012',
          adminNotes: 'IMPS cash payout dispatched via Grandiose Tech Nairobi account.',
        },
      });

      const payoutRes = await recordPayoutRoute(payoutReq);
      expect(payoutRes.status).to.equal(200);
      const payoutData = await payoutRes.json();
      expect(payoutData.success).to.be.true;

      const afterPayout = await SettlementPersistentStore.getInvestmentById(investmentId);
      expect(afterPayout.stage).to.equal('PAYMENT_DISPATCHED');
      expect(afterPayout.payoutDispatched.referenceNumber).to.equal('HDFC-E2E-UTR-789012');

      // Step 9: Payment verification is independently recorded via POST /api/settlement/verify
      const verifyAuthHeaders = await createSignedHeaders(investorAlice);
      const verifyReq = createMockRequest({
        method: 'POST',
        headers: verifyAuthHeaders,
        body: {
          investmentId,
          method: 'INVESTOR_RECEIPT_CONFIRMATION',
          notes: 'Investor confirmed ₹1,25,000 received in HDFC account.',
        },
      });

      const verifyRes = await verifyPaymentRoute(verifyReq);
      expect(verifyRes.status).to.equal(200);
      const verifyData = await verifyRes.json();
      expect(verifyData.success).to.be.true;

      const afterVerify = await SettlementPersistentStore.getInvestmentById(investmentId);
      expect(afterVerify.stage).to.equal('PAYMENT_INDEPENDENTLY_VERIFIED');

      // Step 10 & 11: BSC Testnet collateral return verified with exact base units
      const collateralAuthHeaders = await createSignedHeaders(investorAlice);
      const simTxHash = '0x00000000000000000000000000000000000000000000000000000000deadbeef';

      const collateralReq = createMockRequest({
        method: 'POST',
        headers: collateralAuthHeaders,
        body: {
          investmentId,
          txHash: simTxHash,
          returnedTokensAmount: '625000', // Exact match
        },
      });

      const collateralRes = await returnCollateralRoute(collateralReq);
      expect(collateralRes.status).to.equal(200);
      const collateralData = await collateralRes.json();
      expect(collateralData.success).to.be.true;
      expect(collateralData.verificationNote).to.include('TESTNET_SANDBOX_SIMULATION');

      const afterSettled = await SettlementPersistentStore.getInvestmentById(investmentId);
      expect(afterSettled.stage).to.equal('SETTLEMENT_COMPLETED');
      expect(afterSettled.collateralReturned.isExactQuantityMatch).to.be.true;

      // Step 12: Complete history remains accessible after application restart
      // Simulate cold restart
      SettlementPersistentStore['isLoaded'] = false;
      SettlementPersistentStore.initialize();

      const postRestart = await SettlementPersistentStore.getInvestmentById(investmentId);
      expect(postRestart).to.not.be.null;
      expect(postRestart.stage).to.equal('SETTLEMENT_COMPLETED');
      expect(postRestart.collateralReturned.txHash).to.equal(simTxHash);

      const logs = await SettlementPersistentStore.getAuditLogs(investmentId);
      expect(logs.length).to.be.at.least(4);
      const actions = logs.map((l) => l.action);
      expect(actions).to.include('SETTLEMENT_COMPLETED');
    });
  });

  // =========================================================================
  // TASK 1B: AUDIT OF ALL SIX APPROVED INVESTMENT PLANS (CHECKLIST 3)
  // =========================================================================
  describe('Task 1B: Audit of All Six Confirmed Investment Plans (Checklist 3)', function () {
    const EXPECTED_PLANS = [
      { tier: '01', planId: 'TIER_01', principalINR: 50000, contractualINR: 125000, lockMonths: 3, payoutMonth: 4, factor: 2.5, rec: false },
      { tier: '02', planId: 'TIER_02', principalINR: 100000, contractualINR: 600000, lockMonths: 3, payoutMonth: 4, factor: 6.0, rec: true },
      { tier: '03', planId: 'TIER_03', principalINR: 200000, contractualINR: 1000000, lockMonths: 3, payoutMonth: 4, factor: 5.0, rec: false },
      { tier: '04', planId: 'TIER_04', principalINR: 300000, contractualINR: 2400000, lockMonths: 9, payoutMonth: 10, factor: 8.0, rec: true },
      { tier: '05', planId: 'TIER_05', principalINR: 500000, contractualINR: 3000000, lockMonths: 12, payoutMonth: 13, factor: 6.0, rec: false },
      { tier: '06', planId: 'TIER_06', principalINR: 1000000, contractualINR: 9000000, lockMonths: 12, payoutMonth: 13, factor: 9.0, rec: true },
    ];

    it('Should verify all six plans match authoritative Checklist (3) parameters exactly', function () {
      const plans = CONFIRMED_INVESTMENT_PLANS;
      expect(Object.keys(plans).length).to.equal(6);

      for (const expected of EXPECTED_PLANS) {
        const plan = plans[expected.planId];
        expect(plan, `Plan ${expected.planId} should exist`).to.not.be.undefined;
        expect(plan.principalINR, `${expected.planId} principalINR`).to.equal(expected.principalINR);
        expect(plan.contractualAllocationINR, `${expected.planId} contractualAllocationINR`).to.equal(expected.contractualINR);
        expect(plan.lockDurationMonths, `${expected.planId} lockDurationMonths`).to.equal(expected.lockMonths);
        expect(plan.settlementPayoutMonth, `${expected.planId} settlementPayoutMonth`).to.equal(expected.payoutMonth);
        expect(plan.multiplierFactor, `${expected.planId} multiplierFactor`).to.equal(expected.factor);
        expect(plan.isRecommended, `${expected.planId} isRecommended`).to.equal(expected.rec);
      }
    });

    it('Should disprove documentation error: Maximum investment is ₹10 Lakh, maximum contractual is ₹90 Lakh, locks are heterogeneous (3m, 9m, 12m)', function () {
      const plans = Object.values(CONFIRMED_INVESTMENT_PLANS);
      const maxPrincipal = Math.max(...plans.map((p) => p.principalINR));
      const maxContractual = Math.max(...plans.map((p) => p.contractualAllocationINR));
      const lockDurations = new Set(plans.map((p) => p.lockDurationMonths));

      // Disprove erroneous 25 Lakh max
      expect(maxPrincipal).to.equal(1000000); // Exactly ₹10,00,000 (NOT ₹25,00,000)
      // Disprove erroneous 62.5 Lakh max
      expect(maxContractual).to.equal(9000000); // Exactly ₹90,00,000 (NOT ₹62,50,000)
      // Disprove erroneous universal 3-month lock
      expect(lockDurations.has(3)).to.be.true;
      expect(lockDurations.has(9)).to.be.true;
      expect(lockDurations.has(12)).to.be.true;
      expect(lockDurations.size).to.equal(3); // Heterogeneous: 3, 9, 12 months
    });

    it('Should verify proportional allocation calculations across prices for every single plan', function () {
      for (const expected of EXPECTED_PLANS) {
        // At ₹0.20
        const quote20 = ProportionalAllocationEngine.calculateAllocation(expected.planId, '0.20');
        const expectedTokens20 = expected.contractualINR / 0.20;
        expect(quote20.allocatedTokensNumber).to.equal(expectedTokens20);
        expect(quote20.allocatedTokensBaseUnits).to.equal((BigInt(expectedTokens20) * 10n ** 18n).toString());

        // At ₹0.40
        const quote40 = ProportionalAllocationEngine.calculateAllocation(expected.planId, '0.40');
        const expectedTokens40 = expected.contractualINR / 0.40;
        expect(quote40.allocatedTokensNumber).to.equal(expectedTokens40);
        expect(quote40.allocatedTokensBaseUnits).to.equal((BigInt(expectedTokens40) * 10n ** 18n).toString());

        // At ₹1.00
        const quote100 = ProportionalAllocationEngine.calculateAllocation(expected.planId, '1.00');
        const expectedTokens100 = expected.contractualINR / 1.00;
        expect(quote100.allocatedTokensNumber).to.equal(expectedTokens100);
        expect(quote100.allocatedTokensBaseUnits).to.equal((BigInt(expectedTokens100) * 10n ** 18n).toString());
      }
    });

    it('Should serve all six plans via GET /api/settlement/plans endpoint', async function () {
      const req = createMockRequest({
        url: 'http://localhost:3000/api/settlement/plans',
      });
      const res = await getPlansRoute(req);
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.totalPlans).to.equal(6);
      expect(data.plans.length).to.equal(6);
      expect(data.plans[0].planId).to.equal('TIER_01');
      expect(data.plans[5].planId).to.equal('TIER_06');
      expect(data.plans[5].contractualAllocationINR).to.equal(9000000);
    });
  });

  // =========================================================================
  // TASK 2: ADVERSARIAL AUTHENTICATION & AUTHORIZATION VALIDATION
  // =========================================================================
  describe('Task 2: Adversarial Authentication & Authorization Tests', function () {
    it('Should reject cross-investor snooping (Alice attempting to view Bob records)', async function () {
      const aliceAuthHeaders = await createSignedHeaders(investorAlice);

      // Alice tries to query Bob's address
      const snoopReq = createMockRequest({
        url: `http://localhost:3000/api/settlement/investments?address=${bobAddress}`,
        headers: aliceAuthHeaders,
      });

      const res = await getInvestmentsRoute(snoopReq);
      expect(res.status).to.equal(403);
      const data = await res.json();
      expect(data.error).to.equal('UNAUTHORIZED_INVESTOR_ACCESS');
    });

    it('Should reject unauthenticated access to settlement records', async function () {
      const unauthReq = createMockRequest({
        url: `http://localhost:3000/api/settlement/investments?address=${aliceAddress}`,
        headers: {}, // No session, no signed challenge
      });

      const res = await getInvestmentsRoute(unauthReq);
      expect(res.status).to.equal(403);
    });

    it('Should reject forged header spoofing attempts without cryptographic signature', async function () {
      const forgedReq = createMockRequest({
        url: `http://localhost:3000/api/settlement/investments?address=${aliceAddress}`,
        headers: {
          'x-investor-wallet': aliceAddress, // Spoofed header without signature
        },
      });

      const res = await getInvestmentsRoute(forgedReq);
      expect(res.status).to.equal(403);
    });

    it('Should reject privilege escalation (non-admin attempting payout dispatch)', async function () {
      const aliceAuthHeaders = await createSignedHeaders(investorAlice);

      const escalateReq = createMockRequest({
        method: 'POST',
        headers: aliceAuthHeaders, // Alice's signature, not treasury admin
        body: {
          investmentId: 'INV-2026-001',
          amountPaidINR: 125000,
          paymentRail: 'IMPS_BANK_TRANSFER',
          referenceNumber: 'HDFC-FORGED-001',
        },
      });

      const res = await recordPayoutRoute(escalateReq);
      expect(res.status).to.equal(403);
      const data = await res.json();
      expect(data.error).to.equal('UNAUTHORIZED_SETTLEMENT_ADMIN');
    });

    it('Should reject expired authentication nonce', async function () {
      // Create nonce with -1 ms TTL (immediately expired)
      const expiredNonce = await serverDb.createNonce(aliceAddress, -1000);
      const siweMessage = `localhost:3000 wants you to sign in: ${aliceAddress} Nonce: ${expiredNonce}`;
      const signature = await investorAlice.signMessage(siweMessage);

      const expiredReq = createMockRequest({
        url: `http://localhost:3000/api/settlement/investments?address=${aliceAddress}`,
        headers: {
          'x-wallet-address': aliceAddress,
          'x-wallet-signature': signature,
          'x-wallet-nonce': expiredNonce,
          'x-wallet-message': siweMessage,
        },
      });

      const res = await getInvestmentsRoute(expiredReq);
      expect(res.status).to.equal(403);
    });

    it('Should reject revoked session token', async function () {
      const user =
        (await serverDb.findUserByUsername('revoked_user')) ||
        (await serverDb.createUser({
          username: 'revoked_user',
          email: null,
          passwordHash: null,
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
        }));
      const session = await serverDb.createSession(user.id, 24, '127.0.0.1');

      // Revoke session
      await serverDb.revokeSession(session.sessionIdentifier, 'TEST_REVOCATION');

      const revokedReq = createMockRequest({
        method: 'POST',
        cookies: { liora_session: session.sessionIdentifier },
        body: {
          investmentId: 'INV-2026-001',
          amountPaidINR: 125000,
          paymentRail: 'IMPS_BANK_TRANSFER',
          referenceNumber: 'HDFC-REVOKED-001',
        },
      });

      const res = await recordPayoutRoute(revokedReq);
      expect(res.status).to.equal(403);
    });
  });

  // =========================================================================
  // TASK 3: SETTLEMENT INTEGRITY, BOUNDARY CHECKS & ERROR RESILIENCE
  // =========================================================================
  describe('Task 3: Settlement Integrity & Boundary Enforcement', function () {
    it('Should strictly reject collateral return with 1 token less (BigInt precision)', async function () {
      const inv = (await SettlementPersistentStore.createInvestment({
        investorAddress: aliceAddress,
        investorName: 'Alice Precision Suite',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      await SettlementPersistentStore.recordManualPayout({
        investmentId: inv.id,
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-PREC-001',
        dispatchedBy: TREASURY,
      });

      await SettlementPersistentStore.verifyPayment({
        investmentId: inv.id,
        verifierAddress: aliceAddress,
        method: 'INVESTOR_RECEIPT_CONFIRMATION',
      });

      // Expected: 625,000 LIORA. Attempt: 624,999 LIORA
      const failRet = await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv.id,
        txHash: '0x0000000000000000000000000000000000000000000000000000000000000001',
        actorAddress: aliceAddress,
        returnedTokensAmount: 624999, // 1 token short
      });

      expect(failRet.success).to.be.false;
      expect(failRet.error).to.include('COLLATERAL_QUANTITY_MISMATCH');

      // Verify state was left safe and uncorrupted
      const checkInv = await SettlementPersistentStore.getInvestmentById(inv.id);
      expect(checkInv.stage).to.equal('PAYMENT_INDEPENDENTLY_VERIFIED');
    });

    it('Should strictly reject collateral return with 1 atomic wei discrepancy', function () {
      const expectedBaseUnits = 625000n * 10n ** 18n;
      const offByOneWei = expectedBaseUnits - 1n;

      const verification = ProportionalAllocationEngine.verifyExactCollateralReturn(
        expectedBaseUnits,
        offByOneWei
      );
      expect(verification.isValid).to.be.false;
      expect(verification.differenceWei).to.equal('-1');
    });

    it('Should strictly reject BSC Mainnet (Chain ID 56) settlement requests', async function () {
      const mainnetHeaders = await createSignedHeaders(investorAlice, 56);

      const mainnetReq = createMockRequest({
        method: 'POST',
        headers: mainnetHeaders,
        body: {
          investorAddress: aliceAddress,
          investorName: 'Alice Mainnet Attempt',
          planId: 'TIER_01',
          initialAllocationPriceINR: '0.20',
        },
      });

      const res = await createInvestmentRoute(mainnetReq);
      expect(res.status).to.equal(400);
      const data = await res.json();
      expect(data.error).to.include('MAINNET_SETTLEMENT_PROHIBITED');
    });

    it('Should prevent collateral return hash replay across different investments', async function () {
      const inv1 = (await SettlementPersistentStore.createInvestment({
        investorAddress: aliceAddress,
        investorName: 'Alice Hash 1',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      const inv2 = (await SettlementPersistentStore.createInvestment({
        investorAddress: bobAddress,
        investorName: 'Bob Hash 2',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      // Payout & verify both
      await SettlementPersistentStore.recordManualPayout({
        investmentId: inv1.id,
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-HASH-001',
        dispatchedBy: TREASURY,
      });
      await SettlementPersistentStore.verifyPayment({
        investmentId: inv1.id,
        verifierAddress: aliceAddress,
        method: 'INVESTOR_RECEIPT_CONFIRMATION',
      });

      await SettlementPersistentStore.recordManualPayout({
        investmentId: inv2.id,
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-HASH-002',
        dispatchedBy: TREASURY,
      });
      await SettlementPersistentStore.verifyPayment({
        investmentId: inv2.id,
        verifierAddress: bobAddress,
        method: 'INVESTOR_RECEIPT_CONFIRMATION',
      });

      const sharedTxHash = '0x0000000000000000000000000000000000000000000000000000000099999999';

      // First return succeeds
      const r1 = await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv1.id,
        txHash: sharedTxHash,
        actorAddress: aliceAddress,
      });
      expect(r1.success).to.be.true;

      // Replaying sharedTxHash on inv2 must fail
      const r2 = await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv2.id,
        txHash: sharedTxHash,
        actorAddress: bobAddress,
      });
      expect(r2.success).to.be.false;
      expect(r2.error).to.include('TX_HASH_ALREADY_SPENT');

      // Verify inv2 remained in PAYMENT_INDEPENDENTLY_VERIFIED stage
      const inv2Check = await SettlementPersistentStore.getInvestmentById(inv2.id);
      expect(inv2Check.stage).to.equal('PAYMENT_INDEPENDENTLY_VERIFIED');
    });

    it('Should leave investment in safe auditable state on unverified payment attempt', async function () {
      const inv = (await SettlementPersistentStore.createInvestment({
        investorAddress: aliceAddress,
        investorName: 'Alice State Check',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      // Premature collateral return attempt (payout not even dispatched)
      const earlyReturn = await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv.id,
        txHash: '0x0000000000000000000000000000000000000000000000000000000011111111',
        actorAddress: aliceAddress,
      });

      expect(earlyReturn.success).to.be.false;
      expect(earlyReturn.error).to.include('Collateral cannot be returned until cash payment has been independently verified');

      const check = await SettlementPersistentStore.getInvestmentById(inv.id);
      expect(check.stage).to.equal('COLLATERAL_PERIOD_ACTIVE');
    });
  });

  // =========================================================================
  // TASK 4: FRONTEND/BACKEND RECONCILIATION & DATA ISOLATION
  // =========================================================================
  describe('Task 4: Frontend/Backend Reconciliation & Data Isolation', function () {
    it('Should calculate live dynamic reconciliation balancing 100% across multi-stage investments', async function () {
      // 1. Create 3 investments across stages
      const inv1 = (await SettlementPersistentStore.createInvestment({
        investorAddress: aliceAddress,
        investorName: 'Alice Active',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      const inv2 = (await SettlementPersistentStore.createInvestment({
        investorAddress: bobAddress,
        investorName: 'Bob Dispatched',
        planId: 'TIER_02',
        initialAllocationPriceINR: '0.40',
      })).record;

      await SettlementPersistentStore.recordManualPayout({
        investmentId: inv2.id,
        amountPaidINR: 600000,
        paymentRail: 'RTGS_WIRE',
        referenceNumber: 'RTGS-RECON-001',
        dispatchedBy: TREASURY,
      });

      // 2. Fetch all investments and run reconciliation
      const allInvs = await SettlementPersistentStore.getAllInvestments();
      const rec = ManualSettlementEngine.calculateReconciliation(allInvs);

      expect(rec.totalInvestmentsCount).to.equal(allInvs.length);
      expect(rec.isReconciled).to.be.true;
      expect(rec.reconciliationDiscrepancyLIORA).to.equal(0);
      expect(rec.totalContractualSettlementINR).to.be.at.least(725000); // 125k + 600k
    });

    it('Should ensure all API responses return explicit sandbox simulation markers', async function () {
      const aliceAuthHeaders = await createSignedHeaders(investorAlice);
      const req = createMockRequest({
        url: `http://localhost:3000/api/settlement/investments?address=${aliceAddress}`,
        headers: aliceAuthHeaders,
      });

      const res = await getInvestmentsRoute(req);
      const data = await res.json();
      expect(data.sandboxMode).to.be.true;
    });
  });
});
