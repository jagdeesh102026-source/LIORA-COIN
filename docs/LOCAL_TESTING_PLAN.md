# OXENIQ — Local Testing & Functional Verification Plan

**Date:** October 2026  
**Target Environment:** Local Developer Laptop (Windows / Node.js 20+ / Hardhat / Next.js 16)  
**Project Root:** `D:\Projects\OXENIQ`  
**Status:** Ready for Execution  

---

## 1. Overview & Objective

This test plan details the systematic, live execution and verification of all currently implemented functions across smart contracts, commerce calculation utilities, and the Next.js web application for the OXENIQ project. 

The primary goal is to run live commands, start the local server, exercise actual user flows via browser automation and unit test suites, uncover any edge-case failures, apply minimal safe bug fixes, and verify end-to-end stability prior to any testnet or mainnet deployment.

---

## 2. Environment & Prerequisites Checklist

| Component | Prerequisite | Verification Command | Expected Output |
|---|---|---|---|
| **Node.js** | `>= 20.0.0` | `node -v` | v20+ / v22+ |
| **Package Manager** | `npm` (Lockfile compliant) | `npm -v` | Active npm version |
| **Solidity Toolchain** | Hardhat `^2.22.0` | `npx hardhat --version` | 2.22.x |
| **Solidity Compiler** | `0.8.20` | Configured in `hardhat.config.js` | Optimizer 200 runs |
| **Frontend Framework** | Next.js `16.4.0` (Turbopack) | `npm run build` in `apps/web` | Clean compilation |
| **Local Ports** | `3000` (Web), `8545` (Hardhat node if started) | Port availability | Free to bind |

---

## 3. Available Features Catalog & Operational Status

| Feature / Module | Location | Operational Status | Notes / Limitations |
|---|---|---|---|
| **OxeniqToken (BEP-20)** | `contracts/OxeniqToken.sol` | **Fully Implemented** | Fixed 1B supply, 18 decimals, Pausable, Burnable, Ownable2Step, 0% tax. |
| **AllocationManager** | `contracts/AllocationManager.sol` | **Fully Implemented** | Decoupled 70:30 allocation math, ReentrancyGuard, two-step recipient admin. |
| **70:30 Commerce Engine** | `apps/web/src/lib/commerce/` | **Fully Implemented** | BigInt precision engine for Interpretation A and B. |
| **Exchange Rate Policy** | `apps/web/src/lib/commerce/` | **Fully Implemented** | USD $100 min order, 15-min TTL, 60-min stale rate rejection. |
| **Payment Gateway Adapter** | `apps/web/src/lib/commerce/` | **Adapter Skeleton** | Provider-agnostic interface, timing-safe HMAC-SHA256, idempotency store. |
| **E-Commerce Buy Page** | `apps/web/src/app/buy/page.tsx` | **Staged (Disabled)** | Interactive calculator, live breakdown, disabled checkout button. |
| **DEX Swap Terminal** | `apps/web/src/app/swap/page.tsx` | **Staged (Disabled)** | Slippage input, token estimates, honest staging notice. |
| **Cross-Chain Bridge** | `apps/web/src/app/cross-chain/` | **Planned / Informational** | Architectural specifications for future TRON interoperability. |
| **Web3 Wallet Connector** | `apps/web/src/hooks/useWeb3Wallet.ts` | **Implemented** | BSC testnet/mainnet detection, chain switching, non-custodial. |
| **Borrowing / Lending** | N/A | **POSTPONED** | Strictly excluded from Phase 12. |

---

## 4. Test Sequence & Execution Workflow

```
[Phase 2: Contract Tests] ──> [Phase 3: Web Server & Pages] ──> [Phase 4: Buy Page Deep Dive]
           │                                                                 │
           ▼                                                                 ▼
[Phase 5: Wallet Hook Tests] ──> [Phase 6: Swap & Cross-Chain] ──> [Phase 7: Security & Build]
                                                                             │
                                                                             ▼
                                                                [Phase 8 & 9: Fix, Retest, Report]
```

### Sequence 1: Smart Contract & Unit Testing
1. Run full Hardhat test suite: `npx hardhat test`.
2. Verify all 5 suites:
   - `OxeniqToken.test.js`
   - `AllocationManager.test.js`
   - `Phase12_TokenSupplyAndSecurity.test.js`
   - `Phase12_ECommerceAllocation.test.js`
   - `Phase12_PaymentAndIdempotency.test.js`
3. Verify 1,000,000,000 supply, zero minting, zero transfer fee, pause circuit breaker, 2-step ownership, reentrancy guards, and absence of borrowing/lending keywords.

### Sequence 2: Local Web Server Launch & Browser Automation
1. Launch development server: `npm run dev` in `apps/web`.
2. Confirm server is listening on `http://localhost:3000`.
3. Launch browser subagent to visit and test every route:
   - `/` (Home)
   - `/buy` (Purchase Terminal)
   - `/token` (Tokenomics)
   - `/ecosystem` (Component Registry)
   - `/swap` (DEX Swap)
   - `/cross-chain` (Bridge)
   - `/docs` (Documentation & Whitepaper)
4. Verify responsive layout, logo display, navigation links, and absence of console errors.

### Sequence 3: Purchase Flow & Input Validation Testing
1. Test empty, malformed, and valid BSC wallet addresses (`0x...`).
2. Test empty, zero, negative, and below-minimum INR purchase amounts.
3. Test quick-select buttons (₹8,500, ₹25,000, ₹50,000, ₹100,000).
4. Verify that live checkout button remains disabled with "Checkout Staged" safety label.

### Sequence 4: Wallet Hook & Network State Testing
1. Test page behavior without a Web3 provider.
2. Test connection modal triggers and error handling.
3. Test network switching logic.

### Sequence 5: Production Build & Dependency Audit
1. Run `npm run build` in `apps/web`.
2. Review Turbopack static compilation.
3. Assess the Next.js 16.4.0 security advisory.
4. Verify zero hardcoded private keys or secrets.

### Sequence 6: Bug Fixing, Retesting & Results Documentation
1. Identify any UX or logic defects discovered during testing.
2. Implement minimal safe fixes.
3. Re-run contract tests and Next.js build.
4. Compile findings into `docs/LOCAL_TEST_RESULTS.md`.
