import { RoadmapMilestone } from '../types';

export const ROADMAP_DATA: RoadmapMilestone[] = [
  {
    id: "phase-1",
    quarter: "Phase 1 - Complete",
    title: "System Architecture & Token Specification",
    description: "Establish mathematical models, OpenZeppelin v5 contract design, threat modeling, and formal security specifications.",
    status: "Completed",
    deliverables: [
      "Standard BEP-20 / ERC-20 contract architecture (OxeniqToken.sol)",
      "Decoupled 70:30 purchase allocation manager (AllocationManager.sol)",
      "Zero fees-on-transfer guardrails for 100% AMM & bridge compatibility",
      "Formal documentation suite & cryptographic security audit framework",
    ],
  },
  {
    id: "phase-2",
    quarter: "Phase 2 - Complete",
    title: "Visual Design System & Official Brand Identity",
    description: "Launch public-facing decentralized portal with obsidian, metallic blue, and silver design tokens incorporating the official OXENIQ emblem.",
    status: "Completed",
    deliverables: [
      "Responsive Web3 application built on Next.js 16 and TypeScript",
      "Official OXENIQ medallion integration across header, hero, and branding",
      "Interactive DEX swap interface with verified liquidity guards",
      "Cross-chain transfer architecture explorer for BSC and TRON",
    ],
  },
  {
    id: "phase-3",
    quarter: "Phase 3 - In Progress",
    title: "BSC Testnet Deployment & Testing",
    description: "Deploy contracts to BNB Smart Chain Testnet (Chain ID 97), verify source code on BscScan, and execute automated test suite.",
    status: "In Progress",
    deliverables: [
      "100% test coverage across transfers, burning, and pause circuit breaker",
      "Integer conservation fuzz testing on 70:30 allocation math",
      "Testnet faucet interaction and multi-sig administration setup",
      "Static analysis and Slither vulnerability verification",
    ],
  },
  {
    id: "phase-4",
    quarter: "Phase 4 - Planned",
    title: "Initial Liquidity ($1,000 Budget) & Pool Launch",
    description: "Deploy initial $1,000 liquidity pool on PancakeSwap, lock LP tokens in certified locker, and activate decentralized spot trading.",
    status: "Planned",
    deliverables: [
      "PancakeSwap trading pair deployment (OXENIQ/USDT)",
      "Safe pool creation with slippage-protected initial ratio",
      "Automated LP token locking with public verifiable receipt",
      "Real-time DEX pool reserve tracking on portal",
    ],
  },
  {
    id: "phase-5",
    quarter: "Phase 5 - Planned",
    title: "Ecosystem Allocation Module Activation",
    description: "Connect verified purchase flows to AllocationManager once allocation recipient multi-signatures are activated.",
    status: "Planned",
    deliverables: [
      "Multi-signature destination integration for 70% and 30% shares",
      "Production deployment of AllocationManager on BSC Mainnet",
      "On-chain event auditing and distribution transparency reporting",
    ],
  },
  {
    id: "phase-6",
    quarter: "Phase 6 - Planned",
    title: "Cross-Chain Expansion: BSC to TRON",
    description: "Deploy TRC-20 compatible token on TRON and integrate validated cross-chain messaging adapter (LayerZero v2 OFT).",
    status: "Planned",
    deliverables: [
      "TRON TVM-compatible contract implementation and Shasta testnet validation",
      "Omnichain Fungible Token (OFT) bridge adapter integration",
      "Cross-chain swap routing between PancakeSwap (BSC) and SunSwap (TRON)",
    ],
  },
  {
    id: "phase-7",
    quarter: "Phase 7 - Planned",
    title: "Industrial & Manufacturing Enterprise Integration",
    description: "Connect on-chain utility to physical enterprise workflows, supply verification, and digital authentication.",
    status: "Planned",
    deliverables: [
      "Enterprise utility framework (invoice gating, B2B settlement, IoT tracking)",
      "Permissioned enterprise adapter contract",
      "Production multi-sig governance handover",
    ],
  },
];
