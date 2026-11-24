'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const MarketTicker: React.FC = () => {
  const tickers = [
    {
      pair: 'LIORA / USDT',
      price: '$0.0500',
      change: '+14.2%',
      isPositive: true,
      volume: '$1.42M',
      sparkline: [40, 42, 41, 44, 46, 45, 48, 50],
    },
    {
      pair: 'LIORA / BNB',
      price: '0.000081 BNB',
      change: '+9.6%',
      isPositive: true,
      volume: '$480K',
      sparkline: [72, 74, 73, 76, 78, 79, 80, 81],
    },
    {
      pair: 'LIORA / BTC',
      price: '0.00000052 BTC',
      change: '+11.4%',
      isPositive: true,
      volume: '$310K',
      sparkline: [44, 45, 46, 48, 47, 50, 51, 52],
    },
    {
      pair: 'LIORA / ETH',
      price: '0.0000145 ETH',
      change: '+8.9%',
      isPositive: true,
      volume: '$265K',
      sparkline: [12, 12.5, 13, 12.8, 13.4, 13.9, 14.2, 14.5],
    },
    {
      pair: 'BNB / USDT',
      price: '$620.40',
      change: '+3.8%',
      isPositive: true,
      volume: '$840M',
      sparkline: [600, 605, 602, 610, 615, 612, 618, 620],
    },
    {
      pair: 'BTC / USDT',
      price: '$96,520',
      change: '+2.1%',
      isPositive: true,
      volume: '$4.2B',
      sparkline: [940, 945, 950, 948, 955, 958, 962, 965],
    },
    {
      pair: 'ETH / USDT',
      price: '$3,450.80',
      change: '-0.8%',
      isPositive: false,
      volume: '$1.8B',
      sparkline: [350, 348, 352, 349, 347, 345, 346, 345],
    },
    {
      pair: 'CAKE / USDT',
      price: '$2.85',
      change: '+5.4%',
      isPositive: true,
      volume: '$64M',
      sparkline: [2.6, 2.65, 2.7, 2.68, 2.75, 2.8, 2.82, 2.85],
    },
  ];

  return (
    <div className="w-full overflow-x-auto py-3 px-4 border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 min-w-[768px]">
        <div className="flex items-center gap-2 text-xs font-bold text-white shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-amber-300 font-extrabold">SIMULATED MARKET TICKER</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
            Demo Reference Data
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
                  className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${t.isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                >
                  {t.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{t.change}</span>
                </div>
              </div>

              {/* Mini Sparkline Visualization */}
              <div className="w-12 h-5 flex items-end gap-0.5 pt-1">
                {t.sparkline.map((val, idx) => {
                  const min = Math.min(...t.sparkline);
                  const max = Math.max(...t.sparkline);
                  const h = Math.max(20, Math.round(((val - min) / (max - min || 1)) * 80 + 20));
                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-sm ${t.isPositive ? 'bg-emerald-500/70' : 'bg-rose-500/70'}`}
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

