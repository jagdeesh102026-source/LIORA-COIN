'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from './Logo';
import { WalletModal } from './WalletModal';
import { useWeb3Wallet } from '../hooks/useWeb3Wallet';
import { useOxeniqContract } from '../hooks/useOxeniqContract';
import { useTestnetBalances } from '../hooks/useTestnetBalances';
import { useDemoStore } from '../lib/demo/useDemoStore';
import { PREVIEW_CONFIG } from '../config/previewConfig';
import { 
  Menu, 
  X, 
  Wallet, 
  Check, 
  Copy, 
  Network, 
  Coins, 
  User, 
  ChevronDown, 
  ShieldCheck, 
  Sparkles,
  Zap,
  Lock,
  LogOut
} from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { isConnected, address, chainName, isSupportedChain, isBscMainnet, isBscTestnet, switchToBscTestnet, switchToBscMainnet, disconnect } = useWeb3Wallet();
  const { userBalance, isTestnet, isMainnet } = useOxeniqContract();
  const { lioraBalance, usdtBalance } = useTestnetBalances();
  const { activeUser, logout } = useDemoStore();

  const isUserAuthenticated = mounted && Boolean(activeUser);
  const isWalletConnected = mounted && Boolean(isConnected) && Boolean(address);

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  interface NavLinkItem {
    name: string;
    href: string;
    badge?: string;
  }

  const primaryNavLinks: NavLinkItem[] = [
    { name: 'Exchange', href: '/swap' },
    { name: 'Liquidity', href: '/liquidity' },
    { name: 'Settlement', href: '/settlement' },
    { name: 'Primary Sale', href: '/sale' },
    ...(!PREVIEW_CONFIG.hideTradingBot ? [{ name: 'Trading Bot', href: '/trading-bot', badge: 'PRO' }] : []),
    { name: 'Buy Liora Coin', href: '/buy' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Referrals', href: '/referrals' },
    { name: 'Commissions', href: '/commissions' },
  ];

  const secondaryNavLinks: NavLinkItem[] = [
    { name: 'Treasury & Reserves', href: '/treasury' },
    { name: 'Transaction History', href: '/history' },
    { name: 'Account Profile', href: '/profile' },
    { name: 'Admin Console', href: '/admin' },
    { name: 'Ecosystem & Vision', href: '/ecosystem' },
    { name: 'Tokenomics', href: '/token' },
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
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 backdrop-blur-md">
      {PREVIEW_CONFIG.isPreviewMode && (
        <div className="bg-gradient-to-r from-amber-500/20 via-blue-500/20 to-amber-500/20 border-b border-amber-500/30 px-4 py-1 text-center text-[11px] text-amber-300 font-medium flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span><strong>{PREVIEW_CONFIG.previewBadgeText}:</strong> {PREVIEW_CONFIG.previewBannerMessage}</span>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Logo size="md" href={isUserAuthenticated ? '/dashboard' : '/auth'} />

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1">
          {primaryNavLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'text-white bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-sm'
                    : 'text-secondary hover:text-white hover:bg-[var(--bg-elevated)]/50'
                }`}
              >
                <span>{link.name}</span>
                {link.badge && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* More Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              onBlur={() => setTimeout(() => setMoreDropdownOpen(false), 250)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-white hover:bg-[var(--bg-elevated)]/50 flex items-center gap-1 transition-all"
            >
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {moreDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#0F172A] border border-[var(--border-prominent)] shadow-2xl p-2 z-50 animate-fade-in divide-y divide-[var(--border-subtle)]/40">
                <div className="py-1">
                  {secondaryNavLinks.slice(0, 3).map((l) => (
                    <Link
                      key={l.name}
                      href={l.href}
                      className="block px-3 py-2 rounded-xl text-xs font-medium text-secondary hover:text-white hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      {l.name}
                    </Link>
                  ))}
                </div>
                <div className="py-1">
                  {secondaryNavLinks.slice(3).map((l) => (
                    <Link
                      key={l.name}
                      href={l.href}
                      className="block px-3 py-2 rounded-xl text-xs font-medium text-secondary hover:text-white hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      {l.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right Action Bar (Always visible with responsive elements) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Account Pill or Sign In CTA (hidden on very small screens) */}
          <div className="hidden sm:flex items-center">
            {isUserAuthenticated && activeUser ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--brand-accent)] transition-all text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-[var(--brand-accent)] font-bold text-xs flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white leading-tight">
                      @{activeUser.username}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--brand-accent)]">
                      {activeUser.referralCode}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-secondary hover:text-rose-400 hover:bg-[var(--bg-elevated)] transition-colors text-xs"
                  title="Sign Out of Demo Account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-secondary hover:text-white bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-all flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Web3 Network Badge */}
          {isWalletConnected && (
            <span
              className={`hidden md:flex px-2.5 py-1 text-xs rounded-full border items-center gap-1.5 ${
                isSupportedChain
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>{chainName || 'BSC Testnet'}</span>
            </span>
          )}

          {/* Connect Wallet / Connected State - ALWAYS VISIBLE ON ALL SCREENS */}
          {isWalletConnected ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Live Token Balances */}
              <div className="hidden lg:flex items-center gap-1.5">
                {isBscMainnet ? (
                  <div
                    className="px-2.5 py-1.5 text-xs rounded-xl bg-amber-500/10 border border-amber-500/20 text-white font-semibold flex items-center gap-1.5"
                    title="Live BSC Mainnet LIORA Token Balance"
                  >
                    <img src="/assets/liora-logo-128.png" alt="LIORA" className="w-3.5 h-3.5 rounded-full object-contain" />
                    <span className="text-white font-bold font-mono">{userBalance ?? '0.00'}</span>
                    <span className="text-[10px] text-amber-300">LIORA (Mainnet)</span>
                  </div>
                ) : (
                  <>
                    <div
                      className="px-2.5 py-1.5 text-xs rounded-xl bg-blue-500/10 border border-blue-500/20 text-white font-semibold flex items-center gap-1.5"
                      title="Live BSC Testnet LIORA Token Balance"
                    >
                      <img src="/assets/liora-logo-128.png" alt="LIORA" className="w-3.5 h-3.5 rounded-full object-contain" />
                      <span className="text-white font-bold font-mono">{lioraBalance}</span>
                      <span className="text-[10px] text-blue-300">LIORA (Testnet)</span>
                    </div>
                    <div
                      className="px-2.5 py-1.5 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-white font-semibold flex items-center gap-1.5"
                      title="Live BSC Testnet Mock USDT Balance"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-white font-bold font-mono">{usdtBalance}</span>
                      <span className="text-[10px] text-emerald-300">mUSDT</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[var(--border-prominent)] bg-[var(--bg-elevated)]">
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1 text-xs font-mono text-white hover:text-[var(--brand-accent)] transition-colors"
                  title="Copy Address"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{address ? formatAddress(address) : ''}</span>
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-secondary" />}
                </button>
                <button
                  onClick={disconnect}
                  className="text-[11px] text-rose-400 hover:text-rose-300 ml-1 pl-1.5 border-l border-[var(--border-subtle)] font-medium"
                  title="Disconnect Wallet"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-metallic px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 sm:gap-2 shadow-lg hover:opacity-95 text-white"
            >
              <Wallet className="w-4 h-4 text-amber-300" />
              <span>Connect Wallet</span>
            </button>
          )}

          {/* Mobile menu toggle */}
          <div className="xl:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-secondary hover:text-white bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            {isUserAuthenticated && activeUser ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-[var(--brand-accent)] flex items-center justify-center font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">@{activeUser.username}</div>
                    <div className="text-[10px] font-mono text-[var(--brand-accent)]">{activeUser.referralCode}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:bg-[var(--bg-elevated)] rounded-lg font-medium border border-rose-500/20"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold text-[var(--brand-accent)]"
              >
                Sign In / Register Account
              </Link>
            )}
          </div>

          <nav className="flex flex-col space-y-1">
            {[...primaryNavLinks, ...secondaryNavLinks].map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                    isActive
                      ? 'text-white bg-[var(--bg-elevated)] border border-[var(--border-prominent)]'
                      : 'text-secondary hover:text-white'
                  }`}
                >
                  <span>{link.name}</span>
                  {link.badge && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[var(--border-subtle)]">
            {isConnected && address ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <span className="font-mono text-xs text-white">{formatAddress(address)}</span>
                <button onClick={disconnect} className="text-xs text-rose-400 hover:underline">
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full btn-metallic py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect External Wallet</span>
              </button>
            )}
          </div>
        </div>
      )}

      <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  );
};
