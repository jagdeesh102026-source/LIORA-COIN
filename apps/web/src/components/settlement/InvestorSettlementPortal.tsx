'use client';

import React, { useState } from 'react';
import { useManualSettlement } from '../../hooks/useManualSettlement';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import { InvestmentSettlementRecord } from '../../lib/settlement/manualSettlementModel';
import { CONFIRMED_INVESTMENT_PLANS } from '../../lib/allocation/proportionalAllocationEngine';
import {
  ShieldCheck,
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Wallet,
  FileText,
  DollarSign,
  Info,
  Layers,
  History,
} from 'lucide-react';

export const InvestorSettlementPortal: React.FC = () => {
  const { isConnected, address, connect } = useWeb3Wallet();
  const {
    userInvestments,
    auditLogs,
    confirmInvestorPayment,
    returnCollateral,
    raiseDispute,
    isProcessing,
    actionSuccess,
    actionError,
    clearMessages,
    isLoading,
    fetchError,
    isSessionExpired,
    retryFetch,
    refreshSettlements,
  } = useManualSettlement();

  const [disputeModalInvId, setDisputeModalInvId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [showHistoryModalInvId, setShowHistoryModalInvId] = useState<string | null>(null);

  const handleOpenDispute = (invId: string) => {
    clearMessages();
    setDisputeModalInvId(invId);
    setDisputeReason('');
  };

  const handleConfirmDispute = async () => {
    if (!disputeModalInvId) return;
    const ok = await raiseDispute(disputeModalInvId, disputeReason);
    if (ok) {
      setDisputeModalInvId(null);
      setDisputeReason('');
    }
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'INVESTMENT_CREATED':
      case 'INITIAL_ALLOCATION_CALCULATED':
      case 'COLLATERAL_ALLOCATION_FINALIZED':
      case 'COLLATERAL_PERIOD_ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Lock-In Term Active
          </span>
        );
      case 'COLLATERAL_PERIOD_COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Matured (Awaiting Cash Payout)
          </span>
        );
      case 'MANUAL_PAYOUT_INITIATED':
      case 'PAYMENT_VERIFICATION_PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Payout Initiated (Verify Receipt)
          </span>
        );
      case 'PAYMENT_INDEPENDENTLY_VERIFIED':
      case 'COLLATERAL_RETURN_PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Cash Verified (Return Collateral)
          </span>
        );
      case 'EXACT_ORIGINAL_COLLATERAL_RETURNED':
      case 'SETTLEMENT_COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-500/20 border border-slate-500/30 text-slate-300 text-[11px] font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Settlement Completed
          </span>
        );
      case 'DISPUTED_OR_FAILED_SETTLEMENT':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Disputed / Failed (Under Arbitration)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-300 text-[11px] font-bold">
            {stage}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#111A2E] via-[#0E1726] to-[#0A101D] border border-[var(--border-prominent)] shadow-xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-extrabold text-white">Collateral & Investment Settlement Portal</h2>
              <p className="text-xs text-secondary">
                Track your active lock-in plans, fixed proportional collateral token allocations, and manual cash settlement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
              Checklist (3) Compliant
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300 uppercase">
              Simulated Prototype
            </span>
          </div>
        </div>
      </div>

      {/* Backend Connection, Session & Error Handling (Task 1 / SEC-01) */}
      {isLoading && (
        <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2.5 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-blue-400" />
          <span>Synchronizing verified settlement records with authoritative backend...</span>
        </div>
      )}

      {isSessionExpired && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Authenticated session expired or wallet not signed in. Connect and verify wallet to view private settlement records.</span>
          </div>
          <button
            onClick={retryFetch}
            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {fetchError && !isSessionExpired && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Backend Sync Error: {fetchError}</span>
          </div>
          <button
            onClick={retryFetch}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Messages */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={clearMessages} className="text-secondary hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={clearMessages} className="text-secondary hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {/* Option A Custody & Read-Only Disclosure */}
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs space-y-1.5 leading-relaxed">
        <div className="flex items-center gap-2 text-white font-bold">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Option A Custody & Read-Only Investor Permissions:</span>
        </div>
        <p className="text-slate-300">
          All allocated tokens are held in <strong>Company-Controlled Custody</strong> in the company treasury wallet. Investors receive verified <strong>Custodial LIORA Allocation Records</strong>, not direct wallet transfers. In accordance with security architecture, investors have <strong>no ability to transfer, split, swap, burn, mint or withdraw</strong> custodial LIORA. Tokens remain safely in company custody against agreed manual cash settlement at plan maturity.
        </p>
      </div>

      {/* Approved Investment Plans (Checklist 3 Baseline) */}
      <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Approved Investment Plans (Checklist 3)</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
            6 Approved Tiers
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(CONFIRMED_INVESTMENT_PLANS).map((plan) => (
            <div
              key={plan.planId}
              className={`p-4 rounded-2xl bg-[var(--bg-primary)] border ${
                plan.isRecommended ? 'border-amber-500/40 shadow-amber-500/5' : 'border-[var(--border-subtle)]'
              } space-y-2 text-xs`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-white">{plan.displayName}</span>
                {plan.isRecommended && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[9px] uppercase border border-amber-500/30">
                    Recommended
                  </span>
                )}
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-secondary" suppressHydrationWarning>
                  <span>Investment:</span>
                  <span className="text-white font-bold" suppressHydrationWarning>₹{plan.principalINR.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between text-secondary" suppressHydrationWarning>
                  <span>Contractual Value:</span>
                  <span className="text-emerald-400 font-bold" suppressHydrationWarning>₹{plan.contractualAllocationINR.toLocaleString('en-US')} ({plan.multiplierFactor}×)</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Lock Duration:</span>
                  <span className="text-blue-300">{plan.lockDurationMonths} Months (Payout M{plan.settlementPayoutMonth})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Plans List */}
      <div className="space-y-4">
        {userInvestments.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary text-xs">
            No active investments registered for this wallet address.
          </div>
        ) : (
          userInvestments.map((inv) => (
            <div
              key={inv.id}
              className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-xl space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base">{inv.planDisplayName}</span>
                    <span className="text-xs font-mono text-secondary">({inv.id})</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      Tier {inv.tierNumber}
                    </span>
                  </div>
                  <div className="text-xs text-secondary mt-0.5">
                    Investor: <span className="font-mono text-white">{inv.investorAddress.slice(0, 6)}...{inv.investorAddress.slice(-4)}</span> ({inv.investorName})
                    <span className="mx-2">•</span>
                    Allocation Date: <span className="text-slate-300">{new Date(inv.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {getStageBadge(inv.stage)}
              </div>

              {/* Comprehensive Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]" suppressHydrationWarning>
                  <span className="text-secondary block">Principal Investment</span>
                  <span className="font-bold text-white text-sm font-mono" suppressHydrationWarning>₹{inv.principalINR.toLocaleString('en-US')}</span>
                  <span className="text-[10px] text-secondary block font-mono">(${inv.principalUSD.toFixed(2)} USD)</span>
                </div>

                <div className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]" suppressHydrationWarning>
                  <span className="text-secondary block">Contractual Cash Settlement</span>
                  <span className="font-bold text-emerald-300 text-sm font-mono" suppressHydrationWarning>₹{inv.contractualSettlementINR.toLocaleString('en-US')}</span>
                  <span className="text-[10px] text-emerald-400 block font-mono">{inv.multiplierFactor}× factor (Fixed)</span>
                </div>

                <div className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-amber-500/30" suppressHydrationWarning>
                  <span className="text-amber-300 font-bold block text-[10px] uppercase tracking-wide">Custodial LIORA Allocation</span>
                  <span className="font-bold text-amber-300 text-sm font-mono" suppressHydrationWarning>{Number(inv.originalCollateralTokensFormatted).toLocaleString('en-US')} LIORA</span>
                  <span className="text-[10px] text-secondary block font-mono">Company Custody • Read-Only Record</span>
                </div>

                <div className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                  <span className="text-secondary block">Lock-In & Maturity</span>
                  <span className="font-bold text-white text-sm">{inv.termMonths} Months Lock</span>
                  <span className="text-[10px] text-emerald-400 block font-semibold">Cash Payout: Month {inv.settlementPayoutMonth}</span>
                </div>
              </div>

              {/* Dispatched Payment Info (if present) */}
              {inv.payoutDispatched && (
                <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-purple-200">
                    <span className="font-bold flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-purple-300" /> Manual Payment Dispatched by Company Owner
                    </span>
                    <span className="font-mono text-[11px] text-secondary">
                      {new Date(inv.payoutDispatched.dispatchedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1 text-slate-300">
                    <div>Rail: <strong className="text-white">{inv.payoutDispatched.paymentRail}</strong></div>
                    <div>Ref / UTR: <strong className="text-purple-300">{inv.payoutDispatched.referenceNumber}</strong></div>
                    <div suppressHydrationWarning>Amount: <strong className="text-emerald-400" suppressHydrationWarning>₹{inv.payoutDispatched.amountPaidINR.toLocaleString('en-US')}</strong></div>
                  </div>
                  {inv.payoutDispatched.adminNotes && (
                    <p className="text-[10px] text-secondary italic">"{inv.payoutDispatched.adminNotes}"</p>
                  )}
                </div>
              )}

              {/* Payment Verification Proof (if present) */}
              {inv.paymentVerification && (
                <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1 text-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Independent Payment Verification Confirmed
                    </span>
                    <span className="text-[10px] font-mono text-secondary">
                      {new Date(inv.paymentVerification.verifiedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300">
                    Method: <strong className="text-white">{inv.paymentVerification.verificationMethod}</strong> | By: <span className="text-emerald-400">{inv.paymentVerification.verifiedBy.slice(0, 10)}...</span>
                  </div>
                </div>
              )}

              {/* Collateral Returned Proof (if present) */}
              {inv.collateralReturned && (
                <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-500/30 text-xs space-y-1 text-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Exact Collateral Returned to Treasury
                    </span>
                    <span className="text-[10px] font-mono text-secondary">
                      {new Date(inv.collateralReturned.returnedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300" suppressHydrationWarning>
                    Returned: <strong className="text-amber-300" suppressHydrationWarning>{Number(inv.collateralReturned.returnedTokensFormatted).toLocaleString('en-US')} LIORA</strong> (Exact match: {inv.collateralReturned.isExactQuantityMatch ? 'YES' : 'NO'})
                  </div>
                  <div className="text-[10px] font-mono text-secondary truncate">
                    Tx Hash: <span className="text-blue-300">{inv.collateralReturned.txHash}</span>
                  </div>
                </div>
              )}

              {/* Dispute Info (if present) */}
              {inv.dispute && (
                <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-1 text-rose-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Active Dispute Registered ({inv.dispute.disputeId})
                    </span>
                    <span className="font-mono text-[10px] uppercase font-bold text-amber-300">{inv.dispute.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans">Reason: {inv.dispute.reason}</p>
                  {inv.dispute.arbitrationNotes && (
                    <p className="text-[10px] text-amber-300 font-mono">Arbitration note: {inv.dispute.arbitrationNotes}</p>
                  )}
                </div>
              )}

              {/* Action Buttons depending on Stage */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex flex-wrap items-center gap-2">
                  {(inv.stage === 'MANUAL_PAYOUT_INITIATED' || inv.stage === 'PAYMENT_VERIFICATION_PENDING') && (
                    <>
                      <button
                        type="button"
                        onClick={() => confirmInvestorPayment(inv.id)}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Bank Payment Received</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDispute(inv.id)}
                        disabled={isProcessing}
                        className="px-3.5 py-2 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Raise Dispute (Funds Not Received)</span>
                      </button>
                    </>
                  )}

                  {(inv.stage === 'PAYMENT_INDEPENDENTLY_VERIFIED' || inv.stage === 'COLLATERAL_RETURN_PENDING') && (
                    <button
                      type="button"
                      onClick={() => returnCollateral(inv.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span suppressHydrationWarning>Return Exact {Number(inv.originalCollateralTokensFormatted).toLocaleString('en-US')} Collateral LIORA</span>
                    </button>
                  )}

                  {inv.stage === 'COLLATERAL_PERIOD_ACTIVE' && (
                    <div className="text-xs text-secondary font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Lock-in period active. Cash payment due in Month {inv.settlementPayoutMonth}.</span>
                    </div>
                  )}

                  {inv.stage === 'COLLATERAL_PERIOD_COMPLETED' && (
                    <div className="text-xs text-amber-300 font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Lock-in completed. Awaiting company owner manual payout dispatch.</span>
                    </div>
                  )}

                  {inv.stage === 'SETTLEMENT_COMPLETED' && (
                    <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Settlement completed. Cash verified & exact collateral returned.</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowHistoryModalInvId(inv.id)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-primary)] text-xs text-secondary hover:text-white flex items-center gap-1 transition-all"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit History</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Audit History Modal */}
      {showHistoryModalInvId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#0F172A] border border-[var(--border-prominent)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Investment Audit Trail ({showHistoryModalInvId})</span>
              </div>
              <button
                onClick={() => setShowHistoryModalInvId(null)}
                className="text-secondary hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {auditLogs.filter(l => l.investmentId === showHistoryModalInvId).length === 0 ? (
                <div className="text-center text-xs text-secondary py-4">No audit entries found.</div>
              ) : (
                auditLogs
                  .filter(l => l.investmentId === showHistoryModalInvId)
                  .map((log) => (
                    <div key={log.id} className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono text-[10px] text-secondary">
                        <span suppressHydrationWarning>{new Date(log.timestamp).toISOString()}</span>
                        <span className="text-emerald-400 font-bold">{log.action}</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{log.details}</p>
                      <div className="text-[10px] font-mono text-secondary truncate">
                        Actor: {log.actor} {log.referenceId ? `• Ref: ${log.referenceId}` : ''}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalInvId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0F172A] border border-[var(--border-prominent)] shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-sm text-white">Raise Cash Payment Dispute</h3>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              If the owner marked payment as dispatched but funds have not credited your bank account, filing a dispute freezes the collateral in escrow and initiates independent verification.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">Dispute Reason / Details</label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe bank statement status, date checked, or bank rejection notice..."
                className="w-full p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-xs focus:outline-none focus:border-rose-400 resize-none h-24"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDisputeModalInvId(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-secondary hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispute}
                disabled={disputeReason.trim().length < 10 || isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
