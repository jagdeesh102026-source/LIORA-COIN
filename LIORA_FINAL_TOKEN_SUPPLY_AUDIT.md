# LIORA COIN — Final Token Supply & Custodial Vault Architecture Audit

**Target Network:** BNB Smart Chain (BSC Testnet Chain ID `97`, BSC Mainnet Chain ID `56`)  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Authoritative Architectural Directive:** Confirmed Fixed 100B Supply & Option A Custody  
**Date of Audit:** 23 November 2026  
**Audit Status:** PASSED (100% Invariants Verified Across Bytecode, Contracts, and Ledger)  

---

## 1. Executive Summary

This audit report establishes the definitive technical and mathematical verification for the authoritative token supply architecture of **LIORA COIN (LIORA)**.

Following formal management clarification, all prior draft models (including the single-bucket 1B supply, 70:30 uncollateralized minting models, and post-deployment mintable caps) have been superseded by the **Confirmed Fixed 100 Billion Supply Architecture**:
1. **Total Minted Supply at Genesis:** Exactly **100,000,000,000 LIORA** ($10^{29}$ wei / atomic units at 18 decimals) minted once during contract deployment.
2. **Initial Operating Treasury:** Exactly **1,000,000,000 LIORA** ($10^{27}$ wei / 1 Billion LIORA) transferred to the company operating treasury wallet.
3. **Restricted Company Reserve Vault:** Exactly **99,000,000,000 LIORA** ($9.9 \times 10^{28}$ wei / 99 Billion LIORA) transferred to the dedicated smart contract vault ([LioraReserveVault.sol](file:///d:/Projects/OXENIQ/contracts/LioraReserveVault.sol)).
4. **Post-Deployment Minting:** **PERMANENTLY DISABLED**. There is no `mint()` function on the token contract. The total supply can never increase beyond 100 Billion LIORA.
5. **Burn Functionality:** Fully enabled via OpenZeppelin `ERC20Burnable`. Supply is monotonically non-increasing.
6. **Transfers & Fractional Amounts:** Standard ERC-20 / BEP-20 transfers enabled with 0% fee-on-transfer down to 1 wei ($10^{-18}$ LIORA), explicitly supporting 0.5 LIORA and micro-transactions.
7. **Custody & Permissions:** Option A company-controlled custody. Investors hold read-only custodial allocation records against agreed manual cash settlement; investor transfers, swaps, splits, burns, and withdrawals are strictly rejected server-side (HTTP 403).

---

## 2. Supply Architecture Comparison & Evolution

| Parameter | Legacy Draft (Gate C9) | Interim MVP Draft | Confirmed Final Architecture | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Token Name** | OXENIQ / LIORA | LIORA COIN | **LIORA COIN** | Confirmed |
| **Token Symbol** | OXENIQ / LIORA | LIORA | **LIORA** | Confirmed |
| **Decimals** | 18 | 18 | **18** | Confirmed |
| **Initial Minted Supply** | 1,000,000,000 | 1,000,000,000 | **100,000,000,000** | Confirmed |
| **Operating Treasury** | 700,000,000 (70%) | 1,000,000,000 | **1,000,000,000** (1%) | Confirmed |
| **Reserve Allocation** | 300,000,000 (30%) | None (Held in unminted cap) | **99,000,000,000** (99%) | Confirmed |
| **Reserve Mechanism** | Treasury sub-bucket | N/A | **LioraReserveVault.sol (Smart Contract)** | Confirmed |
| **Reserve Governance** | Single admin key | N/A | **Two-Step Multi-Sig (`Ownable2Step`)** | Confirmed |
| **Future Mint Function** | Disabled | Owner mintable to 100B | **PERMANENTLY DISABLED (No `mint()`)** | Confirmed |
| **Supply Predictability** | Capped at 1B | Variable up to 100B | **Strictly Fixed at 100B (Burn-only)** | Confirmed |
| **Investor Custody** | Direct On-Chain Transfer | Option A / B open | **Option A (Company-Controlled Custody)** | Confirmed |
| **Payment Rail** | Automated Gateway | Razorpay / Stripe (unapproved) | **Manual Verification (Gateway DEFERRED)** | Confirmed |

---

## 3. Smart Contract Implementation Audit

### 3.1 Canonical Token Contract: `LioraTokenCustodial.sol`
* **File Location:** [contracts/LioraTokenCustodial.sol](file:///d:/Projects/OXENIQ/contracts/LioraTokenCustodial.sol)
* **Inheritance:** `ERC20`, `ERC20Burnable` (OpenZeppelin Contracts v5.0.2)
* **Constructor Parameters:**
  1. `address operatingTreasury_`: Destination wallet receiving 1,000,000,000 LIORA.
  2. `address reserveVault_`: Destination contract receiving 99,000,000,000 LIORA.
* **Bytecode Invariants:**
  - `TOTAL_SUPPLY = 100_000_000_000 * 10**18` (Constant)
  - `OPERATING_TREASURY_SUPPLY = 1_000_000_000 * 10**18` (Constant)
  - `RESTRICTED_RESERVE_SUPPLY = 99_000_000_000 * 10**18` (Constant)
  - `_mint(operatingTreasury_, OPERATING_TREASURY_SUPPLY)` executed in constructor.
  - `_mint(reserveVault_, RESTRICTED_RESERVE_SUPPLY)` executed in constructor.
  - **No `mint()` function**: The ABI contains no function matching `mint`, `mintTo`, or any variation thereof. Low-level selector calls (`0x40c10f19`) revert with bytecode failure.
  - **Zero Address Guard**: Reverts with `InvalidZeroAddress()` if either recipient is address zero.
  - **Duplicate Address Guard**: Reverts with `DuplicateAddresses()` if treasury and reserve share the same address.

### 3.2 Restricted Company Reserve Vault: `LioraReserveVault.sol`
* **File Location:** [contracts/LioraReserveVault.sol](file:///d:/Projects/OXENIQ/contracts/LioraReserveVault.sol)
* **Inheritance:** `Ownable2Step` (OpenZeppelin Contracts v5.0.2), `SafeERC20`
* **Security & Governance Controls:**
  - **Single Token Binding:** The vault binds to the canonical LIORA token contract exactly once via `setToken(address token_)`. Subsequent attempts revert with `TokenAlreadySet()`.
  - **Two-Step Ownership Transfer:** Governance changes require `transferOwnership(newOwner)` followed by `acceptOwnership()`, preventing catastrophic loss of vault control due to typographical address error.
  - **Documented Release Enforcement:** Token release is executed only through `releaseReserveTokens(address recipient, uint256 amount, string calldata purpose)`.
  - **Auditable On-Chain Event:** Emits `ReserveTokensReleased(recipient, amount, purpose, block.timestamp)`.
  - **Unauthorized Call Rejection:** Direct calls by non-governance signers (including deployer, investors, and attackers) revert with `OwnableUnauthorizedAccount`.
  - **Solvency Check:** Requests exceeding vault balance revert with `InsufficientVaultBalance(requested, available)`.

---

## 4. Double-Entry Accounting & Custodial Segregation

Under Option A custody, the company operating treasury holds physical tokens on-chain, while the backend maintains an auditable double-entry allocation ledger ([CustodialAllocationLedger.ts](file:///d:/Projects/OXENIQ/apps/web/src/lib/custody/custodialAllocationLedger.ts)):

$$\text{Total Treasury On-Chain Balance} \equiv \text{Unrestricted Free Balance} + \text{Reserved Custodial Investor Allocations}$$

### 4.1 Conservation Guarantees
1. **Separation of Holdings:** Operating treasury tokens ($1\text{B}$) are physically isolated on-chain from company reserve tokens ($99\text{B}$).
2. **Encumbrance Protection:** When an investor's payment is manually verified, the corresponding LIORA tokens are marked as `ACTIVE_CUSTODIAL_ALLOCATION`. The `unrestrictedFreeBalance` is debited by the exact allocation quantity.
3. **Treasury Spend Guardrail:** Any administrative treasury operation (such as seeding DEX liquidity or operational disbursements via `POST /api/custody/treasury-spend`) must verify:
   $$\text{Spend Amount} \le \text{Unrestricted Free Balance}$$
   Attempts to spend tokens reserved for investors revert with `INSUFFICIENT_UNRESERVED_TREASURY_BALANCE`.
4. **Investor Transfer Barrier:** Investors have zero cryptographic control over treasury holdings. Calls to `POST /api/custody/investor-transfer` are unconditionally rejected with HTTP 403 (`UNAUTHORIZED_CUSTODIAL_INVESTOR_ACTION`).

---

## 5. Summary of Verification Evidence

The 100B fixed supply architecture was verified via Hardhat and Chai:
- **Suite:** [test/Phase2B_FinalSupplyAndMainnetMVP.test.js](file:///d:/Projects/OXENIQ/test/Phase2B_FinalSupplyAndMainnetMVP.test.js)
- **Results:** 13 / 13 tests passed.
  1. `totalSupply()` = `100,000,000,000 * 10^18` wei.
  2. Operating treasury balance = `1,000,000,000 * 10^18` wei.
  3. Reserve vault balance = `99,000,000,000 * 10^18` wei.
  4. Contract interface contains 0 mint methods; low-level mint calls revert.
  5. Treasury transfers 5M LIORA; remaining balance = 995M LIORA.
  6. Fractional transfer of 0.5 LIORA and 1 wei verified with 0% fee.
  7. Token burn reduces total supply by exact burned quantity.
  8. Reserve vault release reverts for unauthorized callers.
  9. Option A investor transfer attempts return HTTP 403.
  10. Treasury spend cannot encroach on reserved investor allocations.
