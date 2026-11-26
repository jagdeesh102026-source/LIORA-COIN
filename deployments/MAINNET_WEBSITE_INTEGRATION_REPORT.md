# LIORA BSC Mainnet Website Integration Report (Phase 1)
**Date:** November 26, 2026  
**Status:** COMPLETE (Local Implementation & Automated Verification)  
**Target Live Environment:** https://lioracoin.com  
**Target Blockchain:** BNB Smart Chain Mainnet (Chain ID 56)  

---

## 1. Executive Summary

Phase 1 of the **LIORA BSC Mainnet Website Integration** has been successfully implemented and validated across the Next.js web application (`apps/web`). The objective of this phase is to establish genuine, read-only on-chain connectivity with the officially deployed and verified LIORA BSC Mainnet smart contracts, replacing simulated/mock data on production-facing pages while keeping all financial settlement, swap, liquidity, and trading operations strictly locked.

### Key Achievements:
1. **Live On-Chain Data Integration:** Configured Viem public client targeting official BSC Mainnet RPC (`https://bsc-dataseed.binance.org/`), retrieving authentic token metadata (Name: `LIORA`, Symbol: `LIORA`, Decimals: `18`, Total Supply: `100,000,000,000`), Operating Treasury balance (`1,000,000,000`), Reserve Vault balance (`99,000,000,000`), and live connected wallet balances.
2. **Read-Only Wallet Connectivity:** Updated `Web3WalletContext` to support connecting to and switching to BNB Smart Chain Mainnet (Chain ID `56`) in read-only mode.
3. **Ironclad Financial Guardrails:** Preserved and strengthened all write transaction guards (`assertBscTransactionReady()`, `SettlementPersistentStore.enforceSandboxRestrictions`). Any attempt to broadcast a state-mutating transaction or settlement on Chain ID 56 is strictly rejected.
4. **Transparent User Disclosures:** Added prominent Mainnet verification badges and banners throughout the UI, explicitly clarifying that LIORA smart contracts are verified on BSC Mainnet, trading and purchases remain disabled pending regulatory readiness, and internal benchmark valuations (₹0.20) are prelaunch reference benchmarks rather than AMM market prices.
5. **Full Local Validation:**
   - **TypeScript Typecheck:** `tsc --noEmit` passed with 0 errors.
   - **Production Build:** `next build` compiled all 45 routes and pages successfully.
   - **Integration Test Suite:** `test/Phase2B_MainnetWebsiteIntegration.test.js` passed **16 of 16 tests** against live BSC Mainnet RPC in 3 seconds.

---

## 2. Official BSC Mainnet Infrastructure

| Component | Contract / Address | BscScan Explorer Link |
| :--- | :--- | :--- |
| **LIORA Token (ERC1967 Proxy)** | `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A` | [BscScan Token](https://bscscan.com/token/0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A) |
| **LioraTokenUUPSV1 Implementation** | `0x22C6F5B2e9b03e99FB030a96A2ada0c28BA280a0` | [BscScan Implementation](https://bscscan.com/address/0x22C6F5B2e9b03e99FB030a96A2ada0c28BA280a0#code) |
| **LioraReserveVault** | `0x244865302a1643702ACB66181DBd898F714EF6e0` | [BscScan Vault](https://bscscan.com/address/0x244865302a1643702ACB66181DBd898F714EF6e0#code) |
| **LioraTimelockController** | `0xd03A64C31E2464DD2A7d69B538729A690b4ab177` | [BscScan Timelock](https://bscscan.com/address/0xd03A64C31E2464DD2A7d69B538729A690b4ab177#code) |
| **Operating Treasury** | `0xD546c3263663C193447bAdF60741f3915b349064` | [BscScan Treasury](https://bscscan.com/address/0xD546c3263663C193447bAdF60741f3915b349064) |
| **Governance Wallet** | `0x491d37ab13E66f6fd544Cdb3A4C57015D7fc2d54` | [BscScan Governance](https://bscscan.com/address/0x491d37ab13E66f6fd544Cdb3A4C57015D7fc2d54) |

---

## 3. Detailed File Modifications

### A. Configuration & Blockchain Core
1. **`apps/web/src/config/tokenConfig.ts`**
   - Configured official BSC Mainnet parameters (`BSC_MAINNET_CHAIN_ID = 56`, `BSC_MAINNET_LIORA_TOKEN_ADDRESS = 0xE7B7...630A`, Proxy, Implementation, Reserve Vault, Timelock, Operating Treasury, Governance).
   - Added `BSC_MAINNET_CONFIG` object pointing to `https://bscscan.com` and `https://bsc-dataseed.binance.org/`.
   - Exported `getTokenContractAddress(chainId)` dynamically resolving Mainnet vs Testnet addresses.
   - Added `isProductionChain(chainId)` and `isTestnetChain(chainId)` helpers.

2. **`apps/web/src/lib/chains/types.ts` & `apps/web/src/lib/chains/blockchainRegistry.ts`**
   - Added `'READ_ONLY_MAINNET'` to `ChainOperationalStatus` union.
   - Configured `'bsc-mainnet'` entry in `BLOCKCHAIN_REGISTRY` with `enabled: true`, `status: 'READ_ONLY_MAINNET'`, `smartContracts: true`, and all financial write features (`tokenTransfers`, `tradingBotPayments`, `investorLocking`) set to `false`.
   - Registered `'bsc-mainnet:liora'` in `CHAIN_AWARE_TOKENS` targeting `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A` (BEP-20, 18 decimals).

3. **`apps/web/src/config/previewConfig.ts`**
   - Updated `previewBadgeText` to `'BSC Mainnet Verified (Read-Only)'`.
   - Updated `previewBannerMessage` to:
     `'BSC MAINNET LIVE — LIORA smart contracts verified on BNB Smart Chain. Website operating in secure read-only mode (Trading, liquidity & purchases disabled).'`

### B. Client & Wallet Connectivity
4. **`apps/web/src/context/Web3WalletContext.tsx`**
   - Added `BSC_MAINNET_CHAIN_ID` to `SUPPORTED_CHAIN_IDS`.
   - Added `switchToBscMainnet()` helper allowing users to switch their browser wallet to BSC Mainnet with one click.
   - Maintained strict `assertBscTransactionReady()` guard:
     ```ts
     if (isBscMainnet) {
       throw new Error(
         'BNB Smart Chain Mainnet transactions and write operations remain strictly disabled. ' +
         'The portal is operating in verified read-only mode.'
       );
     }
     ```

5. **`apps/web/src/lib/contracts/client.ts`**
   - Initialized Viem `bscMainnetPublicClient` targeting `BSC_MAINNET_CONFIG.rpcUrl` (`https://bsc-dataseed.binance.org/`).
   - Implemented `LIORA_TOKEN_ABI` covering ERC-20 read functions plus custom UUPS getters (`operatingTreasury()`, `reserveVault()`).
   - Created `fetchMainnetTokenOverview()` to query token name, symbol, decimals, totalSupply, treasury balance, and reserve vault balance directly from BSC Mainnet.
   - Created `fetchMainnetUserTokenBalance(userAddress)` for querying connected wallet balances on Chain 56.

6. **`apps/web/src/hooks/useOxeniqContract.ts`**
   - Updated hook to check `isBscMainnet` or `chainId === 56`.
   - Seamlessly queries `fetchMainnetTokenOverview()` and `fetchMainnetUserTokenBalance(address)` when connected on Mainnet.

7. **`apps/web/src/lib/treasury/treasuryAccountingEngine.ts`**
   - Integrated `BSC_MAINNET_TREASURY_WALLET`, `BSC_MAINNET_RESERVE_VAULT`, and `BSC_MAINNET_GOVERNANCE_WALLET`.
   - Updated `isAuthorizedTreasuryWallet()` to validate Mainnet treasury wallets while leaving testnet development wallets segregated.

### C. UI & Presentation Overhaul
8. **`apps/web/src/components/Header.tsx`**
   - When connected on BSC Mainnet (Chain 56), displays live on-chain LIORA balance with a `LIORA (Mainnet)` badge.
   - Hides Testnet Mock USDT balance when user is on Mainnet.

9. **`apps/web/src/app/token/page.tsx`**
   - Completely updated to display the official BSC Mainnet infrastructure:
     - Contract Proxy Address (`0xE7B7...630A`) with direct BscScan links.
     - Implementation V1, Reserve Vault (99B), Timelock (48h delay), and Operating Treasury (1B).
     - Live on-chain total supply and wallet balance cards.
   - Preserved Testnet faucet/sandbox controls inside a dedicated collapsible "Developer Testnet Sandbox" accordion.

10. **`apps/web/src/app/swap/page.tsx`**
    - Production view decoupled from Testnet PancakeSwap pair.
    - Default view presents "Mainnet Production Architecture" tab displaying official contract status, staging notice, and clear price schedule disclaimers (₹0.20 internal allocation benchmark vs. open market).
    - PancakeSwap V2 testnet terminal safely isolated under "Developer Testnet Sandbox" tab.

11. **`apps/web/src/components/treasury/TreasuryOverviewDashboard.tsx`**
    - Links the authorized treasury wallet to BscScan Mainnet (`0xD546...9064`) and displays the 99 Billion LIORA Reserve Vault (`0x2448...F6e0`).

12. **`apps/web/src/app/ecosystem/page.tsx`**
    - Updated infrastructure banner to highlight verified BSC Mainnet deployment with direct BscScan explorer links.

---

## 4. Security & Safety Guardrails Assessment

| Guardrail | Status | Verification Detail |
| :--- | :--- | :--- |
| **Write Transactions on Mainnet** | **BLOCKED** | `assertBscTransactionReady()` throws runtime exception on Chain 56. |
| **Settlement Persistent Store** | **BLOCKED** | `SettlementPersistentStore.enforceSandboxRestrictions({ chainId: 56 })` returns `MAINNET_SETTLEMENT_PROHIBITED`. |
| **Fiat Payouts & Real Withdrawals**| **BLOCKED** | `ACTION_PROHIBITED_IN_SANDBOX` strictly enforced. |
| **Private Keys & Signer Isolation** | **VERIFIED** | No private keys, mnemonic phrases, or keystore files exist in frontend or public repositories. |
| **Deployment Authorization Flags**  | **SAFE** | Both `DEPLOY_LIORA_MAINNET_CONFIRM` and `MAINNET_DEPLOYMENT_AUTHORIZED` remain strictly `false`. |
| **AMM Liquidity & Swaps**          | **DISABLED**| No PancakeSwap liquidity pools exist on Mainnet; UI warns users that open market trading is not yet active. |

---

## 5. Verification Test Suite Results

An automated integration test suite (`test/Phase2B_MainnetWebsiteIntegration.test.js`) was executed via Hardhat, validating all 16 integration criteria against live BSC Mainnet RPC:

```
  LIORA — Phase 1 Mainnet Website Integration & Safety Guardrails Suite
    1. Official BSC Mainnet Configuration & Addresses
      √ Should configure the official LIORA Mainnet Proxy contract address (121ms)
      √ Should configure the official Mainnet Implementation, Vault, Timelock, and Treasury addresses (139ms)
      √ Should resolve the correct contract address for Chain ID 56 and Chain ID 97
      √ Should correctly validate production vs testnet chain identifiers
    2. Multi-Chain Registry State & Security Invariants
      √ Should enable bsc-mainnet for read-only connectivity while disabling mutating transactions
      √ Should register bsc-mainnet:liora with official Mainnet proxy address (65ms)
      √ Should keep testnet tokens properly isolated in registry
    3. Live BSC Mainnet On-Chain Data Retrieval
      √ Should read authentic token metadata directly from BSC Mainnet (Chain ID 56) (2091ms)
      √ Should retrieve the exact 100 Billion total supply from Mainnet (255ms)
      √ Should retrieve the exact 1 Billion Operating Treasury balance from Mainnet (201ms)
      √ Should retrieve the exact 99 Billion Reserve Vault balance from Mainnet (198ms)
      √ Should query user LIORA balance from Mainnet and return 0.00 for arbitrary address (168ms)
    4. Security Guardrails & Transaction Blockades
      √ Should block Mainnet settlement execution in server-side persistent store
      √ Should block real fiat payouts in server-side persistent store
      √ Should recognize BSC Mainnet treasury address while distinguishing testnet treasury
      √ Should maintain preview banner message reflecting BSC Mainnet live status

  16 passing (3s)
```

### Production Build Results:
- **Lint / TypeScript Check:** `tsc --noEmit` exited with code `0` (Zero compilation errors).
- **Next.js 16 Production Build:** `next build` compiled all 45 static and dynamic routes cleanly.

---

## 6. Recommended Production Deployment Procedure

> [!IMPORTANT]
> All changes are currently **local on disk**. No commits have been pushed to GitHub, and no deployment commands have been executed on the live VPS (`https://lioracoin.com`).

When ready to deploy Phase 1 to the live production server, follow these exact steps:

### Step 1: Review Git Working Tree
```bash
git status -s
git diff apps/web
```

### Step 2: Commit Phase 1 Website Integration Changes
```bash
git add apps/web/src/ test/Phase2B_MainnetWebsiteIntegration.test.js deployments/MAINNET_WEBSITE_INTEGRATION_REPORT.md
git commit -m "feat(web): integrate BSC Mainnet smart contracts in read-only mode (Phase 1)"
```

### Step 3: Push to GitHub
```bash
git push origin main
```

### Step 4: Deploy on Live VPS (`lioracoin.com`)
SSH into the production server and run:
```bash
cd /path/to/oxeniq
git pull origin main
npm --prefix apps/web ci
npm --prefix apps/web run build
pm2 restart oxeniq-web # or systemctl restart oxeniq-web
```

### Step 5: Post-Deployment Smoke Verification
1. Visit `https://lioracoin.com/token` and confirm official proxy `0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A` is displayed.
2. Verify live on-chain total supply reads `100,000,000,000 LIORA`.
3. Connect MetaMask or Trust Wallet on BNB Smart Chain (Chain 56) and verify read-only balance retrieval.
4. Verify that the "Swap", "Invest", and "Purchase" buttons remain disabled or present clear prelaunch notices.
