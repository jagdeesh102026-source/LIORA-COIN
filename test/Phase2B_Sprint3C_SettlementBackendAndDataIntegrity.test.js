const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

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
  AUTHORIZED_TREASURY_WALLET,
} = require('../apps/web/src/lib/treasury/treasuryAccountingEngine');

describe('LIORA COIN — Sprint 3C: Settlement Backend & Data Integrity Suite', function () {
  this.timeout(20000);

  const TREASURY = AUTHORIZED_TREASURY_WALLET;
  const INVESTOR_ALICE = '0x1111111111111111111111111111111111111111';
  const INVESTOR_BOB = '0x2222222222222222222222222222222222222222';
  const ATTACKER = '0x9999999999999999999999999999999999999999';

  beforeEach(function () {
    ManualSettlementEngine.resetForTesting();
    PaymentReferenceRegistry.resetForTesting();
    SettlementPersistentStore.resetForTesting();
  });

  // =========================================================================
  // TASK 1: EXACT ERC-20 INTEGER BASE UNIT PRECISION & BIGINT ARITHMETIC
  // =========================================================================
  describe('Task 1: Exact ERC-20 Integer Base Unit Precision (BigInt)', function () {
    it('Should verify exact integer base units and reject floating-point approximations', function () {
      const quote = ProportionalAllocationEngine.calculateAllocation('TIER_01', '0.20');
      // 625,000 LIORA = 625,000 * 10^18 wei
      const expectedBaseUnits = BigInt(quote.allocatedTokensBaseUnits);
      expect(expectedBaseUnits).to.equal(625000n * 10n ** 18n);

      // 1. Exact BigInt match
      const res1 = ProportionalAllocationEngine.verifyExactCollateralReturn(expectedBaseUnits, expectedBaseUnits);
      expect(res1.isValid).to.be.true;
      expect(res1.differenceWei).to.equal('0');

      // 2. Exact string match of base units
      const res2 = ProportionalAllocationEngine.verifyExactCollateralReturn(expectedBaseUnits, expectedBaseUnits.toString());
      expect(res2.isValid).to.be.true;

      // 3. Exact formatted token string
      const res3 = ProportionalAllocationEngine.verifyExactCollateralReturn(expectedBaseUnits, '625000');
      expect(res3.isValid).to.be.true;

      // 4. Reject if off by 1 atomic wei (10^-18)
      const offByOnePlus = expectedBaseUnits + 1n;
      const resOff1 = ProportionalAllocationEngine.verifyExactCollateralReturn(expectedBaseUnits, offByOnePlus);
      expect(resOff1.isValid).to.be.false;
      expect(resOff1.differenceWei).to.equal('1');

      const offByOneMinus = expectedBaseUnits - 1n;
      const resOff2 = ProportionalAllocationEngine.verifyExactCollateralReturn(expectedBaseUnits, offByOneMinus);
      expect(resOff2.isValid).to.be.false;
      expect(resOff2.differenceWei).to.equal('-1');
    });

    it('Should handle fractional tokens with exact 18-decimal precision', function () {
      // Tier 01 at ₹30.00: 125000 / 30 = 4166.666666666666666666 LIORA
      const quote = ProportionalAllocationEngine.calculateAllocation('TIER_01', '30.00');
      const expectedBaseUnits = BigInt(quote.allocatedTokensBaseUnits);

      // Verify exact equality
      const res = ProportionalAllocationEngine.verifyExactCollateralReturn(expectedBaseUnits, expectedBaseUnits);
      expect(res.isValid).to.be.true;

      // Reject if truncated to integer (4166)
      const truncated = 4166n * 10n ** 18n;
      const resTrunc = ProportionalAllocationEngine.verifyExactCollateralReturn(expectedBaseUnits, truncated);
      expect(resTrunc.isValid).to.be.false;
      expect(BigInt(resTrunc.differenceWei) < 0n).to.be.true;
    });

    it('Should handle extremely large values without overflow (Tier 06 @ 45M LIORA)', function () {
      // Tier 06 at ₹0.20: 9,000,000 / 0.20 = 45,000,000 LIORA = 45 * 10^24 wei
      const quote = ProportionalAllocationEngine.calculateAllocation('TIER_06', '0.20');
      const expectedBaseUnits = BigInt(quote.allocatedTokensBaseUnits);
      expect(expectedBaseUnits).to.equal(45000000n * 10n ** 18n);

      const res = ProportionalAllocationEngine.verifyExactCollateralReturn(expectedBaseUnits, expectedBaseUnits);
      expect(res.isValid).to.be.true;

      const mismatched = expectedBaseUnits - (10n ** 18n); // 1 token short
      const resMis = ProportionalAllocationEngine.verifyExactCollateralReturn(expectedBaseUnits, mismatched);
      expect(resMis.isValid).to.be.false;
    });

    it('ManualSettlementEngine.returnCollateral strictly rejects base-unit mismatches', function () {
      const invRes = ManualSettlementEngine.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Precision Test',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      });
      const invId = invRes.record.id;

      // Transition to payout dispatched and verified
      ManualSettlementEngine.recordManualPayout(invId, {
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-TEST-PRECISION-001',
        dispatchedBy: TREASURY,
      });

      ManualSettlementEngine.confirmInvestorPayment(invId, INVESTOR_ALICE, 'Payment received');

      // Attempt collateral return with 1 token less
      const expectedTokensNum = invRes.record.collateralTokensAllocated; // 625000
      const shortAmount = expectedTokensNum - 1; // 624999
      const failRes = ManualSettlementEngine.returnCollateral(invId, '0x1111111111111111', INVESTOR_ALICE, shortAmount);
      expect(failRes.success).to.be.false;
      expect(failRes.error).to.include('COLLATERAL_QUANTITY_MISMATCH');

      // Return exact quantity
      const successRes = ManualSettlementEngine.returnCollateral(invId, '0x2222222222222222', INVESTOR_ALICE, expectedTokensNum);
      expect(successRes.success).to.be.true;

      const settled = ManualSettlementEngine.getInvestmentById(invId);
      expect(settled.stage).to.equal('SETTLED');
      expect(settled.collateralReturned.isExactQuantityMatch).to.be.true;
    });
  });

  // =========================================================================
  // TASK 2: GLOBAL UNIQUE PAYMENT REFERENCE & PROVIDER NORMALIZATION
  // =========================================================================
  describe('Task 2: Global Unique Payment Reference & Provider Normalization', function () {
    it('Should normalize payment references across rails and strip formatting noise', function () {
      // IMPS
      const n1 = normalizePaymentReference('  HDFC-UTR-8923471029481  ', 'IMPS_BANK_TRANSFER');
      expect(n1.normalizedReference).to.equal('HDFCUTR8923471029481');
      expect(n1.canonicalKey).to.equal('IMPS:HDFCUTR8923471029481:BSC_TESTNET');

      // RTGS
      const n2 = normalizePaymentReference('RTGS/SBIN/2026/998877', 'RTGS_WIRE');
      expect(n2.normalizedReference).to.equal('SBIN2026998877');
      expect(n2.canonicalKey).to.equal('RTGS:SBIN2026998877:BSC_TESTNET');

      // M-Pesa
      const n3 = normalizePaymentReference('MPESA-QGH8910234', 'MPESA_MOBILE_MONEY');
      expect(n3.normalizedReference).to.equal('QGH8910234');
      expect(n3.canonicalKey).to.equal('MPESA:QGH8910234:BSC_TESTNET');

      // USDT Testnet Tx
      const hash = '0x' + 'a'.repeat(64);
      const n4 = normalizePaymentReference(hash.toUpperCase(), 'USDT_TESTNET_TRANSFER');
      expect(n4.normalizedReference).to.equal(hash.toLowerCase());
      expect(n4.canonicalKey).to.equal(`TX_BSC97:${hash.toLowerCase()}:BSC_TESTNET`);
    });

    it('Should prevent one verified payment reference from settling multiple investments', function () {
      const inv1 = ManualSettlementEngine.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      }).record;

      const inv2 = ManualSettlementEngine.createInvestment({
        investorAddress: INVESTOR_BOB,
        investorName: 'Bob',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      }).record;

      // Payout 1 succeeds
      const p1 = ManualSettlementEngine.recordManualPayout(inv1.id, {
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-UNIQUE-UTR-999',
        dispatchedBy: TREASURY,
      });
      expect(p1.success).to.be.true;

      // Payout 2 with identical normalized UTR must fail
      const p2 = ManualSettlementEngine.recordManualPayout(inv2.id, {
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: '  hdfc unique-utr 999  ', // identical after normalization
        dispatchedBy: TREASURY,
      });
      expect(p2.success).to.be.false;
      expect(p2.error).to.include('DUPLICATE_PAYMENT_REFERENCE');

      // Payout 2 with a distinct UTR succeeds
      const p2Success = ManualSettlementEngine.recordManualPayout(inv2.id, {
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-UNIQUE-UTR-1000',
        dispatchedBy: TREASURY,
      });
      expect(p2Success.success).to.be.true;
    });

    it('Should support payment reference correction workflow with complete audit trail', function () {
      const inv = ManualSettlementEngine.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Typo',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      }).record;

      ManualSettlementEngine.recordManualPayout(inv.id, {
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-TYPO-12345',
        dispatchedBy: TREASURY,
      });

      // Correct reference
      const corrRes = ManualSettlementEngine.correctManualPayoutReference({
        investmentId: inv.id,
        newReferenceNumber: 'HDFC-CORRECT-67890',
        paymentRail: 'IMPS_BANK_TRANSFER',
        reason: 'Bank statement confirmed actual UTR had digit transposition.',
        correctedBy: TREASURY,
      });

      expect(corrRes.success).to.be.true;

      const updated = ManualSettlementEngine.getInvestmentById(inv.id);
      expect(updated.payoutDispatched.referenceNumber).to.equal('HDFC-CORRECT-67890');

      const logs = ManualSettlementEngine.getAuditLogs(inv.id);
      const corrLog = logs.find((l) => l.action === 'PAYMENT_REFERENCE_CORRECTED');
      expect(corrLog).to.not.be.undefined;
      expect(corrLog.details).to.include('digit transposition');

      // The old reference should now be released/corrected
      const oldCheck = PaymentReferenceRegistry.isReferenceRegistered('HDFC-TYPO-12345', 'IMPS_BANK_TRANSFER');
      expect(oldCheck.isRegistered).to.be.false;
      expect(oldCheck.record.status).to.equal('CORRECTED');
    });
  });

  // =========================================================================
  // TASK 3: PERSISTENT SETTLEMENT RECORDS & IMMUTABILITY
  // =========================================================================
  describe('Task 3: Persistent Settlement Records & Immutability', function () {
    it('Should persist records and reload them from storage file', async function () {
      const created = await SettlementPersistentStore.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Persistent',
        planId: 'TIER_03',
        initialAllocationPriceINR: '0.40',
      });
      expect(created.success).to.be.true;
      const invId = created.record.id;

      // Re-initialize store simulating server restart
      SettlementPersistentStore.initialize();
      const loaded = await SettlementPersistentStore.getInvestmentById(invId);
      expect(loaded).to.not.be.null;
      expect(loaded.investorName).to.equal('Alice Persistent');
      expect(loaded.contractualSettlementINR).to.equal(1000000);
      expect(loaded.collateralTokensAllocated).to.equal(2500000);
      expect(loaded.originalCollateralTokensBaseUnits).to.equal((2500000n * 10n ** 18n).toString());
    });

    it('Should strictly enforce finalized allocation immutability', function () {
      const inv = ManualSettlementEngine.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Freeze',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      }).record;

      // Attempting to modify base units must throw
      expect(() => {
        SettlementPersistentStore.validateImmutability(inv, {
          originalCollateralTokensBaseUnits: (999999n * 10n ** 18n).toString(),
        });
      }).to.throw('IMMUTABLE_ALLOCATION_VIOLATION');

      // Attempting to modify contractual settlement INR must throw
      expect(() => {
        SettlementPersistentStore.validateImmutability(inv, {
          contractualSettlementINR: 9999999,
        });
      }).to.throw('IMMUTABLE_ALLOCATION_VIOLATION');

      // Attempting to modify planId must throw
      expect(() => {
        SettlementPersistentStore.validateImmutability(inv, {
          planId: 'TIER_06',
        });
      }).to.throw('IMMUTABLE_ALLOCATION_VIOLATION');
    });
  });

  // =========================================================================
  // TASK 4 & 5: AUTHORIZATION, SETTLEMENT INTEGRITY & TWO-PARTY EVIDENCE
  // =========================================================================
  describe('Task 4 & 5: Settlement Integrity & Role Authorization', function () {
    it('Payout initiation alone CANNOT mark an investment settled', async function () {
      const inv = (await SettlementPersistentStore.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Integrity',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      const payoutRes = await SettlementPersistentStore.recordManualPayout({
        investmentId: inv.id,
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-INTEGRITY-001',
        dispatchedBy: TREASURY,
      });
      expect(payoutRes.success).to.be.true;

      const updated = await SettlementPersistentStore.getInvestmentById(inv.id);
      expect(updated.stage).to.equal('PAYMENT_DISPATCHED');
      expect(updated.stage).to.not.equal('SETTLED');
      expect(updated.stage).to.not.equal('SETTLEMENT_COMPLETED');
    });

    it('Collateral cannot be returned before payment is independently verified', async function () {
      const inv = (await SettlementPersistentStore.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Guard',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      // Dispatched but NOT verified
      await SettlementPersistentStore.recordManualPayout({
        investmentId: inv.id,
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-GUARD-001',
        dispatchedBy: TREASURY,
      });

      // Premature collateral return attempt
      const retRes = await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv.id,
        txHash: '0x' + '1'.repeat(64),
        actorAddress: INVESTOR_ALICE,
      });
      expect(retRes.success).to.be.false;
      expect(retRes.error).to.include('Collateral cannot be returned until cash payment has been independently verified');

      // Verify payment
      await SettlementPersistentStore.verifyPayment({
        investmentId: inv.id,
        verifierAddress: INVESTOR_ALICE,
        method: 'INVESTOR_RECEIPT_CONFIRMATION',
      });

      // Now collateral return succeeds
      const retSuccess = await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv.id,
        txHash: '0x' + '2'.repeat(64),
        actorAddress: INVESTOR_ALICE,
        returnedTokensAmount: inv.originalCollateralTokensFormatted,
      });
      expect(retSuccess.success).to.be.true;

      const completed = await SettlementPersistentStore.getInvestmentById(inv.id);
      expect(completed.stage).to.equal('SETTLEMENT_COMPLETED');
    });

    it('Duplicate collateral returns on a settled investment are strictly blocked', async function () {
      const inv = (await SettlementPersistentStore.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Dup Return',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      await SettlementPersistentStore.recordManualPayout({
        investmentId: inv.id,
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-DUP-001',
        dispatchedBy: TREASURY,
      });

      await SettlementPersistentStore.verifyPayment({
        investmentId: inv.id,
        verifierAddress: INVESTOR_ALICE,
        method: 'INVESTOR_RECEIPT_CONFIRMATION',
      });

      // First return succeeds
      await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv.id,
        txHash: '0x' + '3'.repeat(64),
        actorAddress: INVESTOR_ALICE,
      });

      // Second duplicate return fails
      const dupRes = await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv.id,
        txHash: '0x' + '4'.repeat(64),
        actorAddress: INVESTOR_ALICE,
      });
      expect(dupRes.success).to.be.false;
      expect(dupRes.error).to.include('already been settled');
    });

    it('Reject unauthorized payout dispatch from non-treasury caller', async function () {
      const inv = (await SettlementPersistentStore.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Attacker Test',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      const attackRes = await SettlementPersistentStore.recordManualPayout({
        investmentId: inv.id,
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-ATTACK-001',
        dispatchedBy: ATTACKER,
      });
      expect(attackRes.success).to.be.false;
      expect(attackRes.error).to.include('UNAUTHORIZED_PAYOUT_CALLER');
    });

    it('Idempotent operations return cached response without duplicating events', async function () {
      const key = 'idem_key_' + Date.now();
      const r1 = await SettlementPersistentStore.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Idempotency',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
        idempotencyKey: key,
      });

      const r2 = await SettlementPersistentStore.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Idempotency',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
        idempotencyKey: key,
      });

      expect(r1.record.id).to.equal(r2.record.id);
    });

    it('Every state transition generates an append-only audit event', async function () {
      const inv = (await SettlementPersistentStore.createInvestment({
        investorAddress: INVESTOR_ALICE,
        investorName: 'Alice Audit Test',
        planId: 'TIER_01',
        initialAllocationPriceINR: '0.20',
      })).record;

      await SettlementPersistentStore.recordManualPayout({
        investmentId: inv.id,
        amountPaidINR: 125000,
        paymentRail: 'IMPS_BANK_TRANSFER',
        referenceNumber: 'HDFC-AUDIT-001',
        dispatchedBy: TREASURY,
      });

      await SettlementPersistentStore.verifyPayment({
        investmentId: inv.id,
        verifierAddress: INVESTOR_ALICE,
        method: 'INVESTOR_RECEIPT_CONFIRMATION',
      });

      await SettlementPersistentStore.recordCollateralReturn({
        investmentId: inv.id,
        txHash: '0x' + '5'.repeat(64),
        actorAddress: INVESTOR_ALICE,
      });

      const logs = await SettlementPersistentStore.getAuditLogs(inv.id);
      expect(logs.length).to.be.at.least(4);
      const actions = logs.map((l) => l.action);
      expect(actions).to.include('INVESTMENT_CREATED_AND_COLLATERAL_FINALIZED');
      expect(actions).to.include('PAYMENT_DISPATCHED');
      expect(actions).to.include('PAYMENT_INDEPENDENTLY_VERIFIED');
      expect(actions).to.include('SETTLEMENT_COMPLETED');
    });
  });
});
