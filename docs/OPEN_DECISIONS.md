# OXENIQ — Open Decisions Log

This document catalogues critical technical, tokenomic, and operational decisions that require formal approval from the project manager/owner before production implementation or mainnet deployment.

> **CRITICAL ARCHITECTURAL DIRECTIVE**:  
> In accordance with project instructions, safe placeholders and configurable interfaces are implemented in code. No unconfirmed assumptions or guessed answers are hardcoded into production smart contracts.

---

## Decision Tracking Table

| ID | Decision Topic | Why It Matters | Exact Question for Manager / Owner | Current Safe Implementation / Status |
|:---|:---|:---|:---|:---|
| **DEC-01** | **Total & Initial Supply Model** | Affects contract design (fixed cap vs. mintable vs. burnable), valuation calculations, and investor expectations. | *What is the maximum token supply, initial minted supply, and should minting/burning be enabled post-launch?* | **Configurable in deployment constructor**. Zero arbitrary mint functions in base contract. Provisional supply parameter set as constructor argument. |
| **DEC-02** | **Contract Immutability vs. Upgradeability** | Upgradeable contracts (UUPS/Transparent) permit future fixes but introduce governance attack vectors and centralisation risks. | *Must the OXENIQ token contract be strictly immutable (standard ERC-20/BEP-20) or upgradeable via a proxy pattern?* | **Standard immutable BEP-20 contract** with two-step ownership (`Ownable2Step`). Proxy architecture documented in `docs/ARCHITECTURE.md` if upgradeability is demanded. |
| **DEC-03** | **Meaning of the 70:30 Purchased-Token Allocation** | Dictates token flow on purchases. Does 70% go to the buyer and 30% to reserve, or does the buyer receive 100% and 70:30 refers to incoming payment proceeds? | *When a token purchase occurs, what exact quantity does the 70:30 ratio split: (A) the purchased tokens themselves between buyer and treasury/liquidity, or (B) the payment proceeds (e.g. USDT/BNB) between liquidity and operations?* | **Dedicated modular contract (`AllocationManager.sol`)** with exact integer division arithmetic (`Q * 70 / 100` and `Q - first`). Purchase fee-on-transfer is NOT embedded in base token to prevent DEX incompatibility. |
| **DEC-04** | **Allocation Beneficiary Wallets & Timing** | Affects fund security, tax accounting, and automated contract routing. | *Which specific multi-sig or cold wallet addresses will receive the 70% and 30% allocations, and must the split execute instantaneously per transaction or in periodic batches?* | **Configurable recipient addresses** via administrative setters with event emissions. Defaults to address(0) safety check preventing unauthorized execution. |
| **DEC-05** | **Initial Liquidity Budget ($1,000 Scope)** | $1,000 in a liquidity pool determines initial price and slippage sensitivity. Must know if $1,000 is base asset (e.g. $1,000 USDT) matched with tokens, or $500 token + $500 USDT ($1,000 total). | *Does the $1,000 liquidity budget represent: (A) $1,000 worth of paired quote asset (e.g. 1,000 USDT) deposited alongside OXENIQ tokens, or (B) a total pool value of $1,000 ($500 quote + $500 token)?* | **Documented in `docs/LIQUIDITY_SETUP.md`**. Safe deployment script prepared for PancakeSwap v2/v3 with configurable paired token and deposit amounts. |
| **DEC-06** | **Trading Pair & DEX Selection** | Pairing with USDT vs. WBNB affects volatility, arbitrage, and initial DEX user experience. | *Which trading pair (e.g., OXENIQ/USDT or OXENIQ/WBNB) and which DEX (e.g., PancakeSwap V2 or V3) will host the initial liquidity?* | **PancakeSwap V2 (OXENIQ/USDT)** provisioned as primary reference pair in docs and config, easily switchable via environment variables. |
| **DEC-07** | **Liquidity Ownership & Lock Period** | Unlocked LP tokens present rug-pull concerns to the community. | *Who will hold the Liquidity Provider (LP) tokens, and will they be locked in a certified locker (e.g., Team Finance, PinkSale, Uncx) for a specified vesting period?* | **Documented checklist in `docs/LIQUIDITY_SETUP.md`** recommending multi-sig ownership and automated timelock locking. |
| **DEC-08** | **Initial Quoted Token Price / Valuation** | The ratio of deposited tokens to deposited USDT sets the initial pool price. | *What is the target opening price per OXENIQ token for the initial liquidity pool (e.g., $0.01, $0.10, $1.00)?* | **Marked "Pending confirmation"** in tokenomics display. No fake initial price hardcoded in DApp. |
| **DEC-09** | **Contract Governance & Emergency Powers** | Centralized owner keys can be compromised. Best practice requires Gnosis Safe multi-sig or timelock. | *Will administrative functions (pause, allocation updates) be controlled by an EOA wallet, a multi-signature wallet (e.g., Safe with 3/5 threshold), or a TimelockController?* | **OpenZeppelin `Ownable2Step` and `Pausable`** with documented multi-sig migration path in `docs/SECURITY.md`. |
| **DEC-10** | **Cross-Chain Protocol & TRON Interoperability** | TRON is non-EVM (TVM) with different token standards (TRC-20) and messaging capabilities than BNB Smart Chain. | *Which cross-chain infrastructure will be approved for BNB <-> TRON interoperability (e.g., LayerZero v2 OFT, Axelar, Chainlink CCIP, or custom lock/mint bridge)?* | **Modular cross-chain interface**. Frontend shows honest "In Development / Planned" badge. Architectural options documented in `docs/CROSS_CHAIN.md`. |
| **DEC-11** | **Lending / Borrowing / Aave Integration** | The prompt notes Aave/lending considerations. Standard Aave pools require deep liquidity and chain support. | *Is integration with lending protocols (e.g. Venus on BSC, Aave v3) an immediate milestone, or deferred until secondary market depth is established?* | **Deferred to Phase 6+ roadmap**. No speculative lending code in base token. |
| **DEC-12** | **Manufacturing Plant Integration Model** | Real-world business utility requires clear token-gating, supply tracking, or payment rails. | *What exact on-chain role will the OXENIQ token have in the manufacturing plant (e.g. proof of invoice, B2B wholesale payment, loyalty tier discount, or IoT data verification)?* | **Presented in public roadmap as "Future Enterprise Utility"** without unverified claims of active factory integration. |

---

## Change Management Process
When a decision is approved by management:
1. Record the approval date, authorizing manager, and reference documentation.
2. Update the status in this table to `APPROVED`.
3. Apply the approved parameter to `contracts/config/tokenConfig.ts` and relevant deployment scripts.
4. Run integration tests to verify the approved behavior.
