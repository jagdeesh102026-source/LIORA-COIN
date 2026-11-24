'use client';

import React from 'react';
import { ShieldCheck, Lock, Repeat, Users, Award, Sparkles } from 'lucide-react';

export const SecurityTrustSection: React.FC = () => {
  const pillars = [
    {
      icon: <Lock className="w-6 h-6 text-emerald-400" />,
      title: '100% Non-Custodial',
      desc: 'You maintain absolute control over your private keys. Assets swap directly from and to your connected self-custody Web3 wallet.',
    },
    {
      icon: <Repeat className="w-6 h-6 text-[var(--brand-accent)]" />,
      title: 'PancakeSwap Deep Liquidity',
      desc: 'High-speed automated routing through PancakeSwap v2/v3 liquidity pools on BNB Smart Chain with minimal slippage and sub-second finality.',
    },
    {
      icon: <Users className="w-6 h-6 text-amber-400" />,
      title: '3-Level Referral Rewards',
      desc: 'Earn ongoing commissions in LIORA & USDT across 3 upline tiers every time your network conducts eligible swaps or purchases.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-400" />,
      title: 'Audited Smart Contracts',
      desc: 'Built strictly with OpenZeppelin v5 libraries, 2-step administrative access, integer-safe arithmetic, and emergency circuit breakers.',
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border-prominent)] bg-[var(--bg-elevated)] text-xs text-[var(--brand-accent)] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ENTERPRISE-GRADE ARCHITECTURE</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Designed for Security, Speed &amp; Non-Custodial Freedom
          </h2>
          <p className="text-secondary text-sm sm:text-base leading-relaxed">
            Liora Coin Exchange combines the transparency of automated market makers with an institutional multi-tier referral distribution engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((p, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--brand-accent)]/40 transition-all hover:-translate-y-1 shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-prominent)] flex items-center justify-center mb-4">
                {p.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
              <p className="text-xs text-secondary leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

