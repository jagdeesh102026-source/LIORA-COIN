'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDemoStore } from '../../lib/demo/useDemoStore';
import { 
  Wallet, 
  ArrowUpRight, 
  TrendingUp, 
  Coins, 
  Sparkles, 
  ShieldCheck, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  PlusCircle,
  FileText,
  DollarSign,
  Info,
  Copy,
  Check,
  Zap,
  ArrowRight,
  LogOut,
  Building,
  Tag,
  CreditCard,
  X
} from 'lucide-react';

interface CustodialPaymentRecord {
  paymentId: string;
  paymentReference: string;
  amountPaid: number;
  currency: 'INR' | 'USD';
  paymentRail: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  submittedAt: number;
  verifiedAt: number | null;
  verifyingAdmin: string | null;
  adminNotes: string | null;
}

interface CustodialAllocationRecord {
  allocationId: string;
  investorAddress: string;
  investorName: string;
  planId: string;
  tierNumber: string;
  displayName: string;
  principalINR: number;
  principalUSD: number;
  contractualSettlementINR: number;
  multiplierFactor: number;
  lockDurationMonths: number;
  allocationPriceINR: string;
  allocatedTokensFormatted: string;
  allocatedTokensBaseUnits: string;
  status: string;
  paymentRecord: CustodialPaymentRecord;
  createdAt: number;
  activatedAt: number | null;
}

interface CustodyDataResponse {
  success: boolean;
  investorAddress: string | null;
  totalConfirmedLIORA: number;
  totalConfirmedTokensFormatted: string;
  totalPendingLIORA: number;
  totalPendingTokensFormatted: string;
  totalPurchaseINR: number;
  totalPurchaseUSD: number;
  currentReferencePriceINR: string;
  illustrativeValueINR: string;
  illustrativeValueLabel: string;
  disclaimer: string;
  custodialAllocations: CustodialAllocationRecord[];
  confirmedAllocations: CustodialAllocationRecord[];
  pendingAllocations: CustodialAllocationRecord[];
  rejectedAllocations: CustodialAllocationRecord[];
}

const INVESTMENT_PLANS = [
  { id: 'TIER_01', name: 'Tier 01 (Starter)', principalINR: 50000, contractualAllocationINR: 125000, multiplier: 2.5, payoutMonth: 4, lockMonths: 3, maturityNote: 'Month 4 settlement (3M lock)' },
  { id: 'TIER_02', name: 'Tier 02 (Basic)', principalINR: 100000, contractualAllocationINR: 600000, multiplier: 6.0, payoutMonth: 4, lockMonths: 3, maturityNote: 'Month 4 settlement (3M lock)' },
  { id: 'TIER_03', name: 'Tier 03 (Standard)', principalINR: 200000, contractualAllocationINR: 1000000, multiplier: 5.0, payoutMonth: 4, lockMonths: 3, maturityNote: 'Month 4 settlement (3M lock)' },
  { id: 'TIER_04', name: 'Tier 04 (Advanced)', principalINR: 300000, contractualAllocationINR: 2400000, multiplier: 8.0, payoutMonth: 10, lockMonths: 9, maturityNote: 'Month 10 settlement (9M lock)' },
  { id: 'TIER_05', name: 'Tier 05 (Premium)', principalINR: 500000, contractualAllocationINR: 3000000, multiplier: 6.0, payoutMonth: 12, lockMonths: 12, maturityNote: '12M lock (Month 12 vs 13 pending confirmation)' },
  { id: 'TIER_06', name: 'Tier 06 (Elite)', principalINR: 1000000, contractualAllocationINR: 9000000, multiplier: 9.0, payoutMonth: 12, lockMonths: 12, maturityNote: '12M lock (Month 12 vs 13 pending confirmation)' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { activeUser, logout: storeLogout } = useDemoStore();

  const [custodyData, setCustodyData] = useState<CustodyDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'REJECTED'>('ALL');

  // Purchase Modal State
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('TIER_01');
  const [paymentRail, setPaymentRail] = useState('IMPS_BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // Admin Verification Action State removed from investor-facing dashboard (moved strictly to /admin console)

  // Prevent background scrolling and enable Escape key to close modal
  useEffect(() => {
    if (!showPurchaseModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPurchaseModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPurchaseModal]);

  // Authoritative Data Fetcher (derives investor identity from authenticated session)
  const fetchCustodyData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/custody/allocations', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.status === 401) {
        // Not authenticated, redirect to /auth
        router.push('/auth');
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `Server returned HTTP ${res.status}`);
      }

      const data: CustodyDataResponse = await res.json();
      if (data.success) {
        setCustodyData(data);
      } else {
        setErrorMsg('Failed to load custodial allocation data.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with PostgreSQL custodial ledger.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCustodyData();
  }, [fetchCustodyData]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    storeLogout();
    router.push('/auth');
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Selected plan calculation
  const selectedPlan = useMemo(() => {
    return INVESTMENT_PLANS.find((p) => p.id === selectedPlanId) || INVESTMENT_PLANS[0];
  }, [selectedPlanId]);

  const currentPriceNum = useMemo(() => {
    return parseFloat(custodyData?.currentReferencePriceINR || '0.20') || 0.20;
  }, [custodyData]);

  const estimatedTokens = useMemo(() => {
    return Math.floor(selectedPlan.contractualAllocationINR / currentPriceNum);
  }, [selectedPlan, currentPriceNum]);

  // Handle Purchase Request Submission
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseError(null);
    setPurchaseSuccess(null);

    if (!paymentRef.trim() || paymentRef.trim().length < 5) {
      setPurchaseError('Please provide a valid payment reference or transaction UTR (at least 5 characters).');
      return;
    }

    setPurchaseSubmitting(true);
    try {
      const payload: any = {
        planId: selectedPlan.id,
        amountPaid: selectedPlan.principalINR,
        currency: 'INR',
        paymentRail,
        paymentReference: paymentRef.trim(),
        initialAllocationPriceINR: custodyData?.currentReferencePriceINR || '0.20',
      };

      if (custodyData?.investorAddress) {
        payload.investorAddress = custodyData.investorAddress;
      }

      const res = await fetch('/api/custody/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to submit purchase request.');
      }

      setPurchaseSuccess(`Purchase request registered! Order Reference: ${data.orderReference || paymentRef.trim()}. Awaiting administrative payment verification.`);
      setPaymentRef('');
      // Refresh allocations list immediately
      await fetchCustodyData();
      setTimeout(() => {
        setShowPurchaseModal(false);
        setPurchaseSuccess(null);
      }, 2500);
    } catch (err: any) {
      setPurchaseError(err.message || 'An error occurred during purchase request submission.');
    } finally {
      setPurchaseSubmitting(false);
    }
  };

  // Filtered allocations based on active tab
  const displayedAllocations = useMemo(() => {
    if (!custodyData?.custodialAllocations) return [];
    if (activeTab === 'CONFIRMED') return custodyData.confirmedAllocations;
    if (activeTab === 'PENDING') return custodyData.pendingAllocations;
    if (activeTab === 'REJECTED') return custodyData.rejectedAllocations;
    return custodyData.custodialAllocations;
  }, [custodyData, activeTab]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      {/* Top Banner / Account Overview */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#111A2E] via-[#0E1726] to-[#0A101D] border border-[var(--border-prominent)] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PostgreSQL Authoritative Custody • Company Vault Backed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Investor Portal{' '}
            {activeUser?.username && (
              <span className="text-[var(--brand-accent)] text-xl font-normal">
                (@{activeUser.username})
              </span>
            )}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
            {custodyData?.investorAddress ? (
              <div className="flex items-center gap-1.5 font-mono text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                <Wallet className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  {`${custodyData.investorAddress.slice(0, 8)}...${custodyData.investorAddress.slice(-6)}`}
                </span>
                <button
                  onClick={() => copyAddress(custodyData.investorAddress!)}
                  className="p-0.5 text-secondary hover:text-white transition-colors"
                  title="Copy custodial address"
                >
                  {copiedAddress ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ) : (
              <span>Authenticated Session Active</span>
            )}
            <span>•</span>
            <span className="text-slate-400">BNB Smart Chain (BEP-20)</span>
            <span>•</span>
            <span className="text-amber-400 font-semibold">Option A Custody Model</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Purchase Request</span>
          </button>

          <button
            onClick={fetchCustodyData}
            disabled={isLoading}
            className="px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary hover:text-white font-bold text-xs flex items-center gap-2 hover:bg-[var(--bg-elevated)]/80 transition-all"
            title="Refresh allocations from database"
          >
            <RefreshCw className={`w-4 h-4 text-[var(--brand-accent)] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-bold text-xs transition-colors flex items-center gap-1.5"
            title="Sign out of investor session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* 4 Core Financial Metric Cards (Priority 1 Requirements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Confirmed LIORA Allocation */}
        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-secondary font-medium">
            <span>Confirmed LIORA Allocation</span>
            <img src="/assets/liora-logo-128.png" alt="LIORA" className="w-5 h-5 rounded-full object-contain" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--brand-accent)] tracking-tight">
            {custodyData?.totalConfirmedTokensFormatted || '0'}{' '}
            <span className="text-xs text-slate-400 font-normal">LIORA</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Backed by Treasury Vault</span>
          </div>
        </div>

        {/* Card 2: Pending Purchase Requests Separately */}
        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs text-secondary font-medium">
            <span>Pending Purchase Requests</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-300 tracking-tight">
            {custodyData?.totalPendingTokensFormatted || '0'}{' '}
            <span className="text-xs text-slate-400 font-normal">LIORA</span>
          </div>
          <div className="text-[11px] text-amber-400/90 font-medium">
            Awaiting Admin Verification (Unconfirmed)
          </div>
        </div>

        {/* Card 3: Total Purchase Investment */}
        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs text-secondary font-medium">
            <span>Total Confirmed Investment</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white" suppressHydrationWarning>
            ₹{(custodyData?.totalPurchaseINR || 0).toLocaleString('en-US')}{' '}
            <span className="text-xs text-secondary font-normal">INR</span>
          </div>
          <div className="text-[11px] text-secondary" suppressHydrationWarning>
            ≈ ${(custodyData?.totalPurchaseUSD || 0).toLocaleString('en-US')} USD
          </div>
        </div>

        {/* Card 4: Current Reference Price & Illustrative Valuation */}
        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs text-secondary font-medium">
            <span>Reference Price (Benchmark)</span>
            <Tag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            ₹{custodyData?.currentReferencePriceINR || '0.20'}{' '}
            <span className="text-xs text-slate-400 font-normal">/ LIORA</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Illustrative Value:</span>
            <strong className="text-white font-mono">₹{custodyData?.illustrativeValueINR || '0.00'} INR</strong>
          </div>
        </div>
      </div>

      {/* Mandatory Illustrative Value & Compliance Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-300">
            {custodyData?.illustrativeValueLabel || 'Illustrative Indicative Value (Non-guaranteed internal benchmark)'}
          </div>
          <p className="text-[11px] leading-relaxed text-amber-200/80">
            {custodyData?.disclaimer ||
              'Custodial LIORA allocations are held in company treasury custody on behalf of the investor against agreed contractual cash settlement. Reference valuations represent an internal economic schedule and are NOT a guaranteed return or DEX market price.'}
          </p>
        </div>
      </div>

      {/* Allocations & Purchases History Table (Priority 1, 7 & 8 Requirements) */}
      <div className="rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Purchase & Allocation History</h2>
            <p className="text-xs text-secondary">
              Authoritative transaction records persisted in PostgreSQL database
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
            {(['ALL', 'CONFIRMED', 'PENDING', 'REJECTED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-secondary hover:text-white'
                }`}
              >
                {tab === 'ALL' && `All (${custodyData?.custodialAllocations?.length || 0})`}
                {tab === 'CONFIRMED' && `Confirmed (${custodyData?.confirmedAllocations?.length || 0})`}
                {tab === 'PENDING' && `Pending (${custodyData?.pendingAllocations?.length || 0})`}
                {tab === 'REJECTED' && `Rejected (${custodyData?.rejectedAllocations?.length || 0})`}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {displayedAllocations.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Coins className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">No {activeTab.toLowerCase()} allocations found.</div>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {activeTab === 'PENDING'
                ? 'You have no pending purchase requests awaiting verification.'
                : 'Submit a new purchase request to register your custodial LIORA allocation.'}
            </p>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              Submit First Purchase Request
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-primary)]/60 text-xs text-secondary uppercase font-semibold border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-3.5 px-6">Order / Plan</th>
                  <th className="py-3.5 px-6">Payment Reference</th>
                  <th className="py-3.5 px-6">Amount Paid</th>
                  <th className="py-3.5 px-6">Purchase Price</th>
                  <th className="py-3.5 px-6">LIORA Allocated</th>
                  <th className="py-3.5 px-6">Verification Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]/40 text-xs sm:text-sm">
                {displayedAllocations.map((alloc) => {
                  const payment = alloc.paymentRecord || {};
                  const isPending =
                    alloc.status === 'PENDING_PAYMENT_VERIFICATION' ||
                    payment.verificationStatus === 'PENDING';
                  const isConfirmed =
                    alloc.status === 'ACTIVE_CUSTODIAL_ALLOCATION' ||
                    payment.verificationStatus === 'VERIFIED';
                  const isRejected =
                    alloc.status === 'REJECTED' || payment.verificationStatus === 'REJECTED';

                  return (
                    <tr key={alloc.allocationId} className="hover:bg-[var(--bg-primary)]/30 transition-colors">
                      {/* Plan / Tier */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{alloc.displayName || alloc.planId}</div>
                        <div className="text-[11px] font-mono text-secondary mt-0.5">
                          {alloc.allocationId}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5" suppressHydrationWarning>
                          {new Date(alloc.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                        </div>
                      </td>

                      {/* Payment Reference */}
                      <td className="py-4 px-6">
                        <div className="font-mono text-white text-xs font-semibold">
                          {payment.paymentReference || 'N/A'}
                        </div>
                        <div className="text-[11px] text-secondary">
                          {payment.paymentRail?.replace(/_/g, ' ') || 'IMPS'}
                        </div>
                      </td>

                      {/* Amount Paid */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-white" suppressHydrationWarning>
                          ₹{(payment.amountPaid || alloc.principalINR).toLocaleString('en-US')} {payment.currency || 'INR'}
                        </div>
                        <div className="text-[11px] text-secondary" suppressHydrationWarning>
                          Settlement: ₹{alloc.contractualSettlementINR?.toLocaleString('en-US')} ({alloc.multiplierFactor}x)
                        </div>
                      </td>

                      {/* Purchase Price at Transaction */}
                      <td className="py-4 px-6">
                        <span className="font-mono text-slate-200">
                          ₹{alloc.allocationPriceINR || '0.20'}
                        </span>
                        <span className="text-[11px] text-secondary"> / LIORA</span>
                      </td>

                      {/* LIORA Allocated */}
                      <td className="py-4 px-6">
                        <div
                          className={`font-extrabold text-base ${
                            isConfirmed ? 'text-[var(--brand-accent)]' : 'text-slate-400'
                          }`}
                        >
                          {alloc.allocatedTokensFormatted || '0'} LIORA
                        </div>
                        {isConfirmed && (
                          <div className="text-[10px] text-emerald-400 font-semibold">
                            ✓ Confirmed in Treasury
                          </div>
                        )}
                        {isPending && (
                          <div className="text-[10px] text-amber-400">
                            ⏳ Pending Admin Review
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6">
                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Confirmed & Active
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Pending Verification
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Status action summary (Investor Read-Only; administrative verification restricted to /admin) */}
                      <td className="py-4 px-6 text-right">
                        {isPending && (
                          <span className="text-xs text-amber-400/90 font-medium">
                            Awaiting Admin Review
                          </span>
                        )}
                        {isConfirmed && (
                          <span className="text-xs text-slate-400 font-mono">
                            Reserved: {alloc.lockDurationMonths}m
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-xs text-rose-400/80">Uncredited</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Purchase Request Form */}
      {showPurchaseModal && (
        <div 
          className="modal-backdrop"
          onClick={() => setShowPurchaseModal(false)}
          role="presentation"
        >
          <div 
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-modal-title"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[var(--brand-accent)]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="purchase-modal-title" className="text-lg font-bold text-white tracking-wide">
                    Submit Manual Purchase Request
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Order LIORA tokens against direct off-chain bank settlement
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {purchaseError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{purchaseError}</span>
              </div>
            )}

            {purchaseSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{purchaseSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              {/* Plan Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Investment Tier
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-[var(--brand-accent)] transition-colors"
                >
                  {INVESTMENT_PLANS.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — ₹{plan.principalINR.toLocaleString('en-US')} INR ({plan.multiplier}x return · {plan.maturityNote})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quotation Preview */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-300" suppressHydrationWarning>
                  <span>Investment Amount:</span>
                  <strong className="text-white">₹{selectedPlan.principalINR.toLocaleString('en-US')} INR</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300" suppressHydrationWarning>
                  <span>Contractual Allocation:</span>
                  <strong className="text-white">₹{selectedPlan.contractualAllocationINR.toLocaleString('en-US')} INR ({selectedPlan.multiplier}x)</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Maturity Schedule:</span>
                  <strong className="text-amber-300">{selectedPlan.maturityNote}</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Unit Reference Price:</span>
                  <strong className="text-emerald-400">₹{custodyData?.currentReferencePriceINR || '0.20'} / LIORA</strong>
                </div>
                <div className="flex items-center justify-between text-xs font-bold pt-2.5 border-t border-blue-500/20" suppressHydrationWarning>
                  <span className="text-white">Estimated Allocation:</span>
                  <span className="text-base text-[var(--brand-accent)] font-extrabold">{estimatedTokens.toLocaleString('en-US')} LIORA</span>
                </div>
              </div>

              {/* Regulatory & Risk Disclaimer */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Regulatory &amp; Non-Guaranteed Return Disclosure</span>
                </div>
                <p className="leading-relaxed">
                  Target multipliers represent contractual collateral sizing benchmarks under pre-launch offering schedules. Token market valuations fluctuate, and secondary market returns are not guaranteed. For Tier 05 and Tier 06, settlement timeline (Month 12 vs 13) remains subject to final management determination.
                </p>
              </div>

              {/* Payment Rail */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Method / Rail
                </label>
                <select
                  value={paymentRail}
                  onChange={(e) => setPaymentRail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-[var(--brand-accent)] transition-colors"
                >
                  <option value="IMPS_BANK_TRANSFER">IMPS Immediate Bank Transfer</option>
                  <option value="RTGS_WIRE">RTGS High-Value Wire</option>
                  <option value="NEFT_BANK_TRANSFER">NEFT National Electronic Funds Transfer</option>
                  <option value="DIRECT_BANK_DEPOSIT">Direct Bank Branch Deposit</option>
                </select>
              </div>

              {/* Payment Reference Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bank Reference Number / Transaction UTR
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR1234567890 or IMPS987654"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[var(--brand-accent)] transition-colors"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Enter the unique transaction reference provided by your banking app. Management will independently verify receipt before approving tokens.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purchaseSubmitting}
                  className="btn-metallic px-6 py-2.5 rounded-xl text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {purchaseSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Registering Order...</span>
                    </>
                  ) : (
                    <span>Submit Purchase Request</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
