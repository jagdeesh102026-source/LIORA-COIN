const { expect } = require('chai');
const path = require('path');
const { ethers } = require('hardhat');

require('./helpers/tsLoader');

const {
  CustodialAllocationLedger,
} = require('../apps/web/src/lib/custody/custodialAllocationLedger');
const {
  CONFIRMED_INVESTMENT_PLANS,
} = require('../apps/web/src/lib/allocation/proportionalAllocationEngine');
const {
  PaymentReferenceRegistry,
} = require('../apps/web/src/lib/settlement/paymentReferenceRegistry');
const {
  AUTHORIZED_TREASURY_WALLET,
} = require('../apps/web/src/lib/treasury/treasuryAccountingEngine');
const { serverDb } = require('../apps/web/src/lib/server/db');

// Route handlers
const { GET: getAllocationsRoute } = require('../apps/web/src/app/api/custody/allocations/route');
const { POST: createPaymentIntentRoute } = require('../apps/web/src/app/api/custody/payment-intent/route');
const { POST: verifyPaymentRoute } = require('../apps/web/src/app/api/custody/verify-payment/route');
const { POST: attemptTransferRoute } = require('../apps/web/src/app/api/custody/investor-transfer/route');
const { GET: getTreasuryBalanceRoute } = require('../apps/web/src/app/api/custody/treasury-balance/route');
const { POST: treasurySpendRoute } = require('../apps/web/src/app/api/custody/treasury-spend/route');

// Request Mock Helper
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

describe('LIORA MVP — Confirmed Custody (Option A) & Manual Payment Verification Suite', function () {
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

  let custodialToken;
  let reserveVault;
  let reserveVaultAddress;

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

    // Deploy LioraReserveVault
    const VaultFactory = await ethers.getContractFactory('LioraReserveVault');
    reserveVault = await VaultFactory.deploy(deployerAddress);
    await reserveVault.waitForDeployment();
    reserveVaultAddress = (await reserveVault.getAddress()).toLowerCase();

    // Deploy LioraTokenCustodial with confirmed 100B supply split (1B Treasury, 99B Reserve)
    const TokenFactory = await ethers.getContractFactory('contracts/LioraTokenCustodial.sol:LioraTokenCustodial');
    custodialToken = await TokenFactory.deploy(treasuryAddress, reserveVaultAddress);
    await custodialToken.waitForDeployment();
    await reserveVault.setToken(await custodialToken.getAddress());

    CustodialAllocationLedger.resetForTesting();
    PaymentReferenceRegistry.resetForTesting();
  });

  // SIWE Signed Header Helper
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
  // 1. TOKEN CONTRACT SUPPLY & CAP INVARIANTS (100B TOTAL, 1B TREASURY, 99B RESERVE)
  // =========================================================================
  describe('1. Token Supply & Cap Invariants (100B Fixed, 1B Treasury, 99B Reserve)', function () {
    it('Should mint exactly 100,000,000,000 LIORA at deployment across Treasury and Reserve', async function () {
      const totalSupply = await custodialToken.totalSupply();
      expect(totalSupply).to.equal(100_000_000_000n * 10n ** 18n);
    });

    it('Should allocate exactly 1,000,000,000 LIORA to the operating treasury', async function () {
      const treasuryBalance = await custodialToken.balanceOf(treasuryAddress);
      expect(treasuryBalance).to.equal(1_000_000_000n * 10n ** 18n);
    });

    it('Should allocate exactly 99,000,000,000 LIORA to the restricted reserve vault', async function () {
      const reserveBalance = await custodialToken.balanceOf(reserveVaultAddress);
      expect(reserveBalance).to.equal(99_000_000_000n * 10n ** 18n);
    });

    it('Should have NO mint function (future minting strictly disabled)', async function () {
      expect(custodialToken.mint).to.be.undefined;
    });

    it('Should reject unauthorized release of tokens from the reserve vault', async function () {
      const unauthorizedAmount = 1_000_000n * 10n ** 18n;
      await expect(
        reserveVault.connect(attackerMallory).releaseReserveTokens(malloryAddress, unauthorizedAmount, 'exploit')
      ).to.be.revertedWithCustomError(reserveVault, 'OwnableUnauthorizedAccount');
    });

    it('Should preserve standard ERC-20 transfer and burn compatibility without non-standard transfer restrictions', async function () {
      // Transfer from treasury to Alice (fractional 0.5 LIORA)
      const transferAmount = ethers.parseEther('0.5');
      await custodialToken.connect(treasurySigner).transfer(aliceAddress, transferAmount);

      expect(await custodialToken.balanceOf(aliceAddress)).to.equal(transferAmount);

      // Alice burns 0.1 LIORA
      const burnAmount = ethers.parseEther('0.1');
      await custodialToken.connect(investorAlice).burn(burnAmount);
      expect(await custodialToken.balanceOf(aliceAddress)).to.equal(ethers.parseEther('0.4'));
      expect(await custodialToken.totalSupply()).to.equal(100_000_000_000n * 10n ** 18n - burnAmount);
    });
  });

  // =========================================================================
  // 2. OPTION A: CUSTODIAL ALLOCATION & MANUAL PAYMENT VERIFICATION
  // =========================================================================
  describe('2. Custodial Allocation & Manual Payment Lifecycle', function () {
    let testAllocationId;

    it('Should create custodial payment intent with PENDING_PAYMENT_VERIFICATION status', async function () {
      const aliceHeaders = await createSignedHeaders(investorAlice);

      const req = createMockRequest({
        method: 'POST',
        headers: aliceHeaders,
        body: {
          investorAddress: aliceAddress,
          investorName: 'Alice Investor',
          planId: 'TIER_01',
          initialAllocationPriceINR: '0.20',
          paymentRail: 'IMPS_BANK_TRANSFER',
          paymentReference: 'HDFC-IMPS-9876543210',
          amountPaid: 50000,
          currency: 'INR',
          idempotencyKey: 'idem_alice_tier1',
        },
      });

      const res = await createPaymentIntentRoute(req);
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.record.status).to.equal('PENDING_PAYMENT_VERIFICATION');
      expect(data.record.isCustodialAllocation).to.be.true;
      expect(data.record.isInvestorTransferable).to.be.false;
      expect(data.record.isInvestorWithdrawable).to.be.false;
      expect(data.record.custodyModel).to.equal('COMPANY_CONTROLLED_CUSTODY_OPTION_A');
      expect(data.record.allocatedTokensFormatted).to.equal('625000'); // ₹125,000 / ₹0.20

      testAllocationId = data.record.allocationId;

      // Verify tokens are NOT yet reserved while pending
      const balance = CustodialAllocationLedger.getTreasuryCustodyBalance();
      expect(balance.reservedAllocationsLIORA).to.equal(0);
      expect(balance.pendingVerificationsCount).to.equal(1);
    });

    it('Should allow authorized administrator to manually verify payment and activate custodial allocation', async function () {
      // Setup admin session
      const adminUser =
        (await serverDb.findUserByUsername('grandiose_admin_custody')) ||
        (await serverDb.createUser({
          username: 'grandiose_admin_custody',
          email: 'admin@grandiose.ke',
          passwordHash: 'hash',
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
        }));
      const adminSession = await serverDb.createSession(adminUser.id, 24, '127.0.0.1');

      const req = createMockRequest({
        method: 'POST',
        cookies: { liora_session: adminSession.sessionIdentifier },
        headers: {
          'x-requested-with': 'XMLHttpRequest',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
        body: {
          allocationId: testAllocationId,
          adminNotes: 'IMPS funds received in Nairobi operating bank account.',
        },
      });

      const res = await verifyPaymentRoute(req);
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.record.status).to.equal('ACTIVE_CUSTODIAL_ALLOCATION');
      expect(data.record.paymentRecord.verificationStatus).to.equal('VERIFIED');
      expect(data.record.paymentRecord.verifiedAt).to.not.be.null;
      expect(data.record.paymentRecord.verifyingAdmin).to.not.be.null;

      // Verify tokens ARE now reserved in company custody
      const balance = CustodialAllocationLedger.getTreasuryCustodyBalance();
      expect(balance.reservedAllocationsLIORA).to.equal(625000);
      expect(balance.activeAllocationsCount).to.equal(1);
      expect(balance.pendingVerificationsCount).to.equal(0);
    });

    it('Should reject duplicate payment confirmation attempting to reuse same reference', async function () {
      const bobHeaders = await createSignedHeaders(investorBob);

      // Bob tries to use Alice's payment reference
      const intentReq = createMockRequest({
        method: 'POST',
        headers: bobHeaders,
        body: {
          investorAddress: bobAddress,
          investorName: 'Bob Investor',
          planId: 'TIER_01',
          initialAllocationPriceINR: '0.20',
          paymentRail: 'IMPS_BANK_TRANSFER',
          paymentReference: 'HDFC-IMPS-9876543210', // REUSED ALICE REFERENCE
          amountPaid: 50000,
        },
      });
      const intentRes = await createPaymentIntentRoute(intentReq);
      const intentData = await intentRes.json();
      const bobsAllocationId = intentData.record.allocationId;

      // Admin attempts verification
      const adminUser = await serverDb.findUserByUsername('grandiose_admin_custody');
      const adminSession = await serverDb.createSession(adminUser.id, 24, '127.0.0.1');

      const verifyReq = createMockRequest({
        method: 'POST',
        cookies: { liora_session: adminSession.sessionIdentifier },
        headers: {
          'x-requested-with': 'XMLHttpRequest',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
        body: {
          allocationId: bobsAllocationId,
        },
      });

      const verifyRes = await verifyPaymentRoute(verifyReq);
      expect(verifyRes.status).to.equal(400);
      const verifyData = await verifyRes.json();
      expect(verifyData.error).to.include('DUPLICATE_PAYMENT_REFERENCE');
    });

    it('Should reject unauthorized payment verification by non-admin investor', async function () {
      const aliceHeaders = await createSignedHeaders(investorAlice);

      const req = createMockRequest({
        method: 'POST',
        headers: aliceHeaders, // Alice's signature, not admin
        body: {
          allocationId: testAllocationId,
        },
      });

      const res = await verifyPaymentRoute(req);
      expect(res.status).to.equal(403);
    });
  });

  // =========================================================================
  // 3. SERVER-SIDE RBAC & INVIOLABLE INVESTOR BARRIER ENFORCEMENT
  // =========================================================================
  describe('3. Server-Side RBAC & Inviolable Investor Barriers', function () {
    it('Should allow investor to query their own custodial allocations', async function () {
      const aliceHeaders = await createSignedHeaders(investorAlice);

      const req = createMockRequest({
        url: `http://localhost:3000/api/custody/allocations?address=${aliceAddress}`,
        headers: aliceHeaders,
      });

      const res = await getAllocationsRoute(req);
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.custodialAllocations.length).to.equal(1);
      expect(data.custodialAllocations[0].custodyModel).to.equal('COMPANY_CONTROLLED_CUSTODY_OPTION_A');
      expect(data.disclaimer).to.include('held in company treasury custody');
    });

    it('Should reject cross-investor querying (Bob attempting to view Alice records)', async function () {
      const bobHeaders = await createSignedHeaders(investorBob);

      const req = createMockRequest({
        url: `http://localhost:3000/api/custody/allocations?address=${aliceAddress}`,
        headers: bobHeaders, // Bob's signature querying Alice's data
      });

      const res = await getAllocationsRoute(req);
      expect(res.status).to.equal(403);
    });

    it('Should strictly block and audit investor attempt to TRANSFER custodial tokens (HTTP 403)', async function () {
      const req = createMockRequest({
        method: 'POST',
        body: {
          allocationId: 'CUST-ALLOC-TEST-001',
          callerAddress: aliceAddress,
          action: 'TRANSFER',
          recipientAddress: bobAddress,
          amount: '10000',
        },
      });

      const res = await attemptTransferRoute(req);
      expect(res.status).to.equal(403);
      const data = await res.json();
      expect(data.code).to.equal('UNAUTHORIZED_CUSTODIAL_INVESTOR_ACTION');
      expect(data.error).to.include('cannot transfer');
    });

    it('Should strictly block investor attempt to WITHDRAW custodial tokens (HTTP 403)', async function () {
      const req = createMockRequest({
        method: 'POST',
        body: {
          allocationId: 'CUST-ALLOC-TEST-001',
          callerAddress: aliceAddress,
          action: 'WITHDRAW',
        },
      });

      const res = await attemptTransferRoute(req);
      expect(res.status).to.equal(403);
      const data = await res.json();
      expect(data.code).to.equal('UNAUTHORIZED_CUSTODIAL_INVESTOR_ACTION');
      expect(data.error).to.include('cannot withdraw');
    });

    it('Should strictly block investor attempt to SWAP, SPLIT, or BURN custodial tokens (HTTP 403)', async function () {
      for (const action of ['SWAP', 'SPLIT', 'BURN']) {
        const req = createMockRequest({
          method: 'POST',
          body: {
            allocationId: 'CUST-ALLOC-TEST-001',
            callerAddress: aliceAddress,
            action,
          },
        });

        const res = await attemptTransferRoute(req);
        expect(res.status).to.equal(403);
      }
    });
  });

  // =========================================================================
  // 4. TREASURY SPENDING GUARDRAILS & DOUBLE-ENTRY CONSERVATION
  // =========================================================================
  describe('4. Treasury Spending Guardrails & Allocation Protection', function () {
    it('Should return accurate double-entry breakdown via GET /api/custody/treasury-balance', async function () {
      const req = createMockRequest({
        url: 'http://localhost:3000/api/custody/treasury-balance',
      });

      const res = await getTreasuryBalanceRoute(req);
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.success).to.be.true;
      expect(data.balance.totalHoldingsLIORA).to.equal(1_000_000_000); // 1 Billion
      expect(data.balance.maxSupplyCapBaseUnits).to.equal((100_000_000_000n * 10n ** 18n).toString()); // 100 Billion
      expect(data.balance.reservedAllocationsLIORA).to.equal(625000);
      expect(data.balance.unrestrictedFreeLIORA).to.equal(1_000_000_000 - 625000);
      expect(data.balance.isConserved).to.be.true;
    });

    it('Should allow treasury to spend within unrestricted free balance', async function () {
      const adminUser = await serverDb.findUserByUsername('grandiose_admin_custody');
      const adminSession = await serverDb.createSession(adminUser.id, 24, '127.0.0.1');

      const req = createMockRequest({
        method: 'POST',
        cookies: { liora_session: adminSession.sessionIdentifier },
        headers: {
          'x-requested-with': 'XMLHttpRequest',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
        body: {
          spendAmountBaseUnits: (10_000_000n * 10n ** 18n).toString(), // 10M LIORA spend
          recipientAddress: '0x000000000000000000000000000000000000dEaD',
          purpose: 'Liquidity seeding for PancakeSwap pool.',
        },
      });

      const res = await treasurySpendRoute(req);
      expect(res.status).to.equal(200);
      const data = await res.json();
      expect(data.success).to.be.true;
    });

    it('Should strictly BLOCK treasury spend if it would encroach on reserved investor allocations', async function () {
      const adminUser = await serverDb.findUserByUsername('grandiose_admin_custody');
      const adminSession = await serverDb.createSession(adminUser.id, 24, '127.0.0.1');

      // Attempt to spend more than unrestricted free balance
      const balance = CustodialAllocationLedger.getTreasuryCustodyBalance();
      const freeBaseUnits = BigInt(balance.unrestrictedFreeBaseUnits);
      const excessiveSpend = freeBaseUnits + 1000n * 10n ** 18n; // Exceeds free balance

      const req = createMockRequest({
        method: 'POST',
        cookies: { liora_session: adminSession.sessionIdentifier },
        headers: {
          'x-requested-with': 'XMLHttpRequest',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
        body: {
          spendAmountBaseUnits: excessiveSpend.toString(),
          recipientAddress: '0x000000000000000000000000000000000000dEaD',
          purpose: 'Excessive spend attempting to liquidate investor collateral.',
        },
      });

      const res = await treasurySpendRoute(req);
      expect(res.status).to.equal(400);
      const data = await res.json();
      expect(data.code).to.equal('INSUFFICIENT_UNRESERVED_TREASURY_BALANCE');
      expect(data.error).to.include('Cannot spend tokens reserved for investor custodial allocations');
    });
  });
});
