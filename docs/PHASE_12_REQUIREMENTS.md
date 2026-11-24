# OXENIQ — Phase 12 Business Requirements & Technical Architecture Specification

**Document Version:** 1.0  
**Phase:** 12 — E-commerce Token Purchases, Liquidity Reserve, Initial Sale, and DEX Readiness  
**Target Blockchain:** BNB Smart Chain (BEP-20 / ERC-20)  
**Status:** Architecture Draft & Pending Manager Approval  

---

## 1. Confirmed Business Direction

The following requirements represent confirmed project direction established by the project owner:

### 1.1 Token Identity, Standard, and Network
- **Token Name:** OXENIQ
- **Symbol / Ticker:** OXENIQ
- **Target Network:** BNB Smart Chain (BSC Mainnet, Chain ID: 56; BSC Testnet, Chain ID: 97)
- **Token Standard:** BEP-20 (fully ERC-20 compatible)
- **Precision:** 18 Decimals
- **Total Supply:** **1,000,000,000 OXENIQ** (1 Billion token units, representing $10^{27}$ atomic base units).
- **Valuation Guardrail:** 1,000,000,000 refers to token quantity, not a USD 1 Billion market valuation.
- **Economic Nature:** Market-priced cryptocurrency and utility token. It is **not** an algorithmic or fiat-pegged stablecoin.
- **Minting Policy:** Zero arbitrary post-deployment minting. The fixed supply is minted once at genesis. Deflationary token burning by holders is supported via OpenZeppelin `ERC20Burnable`.

### 1.2 E-Commerce Purchase Flow
Customers acquire OXENIQ tokens through an e-commerce platform by paying in Indian Rupees (INR) and receiving on-chain token delivery to their self-custodial BEP-20 wallets.

The confirmed customer journey is:
1. **Visit:** Customer navigates to the token purchase interface on the official platform.
2. **Input:** Customer specifies the desired INR purchase amount (or desired OXENIQ quantity).
3. **Quotation & Disclosures:** The platform displays:
   - INR amount payable.
   - Applicable USD-to-INR conversion rate and quote validity countdown.
   - Token price basis.
   - Calculated OXENIQ token delivery amount.
   - Reserve allocation disclosure (explaining the 70:30 allocation).
   - Network gas fees and statutory tax/service fee disclosures.
   - Customer's verified BEP-20 destination wallet address.
4. **Payment:** Customer pays using an approved INR payment method (UPI, Net Banking, Card).
5. **Independent Verification:** The payment is independently verified server-side through cryptographically signed webhooks and gateway API polling. Frontend payment success reports are strictly untrusted.
6. **Order Fulfillment:** Upon confirmed payment and risk/compliance clearance, the backend initiates an on-chain transfer of the approved OXENIQ amount to the customer's wallet.
7. **Reserve Allocation:** The designated liquidity reserve receives its corresponding token allocation according to the approved 70:30 allocation formula.
8. **Customer Tracking:** The customer is presented with order status updates, fulfillment confirmation, and the BscScan on-chain transaction hash.

### 1.3 Minimum Purchase Requirement & Multi-Currency Architecture
- **Canonical Threshold:** Exactly **₹1,00,000 INR (one lakh Indian rupees)**.
- **Canonical Currency:** Indian Rupee (INR) is the primary base currency for order valuation.
- **Multi-Currency Ceiling Conversion:** Evaluated foreign currencies (USD, EUR, GBP) compute the minimum requirement using ceiling rounding (`Math.ceil((100,000 / rate) * 100) / 100`) such that the foreign currency payment strictly converts to $\ge$ ₹1,00,000 INR without sub-minimum leakage.
- **Dual-Layer Enforcement:** Minimum order validation is strictly enforced on both client and server before generating payment intents or signing quotes. Manipulating frontend values cannot bypass the ₹1,00,000 baseline.

### 1.4 Initial Sale Followed by DEX Trading
The project launch follows a two-stage market roll-out:
1. **Stage 1 — Initial Sale:** Tokens are distributed directly to purchasing customers at a fixed, approved initial sale price via the INR e-commerce checkout.
2. **Stage 2 — DEX Secondary Trading:** Secondary liquidity is deployed on PancakeSwap (BNB Smart Chain) pairing OXENIQ with an approved quote asset (USDT).

### 1.5 Liquidity Reserve
- An allocation of OXENIQ is accumulated in a dedicated, secure reserve to fund decentralized exchange liquidity.
- The reserve mechanism is decoupled from the base BEP-20 token contract.
- Reserve transfers require explicit, authorized administrative governance (multisig / timelock).

### 1.6 Initial Liquidity Target: $1,000,000
- The project owner has specified an initial liquidity deployment target of **$1,000,000**.
- Live pool creation is held until quote asset capital is funded and trading parameters are authorized.

### 1.7 Borrowing & Lending Feature Postponement
- The borrowing and lending feature (including any ₹200,000 borrowing workflow or Aave protocol integration) is **explicitly postponed** and excluded from Phase 12.
- No lending pools, borrowing contracts, collateral vaults, or liquidation routines shall be implemented in this phase.

---

## 2. Proposed Technical Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                         CLIENT TIER                                                |
|   Next.js 16 (App Router, TypeScript, Tailwind CSS, Lucide Icons, Viem Web3 Connectors)            |
|   +--------------------------------------------------------------------------------------------+   |
|   |  E-Commerce Token Purchase Terminal                                                        |   |
|   |  - INR Purchase Input & Live Quoting (USD/INR conversion basis, TTL countdown)             |   |
|   |  - Real-Time 70:30 Breakdown Display (Customer Allocation vs. Reserve Accumulation)       |   |
|   |  - USD 100 Minimum Enforcement Guard & Status Banners                                      |   |
|   |  - Non-Custodial BEP-20 Wallet Destination Input & Address Checksum Validator              |   |
|   |  - Order Status & On-Chain BscScan Transaction Tracker                                     |   |
|   +--------------------------------------------------------------------------------------------+   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ HTTPS / JSON API (Strictly Sanitized)
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                    BACKEND ORDER & COMMERCE TIER                                   |
|   +--------------------------+  +--------------------------+  +--------------------------------+   |
|   | Currency & Rate Oracle   |  | Order State Machine      |  | Payment Provider Adapter       |   |
|   | Service                  |  | & Idempotency Engine     |  | Interface                      |   |
|   | - USD/INR Rate Fetcher   |  | - State Transitions      |  | - Gateway-Agnostic Contract    |   |
|   | - TTL Quote Expiry (15m) |  | - Idempotency Keys       |  | - Signature Verification       |   |
|   | - $100 Min Check         |  | - Anti-Replay Nonces     |  | - Webhook Ingestion            |   |
|   +--------------------------+  +--------------------------+  +--------------------------------+   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  │ Internal Secure Job Queue / KMS
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                  BLOCKCHAIN & SETTLEMENT TIER                                      |
|                                                                                                    |
|   [ Non-Custodial Hot Fulfillment Vault ]              [ Dedicated Liquidity Reserve Vault ]       |
|   - Pre-funded from Fixed Genesis Supply               - Accumulates Reserve Share                 |
|   - Reentrant-safe token transfer                      - Governed by Gnosis Safe Multisig          |
|   - Gas-monitored & Nonce-synchronized                 - Time-locked against unauthorized drains   |
|                           │                                                 │                      |
|                           ▼                                                 ▼                      |
|   +--------------------------------------------------------------------------------------------+   |
|   | OxeniqToken.sol (BEP-20 on BSC)                                                            |   |
|   | - Total Supply: 1,000,000,000 (Fixed at Genesis)                                           |   |
|   | - Zero Transfer Tax (100% AMM / DEX Compatible)                                            |   |
|   | - OpenZeppelin v5 (Pausable Circuit Breaker, Ownable2Step Access)                           |   |
|   +--------------------------------------------------------------------------------------------+   |
+----------------------------------------------------------------------------------------------------+
```

### 2.1 Order State Machine & Idempotency Engine
To prevent duplicate token fulfillment and protect against webhook replay attacks, orders transition through strict states:

```
[CREATED] ──> [QUOTED] ──> [PAYMENT_PENDING] ──> [PAYMENT_VERIFIED] ──> [FULFILLMENT_PENDING] ──> [FULFILLED]
                                 │                       │                       │
                                 ├──> [EXPIRED]          └──> [REFUNDED]         └──> [FULFILLMENT_FAILED]
                                 └──> [CANCELLED]                                              │
                                                                                               └──> [MANUAL_REVIEW]
```

- **Idempotency Rule:** Every payment notification requires a composite unique key: `idempotencyKey = sha256(providerId + gatewayPaymentId + orderId)`.
- **Fulfillment Lock:** Tokens are delivered exactly once. If a fulfillment transaction is in-flight, subsequent webhook retries receive HTTP 200 acknowledging receipt while preventing concurrent blockchain calls.
- **Zero Frontend Trust:** Under no circumstances does the backend fulfill an order based on client-side success redirects or localStorage state.

### 2.2 Payment Gateway Adapter Architecture
A provider-independent abstraction decouples business logic from specific payment providers (e.g., Razorpay, Cashfree, Pine Labs):
```typescript
interface IPaymentGatewayAdapter {
  createPaymentOrder(order: PurchaseOrder): Promise<GatewayOrderResponse>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  fetchPaymentStatus(gatewayPaymentId: string): Promise<PaymentStatusResponse>;
  initiateRefund(gatewayPaymentId: string, amount: number, reason: string): Promise<RefundResponse>;
}
```

### 2.3 Exchange-Rate Oracle & USD Minimum Enforcement
- **Conversion Policy:**
  $$\text{Min INR Amount} = \lceil 100 \times \text{USD\_INR\_RATE} \rceil$$
- **Quote TTL:** Quotes are locked for **15 minutes**. If payment is not completed within 15 minutes, the order expires to protect against fiat volatility.
- **Stale Rate Defense:** If the rate source has not refreshed within 60 minutes, new quote creation reverts to fail-safe mode (purchases temporarily suspended).

### 2.4 The 70:30 Allocation Mathematical Models
Two candidate models are isolated and supported for evaluation:

#### Interpretation A — Reserve Receives 30% of Buyer's Allocation
- Buyer receives 100% of their base purchase calculation ($Q_{\text{buyer}}$).
- Reserve receives an additional 30% of the buyer's allocation:
  $$Q_{\text{reserve}} = \lfloor (Q_{\text{buyer}} \times 30) / 100 \rfloor$$
- Total tokens dispatched from treasury inventory:
  $$Q_{\text{total}} = Q_{\text{buyer}} + Q_{\text{reserve}} = Q_{\text{buyer}} + \lfloor (Q_{\text{buyer}} \times 30) / 100 \rfloor$$
- *Example (700 OXENIQ buyer allocation):*
  - Buyer receives: 700 OXENIQ
  - Reserve receives: 210 OXENIQ
  - Total disbursed: 910 OXENIQ

#### Interpretation B — Buyer Receives 70% of Combined Allocation
- Total tokens disbursed ($Q_{\text{total}}$) is divided such that the buyer receives 70% and the reserve receives 30%:
  $$Q_{\text{buyer}} = \lfloor (Q_{\text{total}} \times 70) / 100 \rfloor$$
  $$Q_{\text{reserve}} = Q_{\text{total}} - Q_{\text{buyer}}$$
- Expressed in terms of a requested buyer allocation ($Q_{\text{buyer}}$):
  $$Q_{\text{total}} = \lceil (Q_{\text{buyer}} \times 100) / 70 \rceil$$
  $$Q_{\text{reserve}} = Q_{\text{total}} - Q_{\text{buyer}}$$
- *Example (700 OXENIQ buyer allocation):*
  - Buyer receives: 700 OXENIQ
  - Reserve receives: 300 OXENIQ
  - Total disbursed: 1,000 OXENIQ

---

## 3. Pending Decisions (Awaiting Manager Approval)

| ID | Decision Topic | Impact | Exact Question for Project Owner | Status |
|---|---|---|---|---|
| **DEC-01** | **Total Supply Realignment** | Deployment scripts & testnet config currently use 1M provisional supply. | *Is 1,000,000,000 OXENIQ approved as the immutable total supply for all environments?* | **PENDING** |
| **DEC-03** | **70:30 Formula & Reserve Token Source** | Determines whether reserve gets 30% of buyer allocation (910 total) or buyer gets 70% of combined (1,000 total), and which treasury wallet funds it. | *Which formula (Interpretation A or B) is approved, and what is the dedicated wallet address funding the reserve?* | **PENDING** |
| **DEC-05** | **$1,000,000 Liquidity Target Scope** | Determines whether $1M represents combined pool value ($500k OXENIQ + $500k USDT) or $1M in paired USDT alone. | *Does the $1,000,000 target mean $1M total pool valuation ($500k OXENIQ + $500k USDT) or $1M of USDT quote asset deposited alongside OXENIQ?* | **PENDING** |
| **DEC-06** | **Paired Asset Funding & DEX Pool** | OXENIQ cannot form a pool alone; paired USDT or WBNB must be deposited. | *What is the approved funding source and wallet holding the paired USDT/WBNB capital for PancakeSwap liquidity?* | **PENDING** |
| **DEC-08** | **Initial Sale Price & Inventory** | Setting a purchase price without approval risks mispricing and inventory exhaustion. | *What is the approved initial sale price per OXENIQ (in USD and INR) and what token quantity is allocated to the sale inventory?* | **PENDING** |
| **DEC-13** | **INR Payment Gateway Selection** | Gateways have distinct KYC, settlement cycles, and crypto merchant restrictions. | *Which licensed Indian payment gateway (e.g. Cashfree, Razorpay, Decentro) has approved merchant onboarding for OXENIQ token purchases?* | **PENDING** |
| **DEC-14** | **USD/INR Exchange Rate Source & TTL** | Prevents arbitrage against stale forex rates. | *Which exchange rate oracle is approved for USD-to-INR conversions, and is a 15-minute quote validity window acceptable?* | **PENDING** |
| **DEC-15** | **Liquidity Reserve Custody Model** | Protects accumulated reserve tokens from single-key compromise. | *Will the liquidity reserve be held in a Gnosis Safe multisig (e.g., 3-of-5) or a programmatic Timelock contract?* | **PENDING** |

---

## 4. Future Scope (Explicitly Excluded from Phase 12)

1. **Borrowing & Lending Integration:**
   - Aave v3 or Venus collateralized borrowing protocols.
   - ₹200,000 borrowing workflow and liquidity-reserve lending pools.
   - Automated liquidation engines and interest rate models.
2. **Cross-Chain Bridging to TRON:**
   - TRC-20 token deployment on TRON TVM.
   - Omnichain bridge adapters (LayerZero OFT or Chainlink CCIP).
3. **Physical Manufacturing Utilities:**
   - Supply chain invoice verification, IoT oracle integrations, and B2B wholesale payment rails.

---

## 5. Launch Prerequisites Checklist

Before enabling live token purchases or deploying mainnet liquidity, all of the following milestones must be achieved:

- [ ] **Regulatory & Tax Review:** Formal legal opinion on Indian Virtual Digital Asset (VDA) compliance, including Section 115BBH (30% income tax), Section 194S (1% TDS withholding on transfer of VDA), and FIU-IND PMLA registration.
- [ ] **Payment Gateway Agreement:** Merchant of Record agreement signed with an approved payment aggregator supporting VDA token acquisitions.
- [ ] **Approved Pricing & Tokenomics:** Formal approval of DEC-01 (1B supply), DEC-03 (70:30 formula), DEC-08 (token price), and DEC-14 (USD/INR oracle).
- [ ] **Paired Liquidity Funding:** Capital allocation confirmed for paired USDT quote asset ($500k to $1M).
- [ ] **Multisig Governance Deployment:** Gnosis Safe deployed on BSC Mainnet with verified signers for Treasury and Liquidity Reserve.
- [ ] **Independent Security Audit:** Third-party smart contract audit report with zero unaddressed High/Critical findings.
