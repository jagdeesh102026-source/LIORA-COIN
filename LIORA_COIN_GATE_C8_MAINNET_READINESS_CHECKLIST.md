# LIORA COIN — Gate C8: Mainnet Readiness Checklist
## Pre-Flight Requirements, Security Infrastructure, Official Mainnet Addresses & Launch Protocols

**Date:** November 18, 2026  
**Target Blockchain:** BNB Smart Chain Mainnet (Chain ID `56`)  
**Intended Trading Pair:** LIORA / USDT (PancakeSwap V2)  
**Mainnet Launch Readiness Status:** **NOT READY (BLOCKED ON MANDATORY GOVERNANCE GATES)**  
*(Mainnet Chain ID 56 remains strictly fail-closed and blocked in codebase)*

---

## 1. Verified Official BNB Smart Chain Mainnet Infrastructure

Before any mainnet deployment, all contract interfaces, routing libraries, and frontend configurations must point to verified mainnet contracts:

| Infrastructure Component | Canonical Address on BSC Mainnet | Verification Status | Source / Authority |
| :--- | :--- | :---: | :--- |
| **PancakeSwap V2 Router** | `0x10ED43C718714eb63d5aA57B78B54704E256024E` | **CONFIRMED** | Official PancakeSwap Documentation |
| **PancakeSwap V2 Factory** | `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` | **CONFIRMED** | Official PancakeSwap Documentation |
| **Binance-Peg USDT (Tether USD)** | `0x55d398326f99059fF775485246999027B3197955` | **CONFIRMED** | Official Tether / Binance BscScan Verified |
| **WBNB (Wrapped BNB)** | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | **CONFIRMED** | Official WBNB Contract on BSC |

> [!IMPORTANT]
> Never use testnet token addresses (`0xeD155...` or `0x0b419...`) on mainnet. MockUSDT has no value or liquidity on mainnet; only genuine Binance-Peg USDT (`0x55d3...`) may be paired.

---

## 2. Comprehensive Mainnet Readiness Gates

### Gate 1: Smart Contract Security & Formal Verification
- [ ] **Third-Party External Security Audit:** Commission an independent audit from an established Web3 security firm (e.g., CertiK, OpenZeppelin, Hacken, Halborn).
- [ ] **Zero High/Critical Findings:** Resolve all high and critical issues flagged during external review.
- [ ] **Bytecode Verification on BscScan:** Submit exact compiler settings (`0.8.20`, optimizer runs: `200`) and verify source code on BscScan immediately upon deployment.
- [ ] **Constructor Parameter Audit:** Confirm initial owner is set directly to the Gnosis Safe multi-sig address, NOT an individual developer's EOA.

### Gate 2: Multi-Signature Treasury & Role Separation
- [ ] **Gnosis Safe Deployment on BSC Mainnet:** Deploy a multi-signature Safe contract with a minimum **3-of-5 threshold**.
- [ ] **Hardware Wallet Requirement:** All 5 signers must use hardware security modules (Ledger, Trezor) to sign transactions. No hot wallets allowed as signers.
- [ ] **Keyholder Geographic Distribution:** Signers must be distributed across different organizations/locations to prevent single-point coercion or compromise.
- [ ] **Timelock Controller:** Deploy an OpenZeppelin `TimelockController` (minimum 48-hour delay) between the Safe and `LioraToken.pause()`.

### Gate 3: Liquidity Provisioning & Certified LP Lock
- [ ] **Real Paired Capital Allocation:** Secure confirmed treasury allocation of at least **$100,000 to $500,000 genuine USDT** for the initial PancakeSwap V2 pool.
- [ ] **Initial Spot Price Determination:** Formally calculate initial opening ratio ($P = \frac{\text{Deposited USDT}}{\text{Deposited LIORA}}$).
- [ ] **Certified Third-Party Locker Integration:** Prepare lock transaction on **UNCX Network (UniCrypt)** or **PinkLock (PinkSale)**.
- [ ] **Immutable Lock Duration:** Lock **100% of minted LP tokens (`Cake-LP`) for at least 24 to 36 months**.
- [ ] **Public Verification Certificate:** Publish the verifiable on-chain locker URL in project documentation and the website header.

### Gate 4: Token Vesting & Anti-Dump Safeguards
- [ ] **Deploy OpenZeppelin `VestingWallet`:** Lock the 700,000,000 ecosystem tokens into a transparent vesting smart contract.
- [ ] **Vesting Schedule:** Enforce a 6-month cliff followed by 24-month linear per-block release.
- [ ] **Circulating Supply Proof:** Publish public dashboard displaying on-chain locked tokens vs true circulating supply.

### Gate 5: Infrastructure, RPC & Frontend Security
- [ ] **Redundant Enterprise RPC Nodes:** Procure enterprise dedicated endpoints (e.g. QuickNode, Alchemy, Ankr) with automatic failover to eliminate public node rate limits.
- [ ] **Content Security Policy (CSP):** Enforce strict HTTP headers restricting script sources and preventing cross-site scripting (XSS) or wallet-injection attacks.
- [ ] **Subresource Integrity (SRI):** Hash all external scripts and bundles to guarantee untampered delivery.
- [ ] **DNSSEC & Cloudflare Protection:** Configure enterprise DDoS mitigation, DNSSEC, and SSL/TLS termination on all web portals.
- [ ] **Automated Incident Response Runbook:** Establish procedures for network halts, RPC outages, front-end compromises, and DEX pool volatility.

### Gate 6: Legal, Regulatory & Tax Clearance
- [ ] **Legal Opinion Letter:** Retain qualified Web3 legal counsel to review token utility and confirm non-security status.
- [ ] **Formal Retraction of Guaranteed Multipliers:** Remove all 5× to 30× marketing materials to eliminate SEBI Collective Investment Scheme (CIS) classification.
- [ ] **FIU-IND & TDS Compliance Architecture:** Ensure e-commerce and fiat gateway on-ramps deduct 1% TDS under Section 194S of the Indian Income Tax Act.
- [ ] **Terms of Service & Risk Disclaimers:** Update DApp terms with explicit disclaimers regarding market volatility, impermanent loss, and the lack of guaranteed payouts.

---

## 3. Launch Day Deployment Checklist (Sequential Runbook)

```
[ PHASE A: CONTRACT DEPLOYMENT ]
1. Signer connects Ledger to Hardhat / Gnosis Safe interface.
2. Verify BSC Mainnet Chain ID (56) and gas price.
3. Deploy LioraToken.sol with Gnosis Safe as initialOwner.
4. Verify source code on BscScan.
5. Deploy TokenVesting contract and transfer 700M ecosystem tokens into vesting.

[ PHASE B: LIQUIDITY PROVISIONING ]
6. Transfer approved LIORA and USDT into Gnosis Safe.
7. Approve PancakeSwap V2 Router (0x10ED43C718714eb63d5aA57B78B54704E256024E).
8. Execute addLiquidity with strict 0.5% slippage and 5-minute deadline.
9. Verify Cake-LP receipt in Gnosis Safe.

[ PHASE C: LP TOKEN LOCKING ]
10. Transfer 100% of Cake-LP tokens to UNCX Network locker.
11. Confirm on-chain 36-month lock timestamp.
12. Verify locker certificate publicly.

[ PHASE D: FRONTEND CUTOVER ]
13. Update website configuration with mainnet pair and token addresses.
14. Flip mainnet feature flag in blockchainRegistry.ts to ENABLED.
15. Perform end-to-end small test swap on live production URL.
```

---

## 4. Mainnet Readiness Verdict

| Category | Status | Action Required |
| :--- | :---: | :--- |
| **Smart Contract Code Quality** | **READY** | Base contracts pass all unit and regression tests (643/643) |
| **Mainnet Address Alignment** | **READY** | Official Router, Factory, and USDT addresses confirmed |
| **Treasury & Multi-Sig Governance** | **BLOCKED** | Must deploy Gnosis Safe 3-of-5 and Timelock |
| **Liquidity Custody & Locking** | **BLOCKED** | Must commit LP tokens to UNCX/PinkLock for 24+ months |
| **External Security Audit** | **BLOCKED** | Independent third-party audit report required |
| **Legal & Regulatory Clearance** | **BLOCKED** | Guaranteed multipliers must be retracted; legal opinion required |
| **Overall Mainnet Verdict** | **BLOCKED** | **Do Not Deploy to Mainnet Until Mandatory Gates Are Cleared** |
