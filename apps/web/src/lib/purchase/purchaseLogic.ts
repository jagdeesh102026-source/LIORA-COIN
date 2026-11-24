import { parseEther } from 'viem';
import { TESTNET_SALE_TOKENS_PER_BNB } from '../../config/tokenConfig';

export interface BnbInputValidationResult {
  bnbWei: bigint;
  calculatedTokensWei: bigint;
  isBnbValid: boolean;
  parseError: string | null;
}

export type PurchaseActionType =
  | 'none'
  | 'connect'
  | 'switchToBscTestnet'
  | 'purchase';

export interface PurchaseButtonState {
  disabled: boolean;
  label: string;
  actionType: PurchaseActionType;
}

export interface PurchaseButtonParams {
  isSaleConfigured: boolean;
  isConnected: boolean;
  isBscTestnet: boolean;
  isContractPaused: boolean;
  isBnbValid: boolean;
  bnbWei: bigint;
  calculatedTokensWei: bigint;
  parseError?: string | null;
  availableInventory?: bigint | null;
  userBnbBalance?: string | null;
  bnbAmount: string;
  txStatus?: 'idle' | 'broadcasting' | 'confirming' | 'confirmed' | 'error';
}

/**
 * Parses user BNB string input safely using parseEther and BigInt.
 * Protects against scientific notation, non-numbers, negative numbers, and sub-wei rounding.
 */
export function parseBnbInput(
  bnbAmount: string,
  tokensPerBnb: number = TESTNET_SALE_TOKENS_PER_BNB
): BnbInputValidationResult {
  try {
    const clean = (bnbAmount || '').toString().trim();
    if (!clean || isNaN(Number(clean)) || Number(clean) <= 0) {
      return { bnbWei: 0n, calculatedTokensWei: 0n, isBnbValid: false, parseError: null };
    }
    const wei = parseEther(clean);
    const tokensWei = wei * BigInt(tokensPerBnb);
    return { bnbWei: wei, calculatedTokensWei: tokensWei, isBnbValid: wei > 0n, parseError: null };
  } catch {
    return { bnbWei: 0n, calculatedTokensWei: 0n, isBnbValid: false, parseError: 'Invalid BNB amount format' };
  }
}

/**
 * Validates whether user wallet has sufficient tBNB balance to cover transaction value.
 */
export function validateBnbBalance(
  bnbWei: bigint,
  userBnbBalance: string | null | undefined
): { hasSufficientBalance: boolean; error: string | null } {
  if (!userBnbBalance) {
    return { hasSufficientBalance: true, error: null };
  }
  try {
    const userWei = parseEther(userBnbBalance);
    if (bnbWei > userWei) {
      return { hasSufficientBalance: false, error: 'Insufficient tBNB Balance' };
    }
    return { hasSufficientBalance: true, error: null };
  } catch {
    return { hasSufficientBalance: true, error: null };
  }
}

/**
 * Validates whether sale contract has sufficient OXENIQ inventory to fulfill requested delivery.
 */
export function validateSaleInventory(
  calculatedTokensWei: bigint,
  availableInventory: bigint | null | undefined
): { isInventorySufficient: boolean; error: string | null } {
  if (availableInventory === null || availableInventory === undefined) {
    return { isInventorySufficient: true, error: null };
  }
  if (availableInventory === 0n) {
    return { isInventorySufficient: false, error: 'Test Inventory Exhausted (Awaiting Funding)' };
  }
  if (availableInventory < calculatedTokensWei) {
    return { isInventorySufficient: false, error: 'Exceeds Available Test Inventory' };
  }
  return { isInventorySufficient: true, error: null };
}

/**
 * Deterministic state machine computing the disabled state, user-facing label,
 * and canonical action type for the TestnetPurchaseTerminal button.
 */
export function getPurchaseButtonState({
  isSaleConfigured,
  isConnected,
  isBscTestnet,
  isContractPaused,
  isBnbValid,
  bnbWei,
  calculatedTokensWei,
  parseError = null,
  availableInventory = null,
  userBnbBalance = null,
  bnbAmount,
  txStatus = 'idle',
}: PurchaseButtonParams): PurchaseButtonState {
  if (!isSaleConfigured) {
    return {
      disabled: true,
      label: 'Checkout Staged — Awaiting Sale Deployment',
      actionType: 'none',
    };
  }

  if (!isConnected) {
    return {
      disabled: false,
      label: 'Connect Testnet Wallet',
      actionType: 'connect',
    };
  }

  if (!isBscTestnet) {
    return {
      disabled: false,
      label: 'Switch to BSC Testnet (Chain #97)',
      actionType: 'switchToBscTestnet',
    };
  }

  if (isContractPaused) {
    return {
      disabled: true,
      label: 'Sale Contract Paused (Circuit Breaker)',
      actionType: 'none',
    };
  }

  if (!isBnbValid || bnbWei <= 0n) {
    return {
      disabled: true,
      label: parseError || 'Enter a Valid tBNB Amount',
      actionType: 'none',
    };
  }

  const inventoryCheck = validateSaleInventory(calculatedTokensWei, availableInventory);
  if (!inventoryCheck.isInventorySufficient && inventoryCheck.error) {
    return {
      disabled: true,
      label: inventoryCheck.error,
      actionType: 'none',
    };
  }

  const balanceCheck = validateBnbBalance(bnbWei, userBnbBalance);
  if (!balanceCheck.hasSufficientBalance && balanceCheck.error) {
    return {
      disabled: true,
      label: balanceCheck.error,
      actionType: 'none',
    };
  }

  if (txStatus === 'broadcasting') {
    return {
      disabled: true,
      label: 'Awaiting Wallet Approval...',
      actionType: 'none',
    };
  }

  if (txStatus === 'confirming') {
    return {
      disabled: true,
      label: 'Confirming On-Chain...',
      actionType: 'none',
    };
  }

  return {
    disabled: false,
    label: `Purchase with Test BNB (${bnbAmount.trim()} tBNB)`,
    actionType: 'purchase',
  };
}

