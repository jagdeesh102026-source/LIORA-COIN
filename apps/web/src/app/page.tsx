'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '../components/Logo';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { TOKEN_CONFIG } from '../config/tokenConfig';
import { ROADMAP_DATA } from '../config/roadmapData';
import { useWeb3Wallet } from '../hooks/useWeb3Wallet';
import { 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Repeat, 
  ExternalLink, 
  Coins, 
  Activity, 
  CheckCircle2, 
  Lock,
  Cpu,
  Globe2
} from 'lucide-react';

export default function HomePage() {
  const { isConnected, chainName, isBscTestnet, isBscMainnet } = useWeb3Wallet();

  return (
    <div className="space-y-24">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 pb-12 sm:pt-12 sm:pb-20 text-center flex flex-col items-center">
        {/* Network Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-prominent)] bg-[var(--bg-elevated)] text-xs text-secondary mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[var(--brand-accent)] animate-ping" />
          <span>Primary Target: <strong>BNB Smart Chain (BEP-20)</strong></span>
          {isConnected && (
            <span className="pl-2 border-l border-[var(--border-subtle)] text-[var(--brand-accent)]">
              Connected: {chainName}
            </span>
          )}
        </div>

        {/* Brand Tagline Badge */}
        <div className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)] mb-4">
          POWERING THE NEXT DIGITAL ERA
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Architecting the Future of <span className="text-gradient-blue">Decentralized Value</span>
        </h1>

        {/* Honest Subtitle */}
        <p className="text-base sm:text-xl text-secondary max-w-2xl mx-auto leading-relaxed mb-10">
          OXENIQ is a market-priced digital utility ecosystem on BNB Smart Chain, engineered with audited 
          OpenZeppelin v5 smart contracts, decoupled purchase allocation, and forward-compatible cross-chain protocols.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            href="/token"
            className="w-full sm:w-auto btn-metallic px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 group shadow-lg"
          >
            <span>Explore OXENIQ</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/docs"
            className="w-full sm:w-auto btn-secondary px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2"
          >
            <span>View Architecture Docs</span>
            <ExternalLink className="w-4 h-4 text-muted" />
          </Link>
        </div>

        {/* Honest Status Strip */}
        <div className="mt-16 w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div className="glass-panel p-4 rounded-xl border border-[var(--border-subtle)]">
            <div className="text-xs text-muted uppercase font-semibold">Standard</div>
            <div className="text-sm font-bold text-white mt-1">BEP-20 / ERC-20</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">BSC Compatible</div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-[var(--border-subtle)]">
            <div className="text-xs text-muted uppercase font-semibold">Decimals</div>
            <div className="text-sm font-bold text-white mt-1">18 Standard</div>
            <div className="text-[11px] text-secondary mt-0.5">High Precision</div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-[var(--border-subtle)]">
            <div className="text-xs text-muted uppercase font-semibold">Allocation Model</div>
            <div className="text-sm font-bold text-white mt-1">70:30 Ratio</div>
            <div className="text-[11px] text-amber-400 mt-0.5">Provisional Split</div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-[var(--border-subtle)]">
            <div className="text-xs text-muted uppercase font-semibold">Initial Liquidity</div>
            <div className="text-sm font-bold text-white mt-1">$1,000 USD</div>
            <div className="text-[11px] text-secondary mt-0.5">Seed Reserve Budget</div>
          </div>
        </div>
      </section>

      {/* 2. PROJECT OVERVIEW & ARCHITECTURAL PILLARS */}
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
            <div className="pt-2 flex items-center gap-2 text-xs font-medium text-amber-400">
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
              <Layers className="w-4 h-4" /> LayerZero OFT / CCIP candidate
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
            <h3 className="text-3xl sm:text-4xl font-bold text-white">BNB Smart Chain Initial Infrastructure</h3>
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
                <span>View Contract Parameters</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border border-[var(--border-accent)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="text-xs uppercase tracking-wider text-muted font-bold">Network Status</div>
                <Badge status="In Development" />
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-secondary">Primary Chain</span>
                  <span className="font-semibold text-white">BNB Smart Chain</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-secondary">Chain IDs</span>
                  <span className="font-mono text-white">Testnet (97) / Mainnet (56)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-secondary">Contract Status</span>
                  <span className="text-amber-400 font-medium">Compiled & Testnet Ready</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-secondary">Mainnet Deployment</span>
                  <span className="text-secondary">Awaiting Management Sign-off</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-secondary">Market Price</span>
                  <span className="text-muted italic">Pending Initial $1,000 Pool</span>
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

      {/* 5. CALL TO ACTION & OPEN DECISIONS BANNER */}
      <section className="glass-panel p-8 sm:p-12 rounded-2xl border border-[var(--border-prominent)] text-center space-y-6">
        <h3 className="text-2xl sm:text-3xl font-bold text-white">Institutional Web3 Engineering</h3>
        <p className="text-sm text-secondary max-w-xl mx-auto">
          Review our comprehensive documentation, smart contract test suite, and open management decision matrix 
          governing token supply, liquidity, and governance.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/docs" className="btn-metallic px-6 py-3 rounded-xl text-sm font-semibold">
            Inspect Documentation Portal
          </Link>
          <Link href="/ecosystem" className="btn-secondary px-6 py-3 rounded-xl text-sm font-semibold">
            Explore Ecosystem Components
          </Link>
        </div>
      </section>
    </div>
  );
}
