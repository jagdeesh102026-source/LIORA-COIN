# Liora Coin (LIORA COIN) — Tokenomics & Allocation Model

> **IMPORTANT**: This document reflects confirmed tokenomics parameters, mathematical formulas, and formally logged open decisions. Frontend branding has been updated to **Liora Coin** (proposed symbol: `LIORA`, pending on-chain confirmation). Existing deployed BSC Testnet smart contracts retain immutable `OXENIQ` metadata until a new `LIORA` BEP-20 deployment is approved.

---

## 1. Confirmed Parameters

- **Platform Display Name**: Liora Coin (`LIORA COIN`)
- **Proposed Token Symbol / Ticker**: LIORA *(pending on-chain confirmation; deployed BSC Testnet contract remains `OXENIQ`)*
- **Target Blockchain**: BNB Smart Chain (BSC Mainnet / Testnet)
- **Token Standard**: BEP-20 (fully ERC-20 compatible)
- **Decimals**: 18
- **Token Category**: Market-priced utility cryptocurrency (NOT a USD-pegged or fiat-backed stablecoin)
- **Intended Total Supply**: **1,000,000,000 OXENIQ** ($10^9$ token units, representing $10^{27}$ atomic base units)
- **Supply Policy**: Fixed genesis supply. Deflationary token burning supported. Zero post-deployment arbitrary minting.
- **Initial Liquidity Target**: **$1,000,000 USD** (Scope subject to DEC-05 confirmation)
- **Minimum Order Requirement**: **$100 USD Equivalent** (Paid in INR via approved conversion policy)
- **Base Transfer Fee**: **0% (Zero transfer tax)**. Ordinary wallet-to-wallet transfers, DEX swaps, and bridge operations are completely tax-free.

---

## 2. Supply Architecture & Provisional Discrepancy Note

| Metric | Business Requirement | Provisional Repository Code | Status |
|---|---|---|---|
| **Total Supply** | 1,000,000,000 OXENIQ | 1,000,000 OXENIQ (`scripts/deploy.js`, `test/`) | **Discrepancy Documented (DEC-01)** |
| **Minting Model** | Fixed at genesis (No mint function) | Constructor parameter mints once to deployer | **Verified Aligned** |
| **Token Decimals** | 18 | 18 | **Verified Aligned** |
| **Deflationary Burn** | Supported via ERC20Burnable | OpenZeppelin v5 ERC20Burnable | **Verified Aligned** |

*Note on Supply Discrepancy:*  
The smart contract `OxeniqToken.sol` is parameterized via its constructor (`initialSupply_`) and natively supports 1,000,000,000 tokens ($10^{27}$ base units) without modifying contract logic. The provisional test and deployment scripts were created with 1,000,000 tokens for testnet gas conservation. Phase 12 unit tests have verified deployment and arithmetic with the full 1,000,000,000 supply. Formal sign-off on updating default script configs is tracked under DEC-01.

---

## 3. The 70:30 E-Commerce Purchase Allocation Model

Under the confirmed e-commerce workflow, customers pay in INR and receive the full token allocation calculated for their purchase. In parallel, a separate token allocation is directed to the protocol liquidity reserve.

Management must formally decide between two candidate mathematical interpretations:

### 3.1 Candidate Interpretation A — Reserve Receives 30% of Buyer's Allocation
- **Formula:**
  $$Q_{\text{buyer}} = \text{Calculated Purchase Amount}$$
  $$Q_{\text{reserve}} = \lfloor (Q_{\text{buyer}} \times 30) / 100 \rfloor$$
  $$Q_{\text{total}} = Q_{\text{buyer}} + Q_{\text{reserve}}$$
- **Distribution Profile:**
  - Buyer receives: 76.92% of disbursed tokens
  - Reserve receives: 23.08% of disbursed tokens
- **Concrete Example (700 OXENIQ Purchase):**
  - Buyer receives: **700 OXENIQ**
  - Reserve receives: **210 OXENIQ** ($700 \times 30\%$)
  - Total disbursed from treasury: **910 OXENIQ**

### 3.2 Candidate Interpretation B — Buyer Receives 70% of Combined Allocation
- **Formula:**
  $$Q_{\text{buyer}} = \text{Calculated Purchase Amount}$$
  $$Q_{\text{total}} = \lceil (Q_{\text{buyer}} \times 100) / 70 \rceil$$
  $$Q_{\text{reserve}} = Q_{\text{total}} - Q_{\text{buyer}}$$
- **Distribution Profile:**
  - Buyer receives: 70.00% of disbursed tokens
  - Reserve receives: 30.00% of disbursed tokens
- **Concrete Example (700 OXENIQ Purchase):**
  - Buyer receives: **700 OXENIQ**
  - Reserve receives: **300 OXENIQ**
  - Total disbursed from treasury: **1,000 OXENIQ**

### 3.3 Token Source & Governance Guardrails
1. **Source of Reserve Tokens:** Reserve tokens must originate from the preallocated treasury inventory within the fixed 1 Billion supply. Tokens are **never** minted to fund the reserve.
2. **Transfer Isolation:** The 70:30 mechanism applies strictly at the e-commerce purchase checkout tier. It is **never** implemented as a universal fee-on-transfer in `OxeniqToken.sol`.
3. **Activation Gate:** The live purchase allocation remains disabled until the project owner formally selects between Interpretation A and B (DEC-03). Both models are tested and supported in the commerce engine.

---

## 4. Initial Sale Pricing & DEX Trading Strategy

The launch roadmap transitions from a controlled initial sale to open decentralized trading:

```
[ Phase 1: Fixed-Price Initial Sale ] ──────> [ Phase 2: PancakeSwap DEX Pool Listing ]
- Pre-allocated sale inventory               - Secondary AMM trading (OXENIQ / USDT)
- Fixed reference price (USD / INR)          - Price determined by market liquidity ratio
- Minimum order: $100 USD equivalent         - Accumulated reserve funds pool depth
- KYC / VDA compliant checkout               - LP tokens locked in certified timelock
```

### Key Pricing Guardrails:
- The initial sale price is set through formal governance (DEC-08) and does not guarantee secondary market prices.
- Unsold initial sale tokens remain in the community/liquidity treasury or are burned.
- Market capitalization claims must reflect circulating tokens multiplied by active trading price, avoiding hypothetical pre-launch claims.

---

## 5. Initial Liquidity Budget ($1,000,000 Scope Analysis)

The project owner has stated an initial liquidity target of **$1,000,000**. Two technical interpretations exist:

| Interpretation | Meaning | Required Quote Asset (USDT) | Required OXENIQ | Implied Pool Value |
|---|---|---|---|---|
| **Option 1 (Combined Pool Value)** | Pool total value = $1,000,000 | $500,000 USDT | $500,000 worth of OXENIQ | **$1,000,000 Total** |
| **Option 2 (Paired Contribution)** | Paired asset = $1,000,000 | $1,000,000 USDT | $1,000,000 worth of OXENIQ | **$2,000,000 Total** |

*Prerequisite:* OXENIQ alone cannot create an AMM pool. Real quote asset funds (USDT or WBNB) must be deposited. No liquidity pool creation or fund transfers will be executed until capital funding is authorized.
