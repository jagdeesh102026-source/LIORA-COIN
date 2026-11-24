/**
 * LIORA COIN — Gate C9: 100% Liquidity Provisioning Workflow
 *
 * Implements the confirmed business decision:
 * "100% of primary token-sale proceeds must be allocated to LIORA/USDT liquidity,
 *  and the LIORA company treasury owns the resulting LP tokens."
 *
 * WORKFLOW RULES:
 * 1. Proceeds awaiting deposit are labeled 'PENDING_LIQUIDITY_ALLOCATION'.
 *    They are NEVER labeled as active or deposited pool liquidity.
 * 2. Paired LIORA tokens are deducted from the 70% Client Allocation bucket,
 *    strictly preserving the 30% Company Emergency Reserve unencumbered.
 * 3. All resulting LP tokens ('Cake-LP') are custodied by the company treasury wallet.
 * 4. Reconciliation audit checks ensure zero unaccounted USDT or LIORA leakages.
 */

import { formatUnits, parseUnits } from 'viem';
import {
  treasuryAccounting,
  LiquidityProvisionBatch,
  AUTHORIZED_TREASURY_WALLET,
} from './treasuryAccountingEngine';
import { OnChainLiquidityPoolState } from '../dex/dexOnChainClient';

export interface LiquidityProvisionPlan {
  usdtToAllocateRaw: bigint;
  usdtToAllocateFormatted: string;
  requiredLioraRaw: bigint;
  requiredLioraFormatted: string;
  expectedLpMintedRaw: bigint;
  expectedLpMintedFormatted: string;
  newReserveLioraFormatted: string;
  newReserveUsdtFormatted: string;
  newPoolDepthUsd: number;
  slippageTolerancePercent: number;
  recipientTreasuryWallet: string;
  hasSufficientClientAllocation: boolean;
  canExecute: boolean;
  blockReason?: string;
}

export class LiquidityProvisioningWorkflow {
  public static readonly PANCAKESWAP_PAIR_ADDRESS = '0xcCb0C6bDFe9dbc77c3275ad34C6F33aF05197D96';
  public static readonly PANCAKESWAP_LEGACY_PAIR_ADDRESS = '0x64beE3847a766D35E6611985F3c3e51C78Af5D2c';
  public static readonly PANCAKESWAP_ROUTER_ADDRESS = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
  public static readonly TREASURY_WALLET = AUTHORIZED_TREASURY_WALLET;

  /**
   * Plans a liquidity provisioning batch from pending primary sale proceeds.
   * Calculates exact required LIORA based on current pool reserve ratios.
   */
  public static planProvisioningBatch(
    pool: OnChainLiquidityPoolState,
    requestedUsdtRaw?: bigint,
    slippagePercent: number = 0.5
  ): LiquidityProvisionPlan {
    const state = treasuryAccounting.getTreasuryState();
    const usdtToAllocateRaw = requestedUsdtRaw !== undefined
      ? requestedUsdtRaw
      : state.usdtPendingLiquidityAllocationRaw;

    const clampedSlippage = Math.max(0.1, Math.min(2.0, slippagePercent));

    if (usdtToAllocateRaw <= 0n) {
      return {
        usdtToAllocateRaw: 0n,
        usdtToAllocateFormatted: '0.00',
        requiredLioraRaw: 0n,
        requiredLioraFormatted: '0.00',
        expectedLpMintedRaw: 0n,
        expectedLpMintedFormatted: '0.00',
        newReserveLioraFormatted: formatUnits(pool.reserveLiora, 18),
        newReserveUsdtFormatted: formatUnits(pool.reserveUsdt, 18),
        newPoolDepthUsd: Number(formatUnits(pool.reserveUsdt, 18)) * 2,
        slippageTolerancePercent: clampedSlippage,
        recipientTreasuryWallet: LiquidityProvisioningWorkflow.TREASURY_WALLET,
        hasSufficientClientAllocation: true,
        canExecute: false,
        blockReason: 'No pending USDT proceeds available for liquidity provisioning.',
      };
    }

    if (!pool.isHealthy || pool.reserveUsdt === 0n || pool.reserveLiora === 0n) {
      return {
        usdtToAllocateRaw,
        usdtToAllocateFormatted: formatUnits(usdtToAllocateRaw, 18),
        requiredLioraRaw: 0n,
        requiredLioraFormatted: '0.00',
        expectedLpMintedRaw: 0n,
        expectedLpMintedFormatted: '0.00',
        newReserveLioraFormatted: '0.00',
        newReserveUsdtFormatted: '0.00',
        newPoolDepthUsd: 0,
        slippageTolerancePercent: clampedSlippage,
        recipientTreasuryWallet: LiquidityProvisioningWorkflow.TREASURY_WALLET,
        hasSufficientClientAllocation: false,
        canExecute: false,
        blockReason: 'PancakeSwap pool reserves are offline or uninitialized.',
      };
    }

    // Required LIORA = (USDT * reserveLiora) / reserveUsdt
    const requiredLioraRaw = (usdtToAllocateRaw * pool.reserveLiora) / pool.reserveUsdt;

    // Expected LP tokens minted = min((A * totalLP) / reserveA, (B * totalLP) / reserveB)
    const lpFromLiora = pool.totalLpSupply > 0n
      ? (requiredLioraRaw * pool.totalLpSupply) / pool.reserveLiora
      : 0n;
    const lpFromUsdt = pool.totalLpSupply > 0n
      ? (usdtToAllocateRaw * pool.totalLpSupply) / pool.reserveUsdt
      : 0n;
    const expectedLpMintedRaw = lpFromLiora < lpFromUsdt ? lpFromLiora : lpFromUsdt;

    const hasSufficientClientAllocation = requiredLioraRaw <= state.availableClientAllocationRaw;

    const newReserveLioraRaw = pool.reserveLiora + requiredLioraRaw;
    const newReserveUsdtRaw = pool.reserveUsdt + usdtToAllocateRaw;
    const newPoolDepthUsd = Number(formatUnits(newReserveUsdtRaw, 18)) * 2;

    const canExecute = hasSufficientClientAllocation && usdtToAllocateRaw <= state.usdtPendingLiquidityAllocationRaw;
    const blockReason = !hasSufficientClientAllocation
      ? `Insufficient available client allocation (${state.availableClientAllocationFormatted} LIORA) to pair with ${formatUnits(usdtToAllocateRaw, 18)} USDT.`
      : usdtToAllocateRaw > state.usdtPendingLiquidityAllocationRaw
        ? `Requested allocation exceeds pending proceeds (${state.usdtPendingLiquidityAllocationFormatted} USDT).`
        : undefined;

    return {
      usdtToAllocateRaw,
      usdtToAllocateFormatted: formatUnits(usdtToAllocateRaw, 18),
      requiredLioraRaw,
      requiredLioraFormatted: Number(formatUnits(requiredLioraRaw, 18)).toLocaleString('en-US', {
        maximumFractionDigits: 4,
      }),
      expectedLpMintedRaw,
      expectedLpMintedFormatted: Number(formatUnits(expectedLpMintedRaw, 18)).toLocaleString('en-US', {
        maximumFractionDigits: 4,
      }),
      newReserveLioraFormatted: formatUnits(newReserveLioraRaw, 18),
      newReserveUsdtFormatted: formatUnits(newReserveUsdtRaw, 18),
      newPoolDepthUsd,
      slippageTolerancePercent: clampedSlippage,
      recipientTreasuryWallet: LiquidityProvisioningWorkflow.TREASURY_WALLET,
      hasSufficientClientAllocation,
      canExecute,
      blockReason,
    };
  }

  /**
   * Commits and records a liquidity provision batch.
   * Debits pending USDT proceeds, pairs matching LIORA from client allocation,
   * and credits minted Cake-LP tokens 100% to the company treasury.
   */
  public static executeProvisionBatch(
    plan: LiquidityProvisionPlan,
    isConfirmedOnChain: boolean = false,
    txHash?: string,
    callerAddress?: string
  ): { success: boolean; batch?: LiquidityProvisionBatch; error?: string } {
    if (callerAddress && !treasuryAccounting.isAuthorizedTreasuryWallet(callerAddress)) {
      return {
        success: false,
        error: `UNAUTHORIZED_TREASURY_WALLET: Caller address (${callerAddress}) is not authorized to execute treasury liquidity operations.`,
      };
    }

    if (!plan.canExecute) {
      return { success: false, error: plan.blockReason || 'Liquidity provision plan is invalid or blocked.' };
    }

    const batchId = `liq_batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectiveHash = txHash || `0x_sim_liq_${Date.now()}`;

    const batch: LiquidityProvisionBatch = {
      batchId,
      txHash: effectiveHash,
      usdtAllocatedRaw: plan.usdtToAllocateRaw,
      usdtAllocatedFormatted: plan.usdtToAllocateFormatted,
      lioraPairedRaw: plan.requiredLioraRaw,
      lioraPairedFormatted: plan.requiredLioraFormatted,
      lpTokensMintedRaw: plan.expectedLpMintedRaw,
      lpTokensMintedFormatted: plan.expectedLpMintedFormatted,
      recipientWallet: LiquidityProvisioningWorkflow.TREASURY_WALLET,
      timestamp: Date.now(),
      status: isConfirmedOnChain ? 'CONFIRMED' : 'SIMULATED',
      explorerUrl: `https://testnet.bscscan.com/tx/${effectiveHash}`,
    };

    try {
      treasuryAccounting.recordLiquidityProvision(batch);
      return { success: true, batch };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to record liquidity provision batch.' };
    }
  }
}
