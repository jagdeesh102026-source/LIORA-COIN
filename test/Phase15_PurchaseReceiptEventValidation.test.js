const { expect } = require("chai");
const path = require("path");
const fs = require("fs");
const {
  validatePurchaseReceiptEvents,
  createMockPurchaseLog,
  createMockTransferLog,
} = require("./helpers/receiptValidator");

const viemPath = path.resolve(__dirname, "../apps/web/node_modules/viem");
const { parseEther } = require(viemPath);

describe("Phase 15 — Purchase Receipt Event Validation (F-01 Remediation)", function () {
  const configuredSaleAddress = "0x48c25fb4027CDeCB68bf616A4717e5692AbfbDE8";
  const connectedBuyerAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";
  const intendedRecipientAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";
  const standardBnbPaidWei = parseEther("0.01"); // 10^16 wei
  const standardTokensDeliveredWei = parseEther("100"); // 100 * 10^18 wei

  const receiptValidationTsPath = path.join(
    __dirname,
    "..",
    "apps",
    "web",
    "src",
    "lib",
    "contracts",
    "receiptValidation.ts"
  );
  const purchaseTerminalPath = path.join(
    __dirname,
    "..",
    "apps",
    "web",
    "src",
    "components",
    "TestnetPurchaseTerminal.tsx"
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

  describe("1. Valid Matching Purchase Event", function () {
    it("Should validate a genuine on-chain receipt containing TokensPurchased and ERC20 Transfer logs", function () {
      const purchaseLog = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: connectedBuyerAddress,
        recipient: intendedRecipientAddress,
        bnbPaid: standardBnbPaidWei,
        tokensDelivered: standardTokensDeliveredWei,
      });

      const transferLog = createMockTransferLog({
        from: configuredSaleAddress,
        to: intendedRecipientAddress,
        value: standardTokensDeliveredWei,
      });

      const receipt = {
        status: "success",
        logs: [transferLog, purchaseLog],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.true;
      expect(result.error).to.be.undefined;
      expect(result.event).to.not.be.undefined;
      expect(result.event.buyer.toLowerCase()).to.equal(connectedBuyerAddress.toLowerCase());
      expect(result.event.recipient.toLowerCase()).to.equal(intendedRecipientAddress.toLowerCase());
      expect(result.event.bnbPaid).to.equal(standardBnbPaidWei);
      expect(result.event.tokensDelivered).to.equal(standardTokensDeliveredWei);
      expect(result.event.contractAddress.toLowerCase()).to.equal(configuredSaleAddress.toLowerCase());
    });

    it("Should handle case-insensitive address comparisons for sale, buyer, and recipient", function () {
      const purchaseLog = createMockPurchaseLog({
        contractAddress: configuredSaleAddress.toLowerCase(),
        buyer: connectedBuyerAddress,
        recipient: intendedRecipientAddress,
        bnbPaid: standardBnbPaidWei,
        tokensDelivered: standardTokensDeliveredWei,
      });

      const receipt = {
        status: "success",
        logs: [purchaseLog],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress.toLowerCase(),
        expectedBuyer: connectedBuyerAddress.toUpperCase(),
        expectedRecipient: intendedRecipientAddress.toLowerCase(),
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.true;
      expect(result.error).to.be.undefined;
    });
  });

  describe("2. Incorrect Sale Contract Address (Origin Spoofing Defense)", function () {
    it("Should reject purchase events emitted by an unauthorized contract address", function () {
      const rogueContract = "0x1111111111111111111111111111111111111111";
      const purchaseLog = createMockPurchaseLog({
        contractAddress: rogueContract,
        buyer: connectedBuyerAddress,
        recipient: intendedRecipientAddress,
        bnbPaid: standardBnbPaidWei,
        tokensDelivered: standardTokensDeliveredWei,
      });

      const receipt = {
        status: "success",
        logs: [purchaseLog],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Incorrect sale contract address");
      expect(result.error).to.include(rogueContract);
    });
  });

  describe("3. Incorrect Buyer Address", function () {
    it("Should reject purchase events where buyer does not match the connected wallet", function () {
      const mismatchedBuyer = "0x2222222222222222222222222222222222222222";
      const purchaseLog = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: mismatchedBuyer,
        recipient: intendedRecipientAddress,
        bnbPaid: standardBnbPaidWei,
        tokensDelivered: standardTokensDeliveredWei,
      });

      const receipt = {
        status: "success",
        logs: [purchaseLog],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Incorrect buyer");
      expect(result.error).to.include(connectedBuyerAddress.toLowerCase());
    });
  });

  describe("4. Incorrect Recipient Address", function () {
    it("Should reject purchase events where recipient does not match the intended destination", function () {
      const mismatchedRecipient = "0x3333333333333333333333333333333333333333";
      const purchaseLog = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: connectedBuyerAddress,
        recipient: mismatchedRecipient,
        bnbPaid: standardBnbPaidWei,
        tokensDelivered: standardTokensDeliveredWei,
      });

      const receipt = {
        status: "success",
        logs: [purchaseLog],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Incorrect recipient");
      expect(result.error).to.include(intendedRecipientAddress.toLowerCase());
    });
  });

  describe("5. Incorrect BNB Amount", function () {
    it("Should reject purchase events where bnbPaid does not equal submitted value", function () {
      const mismatchedBnbWei = parseEther("0.02"); // Sent 0.01 tBNB, event says 0.02
      const purchaseLog = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: connectedBuyerAddress,
        recipient: intendedRecipientAddress,
        bnbPaid: mismatchedBnbWei,
        tokensDelivered: standardTokensDeliveredWei,
      });

      const receipt = {
        status: "success",
        logs: [purchaseLog],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Incorrect BNB amount");
      expect(result.error).to.include(standardBnbPaidWei.toString());
    });
  });

  describe("6. Incorrect Token Delivery Amount", function () {
    it("Should reject purchase events where tokensDelivered differs from expected quantity", function () {
      const mismatchedTokensWei = parseEther("50"); // Expected 100 OXENIQ, event says 50
      const purchaseLog = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: connectedBuyerAddress,
        recipient: intendedRecipientAddress,
        bnbPaid: standardBnbPaidWei,
        tokensDelivered: mismatchedTokensWei,
      });

      const receipt = {
        status: "success",
        logs: [purchaseLog],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Incorrect token delivery amount");
      expect(result.error).to.include(standardTokensDeliveredWei.toString());
    });
  });

  describe("7. Missing Purchase Event", function () {
    it("Should reject receipts that have no logs", function () {
      const receipt = {
        status: "success",
        logs: [],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Missing purchase event");
    });

    it("Should reject receipts with other logs but no TokensPurchased event", function () {
      const transferLog = createMockTransferLog({
        from: configuredSaleAddress,
        to: intendedRecipientAddress,
        value: standardTokensDeliveredWei,
      });

      const receipt = {
        status: "success",
        logs: [transferLog],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Missing purchase event");
    });
  });

  describe("8. Duplicate Matching Purchase Events", function () {
    it("Should reject receipts containing multiple TokensPurchased events", function () {
      const log1 = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: connectedBuyerAddress,
        recipient: intendedRecipientAddress,
        bnbPaid: standardBnbPaidWei,
        tokensDelivered: standardTokensDeliveredWei,
      });
      const log2 = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: connectedBuyerAddress,
        recipient: intendedRecipientAddress,
        bnbPaid: standardBnbPaidWei,
        tokensDelivered: standardTokensDeliveredWei,
      });

      const receipt = {
        status: "success",
        logs: [log1, log2],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Duplicate matching purchase events");
      expect(result.error).to.include("Expected exactly 1 purchase event");
    });
  });

  describe("9. Reverted Transaction", function () {
    it("Should reject transactions with reverted status even if logs were attached", function () {
      const purchaseLog = createMockPurchaseLog({
        contractAddress: configuredSaleAddress,
        buyer: connectedBuyerAddress,
        recipient: intendedRecipientAddress,
        bnbPaid: standardBnbPaidWei,
        tokensDelivered: standardTokensDeliveredWei,
      });

      const receipt = {
        status: "reverted",
        logs: [purchaseLog],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Reverted transaction");
      expect(result.error).to.include('status "reverted"');
    });
  });

  describe("10. Successful Receipt with Invalid Event Data", function () {
    it("Should reject receipts with malformed log topics or data", function () {
      const corruptLog = {
        address: configuredSaleAddress,
        topics: ["0x6faf93231a456e552dbc9961f58d9713ee4f2e69d15f1975b050ef0911053a7b"], // Missing indexed topic addresses
        data: "0xdeadbeef", // Malformed data payload
      };

      const receipt = {
        status: "success",
        logs: [corruptLog],
      };

      const result = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      // Either decode error or missing event error
      expect(result.error).to.be.a("string");
      expect(result.error.length).to.be.greaterThan(0);
    });

    it("Should reject receipt when null or non-object is passed", function () {
      const result = validatePurchaseReceiptEvents({
        receipt: null,
        expectedSaleAddress: configuredSaleAddress,
        expectedBuyer: connectedBuyerAddress,
        expectedRecipient: intendedRecipientAddress,
        expectedBnbPaidWei: standardBnbPaidWei,
        expectedTokensDeliveredWei: standardTokensDeliveredWei,
      });

      expect(result.isValid).to.be.false;
      expect(result.error).to.include("Transaction receipt is missing or malformed");
    });
  });

  describe("11. Frontend Component Integration & Source Code Invariants", function () {
    it("Should verify receiptValidation.ts exists, exports validator, and uses BigInt integer arithmetic", function () {
      expect(fs.existsSync(receiptValidationTsPath)).to.be.true;
      const content = fs.readFileSync(receiptValidationTsPath, "utf8");

      expect(content).to.include("export function validatePurchaseReceiptEvents");
      expect(content).to.include("TokensPurchased");
      expect(content).to.include("parseEventLogs");
      expect(content).to.include("testnetSaleAbi");
      expect(content).to.include("bnbPaidBigInt !== expectedBnbPaidWei");
      expect(content).to.include("tokensDeliveredBigInt !== expectedTokensDeliveredWei");
      expect(content).to.not.include("parseFloat");
      expect(content).to.not.include("Number(bnbPaid)");
    });

    it("Should verify TestnetPurchaseTerminal imports and uses validatePurchaseReceiptEvents", function () {
      expect(fs.existsSync(purchaseTerminalPath)).to.be.true;
      const content = fs.readFileSync(purchaseTerminalPath, "utf8");

      expect(content).to.include("import { validatePurchaseReceiptEvents } from '../lib/contracts/receiptValidation'");
      expect(content).to.include("const validation = validatePurchaseReceiptEvents(");
      expect(content).to.include("expectedSaleAddress: BSC_TESTNET_SALE_ADDRESS");
      expect(content).to.include("expectedBuyer: address");
      expect(content).to.include("expectedRecipient: address");
      expect(content).to.include("expectedBnbPaidWei: valueWei");
      expect(content).to.include("expectedTokensDeliveredWei: calculatedTokensWei");
    });

    it("Should verify that purchase confirmed state and on-chain balance refresh only occur after validation passes", function () {
      const content = fs.readFileSync(purchaseTerminalPath, "utf8");

      expect(content).to.include("if (validation.isValid) {");
      expect(content).to.include("setTxStatus('confirmed')");
      expect(content).to.include("fetchOnChainData()");
      expect(content).to.include("setTxStatus('error')");
      expect(content).to.include("setTxError(validation.error");
    });

    it("Should verify that on validation error txHash is retained and rendered with BscScan link", function () {
      const content = fs.readFileSync(purchaseTerminalPath, "utf8");

      expect(content).to.include("Transaction Verification Error");
      expect(content).to.include("https://testnet.bscscan.com/tx/${txHash}");
      expect(content).to.include("ExternalLink");
    });

    it("Should confirm BSC Mainnet settings remain strictly untouched", function () {
      const content = fs.readFileSync(tokenConfigPath, "utf8");
      expect(content).to.include("BSC_MAINNET_TOKEN_ADDRESS: string | null = null");
      expect(content).to.include("BSC_MAINNET_ALLOCATION_MANAGER_ADDRESS: string | null = null");
    });
  });
});

