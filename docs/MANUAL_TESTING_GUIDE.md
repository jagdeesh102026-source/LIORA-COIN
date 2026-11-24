# OXENIQ — Project Owner's Manual Testing Guide

**Target Environment:** Local Windows Laptop  
**Project Path:** `D:\Projects\OXENIQ`  
**Web Application URL:** [http://localhost:3000](http://localhost:3000)  
**Current Server Status:** **ACTIVE & RESPONDING (Production Mode on Port 3000)**  

---

## 1. Current Running Status

The OXENIQ web application is **already running in the background** on your laptop:
- **Mode:** Production Mode (`next start` with pre-compiled Turbopack static pages).
- **Port:** `3000` (`http://localhost:3000`).
- **HTTP Health:** Verified responding with `HTTP 200 OK`.
- **Do NOT start a duplicate server.** If you run another server on port 3000 while this one is running, port 3000 will be busy and Next.js will automatically fall back to port 3001.

### How to Open the Website Right Now:
1. Open Google Chrome (or Edge / Brave).
2. Type or paste the following into the address bar:
   ```
   http://localhost:3000
   ```
3. Press **Enter**. The OXENIQ Home page with the glowing official emblem logo will appear immediately.

### How to Stop the Server Safely (When Finished):
If you ever want to terminate the background server from PowerShell:
```powershell
# Find and stop the Node process running on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
```
*(Leave it running for now so you can complete your manual review.)*

---

## 2. Exact PowerShell Terminal Commands

When you want to run checks or manage the application yourself, open **Windows PowerShell** and follow these exact commands.

### Command A: Starting the Website (If Server is Stopped)
Open PowerShell at `D:\Projects\OXENIQ\apps\web`:
```powershell
cd D:\Projects\OXENIQ\apps\web
npm run start
```
- **Expected Output:**
  ```
  ▲ Next.js 16.4.0
  - Local:   http://localhost:3000
  ✓ Ready in ~800ms
  ```
- **If an error occurs:** If it says `Port 3000 is in use`, another process is holding port 3000. Stop it using the command in Section 1 or visit `http://localhost:3001` if Next.js auto-switched ports.

---

### Command B: Running Smart-Contract Tests
Open PowerShell at `D:\Projects\OXENIQ` (root directory):
```powershell
cd D:\Projects\OXENIQ
npx hardhat test
```
- **What this does:** Compiles the Solidity smart contracts and runs all 60 automated unit tests (1 Billion supply verification, mint prohibition, access control, candidate 70:30 allocation math, webhook signature security, and idempotency).
- **Expected Output:**
  ```
  60 passing (4s)
  ```
- **If an error occurs:** Ensure you are in the root directory `D:\Projects\OXENIQ`, not in `apps\web`.

---

### Command C: Running Frontend Typechecks & Production Build
Open PowerShell at `D:\Projects\OXENIQ\apps\web`:
```powershell
cd D:\Projects\OXENIQ\apps\web
npm run lint
npm run build
```
- **What this does:** Runs the TypeScript type-checker (`tsc --noEmit`) and compiles the Next.js static production bundle.
- **Expected Output:**
  ```
  ✓ Compiled successfully
  ✓ Generating static pages (9/9)
  ```

---

### Command D: Restarting the Website After Code Changes
Open PowerShell at `D:\Projects\OXENIQ\apps\web`:
```powershell
cd D:\Projects\OXENIQ\apps\web
npm run build
npm run start
```
*(If you prefer hot-reloading for rapid UI tweaks, use `npm run dev` instead of `npm run start`.)*

---

## 3. Step-by-Step Manual Website Walkthrough

Follow this order to test every page on the live website.

```
1. Home (/) ──> 2. Buy OXENIQ (/buy) ──> 3. Token (/token) ──> 4. Ecosystem (/ecosystem)
                                                                       │
[7. Documentation (/docs)] <── [6. Cross-Chain (/cross-chain)] <── [5. Swap (/swap)]
```

---

### Step 1: Home Page (`http://localhost:3000/`)

#### What You Should See:
- **Header:** Official OXENIQ emblem logo (left), navigation links (`Home`, `Buy OXENIQ`, `Ecosystem`, `Tokenomics`, `DEX Swap`, `Cross-Chain`, `Documentation`), and a shiny metallic **"Connect Wallet"** button (right).
- **Hero Badge:** Target Network: **BNB Smart Chain (BEP-20)** with a pulsing blue indicator.
- **Hero Medallion:** The official, high-resolution OXENIQ 3D medallion logo centered with ambient blue glow.
- **Tagline:** `POWERING THE NEXT DIGITAL ERA`.
- **Value Pillars:** `SECURE`, `DECENTRALIZED`, `FAST`, `SCALABLE`, `GLOBAL`.
- **Pillars Grid:** 4 feature cards detailing Institutional Architecture, 70:30 Decoupled Allocation, PancakeSwap DEX Liquidity, and Enterprise Roadmap.
- **Footer:** Brand description, ecosystem navigation links, and legal risk disclosures.

#### Actions to Try:
1. Hover your cursor over the central medallion logo. It should smoothly scale up slightly.
2. Click the **"Connect Wallet"** button in the header. (See Section 5 for wallet testing).
3. Click the **"Buy OXENIQ"** button or link in the top navigation bar.

#### What Indicates a Bug:
- The page renders completely blank or throws an unhandled React error.
- The logo appears broken or distorted.
- Navigation links do not change the URL or produce 404 errors.

---

### Step 2: Buy OXENIQ (`http://localhost:3000/buy`)

*This is the core e-commerce purchase terminal engineered in Phase 12.*

#### What You Should See:
- **Status Banner:** A prominent amber warning box stating:
  > **"Checkout Gateway Staged — Purchases Temporarily Inactive"**  
  > Explaining that live payments and token disbursements are safely disabled pending payment gateway licensing, token price confirmation, and regulatory VDA compliance.
- **Order Configuration Card (Left Column):**
  - INR purchase input with currency symbol (`₹`).
  - Minimum requirement note: `Min: ₹8,450 ($100 USD)`.
  - 4 quick-select chips: `₹8,500 (Min)`, `₹25,000`, `₹50,000`, `₹100,000`.
  - Destination Wallet input field for BNB Smart Chain (BEP-20).
  - Exchange basis bar: Reference rate `1 USD = ₹84.50`, provisional price `$0.10 USD`, quote validity `15 Minutes (Staged)`.
  - Action Button: **"Checkout Staged — Live Purchases Disabled"** (permanently locked).
- **Order Summary Card (Right Column):**
  - Amount Payable (INR), USD Equivalent, Network Gas Fee (Sponsored), Statutory Tax note.
  - **Token Allocation Breakdown:**
    - Customer Delivery: `100% of purchase` (e.g., 1,005.91 OXENIQ for ₹8,500).
    - Protocol Liquidity Reserve: `+301.77 OXENIQ` (highlighted in gold with a clear explanation that this builds depth for secondary DEX trading).

*(See Section 4 below for the exhaustive test script for this page.)*

---

### Step 3: Tokenomics & Specifications (`http://localhost:3000/token`)

#### What You Should See:
- **Primary Metrics Grid:** 4 cards showing:
  - Token Name: `OXENIQ`
  - Ticker Symbol: `OXENIQ` (BEP-20 Standard)
  - Precision Decimals: `18 Decimals`
  - Transfer Tax: `0% Tax-Free` (100% AMM / DEX Compatible)
- **Network & Verification Section:**
  - BNB Smart Chain Mainnet (Chain ID 56) — Genesis Launch Staged. Link to BscScan.
  - BNB Smart Chain Testnet (Chain ID 97) — Deployment Staged. Link to Testnet BscScan.
- **Token Features Grid:** Deflationary Burn mechanism, Pausable Circuit Breaker, Ownable2Step security, and Decoupled Allocation architecture.

#### Actions to Try:
- Click the BscScan external link icons. They should open official BscScan explorer tabs in your browser.

---

### Step 4: Ecosystem Component Registry (`http://localhost:3000/ecosystem`)

#### What You Should See:
- A modular architecture grid containing ecosystem components:
  - `OxeniqToken.sol` (Token, BSC Mainnet)
  - `AllocationManager.sol` (Utility, BSC Mainnet)
  - `PancakeSwap V2 Pool` (Liquidity, BSC Mainnet)
  - `Omnichain Bridge Adapter` (Cross-Chain, BSC <-> TRON)
  - `Gnosis Safe Multi-Sig` (Governance, BSC Mainnet)
- **Category Filter Tabs:** `All`, `Token`, `Liquidity`, `Cross-Chain`, `Governance`, `Utility`.
- **Warning Box:** Future Enterprise & Manufacturing Integration Note explaining that physical factory integration is a planned roadmap goal without unverified operational claims.

#### Actions to Try:
- Click the filter tabs (`Token`, `Liquidity`, `Cross-Chain`). The grid should instantly filter to display only the matching components. Click `All` to restore the full view.

---

### Step 5: DEX Swap Terminal (`http://localhost:3000/swap`)

#### What You Should See:
- A decentralized exchange interface styled like PancakeSwap / Uniswap.
- **Amber Warning Box:** Stating that the initial $1,000,000 liquidity pool on PancakeSwap is staged and live swap execution is safely disabled until liquidity is funded.
- **Pay Input:** Defaults to BNB with balance detection.
- **Receive Input:** Output token with official OXENIQ emblem logo.
- **Swap Action Button:** Displays **"Connect Wallet to Swap"** or disabled state.

#### Actions to Try:
1. Type `1` in the Pay input. The Receive input should estimate output based on provisional reference pricing.
2. Confirm that clicking the button **does not** execute an on-chain swap or initiate unauthorized transactions.

---

### Step 6: Cross-Chain Expansion (`http://localhost:3000/cross-chain`)

#### What You Should See:
- Cross-Chain Architecture overview detailing the planned interoperability between **BNB Smart Chain (BEP-20)** and **TRON Network (TRC-20)**.
- Visual diagram showing standard locking/burning and relayer messaging.
- Status Badges: Marked honestly as **"Planned"** and **"In Development"**. Zero fake claims of an active TRON bridge.

---

### Step 7: Documentation & Whitepaper (`http://localhost:3000/docs`)

#### What You Should See:
- An interactive, tabbed technical documentation viewer with 4 sections:
  1. **Whitepaper Overview:** Vision, economic model, market positioning.
  2. **Smart Contract Specs:** Technical breakdown of `OxeniqToken.sol` and `AllocationManager.sol`.
  3. **Security Disclosures:** Threat mitigations, non-custodial rules, multi-sig governance.
  4. **Developer Guide:** Local setup, Hardhat commands, deployment verification.

#### Actions to Try:
- Click through all 4 navigation tabs. The content should switch instantly without page reloads.

---

## 4. Deep-Dive Testing Guide: Buy OXENIQ (`/buy`)

Test the purchase calculator edge-cases using this exact sequence:

```
[Test 1: Amount Below Min] ──> [Test 2: Amount Meeting Min] ──> [Test 3: Quick Chips]
                                                                        │
[Test 6: Live Checkout Locked] <── [Test 5: Valid BSC Address] <── [Test 4: Invalid Address]
```

### Test 4.1: Enter an Amount Below the Minimum
1. In the **"Enter Purchase Amount (INR)"** box, backspace the current value and type `1000`.
2. **Expected Behavior:** Immediately below the input, a red error appears:
   ```
   Order amount (₹1,000) is below the required minimum of ₹8,450 ($100 USD equivalent).
   ```
3. The right-hand summary resets calculated tokens to `0 OXENIQ`.
4. **Status:** **PASS**

### Test 4.2: Enter an Amount Meeting the Minimum
1. Clear the box and type `8500`.
2. **Expected Behavior:** The red error disappears completely.
3. The summary updates live:
   - USD Equivalent: `$100.59 USD`
   - Customer Delivery: `~1,005.91 OXENIQ`
   - Protocol Liquidity Reserve: `+301.77 OXENIQ`
4. **Status:** **PASS**

### Test 4.3: Try the Quick-Select Chips
1. Click the **`₹25,000`** button.
   - Input updates to `25000`.
   - Summary updates to `$295.86 USD`, delivering `~2,958.57 OXENIQ` to customer and `+887.57 OXENIQ` to reserve.
2. Click the **`₹50,000`** and **`₹100,000`** buttons.
   - Values scale up with exact proportional arithmetic.
3. Click the **`₹8,500 (Min)`** chip to return to the minimum order baseline.
4. **Status:** **PASS**

### Test 4.4: Enter an Invalid Wallet Address
1. If the input says "Use connected wallet", click **"Enter different address"**.
2. Type an invalid address such as `0x123` or `mywallet`.
3. **Expected Behavior:** A red alert message appears below the address box:
   ```
   Please enter a valid 42-character BSC address starting with 0x.
   ```
4. On the right-hand summary, the Delivery Destination indicates `Enter valid address above`.
5. **Status:** **PASS**

### Test 4.5: Enter a Valid-Format BSC Address
1. Clear the address box and copy-paste this valid BSC address format:
   ```
   0x1111111111111111111111111111111111111111
   ```
2. **Expected Behavior:** The red error disappears, and a green confirmation message appears:
   ```
   ✓ Valid BEP-20 address format.
   ```
3. The right-hand summary updates the Delivery Destination to show the exact address.
4. *Important Security Note:* Address format validation confirms that the string is a valid 42-character hexadecimal EVM address. It does not verify that the address has been initialized on-chain or belongs to the customer.
5. **Status:** **PASS**

### Test 4.6: Verify Live Checkout Button is Disabled
1. Look at the primary action button at the bottom of the purchase card.
2. **Expected Behavior:**
   - The button is styled in dark slate gray with a lock icon.
   - The button text reads: **"Checkout Staged — Live Purchases Disabled"**.
   - Hovering or clicking on the button does nothing (cursor is `not-allowed`).
   - Zero real-world INR charges, payment gateway popups, or blockchain transfers occur.
3. **Status:** **PASS**

> **PROVISIONAL RATE DISCLOSURE**:  
> The exchange rate of ₹84.50/USD and the minimum threshold of ₹8,450 are staged development reference parameters. In production, this threshold will be derived dynamically from an authorized forex oracle (FBIL / RBI reference rate) with a 15-minute quote TTL.

---

## 5. Wallet Connectivity Testing Guide

### Scenario A: Testing Without an EVM Wallet Installed (or in Incognito)
1. Open Chrome in **Incognito mode** (where MetaMask / Rabby extensions are disabled).
2. Visit `http://localhost:3000`.
3. Click **"Connect Wallet"** in the top-right header.
4. The dark modal **"Connect Web3 Wallet"** appears with an amber fox icon and a "Browser Wallet" option.
5. Click **"Browser Wallet"**.
6. **Expected Behavior:**
   - The modal **remains open**.
   - A red error box appears inside the modal stating:
     ```
     No Web3 wallet detected. Please install MetaMask, Trust Wallet, or Rabby.
     ```
   - No crashes, unhandled errors, or page redirects occur.
7. Click the **X** button or click on the dark backdrop outside the modal.
8. The modal closes cleanly, and the error state is cleared.

### Scenario B: Testing With MetaMask / Rabby Installed
1. Open the website in your standard browser where your wallet extension is active.
2. Click **"Connect Wallet"** -> Click **"Browser Wallet"**.
3. Your wallet popup will ask you to select an account and approve connection to `localhost:3000`.
4. **If you click "Cancel" / Reject:**
   - The modal stays open and displays: `"Wallet connection was rejected."`
5. **If you approve connection:**
   - The modal closes automatically.
   - The header displays your truncated address (e.g., `0x1234...5678`) with a copy button.
   - If your wallet is connected to Ethereum or Polygon instead of BNB Smart Chain, an amber badge appears: `Chain #1 (Wrong Network)` alongside a metallic **"Switch to BSC"** button.
   - Clicking **"Switch to BSC"** triggers your wallet to switch to BNB Smart Chain Testnet (Chain ID 97) automatically.
6. **Security Invariant:** OXENIQ will **never** ask for your seed phrase, private key, or password. No transaction signatures or gas fees will ever be requested while browsing.

---

## 6. Honest Status of Non-Live Features

To ensure complete transparency, here is the exact classification of every feature in the repository:

| Feature | Operational Classification | What It Means |
|---|---|---|
| **BEP-20 Token (`OxeniqToken.sol`)** | **WORKING LOCALLY** | Verified in Hardhat with 1 Billion supply, burning, pause, and Ownable2Step. Not yet deployed to public testnet or mainnet. |
| **Allocation Manager (`AllocationManager.sol`)** | **WORKING LOCALLY** | Decoupled 70:30 integer split arithmetic verified in unit tests. |
| **Purchase Calculator (`/buy`)** | **WORKING LOCALLY** | Calculates token distributions and validates inputs in browser. |
| **INR Checkout Execution** | **DISABLED PENDING APPROVAL** | Payment gateway integration is a provider-independent skeleton. Live payment processing is intentionally disabled. |
| **DEX Swap Estimation (`/swap`)** | **SIMULATED** | Previews token conversion based on provisional ratios. Does not execute real swaps. |
| **DEX Liquidity Pool** | **DISABLED PENDING APPROVAL** | PancakeSwap liquidity requires paired USDT capital ($500k to $1M). No real funds have been deposited. |
| **Cross-Chain Bridge (`/cross-chain`)** | **NOT IMPLEMENTED (PLANNED)** | Educational architecture and roadmap display. Live TRON bridge contracts are deferred to Phase 14+. |
| **Borrowing & Lending** | **NOT IMPLEMENTED (POSTPONED)**| Strictly postponed from Phase 12. No lending pools or borrowing functions exist in the repository. |

---

## 7. Issue Reporting Template

If you encounter any unexpected behavior, copy and paste this compact template into your reply:

```markdown
### OXENIQ Manual Test Report
- **Page or Feature Tested:** [e.g. Buy Page / Wallet Modal / Header]
- **Steps Followed:** [e.g. 1. Opened /buy, 2. Entered 5000, 3. Observed error]
- **What I Expected:** [e.g. Error message indicating amount is below minimum]
- **What Actually Happened:** [e.g. Error message appeared as expected]
- **Error Message or Browser Console Output (if any):** [None / text of error]
- **Result:** [PASS / FAIL / BLOCKED]
```
