'use client';

import React, { useState } from 'react';
import {
  Clock,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Wallet,
  ArrowRight,
  Zap,
  RotateCcw
} from 'lucide-react';
import { useTradingBot } from '../../hooks/useTradingBot';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';

interface BotTrialCountdownCardProps {
  onOpenPlans: () => void;
}

export const BotTrialCountdownCard: React.FC<BotTrialCountdownCardProps> = ({ onOpenPlans }) => {
  const { subscription, accessCheck, startFreeTrial, backendVerified, verifyWalletWithBackend, backendLoading, apiError } = useTradingBot();
  const { isConnected, address, chainName, connect, switchToBscTestnet, isSupportedChain } = useWeb3Wallet();

  const [isActivating, setIsActivating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState(false);

  const handleStartTrial = async () => {
    setActionError(null);
    setIsActivating(true);

    const res = await startFreeTrial();
    setIsActivating(false);
    if (res.success) {
      setActivationSuccess(true);
      setTimeout(() => setActivationSuccess(false), 5000);
    } else {
      setActionError(res.error || 'Failed to activate trial entitlement.');
    }
  };

  const statusBadge = () => {
    switch (accessCheck.status) {
      case 'TRIAL_ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>48-Hour Free Trial Active</span>
          </span>
        );
      case 'ACTIVE_PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pro Paid Subscription Active</span>
          </span>
        );
      case 'TRIAL_EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Free Trial Expired</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Subscription Expired</span>
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/40 text-red-300 border border-red-500/40 text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Session Revoked</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
            <Unlock className="w-3.5 h-3.5" />
            <span>Eligible for 48-Hour Trial</span>
          </span>
        );
    }
  };

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-xl space-y-6">
      {/* Top Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-secondary mb-1">
            Access Entitlement &amp; Authorization
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <span>Bot Subscription Status</span>
          </h2>
        </div>
        <div className="shrink-0">{statusBadge()}</div>
      </div>

      {/* Main Countdown or Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Left Column: Countdown Clock / Expiry Notice */}
        <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between text-xs text-secondary font-medium">
            <span>Remaining Access Duration:</span>
            {accessCheck.expiresAt && (
              <span className="text-[11px] text-muted">
                Expires: {new Date(accessCheck.expiresAt).toLocaleDateString()} {new Date(accessCheck.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-wider text-metallic">
            {accessCheck.hasAccess ? (
              <span className="text-amber-300">{accessCheck.formattedRemaining}</span>
            ) : (
              <span className="text-secondary">{accessCheck.formattedRemaining}</span>
            )}
          </div>

          <p className="text-xs text-secondary leading-relaxed">
            {accessCheck.hasAccess
              ? 'Authorized session active. Quantitative signal alerts from ALGOX V6_1_24 are unlocked in your browser session.'
              : accessCheck.reason || 'Start your 48-hour free trial or subscribe to activate real-time signal monitoring.'}
          </p>
        </div>

        {/* Right Column: Wallet Verification & Action Trigger */}
        <div className="space-y-4">
          {/* Wallet State Pill */}
          <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-secondary flex items-center gap-1.5 font-medium">
                <Wallet className="w-3.5 h-3.5 text-blue-400" />
                <span>Connected Wallet:</span>
              </span>
              {isConnected && address ? (
                <span className="font-mono font-bold text-white">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              ) : (
                <span className="text-amber-400 font-semibold">Not Connected</span>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-secondary">Network Status:</span>
              <span className="text-white font-medium">
                {chainName || 'BNB Smart Chain (#97 / #56)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-secondary">Wallet Authorization:</span>
              {backendVerified ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>SIWE Verified &amp; Bound</span>
                </span>
              ) : isConnected && address ? (
                <button
                  onClick={() => verifyWalletWithBackend()}
                  disabled={backendLoading}
                  className="text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
                >
                  <span>{backendLoading ? 'Verifying...' : 'Sign SIWE Challenge'}</span>
                </button>
              ) : (
                <button
                  onClick={() => connect()}
                  className="text-[var(--brand-accent)] hover:underline font-bold"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>

          {/* Action CTAs based on status */}
          <div>
            {!subscription.trialUsed && accessCheck.status === 'NO_SUBSCRIPTION' && (
              <button
                onClick={handleStartTrial}
                disabled={isActivating}
                className="w-full py-3.5 px-4 rounded-xl btn-metallic font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>{isActivating ? 'Activating 48-Hour Trial...' : 'Start 48-Hour Free Trial'}</span>
              </button>
            )}

            {accessCheck.status === 'TRIAL_ACTIVE' && (
              <div className="space-y-2">
                <button
                  onClick={onOpenPlans}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lock In Paid Subscription Early (From $49/mo)</span>
                </button>
                <div className="text-[11px] text-muted text-center">
                  Trial continues running until expiry even if you review plans.
                </div>
              </div>
            )}

            {(accessCheck.status === 'TRIAL_EXPIRED' ||
              accessCheck.status === 'EXPIRED' ||
              accessCheck.status === 'REVOKED') && (
                <button
                  onClick={onOpenPlans}
                  className="w-full py-3.5 px-4 rounded-xl btn-metallic font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Upgrade / Recharge Subscription</span>
                </button>
              )}

            {accessCheck.status === 'ACTIVE_PAID' && (
              <button
                onClick={onOpenPlans}
                className="w-full py-3 px-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-secondary hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Manage / Extend Subscription Plan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activation Success / Error Alerts */}
      {activationSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Success:</strong> 48-Hour Free Trial activated! Your countdown has started and ALGOX V6_1_24 signal telemetry is unlocked.
          </span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Access Restriction</span>
            <p>{actionError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

