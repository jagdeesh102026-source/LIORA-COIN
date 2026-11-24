/**
 * LIORA COIN — Gate C9: Independent Dual Price Display Service
 *
 * Enforces strict separation between:
 * 1. Scheduled Reference Price (Theoretical simulation stepping ₹0.20 every 5h to ₹30)
 * 2. Actual DEX Market Spot Price (Live on-chain ratio from PancakeSwap V2 pool)
 *
 * MANDATORY SAFETY INVARIANT:
 * The scheduled reference price must NEVER be represented as an executable market quote,
 * a guaranteed return, or an on-chain AMM valuation.
 */

import { ReferencePriceSimulator } from '../prelaunch/referencePriceSimulator';
import { OnChainLiquidityPoolState } from './dexOnChainClient';

export interface DualPriceComparison {
  // 1. Scheduled Reference Price (Off-Chain Simulation)
  scheduledPriceINR: number;
  scheduledPriceUSD: number;
  scheduledPriceFormattedINR: string;
  scheduledPriceFormattedUSD: string;
  scheduleStepIndex: number;
  scheduleProgressPercent: number;
  scheduleLabel: 'Theoretical Reference Schedule';
  scheduleDisclaimer: string;

  // 2. Actual Live DEX Market Spot Price (On-Chain AMM)
  dexSpotPriceUSD: number;
  dexSpotPriceINR: number;
  dexSpotPriceFormattedUSD: string;
  dexSpotPriceFormattedINR: string;
  dexMarketLabel: 'Live PancakeSwap V2 Market Price';
  dexStatusNote: string;

  // Comparison & Divergence Metrics
  priceRatioScheduledOverDex: number; // e.g. 1.0x vs 150x
  divergencePercent: number;
  isDivergent: boolean;
  timestamp: number;
}

export class DualPriceService {
  public static readonly DEFAULT_FX_RATE = 86.50; // INR per USD

  /**
   * Computes synchronized side-by-side comparison between the scheduled reference price
   * and the actual on-chain DEX spot price.
   */
  public static getDualPriceComparison(
    pool: OnChainLiquidityPoolState | null,
    elapsedSecondsForSchedule: number = 0,
    lockedFxRate: number = DualPriceService.DEFAULT_FX_RATE
  ): DualPriceComparison {
    // 1. Scheduled Reference Price Calculation
    const paise = ReferencePriceSimulator.calculatePricePaise(elapsedSecondsForSchedule);
    const scheduledPriceINR = paise / 100;
    const scheduledPriceUSD = Number((scheduledPriceINR / lockedFxRate).toFixed(8));
    const stepIndex = Math.floor(Math.max(0, elapsedSecondsForSchedule) / ReferencePriceSimulator.CONFIRMED_INTERVAL_SECONDS);
    const progressPercent = Number(
      Math.min(100, (stepIndex / ReferencePriceSimulator.TOTAL_INTERVALS) * 100).toFixed(2)
    );

    // 2. Actual DEX Market Spot Price Calculation
    let dexSpotPriceUSD = 0.002322;
    let dexSpotPriceINR = Number((dexSpotPriceUSD * lockedFxRate).toFixed(4));
    let dexStatusNote = 'Live AMM spot price derived from PancakeSwap V2 pool reserves.';

    if (pool && pool.isHealthy && pool.reserveLiora > 0n && pool.reserveUsdt > 0n) {
      dexSpotPriceUSD = pool.spotPriceUsd;
      dexSpotPriceINR = pool.spotPriceInr || Number((dexSpotPriceUSD * lockedFxRate).toFixed(4));
    } else {
      dexStatusNote = 'Using baseline pool spot price ($0.002322 / ₹0.2008).';
    }

    // 3. Divergence Metrics
    const ratio = dexSpotPriceUSD > 0 ? scheduledPriceUSD / dexSpotPriceUSD : 1;
    const divergencePercent = Number((Math.abs(ratio - 1) * 100).toFixed(2));
    const isDivergent = divergencePercent > 5.0;

    return {
      scheduledPriceINR,
      scheduledPriceUSD,
      scheduledPriceFormattedINR: `₹${scheduledPriceINR.toFixed(2)}`,
      scheduledPriceFormattedUSD: `$${scheduledPriceUSD.toFixed(6)}`,
      scheduleStepIndex: stepIndex,
      scheduleProgressPercent: progressPercent,
      scheduleLabel: 'Theoretical Reference Schedule',
      scheduleDisclaimer:
        'DISCLAIMER: The Scheduled Reference Price is an internal economic simulation. It is strictly non-binding, does NOT represent an active DEX market value, and provides NO guarantee of future token trading price.',
      dexSpotPriceUSD,
      dexSpotPriceINR,
      dexSpotPriceFormattedUSD: `$${dexSpotPriceUSD.toFixed(6)}`,
      dexSpotPriceFormattedINR: `₹${dexSpotPriceINR.toFixed(4)}`,
      dexMarketLabel: 'Live PancakeSwap V2 Market Price',
      dexStatusNote,
      priceRatioScheduledOverDex: Number(ratio.toFixed(2)),
      divergencePercent,
      isDivergent,
      timestamp: Date.now(),
    };
  }
}
