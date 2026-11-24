'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  Wallet, 
  ShieldCheck, 
  AlertCircle, 
  Zap, 
  ArrowRight,
  X
} from 'lucide-react';
import { useTradingBot } from '../../hooks/useTradingBot';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import { SubscriptionPlan, SubscriptionPlanId } from '../../lib/bot/botTypes';

interface BotSubscriptionSectionProps {
  isOpen?: boolean;
  onClose?: () => void;
  isModal?: boolean;
}

export const BotSubscriptionSection: React.FC<BotSubscriptionSectionProps> = ({
  isOpen = true,
  onClose,
  isModal = false,
}) => {
  const { plans, adminConfig, subscribePlan } = useTradingBot();
  const { isConnected, address, connect } = useWeb3Wallet();

  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('PLAN_QUARTERLY');
  const [paymentToken, setPaymentToken] = useState<'USDT' | 'LIORA'>('USDT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isModal && !isOpen) return null;

  const paidPlans = plans.filter((p) => p.id !== 'TRIAL_48H');
  const activePlan = plans.find((p) => p.id === selectedPlanId) || paidPlans[0];

  const handleSubscribe = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isConnected || !address) {
      connect();
      return;
    }

    setIsProcessing(true);
    try {
      const res = await subscribePlan(selectedPlanId, paymentToken);
      setIsProcessing(false);

      if (res.success) {
        setSuccessMessage(
          `Successfully subscribed to ${activePlan.name}! Your bot session is authorized for ${activePlan.durationDays} days.`
        );
        setTimeout(() => {
          setSuccessMessage(null);
          if (onClose) onClose();
        }, 4000);
      } else {
        setErrorMessage(res.error || 'Failed to process subscription payment.');
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Payment processing failed');
    }
  };

  const content = (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PREMIUM TRADING PLANS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Choose Your Subscription Tier
          </h2>
          <p className="text-secondary text-xs sm:text-sm">
            Self-custodial payment via BNB Smart Chain in USDT or Liora Coin (LIORA). No automated recurring card charges.
          </p>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {paidPlans.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-5 ${
                isSelected
                  ? 'bg-gradient-to-b from-[#1C2338] to-[#121A2C] border-amber-400/80 shadow-2xl scale-[1.02]'
                  : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--brand-accent)]/50'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                  Most Popular
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-white text-lg">{plan.name}</h3>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-amber-400 bg-amber-400 text-black' : 'border-secondary'}`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white">${plan.priceUsd}</span>
                    <span className="text-xs text-secondary font-medium">USD</span>
                  </div>
                  <div className="text-xs text-amber-300 font-medium">
                    or {plan.priceLiora.toLocaleString()} LIORA / {plan.priceUsdt} USDT
                  </div>
                  <div className="text-[11px] text-muted">{plan.billingPeriodLabel}</div>
                </div>

                <ul className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]/70 text-xs text-secondary">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlanId(plan.id);
                }}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isSelected
                    ? 'btn-metallic text-white shadow-md'
                    : 'bg-[var(--bg-primary)] text-secondary hover:text-white border border-[var(--border-subtle)]'
                }`}
              >
                {isSelected ? 'Selected Tier' : 'Select Tier'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment Configuration Card */}
      <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Select Payment Currency &amp; Authorize</span>
            </h3>
            <p className="text-xs text-secondary">
              Payments execute on BNB Smart Chain directly to protocol treasury with instant cryptographic validation.
            </p>
          </div>

          {/* Currency Toggle */}
          <div className="p-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center shrink-0">
            <button
              onClick={() => setPaymentToken('USDT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                paymentToken === 'USDT'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-secondary hover:text-white'
              }`}
            >
              USDT (BEP-20)
            </button>
            <button
              onClick={() => setPaymentToken('LIORA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                paymentToken === 'LIORA'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-secondary hover:text-white'
              }`}
            >
              LIORA Coin
            </button>
          </div>
        </div>

        {/* Selected Plan Summary & Order Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-secondary font-medium">Selected Plan:</span>
            <div className="text-white font-bold text-sm">{activePlan.name}</div>
            <div className="text-[11px] text-muted">{activePlan.durationDays} Days Unrestricted Telemetry</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-secondary font-medium">Amount Due:</span>
            <div className="text-amber-300 font-extrabold text-sm">
              {paymentToken === 'USDT'
                ? `${activePlan.priceUsdt} USDT`
                : `${activePlan.priceLiora.toLocaleString()} LIORA`}
            </div>
            <div className="text-[11px] text-muted">Fixed protocol price ($0.05 / LIORA benchmark)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-secondary font-medium">Target Network:</span>
            <div className="text-white font-bold text-sm">{adminConfig.paymentNetwork}</div>
            <div className="text-[11px] font-mono text-muted truncate" title={adminConfig.paymentTreasuryAddress}>
              Treasury: {adminConfig.paymentTreasuryAddress.slice(0, 8)}...{adminConfig.paymentTreasuryAddress.slice(-6)}
            </div>
          </div>
        </div>

        {/* Payment Action Button */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleSubscribe}
            disabled={isProcessing}
            className="w-full py-4 px-6 rounded-2xl btn-metallic font-bold text-sm text-white flex items-center justify-center gap-2 shadow-xl hover:opacity-95 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>
              {isProcessing
                ? 'Confirming Wallet Authorization...'
                : !isConnected
                ? 'Connect Wallet to Subscribe'
                : `Authorize Subscription (${paymentToken === 'USDT' ? `${activePlan.priceUsdt} USDT` : `${activePlan.priceLiora.toLocaleString()} LIORA`})`}
            </span>
          </button>

          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-2 text-xs text-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Demonstration Notice:</strong> In this localhost environment, wallet subscription triggers staged authorization and updates your reactive session store without broadcasting live mainnet transactions.
            </p>
          </div>
        </div>

        {/* Success / Error Banners */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
        <div className="max-w-4xl w-full my-8 p-6 sm:p-8 rounded-3xl bg-[#0B1120] border border-[var(--border-prominent)] shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

