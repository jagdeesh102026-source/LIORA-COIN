import { TokenMetadata, ChainNetworkConfig } from '../types';
import { CANONICAL_MIN_PURCHASE_INR } from '../lib/commerce/fiatCurrencies';
export * from '../lib/chains';

export const BSC_TESTNET_TOKEN_ADDRESS = "0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877";
export const BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS = "0x2ce58319f424D78d3EA4Eb0f4864521EAadE9296";
export const BSC_TESTNET_SALE_ADDRESS = "0x48c25fb4027CDeCB68bf616A4717e5692AbfbDE8";

// Gate C5 / Gate C6 / UUPS Upgradeable Verified On-Chain BSC Testnet Deployments
export const BSC_TESTNET_LIORA_TOKEN_ADDRESS = "0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9"; // UUPS Proxy Address
export const BSC_TESTNET_LIORA_PROXY_ADDRESS = "0xC0aecDF4747C61AAbA1963bc90Ca9Fa16EDF16F9";
export const BSC_TESTNET_LIORA_IMPLEMENTATION_ADDRESS = "0xCda9930c1b932fD6CbD23c373aCB6f2f8A5bBcbD";
export const BSC_TESTNET_LIORA_TIMELOCK_ADDRESS = "0xDa79b818566fcE9D8123817dc291f4E0DE626A27";
export const BSC_TESTNET_LIORA_RESERVE_VAULT_ADDRESS = "0x1E10a2bFcA618Ed3EFEf732f4352A774586FC320";
export const BSC_TESTNET_MOCK_USDT_ADDRESS = "0x0b419a33e8a6448547906DCB191b037Db5ac926e";
export const BSC_TESTNET_PANCAKESWAP_PAIR_ADDRESS = "0xcCb0C6bDFe9dbc77c3275ad34C6F33aF05197D96"; // UUPS LIORA + MockUSDT Pair
export const BSC_TESTNET_LEGACY_PANCAKESWAP_PAIR_ADDRESS = "0x64beE3847a766D35E6611985F3c3e51C78Af5D2c"; // Preserved Gate C5 Old Pair
export const BSC_TESTNET_PANCAKESWAP_ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
export const BSC_TESTNET_PANCAKESWAP_FACTORY_ADDRESS = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";

export const BSC_MAINNET_TOKEN_ADDRESS: string | null = null;
export const BSC_MAINNET_ALLOCATION_MANAGER_ADDRESS: string | null = null;
export const BSC_MAINNET_SALE_ADDRESS: string | null = null; // Strictly null for mainnet

export const TESTNET_SALE_TOKENS_PER_BNB = 10000;

export const BSC_MAINNET_CONFIG: ChainNetworkConfig = {
  id: 56,
  name: "BNB Smart Chain Mainnet",
  category: "PRODUCTION",
  status: "ACTIVE_TARGET",
  isTestnet: false,
  contractAddress: BSC_MAINNET_TOKEN_ADDRESS, // Official address to be announced at Genesis Launch
  allocationManagerAddress: BSC_MAINNET_ALLOCATION_MANAGER_ADDRESS,
  explorerUrl: "https://bscscan.com",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  notes: "The only production network for OXENIQ in Phase 1.",
};

export const BSC_TESTNET_CONFIG: ChainNetworkConfig = {
  id: 97,
  name: "BNB Smart Chain Testnet",
  category: "TESTNET",
  status: "TESTING_ONLY",
  isTestnet: true,
  contractAddress: BSC_TESTNET_LIORA_TOKEN_ADDRESS, // Deployed to BSC Testnet (UUPS Proxy verified on-chain)
  allocationManagerAddress: BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS,
  explorerUrl: "https://testnet.bscscan.com",
  rpcUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
  notes: "Verified testnet deployment for automated pipeline verification and developer testing.",
};

export const LOCAL_DEVNET_CONFIG: ChainNetworkConfig = {
  id: 31337,
  name: "Local Simulation Devnet",
  category: "LOCAL_SIMULATION",
  status: "DEV_MOCK_ONLY",
  isTestnet: true,
  contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  explorerUrl: "http://localhost:8545",
  rpcUrl: "http://127.0.0.1:8545",
  notes: "Developer mock environment only. Never treated as a deployed BSC contract address.",
};

export const FUTURE_CHAINS_CONFIG: ChainNetworkConfig[] = [
  {
    id: 1,
    name: "Ethereum Mainnet",
    category: "FUTURE_EXPANSION",
    status: "DISABLED_FUTURE_PHASE",
    isTestnet: false,
    contractAddress: null,
    explorerUrl: "https://etherscan.io",
    rpcUrl: "https://eth.llamarpc.com",
    notes: "Phase 2+ potential expansion. Transactions strictly disabled in Phase 1.",
  },
  {
    id: 728126428,
    name: "TRON Mainnet",
    category: "FUTURE_EXPANSION",
    status: "DISABLED_FUTURE_PHASE",
    isTestnet: false,
    contractAddress: null,
    explorerUrl: "https://tronscan.org",
    rpcUrl: "https://api.trongrid.io",
    notes: "Requires dedicated TVM adapter. Transactions strictly disabled in Phase 1.",
  },
  {
    id: 137,
    name: "Polygon Mainnet",
    category: "FUTURE_EXPANSION",
    status: "DISABLED_FUTURE_PHASE",
    isTestnet: false,
    contractAddress: null,
    explorerUrl: "https://polygonscan.com",
    rpcUrl: "https://polygon-rpc.com",
    notes: "Phase 2+ potential expansion. Transactions strictly disabled in Phase 1.",
  },
];

export const TOKEN_CONFIG: TokenMetadata = {
  name: "LIORA",
  symbol: "LIORA",
  decimals: 18,
  tagline: "POWERING THE NEXT DIGITAL ERA",
  initialSupply: "100,000,000,000 LIORA Fixed at Initialization (Deflationary Burning Enabled)",
  targetChain: "BNB Smart Chain (BEP-20)",
  canonicalMinPurchaseInr: CANONICAL_MIN_PURCHASE_INR, // ₹1,00,000 INR
  supportedChains: [
    BSC_MAINNET_CONFIG,
    BSC_TESTNET_CONFIG,
    LOCAL_DEVNET_CONFIG,
  ],
  futureChains: FUTURE_CHAINS_CONFIG,
  initialLiquidityBudget: "$1,000 USD",
  allocationRatio: "70:30 Ecosystem Allocation Protocol",
};

/**
 * Validates whether a chain ID is the production network (BSC Mainnet 56).
 */
export function isProductionChain(chainId: number | null): boolean {
  return chainId === BSC_MAINNET_CONFIG.id;
}

/**
 * Validates whether a chain ID is the testnet network (BSC Testnet 97).
 */
export function isTestnetChain(chainId: number | null): boolean {
  return chainId === BSC_TESTNET_CONFIG.id;
}

/**
 * Validates whether a chain ID is a Phase 1 BSC network (Mainnet 56 or Testnet 97).
 */
export function isPhase1BscChain(chainId: number | null): boolean {
  return chainId === BSC_MAINNET_CONFIG.id || chainId === BSC_TESTNET_CONFIG.id;
}

/**
 * Validates whether a chain ID is the developer local mock (31337).
 */
export function isLocalDevChain(chainId: number | null): boolean {
  return chainId === LOCAL_DEVNET_CONFIG.id;
}

/**
 * Resolves the token contract address for a given chain ID.
 * Returns null if the chain has no deployed contract (e.g. Mainnet prior to Genesis).
 */
export function getTokenContractAddress(chainId: number | null): string | null {
  if (chainId === BSC_TESTNET_CONFIG.id) return BSC_TESTNET_CONFIG.contractAddress;
  if (chainId === LOCAL_DEVNET_CONFIG.id) return LOCAL_DEVNET_CONFIG.contractAddress;
  if (chainId === BSC_MAINNET_CONFIG.id) return BSC_MAINNET_CONFIG.contractAddress;
  return null;
}

/**
 * Resolves the AllocationManager contract address for a given chain ID.
 * Returns null if the chain has no deployed AllocationManager.
 */
export function getAllocationManagerAddress(chainId: number | null): string | null {
  if (chainId === BSC_TESTNET_CONFIG.id) return BSC_TESTNET_CONFIG.allocationManagerAddress ?? null;
  if (chainId === BSC_MAINNET_CONFIG.id) return BSC_MAINNET_CONFIG.allocationManagerAddress ?? null;
  return null;
}

/**
 * Resolves the TestnetTokenSale contract address for a given chain ID.
 * Returns null if the chain is Mainnet or if the sale contract is not yet configured.
 */
export function getSaleContractAddress(chainId: number | null): string | null {
  if (chainId === BSC_TESTNET_CONFIG.id) return BSC_TESTNET_SALE_ADDRESS;
  return null;
}

