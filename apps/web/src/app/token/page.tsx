'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { TOKEN_CONFIG } from '../../config/tokenConfig';
import { Copy, Check, ExternalLink, ShieldCheck, Flame, Layers, Lock, AlertTriangle } from 'lucide-react';

export default function TokenPage() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Token Architecture</h1>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">OXENIQ Tokenomics</h2>
          <p className="text-secondary text-sm sm:text-base leading-relaxed">
            Verified technical specifications, deflationary burning mechanics, and security architecture of the OXENIQ utility token on BNB Smart Chain.
          </p>
        </div>

        {/* Brand Emblem Mini-Showcase */}
        <div className="relative shrink-0 flex items-center justify-center self-start md:self-auto">
          <div 
            className="absolute rounded-full filter blur-xl opacity-40 pointer-events-none"
            style={{
              width: 130,
              height: 130,
              background: 'radial-gradient(circle, rgba(57,123,255,0.4) 0%, transparent 70%)',
            }}
          />
          <Image
            src="/assets/oxeniq-logo-512.png"
            alt="OXENIQ Official Token Logo"
            width={110}
            height={110}
            className="relative object-contain filter drop-shadow-md"
          />
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Token Name</span>
          <div className="text-xl font-bold text-white">{TOKEN_CONFIG.name}</div>
          <span className="text-xs text-secondary">Official Protocol Asset</span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Ticker Symbol</span>
          <div className="text-xl font-bold text-white">{TOKEN_CONFIG.symbol}</div>
          <span className="text-xs text-emerald-400">BEP-20 Standard</span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Precision Decimals</span>
          <div className="text-xl font-bold text-white">18 Decimals</div>
          <span className="text-xs text-secondary">High Precision Accounting</span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Transfer Tax</span>
          <div className="text-xl font-bold text-emerald-400">0% Tax-Free</div>
          <span className="text-xs text-secondary">100% AMM / DEX Compatible</span>
        </Card>
      </div>

      {/* Blockchain Network & Explorer Verification */}
      <Card className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-lg font-bold text-white">Blockchain Network & Verification</h3>
            <p className="text-xs text-secondary">Official contract deployment and explorer tracking on BNB Smart Chain.</p>
          </div>
          <Badge status="In Progress" />
        </div>

        <div className="space-y-4 text-sm">
          {/* Mainnet */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-white uppercase tracking-wider">BNB Smart Chain Mainnet (Chain ID 56)</span>
              <span className="text-xs text-[var(--brand-accent)] font-semibold">Genesis Launch Staged</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-secondary">
                Official contract address will be published at genesis deployment. Public verification will be accessible on BscScan.
              </span>
              <a
                href="https://bscscan.com"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>BscScan Mainnet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Testnet */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">BNB Smart Chain Testnet (Chain ID 97)</span>
              <Badge status="In Progress" size="sm" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-secondary">
                Testnet contracts configured and ready for automated pipeline execution.
              </span>
              <a
                href="https://testnet.bscscan.com"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>BscScan Testnet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Smart Contract Architecture Pillars */}
      <Card className="space-y-6">
        <h3 className="text-base font-bold text-white">Smart Contract Security & Governance Architecture</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-secondary">
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero Transfer Taxes</span>
            </div>
            <p className="leading-relaxed">
              Base BEP-20 transfer path has 0% tax. This ensures flawless compatibility with PancakeSwap routers, 
              staking pools, multi-sig vaults, and cross-chain bridges without unexpected slippage failures.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-[var(--brand-accent)]" />
              <span>Two-Step Ownership Transfer</span>
            </div>
            <p className="leading-relaxed">
              OpenZeppelin <code>Ownable2Step</code> requires the nominated administrator to explicitly call 
              <code>acceptOwnership()</code>, preventing accidental loss of contract control from mistyped addresses.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Deflationary Holder Burns</span>
            </div>
            <p className="leading-relaxed">
              Inherits <code>ERC20Burnable</code>. Any token holder can permanently burn their tokens, 
              reducing total circulating supply on-chain with full event transparency.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Decoupled 70:30 Allocation</span>
            </div>
            <p className="leading-relaxed">
              Purchase allocation logic is segregated in a dedicated <code>AllocationManager.sol</code> contract, 
              enforcing exact integer division math without altering standard wallet-to-wallet transfers.
            </p>
          </div>
        </div>
      </Card>

      {/* Security & Authenticity Notice */}
      <div className="glass-panel p-6 rounded-2xl border border-[var(--border-prominent)] space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Official Token Authenticity & Safety Notice</span>
        </h4>
        <p className="text-xs text-secondary leading-relaxed">
          Beware of unauthorized fake tokens claiming to be OXENIQ on PancakeSwap or other decentralized exchanges. 
          The official OXENIQ contract address will be published exclusively on this official portal (oxeniq.io) 
          and verified on BscScan. Always verify the contract address before initiating any swap.
        </p>
      </div>
    </div>
  );
}
