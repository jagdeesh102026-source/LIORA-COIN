'use client';

import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ECOSYSTEM_COMPONENTS } from '../../config/ecosystemData';
import { Layers, Shield, ArrowUpRight, Cpu } from 'lucide-react';

export default function EcosystemPage() {
  const [filter, setFilter] = useState<string>('All');

  const categories = ['All', 'Token', 'Liquidity', 'Cross-Chain', 'Governance', 'Utility'];

  const filteredComponents = filter === 'All' 
    ? ECOSYSTEM_COMPONENTS 
    : ECOSYSTEM_COMPONENTS.filter(c => c.category === filter);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Ecosystem Architecture</h1>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Component Registry</h2>
        <p className="text-secondary text-sm sm:text-base leading-relaxed">
          The OXENIQ ecosystem follows a modular decoupling design. Smart contract token logic, purchase allocations, 
          liquidity pools, and cross-chain bridges operate independently to prevent systemic vulnerabilities.
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === cat
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
          While integration with physical manufacturing operations is a desired milestone on the OXENIQ roadmap, 
          the exact business utility and data oracles are currently undecided by project management. 
          In accordance with project integrity standards, no unverified operational claims are made.
        </p>
      </div>
    </div>
  );
}
