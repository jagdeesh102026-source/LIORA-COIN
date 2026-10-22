# OXENIQ — Web3 Token Ecosystem

> **POWERING THE NEXT DIGITAL ERA**

A production-quality digital token ecosystem built for **BNB Smart Chain (BEP-20)** with forward-compatible architecture for **TRON (TRC-20)** interoperability, decentralized liquidity management, and verifiable Web3 integration.

---

## 1. Project Overview

- **Token Name**: OXENIQ
- **Symbol**: OXENIQ
- **Target Blockchain**: BNB Smart Chain (BEP-20)
- **Future Cross-Chain**: TRON (TRC-20) & Multi-Chain Transfer/Swap
- **Initial Liquidity Budget**: $1,000 (PancakeSwap reference pool)
- **Purchased-Token Allocation**: 70:30 Provisional Split

---

## 2. Directory Structure

```
OXENIQ/
├── apps/
│   └── web/              # Next.js 15+ Web3 Frontend (App Router, Tailwind CSS, Viem)
├── contracts/            # Solidity 0.8.20 Smart Contracts (OpenZeppelin v5)
│   ├── OxeniqToken.sol   # Core BEP-20 token contract
│   └── AllocationManager.sol # 70:30 allocation controller
├── scripts/              # Hardhat deployment and verification scripts
├── test/                 # Comprehensive unit, fuzz, and integration tests
├── docs/                 # Institutional documentation suite
│   ├── IMPLEMENTATION_PLAN.md
│   ├── OPEN_DECISIONS.md
│   ├── ARCHITECTURE.md
│   ├── TOKENOMICS.md
│   ├── LIQUIDITY_SETUP.md
│   ├── CROSS_CHAIN.md
│   ├── SECURITY.md
│   ├── SMART_CONTRACTS.md
│   ├── WEBSITE_DESIGN.md
│   └── DEPLOYMENT.md
└── .env.example          # Environment variable template
```

---

## 3. Getting Started

### Prerequisites
- **Node.js**: v20+ (Tested on v22.14.0)
- **npm**: v10+

### Installation
```bash
# Install root dependencies
npm install

# Run smart contract test suite
npm test

# Start the Web3 frontend application
cd apps/web
npm install
npm run dev
```

---

## 4. Documentation & Open Decisions
For the list of unresolved management decisions and their corresponding architectural status, refer to [`docs/OPEN_DECISIONS.md`](docs/OPEN_DECISIONS.md).

For the liquidity deployment checklist, refer to [`docs/LIQUIDITY_SETUP.md`](docs/LIQUIDITY_SETUP.md).
