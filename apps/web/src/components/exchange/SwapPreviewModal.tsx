'use client';

import React from 'react';
import { SwapQuote } from '../../lib/demo/demoTypes';
import { ArrowDown, AlertCircle, ShieldCheck, Zap, Info, X } from 'lucide-react';

interface SwapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quote: SwapQuote;
  isExecuting?: boolean;
}

export const SwapPreviewModal: React.FC<SwapPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  quote,
  isExecuting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-[#101827] border border-[var(--border-prominent)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[var(--brand-accent)]" />
            <h3 className="text-lg font-bold text-white">Review Swap Order</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="p-1.5 rounded-lg text-secondary hover:text-white hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Pair Conversion Display */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary font-medium">You Pay</span>
              <span className="text-xl font-extrabold text-white">
                {quote.fromAmount.toLocaleString()} {quote.fromToken}
              </span>
            </div>

            <div className="flex justify-center -my-1">
              <div className="p-1.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-prominent)] text-[var(--brand-accent)]">
                <ArrowDown className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary font-medium">You Receive (Estimated)</span>
              <span className="text-xl font-extrabold text-emerald-400">
                {quote.toAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
                {quote.toToken}
              </span>
            </div>
          </div>

          {/* Trade Details Breakdown */}
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-secondary">
              <span>Exchange Rate</span>
              <span className="text-white font-medium">
                1 {quote.fromToken} ≈ {quote.exchangeRate} {quote.toToken}
              </span>
            </div>

            <div className="flex items-center justify-between text-secondary">
              <span>Inverse Rate</span>
              <span className="text-white font-medium">
                1 {quote.toToken} ≈ {quote.inverseRate} {quote.fromToken}
              </span>
            </div>

            <div className="flex items-center justify-between text-secondary">
              <span>Minimum Received (after {quote.slippagePercent}% slippage)</span>
              <span className="text-white font-medium">
                {quote.minimumReceived.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
                {quote.toToken}
              </span>
            </div>

            <div className="flex items-center justify-between text-secondary">
              <span>Price Impact</span>
              <span className="text-emerald-400 font-medium">
                {quote.priceImpactPercent < 0.05 ? '< 0.05%' : `${quote.priceImpactPercent}%`}
              </span>
            </div>

            <div className="flex items-center justify-between text-secondary">
              <span>Network Gas Fee</span>
              <span className="text-white font-medium">
                ~{quote.estimatedFeeBnb} BNB (${quote.estimatedFeeUsd})
              </span>
            </div>

            <div className="flex items-center justify-between text-secondary">
              <span>DEX Smart Routing</span>
              <span className="text-[var(--brand-accent)] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {quote.routing}
              </span>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-secondary">
              <span className="text-amber-300 font-medium">Referral Multi-Tier Rewards</span>
              <span className="text-amber-300 font-semibold">Eligible (3 Upline Levels)</span>
            </div>
          </div>

          {/* Non-Custodial Disclaimer */}
          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-200">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Non-Custodial Architecture:</strong> Liora Coin Exchange never holds your private keys.
              Orders route through decentralized liquidity pools. This localhost run uses simulated on-chain responses for demonstration purposes.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="flex-1 py-3 px-4 rounded-xl border border-[var(--border-subtle)] text-secondary font-semibold hover:text-white hover:bg-[var(--bg-elevated)] transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isExecuting}
              className="flex-[2] py-3 px-4 rounded-xl btn-metallic text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
            >
              {isExecuting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting to DEX...</span>
                </>
              ) : (
                <span>Confirm &amp; Swap</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

