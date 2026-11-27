'use client';

import React, { useState } from 'react';
import { useDemoStore } from '../../lib/demo/useDemoStore';
import { PREVIEW_CONFIG } from '../../config/previewConfig';
import { PrelaunchAdminTab } from '../../components/prelaunch/PrelaunchAdminTab';
import { AdminSettlementConsole } from '../../components/settlement/AdminSettlementConsole';
import { 
  ShieldAlert, 
  Settings, 
  Users, 
  Coins, 
  TrendingUp, 
  Lock, 
  Unlock, 
  Sparkles, 
  Check, 
  AlertTriangle,
  RefreshCcw,
  Sliders
} from 'lucide-react';

export default function AdminPage() {
  const { 
    platformStats, 
    adminConfig, 
    updateAdminConfig, 
    allTransactions, 
    allCommissions, 
    resetToDefaults 
  } = useDemoStore();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminUser, setAdminUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Configuration edit state
  const [l1, setL1] = useState(adminConfig.level1Percent);
  const [l2, setL2] = useState(adminConfig.level2Percent);
  const [l3, setL3] = useState(adminConfig.level3Percent);
  const [minSwap, setMinSwap] = useState(adminConfig.minSwapForCommissionUsd);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Admin Tab State: Pre-Launch Pricing, Trading Bot, Exchange, or Settlements
  const [adminTab, setAdminTab] = useState<'PRELAUNCH' | 'TRADING_BOT' | 'EXCHANGE' | 'SETTLEMENTS'>('PRELAUNCH');
  const [botSubscribers, setBotSubscribers] = useState<any[]>([]);
  const [botTrials, setBotTrials] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [targetRevokeUserId, setTargetRevokeUserId] = useState('');
  const [revokeReason, setRevokeReason] = useState('Terms of service violation');
  const [revokeMessage, setRevokeMessage] = useState<string | null>(null);

  // Check active server-side administrator session on initial load
  React.useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user?.role === 'ADMIN') {
            setIsUnlocked(true);
            setAdminUser(data.user);
          }
        }
      } catch {}
    };
    verifySession();
  }, []);

  const fetchBotAdminData = async () => {
    try {
      const res = await fetch('/api/admin/bot/subscribers');
      if (res.ok) {
        const data = await res.json();
        setBotSubscribers(data.subscriptions || []);
        setBotTrials(data.trials || []);
      }
      const logsRes = await fetch('/api/admin/bot/audit-logs?limit=30');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.logs || []);
      }
    } catch {}
  };

  React.useEffect(() => {
    if (isUnlocked) {
      fetchBotAdminData();
    }
  }, [isUnlocked]);

  const handleRevokeUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRevokeUserId) return;
    try {
      const res = await fetch('/api/admin/bot/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetRevokeUserId,
          reason: revokeReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevokeMessage(`Successfully revoked trading bot access for ${targetRevokeUserId}`);
        fetchBotAdminData();
      } else {
        setRevokeMessage(`Error: ${data.message || data.error}`);
      }
    } catch (err: any) {
      setRevokeMessage(`Error: ${err.message}`);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsUnlocked(true);
        setAdminUser(data.user);
        setErrorMsg(null);
        setPassword('');
      } else {
        setErrorMsg(data.message || 'Invalid administrator credentials. Access denied.');
      }
    } catch (err: any) {
      setErrorMsg(`Authentication error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setIsUnlocked(false);
    setAdminUser(null);
  };

  const handleSaveConfig = () => {
    updateAdminConfig({
      level1Percent: l1,
      level2Percent: l2,
      level3Percent: l3,
      minSwapForCommissionUsd: minSwap,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto py-16 space-y-6">
        <div className="p-8 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-prominent)] shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white">Administrator Portal</h1>
            <p className="text-xs text-secondary mt-1">
              Server-authenticated administrative access. Passcode bypasses have been removed.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Username
              </label>
              <input
                type="text"
                placeholder="Enter administrator username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-white placeholder-secondary focus:outline-none focus:border-[var(--brand-accent)]"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Password
              </label>
              <input
                type="password"
                placeholder="Enter administrator password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-white placeholder-secondary focus:outline-none focus:border-[var(--brand-accent)]"
                required
              />
              {errorMsg && <p className="text-xs text-rose-400 mt-2">{errorMsg}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl btn-metallic text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>{isSubmitting ? 'Verifying Credentials...' : 'Authenticate Admin Session'}</span>
            </button>
          </form>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)] text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Role-Based Server Authorization</span>
            </div>
            <p className="text-[10px] text-secondary">
              All administrative reads and mutations are secured via HttpOnly session tokens and cryptographic role verification. Client-side bypasses (admin123) are permanently revoked.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      {/* Admin Demo Watermark Banner */}
      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>AUTHENTICATED ADMIN SESSION:</strong> Signed in as <span className="font-mono font-bold text-white">{adminUser?.username || 'admin'}</span> (Role: {adminUser?.role || 'ADMIN'}).
          </span>
        </div>
        <button
          onClick={handleAdminLogout}
          className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold cursor-pointer transition-colors"
        >
          Sign Out &amp; Terminate Session
        </button>
      </div>

      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#172033] via-[#0E1626] to-[#0A101D] border border-[var(--border-prominent)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
            Protocol Administration &amp; Analytics
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Global oversight of exchange trading volume, referral liabilities, and dynamic commission rule configuration.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Reset all demo state to pristine factory defaults?')) {
              resetToDefaults();
            }
          }}
          className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-2 shrink-0 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Reset All Demo Data</span>
        </button>
      </div>

      {/* Admin Module Tabs */}
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-2 overflow-x-auto">
        <button
          onClick={() => setAdminTab('PRELAUNCH')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            adminTab === 'PRELAUNCH'
              ? 'bg-amber-400 text-black shadow-md'
              : 'text-secondary hover:text-white bg-[var(--bg-elevated)]'
          }`}
        >
          🚀 Pre-Launch Pricing &amp; Token Locking
        </button>
        <button
          onClick={() => setAdminTab('TRADING_BOT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            adminTab === 'TRADING_BOT'
              ? 'bg-amber-400 text-black shadow-md'
              : 'text-secondary hover:text-white bg-[var(--bg-elevated)]'
          }`}
        >
          🤖 Trading Bot &amp; Subscriptions Backend (Phase 20)
        </button>
        <button
          onClick={() => setAdminTab('EXCHANGE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            adminTab === 'EXCHANGE'
              ? 'bg-amber-400 text-black shadow-md'
              : 'text-secondary hover:text-white bg-[var(--bg-elevated)]'
          }`}
        >
          🔄 Exchange &amp; Multi-Tier Referral MLM
        </button>
        <button
          onClick={() => setAdminTab('SETTLEMENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            adminTab === 'SETTLEMENTS'
              ? 'bg-amber-400 text-black shadow-md'
              : 'text-secondary hover:text-white bg-[var(--bg-elevated)]'
          }`}
        >
          💼 Manual Settlement &amp; Collateral (Sprint 2)
        </button>
      </div>

      {adminTab === 'PRELAUNCH' && (
        <PrelaunchAdminTab />
      )}

      {adminTab === 'SETTLEMENTS' && (
        <AdminSettlementConsole />
      )}

      {adminTab === 'TRADING_BOT' && (
        <div className="space-y-8">
          {/* Bot KPI Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-xs text-secondary font-medium">Authoritative Subscriptions</span>
              <div className="text-2xl font-extrabold text-white">{botSubscribers.length}</div>
              <span className="text-[11px] text-emerald-400">Database-backed records</span>
            </div>
            <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-xs text-secondary font-medium">48h Free Trials Redeemed</span>
              <div className="text-2xl font-extrabold text-amber-300">{botTrials.length}</div>
              <span className="text-[11px] text-secondary">Anti-abuse unique check</span>
            </div>
            <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-xs text-secondary font-medium">Active Strategy Feed</span>
              <div className="text-2xl font-extrabold text-blue-300">ALGOX V6_1_24</div>
              <span className="text-[11px] text-blue-200">Pine Script v5 (TradingView)</span>
            </div>
            <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-xs text-secondary font-medium">Audit Events Logged</span>
              <div className="text-2xl font-extrabold text-purple-300">{auditLogs.length}</div>
              <span className="text-[11px] text-secondary">Immutable server trail</span>
            </div>
          </div>

          {/* Manual Access Revocation & Plan Overrides */}
          <div className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-white">Manual Access Revocation</h3>
                <p className="text-xs text-secondary">Instantly terminate active trading bot session and revoke server entitlements.</p>
              </div>
            </div>

            <form onSubmit={handleRevokeUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-secondary">Target User ID</label>
                <input
                  type="text"
                  placeholder="e.g. usr_alex_001"
                  value={targetRevokeUserId}
                  onChange={(e) => setTargetRevokeUserId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Revocation Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Chargeback / Abuse"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Execute Revocation</span>
                </button>
              </div>
            </form>
            {revokeMessage && (
              <p className="text-xs font-semibold text-amber-300 mt-2">{revokeMessage}</p>
            )}
          </div>

          {/* Database Subscribers Table */}
          <div className="rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="text-base font-bold text-white">Database Subscriptions &amp; Trial Records</h3>
              <button
                onClick={fetchBotAdminData}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Refresh Live DB</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-primary)]/60 text-secondary uppercase font-semibold border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="py-2.5 px-4">User ID</th>
                    <th className="py-2.5 px-4">Plan / Tier</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Activated At</th>
                    <th className="py-2.5 px-4">Expires At</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]/30 font-mono">
                  {botSubscribers.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-[var(--bg-primary)]/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{sub.userId}</td>
                      <td className="py-3 px-4 text-amber-300">{sub.planId}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'ACTIVE_PAID' || sub.status === 'TRIAL_ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-secondary">{new Date(sub.startsAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-white font-semibold">{new Date(sub.expiresAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setTargetRevokeUserId(sub.userId);
                            setRevokeReason('Manual admin override');
                          }}
                          className="text-[11px] text-rose-400 hover:underline"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                  {botSubscribers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-secondary">
                        No active subscriptions in server database yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-white pb-2 border-b border-[var(--border-subtle)]">
              Structured Audit Trail (Last 30 Events)
            </h3>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--bg-primary)]/60 text-secondary uppercase font-semibold border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Actor</th>
                    <th className="py-2 px-3">Entity</th>
                    <th className="py-2 px-3">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]/30 text-[11px]">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-[var(--bg-primary)]/40">
                      <td className="py-2 px-3 text-secondary">{new Date(log.createdAt).toLocaleTimeString()}</td>
                      <td className="py-2 px-3 text-amber-300 font-bold">{log.action}</td>
                      <td className="py-2 px-3 text-white">{log.actorId || 'SYSTEM'}</td>
                      <td className="py-2 px-3 text-blue-300">{log.entity}</td>
                      <td className="py-2 px-3 text-secondary truncate max-w-xs">{JSON.stringify(log.metadata || {})}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-secondary">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {adminTab === 'EXCHANGE' && (
        <div className="space-y-8">
      {/* Protocol KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-xs text-secondary font-medium">Total Registered Users</span>
          <div className="text-2xl font-extrabold text-white">{platformStats.totalDemoUsers}</div>
          <span className="text-[11px] text-emerald-400">{platformStats.connectedWalletsCount} wallets connected</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-xs text-secondary font-medium">Total Swaps Executed</span>
          <div className="text-2xl font-extrabold text-white">{platformStats.totalSwapsCount}</div>
          <span className="text-[11px] text-blue-300">${platformStats.totalVolumeUsd.toLocaleString()} USD volume</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-xs text-secondary font-medium">Commissions Paid (LIORA)</span>
          <div className="text-2xl font-extrabold text-[var(--brand-accent)]">
            {platformStats.totalOxeniqCommissionsPaid.toLocaleString()}
          </div>
          <span className="text-[11px] text-secondary">+ ${platformStats.totalUsdtCommissionsPaid.toLocaleString()} USDT</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-amber-500/30 space-y-1.5">
          <span className="text-xs text-secondary font-medium">Pending Commission Liabilities</span>
          <div className="text-2xl font-extrabold text-amber-300">
            ${platformStats.pendingCommissionsLiabilityUsd.toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-400">Approved, claimable by users</span>
        </div>
      </div>

      {/* Commission Rule Configuration */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[var(--brand-accent)]" />
            <div>
              <h2 className="text-base font-bold text-white">Referral Commission Configuration</h2>
              <p className="text-xs text-secondary">
                Dynamically adjust tier percentages. Updates apply immediately to all subsequent demo swaps.
              </p>
            </div>
          </div>

          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Rules Updated!</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Level 1 Rate */}
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
            <label className="text-xs font-semibold text-blue-300">Level 1 Commission Rate (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={l1}
              onChange={(e) => setL1(parseFloat(e.target.value) || 0)}
              className="w-full text-xl font-bold bg-transparent text-white focus:outline-none"
            />
            <span className="text-[11px] text-secondary">Direct Upline Share</span>
          </div>

          {/* Level 2 Rate */}
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
            <label className="text-xs font-semibold text-purple-300">Level 2 Commission Rate (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={l2}
              onChange={(e) => setL2(parseFloat(e.target.value) || 0)}
              className="w-full text-xl font-bold bg-transparent text-white focus:outline-none"
            />
            <span className="text-[11px] text-secondary">Second-Degree Upline Share</span>
          </div>

          {/* Level 3 Rate */}
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
            <label className="text-xs font-semibold text-emerald-300">Level 3 Commission Rate (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={l3}
              onChange={(e) => setL3(parseFloat(e.target.value) || 0)}
              className="w-full text-xl font-bold bg-transparent text-white focus:outline-none"
            />
            <span className="text-[11px] text-secondary">Third-Degree Upline Share</span>
          </div>

          {/* Min Swap Threshold */}
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
            <label className="text-xs font-semibold text-amber-300">Min Swap for Commission ($)</label>
            <input
              type="number"
              step="1"
              min="1"
              value={minSwap}
              onChange={(e) => setMinSwap(parseFloat(e.target.value) || 0)}
              className="w-full text-xl font-bold bg-transparent text-white focus:outline-none"
            />
            <span className="text-[11px] text-secondary">Volume Floor</span>
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          className="px-6 py-3 rounded-xl btn-metallic text-white font-bold text-xs shadow-md flex items-center gap-2 hover:opacity-95"
        >
          <Check className="w-4 h-4" />
          <span>Save Commission Configuration</span>
        </button>
      </div>

      {/* Global Activity Ledger */}
      <div className="rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-bold text-white">Global Protocol Ledger</h3>
            <p className="text-xs text-secondary">Recent swaps and resulting multi-tier commission dispatches</p>
          </div>
          <span className="text-xs text-secondary">
            Total Records: <strong>{allTransactions.length} swaps, {allCommissions.length} commissions</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-primary)]/60 text-secondary uppercase font-semibold border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-2.5 px-4">Tx ID</th>
                <th className="py-2.5 px-4">Swap Route</th>
                <th className="py-2.5 px-4">Input Volume</th>
                <th className="py-2.5 px-4">Output Delivered</th>
                <th className="py-2.5 px-4">Simulated BSC Hash</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/30">
              {allTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[var(--bg-primary)]/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-secondary">{tx.id}</td>
                  <td className="py-3 px-4 font-bold text-white">
                    {tx.fromToken} → {tx.toToken}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {tx.fromAmount} {tx.fromToken}
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">
                    {tx.toAmount} {tx.toToken}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-blue-300">
                    {`${tx.txHash.slice(0, 8)}...${tx.txHash.slice(-6)}`}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
                      CONFIRMED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

