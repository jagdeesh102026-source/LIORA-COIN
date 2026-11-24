# OXENIQ — Wallet Compatibility & BNB-First Deployment Review

**Date:** October 2026  
**Confirmed Strategy:** **Phase 1: Deploy and launch OXENIQ on BNB Smart Chain only. Other blockchain networks may be considered in future phases.**  
**Project Path:** `D:\Projects\OXENIQ`  
**Status:** Implementation Complete & Fully Verified  

---

## 1. Executive Summary & Strategy Confirmation

This review evaluates the Web3 wallet connection architecture in the OXENIQ web application (`apps/web`), establishes the separation between **wallet compatibility** and **blockchain deployment**, and documents strict **BNB Smart Chain** network isolation.

### 1.1 Separation of Concerns: Wallet Compatibility vs. Blockchain Deployment
- **Wallet Compatibility:** An application-level capability. OXENIQ supports multiple EVM-compatible wallets (Rabby, MetaMask, Trust Wallet, Coinbase Wallet, Brave) via **EIP-6963 provider discovery** and mobile Web3 in-app browsers.
- **Blockchain Deployment:** A protocol-level constraint. **OXENIQ is deployed strictly on BNB Smart Chain**. 
- **Non-Implication Principle:** Connecting a multi-chain wallet (e.g., MetaMask connected to Ethereum Mainnet or Polygon) **does not imply** that OXENIQ contracts exist or transact on that network. All non-BSC networks are actively detected and blocked from executing OXENIQ transactions.

---

## 2. Multi-Wallet Architecture & EIP-6963 Provider Discovery

```
+----------------------------------------------------------------------------------------------------+
|                                    USER WALLET SELECTION TIER                                      |
|                                                                                                    |
|   [ Injected Extension A ]     [ Injected Extension B ]     [ Injected Extension C ]               |
|   (e.g., Rabby Wallet)         (e.g., MetaMask)             (e.g., Trust Wallet)                   |
|            │                            │                            │                             |
|            └────────────────────────────┼────────────────────────────┘                             |
|                                         ▼                                                          |
|                       [ Window EIP-6963 Discovery Events ]                                         |
|                       - Event: 'eip6963:requestProvider'                                           |
|                       - Event: 'eip6963:announceProvider'                                          |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                   OXENIQ CLIENT CONTEXT TIER                                       |
|   Web3WalletContext & Provider Store (Synchronized across all components)                          |
|   +--------------------------------------------------------------------------------------------+   |
|   |  - Active Provider Instance (Maintained across all RPC requests)                           |   |
|   |  - Discovered EIP-6963 Providers Registry (UUID, RDNS, Icon, Name)                         |   |
|   |  - Legacy window.ethereum Fallback (For older browsers / in-app mobile dApp browsers)      |   |
|   |  - Network Guard (Restricted exclusively to BNB Smart Chain #56, #97, and Local #31337)    |   |
|   |  - Reactive Error State (User cancellation, wrong network, missing wallet)                 |   |
|   +--------------------------------------------------------------------------------------------+   |
+----------------------------------------------------------------------------------------------------+
```

### 2.1 EIP-6963 Protocol Implementation
1. **Event Dispatch:** On application mount, `Web3WalletProvider` dispatches `window.dispatchEvent(new Event("eip6963:requestProvider"))`.
2. **Provider Announcement Ingestion:** Listens for `eip6963:announceProvider` custom events and populates `discoveredProviders: EIP6963ProviderDetail[]`.
3. **Deduplication:** Providers are deduplicated by `uuid` or reverse domain name service (`rdns`, e.g., `io.rabby`, `io.metamask`, `com.trustwallet.app`).
4. **Provider Isolation:** When a user selects a discovered wallet, OXENIQ binds directly to that wallet's dedicated `detail.provider` (EIP-1193) instance, guaranteeing zero collision with other extensions.

### 2.2 Mobile Wallet Connectivity Strategy
1. **In-App Mobile Web3 Browsers (Supported Out of the Box):**
   - Opening OXENIQ inside MetaMask Mobile, Trust Wallet Mobile, or Binance Web3 App injects `window.ethereum` into the webview.
   - The unified wallet provider detects this environment and seamlessly connects via the "Default Injected Wallet" path.
2. **WalletConnect v2 Relay (Optional Project ID):**
   - External QR code pairing requires a WalletConnect Cloud Project ID (`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`).
   - The updated `WalletModal` includes a dedicated collapsible guide informing users of the exact status of the relay configuration and guiding mobile users to their in-app browser.

---

## 3. Strict Network Isolation: BNB Smart Chain Exclusive

OXENIQ operates strictly on BNB Smart Chain. Connecting an EVM wallet **does not** imply support for Ethereum, Polygon, TRON, or other networks.

### 3.1 Network Category Separation
| Network Name | Chain ID | Hex ID | Category | Status | Contract Address | Notes |
|---|---|---|---|---|---|---|
| **BNB Smart Chain Mainnet** | `56` | `0x38` | **PRODUCTION** | `ACTIVE_TARGET` | `null` (To be published at Genesis Launch) | The only production network for OXENIQ in Phase 1. |
| **BNB Smart Chain Testnet** | `97` | `0x61` | **TESTNET** | `TESTING_ONLY` | `null` (Staged pipeline deployment) | Testing and pipeline validation only. |
| **Local Hardhat Devnet** | `31337` | `0x7a69` | **LOCAL_SIMULATION** | `DEV_MOCK_ONLY` | `0x5FbDB...` (Mock address) | **Isolated developer mock only**. Never treated as a deployed BSC contract. |
| **Ethereum Mainnet** | `1` | `0x1` | **FUTURE_EXPANSION** | `DISABLED_FUTURE_PHASE` | `null` | Phase 2+ potential; strictly disabled. |
| **TRON Mainnet** | `728126428`| — | **FUTURE_EXPANSION** | `DISABLED_FUTURE_PHASE` | `null` | Requires dedicated TVM bridge; strictly disabled. |
| **Polygon Mainnet** | `137` | `0x89` | **FUTURE_EXPANSION** | `DISABLED_FUTURE_PHASE` | `null` | Phase 2+ potential; strictly disabled. |

### 3.2 Wrong-Network Enforcement Policy
If a user connects while their wallet is set to an unsupported network (e.g., Ethereum Mainnet `1`, Polygon `137`, Arbitrum `42161`):
1. The dApp immediately flags `isWrongNetwork: true` and `isSupportedChain: false`.
2. An amber warning badge is displayed in the header: `Unsupported Chain (#<id>)`.
3. The `WalletModal`, `BuyPage`, and `SwapPage` present action banners with direct one-click switches to **BSC Testnet (#97)** or **BSC Mainnet (#56)**.
4. Switching issues `wallet_switchEthereumChain`. If the network is not yet registered in the wallet (Error `4902`), it automatically triggers `wallet_addEthereumChain` with official BSC parameters.
5. If the user rejects the network switch (Error `4001`), the dApp displays: `"Network switch was cancelled in your wallet."`
6. Transactions are strictly blocked by `assertBscTransactionReady()` before any blockchain call is initiated.

---

## 4. Implemented Components & Code Artifacts

| Component | File Path | Description |
|---|---|---|
| **Centralized Chain Config** | `apps/web/src/config/tokenConfig.ts` | Separates Production (BSC 56), Testnet (BSC 97), Local Devnet (31337), and Future Chains (Disabled). |
| **Global Wallet Context** | `apps/web/src/context/Web3WalletContext.tsx` | Centralized reactive store for EIP-6963 discovery, active provider binding, and `assertBscTransactionReady()` guard. |
| **Root Layout Integration** | `apps/web/src/app/layout.tsx` | Wraps all pages with `<Web3WalletProvider>` to synchronize wallet state across the entire dApp. |
| **Refactored Hook** | `apps/web/src/hooks/useWeb3Wallet.ts` | Backward-compatible facade exposing reactive wallet state, discovered providers, and network controls. |
| **Upgraded Modal** | `apps/web/src/components/WalletModal.tsx` | Renders detected EIP-6963 wallets with icons, fallback injected connection, mobile guidance, and safety disclaimers. |
| **Header Integration** | `apps/web/src/components/Header.tsx` | Displays active account, network status badges, and switches for unsupported chains. |
| **Test Suite** | `test/Phase12_WalletCompatibility.test.js` | 24 automated unit tests covering discovery, isolation, error codes, and transaction boundary assertions. |

---

## 5. Automated Testing & Verification Matrix

The test suite at `test/Phase12_WalletCompatibility.test.js` was executed via Hardhat with **24/24 tests passing**:

| Test Group | Test Case | Status | Verified Behavior |
|---|---|---|---|
| **1. EIP-6963 Discovery** | Multiple installed wallet extensions | **PASS** | Discovers Rabby, MetaMask, Trust Wallet simultaneously without collision. |
| | Deduplication of repeated events | **PASS** | Ignores duplicate announcements with the same RDNS / UUID. |
| **2. Provider Isolation** | Consistent RPC routing | **PASS** | RPC calls (`eth_requestAccounts`, `eth_getBalance`) route strictly to the user-selected provider mock. |
| **3. Approval & Errors** | Connection approval | **PASS** | Successfully retrieves account array and chain metadata. |
| | User rejection (Error `4001`) | **PASS** | Maps code 4001 to `"Connection request was cancelled in your wallet."` |
| | Missing wallet detection | **PASS** | Displays explicit guidance when no Web3 provider is present. |
| **4. BSC Isolation** | BSC Testnet (#97) | **PASS** | Identified as supported (`isSupportedChain: true, isBscTestnet: true`). |
| | BSC Mainnet (#56) | **PASS** | Identified as supported (`isSupportedChain: true, isBscMainnet: true`). |
| | Local Simulation (#31337) | **PASS** | Identified as supported for local test verification. |
| | Ethereum Mainnet (#1) | **PASS** | Flagged as wrong network (`isWrongNetwork: true`). |
| | Polygon (#137) & Arbitrum (#42161) | **PASS** | Flagged as unsupported networks. |
| | Prohibit Ethereum/TRON transactions | **PASS** | Confirms strict isolation; no transaction methods exposed for other chains. |
| **5. Network Switching** | Switch to BSC Testnet (`0x61`) | **PASS** | Successfully dispatches `wallet_switchEthereumChain`. |
| | Chain not added (Error `4902`) | **PASS** | Triggers `wallet_addEthereumChain` fallback with official parameters. |
| | Switch rejection (Error `4001`) | **PASS** | Maps to `"Network switch was cancelled in your wallet."` |
| **6. Reactive Events** | `accountsChanged` | **PASS** | Updates active address dynamically upon wallet switch. |
| | Account disconnection (`[]`) | **PASS** | Cleanly disconnects and resets dApp state when accounts are locked/revoked. |
| | `chainChanged` | **PASS** | Re-evaluates network validity instantly when user switches network in extension. |
| **7. Transaction Boundaries** | BSC Mainnet (#56) | **PASS** | Allows transactions and marks `isProduction: true`. |
| | BSC Testnet (#97) | **PASS** | Allows transactions and marks `isTestnet: true`. |
| | Local Hardhat (#31337) | **PASS** | Allows mock dev transactions; isolated from deployed BSC. |
| | Ethereum Mainnet (#1) | **PASS** | Strictly blocks transactions with `UNSUPPORTED_CHAIN`. |
| | Polygon (#137) & Arbitrum (#42161) | **PASS** | Strictly blocks transactions with `UNSUPPORTED_CHAIN`. |
| | Disconnected Wallet | **PASS** | Strictly blocks transactions with `WALLET_NOT_CONNECTED`. |

### Verification Status Breakdown
- **Automated Tests:** 24 wallet compatibility tests + 60 smart contract/commerce tests = **84 tests passing (100%)**.
- **Manually Tested:** UI navigation, wallet modal trigger, currency switcher, ₹1,00,000 minimum validator, flexbox input rendering.
- **Unverified / Staged:** Live BSC Mainnet contract deployment (pending Genesis launch), live PancakeSwap LP creation (pending liquidity budget deposit).

---

## 6. Configuration Needed for Future Mainnet Launch

To transition from Staged development to live BSC Mainnet deployment:

1. **Deploy Token Contract:** Execute Hardhat deployment script targeting BSC Mainnet (Chain ID `56`).
2. **Publish Contract Address:** Insert the deployed BSC Mainnet address into `apps/web/src/config/tokenConfig.ts`:
   ```ts
   BSC_MAINNET_CONFIG.contractAddress = "0x..."; // Official deployed address
   ```
3. **Verify on BscScan:** Submit flattened contract source code to BscScan via Hardhat verify plugin.
4. **Deploy AllocationManager:** Deploy `AllocationManager.sol` with multi-sig recipient addresses.
5. **Configure Multi-Sig Admin:** Transfer contract ownership via `transferOwnership` / `acceptOwnership` to a 3-of-5 Gnosis Safe.

---

## 7. Required Dependencies & External Service Setup

| Dependency / Service | Status | Purpose | Required Action |
|---|---|---|---|
| **Viem (`^2.21.0`)** | Installed | Core Web3 formatting & RPC utilities | None. Fully operational. |
| **EIP-6963 Provider Events** | Native | Multi-wallet extension discovery | None. Built-in zero-dependency. |
| **WalletConnect Cloud** | Optional | Desktop-to-mobile QR pairing | Create free Project ID at [cloud.reown.com](https://cloud.reown.com) and set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. |
| **Transak Web3 Onramp** | Recommended | Regulated fiat-to-token on-ramp | Complete institutional onboarding, FIU-IND compliance, and obtain API key. |
