export type ComponentStatus = 'Live' | 'In Development' | 'Planned' | 'Not Configured';

export interface EcosystemComponent {
  id: string;
  name: string;
  category: 'Token' | 'Liquidity' | 'Cross-Chain' | 'Governance' | 'Utility';
  status: ComponentStatus;
  chain: string;
  description: string;
  technicalDetails: string[];
}

export interface RoadmapMilestone {
  id: string;
  quarter: string;
  title: string;
  description: string;
  status: 'Completed' | 'In Progress' | 'Planned';
  deliverables: string[];
}

export interface OpenDecisionItem {
  id: string;
  topic: string;
  impact: string;
  question: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'PROVISIONAL';
  provisionalHandling: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  tagline: string;
  initialSupply: string;
  targetChain: string;
  supportedChains: {
    id: number;
    name: string;
    isTestnet: boolean;
    contractAddress: string | null;
    explorerUrl: string;
    rpcUrl: string;
  }[];
  initialLiquidityBudget: string;
  allocationRatio: string;
}
