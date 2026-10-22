# OXENIQ — Smart Contract Specification

## 1. Contracts Overview

### 1.1 `OxeniqToken.sol`
- **Path**: `contracts/OxeniqToken.sol`
- **Standard**: BEP-20 (fully compliant with ERC-20 on BNB Smart Chain)
- **Base Classes**:
  - `ERC20` (OpenZeppelin v5)
  - `ERC20Burnable` (OpenZeppelin v5)
  - `Ownable2Step` (OpenZeppelin v5)
  - `Pausable` (OpenZeppelin v5)
- **Decimals**: 18
- **Constructor Parameters**:
  - `name_`: Token Name (Default: "OXENIQ")
  - `symbol_`: Token Symbol (Default: "OXENIQ")
  - `initialSupply_`: Minted to initial recipient
  - `initialOwner_`: Address of administrator / multisig

### 1.2 `AllocationManager.sol`
- **Path**: `contracts/AllocationManager.sol`
- **Purpose**: Implements the 70:30 purchased-token split logic.
- **Access Control**: `Ownable2Step`
- **Events**:
  - `AllocationExecuted(address indexed buyer, address indexed recipient70, address indexed recipient30, uint256 amount70, uint256 amount30)`
