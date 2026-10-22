'use client';

import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { TOKEN_CONFIG } from '../../config/tokenConfig';
import { Copy, Check, ExternalLink, ShieldCheck, AlertTriangle, Layers, Info } from 'lucide-react';

export default function TokenPage() {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const localChain = TOKEN_CONFIG.supportedChains.find(c => c.id === 31337);
  const testnetChain = TOKEN_CONFIG.supportedChains.find(c => c.id === 97);
  const mainnetChain = TOKEN_CONFIG.supportedChains.find(c => c.id === 56);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Token Specifications</h1>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white">OXENIQ Token Architecture</h2>
        <p className="text-secondary text-sm sm:text-base leading-relaxed">
          Technical metrics, verified contract parameters, and network deployment statuses for the OXENIQ ecosystem.
        </p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Token Name</span>
          <div className="text-xl font-bold text-white">{TOKEN_CONFIG.name}</div>
          <span className="text-xs text-secondary">Verified Identifier</span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Ticker Symbol</span>
          <div className="text-xl font-bold text-white">{TOKEN_CONFIG.symbol}</div>
          <span className="text-xs text-secondary">Provisional Subject to Confirmation</span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Standard & Decimals</span>
          <div className="text-xl font-bold text-white">BEP-20 (18 Decimals)</div>
          <span className="text-xs text-emerald-400">BNB Smart Chain Native</span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Category</span>
          <div className="text-xl font-bold text-white">Market-Priced</div>
          <span className="text-xs text-secondary">Not a USD-pegged stablecoin</span>
        </Card>
      </div>

      {/* Deployment Environments Table */}
      <Card className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-lg font-bold text-white">Deployment Environments & Addresses</h3>
            <p className="text-xs text-secondary">Honest distinction between local testnet, public testnet, and mainnet states.</p>
          </div>
          <Badge status="In Development" />
        </div>

        <div className="space-y-4 text-sm">
          {/* 1. Local Hardhat */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Local Hardhat Devnet (Chain ID 31337)</span>
              <span className="text-xs text-muted font-mono">Local Dev Only</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <span className="text-xs text-secondary font-mono break-all">{localChain?.contractAddress}</span>
              {localChain?.contractAddress && (
                <button
                  onClick={() => handleCopy(localChain.contractAddress!)}
                  className="px-2.5 py-1 text-xs rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-secondary hover:text-white flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  {copiedAddress === localChain.contractAddress ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Dev Address</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 2. BSC Testnet */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">BNB Smart Chain Testnet (Chain ID 97)</span>
              <Badge status="Planned" size="sm" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-secondary italic">
                Ready for deployment via `npm run deploy:bscTestnet` with funded deployer key.
              </span>
              <a
                href={testnetChain?.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>BscScan Testnet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 3. BSC Mainnet */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">BNB Smart Chain Mainnet (Chain ID 56)</span>
              <span className="text-xs text-red-400 font-semibold">Deployment Blocked</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed pt-1">
              Mainnet deployment remains strictly blocked pending managerial approval of token supply (DEC-01), 
              70:30 allocation semantics (DEC-03), and $1,000 liquidity parameters (DEC-05).
            </p>
          </div>
        </div>
      </Card>

      {/* Contract Architecture Details */}
      <Card className="space-y-4">
        <h3 className="text-base font-bold text-white">Smart Contract Guardrails</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-secondary">
          <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
            <span className="font-bold text-white">Zero Transfer Fees</span>
            <p className="leading-relaxed">Base BEP-20 transfer path has 0% tax, ensuring flawless compatibility with PancakeSwap v2/v3 and vaults.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
            <span className="font-bold text-white">Ownable2Step Governance</span>
            <p className="leading-relaxed">Two-phase ownership transfer prevents accidental administrator lockout.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
            <span className="font-bold text-white">Emergency Circuit Breaker</span>
            <p className="leading-relaxed">Authorized Pausable control permits freezing transfers in verified security emergencies.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
            <span className="font-bold text-white">Decoupled Allocation</span>
            <p className="leading-relaxed">70:30 allocation is handled by AllocationManager.sol, keeping core token logic clean.</p>
          </div>
        </div>
      </Card>

      {/* Valuation Notice */}
      <div className="glass-panel p-6 rounded-2xl border border-[var(--border-prominent)] space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Market Valuation & Pricing Policy</span>
        </h4>
        <p className="text-xs text-secondary leading-relaxed">
          OXENIQ is a market-priced digital asset. Its price will be determined purely by market forces once the initial 
          $1,000 liquidity pool is authorized and funded. The platform does not display fabricated spot prices, charts, or fake volume.
        </p>
      </div>
    </div>
  );
}
