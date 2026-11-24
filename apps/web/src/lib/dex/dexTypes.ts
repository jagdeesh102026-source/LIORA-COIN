/**
 * LIORA COIN — DEX Testnet Proof-of-Concept & AMM Types
 *
 * Strictly restricted to BSC Testnet (Chain ID 97) and Local Devnet (Chain ID 31337).
 * Mainnet transactions are strictly prohibited.
 */

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface PoolReserves {
  pairAddress: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  blockTimestampLast: number;
  hasLiquidity: boolean;
}

export interface DexQuoteRequest {
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string | bigint; // human readable string or base units bigint
  slippageTolerancePercent: number; // e.g. 0.5%
}

export interface DexQuoteResult {
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountInBaseUnits: bigint;
  amountInFormatted: string;
  expectedAmountOutBaseUnits: bigint;
  expectedAmountOutFormatted: string;
  minAmountOutBaseUnits: bigint;
  minAmountOutFormatted: string;
  spotPrice: number; // tokenOut per tokenIn
  effectiveExecutionPrice: number;
  priceImpactPercent: number;
  slippageTolerancePercent: number;
  feeBaseUnits: bigint;
  feeFormatted: string;
  feePercent: number; // 0.25% for PancakeSwap V2
  routerAddress: string;
  factoryAddress: string;
  pairAddress: string | null;
  route: string[];
  estimatedGasUnits: bigint;
  estimatedGasCostBnb: string;
  estimatedGasCostUsd: number;
  hasSufficientLiquidity: boolean;
  warnings: string[];
}

export interface DexSwapParams {
  quote: DexQuoteResult;
  recipientAddress: string;
  deadlineSeconds?: number; // default 300 (5 minutes)
  confirmed: boolean; // explicit user confirmation requirement
}

export interface DexSwapSimulationResult {
  success: boolean;
  canExecute: boolean;
  requiredAllowance: bigint;
  currentAllowance: bigint;
  needsApproval: boolean;
  estimatedGas: bigint;
  gasPriceGwei: string;
  estimatedFeeBnb: string;
  calldata: string;
  routerAddress: string;
  revertReason?: string;
}

export interface DexSwapExecutionReceipt {
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REVERTED';
  txHash: string;
  blockNumber?: number;
  confirmations: number;
  from: string;
  to: string;
  amountIn: string;
  amountOut: string;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  errorMessage?: string;
  networkId: string;
  chainId: number;
  explorerUrl?: string;
}

export interface LiquidityProvisionQuote {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  amountADesired: bigint;
  amountBDesired: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  expectedLpTokens: bigint;
  poolSharePercent: number;
  deadline: number;
  slippagePercent: number;
}

export interface LiquidityRemovalQuote {
  lpTokenAmount: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  expectedAmountA: bigint;
  expectedAmountB: bigint;
  poolShareRemovedPercent: number;
  deadline: number;
  slippagePercent: number;
}

export interface TradeStressResult {
  tradeSizeUSD: number;
  tokenQuantitySold: number;
  pairedAssetReceivedUSD: number;
  expectedExecutionPriceUSD: number;
  postTradeSpotPriceUSD: number;
  priceImpactPercent: number;
  slippagePercent: number;
  feeUSD: number;
  remainingTokenReserve: number;
  remainingPairedReserveUSD: number;
  severity: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
}

export interface LiquidityRemovalStressResult {
  removalPercent: number;
  removedPairedUSD: number;
  remainingPairedUSD: number;
  remainingTokenReserve: number;
  priceImpactOn50DollarTrade: number;
  priceImpactOn100DollarTrade: number;
  isPoolVulnerableToSandwich: boolean;
}

export interface LiquidityStressTestResult {
  totalPoolValueUSD: number;
  pairedReserveUSD: number;
  tokenReserveUSD: number;
  initialSpotPriceUSD: number;
  feeBps: number;
  tradeStressTable: TradeStressResult[];
  removalStressTable: LiquidityRemovalStressResult[];
  arbitrageManipulationThresholds: {
    costToMovePrice5PercentUSD: number;
    costToMovePrice10PercentUSD: number;
    costToMovePrice25PercentUSD: number;
    costToMovePrice50PercentUSD: number;
  };
  redemptionFeasibility: {
    investorCountTested: number;
    averagePrincipalUSD: number;
    totalPrincipalUSD: number;
    availablePairedReserveUSD: number;
    principalDeficitUSD: number;
    principalCoverageRatioPercent: number;
    isSolventForPrincipal: boolean;
  };
}
