'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDexOnChainLiquidity } from '../../hooks/useDexOnChainLiquidity';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import {
  PANCAKESWAP_PAIR_ADDRESS,
  PANCAKESWAP_ROUTER_ADDRESS,
  LIORA_TOKEN_ADDRESS,
  MOCK_USDT_ADDRESS,
  ILLUSTRATIVE_USD_INR_RATE,
} from '../../lib/dex/dexOnChainClient';
import {
  BSC_MAINNET_LIORA_TOKEN_ADDRESS,
  BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS,
  BSC_MAINNET_LIORA_TIMELOCK_ADDRESS,
  BSC_MAINNET_OPERATING_TREASURY_ADDRESS,
  isTestnetSandboxEnabled,
} from '../../config/tokenConfig';
import {
  CONFIRMED_INVESTMENT_PLANS,
} from '../../lib/allocation/proportionalAllocationEngine';
import {
  PlusCircle,
  MinusCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Settings2,
  Info,
  Lock,
  Layers,
  ArrowRight,
  TrendingUp,
  Coins,
  History,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';

interface LioraLiquidityDashboardProps {
  className?: string;
}

export const LioraLiquidityDashboard: React.FC<LioraLiquidityDashboardProps> = ({
  className = '',
}) => {
  const isDevSandbox = isTestnetSandboxEnabled();

  if (!isDevSandbox) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="p-8 sm:p-10 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
              BNB Smart Chain Mainnet (Chain ID 56)
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
              Mainnet Liquidity Staged &amp; Governed
            </h1>
            <p className="text-xs sm:text-sm text-secondary leading-relaxed">
              Decentralized Automated Market Maker (AMM) liquidity pools for the official LIORA BEP-20 token are securely staged. To uphold protocol integrity and prevent premature market distortion, liquidity pool seeding and DEX trading remain locked in Phase 1.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left pt-2">
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>LIORA Token</span>
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="font-mono text-xs text-white truncate">
                {BSC_MAINNET_LIORA_TOKEN_ADDRESS}
              </div>
              <a
                href={`https://bscscan.com/token/${BSC_MAINNET_LIORA_TOKEN_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>BscScan Verified</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Reserve Vault (99B)</span>
                <Layers className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="font-mono text-xs text-white truncate">
                {BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS}
              </div>
              <a
                href={`https://bscscan.com/address/${BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1"
              >
                <span>Escrow Contract</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Timelock Governance</span>
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="font-mono text-xs text-white truncate">
                {BSC_MAINNET_LIORA_TIMELOCK_ADDRESS}
              </div>
              <div className="text-[11px] text-cyan-300 font-medium">
                48-Hour Delay Enforced
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Operating Treasury</span>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="font-mono text-xs text-white truncate">
                {BSC_MAINNET_OPERATING_TREASURY_ADDRESS}
              </div>
              <div className="text-[11px] text-blue-300 font-medium">
                1,000,000,000 LIORA Bound
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs max-w-2xl mx-auto flex items-start gap-3 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-amber-300">Phase 1 Mainnet Liquidity Invariant</strong>
              <p className="text-secondary leading-relaxed">
                No automated market maker liquidity pools (e.g. PancakeSwap LIORA/USDT, LIORA/WBNB) have been funded on BSC Mainnet. Any third-party pairs claiming to offer LIORA trading on decentralized exchanges are unauthorized and should be treated with extreme caution.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    pool,
    isPoolLoading,
    poolError,
    refreshPool,
    position,
    isPositionLoading,
    positionError,
    refreshPosition,
    addAmountLiora,
    addAmountUsdt,
    addInputField,
    handleLioraInputChange,
    handleUsdtInputChange,
    setMaxLiora,
    setMaxUsdt,
    addSlippagePercent,
    setAddSlippagePercent,
    addQuote,
    withdrawPercent,
    setWithdrawPercent,
    customLpInput,
    setCustomLpInput,
    removeSlippagePercent,
    setRemoveSlippagePercent,
    removeQuote,
    isApprovingLiora,
    isApprovingUsdt,
    isApprovingLp,
    isSupplying,
    isRemoving,
    pendingTxHash,
    actionError,
    lastExecutedTx,
    clearActionError,
    approveLiora,
    approveUsdt,
    approveLpToken,
    supplyLiquidity,
    removeLiquidity,
    history,
    refreshHistory,
    isBscTestnet,
    isConnected,
    address,
    activeWalletInfo,
    walletName,
  } = useDexOnChainLiquidity();

  const { connect, switchToBscTestnet, disconnect } = useWeb3Wallet();

  const [activeTab, setActiveTab] = useState<'ADD' | 'REMOVE'>('ADD');
  const [showSettings, setShowSettings] = useState(false);
  const [customSlippage, setCustomSlippage] = useState('');

  const currentSlippage = activeTab === 'ADD' ? addSlippagePercent : removeSlippagePercent;
  const setSlippage = activeTab === 'ADD' ? setAddSlippagePercent : setRemoveSlippagePercent;

  const handleSlippagePreset = (val: number) => {
    setSlippage(val);
    setCustomSlippage('');
  };

  const handleCustomSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomSlippage(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num <= 50) {
      setSlippage(num);
    }
  };

  const refreshAll = () => {
    refreshPool();
    if (isConnected) {
      refreshPosition();
      refreshHistory();
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* 1. Header & Testnet Environment Notice */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-950/70 via-[#0B132B] to-purple-950/50 border border-blue-500/30 text-xs shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h1 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                LIORA / mUSDT Liquidity Administration
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-500/30">
                  BSC Testnet (#97)
                </span>
              </h1>
              <p className="text-[11px] text-secondary">
                PancakeSwap V2 Non-Custodial Automated Market Maker Reserve Management
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            {isConnected && address ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>{walletName || 'MetaMask'}: {address.slice(0, 6)}...{address.slice(-4)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="px-2 py-1 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-500/20 text-xs font-semibold"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => connect()}
                className="px-3.5 py-1.5 rounded-xl btn-metallic text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-300" />
                <span>Connect MetaMask</span>
              </button>
            )}
            <a
              href={`https://testnet.bscscan.com/address/${PANCAKESWAP_PAIR_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-accent)] hover:underline flex items-center gap-1 bg-[var(--bg-elevated)] px-2.5 py-1 rounded-xl border border-[var(--border-subtle)]"
            >
              <span>Pair: {PANCAKESWAP_PAIR_ADDRESS.slice(0, 6)}...{PANCAKESWAP_PAIR_ADDRESS.slice(-4)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://testnet.bscscan.com/address/${PANCAKESWAP_ROUTER_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-white flex items-center gap-1 bg-[var(--bg-elevated)] px-2.5 py-1 rounded-xl border border-[var(--border-subtle)]"
            >
              <span>Router: {PANCAKESWAP_ROUTER_ADDRESS.slice(0, 6)}...{PANCAKESWAP_ROUTER_ADDRESS.slice(-4)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px] flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Non-Custodial Sandbox Environment:</strong> Mock USDT (mUSDT) is a test token with no financial value. All pool reserves, LP tokens, and swap calculations run exclusively on BNB Smart Chain Testnet (Chain ID 97). Mainnet transactions remain strictly blocked.
          </div>
        </div>
      </div>

      {/* 2. Pool State & Exchange Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* LIORA Reserve */}
        <div className="p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-secondary text-xs">
            <span className="font-semibold">LIORA Reserve</span>
            <Coins className="w-4 h-4 text-[var(--brand-accent)]" />
          </div>
          <div className="text-xl font-extrabold text-white tracking-tight">
            {isPoolLoading ? (
              <span className="text-secondary text-sm">Loading reserves...</span>
            ) : (
              `${pool?.formattedLiora || '215,787.20'} LIORA`
            )}
          </div>
          <div className="text-[11px] text-secondary">
            Pool share token: <span className="font-mono text-white">token1</span>
          </div>
        </div>

        {/* mUSDT Reserve */}
        <div className="p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-secondary text-xs">
            <span className="font-semibold">mUSDT Reserve</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-white tracking-tight">
            {isPoolLoading ? (
              <span className="text-secondary text-sm">Loading reserves...</span>
            ) : (
              `${pool?.formattedUsdt || '501.07'} mUSDT`
            )}
          </div>
          <div className="text-[11px] text-secondary">
            Pool share token: <span className="font-mono text-white">token0</span>
          </div>
        </div>

        {/* Exchange Ratio & Spot Price */}
        <div className="p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-secondary text-xs">
            <span className="font-semibold">Pool Ratio & Price</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-extrabold text-white tracking-tight">
            1 mUSDT ≈ {pool?.ratioLioraPerUsdt?.toFixed(2) || '430.65'} LIORA
          </div>
          <div className="text-[11px] text-secondary flex items-center justify-between">
            <span>1 LIORA ≈ ${pool?.spotPriceUsd?.toFixed(6) || '0.002322'}</span>
            <span className="text-emerald-400 font-medium">≈ ₹{pool?.spotPriceInr?.toFixed(4) || '0.2008'}</span>
          </div>
        </div>

        {/* Total LP Token Supply */}
        <div className="p-5 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-2">
          <div className="flex items-center justify-between text-secondary text-xs">
            <span className="font-semibold">Total LP Supply</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={refreshAll}
                className="p-1 rounded-lg hover:bg-[var(--bg-primary)] text-secondary hover:text-white transition-all"
                title="Refresh on-chain state"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPoolLoading ? 'animate-spin text-[var(--brand-accent)]' : ''}`} />
              </button>
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-white tracking-tight">
            {isPoolLoading ? (
              <span className="text-secondary text-sm">Reading supply...</span>
            ) : (
              `${pool?.formattedTotalLpSupply || '10,398.3172'} LP`
            )}
          </div>
          <div className="text-[11px] text-secondary">
            Symbol: <span className="font-semibold text-white">Cake-LP</span> (Pancake LPs)
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 Cols): User Position + Custody Transparency + Business Decoupling */}
        <div className="lg:col-span-5 space-y-6">
          {/* User LP Position Card */}
          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[var(--brand-accent)]" />
                <h2 className="text-sm font-extrabold text-white">Your Liquidity Position</h2>
              </div>
              {isConnected && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                  CONNECTED
                </span>
              )}
            </div>

            {!isConnected ? (
              <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-center space-y-3">
                <p className="text-xs text-secondary">
                  {activeWalletInfo?.name ? (
                    <span>
                      <strong>{activeWalletInfo.name}</strong> was previously selected. Reconnect your wallet to inspect your Cake-LP balance and pool share.
                    </span>
                  ) : (
                    <span>
                      Connect your MetaMask or Web3 wallet on BSC Testnet to inspect your LP token balance and pool share.
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => connect()}
                  className="px-4 py-2 rounded-xl btn-metallic text-white font-bold text-xs shadow-md"
                >
                  Connect {activeWalletInfo?.name || 'MetaMask'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* Active Wallet Identity Banner */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-blue-950/20 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
                      {walletName?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <div className="font-extrabold text-white flex items-center gap-1.5">
                        <span>{walletName || 'MetaMask'}</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-normal">(Verified EVM)</span>
                      </div>
                      <div className="text-[11px] font-mono text-secondary">
                        {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                    Chain #97
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary">Your Cake-LP Tokens:</span>
                    <span className="font-mono font-bold text-white">
                      {isPositionLoading ? '...' : `${position?.lpBalanceFormatted || '0.00'} Cake-LP`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary">Your Pool Share:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {isPositionLoading ? '...' : `${position?.poolSharePercent?.toFixed(4) || '0.0000'}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary">Underlying Pooled LIORA:</span>
                    <span className="font-mono font-bold text-white">
                      {isPositionLoading ? '...' : `${position?.underlyingLioraFormatted || '0.00'} LIORA`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary">Underlying Pooled mUSDT:</span>
                    <span className="font-mono font-bold text-white">
                      {isPositionLoading ? '...' : `${position?.underlyingUsdtFormatted || '0.00'} mUSDT`}
                    </span>
                  </div>
                </div>

                {/* Available Wallet Balances for Liquidity */}
                <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-500/20 space-y-1.5 text-[11px]">
                  <div className="font-bold text-blue-200">Wallet Available For Staking:</div>
                  <div className="flex items-center justify-between text-secondary font-mono">
                    <span>LIORA Balance:</span>
                    <span className="text-white">{position?.lioraBalanceFormatted || '0.00'} LIORA</span>
                  </div>
                  <div className="flex items-center justify-between text-secondary font-mono">
                    <span>mUSDT Balance:</span>
                    <span className="text-white">{position?.usdtBalanceFormatted || '0.00'} mUSDT</span>
                  </div>
                  <div className="flex items-center justify-between text-secondary font-mono">
                    <span>Testnet BNB (Gas):</span>
                    <span className="text-white">{position?.bnbBalanceFormatted || '0.00'} tBNB</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LP Custody & Security Transparency Component (Requirement 5) */}
          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h2 className="text-sm font-extrabold text-white">LP Custody & Security Transparency</h2>
                <p className="text-[10px] text-secondary">Institutional Governance & Non-Custodial Architecture</p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-secondary">
              <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Deployer Initial LP Allocation (10,398.317 Cake-LP)</span>
                </div>
                <p className="text-[11px]">
                  Minted during Gate C5 pool initialization from 216,250 LIORA + 500 mUSDT. The deployer address (<code className="text-white font-mono text-[10px]">0xe31A2ec1474DfA2F5316dA0033f3Bd57F9D19350</code>) currently holds these LP tokens. Exactly <code className="text-white font-mono text-[10px]">1,000 wei</code> are locked permanently in the pair contract as <code className="text-white font-mono text-[10px]">MINIMUM_LIQUIDITY</code>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>Distinction: LP Ownership vs Token Ownership</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>
                    <strong className="text-white">LP Token Ownership:</strong> Gives redemption rights to pool reserves proportional to held Cake-LP tokens.
                  </li>
                  <li>
                    <strong className="text-white">LIORA Contract Ownership:</strong> Standard OpenZeppelin <code className="font-mono text-white">Ownable</code> for emergency pause authority; no minting capabilities exist beyond the fixed supply cap.
                  </li>
                  <li>
                    <strong className="text-white">Non-Custodial AMM:</strong> Neither the deployer nor any operator can confiscate, lock, or withdraw LP tokens owned by your wallet.
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-amber-200 text-[11px] space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locking vs Withdrawal Governance</span>
                </div>
                <p>
                  On BSC Testnet, deployer LP tokens remain in the authorized deployment wallet for verification. For production mainnet, initial pool LP tokens will be transitioned to a verified time-lock smart contract or multisig vault to eliminate single-key withdrawal risks.
                </p>
              </div>
            </div>
          </div>

          {/* Business Proposal Purchase Categories & Decoupled Investment Plans (Requirements 8 & 9) */}
          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-extrabold text-white">Purchase Tiers & Decoupled Plans</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-bold text-[10px] border border-blue-500/20">
                PROPOSAL SPEC
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1.5">
                <div className="font-bold text-white">Commercial Purchase Categories</div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  The three commercial package categories ($100 Standard, $1,000 Growth, $5,000 Strategic) are commercial proposals. <strong>DEX automated market makers operate permissionlessly:</strong> you may supply or withdraw any liquidity amount without minimum tier requirements.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Confirmed Investment Plans (Checklist 3)</span>
                  <span className="text-[10px] text-amber-300 font-mono">Decoupled from AMM</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {Object.values(CONFIRMED_INVESTMENT_PLANS).map((t) => (
                    <div
                      key={t.planId}
                      className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{t.displayName}</span>
                        {t.isRecommended && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">REC</span>
                        )}
                      </div>
                      <div className="text-secondary text-[10px]">{t.lockDurationMonths} Mo Lock ({t.multiplierFactor}× factor)</div>
                      <div className="text-[var(--brand-accent)] text-[10px]">₹{t.principalINR.toLocaleString('en-US')} $\rightarrow$ ₹{t.contractualAllocationINR.toLocaleString('en-US')}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-secondary leading-relaxed pt-1">
                  <strong>Strict AMM Invariant:</strong> Liquidity pool assets are never liquidated or encumbered to pay off investment plan rewards or scheduled INR price multiples.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Interactive Liquidity Terminal (Add / Remove) + Transaction History */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Action Terminal */}
          <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#111A2E] to-[#0A101D] border border-[var(--border-prominent)] shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            {/* Terminal Header & Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 bg-[var(--bg-primary)] p-1 rounded-2xl border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('ADD')}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                    activeTab === 'ADD'
                      ? 'bg-[var(--brand-accent)] text-black shadow-md'
                      : 'text-secondary hover:text-white'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Liquidity</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('REMOVE')}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                    activeTab === 'REMOVE'
                      ? 'bg-[var(--brand-accent)] text-black shadow-md'
                      : 'text-secondary hover:text-white'
                  }`}
                >
                  <MinusCircle className="w-4 h-4" />
                  <span>Remove Liquidity</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/swap"
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  <span>Go to Swap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-xl border transition-all ${
                    showSettings
                      ? 'bg-[var(--brand-blue)]/20 border-[var(--brand-accent)] text-white'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-secondary hover:text-white'
                  }`}
                  title="Slippage settings"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slippage Settings Drawer */}
            {showSettings && (
              <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-accent)] animate-fade-in space-y-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>Slippage Tolerance ({activeTab === 'ADD' ? 'Add' : 'Remove'})</span>
                  <span className="text-[var(--brand-accent)]">{currentSlippage}%</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {[0.1, 0.5, 1.0, 2.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSlippagePreset(val)}
                      className={`py-1.5 rounded-xl font-bold transition-all text-xs border ${
                        currentSlippage === val && !customSlippage
                          ? 'bg-[var(--brand-accent)] text-black border-[var(--brand-accent)]'
                          : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-secondary hover:text-white'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                  <div className="col-span-4 sm:col-span-1 relative">
                    <input
                      type="number"
                      placeholder="Custom"
                      value={customSlippage}
                      onChange={handleCustomSlippageChange}
                      className="w-full py-1.5 px-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white font-mono text-xs focus:border-[var(--brand-accent)] focus:outline-none"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-secondary">%</span>
                  </div>
                </div>
                <p className="text-[10px] text-secondary">
                  Transaction will revert if on-chain reserves deviate beyond this threshold or the 5-minute deadline expires.
                </p>
              </div>
            )}

            {/* Error & Status Banners */}
            {actionError && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={clearActionError}
                  className="text-red-300 hover:text-white font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {pendingTxHash && (
              <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs flex items-center justify-between gap-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[var(--brand-accent)] animate-spin" />
                  <span>Transaction broadcasting to BSC Testnet...</span>
                </div>
                <a
                  href={`https://testnet.bscscan.com/tx/${pendingTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--brand-accent)] hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>BscScan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {lastExecutedTx && !pendingTxHash && !actionError && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Successfully executed <strong>{lastExecutedTx.type.replace('_', ' ')}</strong>!
                  </span>
                </div>
                <a
                  href={lastExecutedTx.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-300 hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>View Receipt</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* TAB CONTENT 1: ADD LIQUIDITY */}
            {activeTab === 'ADD' && (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-4">
                  {/* LIORA Input Card */}
                  <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus-within:border-[var(--brand-accent)] transition-all space-y-2">
                    <div className="flex items-center justify-between text-xs text-secondary">
                      <span className="font-semibold text-white">Deposit LIORA</span>
                      <div className="flex items-center gap-2">
                        <span>Balance: {position?.lioraBalanceFormatted || '0.00'}</span>
                        <button
                          type="button"
                          onClick={setMaxLiora}
                          className="px-1.5 py-0.5 rounded bg-[var(--brand-accent)]/10 text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/20 font-bold text-[10px]"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.0"
                        value={addAmountLiora}
                        onChange={(e) => handleLioraInputChange(e.target.value)}
                        className="w-full bg-transparent text-xl sm:text-2xl font-extrabold text-white focus:outline-none font-mono"
                      />
                      <div className="flex items-center gap-2 bg-[var(--bg-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] shrink-0">
                        <img
                          src="/assets/liora-logo-128.png"
                          alt="LIORA"
                          className="w-5 h-5 rounded-full object-contain"
                        />
                        <span className="font-extrabold text-white text-xs">LIORA</span>
                      </div>
                    </div>
                  </div>

                  {/* Linked Plus Separator */}
                  <div className="flex justify-center -my-2 relative z-10">
                    <div className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary shadow-lg">
                      <PlusCircle className="w-4 h-4 text-[var(--brand-accent)]" />
                    </div>
                  </div>

                  {/* mUSDT Input Card */}
                  <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus-within:border-[var(--brand-accent)] transition-all space-y-2">
                    <div className="flex items-center justify-between text-xs text-secondary">
                      <span className="font-semibold text-white">Deposit Mock USDT (Paired)</span>
                      <div className="flex items-center gap-2">
                        <span>Balance: {position?.usdtBalanceFormatted || '0.00'}</span>
                        <button
                          type="button"
                          onClick={setMaxUsdt}
                          className="px-1.5 py-0.5 rounded bg-[var(--brand-accent)]/10 text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/20 font-bold text-[10px]"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.0"
                        value={addAmountUsdt}
                        onChange={(e) => handleUsdtInputChange(e.target.value)}
                        className="w-full bg-transparent text-xl sm:text-2xl font-extrabold text-white focus:outline-none font-mono"
                      />
                      <div className="flex items-center gap-2 bg-[var(--bg-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] shrink-0">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center font-black text-[10px] text-white">
                          $
                        </div>
                        <span className="font-extrabold text-white text-xs">mUSDT</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Liquidity Calculation Breakdown */}
                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-secondary">
                    <span>Expected LP Tokens Minted:</span>
                    <span className="font-mono font-bold text-white">
                      ~{addQuote.expectedLpMintedFormatted} Cake-LP
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary">
                    <span>New Share of Pool:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {addQuote.poolShareAfterAddPercent.toFixed(4)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary">
                    <span>Min. LIORA Deposited (Slippage {addSlippagePercent}%):</span>
                    <span className="font-mono text-white">
                      {addQuote.amountLioraMinFormatted} LIORA
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary">
                    <span>Min. mUSDT Deposited (Slippage {addSlippagePercent}%):</span>
                    <span className="font-mono text-white">
                      {addQuote.amountUsdtMinFormatted} mUSDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary text-[11px] pt-1 border-t border-[var(--border-subtle)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-secondary" />
                      <span>Transaction Deadline:</span>
                    </span>
                    <span className="font-mono text-white">5 minutes (auto-reverting)</span>
                  </div>
                </div>

                {/* Approval & Action Buttons */}
                <div className="space-y-3 pt-2">
                  {!isConnected ? (
                    <button
                      type="button"
                      onClick={() => connect()}
                      className="w-full py-3.5 rounded-2xl btn-metallic text-white font-extrabold text-sm shadow-xl"
                    >
                      Connect Wallet to Supply Liquidity
                    </button>
                  ) : !isBscTestnet ? (
                    <button
                      type="button"
                      onClick={() => switchToBscTestnet()}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-xl flex items-center justify-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Switch to BNB Smart Chain Testnet (#97)</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {/* Dual Approval Flow */}
                      {(addQuote.needsLioraApproval || addQuote.needsUsdtApproval) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {addQuote.needsLioraApproval && (
                            <button
                              type="button"
                              onClick={approveLiora}
                              disabled={isApprovingLiora || !addQuote.hasSufficientLioraBalance}
                              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              {isApprovingLiora && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                              <span>Approve Exact LIORA ({addQuote.amountLioraFormatted})</span>
                            </button>
                          )}
                          {addQuote.needsUsdtApproval && (
                            <button
                              type="button"
                              onClick={approveUsdt}
                              disabled={isApprovingUsdt || !addQuote.hasSufficientUsdtBalance}
                              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              {isApprovingUsdt && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                              <span>Approve Exact mUSDT ({addQuote.amountUsdtFormatted})</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Supply Button */}
                      <button
                        type="button"
                        onClick={supplyLiquidity}
                        disabled={
                          isSupplying ||
                          addQuote.needsLioraApproval ||
                          addQuote.needsUsdtApproval ||
                          !addQuote.hasSufficientLioraBalance ||
                          !addQuote.hasSufficientUsdtBalance ||
                          Number(addAmountLiora) <= 0
                        }
                        className="w-full py-3.5 rounded-2xl btn-metallic disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2"
                      >
                        {isSupplying && <RefreshCw className="w-4 h-4 animate-spin text-[var(--brand-accent)]" />}
                        <span>
                          {!addQuote.hasSufficientLioraBalance
                            ? 'Insufficient LIORA Balance'
                            : !addQuote.hasSufficientUsdtBalance
                            ? 'Insufficient mUSDT Balance'
                            : addQuote.needsLioraApproval || addQuote.needsUsdtApproval
                            ? 'Approval Required Prior to Supplying'
                            : 'Supply Liquidity'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: REMOVE LIQUIDITY */}
            {activeTab === 'REMOVE' && (
              <div className="space-y-5 animate-fade-in">
                {/* Percentage Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Select Removal Percentage</span>
                    <span className="font-mono text-emerald-400 font-bold">{withdrawPercent}%</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setWithdrawPercent(pct);
                          setCustomLpInput('');
                        }}
                        className={`py-2 rounded-xl font-extrabold text-xs transition-all border ${
                          withdrawPercent === pct && !customLpInput
                            ? 'bg-[var(--brand-accent)] text-black border-[var(--brand-accent)]'
                            : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] text-secondary hover:text-white'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom LP Input */}
                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] focus-within:border-[var(--brand-accent)] transition-all space-y-2">
                  <div className="flex items-center justify-between text-xs text-secondary">
                    <span className="font-semibold text-white">Custom LP Token Amount</span>
                    <span>Available: {position?.lpBalanceFormatted || '0.00'} Cake-LP</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={removeQuote.lpBurnAmountFormatted}
                      value={customLpInput}
                      onChange={(e) => {
                        setCustomLpInput(e.target.value);
                        setWithdrawPercent(0);
                      }}
                      className="w-full bg-transparent text-xl sm:text-2xl font-extrabold text-white focus:outline-none font-mono"
                    />
                    <div className="flex items-center gap-1.5 bg-[var(--bg-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] shrink-0">
                      <span className="font-extrabold text-white text-xs">Cake-LP</span>
                    </div>
                  </div>
                </div>

                {/* Removal Calculation Breakdown */}
                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-secondary">
                    <span>LP Tokens to Burn:</span>
                    <span className="font-mono font-bold text-white">
                      {removeQuote.lpBurnAmountFormatted} Cake-LP
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary">
                    <span>Expected LIORA Received:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {removeQuote.expectedLioraFormatted} LIORA
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary">
                    <span>Expected mUSDT Received:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {removeQuote.expectedUsdtFormatted} mUSDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary">
                    <span>Min. LIORA Received ({removeSlippagePercent}% Slippage):</span>
                    <span className="font-mono text-white">
                      {removeQuote.minLioraFormatted} LIORA
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary">
                    <span>Min. mUSDT Received ({removeSlippagePercent}% Slippage):</span>
                    <span className="font-mono text-white">
                      {removeQuote.minUsdtFormatted} mUSDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary">
                    <span>Remaining Pool Share:</span>
                    <span className="font-mono text-secondary">
                      {position && position.poolSharePercent > 0
                        ? Math.max(
                            0,
                            position.poolSharePercent * (1 - (removeQuote.withdrawPercent || 0) / 100)
                          ).toFixed(4)
                        : '0.0000'}
                      %
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-secondary text-[11px] pt-1 border-t border-[var(--border-subtle)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-secondary" />
                      <span>Transaction Deadline:</span>
                    </span>
                    <span className="font-mono text-white">5 minutes (auto-reverting)</span>
                  </div>
                </div>

                {/* Actions & Approvals for Removal */}
                <div className="space-y-3 pt-2">
                  {!isConnected ? (
                    <button
                      type="button"
                      onClick={() => connect()}
                      className="w-full py-3.5 rounded-2xl btn-metallic text-white font-extrabold text-sm shadow-xl"
                    >
                      Connect Wallet to Remove Liquidity
                    </button>
                  ) : !isBscTestnet ? (
                    <button
                      type="button"
                      onClick={() => switchToBscTestnet()}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-xl flex items-center justify-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Switch to BNB Smart Chain Testnet (#97)</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {removeQuote.needsLpApproval && (
                        <button
                          type="button"
                          onClick={approveLpToken}
                          disabled={isApprovingLp || !removeQuote.hasEnoughLpBalance}
                          className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          {isApprovingLp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>Approve Cake-LP ({removeQuote.lpBurnAmountFormatted})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={removeLiquidity}
                        disabled={
                          isRemoving ||
                          removeQuote.needsLpApproval ||
                          !removeQuote.hasEnoughLpBalance ||
                          Number(removeQuote.lpBurnAmountFormatted) <= 0
                        }
                        className="w-full py-3.5 rounded-2xl btn-metallic disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2"
                      >
                        {isRemoving && <RefreshCw className="w-4 h-4 animate-spin text-[var(--brand-accent)]" />}
                        <span>
                          {!removeQuote.hasEnoughLpBalance
                            ? 'Insufficient LP Token Balance'
                            : removeQuote.needsLpApproval
                            ? 'Approve Cake-LP Prior to Removal'
                            : 'Confirm Liquidity Removal'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Verified Liquidity Transaction History (Requirement 7) */}
          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--brand-accent)]" />
                <h3 className="text-sm font-extrabold text-white">Verified Liquidity History</h3>
              </div>
              <button
                type="button"
                onClick={refreshHistory}
                className="text-secondary hover:text-white text-xs flex items-center gap-1 transition-all"
                title="Refresh history"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-secondary border-b border-[var(--border-subtle)] text-[11px]">
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Amounts</th>
                    <th className="pb-2 font-semibold">LP Share</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                  {history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[var(--bg-primary)]/50 transition-colors">
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            tx.type === 'ADD_LIQUIDITY'
                              ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                              : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                          }`}
                        >
                          {tx.type === 'ADD_LIQUIDITY' ? 'ADD' : 'REMOVE'}
                        </span>
                      </td>
                      <td className="py-2.5 font-sans">
                        <div className="text-white">{tx.amountLiora}</div>
                        <div className="text-secondary text-[10px]">{tx.amountUsdt}</div>
                      </td>
                      <td className="py-2.5 text-white">{tx.lpAmount}</td>
                      <td className="py-2.5">
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          CONFIRMED
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-sans">
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--brand-accent)] hover:underline inline-flex items-center gap-1"
                        >
                          <span>{tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
