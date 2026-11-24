'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Settings, 
  Users, 
  Clock, 
  Check, 
  X, 
  RotateCcw, 
  Lock, 
  Unlock,
  AlertTriangle,
  Sliders
} from 'lucide-react';
import { useTradingBot } from '../../hooks/useTradingBot';
import { botStore } from '../../lib/bot/botStore';

interface BotAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BotAdminModal: React.FC<BotAdminModalProps> = ({ isOpen, onClose }) => {
  const { adminConfig, adminSetTrialDuration, adminExtendSubscription, resetToDefaults } = useTradingBot();

  const [trialHoursInput, setTrialHoursInput] = useState<number>(adminConfig.trialDurationHours);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [targetUserId, setTargetUserId] = useState('usr_demo_active_01');
  const [extendDays, setExtendDays] = useState(30);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const allSubs = botStore.getAllSubscriptions();

  const handleSaveTrialDuration = (e: React.FormEvent) => {
    e.preventDefault();
    adminSetTrialDuration(trialHoursInput);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRevoke = (userId: string) => {
    botStore.revokeSession(userId, 'Revoked by Admin in console');
    setActionNotice(`Access immediately revoked for user ${userId}.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleExtend = () => {
    const success = adminExtendSubscription(targetUserId, extendDays);
    if (success) {
      setActionNotice(`Extended access for ${targetUserId} by ${extendDays} days.`);
    } else {
      setActionNotice(`User ${targetUserId} not found.`);
    }
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleReset = () => {
    if (window.confirm('Reset all bot subscriptions and trial states back to initial seed defaults?')) {
      resetToDefaults();
      setActionNotice('Bot store reset to original seed defaults.');
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="max-w-3xl w-full my-8 p-6 sm:p-8 rounded-3xl bg-[#0F172A] border border-[var(--border-prominent)] shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bot Subscription Administration</h3>
              <p className="text-xs text-secondary">Control trial periods, review subscribers, and manage active sessions.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Trial Configuration Form */}
        <form onSubmit={handleSaveTrialDuration} className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Free Trial Duration Parameter</span>
            </span>
            <span className="text-xs font-mono text-secondary">Current: {adminConfig.trialDurationHours} Hours</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                min="1"
                max="720"
                value={trialHoursInput}
                onChange={(e) => setTrialHoursInput(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm font-mono text-white focus:outline-none focus:border-[var(--brand-accent)]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">Hours</span>
            </div>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl btn-metallic text-xs font-bold text-white shadow-md cursor-pointer shrink-0"
            >
              Update Trial Hours
            </button>
          </div>

          {saveSuccess && (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
              <Check className="w-4 h-4" />
              <span>Trial duration parameter saved successfully!</span>
            </div>
          )}
        </form>

        {/* User Manual Extension / Revocation */}
        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-4">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Manual User Entitlement Override</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-secondary block mb-1">Target User ID</label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white font-mono text-xs focus:outline-none"
              >
                {allSubs.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    @{s.username} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-secondary block mb-1">Additional Days</label>
              <input
                type="number"
                min="1"
                max="365"
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleExtend}
                className="flex-1 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold text-xs"
              >
                Extend Days
              </button>
              <button
                type="button"
                onClick={() => handleRevoke(targetUserId)}
                className="flex-1 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-bold text-xs"
              >
                Revoke Now
              </button>
            </div>
          </div>
        </div>

        {/* Active Subscribers List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-secondary font-bold uppercase tracking-wider">
            <span>Subscriber Accounts ({allSubs.length})</span>
            <button
              onClick={handleReset}
              className="text-rose-400 hover:underline flex items-center gap-1 font-semibold normal-case"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Bot Store</span>
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-[var(--border-subtle)]/40 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-2">
            {allSubs.map((sub) => (
              <div key={sub.userId} className="p-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>@{sub.username}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {sub.planId}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-secondary">
                    {sub.walletAddress ? `${sub.walletAddress.slice(0, 8)}...${sub.walletAddress.slice(-6)}` : 'No wallet linked'}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    sub.status === 'TRIAL_ACTIVE' || sub.status === 'ACTIVE_PAID'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {sub.status}
                  </span>
                  <div className="text-[10px] text-muted">
                    {sub.trialExpiresAt ? `Expires: ${new Date(sub.trialExpiresAt).toLocaleDateString()}` : 'No expiry'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {actionNotice && (
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>
    </div>
  );
};

