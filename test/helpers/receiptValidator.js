// Activate TypeScript transpiler for apps/web production modules
require("./tsLoader");

const path = require("path");
const viemPath = path.resolve(__dirname, "../../apps/web/node_modules/viem");
const { encodeEventTopics, encodeAbiParameters, parseEther } = require(viemPath);

const productionReceiptValidationPath = path.resolve(
  __dirname,
  "../../apps/web/src/lib/contracts/receiptValidation.ts"
);

// Import the actual production TypeScript event validator directly
const { validatePurchaseReceiptEvents } = require(productionReceiptValidationPath);

const TESTNET_SALE_ABI = [
  {
    type: "event",
    name: "TokensPurchased",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "bnbPaid", type: "uint256", indexed: false },
      { name: "tokensDelivered", type: "uint256", indexed: false },
    ],
  },
];

/**
 * Test fixture creating a mock raw log formatted according to the TokensPurchased ABI.
 */
function createMockPurchaseLog({
  contractAddress = "0x48c25fb4027CDeCB68bf616A4717e5692AbfbDE8",
  buyer = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E",
  recipient = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E",
  bnbPaid = parseEther("0.01"),
  tokensDelivered = parseEther("100"),
} = {}) {
  const topics = encodeEventTopics({
    abi: TESTNET_SALE_ABI,
    eventName: "TokensPurchased",
    args: { buyer, recipient },
  });
  const data = encodeAbiParameters(
    [{ type: "uint256" }, { type: "uint256" }],
    [bnbPaid, tokensDelivered]
  );
  return {
    address: contractAddress,
    topics,
    data,
  };
}

/**
 * Test fixture creating a mock raw ERC20 Transfer log.
 */
function createMockTransferLog({
  tokenAddress = "0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877",
  from = "0x48c25fb4027CDeCB68bf616A4717e5692AbfbDE8",
  to = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E",
  value = parseEther("100"),
} = {}) {
  const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const fromPadded = `0x000000000000000000000000${from.replace(/^0x/, "").toLowerCase()}`;
  const toPadded = `0x000000000000000000000000${to.replace(/^0x/, "").toLowerCase()}`;
  const data = encodeAbiParameters([{ type: "uint256" }], [value]);
  return {
    address: tokenAddress,
    topics: [transferTopic, fromPadded, toPadded],
    data,
  };
}

module.exports = {
  TESTNET_SALE_ABI,
  // Re-export production validator directly
  validatePurchaseReceiptEvents,
  createMockPurchaseLog,
  createMockTransferLog,
};
