# LIORA COIN — Website Mainnet Integration Assessment Report

**Assessment Date:** November 26, 2026  
**Target Live Website:** https://lioracoin.com  
**Local Codebase:** `D:\Projects\OXENIQ\apps\web`  
**Official Mainnet Deployment Artifact:** [`deployments/bscMainnet-uups.json`](file:///d:/Projects/OXENIQ/deployments/bscMainnet-uups.json)  
**Assessment Mode:** Strictly Read-Only (Zero Code/Server/State Modifications)  

---

## Executive Summary

A comprehensive, read-only audit of the LIORA web portal (`https://lioracoin.com`) and its underlying Next.js project codebase was conducted following the successful deployment and on-chain verification of the LIORA smart contracts on BNB Smart Chain (BSC) Mainnet.

### Key Assessment Findings:
1. **Website Remains 100% on BSC Testnet (Chain ID 97):** Neither the live website nor the local web codebase is currently integrated with BSC Mainnet (Chain ID 56). Both environments are configured strictly for BSC Testnet and local devnet mocks.
2. **Official Mainnet Contracts Not Configured:** The official Mainnet LIORA Token Proxy (`0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A`), Reserve Vault (`0x244865302a1643702ACB66181DBd898F714EF6e0`), and Timelock (`0xd03A64C31E2464DD2A7d69B538729A690b4ab177`) are completely absent from the website configuration files.
3. **Safety Guardrails Functioning Properly (PASS):** Financial write operations (real purchases, DEX liquidity deployment, live trading bot, fiat settlements, and withdrawals) are **strictly disabled** in the production deployment via `PREVIEW_CONFIG` and server-side sandbox barriers.
4. **Local & Live Configurations in Full Alignment (PASS):** The live website at `lioracoin.com` precisely mirrors the local repository state; no unauthorized or divergent configuration changes were detected between local and production.

---

## 1. 9-Point Verification Checklist

| # | Verification Check | Target / Invariant | Live Website / Codebase Status | Status |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **Network Chain ID** | BSC Mainnet (Chain ID `56`) | Hardwired to BSC Testnet (Chain ID `97`) | **FAIL** |
| **2** | **LIORA Token Address** | `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A` | Configured as `null` for Mainnet; displays Testnet addresses | **FAIL** |
| **3** | **Reserve Vault & Timelock Addresses** | Vault: `0x2448...F6e0`<br>Timelock: `0xd03A...b177` | Absent from config; only Testnet addresses present | **FAIL** |
| **4** | **Wallet Connection & Network Switching** | Connect & Switch to BSC Mainnet (56) | Rejects Mainnet; forces switch to BSC Testnet (97) | **FAIL** |
| **5** | **Token Balances & Supply Retrieval** | Live Mainnet RPC (`totalSupply`, balances) | Fetches from BSC Testnet RPC or local database | **FAIL** |
| **6** | **Testnet, Mock & Demo Assets in Production** | Zero Testnet / Mock / Demo assets in prod | Multiple Testnet contracts, Mock USDT, and demo store active | **FAIL** |
| **7** | **Price Disclaimers vs. Market Price** | Clear separation between reference and DEX price | Prominently disclaimed on UI and API endpoints | **PASS** |
| **8** | **Financial Functionality State** | Purchases, Swaps, Investments, Withdrawals disabled | All disabled on live website via `PREVIEW_CONFIG` & sandbox | **PASS** |
| **9** | **Live vs. Local Configuration Consistency** | Zero discrepancies between local and live | Identical behavior, routes, contracts, and preview mode | **PASS** |

---

## 2. In-Depth Technical Findings by Checkpoint

### Check 1: Network Selection (BSC Mainnet 56 vs. BSC Testnet 97) — [FAIL]
- In `apps/web/src/context/Web3WalletContext.tsx` (Lines 80–82):
  ```typescript
  // Production Gate: In this phase, BSC Mainnet transactions remain strictly disabled.
  // Only BSC Testnet (#97) and Local Devnet (#31337) are authorized for operations.
  const SUPPORTED_CHAIN_IDS = [BSC_TESTNET_CHAIN_ID, LOCAL_DEVNET_CHAIN_ID];
  ```
- In `apps/web/src/lib/chains/blockchainRegistry.ts` (Lines 48–70):
  `bsc-mainnet` has `enabled: false`, `status: 'DISABLED_UNTIL_APPROVED'`, with all smart contract features set to `false`.
- Live inspection of `https://lioracoin.com` confirms all Web3 calls, network alerts, and wallet prompts target Chain ID `97`.

---

### Check 2: Configured Token Address vs. Official Mainnet Contract — [FAIL]
- Expected Official Mainnet Token Address: `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A`
- In `apps/web/src/config/tokenConfig.ts`:
  - `BSC_MAINNET_TOKEN_ADDRESS: string | null = null;`
  - `BSC_TESTNET_LIORA_TOKEN_ADDRESS = "0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9";` (Testnet Proxy)
  - `BSC_TESTNET_TOKEN_ADDRESS = "0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";` (Legacy Testnet)
- In `apps/web/src/lib/dex/dexOnChainClient.ts`:
  `export const LIORA_TOKEN_ADDRESS = BSC_TESTNET_LIORA_TOKEN_ADDRESS;`
- Live inspection of `https://lioracoin.com/token` displays `0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877`. Live `/swap` displays `0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9`. Mainnet proxy address is completely absent.

---

### Check 3: Reserve Vault and Timelock Addresses — [FAIL]
- Expected (from `deployments/bscMainnet-uups.json`):
  - Reserve Vault: `0x244865302a1643702ACB66181DBd898F714EF6e0`
  - Timelock: `0xd03A64C31E2464DD2A7d69B538729A690b4ab177`
  - Operating Treasury: `0xD546c3263663C193447bAdF60741f3915b349064`
- Actual in Web App:
  - `BSC_TESTNET_LIORA_TIMELOCK_ADDRESS = "0xDa79b818566fcE9D8123817dc291f4E0DE626A27"` (Testnet only)
  - `BSC_TESTNET_LIORA_RESERVE_VAULT_ADDRESS = "0x1E10a2bFcA618Ed3EFEf732f4352A774586FC320"` (Testnet only)
  - `AUTHORIZED_TREASURY_WALLET = "0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350"` (Testnet Treasury EOA)
- The Mainnet Reserve Vault and Timelock addresses do not exist in any file in `apps/web`.

---

### Check 4: Wallet Connection and Network Switching — [FAIL for Mainnet]
- While EIP-6963 provider detection (MetaMask, Rabby, Trust Wallet) functions correctly, connecting a wallet on BSC Mainnet (56) triggers an `isWrongNetwork` state.
- In `Web3WalletContext.tsx` (Lines 543–550):
  ```typescript
  if (!isSupportedChain) {
    const isMainnet = chainId === BSC_MAINNET_CHAIN_ID;
    return {
      ready: false,
      error: isMainnet
        ? 'BNB Smart Chain Mainnet transactions are disabled in this phase. Real settlements require separate approval. Please switch to BSC Testnet (#97).'
        : `Unsupported network (Chain #${chainId}). Liora Coin testing transactions are supported exclusively on BSC Testnet (#97).`,
    };
  }
  ```
- Network switch buttons on `/swap`, `/buy`, and `/token` actively invoke `switchToBscTestnet()` to force the user off Mainnet onto Testnet (Chain ID 97).

---

### Check 5: Token Balance and Supply Retrieval — [FAIL for Mainnet]
- In `apps/web/src/hooks/useTestnetBalances.ts`:
  Only queries balances when `isBscTestnet` is true; returns `0.00` if on Mainnet.
- In `apps/web/src/hooks/useOxeniqContract.ts`:
  Explicitly rejects non-testnet chains: `"Unsupported network. Switch to BSC Testnet (#97)."`.
- Live API `/api/custody/treasury-balance`:
  Returns internal custodial database figures (`totalTreasuryMintedBaseUnits: 1000000000000000000000000000`), not dynamic live reads from Mainnet RPC.

---

### Check 6: Testnet Addresses, Mock Tokens & Demo Assets in Production — [FAIL]
- Active Testnet Infrastructure on Live Website:
  - Token Contract: `0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877`
  - UUPS Proxy: `0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9`
  - Mock USDT: `0x0b419a33e8a6448547906DCB191b037Db5ac926e`
  - PancakeSwap Testnet Pair: `0xcCb0C6bDFe9dbc77c3275ad34C6F33aF05197D96`
  - PancakeSwap Testnet Router: `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`
- Demo / Simulation Stores:
  - `apps/web/src/lib/demo/demoStore.ts` contains mock profiles and synthetic demo balances.
  - Local devnet references Hardhat address `0x5FbDB2315678afecb367f032d93F642f64180aa3`.

---

### Check 7: Price Display Distinction vs. Market Prices — [PASS]
- Reference pricing engine (`apps/web/src/lib/pricing/lioraPricingSchedule.ts`) mandates strict disclaimers:
  ```typescript
  export const DISCLAIMER =
    'DISCLAIMER: The Scheduled Reference Price is an internal economic benchmark. It is non-binding, does NOT represent an active DEX market price, and provides NO guarantee that LIORA will trade at this valuation on PancakeSwap or any other exchange.';
  ```
- Live API response from `https://lioracoin.com/api/pricing/reference-price` incorporates this mandatory disclaimer alongside the ₹0.20 starting reference price.
- Live `/swap` page clearly separates the PancakeSwap AMM view with the label `ACTIVE TESTNET` from simulated views.

---

### Check 8: Financial Functionality Guardrails — [PASS]
- Remote Review Lockout (`PREVIEW_CONFIG` in `apps/web/src/config/previewConfig.ts`):
  - Evaluates `isLocalhost()`. When served over `https://lioracoin.com`, `isPreviewMode` is active.
  - `disableLiveTrading = true`
  - `disableOnChainPurchases = true`
  - Global banner rendered across all pages:
    *"SECURE READ-ONLY PREVIEW — Live trading, real payments, and proprietary algorithms are disabled for remote review."*
- Terminal Lockout (`apps/web/src/components/TestnetPurchaseTerminal.tsx`):
  - Button state evaluates to `disabled: true` with label `'Preview Mode (On-Chain Writes Disabled)'`.
- Server Sandbox Restriction (`apps/web/src/lib/server/settlement/settlementPersistentStore.ts`):
  - `enforceSandboxRestrictions()` actively blocks Mainnet execution:
    `"MAINNET_SETTLEMENT_PROHIBITED: Mainnet settlement execution is disabled until Genesis Launch 4 December 2026."`
- Prelaunch Offering Status (`/api/prelaunch/config`):
  - Live API confirms `"enabled": false`.
- Swaps, investments, and fiat withdrawals cannot be triggered with real value.

---

### Check 9: Live Website vs. Local Configuration Consistency — [PASS]
- Direct HTTP interrogation of `https://lioracoin.com` routes (`/`, `/token`, `/swap`, `/buy`, `/treasury`, and `/api/*`) confirmed exact parity with the local `apps/web` repository:
  - Identical banner text and preview mode detection.
  - Identical contract address displays (`0xdf4FdDC...` on token page, `0xC0aecDF...` on swap page).
  - Identical API responses on reference pricing and prelaunch config.
- Conclusion: The live production website is running the exact build artifacts of the current local codebase. No hidden or out-of-band Mainnet configuration exists on the server.

---

## 3. Exact Changes Required for Mainnet Production Integration

When authorization is granted to transition the website from Testnet preview to BSC Mainnet production, the following files must be updated:

### 1. `apps/web/src/config/tokenConfig.ts`
- Populate `BSC_MAINNET_TOKEN_ADDRESS`:
  ```typescript
  export const BSC_MAINNET_TOKEN_ADDRESS = "0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A";
  export const BSC_MAINNET_LIORA_PROXY_ADDRESS = "0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A";
  export const BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS = "0x22C6F5B2e9b03e99FB030a96A2ada0c28BA280a0";
  export const BSC_MAINNET_LIORA_TIMELOCK_ADDRESS = "0xd03A64C31E2464DD2A7d69B538729A690b4ab177";
  export const BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS = "0x244865302a1643702ACB66181DBd898F714EF6e0";
  ```
- Bind `BSC_MAINNET_CONFIG.contractAddress` to `BSC_MAINNET_TOKEN_ADDRESS`.

### 2. `apps/web/src/lib/chains/blockchainRegistry.ts`
- In `BLOCKCHAIN_REGISTRY['bsc-mainnet']`:
  - Set `enabled: true`
  - Set `status: 'ACTIVE_PRODUCTION'`
  - Update `features.smartContracts = true` and `features.tokenTransfers = true`
- In `CHAIN_AWARE_TOKENS`:
  - Add `'bsc-mainnet:liora'` referencing `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A` (Chain ID 56).

### 3. `apps/web/src/context/Web3WalletContext.tsx`
- Add `BSC_MAINNET_CHAIN_ID` (56) to `SUPPORTED_CHAIN_IDS`.
- Update `assertBscTransactionReady()` to accept Chain ID 56 as a supported, valid network.

### 4. `apps/web/src/lib/contracts/client.ts`
- Instantiate `bscMainnetPublicClient` via Viem targeting `BSC_MAINNET_CONFIG.rpcUrl` (`https://bsc-dataseed.binance.org/`).
- Update `fetchOnChainTokenMetadata` to query `BSC_MAINNET_TOKEN_ADDRESS` on Mainnet by default for production views.

### 5. `apps/web/src/lib/treasury/treasuryAccountingEngine.ts`
- Update `AUTHORIZED_TREASURY_WALLET` to the verified BSC Mainnet Operating Treasury address:
  ```typescript
  export const AUTHORIZED_TREASURY_WALLET = '0xD546c3263663C193447bAdF60741f3915b349064'.toLowerCase();
  ```

### 6. `apps/web/src/lib/dex/dexOnChainClient.ts`
- Separate Testnet PancakeSwap addresses from production configuration so Mainnet pool queries do not attempt to read Testnet router/pair contracts.

### 7. Server Environment Configuration (`apps/web/.env.production`)
- Provide high-throughput BSC Mainnet RPC URL (`NEXT_PUBLIC_BSC_MAINNET_RPC`).
- Confirm database connection strings and custodial service credentials.

---

*Report prepared strictly via read-only inspection of repository files and remote HTTP queries to `https://lioracoin.com`.*
