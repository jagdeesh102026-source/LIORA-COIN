const { expect } = require('chai');
const path = require('path');
const { ethers } = require('hardhat');

require('./helpers/tsLoader');

const {
  CustodialAllocationLedger,
} = require('../apps/web/src/lib/custody/custodialAllocationLedger');
const {
  PaymentReferenceRegistry,
} = require('../apps/web/src/lib/settlement/paymentReferenceRegistry');
const { prisma, pool } = require('../apps/web/src/lib/server/prisma');
const { serverDb } = require('../apps/web/src/lib/server/db');

// Route handlers
const { GET: getAllocationsRoute } = require('../apps/web/src/app/api/custody/allocations/route');
const { POST: createPaymentIntentRoute } = require('../apps/web/src/app/api/custody/payment-intent/route');
const { POST: verifyPaymentRoute } = require('../apps/web/src/app/api/custody/verify-payment/route');
const { POST: attemptTransferRoute } = require('../apps/web/src/app/api/custody/investor-transfer/route');
const { GET: getTreasuryBalanceRoute } = require('../apps/web/src/app/api/custody/treasury-balance/route');
const { POST: treasurySpendRoute } = require('../apps/web/src/app/api/custody/treasury-spend/route');

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

describe('LIORA — PostgreSQL Custodial Persistence & ACID Integrity Suite', function () {
  this.timeout(40000);

  let deployer;
  let treasurySigner;
  let investorAlice;
  let investorBob;
  let attackerMallory;

  let deployerAddress;
  let treasuryAddress;
  let aliceAddress;
  let bobAddress;
  let malloryAddress;

  let adminSession;

  before(async function () {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    treasurySigner = signers[1];
    investorAlice = signers[2];
    investorBob = signers[3];
    attackerMallory = signers[4];

    deployerAddress = (await deployer.getAddress()).toLowerCase();
    treasuryAddress = (await treasurySigner.getAddress()).toLowerCase();
    aliceAddress = (await investorAlice.getAddress()).toLowerCase();
    bobAddress = (await investorBob.getAddress()).toLowerCase();
    malloryAddress = (await attackerMallory.getAddress()).toLowerCase();

    // Verify PostgreSQL connection
    const res = await pool.query('SELECT current_database(), current_user;');
    expect(res.rows[0].current_user).to.equal('liora_app');

    // Create Admin session
    const adminUser =
      (await serverDb.findUserByUsername('postgres_audit_admin')) ||
      (await serverDb.createUser({
        username: 'postgres_audit_admin',
        email: 'audit-admin@grandiose.ke',
        passwordHash: 'audit-hash-secure',
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
      }));
    adminSession = await serverDb.createSession(adminUser.id, 24, '127.0.0.1');

    await CustodialAllocationLedger.initialize();
  });

  async function createSignedHeaders(signer, chainId = 97) {
    const address = (await signer.getAddress()).toLowerCase();
    const nonce = await serverDb.createNonce(address, 5 * 60 * 1000);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const siweMessage = [
      `localhost:3000 wants you to sign in with your Ethereum account:`,
      address,
      '',
      'Sign in to LIORA Custodial Portal.',
      '',
      `URI: http://localhost:3000`,
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
  // 1. ALLOCATION & PAYMENT INTENT PERSISTENCE
  // =========================================================================
  let persistedAllocationId;
  const uniqueRef1 = `NEFT-PERSIST-TEST-${Date.now()}-001`;

  it('Requirement 3 & 5: Should create and persist payment intent in PostgreSQL', async function () {
    const aliceHeaders = await createSignedHeaders(investorAlice);

    const req = createMockRequest({
      method: 'POST',
      headers: aliceHeaders,
      body: {
        investorAddress: aliceAddress,
        investorName: 'Alice Postgres Tester',
        planId: 'TIER_01',
        initialAllocationPriceINR: '2.00',
        paymentRail: 'NEFT_BANK_TRANSFER',
        paymentReference: uniqueRef1,
        amountPaid: 50000,
        currency: 'INR',
      },
    });

    const res = await createPaymentIntentRoute(req);
    expect(res.status).to.equal(200);
    const data = await res.json();
    expect(data.success).to.be.true;
    persistedAllocationId = data.record.allocationId;

    // Verify row directly in PostgreSQL
    const dbRow = await prisma.custodialAllocation.findUnique({
      where: { allocationId: persistedAllocationId },
      include: { paymentRecord: true },
    });

    expect(dbRow).to.not.be.null;
    expect(dbRow.investorAddress).to.equal(aliceAddress);
    expect(dbRow.planId).to.equal('TIER_01');
    expect(dbRow.status).to.equal('PENDING_PAYMENT_VERIFICATION');
    expect(dbRow.paymentRecord).to.not.be.null;
    expect(dbRow.paymentRecord.paymentReference).to.equal(uniqueRef1);
  });

  // =========================================================================
  // 2. SURVIVE APPLICATION RESTARTS
  // =========================================================================
  it('Requirement 3 & Verification 1: Allocations must survive simulated application restart', async function () {
    // Simulate application restart by wiping in-memory state and re-initializing from PostgreSQL
    CustodialAllocationLedger.cachedAllocations.clear();
    await CustodialAllocationLedger.initialize();

    const aliceHeaders = await createSignedHeaders(investorAlice);
    const req = createMockRequest({
      method: 'GET',
      headers: aliceHeaders,
      url: `http://localhost:3000/api/custody/allocations?address=${aliceAddress}`,
    });

    const res = await getAllocationsRoute(req);
    expect(res.status).to.equal(200);
    const data = await res.json();
    expect(data.success).to.be.true;

    const found = data.custodialAllocations.find((a) => a.allocationId === persistedAllocationId);
    expect(found).to.not.be.undefined;
    expect(found.allocationId).to.equal(persistedAllocationId);
    expect(found.investorAddress).to.equal(aliceAddress);
    expect(found.status).to.equal('PENDING_PAYMENT_VERIFICATION');
  });

  // =========================================================================
  // 3. PAYMENT VERIFICATION & ATOMIC RESERVE DEDUCTION
  // =========================================================================
  it('Requirement 4 & Verification 2: Verified payments and reserve accounting must persist across restarts', async function () {
    const balBefore = CustodialAllocationLedger.getTreasuryCustodyBalance();
    const freeBefore = balBefore.unrestrictedFreeLIORA;

    // Admin verifies payment
    const verifyReq = createMockRequest({
      method: 'POST',
      cookies: { liora_session: adminSession.sessionIdentifier },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
      body: {
        allocationId: persistedAllocationId,
        adminNotes: 'Confirmed in Stanbic Bank Kenya corporate statement.',
      },
    });

    const verifyRes = await verifyPaymentRoute(verifyReq);
    expect(verifyRes.status).to.equal(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).to.be.true;
    expect(verifyData.record.status).to.equal('ACTIVE_CUSTODIAL_ALLOCATION');
    expect(verifyData.record.paymentRecord.verificationStatus).to.equal('VERIFIED');

    // Simulate another application restart
    CustodialAllocationLedger.cachedAllocations.clear();
    await CustodialAllocationLedger.initialize();

    // Verify record in PostgreSQL after restart
    const dbAlloc = await prisma.custodialAllocation.findUnique({
      where: { allocationId: persistedAllocationId },
      include: { paymentRecord: true },
    });
    expect(dbAlloc.status).to.equal('ACTIVE_CUSTODIAL_ALLOCATION');
    expect(dbAlloc.paymentRecord.verificationStatus).to.equal('VERIFIED');
    expect(dbAlloc.paymentRecord.verifiedAt).to.not.be.null;

    // Verify Treasury snapshot in PostgreSQL
    const balAfter = CustodialAllocationLedger.getTreasuryCustodyBalance();
    expect(balAfter.unrestrictedFreeLIORA).to.equal(freeBefore - 62500); // 62,500 LIORA reserved
    expect(balAfter.reservedAllocationsLIORA).to.be.at.least(62500);
  });

  // =========================================================================
  // 4. DUPLICATE PAYMENT REFERENCE REJECTION AT DB LEVEL
  // =========================================================================
  it('Requirement 5 & Verification 3: Duplicate payment references must be strictly rejected at database level', async function () {
    const bobHeaders = await createSignedHeaders(investorBob);

    // Bob attempts to register intent using ALICE'S already used reference
    const dupReq = createMockRequest({
      method: 'POST',
      headers: bobHeaders,
      body: {
        investorAddress: bobAddress,
        investorName: 'Bob Imposter',
        planId: 'TIER_01',
        initialAllocationPriceINR: '2.00',
        paymentRail: 'NEFT_BANK_TRANSFER',
        paymentReference: uniqueRef1, // DUPLICATE
        amountPaid: 50000,
        currency: 'INR',
      },
    });

    const dupRes = await createPaymentIntentRoute(dupReq);
    expect(dupRes.status).to.equal(200);
    const dupData = await dupRes.json();
    const bobsAllocId = dupData.record.allocationId;

    // Admin attempts to verify duplicate reference -> rejected at database level
    const verifyReq = createMockRequest({
      method: 'POST',
      cookies: { liora_session: adminSession.sessionIdentifier },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
      body: {
        allocationId: bobsAllocId,
      },
    });

    const verifyRes = await verifyPaymentRoute(verifyReq);
    expect(verifyRes.status).to.equal(400);
    const verifyData = await verifyRes.json();
    expect(verifyData.error).to.include('DUPLICATE_PAYMENT_REFERENCE');
  });

  // =========================================================================
  // 5. CONCURRENT PAYMENT VERIFICATION RACE PROTECTION
  // =========================================================================
  it('Requirement 4 & Verification 4: Concurrent verification cannot allocate twice', async function () {
    // 1. Create a fresh pending payment intent
    const uniqueRefConcurrent = `IMPS-CONCURRENT-${Date.now()}`;
    const aliceHeaders = await createSignedHeaders(investorAlice);

    const intentReq = createMockRequest({
      method: 'POST',
      headers: aliceHeaders,
      body: {
        investorAddress: aliceAddress,
        investorName: 'Alice Concurrent',
        planId: 'TIER_01',
        initialAllocationPriceINR: '2.00',
        paymentRail: 'IMPS_BANK_TRANSFER',
        paymentReference: uniqueRefConcurrent,
        amountPaid: 50000,
        currency: 'INR',
      },
    });

    const intentRes = await createPaymentIntentRoute(intentReq);
    const intentData = await intentRes.json();
    const concurrentAllocId = intentData.record.allocationId;

    // 2. Dispatch two simultaneous verification requests
    const verifyReq1 = createMockRequest({
      method: 'POST',
      cookies: { liora_session: adminSession.sessionIdentifier },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
      body: {
        allocationId: concurrentAllocId,
        adminNotes: 'Admin 1 attempt',
      },
    });

    const verifyReq2 = createMockRequest({
      method: 'POST',
      cookies: { liora_session: adminSession.sessionIdentifier },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
      body: {
        allocationId: concurrentAllocId,
        adminNotes: 'Admin 2 attempt (racing)',
      },
    });

    const [res1, res2] = await Promise.all([
      verifyPaymentRoute(verifyReq1),
      verifyPaymentRoute(verifyReq2),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one must succeed (200) and the second must be rejected (400)
    expect(statuses).to.deep.equal([200, 400]);

    // Verify allocation in DB is activated exactly once
    const finalAlloc = await prisma.custodialAllocation.findUnique({
      where: { allocationId: concurrentAllocId },
    });
    expect(finalAlloc.status).to.equal('ACTIVE_CUSTODIAL_ALLOCATION');
  });

  // =========================================================================
  // 6. ENFORCEMENT OF TREASURY RESERVED BALANCE SPENDING PROTECTIONS
  // =========================================================================
  it('Requirement 3 & Verification 5: Reserved tokens cannot be spent by treasury operations', async function () {
    const bal = CustodialAllocationLedger.getTreasuryCustodyBalance();
    const availableFree = BigInt(bal.unrestrictedFreeBaseUnits);

    // Attempt to spend more than available free balance
    const excessiveSpend = availableFree + 10_000n * 10n ** 18n;

    const spendReq = createMockRequest({
      method: 'POST',
      cookies: { liora_session: adminSession.sessionIdentifier },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
      body: {
        spendAmountBaseUnits: excessiveSpend.toString(),
        recipientAddress: bobAddress,
        purpose: 'Attempting to spend reserved collateral',
      },
    });

    const spendRes = await treasurySpendRoute(spendReq);
    expect(spendRes.status).to.equal(400);
    const spendData = await spendRes.json();
    expect(spendData.error).to.include('INSUFFICIENT_UNRESERVED_TREASURY_BALANCE');
  });

  // =========================================================================
  // 7. UNAUTHORIZED INVESTOR TRANSACTION REJECTION
  // =========================================================================
  it('Requirement 7 & Verification 6: Unauthorized investor transfer attempts are strictly blocked with HTTP 403', async function () {
    const aliceHeaders = await createSignedHeaders(investorAlice);

    const req = createMockRequest({
      method: 'POST',
      headers: aliceHeaders,
      body: {
        allocationId: persistedAllocationId,
        callerAddress: aliceAddress,
        action: 'TRANSFER',
        recipientAddress: bobAddress,
        amount: '1000',
      },
    });

    const res = await attemptTransferRoute(req);
    expect(res.status).to.equal(403);
    const data = await res.json();
    expect(data.code).to.equal('UNAUTHORIZED_CUSTODIAL_INVESTOR_ACTION');
    expect(data.isInvestorTransferable).to.be.false;

    // Verify audit log in PostgreSQL
    const audits = await prisma.custodialLedgerAudit.findMany({
      where: {
        allocationId: persistedAllocationId,
        action: 'BLOCKED_UNAUTHORIZED_INVESTOR_ACTION_TRANSFER',
      },
    });
    expect(audits.length).to.be.at.least(1);
    expect(audits[0].actor).to.equal(aliceAddress);
  });

  // =========================================================================
  // 8. DATABASE FAILURE TRANSACTION ROLLBACK
  // =========================================================================
  it('Requirement 4 & Verification 7: Database failures roll back financial operations', async function () {
    const balBefore = CustodialAllocationLedger.getTreasuryCustodyBalance();

    // Attempt a transaction with invalid parameters that will cause DB rejection
    const invalidReq = createMockRequest({
      method: 'POST',
      cookies: { liora_session: adminSession.sessionIdentifier },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
      body: {
        allocationId: 'NON_EXISTENT_ALLOCATION_ID_123',
        adminNotes: 'Should roll back',
      },
    });

    const res = await verifyPaymentRoute(invalidReq);
    expect(res.status).to.equal(400);

    // Verify treasury snapshot was NOT modified
    const balAfter = CustodialAllocationLedger.getTreasuryCustodyBalance();
    expect(balAfter.unrestrictedFreeBaseUnits).to.equal(balBefore.unrestrictedFreeBaseUnits);
    expect(balAfter.reservedCustodialAllocationsBaseUnits).to.equal(balBefore.reservedCustodialAllocationsBaseUnits);
  });
});
