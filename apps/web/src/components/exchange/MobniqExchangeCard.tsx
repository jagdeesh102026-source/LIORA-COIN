'use client';

import React, { useState, useMemo } from 'react';
import { useDemoStore } from '../../lib/demo/useDemoStore';
import { TokenSymbol, SwapQuote, SwapTransaction } from '../../lib/demo/demoTypes';
import { BRAND_CONFIG } from '../../config/brandConfig';
import { TokenSelectorModal } from './TokenSelectorModal';
import { SwapPreviewModal } from './SwapPreviewModal';
import { TransactionProgressModal } from './TransactionProgressModal';
import { 
  ArrowDownUp, 
  Settings2, 
  Sparkles, 
  ShieldCheck, 
  Info, 
  ChevronDown, 
  Zap, 
  RefreshCw 
} from 'lucide-react';

interface MobniqExchangeCardProps {
  className?: string;
  defaultFrom?: TokenSymbol;
  defaultTo?: TokenSymbol;
  compact?: boolean;
}

export const MobniqExchangeCard: React.FC<MobniqExchangeCardProps> = ({
  className = '',
  defaultFrom = 'USDT',
  defaultTo = 'LIORA',
  compact = false,
}) => {
  const { tokens, calculateQuote, executeSwap } = useDemoStore();

  const [fromSymbol, setFromSymbol] = useState<TokenSymbol>(defaultFrom);
  const [toSymbol, setToSymbol] = useState<TokenSymbol>(defaultTo);
  const [fromAmount, setFromAmount] = useState<string>('500');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(!compact);

  // Modals state
  const [isFromModalOpen, setIsFromModalOpen] = useState(false);
  const [isToModalOpen, setIsToModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [executedTx, setExecutedTx] = useState<SwapTransaction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const fromToken = useMemo(() => tokens.find((t) => t.symbol === fromSymbol), [tokens, fromSymbol]);
  const toToken = useMemo(() => tokens.find((t) => t.symbol === toSymbol), [tokens, toSymbol]);

  const numFromAmount = parseFloat(fromAmount) || 0;

  // Calculate live quote
  const quote: SwapQuote | null = useMemo(() => {
    return calculateQuote(fromSymbol, toSymbol, numFromAmount, slippage);
  }, [calculateQuote, fromSymbol, toSymbol, numFromAmount, slippage]);

  // Flip tokens
  const handleFlip = () => {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    if (quote && quote.toAmount > 0) {
      setFromAmount(quote.toAmount.toString());
    }
  };

  // Set Max balance
  const handleMax = () => {
    if (fromToken) {
      setFromAmount(fromToken.userBalance.toString());
    }
  };

  // Validation
  const hasInsufficientBalance = fromToken ? numFromAmount > fromToken.userBalance : false;
  const isInputZeroOrEmpty = !fromAmount || numFromAmount <= 0;

  // Trigger confirmation modal
  const handleInitiateSwap = () => {
    if (!quote || hasInsufficientBalance || isInputZeroOrEmpty) return;
    setIsPreviewOpen(true);
  };

  // Execute Swap
  const handleConfirmSwap = () => {
    if (!quote) return;
    setIsExecuting(true);
    setTimeout(() => {
      const tx = executeSwap(quote);
      setExecutedTx(tx);
      setIsExecuting(false);
      setIsPreviewOpen(false);
      setIsProgressOpen(true);
    }, 500);
  };

  return (
    <div
      className={`relative w-full max-w-xl mx-auto rounded-3xl bg-gradient-to-b from-[#111A2E] to-[#0A101D] border border-[var(--border-prominent)] shadow-2xl p-5 sm:p-7 backdrop-blur-xl ${className}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[var(--brand-accent)]">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Instant Crypto Exchange</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/30">
                DEMO DATA
              </span>
            </div>
            <p className="text-xs text-secondary">Non-Custodial • PancakeSwap Smart Routing (Simulated)</p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl border transition-all ${
            showSettings
              ? 'bg-[var(--brand-blue)]/20 border-[var(--brand-accent)] text-white'
              : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-secondary hover:text-white'
          }`}
          title="Exchange Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Slippage Settings Drawer */}
      {showSettings && (
        <div className="mb-5 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-accent)] animate-fade-in space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            <span>Slippage Tolerance</span>
            <span className="text-[var(--brand-accent)]">{slippage}%</span>
          </div>
          <div className="flex items-center gap-2">
            {[0.1, 0.5, 1.0, 2.5].map((val) => (
              <button
                key={val}
                onClick={() => setSlippage(val)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  slippage === val
                    ? 'bg-[var(--brand-accent)] text-black'
                    : 'bg-[var(--bg-primary)] text-secondary hover:text-white border border-[var(--border-subtle)]'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
          <p className="text-[11px] text-secondary">
            Your transaction will revert if the execution price changes unfavorably by more than this percentage.
          </p>
        </div>
      )}

      {/* YOU SEND CARD (Mobniq Style) */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elevated)]/90 border border-[var(--border-subtle)] hover:border-[var(--border-prominent)] transition-all space-y-2">
        <div className="flex items-center justify-between text-xs text-secondary font-medium">
          <span>You send</span>
          <div className="flex items-center gap-1.5">
            <span>Balance:</span>
            <span className="text-white font-semibold">
              {fromToken ? fromToken.userBalance.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0.00'}
            </span>
            <button
              onClick={handleMax}
              className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[var(--brand-blue)]/20 text-[var(--brand-accent)] hover:bg-[var(--brand-blue)]/30 transition-colors"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0.0"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold text-white placeholder-secondary focus:outline-none tracking-tight"
          />

          {/* Token Selector Pill */}
          <button
            onClick={() => setIsFromModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--brand-accent)]/50 transition-all text-white font-bold text-sm shrink-0 shadow-sm"
          >
            {fromToken &&
              (fromToken.symbol === 'LIORA' || fromToken.symbol === 'OXENIQ' ? (
                <img
                  src={BRAND_CONFIG.assets.logo128}
                  alt="Liora Coin"
                  className="w-6 h-6 rounded-full object-contain shrink-0"
                />
              ) : (
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border border-white/10"
                  style={{ backgroundColor: fromToken.iconBg, color: fromToken.iconColor }}
                >
                  {fromToken.symbol.slice(0, 3)}
                </span>
              ))}
            <span>{fromSymbol}</span>
            <ChevronDown className="w-3.5 h-3.5 text-secondary" />
          </button>
        </div>

        <div className="text-right text-xs text-secondary">
          ≈ ${(numFromAmount * (fromToken ? fromToken.priceUsd : 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
        </div>
      </div>

      {/* SWAP FLIP BUTTON */}
      <div className="flex justify-center -my-3 relative z-10">
        <button
          onClick={handleFlip}
          className="p-2.5 rounded-full bg-[#15233C] border border-[var(--border-accent)] text-[var(--brand-accent)] hover:scale-110 hover:text-white transition-all shadow-lg"
          title="Switch Tokens"
        >
          <ArrowDownUp className="w-4 h-4" />
        </button>
      </div>

      {/* YOU GET CARD (Mobniq Style) */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elevated)]/90 border border-[var(--border-subtle)] hover:border-[var(--border-prominent)] transition-all space-y-2">
        <div className="flex items-center justify-between text-xs text-secondary font-medium">
          <span>You get (estimated)</span>
          <div className="flex items-center gap-1.5">
            <span>Balance:</span>
            <span className="text-white font-semibold">
              {toToken ? toToken.userBalance.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0.00'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            readOnly
            placeholder="0.0"
            value={quote ? quote.toAmount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0.0'}
            className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold text-emerald-400 placeholder-secondary focus:outline-none tracking-tight cursor-default"
          />

          {/* Token Selector Pill */}
          <button
            onClick={() => setIsToModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--brand-accent)]/50 transition-all text-white font-bold text-sm shrink-0 shadow-sm"
          >
            {toToken &&
              (toToken.symbol === 'LIORA' || toToken.symbol === 'OXENIQ' ? (
                <img
                  src={BRAND_CONFIG.assets.logo128}
                  alt="Liora Coin"
                  className="w-6 h-6 rounded-full object-contain shrink-0"
                />
              ) : (
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border border-white/10"
                  style={{ backgroundColor: toToken.iconBg, color: toToken.iconColor }}
                >
                  {toToken.symbol.slice(0, 3)}
                </span>
              ))}
            <span>{toSymbol}</span>
            <ChevronDown className="w-3.5 h-3.5 text-secondary" />
          </button>
        </div>

        <div className="text-right text-xs text-secondary">
          ≈ ${(quote ? quote.toAmount * (toToken ? toToken.priceUsd : 1) : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
        </div>
      </div>

      {/* LIVE EXCHANGE RATE BAR */}
      {quote && (
        <div className="my-3.5 px-3 py-2 rounded-xl bg-[var(--bg-primary)]/80 border border-[var(--border-subtle)] flex items-center justify-between text-xs text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Exchange Rate:</span>
            <span className="text-white font-medium">
              1 {fromSymbol} = {quote.exchangeRate} {toSymbol}
            </span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[var(--brand-accent)] hover:underline flex items-center gap-1"
          >
            <span>{showDetails ? 'Hide Details' : 'Details'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* EXPANDABLE ORDER DETAILS */}
      {showDetails && quote && (
        <div className="mb-4 p-3.5 rounded-xl bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)] space-y-2 text-xs animate-fade-in">
          <div className="flex items-center justify-between text-secondary">
            <span>Minimum Received</span>
            <span className="text-white font-semibold">
              {quote.minimumReceived.toLocaleString(undefined, { maximumFractionDigits: 4 })} {toSymbol}
            </span>
          </div>

          <div className="flex items-center justify-between text-secondary">
            <span>Price Impact</span>
            <span className="text-emerald-400 font-semibold">
              {quote.priceImpactPercent < 0.05 ? '< 0.05%' : `${quote.priceImpactPercent}%`}
            </span>
          </div>

          <div className="flex items-center justify-between text-secondary">
            <span>Network Fee</span>
            <span className="text-white font-semibold">~{quote.estimatedFeeBnb} BNB (${quote.estimatedFeeUsd})</span>
          </div>

          <div className="flex items-center justify-between text-secondary">
            <span>Order Routing</span>
            <span className="text-[var(--brand-accent)] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {quote.routing}
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-secondary">
            <span className="text-amber-300 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Multi-Tier Referral Commission
            </span>
            <span className="text-amber-300 font-semibold">Eligible (Levels 1-3)</span>
          </div>
        </div>
      )}

      {/* PRIMARY ACTION CTA */}
      <div className="mt-2">
        {isInputZeroOrEmpty ? (
          <button
            disabled
            className="w-full py-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary font-bold text-sm cursor-not-allowed opacity-60"
          >
            Enter an Amount
          </button>
        ) : hasInsufficientBalance ? (
          <button
            disabled
            className="w-full py-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-300 font-bold text-sm cursor-not-allowed"
          >
            Insufficient {fromSymbol} Balance
          </button>
        ) : (
          <button
            onClick={handleInitiateSwap}
            className="w-full py-4 rounded-2xl btn-metallic text-white font-extrabold text-base tracking-wide shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 group"
          >
            <span>Exchange Now</span>
            <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
          </button>
        )}
      </div>

      {/* Trust & Non-Custodial Footer */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-secondary">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Non-Custodial
        </span>
        <span>•</span>
        <span>PancakeSwap v3 Router</span>
        <span>•</span>
        <span className="text-amber-400">Simulated Demo</span>
      </div>

      {/* Modals */}
      <TokenSelectorModal
        isOpen={isFromModalOpen}
        onClose={() => setIsFromModalOpen(false)}
        tokens={tokens}
        selectedToken={fromSymbol}
        onSelectToken={(sym) => setFromSymbol(sym)}
        title="Select Token to Send"
      />

      <TokenSelectorModal
        isOpen={isToModalOpen}
        onClose={() => setIsToModalOpen(false)}
        tokens={tokens}
        selectedToken={toSymbol}
        onSelectToken={(sym) => setToSymbol(sym)}
        title="Select Token to Receive"
      />

      {quote && (
        <SwapPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onConfirm={handleConfirmSwap}
          quote={quote}
          isExecuting={isExecuting}
        />
      )}

      <TransactionProgressModal
        isOpen={isProgressOpen}
        onClose={() => setIsProgressOpen(false)}
        tx={executedTx}
      />
    </div>
  );
};

