/**
 * LIORA COIN — Multi-Chain Architecture Core Types
 *
 * Provides chain-agnostic blockchain abstractions supporting EVM (BSC, Polygon),
 * TVM (TRON), and UTXO (Bitcoin) network families.
 */

export type BlockchainFamily = 'EVM' | 'TRON' | 'BITCOIN';

export type NetworkId =
  | 'bsc-mainnet'
  | 'bsc-testnet'
  | 'polygon-mainnet'
  | 'polygon-amoy'
  | 'tron-mainnet'
  | 'tron-shasta'
  | 'bitcoin-mainnet'
  | 'bitcoin-testnet'
  | 'local-devnet';

export type TokenStandard = 'BEP-20' | 'ERC-20' | 'TRC-20' | 'TRC-10' | 'NATIVE_UTXO';

export type FeeModelType = 'GAS_EVM' | 'ENERGY_BANDWIDTH' | 'UTXO_SAT_VB';

export type ChainOperationalStatus =
  | 'ACTIVE_OPERATIONAL'
  | 'READ_ONLY_MAINNET'
  | 'TESTING_ONLY'
  | 'DEV_MOCK_ONLY'
  | 'DISABLED_UNTIL_APPROVED'
  | 'DISABLED_FUTURE_PHASE';

export interface NativeAssetConfig {
  symbol: string;
  name: string;
  decimals: number;
}

export interface BlockchainFeatures {
  smartContracts: boolean;
  tokenTransfers: boolean;
  tradingBotPayments: boolean;
  investorLocking: boolean;
}

export interface BlockchainConfig {
  networkId: NetworkId;
  name: string;
  family: BlockchainFamily;
  chainId: number | string | null; // e.g. 56, 97, 137, or null for Bitcoin
  isTestnet: boolean;
  enabled: boolean; // Feature flag: true ONLY for BSC initially
  status: ChainOperationalStatus;
  nativeAsset: NativeAssetConfig;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  supportedTokenStandards: TokenStandard[];
  supportedWallets: string[];
  feeModel: FeeModelType;
  confirmationsRequired: number;
  features: BlockchainFeatures;
  notes?: string;
}

export interface ChainAwareToken {
  tokenKey: string; // Composite unique key: e.g. "bsc:liora", "bsc:usdt", "tron:usdt", "polygon:usdt", "btc:native"
  symbol: string;
  name: string;
  networkId: NetworkId;
  family: BlockchainFamily;
  standard: TokenStandard;
  decimals: number; // e.g. 18 for BSC LIORA, 18 for BSC USDT, 6 for TRON USDT, 6 for Polygon USDT, 8 for BTC
  contractAddress: string | null;
  isNative: boolean;
  isPrimaryPair?: boolean;
}

export interface FeeEstimateParams {
  toAddress: string;
  amount: string;
  tokenKey?: string;
  tokenAddress?: string;
  data?: string;
}

export interface FeeEstimateResult {
  networkId: NetworkId;
  feeAmount: string; // Formatted in fee asset units
  feeAssetSymbol: string; // e.g. "BNB", "POL", "TRX", "BTC"
  feeAssetDecimals: number;
  estimatedFeeUSD?: number;
  rawGasOrEnergy?: {
    gasLimit?: string;
    gasPrice?: string; // Gwei or sat/vB
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    energyRequired?: number;
    bandwidthRequired?: number;
    satPerVByte?: number;
  };
}

export interface TxStatusResult {
  txHash: string;
  networkId: NetworkId;
  confirmed: boolean;
  confirmations: number;
  blockNumber: number | null;
  blockTimestamp?: number | null;
  failed: boolean;
  error?: string;
}

export interface AddressValidationResult {
  valid: boolean;
  networkId: NetworkId;
  family: BlockchainFamily;
  normalizedAddress: string;
  isChecksumValid?: boolean;
  error?: string;
}

export interface ChainAdapter {
  readonly networkId: NetworkId;
  readonly family: BlockchainFamily;
  readonly config: BlockchainConfig;

  // Address validation & formatting
  validateAddress(address: string): boolean;
  normalizeAddress(address: string): string;
  formatDisplayAddress(address: string, startChars?: number, endChars?: number): string;

  // Balances
  getBalance(address: string, tokenKeyOrAddress?: string): Promise<string>;

  // Fee estimation
  estimateFee(params: FeeEstimateParams): Promise<FeeEstimateResult>;

  // Transaction Status
  getTransactionStatus(txHash: string): Promise<TxStatusResult>;
}

