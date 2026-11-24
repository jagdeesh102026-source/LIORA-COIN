'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does non-custodial trading work on Liora Coin Exchange?',
      a: 'Unlike centralized exchanges, Liora Coin never requests, handles, or stores your private keys or seed phrases. When you execute an exchange, your connected Web3 wallet (MetaMask, Trust Wallet, etc.) signs a transaction that routes via PancakeSwap smart contracts directly on BNB Smart Chain.',
    },
    {
      q: 'How are the 3-level referral commissions calculated and paid?',
      a: 'When an invited user completes an eligible swap or purchase, our referral engine calculates commissions across up to 3 upline levels: Level 1 (Direct: 5%), Level 2 (Sub-referrals: 3%), and Level 3 (Extended network: 1%). Commissions accrue in either LIORA or USDT and can be claimed anytime directly to your connected wallet.',
    },
    {
      q: 'Which blockchain network does the exchange support?',
      a: 'Liora Coin Exchange natively runs on BNB Smart Chain (BEP-20) for rapid 3-second block finality and low transaction fees (typically < $0.40). Future expansion roadmaps include cross-chain liquidity across Ethereum and TRON.',
    },
    {
      q: 'Can I swap tokens without creating an account?',
      a: 'Yes! Instant decentralized swaps only require connecting your external Web3 wallet. However, registering with your email or mobile allows you to generate a unique referral link and earn multi-tier commissions from your network’s trading volume.',
    },
    {
      q: 'What is slippage tolerance and what rate should I choose?',
      a: 'Slippage is the difference between the expected quote price and the actual execution price. On standard pairs like USDT/LIORA, a 0.5% slippage tolerance is recommended. During periods of high market volatility, setting slippage to 1.0% helps prevent failed transactions.',
    },
  ];

  return (
    <section className="py-12 sm:py-16 border-t border-[var(--border-subtle)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
          <p className="text-secondary text-xs sm:text-sm">
            Everything you need to know about Liora Coin Exchange, non-custodial swaps, and multi-tier rewards.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-[var(--brand-accent)] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-secondary shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[var(--brand-accent)]' : ''
                      }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-secondary leading-relaxed border-t border-[var(--border-subtle)]/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

