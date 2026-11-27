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
  ExternalLink, 
  CheckCircle2, 
  Lock,
  Globe2,
  Zap,
  Flame,
  Coins
} from 'lucide-react';

export default function HomePage() {
  const { isConnected, chainName } = useWeb3Wallet();

  const brandPillars = [
    'SECURE',
    'NON-CUSTODIAL',
    'DECENTRALIZED',
    'FAST',
    'SCALABLE',
    'GLOBAL'
  ];

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* 1. HERO SECTION */}
      <section className="relative pt-4 pb-12 sm:pt-8 sm:pb-20 text-center flex flex-col items-center">
        {/* Network Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border-prominent)] bg-[var(--bg-elevated)] text-xs text-secondary mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>BNB Smart Chain Mainnet: <strong>Chain ID 56 Verified</strong></span>
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
            className="absolute rounded-full filter blur-2xl opacity-45 pointer-events-none"
            style={{
              width: 260,
              height: 260,
              background: 'radial-gradient(circle, rgba(217,170,74,0.45) 0%, rgba(217,170,74,0.15) 50%, transparent 75%)',
            }}
          />
          {/* Official Medallion with Subtle Hover Lift */}
          <div className="relative z-10 transition-transform duration-500 hover:scale-105 filter drop-shadow-[0_10px_25px_rgba(217,170,74,0.35)]">
            <Image
              src="/assets/liora-logo-512.png"
              alt="LIORA COIN Official Brand Emblem - Powering the Next Digital Era"
              width={200}
              height={200}
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
          Architecting the Future of <span className="text-gradient-gold">Decentralized Value</span>
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

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-secondary max-w-2xl mx-auto leading-relaxed mb-10">
          LIORA is an institutional-grade utility cryptocurrency on BNB Smart Chain, engineered with verified
          OpenZeppelin v5 UUPS upgradeable smart contracts, restricted reserve vault governance, and forward-compatible cross-chain protocols.
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
            href="/auth"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-base border border-[var(--border-prominent)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-primary)] text-white transition-all flex items-center justify-center gap-2"
          >
            <span>Investor Portal</span>
          </Link>
        </div>
      </section>

      {/* 2. CORE ARCHITECTURAL PILLARS (3-Column Grid) */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Core Protocol Foundation</h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-white">Engineered for Transparency &amp; Rigor</h3>
          <p className="text-secondary text-sm">
            Audited cryptographic mechanisms delivering mathematical supply preservation, automated market maker compatibility, and institutional security controls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[var(--brand-accent)]">
              <Coins className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white">100 Billion Fixed Cap</h4>
            <p className="text-secondary text-sm leading-relaxed">
              Supply is mathematically capped at initialization. Zero arbitrary mint functions, zero inflation backdoors. 
              Deflationary token burning is enabled on-chain for all token holders.
            </p>
            <div className="pt-2 text-xs font-mono text-[var(--brand-accent)] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Constructor-Enforced Cap</span>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white">48-Hour Timelock Controller</h4>
            <p className="text-secondary text-sm leading-relaxed">
              All contract logic upgrades and administrative adjustments are gated behind an immutable 48-hour timelock controller 
              governed exclusively by multi-signature governance.
            </p>
            <div className="pt-2 text-xs font-mono text-blue-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>172,800s Enforced Minimum Delay</span>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white">Restricted Reserve Governance</h4>
            <p className="text-secondary text-sm leading-relaxed">
              99 Billion LIORA tokens are locked in the audited Reserve Vault contract. 1 Billion LIORA operates the initial ecosystem treasury, 
              preventing market flooding and preserving long-term stability.
            </p>
            <div className="pt-2 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>99:1 Reserve Isolation</span>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. BNB SMART CHAIN GENESIS INFRASTRUCTURE */}
      <section className="p-8 sm:p-12 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>BLOCKCHAIN VERIFICATION</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-bold text-white">BNB Smart Chain Genesis Infrastructure</h3>
            <p className="text-sm text-secondary leading-relaxed">
              BNB Smart Chain delivers high throughput, rapid block finality (~3 seconds), and fractional gas fees. 
              LIORA smart contracts are deployed and verified on BSC Mainnet conforming strictly to BEP-20 / ERC-20 standards.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-secondary">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">✓</div>
                <span><strong>Zero Transfer Taxes:</strong> 0% fee-on-transfer for 100% AMM router and liquidity pool compatibility.</span>
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

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <Link href="/token" className="btn-metallic px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
                <span>View Full Tokenomics</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://bscscan.com/token/0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl border border-[var(--border-prominent)] bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] text-xs font-mono text-[var(--brand-accent)] inline-flex items-center gap-1.5 transition-colors"
              >
                <span>BscScan Mainnet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border border-[var(--border-accent)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="text-xs uppercase tracking-wider text-muted font-bold">Network Readiness</div>
                <Badge status="Live" />
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
                  <span className="text-emerald-400 font-medium font-mono">Verified On-Chain (Block 135,794,560)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-secondary">Total Fixed Supply</span>
                  <span className="font-semibold text-white">100,000,000,000 LIORA</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-secondary">Prelaunch Benchmark</span>
                  <span className="font-semibold text-[var(--brand-accent)] font-mono">₹0.20 INR (Reference Only)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-secondary">Market Spot Price</span>
                  <span className="text-muted italic">Determined at Open DEX Liquidity Launch</span>
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

      {/* 5. CALL TO ACTION & DOCUMENTATION PORTAL */}
      <section className="p-8 sm:p-12 rounded-3xl border border-[var(--border-prominent)] bg-gradient-to-r from-[#111A2E] via-[#0E1726] to-[#0A101D] text-center space-y-6 shadow-xl">
        <h3 className="text-2xl sm:text-3xl font-bold text-white">Institutional Web3 Engineering</h3>
        <p className="text-sm text-secondary max-w-xl mx-auto">
          Review our comprehensive protocol documentation, smart contract verification artifacts on BscScan, 
          and audited multi-sig timelock governance specifications.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/docs" className="btn-metallic px-6 py-3 rounded-xl text-sm font-semibold">
            Inspect Documentation Portal
          </Link>
          <Link href="/ecosystem" className="btn-secondary px-6 py-3 rounded-xl text-sm font-semibold">
            Explore Ecosystem Components
          </Link>
          <Link href="/auth" className="px-6 py-3 rounded-xl text-sm font-semibold border border-[var(--border-prominent)] text-white bg-[var(--bg-elevated)] hover:bg-[var(--bg-primary)] transition-colors">
            Access Investor Portal
          </Link>
        </div>
      </section>
    </div>
  );
}
