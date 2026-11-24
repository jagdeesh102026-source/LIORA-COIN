'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDemoStore } from '../../lib/demo/useDemoStore';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import {
  Users,
  Share2,
  Copy,
  Check,
  Sparkles,
  Award,
  TrendingUp,
  ShieldCheck,
  Layers,
  PlusCircle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export default function ReferralsPage() {
  const { activeUser, referralSummaries, simulateNewDownline } = useDemoStore();
  const { isAuthorized, isInitialized } = useRequireAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<'ALL' | 1 | 2 | 3>('ALL');

  if (!isInitialized || !activeUser) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--brand-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-secondary">Authenticating referral tree...</p>
      </div>
    );
  }

  const refCode = activeUser?.referralCode || 'OX-789421';
  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auth?ref=${refCode}`
    : `https://lioracoin.exchange/auth?ref=${refCode}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSimulate = (lvl: 1 | 2 | 3) => {
    setSimulating(true);
    setTimeout(() => {
      simulateNewDownline(lvl);
      setSimulating(false);
    }, 400);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#172033] via-[#0F1728] to-[#0A101D] border border-[var(--border-prominent)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>3-TIER MULTI-LEVEL COMMISSION SYSTEM</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
            Referral Network &amp; Rewards
          </h1>
          <p className="text-xs sm:text-sm text-secondary max-w-2xl leading-relaxed">
            Share your unique referral link to build an active downline network. Earn dual-currency commissions in both LIORA and USDT whenever your network swaps or purchases.
          </p>
        </div>

        {/* Sponsor Assignment Card */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs space-y-1.5 shrink-0">
          <span className="text-secondary font-medium">Your Direct Sponsor (Upline)</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <strong className="font-mono text-white text-sm">
              {activeUser?.sponsorCode || 'OX-MASTER7'}
            </strong>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold text-[10px]">
              Level 1 Upline
            </span>
          </div>
        </div>
      </div>

      {/* Share Link & Referral ID Card */}
      <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-accent)]/40 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Referral Link */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-secondary flex items-center justify-between">
            <span>Your Exclusive Referral Link</span>
            <span className="text-[var(--brand-accent)]">Share with traders &amp; partners</span>
          </label>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="w-full bg-transparent text-xs font-mono text-slate-300 focus:outline-none px-2"
            />
            <button
              onClick={copyUrl}
              className="px-3.5 py-2 rounded-lg btn-metallic text-white text-xs font-bold shrink-0 flex items-center gap-1.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Referral ID & Quick Stats */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-4">
          <div className="space-y-1 text-left md:text-right">
            <span className="text-xs text-secondary font-medium">Your Referral Code</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-mono text-[var(--brand-accent)]">{refCode}</span>
              <button
                onClick={copyCode}
                className="p-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-secondary hover:text-white"
                title="Copy code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Link
            href="/commissions"
            className="px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 font-bold text-xs flex items-center gap-2 transition-all"
          >
            <Award className="w-4 h-4" />
            <span>View Commission Ledger</span>
          </Link>
        </div>
      </div>

      {/* 3-Level Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Level 1: Direct Referrals */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#15233C] to-[#0E1728] border border-blue-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-[var(--brand-accent)] font-bold text-xs flex items-center justify-center">
                L1
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Direct Referrals</h3>
                <span className="text-[11px] text-blue-300 font-semibold">5.0% Commission Rate</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold">
              Tier 1
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <span className="text-[11px] text-secondary">Active Members</span>
              <div className="text-xl font-extrabold text-white">{referralSummaries.level1.memberCount}</div>
            </div>
            <div>
              <span className="text-[11px] text-secondary">Network Volume</span>
              <div className="text-xl font-extrabold text-white">
                ${referralSummaries.level1.totalVolumeUsd.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-primary)]/80 border border-[var(--border-subtle)] space-y-1 text-xs">
            <div className="flex items-center justify-between text-secondary">
              <span>Earned in LIORA:</span>
              <strong className="text-[var(--brand-accent)]">{referralSummaries.level1.earnedOxeniq.toLocaleString()}</strong>
            </div>
            <div className="flex items-center justify-between text-secondary">
              <span>Earned in USDT:</span>
              <strong className="text-emerald-400">${referralSummaries.level1.earnedUsdt.toLocaleString()}</strong>
            </div>
          </div>

          <button
            onClick={() => handleSimulate(1)}
            disabled={simulating}
            className="w-full py-2 px-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Simulate Level 1 Referral (Demo)</span>
          </button>
        </div>

        {/* Level 2: Sub-Referrals */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#1D1B36] to-[#0E1728] border border-purple-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center">
                L2
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Sub-Referrals</h3>
                <span className="text-[11px] text-purple-300 font-semibold">3.0% Commission Rate</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold">
              Tier 2
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <span className="text-[11px] text-secondary">Active Members</span>
              <div className="text-xl font-extrabold text-white">{referralSummaries.level2.memberCount}</div>
            </div>
            <div>
              <span className="text-[11px] text-secondary">Network Volume</span>
              <div className="text-xl font-extrabold text-white">
                ${referralSummaries.level2.totalVolumeUsd.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-primary)]/80 border border-[var(--border-subtle)] space-y-1 text-xs">
            <div className="flex items-center justify-between text-secondary">
              <span>Earned in LIORA:</span>
              <strong className="text-[var(--brand-accent)]">{referralSummaries.level2.earnedOxeniq.toLocaleString()}</strong>
            </div>
            <div className="flex items-center justify-between text-secondary">
              <span>Earned in USDT:</span>
              <strong className="text-emerald-400">${referralSummaries.level2.earnedUsdt.toLocaleString()}</strong>
            </div>
          </div>

          <button
            onClick={() => handleSimulate(2)}
            disabled={simulating}
            className="w-full py-2 px-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Simulate Level 2 Referral (Demo)</span>
          </button>
        </div>

        {/* Level 3: Extended Network */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-[#1C2321] to-[#0E1728] border border-emerald-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center">
                L3
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Extended Network</h3>
                <span className="text-[11px] text-emerald-300 font-semibold">1.0% Commission Rate</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              Tier 3
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <span className="text-[11px] text-secondary">Active Members</span>
              <div className="text-xl font-extrabold text-white">{referralSummaries.level3.memberCount}</div>
            </div>
            <div>
              <span className="text-[11px] text-secondary">Network Volume</span>
              <div className="text-xl font-extrabold text-white">
                ${referralSummaries.level3.totalVolumeUsd.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-primary)]/80 border border-[var(--border-subtle)] space-y-1 text-xs">
            <div className="flex items-center justify-between text-secondary">
              <span>Earned in LIORA:</span>
              <strong className="text-[var(--brand-accent)]">{referralSummaries.level3.earnedOxeniq.toLocaleString()}</strong>
            </div>
            <div className="flex items-center justify-between text-secondary">
              <span>Earned in USDT:</span>
              <strong className="text-emerald-400">${referralSummaries.level3.earnedUsdt.toLocaleString()}</strong>
            </div>
          </div>

          <button
            onClick={() => handleSimulate(3)}
            disabled={simulating}
            className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Simulate Level 3 Referral (Demo)</span>
          </button>
        </div>
      </div>

      {/* Network Architecture Demonstration Info */}
      <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-[var(--brand-accent)]" />
          <span>How Commission Cascades Work on Liora Coin Exchange</span>
        </h3>
        <p className="text-xs sm:text-sm text-secondary leading-relaxed">
          Every time a downline member initiates an eligible exchange or token purchase on BNB Smart Chain, our protocol checks their upline lineage:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-blue-400 font-bold">1. Immediate Sponsor (Level 1)</span>
            <p className="text-secondary">
              Receives 5.0% commission of the trade volume credited instantly to pending balance.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-purple-400 font-bold">2. Second-Degree Sponsor (Level 2)</span>
            <p className="text-secondary">
              Receives 3.0% commission of the trade volume, incentivizing multi-tier ecosystem expansion.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-emerald-400 font-bold">3. Third-Degree Sponsor (Level 3)</span>
            <p className="text-secondary">
              Receives 1.0% commission of the trade volume, rewarding long-term community leaders.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

