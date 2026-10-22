# OXENIQ — System Architecture Specification

## 1. Architectural Philosophy

The OXENIQ ecosystem follows a **modular, decoupled Web3 architecture**. The primary objective is to guarantee institutional-grade security on BNB Smart Chain while remaining extensible for future TRON interoperability and decentralized exchange interactions.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|   Next.js 15+ Frontend (App Router, Tailwind CSS, Lucide Icons, Mobile Responsive)|
|   +-----------------------+ +-----------------------+ +-----------------------+   |
|   |   Public Showcase     | |  Web3 Connectors      | |  DApp Modules         |   |
|   |   - Hero & Brand      | |  - Wagmi / Viem       | |  - Balance Inspector  |   |
|   |   - Ecosystem & Tech  | |  - Injected / AppKit  | |  - Swap Interface     |   |
|   |   - Roadmap & Docs    | |  - Chain Guard (BSC)  | |  - Cross-Chain Bridge |   |
|   +-----------------------+ +-----------------------+ +-----------------------+   |
+-----------------------------------------------------------------------------------+
                                         |
                                (RPC Reads / User Tx)
                                         v
+-----------------------------------------------------------------------------------+
|                            BLOCKCHAIN INFRASTRUCTURE                              |
|                                                                                   |
|  [ BNB Smart Chain (BEP-20) ]                   [ Future TRON Network (TRC-20) ]  |
|  +---------------------------+                  +------------------------------+  |
|  | OxeniqToken.sol           |                  | OxeniqTRC20.sol (Future)     |  |
|  | - Standard BEP-20 / ERC-20|                  | - TRON TVM Compatible        |  |
|  | - Ownable2Step Access     |                  | - Precision: 6 or 18 Decimals|  |
|  | - Pausable Circuit Breaker|                  +------------------------------+  |
|  +-------------+-------------+                                 ^                  |
|                |                                               |                  |
|  +-------------v-------------+                  +--------------+---------------+  |
|  | AllocationManager.sol     |                  | Cross-Chain Adapter / OFT    |  |
|  | - 70:30 Purchase Split    | <=============>  | - LayerZero / CCIP / Bridge  |  |
|  | - Safe Integer Arithmetic |   (Messaging)    | - Secure Lock/Mint or Burn   |  |
|  +---------------------------+                  +------------------------------+  |
|                                                                                   |
|  +---------------------------+                                                    |
|  | Liquidity & Market Pool   |                                                    |
|  | - PancakeSwap v2/v3 Pool  |                                                    |
|  | - Initial $1,000 Reserve  |                                                    |
|  +---------------------------+                                                    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Component Decoupling

### 2.1 Base Token Contract (`OxeniqToken.sol`)
- Standard BEP-20 (fully compliant with ERC-20 specifications on BNB Smart Chain).
- Zero transfer taxes or fees-on-transfer in the base contract to maintain 100% compatibility with standard AMMs, bridges, and multisig vaults.
- Security extensions:
  - `Ownable2Step`: Prevents accidental loss of contract ownership by requiring the nominated owner to accept the transfer.
  - `Pausable`: Emergency pause mechanism restricted to authorized admin for security incidents.

### 2.2 Purchase Allocation Module (`AllocationManager.sol`)
- Kept completely separate from the transfer path of `OxeniqToken`.
- Enforces the 70:30 split on purchase events using integer-safe arithmetic:
  `firstShare = (quantity * 70) / 100`
  `secondShare = quantity - firstShare`
- Prevents precision loss and ensures zero tokens are trapped.

### 2.3 Cross-Chain Bridging Layer
- The token contract does not contain custom, untested bridge logic.
- Instead, it will use an audited bridge adapter (such as LayerZero Omnichain Fungible Token standard or Chainlink CCIP) once TRON requirements and bridge providers are finalized.
