'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { WalletModal } from './WalletModal';
import { useWeb3Wallet } from '../hooks/useWeb3Wallet';
import { Menu, X, Wallet, Check, Copy, Network } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isConnected, address, chainName, isBscTestnet, isBscMainnet, switchToBscTestnet, disconnect } = useWeb3Wallet();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Ecosystem', href: '/ecosystem' },
    { name: 'Tokenomics', href: '/token' },
    { name: 'DEX Swap', href: '/swap' },
    { name: 'Cross-Chain', href: '/cross-chain' },
    { name: 'Documentation', href: '/docs' },
  ];

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Logo size="md" />

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-sm'
                    : 'text-secondary hover:text-white hover:bg-[var(--bg-elevated)]/50'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Action: Network & Wallet */}
        <div className="hidden lg:flex items-center gap-3">
          {isConnected && (
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 text-xs rounded-full border flex items-center gap-1.5 ${
                  isBscTestnet || isBscMainnet
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>{chainName || 'Unknown Network'}</span>
              </span>

              {!isBscTestnet && !isBscMainnet && (
                <button
                  onClick={switchToBscTestnet}
                  className="px-2.5 py-1 text-xs rounded-lg btn-metallic font-semibold text-white"
                >
                  Switch to BSC
                </button>
              )}
            </div>
          )}

          {isConnected && address ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-prominent)] bg-[var(--bg-elevated)]">
              <button
                onClick={copyAddress}
                className="flex items-center gap-1.5 text-xs font-mono text-white hover:text-[var(--brand-accent)] transition-colors"
                title="Copy Address"
              >
                {formatAddress(address)}
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-secondary" />}
              </button>
              <button
                onClick={disconnect}
                className="text-[11px] text-muted hover:text-red-400 ml-1 pl-2 border-l border-[var(--border-subtle)]"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-metallic px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-secondary hover:text-white bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'text-white bg-[var(--bg-elevated)] border border-[var(--border-prominent)]'
                      : 'text-secondary hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-2">
            {isConnected && address ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-prominent)]">
                <span className="text-xs font-mono text-white">{formatAddress(address)}</span>
                <button onClick={disconnect} className="text-xs text-red-400 hover:underline">
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full btn-metallic py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      )}

      <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  );
};
