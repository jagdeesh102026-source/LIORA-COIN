# LIORA — UUPS Upgradeable Architecture Production Readiness Report

**Status:** READY FOR STAGING / TESTNET VALIDATED  
**Target Network:** BNB Smart Chain (BSC Testnet: Chain ID 97 / BSC Mainnet: Chain ID 56)  
**Smart Contract Architecture:** OpenZeppelin UUPS (Universal Upgradeable Proxy Standard)  
**Governance Model:** 48-Hour Delay Timelock Controller + 3-of-5 Safe Multisig Governance  
**Emergency Backup Contract:** `contracts/LioraTokenCustodial.sol` (Preserved & Verified)

---

## 1. Executive Summary

Following corporate management directives, the LIORA token ecosystem has transitioned to an OpenZeppelin Universal Upgradeable Proxy Standard (UUPS) architecture. This architecture provides long-term operational adaptability while maintaining a single, permanent public contract address for exchange listings, wallet integrations, and liquidity pools.

All core tokenomics and security requirements have been preserved:
- **Permanent Public Address:** Users and exchanges interact solely with the ERC1967 proxy address (`0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9` on BSC Testnet).
- **Exact 100 Billion Fixed Supply:** Exactly 100,000,000,000 LIORA ($10^{29}$ atomic units) minted once at initialization.
- **Supply Partitioning:** 1,000,000,000 LIORA (1B) minted to the Operating Treasury; 99,000,000,000 LIORA (99B) minted directly to the `LioraReserveVault`.
- **Zero Minting Functionality:** No `mint()` function exists on either V1 or V2 implementations.
- **Zero Fee-on-Transfer:** Standard 1:1 token conservation with no deduction taxes on ordinary transfers.
- **ERC-20 Token Burning:** Token holders can burn their own tokens, permanently reducing total supply.
- **Governance Safeguards:** 48-hour timelock (`172,800` seconds) preventing instantaneous or unilateral code replacement.

---

## 2. Deployed Contract Registry (BSC Testnet — Chain ID 97)

The UUPS upgradeable token suite was successfully deployed to BSC Testnet on 2026-11-23.

| Contract Name | Role | Address |
|---|---|---|
| **LioraTokenUUPS (Proxy)** | **Permanent Public Token Address (ERC1967)** | `0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9` |
| **LioraTokenUUPSV1** | Initial Implementation Logic (V1) | `0xCda9930c1b932fD6CbD23c373aCB6f2f8A5bBcbD` |
| **LioraTimelock** | Governance Timelock (48-Hour Delay) | `0xDa79b818566fcE9D8123817dc291f4E0DE626A27` |
| **LioraReserveVault** | Restricted Reserve Vault (99B LIORA) | `0x1E10a2bFcA618Ed3EFEf732f4352A774586FC320` |
| **Operating Treasury** | Designated Operational Treasury Wallet | `0x83A1b8696cAE9c72e48A44F754714f3aE755D6f6` |

**BSC Testnet Verification:**
- Proxy balance of Reserve Vault: `99,000,000,000 LIORA`
- Proxy balance of Operating Treasury: `1,000,000,000 LIORA`
- Total On-Chain Supply: `100,000,000,000 LIORA`
- Initial Test Transfer: 100 LIORA transferred from Treasury successfully (Tx verified)
- Initial Test Burn: 10 LIORA burned successfully (Total supply reduced to 99,999,999,990 LIORA)

---

## 3. UUPS Architecture Specification

### 3.1 Initializer Security & Immutability
- **Constructor Locking:** The implementation contract constructor executes `_disableInitializers()` to permanently prevent attackers from initializing the logic contract directly.
- **Atomic Initialization:** The ERC1967 proxy is initialized at the exact moment of deployment via the encoded `initialize()` payload in `ERC1967Proxy.sol`.
- **Single-Mint Invariant:** The `initialize()` function uses OpenZeppelin's `initializer` modifier, ensuring that the 100B initial supply can only be minted once in the proxy's lifetime.

```solidity
/// @custom:oz-upgrades-unsafe-allow constructor
constructor() {
    _disableInitializers();
}

function initialize(
    address operatingTreasury,
    address reserveVaultAddress,
    address timelockAdmin
) external initializer {
    // Exact 100B fixed supply distribution
    _mint(operatingTreasury, 1_000_000_000 * 10 ** 18);
    _mint(reserveVaultAddress, 99_000_000_000 * 10 ** 18);
    ...
}
```

### 3.2 Upgrade Authorization (`_authorizeUpgrade`)
In UUPS, the upgrade authorization logic is contained within the implementation contract itself rather than an external proxy admin.
- `_authorizeUpgrade(address newImplementation)` is overridden and guarded by `onlyRole(UPGRADER_ROLE)`.
- Validates that `newImplementation != address(0)` to prevent locking the proxy.
- The `UPGRADER_ROLE` is granted exclusively to the `LioraTimelock` contract. Unprotected EOAs hold zero upgrade privileges.

### 3.3 Storage Layout Compatibility (V1 to V2)
- State variables in `LioraTokenUUPSV1` are organized according to strict append-only rules.
- Inherited OpenZeppelin upgradeable contracts (`ERC20Upgradeable`, `ERC20BurnableUpgradeable`, `AccessControlUpgradeable`, `UUPSUpgradeable`) use ERC-7201 namespaced storage slots, eliminating storage collisions across compiler updates and proxy upgrades.
- Prototype `LioraTokenUUPSV2` introduces new functionality (`isSupplyCapEnforced()`, `initializeV2()`) without reordering or displacing any V1 storage variables.

---

## 4. Governance & Multisig Integration

### 4.1 48-Hour Timelock Controller
- Contract: `contracts/upgradeable/LioraTimelock.sol` (inherits `TimelockControllerUpgradeable` / `TimelockController`).
- Minimum Delay: `172,800` seconds (exactly 48 hours).
- Purpose: Guarantees that any proposal to change the token implementation must be submitted to the blockchain at least 48 hours before execution. Token holders and exchanges have full visibility into pending code changes.

### 4.2 Corporate 3-of-5 Safe Multisig
For BSC Mainnet, the Timelock will be controlled by a Safe (formerly Gnosis Safe) multisig:
- **Threshold:** 3 of 5 authorized signers required for any operation.
- **Roles:**
  - `PROPOSER_ROLE`: Safe Multisig
  - `EXECUTOR_ROLE`: Safe Multisig (or open executor with timelock protection)
  - `TIMELOCK_ADMIN_ROLE`: Timelock Contract itself (Deployer renounces all roles after setup)
- **Zero EOA Privileges:** No single executive or engineer possesses the private key to initiate or execute an upgrade.

---

## 5. Emergency Recovery Architecture

To ensure zero risk of vendor lock-in or migration failure, the original non-upgradeable token contract is preserved in the repository as an emergency rollback candidate.

- **Primary File:** `contracts/LioraTokenCustodial.sol`
- **Backup File:** `contracts/backup/LioraTokenCustodial.original.sol`
- **Verified SHA-256 Checksum:** `d20f39c6e9329939fad848162c62378f8dde866bda6023106b02e131b41eb4d1`
- **Verification Status:** Bitwise identical and verified through automated cryptographic hashing.

---

## 6. Readiness Sign-Off

| Evaluation Vector | Target Requirement | Current Status |
|---|---|---|
| Token Supply Invariant | Exactly 100B Minted Once | **PASSED** (1B Treasury / 99B Reserve) |
| Post-Minting Protection | Future Minting Disabled | **PASSED** (No mint functions present) |
| Upgrade Mechanism | OpenZeppelin UUPS V1/V2 | **PASSED** (Storage verified compatible) |
| Governance Timelock | 48-Hour Minimum Delay | **PASSED** (`minDelay = 172,800s` enforced) |
| BSC Testnet Deployment | Fully Functional On-Chain | **PASSED** (Proxy: `0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9`) |
| Static Analysis | Solhint Clean | **PASSED** (0 errors, 0 warnings) |
| Unit & Integration Tests | 100% Pass Rate | **PASSED** (194 / 194 passing) |
| Mainnet Deployment | Blocked Pending Multisig | **BLOCKED (ENFORCED)** |
