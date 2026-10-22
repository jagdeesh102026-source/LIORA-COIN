'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ArrowRight, Layers, ShieldCheck, AlertCircle, Globe2, Network, CheckCircle2, Lock } from 'lucide-react';

export default function CrossChainPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Interoperability</h1>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Cross-Chain Architecture</h2>
          <p className="text-secondary text-sm sm:text-base leading-relaxed">
            Multi-chain expansion blueprint establishing verifiable cross-chain communication between BNB Smart Chain and TRON.
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
            alt="OXENIQ Cross-Chain Architecture"
            width={100}
            height={100}
            className="relative object-contain filter drop-shadow-md"
          />
        </div>
      </div>

      {/* Honest Status Banner */}
      <div className="p-4 rounded-xl border border-[var(--brand-accent)]/30 bg-blue-950/20 text-blue-200 text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-[var(--brand-accent)]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Cross-Chain Expansion: Coming Soon (Phase 6 Roadmap)</span>
        </div>
        <p className="text-secondary leading-relaxed">
          BNB Smart Chain is the active genesis network. Bridging to TRON requires dedicated non-EVM (TVM) adapters and relayer infrastructure. 
          Bridge transfers and swaps will be unlocked following mainnet liquidity launch and independent security auditing.
        </p>
      </div>

      {/* Architectural Separation: Transfers vs Swaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[var(--brand-accent)]">
            <Layers className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">1:1 Bridge Transfers (OFT)</h3>
            <span className="text-xs text-[var(--brand-accent)]">Direct Asset Movement</span>
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            Transfers OXENIQ directly between networks via LayerZero v2 Omnichain Fungible Token (OFT) standards. 
            Tokens locked or burned on the source chain are minted on the target chain at exact 1:1 parity with zero AMM slippage.
          </p>
          <div className="pt-2 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Zero price slippage
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Network className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Cross-Chain Multi-Hop Swaps</h3>
            <span className="text-xs text-cyan-400">DEX Routing Aggregation</span>
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            Executes multi-step decentralized trades: swapping OXENIQ on PancakeSwap (BSC), bridging the intermediate stable asset, 
            and routing through SunSwap (TRON). Requires secondary liquidity reserves on both networks.
          </p>
          <div className="pt-2 text-xs text-secondary flex items-center gap-2">
            <Lock className="w-4 h-4" /> Requires dual-chain liquidity pools
          </div>
        </Card>
      </div>

      {/* Technical Comparison Table */}
      <Card className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <h3 className="text-lg font-bold text-white">Technical Infrastructure: BSC vs. TRON</h3>
          <Badge status="Planned" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-secondary">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-white">
                <th className="py-3 px-4 font-semibold">Dimension</th>
                <th className="py-3 px-4 font-semibold text-[var(--brand-accent)]">BNB Smart Chain (Genesis)</th>
                <th className="py-3 px-4 font-semibold text-red-400">TRON Network (Target)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              <tr>
                <td className="py-3 px-4 font-medium text-white">Virtual Machine</td>
                <td className="py-3 px-4">EVM (Ethereum Virtual Machine)</td>
                <td className="py-3 px-4">TVM (TRON Virtual Machine)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-white">Token Standard</td>
                <td className="py-3 px-4">BEP-20 (Solidity 0.8.20)</td>
                <td className="py-3 px-4">TRC-20 (TVM Compatible)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-white">Gas / Resource Model</td>
                <td className="py-3 px-4">BNB (Gas Wei)</td>
                <td className="py-3 px-4">TRX (Energy & Bandwidth)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-white">Wallet Ecosystem</td>
                <td className="py-3 px-4">MetaMask, TrustWallet, Rabby (EIP-1193)</td>
                <td className="py-3 px-4">TronLink (tronWeb)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-white">Bridge Architecture</td>
                <td className="py-3 px-4">LayerZero v2 EndpointV2</td>
                <td className="py-3 px-4">LayerZero TVM Adapter / Relayer</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
