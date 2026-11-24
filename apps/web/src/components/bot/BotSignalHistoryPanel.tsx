'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Lock, 
  Sparkles, 
  Target, 
  ShieldAlert,
  Zap
} from 'lucide-react';
import { useTradingBot } from '../../hooks/useTradingBot';
import { BotSignal, SignalAction, SignalStatus } from '../../lib/bot/botTypes';

interface BotSignalHistoryPanelProps {
  onUnlockClick?: () => void;
}

export const BotSignalHistoryPanel: React.FC<BotSignalHistoryPanelProps> = ({ onUnlockClick }) => {
  const { signals, accessCheck } = useTradingBot();

  const [pairFilter, setPairFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const pairs = ['ALL', 'BTC/USDT', 'LIORA/USDT', 'ETH/USDT', 'BNB/USDT'];

  const filteredSignals = signals.filter((sig) => {
    if (pairFilter !== 'ALL' && sig.pair !== pairFilter) return false;
    if (actionFilter !== 'ALL' && sig.action !== actionFilter) return false;
    return true;
  });

  const getStatusBadge = (status: SignalStatus) => {
    switch (status) {
      case 'TP2_HIT':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
            TP2 Achieved
          </span>
        );
      case 'TP1_HIT':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
            TP1 Achieved
          </span>
        );
      case 'SL_HIT':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
            Stop Loss Hit
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold animate-pulse">
            In Progress
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-700/50 text-slate-300 text-[11px] font-medium">
            Closed
          </span>
        );
    }
  };

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-6 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <span>ALGOX V6_1_24 Signal Feed &amp; Alert Telemetry</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold uppercase">
              DEMO DATA
            </span>
          </div>
          <p className="text-xs text-secondary">
            Simulated TradingView Pine Script v5 strategy alerts with automated target exits and stop-loss coordinates.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Pair Filter */}
          <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-subtle)]">
            {pairs.map((p) => (
              <button
                key={p}
                onClick={() => setPairFilter(p)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  pairFilter === p
                    ? 'bg-amber-400 text-black'
                    : 'text-secondary hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-subtle)]">
            {(['ALL', 'LONG', 'SHORT'] as const).map((act) => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  actionFilter === act
                    ? 'bg-[var(--brand-accent)] text-black'
                    : 'text-secondary hover:text-white'
                }`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Signal Content with Access Gate Overlay */}
      <div className="relative">
        {/* Table of Signals */}
        <div className={`overflow-x-auto transition-all ${!accessCheck.hasAccess ? 'filter blur-[5px] select-none pointer-events-none' : ''}`}>
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[var(--bg-primary)]/80 text-[11px] text-secondary uppercase font-bold border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-3 px-4">Market / Pair</th>
                <th className="py-3 px-4">Signal Action</th>
                <th className="py-3 px-4">Entry Price</th>
                <th className="py-3 px-4">Take Profit (TP1 / TP2)</th>
                <th className="py-3 px-4">Stop Loss</th>
                <th className="py-3 px-4">Risk / Reward</th>
                <th className="py-3 px-4">Status &amp; PnL</th>
                <th className="py-3 px-4 text-right">Timeframe &amp; Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/40 font-mono text-xs">
              {filteredSignals.map((sig) => {
                const isLong = sig.action === 'LONG';
                return (
                  <tr key={sig.id} className="hover:bg-[var(--bg-primary)]/40 transition-colors">
                    {/* Pair */}
                    <td className="py-3.5 px-4 font-sans font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span>{sig.pair}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                          {sig.timeframe}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] font-sans ${
                          isLong
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{sig.action}</span>
                      </span>
                    </td>

                    {/* Entry Price */}
                    <td className="py-3.5 px-4 font-bold text-white">
                      ${sig.entryPrice < 1 ? sig.entryPrice.toFixed(4) : sig.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* TP1 & TP2 */}
                    <td className="py-3.5 px-4 text-emerald-400">
                      <div>TP1: ${sig.tp1 < 1 ? sig.tp1.toFixed(4) : sig.tp1.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-[11px] text-emerald-300/80">TP2: ${sig.tp2 < 1 ? sig.tp2.toFixed(4) : sig.tp2.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </td>

                    {/* Stop Loss */}
                    <td className="py-3.5 px-4 text-rose-400">
                      ${sig.stopLoss < 1 ? sig.stopLoss.toFixed(4) : sig.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Risk/Reward */}
                    <td className="py-3.5 px-4 text-secondary font-sans font-medium">
                      1 : {sig.riskRewardRatio.toFixed(1)}
                    </td>

                    {/* Status & PnL */}
                    <td className="py-3.5 px-4 font-sans space-y-1">
                      <div>{getStatusBadge(sig.status)}</div>
                      <div className={`text-[11px] font-mono font-bold ${sig.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {sig.pnlPercent >= 0 ? `+${sig.pnlPercent.toFixed(2)}%` : `${sig.pnlPercent.toFixed(2)}%`}
                      </div>
                    </td>

                    {/* Timeframe & Timestamp */}
                    <td className="py-3.5 px-4 text-right font-sans text-secondary text-[11px]">
                      <div>{new Date(sig.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-muted text-[10px]">{new Date(sig.timestamp).toLocaleDateString()}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Access Gate Lockout Overlay */}
        {!accessCheck.hasAccess && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#080D18]/85 backdrop-blur-sm rounded-2xl text-center space-y-4 z-20">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1 max-w-md">
              <h4 className="text-lg font-bold text-white">Signal Telemetry Locked</h4>
              <p className="text-xs text-secondary leading-relaxed">
                {accessCheck.reason ||
                  'Start your 48-Hour Free Trial or activate a subscription plan to unlock full entry, TP, and SL signal coordinates.'}
              </p>
            </div>

            <button
              onClick={onUnlockClick}
              className="py-3 px-6 rounded-xl btn-metallic font-bold text-xs text-white shadow-xl hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Unlock Signals with 48h Free Trial</span>
            </button>
          </div>
        )}
      </div>

      {/* Simulated Data Disclosure */}
      <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[11px] text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span>All displayed signals represent simulated strategy alerts for demonstration and backtest verification.</span>
        </div>
        <div className="font-mono text-secondary">
          Engine: ALGOX V6_1_24 (Pine Script v5)
        </div>
      </div>
    </div>
  );
};

