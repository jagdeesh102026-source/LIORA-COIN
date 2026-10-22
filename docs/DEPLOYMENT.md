# OXENIQ — Deployment & Operations Manual

## 1. Prerequisites
- Node.js `>= 20.0.0`
- Hardhat toolchain installed
- BSC Testnet RPC URL & funded testnet BNB account
- BscScan API Key for contract verification

---

## 2. Local Development & Testing
```bash
# Run smart contract unit tests
npm test

# Run contract tests with gas reporting
npx hardhat test
```

---

## 3. Testnet Deployment (BNB Smart Chain Testnet)
```bash
# Deploy to BSC Testnet (Chain ID 97)
npx hardhat run scripts/deploy.ts --network bscTestnet

# Verify contract on BscScan
npx hardhat verify --network bscTestnet <DEPLOYED_CONTRACT_ADDRESS> "OXENIQ" "OXENIQ" 1000000000000000000000000 <INITIAL_OWNER_ADDRESS>
```
