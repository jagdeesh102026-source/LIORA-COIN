'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useDemoStore } from '../../lib/demo/useDemoStore';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { CommissionCurrency, CommissionStatus } from '../../lib/demo/demoTypes';
import { 
  Sparkles, 
  Coins, 
  CheckCircle2, 
  Clock, 
  ArrowDownToLine, 
  Filter, 
  Layers, 
  Search,
  ExternalLink,
  ArrowRight,
  Info
} from 'lucide-react';

export default function CommissionsPage() {
  const { activeUser, userCommissions, claimAllCommissions } = useDemoStore();
  const { isAuthorized, isInitialized } = useRequireAuth();

  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | CommissionCurrency>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CommissionStatus>('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 1 | 2 | 3>('ALL');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const safeCommissions = userCommissions || [];

  // Totals (must execute unconditionally before any early return)
  const totalApprovedLiora = useMemo(() => {
    return safeCommissions
      .filter((c) => c.status === 'APPROVED' && (c.currency === 'LIORA' || c.currency === 'OXENIQ'))
      .reduce((sum, c) => sum + c.amount, 0);
  }, [safeCommissions]);

  const totalApprovedUsdt = useMemo(() => {
    return safeCommissions
      .filter((c) => c.status === 'APPROVED' && c.currency === 'USDT')
      .reduce((sum, c) => sum + c.amount, 0);
  }, [safeCommissions]);

  const totalPaidLiora = useMemo(() => {
    return safeCommissions
      .filter((c) => c.status === 'PAID' && (c.currency === 'LIORA' || c.currency === 'OXENIQ'))
      .reduce((sum, c) => sum + c.amount, 0);
  }, [safeCommissions]);

  const totalPaidUsdt = useMemo(() => {
    return safeCommissions
      .filter((c) => c.status === 'PAID' && c.currency === 'USDT')
      .reduce((sum, c) => sum + c.amount, 0);
  }, [safeCommissions]);

  // Filtered commissions
  const filtered = useMemo(() => {
    return safeCommissions.filter((c) => {
      if (currencyFilter !== 'ALL') {
        const normCurr = c.currency === 'OXENIQ' ? 'LIORA' : c.currency;
        if (normCurr !== currencyFilter) return false;
      }
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (levelFilter !== 'ALL' && c.level !== levelFilter) return false;
      return true;
    });
  }, [safeCommissions, currencyFilter, statusFilter, levelFilter]);

  if (!isInitialized || !activeUser) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--brand-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-secondary">Authenticating commission records...</p>
      </div>
    );
  }

  const handleClaim = () => {
    setIsClaiming(true);
    setTimeout(() => {
      const res = claimAllCommissions();
      setIsClaiming(false);
      setClaimMessage(
        `Successfully claimed ${res.claimedLiora.toLocaleString()} LIORA and $${res.claimedUsdt.toLocaleString()} USDT directly into your non-custodial balance!`
      );
      setTimeout(() => setClaimMessage(null), 5000);
    }, 700);
  };

  const hasClaimable = totalApprovedLiora > 0 || totalApprovedUsdt > 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#171D2F] via-[#0F1626] to-[#0A101D] border border-[var(--border-prominent)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>COMMISSION LEDGER &amp; PAYOUTS</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
            Commission History
          </h1>
          <p className="text-xs sm:text-sm text-secondary max-w-2xl leading-relaxed">
            Track dual-currency commissions generated from eligible swaps and token purchases made by your downline network across Level 1, 2, and 3.
          </p>
        </div>

        {/* Claim Action */}
        <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
          <button
            onClick={handleClaim}
            disabled={!hasClaimable || isClaiming}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
              hasClaimable && !isClaiming
                ? 'btn-metallic text-white hover:opacity-95'
                : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary cursor-not-allowed opacity-60'
            }`}
          >
            {isClaiming ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Claiming Rewards...</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-4 h-4 text-emerald-300" />
                <span>Claim Approved Rewards</span>
              </>
            )}
          </button>
          <span className="text-[11px] text-amber-300">
            {hasClaimable
              ? 'Simulated Action: Credits demo balance (No on-chain transfer)'
              : 'No claimable rewards at this time'}
          </span>
        </div>
      </div>

      {/* Demo Simulation Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-xs text-blue-200 flex items-center gap-2.5">
        <Info className="w-4 h-4 text-[var(--brand-accent)] shrink-0" />
        <span>
          <strong>Simulated Multi-Tier Ledger:</strong> Sample rates (L1: 5%, L2: 3%, L3: 1%) are illustrative demo values. Claiming rewards simulates allocation into your demo wallet balance with zero on-chain gas or token transfer.
        </span>
      </div>

      {/* Claim Success Banner */}
      {claimMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{claimMessage}</span>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-blue-500/30 space-y-1.5">
          <span className="text-xs text-secondary font-medium">Claimable LIORA</span>
          <div className="text-2xl font-extrabold text-[var(--brand-accent)]">
            {totalApprovedLiora.toLocaleString()}
          </div>
          <span className="text-[11px] text-blue-300 font-semibold">Status: Approved</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-emerald-500/30 space-y-1.5">
          <span className="text-xs text-secondary font-medium">Claimable USDT</span>
          <div className="text-2xl font-extrabold text-emerald-400">
            ${totalApprovedUsdt.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-300 font-semibold">Status: Approved</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-xs text-secondary font-medium">Lifetime LIORA Paid</span>
          <div className="text-2xl font-extrabold text-white">
            {totalPaidLiora.toLocaleString()}
          </div>
          <span className="text-[11px] text-secondary">Settled to wallet</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-xs text-secondary font-medium">Lifetime USDT Paid</span>
          <div className="text-2xl font-extrabold text-white">
            ${totalPaidUsdt.toLocaleString()}
          </div>
          <span className="text-[11px] text-secondary">Settled to wallet</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-secondary font-semibold flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter by:</span>
          </span>

          {/* Currency Filter */}
          <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-1 rounded-lg border border-[var(--border-subtle)]">
            {(['ALL', 'LIORA', 'USDT'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrencyFilter(curr)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  currencyFilter === curr
                    ? 'bg-[var(--brand-accent)] text-black'
                    : 'text-secondary hover:text-white'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-1 rounded-lg border border-[var(--border-subtle)]">
            {(['ALL', 1, 2, 3] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  levelFilter === lvl
                    ? 'bg-purple-500 text-white'
                    : 'text-secondary hover:text-white'
                }`}
              >
                {lvl === 'ALL' ? 'All Tiers' : `Level ${lvl}`}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-1 rounded-lg border border-[var(--border-subtle)]">
            {(['ALL', 'APPROVED', 'PAID'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-emerald-500 text-white'
                    : 'text-secondary hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="text-secondary font-medium">
          Showing <strong>{filtered.length}</strong> records
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)]/60 text-xs text-secondary uppercase font-semibold border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-6">Downline Member</th>
                <th className="py-3 px-6">Upline Tier</th>
                <th className="py-3 px-6">Trade Volume</th>
                <th className="py-3 px-6">Commission Rate</th>
                <th className="py-3 px-6">Reward Earned</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/40 text-xs sm:text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-secondary text-xs">
                    No commission records match your selected filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((comm) => (
                  <tr key={comm.id} className="hover:bg-[var(--bg-primary)]/40 transition-colors">
                    <td className="py-4 px-6 text-secondary text-xs">
                      {new Date(comm.createdAt).toLocaleString()}
                    </td>

                    <td className="py-4 px-6 font-mono text-xs text-white">
                      {comm.sourceUserIdentifier}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          comm.level === 1
                            ? 'bg-blue-500/20 text-blue-300'
                            : comm.level === 2
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        Level {comm.level}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-medium text-white">
                      ${comm.tradeVolumeUsd.toLocaleString()}
                    </td>

                    <td className="py-4 px-6 font-semibold text-white">
                      {comm.commissionRatePercent}%
                    </td>

                    <td className="py-4 px-6 font-bold">
                      <span
                        className={
                          comm.currency === 'LIORA' || comm.currency === 'OXENIQ'
                            ? 'text-[var(--brand-accent)]'
                            : 'text-emerald-400'
                        }
                      >
                        {comm.amount.toLocaleString()} {comm.currency}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          comm.status === 'PAID'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {comm.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

