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

// Lightweight NextRequest mock for testing server-side authorization
function createMockNextRequest(options = {}) {
  const headers = new Map();
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      headers.set(k.toLowerCase(), v);
    }
  }

  const cookies = new Map();
  if (options.cookies) {
    for (const [k, v] of Object.entries(options.cookies)) {
      cookies.set(k, { value: v });
    }
  }

  return {
    headers: {
      get: (name) => headers.get(name.toLowerCase()) || null,
    },
    cookies: {
      get: (name) => cookies.get(name) || null,
    },
    method: options.method || 'GET',
    url: options.url || 'http://localhost:3000/api/settlement/investments',
  };
}

describe('LIORA COIN — Sprint 3D: Security Remediation & Backend Integration Suite', function () {
  this.timeout(30000);

  const TREASURY = AUTHORIZED_TREASURY_WALLET;
  let testSigner;
  let testSignerAddress;

  before(async function () {
    const signers = await ethers.getSigners();
    testSigner = signers[0];
    testSignerAddress = await testSigner.getAddress();
  });

  beforeEach(function () {
    ManualSettlementEngine.resetForTesting();
    PaymentReferenceRegistry.resetForTesting();
    SettlementPersistentStore.resetForTesting();
  });

  // =========================================================================
  // TASK 2: SEC-02 AUTHENTICATION SPOOFING REJECTION & CRYPTOGRAPHIC PROOF
  // =========================================================================
  describe('Task 2 (SEC-02): Authentication Spoofing Prevention & SIWE Verification', function () {
    it('Should strictly reject unverified x-liora-treasury-auth header spoofing', async function () {
      const spoofedReq = createMockNextRequest({
        headers: {
          'x-liora-treasury-auth': TREASURY,
        },
      });

      const result = await requireSettlementAdmin(spoofedReq);
      expect(result.authorized).to.be.false;
      expect(result.response).to.not.be.undefined;
      expect(result.response.status).to.equal(403);
    });

    it('Should strictly reject unverified x-investor-wallet header spoofing', async function () {
      const spoofedReq = createMockNextRequest({
        headers: {
          'x-investor-wallet': testSignerAddress,
        },
      });

      const result = await requireSettlementInvestor(spoofedReq, testSignerAddress);
      expect(result.authorized).to.be.false;
      expect(result.response).to.not.be.undefined;
      expect(result.response.status).to.equal(403);
    });

    it('Should authorize investor with valid EIP-4361 cryptographic signature challenge', async function () {
      // 1. Generate challenge nonce in serverDb
      const nonce = await serverDb.createNonce(testSignerAddress.toLowerCase(), 5 * 60 * 1000);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
      const domain = 'localhost:3000';
      const uri = 'http://localhost:3000';

      const siweMessage = [
        `${domain} wants you to sign in with your Ethereum account:`,
        testSignerAddress.toLowerCase(),
        '',
        'Sign in with Ethereum to Liora Coin (OXENIQ) non-custodial exchange and trading terminal.',
        '',
        `URI: ${uri}`,
        `Version: 1`,
        `Chain ID: 97`,
        `Nonce: ${nonce}`,
        `Issued At: ${now.toISOString()}`,
        `Expiration Time: ${expiresAt.toISOString()}`,
      ].join('\n');

      // 2. Cryptographically sign message using private key
      const signature = await testSigner.signMessage(siweMessage);

      // 3. Construct request with signed headers
      const validReq = createMockNextRequest({
        headers: {
          'x-wallet-address': testSignerAddress,
          'x-wallet-signature': signature,
          'x-wallet-nonce': nonce,
          'x-wallet-message': siweMessage,
        },
      });

      const result = await requireSettlementInvestor(validReq, testSignerAddress);
      expect(result.authorized).to.be.true;
      expect(result.role).to.equal('INVESTOR');
      expect(result.actorAddress).to.equal(testSignerAddress.toLowerCase());
    });

    it('Should reject replayed cryptographic challenge when nonce is already consumed', async function () {
      const nonce = await serverDb.createNonce(testSignerAddress.toLowerCase(), 5 * 60 * 1000);
      const siweMessage = `localhost:3000 wants you to sign in: ${testSignerAddress.toLowerCase()} Nonce: ${nonce}`;
      const signature = await testSigner.signMessage(siweMessage);

      const req1 = createMockNextRequest({
        headers: {
          'x-wallet-address': testSignerAddress,
          'x-wallet-signature': signature,
          'x-wallet-nonce': nonce,
          'x-wallet-message': siweMessage,
        },
      });

      // First consumption succeeds
      const res1 = await requireSettlementInvestor(req1, testSignerAddress);
      expect(res1.authorized).to.be.true;

      // Second attempt with identical consumed nonce must fail
      const req2 = createMockNextRequest({
        headers: {
          'x-wallet-address': testSignerAddress,
          'x-wallet-signature': signature,
          'x-wallet-nonce': nonce,
          'x-wallet-message': siweMessage,
        },
      });

      const res2 = await requireSettlementInvestor(req2, testSignerAddress);
      expect(res2.authorized).to.be.false;
      expect(res2.response.status).to.equal(403);
    });
  });

  // =========================================================================
  // TASK 3: SEC-03 PAYMENT REFERENCE RETIREMENT & INTEGRITY
  // =========================================================================
  describe('Task 3 (SEC-03): Payment Reference Retirement & Fraud Prevention', function () {
    it('Should permanently retire corrected references and prevent reuse across any investment', function () {
      const inv1 = ManualSettlementEngine.createInvestment({
        investorAddress: testSignerAddress,
        investorName: 'Investor 1',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      }).record;

      const inv2 = ManualSettlementEngine.createInvestment({
        investorAddress: '0x3333333333333333333333333333333333333333',
        investorName: 'Investor 2',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      }).record;

      // 1. Initial payout with Typo reference
      ManualSettlementEngine.recordManualPayout(inv1.id, {
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-TYPO-REF-001',
        dispatchedBy: TREASURY,
      });

      // 2. Correct reference
      const corr = ManualSettlementEngine.correctManualPayoutReference({
        investmentId: inv1.id,
        newReferenceNumber: 'HDFC-CORRECT-REF-002',
        paymentRail: 'IMPS_BANK_TRANSFER',
        reason: 'Bank UTR had transposed digits in original remittance slip.',
        correctedBy: TREASURY,
      });
      expect(corr.success).to.be.true;

      // 3. Attempt to fraudulently use the OLD/CORRECTED reference for inv2
      const fraudRes = ManualSettlementEngine.recordManualPayout(inv2.id, {
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-TYPO-REF-001',
        dispatchedBy: TREASURY,
      });

      expect(fraudRes.success).to.be.false;
      expect(fraudRes.error).to.include('RETIRED_PAYMENT_REFERENCE');

      // 4. Verify PaymentReferenceRegistry directly rejects retired reference
      const regRes = PaymentReferenceRegistry.registerReference({
        rawReference: 'HDFC-TYPO-REF-001',
        rail: 'IMPS_BANK_TRANSFER',
        investmentId: inv2.id,
        amountPaidINR: 125000,
        registeredBy: TREASURY,
      });
      expect(regRes.success).to.be.false;
      expect(regRes.error).to.include('RETIRED_PAYMENT_REFERENCE');
    });
  });

  // =========================================================================
  // TASK 4: SEC-04 COLLISION-RESISTANT INVESTMENT IDENTIFIERS
  // =========================================================================
  describe('Task 4 (SEC-04): Collision-Resistant Investment IDs', function () {
    it('Should generate unique collision-resistant IDs under rapid synchronous creation', function () {
      const generatedIds = new Set();
      const count = 50;

      for (let i = 0; i < count; i++) {
        const inv = ManualSettlementEngine.createInvestment({
          investorAddress: testSignerAddress,
          investorName: `Investor Rapid ${i}`,
          planId: 'TIER_01',
          initialAllocationPriceINR: '0.20',
        }).record;

        expect(generatedIds.has(inv.id)).to.be.false;
        generatedIds.add(inv.id);
        // Format check: INV-{timestamp}-{tier}-{entropy}
        expect(inv.id).to.match(/^INV-\d+-01-[A-F0-9]{8}$/);
      }

      expect(generatedIds.size).to.equal(count);
    });

    it('Persistent store createInvestment generates unique IDs and rejects duplicates', async function () {
      const p1 = await SettlementPersistentStore.createInvestment({
        investorAddress: testSignerAddress,
        investorName: 'Store Alice',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      });

      const p2 = await SettlementPersistentStore.createInvestment({
        investorAddress: testSignerAddress,
        investorName: 'Store Bob',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      });

      expect(p1.record.id).to.not.equal(p2.record.id);
    });
  });

  // =========================================================================
  // TASK 5: SEC-05 & SEC-06 PERSISTENCE, ATOMIC WRITES & NON-DESTRUCTIVE RECOVERY
  // =========================================================================
  describe('Task 5 (SEC-05 & SEC-06): Persistence Integrity & Recovery', function () {
    it('Should perform atomic file writes and recover cleanly across re-initialization', async function () {
      const created = await SettlementPersistentStore.createInvestment({
        investorAddress: testSignerAddress,
        investorName: 'Atomic Persistence Test',
        planId: 'TIER_02',
        initialAllocationPriceINR: '0.40',
      });
      expect(created.success).to.be.true;

      // Check persistent file on disk
      const filePath = path.resolve(process.cwd(), 'data', 'settlement_storage_dev.json');
      expect(fs.existsSync(filePath)).to.be.true;

      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      expect(parsed.version).to.equal('1.0.0-sprint3d');
      expect(parsed.investments.some((i) => i.id === created.record.id)).to.be.true;
    });

    it('Should never destructively wipe data when JSON parse encounters corruption', function () {
      const filePath = path.resolve(process.cwd(), 'data', 'settlement_storage_dev.json');
      fs.writeFileSync(filePath, '{ corrupted json payload: [broken syntax ...', 'utf8');

      // Force reading the corrupted file
      SettlementPersistentStore['isLoaded'] = false;

      // Attempting to initialize with corrupted file must throw PERSISTENCE_CORRUPTION_DETECTED
      // and NOT reset or overwrite data
      expect(() => {
        SettlementPersistentStore.initialize();
      }).to.throw('PERSISTENCE_CORRUPTION_DETECTED');

      // Verify backup file was created
      const dirFiles = fs.readdirSync(path.resolve(process.cwd(), 'data'));
      const bakFiles = dirFiles.filter((f) => f.includes('corrupted') && f.endsWith('.bak'));
      expect(bakFiles.length).to.be.at.least(1);

      // Clean up backup file created during test
      for (const f of bakFiles) {
        try { fs.unlinkSync(path.resolve(process.cwd(), 'data', f)); } catch {}
      }

      // Restore clean test state
      SettlementPersistentStore.resetForTesting();
    });
  });

  // =========================================================================
  // TASK 6: SEC-07 TESTNET ON-CHAIN COLLATERAL RETURN VERIFICATION
  // =========================================================================
  describe('Task 6 (SEC-07): On-Chain Collateral Return Verification & Replay Defense', function () {
    it('Should reject malformed transaction hashes', async function () {
      const result = await TestnetCollateralVerifier.verifyCollateralReturnReceipt({
        txHash: '0xinvalid_short_hash',
        expectedInvestorAddress: testSignerAddress,
        expectedBaseUnits: 625000n * 10n ** 18n,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include('INVALID_TX_HASH_FORMAT');
    });

    it('Should verify simulated testnet sandbox receipt proof with exact base units', async function () {
      const simulatedHash = '0x0000000000000000000000000000000000000000000000000000000012345678';
      const expectedBaseUnits = 625000n * 10n ** 18n;

      const result = await TestnetCollateralVerifier.verifyCollateralReturnReceipt({
        txHash: simulatedHash,
        expectedInvestorAddress: testSignerAddress,
        expectedBaseUnits,
        allowSandboxMock: true,
      });

      expect(result.isValid).to.be.true;
      expect(result.transferredBaseUnits).to.equal(expectedBaseUnits.toString());
      expect(result.fromAddress).to.equal(testSignerAddress.toLowerCase());
      expect(result.toAddress).to.equal(AUTHORIZED_TREASURY_WALLET.toLowerCase());
    });

    it('Should reject transaction hash replay in SettlementPersistentStore.recordCollateralReturn', async function () {
      const inv1 = (await SettlementPersistentStore.createInvestment({
        investorAddress: testSignerAddress,
        investorName: 'Investor Replay 1',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      const inv2 = (await SettlementPersistentStore.createInvestment({
        investorAddress: testSignerAddress,
        investorName: 'Investor Replay 2',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      // Payout & verify both investments
      await SettlementPersistentStore.recordManualPayout({
        investmentId: inv1.id,
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-REPLAY-001',
        dispatchedBy: TREASURY,
      });
      await SettlementPersistentStore.verifyPayment({
        investmentId: inv1.id,
        verifierAddress: testSignerAddress,
        method: 'INVESTOR_RECEIPT_CONFIRMATION',
      });

      await SettlementPersistentStore.recordManualPayout({
        investmentId: inv2.id,
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-REPLAY-002',
        dispatchedBy: TREASURY,
      });
      await SettlementPersistentStore.verifyPayment({
        investmentId: inv2.id,
        verifierAddress: testSignerAddress,
        method: 'INVESTOR_RECEIPT_CONFIRMATION',
      });

      const txHash = '0x1111111111111111111111111111111111111111111111111111111111111111';

      // First return succeeds
      const ret1 = await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv1.id,
        txHash,
        actorAddress: testSignerAddress,
      });
      expect(ret1.success).to.be.true;

      // Second return attempting to REPLAY the identical txHash on inv2 must fail
      const ret2 = await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv2.id,
        txHash,
        actorAddress: testSignerAddress,
      });
      expect(ret2.success).to.be.false;
      expect(ret2.error).to.include('TX_HASH_ALREADY_SPENT');
    });
  });

  // =========================================================================
  // TASK 7: SEC-08 SERVER-SIDE SANDBOX RESTRICTIONS
  // =========================================================================
  describe('Task 7 (SEC-08): Server-Side Sandbox Restrictions Enforcement', function () {
    it('Should reject mainnet BSC (Chain ID 56) and Ethereum (Chain ID 1) requests', function () {
      const bscMainnet = SettlementPersistentStore.enforceSandboxRestrictions({ chainId: 56 });
      expect(bscMainnet.permitted).to.be.false;
      expect(bscMainnet.error).to.include('MAINNET_SETTLEMENT_PROHIBITED');

      const ethMainnet = SettlementPersistentStore.enforceSandboxRestrictions({ chainId: 1 });
      expect(ethMainnet.permitted).to.be.false;
      expect(ethMainnet.error).to.include('MAINNET_SETTLEMENT_PROHIBITED');
    });

    it('Should permit BSC Testnet (Chain ID 97) requests', function () {
      const testnet = SettlementPersistentStore.enforceSandboxRestrictions({ chainId: 97 });
      expect(testnet.permitted).to.be.true;
    });

    it('Should reject real fiat payout execution and automatic collateral seizure', function () {
      const fiatCheck = SettlementPersistentStore.enforceSandboxRestrictions({ action: 'REAL_FIAT_PAYOUT' });
      expect(fiatCheck.permitted).to.be.false;
      expect(fiatCheck.error).to.include('ACTION_PROHIBITED_IN_SANDBOX');

      const seizureCheck = SettlementPersistentStore.enforceSandboxRestrictions({ action: 'AUTOMATIC_COLLATERAL_SEIZURE' });
      expect(seizureCheck.permitted).to.be.false;
      expect(seizureCheck.error).to.include('ACTION_PROHIBITED_IN_SANDBOX');
    });
  });
});
