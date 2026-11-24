'use client';

import React from 'react';
import { DualPriceService, DualPriceComparison } from '../../lib/dex/dualPriceService';
import { OnChainLiquidityPoolState } from '../../lib/dex/dexOnChainClient';
import { TrendingUp, Activity, AlertCircle, Info } from 'lucide-react';

interface DualPriceBadgeProps {
  pool: OnChainLiquidityPoolState | null;
  className?: string;
}

export const DualPriceBadge: React.FC<DualPriceBadgeProps> = ({ pool, className = '' }) => {
  const comp: DualPriceComparison = DualPriceService.getDualPriceComparison(pool);

  return (
    <div className={`p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Independent Dual Price Feeds</span>
        </div>
        <span className="text-[10px] font-mono text-secondary px-2 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
          Decoupled Feeds
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Live AMM Price */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-300 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live AMM DEX Spot Price
            </span>
            <span className="text-[10px] text-emerald-400/80 font-mono">PancakeSwap V2</span>
          </div>
          <div className="text-lg font-extrabold text-white font-mono">
            {comp.dexSpotPriceFormattedUSD}{' '}
            <span className="text-xs text-emerald-400 font-normal">({comp.dexSpotPriceFormattedINR})</span>
          </div>
          <p className="text-[10px] text-secondary">
            Enforceable on-chain liquidity ratio governed by reserves.
          </p>
        </div>

        {/* Scheduled Reference Price */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-blue-300 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Scheduled Reference Price
            </span>
            <span className="text-[10px] text-blue-400/80 font-mono">Simulation Only</span>
          </div>
          <div className="text-lg font-extrabold text-white font-mono">
            {comp.scheduledPriceFormattedINR}{' '}
            <span className="text-xs text-blue-300 font-normal">({comp.scheduledPriceFormattedUSD})</span>
          </div>
          <p className="text-[10px] text-secondary">
            Off-chain progression curve stepping ₹0.20/5h to ₹30.00.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] leading-relaxed">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong>Strict Separation Invariant:</strong> The Scheduled Reference Price is an internal economic projection. It does <strong>not</strong> represent an executable DEX order book price and cannot guarantee investor returns or yield.
        </div>
      </div>
    </div>
  );
};
