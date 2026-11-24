'use client';

import React, { useState } from 'react';
import { useDemoStore } from '../../lib/demo/useDemoStore';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import { 
  User, 
  Wallet, 
  ShieldCheck, 
  Key, 
  Lock, 
  Check, 
  Copy, 
  RefreshCcw, 
  AlertTriangle,
  ExternalLink,
  Zap,
  LogOut
} from 'lucide-react';

export default function ProfilePage() {
  const { activeUser, linkWallet, resetToDefaults, logout } = useDemoStore();
  const { isAuthorized, isInitialized } = useRequireAuth();
  const { isConnected, address, chainName, connect, disconnect } = useWeb3Wallet();

  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSigningProof, setIsSigningProof] = useState(false);
  const [signatureProofSuccess, setSignatureProofSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  if (!isInitialized || !activeUser) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--brand-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-secondary">Authenticating user profile...</p>
      </div>
    );
  }

  const displayAddress = activeUser?.walletAddress || address;

  const copyWallet = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const copyRef = () => {
    if (activeUser?.referralCode) {
      navigator.clipboard.writeText(activeUser.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSimulateSignatureProof = () => {
    setIsSigningProof(true);
    setTimeout(() => {
      if (address) linkWallet(address, true);
      setIsSigningProof(false);
      setSignatureProofSuccess(true);
      setTimeout(() => setSignatureProofSuccess(false), 4000);
    }, 900);
  };

  const handleReset = () => {
    if (window.confirm('Reset all demo exchange balances, commissions, and simulated users back to default state?')) {
      resetToDefaults();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#111A2E] via-[#0E1626] to-[#0A101D] border border-[var(--border-prominent)] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-[var(--brand-accent)] font-bold mb-2">
            <User className="w-3.5 h-3.5" />
            <span>USER PROFILE &amp; WALLET MANAGEMENT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            @{activeUser.username}
          </h1>
          <p className="text-xs sm:text-sm text-secondary">
            {activeUser.displayName} • {activeUser.email}
          </p>
        </div>

        <button
          onClick={() => logout()}
          className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-bold text-xs flex items-center gap-2 self-start sm:self-auto transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {resetSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Demo store successfully reset to original seed state!</span>
        </div>
      )}

      {/* Profile Information Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-[var(--brand-accent)]" />
          <span>Account Profile</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-secondary">Registered Email:</span>
            <div className="font-semibold text-white text-sm">{activeUser?.email || 'trader@oxeniq.com'}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-secondary">Mobile Number:</span>
            <div className="font-semibold text-white text-sm">{activeUser?.phone || '+1 (555) 789-0123'}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-secondary">Referral Code:</span>
            <div className="flex items-center gap-2 font-mono font-bold text-white text-sm">
              <span>{activeUser?.referralCode || 'OX-789421'}</span>
              <button onClick={copyRef} className="p-1 hover:text-[var(--brand-accent)]">
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-secondary">KYC Verification Tier:</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Tier 1 Verified (Demo)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Non-Custodial External Wallet Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-accent)]/30 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Non-Custodial External Wallet</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
            Zero Custody Architecture
          </span>
        </div>

        <p className="text-xs text-secondary leading-relaxed">
          Liora Coin Exchange never stores or generates private keys. Your trading operations are authorized through signed messages from your external Web3 wallet.
        </p>

        {displayAddress ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <div>
                <span className="text-secondary text-[11px]">Connected Public Address (BSC)</span>
                <div className="font-mono text-sm text-white break-all">{displayAddress}</div>
              </div>
              <button
                onClick={copyWallet}
                className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-secondary hover:text-white"
                title="Copy Address"
              >
                {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary font-medium">Cryptographic Ownership Verification</span>
                {activeUser?.isWalletVerified ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1 text-xs">
                    <Check className="w-3.5 h-3.5" />
                    Signature Verified (EIP-191)
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold text-xs">Unverified</span>
                )}
              </div>

              <p className="text-[11px] text-blue-200">
                To link your account securely without exposing secrets, your wallet signs a non-transaction challenge proving you control this address.
              </p>

              {signatureProofSuccess && (
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Wallet ownership verified! Challenge signature validated.</span>
                </div>
              )}

              <button
                onClick={handleSimulateSignatureProof}
                disabled={isSigningProof}
                className="py-2 px-3 rounded-lg btn-metallic text-white text-xs font-bold flex items-center gap-2"
              >
                <Key className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {isSigningProof ? 'Simulating Cryptographic Sign...' : 'Re-Verify Wallet Signature'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-center space-y-3">
            <p className="text-xs text-secondary">No external Web3 wallet currently connected.</p>
            <button
              onClick={() => connect()}
              className="py-2.5 px-4 rounded-xl btn-metallic text-white font-bold text-xs"
            >
              Connect External Wallet
            </button>
          </div>
        )}
      </div>

      {/* Localhost Demo Maintenance Card */}
      <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-amber-400" />
            <span>Reset Localhost Demo Environment</span>
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Restores all token balances, simulated users, and commission records back to original seed defaults.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-bold shrink-0 transition-colors"
        >
          Reset Demo Data
        </button>
      </div>
    </div>
  );
}

