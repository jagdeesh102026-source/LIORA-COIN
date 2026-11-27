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
  BSC_MAINNET_LIORA_TOKEN_ADDRESS,
  BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS,
  BSC_MAINNET_CONFIG,
  BSC_TESTNET_CONFIG,
  isTestnetSandboxEnabled,
} from '../../config/tokenConfig';
import {
  CONFIRMED_INVESTMENT_PLANS,
} from '../../lib/allocation/proportionalAllocationEngine';
import {
  TrendingUp,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Wallet,
  AlertTriangle,
  Lock,
  Clock,
  Database,
  Coins,
  CheckCircle2,
  Info,
} from 'lucide-react';
import Link from 'next/link';

export default function SwapPage() {
  const { isConnected, isWrongNetwork, isBscMainnet, isBscTestnet, connect, switchToBscMainnet, switchToBscTestnet, address } = useWeb3Wallet();
  const [activeTab, setActiveTab] = useState<'MAINNET_STATUS' | 'TESTNET_SANDBOX' | 'SIMULATION'>('MAINNET_STATUS');
  const isDevSandbox = isTestnetSandboxEnabled();

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Top Market Bar */}
      <MarketTicker />

      {/* Mainnet Read-Only Security Advisory Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-blue-950/30 to-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <strong className="text-white text-sm">Official BSC Mainnet Deployment (Chain ID 56) Verified</strong>
            <p className="text-[11px] text-emerald-200/80 leading-relaxed">
              LIORA smart contracts are verified on BNB Smart Chain Mainnet. Open market DEX liquidity and trading pools remain strictly disabled during Phase 1 read-only operation.
            </p>
          </div>
        </div>
        <a
          href={`https://bscscan.com/token/${BSC_MAINNET_LIORA_TOKEN_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs shrink-0 flex items-center gap-1 border border-emerald-500/30 transition-all"
        >
          <span>BscScan Mainnet</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Wallet Connection & Network Status */}
      {!isConnected ? (
        <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[var(--brand-accent)] shrink-0" />
            <span>Connect your non-custodial external Web3 wallet to view on-chain LIORA token balances.</span>
          </div>
          <button
            onClick={() => connect()}
            className="px-3.5 py-1.5 rounded-xl btn-metallic text-white font-bold text-xs shrink-0"
          >
            Connect Wallet
          </button>
        </div>
      ) : isWrongNetwork ? (
        <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Unsupported network detected. Please switch to BNB Smart Chain Mainnet (Chain ID 56).</span>
          </div>
          <button
            onClick={() => switchToBscMainnet()}
            className="px-3.5 py-1.5 rounded-xl btn-metallic text-white font-bold text-xs shrink-0"
          >
            Switch to BSC Mainnet
          </button>
        </div>
      ) : null}

      {/* Main Terminal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Real On-Chain Architecture & Infrastructure (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Mainnet Protocol Infrastructure Card */}
          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/liora-logo-128.png"
                  alt="LIORA"
                  className="w-10 h-10 rounded-2xl object-contain shrink-0"
                />
                <div>
                  <h1 className="text-lg font-extrabold text-white">LIORA Market & Liquidity Architecture</h1>
                  <p className="text-xs text-secondary">BNB Smart Chain Mainnet (Chain ID 56)</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                MAINNET VERIFIED
              </span>
            </div>

            {/* Verified Contract Addresses List */}
            <div className="space-y-2.5 text-xs">
              <h2 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Official Mainnet Contract Infrastructure
              </h2>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-secondary font-sans">LIORA Token Proxy:</span>
                  <a
                    href={`https://bscscan.com/token/${BSC_MAINNET_LIORA_TOKEN_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>{BSC_MAINNET_LIORA_TOKEN_ADDRESS.slice(0, 8)}...{BSC_MAINNET_LIORA_TOKEN_ADDRESS.slice(-6)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-secondary font-sans">Implementation Logic:</span>
                  <a
                    href={`https://bscscan.com/address/${BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS}#code`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:underline flex items-center gap-1"
                  >
                    <span>{BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS.slice(0, 8)}...{BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS.slice(-6)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-secondary font-sans">Mainnet AMM Pair:</span>
                  <span className="text-amber-400 font-sans font-semibold">
                    Staged (Not Provisioned)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-secondary font-sans">Trading Status:</span>
                  <span className="text-secondary font-sans">
                    Read-Only (Zero Fabricated Volume)
                  </span>
                </div>
              </div>
            </div>

            {/* Sizing & Invariant Details */}
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-xs text-blue-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-[var(--brand-accent)]" />
                <span>Reference Pricing vs. Market Liquidity Notice</span>
              </div>
              <p className="leading-relaxed text-[11px] text-secondary">
                The scheduled reference price (₹0.20 starting benchmark) represents an internal primary sale valuation and does NOT guarantee open market AMM trading valuation on PancakeSwap or centralized exchanges. Zero synthetic trading volume, fake market capitalization, or unbacked liquidity is displayed.
              </p>
            </div>
          </div>

          {/* Investment Plans Architecture */}
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
              In adherence to protocol security invariants, <strong>AMM liquidity is NOT available to settle investment plan liabilities</strong>. No automated payouts or investor deductions are active on-chain.
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
                  <div className="text-[11px] text-secondary font-mono" suppressHydrationWarning>
                    Principal: ₹{tier.principalINR.toLocaleString('en-US')} INR
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-between" suppressHydrationWarning>
                    <span suppressHydrationWarning>Settlement: ₹{tier.contractualAllocationINR.toLocaleString('en-US')}</span>
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
                View double-entry reserve ledgers and treasury allocations.
              </p>
            </div>
            <Link
              href="/treasury"
              className="px-3 py-1.5 rounded-xl btn-metallic text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-md"
            >
              <span>View Treasury</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mode Switcher Banner (Excluded from production website) */}
          {isDevSandbox && (
            <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <span className="text-secondary font-semibold">Terminal Mode:</span>
              <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('MAINNET_STATUS')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${activeTab === 'MAINNET_STATUS'
                    ? 'bg-emerald-500 text-black'
                    : 'text-secondary hover:text-white'
                    }`}
                >
                  🔒 Mainnet Read-Only
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('TESTNET_SANDBOX')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${activeTab === 'TESTNET_SANDBOX'
                    ? 'bg-[var(--brand-accent)] text-black'
                    : 'text-secondary hover:text-white'
                    }`}
                >
                  🧪 Testnet Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('SIMULATION')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${activeTab === 'SIMULATION'
                    ? 'bg-[var(--brand-accent)] text-black'
                    : 'text-secondary hover:text-white'
                    }`}
                >
                  📊 Multi-Asset Demo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: The Interactive Terminal / Mainnet Display (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {!isDevSandbox || activeTab === 'MAINNET_STATUS' ? (
            <div className="p-8 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-extrabold text-white">Mainnet Trading Staged (Read-Only)</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  The official LIORA token contract (<code className="text-emerald-300 font-mono text-[11px]">{BSC_MAINNET_LIORA_TOKEN_ADDRESS}</code>) has been deployed on BNB Smart Chain Mainnet.
                </p>
                <p className="text-xs text-secondary leading-relaxed">
                  Decentralized exchange liquidity pools, swaps, and token sales are strictly closed in Phase 1 to preserve security invariants. You can connect your Web3 wallet in read-only mode to verify your balances and view contract states.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-left space-y-2 font-mono">
                <div className="flex items-center justify-between text-secondary">
                  <span>Network:</span>
                  <span className="text-white font-bold">BNB Smart Chain Mainnet (56)</span>
                </div>
                <div className="flex items-center justify-between text-secondary">
                  <span>Token:</span>
                  <span className="text-emerald-400 font-bold">LIORA (BEP-20)</span>
                </div>
                <div className="flex items-center justify-between text-secondary">
                  <span>Supply:</span>
                  <span className="text-white font-bold">100,000,000,000 LIORA</span>
                </div>
                <div className="flex items-center justify-between text-secondary">
                  <span>Governance:</span>
                  <span className="text-cyan-400 font-bold">48-Hour Timelock Controller</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`https://bscscan.com/token/${BSC_MAINNET_LIORA_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-metallic px-5 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2"
                >
                  <span>Verify on BscScan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {isDevSandbox && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('TESTNET_SANDBOX')}
                    className="px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-secondary hover:text-white border border-[var(--border-subtle)] transition-all inline-flex items-center gap-1.5"
                  >
                    <span>Open Developer Testnet Sandbox</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'TESTNET_SANDBOX' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-blue-200 text-xs flex items-center justify-between">
                <span>Developer Sandbox Mode: Interacting with PancakeSwap V2 testnet pool using mock tokens on BSC Testnet (Chain #97).</span>
              </div>
              <LioraDexSwapTerminal />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs">
                You are viewing the simulated multi-asset demo store (LIORA/BTC, LIORA/ETH). This is a client-side synthetic model only.
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
