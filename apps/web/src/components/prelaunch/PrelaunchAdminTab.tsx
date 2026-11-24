'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../Card';
import { 
  Settings, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Lock, 
  Save, 
  History,
  Info
} from 'lucide-react';
import { PrelaunchConfig, PrelaunchAuditLog, InvestmentLockTier } from '@/lib/prelaunch/prelaunchTypes';

export function PrelaunchAdminTab() {
  const [config, setConfig] = useState<PrelaunchConfig | null>(null);
  const [history, setHistory] = useState<PrelaunchConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<PrelaunchAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form edit states
  const [startPriceINR, setStartPriceINR] = useState('0.20');
  const [targetPriceUSD, setTargetPriceUSD] = useState('0.30');
  const [durationDays, setDurationDays] = useState(30);
  const [lockedInrPerUsd, setLockedInrPerUsd] = useState('86.50');
  const [fxRateSource, setFxRateSource] = useState('Reserve Bank of India (RBI) Reference Rate');
  const [updateMode, setUpdateMode] = useState<'CONTINUOUS' | 'DAILY_STEP'>('CONTINUOUS');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'>('DRAFT');
  const [enabled, setEnabled] = useState(false);

  // Status feedback
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAdminConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/prelaunch/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setConfig(data.config);
          setHistory(data.history || []);
          setAuditLogs(data.auditLogs || []);

          // Sync form state
          setStartPriceINR(data.config.startPriceINR);
          setTargetPriceUSD(data.config.targetPriceUSD);
          setDurationDays(data.config.durationDays);
          setLockedInrPerUsd(data.config.lockedInrPerUsd || '86.50');
          setFxRateSource(data.config.fxRateSource);
          setUpdateMode(data.config.updateMode);
          setStatus(data.config.status);
          setEnabled(data.config.enabled);
        }
      }
    } catch (err: any) {
      console.error('Failed to load admin prelaunch config', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/prelaunch/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startPriceINR,
          targetPriceUSD,
          durationDays: Number(durationDays),
          lockedInrPerUsd,
          fxRateSource,
          updateMode,
          status,
          enabled,
          startTimeUTC: status === 'ACTIVE' && (!config?.startTimeUTC) ? new Date().toISOString() : config?.startTimeUTC
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Configuration saved successfully! Version incremented to v${data.config.version}.`
        });
        setConfig(data.config);
        fetchAdminConfig();
      } else {
        const errDetail = data.details ? data.details.join(', ') : data.error || data.message;
        setFeedback({
          type: 'error',
          message: `Update rejected: ${errDetail}`
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Network error: ${err.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  // Quick preset targets
  const applyPresetTarget = (target: string) => {
    setTargetPriceUSD(target);
  };

  if (loading && !config) {
    return (
      <div className="p-8 text-center text-secondary flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
        <span>Loading pre-launch pricing engine configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-xs text-secondary font-medium">Offering Engine Status</span>
          <div className="text-xl font-extrabold text-white flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{status}</span>
          </div>
          <span className="text-[11px] text-zinc-400">Version: v{config?.version || 1}</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-xs text-secondary font-medium">Initial Price Baseline</span>
          <div className="text-xl font-extrabold text-white">₹{config?.startPriceINR} INR</div>
          <span className="text-[11px] text-emerald-400">≈ $0.002312 USD (at ₹86.50)</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-xs text-secondary font-medium">Target Price Cap</span>
          <div className="text-xl font-extrabold text-amber-300">${config?.targetPriceUSD} USD</div>
          <span className="text-[11px] text-secondary">30-Day Terminal Cap</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-xs text-secondary font-medium">Locked FX Rate</span>
          <div className="text-xl font-extrabold text-blue-300">₹{config?.lockedInrPerUsd} / $1</div>
          <span className="text-[11px] text-blue-200 truncate block">RBI Reference Rate</span>
        </div>
      </div>

      {/* 2. Configuration Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <Card elevated className="border border-[var(--border-prominent)] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Pricing Schedule Parameters</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full border border-amber-500/30 text-amber-400 text-xs font-semibold bg-amber-500/10">
                Admin Authorized
              </span>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Starting Price INR */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">
                    Starting Price (INR)
                  </label>
                  <input
                    type="text"
                    value={startPriceINR}
                    onChange={(e) => setStartPriceINR(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    placeholder="0.20"
                    required
                  />
                  <span className="text-[10px] text-zinc-500">Initial price equivalent to ₹0.20</span>
                </div>

                {/* Target Price USD */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-secondary">
                      Target Price (USD)
                    </label>
                    <div className="flex gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => applyPresetTarget('0.30')}
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-secondary"
                      >
                        $0.30
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetTarget('0.50')}
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-secondary"
                      >
                        $0.50
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetTarget('1.00')}
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-secondary"
                      >
                        $1.00
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={targetPriceUSD}
                    onChange={(e) => setTargetPriceUSD(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    placeholder="0.30"
                    required
                  />
                  <span className="text-[10px] text-zinc-500">Configurable cap ($0.30, $0.50, $1.00+)</span>
                </div>

                {/* Duration in Days */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">
                    Duration (Calendar Days)
                  </label>
                  <input
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 30)}
                    min="1"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-zinc-500">Standard 30-day linear schedule</span>
                </div>

                {/* Locked FX Rate */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">
                    Locked INR/USD Exchange Rate
                  </label>
                  <input
                    type="text"
                    value={lockedInrPerUsd}
                    onChange={(e) => setLockedInrPerUsd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                    placeholder="86.50"
                    required
                  />
                  <span className="text-[10px] text-zinc-500">Locked before activation (e.g. 86.50)</span>
                </div>
              </div>

              {/* FX Source */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary">
                  Documented FX Rate Source
                </label>
                <input
                  type="text"
                  value={fxRateSource}
                  onChange={(e) => setFxRateSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] text-white text-xs focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>

              {/* Update Mode & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">
                    Progression Update Mode
                  </label>
                  <select
                    value={updateMode}
                    onChange={(e: any) => setUpdateMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="CONTINUOUS">Continuous (Per-second progression)</option>
                    <option value="DAILY_STEP">Daily-Step (Once per 24 hours)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-secondary">
                    Offering Status
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="DRAFT">DRAFT (Inactive / In Preparation)</option>
                    <option value="ACTIVE">ACTIVE (Running on schedule)</option>
                    <option value="PAUSED">PAUSED (Temporarily Halted)</option>
                    <option value="COMPLETED">COMPLETED (Terminated at Cap)</option>
                  </select>
                </div>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Parameters...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save &amp; Increment Configuration Version</span>
                  </>
                )}
              </button>
            </form>
          </Card>
        </div>

        {/* Right Column: Investment Lock Tiers & Historical Versions */}
        <div className="lg:col-span-5 space-y-6">
          <Card elevated className="border border-[var(--border-prominent)] p-6 space-y-4">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Investment Locking Tiers</span>
            </h4>
            <div className="space-y-3 text-xs">
              {config?.investmentTiers.map((tier) => (
                <div key={tier.id} className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] space-y-1">
                  <div className="flex justify-between items-center font-bold text-white">
                    <span>{tier.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/30 text-amber-400 bg-amber-500/10">
                      {tier.lockMonths} Calendar Months
                    </span>
                  </div>
                  <div className="text-secondary text-[11px]">
                    Range: ${tier.minAmountUSD.toLocaleString()} {tier.maxAmountUSD ? `– $${tier.maxAmountUSD.toLocaleString()}` : '+ (Uncapped)'} USD
                  </div>
                  <div className="text-[10px] text-zinc-500">{tier.description}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card elevated className="border border-[var(--border-prominent)] p-6 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <History className="w-4 h-4 text-blue-400" />
              <span>Config Version History</span>
            </h4>
            <div className="space-y-2 text-xs max-h-48 overflow-y-auto">
              {history.map((ver) => (
                <div key={ver.version} className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] flex justify-between items-center text-[11px]">
                  <div>
                    <span className="font-bold text-white">v{ver.version}</span>
                    <span className="text-secondary ml-2">₹{ver.startPriceINR} → ${ver.targetPriceUSD}</span>
                  </div>
                  <span className="text-zinc-500">{new Date(ver.lastUpdatedUTC).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Structured Audit Trail Table */}
      <Card elevated className="border border-[var(--border-prominent)] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <h3 className="font-bold text-white flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Pre-Launch Configuration Audit Trail</span>
          </h3>
          <span className="text-xs text-secondary">{auditLogs.length} Events Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--border-subtle)] text-secondary">
              <tr>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Version Transition</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--bg-elevated)]/50 transition">
                  <td className="py-2.5 px-3 font-mono text-zinc-400">
                    {new Date(log.timestampUTC).toISOString().replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-amber-300">{log.action}</td>
                  <td className="py-2.5 px-3 font-mono text-secondary">{log.actorId}</td>
                  <td className="py-2.5 px-3">
                    {log.previousVersion ? `v${log.previousVersion} → v${log.newVersion}` : `v${log.newVersion || 1}`}
                  </td>
                  <td className="py-2.5 px-3 text-secondary text-[11px] font-mono truncate max-w-xs">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
