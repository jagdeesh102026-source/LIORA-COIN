'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Card } from '../../components/Card';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import { ArrowDown, Settings, AlertCircle, Wallet, Shield } from 'lucide-react';

export default function SwapPage() {
  const { isConnected, address, balance, connect } = useWeb3Wallet();
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  const estimatedOutput = fromAmount && !isNaN(Number(fromAmount))
    ? (Number(fromAmount) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">DEX Swap Terminal</h1>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Exchange Tokens</h2>
        <p className="text-secondary text-xs sm:text-sm">
          Decentralized token exchange terminal for the OXENIQ ecosystem on BNB Smart Chain.
        </p>
      </div>

      {/* Honest Unconfigured Integration Notice */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-300 text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Liquidity Pool Deployment Staged</span>
        </div>
        <p className="text-amber-200/80 leading-relaxed">
          Initial $1,000 liquidity pool on PancakeSwap will be deployed soon. 
          Live transaction execution is safely disabled on this terminal until liquidity is established.
        </p>
      </div>

      {/* Swap Card */}
      <Card elevated className="border border-[var(--border-accent)] space-y-4">
        {/* Slippage & Settings Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] text-xs text-secondary">
          <span className="font-semibold text-white">Swap</span>
          <div className="flex items-center gap-2">
            <span>Slippage: {slippage}%</span>
            <Settings className="w-4 h-4 text-muted cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* From Token Input */}
        <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs text-secondary">
            <span>Pay</span>
            <span>Balance: {balance ? `${balance} BNB` : '0.00 BNB'}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none"
            />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm font-bold text-white shrink-0">
              <span className="w-4 h-4 rounded-full bg-yellow-500 inline-block" />
              <span>BNB</span>
            </div>
          </div>
        </div>

        {/* Swap Arrow Divider */}
        <div className="flex justify-center -my-2 relative z-10">
          <div className="p-2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-prominent)] text-[var(--brand-accent)] shadow-md">
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>

        {/* To Token Input (with Official OXENIQ Logo) */}
        <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs text-secondary">
            <span>Receive (Estimated)</span>
            <span>Balance: 0.00 OXENIQ</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <input
              type="text"
              readOnly
              value={estimatedOutput}
              className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none cursor-default"
            />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm font-bold text-white shrink-0">
              <Image
                src="/assets/oxeniq-logo-128.png"
                alt="OXENIQ Token Logo"
                width={20}
                height={20}
                className="object-contain shrink-0"
              />
              <span className="font-extrabold text-white">OXENIQ</span>
            </div>
          </div>
        </div>

        {/* Indicative pricing details */}
        <div className="p-3 rounded-lg bg-[var(--bg-primary)] text-xs text-secondary space-y-1.5">
          <div className="flex justify-between">
            <span>Indicative Rate</span>
            <span className="text-white">1 BNB ≈ 100 OXENIQ</span>
          </div>
          <div className="flex justify-between">
            <span>DEX Router</span>
            <span className="text-muted">PancakeSwap V2 (Staged)</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Network Fee</span>
            <span className="text-muted">~0.001 BNB</span>
          </div>
        </div>

        {/* Action Button */}
        {isConnected ? (
          <button
            disabled
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-[var(--bg-elevated)] text-muted border border-[var(--border-prominent)] cursor-not-allowed"
          >
            Swap Disabled (Awaiting Pool Launch)
          </button>
        ) : (
          <button
            onClick={connect}
            className="w-full btn-metallic py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            <Wallet className="w-4 h-4" />
            <span>Connect Wallet to Swap</span>
          </button>
        )}
      </Card>
    </div>
  );
}
