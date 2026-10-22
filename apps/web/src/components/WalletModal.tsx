'use client';
import React from 'react';
import { useWeb3Wallet } from '../hooks/useWeb3Wallet';
import { X, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { connect, isConnecting, error } = useWeb3Wallet();

  if (!isOpen) return null;

  const handleConnect = async () => {
    await connect();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md p-6 glass-panel-elevated border border-[var(--border-accent)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--brand-accent)]" />
            <h3 id="modal-title" className="text-lg font-bold text-white">Connect Web3 Wallet</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:text-white hover:bg-[var(--border-subtle)] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <p className="text-xs text-secondary leading-relaxed">
            Connect an EVM-compatible wallet to interact with OXENIQ smart contracts on BNB Smart Chain.
          </p>

          {error && (
            <div className="p-3 text-xs rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-prominent)] bg-[var(--bg-elevated)] hover:border-[var(--brand-accent)] hover:bg-[var(--bg-glass-hover)] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-sm font-bold text-orange-400">
                  🦊
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white group-hover:text-[var(--brand-accent)]">Browser Wallet</div>
                  <div className="text-xs text-secondary">MetaMask, Rabby, Trust, Coinbase</div>
                </div>
              </div>
              <span className="text-xs text-[var(--brand-accent)] font-medium">
                {isConnecting ? 'Connecting...' : 'Connect'}
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] text-[11px] text-muted space-y-1">
            <p>🔒 <strong>Security Guarantee:</strong> OXENIQ never asks for seed phrases or private keys.</p>
            <p>🌐 Default Chain: <strong>BNB Smart Chain (BSC Testnet #97)</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};
