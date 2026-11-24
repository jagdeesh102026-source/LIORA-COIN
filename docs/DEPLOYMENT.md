# OXENIQ — Deployment & Operations Manual

## 1. Prerequisites & Environment Setup
- Node.js `>= 20.0.0`
- Hardhat toolchain installed (`npm install`)
- BSC Testnet / Mainnet RPC endpoints
- Private deployer key (configured in local `.env`, strictly excluded from git tracking)
- BscScan API Key for automated source verification
- Multi-signature wallet (Gnosis Safe) for ownership transfer

---

## 2. Local Testing & Verification
Execute the comprehensive test suite (59 unit tests covering tokenomics, 1B supply, candidate allocation formulas, webhook HMAC verification, and idempotency):

```bash
# Run all contract and commerce engine unit tests
npx hardhat test

# Run tests with gas estimation report
REPORT_GAS=true npx hardhat test
```

---

## 3. BSC Testnet Deployment Workflow (Chain ID 97)

### Step 1: Deploy Contracts via Hardhat
```bash
npx hardhat run scripts/deploy.js --network bscTestnet
```

### Step 2: Verify `OxeniqToken.sol` on BscScan
```bash
npx hardhat verify --network bscTestnet \
  <DEPLOYED_TOKEN_ADDRESS> \
  "OXENIQ" \
  "OXENIQ" \
  "1000000000000000000000000000" \
  <DEPLOYER_OR_SAFE_ADDRESS>
```

### Step 3: Verify `AllocationManager.sol` on BscScan
```bash
npx hardhat verify --network bscTestnet \
  <DEPLOYED_ALLOCATION_ADDRESS> \
  <DEPLOYED_TOKEN_ADDRESS> \
  <RECIPIENT_70_ADDRESS> \
  <RECIPIENT_30_ADDRESS> \
  <DEPLOYER_OR_SAFE_ADDRESS>
```

### Step 4: Transfer Administration to Gnosis Safe
Initiate two-step ownership transfer:
```solidity
oxeniq.transferOwnership(gnosisSafeAddress);
allocationManager.transferOwnership(gnosisSafeAddress);
```
From the Gnosis Safe multi-sig interface, execute `acceptOwnership()` on both contracts.

---

## 4. Mainnet Readiness Gates

Before executing deployment on BNB Smart Chain Mainnet (Chain ID 56):
- [ ] Formal project owner approval on open decisions (DEC-01 through DEC-16).
- [ ] Gnosis Safe multi-sig deployed on BSC Mainnet with verified signers.
- [ ] Paired quote asset capital ($500k to $1M USDT) deposited into Gnosis Safe.
- [ ] Written merchant agreement with licensed Indian payment aggregator for VDA.
- [ ] Independent security audit report with zero unaddressed High/Critical findings.
- [ ] Formal Indian legal & tax opinion on Sections 115BBH & 194S compliance.

---

## 5. Deployment Safeguards & Partial-Deployment Recovery

### 5.1 Artifact Collision Guard (Fail-Closed)
To eliminate the risk of accidental redeployments and silent overwriting of active contract addresses, `scripts/deploy.js` performs an upfront check via `scripts/deploymentGuards.js` before contacting signers, reading gas balances, or broadcasting any transaction:
- **Complete Artifact Check:** If `deployments/<network>.json` already exists, the script halts immediately with `CRITICAL SAFETY ABORT` to protect established contract addresses.
- **Partial Recovery Artifact Check:** If `deployments/<network>.partial.json` exists, the script also halts immediately with `CRITICAL SAFETY ABORT` to prevent rerunning after a mid-deployment failure (which would deploy duplicate token contracts and fragment supply).
- **Resolution Procedure:** If a fresh deployment is intentionally required, the existing artifact(s) must be explicitly archived (e.g., moved to `deployments/archive/`) or removed by an authorized engineer after verifying on-chain state.

### 5.2 Partial-Deployment Handling & Recovery
OXENIQ deploys two interdependent smart contracts in sequence:
1. `OxeniqToken` (fixed 1B supply minted to initial owner).
2. `AllocationManager` (points to `OxeniqToken` address).

#### The Risk of Blind Redeployment
If `OxeniqToken` deploys successfully on-chain but `AllocationManager` reverts (e.g., due to transient gas spikes, nonce desynchronization, or RPC dropouts), **DO NOT rerun `scripts/deploy.js`**.
Rerunning the full deployment script would deploy a *second* token contract with another 1 Billion supply, creating fragmented tokens, duplicate contracts, and irrecoverable gas waste.

#### Automatic Partial-State Capture
When `AllocationManager` deployment encounters an error:
1. The script immediately halts without writing `deployments/<network>.json` (ensuring no misleading "complete" artifact is published).
2. The already-deployed `OxeniqToken` address and transaction hash are captured and written to `deployments/<network>.partial.json`.
3. Clear error diagnostics and recovery instructions are output to the deployment log without leaking private keys or secrets.

#### Safe Recovery Steps
To recover and complete the deployment without redeploying `OxeniqToken`:
1. **Inspect Partial Record:** Open `deployments/<network>.partial.json` and confirm the `OxeniqToken.address`.
2. **Verify on Explorer:** Confirm the contract exists on [BscScan Testnet](https://testnet.bscscan.com) under the recorded address.
3. **Deploy AllocationManager Individually:** Deploy `AllocationManager` pointing directly to the existing `OxeniqToken` address:
   ```javascript
   const AllocationManager = await ethers.getContractFactory("AllocationManager");
   const allocationManager = await AllocationManager.deploy(
     existingTokenAddress,
     recipient70Address,
     recipient30Address,
     ownerAddress
   );
   await allocationManager.waitForDeployment();
   ```
4. **Finalize Artifact:** Update `deployments/<network>.json` with both addresses and remove the temporary `.partial.json` file.
