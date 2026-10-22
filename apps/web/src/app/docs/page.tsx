'use client';

import React, { useState } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { OPEN_DECISIONS } from '../../config/decisionsData';
import { FileText, Shield, Layers, HelpCircle, CheckCircle, Database } from 'lucide-react';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'decisions' | 'contracts' | 'liquidity' | 'security'>('decisions');

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Documentation & Governance</h1>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white">OXENIQ Technical Specs</h2>
        <p className="text-secondary text-sm sm:text-base leading-relaxed">
          Comprehensive architectural specifications, security threat models, and manager decision logs.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-4">
        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'decisions' ? 'btn-metallic text-white' : 'btn-secondary text-secondary'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Open Decisions Log ({OPEN_DECISIONS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'contracts' ? 'btn-metallic text-white' : 'btn-secondary text-secondary'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Smart Contracts</span>
        </button>

        <button
          onClick={() => setActiveTab('liquidity')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'liquidity' ? 'btn-metallic text-white' : 'btn-secondary text-secondary'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>$1,000 Liquidity Setup</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'security' ? 'btn-metallic text-white' : 'btn-secondary text-secondary'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security Model</span>
        </button>
      </div>

      {/* Tab 1: Open Decisions Log */}
      {activeTab === 'decisions' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-[var(--border-prominent)] bg-[var(--bg-elevated)] text-xs text-secondary leading-relaxed">
            <strong>Architectural Directive:</strong> In accordance with project instructions, safe placeholders and configurable interfaces 
            are implemented in code. No unconfirmed assumptions or guessed answers are hardcoded into production contracts.
          </div>

          <div className="space-y-4">
            {OPEN_DECISIONS.map((item) => (
              <Card key={item.id} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--brand-accent)]">{item.id}</span>
                    <h3 className="text-base font-bold text-white">{item.topic}</h3>
                  </div>
                  <Badge status={item.status} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted uppercase font-semibold">Question for Management:</span>
                    <p className="text-white italic">{item.question}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted uppercase font-semibold">Safe Implementation:</span>
                    <p className="text-secondary">{item.provisionalHandling}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Smart Contracts */}
      {activeTab === 'contracts' && (
        <div className="space-y-6 text-sm">
          <Card className="space-y-4">
            <h3 className="text-lg font-bold text-white">OxeniqToken.sol (BEP-20 / ERC-20)</h3>
            <p className="text-secondary text-xs leading-relaxed">
              Standard 18-decimal token on BNB Smart Chain. Inherits from OpenZeppelin v5: 
              <code>ERC20</code>, <code>ERC20Burnable</code>, <code>Ownable2Step</code>, and <code>Pausable</code>.
            </p>
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] font-mono text-xs text-secondary space-y-1">
              <div>• Initial Supply: Configurable in constructor</div>
              <div>• Initial Owner: Checked != address(0)</div>
              <div>• Fee-on-Transfer: None (100% AMM compatible)</div>
              <div>• Emergency Pause: Circuit breaker restricted to 2-step owner</div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-lg font-bold text-white">AllocationManager.sol (70:30 Controller)</h3>
            <p className="text-secondary text-xs leading-relaxed">
              Decoupled contract enforcing integer-safe allocation splits on token purchases without interfering with standard transfers.
            </p>
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] font-mono text-xs text-secondary space-y-1">
              <div>• Math: share70 = (amount * 70) / 100</div>
              <div>• Remainder: share30 = amount - share70 (Zero dust lost)</div>
              <div>• Protection: ReentrancyGuard, Ownable2Step</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Liquidity Setup Checklist */}
      {activeTab === 'liquidity' && (
        <Card className="space-y-6 text-sm">
          <h3 className="text-lg font-bold text-white">Initial $1,000 Liquidity Pool Deployment Checklist</h3>
          <p className="text-xs text-secondary leading-relaxed">
            This operational checklist must be executed before creating secondary market pools on PancakeSwap.
          </p>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
              <span className="text-emerald-400 font-bold">1</span>
              <div>
                <strong>Confirm Trading Pair:</strong> Confirm whether OXENIQ will pair against USDT (BSC: <code>0x55d398326f99059fF775485246999027B3197955</code>) or WBNB.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
              <span className="text-emerald-400 font-bold">2</span>
              <div>
                <strong>Budget Breakdown ($1,000):</strong> Confirm if $1,000 is 1,000 USDT + X tokens, or $500 USDT + $500 token equivalent.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
              <span className="text-emerald-400 font-bold">3</span>
              <div>
                <strong>LP Token Custody & Lock:</strong> Transfer LP tokens to a certified locker (PinkSale / Team Finance) with a minimum 6-month lock.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
              <span className="text-emerald-400 font-bold">4</span>
              <div>
                <strong>Test Swap Verification:</strong> Execute minimal test swaps ($5) to confirm router calculation and zero-tax transfer behavior.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Security Policy */}
      {activeTab === 'security' && (
        <Card className="space-y-6 text-sm">
          <h3 className="text-lg font-bold text-white">Protocol Threat Model & Safeguards</h3>
          <div className="space-y-3 text-xs text-secondary leading-relaxed">
            <p>
              <strong>1. No Transfer Taxes:</strong> Reflective taxes and fee-on-transfer tokens frequently break Uniswap/PancakeSwap routers, 
              causing unexpected slippage errors and liquidity pool exploits. OXENIQ maintains clean, tax-free token transfers.
            </p>
            <p>
              <strong>2. Two-Step Ownership:</strong> OpenZeppelin <code>Ownable2Step</code> prevents transferring ownership to an invalid or mistyped address. 
              The recipient must call <code>acceptOwnership()</code> to finalize the transfer.
            </p>
            <p>
              <strong>3. Fuzz-Tested Allocation Math:</strong> Rounding errors are mathematically eliminated by computing <code>share30 = total - share70</code>.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
