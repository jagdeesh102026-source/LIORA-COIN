export type ComponentStatus = 'Live' | 'In Development' | 'Planned' | 'Not Configured';

export interface EcosystemComponent {
  id: string;
  name: string;
  category: 'Token' | 'Liquidity' | 'Cross-Chain' | 'Governance' | 'Utility';
  status: ComponentStatus;
  chain: string;
  description: string;
  technicalDetails: string[];
  contractAddress?: string;
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

export interface ChainNetworkConfig {
  id: number;
  name: string;
  category: 'PRODUCTION' | 'TESTNET' | 'LOCAL_SIMULATION' | 'FUTURE_EXPANSION';
  status: 'ACTIVE_TARGET' | 'TESTING_ONLY' | 'DEV_MOCK_ONLY' | 'DISABLED_FUTURE_PHASE';
  isTestnet: boolean;
  contractAddress: string | null;
  allocationManagerAddress?: string | null;
  explorerUrl: string;
  rpcUrl: string;
  notes?: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  tagline: string;
  initialSupply: string;
  targetChain: string;
  canonicalMinPurchaseInr: number;
  supportedChains: ChainNetworkConfig[];
  futureChains: ChainNetworkConfig[];
  initialLiquidityBudget: string;
  allocationRatio: string;
}
