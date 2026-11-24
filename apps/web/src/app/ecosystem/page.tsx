'use client';

import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ECOSYSTEM_COMPONENTS } from '../../config/ecosystemData';
import { BSC_TESTNET_CONFIG } from '../../config/tokenConfig';
import { Layers, Shield, ArrowUpRight, Cpu, ExternalLink, Copy, Check } from 'lucide-react';

export default function EcosystemPage() {
  const [filter, setFilter] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Token', 'Liquidity', 'Cross-Chain', 'Governance', 'Utility'];

  const filteredComponents = filter === 'All'
    ? ECOSYSTEM_COMPONENTS
    : ECOSYSTEM_COMPONENTS.filter(c => c.category === filter);

  const handleCopy = (address: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(address);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Ecosystem Architecture</h1>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Component Registry</h2>
        <p className="text-secondary text-sm sm:text-base leading-relaxed">
          The Liora Coin ecosystem follows a modular decoupling design. Smart contract token logic, purchase allocations,
          liquidity pools, and cross-chain bridges operate independently to prevent systemic vulnerabilities.
        </p>
      </div>

      {/* Live BSC Testnet Banner */}
      <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <strong className="text-white">BSC Testnet Live Deployment Verified (Chain ID 97)</strong>
            <p className="text-[11px] text-blue-200/80 leading-relaxed">
              Core protocol contracts marked with <span className="text-emerald-400 font-semibold">Live</span> are actively deployed on BNB Smart Chain Testnet. Explorer verification is available on BscScan Testnet.
            </p>
          </div>
        </div>
        <a
          href="https://testnet.bscscan.com"
          target="_blank"
          rel="noreferrer"
          className="btn-metallic px-3 py-1.5 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0"
        >
          <span>BscScan Testnet</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${filter === cat
              ? 'btn-metallic text-white'
              : 'btn-secondary text-secondary hover:text-white'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredComponents.map((comp) => (
          <Card key={comp.id} className="space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary">
                  {comp.chain}
                </span>
                <Badge status={comp.status} />
              </div>
              <h3 className="text-lg font-bold text-white">{comp.name}</h3>
              <p className="text-xs text-secondary leading-relaxed">{comp.description}</p>
            </div>

            {/* Contract Address Bar if deployed */}
            {comp.contractAddress && (
              <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted">Deployed Address (BSC Testnet)</span>
                <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-white">
                  <span className="truncate">{comp.contractAddress}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(comp.contractAddress!, comp.id)}
                      className="p-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-secondary hover:text-white transition-colors cursor-pointer"
                      title="Copy Address"
                    >
                      {copiedId === comp.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <a
                      href={`${BSC_TESTNET_CONFIG.explorerUrl}/address/${comp.contractAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--brand-accent)] transition-colors"
                      title="View on BscScan"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <span className="text-[11px] uppercase font-bold text-muted tracking-wider">Specifications:</span>
              <ul className="space-y-1 text-xs text-secondary">
                {comp.technicalDetails.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[var(--brand-accent)] mt-0.5">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      {/* Industrial Plant Note */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-amber-950/10 space-y-2">
        <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
          <span>⚠️</span> Future Enterprise & Manufacturing Integration Note
        </h4>
        <p className="text-xs text-amber-200/80 leading-relaxed">
          While integration with physical manufacturing operations is a desired milestone on the Liora Coin roadmap,
          the exact business utility and data oracles are currently undecided by project management.
          In accordance with project integrity standards, no unverified operational claims are made.
        </p>
      </div>
    </div>
  );
}
