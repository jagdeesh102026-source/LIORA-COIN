# OXENIQ — Smart Contract Specification

## 1. On-Chain Contracts

### 1.1 `OxeniqToken.sol`
- **File Path**: `contracts/OxeniqToken.sol`
- **Compiler**: Solidity `0.8.20`
- **Standard**: BEP-20 (fully compliant with ERC-20 on BNB Smart Chain)
- **Base Classes**:
  - `ERC20` (OpenZeppelin v5.0.2)
  - `ERC20Burnable` (OpenZeppelin v5.0.2)
  - `Ownable2Step` (OpenZeppelin v5.0.2)
  - `Pausable` (OpenZeppelin v5.0.2)
- **Decimals**: `18`
- **Constructor Parameters**:
  - `name_`: Token Name ("OXENIQ")
  - `symbol_`: Token Symbol ("OXENIQ")
  - `initialSupply_`: Total supply in base units ($1,000,000,000 \times 10^{18} = 10^{27}$)
  - `initialOwner_`: Administrator address (Gnosis Safe multi-sig)
- **Security Guardrails**:
  - Entire supply is minted once at genesis to `initialOwner_`.
  - Zero post-deployment `mint()` functions in contract ABI.
  - Zero fees-on-transfer inside `_update()`. Full AMM compatibility.
  - Emergency circuit-breaker `pause()` restricted to two-step owner.

### 1.2 `AllocationManager.sol`
- **File Path**: `contracts/AllocationManager.sol`
- **Compiler**: Solidity `0.8.20`
- **Inheritance**: `Ownable2Step`, `ReentrancyGuard`
- **Purpose**: Implements decoupled 70:30 allocation distribution for token purchase workflows.
- **Key Functions**:
  - `calculateSplit(uint256 amount)`: Pure function returning $\lfloor (\text{amount} \times 70) / 100 \rfloor$ and remainder.
  - `executeAllocation(address buyer, uint256 amount)`: Transfers 70% share to `recipient70` and 30% share to `recipient30` using `SafeERC20`.
  - `updateRecipients(address new70, address new30)`: Two-step owner restricted recipient updates.
- **Events**:
  - `AllocationExecuted(address indexed buyer, address indexed recipient70, address indexed recipient30, uint256 amount70, uint256 amount30, uint256 totalAmount)`
  - `RecipientsUpdated(address indexed newRecipient70, address indexed newRecipient30)`

---

## 2. Off-Chain Commerce & Settlement Engine

| Module | Location | Purpose |
|---|---|---|
| **Allocation Engine** | `apps/web/src/lib/commerce/allocationEngine.ts` | Calculates Candidate Interpretation A (Reserve = 30% of buyer allocation) and Interpretation B (Buyer = 70% of combined allocation) using BigInt precision. |
| **Exchange Rate Policy** | `apps/web/src/lib/commerce/exchangeRatePolicy.ts` | Validates USD $100 minimum order requirement, manages 15-minute quote validity TTL, and guards against stale fiat rates. |
| **Payment Adapter** | `apps/web/src/lib/commerce/paymentAdapterSkeleton.ts` | Provider-independent gateway interface with timing-safe HMAC-SHA256 signature verification and duplicate-delivery idempotency store. |
