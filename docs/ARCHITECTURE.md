# Liora Coin (LIORA COIN, formerly OXENIQ) — System Architecture Specification

> **Rebranding Note:** The frontend platform is rebranded to **Liora Coin (LIORA COIN / LIORA, proposed symbol)**. Deployed smart contracts on BSC Testnet (`OxeniqToken.sol`, `AllocationManager.sol`) remain immutable on-chain with legacy `OXENIQ` metadata until a dedicated `LIORA` contract is deployed.

## 1. Architectural Philosophy

The Liora Coin ecosystem follows a **modular, decoupled Web3 architecture**. The primary design goal is to provide enterprise-grade reliability, mathematical precision, and security across both fiat e-commerce purchasing and decentralized on-chain trading on BNB Smart Chain.

```
+----------------------------------------------------------------------------------------------------+
|                                         CLIENT TIER                                                |
|   Next.js 16 (Turbopack, TypeScript, Tailwind CSS, Lucide Icons, Viem Web3 Connectors)             |
|   +-----------------------+ +-----------------------+ +-----------------------+                    |
|   | E-Commerce Checkout   | | Public Showcase       | | DEX Swap Terminal     |                    |
|   | - INR Token Purchases | | - Brand Pillars       | | - PancakeSwap Router  |                    |
|   | - Live Quote Display  | | - Tokenomics & Specs  | | - Slippage Protection |                    |
|   | - $100 Min Guard      | | - Verified Contracts  | | - Honest Stage Banner |                    |
|   +-----------------------+ +-----------------------+ +-----------------------+                    |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ HTTPS / JSON API
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                    BACKEND ORDER & COMMERCE TIER                                   |
|   +--------------------------+  +--------------------------+  +--------------------------------+   |
|   | Exchange Rate Oracle     |  | Order State Machine      |  | Payment Provider Adapter       |   |
|   | - USD/INR Rate Polling   |  | & Idempotency Store      |  | Interface                      |   |
|   | - 15-Minute Quote TTL    |  | - Replay Attack Defense  |  | - Provider-Agnostic Skeleton   |   |
|   | - Stale Rate Fallback    |  | - Single Delivery Lock   |  | - Timing-Safe HMAC SHA-256     |   |
|   +--------------------------+  +--------------------------+  +--------------------------------+   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ Internal Secure Worker Queue / KMS
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                  BLOCKCHAIN & SETTLEMENT TIER                                      |
|                                                                                                    |
|  [ BNB Smart Chain Mainnet (Chain ID 56) ]                                                         |
|  +-------------------------------------+      +--------------------------------------------------+ |
|  | OxeniqToken.sol                     |      | AllocationManager.sol                            | |
|  | - Total Supply: 1,000,000,000 Fixed |      | - 70:30 Purchase Split Controller                | |
|  | - Zero Transfer Taxes (100% AMM)    | <──> | - Decoupled from Base BEP-20 Transfer Path       | |
|  | - OpenZeppelin v5 (Ownable2Step)    |      | - ReentrancyGuard Protected                      | |
|  | - Pausable Emergency Breaker        |      +--------------------------------------------------+ |
|  +-------------------------------------+                                                           |
|                     │                                                  │                           |
|                     ▼                                                  ▼                           |
|  +-------------------------------------+      +--------------------------------------------------+ |
|  | PancakeSwap V2 Liquidity Pool       |      | Liquidity Reserve Vault                          | |
|  | - Initial Target: $1,000,000 USD    |      | - Dedicated Gnosis Safe Multi-Sig                | |
|  | - Pair: OXENIQ / USDT               |      | - Accumulates Reserve Tokens Prior to Pool Add   | |
|  | - LP Tokens Locked 24+ Months       |      | - Governed by Multi-Signature Authorization      | |
|  +-------------------------------------+      +--------------------------------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Component Decoupling & Security Boundaries

### 2.1 Base Token Contract (`OxeniqToken.sol`)
- Standard BEP-20 implementation, fully compliant with ERC-20 on BNB Smart Chain.
- **Zero Fees-on-Transfer:** Transfers execute with standard gas costs and zero balance deductions. This preserves compatibility with PancakeSwap AMM pools, vaults, and custodial wallets.
- **Supply Invariant:** 1,000,000,000 tokens minted once at deployment. No `mint()` function exists in the contract ABI. Deflationary burning is enabled via OpenZeppelin `ERC20Burnable`.
- **Administrative Safety:** `Ownable2Step` prevents accidental admin loss; `Pausable` enables an emergency circuit breaker.

### 2.2 E-Commerce Purchase Allocation (`AllocationManager.sol`)
- Decoupled from `OxeniqToken.sol` to ensure ordinary transfers are never taxed.
- Implements the 70:30 purchase allocation arithmetic with integer division:
  - Buyer receives calculated purchase amount.
  - Liquidity reserve receives its separately defined allocation.
  - Conservation guarantees zero tokens lost to truncation.

### 2.3 Provider-Independent Payment Gateway Adapter
- Abstraction decoupling e-commerce payment gateways (Cashfree, Razorpay, Decentro) from core business logic.
- Implements authenticated HMAC-SHA256 webhook signature verification.
- Enforces an idempotency key (`providerId:paymentId:orderId`) ensuring duplicate webhook notifications cannot cause duplicate token deliveries.

### 2.4 Currency & Rate Oracle Service
- Converts USD $100 minimum order requirement to INR: $\text{Min INR} = \lceil 100 \times \text{USD\_INR\_RATE} \rceil$.
- Enforces a 15-minute quote validity TTL. If payment confirmation exceeds the TTL, quotes expire to prevent fiat volatility exposure.
- Enforces a 60-minute staleness cutoff, reverting to fail-safe mode if the rate oracle is unavailable.

---

## 3. Order Lifecycle State Machine

```
[CREATED] ──> [QUOTED] ──> [PAYMENT_PENDING] ──> [PAYMENT_VERIFIED] ──> [FULFILLMENT_PENDING] ──> [FULFILLED]
                                 │                       │                       │
                                 ├──> [EXPIRED]          └──> [REFUNDED]         └──> [FULFILLMENT_FAILED]
                                 └──> [CANCELLED]                                              │
                                                                                               └──> [MANUAL_REVIEW]
```

---

## 4. Postponed Features Guardrail

- **Borrowing & Lending Feature:** Explicitly postponed. No lending pools, borrowing contracts, collateral vaults, or liquidation routines exist in the repository.
- **TRON Cross-Chain Bridge:** Deferred to future phases once TVM specifications are finalized.
