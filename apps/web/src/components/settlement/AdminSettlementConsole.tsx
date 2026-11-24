'use client';

import React, { useState } from 'react';
import { useManualSettlement } from '../../hooks/useManualSettlement';
import { PaymentRail } from '../../lib/settlement/manualSettlementModel';
import {
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  FileText,
  User,
  ArrowRight,
  Database,
  Lock,
  Layers,
  Check,
} from 'lucide-react';

export const AdminSettlementConsole: React.FC = () => {
  const {
    investments,
    auditLogs,
    reconciliation,
    recordManualPayout,
    resolveDispute,
    isProcessing,
    actionSuccess,
    actionError,
    clearMessages,
    authorizedTreasuryWallet,
    isLoading,
    fetchError,
    isSessionExpired,
    retryFetch,
    refreshSettlements,
  } = useManualSettlement();

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showLogs, setShowLogs] = useState<boolean>(false);

  // Payout Dispatch Modal State
  const [selectedInvForPayout, setSelectedInvForPayout] = useState<any | null>(null);
  const [amountPaidINR, setAmountPaidINR] = useState<number>(0);
  const [paymentRail, setPaymentRail] = useState<PaymentRail>('IMPS_BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Arbitration Modal State
  const [selectedInvForArbitration, setSelectedInvForArbitration] = useState<any | null>(null);
  const [resolutionChoice, setResolutionChoice] = useState<'RESOLVED_PAYMENT_VERIFIED' | 'RESOLVED_COLLATERAL_RELEASED'>('RESOLVED_PAYMENT_VERIFIED');
  const [arbitrationNotes, setArbitrationNotes] = useState<string>('');

  const openPayoutModal = (inv: any) => {
    clearMessages();
    setSelectedInvForPayout(inv);
    setAmountPaidINR(inv.contractualSettlementINR);
    setPaymentRail('IMPS_BANK_TRANSFER');
    setReferenceNumber('');
    setAdminNotes('');
  };

  const handleDispatchPayout = async () => {
    if (!selectedInvForPayout) return;
    const ok = await recordManualPayout(selectedInvForPayout.id, {
      amountPaidINR,
      paymentRail,
      referenceNumber,
      adminNotes,
    });
    if (ok) setSelectedInvForPayout(null);
  };

  const openArbitrationModal = (inv: any) => {
    clearMessages();
    setSelectedInvForArbitration(inv);
    setResolutionChoice('RESOLVED_PAYMENT_VERIFIED');
    setArbitrationNotes('');
  };

  const handleConfirmArbitration = async () => {
    if (!selectedInvForArbitration) return;
    const ok = await resolveDispute(
      selectedInvForArbitration.id,
      resolutionChoice,
      arbitrationNotes
    );
    if (ok) setSelectedInvForArbitration(null);
  };

  const filteredInvestments = investments.filter((inv) => {
    if (activeFilter === 'MATURED' && inv.stage !== 'COLLATERAL_PERIOD_COMPLETED' && inv.stage !== 'MANUAL_PAYOUT_INITIATED') return false;
    if (activeFilter === 'DISPUTED' && inv.stage !== 'DISPUTED_OR_FAILED_SETTLEMENT') return false;
    if (activeFilter === 'SETTLED' && inv.stage !== 'SETTLEMENT_COMPLETED') return false;
    if (activeFilter === 'ACTIVE' && inv.stage !== 'COLLATERAL_PERIOD_ACTIVE') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        inv.id.toLowerCase().includes(q) ||
        inv.investorName.toLowerCase().includes(q) ||
        inv.investorAddress.toLowerCase().includes(q) ||
        inv.planDisplayName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-[#0A101D] border border-[var(--border-prominent)] shadow-xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-xl font-extrabold text-white">Manual Investment Settlement Console</h2>
              <p className="text-xs text-secondary">
                Grandiose Tech treasury portal for recording off-chain cash settlements, verifying collateral returns, and auditing reconciliations
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                Checklist (3) Verified
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300 uppercase">
                Simulated Sandbox
              </span>
            </div>
            <span className="text-[10px] text-secondary font-mono block mt-1">Authorized Treasury Wallet</span>
            <span className="text-xs font-mono font-bold text-white">
              {authorizedTreasuryWallet.slice(0, 6)}...{authorizedTreasuryWallet.slice(-4)}
            </span>
          </div>
        </div>
      </div>

      {/* Backend Synchronization & Error Handling (Task 1 / SEC-01) */}
      {isLoading && (
        <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2.5 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-blue-400" />
          <span>Synchronizing treasury settlement records with authoritative backend...</span>
        </div>
      )}

      {isSessionExpired && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Treasury administrative session expired or not authenticated. Please re-authenticate as Grandiose Tech Treasury Owner.</span>
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

      {/* 4 Reconciliation Metric Cards */}
      {reconciliation && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] text-secondary font-medium">Total Contractual Settlement Liabilities</span>
            <div className="text-lg font-extrabold text-white font-mono">
              ₹{reconciliation.totalContractualSettlementINR.toLocaleString()}
            </div>
            <span className="text-[10px] text-secondary">Across {reconciliation.totalInvestmentsCount} total plans</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] text-secondary font-medium">Active Collateral Outstanding</span>
            <div className="text-lg font-extrabold text-amber-300 font-mono">
              {reconciliation.activeCollateralOutLIORA.toLocaleString()} LIORA
            </div>
            <span className="text-[10px] text-amber-400/80">Secured in investor custody/escrow</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] text-secondary font-medium">Collateral Returned & Settled</span>
            <div className="text-lg font-extrabold text-emerald-400 font-mono">
              {reconciliation.totalCollateralReturnedLIORA.toLocaleString()} LIORA
            </div>
            <span className="text-[10px] text-emerald-400/80">{reconciliation.settledCount} plans settled</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-emerald-300 font-medium">Reconciliation Integrity</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-extrabold text-white font-mono">
              {reconciliation.isReconciled ? '100% BALANCED' : 'DISCREPANCY'}
            </div>
            <span className="text-[10px] text-secondary font-mono">
              Variance: {reconciliation.reconciliationDiscrepancyLIORA} LIORA
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {['ALL', 'ACTIVE', 'MATURED', 'DISPUTED', 'SETTLED'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeFilter === f
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-[var(--bg-primary)] text-secondary hover:text-white border border-[var(--border-subtle)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search plan ID, name, wallet..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-white placeholder-secondary focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
              showLogs
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-[var(--bg-primary)] text-secondary border-[var(--border-subtle)] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Investment Roster Table */}
      <div className="rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)]/80 text-secondary border-b border-[var(--border-subtle)] uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Plan & Investor</th>
                <th className="py-3 px-4">Principal (INR)</th>
                <th className="py-3 px-4">Due Cash Settlement</th>
                <th className="py-3 px-4">Original Collateral</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/40 font-mono text-[11px]">
              {filteredInvestments.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-sans">
                    <div className="font-bold text-white text-xs">{inv.planDisplayName} ({inv.id})</div>
                    <div className="text-[11px] text-secondary font-mono">{inv.investorName} • {inv.investorAddress.slice(0, 6)}...{inv.investorAddress.slice(-4)}</div>
                  </td>
                  <td className="py-3.5 px-4 text-white font-bold">
                    ₹{inv.principalINR.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-300 font-bold">
                    ₹{inv.contractualSettlementINR.toLocaleString()}
                    <span className="text-[10px] text-secondary block font-sans">Month {inv.settlementPayoutMonth} Due</span>
                  </td>
                  <td className="py-3.5 px-4 text-amber-300 font-bold">
                    {Number(inv.originalCollateralTokensFormatted).toLocaleString()} LIORA
                    <span className="text-[10px] text-secondary block font-sans">@ ₹{inv.initialAllocationPriceINR} (Fixed)</span>
                  </td>
                  <td className="py-3.5 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300">
                      {inv.stage}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-sans">
                    {inv.stage === 'COLLATERAL_PERIOD_COMPLETED' || inv.stage === 'MANUAL_PAYOUT_INITIATED' ? (
                      <button
                        type="button"
                        onClick={() => openPayoutModal(inv)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Record Cash Payout</span>
                      </button>
                    ) : inv.stage === 'DISPUTED_OR_FAILED_SETTLEMENT' ? (
                      <button
                        type="button"
                        onClick={() => openArbitrationModal(inv)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Arbitrate Dispute</span>
                      </button>
                    ) : (
                      <span className="text-secondary text-[10px] font-mono">No Action Required</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit History Panel */}
      {showLogs && (
        <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-white font-extrabold text-sm">
              <Database className="w-4 h-4 text-purple-400" />
              <span>Immutable Settlement Ledger Trail</span>
            </div>
            <span className="text-[11px] text-secondary font-mono">{auditLogs.length} total entries</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs space-y-1">
                <div className="flex items-center justify-between font-mono text-[10px] text-secondary">
                  <span>{new Date(log.timestamp).toLocaleString()} • {log.investmentId}</span>
                  <span className="text-emerald-400 font-bold">{log.action}</span>
                </div>
                <p className="text-slate-300 text-[11px] font-sans">{log.details}</p>
                <div className="text-[10px] font-mono text-secondary truncate">
                  Actor: {log.actor} {log.referenceId ? `• Ref: ${log.referenceId}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {selectedInvForPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0F172A] border border-[var(--border-prominent)] shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <DollarSign className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-sm text-white">Record Manual Fiat Cash Payout</h3>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Record off-chain bank / M-Pesa transfer details for {selectedInvForPayout.investorName} ({selectedInvForPayout.id}). Status will update to MANUAL_PAYOUT_INITIATED awaiting independent verification.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Amount to Pay (INR)</label>
                <input
                  type="number"
                  value={amountPaidINR}
                  onChange={(e) => setAmountPaidINR(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Payment Rail</label>
                <select
                  value={paymentRail}
                  onChange={(e) => setPaymentRail(e.target.value as PaymentRail)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-xs focus:outline-none focus:border-purple-400"
                >
                  <option value="IMPS_BANK_TRANSFER">IMPS Bank Transfer (India)</option>
                  <option value="RTGS_WIRE">RTGS Wire Transfer (India)</option>
                  <option value="NEFT_BANK_TRANSFER">NEFT Bank Transfer (India)</option>
                  <option value="MPESA_MOBILE_MONEY">M-Pesa Mobile Money (Kenya / East Africa)</option>
                  <option value="USDT_TESTNET_TRANSFER">USDT Testnet Remittance</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Bank Reference / UTR Number</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. HDFC-UTR-901238471928"
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Admin Notes (Optional)</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Dispatched from Grandiose Tech operational account"
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-xs focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvForPayout(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-secondary hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchPayout}
                disabled={!referenceNumber || referenceNumber.trim().length < 5 || isProcessing}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs"
              >
                Record Payout Reference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arbitration Modal */}
      {selectedInvForArbitration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0F172A] border border-[var(--border-prominent)] shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-sm text-white">Dispute Arbitration Console</h3>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Review dispute on investment {selectedInvForArbitration.id}.
            </p>

            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-200">
              <span className="font-bold block text-white mb-1">Investor Reason:</span>
              <p className="text-[11px] text-slate-300 font-sans">{selectedInvForArbitration.dispute?.reason}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Resolution Ruling</label>
                <select
                  value={resolutionChoice}
                  onChange={(e) => setResolutionChoice(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-xs focus:outline-none focus:border-rose-400"
                >
                  <option value="RESOLVED_PAYMENT_VERIFIED">Payment Verified (Investor bank statement confirmed, proceed to collateral return)</option>
                  <option value="RESOLVED_COLLATERAL_RELEASED">Default Confirmed (Payment failed, investor retains collateral tokens)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Arbitration Evidence & Notes</label>
                <textarea
                  value={arbitrationNotes}
                  onChange={(e) => setArbitrationNotes(e.target.value)}
                  placeholder="Record bank NOC certificate number, statement reference, or mediation notes..."
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-xs focus:outline-none focus:border-rose-400 resize-none h-20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvForArbitration(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-secondary hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArbitration}
                disabled={arbitrationNotes.trim().length < 5 || isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs"
              >
                Finalize Arbitration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
