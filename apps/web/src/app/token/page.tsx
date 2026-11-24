'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { TOKEN_CONFIG, BSC_TESTNET_CONFIG } from '../../config/tokenConfig';
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
} from 'lucide-react';

export default function TokenPage() {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedAlloc, setCopiedAlloc] = useState(false);
  const [copiedSale, setCopiedSale] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);

  const {
    isConnected,
    address,
    chainName,
    isBscTestnet,
    isWrongNetwork,
    connect,
    switchToBscTestnet,
  } = useWeb3Wallet();

  const {
    isLoading,
    isBalanceLoading,
    error,
    balanceError,
    tokenData,
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

  const handleCopy = (text: string, type: 'token' | 'alloc' | 'sale' | 'user') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'alloc') {
        setCopiedAlloc(true);
        setTimeout(() => setCopiedAlloc(false), 2000);
      } else if (type === 'token') {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      } else if (type === 'sale') {
        setCopiedSale(true);
        setTimeout(() => setCopiedSale(false), 2000);
      } else if (type === 'user') {
        setCopiedUser(true);
        setTimeout(() => setCopiedUser(false), 2000);
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
            Verified technical specifications, deflationary burning mechanics, and live on-chain architecture for LIORA on BNB Smart Chain via OpenZeppelin UUPS Upgradeable Proxy.
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
            alt="Liora Coin Official Token Logo"
            width={110}
            height={110}
            className="relative object-contain filter drop-shadow-md"
          />
        </div>
      </div>

      {/* Live BSC Testnet On-Chain Status Banner */}
      <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <strong className="text-white">BNB Smart Chain Testnet (Chain ID 97) Live Data Integration</strong>
            <p className="text-[11px] text-blue-200/80 leading-relaxed">
              All displayed on-chain metrics, contract states, and wallet balances are retrieved read-only from the verified BSC Testnet deployment with zero monetary risk.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-2.5 py-1 rounded-md bg-blue-500/10 text-[var(--brand-accent)] border border-blue-500/20 font-mono font-semibold">
            RPC: bsc-testnet
          </span>
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-white border border-[var(--border-subtle)] transition-colors cursor-pointer"
            title="Refresh on-chain state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--brand-accent)]' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Token Name</span>
          <div className="text-xl font-bold text-white">
            {tokenData ? tokenData.name : TOKEN_CONFIG.name}
          </div>
          <span className="text-xs text-secondary">
            {tokenData ? 'On-Chain Verified' : 'Official Protocol Asset'}
          </span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Ticker Symbol</span>
          <div className="text-xl font-bold text-white">
            {tokenData ? tokenData.symbol : TOKEN_CONFIG.symbol}
          </div>
          <span className="text-xs text-emerald-400">BEP-20 Standard</span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Total Supply</span>
          <div className="text-xl font-bold text-white">
            {tokenData ? (
              `${tokenData.totalSupply}`
            ) : isLoading ? (
              <span className="text-sm font-normal text-muted animate-pulse">Reading on-chain...</span>
            ) : (
              '1,000,000,000'
            )}
          </div>
          <span className="text-xs text-emerald-400">
            {tokenData ? 'Live BSC Testnet Supply' : 'Fixed Genesis Supply'}
          </span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted uppercase font-semibold">Transfer Tax</span>
          <div className="text-xl font-bold text-emerald-400">0% Tax-Free</div>
          <span className="text-xs text-secondary">100% AMM / DEX Compatible</span>
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
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-[var(--brand-accent)] border border-blue-500/20 font-semibold uppercase">
                  BSC Testnet #97
                </span>
              </h3>
              <p className="text-xs text-secondary">
                Live read-only token balance retrieved directly from the LIORA UUPS contract on BNB Smart Chain Testnet.
              </p>
            </div>
          </div>
          {isConnected && isBscTestnet && (
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
                Connect your Web3 browser wallet to read your personal LIORA balance directly from BNB Smart Chain Testnet.
              </p>
            </div>
            <button
              type="button"
              onClick={() => connect()}
              className="btn-metallic px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Testnet Wallet</span>
            </button>
          </div>
        )}

        {/* State 2: Connected to Unsupported Network */}
        {isConnected && !isBscTestnet && (
          <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Unsupported Network Connected: {chainName || 'Unknown Network'}</span>
            </div>
            <p className="text-secondary leading-relaxed">
              OXENIQ testnet contracts and token balances operate strictly on <strong>BNB Smart Chain Testnet (Chain ID 97)</strong>.
              Please switch networks in your wallet to view and manage your testnet tokens.
            </p>
            <button
              type="button"
              onClick={() => switchToBscTestnet()}
              className="btn-metallic px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Switch to BSC Testnet (Chain #97)</span>
            </button>
          </div>
        )}

        {/* State 3: RPC Error */}
        {isConnected && isBscTestnet && balanceError && (
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

        {/* State 4: Connected on BSC Testnet & Loaded */}
        {isConnected && isBscTestnet && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold">Your OXENIQ Balance</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">
                    {isBalanceLoading ? (
                      <span className="text-lg text-muted animate-pulse">Syncing...</span>
                    ) : (
                      userBalance ?? '0.00'
                    )}
                  </span>
                  <span className="text-sm font-bold text-[var(--brand-accent)]">OXENIQ</span>
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
                    href={`${BSC_TESTNET_CONFIG.explorerUrl}/address/${address}`}
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
                  <span>Network: BNB Smart Chain Testnet (#97)</span>
                </div>
              </div>
            </div>

            {/* Quick Action Link to Sandbox Terminal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-secondary gap-2">
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[var(--brand-accent)]" />
                <span>Need testnet OXENIQ tokens for testing? Use our BSC Testnet purchase sandbox.</span>
              </span>
              <Link
                href="/buy"
                className="text-[var(--brand-accent)] font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>Open Testnet Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </Card>

      {/* Live Blockchain Network & Explorer Verification */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[var(--brand-accent)]" />
              <span>Blockchain Network & Contract Verification</span>
            </h3>
            <p className="text-xs text-secondary">Live on-chain contract deployments and explorer verification on BNB Smart Chain.</p>
          </div>
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-secondary hover:text-white border border-[var(--border-subtle)] transition-colors"
            title="Refresh on-chain state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--brand-accent)]' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Sync Blockchain'}</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 text-sm">
          {/* BSC Testnet — Verified Deployed Contract */}
          <div className="p-5 rounded-xl bg-[var(--bg-elevated)] border border-emerald-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  BNB Smart Chain Testnet (Chain ID 97)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Deployed & Active</span>
                </span>
              </div>
              <a
                href={`${BSC_TESTNET_CONFIG.explorerUrl}/address/${tokenAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 text-xs shrink-0"
              >
                <span>View on BscScan Testnet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Contract Address Bar */}
            <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold">OxeniqToken Contract Address</span>
                <div className="font-mono text-xs sm:text-sm text-white break-all">
                  {tokenAddress}
                </div>
              </div>
              <button
                onClick={() => handleCopy(tokenAddress, 'token')}
                className="self-start sm:self-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-white border border-[var(--border-subtle)] transition-colors shrink-0"
              >
                {copiedToken ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-secondary" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Read On-Chain State */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-[var(--bg-primary)]/60 border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-muted text-[10px] uppercase font-semibold">Decimals</span>
                <div className="font-semibold text-white">{tokenData ? tokenData.decimals : 18}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-primary)]/60 border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-muted text-[10px] uppercase font-semibold">Circulating Supply</span>
                <div className="font-semibold text-emerald-400">
                  {tokenData ? `${tokenData.totalSupply} OXENIQ` : (isLoading ? 'Querying...' : '1,000,000,000 OXENIQ')}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-primary)]/60 border border-[var(--border-subtle)] space-y-0.5 col-span-2">
                <span className="text-muted text-[10px] uppercase font-semibold">Contract Owner (Ownable2Step)</span>
                <div className="font-mono text-[11px] text-white truncate" title={tokenData?.owner || '0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350'}>
                  {tokenData ? tokenData.owner : '0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350'}
                </div>
              </div>
            </div>
          </div>

          {/* Mainnet Staged */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-white uppercase tracking-wider">BNB Smart Chain Mainnet (Chain ID 56)</span>
              <span className="text-xs text-[var(--brand-accent)] font-semibold">Genesis Launch Staged</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-secondary">
                Official mainnet contract address will be published at genesis deployment. Chain ID 56 remains strictly guarded until production launch.
              </span>
              <a
                href="https://bscscan.com"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>BscScan Mainnet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* AllocationManager 70:30 Protocol Details */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>AllocationManager Contract Architecture</span>
            </h3>
            <p className="text-xs text-secondary">
              Autonomous on-chain mathematical conservation enforcing exact 70% ecosystem and 30% reserve split.
            </p>
          </div>
          <Badge status="Live" size="sm" />
        </div>

        {/* AllocationManager Contract Details */}
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted font-bold">AllocationManager Address (BSC Testnet)</span>
              <div className="font-mono text-xs sm:text-sm text-white break-all">
                {allocationManagerAddress}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopy(allocationManagerAddress, 'alloc')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-white border border-[var(--border-subtle)] transition-colors"
              >
                {copiedAlloc ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-secondary" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <a
                href={`${BSC_TESTNET_CONFIG.explorerUrl}/address/${allocationManagerAddress}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-[var(--brand-accent)] border border-[var(--border-subtle)] transition-colors"
              >
                <span>BscScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Allocation Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-muted text-[10px] uppercase font-semibold">Bound Token</span>
              <div className="font-mono text-xs text-white truncate" title={allocationData?.token || tokenAddress}>
                {allocationData ? allocationData.token : tokenAddress}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-muted text-[10px] uppercase font-semibold">Recipient 70% (Ecosystem/Treasury)</span>
              <div className="font-mono text-xs text-emerald-400 truncate" title={allocationData?.recipient70 || 'Deployer (Testnet)'}>
                {allocationData ? allocationData.recipient70 : '0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-muted text-[10px] uppercase font-semibold">Recipient 30% (Reserve)</span>
              <div className="font-mono text-xs text-cyan-400 truncate" title={allocationData?.recipient30 || 'Deployer (Testnet)'}>
                {allocationData ? allocationData.recipient30 : '0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350'}
              </div>
            </div>
          </div>

          {/* ABI Capabilities & Architectural Scope */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)]/60 border border-[var(--border-subtle)] text-xs text-secondary space-y-1.5 leading-relaxed">
            <span className="font-bold flex items-center gap-1.5 text-white">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Contract Read Capabilities & Storage Scope</span>
            </span>
            <p className="text-[11px] text-secondary">
              The AllocationManager contract at <code className="text-white font-mono text-[11px]">0x2ce5...9296</code> strictly supports view methods for <code className="text-white font-mono text-[11px]">token()</code>, <code className="text-white font-mono text-[11px]">owner()</code>, <code className="text-white font-mono text-[11px]">recipient70()</code>, <code className="text-white font-mono text-[11px]">recipient30()</code>, and the pure function <code className="text-white font-mono text-[11px]">calculateSplit(uint256 amount)</code>. Split execution distributes tokens atomically between the recipient accounts and emits an on-chain <code className="text-white font-mono text-[11px]">AllocationExecuted</code> event; the contract does not maintain custom cumulative balances or user allocation tracking in contract storage.
            </p>
          </div>

          {/* Temporary Deployer Notice as required */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-200 text-xs space-y-1 leading-relaxed">
            <span className="font-bold flex items-center gap-1.5 text-cyan-300">
              <Layers className="w-3.5 h-3.5" />
              <span>Temporary Testnet Recipient Notice</span>
            </span>
            <p className="text-cyan-200/80">
              Both the 70% and 30% allocation recipients are currently configured with the deployer wallet address
              (<code className="text-white font-mono text-[11px]">0xe31A...9350</code>) strictly for automated testnet pipeline verification.
              Prior to Mainnet Genesis deployment, production multisig vaults and DAO governance treasury addresses will be designated.
            </p>
          </div>
        </div>
      </Card>

      {/* Testnet Token Sale Contract Details */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>Testnet Fixed-Price Token Sale Contract</span>
            </h3>
            <p className="text-xs text-secondary">
              Dedicated testnet dispenser for developer integration and automated E2E testing on BSC Testnet.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {saleData?.isPaused ? 'Paused' : 'Active On-Chain'}
          </span>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted font-bold">Sale Contract Address (BSC Testnet)</span>
              <div className="font-mono text-xs sm:text-sm text-white break-all">
                {saleAddress}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopy(saleAddress, 'sale')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-white border border-[var(--border-subtle)] transition-colors"
              >
                {copiedSale ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-secondary" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <a
                href={`${BSC_TESTNET_CONFIG.explorerUrl}/address/${saleAddress}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-xs text-[var(--brand-accent)] border border-[var(--border-subtle)] transition-colors"
              >
                <span>BscScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Sale Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-muted text-[10px] uppercase font-semibold">Fixed Testnet Rate</span>
              <div className="font-semibold text-white">
                1 tBNB = {saleData ? saleData.tokensPerBnb.toLocaleString() : '10,000'} OXENIQ
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-muted text-[10px] uppercase font-semibold">Available Test Inventory</span>
              <div className="font-semibold text-emerald-400">
                {saleData ? `${saleData.availableInventoryFormatted} OXENIQ` : (isLoading ? 'Querying...' : 'Live On-Chain')}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-muted text-[10px] uppercase font-semibold">Contract Circuit Breaker</span>
              <div className={saleData?.isPaused ? 'font-semibold text-amber-400' : 'font-semibold text-emerald-400'}>
                {saleData ? (saleData.isPaused ? 'Paused (Circuit Breaker)' : 'Active (Unpaused)') : 'Active'}
              </div>
            </div>
          </div>

          {/* Quick link to purchase terminal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs text-blue-200 gap-2">
            <span className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[var(--brand-accent)] shrink-0" />
              <span>Purchase tokens with testnet BNB (tBNB) using our interactive sandbox terminal.</span>
            </span>
            <Link
              href="/buy"
              className="btn-metallic px-3.5 py-1.5 rounded-lg font-semibold text-xs text-white inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Testnet Purchase Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      {/* Smart Contract Architecture Pillars */}
      <Card className="space-y-6">
        <h3 className="text-base font-bold text-white">Smart Contract Security & Governance Architecture</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-secondary">
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero Transfer Taxes</span>
            </div>
            <p className="leading-relaxed">
              Base BEP-20 transfer path has 0% tax. This ensures flawless compatibility with PancakeSwap routers,
              staking pools, multi-sig vaults, and cross-chain bridges without unexpected slippage failures.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-[var(--brand-accent)]" />
              <span>Two-Step Ownership Transfer</span>
            </div>
            <p className="leading-relaxed">
              OpenZeppelin <code>Ownable2Step</code> requires the nominated administrator to explicitly call
              <code>acceptOwnership()</code>, preventing accidental loss of contract control from mistyped addresses.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Deflationary Holder Burns</span>
            </div>
            <p className="leading-relaxed">
              Inherits <code>ERC20Burnable</code>. Any token holder can permanently burn their tokens,
              reducing total circulating supply on-chain with full event transparency.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Decoupled 70:30 Allocation</span>
            </div>
            <p className="leading-relaxed">
              Purchase allocation logic is segregated in a dedicated <code>AllocationManager.sol</code> contract,
              enforcing exact integer division math without altering standard wallet-to-wallet transfers.
            </p>
          </div>
        </div>
      </Card>

      {/* Security & Authenticity Notice */}
      <div className="glass-panel p-6 rounded-2xl border border-[var(--border-prominent)] space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Official Token Authenticity & Safety Notice</span>
        </h4>
        <p className="text-xs text-secondary leading-relaxed">
          Beware of unauthorized fake tokens claiming to be Liora Coin (LIORA) or OXENIQ on PancakeSwap or other decentralized exchanges.
          The official contract address will be published exclusively on this official portal (lioracoin.io)
          and verified on BscScan. Always verify the contract address before initiating any swap.
        </p>
      </div>
    </div>
  );
}
