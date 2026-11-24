# LIORA COIN — Immutable Token Migration Checklist & Execution Plan

**Document Version:** 1.0.0  
**Date:** 23 November 2026  
**Workspace:** `D:\Projects\OXENIQ`  
**Network:** BNB Smart Chain Testnet (Chain ID 97) / Target Mainnet (Chain ID 56)  
**Operating Entity:** GRANDIOSE TECH (Kenya)  
**Authoritative Baseline:** `LIORA COIN — FINAL MANAGEMENT CLARIFICATION CHECKLIST (3).docx`, supplemented by confirmed manual cash payout and collateral-return arrangement.

> [!WARNING]
> **SAFETY RESTRICTION — DO NOT DEPLOY AUTOMATICALLY:**  
> This checklist defines the mandatory technical and operational procedure for migrating from the initial configurable token (`LioraToken.sol`) to the permanent immutable token (`LioraTokenImmutable.sol`). No contracts or liquidity pairs may be deployed or configured until management issues explicit written authorization.

---

## 1. Inventory of Existing vs. Target Contracts

| Contract / Entity | Existing Deployed Architecture | Target Immutable Architecture | Action Required |
|---|---|---|---|
| **Token Contract** | `0xeD155E37D0a400E63202cE031Fc1C984B18E7999`<br>(`LioraToken.sol`: Ownable2Step, Pausable, Burnable) | *Awaiting Deployment*<br>(`LioraTokenImmutable.sol`: Pure ERC-20, Burnable, No Owner, No Pause) | Deploy bytecode to BSC Testnet upon authorization. |
| **Mock USDT** | `0x0b419a33e8a6448547906DCB191b037Db5ac926e`<br>(BEP-20 Mock Sandbox Currency) | `0x0b419a33e8a6448547906DCB191b037Db5ac926e`<br>(Same Sandbox Currency) | Preserve existing mock USDT contract. |
| **PancakeSwap Pair** | `0x64beE3847a766D35E6611985F3c3e51C78Af5D2c`<br>(Bound to `0xeD15...` and `0x0b41...`) | *New Pair Address Required*<br>(Will bind to `LioraTokenImmutable` and `0x0b41...`) | Create new pair via PancakeSwap Factory; cannot reuse old pair. |
| **PancakeSwap Router** | `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` | `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` | Preserve existing canonical router. |
| **PancakeSwap Factory** | `0x6725F303b657a9451d8BA641348b6761A6CC7a17` | `0x6725F303b657a9451d8BA641348b6761A6CC7a17` | Preserve existing canonical factory. |
| **Initial Holder** | `0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350` | Management Designated Treasury / Multi-Sig | Confirm recipient address before constructor execution. |

---

## 2. Technical Deployment Requirements

### 2.1 Compiler & Bytecode Specification
- **Solidity Version:** `pragma solidity 0.8.20;`
- **Compiler Optimizer:** Enabled, 200 runs.
- **EVM Target:** `paris` (BNB Smart Chain EVM compatible).
- **Source File:** `contracts/LioraTokenImmutable.sol`
- **OpenZeppelin Contracts Version:** `@openzeppelin/contracts` v5.0.0.

### 2.2 Constructor Parameters
```solidity
constructor(address initialHolder)
```
- **Constraint:** `initialHolder` must NOT be `address(0)` (throws custom error `InvalidZeroAddress()`).
- **Initial Mint:** Exactly `1_000_000_000 * 10**18` atomic units minted to `initialHolder`.

### 2.3 Deployment Gas Estimation (BSC Testnet #97)
- **Deployment Gas Used:** ~810,000 to ~850,000 gas.
- **Current Gas Price:** 0.1 to 3.0 Gwei.
- **Estimated Gas Cost:** ~0.000085 to 0.00255 tBNB (< $1.00 USD).

---

## 3. Token Distribution & 70:30 Partitioning Plan

Under the confirmed management tokenomics (Checklist 3, Section A), the fixed 1 Billion supply must be strictly partitioned:

```mermaid
flowchart TD
    Genesis["LioraTokenImmutable Deployment<br>1,000,000,000 LIORA"] --> InitialHolder["Designated Treasury Wallet<br>(Initial Holder)"]
    InitialHolder -->|70% (700,000,000 LIORA)| ClientBucket["Client Allocation & Market Pool<br>(Public Circulation / Collateral Vault)"]
    InitialHolder -->|30% (300,000,000 LIORA)| ReserveBucket["Company Reserve Treasury<br>(Cold Storage / Emergency Reserve)"]
    ClientBucket --> DEXPool["Initial PancakeSwap V2 Pool<br>(e.g. 216,250 LIORA)"]
    ClientBucket --> EscrowVault["Collateral Escrow / Investor Claims<br>(699,783,750 LIORA)"]
```

1. **Step 1:** Constructor credits `1,000,000,000 LIORA` to `initialHolder`.
2. **Step 2:** `initialHolder` transfers `300,000,000 LIORA` (30%) to Company Reserve Cold Vault.
3. **Step 3:** `initialHolder` transfers `700,000,000 LIORA` (70%) to Client Allocation Custody / Escrow Manager.
4. **Step 4:** A fraction of the client allocation (e.g. 216,250 LIORA) is deposited into the new PancakeSwap V2 Pair with matching mUSDT.

---

## 4. PancakeSwap V2 Pair Creation & Liquidity Seeding

Because Uniswap/PancakeSwap V2 pair contracts compute pool tokens directly from the token addresses (`token0` and `token1`), **the existing pair `0x64be...` cannot be pointed to a new token**. A brand new pair must be created:

1. **Factory Call:**
   ```solidity
   IPancakeFactory(0x6725F303b657a9451d8BA641348b6761A6CC7a17).createPair(
       newLioraTokenImmutableAddress,
       0x0b419a33e8a6448547906DCB191b037Db5ac926e // Mock USDT
   );
   ```
2. **Retrieve New Pair Address:**
   Query `factory.getPair(newLioraAddress, usdtAddress)` and record the new contract address.
3. **Initial Liquidity Deposit:**
   Approve Router `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` for both tokens.
   Call `router.addLiquidity(...)` with matching assets:
   - Example Seed: `216,250 LIORA` + `500.0 mUSDT` (matching original reference ratio of ~₹0.20/LIORA).
   - Receiver: Company Treasury address.
   - Retain LP tokens securely.

---

## 5. Website & Frontend Configuration Update Plan

Once the new contracts are deployed and authorized, the following codebase files must be updated:

### 5.1 Configuration Files
1. `apps/web/src/config/tokenConfig.ts`:
   - Update `BSC_TESTNET_LIORA_TOKEN_ADDRESS = "<NEW_IMMUTABLE_TOKEN_ADDRESS>"`.
   - Update `BSC_TESTNET_PANCAKESWAP_PAIR_ADDRESS = "<NEW_PAIR_ADDRESS>"`.
2. `apps/web/src/lib/dex/dexService.ts`:
   - Update `TESTNET_LIORA_TOKEN_ADDRESS = "<NEW_IMMUTABLE_TOKEN_ADDRESS>"`.
   - Update `TESTNET_LIORA_USDT_PAIR_ADDRESS = "<NEW_PAIR_ADDRESS>"`.
3. `deployments/bscTestnet-liora-immutable.json`:
   - Write deployment metadata, constructor args, tx hash, block number, and compiler artifacts.

### 5.2 ABI Compatibility Audit
- `LioraTokenImmutable` implements standard OpenZeppelin ERC-20 + Burnable interface.
- Standard ABI functions used by the frontend (`balanceOf`, `allowance`, `approve`, `transfer`, `decimals`, `symbol`, `name`) have identical selectors and signatures.
- **Zero Frontend Breaking Changes:** No React hooks or components will break as long as the addresses are correctly updated.

---

## 6. Impact & Risk Analysis on Existing Testnet Assets

| Asset / Stakeholder | Impact Description | Remediation Procedure |
|---|---|---|
| **Old Testnet Token Holders (`0xeD15...`)** | Wallets holding old tokens will show 0 balance of the new immutable token. | Deployer must run an airdrop script (`scripts/migrate-testnet-balances.js`) to credit testnet testers (e.g. `0xf28D...12aD`) with equivalent new tokens. |
| **Old Liquidity Pool (`0x64be...`)** | 501.09 mUSDT and 215,797 old LIORA remain locked in the old pair. | Deployer (`0xe31A...`) must call `removeLiquidity` on old pair using their 10,398 Cake-LP tokens to recover the 501 mUSDT and re-deposit it into the new pair. |
| **Transaction History & Explorers** | Explorer history (BscScan) for the old token cannot be migrated. | Clearly document token deprecation in README and update all website links to point to the new contract on BscScan. |
| **Pending Swaps / Allowances** | Existing router allowances for `0xeD15...` do not apply to the new token. | Users must approve the new token once before swapping. |

---

## 7. Step-by-Step Migration Checklist

### Phase 1: Pre-Migration Authorizations
- [ ] Management formally confirms `initialHolder` wallet address (Treasury Multi-Sig or cold wallet).
- [ ] Management approves the initial liquidity ratio (LIORA amount and USDT amount).
- [ ] Confirm deployer wallet (`0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350`) has > 0.1 tBNB for gas.

### Phase 2: Deployment & Provisioning (Upon Written Approval)
- [ ] Compile `contracts/LioraTokenImmutable.sol` (`npx hardhat compile`).
- [ ] Execute testnet deployment script (`scripts/deploy-liora-immutable.js`).
- [ ] Verify deployed bytecode and total supply (`1,000,000,000 * 10^18`) on BscScan Testnet.
- [ ] Confirm absence of `owner()`, `pause()`, and `mint()` on deployed contract.
- [ ] Execute `factory.createPair(newLioraAddress, usdtAddress)`.
- [ ] Approve Router and execute `router.addLiquidity(...)`.
- [ ] Verify initial pool reserves and Cake-LP minting.

### Phase 3: Liquidity Migration & Balance Re-Credit
- [ ] Call `router.removeLiquidity(...)` on old pair `0x64be...` to retrieve ~501 mUSDT.
- [ ] Transfer recovered mUSDT to support liquidity in the new pool if needed.
- [ ] Airdrop test balances to QA wallets (e.g. 52 LIORA to `0xf28D...12aD`).

### Phase 4: Codebase & Frontend Cutover
- [ ] Update `tokenConfig.ts` with new token and pair addresses.
- [ ] Update `dexService.ts` with new addresses.
- [ ] Run full automated test suite (`npx hardhat test`).
- [ ] Run TypeScript typecheck (`npx tsc --noEmit -p apps/web/tsconfig.json`).
- [ ] Test swap execution via frontend UI on BSC Testnet.
- [ ] Commit updated configs to version control with tagged release `v1.1.0-immutable-testnet`.
