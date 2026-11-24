'use client';

import React, { useState } from 'react';
import { useWeb3Wallet, EIP6963ProviderDetail } from '../hooks/useWeb3Wallet';
import { 
  X, 
  ShieldCheck, 
  AlertCircle, 
  Smartphone, 
  Check, 
  Copy, 
  LogOut, 
  Globe, 
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const {
    isConnected,
    address,
    chainName,
    chainId,
    isSupportedChain,
    isWrongNetwork,
    activeWalletInfo,
    discoveredProviders,
    connect,
    disconnect,
    switchToBscTestnet,
    switchToBscMainnet,
    error,
    clearError,
    isConnecting,
  } = useWeb3Wallet();

  const [copied, setCopied] = useState(false);
  const [showMobileGuide, setShowMobileGuide] = useState(false);

  if (!isOpen) return null;

  const handleConnectProvider = async (providerDetail?: EIP6963ProviderDetail) => {
    const success = await connect(providerDetail);
    if (success) {
      onClose();
    }
  };

  const handleClose = () => {
    if (clearError) clearError();
    onClose();
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={handleClose}
      role="presentation"
    >
      <div 
        className="relative w-full max-w-lg p-6 glass-panel-elevated border border-[var(--border-accent)] shadow-2xl overflow-hidden rounded-2xl max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30 text-[var(--brand-accent)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-bold text-white tracking-wide">
                {isConnected ? 'Connected Wallet' : 'Connect Web3 Wallet'}
              </h3>
              <p className="text-[11px] text-secondary">
                BNB Smart Chain (BEP-20) Exclusive
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-secondary hover:text-white hover:bg-[var(--border-subtle)] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Error Banner */}
          {error && (
            <div className="p-3 text-xs rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 flex items-start justify-between gap-2 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {clearError && (
                <button
                  onClick={clearError}
                  className="text-xs text-red-400 hover:text-red-200 font-semibold underline shrink-0"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {/* Connected State View */}
          {isConnected && address ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary font-medium">Active Account</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                  <div className="font-mono text-sm text-white font-medium">
                    {formatAddress(address)}
                  </div>
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-secondary hover:text-white transition-colors"
                    title="Copy full address"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-subtle)]">
                  <span className="text-secondary">Network</span>
                  <span className={`font-medium ${isSupportedChain ? 'text-emerald-400' : 'text-amber-400 font-bold'}`}>
                    {chainName}
                  </span>
                </div>

                {activeWalletInfo && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">Wallet Provider</span>
                    <span className="text-white font-medium">{activeWalletInfo.name}</span>
                  </div>
                )}
              </div>

              {/* Wrong Network Notice */}
              {isWrongNetwork && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Unsupported Network Detected</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">
                    Liora Coin operates strictly on <strong>BNB Smart Chain</strong>. Please switch your wallet network to continue.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={switchToBscTestnet}
                      className="px-3 py-1.5 rounded-lg btn-metallic text-xs font-semibold text-white shadow-sm"
                    >
                      Switch to BSC Testnet (#97)
                    </button>
                    <button
                      onClick={switchToBscMainnet}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-prominent)] bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-xs text-white"
                    >
                      BSC Mainnet (#56)
                    </button>
                  </div>
                </div>
              )}

              {/* Disconnect Action */}
              <button
                onClick={() => {
                  disconnect();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-red-300 hover:text-red-200 text-xs font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect Wallet</span>
              </button>
            </div>
          ) : (
            /* Connection Options View */
            <div className="space-y-4">
              <p className="text-xs text-secondary leading-relaxed">
                Choose a wallet provider below. Liora Coin automatically detects installed extensions using <strong>EIP-6963</strong> for clash-free connection.
              </p>

              {/* Discovered EIP-6963 Wallets List */}
              {discoveredProviders.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-1">
                    Detected Browser Extensions ({discoveredProviders.length})
                  </div>
                  {discoveredProviders.map((detail) => (
                    <button
                      key={detail.info.uuid || detail.info.rdns}
                      onClick={() => handleConnectProvider(detail)}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-prominent)] bg-[var(--bg-elevated)] hover:border-[var(--brand-accent)] hover:bg-[var(--bg-glass-hover)] transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          {detail.info.icon ? (
                            <img
                              src={detail.info.icon}
                              alt={detail.info.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Globe className="w-4 h-4 text-secondary" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-white group-hover:text-[var(--brand-accent)] transition-colors">
                            {detail.info.name}
                          </div>
                          <div className="text-[11px] text-muted font-mono">{detail.info.rdns}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted group-hover:text-white transition-colors" />
                    </button>
                  ))}
                </div>
              )}

              {/* Default Injected Wallet Fallback */}
              <div className="space-y-2">
                {discoveredProviders.length > 0 && (
                  <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-1">
                    Standard Injected Provider
                  </div>
                )}
                <button
                  onClick={() => handleConnectProvider()}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-prominent)] bg-[var(--bg-elevated)] hover:border-[var(--brand-accent)] hover:bg-[var(--bg-glass-hover)] transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-sm font-bold text-amber-400">
                      ⚡
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white group-hover:text-[var(--brand-accent)] transition-colors">
                        Default Injected Wallet
                      </div>
                      <div className="text-xs text-secondary">
                        MetaMask, Rabby, Trust Wallet, Brave, Coinbase
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--brand-accent)] font-medium">
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </span>
                </button>
              </div>

              {/* Mobile & WalletConnect Collapsible Guide */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] overflow-hidden">
                <button
                  onClick={() => setShowMobileGuide(!showMobileGuide)}
                  className="w-full flex items-center justify-between p-3 text-xs font-medium text-secondary hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[var(--brand-accent)]" />
                    <span>Mobile Wallets & WalletConnect Guide</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showMobileGuide ? 'rotate-90' : ''}`} />
                </button>

                {showMobileGuide && (
                  <div className="p-3 pt-0 text-[11px] text-secondary space-y-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
                    <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                        <span>Recommended Mobile Flow</span>
                      </div>
                      <p className="leading-relaxed">
                        Open this website directly in the in-app Web3 browser of your mobile wallet app (such as <strong>Trust Wallet</strong>, <strong>MetaMask Mobile</strong>, or <strong>Binance Web3 Wallet</strong>). It will connect natively via the Injected option with zero setup.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-secondary" />
                        <span>WalletConnect v2 Relay Status</span>
                      </div>
                      <p className="leading-relaxed">
                        {walletConnectProjectId ? (
                          <span className="text-emerald-400">
                            ✓ WalletConnect Project ID is configured in the environment.
                          </span>
                        ) : (
                          <span className="text-muted">
                            External WalletConnect v2 QR pairing requires <code className="text-white">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code>. For seamless mobile interaction today, use your wallet app&apos;s built-in Web3 browser.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security and Network Disclaimers */}
          <div className="pt-3 border-t border-[var(--border-subtle)] text-[11px] text-muted space-y-1.5">
            <div className="flex items-start gap-1.5">
              <span className="shrink-0">🔒</span>
              <span>
                <strong>Non-Custodial Security:</strong> Liora Coin never requests your seed phrases or private keys.
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="shrink-0">🌐</span>
              <span>
                <strong>Single-Chain Policy:</strong> Liora Coin transactions are supported exclusively on <strong>BNB Smart Chain</strong> (BEP-20). Connecting your wallet does not enable transactions on Ethereum, TRON, or other networks.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
