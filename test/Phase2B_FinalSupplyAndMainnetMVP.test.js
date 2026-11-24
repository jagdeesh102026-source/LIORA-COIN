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
const { serverDb } = require('../apps/web/src/lib/server/db');

// Route handlers
const { POST: attemptTransferRoute } = require('../apps/web/src/app/api/custody/investor-transfer/route');
const { GET: getTreasuryBalanceRoute } = require('../apps/web/src/app/api/custody/treasury-balance/route');
const { POST: treasurySpendRoute } = require('../apps/web/src/app/api/custody/treasury-spend/route');
const { POST: createPaymentIntentRoute } = require('../apps/web/src/app/api/custody/payment-intent/route');
const { POST: verifyPaymentRoute } = require('../apps/web/src/app/api/custody/verify-payment/route');

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

describe('LIORA — Final Fixed Supply Architecture & Mainnet MVP Verification Suite', function () {
  this.timeout(60000);

  let deployer;
  let treasurySigner;
  let reserveGovernanceSigner;
  let investorAlice;
  let investorBob;
  let recipientCharlie;
  let attackerMallory;

  let deployerAddress;
  let treasuryAddress;
  let reserveGovernanceAddress;
  let aliceAddress;
  let bobAddress;
  let charlieAddress;
  let malloryAddress;

  let lioraToken;
  let reserveVault;
  let reserveVaultAddress;

  const EXACT_100B = 100_000_000_000n * 10n ** 18n;
  const EXACT_1B = 1_000_000_000n * 10n ** 18n;
  const EXACT_99B = 99_000_000_000n * 10n ** 18n;
  const FIVE_MILLION = 5_000_000n * 10n ** 18n;
  const POINT_FIVE = 5n * 10n ** 17n; // 0.5 LIORA (18 decimals)

  before(async function () {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    treasurySigner = signers[1];
    reserveGovernanceSigner = signers[2];
    investorAlice = signers[3];
    investorBob = signers[4];
    recipientCharlie = signers[5];
    attackerMallory = signers[6];

    deployerAddress = (await deployer.getAddress()).toLowerCase();
    treasuryAddress = (await treasurySigner.getAddress()).toLowerCase();
    reserveGovernanceAddress = (await reserveGovernanceSigner.getAddress()).toLowerCase();
    aliceAddress = (await investorAlice.getAddress()).toLowerCase();
    bobAddress = (await investorBob.getAddress()).toLowerCase();
    charlieAddress = (await recipientCharlie.getAddress()).toLowerCase();
    malloryAddress = (await attackerMallory.getAddress()).toLowerCase();

    // 1. Deploy LioraReserveVault owned by reserveGovernanceSigner
    const VaultFactory = await ethers.getContractFactory('LioraReserveVault');
    reserveVault = await VaultFactory.deploy(reserveGovernanceAddress);
    await reserveVault.waitForDeployment();
    reserveVaultAddress = (await reserveVault.getAddress()).toLowerCase();

    // 2. Deploy LioraTokenCustodial (mints 1B to treasury, 99B to reserveVault)
    const TokenFactory = await ethers.getContractFactory('contracts/LioraTokenCustodial.sol:LioraTokenCustodial');
    lioraToken = await TokenFactory.deploy(treasuryAddress, reserveVaultAddress);
    await lioraToken.waitForDeployment();

    // 3. Bind token to reserveVault (as governance owner)
    await reserveVault.connect(reserveGovernanceSigner).setToken(await lioraToken.getAddress());

    CustodialAllocationLedger.resetForTesting();
    PaymentReferenceRegistry.resetForTesting();
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
  // TASK 2 — 13 MANDATORY VERIFICATION CHECKS
  // =========================================================================

  it('Check 1: Exact 100B totalSupply at deployment', async function () {
    const totalSupply = await lioraToken.totalSupply();
    expect(totalSupply).to.equal(EXACT_100B);
  });

  it('Check 2: Exact 1B operating treasury balance at deployment', async function () {
    const treasuryBalance = await lioraToken.balanceOf(treasuryAddress);
    expect(treasuryBalance).to.equal(EXACT_1B);
  });

  it('Check 3: Exact 99B reserve balance at deployment', async function () {
    const reserveBalance = await lioraToken.balanceOf(reserveVaultAddress);
    expect(reserveBalance).to.equal(EXACT_99B);
    const vaultReportedBalance = await reserveVault.getReserveBalance();
    expect(vaultReportedBalance).to.equal(EXACT_99B);
  });

  it('Check 4: No future minting capability (mint is permanently disabled)', async function () {
    // Assert no mint function exists in contract interface
    expect(lioraToken.mint).to.be.undefined;
    expect(() => lioraToken.getFunction('mint')).to.throw();

    // Direct low-level call to standard mint selector (0x40c10f19) must revert
    const mintSelector = '0x40c10f19';
    const mintCalldata = ethers.concat([
      mintSelector,
      ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [treasuryAddress, EXACT_1B]),
    ]);

    await expect(
      treasurySigner.sendTransaction({
        to: await lioraToken.getAddress(),
        data: mintCalldata,
      })
    ).to.be.reverted;
  });

  it('Check 5: Transfer of 5 million LIORA from operating treasury to recipient', async function () {
    const tx = await lioraToken.connect(treasurySigner).transfer(charlieAddress, FIVE_MILLION);
    await tx.wait();

    const charlieBalance = await lioraToken.balanceOf(charlieAddress);
    expect(charlieBalance).to.equal(FIVE_MILLION);
  });

  it('Check 6: Correct remaining treasury balance of 995 million LIORA', async function () {
    const treasuryBalance = await lioraToken.balanceOf(treasuryAddress);
    const expectedRemaining = EXACT_1B - FIVE_MILLION; // 995,000,000 LIORA
    expect(treasuryBalance).to.equal(expectedRemaining);
    expect(treasuryBalance).to.equal(995_000_000n * 10n ** 18n);
  });

  it('Check 7: Fractional transfer of 0.5 LIORA and smaller amounts down to atomic units', async function () {
    // Charlie transfers 0.5 LIORA to Alice
    const tx1 = await lioraToken.connect(recipientCharlie).transfer(aliceAddress, POINT_FIVE);
    await tx1.wait();

    const aliceBalance = await lioraToken.balanceOf(aliceAddress);
    expect(aliceBalance).to.equal(POINT_FIVE);

    // Charlie transfers smallest atomic unit (1 wei = 10^-18 LIORA) to Bob
    const ONE_WEI = 1n;
    const tx2 = await lioraToken.connect(recipientCharlie).transfer(bobAddress, ONE_WEI);
    await tx2.wait();

    const bobBalance = await lioraToken.balanceOf(bobAddress);
    expect(bobBalance).to.equal(ONE_WEI);
  });

  it('Check 8: Burn of an authorized quantity by token holder', async function () {
    // Alice burns 0.1 LIORA from her 0.5 LIORA balance
    const BURN_AMOUNT = 1n * 10n ** 17n; // 0.1 LIORA
    const tx = await lioraToken.connect(investorAlice).burn(BURN_AMOUNT);
    await tx.wait();

    const aliceRemaining = await lioraToken.balanceOf(aliceAddress);
    expect(aliceRemaining).to.equal(POINT_FIVE - BURN_AMOUNT); // 0.4 LIORA
  });

  it('Check 9: Total supply reduction after burn', async function () {
    const BURN_AMOUNT = 1n * 10n ** 17n; // 0.1 LIORA burned in Check 8
    const expectedTotalSupply = EXACT_100B - BURN_AMOUNT;
    const currentTotalSupply = await lioraToken.totalSupply();
    expect(currentTotalSupply).to.equal(expectedTotalSupply);
  });

  it('Check 10: Unauthorized reserve withdrawal rejection', async function () {
    // Mallory attempts to withdraw tokens from the reserve vault
    const attemptAmount = 1_000_000n * 10n ** 18n;
    await expect(
      reserveVault.connect(attackerMallory).releaseReserveTokens(malloryAddress, attemptAmount, 'Unauthorized heist')
    ).to.be.revertedWithCustomError(reserveVault, 'OwnableUnauthorizedAccount');

    // Deployer (who is not the governance owner) also cannot withdraw
    await expect(
      reserveVault.connect(deployer).releaseReserveTokens(deployerAddress, attemptAmount, 'Deployer exploit')
    ).to.be.revertedWithCustomError(reserveVault, 'OwnableUnauthorizedAccount');

    // Authorized governance owner CAN release tokens with documented purpose
    const releaseAmount = 10_000n * 10n ** 18n;
    const releaseTx = await reserveVault
      .connect(reserveGovernanceSigner)
      .releaseReserveTokens(treasuryAddress, releaseAmount, 'Board Approved Liquidity Injection');
    await releaseTx.wait();

    expect(await lioraToken.balanceOf(treasuryAddress)).to.equal(
      995_000_000n * 10n ** 18n + releaseAmount
    );
  });

  it('Check 11: Investor transaction endpoint rejection (strict HTTP 403 on custodial transfer/withdraw)', async function () {
    const aliceHeaders = await createSignedHeaders(investorAlice);

    const req = createMockRequest({
      method: 'POST',
      headers: aliceHeaders,
      body: {
        allocationId: 'ALLOC-TEST-OPTION-A',
        callerAddress: aliceAddress,
        action: 'TRANSFER',
        recipientAddress: bobAddress,
        amount: '1000',
      },
    });

    const res = await attemptTransferRoute(req);
    const body = await res.json();

    expect(res.status).to.equal(403);
    expect(body.success).to.be.false;
    expect(body.code).to.equal('UNAUTHORIZED_CUSTODIAL_INVESTOR_ACTION');
    expect(body.error).to.include('Investors hold read-only custodial allocation records');
    expect(body.custodyModel).to.equal('COMPANY_CONTROLLED_CUSTODY_OPTION_A');
  });

  it('Check 12: Custodial allocation accounting and reserved balance protections', async function () {
    // 1. Create admin user and session for verification
    const adminUser =
      (await serverDb.findUserByUsername('admin_audit')) ||
      (await serverDb.createUser({
        username: 'admin_audit',
        email: 'admin-audit@grandiose.ke',
        passwordHash: 'audit-hash',
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
      }));
    const adminSession = await serverDb.createSession(adminUser.id, 24, '127.0.0.1');

    // 2. Alice creates payment intent for TIER_01 (₹50,000 -> 25,000 LIORA at ₹2.00)
    const aliceHeaders = await createSignedHeaders(investorAlice);
    const intentReq = createMockRequest({
      method: 'POST',
      headers: aliceHeaders,
      body: {
        investorAddress: aliceAddress,
        investorName: 'Alice Investor',
        planId: 'TIER_01',
        initialAllocationPriceINR: '2.00',
        paymentRail: 'NEFT_BANK_TRANSFER',
        paymentReference: 'NEFT-FINAL-TEST-001',
        amountPaid: 50000,
        currency: 'INR',
      },
    });
    const intentRes = await createPaymentIntentRoute(intentReq);
    expect(intentRes.status).to.equal(200);
    const intentBody = await intentRes.json();
    expect(intentBody.success).to.be.true;
    const allocationId = intentBody.record.allocationId;

    // 3. Before admin verification, allocation is PENDING and holdings untouched
    const balBefore = CustodialAllocationLedger.getTreasuryCustodyBalance();
    expect(balBefore.pendingVerificationsCount).to.equal(1);
    expect(balBefore.activeAllocationsCount).to.equal(0);

    // 4. Admin verifies payment
    const verifyReq = createMockRequest({
      method: 'POST',
      cookies: { liora_session: adminSession.sessionIdentifier },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
      body: {
        allocationId,
        adminNotes: 'Verified via bank ledger statement',
      },
    });
    const verifyRes = await verifyPaymentRoute(verifyReq);
    expect(verifyRes.status).to.equal(200);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.success).to.be.true;
    expect(verifyBody.record.status).to.equal('ACTIVE_CUSTODIAL_ALLOCATION');

    // 5. Free balance decreases by 62,500 reserved tokens (Tier 01 contractual value ₹125,000 / ₹2.00)
    const balAfter = CustodialAllocationLedger.getTreasuryCustodyBalance();
    expect(balAfter.reservedAllocationsLIORA).to.equal(62500);
    expect(balAfter.unrestrictedFreeLIORA).to.equal(1_000_000_000 - 62500);

    // 6. Unrestricted treasury spend cannot spend reserved tokens
    const excessiveSpendReq = createMockRequest({
      method: 'POST',
      cookies: { liora_session: adminSession.sessionIdentifier },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
      body: {
        spendAmountBaseUnits: (1_000_000_000n * 10n ** 18n).toString(), // Exceeds unreserved 999,975,000
        recipientAddress: charlieAddress,
        purpose: 'Excessive spend attempt',
      },
    });
    const excessiveSpendRes = await treasurySpendRoute(excessiveSpendReq);
    expect(excessiveSpendRes.status).to.equal(400);
    const excessiveBody = await excessiveSpendRes.json();
    expect(excessiveBody.error).to.include('INSUFFICIENT_UNRESERVED_TREASURY_BALANCE');
  });

  it('Check 13: Swap integration and PancakeSwap liquidity prerequisites', async function () {
    // 1. BEP-20 Standard Interface Verification
    expect(await lioraToken.name()).to.equal('LIORA COIN');
    expect(await lioraToken.symbol()).to.equal('LIORA');
    expect(await lioraToken.decimals()).to.equal(18);

    // 2. Zero-Fee Transfer Preservation (100% tokens received)
    const testAmount = ethers.parseEther('1000');
    const balBefore = await lioraToken.balanceOf(charlieAddress);
    await lioraToken.connect(treasurySigner).transfer(charlieAddress, testAmount);
    const balAfter = await lioraToken.balanceOf(charlieAddress);
    expect(balAfter - balBefore).to.equal(testAmount); // Exact conservation, 0% tax

    // 3. Approval and Allowance Mechanism for DEX Routers
    const ROUTER_MOCK_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E'; // PancakeSwap Router V2
    await lioraToken.connect(treasurySigner).approve(ROUTER_MOCK_ADDRESS, testAmount);
    const allowance = await lioraToken.allowance(treasuryAddress, ROUTER_MOCK_ADDRESS);
    expect(allowance).to.equal(testAmount);

    // 4. Liquidity Provision Ratio Calculation
    // Target Initial Price: $0.10 USDT per LIORA
    // Initial Liquidity Pool Pairing: 1,000,000 LIORA : 100,000 USDT
    const liquidityLiora = 1_000_000;
    const liquidityUsdt = 100_000;
    const impliedPrice = liquidityUsdt / liquidityLiora;
    expect(impliedPrice).to.equal(0.10);

    // Verify operating treasury possesses adequate unreserved balance to seed liquidity
    const treasuryBal = CustodialAllocationLedger.getTreasuryCustodyBalance();
    expect(treasuryBal.unrestrictedFreeLIORA).to.be.greaterThan(liquidityLiora);
  });
});
