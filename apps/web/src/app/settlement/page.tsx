'use client';

import React, { useState } from 'react';
import { InvestorSettlementPortal } from '../../components/settlement/InvestorSettlementPortal';
import { AdminSettlementConsole } from '../../components/settlement/AdminSettlementConsole';
import { useWeb3Wallet } from '../../hooks/useWeb3Wallet';
import { AUTHORIZED_TREASURY_WALLET } from '../../lib/treasury/treasuryAccountingEngine';
import { ShieldCheck, User, Settings2 } from 'lucide-react';

export default function SettlementPage() {
  const { address } = useWeb3Wallet();
  const [activeTab, setActiveTab] = useState<'INVESTOR' | 'ADMIN'>('INVESTOR');

  const isTreasuryOwner = address
    ? address.toLowerCase() === AUTHORIZED_TREASURY_WALLET.toLowerCase()
    : false;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('INVESTOR')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'INVESTOR'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-[var(--bg-elevated)] text-secondary hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Investor Settlement View</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ADMIN')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ADMIN'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-[var(--bg-elevated)] text-secondary hover:text-white'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Admin Settlement Console</span>
            {isTreasuryOwner && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Treasury Wallet Connected" />
            )}
          </button>
        </div>
      </div>

      {/* Render Active View */}
      {activeTab === 'INVESTOR' ? (
        <InvestorSettlementPortal />
      ) : (
        <AdminSettlementConsole />
      )}
    </div>
  );
}
