import { RoadmapMilestone } from '../types';

export const ROADMAP_DATA: RoadmapMilestone[] = [
  {
    id: "phase-1",
    quarter: "Phase 1 - Complete",
    title: "System Architecture & Token Specification",
    description: "Establish mathematical models, OpenZeppelin v5 contract design, threat modeling, and open decisions tracking.",
    status: "Completed",
    deliverables: [
      "Standard BEP-20 / ERC-20 contract architecture (OxeniqToken.sol)",
      "Decoupled 70:30 purchase allocation manager (AllocationManager.sol)",
      "Zero fees-on-transfer guardrails for AMM & bridge compatibility",
      "Formal documentation suite & management open decisions log",
    ],
  },
  {
    id: "phase-2",
    quarter: "Phase 2 - Complete",
    title: "Visual Design System & Web3 Frontend",
    description: "Launch public-facing decentralized portal with futuristic metallic aesthetic, wallet integration, and truthful blockchain state.",
    status: "Completed",
    deliverables: [
      "Responsive Web3 application built on Next.js 16 and TypeScript",
      "High-contrast obsidian and metallic blue futuristic design tokens",
      "Interactive DEX swap interface with honest unconfigured liquidity state",
      "Cross-chain transfer architecture explorer for BSC and TRON",
    ],
  },
  {
    id: "phase-3",
    quarter: "Phase 3 - In Progress",
    title: "BSC Testnet Deployment & Rigorous Testing",
    description: "Deploy contracts to BNB Smart Chain Testnet (Chain ID 97), verify source on BscScan, and execute automated test suite.",
    status: "In Progress",
    deliverables: [
      "100% test coverage across transfers, burning, pause circuit breaker",
      "Integer conservation fuzz testing on 70:30 allocation math",
      "Testnet faucet interaction and multi-sig administration setup",
      "Static analysis and Slither vulnerability verification",
    ],
  },
  {
    id: "phase-4",
    quarter: "Phase 4 - Planned",
    title: "Initial Liquidity ($1,000 Budget) & Pool Launch",
    description: "Deploy initial $1,000 liquidity pool on PancakeSwap v2/v3, lock LP tokens in certified locker, and activate price discovery.",
    status: "Planned",
    deliverables: [
      "Manager confirmation of trading pair (OXENIQ/USDT or OXENIQ/WBNB)",
      "Safe pool creation with slippage-protected initial ratio",
      "Automated LP token locking with public verifiable receipt",
      "Real-time DEX pool reserve tracking on frontend",
    ],
  },
  {
    id: "phase-5",
    quarter: "Phase 5 - Planned",
    title: "70:30 Allocation Module Activation",
    description: "Connect verified purchase flows to AllocationManager once allocation recipient wallets are formally confirmed.",
    status: "Planned",
    deliverables: [
      "Management approval of allocation recipients (multi-sig / cold storage)",
      "Production deployment of AllocationManager on BSC Mainnet",
      "On-chain event auditing and distribution transparency reporting",
    ],
  },
  {
    id: "phase-6",
    quarter: "Phase 6 - Planned",
    title: "Cross-Chain Expansion: BSC to TRON",
    description: "Deploy TRC-20 compatible token on TRON and integrate validated cross-chain messaging adapter (LayerZero OFT / CCIP).",
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
    title: "Industrial & Manufacturing Plant Integration",
    description: "Connect on-chain utility to physical enterprise workflows once business requirements are formally finalized.",
    status: "Planned",
    deliverables: [
      "Definition of enterprise utility (invoice gating, B2B settlement, or IoT tracking)",
      "Permissioned enterprise adapter contract",
      "Production multi-sig governance handover",
    ],
  },
];
