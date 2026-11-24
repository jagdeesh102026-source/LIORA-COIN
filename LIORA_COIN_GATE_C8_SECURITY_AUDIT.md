# LIORA COIN — Gate C8: Smart Contract Security Audit Report
## Comprehensive Vulnerability Analysis, Permission Review & Code Hardening Assessment

**Date:** November 18, 2026  
**Project:** OXENIQ / LIORA COIN  
**Location:** `D:\Projects\OXENIQ`  
**Network Under Audit:** BNB Smart Chain Testnet (Chain ID `97`)  
**Audit Scope:** All Solidity smart contracts in `contracts/`, deployment manifests in `deployments/`, and DEX integration hooks in `apps/web/src/`  
**Verdict:** **CONDITIONAL PASS** (Robust base contract code with 0 functional defects; requires multi-signature transition and timelock governance prior to mainnet launch)

---

## 1. Executive Summary

This security audit inspects the complete smart contract infrastructure of LIORA COIN, focusing on bytecode security, access control, supply inflation vectors, reentrancy, DEX liquidity interactions, front-running risks, and centralization vectors.

### Key Metrics:
- **Solidity Version:** `0.8.20` (Built with overflow/underflow protection by default)
- **Framework Standards:** OpenZeppelin Contracts v5.0.2 (ERC20, ERC20Burnable, Pausable, Ownable2Step, SafeERC20, ReentrancyGuard)
- **Compilation Status:** Clean (0 compilation errors)
- **Automated Test Results:** 643 passing tests across unit, integration, and security suites
- **Linter Findings (Solhint):** 0 errors, 22 minor NatSpec/indexing warnings

---

## 2. Smart Contract Inventory & Scope

| Contract | File Path | Compiler Version | Primary Purpose | Key Inherited Modules |
| :--- | :--- | :--- | :--- | :--- |
| **`LioraToken`** | `contracts/LioraToken.sol` | `^0.8.20` | Canonical BEP-20 ecosystem token | `ERC20`, `ERC20Burnable`, `Pausable`, `Ownable2Step` |
| **`MockUSDT`** | `contracts/MockUSDT.sol` | `^0.8.20` | Testnet sandbox 1:1 USD reference | `ERC20`, `Ownable2Step` |
| **`AllocationManager`** | `contracts/AllocationManager.sol` | `^0.8.20` | 70:30 e-commerce allocation splitter | `Ownable2Step`, `ReentrancyGuard`, `SafeERC20` |
| **`OxeniqToken`** | `contracts/OxeniqToken.sol` | `^0.8.20` | Base ecosystem BEP-20 token | `ERC20`, `ERC20Burnable`, `Pausable`, `Ownable2Step` |
| **`TestnetTokenSale`** | `contracts/TestnetTokenSale.sol` | `^0.8.20` | Fixed-rate testnet sale (Chain 97 only) | `Ownable2Step`, `Pausable`, `ReentrancyGuard`, `SafeERC20` |

---

## 3. Systematic Vulnerability & Threat Analysis

### 3.1 Minting & Supply Inflation
- **Audit Finding:** **SAFE (NO VULNERABILITY)**.
- **Verification:**
  - `LioraToken.sol` mints exactly `1,000,000,000 * 10**18` tokens once in the constructor (`initialSupply`).
  - There is **no post-deployment `mint()` function** in `LioraToken.sol`.
  - Total supply is permanently capped at 1 Billion LIORA.
  - `MockUSDT.sol` contains a privileged `mint()` function, which is acceptable because it is explicitly labeled as a testnet sandbox token.

### 3.2 Token Burning & Confiscation
- **Audit Finding:** **SAFE (NO VULNERABILITY)**.
- **Verification:**
  - Implements OpenZeppelin `ERC20Burnable`.
  - Burning is strictly non-custodial: callers can only burn their own balance via `burn(amount)` or an allowance explicitly granted by another holder via `burnFrom(account, amount)`.
  - Contract owner **cannot** unilaterally burn or confiscate user tokens.

### 3.3 Transfer Fee & AMM Invariants
- **Audit Finding:** **SAFE (NO VULNERABILITY)**.
- **Verification:**
  - Transfer and transferFrom have **zero transfer taxes** (0% fee-on-transfer).
  - Every transfer executes exact conservation: `recipientReceived == senderDeducted`.
  - Full compatibility with PancakeSwap V2 Router, Pair, and standard liquidity pools.

### 3.4 Reentrancy Protection
- **Audit Finding:** **SAFE (NO VULNERABILITY)**.
- **Verification:**
  - `AllocationManager.sol` and `TestnetTokenSale.sol` inherit OpenZeppelin's `ReentrancyGuard` and apply the `nonReentrant` modifier to external state-mutating functions (`executeAllocation`, `buyTokens`).
  - Native BNB transfers in `TestnetTokenSale.sol` adhere to the Checks-Effects-Interactions pattern.

### 3.5 Network Isolation & Bytecode Guardrails
- **Audit Finding:** **SAFE (NO VULNERABILITY)**.
- **Verification:**
  - `TestnetTokenSale.sol` enforces chain ID checks at both deployment and runtime:
    `if (block.chainid != BSC_TESTNET_CHAIN_ID && block.chainid != LOCAL_DEVNET_CHAIN_ID) revert UnsupportedNetwork(...)`
  - Bytecode level prevention stops accidental deployment or execution on BSC Mainnet (Chain ID 56).

---

## 4. Security Findings & Risk Classification

### Summary of Findings:
- **Critical:** 0
- **High:** 1
- **Medium:** 2
- **Low:** 1
- **Informational:** 2

---

### Finding SEC-01: Centralization Risk — Single EOA Ownership & Pausability
- **Severity:** **HIGH**
- **Affected File:** [contracts/LioraToken.sol](file:///d:/Projects/OXENIQ/contracts/LioraToken.sol#L58-L80)
- **Code Location:** Lines 58–68 (`pause()`, `unpause()`), Lines 74–80 (`_update()`)
- **Vulnerability Description:**
  The `LioraToken` contract inherits OpenZeppelin's `Pausable` and restricts `pause()` to `onlyOwner`. Currently, on BSC Testnet, the owner is a single Externally Owned Account (EOA): `0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350`.
- **Exploit / Impact Scenario:**
  If the private key of this single EOA is compromised, an attacker can invoke `pause()`. This instantly halts all token transfers across the entire blockchain, blocking DEX swaps on PancakeSwap and preventing all liquidity provisioning or withdrawals.
- **Recommended Mitigation:**
  1. For BSC Mainnet, ownership must **never** be assigned to a single EOA.
  2. Assign ownership to a Gnosis Safe multi-signature contract (minimum 3-of-5 threshold) with geographically distributed signers.
  3. Integrate an OpenZeppelin `TimelockController` (e.g. 48-hour delay) for administrative actions, giving the community visibility before any emergency pause or parameter update takes effect.
- **Verification Method:**
  Verify via `liora.owner()` that the owner is a verified Safe contract before public launch.

---

### Finding SEC-02: Centralization Risk — 99.98% Supply Concentration in Deployment EOA
- **Severity:** **MEDIUM**
- **Affected File:** [contracts/LioraToken.sol](file:///d:/Projects/OXENIQ/contracts/LioraToken.sol#L43-L44)
- **Code Location:** Line 44 (`_mint(initialOwner_, initialSupply)`)
- **Vulnerability Description:**
  During deployment, all 1,000,000,000 LIORA tokens were minted to `initialOwner_`. On BSC Testnet, `999,784,150.81 LIORA` (99.978% of the total supply) remains stored in the deployer EOA without programmatic vesting or multi-sig custody.
- **Exploit / Impact Scenario:**
  A single compromised private key or rogue insider could transfer tokens directly into the PancakeSwap pool, crashing the token price to zero and extracting all deposited paired USDT reserves.
- **Recommended Mitigation:**
  1. Deploy an audited `TokenVesting` contract (e.g., OpenZeppelin `VestingWallet`) to hold ecosystem and team tokens with a mandatory 12 to 36-month linear release schedule.
  2. Transfer liquidity reserve allocations directly to a dedicated multi-sig treasury vault.
- **Verification Method:**
  Query on-chain token balances of all deployer and treasury addresses; ensure circulating supply is transparently reported.

---

### Finding SEC-03: Front-Running & MEV Exposure on DEX Swaps
- **Severity:** **MEDIUM**
- **Affected File:** [apps/web/src/hooks/useDexOnChainSwap.ts](file:///d:/Projects/OXENIQ/apps/web/src/hooks/useDexOnChainSwap.ts#L300-L360)
- **Code Location:** Lines 300–360 (DEX swap quotation and slippage tolerance handling)
- **Vulnerability Description:**
  Transactions on PancakeSwap V2 pass through the public BSC mempool. If slippage tolerance is configured too loosely (e.g., >3%), MEV searchers can execute sandwich attacks (buying before the user and selling immediately after), extracting value from the trader.
- **Recommended Mitigation:**
  1. Frontend enforces a strict default slippage of **0.5%** with a maximum user-selectable ceiling of **2.0%**.
  2. Enforce a tight transaction deadline (maximum 5 minutes / 300 seconds) so that stale transactions are rejected by the router.
- **Verification Method:**
  Automated tests in `Phase2B_GateC6_WebsiteDexIntegration.test.js` verify that `minAmountOut` enforces exact slippage bounds.

---

### Finding SEC-04: Non-Custodial Conflict in AllocationManager
- **Severity:** **LOW**
- **Affected File:** [contracts/AllocationManager.sol](file:///d:/Projects/OXENIQ/contracts/AllocationManager.sol#L91-L115)
- **Code Location:** Lines 91–115 (`executeAllocation()`)
- **Vulnerability Description:**
  `AllocationManager.sol` pulls tokens from a buyer via `token.safeTransferFrom(buyer, address(this), amount)`. While functional, this requires prior ERC-20 token approval. If a user does not call `approve()`, execution reverts.
- **Recommended Mitigation:**
  Ensure the frontend checkout flow seamlessly batches or guides users through the exact approval prerequisite before invoking `executeAllocation`.
- **Verification Method:**
  Passes unit tests in `AllocationManager.test.js`.

---

### Finding SEC-05: Missing NatSpec Documentation Tags on Events
- **Severity:** **INFORMATIONAL**
- **Affected File:** `contracts/TestnetTokenSale.sol`, `contracts/AllocationManager.sol`
- **Vulnerability Description:**
  Solhint flagged 22 warnings relating to missing `@notice` and `@param` NatSpec tags on events (`TokensPurchased`, `AllocationExecuted`).
- **Recommended Mitigation:**
  Add comprehensive NatSpec tags to all public events to enhance developer clarity and automated documentation generation.
- **Verification Method:**
  Re-run `npx solhint "contracts/**/*.sol"`.

---

### Finding SEC-06: Testnet Contract Artifacts in Production Repository
- **Severity:** **INFORMATIONAL**
- **Affected File:** `contracts/MockUSDT.sol`, `contracts/TestnetTokenSale.sol`
- **Vulnerability Description:**
  The repository contains mock contracts used exclusively for testnet validation.
- **Recommended Mitigation:**
  Isolate testnet-only contracts under `contracts/test/` or `contracts/mock/` so that build configurations for mainnet deployment strictly exclude test shims.
- **Verification Method:**
  Review Hardhat compilation artifacts.

---

## 5. Security Audit Verdict

| Category | Status | Notes |
| :--- | :---: | :--- |
| **Smart Contract Code Quality** | **PASS** | High quality, uses OpenZeppelin v5, zero reentrancy or math bugs |
| **Supply & Inflation Safety** | **PASS** | Fixed 1 Billion supply, no post-deployment mint function |
| **Access Control & Permissions** | **CONDITIONAL PASS** | Requires Gnosis Safe multi-sig transition before mainnet |
| **AMM Integration Safety** | **PASS** | Zero fee-on-transfer, safe router interaction, tight slippage |
| **Overall Security Verdict** | **CONDITIONAL PASS** | **Approved for BSC Testnet; Requires Multi-Sig & Timelock for Mainnet** |
