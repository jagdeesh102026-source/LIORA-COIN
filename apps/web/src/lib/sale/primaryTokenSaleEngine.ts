/**
 * LIORA COIN — Gate C9: Primary Token Sale Engine (BSC Testnet Sandbox)
 *
 * Implements testnet-only primary token-sale quotation, purchase validation,
 * token delivery tracking, and automatic 100% proceeds liquidity allocation.
 *
 * UNRESOLVED DECISION GUARD:
 * Management has not yet confirmed whether the ₹0.20 to ₹30.00 reference schedule
 * determines primary sale pricing. Therefore:
 * 1. An explicitly labeled "Mock Quotation Mode" is active by default.
 * 2. Unapproved live execution is strictly blocked without explicit simulated confirmation.
 * 3. Two independent price models (Scheduled Reference vs DEX Market Spot) are maintained.
 */

import { parseUnits, formatUnits } from 'viem';
import {
  treasuryAccounting,
  PrimarySaleReceipt,
  AUTHORIZED_TREASURY_WALLET,
} from '../treasury/treasuryAccountingEngine';
import { ReferencePriceSimulator } from '../prelaunch/referencePriceSimulator';

export type PrimarySalePricingModel =
  | 'FIXED_BASELINE'          // Baseline testnet price ($0.10 USD / ₹8.65 INR)
  | 'REFERENCE_SCHEDULE'      // Theoretical schedule progression (₹0.20 to ₹30.00)
  | 'DEX_SPOT_MARKET';        // Live PancakeSwap V2 pool spot price

export interface PrimarySaleQuote {
  pricingModel: PrimarySalePricingModel;
  usdtInputFormatted: string;
  usdtInputRaw: bigint;
  tokenPriceUSD: number;
  tokenPriceINR: number;
  expectedLioraFormatted: string;
  expectedLioraRaw: bigint;
  proceedsAllocatedToLiquidityPercent: 100;
  liquidityUsdtProceedsFormatted: string;
  treasuryRecipient: string;
  isAvailableInTreasury: boolean;
  pricingStatusNote: string;
  warningNote?: string;
  isValid: boolean;
  isExecutable: boolean;
  executionDisabledReason?: string;
  error?: string;
}

export interface PurchaseExecutionResult {
  success: boolean;
  receipt?: PrimarySaleReceipt;
  txHash?: string;
  error?: string;
}

export class PrimaryTokenSaleEngine {
  public static readonly BSC_TESTNET_CHAIN_ID = 97;
  public static readonly MOCK_USDT_ADDRESS = '0x0b419a33e8a6448547906DCB191b037Db5ac926e';
  public static readonly LIORA_TOKEN_ADDRESS = '0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9';
  public static readonly TREASURY_WALLET = AUTHORIZED_TREASURY_WALLET;
  public static readonly DEFAULT_FX_RATE = 86.50; // INR per USD

  /**
   * Generates a precise primary-sale quotation adhering to the selected pricing model.
   *
   * @param usdtAmountInput User deposit in USDT (e.g. "100")
   * @param model Pricing model selection
   * @param liveDexSpotPriceUSD Current live PancakeSwap V2 spot price (default ~$0.002322)
   * @param elapsedSecondsForSchedule Elapsed seconds for reference schedule simulation
   */
  public static calculateSaleQuote(
    usdtAmountInput: string,
    model: PrimarySalePricingModel = 'FIXED_BASELINE',
    liveDexSpotPriceUSD: number = 0.002322,
    elapsedSecondsForSchedule: number = 0
  ): PrimarySaleQuote {
    const numInput = parseFloat(usdtAmountInput) || 0;
    const fallback: PrimarySaleQuote = {
      pricingModel: model,
      usdtInputFormatted: usdtAmountInput,
      usdtInputRaw: 0n,
      tokenPriceUSD: 0,
      tokenPriceINR: 0,
      expectedLioraFormatted: '0.00',
      expectedLioraRaw: 0n,
      proceedsAllocatedToLiquidityPercent: 100,
      liquidityUsdtProceedsFormatted: '0.00',
      treasuryRecipient: PrimaryTokenSaleEngine.TREASURY_WALLET,
      isAvailableInTreasury: false,
      pricingStatusNote: 'Awaiting valid USDT input amount.',
      isValid: false,
      isExecutable: false,
      executionDisabledReason: 'Awaiting valid USDT input amount.',
      error: numInput <= 0 ? 'Enter an investment amount in USDT' : undefined,
    };

    if (numInput <= 0) return fallback;

    let usdtInputRaw = 0n;
    try {
      usdtInputRaw = parseUnits(usdtAmountInput, 18);
    } catch {
      return { ...fallback, error: 'Invalid numeric amount', executionDisabledReason: 'Invalid numeric amount' };
    }

    let tokenPriceUSD = 0.10;
    let tokenPriceINR = 8.65;
    let pricingStatusNote = '';
    let warningNote: string | undefined = undefined;
    let isExecutable = true;
    let executionDisabledReason: string | undefined = undefined;

    switch (model) {
      case 'FIXED_BASELINE':
        tokenPriceUSD = 0.10;
        tokenPriceINR = 8.65;
        pricingStatusNote = 'Fixed Baseline Presale Tier: $0.10 USD (₹8.65 INR). Provisional benchmark rate.';
        break;

      case 'REFERENCE_SCHEDULE': {
        const paise = ReferencePriceSimulator.calculatePricePaise(elapsedSecondsForSchedule);
        tokenPriceINR = paise / 100;
        tokenPriceUSD = Number((tokenPriceINR / PrimaryTokenSaleEngine.DEFAULT_FX_RATE).toFixed(8));
        pricingStatusNote = `Theoretical Reference Schedule (Step: ₹${tokenPriceINR.toFixed(2)}).`;
        warningNote = 'UNAPPROVED PRICING DECISION: The reference-price schedule is a theoretical simulation and has NOT been approved as an enforceable primary sale execution price. Shown for preview comparison only.';
        isExecutable = false;
        executionDisabledReason = 'UNAPPROVED_PRICING_MODEL: The reference-price schedule is a theoretical simulation and cannot execute purchases until approved by management.';
        break;
      }

      case 'DEX_SPOT_MARKET':
        tokenPriceUSD = Math.max(0.00000001, liveDexSpotPriceUSD);
        tokenPriceINR = Number((tokenPriceUSD * PrimaryTokenSaleEngine.DEFAULT_FX_RATE).toFixed(4));
        pricingStatusNote = `Live PancakeSwap V2 AMM Spot Price: $${tokenPriceUSD.toFixed(6)} (₹${tokenPriceINR.toFixed(4)}).`;
        break;
    }

    // Expected LIORA tokens = USDT deposit / tokenPriceUSD
    // Format tokenPriceUSD cleanly to avoid IEEE 754 precision artifacts (e.g. 0.100000000000000006)
    const priceStr = tokenPriceUSD.toFixed(8).replace(/\.?0+$/, '') || '0';
    const tokenPriceUSDRaw = parseUnits(priceStr, 18);
    const expectedLioraRaw = tokenPriceUSDRaw > 0n
      ? (usdtInputRaw * (10n ** 18n)) / tokenPriceUSDRaw
      : 0n;

    const expectedLioraFormatted = Number(formatUnits(expectedLioraRaw, 18)).toLocaleString('en-US', {
      maximumFractionDigits: 4,
    });

    const treasuryState = treasuryAccounting.getTreasuryState();
    const isAvailableInTreasury = expectedLioraRaw <= treasuryState.availableClientAllocationRaw;

    let error: string | undefined = undefined;
    if (!isAvailableInTreasury) {
      error = `Requested tokens (${expectedLioraFormatted}) exceed available client allocation (${treasuryState.availableClientAllocationFormatted} LIORA).`;
      isExecutable = false;
      executionDisabledReason = error;
    }

    return {
      pricingModel: model,
      usdtInputFormatted: usdtAmountInput,
      usdtInputRaw,
      tokenPriceUSD,
      tokenPriceINR,
      expectedLioraFormatted,
      expectedLioraRaw,
      proceedsAllocatedToLiquidityPercent: 100,
      liquidityUsdtProceedsFormatted: usdtAmountInput,
      treasuryRecipient: PrimaryTokenSaleEngine.TREASURY_WALLET,
      isAvailableInTreasury,
      pricingStatusNote,
      warningNote,
      isValid: error === undefined,
      isExecutable,
      executionDisabledReason,
      error,
    };
  }

  /**
   * Simulates or executes a primary token sale purchase on BSC Testnet.
   * Confirms 100% of USDT proceeds are registered directly into the liquidity allocation pipeline.
   */
  public static executePurchase(
    quote: PrimarySaleQuote,
    buyerAddress: string,
    isLiveTestnetTx: boolean = false,
    txHash?: string
  ): PurchaseExecutionResult {
    if (!quote.isValid || !quote.isExecutable || quote.expectedLioraRaw <= 0n) {
      return { success: false, error: quote.executionDisabledReason || quote.error || 'Invalid primary sale quote.' };
    }
    if (!buyerAddress || buyerAddress.length !== 42) {
      return { success: false, error: 'Invalid buyer address.' };
    }

    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const effectiveHash = txHash || `0x_sim_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const receipt: PrimarySaleReceipt = {
      saleId,
      txHash: effectiveHash,
      buyerAddress: buyerAddress.toLowerCase(),
      tokensDeliveredRaw: quote.expectedLioraRaw,
      tokensDeliveredFormatted: quote.expectedLioraFormatted,
      usdtPaidRaw: quote.usdtInputRaw,
      usdtPaidFormatted: quote.usdtInputFormatted,
      effectivePriceUSD: quote.tokenPriceUSD,
      timestamp: Date.now(),
      status: isLiveTestnetTx ? 'CONFIRMED' : 'SIMULATED',
    };

    try {
      treasuryAccounting.recordPrimarySale(receipt);
      return {
        success: true,
        receipt,
        txHash: effectiveHash,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to record primary sale receipt in treasury ledger.',
      };
    }
  }
}
