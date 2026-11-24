'use client';

import React, { useState } from 'react';
import { TokenItem, TokenSymbol } from '../../lib/demo/demoTypes';
import { BRAND_CONFIG } from '../../config/brandConfig';
import { Search, X, Check, ExternalLink } from 'lucide-react';

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenItem[];
  selectedToken: TokenSymbol;
  onSelectToken: (symbol: TokenSymbol) => void;
  title?: string;
}

export const TokenSelectorModal: React.FC<TokenSelectorModalProps> = ({
  isOpen,
  onClose,
  tokens,
  selectedToken,
  onSelectToken,
  title = 'Select a Token',
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-[#101827] border border-[var(--border-prominent)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-xs text-secondary mt-0.5">Choose from verified BEP-20 tokens</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-secondary hover:text-white hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="relative">
            <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, symbol, or paste 0x address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm text-white placeholder-secondary focus:outline-none focus:border-[var(--brand-accent)]"
              autoFocus
            />
          </div>
        </div>

        {/* Popular Tags */}
        <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto border-b border-[var(--border-subtle)]/50">
          <span className="text-[11px] text-muted font-medium shrink-0">Popular:</span>
          {['LIORA', 'USDT', 'BNB', 'BTC'].map((sym) => {
            const isSel = selectedToken === sym;
            return (
              <button
                key={sym}
                onClick={() => {
                  onSelectToken(sym as TokenSymbol);
                  onClose();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  isSel
                    ? 'bg-[var(--brand-accent)] text-black'
                    : 'bg-[var(--bg-elevated)] text-secondary hover:text-white border border-[var(--border-subtle)]'
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]/40 p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-secondary text-sm">
              No matching tokens found for &quot;{search}&quot;
            </div>
          ) : (
            filtered.map((t) => {
              const isSelected = t.symbol === selectedToken;
              return (
                <button
                  key={t.symbol}
                  onClick={() => {
                    onSelectToken(t.symbol);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all ${
                    isSelected
                      ? 'bg-[var(--brand-blue)]/15 border border-[var(--brand-accent)]/30'
                      : 'hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {t.symbol === 'LIORA' || t.symbol === 'OXENIQ' ? (
                      <img
                        src={BRAND_CONFIG.assets.logo128}
                        alt="Liora Coin"
                        className="w-10 h-10 rounded-full object-contain shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border border-white/10"
                        style={{ backgroundColor: t.iconBg, color: t.iconColor }}
                      >
                        {t.symbol.slice(0, 3)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{t.symbol}</span>
                        {t.isPrimaryPair && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-semibold">
                            Primary
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-secondary">{t.name}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-white text-sm">
                      {t.userBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                    <div className="text-xs text-secondary">
                      ${(t.userBalance * t.priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] text-center text-[11px] text-secondary">
          Non-custodial token balances simulated for localhost demo • BNB Smart Chain BEP-20
        </div>
      </div>
    </div>
  );
};

