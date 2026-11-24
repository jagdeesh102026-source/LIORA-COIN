const { expect } = require("chai");
const { ethers } = require("hardhat");
const path = require("path");
const fs = require("fs");
const {
  parseBnbInput,
  computePurchaseButtonState,
} = require("./helpers/terminalStateHelper");
const {
  validatePurchaseReceiptEvents,
  createMockPurchaseLog,
  createMockTransferLog,
} = require("./helpers/receiptValidator");

const viemPath = path.resolve(__dirname, "../apps/web/node_modules/viem");
const { parseEther } = require(viemPath);

describe("Phase 16 — Comprehensive Testnet Edge-Case Testing", function () {
  const configuredSaleAddress = "0x48c25fb4027CDeCB68bf616A4717e5692AbfbDE8";
  const connectedBuyerAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";
  const intendedRecipientAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";

  const purchaseTerminalPath = path.join(
    __dirname,
    "..",
    "apps",
    "web",
    "src",
    "components",
    "TestnetPurchaseTerminal.tsx"
  );
  const web3ContextPath = path.join(
    __dirname,
    "..",
    "apps",
    "web",
    "src",
    "context",
    "Web3WalletContext.tsx"
  );
  const clientPath = path.join(
    __dirname,
    "..",
    "apps",
    "web",
    "src",
    "lib",
    "contracts",
    "client.ts"
  );
  const tokenConfigPath = path.join(
    __dirname,
    "..",
    "apps",
    "web",
    "src",
    "config",
    "tokenConfig.ts"
  );

  // =========================================================================
  // 1. INPUT VALIDATION SCENARIOS
  // =========================================================================
  describe("1. Input Validation Edge Cases", function () {
    it("Should reject empty or whitespace input and disable checkout", function () {
      const emptyRes = parseBnbInput("");
      expect(emptyRes.isBnbValid).to.be.false;
      expect(emptyRes.bnbWei).to.equal(0n);
      expect(emptyRes.parseError).to.be.null;

      const spaceRes = parseBnbInput("    ");
      expect(spaceRes.isBnbValid).to.be.false;
      expect(spaceRes.bnbWei).to.equal(0n);

      const btn = computePurchaseButtonState({
        isBnbValid: emptyRes.isBnbValid,
        bnbWei: emptyRes.bnbWei,
      });
      expect(btn.disabled).to.be.true;
      expect(btn.label).to.equal("Enter a Valid tBNB Amount");
    });

    it("Should reject zero payment amount ('0', '0.0', '0.000000000000000000')", function () {
      const zeroVariants = ["0", "0.0", "0.00", "0.000000000000000000"];
      for (const val of zeroVariants) {
        const res = parseBnbInput(val);
        expect(res.isBnbValid).to.be.false;
        expect(res.bnbWei).to.equal(0n);

        const btn = computePurchaseButtonState({
          isBnbValid: res.isBnbValid,
          bnbWei: res.bnbWei,
        });
        expect(btn.disabled).to.be.true;
        expect(btn.label).to.equal("Enter a Valid tBNB Amount");
      }
    });

    it("Should reject negative amounts ('-1', '-0.01', '-0.00000001')", function () {
      const negativeVariants = ["-1", "-0.01", "-0.00000001", "-100"];
      for (const val of negativeVariants) {
        const res = parseBnbInput(val);
        expect(res.isBnbValid).to.be.false;
        expect(res.bnbWei).to.equal(0n);

        const btn = computePurchaseButtonState({
          isBnbValid: res.isBnbValid,
          bnbWei: res.bnbWei,
        });
        expect(btn.disabled).to.be.true;
        expect(btn.label).to.equal("Enter a Valid tBNB Amount");
      }
    });

    it("Should reject invalid and malformed numeric strings ('abc', '1.2.3', 'NaN', '0x12', 'e10')", function () {
      const malformed = ["abc", "1.2.3", "NaN", "0x12", "e10", "--0.01", "1e-5"];
      for (const val of malformed) {
        const res = parseBnbInput(val);
        expect(res.isBnbValid).to.be.false;

        const btn = computePurchaseButtonState({
          isBnbValid: res.isBnbValid,
          bnbWei: res.bnbWei,
          parseError: res.parseError,
        });
        expect(btn.disabled).to.be.true;
      }
    });

    it("Should reject excessive decimal places (<1 wei or malformed decimals) and disable checkout", function () {
      // 1. Sub-wei fractional input (19 decimal places) rounds down to 0 wei and is blocked
      const nineteenDecimals = "0.0000000000000000001"; // 10^-19 BNB (< 1 wei)
      const resSubWei = parseBnbInput(nineteenDecimals);
      expect(resSubWei.isBnbValid).to.be.false;
      expect(resSubWei.bnbWei).to.equal(0n);

      const btnSubWei = computePurchaseButtonState({
        isBnbValid: resSubWei.isBnbValid,
        bnbWei: resSubWei.bnbWei,
      });
      expect(btnSubWei.disabled).to.be.true;
      expect(btnSubWei.label).to.equal("Enter a Valid tBNB Amount");

      // 2. Scientific notation numbers (e.g. "1e-5", "1e-8") pass Number() check but throw in parseEther
      const scientificNotation = "1e-5";
      const resScientific = parseBnbInput(scientificNotation);
      expect(resScientific.isBnbValid).to.be.false;
      expect(resScientific.parseError).to.equal("Invalid BNB amount format");

      const btnScientific = computePurchaseButtonState({
        isBnbValid: resScientific.isBnbValid,
        bnbWei: resScientific.bnbWei,
        parseError: resScientific.parseError,
      });
      expect(btnScientific.disabled).to.be.true;
      expect(btnScientific.label).to.equal("Invalid BNB amount format");
    });

    it("Should safely handle extremely large amounts without overflow and enforce inventory bounds", function () {
      // 1 Billion tBNB = 10 Trillion OXENIQ
      const hugeInput = "1000000000";
      const res = parseBnbInput(hugeInput);
      expect(res.isBnbValid).to.be.true;
      expect(res.bnbWei).to.equal(1000000000n * (10n ** 18n));
      expect(res.calculatedTokensWei).to.equal(10000000000000n * (10n ** 18n));

      // With standard testnet inventory (e.g. 1000 OXENIQ), button must be disabled
      const btn = computePurchaseButtonState({
        isBnbValid: res.isBnbValid,
        bnbWei: res.bnbWei,
        calculatedTokensWei: res.calculatedTokensWei,
        availableInventory: parseEther("1000"),
        userBnbBalance: "2000000000",
      });
      expect(btn.disabled).to.be.true;
      expect(btn.label).to.equal("Exceeds Available Test Inventory");
    });

    it("Should block purchase when buyer balance is insufficient", function () {
      const parsed = parseBnbInput("0.05"); // Requires 0.05 tBNB
      const btn = computePurchaseButtonState({
        isBnbValid: parsed.isBnbValid,
        bnbWei: parsed.bnbWei,
        calculatedTokensWei: parsed.calculatedTokensWei,
        userBnbBalance: "0.02", // Buyer has only 0.02 tBNB
        availableInventory: parseEther("1000"),
      });

      expect(btn.disabled).to.be.true;
      expect(btn.label).to.equal("Insufficient tBNB Balance");
    });

    it("Should pass balance check when buyer has exact balance", function () {
      const parsed = parseBnbInput("0.01");
      const btn = computePurchaseButtonState({
        isBnbValid: parsed.isBnbValid,
        bnbWei: parsed.bnbWei,
        calculatedTokensWei: parsed.calculatedTokensWei,
        userBnbBalance: "0.01", // Exact balance
        availableInventory: parseEther("1000"),
      });

      expect(btn.disabled).to.be.false;
      expect(btn.label).to.include("Purchase with Test BNB");
    });

    it("Should block purchase when requested tokens exceed available sale inventory", function () {
      const parsed = parseBnbInput("0.1"); // Requires 1,000 OXENIQ
      const btn = computePurchaseButtonState({
        isBnbValid: parsed.isBnbValid,
        bnbWei: parsed.bnbWei,
        calculatedTokensWei: parsed.calculatedTokensWei,
        availableInventory: parseEther("697.9"), // Only 697.9 OXENIQ available
        userBnbBalance: "1.0",
      });

      expect(btn.disabled).to.be.true;
      expect(btn.label).to.equal("Exceeds Available Test Inventory");
    });

    it("Should pass inventory check when purchase exactly equals available inventory", function () {
      const parsed = parseBnbInput("0.01"); // Requires 100 OXENIQ
      const btn = computePurchaseButtonState({
        isBnbValid: parsed.isBnbValid,
        bnbWei: parsed.bnbWei,
        calculatedTokensWei: parsed.calculatedTokensWei,
        availableInventory: parseEther("100"), // Exactly 100 OXENIQ available
        userBnbBalance: "1.0",
      });

      expect(btn.disabled).to.be.false;
    });
  });

  // =========================================================================
  // 2. SALE CONTRACT CONDITIONS
  // =========================================================================
  describe("2. Sale Contract Conditions", function () {
    it("Should disable checkout when sale contract is paused (circuit breaker)", function () {
      const parsed = parseBnbInput("0.01");
      const btn = computePurchaseButtonState({
        isBnbValid: parsed.isBnbValid,
        bnbWei: parsed.bnbWei,
        calculatedTokensWei: parsed.calculatedTokensWei,
        isContractPaused: true,
      });

      expect(btn.disabled).to.be.true;
      expect(btn.label).to.equal("Sale Contract Paused (Circuit Breaker)");
    });

    it("Should disable checkout when sale inventory is completely exhausted (0 available)", function () {
      const parsed = parseBnbInput("0.01");
      const btn = computePurchaseButtonState({
        isBnbValid: parsed.isBnbValid,
        bnbWei: parsed.bnbWei,
        calculatedTokensWei: parsed.calculatedTokensWei,
        availableInventory: 0n,
      });

      expect(btn.disabled).to.be.true;
      expect(btn.label).to.equal("Test Inventory Exhausted (Awaiting Funding)");
    });

    it("Should support dynamic or non-standard on-chain sale rates correctly", function () {
      // If contract reports 5,000 tokens per BNB instead of default 10,000
      const parsed5000 = parseBnbInput("0.01", 5000);
      expect(parsed5000.calculatedTokensWei).to.equal(parseEther("50"));

      // If contract reports 20,000 tokens per BNB
      const parsed20000 = parseBnbInput("0.01", 20000);
      expect(parsed20000.calculatedTokensWei).to.equal(parseEther("200"));
    });

    it("Should lock checkout when sale contract address is not configured or staging", function () {
      const parsed = parseBnbInput("0.01");
      const btn = computePurchaseButtonState({
        isSaleConfigured: false,
        isBnbValid: parsed.isBnbValid,
        bnbWei: parsed.bnbWei,
      });

      expect(btn.disabled).to.be.true;
      expect(btn.label).to.equal("Checkout Staged — Awaiting Sale Deployment");
    });

    it("Should verify terminal handles RPC contract read failure with user-visible retry notice", function () {
      const terminalContent = fs.readFileSync(purchaseTerminalPath, "utf8");
      expect(terminalContent).to.include("Unable to load live contract data from BSC Testnet RPC");
      expect(terminalContent).to.include("setRpcError");
      expect(terminalContent).to.include("Retry");
    });
  });

  // =========================================================================
  // 3. WALLET AND NETWORK CONDITIONS
  // =========================================================================
  describe("3. Wallet and Network Conditions", function () {
    it("Should prompt wallet connection when user wallet is disconnected", function () {
      const btn = computePurchaseButtonState({
        isConnected: false,
      });

      expect(btn.disabled).to.be.false;
      expect(btn.label).to.equal("Connect Testnet Wallet");
      expect(btn.action).to.equal("connect");
    });

    it("Should handle user rejection of wallet connection request (EIP-1193 code 4001)", function () {
      const web3Content = fs.readFileSync(web3ContextPath, "utf8");
      expect(web3Content).to.include("err?.code === 4001");
      expect(web3Content).to.include("Connection request was cancelled in your wallet.");
    });

    it("Should prompt network switch when connected to unsupported chain (e.g. Ethereum #1, Polygon #137)", function () {
      const btn = computePurchaseButtonState({
        isConnected: true,
        isBscTestnet: false, // On Ethereum #1 or Polygon #137
      });

      expect(btn.disabled).to.be.false;
      expect(btn.label).to.equal("Switch to BSC Testnet (Chain #97)");
      expect(btn.action).to.equal("switchToBscTestnet");
    });

    it("Should block purchases and prompt switch to testnet when BSC Mainnet (Chain #56) is selected", function () {
      const btn = computePurchaseButtonState({
        isConnected: true,
        isBscTestnet: false,
      });

      expect(btn.disabled).to.be.false;
      expect(btn.label).to.equal("Switch to BSC Testnet (Chain #97)");

      const tokenConfigContent = fs.readFileSync(tokenConfigPath, "utf8");
      expect(tokenConfigContent).to.include("BSC_MAINNET_TOKEN_ADDRESS: string | null = null");
      expect(tokenConfigContent).to.include("BSC_MAINNET_ALLOCATION_MANAGER_ADDRESS: string | null = null");
    });

    it("Should handle user rejection of network switch request", function () {
      const web3Content = fs.readFileSync(web3ContextPath, "utf8");
      expect(web3Content).to.include("Network switch was cancelled in your wallet.");
    });

    it("Should automatically add BSC Testnet when wallet returns chain missing error (4902)", function () {
      const web3Content = fs.readFileSync(web3ContextPath, "utf8");
      expect(web3Content).to.include("4902");
      expect(web3Content).to.include("wallet_addEthereumChain");
      expect(web3Content).to.include("0x61"); // 97 in hex
      expect(web3Content).to.include("https://data-seed-prebsc-1-s1.bnbchain.org:8545");
      expect(web3Content).to.include("https://testnet.bscscan.com");
    });

    it("Should handle user rejection of transaction signature in wallet (code 4001 / cancelled)", function () {
      const terminalContent = fs.readFileSync(purchaseTerminalPath, "utf8");
      expect(terminalContent).to.include("err?.code === 4001");
      expect(terminalContent).to.include("Purchase transaction was cancelled in your wallet.");
    });

    it("Should handle missing or unavailable browser wallet provider gracefully", function () {
      const terminalContent = fs.readFileSync(purchaseTerminalPath, "utf8");
      expect(terminalContent).to.include("No compatible browser wallet found.");

      const web3Content = fs.readFileSync(web3ContextPath, "utf8");
      expect(web3Content).to.include("No compatible Web3 wallet detected");
    });
  });

  // =========================================================================
  // 4. TRANSACTION AND RPC CONDITIONS
  // =========================================================================
  describe("4. Transaction and RPC Conditions", function () {
    it("Should maintain awaiting wallet approval state and disable duplicate clicks", function () {
      const btn = computePurchaseButtonState({
        txStatus: "broadcasting",
      });

      expect(btn.disabled).to.be.true;
      expect(btn.label).to.equal("Awaiting Wallet Approval...");
      expect(btn.action).to.equal("none");
    });

    it("Should maintain on-chain confirming state and block duplicate submissions", function () {
      const btn = computePurchaseButtonState({
        txStatus: "confirming",
      });

      expect(btn.disabled).to.be.true;
      expect(btn.label).to.equal("Confirming On-Chain...");
      expect(btn.action).to.equal("none");
    });

    it("Should reject transaction receipts reporting on-chain failure (reverted status)", function () {
      const receipt = {
        status: "reverted",
        logs: [],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: parseEther("0.01"),
        expectedTokensDeliveredWei: parseEther("100"),
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Reverted transaction");
      expect(result.error).to.include("No tokens were delivered");
    });

    it("Should reject transaction receipts missing event logs", function () {
      const receipt = {
        status: "success",
        logs: [],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: parseEther("0.01"),
        expectedTokensDeliveredWei: parseEther("100"),
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Missing purchase event");
    });

    it("Should reject mismatched TokensPurchased event (buyer, recipient, payment, or delivery discrepancy)", function () {
      // Buyer mismatch
      const wrongBuyerLog = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: "0x1111111111111111111111111111111111111111",
        recipient: intendedRecipientAddress,
        bnbPaid: parseEther("0.01"),
        tokensDelivered: parseEther("100"),
      });

      const result1 = validatePurchaseReceiptEvents({
        receipt: { status: "success", logs: [wrongBuyerLog] },
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: parseEther("0.01"),
        expectedTokensDeliveredWei: parseEther("100"),
      });
      expect(result1.isValid).to.be.false;
      expect(result1.error).to.include("Incorrect buyer");

      // Payment mismatch
      const wrongBnbLog = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: connectedBuyerAddress,
        recipient: intendedRecipientAddress,
        bnbPaid: parseEther("0.005"), // Expected 0.01
        tokensDelivered: parseEther("100"),
      });

      const result2 = validatePurchaseReceiptEvents({
        receipt: { status: "success", logs: [wrongBnbLog] },
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: parseEther("0.01"),
        expectedTokensDeliveredWei: parseEther("100"),
      });
      expect(result2.isValid).to.be.false;
      expect(result2.error).to.include("Incorrect BNB amount");
    });

    it("Should configure 60-second confirmation timeout in public client transaction receipt query", function () {
      const terminalContent = fs.readFileSync(purchaseTerminalPath, "utf8");
      expect(terminalContent).to.include("waitForTransactionReceipt");
      expect(terminalContent).to.include("timeout: 60_000");
    });

    // =======================================================================
    // 5. HARDHAT BLOCKCHAIN TEST: MID-FLIGHT INVENTORY DEPLETION
    // =======================================================================
    it("Should revert and prevent delivery when inventory is depleted between quote and transaction execution", async function () {
      const [deployer, buyer1, buyer2] = await ethers.getSigners();

      // 1. Deploy OxeniqToken
      const OxeniqToken = await ethers.getContractFactory("OxeniqToken");
      const initialSupply = ethers.parseEther("1000000");
      const token = await OxeniqToken.deploy("OXENIQ", "OXENIQ", initialSupply, deployer.address);
      await token.waitForDeployment();
      const tokenAddress = await token.getAddress();

      // 2. Deploy TestnetTokenSale on local devnet (chainid 31337 is permitted)
      const TestnetTokenSale = await ethers.getContractFactory("TestnetTokenSale");
      const sale = await TestnetTokenSale.deploy(tokenAddress, deployer.address);
      await sale.waitForDeployment();
      const saleAddress = await sale.getAddress();

      // 3. Fund sale contract with exactly 100 OXENIQ
      const initialInventory = ethers.parseEther("100");
      await token.transfer(saleAddress, initialInventory);
      expect(await sale.getAvailableInventory()).to.equal(initialInventory);

      // 4. Buyer 1 computes quote for 100 OXENIQ (0.01 BNB)
      const bnbPayment = ethers.parseEther("0.01");
      const expectedDelivery = ethers.parseEther("100");
      expect(await sale.calculateTokenAmount(bnbPayment)).to.equal(expectedDelivery);

      // 5. CONCURRENCY EVENT: Before Buyer 1's transaction executes, Buyer 2 purchases 50 OXENIQ (0.005 BNB)
      const buyer2Payment = ethers.parseEther("0.005");
      await sale.connect(buyer2).buyTokens(buyer2.address, { value: buyer2Payment });

      // Inventory is now reduced to 50 OXENIQ
      const remainingInventory = await sale.getAvailableInventory();
      expect(remainingInventory).to.equal(ethers.parseEther("50"));

      // 6. Buyer 1's transaction now executes: contract MUST revert with InsufficientInventory
      await expect(
        sale.connect(buyer1).buyTokens(buyer1.address, { value: bnbPayment })
      ).to.be.revertedWithCustomError(sale, "InsufficientInventory")
        .withArgs(ethers.parseEther("50"), expectedDelivery);

      // Verify Buyer 1 received 0 tokens and sale inventory remained safe at 50 OXENIQ
      expect(await token.balanceOf(buyer1.address)).to.equal(0n);
      expect(await sale.getAvailableInventory()).to.equal(ethers.parseEther("50"));

      // 7. Test terminal receipt validator with the reverted transaction scenario
      const revertedReceipt = {
        status: "reverted",
        logs: [],
      };
      const validation = validatePurchaseReceiptEvents({
        receipt: revertedReceipt,
        expectedSaleAddress: saleAddress,
        expectedBuyer: buyer1.address,
        expectedRecipient: buyer1.address,
        expectedBnbPaidWei: bnbPayment,
        expectedTokensDeliveredWei: expectedDelivery,
      });

      expect(validation.isValid).to.be.false;
      expect(validation.error).to.include("Reverted transaction");
    });
  });
});

