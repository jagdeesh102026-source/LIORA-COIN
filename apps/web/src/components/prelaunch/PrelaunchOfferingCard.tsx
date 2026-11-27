'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../Card';
import { 
  TrendingUp, 
  Clock, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  RefreshCw,
  Coins,
  ArrowRight,
  Info
} from 'lucide-react';
import { PrelaunchPriceResult, PurchaseQuote, LockedPurchaseRecord, InvestmentLockTier } from '@/lib/prelaunch/prelaunchTypes';
import { isTestnetSandboxEnabled } from '@/config/tokenConfig';

interface PrelaunchOfferingCardProps {
  userWalletAddress?: string;
  userId?: string;
}

export function PrelaunchOfferingCard({
  userWalletAddress,
  userId,
}: PrelaunchOfferingCardProps) {
  const isDevSandbox = isTestnetSandboxEnabled();
  // Price and config state
  const [priceData, setPriceData] = useState<PrelaunchPriceResult | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [investmentAmount, setInvestmentAmount] = useState<string>('500');

  // Quote state
  const [activeQuote, setActiveQuote] = useState<PurchaseQuote | null>(null);
  const [quoteRemainingSec, setQuoteRemainingSec] = useState<number>(0);
  const [requestingQuote, setRequestingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Purchase execution state
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<LockedPurchaseRecord | null>(null);
  const [userPurchases, setUserPurchases] = useState<LockedPurchaseRecord[]>([]);

  // Fetch current server price
  const fetchPrice = async () => {
    try {
      const res = await fetch('/api/prelaunch/price');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.priceResult) {
          setPriceData(data.priceResult);
        }
      }
    } catch (err) {
      console.error('Failed to fetch prelaunch price', err);
    } finally {
      setLoadingPrice(false);
    }
  };

  // Fetch user's locked purchases (authenticated session only)
  const fetchPurchases = async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/prelaunch/purchases', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.purchases) {
          setUserPurchases(data.purchases);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user purchases', err);
    }
  };

  useEffect(() => {
    fetchPrice();
    fetchPurchases();
    const interval = setInterval(fetchPrice, 10000); // Poll server price every 10s
    return () => clearInterval(interval);
  }, [userId]);

  // Handle quote countdown timer
  useEffect(() => {
    if (!activeQuote) return;

    const timer = setInterval(() => {
      const expiresAt = new Date(activeQuote.expiresAtUTC).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setQuoteRemainingSec(diffSec);

      if (diffSec <= 0) {
        setActiveQuote((prev) => prev ? { ...prev, isExpired: true } : null);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuote]);

  // Derived calculations
  const parsedAmount = parseFloat(investmentAmount) || 0;
  const inrFxRate = 86.50; // Reference rate
  const amountInUSD = currency === 'USD' ? parsedAmount : parsedAmount / inrFxRate;

  // Determine matching tier based on current USD amount
  const matchedTier = useMemo(() => {
    if (amountInUSD < 100) return null;
    if (amountInUSD <= 999.99) {
      return {
        name: 'Standard Allocation',
        months: 3,
        tierClass: 'border-blue-500/30 bg-blue-500/10 text-blue-400'
      };
    }
    if (amountInUSD <= 4999.99) {
      return {
        name: 'Growth Allocation',
        months: 6,
        tierClass: 'border-purple-500/30 bg-purple-500/10 text-purple-400'
      };
    }
    return {
      name: 'Strategic Allocation',
      months: 12,
      tierClass: 'border-amber-500/30 bg-amber-500/10 text-amber-400'
    };
  }, [amountInUSD]);

  // Estimated tokens based on current price
  const estimatedTokens = useMemo(() => {
    if (!priceData || parsedAmount <= 0) return '0.0000';
    const priceNum = parseFloat(priceData.priceUSD);
    if (priceNum <= 0) return '0.0000';
    return (amountInUSD / priceNum).toLocaleString('en-US', { maximumFractionDigits: 4 });
  }, [priceData, parsedAmount, amountInUSD]);

  // Request binding 15-minute quote (requires authenticated session; staged in production)
  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError(null);
    setPurchaseSuccess(null);

    if (!isDevSandbox) {
      setQuoteError('Pre-launch quote generation and purchases are disabled in production until compliance and gateway activation.');
      return;
    }

    if (!userId) {
      setQuoteError('Please sign in to your investor account before requesting a binding quote.');
      return;
    }

    if (!userWalletAddress || !/^0x[a-fA-F0-9]{40}$/.test(userWalletAddress)) {
      setQuoteError('Please connect a valid Web3 wallet address first.');
      return;
    }

    if (parsedAmount <= 0) {
      setQuoteError('Please enter a valid investment amount.');
      return;
    }
    if (amountInUSD < 100) {
      setQuoteError('Minimum allocation requirement is $100.00 USD (or ₹8,650 INR).');
      return;
    }

    setRequestingQuote(true);
    try {
      const res = await fetch('/api/prelaunch/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          investmentAmount: parsedAmount,
          currency,
          walletAddress: userWalletAddress
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.quote) {
        setActiveQuote(data.quote);
        const expiresAt = new Date(data.quote.expiresAtUTC).getTime();
        setQuoteRemainingSec(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
      } else {
        setQuoteError(data.error || 'Failed to generate quote');
      }
    } catch (err: any) {
      setQuoteError(err.message || 'Error connecting to quote server');
    } finally {
      setRequestingQuote(false);
    }
  };

  // Lock in allocation (Demo / preview execution; blocked in production)
  const handleExecutePurchase = async () => {
    if (!isDevSandbox) {
      setQuoteError('Pre-launch purchase execution is disabled in production.');
      return;
    }
    if (!activeQuote || activeQuote.isExpired) return;

    setIsPurchasing(true);
    try {
      const res = await fetch('/api/prelaunch/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          quoteId: activeQuote.quoteId,
          txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.record) {
        setPurchaseSuccess(data.record);
        setActiveQuote(null);
        fetchPurchases();
      } else {
        setQuoteError(data.error || 'Failed to confirm purchase');
      }
    } catch (err: any) {
      setQuoteError(err.message || 'Error processing allocation');
    } finally {
      setIsPurchasing(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* 1. Offering Status Header Card */}
      <Card elevated className="border border-[var(--border-prominent)] p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>30-Day Configurable Pre-Launch Offering</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Scheduled Token Pricing Curve & Lockup Escrow
            </h2>
          </div>

          <button
            onClick={fetchPrice}
            disabled={loadingPrice}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-xs text-secondary transition self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPrice ? 'animate-spin' : ''}`} />
            <span>Sync Price</span>
          </button>
        </div>

        {/* Pricing Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] space-y-1">
            <div className="text-xs text-secondary">Initial Offering Price</div>
            <div className="text-lg font-bold text-white">₹0.20 <span className="text-xs text-secondary">INR</span></div>
            <div className="text-[11px] text-zinc-400 font-mono">≈ $0.002312 USD</div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
            <div className="text-xs text-emerald-400 font-medium">Current Offering Price</div>
            <div className="text-lg font-bold text-emerald-300 font-mono">
              ${priceData?.priceUSD || '0.00231214'}
            </div>
            <div className="text-[11px] text-emerald-400/80">
              ≈ ₹{priceData?.priceINR || '0.2000'} INR
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] space-y-1">
            <div className="text-xs text-secondary">Target Price Cap</div>
            <div className="text-lg font-bold text-white font-mono">
              ${priceData?.targetPriceUSD || '0.30000000'}
            </div>
            <div className="text-[11px] text-secondary">Strict End-of-Schedule Cap</div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] space-y-1">
            <div className="text-xs text-secondary">Locked FX Baseline</div>
            <div className="text-lg font-bold text-white font-mono">₹86.50 <span className="text-xs text-secondary">/ $1</span></div>
            <div className="text-[11px] text-zinc-400 truncate" title="Reserve Bank of India (RBI) Reference Rate">
              RBI Reference Rate
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-secondary font-medium">
              30-Day Offering Timeline Progress: <strong className="text-white">{priceData?.progressPercent.toFixed(1) || '0.0'}%</strong>
            </span>
            <span className="text-secondary font-mono">
              {priceData ? `${Math.floor(priceData.elapsedSeconds / 86400)} / 30 Days` : 'Day 0 / 30'}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.max(1, priceData?.progressPercent || 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-zinc-500">
            <span>Day 0 (₹0.20 INR)</span>
            <span>Day 15 (Midpoint)</span>
            <span>Day 30 ($0.30 USD Cap)</span>
          </div>
        </div>
      </Card>

      {/* 2. Order Configuration & Tier Matching */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card elevated className="border border-[var(--border-prominent)] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Pre-Launch Allocation Calculator</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full border border-amber-500/30 text-amber-400 text-xs font-semibold bg-amber-500/10">
                15-Min Binding Quote
              </span>
            </div>

            <form onSubmit={handleRequestQuote} className="space-y-4">
              {/* Currency & Amount Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-secondary flex justify-between">
                  <span>Investment Amount</span>
                  <span>Min: $100 USD (≈ ₹8,650 INR)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`px-3 py-2 text-xs font-bold transition ${
                        currency === 'USD'
                          ? 'bg-[var(--brand-accent)] text-white'
                          : 'text-secondary hover:text-white'
                      }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency('INR')}
                      className={`px-3 py-2 text-xs font-bold transition ${
                        currency === 'INR'
                          ? 'bg-[var(--brand-accent)] text-white'
                          : 'text-secondary hover:text-white'
                      }`}
                    >
                      INR (₹)
                    </button>
                  </div>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    min="1"
                    step="any"
                    placeholder="Enter amount"
                    className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] text-white text-sm focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Dynamic Tier Indicator */}
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary">Selected Investment Lockup Tier:</span>
                  {matchedTier ? (
                    <span className={`px-2 py-0.5 rounded font-semibold text-xs border ${matchedTier.tierClass}`}>
                      {matchedTier.months} Calendar Months ({matchedTier.name})
                    </span>
                  ) : (
                    <span className="text-red-400 text-xs">Below $100 Minimum</span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 leading-relaxed">
                  Tokens remain safely escrowed in a timelock until the calendar-month unlock date. Unlocking is strictly UTC-calculated with leap-year clamping.
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Current Token Offering Price:</span>
                  <span className="text-white font-mono font-bold">${priceData?.priceUSD || '0.00231214'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Estimated Token Allocation:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{estimatedTokens} LIORA</span>
                </div>
              </div>

              {quoteError && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quoteError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!isDevSandbox || requestingQuote || amountInUSD < 100}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {!isDevSandbox ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pre-Launch Purchases Staged — Disabled in Production</span>
                  </>
                ) : requestingQuote ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Calculating Binding Quote...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Generate Binding 15-Minute Quote</span>
                  </>
                )}
              </button>
            </form>
          </Card>
        </div>

        {/* Right Column: Active Quote or Explanatory Tiers (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {activeQuote ? (
            <Card elevated className="border border-amber-500/40 p-6 space-y-4 bg-amber-950/10">
              <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Active Purchase Quote</span>
                </h4>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatSeconds(quoteRemainingSec)}</span>
                </div>
              </div>

              {activeQuote.isExpired ? (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-center space-y-2">
                  <div>This 15-minute quote has expired.</div>
                  <button
                    onClick={() => setActiveQuote(null)}
                    className="text-white underline font-semibold"
                  >
                    Request a fresh quote
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-secondary">Quote ID:</span>
                    <span className="text-white font-mono text-[11px] truncate max-w-[160px]">{activeQuote.quoteId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Investment Value:</span>
                    <span className="text-white font-bold">${activeQuote.investmentAmountUSD.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Guaranteed Unit Price:</span>
                    <span className="text-amber-300 font-mono font-bold">${activeQuote.tokenPriceUSD}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Locked Allocation:</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">{activeQuote.tokenQuantity} LIORA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Mandatory Lockup:</span>
                    <span className="text-white font-semibold">{activeQuote.lockMonths} Calendar Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Unlock Date (UTC):</span>
                    <span className="text-zinc-300 font-mono text-[11px]">
                      {new Date(activeQuote.estimatedUnlockTimeUTC).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleExecutePurchase}
                      disabled={isPurchasing}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isPurchasing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Locking Allocation...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Confirm & Lock Allocation (Demo)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card elevated className="border border-[var(--border-prominent)] p-6 space-y-4">
              <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[var(--brand-accent)]" />
                <span>Investment Lockup Tier Policy</span>
              </h4>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1">
                  <div className="flex justify-between font-bold text-blue-400">
                    <span>Tier 1: Starter Allocation</span>
                    <span>3 Months</span>
                  </div>
                  <div className="text-zinc-400 text-[11px]">$100 – $999.99 USD</div>
                </div>

                <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 space-y-1">
                  <div className="flex justify-between font-bold text-purple-400">
                    <span>Tier 2: Growth Allocation</span>
                    <span>6 Months</span>
                  </div>
                  <div className="text-zinc-400 text-[11px]">$1,000 – $4,999.99 USD</div>
                </div>

                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1">
                  <div className="flex justify-between font-bold text-amber-400">
                    <span>Tier 3: Strategic Allocation</span>
                    <span>12 Months</span>
                  </div>
                  <div className="text-zinc-400 text-[11px]">$5,000+ USD (Uncapped)</div>
                </div>
              </div>
            </Card>
          )}

          {/* Success confirmation */}
          {purchaseSuccess && (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Allocation Successfully Escrowed!</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {purchaseSuccess.tokenQuantity} LIORA tokens have been locked in your escrow account for {purchaseSuccess.lockTierMonths} calendar months. Unlock date: {new Date(purchaseSuccess.unlockTimeUTC).toUTCString()}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. User's Locked Allocations History */}
      {userPurchases.length > 0 && (
        <Card elevated className="border border-[var(--border-prominent)] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Your Locked Pre-Launch Allocations</span>
            </h3>
            <span className="text-xs text-secondary">{userPurchases.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border-subtle)] text-secondary">
                <tr>
                  <th className="py-2.5 px-3">Tokens</th>
                  <th className="py-2.5 px-3">Price Paid</th>
                  <th className="py-2.5 px-3">Lock Period</th>
                  <th className="py-2.5 px-3">Purchase Date</th>
                  <th className="py-2.5 px-3">Unlock Date (UTC)</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {userPurchases.map((rec) => (
                  <tr key={rec.purchaseId} className="hover:bg-[var(--bg-elevated)]/50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">{rec.tokenQuantity} LIORA</td>
                    <td className="py-3 px-3 font-mono">${rec.purchasePriceUSD}</td>
                    <td className="py-3 px-3">{rec.lockTierMonths} Months</td>
                    <td className="py-3 px-3 text-secondary">
                      {new Date(rec.createdAtUTC).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-zinc-300 font-mono">
                      {new Date(rec.unlockTimeUTC).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {rec.claimStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. Transparency & Risk Disclosure */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-400 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-zinc-300">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Scheduled Offering Transparency & Non-Speculation Notice</span>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-400">
          The scheduled offering price curve ($0.0023 starting baseline increasing towards $0.30 over 30 days) governs the phased issuance terms of pre-launch tokens and represents administrator-configured distribution pricing. It does NOT represent a guaranteed secondary market trading price, exchange listing valuation, or return on investment. Tokens remain non-transferable and escrowed in accordance with your chosen 3, 6, or 12 calendar-month lockup tier.
        </p>
      </div>
    </div>
  );
}
