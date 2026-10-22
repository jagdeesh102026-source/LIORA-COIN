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
              A high-security, market-priced utility token ecosystem built for BNB Smart Chain (BEP-20) 
              with verified mathematical token allocation and cross-chain expansion architecture.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span>BNB Smart Chain (BSC Testnet Supported)</span>
            </div>
          </div>

          {/* Ecosystem Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Ecosystem</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/ecosystem" className="hover:text-white transition-colors">Components</Link></li>
              <li><Link href="/token" className="hover:text-white transition-colors">Token Metrics</Link></li>
              <li><Link href="/swap" className="hover:text-white transition-colors">Swap Terminal</Link></li>
              <li><Link href="/cross-chain" className="hover:text-white transition-colors">TRON Cross-Chain</Link></li>
            </ul>
          </div>

          {/* Documentation & Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Architecture</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/docs" className="hover:text-white transition-colors">Documentation Portal</Link></li>
              <li><Link href="/docs#decisions" className="hover:text-white transition-colors">Open Decisions Log</Link></li>
              <li><Link href="/docs#contracts" className="hover:text-white transition-colors">Smart Contracts</Link></li>
              <li><Link href="/docs#security" className="hover:text-white transition-colors">Security Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Legal Risk Disclosure & Copyright */}
        <div className="pt-8 space-y-4 text-xs text-muted">
          <p className="leading-relaxed">
            <strong>Disclosures:</strong> OXENIQ is a market-priced digital asset and utility token. It is not a fiat-pegged stablecoin, 
            nor does it represent guaranteed monetary appreciation or debt instrument. Token purchase allocations, initial liquidity ($1,000 budget), 
            and cross-chain mechanisms are implemented strictly in accordance with approved smart contract parameters.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)] text-[11px]">
            <p>&copy; {currentYear} OXENIQ Ecosystem. All rights reserved.</p>
            <p>Built with OpenZeppelin Contracts v5 & Next.js</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
