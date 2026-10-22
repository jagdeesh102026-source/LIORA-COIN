'use client';

import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ArrowRight, Layers, ShieldCheck, AlertCircle, Cpu, Network } from 'lucide-react';

export default function CrossChainPage() {
  const [amount, setAmount] = useState('');
  const [sourceChain, setSourceChain] = useState('BNB Smart Chain (BEP-20)');
  const [destChain, setDestChain] = useState('TRON Network (TRC-20)');

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Interoperability</h1>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Cross-Chain Bridge</h2>
        <p className="text-secondary text-sm sm:text-base leading-relaxed">
          Architectural framework for bidirectional token transfers and swaps between BNB Smart Chain and TRON.
        </p>
      </div>

      {/* In-Development Banner */}
      <div className="p-4 rounded-xl border border-[var(--brand-accent)]/30 bg-blue-950/20 text-blue-200 text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-[var(--brand-accent)]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Cross-Chain Protocol Under Architecture Review</span>
        </div>
        <p className="text-secondary leading-relaxed">
          TRON compatibility requires a non-EVM (TVM) bridge adapter. In accordance with project security guardrails, 
          bridging will be activated once the messaging provider (e.g., LayerZero v2 OFT) and multi-sig verifiers are formally authorized.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bridge Terminal */}
        <div className="lg:col-span-2 space-y-6">
          <Card elevated className="border border-[var(--border-prominent)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <span className="text-sm font-bold text-white">Transfer Simulator</span>
              <Badge status="Planned" />
            </div>

            {/* Source & Destination selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-xs text-muted">From Network</span>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>{sourceChain}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-xs text-muted">To Network</span>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span>{destChain}</span>
                </div>
              </div>
            </div>

            {/* Amount input */}
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between text-xs text-secondary">
                <span>Amount to Bridge</span>
                <span>Balance: 0.00 OXENIQ</span>
              </div>
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none"
              />
            </div>

            {/* Transfer vs Swap Explanation */}
            <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2 text-xs text-secondary">
              <div className="font-bold text-white">Transfer vs. Cross-Chain Swap</div>
              <p className="leading-relaxed">
                <strong>Bridge Transfer:</strong> Moves OXENIQ 1:1 via lock/mint or OFT burn/mint.<br />
                <strong>Cross-Chain Swap:</strong> Executes a DEX trade on BNB Chain, bridges the intermediary asset, and swaps into target token on TRON.
              </p>
            </div>

            <button
              disabled
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-[var(--bg-elevated)] text-muted border border-[var(--border-prominent)] cursor-not-allowed"
            >
              Bridge Feature in Development
            </button>
          </Card>
        </div>

        {/* Architecture Comparison Panel */}
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="text-base font-bold text-white">Cross-Chain Provider Matrix</h3>
            
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>LayerZero OFT v2</span>
                  <span className="text-[var(--brand-accent)]">Candidate #1</span>
                </div>
                <p className="text-muted">Direct Omnichain Fungible Token standard. Supports EVM and TRON endpoints via DVN verifiers.</p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Chainlink CCIP</span>
                  <span className="text-secondary">EVM Only</span>
                </div>
                <p className="text-muted">Industry benchmark for EVM-to-EVM; non-EVM TRON support currently requires custom off-chain relayer.</p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Dedicated Lock/Mint</span>
                  <span className="text-amber-400">Custom Bridge</span>
                </div>
                <p className="text-muted">Custodial multisig vault locking tokens on BSC and minting wrapped TRC-20 on TRON.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
