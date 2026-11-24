'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Bot, 
  Activity, 
  BarChart3, 
  Sparkles, 
  ShieldAlert, 
  Settings, 
  Lock, 
  Unlock, 
  ArrowRight,
  TrendingUp,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { PREVIEW_CONFIG } from '../../config/previewConfig';
import { BotOverviewCard } from '../../components/bot/BotOverviewCard';
import { BotTrialCountdownCard } from '../../components/bot/BotTrialCountdownCard';
import { BotSignalHistoryPanel } from '../../components/bot/BotSignalHistoryPanel';
import { BotPaperTradingPanel } from '../../components/bot/BotPaperTradingPanel';
import { BotSubscriptionSection } from '../../components/bot/BotSubscriptionSection';
import { BotRiskDisclosure } from '../../components/bot/BotRiskDisclosure';
import { BotAdminModal } from '../../components/bot/BotAdminModal';
import { useDemoStore } from '../../lib/demo/useDemoStore';
import { useTradingBot } from '../../hooks/useTradingBot';

export default function TradingBotPage() {
  const { activeUser } = useDemoStore();
  const { accessCheck } = useTradingBot();

  const [activeTab, setActiveTab] = useState<'signals' | 'analytics' | 'plans'>('signals');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  const isAdmin = activeUser?.role === 'ADMIN' || activeUser?.username === 'admin_dan';

  if (PREVIEW_CONFIG.hideTradingBot) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 space-y-6 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-mono font-bold text-purple-300 uppercase">
              Confidential Proprietary Technology
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Trading Bot Strategy Protected Under NDA
            </h1>
            <p className="text-secondary text-sm max-w-xl mx-auto leading-relaxed">
              {PREVIEW_CONFIG.tradingBotRestrictedNotice}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-secondary text-left space-y-2.5 font-mono">
            <div className="text-amber-300 font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Review Guardrails Active:</span>
            </div>
            <div>• Proprietary Pine Script v5 Strategy logic isolated on TradingView servers.</div>
            <div>• Webhook alert endpoints and signal ingestion disabled during remote review.</div>
            <div>• Non-custodial DEX exchange functionality remains active in demo mode.</div>
          </div>
          <div className="pt-2">
            <Link 
              href="/swap" 
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl btn-metallic text-xs font-bold text-white shadow-lg hover:opacity-95 transition-all"
            >
              <span>Return to DEX Swap Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto py-6 sm:py-8">
      {/* 1. Bot Overview Banner */}
      <BotOverviewCard />

      {/* 2. Trial Countdown & Subscription Authorization Card */}
      <BotTrialCountdownCard onOpenPlans={() => setIsPlansModalOpen(true)} />

      {/* 3. Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('signals')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'signals'
                ? 'btn-metallic text-white shadow-md'
                : 'bg-[var(--bg-elevated)] text-secondary hover:text-white border border-[var(--border-subtle)]'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>ALGOX V6_1_24 Signals</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'analytics'
                ? 'btn-metallic text-white shadow-md'
                : 'bg-[var(--bg-elevated)] text-secondary hover:text-white border border-[var(--border-subtle)]'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Paper-Trading Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'plans'
                ? 'btn-metallic text-white shadow-md'
                : 'bg-[var(--bg-elevated)] text-secondary hover:text-white border border-[var(--border-subtle)]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Subscription Plans</span>
          </button>
        </div>

        {/* Admin Management Button */}
        <button
          onClick={() => setIsAdminModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-primary)] border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Admin Plan Settings</span>
          {isAdmin && (
            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[9px] font-black uppercase">
              Admin
            </span>
          )}
        </button>
      </div>

      {/* 4. Tab Views */}
      {activeTab === 'signals' && (
        <div className="space-y-8 animate-fade-in">
          <BotSignalHistoryPanel onUnlockClick={() => setIsPlansModalOpen(true)} />
          <BotPaperTradingPanel />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fade-in">
          <BotPaperTradingPanel />
          <BotSignalHistoryPanel onUnlockClick={() => setIsPlansModalOpen(true)} />
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="animate-fade-in">
          <BotSubscriptionSection />
        </div>
      )}

      {/* 5. Mandatory High-Risk Disclosure */}
      <BotRiskDisclosure />

      {/* Subscription Plans Modal (when triggered from Countdown Card) */}
      <BotSubscriptionSection
        isModal={true}
        isOpen={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
      />

      {/* Admin Management Modal */}
      <BotAdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </div>
  );
}

