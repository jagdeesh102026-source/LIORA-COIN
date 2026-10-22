'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { ROADMAP_DATA } from '../config/roadmapData';
import { useWeb3Wallet } from '../hooks/useWeb3Wallet';
import { 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Repeat, 
  ExternalLink, 
  CheckCircle2, 
  Lock,
  Globe2,
  Zap,
  Flame
} from 'lucide-react';

export default function HomePage() {
  const { isConnected, chainName } = useWeb3Wallet();

  const brandPillars = [
    'SECURE',
    'DECENTRALIZED',
    'FAST',
    'SCALABLE',
    'GLOBAL'
  ];

  return (
    <div className="space-y-24">
      {/* 1. HERO SECTION */}
      <section className="relative pt-4 pb-12 sm:pt-8 sm:pb-20 text-center flex flex-col items-center">
        {/* Network Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border-prominent)] bg-[var(--bg-elevated)] text-xs text-secondary mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[var(--brand-accent)] animate-ping" />
          <span>Target Network: <strong>BNB Smart Chain (BEP-20)</strong></span>
          {isConnected && (
            <span className="pl-2 border-l border-[var(--border-subtle)] text-[var(--brand-accent)] font-medium">
              Connected: {chainName}
            </span>
          )}
        </div>

        {/* Official Emblem Hero Showcase */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Ambient Multi-Layer Glow */}
          <div 
            className="absolute rounded-full filter blur-2xl opacity-50 pointer-events-none"
            style={{
              width: 280,
              height: 280,
              background: 'radial-gradient(circle, rgba(57,123,255,0.5) 0%, rgba(99,179,255,0.2) 50%, transparent 75%)',
            }}
          />
          {/* Official Medallion with Subtle Hover Lift */}
          <div className="relative z-10 transition-transform duration-500 hover:scale-105 filter drop-shadow-[0_10px_25px_rgba(57,123,255,0.35)]">
            <Image
              src="/assets/oxeniq-logo-512.png"
              alt="OXENIQ Official Brand Emblem - Powering the Next Digital Era"
              width={210}
              height={210}
              priority
              className="object-contain"
            />
          </div>
        </div>

        {/* Brand Tagline Badge */}
        <div className="text-xs uppercase font-extrabold tracking-[0.25em] text-[var(--brand-accent)] mb-4">
          POWERING THE NEXT DIGITAL ERA
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Architecting the Future of <span className="text-gradient-blue">Decentralized Value</span>
        </h1>

        {/* Value Pillars from Logo Rim */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-8 text-xs font-semibold tracking-wider text-secondary">
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

        {/* Honest Subtitle */}
        <p className="text-base sm:text-xl text-secondary max-w-2xl mx-auto leading-relaxed mb-10">
          OXENIQ is an institutional-grade utility cryptocurrency on BNB Smart Chain, engineered with audited 
          OpenZeppelin v5 smart contracts, decoupled purchase allocation, and forward-compatible cross-chain protocols.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            href="/token"
            className="w-full sm:w-auto btn-metallic px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 group shadow-lg"
          >
            <span>Explore Tokenomics</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/swap"
            className="w-full sm:w-auto btn-secondary px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2"
          >
            <span>DEX Swap Terminal</span>
            <Zap className="w-4 h-4 text-[var(--brand-accent)]" />
          </Link>
          <Link
            href="/docs"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-base text-secondary hover:text-white flex items-center justify-center gap-2 transition-colors"
          >
            <span>Whitepaper</span>
            <ExternalLink className="w-4 h-4 text-muted" />
          </Link>
        </div>

        {/* Honest Metrics Strip */}
        <div className="mt-16 w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div className="glass-panel p-4 rounded-xl border border-[var(--border-subtle)]">
            <div className="text-xs text-muted uppercase font-semibold">Standard</div>
            <div className="text-sm font-bold text-white mt-1">BEP-20 / ERC-20</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">BNB Smart Chain Native</div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-[var(--border-subtle)]">
            <div className="text-xs text-muted uppercase font-semibold">Decimals</div>
            <div className="text-sm font-bold text-white mt-1">18 Standard</div>
            <div className="text-[11px] text-secondary mt-0.5">Institutional Precision</div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-[var(--border-subtle)]">
            <div className="text-xs text-muted uppercase font-semibold">Transfer Fee</div>
            <div className="text-sm font-bold text-white mt-1">0% Tax-Free</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">100% AMM Compatible</div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-[var(--border-subtle)]">
            <div className="text-xs text-muted uppercase font-semibold">Supply Model</div>
            <div className="text-sm font-bold text-white mt-1">Fixed & Burnable</div>
            <div className="text-[11px] text-indigo-400 mt-0.5">Zero Post-Launch Mint</div>
          </div>
        </div>
      </section>

      {/* 2. CORE FOUNDATION & PILLARS */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Core Foundation</h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-white">Built for Security, Transparency & Scale</h3>
          <p className="text-secondary text-sm sm:text-base">
            Every layer of OXENIQ is decoupled to eliminate single points of failure and prevent fee-on-transfer conflicts with AMMs and bridges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[var(--brand-accent)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Audited Security Standards</h4>
            <p className="text-xs text-secondary leading-relaxed">
              Implemented with battle-tested OpenZeppelin v5 contracts: Ownable2Step two-phase administration, 
              ERC20Burnable holder burns, and an authorized Pausable circuit breaker.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Zero arbitrary mint backdoors
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Repeat className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Mathematical 70:30 Split</h4>
            <p className="text-xs text-secondary leading-relaxed">
              Token purchase allocation logic is isolated in a dedicated AllocationManager contract using integer-safe math, 
              guaranteeing zero truncation dust without penalizing normal wallet transfers.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-medium text-cyan-400">
              <Lock className="w-4 h-4" /> Decoupled from base transfer path
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Globe2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">TRON & Multi-Chain Vision</h4>
            <p className="text-xs text-secondary leading-relaxed">
              Architected to expand from BNB Smart Chain to TRON and EVM networks via verified cross-chain adapters, 
              separating 1:1 asset transfers from cross-chain AMM swaps.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-medium text-[var(--brand-accent)]">
              <Layers className="w-4 h-4" /> LayerZero v2 OFT candidate
            </div>
          </Card>
        </div>
      </section>

      {/* 3. TECHNOLOGY & CHAIN VERIFICATION */}
      <section className="glass-panel-elevated p-8 sm:p-12 border border-[var(--border-prominent)] rounded-2xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <span className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">
              Network Architecture
            </span>
            <h3 className="text-3xl sm:text-4xl font-bold text-white">BNB Smart Chain Genesis Infrastructure</h3>
            <p className="text-sm text-secondary leading-relaxed">
              BNB Smart Chain delivers high throughput, rapid block finality (~3 seconds), and fractional gas fees. 
              OXENIQ contracts compile to EVM bytecode 0.8.20 and strictly adhere to BEP-20 specifications.
            </p>
            
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-secondary">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">✓</div>
                <span><strong>Zero Transfer Taxes:</strong> Full compatibility with PancakeSwap v2/v3, multisigs, and bridges.</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">✓</div>
                <span><strong>Two-Step Ownership:</strong> Prevents administrative lockout during governance handovers.</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">✓</div>
                <span><strong>Emergency Pause:</strong> Circuit breaker to freeze activity in case of verified security events.</span>
              </div>
            </div>

            <div className="pt-4">
              <Link href="/token" className="btn-metallic px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
                <span>View Full Tokenomics</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border border-[var(--border-accent)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="text-xs uppercase tracking-wider text-muted font-bold">Network Readiness</div>
                <Badge status="In Progress" />
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-secondary">Primary Blockchain</span>
                  <span className="font-semibold text-white">BNB Smart Chain (BSC)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-secondary">Target Chain ID</span>
                  <span className="font-mono text-white">BSC Mainnet (56) / Testnet (97)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-secondary">Contract Status</span>
                  <span className="text-emerald-400 font-medium">Compiled & Unit Tested (26/26)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-secondary">Initial Liquidity Budget</span>
                  <span className="font-semibold text-white">$1,000 USD Seed Reserve</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-secondary">Market Spot Price</span>
                  <span className="text-muted italic">Determined at PancakeSwap Pool Launch</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. ROADMAP SECTION */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Milestone Roadmap</h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-white">Transparent Progression</h3>
          <p className="text-secondary text-sm">
            Milestones are tracked honestly against actual engineering artifacts. No milestone is marked complete without independent code verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROADMAP_DATA.map((milestone) => (
            <Card key={milestone.id} className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-muted">{milestone.quarter}</span>
                  <Badge status={milestone.status} />
                </div>
                <h4 className="text-base font-bold text-white">{milestone.title}</h4>
                <p className="text-xs text-secondary leading-relaxed">{milestone.description}</p>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
                {milestone.deliverables.map((d, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] text-muted">
                    <span className="text-[var(--brand-accent)] shrink-0 mt-0.5">•</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
