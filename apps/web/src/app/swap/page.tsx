'use client';

import React, { useState } from 'react';
import { LioraDexSwapTerminal } from '../../components/exchange/LioraDexSwapTerminal';
import { MobniqExchangeCard } from '../../components/exchange/MobniqExchangeCard';
import { MarketTicker } from '../../components/exchange/MarketTicker';
import { SecurityTrustSection } from '../../components/exchange/SecurityTrustSection';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import {
  PANCAKESWAP_PAIR_ADDRESS,
  PANCAKESWAP_ROUTER_ADDRESS,
  PANCAKESWAP_FACTORY_ADDRESS,
  LIORA_TOKEN_ADDRESS,
  MOCK_USDT_ADDRESS,
} from '../../lib/dex/dexOnChainClient';
import {
  CONFIRMED_INVESTMENT_PLANS,
} from '../../lib/allocation/proportionalAllocationEngine';
import {
  TrendingUp,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  Wallet,
  AlertTriangle,
  Lock,
  Clock,
  Database,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function SwapPage() {
  const { isConnected, isWrongNetwork, connect, switchToBscTestnet, address } = useWeb3Wallet();
  const [activeTab, setActiveTab] = useState<'ON_CHAIN' | 'SIMULATION'>('ON_CHAIN');

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Top Market Bar */}
      <MarketTicker />

      {/* Wallet Connection & Network Guardrails */}
      {!isConnected ? (
        <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[var(--brand-accent)] shrink-0" />
            <span>Connect your non-custodial external Web3 wallet to trade on BNB Smart Chain Testnet.</span>
          </div>
          <button
            onClick={() => connect()}
            className="px-3.5 py-1.5 rounded-xl btn-metallic text-white font-bold text-xs shrink-0"
          >
            Connect Wallet to Swap
          </button>
        </div>
      ) : isWrongNetwork ? (
        <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Unsupported network detected. Please switch to BNB Smart Chain Testnet (Chain ID 97).</span>
          </div>
          <button
            onClick={() => switchToBscTestnet()}
            className="px-3.5 py-1.5 rounded-xl btn-metallic text-white font-bold text-xs shrink-0"
          >
            Switch Network to BNB Smart Chain
          </button>
        </div>
      ) : null}

      {/* Main Terminal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Real On-Chain Pool Metrics & Investment Plans (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Pool Architecture Card */}
          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/liora-logo-128.png"
                  alt="Liora Coin"
                  className="w-10 h-10 rounded-2xl object-contain shrink-0"
                />
                <div>
                  <h1 className="text-lg font-extrabold text-white">LIORA / mUSDT Pool</h1>
                  <p className="text-xs text-secondary">PancakeSwap V2 Non-Custodial AMM</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                ACTIVE TESTNET
              </span>
            </div>

            {/* Verified Contract Addresses List */}
            <div className="space-y-2.5 text-xs">
              <h2 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Verified Contract Infrastructure
              </h2>

              <div className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-secondary font-sans">Pair Contract:</span>
                  <a
                    href={`https://testnet.bscscan.com/address/${PANCAKESWAP_PAIR_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-accent)] hover:underline flex items-center gap-1"
                  >
                    <span>{PANCAKESWAP_PAIR_ADDRESS.slice(0, 8)}...{PANCAKESWAP_PAIR_ADDRESS.slice(-6)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-secondary font-sans">LIORA Token:</span>
                  <a
                    href={`https://testnet.bscscan.com/address/${LIORA_TOKEN_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:underline flex items-center gap-1"
                  >
                    <span>{LIORA_TOKEN_ADDRESS.slice(0, 8)}...{LIORA_TOKEN_ADDRESS.slice(-6)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-secondary font-sans">Mock USDT (mUSDT):</span>
                  <a
                    href={`https://testnet.bscscan.com/address/${MOCK_USDT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:underline flex items-center gap-1"
                  >
                    <span>{MOCK_USDT_ADDRESS.slice(0, 8)}...{MOCK_USDT_ADDRESS.slice(-6)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-secondary font-sans">PancakeSwap V2 Router:</span>
                  <a
                    href={`https://testnet.bscscan.com/address/${PANCAKESWAP_ROUTER_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:underline flex items-center gap-1"
                  >
                    <span>{PANCAKESWAP_ROUTER_ADDRESS.slice(0, 8)}...{PANCAKESWAP_ROUTER_ADDRESS.slice(-6)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Sizing & Invariant Details */}
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-xs text-blue-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-[var(--brand-accent)]" />
                <span>Option 2 Approved Pool Budget</span>
              </div>
              <p className="leading-relaxed text-[11px] text-secondary">
                Total initial liquidity: <strong className="text-white">$1,000 USD</strong> ($500 paired mUSDT + 216,250 LIORA). Calculated at initial starting target of ₹0.20 per LIORA (illustrative ₹86.50/USD rate). Constant product invariant <code className="text-white font-mono">k = 108,125,000</code> preserved with 0.25% protocol fee.
              </p>
            </div>
          </div>

          {/* Investment Plans Architecture (Requirement 8) */}
          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Investment Plans (Strictly Decoupled)</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold text-[10px] border border-amber-500/20">
                LOCKED PERIODS
              </span>
            </div>

            <p className="text-[11px] text-secondary leading-relaxed">
              Preserved proposal lock-in durations. In adherence to security protocols, <strong>AMM liquidity is NOT available to settle investment plan liabilities</strong>. No automated payouts or investor deductions are active on-chain.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.values(CONFIRMED_INVESTMENT_PLANS).map((tier) => (
                <div
                  key={tier.planId}
                  className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white">{tier.displayName}</span>
                    <span className="text-[10px] font-bold text-[var(--brand-accent)]">
                      {tier.lockDurationMonths} Mo Lock
                    </span>
                  </div>
                  <div className="text-[11px] text-secondary font-mono">
                    Principal: ₹{tier.principalINR.toLocaleString()} INR
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-between">
                    <span>Settlement: ₹{tier.contractualAllocationINR.toLocaleString()}</span>
                    <span className="text-[10px] text-amber-300 font-mono font-bold">{tier.multiplierFactor}×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Navigation to Liquidity Management */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-purple-950/30 border border-blue-500/30 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                <span>Liquidity Pool Administration</span>
              </span>
              <p className="text-[11px] text-secondary">
                View Cake-LP reserves, stake paired liquidity, or redeem positions.
              </p>
            </div>
            <Link
              href="/liquidity"
              className="px-3 py-1.5 rounded-xl btn-metallic text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-md"
            >
              <span>Manage Liquidity</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mode Switcher Banner */}
          <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="text-secondary font-semibold">Interface Mode:</span>
            <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setActiveTab('ON_CHAIN')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  activeTab === 'ON_CHAIN'
                    ? 'bg-[var(--brand-accent)] text-black'
                    : 'text-secondary hover:text-white'
                }`}
              >
                ⚡ Live BSC Testnet
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SIMULATION')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  activeTab === 'SIMULATION'
                    ? 'bg-[var(--brand-accent)] text-black'
                    : 'text-secondary hover:text-white'
                }`}
              >
                🧪 Demo Simulator
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: The Interactive Swap Terminal (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {activeTab === 'ON_CHAIN' ? (
            <LioraDexSwapTerminal />
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs">
                You are viewing the simulated multi-asset demo store (LIORA/BTC, LIORA/ETH). Switch to <strong>Live BSC Testnet</strong> for real on-chain PancakeSwap V2 execution.
              </div>
              <MobniqExchangeCard />
            </div>
          )}
        </div>
      </div>

      {/* Trust & Architecture Section */}
      <SecurityTrustSection />
    </div>
  );
}
