'use client';

import React from 'react';
import { usePrimaryTokenSale } from '../../hooks/usePrimaryTokenSale';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import { DualPriceBadge } from '../dex/DualPriceBadge';
import { useDexOnChainLiquidity } from '../../hooks/useDexOnChainLiquidity';
import {
  BSC_MAINNET_LIORA_TOKEN_ADDRESS,
  isTestnetSandboxEnabled,
} from '../../config/tokenConfig';
import {
  Coins,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  RefreshCw,
  Wallet,
  ExternalLink,
  Lock,
} from 'lucide-react';

export const PrimarySaleTerminal: React.FC = () => {
  const isDevSandbox = isTestnetSandboxEnabled();
  const { isConnected, address, chainId, switchToBscTestnet } = useWeb3Wallet();
  const { pool } = useDexOnChainLiquidity();
  const {
    usdtInput,
    setUsdtInput,
    pricingModel,
    setPricingModel,
    quote,
    isPurchasing,
    purchaseSuccess,
    purchaseError,
    lastReceipt,
    isBscTestnet,
    executePurchase,
    clearMessages,
  } = usePrimaryTokenSale();

  if (!isDevSandbox) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="p-8 sm:p-10 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">LIORA Primary Token Sale (Staged)</h1>
                <p className="text-xs text-secondary">BNB Smart Chain Mainnet (Chain ID 56) — Read-Only Mode</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              Mainnet Read-Only
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Primary Sale Execution Disabled in Production:</strong> On-chain primary token sales, direct USDT purchases, and automated liquidity seeding remain disabled pending final security review and compliance authorization.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-secondary">Official Launch Benchmark</span>
              <div className="text-lg font-extrabold text-white font-mono">₹0.20 INR</div>
              <span className="text-[11px] text-emerald-400">Canonical Pre-Launch Schedule</span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-secondary">Verified Mainnet Token</span>
              <div className="text-xs font-mono font-bold text-white truncate">{BSC_MAINNET_LIORA_TOKEN_ADDRESS}</div>
              <a
                href={`https://bscscan.com/token/${BSC_MAINNET_LIORA_TOKEN_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>Verify on BscScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-secondary">Liquidity Commitment</span>
              <div className="text-lg font-extrabold text-emerald-400 font-mono">100% Proceeds</div>
              <span className="text-[11px] text-secondary">Company Treasury LP Custody</span>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="w-full py-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-secondary font-bold text-sm cursor-not-allowed opacity-80 flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Primary Sale Execution Disabled Until Authorized</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-emerald-950/40 border border-[var(--border-subtle)] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[var(--brand-accent)]" />
            <h1 className="text-xl font-extrabold text-white">LIORA Primary Token Sale Terminal</h1>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            BSC Testnet Sandbox #97
          </span>
        </div>
        <p className="text-xs text-secondary leading-relaxed">
          Purchase LIORA tokens directly from the project treasury. In accordance with confirmed management decisions,{' '}
          <strong className="text-emerald-400">100% of primary sale proceeds are allocated to LIORA/USDT protocol liquidity</strong>, with resulting LP tokens owned by the company treasury.
        </p>
      </div>

      {/* Dual Price Comparison Component */}
      <DualPriceBadge pool={pool} />

      {/* Main Terminal Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <span className="text-sm font-extrabold text-white">Configure Primary Token Purchase</span>
          <span className="text-xs font-mono text-secondary">Token: LIORA (18 Decimals)</span>
        </div>

        {/* Pricing Model Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-white flex items-center justify-between">
            <span>Select Pricing Model</span>
            <span className="text-[10px] text-amber-400 font-mono">Decision Pending Formal Sign-Off</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPricingModel('FIXED_BASELINE')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                pricingModel === 'FIXED_BASELINE'
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                  : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-secondary hover:text-white'
              }`}
            >
              <div className="font-bold text-xs">Fixed Baseline Presale</div>
              <div className="text-[11px] font-mono text-blue-300 mt-0.5">$0.10 USD (₹8.65 INR)</div>
              <div className="text-[10px] text-secondary mt-1">Confirmed baseline test benchmark</div>
            </button>

            <button
              type="button"
              onClick={() => setPricingModel('REFERENCE_SCHEDULE')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                pricingModel === 'REFERENCE_SCHEDULE'
                  ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                  : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-secondary hover:text-white'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>Reference Schedule</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200">Simulation</span>
              </div>
              <div className="text-[11px] font-mono text-purple-300 mt-0.5">₹0.20 → ₹30.00 Curve</div>
              <div className="text-[10px] text-secondary mt-1">Theoretical preview comparison only</div>
            </button>

            <button
              type="button"
              onClick={() => setPricingModel('DEX_SPOT_MARKET')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                pricingModel === 'DEX_SPOT_MARKET'
                  ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                  : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-secondary hover:text-white'
              }`}
            >
              <div className="font-bold text-xs">DEX Spot Market</div>
              <div className="text-[11px] font-mono text-emerald-300 mt-0.5">~$0.002322 USD (₹0.2008)</div>
              <div className="text-[10px] text-secondary mt-1">Live PancakeSwap V2 pool ratio</div>
            </button>
          </div>
        </div>

        {/* Pricing Model Notes / Warnings */}
        {quote.warningNote && (
          <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{quote.warningNote}</span>
          </div>
        )}

        {/* Investment Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="primary-usdt-input" className="font-bold text-white">Investment Amount (Mock USDT)</label>
            <span className="text-secondary font-mono">Test Token (No real value)</span>
          </div>
          <div className="relative">
            <input
              id="primary-usdt-input"
              type="number"
              min="1"
              value={usdtInput}
              onChange={(e) => {
                clearMessages();
                setUsdtInput(e.target.value);
              }}
              placeholder="100"
              className="w-full px-4 py-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white font-mono text-lg focus:outline-none focus:border-blue-500 transition-all pr-24"
            />
            <div className="absolute right-3 top-3 px-3 py-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-bold text-xs text-white">
              mUSDT
            </div>
          </div>
        </div>

        {/* Quotation & Allocation Breakdown Card */}
        <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-3">
          <div className="text-xs font-bold text-secondary uppercase tracking-wider">Transaction Breakdown</div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-secondary">Expected LIORA Delivery:</span>
            <span className="font-extrabold text-white font-mono text-sm">{quote.expectedLioraFormatted} LIORA</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-secondary">Effective Unit Price:</span>
            <span className="font-mono text-white">
              ${quote.tokenPriceUSD.toFixed(6)} USD (₹{quote.tokenPriceINR.toFixed(4)})
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-emerald-300 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Proceeds to Liquidity:
            </span>
            <span className="font-bold text-emerald-400 font-mono">
              +{quote.liquidityUsdtProceedsFormatted} mUSDT (100%)
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-secondary">Resulting Cake-LP Custody:</span>
            <span className="font-mono text-white">LIORA Company Treasury</span>
          </div>
        </div>

        {/* Success or Error Messages */}
        {purchaseSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>{purchaseSuccess}</div>
          </div>
        )}

        {purchaseError && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>{purchaseError}</div>
          </div>
        )}

        {/* Action Button */}
        <div>
          {!isConnected ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 rounded-2xl btn-metallic text-white font-extrabold text-sm opacity-60 flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet to Purchase</span>
            </button>
          ) : !isBscTestnet ? (
            <button
              type="button"
              onClick={switchToBscTestnet}
              className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-sm shadow-xl transition-all"
            >
              Switch to BSC Testnet (Chain ID 97)
            </button>
          ) : (
            <button
              type="button"
              onClick={executePurchase}
              disabled={isPurchasing || !quote.isValid || !quote.isExecutable}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {isPurchasing && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>
                {isPurchasing
                  ? 'Processing Primary Token Purchase...'
                  : !quote.isExecutable
                  ? (quote.executionDisabledReason || 'Execution Disabled for Pricing Model')
                  : 'Execute Testnet Purchase (Mock USDT)'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
