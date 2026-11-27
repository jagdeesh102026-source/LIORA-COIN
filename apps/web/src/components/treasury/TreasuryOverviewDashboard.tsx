'use client';

import React from 'react';
import { useTreasuryAccounting } from '../../hooks/useTreasuryAccounting';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import {
  ShieldCheck,
  Lock,
  Layers,
  Coins,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Wallet,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Activity,
  Droplets,
} from 'lucide-react';

export const TreasuryOverviewDashboard: React.FC = () => {
  const { address } = useWeb3Wallet();
  const {
    state,
    reconciliation,
    primarySales,
    liquidityBatches,
    provisionPlan,
    isProvisioning,
    actionSuccess,
    actionError,
    isTreasuryAuthority,
    authorizedTreasuryWallet,
    refreshTreasury,
    executeLiquidityBatch,
    clearMessages,
  } = useTreasuryAccounting();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner & Authority Indicator */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#111A2E] to-[#0A101D] border border-[var(--border-prominent)] shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="text-xl font-extrabold text-white">LIORA Protocol Treasury & Liquidity Accounting</h1>
              <p className="text-xs text-secondary">
                Official double-entry reserve ledger, 100% sale proceeds allocation, and LP custody monitoring
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <a
              href={`https://bscscan.com/address/${authorizedTreasuryWallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--brand-accent)] transition-colors"
              title="View Operating Treasury on BscScan Mainnet"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-secondary">Mainnet Treasury:</span>
              <span className="text-white font-bold">
                {authorizedTreasuryWallet.slice(0, 6)}...{authorizedTreasuryWallet.slice(-4)}
              </span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
            <button
              type="button"
              onClick={refreshTreasury}
              className="p-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-secondary hover:text-white transition-all cursor-pointer"
              title="Refresh Ledger"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Treasury Authority Callout */}
        <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-blue-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>BSC Mainnet Treasury Governance:</strong> 1,000,000,000 LIORA Operating Treasury (<a href={`https://bscscan.com/address/${authorizedTreasuryWallet}`} target="_blank" rel="noreferrer" className="text-emerald-300 font-mono hover:underline">0xD546...9064</a>) & 99,000,000,000 LIORA Restricted Reserve Vault (<a href="https://bscscan.com/address/0x244865302a1643702ACB66181DBd898F714EF6e0" target="_blank" rel="noreferrer" className="text-amber-300 font-mono hover:underline">0x2448...F6e0</a>).
              {isTreasuryAuthority ? (
                <span className="ml-1 text-emerald-400 font-bold">Your connected wallet is AUTHORIZED.</span>
              ) : (
                <span className="ml-1 text-secondary">Read-only auditor view.</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">{actionSuccess}</div>
          <button type="button" onClick={clearMessages} className="text-secondary hover:text-white">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">{actionError}</div>
          <button type="button" onClick={clearMessages} className="text-secondary hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid: Token Allocation Ledger vs Proceeds Accounting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Fixed 1 Billion Supply Ledger */}
        <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[var(--brand-accent)]" />
              <h2 className="text-sm font-extrabold text-white">LIORA Operating Treasury Allocation (1 Billion Active Pool)</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
              Double-Entry Conserved
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* 70% Client Allocation Bucket */}
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-blue-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-300 text-sm">70% Client Allocation</span>
                <span className="font-mono font-bold text-white">700,000,000.00 LIORA</span>
              </div>
              <p className="text-[11px] text-secondary">
                Designated for client purchases, rewards, and paired protocol liquidity.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)] text-[11px]">
                <div>
                  <div className="text-secondary text-[10px]">Delivered to Buyers:</div>
                  <div className="font-mono text-white font-bold">{state.tokensDeliveredToBuyersFormatted} LIORA</div>
                </div>
                <div>
                  <div className="text-secondary text-[10px]">Paired in AMM Pool:</div>
                  <div className="font-mono text-white font-bold">{state.tokensPairedIntoLiquidityFormatted} LIORA</div>
                </div>
                <div>
                  <div className="text-secondary text-[10px]">Pending Pairing:</div>
                  <div className="font-mono text-amber-300 font-bold">{state.tokensCommittedForPendingLiquidityFormatted} LIORA</div>
                </div>
                <div>
                  <div className="text-secondary text-[10px]">Available Client Pool:</div>
                  <div className="font-mono text-emerald-400 font-bold">{state.availableClientAllocationFormatted} LIORA</div>
                </div>
              </div>
            </div>

            {/* 30% Company Emergency Reserve */}
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-purple-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-purple-300 text-sm">30% Company Emergency Reserve</span>
                <span className="font-mono font-bold text-white">300,000,000.00 LIORA</span>
              </div>
              <p className="text-[11px] text-secondary">
                Strictly isolated crisis reserve. Zero tokens from this bucket are used for client sales or liquidity pairing.
              </p>
              <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                <span className="text-secondary">Unencumbered Balance:</span>
                <span className="text-purple-300 font-bold">300,000,000.00 LIORA (100% Intact)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 100% Primary Sale Proceeds & Liquidity Accounting */}
        <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-extrabold text-white">100% Proceeds Liquidity Ledger</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30">
              100% to AMM
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
                <div className="text-[10px] text-secondary">Total Proceeds Received</div>
                <div className="font-mono text-base font-extrabold text-white">
                  {state.totalUsdtProceedsReceivedFormatted} <span className="text-xs text-secondary">mUSDT</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
                <div className="text-[10px] text-secondary">Allocated into Pool</div>
                <div className="font-mono text-base font-extrabold text-emerald-400">
                  {state.usdtAllocatedToLiquidityFormatted} <span className="text-xs text-emerald-400/70">mUSDT</span>
                </div>
              </div>
            </div>

            {/* Pending Allocation Card */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Pending Liquidity Allocation
                </span>
                <span className="font-mono font-extrabold text-amber-300 text-sm">
                  {state.usdtPendingLiquidityAllocationFormatted} mUSDT
                </span>
              </div>
              <p className="text-[11px] text-secondary leading-relaxed">
                Primary sale proceeds currently awaiting next batch deposit. Pending funds are <strong>never</strong> labeled as deposited pool liquidity until confirmed on-chain.
              </p>

              {/* Action Button: Batch Liquidity Deposit */}
              {provisionPlan && provisionPlan.canExecute && (
                <div className="pt-2 space-y-1.5">
                  <button
                    type="button"
                    onClick={executeLiquidityBatch}
                    disabled={isProvisioning || !isTreasuryAuthority}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {isProvisioning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {isTreasuryAuthority
                        ? `Allocate ${provisionPlan.usdtToAllocateFormatted} mUSDT + ${provisionPlan.requiredLioraFormatted} LIORA into AMM Pool`
                        : 'Treasury Authority Required for Pool Allocation'}
                    </span>
                  </button>
                  {!isTreasuryAuthority && (
                    <p className="text-[10px] text-amber-400 text-center font-mono">
                      Only authorized treasury wallet ({authorizedTreasuryWallet.slice(0, 6)}...{authorizedTreasuryWallet.slice(-4)}) can execute liquidity provisioning.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Treasury LP Custody Card */}
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300">Treasury LP Token Custody</span>
                <span className="font-mono font-bold text-white text-xs">{state.treasuryLpTokensFormatted} Cake-LP</span>
              </div>
              <p className="text-[11px] text-secondary">
                100% of Cake-LP tokens resulting from primary sale proceeds are owned and custodied by the LIORA Company Treasury.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reconciliation Audit Panel */}
      <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-extrabold text-white">Automated Treasury Reconciliation Ledger</h2>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
            reconciliation.isValid
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}>
            {reconciliation.isValid ? 'ALL 5 CHECKS PASSED' : 'DISCREPANCY DETECTED'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {reconciliation.checks.map((check, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-start gap-2.5"
            >
              {check.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-bold text-white">{check.name}</div>
                <div className="text-[10px] text-secondary font-mono leading-relaxed">{check.details}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Sales & Liquidity Batches Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Primary Sales */}
        <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Primary Sale Deliveries ({primarySales.length})</h3>
          {primarySales.length === 0 ? (
            <div className="text-xs text-secondary py-6 text-center">No primary sales recorded yet.</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {primarySales.map((sale) => (
                <div key={sale.saleId} className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-white">{sale.tokensDeliveredFormatted} LIORA</div>
                    <div className="text-[10px] text-secondary font-mono">{sale.buyerAddress.slice(0, 6)}...{sale.buyerAddress.slice(-4)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400">+{sale.usdtPaidFormatted} USDT</div>
                    <div className="text-[10px] text-secondary">{new Date(sale.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liquidity Batches */}
        <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Liquidity Allocations ({liquidityBatches.length})</h3>
          {liquidityBatches.length === 0 ? (
            <div className="text-xs text-secondary py-6 text-center">No liquidity batches executed yet.</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {liquidityBatches.map((batch) => (
                <div key={batch.batchId} className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-white">{batch.usdtAllocatedFormatted} USDT + {batch.lioraPairedFormatted} LIORA</div>
                    <div className="text-[10px] text-emerald-400 font-mono">+{batch.lpTokensMintedFormatted} Cake-LP</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300">
                      {batch.status}
                    </span>
                    <div className="text-[10px] text-secondary mt-0.5">{new Date(batch.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
