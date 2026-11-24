'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDexOnChainSwap } from '../../hooks/useDexOnChainSwap';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import {
  PANCAKESWAP_PAIR_ADDRESS,
  PANCAKESWAP_ROUTER_ADDRESS,
  LIORA_TOKEN_ADDRESS,
  MOCK_USDT_ADDRESS,
  ILLUSTRATIVE_USD_INR_RATE,
} from '../../lib/dex/dexOnChainClient';
import {
  ArrowDownUp,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Settings2,
  Info,
  TrendingUp,
  Zap,
  Lock,
  Clock,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LioraDexSwapTerminalProps {
  className?: string;
}

export const LioraDexSwapTerminal: React.FC<LioraDexSwapTerminalProps> = ({ className = '' }) => {
  const {
    pool,
    isPoolLoading,
    poolError,
    refreshPool,
    balances,
    isBalancesLoading,
    balancesError,
    refreshBalances,
    direction,
    toggleDirection,
    fromSymbol,
    toSymbol,
    amountIn,
    setAmountIn,
    slippagePercent,
    setSlippagePercent,
    quote,
    hasInsufficientBalance,
    isInputZeroOrEmpty,
    needsApproval,
    isApproving,
    isSwapping,
    pendingTxHash,
    approvalError,
    swapError,
    lastExecutedSwap,
    approveToken,
    executeSwap,
    clearErrors,
    setMaxAmount,
    history,
    isBscTestnet,
    isConnected,
    address,
  } = useDexOnChainSwap();

  const { connect, switchToBscTestnet, disconnect } = useWeb3Wallet();

  const [showSettings, setShowSettings] = useState(false);
  const [customSlippage, setCustomSlippage] = useState('');

  // Handle custom slippage input
  const handleSlippageSelect = (val: number) => {
    setSlippagePercent(val);
    setCustomSlippage('');
  };

  const handleCustomSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomSlippage(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num <= 50) {
      setSlippagePercent(num);
    }
  };

  const handlePresetAmount = (fraction: number) => {
    if (!balances) return;
    const raw = direction === 'LIORA -> mUSDT' ? balances.lioraRaw : balances.usdtRaw;
    if (raw <= 0n) return;
    const target = (raw * BigInt(Math.round(fraction * 100))) / 100n;
    const formatted = (Number(target) / 1e18).toFixed(4);
    setAmountIn(formatted);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Mandatory Disclaimer & Environment Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-950/60 via-[#0E172A] to-purple-950/40 border border-blue-500/30 text-xs shadow-xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-extrabold text-white tracking-wide">
              LIORA / mUSDT — BSC TESTNET
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-500/30">
              Chain ID 97
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://testnet.bscscan.com/address/${PANCAKESWAP_PAIR_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-[var(--brand-accent)] hover:underline flex items-center gap-1"
            >
              <span>Pair: {PANCAKESWAP_PAIR_ADDRESS.slice(0, 6)}...{PANCAKESWAP_PAIR_ADDRESS.slice(-4)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Explicit Warning as Mandated */}
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Testnet trading only.</strong> mUSDT is a valueless mock token and is not real USDT. Production mainnet trading remains strictly disabled.
          </div>
        </div>
      </div>

      {/* 2. Main Swap Card */}
      <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#111A2E] to-[#0A101D] border border-[var(--border-prominent)] shadow-2xl p-5 sm:p-7 backdrop-blur-xl space-y-5">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[var(--brand-accent)]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">PancakeSwap V2 On-Chain Swap</h3>
              <p className="text-[11px] text-secondary">
                Exact constant product automated market maker execution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refreshPool();
                refreshBalances();
              }}
              className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary hover:text-white transition-all"
              title="Refresh reserves & balances"
            >
              <RefreshCw className={`w-4 h-4 ${isPoolLoading ? 'animate-spin text-[var(--brand-accent)]' : ''}`} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border transition-all ${
                showSettings
                  ? 'bg-[var(--brand-blue)]/20 border-[var(--brand-accent)] text-white'
                  : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-secondary hover:text-white'
              }`}
              title="Slippage settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dedicated Non-Custodial Wallet Status Bar */}
        {isConnected && address ? (
          <div className="space-y-2">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-purple-950/30 border border-blue-500/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-secondary font-medium">Connected Wallet:</span>
                <span className="font-mono font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  BSC Testnet (#97)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-950/30 border border-rose-500/20 transition-all flex items-center gap-1"
                  title="Disconnect and choose a different wallet"
                >
                  <span>Disconnect / Switch</span>
                </button>
              </div>
            </div>

            {/* Notification if connected to another address instead of designated test wallet */}
            {address.toLowerCase() !== '0x44b4d4d74d038a675f0b6fdccfdd22fbfdca2ba9'.toLowerCase() && (
              <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-blue-200 text-[11px] flex items-center justify-between gap-2">
                <span>
                  💡 <strong>Connected:</strong> <code className="text-white font-mono">{address.slice(0, 6)}...{address.slice(-4)}</code>. To trade with your funded test wallet (<code className="text-emerald-300 font-mono">0x44b4...2ba9</code> with 50 LIORA &amp; 50 mUSDT), select that account in MetaMask.
                </span>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="text-[11px] text-[var(--brand-accent)] hover:underline shrink-0 font-bold"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/20 via-blue-950/20 to-slate-900 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Connect your MetaMask wallet on BSC Testnet to view balances and execute swaps.</span>
            </div>
            <button
              type="button"
              onClick={() => connect()}
              className="px-4 py-1.5 rounded-xl btn-metallic text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md hover:opacity-95"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-300" />
              <span>Connect MetaMask</span>
            </button>
          </div>
        )}

        {/* Slippage Settings Drawer */}
        {showSettings && (
          <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-accent)] animate-fade-in space-y-3 text-xs">
            <div className="flex items-center justify-between font-semibold text-white">
              <span>Slippage Tolerance</span>
              <span className="text-[var(--brand-accent)]">{slippagePercent}%</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {[0.1, 0.5, 1.0, 2.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSlippageSelect(val)}
                  className={`py-1.5 rounded-xl font-bold transition-all text-xs border ${
                    slippagePercent === val && !customSlippage
                      ? 'bg-[var(--brand-accent)] text-black border-[var(--brand-accent)]'
                      : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-secondary hover:text-white'
                  }`}
                >
                  {val}%
                </button>
              ))}
              <input
                type="number"
                placeholder="Custom"
                value={customSlippage}
                onChange={handleCustomSlippageChange}
                className="py-1.5 px-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-xs text-center focus:border-[var(--brand-accent)] focus:outline-none"
              />
            </div>
            {slippagePercent > 5 && (
              <p className="text-[11px] text-amber-400">
                Warning: High slippage tolerance increases risk of adverse sandwich attacks.
              </p>
            )}
          </div>
        )}

        {/* Live Pool Reserves Info Pill */}
        {pool ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px]">
            <div>
              <span className="text-secondary block">Pool LIORA Reserve</span>
              <span className="font-mono font-bold text-white">{pool.formattedLiora}</span>
            </div>
            <div>
              <span className="text-secondary block">Pool mUSDT Reserve</span>
              <span className="font-mono font-bold text-white">{pool.formattedUsdt}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-secondary block">Spot Price (AMM)</span>
              <span className="font-mono font-bold text-emerald-400">
                ${pool.spotPriceUsd} <span className="text-secondary text-[10px]">({pool.spotPriceInr} INR)</span>
              </span>
            </div>
          </div>
        ) : poolError ? (
          <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <span>{poolError}</span>
            <button onClick={refreshPool} className="underline text-white font-bold ml-2">Retry</button>
          </div>
        ) : null}

        {/* FROM TOKEN SECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-secondary">
            <span className="font-semibold text-slate-300">You Pay</span>
            {isConnected && balances ? (
              <div className="flex items-center gap-1.5 text-[11px]">
                <Wallet className="w-3.5 h-3.5 text-secondary" />
                <span>Balance:</span>
                <span className="font-mono font-bold text-white">
                  {direction === 'LIORA -> mUSDT' ? balances.lioraFormatted : balances.usdtFormatted}
                </span>
                <button
                  type="button"
                  onClick={setMaxAmount}
                  className="px-1.5 py-0.5 rounded-md bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] font-extrabold text-[10px] hover:bg-[var(--brand-accent)]/30"
                >
                  MAX
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                <span>Balance: 0.00</span>
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus-within:border-[var(--brand-accent)] transition-all">
            <div className="flex items-center justify-between gap-3">
              <input
                type="number"
                value={amountIn}
                onChange={(e) => {
                  clearErrors();
                  setAmountIn(e.target.value);
                }}
                placeholder="0.0"
                className="w-full bg-transparent text-xl sm:text-2xl font-extrabold text-white focus:outline-none font-mono"
              />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shrink-0">
                <span className="font-bold text-sm text-white">{fromSymbol}</span>
              </div>
            </div>

            {/* Quick preset buttons */}
            {balances && (
              <div className="flex items-center gap-1.5 pt-3 mt-2 border-t border-[var(--border-subtle)]">
                {[0.25, 0.5, 0.75, 1.0].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handlePresetAmount(f)}
                    className="px-2 py-0.5 rounded-lg bg-[var(--bg-elevated)] text-[10px] font-bold text-secondary hover:text-white transition-all border border-[var(--border-subtle)]"
                  >
                    {f * 100}%
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FLIP TOGGLE BUTTON */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            type="button"
            onClick={toggleDirection}
            className="p-3 rounded-2xl bg-[#0F172A] border-2 border-[var(--border-prominent)] text-[var(--brand-accent)] hover:text-white hover:scale-110 active:scale-95 transition-all shadow-xl"
            title="Invert swap direction"
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
        </div>

        {/* TO TOKEN SECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-secondary">
            <span className="font-semibold text-slate-300">You Receive (Estimated)</span>
            {isConnected && balances ? (
              <div className="flex items-center gap-1.5 text-[11px]">
                <Wallet className="w-3.5 h-3.5 text-secondary" />
                <span>Balance:</span>
                <span className="font-mono font-bold text-white">
                  {direction === 'LIORA -> mUSDT' ? balances.usdtFormatted : balances.lioraFormatted}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-muted flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                <span>Balance: 0.00</span>
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="w-full text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono truncate">
                {parseFloat(quote.expectedAmountOutFormatted).toFixed(4)}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shrink-0">
                <span className="font-bold text-sm text-white">{toSymbol}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border-subtle)] text-[11px] text-secondary">
              <span>Guaranteed Minimum (Slippage Adjusted):</span>
              <span className="font-mono font-semibold text-white">
                {parseFloat(quote.minAmountOutFormatted).toFixed(4)} {toSymbol}
              </span>
            </div>
          </div>
        </div>

        {/* SWAP METRICS ACCORDION */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2 text-xs">
          <div className="flex items-center justify-between text-secondary">
            <span>Execution Rate</span>
            <span className="font-mono text-white">
              1 {fromSymbol} = {quote.executionPrice.toFixed(6)} {toSymbol}
            </span>
          </div>

          <div className="flex items-center justify-between text-secondary">
            <span>Price Impact</span>
            <span
              className={`font-mono font-bold ${
                quote.priceImpactPercent > 5
                  ? 'text-rose-400'
                  : quote.priceImpactPercent > 2
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {quote.priceImpactPercent}%
            </span>
          </div>

          <div className="flex items-center justify-between text-secondary">
            <span>PancakeSwap V2 Protocol Fee (0.25%)</span>
            <span className="font-mono text-white">
              {parseFloat(quote.tradingFeeFormatted).toFixed(6)} {fromSymbol}
            </span>
          </div>

          <div className="flex items-center justify-between text-secondary">
            <span>Transaction Deadline</span>
            <span className="text-white">5 Minutes (Auto-expiring)</span>
          </div>
        </div>

        {/* ERROR MESSAGES */}
        {approvalError && (
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong>Approval Error:</strong> {approvalError}
            </div>
          </div>
        )}

        {swapError && (
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong>Swap Error:</strong> {swapError}
            </div>
          </div>
        )}

        {/* PENDING TRANSACTION INDICATOR */}
        {pendingTxHash && (
          <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[var(--brand-accent)]" />
              <span>Transaction broadcasting &amp; mining on BSC Testnet...</span>
            </div>
            <a
              href={`https://testnet.bscscan.com/tx/${pendingTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-accent)] font-bold hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* SUCCESS NOTIFICATION */}
        {lastExecutedSwap && !pendingTxHash && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Swap Confirmed on BSC Testnet</span>
              </div>
              <a
                href={lastExecutedSwap.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>BscScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-secondary text-[11px]">
              Swapped {lastExecutedSwap.amountIn} for {lastExecutedSwap.amountOut}. Balances refreshed.
            </p>
          </div>
        )}

        {/* PRIMARY ACTION BUTTONS */}
        {!isConnected ? (
          <button
            type="button"
            onClick={() => connect()}
            className="w-full py-4 rounded-2xl btn-metallic text-white font-extrabold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4 text-amber-300" />
            <span>Connect Wallet to Swap</span>
          </button>
        ) : !isBscTestnet ? (
          <button
            type="button"
            onClick={() => switchToBscTestnet()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-extrabold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>Switch to BNB Smart Chain Testnet (#97)</span>
          </button>
        ) : hasInsufficientBalance ? (
          <button
            type="button"
            disabled
            className="w-full py-4 rounded-2xl bg-slate-800 text-slate-500 font-bold text-sm cursor-not-allowed border border-slate-700"
          >
            Insufficient {fromSymbol} Balance
          </button>
        ) : isInputZeroOrEmpty ? (
          <button
            type="button"
            disabled
            className="w-full py-4 rounded-2xl bg-slate-800 text-slate-500 font-bold text-sm cursor-not-allowed border border-slate-700"
          >
            Enter an Amount
          </button>
        ) : needsApproval ? (
          <button
            type="button"
            onClick={approveToken}
            disabled={isApproving}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isApproving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Approving exact {fromSymbol}...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-300" />
                <span>Approve {fromSymbol} on PancakeSwap</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={executeSwap}
            disabled={isSwapping || !quote.hasSufficientLiquidity}
            className="w-full py-4 rounded-2xl btn-metallic text-white font-extrabold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSwapping ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Swapping on BSC Testnet...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Execute Non-Custodial Swap</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 3. Verified Transaction History Table (Requirement 6) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Clock className="w-4 h-4 text-[var(--brand-accent)]" />
            <span>Verified On-Chain Transaction History</span>
          </div>
          <span className="text-secondary text-xs">BSC Testnet (Chain ID 97)</span>
        </div>

        {history.length === 0 ? (
          <div className="p-6 text-center text-secondary text-xs rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
            No testnet swaps recorded for this wallet yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-secondary text-[11px]">
                  <th className="pb-2.5 font-semibold">Direction</th>
                  <th className="pb-2.5 font-semibold">Input</th>
                  <th className="pb-2.5 font-semibold">Output</th>
                  <th className="pb-2.5 font-semibold">Timestamp</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold text-right">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-semibold text-white">{record.direction}</td>
                    <td className="py-3 font-mono text-secondary">{record.amountIn}</td>
                    <td className="py-3 font-mono text-emerald-400 font-semibold">{record.amountOut}</td>
                    <td className="py-3 text-secondary text-[11px]">
                      {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <a
                        href={record.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[var(--brand-accent)] hover:underline text-[11px]"
                      >
                        <span>{record.txHash.slice(0, 6)}...{record.txHash.slice(-4)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Reference Price vs Executable DEX Price Comparison (Requirement 7) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Price Architecture &amp; Independent Schedule</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px]">
            Decoupled Modals
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-blue-500/20 space-y-1.5">
            <span className="text-secondary block font-semibold">1. Confirmed Reference-Price Schedule</span>
            <div className="text-base font-extrabold text-white">
              0.20 INR <span className="text-xs font-normal text-secondary">(Initial Starting Target)</span>
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">
              Increments by exactly 0.20 every 5 hours across 149 steps over 745 hours, capping strictly at 30.00 INR. Pure accounting simulation, decoupled from AMM reserves.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-emerald-500/20 space-y-1.5">
            <span className="text-secondary block font-semibold">2. Live PancakeSwap V2 Market Price</span>
            <div className="text-base font-extrabold text-emerald-400">
              ${pool ? pool.spotPriceUsd : '0.002321'} USD{' '}
              <span className="text-xs font-normal text-secondary">({pool ? pool.spotPriceInr : '0.2008'} INR)</span>
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">
              Autonomous constant product price determined by live pool reserves ({pool?.formattedLiora || '215,829'} LIORA / {pool?.formattedUsdt || '501'} mUSDT).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
