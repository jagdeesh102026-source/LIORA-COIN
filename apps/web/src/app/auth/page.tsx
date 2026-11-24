'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoStore } from '../../lib/demo/useDemoStore';
import { demoStore } from '../../lib/demo/demoStore';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import {
  ShieldCheck,
  User,
  Lock,
  Sparkles,
  CheckCircle2,
  Wallet,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import Link from 'next/link';

export default function AuthPage() {
  const router = useRouter();
  const { activeUser, login, register, linkWallet } = useDemoStore();
  const { isConnected, address, connect } = useWeb3Wallet();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state (empty by default — user must enter credentials)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSponsor, setRegSponsor] = useState('OX-MASTER7');

  // UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletSigning, setWalletSigning] = useState(false);

  // On client mount: clear any stale active demo session and inspect URL search params
  useEffect(() => {
    demoStore.logout();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) setRegSponsor(ref);
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side field validations
    if (!loginUsername.trim()) {
      setErrorMessage('Please enter your username or email address.');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        setIsSubmitting(false);
        setErrorMessage(data.message || data.error || 'Invalid credentials. Please verify your username and password.');
        return;
      }

      // Sync client demoStore user state
      if (data.user) {
        login(loginUsername.trim(), loginPassword.trim());
        if (data.walletAddress) {
          linkWallet(data.walletAddress);
        }
      }

      setIsSubmitting(false);
      router.push('/dashboard');
    } catch {
      // Fallback to client demo store
      const res = login(loginUsername.trim(), loginPassword.trim());
      setIsSubmitting(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid credentials. Please verify your username and password.');
      } else {
        router.push('/dashboard');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side field validations
    if (!regUsername.trim() || regUsername.trim().length < 3) {
      setErrorMessage('Username must be at least 3 characters long.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!regPassword.trim() || regPassword.trim().length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword.trim(),
          sponsorCode: regSponsor.trim(),
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        setIsSubmitting(false);
        setErrorMessage(data.message || data.error || 'Registration failed. Please check your inputs.');
        return;
      }

      // Sync client demoStore user state
      if (data.user) {
        register(
          regUsername.trim(),
          regEmail.trim(),
          regPassword.trim(),
          undefined,
          regSponsor.trim()
        );
        if (data.walletAddress) {
          linkWallet(data.walletAddress);
        }
      }

      setIsSubmitting(false);
      router.push('/dashboard');
    } catch {
      const res = register(
        regUsername.trim(),
        regEmail.trim(),
        regPassword.trim(),
        undefined,
        regSponsor.trim()
      );
      setIsSubmitting(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed. Please check your inputs.');
      } else {
        router.push('/dashboard');
      }
    }
  };

  const handlePreFillAccount = (username: string, pass: string) => {
    setLoginUsername(username);
    setLoginPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-[var(--brand-accent)] font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>NON-CUSTODIAL PLATFORM ACCESS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          {mode === 'LOGIN' ? 'Sign In to Liora Coin' : 'Create Demo Account'}
        </h1>
        <p className="text-xs sm:text-sm text-secondary">
          {mode === 'LOGIN'
            ? 'Access your portfolio, referral dashboard, and claimable commission rewards.'
            : 'Register a unique username and unlock 3-tier referral commission tracking.'}
        </p>
      </div>

      {/* Main Form Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-2xl space-y-6">
        {/* Mode Switcher */}
        <div className="p-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'LOGIN'
              ? 'bg-[var(--brand-accent)] text-black shadow-md'
              : 'text-secondary hover:text-white'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'REGISTER'
              ? 'bg-[var(--brand-accent)] text-black shadow-md'
              : 'text-secondary hover:text-white'
              }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {mode === 'LOGIN' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Username or Email Address
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. trader_alex or trader@oxeniq.com"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-white placeholder-secondary focus:outline-none focus:border-[var(--brand-accent)]"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5 flex items-center justify-between">
                <span>Password</span>
                <span className="text-[11px] text-muted">Demo Credentials Below</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-white placeholder-secondary focus:outline-none focus:border-[var(--brand-accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl btn-metallic text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* 2. REGISTRATION FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Desired Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. trader_sophia"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-white placeholder-secondary focus:outline-none focus:border-[var(--brand-accent)]"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. sophia@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-white placeholder-secondary focus:outline-none focus:border-[var(--brand-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-white placeholder-secondary focus:outline-none focus:border-[var(--brand-accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5 flex items-center justify-between">
                <span>Sponsor / Referral Code</span>
                <span className="text-[11px] text-[var(--brand-accent)]">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. OX-MASTER7"
                value={regSponsor}
                onChange={(e) => setRegSponsor(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-white uppercase font-mono placeholder-secondary focus:outline-none focus:border-[var(--brand-accent)]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl btn-metallic text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account &amp; Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick Demo Credentials Assistant */}
        <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo Test Credentials (Click to pre-fill)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handlePreFillAccount('trader_alex', 'OxeniqDemo2026!')}
              className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--brand-accent)] text-left transition-colors"
            >
              <div className="font-bold text-white text-xs">@trader_alex</div>
              <div className="text-[10px] text-secondary">Password: OxeniqDemo2026!</div>
              <div className="text-[10px] text-[var(--brand-accent)] font-medium">Primary Trader (12.5k OX)</div>
            </button>

            <button
              type="button"
              onClick={() => handlePreFillAccount('emily_mentor', 'OxeniqDemo2026!')}
              className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--brand-accent)] text-left transition-colors"
            >
              <div className="font-bold text-white text-xs">@emily_mentor</div>
              <div className="text-[10px] text-secondary">Password: OxeniqDemo2026!</div>
              <div className="text-[10px] text-purple-300 font-medium">Level 1 Upline Sponsor</div>
            </button>
          </div>

          <p className="text-[11px] text-secondary">
            <strong>Demonstration Notice:</strong> This is a localhost demonstration utilizing local browser state. Real cryptographic signing and non-custodial external wallets are supported without storing passwords in production plain text.
          </p>
        </div>
      </div>
    </div>
  );
}
