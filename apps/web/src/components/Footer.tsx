import React from 'react';
import Link from 'next/link';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-secondary pt-12 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-[var(--border-subtle)]">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <Logo size="md" showTagline={true} />
            <p className="text-sm text-secondary max-w-md leading-relaxed">
              A high-security, market-priced utility token ecosystem engineered for BNB Smart Chain (BEP-20) 
              with verified mathematical token allocation and cross-chain expansion architecture.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span>Target Network: BNB Smart Chain (BEP-20)</span>
            </div>
          </div>

          {/* Ecosystem Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Ecosystem</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/ecosystem" className="hover:text-white transition-colors">Components</Link></li>
              <li><Link href="/token" className="hover:text-white transition-colors">Tokenomics</Link></li>
              <li><Link href="/swap" className="hover:text-white transition-colors">DEX Swap Terminal</Link></li>
              <li><Link href="/cross-chain" className="hover:text-white transition-colors">Cross-Chain Architecture</Link></li>
            </ul>
          </div>

          {/* Documentation & Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/docs" className="hover:text-white transition-colors">Whitepaper Overview</Link></li>
              <li><Link href="/docs" className="hover:text-white transition-colors">Smart Contract Specs</Link></li>
              <li><Link href="/docs" className="hover:text-white transition-colors">Security Disclosures</Link></li>
              <li><Link href="/docs" className="hover:text-white transition-colors">Developer Guide</Link></li>
            </ul>
          </div>
        </div>

        {/* Legal Risk Disclosure & Copyright */}
        <div className="pt-8 space-y-4 text-xs text-muted">
          <p className="leading-relaxed">
            <strong>Disclosures:</strong> OXENIQ is a market-priced digital utility token. It is not a fiat-pegged stablecoin, 
            nor does it represent guaranteed monetary returns or equity. Token allocation, liquidity reserves, 
            and cross-chain mechanisms operate strictly via verified smart contract interfaces.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)] text-[11px]">
            <p>&copy; {currentYear} OXENIQ Protocol. All rights reserved.</p>
            <p>Powering the Next Digital Era</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
