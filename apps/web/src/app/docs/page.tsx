'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { 
  FileText, 
  Layers, 
  ShieldCheck, 
  Code2, 
  CheckCircle2, 
  ExternalLink, 
  Lock, 
  Zap, 
  Terminal,
  BookOpen
} from 'lucide-react';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'whitepaper' | 'contracts' | 'security' | 'developer'>('whitepaper');

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-xs uppercase font-bold tracking-[0.2em] text-[var(--brand-accent)]">Protocol Documentation</h1>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">Whitepaper & Specifications</h2>
          <p className="text-secondary text-sm sm:text-base leading-relaxed">
            Public technical documentation, cryptographic specifications, smart contract architecture, and developer integration guides for OXENIQ.
          </p>
        </div>

        {/* Brand Emblem Mini-Showcase */}
        <div className="relative shrink-0 flex items-center justify-center self-start md:self-auto">
          <div 
            className="absolute rounded-full filter blur-xl opacity-40 pointer-events-none"
            style={{
              width: 130,
              height: 130,
              background: 'radial-gradient(circle, rgba(57,123,255,0.4) 0%, transparent 70%)',
            }}
          />
          <Image
            src="/assets/oxeniq-logo-512.png"
            alt="OXENIQ Official Documentation"
            width={100}
            height={100}
            className="relative object-contain filter drop-shadow-md"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-4">
        <button
          onClick={() => setActiveTab('whitepaper')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'whitepaper' ? 'btn-metallic text-white shadow-md' : 'btn-secondary text-secondary'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Whitepaper Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'contracts' ? 'btn-metallic text-white shadow-md' : 'btn-secondary text-secondary'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Smart Contract Specs</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'security' ? 'btn-metallic text-white shadow-md' : 'btn-secondary text-secondary'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security Disclosures</span>
        </button>

        <button
          onClick={() => setActiveTab('developer')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'developer' ? 'btn-metallic text-white shadow-md' : 'btn-secondary text-secondary'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Developer Guide</span>
        </button>
      </div>

      {/* Tab 1: Whitepaper Overview */}
      {activeTab === 'whitepaper' && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-xl font-bold text-white">OXENIQ Whitepaper Summary</h3>
              <Badge status="Completed" />
            </div>
            
            <div className="space-y-4 text-xs sm:text-sm text-secondary leading-relaxed">
              <p>
                <strong>OXENIQ</strong> is an institutional-grade utility token engineered on BNB Smart Chain (BEP-20). 
                The protocol addresses fundamental shortcomings of early-generation utility tokens by enforcing 
                <strong> zero transfer taxes</strong>, battle-tested cryptographic primitives, and decoupled ecosystem allocation mechanics.
              </p>

              <h4 className="text-sm font-bold text-white pt-2">Core Economic Design</h4>
              <ul className="space-y-2 list-disc list-inside text-xs">
                <li><strong className="text-white">Fixed Genesis Total Supply:</strong> All initial supply is minted exclusively during contract construction. There is no arbitrary mint function or inflation backdoor.</li>
                <li><strong className="text-white">Deflationary Burning:</strong> Token holders can permanently burn owned tokens on-chain, mathematically reducing circulating supply.</li>
                <li><strong className="text-white">100% AMM Compatibility:</strong> By rejecting fee-on-transfer mechanics in the base token, OXENIQ integrates seamlessly with PancakeSwap v2/v3, lending protocols, and multi-sig vaults without slippage penalties.</li>
                <li><strong className="text-white">Decoupled Allocation:</strong> The 70:30 allocation architecture is separated into a dedicated modular contract, keeping the token transfer path clean.</li>
              </ul>

              <h4 className="text-sm font-bold text-white pt-2">The Multi-Chain Vision</h4>
              <p className="text-xs">
                While BNB Smart Chain serves as the genesis deployment network for rapid 3-second block times and low transaction fees, 
                the protocol architecture is prepared for expansion into TRON and EVM ecosystems via LayerZero v2 OFT standards.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Smart Contract Specifications */}
      {activeTab === 'contracts' && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-lg font-bold text-white">OxeniqToken.sol (BEP-20)</h3>
                <span className="text-xs text-muted font-mono">contracts/OxeniqToken.sol</span>
              </div>
              <Badge status="In Progress" />
            </div>

            <p className="text-secondary text-xs leading-relaxed">
              Conforms strictly to the BEP-20 / ERC-20 standard on BNB Smart Chain. Built using OpenZeppelin v5 verified libraries:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                <span className="font-bold text-white">ERC20 & ERC20Burnable</span>
                <p className="text-secondary">Standard 18 decimals. Holders can call <code>burn(amount)</code> to decrease total supply.</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                <span className="font-bold text-white">Ownable2Step</span>
                <p className="text-secondary">Two-step ownership prevents accidental administrative loss.</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                <span className="font-bold text-white">Pausable Circuit Breaker</span>
                <p className="text-secondary">Emergency pause capability restricted to verified two-step owner.</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1">
                <span className="font-bold text-white">Zero Tax Mechanism</span>
                <p className="text-secondary">0% fee-on-transfer for 100% AMM router compatibility.</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-lg font-bold text-white">AllocationManager.sol (70:30 Controller)</h3>
                <span className="text-xs text-muted font-mono">contracts/AllocationManager.sol</span>
              </div>
              <Badge status="In Progress" />
            </div>

            <p className="text-secondary text-xs leading-relaxed">
              Decoupled allocation module enforcing integer-safe mathematical splits for token distribution:
            </p>

            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] font-mono text-xs text-secondary space-y-1.5">
              <div className="text-emerald-400 font-bold">// Proof of Exact Conservation:</div>
              <div>share70 = (amount * 70) / 100;</div>
              <div>share30 = amount - share70;</div>
              <div className="text-muted">// Guarantees: share70 + share30 == amount (Zero dust lost)</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Security Policy & Disclosures */}
      {activeTab === 'security' && (
        <Card className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-lg font-bold text-white">Protocol Threat Model & Cryptographic Safeguards</h3>
            <Badge status="Completed" />
          </div>

          <div className="space-y-4 text-xs text-secondary leading-relaxed">
            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-white font-bold text-sm">1. Zero Post-Deployment Mint Backdoors</span>
              <p>
                The token supply is minted strictly within the constructor during deployment. 
                There is no <code>mint()</code> function in <code>OxeniqToken.sol</code>. 
                No owner, compromised private key, or contract admin can ever inflate token supply post-launch.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-white font-bold text-sm">2. Two-Step Governance Handover</span>
              <p>
                Ownership handover requires two discrete transactions: <code>transferOwnership()</code> nominates 
                the pending owner, and the nominee must explicitly call <code>acceptOwnership()</code>. 
                This eliminates the risk of bricking contract administration through mistyped addresses.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-white font-bold text-sm">3. Reentrancy & Integer Safety</span>
              <p>
                Allocation logic incorporates OpenZeppelin <code>ReentrancyGuard</code> and SafeERC20. 
                Math conservation has been fuzz-tested across 1..200 input ranges with zero dust accumulation.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Developer Guide */}
      {activeTab === 'developer' && (
        <Card className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-lg font-bold text-white">Developer & Integration Guide</h3>
            <span className="text-xs text-emerald-400 font-mono">EVM 0.8.20 Compatible</span>
          </div>

          <div className="space-y-4 text-xs text-secondary">
            <p>
              Integrate OXENIQ into your decentralized application, wallet, or analytics dashboard using standard ERC-20 / BEP-20 interfaces.
            </p>

            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] font-mono space-y-2">
              <div className="text-muted">// Token Metadata</div>
              <div>Name: <span className="text-white">&quot;OXENIQ&quot;</span></div>
              <div>Symbol: <span className="text-white">&quot;OXENIQ&quot;</span></div>
              <div>Decimals: <span className="text-white">18</span></div>
              <div>Blockchain: <span className="text-white">&quot;BNB Smart Chain&quot;</span></div>
              <div>Mainnet Chain ID: <span className="text-white">56</span></div>
              <div>Testnet Chain ID: <span className="text-white">97</span></div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] font-mono space-y-2">
              <div className="text-muted">// Core BEP-20 Interface Snippet</div>
              <div className="text-white">function balanceOf(address account) external view returns (uint256);</div>
              <div className="text-white">function transfer(address to, uint256 amount) external returns (bool);</div>
              <div className="text-white">function approve(address spender, uint256 amount) external returns (bool);</div>
              <div className="text-white">function burn(uint256 amount) external;</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
