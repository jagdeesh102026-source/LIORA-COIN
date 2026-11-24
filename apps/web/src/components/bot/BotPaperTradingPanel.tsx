'use client';

import React from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Percent, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useTradingBot } from '../../hooks/useTradingBot';

export const BotPaperTradingPanel: React.FC = () => {
  const { paperMetrics } = useTradingBot();

  const winRatio = Math.round((paperMetrics.winningTrades / paperMetrics.totalSimulatedTrades) * 100);

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span>Paper-Trading &amp; Historical Backtest Analytics</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold uppercase">
              SIMULATED PERFORMANCE
            </span>
          </div>
          <p className="text-xs text-secondary">
            Quantitative paper-trading simulation derived from ALGOX V6_1_24 Pine Script v5 strategy execution models.
          </p>
        </div>

        <div className="text-[11px] font-mono text-muted bg-[var(--bg-primary)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] shrink-0 self-start sm:self-auto">
          {paperMetrics.periodLabel}
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Win Rate */}
        <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-emerald-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-secondary font-medium">
            <span>Simulated Win Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
            {paperMetrics.winRatePercent}%
          </div>
          <div className="text-[11px] text-emerald-300/80">
            {paperMetrics.winningTrades} Wins / {paperMetrics.losingTrades} Losses
          </div>
        </div>

        {/* Profit Factor */}
        <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-amber-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-secondary font-medium">
            <span>Profit Factor</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-300">
            {paperMetrics.profitFactor.toFixed(2)}
          </div>
          <div className="text-[11px] text-amber-200/80">
            Gross Profit vs Gross Loss
          </div>
        </div>

        {/* Net Simulated Return */}
        <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-blue-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-secondary font-medium">
            <span>Net Simulated Return</span>
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--brand-accent)]">
            +{paperMetrics.netPnlPercent}%
          </div>
          <div className="text-[11px] text-blue-300/80">
            Compounded across 146 simulated trades
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-secondary font-medium">
            <span>Max Peak-to-Trough DD</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-300">
            -{paperMetrics.maxDrawdownPercent}%
          </div>
          <div className="text-[11px] text-secondary">
            Sharpe Ratio: {paperMetrics.sharpeRatio.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Visual Trade Breakdown Bar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Simulated Trade Distribution (146 Total Executions)</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-emerald-400 font-bold">● {paperMetrics.winningTrades} Profitable ({winRatio}%)</span>
            <span className="text-rose-400 font-bold">● {paperMetrics.losingTrades} Unprofitable ({100 - winRatio}%)</span>
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${winRatio}%` }} 
            title={`Profitable Trades: ${paperMetrics.winningTrades}`}
          />
          <div 
            className="h-full bg-rose-500 transition-all duration-500" 
            style={{ width: `${100 - winRatio}%` }} 
            title={`Unprofitable Trades: ${paperMetrics.losingTrades}`}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] text-secondary">
          <div>
            <span className="text-muted block">Benchmark Assets</span>
            <span className="text-white font-medium">{paperMetrics.benchmarkAsset}</span>
          </div>
          <div>
            <span className="text-muted block">Average Gain / Trade</span>
            <span className="text-emerald-400 font-medium">+{paperMetrics.averageTradePnlPercent}%</span>
          </div>
          <div>
            <span className="text-muted block">Exit Strategy</span>
            <span className="text-white font-medium">Dual Target (TP1 50% / TP2 50%)</span>
          </div>
          <div>
            <span className="text-muted block">Execution Model</span>
            <span className="text-white font-medium">Confirmed Bar Close (Zero Repaint)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

