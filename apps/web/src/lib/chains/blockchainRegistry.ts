/**
 * LIORA COIN — Central Multi-Chain Blockchain & Token Registry
 *
 * Defines network configurations, operational feature flags, and token standards
 * across BSC, Polygon, TRON, and Bitcoin.
 *
 * STRICT GOVERNANCE RULE:
 * Only BSC Testnet (#97) and Local Devnet (#31337) are enabled initially.
 * BSC Mainnet (#56), Polygon, TRON, and Bitcoin are strictly DISABLED.
 */

import { BlockchainConfig, ChainAwareToken, NetworkId } from './types';

export class UnsupportedChainError extends Error {
  public networkId: NetworkId;
  constructor(networkId: NetworkId, reason?: string) {
    super(reason || `Network [${networkId}] is currently disabled. Live transactions and operations are not permitted.`);
    this.name = 'UnsupportedChainError';
    this.networkId = networkId;
  }
}

export const BLOCKCHAIN_REGISTRY: Record<NetworkId, BlockchainConfig> = {
  'bsc-testnet': {
    networkId: 'bsc-testnet',
    name: 'BNB Smart Chain Testnet',
    family: 'EVM',
    chainId: 97,
    isTestnet: true,
    enabled: true, // ACTIVE FOR SANDBOX TESTING
    status: 'TESTING_ONLY',
    nativeAsset: { symbol: 'tBNB', name: 'Testnet BNB', decimals: 18 },
    rpcUrls: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
    supportedTokenStandards: ['BEP-20'],
    supportedWallets: ['MetaMask', 'Trust Wallet', 'Binance Web3 Wallet', 'Rabby'],
    feeModel: 'GAS_EVM',
    confirmationsRequired: 3,
    features: {
      smartContracts: true,
      tokenTransfers: true,
      tradingBotPayments: true,
      investorLocking: true
    },
    notes: 'Designated active testing sandbox for automated test execution and UI demonstration.'
  },

  'bsc-mainnet': {
    networkId: 'bsc-mainnet',
    name: 'BNB Smart Chain Mainnet',
    family: 'EVM',
    chainId: 56,
    isTestnet: false,
    enabled: true, // ACTIVE FOR READ-ONLY MAINNET INTEGRATION
    status: 'READ_ONLY_MAINNET',
    nativeAsset: { symbol: 'BNB', name: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    blockExplorerUrls: ['https://bscscan.com'],
    supportedTokenStandards: ['BEP-20'],
    supportedWallets: ['MetaMask', 'Trust Wallet', 'Binance Web3 Wallet', 'Rabby'],
    feeModel: 'GAS_EVM',
    confirmationsRequired: 15,
    features: {
      smartContracts: true, // Enabled for read-only contract state & token queries
      tokenTransfers: false, // STRICTLY DISABLED IN PHASE 1
      tradingBotPayments: false, // STRICTLY DISABLED IN PHASE 1
      investorLocking: false // STRICTLY DISABLED IN PHASE 1
    },
    notes: 'Official BSC Mainnet deployment. Smart contract state and token balances enabled in read-only mode. Financial transactions and trading remain strictly disabled.'
  },

  'local-devnet': {
    networkId: 'local-devnet',
    name: 'Local Hardhat Simulation',
    family: 'EVM',
    chainId: 31337,
    isTestnet: true,
    enabled: true, // Local developer mocks only
    status: 'DEV_MOCK_ONLY',
    nativeAsset: { symbol: 'GO', name: 'Test Ether/BNB', decimals: 18 },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: ['http://localhost:8545'],
    supportedTokenStandards: ['BEP-20', 'ERC-20'],
    supportedWallets: ['Hardhat Mock'],
    feeModel: 'GAS_EVM',
    confirmationsRequired: 1,
    features: {
      smartContracts: true,
      tokenTransfers: true,
      tradingBotPayments: true,
      investorLocking: true
    },
    notes: 'In-memory test environment. Never deployed to live networks.'
  },

  'polygon-mainnet': {
    networkId: 'polygon-mainnet',
    name: 'Polygon PoS Mainnet',
    family: 'EVM',
    chainId: 137,
    isTestnet: false,
    enabled: false, // FUTURE EXPANSION ONLY
    status: 'DISABLED_FUTURE_PHASE',
    nativeAsset: { symbol: 'POL', name: 'Polygon Ecosystem Token', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
    supportedTokenStandards: ['ERC-20'],
    supportedWallets: ['MetaMask', 'Coinbase Wallet', 'Rabby'],
    feeModel: 'GAS_EVM',
    confirmationsRequired: 64,
    features: {
      smartContracts: false,
      tokenTransfers: false,
      tradingBotPayments: false,
      investorLocking: false
    },
    notes: 'EVM expansion candidate. Architecture ready; operations disabled.'
  },

  'polygon-amoy': {
    networkId: 'polygon-amoy',
    name: 'Polygon Amoy Testnet',
    family: 'EVM',
    chainId: 80002,
    isTestnet: true,
    enabled: false,
    status: 'DISABLED_FUTURE_PHASE',
    nativeAsset: { symbol: 'POL', name: 'Amoy POL', decimals: 18 },
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    blockExplorerUrls: ['https://amoy.polygonscan.com'],
    supportedTokenStandards: ['ERC-20'],
    supportedWallets: ['MetaMask'],
    feeModel: 'GAS_EVM',
    confirmationsRequired: 5,
    features: {
      smartContracts: false,
      tokenTransfers: false,
      tradingBotPayments: false,
      investorLocking: false
    }
  },

  'tron-mainnet': {
    networkId: 'tron-mainnet',
    name: 'TRON Mainnet',
    family: 'TRON',
    chainId: '0x2b6653dc', // TRON Mainnet identifier
    isTestnet: false,
    enabled: false, // FUTURE EXPANSION ONLY
    status: 'DISABLED_FUTURE_PHASE',
    nativeAsset: { symbol: 'TRX', name: 'TRON', decimals: 6 },
    rpcUrls: ['https://api.trongrid.io'],
    blockExplorerUrls: ['https://tronscan.org'],
    supportedTokenStandards: ['TRC-20', 'TRC-10'],
    supportedWallets: ['TronLink', 'Ledger TRON'],
    feeModel: 'ENERGY_BANDWIDTH',
    confirmationsRequired: 19,
    features: {
      smartContracts: false,
      tokenTransfers: false,
      tradingBotPayments: false,
      investorLocking: false
    },
    notes: 'TVM non-EVM architecture candidate. Base58Check preserved; operations disabled.'
  },

  'tron-shasta': {
    networkId: 'tron-shasta',
    name: 'TRON Shasta Testnet',
    family: 'TRON',
    chainId: '0x94a9059e',
    isTestnet: true,
    enabled: false,
    status: 'DISABLED_FUTURE_PHASE',
    nativeAsset: { symbol: 'TRX', name: 'Testnet TRX', decimals: 6 },
    rpcUrls: ['https://api.shasta.trongrid.io'],
    blockExplorerUrls: ['https://shasta.tronscan.org'],
    supportedTokenStandards: ['TRC-20'],
    supportedWallets: ['TronLink'],
    feeModel: 'ENERGY_BANDWIDTH',
    confirmationsRequired: 1,
    features: {
      smartContracts: false,
      tokenTransfers: false,
      tradingBotPayments: false,
      investorLocking: false
    }
  },

  'bitcoin-mainnet': {
    networkId: 'bitcoin-mainnet',
    name: 'Bitcoin Mainnet',
    family: 'BITCOIN',
    chainId: null, // Bitcoin has no EVM chain ID
    isTestnet: false,
    enabled: false, // FUTURE EXPANSION ONLY
    status: 'DISABLED_FUTURE_PHASE',
    nativeAsset: { symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
    rpcUrls: ['https://blockstream.info/api'],
    blockExplorerUrls: ['https://mempool.space', 'https://blockstream.info'],
    supportedTokenStandards: ['NATIVE_UTXO'],
    supportedWallets: ['UniSat', 'Xverse', 'Leather', 'Ledger'],
    feeModel: 'UTXO_SAT_VB',
    confirmationsRequired: 3,
    features: {
      smartContracts: false,
      tokenTransfers: false,
      tradingBotPayments: false,
      investorLocking: false
    },
    notes: 'UTXO non-EVM architecture candidate. 8 decimals (Satoshis); operations disabled.'
  },

  'bitcoin-testnet': {
    networkId: 'bitcoin-testnet',
    name: 'Bitcoin Testnet3',
    family: 'BITCOIN',
    chainId: null,
    isTestnet: true,
    enabled: false,
    status: 'DISABLED_FUTURE_PHASE',
    nativeAsset: { symbol: 'tBTC', name: 'Testnet Bitcoin', decimals: 8 },
    rpcUrls: ['https://blockstream.info/testnet/api'],
    blockExplorerUrls: ['https://mempool.space/testnet'],
    supportedTokenStandards: ['NATIVE_UTXO'],
    supportedWallets: ['UniSat', 'Xverse'],
    feeModel: 'UTXO_SAT_VB',
    confirmationsRequired: 1,
    features: {
      smartContracts: false,
      tokenTransfers: false,
      tradingBotPayments: false,
      investorLocking: false
    }
  }
};

// ============================================================================
// MULTI-CHAIN TOKEN REGISTRY (CHAIN-AWARE DECIMALS & STANDARDS)
// ============================================================================
export const CHAIN_AWARE_TOKENS: Record<string, ChainAwareToken> = {
  // --- BSC MAINNET TOKENS (OFFICIAL ON-CHAIN CONTRACT) ---
  'bsc-mainnet:liora': {
    tokenKey: 'bsc-mainnet:liora',
    symbol: 'LIORA',
    name: 'LIORA',
    networkId: 'bsc-mainnet',
    family: 'EVM',
    standard: 'BEP-20',
    decimals: 18,
    contractAddress: '0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A',
    isNative: false,
    isPrimaryPair: true
  },

  // --- BSC TESTNET TOKENS ---
  'bsc:liora': {
    tokenKey: 'bsc:liora',
    symbol: 'LIORA',
    name: 'Liora Coin',
    networkId: 'bsc-testnet',
    family: 'EVM',
    standard: 'BEP-20',
    decimals: 18,
    contractAddress: '0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877',
    isNative: false,
    isPrimaryPair: true
  },
  'bsc:usdt': {
    tokenKey: 'bsc:usdt',
    symbol: 'USDT',
    name: 'Tether USD (BSC BEP-20)',
    networkId: 'bsc-testnet',
    family: 'EVM',
    standard: 'BEP-20',
    decimals: 18, // BSC Tether uses 18 decimals
    contractAddress: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    isNative: false,
    isPrimaryPair: true
  },
  'bsc:bnb': {
    tokenKey: 'bsc:bnb',
    symbol: 'BNB',
    name: 'BNB Gas Token',
    networkId: 'bsc-testnet',
    family: 'EVM',
    standard: 'BEP-20',
    decimals: 18,
    contractAddress: null,
    isNative: true
  },

  // --- POLYGON TOKENS (FUTURE SPEC) ---
  'polygon:usdt': {
    tokenKey: 'polygon:usdt',
    symbol: 'USDT',
    name: 'Tether USD (Polygon PoS)',
    networkId: 'polygon-mainnet',
    family: 'EVM',
    standard: 'ERC-20',
    decimals: 6, // CRITICAL: Polygon USDT uses 6 decimals (NOT 18)
    contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    isNative: false
  },
  'polygon:pol': {
    tokenKey: 'polygon:pol',
    symbol: 'POL',
    name: 'Polygon Gas Asset',
    networkId: 'polygon-mainnet',
    family: 'EVM',
    standard: 'ERC-20',
    decimals: 18,
    contractAddress: null,
    isNative: true
  },

  // --- TRON TOKENS (FUTURE SPEC) ---
  'tron:usdt': {
    tokenKey: 'tron:usdt',
    symbol: 'USDT',
    name: 'Tether USD (TRON TRC-20)',
    networkId: 'tron-mainnet',
    family: 'TRON',
    standard: 'TRC-20',
    decimals: 6, // CRITICAL: TRON USDT uses 6 decimals (NOT 18)
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    isNative: false
  },
  'tron:trx': {
    tokenKey: 'tron:trx',
    symbol: 'TRX',
    name: 'TRON Native Coin',
    networkId: 'tron-mainnet',
    family: 'TRON',
    standard: 'TRC-10',
    decimals: 6, // 1 TRX = 1,000,000 SUN
    contractAddress: null,
    isNative: true
  },

  // --- BITCOIN (FUTURE SPEC) ---
  'btc:native': {
    tokenKey: 'btc:native',
    symbol: 'BTC',
    name: 'Bitcoin Native Asset',
    networkId: 'bitcoin-mainnet',
    family: 'BITCOIN',
    standard: 'NATIVE_UTXO',
    decimals: 8, // CRITICAL: 1 BTC = 100,000,000 Satoshis
    contractAddress: null,
    isNative: true
  }
};

// ============================================================================
// REGISTRY ACCESSORS & FAIL-CLOSED ENFORCEMENT
// ============================================================================

export function getChainConfig(networkId: NetworkId): BlockchainConfig | null {
  return BLOCKCHAIN_REGISTRY[networkId] || null;
}

export function getChainConfigByChainId(chainId: number | string): BlockchainConfig | null {
  for (const config of Object.values(BLOCKCHAIN_REGISTRY)) {
    if (config.chainId === chainId || (typeof chainId === 'number' && config.chainId === chainId)) {
      return config;
    }
  }
  return null;
}

export function getEnabledChains(): BlockchainConfig[] {
  return Object.values(BLOCKCHAIN_REGISTRY).filter((c) => c.enabled);
}

export function getAllChains(): BlockchainConfig[] {
  return Object.values(BLOCKCHAIN_REGISTRY);
}

export function isChainEnabled(networkId: NetworkId): boolean {
  const config = BLOCKCHAIN_REGISTRY[networkId];
  return Boolean(config && config.enabled);
}

/**
 * Asserts that a chain is operational. Throws UnsupportedChainError if disabled.
 */
export function assertChainEnabled(networkId: NetworkId): BlockchainConfig {
  const config = BLOCKCHAIN_REGISTRY[networkId];
  if (!config) {
    throw new UnsupportedChainError(networkId, `Unknown blockchain network [${networkId}].`);
  }
  if (!config.enabled) {
    throw new UnsupportedChainError(
      networkId,
      `Network [${config.name}] is disabled in this phase. Real transactions and settlement are strictly restricted to BNB Smart Chain.`
    );
  }
  return config;
}

export function getTokenConfig(tokenKey: string): ChainAwareToken | null {
  return CHAIN_AWARE_TOKENS[tokenKey] || null;
}

export function getTokensForChain(networkId: NetworkId): ChainAwareToken[] {
  return Object.values(CHAIN_AWARE_TOKENS).filter((t) => t.networkId === networkId);
}

/**
 * High-precision decimal converter avoiding floating point bugs across token precisions.
 * e.g. converting 1.5 USDT (6 decimals) into BigInt units = 1,500,000n.
 */
export function parseTokenUnits(amountStr: string, decimals: number): bigint {
  const [intPart, fracPart = ''] = amountStr.trim().split('.');
  const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
  const scale = 10n ** BigInt(decimals);
  return BigInt(intPart || '0') * scale + BigInt(paddedFrac || '0');
}

/**
 * Formats raw BigInt token units to a human-readable decimal string.
 */
export function formatTokenUnits(rawUnits: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const isNegative = rawUnits < 0n;
  const abs = isNegative ? -rawUnits : rawUnits;
  const intPart = abs / scale;
  const fracPart = abs % scale;
  const fracStr = fracPart.toString().padStart(decimals, '0');
  return `${isNegative ? '-' : ''}${intPart.toString()}.${fracStr}`;
}

