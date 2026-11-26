# LIORA COIN — BSC Mainnet Comprehensive Post-Deployment Verification Report

**Verification Date:** November 26, 2026  
**Target Network:** BNB Smart Chain Mainnet (`bscMainnet`)  
**Network Chain ID:** `56`  
**Verified On-Chain Block:** `135,794,560`  
**Deployment Artifact:** [`deployments/bscMainnet-uups.json`](file:///d:/Projects/OXENIQ/deployments/bscMainnet-uups.json)  
**Governance Architecture:** UUPS Upgradeable Proxy (ERC-1967) with 48-Hour OpenZeppelin TimelockController  

---

## Executive Summary

A comprehensive, strictly read-only post-deployment audit was executed against the BNB Smart Chain (BSC) Mainnet contracts for LIORA Coin. All on-chain parameters, state variables, bytecode presence, token balances, and access control role matrices were queried directly via BSC Mainnet JSON-RPC at block `135,794,560`.

### Key Verification Highlights:
1. **Ownership Acceptance Complete:** Governance wallet (`0x491d37ab13E66f6fd544Cdb3A4C57015D7fc2d54`) has successfully accepted ownership of `LioraReserveVault` via the 2-step `Ownable2Step` handover. The pending owner is reset to `0x0000000000000000000000000000000000000000`.
2. **Deployer Detachment 100% Complete:** The Deployer wallet (`0xb75c5d303fBC41430ee5731Bdf7Fad7A98da173c`) holds **0 LIORA tokens**, holds **no administrative roles** on the Token Proxy, holds **no administrative roles** on the Timelock, and holds **no ownership** of the Reserve Vault.
3. **Exact Token Balances:** Exactly 100,000,000,000 LIORA total supply exists:
   - **Operating Treasury:** 1,000,000,000 LIORA (1.00%)
   - **Reserve Vault:** 99,000,000,000 LIORA (99.00%)
   - **Deployer Wallet:** 0 LIORA (0.00%)
4. **Timelock Control Enforced on Upgrades:** Only the Timelock contract holds `UPGRADER_ROLE` and `DEFAULT_ADMIN_ROLE` on the Token proxy. Token upgrades strictly require a 48-hour (172,800 seconds) timelock delay.
5. **Architectural Notice on Reserve Vault:** Direct token releases from `LioraReserveVault` are governed by `onlyOwner` (the Governance wallet) and **do not pass through the 48-hour Timelock**.

---

## 1. Deployed Contract Addresses & Integrity

| Contract Name | Expected Address (Artifact) | Live On-Chain Address | Bytecode Verified | Status |
| :--- | :--- | :--- | :---: | :---: |
| **LIORA ERC1967 Proxy** | `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A` | `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A` | Yes (170 bytes) | **PASS** |
| **LIORA Implementation V1** | `0x22C6F5B2e9b03e99FB030a96A2ada0c28BA280a0` | `0x22C6F5B2e9b03e99FB030a96A2ada0c28BA280a0` | Yes (6,470 bytes) | **PASS** |
| **LioraTimelock** | `0xd03A64C31E2464DD2A7d69B538729A690b4ab177` | `0xd03A64C31E2464DD2A7d69B538729A690b4ab177` | Yes (6,713 bytes) | **PASS** |
| **LioraReserveVault** | `0x244865302a1643702ACB66181DBd898F714EF6e0` | `0x244865302a1643702ACB66181DBd898F714EF6e0` | Yes (1,861 bytes) | **PASS** |

### Proxy Implementation Storage Slot Check:
- **EIP-1967 Implementation Slot:** `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
- **Slot Content:** `0x00000000000000000000000022c6f5b2e9b03e99fb030a96a2ada0c28ba280a0`
- **Result:** Exact match to `LioraTokenUUPSV1` implementation address.

---

## 2. Comprehensive 15-Point Verification Matrix

| # | Check Description | Expected Value | Actual Live On-Chain Value | Status |
| :-: | :--- | :--- | :--- | :---: |
| **1** | Network Chain ID | `56` (BSC Mainnet) | `56` | **PASS** |
| **2** | Official Contract & Implementation Addresses | Proxy: `0xE7B7...630A`<br>Impl: `0x22C6...80a0` | Proxy: `0xE7B7...630A`<br>Impl: `0x22C6...80a0` | **PASS** |
| **3** | Token Name, Symbol, Decimals & Total Supply | Name: `"LIORA"`<br>Symbol: `"LIORA"`<br>Decimals: `18`<br>Supply: `100,000,000,000` | Name: `"LIORA"`<br>Symbol: `"LIORA"`<br>Decimals: `18`<br>Supply: `100000000000000000000000000000` | **PASS** |
| **4** | Operating Treasury Balance | `1,000,000,000 * 10^18`<br>(`0xD546...9064`) | `1000000000000000000000000000` (1B LIORA) | **PASS** |
| **5** | Reserve Vault Balance | `99,000,000,000 * 10^18`<br>(`0x2448...F6e0`) | `99000000000000000000000000000` (99B LIORA) | **PASS** |
| **6** | Deployer Token Balance | `0` LIORA<br>(`0xb75c...173c`) | `0` | **PASS** |
| **7** | Reserve Vault Current Owner | Governance Wallet<br>(`0x491d...2d54`) | `0x491d37ab13E66f6fd544Cdb3A4C57015D7fc2d54` | **PASS** |
| **8** | Reserve Vault Pending Owner | Zero Address<br>(`0x0000...0000`) | `0x0000000000000000000000000000000000000000` | **PASS** |
| **9** | Reserve Vault Bound Token Address | LIORA Proxy Address<br>(`0xE7B7...630A`) | `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A` | **PASS** |
| **10** | Timelock Minimum Delay | `172800` seconds (48 hours) | `172800` seconds | **PASS** |
| **11** | Token & Timelock Roles & Role Admins | Role Admins verified as `DEFAULT_ADMIN_ROLE` | Token Admin: Timelock<br>Timelock Admin: Governance & Timelock | **PASS** |
| **12** | Deployer Privileged Roles | Zero roles on Token & Timelock; Zero ownership | Confirmed: All roles renounced/revoked | **PASS** |
| **13** | Timelock Controls Token Upgrades | Only Timelock holds `UPGRADER_ROLE` | Timelock: `true`<br>Governance: `false`<br>Deployer: `false` | **PASS** |
| **14** | Governance Wallet Privileged Permissions | Vault `owner`, Timelock Admin, Proposer, Executor, Canceller | Identified & Documented (Section 4) | **PASS** |
| **15** | Timelock Bypass Analysis | Differentiate Timelock-gated actions vs. direct calls | Identified & Documented (Section 5) | **PASS** |

---

## 3. Access Control & Role Matrix

### A. Token Proxy Roles (`LioraTokenUUPSV1` at `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A`)

| Role | Role Hash | Role Admin | Timelock (`0xd03A...`) | Governance (`0x491d...`) | Deployer (`0xb75c...`) |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **DEFAULT_ADMIN_ROLE** | `0x0000000000000000000000000000000000000000000000000000000000000000` | `DEFAULT_ADMIN_ROLE` | **`true`** | **`false`** | **`false`** |
| **UPGRADER_ROLE** | `0x189ab7a9244e08ba82b3003003f578bce7366d21e87304ca8deb7e5b7cad530f` | `DEFAULT_ADMIN_ROLE` | **`true`** | **`false`** | **`false`** |

> **Key Takeaway:** The Token Proxy has zero direct governance control from any EOA. Only the `LioraTimelock` contract can authorize upgrades or modify role memberships on the token.

---

### B. Timelock Roles (`LioraTimelock` at `0xd03A64C31E2464DD2A7d69B538729A690b4ab177`)

| Role | Role Hash | Role Admin | Timelock (`0xd03A...`) | Governance (`0x491d...`) | Deployer (`0xb75c...`) | Open (`0x00...`) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **DEFAULT_ADMIN_ROLE** | `0x00000000...` | `DEFAULT_ADMIN_ROLE` | **`true`** | **`true`** | **`false`** | **`false`** |
| **PROPOSER_ROLE** | `0xb09aa5ae...` | `DEFAULT_ADMIN_ROLE` | **`false`** | **`true`** | **`false`** | **`false`** |
| **EXECUTOR_ROLE** | `0xd8aa0f31...` | `DEFAULT_ADMIN_ROLE` | **`false`** | **`true`** | **`false`** | **`false`** |
| **CANCELLER_ROLE** | `0xfd643c72...` | `DEFAULT_ADMIN_ROLE` | **`false`** | **`true`** | **`false`** | **`false`** |

> **Key Takeaway:** The Deployer renounced `DEFAULT_ADMIN_ROLE` on the Timelock. The Governance wallet holds Proposer, Executor, Canceller, and Admin rights. Open execution is disabled (restricted strictly to authorized executors).

---

### C. Reserve Vault State (`LioraReserveVault` at `0x244865302a1643702ACB66181DBd898F714EF6e0`)

| Parameter / Role | Expected Address | On-Chain Address | Verification Status |
| :--- | :--- | :--- | :---: |
| **Contract Owner** | Governance Wallet (`0x491d...2d54`) | `0x491d37ab13E66f6fd544Cdb3A4C57015D7fc2d54` | **PASS** |
| **Pending Owner** | Zero Address (`0x0000...0000`) | `0x0000000000000000000000000000000000000000` | **PASS** |
| **Bound Token Address** | LIORA Proxy (`0xE7B7...630A`) | `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A` | **PASS** |
| **Token Balance** | 99 Billion LIORA | `99,000,000,000 * 10^18` | **PASS** |

---

## 4. Governance Wallet Privileged Permissions Summary (Item 14)

The Governance wallet (`0x491d37ab13E66f6fd544Cdb3A4C57015D7fc2d54`) is an Externally Owned Account (EOA) holding the following explicit administrative authorities:

1. **Direct Reserve Vault Release Authority (`onlyOwner`):**
   - Can invoke `releaseReserveTokens(address recipient, uint256 amount, string calldata purpose)` on `LioraReserveVault`.
   - Releases tokens immediately from the 99 Billion LIORA reserve directly to any specified recipient.
2. **Reserve Vault Ownership Management (`onlyOwner`):**
   - Can transfer ownership to another address via `transferOwnership(address newOwner)`.
   - Can renounce vault ownership via `renounceOwnership()`.
3. **Timelock Proposal & Execution:**
   - Holds `PROPOSER_ROLE`: Can submit transactions to the Timelock queue.
   - Holds `EXECUTOR_ROLE`: Can execute queued transactions once the 48-hour delay has elapsed.
   - Holds `CANCELLER_ROLE`: Can cancel scheduled operations in the Timelock queue prior to execution.
4. **Timelock Administration (`DEFAULT_ADMIN_ROLE`):**
   - Can grant or revoke roles on the Timelock (e.g. adding additional proposers or executors).

---

## 5. Architectural Timelock Bypass Analysis (Item 15)

An architectural assessment was performed to determine whether any privileged operations can bypass the 48-hour timelock delay:

### A. Operations that CANNOT Bypass the Timelock:
- **Token Contract Upgrades:** **STRICTLY TIMELOCKED.**
  - `LioraTokenUUPSV1._authorizeUpgrade()` requires `onlyRole(UPGRADER_ROLE)`.
  - The `UPGRADER_ROLE` is held exclusively by the `LioraTimelock` contract.
  - The Governance wallet does **not** hold `UPGRADER_ROLE` on the token.
  - Therefore, any upgrade to the token contract logic must be queued in the Timelock, wait 48 hours (172,800 seconds), and be executed on-chain.
- **Modifying Token Role Admins or Upgraders:** **STRICTLY TIMELOCKED.**
  - `DEFAULT_ADMIN_ROLE` on the token proxy is held exclusively by the Timelock.

### B. Operations that CAN Bypass the Timelock:
- **Reserve Vault Token Releases:** **BYPASSES THE TIMELOCK.**
  - `releaseReserveTokens` in `LioraReserveVault` is guarded by OpenZeppelin `onlyOwner`.
  - The `owner` of `LioraReserveVault` is the Governance wallet directly (`0x491d...2d54`), not the Timelock.
  - **Impact:** The Governance wallet has immediate, un-delayed authority to disburse any amount of the 99,000,000,000 LIORA reserve tokens.
- **Timelock Role Administration:**
  - The Governance wallet holds `DEFAULT_ADMIN_ROLE` on `LioraTimelock`.
  - OpenZeppelin `AccessControl.grantRole()` can be invoked directly by any account holding `DEFAULT_ADMIN_ROLE`.
  - **Impact:** The Governance wallet can grant `PROPOSER_ROLE` or `EXECUTOR_ROLE` directly to other accounts without scheduling a timelock delay.

---

## 6. Safety & Security Invariants

- **Mainnet Deployment Flags:**
  - `ENABLE_MAINNET_DEPLOYMENT=false` (Confirmed in `.env`)
  - `ALLOW_SINGLE_WALLET_GOVERNANCE=false` (Confirmed in `.env`)
- **Blockchain Execution:** 0 state-modifying transactions broadcast. 100% read-only verification.
- **Private Key Isolation:** No private keys or keystore files accessed or requested.
- **Public Readiness:** Public trading, DEX liquidity pools, automated purchases, and investment plans remain **strictly disabled**.

---

## 7. Outstanding Concerns & Recommendations

1. **EOA Governance Custody Risk:**
   - The Governance wallet is an Externally Owned Account (`0x491d37ab13E66f6fd544Cdb3A4C57015D7fc2d54`).
   - If this private key is lost or compromised, an unauthorized party could immediately access the 99 Billion LIORA vault or modify Timelock roles.
   - **Recommendation:** Prior to public liquidity launch or token distribution, transfer the `owner` of `LioraReserveVault` and the administrative roles of `LioraTimelock` to an institutional multi-signature wallet (e.g. Safe multisig on BSC with a minimum 3-of-5 threshold across independent hardware keys).
2. **Consider Timelocking Vault Releases in Future Upgrades:**
   - If programmatic, delayed releases of reserve funds are desired for community trust, the Reserve Vault ownership could be transferred to the Timelock contract itself. This would enforce the 48-hour delay on all reserve releases as well.
3. **Audit Notice:**
   - This verification verifies on-chain deployment and state consistency. It does **not** substitute for a comprehensive smart contract security audit by an accredited third-party auditing firm.

---

*Report generated automatically from read-only BSC Mainnet RPC queries at block 135,794,560.*
