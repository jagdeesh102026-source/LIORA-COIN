'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import {
  TOKEN_CONFIG,
  BSC_MAINNET_CONFIG,
  BSC_TESTNET_CONFIG,
  BSC_MAINNET_LIORA_TOKEN_ADDRESS,
  BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS,
  BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS,
  BSC_MAINNET_LIORA_TIMELOCK_ADDRESS,
  BSC_MAINNET_OPERATING_TREASURY_ADDRESS,
  BSC_MAINNET_GOVERNANCE_ADDRESS,
  BSC_TESTNET_TOKEN_ADDRESS,
  BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS,
  BSC_TESTNET_SALE_ADDRESS,
  isTestnetSandboxEnabled,
} from '../../config/tokenConfig';
import { useOxeniqContract } from '../../hooks/useOxeniqContract';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import {
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Flame,
  Layers,
  Lock,
  AlertTriangle,
  RefreshCw,
  Cpu,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Coins,
  Radio,
  ChevronDown,
} from 'lucide-react';

export default function TokenPage() {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedImpl, setCopiedImpl] = useState(false);
  const [copiedVault, setCopiedVault] = useState(false);
  const [copiedTimelock, setCopiedTimelock] = useState(false);
  const [copiedTreasury, setCopiedTreasury] = useState(false);
  const [copiedGov, setCopiedGov] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedAlloc, setCopiedAlloc] = useState(false);
  const [copiedSale, setCopiedSale] = useState(false);
  const [showTestnetSection, setShowTestnetSection] = useState(false);

  const {
    isConnected,
    address,
    chainName,
    isBscMainnet,
    isBscTestnet,
    isWrongNetwork,
    connect,
    switchToBscMainnet,
    switchToBscTestnet,
  } = useWeb3Wallet();

  const {
    isLoading,
    isBalanceLoading,
    error,
    balanceError,
    tokenData,
    mainnetOverview,
    allocationData,
    saleData,
    userBalance,
    userBalanceRaw,
    tokenAddress,
    allocationManagerAddress,
    saleAddress,
    refresh,
    refreshUserBalance,
  } = useOxeniqContract();

  const handleCopy = (text: string, type: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'token') {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      } else if (type === 'impl') {
        setCopiedImpl(true);
        setTimeout(() => setCopiedImpl(false), 2000);
      } else if (type === 'vault') {
        setCopiedVault(true);
        setTimeout(() => setCopiedVault(false), 2000);
      } else if (type === 'timelock') {
        setCopiedTimelock(true);
        setTimeout(() => setCopiedTimelock(false), 2000);
      } else if (type === 'treasury') {
        setCopiedTreasury(true);
        setTimeout(() => setCopiedTreasury(false), 2000);
      } else if (type === 'gov') {
        setCopiedGov(true);
        setTimeout(() => setCopiedGov(false), 2000);
      } else if (type === 'user') {
        setCopiedUser(true);
        setTimeout(() => setCopiedUser(false), 2000);
      } else if (type === 'alloc') {
        setCopiedAlloc(true);
        setTimeout(() => setCopiedAlloc(false), 2000);
      } else if (type === 'sale') {
        setCopiedSale(true);
        setTimeout(() => setCopiedSale(false), 2000);
      }
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <h1 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Token Architecture</h1>
            <Badge status="Live" size="sm" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">LIORA Tokenomics</h2>
          <p className="text-secondary text-sm sm:text-base leading-relaxed">
            Verified on-chain technical specifications, supply distribution, and governance architecture for LIORA on BNB Smart Chain Mainnet via OpenZeppelin UUPS Upgradeable Proxy with 48-hour Timelock governance.
          </p>
        </div>

        {/* Brand Emblem Mini-Showcase */}
        <div className="relative shrink-0 flex items-center justify-center self-start md:self-auto">
          <div
            className="absolute rounded-full filter blur-xl opacity-40 pointer-events-none"
            style={{
              width: 130,
              height: 130,
              background: 'radial-gradient(circle, rgba(217,170,74,0.45) 0%, transparent 70%)',
            }}
          />
          <Image
            src="/assets/liora-logo-512.png"
            alt="LIORA Official Token Logo"
            width={110}
            height={110}
            className="relative object-contain filter drop-shadow-md"
          />
        </div>
      </div>

      {/* Live BSC Mainnet On-Chain Status Banner */}
      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <strong className="text-white text-sm">BNB Smart Chain Mainnet (Chain ID 56) Live Data Integration</strong>
            <p className="text-[11px] text-emerald-200/80 leading-relaxed">
              All displayed on-chain metrics, supply parameters, and wallet balances are retrieved read-only from the verified BSC Mainnet deployment via public RPC with zero write risks.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono font-semibold">
            RPC: bsc-dataseed (Chain ID 56)
          </span>
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-white border border-[var(--border-subtle)] transition-colors cursor-pointer"
            title="Refresh on-chain state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--brand-accent)]' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Sync Mainnet'}</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Token Name</span>
          <div className="text-xl font-bold text-white">
            {mainnetOverview?.name || 'LIORA'}
          </div>
          <span className="text-xs text-secondary">
            On-Chain Verified (ERC-20 / BEP-20)
          </span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Ticker Symbol</span>
          <div className="text-xl font-bold text-white">
            {mainnetOverview?.symbol || 'LIORA'}
          </div>
          <span className="text-xs text-emerald-400">BEP-20 Standard (Chain 56)</span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Total Supply</span>
          <div className="text-xl font-bold text-white font-mono">
            {mainnetOverview?.totalSupply || '100,000,000,000'}
          </div>
          <span className="text-xs text-emerald-400">
            100 Billion LIORA Fixed Cap
          </span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Transfer Tax</span>
          <div className="text-xl font-bold text-emerald-400">0% Tax-Free</div>
          <span className="text-xs text-secondary">100% Non-Custodial AMM Compatible</span>
        </Card>
      </div>

      {/* On-Chain Supply Allocation Cards (Treasury vs Reserve) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-blue-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">Operating Treasury (1%)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
              Circulating Protocol Treasury
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {mainnetOverview?.treasuryBalance || '1,000,000,000'} LIORA
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            Minted directly at initialization to the company operating treasury wallet (<code className="text-white font-mono text-[11px]">0xD546...9064</code>) for ecosystem development, operating liquidity, and community initiatives.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-[var(--border-subtle)]">
            <span className="text-muted">Treasury Address:</span>
            <a
              href={`https://bscscan.com/address/${BSC_MAINNET_OPERATING_TREASURY_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>{BSC_MAINNET_OPERATING_TREASURY_ADDRESS.slice(0, 8)}...{BSC_MAINNET_OPERATING_TREASURY_ADDRESS.slice(-6)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </Card>

        <Card className="border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Restricted Reserve Vault (99%)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
              LioraReserveVault Escrow
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {mainnetOverview?.reserveVaultBalance || '99,000,000,000'} LIORA
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            Secured in the dedicated on-chain <code className="text-white font-mono text-[11px]">LioraReserveVault</code> contract under Governance ownership. Tokens can only be released through explicit authorized governance procedures.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-[var(--border-subtle)]">
            <span className="text-muted">Vault Address:</span>
            <a
              href={`https://bscscan.com/address/${BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>{BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS.slice(0, 8)}...{BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS.slice(-6)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </Card>
      </div>

      {/* Connected Wallet LIORA Balance Section */}
      <Card elevated className="border border-[var(--border-accent)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[var(--brand-accent)]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Connected Wallet LIORA Balance</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                  {isBscMainnet ? 'BSC Mainnet #56' : isBscTestnet ? 'BSC Testnet #97' : 'Web3 Wallet'}
                </span>
              </h3>
              <p className="text-xs text-secondary">
                Live read-only token balance retrieved directly from the official LIORA UUPS contract on BNB Smart Chain.
              </p>
            </div>
          </div>
          {isConnected && (
            <button
              onClick={() => refreshUserBalance()}
              disabled={isBalanceLoading}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-secondary hover:text-white border border-[var(--border-subtle)] transition-colors cursor-pointer"
              title="Refresh wallet balance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBalanceLoading ? 'animate-spin text-[var(--brand-accent)]' : ''}`} />
              <span>{isBalanceLoading ? 'Syncing...' : 'Refresh Balance'}</span>
            </button>
          )}
        </div>

        {/* State 1: Disconnected Wallet */}
        {!isConnected && (
          <div className="p-6 rounded-xl bg-[var(--bg-elevated)]/60 border border-[var(--border-subtle)] text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--border-prominent)] flex items-center justify-center mx-auto text-muted">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-sm font-bold text-white">Wallet Not Connected</h4>
              <p className="text-xs text-secondary leading-relaxed">
                Connect your Web3 browser wallet (MetaMask, Rabby, Trust Wallet) to read your personal LIORA balance directly from BNB Smart Chain Mainnet.
              </p>
            </div>
            <button
              type="button"
              onClick={() => connect()}
              className="btn-metallic px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Web3 Wallet</span>
            </button>
          </div>
        )}

        {/* State 2: Connected to Unsupported Network */}
        {isConnected && !isBscMainnet && !isBscTestnet && (
          <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Unsupported Network Connected: {chainName || 'Unknown Network'}</span>
            </div>
            <p className="text-secondary leading-relaxed">
              LIORA smart contracts operate on <strong>BNB Smart Chain Mainnet (Chain ID 56)</strong>.
              Please switch networks in your wallet to view and verify your tokens.
            </p>
            <button
              type="button"
              onClick={() => switchToBscMainnet()}
              className="btn-metallic px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Switch to BNB Smart Chain Mainnet (Chain #56)</span>
            </button>
          </div>
        )}

        {/* State 3: RPC Error */}
        {isConnected && (isBscMainnet || isBscTestnet) && balanceError && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{balanceError}</span>
            </div>
            <button
              type="button"
              onClick={() => refreshUserBalance()}
              className="px-3 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-white text-xs border border-[var(--border-subtle)] transition-colors cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* State 4: Connected on BSC Mainnet / Testnet & Loaded */}
        {isConnected && (isBscMainnet || isBscTestnet) && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold">
                  Your LIORA Balance ({isBscMainnet ? 'Mainnet' : 'Testnet'})
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white font-mono">
                    {isBalanceLoading ? (
                      <span className="text-lg text-muted animate-pulse">Syncing...</span>
                    ) : (
                      userBalance ?? '0.00'
                    )}
                  </span>
                  <span className="text-sm font-bold text-[var(--brand-accent)]">LIORA</span>
                </div>
                <div className="text-[11px] text-muted font-mono">
                  Exact base units: {userBalanceRaw !== null ? `${userBalanceRaw.toString()} wei` : '0 wei'}
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5 text-xs text-secondary border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--border-subtle)]">
                <span className="text-[10px] uppercase font-bold text-muted">Connected Account</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white text-xs break-all sm:break-normal">
                    {address}
                  </span>
                  <button
                    onClick={() => address && handleCopy(address, 'user')}
                    className="p-1 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-secondary hover:text-white transition-colors shrink-0"
                    title="Copy address"
                  >
                    {copiedUser ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`${isBscMainnet ? BSC_MAINNET_CONFIG.explorerUrl : BSC_TESTNET_CONFIG.explorerUrl}/address/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded bg-[var(--bg-primary)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--brand-accent)] transition-colors shrink-0"
                    title="View on BscScan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Network: {isBscMainnet ? 'BNB Smart Chain Mainnet (#56)' : 'BNB Smart Chain Testnet (#97)'}</span>
                </div>
              </div>
            </div>

            {/* Quick action / network switch helper */}
            {!isBscMainnet && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200 gap-2">
                <span>Currently connected to Testnet. Switch to BSC Mainnet to view your official genesis tokens.</span>
                <button
                  type="button"
                  onClick={() => switchToBscMainnet()}
                  className="text-[var(--brand-accent)] font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>Switch to Mainnet (Chain #56)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Official BSC Mainnet Deployed Contracts & Explorer Verification */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[var(--brand-accent)]" />
              <span>Official BSC Mainnet Contract Infrastructure</span>
            </h3>
            <p className="text-xs text-secondary">
              Verified on-chain smart contracts deployed on BNB Smart Chain Mainnet (Chain ID 56) with corporate timelock governance.
            </p>
          </div>
          <a
            href={`https://bscscan.com/token/${BSC_MAINNET_LIORA_TOKEN_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>View Token on BscScan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 text-sm">
          {/* Contract 1: LIORA ERC1967 Proxy */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-emerald-500/30 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  LIORA Token (ERC1967 Proxy)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Official Canonical Token
                </span>
              </div>
              <a
                href={`https://bscscan.com/token/${BSC_MAINNET_LIORA_TOKEN_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 text-xs shrink-0"
              >
                <span>BscScan Token Tracker</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
              <span className="text-white break-all">{BSC_MAINNET_LIORA_TOKEN_ADDRESS}</span>
              <button
                onClick={() => handleCopy(BSC_MAINNET_LIORA_TOKEN_ADDRESS, 'token')}
                className="self-start sm:self-auto px-2.5 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-white border border-[var(--border-subtle)] transition-colors shrink-0"
              >
                {copiedToken ? <span className="text-emerald-400">Copied</span> : <span>Copy</span>}
              </button>
            </div>
          </div>

          {/* Contract 2: Implementation V1 */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Implementation Logic Contract (V1)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  UUPS Upgradeable Logic
                </span>
              </div>
              <a
                href={`https://bscscan.com/address/${BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS}#code`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 text-xs shrink-0"
              >
                <span>Verified Source Code</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
              <span className="text-secondary break-all">{BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS}</span>
              <button
                onClick={() => handleCopy(BSC_MAINNET_LIORA_IMPLEMENTATION_ADDRESS, 'impl')}
                className="self-start sm:self-auto px-2.5 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-white border border-[var(--border-subtle)] transition-colors shrink-0"
              >
                {copiedImpl ? <span className="text-emerald-400">Copied</span> : <span>Copy</span>}
              </button>
            </div>
          </div>

          {/* Contract 3: Restricted Reserve Vault */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Restricted Reserve Vault (LioraReserveVault)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Holds 99,000,000,000 LIORA
                </span>
              </div>
              <a
                href={`https://bscscan.com/address/${BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS}#code`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 text-xs shrink-0"
              >
                <span>Verified Contract</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
              <span className="text-secondary break-all">{BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS}</span>
              <button
                onClick={() => handleCopy(BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS, 'vault')}
                className="self-start sm:self-auto px-2.5 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-white border border-[var(--border-subtle)] transition-colors shrink-0"
              >
                {copiedVault ? <span className="text-emerald-400">Copied</span> : <span>Copy</span>}
              </button>
            </div>
          </div>

          {/* Contract 4: Corporate Timelock */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Corporate Governance Timelock (LioraTimelock)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  48-Hour Delay Enforced (172,800s)
                </span>
              </div>
              <a
                href={`https://bscscan.com/address/${BSC_MAINNET_LIORA_TIMELOCK_ADDRESS}#code`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 text-xs shrink-0"
              >
                <span>Verified Contract</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
              <span className="text-secondary break-all">{BSC_MAINNET_LIORA_TIMELOCK_ADDRESS}</span>
              <button
                onClick={() => handleCopy(BSC_MAINNET_LIORA_TIMELOCK_ADDRESS, 'timelock')}
                className="self-start sm:self-auto px-2.5 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-white border border-[var(--border-subtle)] transition-colors shrink-0"
              >
                {copiedTimelock ? <span className="text-emerald-400">Copied</span> : <span>Copy</span>}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Developer Testnet Sandbox Accordion (Excluded from production website) */}
      {isTestnetSandboxEnabled() && (
        <Card className="border border-[var(--border-subtle)] space-y-4">
          <button
            type="button"
            onClick={() => setShowTestnetSection(!showTestnetSection)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-bold text-white">Developer Testnet Sandbox (Chain ID 97)</h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                Developer Only
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-secondary transition-transform ${showTestnetSection ? 'rotate-180' : ''}`} />
          </button>

          {showTestnetSection && (
            <div className="space-y-4 pt-3 border-t border-[var(--border-subtle)] text-xs">
              <p className="text-secondary leading-relaxed">
                For smart contract testing and E2E simulation prior to production release, the BSC Testnet contracts remain operational in a segregated environment.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-muted text-[10px] uppercase font-semibold">Testnet Proxy:</span>
                  <div className="text-white break-all">{BSC_TESTNET_TOKEN_ADDRESS}</div>
                  <a
                    href={`${BSC_TESTNET_CONFIG.explorerUrl}/address/${BSC_TESTNET_TOKEN_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 text-[10px]"
                  >
                    <span>BscScan Testnet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-muted text-[10px] uppercase font-semibold">Testnet Sale:</span>
                  <div className="text-white break-all">{BSC_TESTNET_SALE_ADDRESS}</div>
                  <a
                    href={`${BSC_TESTNET_CONFIG.explorerUrl}/address/${BSC_TESTNET_SALE_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 text-[10px]"
                  >
                    <span>BscScan Testnet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => switchToBscTestnet()}
                  className="btn-metallic px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <span>Switch Wallet to BSC Testnet (Chain #97)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Security & Governance Notice */}
      <div className="glass-panel p-6 rounded-2xl border border-[var(--border-prominent)] space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Official Token Authenticity & Safety Notice</span>
        </h4>
        <p className="text-xs text-secondary leading-relaxed">
          Beware of unauthorized impersonations claiming to represent LIORA. The canonical LIORA smart contract is deployed on BNB Smart Chain Mainnet exclusively at <code className="text-white font-mono text-[11px]">{BSC_MAINNET_LIORA_TOKEN_ADDRESS}</code>. Upgradeability is strictly governed by a 48-hour Timelock (<code className="text-white font-mono text-[11px]">{BSC_MAINNET_LIORA_TIMELOCK_ADDRESS}</code>). Always verify contract addresses on BscScan before interacting.
        </p>
      </div>
    </div>
  );
}
