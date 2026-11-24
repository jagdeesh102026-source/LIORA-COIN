'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDemoStore } from '../../lib/demo/useDemoStore';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { SwapTransaction } from '../../lib/demo/demoTypes';
import { 
  History, 
  ExternalLink, 
  Copy, 
  Check, 
  Zap, 
  Search, 
  Filter, 
  ArrowUpRight,
  ShieldCheck,
  X,
  Info
} from 'lucide-react';

export default function HistoryPage() {
  const { activeUser, userTransactions } = useDemoStore();
  const { isAuthorized, isInitialized } = useRequireAuth();
  const [selectedTx, setSelectedTx] = useState<SwapTransaction | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isInitialized || !activeUser) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--brand-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-secondary">Authenticating transaction ledger...</p>
      </div>
    );
  }

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filtered = userTransactions.filter(
    (tx) =>
      tx.fromToken.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.toToken.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#111A2E] via-[#0E1626] to-[#0A101D] border border-[var(--border-prominent)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-[var(--brand-accent)] font-bold">
            <History className="w-3.5 h-3.5" />
            <span>NON-CUSTODIAL SETTLEMENT LEDGER</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
            Transaction History
          </h1>
          <p className="text-xs sm:text-sm text-secondary max-w-2xl leading-relaxed">
            Every transaction executed through Liora Coin Exchange is routed non-custodially through decentralized PancakeSwap liquidity pools on BNB Smart Chain.
          </p>
        </div>

        <Link
          href="/swap"
          className="px-5 py-3 rounded-xl btn-metallic text-white font-bold text-xs shadow-lg flex items-center gap-2 hover:opacity-95 transition-all shrink-0"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>New Exchange Order</span>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by token (e.g. LIORA) or Tx Hash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-white placeholder-secondary focus:outline-none focus:border-[var(--brand-accent)]"
          />
        </div>

        <div className="text-xs text-secondary font-medium self-end sm:self-center">
          Showing <strong>{filtered.length}</strong> transactions
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)]/60 text-xs text-secondary uppercase font-semibold border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-6">Pair / Action</th>
                <th className="py-3 px-6">Sent Amount</th>
                <th className="py-3 px-6">Received Amount</th>
                <th className="py-3 px-6">Routing</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/40 text-xs sm:text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-secondary text-xs">
                    No transactions found. Go to the Exchange page to perform your first swap!
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[var(--bg-primary)]/40 transition-colors">
                    <td className="py-4 px-6 text-secondary text-xs">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span>{tx.fromToken}</span>
                        <span className="text-secondary">→</span>
                        <span className="text-[var(--brand-accent)]">{tx.toToken}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-semibold text-white">
                      {tx.fromAmount.toLocaleString()} {tx.fromToken}
                    </td>

                    <td className="py-4 px-6 font-bold text-emerald-400">
                      {tx.toAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.toToken}
                    </td>

                    <td className="py-4 px-6 text-xs text-secondary">
                      {tx.routing}
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-xs border border-emerald-500/30">
                        {tx.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs font-bold text-secondary hover:text-white hover:border-[var(--brand-accent)] transition-all"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-lg bg-[#0F172A] border border-[var(--border-prominent)] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Verified Exchange Receipt</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-secondary hover:text-white hover:bg-[var(--bg-elevated)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between text-secondary">
                  <span>Input Token:</span>
                  <strong className="text-white">{selectedTx.fromAmount} {selectedTx.fromToken}</strong>
                </div>
                <div className="flex items-center justify-between text-secondary">
                  <span>Output Token:</span>
                  <strong className="text-emerald-400">{selectedTx.toAmount} {selectedTx.toToken}</strong>
                </div>
                <div className="flex items-center justify-between text-secondary">
                  <span>Execution Rate:</span>
                  <strong className="text-white">1 {selectedTx.fromToken} = {selectedTx.rate} {selectedTx.toToken}</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between text-secondary">
                  <span>Simulated Tx Hash:</span>
                  <div className="flex items-center gap-1.5 font-mono text-blue-300">
                    <span>{`${selectedTx.txHash.slice(0, 10)}...${selectedTx.txHash.slice(-8)}`}</span>
                    <button
                      onClick={() => copyHash(selectedTx.txHash)}
                      className="p-1 hover:text-white"
                      title="Copy Hash"
                    >
                      {copiedHash === selectedTx.txHash ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-secondary">
                  <span>Block Number:</span>
                  <span className="font-mono text-white">{selectedTx.blockNumber}</span>
                </div>

                <div className="flex items-center justify-between text-secondary">
                  <span>Network Gas:</span>
                  <span className="text-white">{selectedTx.gasFeeBnb} BNB (~$0.40 USD)</span>
                </div>

                <div className="flex items-center justify-between text-secondary">
                  <span>Slippage Tolerance:</span>
                  <span className="text-white">{selectedTx.slippageUsed}%</span>
                </div>

                <div className="flex items-center justify-between text-secondary">
                  <span>DEX Route:</span>
                  <span className="text-[var(--brand-accent)] font-semibold">{selectedTx.routing}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-3 rounded-xl btn-metallic text-white font-bold text-xs shadow-md"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

