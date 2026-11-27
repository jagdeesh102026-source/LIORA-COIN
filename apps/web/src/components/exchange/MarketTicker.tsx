'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const MarketTicker: React.FC = () => {
  const tickers = [
    {
      pair: 'LIORA / INR (Benchmark)',
      price: '₹0.2000',
      change: 'STAGED',
      isPositive: true,
      volume: 'Zero Active Liquidity',
      sparkline: [20, 20, 20, 20, 20, 20, 20, 20],
    },
    {
      pair: 'LIORA / USDT (Ref)',
      price: '$0.00236',
      change: 'STAGED',
      isPositive: true,
      volume: 'Zero Active Liquidity',
      sparkline: [24, 24, 24, 24, 24, 24, 24, 24],
    },
    {
      pair: 'LIORA / BNB (Ref)',
      price: '0.0000038 BNB',
      change: 'STAGED',
      isPositive: true,
      volume: 'Zero Active Liquidity',
      sparkline: [38, 38, 38, 38, 38, 38, 38, 38],
    },
    {
      pair: 'BNB / USDT',
      price: '$620.40',
      change: '+3.8%',
      isPositive: true,
      volume: 'External Market',
      sparkline: [600, 605, 602, 610, 615, 612, 618, 620],
    },
    {
      pair: 'BTC / USDT',
      price: '$96,520',
      change: '+2.1%',
      isPositive: true,
      volume: 'External Market',
      sparkline: [940, 945, 950, 948, 955, 958, 962, 965],
    },
    {
      pair: 'ETH / USDT',
      price: '$3,450.80',
      change: '-0.8%',
      isPositive: false,
      volume: 'External Market',
      sparkline: [350, 348, 352, 349, 347, 345, 346, 345],
    },
  ];

  return (
    <div className="w-full overflow-x-auto py-3 px-4 border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 min-w-[768px]">
        <div className="flex items-center gap-2 text-xs font-bold text-white shrink-0">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-white font-extrabold">CANONICAL BENCHMARK RATES</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium">
            Pre-Launch Reference
          </span>
        </div>

        <div className="flex items-center gap-8 flex-1 justify-around">
          {tickers.map((t) => (
            <div key={t.pair} className="flex items-center gap-3">
              <div>
                <div className="text-xs font-bold text-white">{t.pair}</div>
                <div className="text-[11px] text-secondary">Vol: {t.volume}</div>
              </div>

              <div className="text-right">
                <div className="text-xs font-extrabold text-white">{t.price}</div>
                <div
                  className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${t.change === 'STAGED'
                      ? 'text-amber-300'
                      : t.isPositive
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                >
                  {t.change === 'STAGED' ? null : t.isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{t.change}</span>
                </div>
              </div>

              {/* Mini Sparkline Visualization */}
              <div className="w-12 h-5 flex items-end gap-0.5 pt-1">
                {t.sparkline.map((val, idx) => {
                  const min = Math.min(...t.sparkline);
                  const max = Math.max(...t.sparkline);
                  const h =
                    max === min
                      ? 50
                      : Math.max(20, Math.round(((val - min) / (max - min || 1)) * 80 + 20));
                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-sm ${t.change === 'STAGED'
                          ? 'bg-amber-400/50'
                          : t.isPositive
                            ? 'bg-emerald-500/70'
                            : 'bg-rose-500/70'
                        }`}
                      style={{ height: `${h}%` }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

