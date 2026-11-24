// Activate TypeScript transpiler for apps/web production modules
require("./tsLoader");

const path = require("path");
const viemPath = path.resolve(__dirname, "../../apps/web/node_modules/viem");
const { parseEther } = require(viemPath);

const productionPurchaseLogicPath = path.resolve(
  __dirname,
  "../../apps/web/src/lib/purchase/purchaseLogic.ts"
);

// Import the actual production TypeScript implementation
const {
  parseBnbInput,
  validateBnbBalance,
  validateSaleInventory,
  getPurchaseButtonState,
} = require(productionPurchaseLogicPath);

/**
 * Adapter ensuring 100% backward compatibility with Phase 16 test assertions
 * while delegating directly to the production purchaseLogic.ts source of truth.
 */
function computePurchaseButtonState(params = {}) {
  const mergedParams = {
    isSaleConfigured: true,
    isConnected: true,
    isBscTestnet: true,
    isContractPaused: false,
    isBnbValid: true,
    bnbWei: parseEther("0.01"),
    calculatedTokensWei: parseEther("100"),
    parseError: null,
    availableInventory: parseEther("1000"),
    userBnbBalance: "0.5",
    bnbAmount: "0.01",
    txStatus: "idle",
    ...params,
  };

  const result = getPurchaseButtonState(mergedParams);
  return {
    disabled: result.disabled,
    label: result.label,
    action: result.actionType === "purchase" ? "handlePurchase" : result.actionType,
  };
}

module.exports = {
  // Re-export production functions directly
  parseBnbInput,
  validateBnbBalance,
  validateSaleInventory,
  getPurchaseButtonState,
  computePurchaseButtonState,
};
