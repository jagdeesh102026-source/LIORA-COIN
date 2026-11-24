'use client';

import React, { useState, useEffect } from 'react';
import { SwapTransaction } from '../../lib/demo/demoTypes';
import { CheckCircle2, ExternalLink, ArrowRight, Copy, Check, Sparkles, X } from 'lucide-react';
import Link from 'next/link';

interface TransactionProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  tx: SwapTransaction | null;
}

export const TransactionProgressModal: React.FC<TransactionProgressModalProps> = ({
  isOpen,
  onClose,
  tx,
}) => {
  const [step, setStep] = useState<number>(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !tx) {
      setStep(1);
      return;
    }

    // Realistic multi-step progress sequence
    const t1 = setTimeout(() => setStep(2), 600);
    const t2 = setTimeout(() => setStep(3), 1200);
    const t3 = setTimeout(() => setStep(4), 1800);
    const t4 = setTimeout(() => setStep(5), 2400); // 5 = Completed

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen, tx]);

  if (!isOpen || !tx) return null;

  const copyHash = () => {
    navigator.clipboard.writeText(tx.txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    { title: 'Submitting Transaction Intent', desc: 'Validating non-custodial parameters' },
    { title: 'PancakeSwap Smart Routing', desc: 'Fetching optimal liquidity path' },
    { title: 'Executing BEP-20 Swap', desc: 'Simulating atomic BSC transfer' },
    { title: 'Distributing Multi-Tier Rewards', desc: 'Allocating 3-level referral commissions' },
  ];

  const isFinished = step >= 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-lg bg-[#0F172A] border border-[var(--border-prominent)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-base font-bold text-white">
              {isFinished ? 'Swap Confirmed (Demo)' : 'Processing Transaction'}
            </h3>
          </div>
          {isFinished && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary hover:text-white hover:bg-[var(--bg-elevated)]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {!isFinished ? (
            /* Progress Stepper */
            <div className="space-y-4 py-2">
              {steps.map((s, idx) => {
                const sNum = idx + 1;
                const isDone = step > sNum;
                const isCurrent = step === sNum;
                return (
                  <div key={s.title} className="flex items-start gap-3.5">
                    <div className="mt-0.5">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                          {sNum}
                        </div>
                      )}
                    </div>
                    <div>
                      <div
                        className={`text-sm font-semibold ${isDone ? 'text-white' : isCurrent ? 'text-blue-300' : 'text-slate-500'
                          }`}
                      >
                        {s.title}
                      </div>
                      <div className="text-xs text-secondary mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Completed Screen */
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-xl font-extrabold text-white">Swap Successfully Executed</h4>
                <p className="text-xs text-secondary mt-1">
                  Swapped {tx.fromAmount} {tx.fromToken} for {tx.toAmount} {tx.toToken}
                </p>
              </div>

              {/* Commission Alert Pill */}
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-center gap-2 text-xs text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Upline referral commissions dispatched up to 3 levels!</span>
              </div>

              {/* Receipt Details Box */}
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2.5 text-xs text-left">
                <div className="flex items-center justify-between text-secondary">
                  <span>Status</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold text-[11px] border border-blue-500/30">
                    DEMO TRANSACTION (Simulated)
                  </span>
                </div>

                <div className="flex items-center justify-between text-secondary">
                  <span>Routing</span>
                  <span className="text-white font-medium">{tx.routing} (Simulated)</span>
                </div>

                <div className="flex items-center justify-between text-secondary">
                  <span>Demo Tx Reference</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-blue-300">
                    <span>{`${tx.txHash.slice(0, 8)}...${tx.txHash.slice(-6)}`}</span>
                    <button
                      onClick={copyHash}
                      className="p-1 hover:text-white transition-colors"
                      title="Copy demo reference hash"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-secondary">
                  <span>Simulated Block</span>
                  <span className="text-white font-mono">{tx.blockNumber}</span>
                </div>

                <div className="flex items-center justify-between text-secondary">
                  <span>Est. Gas Fee (Demo)</span>
                  <span className="text-white font-medium">{tx.gasFeeBnb} BNB (~$0.40 USD)</span>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)]/60 text-[10px] text-amber-300 text-center">
                  ⚠️ DEMO DATA: Simulated execution on localhost. No real BNB Smart Chain transaction was broadcast.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  href="/history"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-[var(--border-subtle)] text-secondary font-semibold hover:text-white hover:bg-[var(--bg-elevated)] transition-colors text-xs flex items-center justify-center gap-1.5"
                >
                  <span>View All History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl btn-metallic text-white font-bold text-xs shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

