'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MobniqExchangeCard } from '../../components/exchange/MobniqExchangeCard';
import { MarketTicker } from '../../components/exchange/MarketTicker';
import { SecurityTrustSection } from '../../components/exchange/SecurityTrustSection';
import { FaqSection } from '../../components/exchange/FaqSection';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import { 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Repeat, 
  ExternalLink, 
  CheckCircle2, 
  Lock, 
  Zap, 
  Users, 
  Sparkles,
  Award
} from 'lucide-react';

export default function ExchangeLandingPage() {
  const { isConnected, chainName } = useWeb3Wallet();

  const brandPillars = [
    'SECURE',
    'NON-CUSTODIAL',
    'PANCAKESWAP ROUTED',
    '3-TIER REWARDS',
    'BNB CHAIN'
  ];

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* 1. HERO SECTION (Mobniq-Style Split Layout) */}
      <section className="relative pt-4 pb-8 sm:pt-10 sm:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Brand Hero & Value Prop (7 cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Network Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border-prominent)] bg-[var(--bg-elevated)] text-xs text-secondary shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Non-Custodial DEX: <strong>BNB Smart Chain (BEP-20)</strong></span>
                {isConnected && (
                  <span className="pl-2 border-l border-[var(--border-subtle)] text-[var(--brand-accent)] font-medium">
                    Connected: {chainName}
                  </span>
                )}
              </div>

              {/* Tagline */}
              <div className="text-xs uppercase font-extrabold tracking-[0.25em] text-[var(--brand-accent)]">
                POWERING THE NEXT DIGITAL ERA
              </div>

              {/* Main Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                Next-Generation <br className="hidden sm:inline" />
                <span className="text-gradient-blue">Crypto Exchange</span> &amp; Rewards
              </h1>

              {/* Brand Value Pillars */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs font-semibold tracking-wider text-secondary">
                {brandPillars.map((pillar, idx) => (
                  <React.Fragment key={pillar}>
                    <span className="px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-slate-300">
                      {pillar}
                    </span>
                    {idx < brandPillars.length - 1 && (
                      <span className="text-[var(--brand-accent)] hidden sm:inline">•</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Exchange digital assets with zero private key custody. Route through deep PancakeSwap liquidity pools and earn dual-currency commissions across a 3-level referral network.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/swap"
                  className="w-full sm:w-auto btn-metallic px-7 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 group shadow-xl"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Trade on DEX Terminal</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/referrals"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-bold text-sm text-secondary hover:text-white hover:border-[var(--brand-accent)] flex items-center justify-center gap-2 transition-all"
                >
                  <Users className="w-4 h-4 text-[var(--brand-accent)]" />
                  <span>3-Level Referral Tree</span>
                </Link>

                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-secondary hover:text-white font-semibold text-sm transition-colors text-center"
                >
                  Dashboard
                </Link>
              </div>

              {/* 4 Protocol Highlights */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-muted uppercase font-bold">Custody</span>
                  <div className="text-xs font-bold text-white mt-0.5">External Only</div>
                  <div className="text-[10px] text-emerald-400 font-medium">Self-Custodial</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-muted uppercase font-bold">Transfer Tax</span>
                  <div className="text-xs font-bold text-white mt-0.5">0% Tax-Free</div>
                  <div className="text-[10px] text-emerald-400 font-medium">AMM Compatible</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-muted uppercase font-bold">Referrals</span>
                  <div className="text-xs font-bold text-white mt-0.5">3 Upline Tiers</div>
                  <div className="text-[10px] text-amber-400 font-medium">5% / 3% / 1%</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-muted uppercase font-bold">Security</span>
                  <div className="text-xs font-bold text-white mt-0.5">OpenZeppelin v5</div>
                  <div className="text-[10px] text-blue-400 font-medium">2-Step Admin</div>
                </div>
              </div>
            </div>

            {/* Right Column: Prominent You Send / You Get Exchange Card (5 cols) */}
            <div className="lg:col-span-5 relative">
              {/* Ambient Glow */}
              <div
                className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(57,123,255,0.4) 0%, rgba(99,179,255,0.15) 60%, transparent 80%)',
                }}
              />
              <MobniqExchangeCard />
            </div>
          </div>
        </div>
      </section>

      {/* 2. MARKET TICKER CAROUSEL */}
      <MarketTicker />

      {/* 3. HOW IT WORKS (3-Step Guide) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-xs uppercase font-extrabold tracking-[0.2em] text-[var(--brand-accent)]">
            Seamless Onboarding
          </h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">How Liora Coin Exchange Operates</h3>
          <p className="text-secondary text-xs sm:text-sm">
            Experience non-custodial crypto swapping and multi-tier rewards in three simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-[var(--brand-accent)] font-extrabold text-sm flex items-center justify-center">
              01
            </div>
            <h4 className="text-lg font-bold text-white">Connect External Wallet</h4>
            <p className="text-xs text-secondary leading-relaxed">
              Connect MetaMask, Trust Wallet, or any Web3 wallet. Link your email/mobile optionally to generate your unique referral code.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-300 font-extrabold text-sm flex items-center justify-center">
              02
            </div>
            <h4 className="text-lg font-bold text-white">Execute Non-Custodial Swap</h4>
            <p className="text-xs text-secondary leading-relaxed">
              Select tokens, review slippage tolerance, and execute. Orders route automatically through PancakeSwap liquidity on BNB Smart Chain.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-300 font-extrabold text-sm flex items-center justify-center">
              03
            </div>
            <h4 className="text-lg font-bold text-white">Earn Multi-Tier Commissions</h4>
            <p className="text-xs text-secondary leading-relaxed">
              Share your link to earn continuous commissions across 3 upline levels in both LIORA and USDT, claimable anytime directly to your wallet.
            </p>
          </div>
        </div>
      </section>

      {/* 4. SECURITY & NON-CUSTODIAL ASSURANCE */}
      <SecurityTrustSection />

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <FaqSection />
    </div>
  );
}
