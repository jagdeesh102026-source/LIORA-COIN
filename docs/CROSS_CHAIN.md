# Liora Coin (LIORA COIN) — Cross-Chain Architecture & Interoperability Plan

## 1. Objective
Establish secure, verifiable interoperability between **BNB Smart Chain** (initial chain) and **TRON** (future expansion), with modular support for additional EVM and non-EVM networks.

---

## 2. Architectural Comparison: BSC vs. TRON

| Dimension | BNB Smart Chain (BSC) | TRON (TRC-20) |
|---|---|---|
| **Virtual Machine** | EVM (Ethereum Virtual Machine) | TVM (TRON Virtual Machine) |
| **Token Standard** | BEP-20 | TRC-20 |
| **Gas / Resource Model** | BNB (Gas) | TRX (Energy & Bandwidth) |
| **Default Decimals** | 18 | Usually 6 (e.g. USDT) or 18 |
| **Wallet Standard** | MetaMask, TrustWallet, Rabby (EIP-1193) | TronLink (tronWeb) |
| **Messaging Support** | LayerZero, Chainlink CCIP, Axelar, Wormhole | LayerZero (Bridge adapters), Specialized Relayers |

---

## 3. Evaluation of Cross-Chain Solutions

### 3.1 LayerZero OFT (Omnichain Fungible Token)
- **Status**: Strongest candidate for BSC <-> TRON expansion.
- **Mechanism**: Burn-and-mint or Lock-and-unlock across supported endpoints.
- **Security**: Decentralized Verifier Networks (DVNs) and configurable consensus rules.

### 3.2 Chainlink CCIP
- **Status**: Excellent for EVM-to-EVM (BSC to Ethereum, Polygon, Arbitrum).
- **Limitation**: Native TRON support requires customized off-chain attestation or specialized adapter.

---

## 4. Transfer vs. Swap Separation

1. **Cross-Chain Transfer**: Direct 1:1 asset movement via burn/mint or lock/unlock adapter.
2. **Cross-Chain Swap**: Multi-hop execution:
   `Swap OXENIQ -> USDT (BSC) ==> Bridge USDT (BSC -> TRON) ==> Swap USDT -> OXENIQ (TRON)`
   Requires dedicated DEX routing and liquidity pools on both networks.

---

## 5. Current Implementation State
- Base BEP-20 token is designed clean and adapter-ready.
- The public website showcases the cross-chain feature in a transparent **"Architecture & In-Development"** state, avoiding premature or fake bridge transactions.
