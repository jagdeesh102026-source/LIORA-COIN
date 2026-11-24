import { createPublicClient, http, formatUnits, parseUnits, type Address, getAddress } from 'viem';
import { bscTestnet } from 'viem/chains';
import {
  BSC_TESTNET_CONFIG,
  BSC_TESTNET_LIORA_TOKEN_ADDRESS,
  BSC_TESTNET_MOCK_USDT_ADDRESS,
  BSC_TESTNET_PANCAKESWAP_PAIR_ADDRESS,
  BSC_TESTNET_PANCAKESWAP_ROUTER_ADDRESS,
  BSC_TESTNET_PANCAKESWAP_FACTORY_ADDRESS,
} from '../../config/tokenConfig';

export const LIORA_TOKEN_ADDRESS = BSC_TESTNET_LIORA_TOKEN_ADDRESS;
export const MOCK_USDT_ADDRESS = BSC_TESTNET_MOCK_USDT_ADDRESS;
export const PANCAKESWAP_PAIR_ADDRESS = BSC_TESTNET_PANCAKESWAP_PAIR_ADDRESS;
export const PANCAKESWAP_ROUTER_ADDRESS = BSC_TESTNET_PANCAKESWAP_ROUTER_ADDRESS;
export const PANCAKESWAP_FACTORY_ADDRESS = BSC_TESTNET_PANCAKESWAP_FACTORY_ADDRESS;
export const ILLUSTRATIVE_USD_INR_RATE = 86.50;

/**
 * Dedicated read-only viem public client connected to BSC Testnet RPC.
 */
export const bscTestnetDEXClient = createPublicClient({
  chain: bscTestnet,
  transport: http(BSC_TESTNET_CONFIG.rpcUrl, {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 10_000,
  }),
});

// ABIs
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export const PANCAKESWAP_PAIR_ABI = [
  {
    type: 'function',
    name: 'getReserves',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
  },
  {
    type: 'function',
    name: 'token0',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'token1',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
] as const;

export const PANCAKESWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'getAmountsOut',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'swapExactTokensForTokens',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'addLiquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'amountADesired', type: 'uint256' },
      { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'removeLiquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'quote',
    stateMutability: 'pure',
    inputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'reserveA', type: 'uint256' },
      { name: 'reserveB', type: 'uint256' },
    ],
    outputs: [{ name: 'amountB', type: 'uint256' }],
  },
] as const;

export interface OnChainPoolState {
  pairAddress: string;
  reserveLiora: bigint;
  reserveUsdt: bigint;
  formattedLiora: string;
  formattedUsdt: string;
  spotPriceUsd: number;
  spotPriceInr: number;
  blockTimestampLast: number;
  isHealthy: boolean;
  token0Address: string;
  token1Address: string;
}

export interface UserTestnetBalances {
  address: string;
  lioraRaw: bigint;
  lioraFormatted: string;
  usdtRaw: bigint;
  usdtFormatted: string;
  bnbRaw: bigint;
  bnbFormatted: string;
  lioraAllowance: bigint;
  usdtAllowance: bigint;
  hasEnoughLioraAllowance: (amount: bigint) => boolean;
  hasEnoughUsdtAllowance: (amount: bigint) => boolean;
}

export interface VerifiedSwapRecord {
  id: string;
  txHash: string;
  direction: 'LIORA -> mUSDT' | 'mUSDT -> LIORA';
  amountIn: string;
  amountOut: string;
  timestamp: number;
  status: 'CONFIRMED' | 'REVERTED' | 'PENDING';
  blockNumber?: number;
  explorerUrl: string;
}

export interface CalculatedSwapQuote {
  direction: 'LIORA -> mUSDT' | 'mUSDT -> LIORA';
  amountInRaw: bigint;
  amountInFormatted: string;
  expectedAmountOutRaw: bigint;
  expectedAmountOutFormatted: string;
  minAmountOutRaw: bigint;
  minAmountOutFormatted: string;
  executionPrice: number;
  spotPrice: number;
  priceImpactPercent: number;
  tradingFeeRaw: bigint;
  tradingFeeFormatted: string;
  slippageTolerancePercent: number;
  hasSufficientLiquidity: boolean;
  error?: string;
}

/**
 * Format bigint units cleanly with thousands separators.
 */
export function formatDecimals(val: bigint, decimals: number = 18, maxFraction: number = 4): string {
  if (val === 0n) return '0.00';
  const formatted = formatUnits(val, decimals);
  const [intPart, decPart] = formatted.split('.');
  const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (!decPart) return intWithCommas;
  const trimmedDec = decPart.slice(0, maxFraction).replace(/0+$/, '');
  return trimmedDec ? `${intWithCommas}.${trimmedDec}` : intWithCommas;
}

/**
 * Reads live on-chain pool reserves directly from PancakeSwap V2 Pair.
 */
export async function fetchOnChainPoolState(): Promise<OnChainPoolState> {
  const pairAddr = getAddress(PANCAKESWAP_PAIR_ADDRESS) as Address;

  const [reserves, token0, token1] = await Promise.all([
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'getReserves',
    }),
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'token0',
    }),
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'token1',
    }),
  ]);

  const [reserve0, reserve1, blockTimestampLast] = reserves;
  const isToken0Usdt = token0.toLowerCase() === MOCK_USDT_ADDRESS.toLowerCase();

  const reserveUsdt = isToken0Usdt ? BigInt(reserve0) : BigInt(reserve1);
  const reserveLiora = isToken0Usdt ? BigInt(reserve1) : BigInt(reserve0);

  const numUsdt = parseFloat(formatUnits(reserveUsdt, 18));
  const numLiora = parseFloat(formatUnits(reserveLiora, 18));

  const spotPriceUsd = numLiora > 0 ? numUsdt / numLiora : 0;
  const spotPriceInr = spotPriceUsd * ILLUSTRATIVE_USD_INR_RATE;

  return {
    pairAddress: PANCAKESWAP_PAIR_ADDRESS,
    reserveLiora,
    reserveUsdt,
    formattedLiora: formatDecimals(reserveLiora, 18, 2),
    formattedUsdt: formatDecimals(reserveUsdt, 18, 2),
    spotPriceUsd: Number(spotPriceUsd.toFixed(8)),
    spotPriceInr: Number(spotPriceInr.toFixed(4)),
    blockTimestampLast: Number(blockTimestampLast),
    isHealthy: reserveLiora > 0n && reserveUsdt > 0n,
    token0Address: token0,
    token1Address: token1,
  };
}

/**
 * Reads live on-chain token balances and allowances for a connected wallet.
 */
export async function fetchUserTestnetBalances(userAddress: string): Promise<UserTestnetBalances> {
  if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    return {
      address: userAddress || '',
      lioraRaw: 0n,
      lioraFormatted: '0.00',
      usdtRaw: 0n,
      usdtFormatted: '0.00',
      bnbRaw: 0n,
      bnbFormatted: '0.00',
      lioraAllowance: 0n,
      usdtAllowance: 0n,
      hasEnoughLioraAllowance: () => false,
      hasEnoughUsdtAllowance: () => false,
    };
  }

  const user = getAddress(userAddress) as Address;
  const lioraAddr = getAddress(LIORA_TOKEN_ADDRESS) as Address;
  const usdtAddr = getAddress(MOCK_USDT_ADDRESS) as Address;
  const routerAddr = getAddress(PANCAKESWAP_ROUTER_ADDRESS) as Address;

  const [lioraBal, usdtBal, bnbBal, lioraAllow, usdtAllow] = await Promise.all([
    bscTestnetDEXClient.readContract({
      address: lioraAddr,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [user],
    }),
    bscTestnetDEXClient.readContract({
      address: usdtAddr,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [user],
    }),
    bscTestnetDEXClient.getBalance({ address: user }),
    bscTestnetDEXClient.readContract({
      address: lioraAddr,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [user, routerAddr],
    }),
    bscTestnetDEXClient.readContract({
      address: usdtAddr,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [user, routerAddr],
    }),
  ]);

  return {
    address: userAddress,
    lioraRaw: lioraBal,
    lioraFormatted: formatDecimals(lioraBal, 18, 4),
    usdtRaw: usdtBal,
    usdtFormatted: formatDecimals(usdtBal, 18, 4),
    bnbRaw: bnbBal,
    bnbFormatted: formatDecimals(bnbBal, 18, 4),
    lioraAllowance: lioraAllow,
    usdtAllowance: usdtAllow,
    hasEnoughLioraAllowance: (amount: bigint) => lioraAllow >= amount,
    hasEnoughUsdtAllowance: (amount: bigint) => usdtAllow >= amount,
  };
}

/**
 * Calculates exact PancakeSwap V2 quote with 0.25% fee and constant product formula.
 */
export function calculateOnChainSwapQuote(
  direction: 'LIORA -> mUSDT' | 'mUSDT -> LIORA',
  amountInInput: string,
  slippageTolerancePercent: number,
  pool: OnChainPoolState
): CalculatedSwapQuote {
  const isLioraToUsdt = direction === 'LIORA -> mUSDT';
  const reserveIn = isLioraToUsdt ? pool.reserveLiora : pool.reserveUsdt;
  const reserveOut = isLioraToUsdt ? pool.reserveUsdt : pool.reserveLiora;

  const numInput = parseFloat(amountInInput) || 0;
  if (numInput <= 0) {
    return {
      direction,
      amountInRaw: 0n,
      amountInFormatted: '0.00',
      expectedAmountOutRaw: 0n,
      expectedAmountOutFormatted: '0.00',
      minAmountOutRaw: 0n,
      minAmountOutFormatted: '0.00',
      executionPrice: 0,
      spotPrice: pool.spotPriceUsd,
      priceImpactPercent: 0,
      tradingFeeRaw: 0n,
      tradingFeeFormatted: '0.00',
      slippageTolerancePercent,
      hasSufficientLiquidity: pool.isHealthy,
    };
  }

  let amountInRaw: bigint;
  try {
    amountInRaw = parseUnits(amountInInput, 18);
  } catch {
    return {
      direction,
      amountInRaw: 0n,
      amountInFormatted: '0.00',
      expectedAmountOutRaw: 0n,
      expectedAmountOutFormatted: '0.00',
      minAmountOutRaw: 0n,
      minAmountOutFormatted: '0.00',
      executionPrice: 0,
      spotPrice: pool.spotPriceUsd,
      priceImpactPercent: 0,
      tradingFeeRaw: 0n,
      tradingFeeFormatted: '0.00',
      slippageTolerancePercent,
      hasSufficientLiquidity: false,
      error: 'Invalid numerical input',
    };
  }

  // Check liquidity
  if (reserveIn <= 0n || reserveOut <= 0n) {
    return {
      direction,
      amountInRaw,
      amountInFormatted: amountInInput,
      expectedAmountOutRaw: 0n,
      expectedAmountOutFormatted: '0.00',
      minAmountOutRaw: 0n,
      minAmountOutFormatted: '0.00',
      executionPrice: 0,
      spotPrice: 0,
      priceImpactPercent: 0,
      tradingFeeRaw: 0n,
      tradingFeeFormatted: '0.00',
      slippageTolerancePercent,
      hasSufficientLiquidity: false,
      error: 'Insufficient pool liquidity',
    };
  }

  // Exact PancakeSwap V2 math:
  // amountInWithFee = amountIn * 9975
  // numerator = amountInWithFee * reserveOut
  // denominator = (reserveIn * 10000) + amountInWithFee
  // amountOut = numerator / denominator
  const amountInWithFee = amountInRaw * 9975n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = (reserveIn * 10000n) + amountInWithFee;
  const expectedAmountOutRaw = numerator / denominator;

  // Slippage
  const slippageBps = BigInt(Math.round(slippageTolerancePercent * 100));
  const minAmountOutRaw = (expectedAmountOutRaw * (10000n - slippageBps)) / 10000n;

  // Fee calculation (0.25% of input)
  const tradingFeeRaw = (amountInRaw * 25n) / 10000n;

  // Numerical metrics
  const numIn = parseFloat(formatUnits(amountInRaw, 18));
  const numOut = parseFloat(formatUnits(expectedAmountOutRaw, 18));
  const numResIn = parseFloat(formatUnits(reserveIn, 18));
  const numResOut = parseFloat(formatUnits(reserveOut, 18));

  const spotPrice = numResIn > 0 ? numResOut / numResIn : 0;
  const executionPrice = numIn > 0 ? numOut / numIn : 0;
  const priceImpactPercent = spotPrice > 0 ? Math.max(0, ((spotPrice - executionPrice) / spotPrice) * 100) : 0;

  return {
    direction,
    amountInRaw,
    amountInFormatted: amountInInput,
    expectedAmountOutRaw,
    expectedAmountOutFormatted: formatUnits(expectedAmountOutRaw, 18),
    minAmountOutRaw,
    minAmountOutFormatted: formatUnits(minAmountOutRaw, 18),
    executionPrice: Number(executionPrice.toFixed(8)),
    spotPrice: Number(spotPrice.toFixed(8)),
    priceImpactPercent: Number(priceImpactPercent.toFixed(4)),
    tradingFeeRaw,
    tradingFeeFormatted: formatUnits(tradingFeeRaw, 18),
    slippageTolerancePercent,
    hasSufficientLiquidity: true,
  };
}

/**
 * Initial historical swaps recorded during Gate C5 verification.
 */
export const INITIAL_VERIFIED_SWAPS: VerifiedSwapRecord[] = [
  {
    id: 'c5_swap_1',
    txHash: '0x40f7a98ac32fe4ab7ad5ce7a55b81e47945aee1c682da1f8c82417a7a87ad315',
    direction: 'LIORA -> mUSDT',
    amountIn: '10.0 LIORA',
    amountOut: '0.023074 mUSDT',
    timestamp: 1731759421000,
    status: 'CONFIRMED',
    blockNumber: 143063078,
    explorerUrl: 'https://testnet.bscscan.com/tx/0x40f7a98ac32fe4ab7ad5ce7a55b81e47945aee1c682da1f8c82417a7a87ad315',
  },
  {
    id: 'c5_swap_2',
    txHash: '0x6b39b1f4484cc76fcbf1a8b7a78e495422bec4b5e224691de276d52b24993a2f',
    direction: 'mUSDT -> LIORA',
    amountIn: '1.0 mUSDT',
    amountOut: '430.8149 LIORA',
    timestamp: 1731759428000,
    status: 'CONFIRMED',
    blockNumber: 143063092,
    explorerUrl: 'https://testnet.bscscan.com/tx/0x6b39b1f4484cc76fcbf1a8b7a78e495422bec4b5e224691de276d52b24993a2f',
  },
];

/**
 * Loads verified swap history for a wallet, seeded with verified on-chain history.
 */
export function getWalletSwapHistory(userAddress?: string | null): VerifiedSwapRecord[] {
  if (typeof window === 'undefined') return INITIAL_VERIFIED_SWAPS;

  const storageKey = userAddress
    ? `liora_testnet_swaps_${userAddress.toLowerCase()}`
    : 'liora_testnet_swaps_global';

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return INITIAL_VERIFIED_SWAPS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_VERIFIED_SWAPS;
  } catch {
    return INITIAL_VERIFIED_SWAPS;
  }
}

/**
 * Saves a new confirmed swap record to local wallet history.
 */
export function saveWalletSwapRecord(userAddress: string, record: VerifiedSwapRecord): void {
  if (typeof window === 'undefined') return;
  const storageKey = `liora_testnet_swaps_${userAddress.toLowerCase()}`;
  try {
    const existing = getWalletSwapHistory(userAddress);
    // Deduplicate by txHash
    const updated = [record, ...existing.filter((item) => item.txHash !== record.txHash)];
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save swap record in localStorage:', err);
  }
}

// ==============================================================================
// GATE C7: LIQUIDITY MANAGEMENT INTERFACES & CALCULATION ENGINE
// ==============================================================================

export interface OnChainLiquidityPoolState {
  pairAddress: string;
  reserveLiora: bigint;
  reserveUsdt: bigint;
  formattedLiora: string;
  formattedUsdt: string;
  totalLpSupply: bigint;
  formattedTotalLpSupply: string;
  ratioLioraPerUsdt: number;
  ratioUsdtPerLiora: number;
  spotPriceUsd: number;
  spotPriceInr: number;
  blockTimestampLast: number;
  isHealthy: boolean;
  token0Address: string;
  token1Address: string;
}

export interface UserLiquidityPosition {
  userAddress: string;
  lpBalanceRaw: bigint;
  lpBalanceFormatted: string;
  poolSharePercent: number;
  underlyingLioraRaw: bigint;
  underlyingLioraFormatted: string;
  underlyingUsdtRaw: bigint;
  underlyingUsdtFormatted: string;
  lpAllowanceRouter: bigint;
  hasEnoughLpAllowance: (amount: bigint) => boolean;
  lioraBalanceRaw: bigint;
  lioraBalanceFormatted: string;
  usdtBalanceRaw: bigint;
  usdtBalanceFormatted: string;
  bnbBalanceRaw: bigint;
  bnbBalanceFormatted: string;
  lioraAllowanceRouter: bigint;
  usdtAllowanceRouter: bigint;
  hasEnoughLioraAllowance: (amount: bigint) => boolean;
  hasEnoughUsdtAllowance: (amount: bigint) => boolean;
}

export interface AddLiquidityQuote {
  inputField: 'LIORA' | 'mUSDT';
  amountLioraRaw: bigint;
  amountLioraFormatted: string;
  amountUsdtRaw: bigint;
  amountUsdtFormatted: string;
  amountLioraMinRaw: bigint;
  amountLioraMinFormatted: string;
  amountUsdtMinRaw: bigint;
  amountUsdtMinFormatted: string;
  expectedLpMintedRaw: bigint;
  expectedLpMintedFormatted: string;
  poolShareAfterAddPercent: number;
  slippageTolerancePercent: number;
  ratioLioraPerUsdt: number;
  ratioUsdtPerLiora: number;
  hasSufficientLioraBalance: boolean;
  hasSufficientUsdtBalance: boolean;
  hasSufficientBnbGas: boolean;
  needsLioraApproval: boolean;
  needsUsdtApproval: boolean;
  isValid: boolean;
  error?: string;
}

export interface RemoveLiquidityQuote {
  withdrawPercent: number;
  lpBurnAmountRaw: bigint;
  lpBurnAmountFormatted: string;
  expectedLioraRaw: bigint;
  expectedLioraFormatted: string;
  expectedUsdtRaw: bigint;
  expectedUsdtFormatted: string;
  minLioraRaw: bigint;
  minLioraFormatted: string;
  minUsdtRaw: bigint;
  minUsdtFormatted: string;
  slippageTolerancePercent: number;
  hasEnoughLpBalance: boolean;
  needsLpApproval: boolean;
  isValid: boolean;
  error?: string;
}

export interface VerifiedLiquidityRecord {
  id: string;
  txHash: string;
  type: 'ADD_LIQUIDITY' | 'REMOVE_LIQUIDITY';
  amountLiora: string;
  amountUsdt: string;
  lpAmount: string;
  timestamp: number;
  status: 'CONFIRMED' | 'REVERTED' | 'PENDING';
  blockNumber?: number;
  explorerUrl: string;
}

/**
 * Reads live on-chain liquidity pool state including total LP token supply.
 */
export async function fetchOnChainLiquidityPoolState(): Promise<OnChainLiquidityPoolState> {
  const pairAddr = getAddress(PANCAKESWAP_PAIR_ADDRESS) as Address;

  const [reserves, token0, token1, totalLp] = await Promise.all([
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'getReserves',
    }),
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'token0',
    }),
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'token1',
    }),
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'totalSupply',
    }),
  ]);

  const [reserve0, reserve1, blockTimestampLast] = reserves;
  const isToken0Usdt = token0.toLowerCase() === MOCK_USDT_ADDRESS.toLowerCase();

  const reserveUsdt = isToken0Usdt ? BigInt(reserve0) : BigInt(reserve1);
  const reserveLiora = isToken0Usdt ? BigInt(reserve1) : BigInt(reserve0);
  const totalLpSupply = BigInt(totalLp);

  const numUsdt = parseFloat(formatUnits(reserveUsdt, 18));
  const numLiora = parseFloat(formatUnits(reserveLiora, 18));

  const ratioLioraPerUsdt = numUsdt > 0 ? numLiora / numUsdt : 0;
  const ratioUsdtPerLiora = numLiora > 0 ? numUsdt / numLiora : 0;
  const spotPriceUsd = ratioUsdtPerLiora;
  const spotPriceInr = spotPriceUsd * ILLUSTRATIVE_USD_INR_RATE;

  return {
    pairAddress: PANCAKESWAP_PAIR_ADDRESS,
    reserveLiora,
    reserveUsdt,
    formattedLiora: formatDecimals(reserveLiora, 18, 2),
    formattedUsdt: formatDecimals(reserveUsdt, 18, 2),
    totalLpSupply,
    formattedTotalLpSupply: formatDecimals(totalLpSupply, 18, 4),
    ratioLioraPerUsdt: Number(ratioLioraPerUsdt.toFixed(4)),
    ratioUsdtPerLiora: Number(ratioUsdtPerLiora.toFixed(8)),
    spotPriceUsd: Number(spotPriceUsd.toFixed(8)),
    spotPriceInr: Number(spotPriceInr.toFixed(4)),
    blockTimestampLast: Number(blockTimestampLast),
    isHealthy: reserveLiora > 0n && reserveUsdt > 0n && totalLpSupply > 0n,
    token0Address: token0,
    token1Address: token1,
  };
}

/**
 * Reads live on-chain LP tokens, token balances, and router allowances for a user.
 */
export async function fetchUserLiquidityPosition(userAddress: string): Promise<UserLiquidityPosition> {
  const defaultEmpty: UserLiquidityPosition = {
    userAddress: userAddress || '',
    lpBalanceRaw: 0n,
    lpBalanceFormatted: '0.00',
    poolSharePercent: 0,
    underlyingLioraRaw: 0n,
    underlyingLioraFormatted: '0.00',
    underlyingUsdtRaw: 0n,
    underlyingUsdtFormatted: '0.00',
    lpAllowanceRouter: 0n,
    hasEnoughLpAllowance: () => false,
    lioraBalanceRaw: 0n,
    lioraBalanceFormatted: '0.00',
    usdtBalanceRaw: 0n,
    usdtBalanceFormatted: '0.00',
    bnbBalanceRaw: 0n,
    bnbBalanceFormatted: '0.00',
    lioraAllowanceRouter: 0n,
    usdtAllowanceRouter: 0n,
    hasEnoughLioraAllowance: () => false,
    hasEnoughUsdtAllowance: () => false,
  };

  if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    return defaultEmpty;
  }

  const user = getAddress(userAddress) as Address;
  const pairAddr = getAddress(PANCAKESWAP_PAIR_ADDRESS) as Address;
  const lioraAddr = getAddress(LIORA_TOKEN_ADDRESS) as Address;
  const usdtAddr = getAddress(MOCK_USDT_ADDRESS) as Address;
  const routerAddr = getAddress(PANCAKESWAP_ROUTER_ADDRESS) as Address;

  const [
    lpBal,
    totalLp,
    reserves,
    token0,
    lpAllow,
    lioraBal,
    usdtBal,
    bnbBal,
    lioraAllow,
    usdtAllow,
  ] = await Promise.all([
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'balanceOf',
      args: [user],
    }),
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'totalSupply',
    }),
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'getReserves',
    }),
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'token0',
    }),
    bscTestnetDEXClient.readContract({
      address: pairAddr,
      abi: PANCAKESWAP_PAIR_ABI,
      functionName: 'allowance',
      args: [user, routerAddr],
    }),
    bscTestnetDEXClient.readContract({
      address: lioraAddr,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [user],
    }),
    bscTestnetDEXClient.readContract({
      address: usdtAddr,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [user],
    }),
    bscTestnetDEXClient.getBalance({ address: user }),
    bscTestnetDEXClient.readContract({
      address: lioraAddr,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [user, routerAddr],
    }),
    bscTestnetDEXClient.readContract({
      address: usdtAddr,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [user, routerAddr],
    }),
  ]);

  const [reserve0, reserve1] = reserves;
  const isToken0Usdt = token0.toLowerCase() === MOCK_USDT_ADDRESS.toLowerCase();
  const reserveUsdt = isToken0Usdt ? BigInt(reserve0) : BigInt(reserve1);
  const reserveLiora = isToken0Usdt ? BigInt(reserve1) : BigInt(reserve0);
  const totalLpSupply = BigInt(totalLp);
  const userLp = BigInt(lpBal);

  let poolSharePercent = 0;
  let underlyingLioraRaw = 0n;
  let underlyingUsdtRaw = 0n;

  if (totalLpSupply > 0n && userLp > 0n) {
    poolSharePercent = Number((userLp * 1000000n) / totalLpSupply) / 10000;
    underlyingLioraRaw = (userLp * reserveLiora) / totalLpSupply;
    underlyingUsdtRaw = (userLp * reserveUsdt) / totalLpSupply;
  }

  return {
    userAddress,
    lpBalanceRaw: userLp,
    lpBalanceFormatted: formatDecimals(userLp, 18, 4),
    poolSharePercent,
    underlyingLioraRaw,
    underlyingLioraFormatted: formatDecimals(underlyingLioraRaw, 18, 2),
    underlyingUsdtRaw,
    underlyingUsdtFormatted: formatDecimals(underlyingUsdtRaw, 18, 2),
    lpAllowanceRouter: BigInt(lpAllow),
    hasEnoughLpAllowance: (amount: bigint) => BigInt(lpAllow) >= amount,
    lioraBalanceRaw: BigInt(lioraBal),
    lioraBalanceFormatted: formatDecimals(BigInt(lioraBal), 18, 2),
    usdtBalanceRaw: BigInt(usdtBal),
    usdtBalanceFormatted: formatDecimals(BigInt(usdtBal), 18, 2),
    bnbBalanceRaw: BigInt(bnbBal),
    bnbBalanceFormatted: formatDecimals(BigInt(bnbBal), 18, 4),
    lioraAllowanceRouter: BigInt(lioraAllow),
    usdtAllowanceRouter: BigInt(usdtAllow),
    hasEnoughLioraAllowance: (amount: bigint) => BigInt(lioraAllow) >= amount,
    hasEnoughUsdtAllowance: (amount: bigint) => BigInt(usdtAllow) >= amount,
  };
}

/**
 * Calculates exact constant-ratio Add Liquidity quote adhering to PancakeSwap V2 invariant.
 */
export function calculateAddLiquidityQuote(
  inputField: 'LIORA' | 'mUSDT',
  amountInput: string,
  slippageTolerancePercent: number,
  pool: OnChainLiquidityPoolState,
  userPosition?: UserLiquidityPosition | null
): AddLiquidityQuote {
  const numInput = parseFloat(amountInput) || 0;
  const clampedSlippage = Math.max(0.1, Math.min(20, slippageTolerancePercent || 0.5));
  const slippageBps = BigInt(Math.round(clampedSlippage * 100));

  const fallback: AddLiquidityQuote = {
    inputField,
    amountLioraRaw: 0n,
    amountLioraFormatted: '0.00',
    amountUsdtRaw: 0n,
    amountUsdtFormatted: '0.00',
    amountLioraMinRaw: 0n,
    amountLioraMinFormatted: '0.00',
    amountUsdtMinRaw: 0n,
    amountUsdtMinFormatted: '0.00',
    expectedLpMintedRaw: 0n,
    expectedLpMintedFormatted: '0.00',
    poolShareAfterAddPercent: 0,
    slippageTolerancePercent: clampedSlippage,
    ratioLioraPerUsdt: pool.ratioLioraPerUsdt,
    ratioUsdtPerLiora: pool.ratioUsdtPerLiora,
    hasSufficientLioraBalance: false,
    hasSufficientUsdtBalance: false,
    hasSufficientBnbGas: false,
    needsLioraApproval: true,
    needsUsdtApproval: true,
    isValid: false,
    error: numInput <= 0 ? 'Enter an amount' : undefined,
  };

  if (numInput <= 0 || !pool.isHealthy || pool.reserveLiora === 0n || pool.reserveUsdt === 0n) {
    return fallback;
  }

  let amountLioraRaw = 0n;
  let amountUsdtRaw = 0n;

  try {
    if (inputField === 'LIORA') {
      amountLioraRaw = parseUnits(amountInput, 18);
      amountUsdtRaw = (amountLioraRaw * pool.reserveUsdt) / pool.reserveLiora;
    } else {
      amountUsdtRaw = parseUnits(amountInput, 18);
      amountLioraRaw = (amountUsdtRaw * pool.reserveLiora) / pool.reserveUsdt;
    }
  } catch {
    return { ...fallback, error: 'Invalid input format' };
  }

  if (amountLioraRaw === 0n || amountUsdtRaw === 0n) {
    return fallback;
  }

  const amountLioraMinRaw = (amountLioraRaw * (10000n - slippageBps)) / 10000n;
  const amountUsdtMinRaw = (amountUsdtRaw * (10000n - slippageBps)) / 10000n;

  // Expected LP tokens minted: min((A * totalLP) / reserveA, (B * totalLP) / reserveB)
  const lpFromLiora = pool.totalLpSupply > 0n ? (amountLioraRaw * pool.totalLpSupply) / pool.reserveLiora : 0n;
  const lpFromUsdt = pool.totalLpSupply > 0n ? (amountUsdtRaw * pool.totalLpSupply) / pool.reserveUsdt : 0n;
  const expectedLpMintedRaw = lpFromLiora < lpFromUsdt ? lpFromLiora : lpFromUsdt;

  const userCurrentLp = userPosition ? userPosition.lpBalanceRaw : 0n;
  const newTotalLp = pool.totalLpSupply + expectedLpMintedRaw;
  const poolShareAfterAddPercent =
    newTotalLp > 0n
      ? Number(((userCurrentLp + expectedLpMintedRaw) * 1000000n) / newTotalLp) / 10000
      : 0;

  const hasSufficientLioraBalance = userPosition ? userPosition.lioraBalanceRaw >= amountLioraRaw : false;
  const hasSufficientUsdtBalance = userPosition ? userPosition.usdtBalanceRaw >= amountUsdtRaw : false;
  const hasSufficientBnbGas = userPosition ? userPosition.bnbBalanceRaw > 0n : false;

  const needsLioraApproval = userPosition ? userPosition.lioraAllowanceRouter < amountLioraRaw : true;
  const needsUsdtApproval = userPosition ? userPosition.usdtAllowanceRouter < amountUsdtRaw : true;

  const error = !hasSufficientLioraBalance
    ? 'Insufficient LIORA token balance'
    : !hasSufficientUsdtBalance
    ? 'Insufficient mUSDT token balance'
    : undefined;

  return {
    inputField,
    amountLioraRaw,
    amountLioraFormatted: formatUnits(amountLioraRaw, 18),
    amountUsdtRaw,
    amountUsdtFormatted: formatUnits(amountUsdtRaw, 18),
    amountLioraMinRaw,
    amountLioraMinFormatted: formatUnits(amountLioraMinRaw, 18),
    amountUsdtMinRaw,
    amountUsdtMinFormatted: formatUnits(amountUsdtMinRaw, 18),
    expectedLpMintedRaw,
    expectedLpMintedFormatted: formatDecimals(expectedLpMintedRaw, 18, 4),
    poolShareAfterAddPercent,
    slippageTolerancePercent: clampedSlippage,
    ratioLioraPerUsdt: pool.ratioLioraPerUsdt,
    ratioUsdtPerLiora: pool.ratioUsdtPerLiora,
    hasSufficientLioraBalance,
    hasSufficientUsdtBalance,
    hasSufficientBnbGas,
    needsLioraApproval,
    needsUsdtApproval,
    isValid: true,
    error,
  };
}

/**
 * Calculates exact Remove Liquidity redemption amounts for a percentage or LP amount.
 */
export function calculateRemoveLiquidityQuote(
  withdrawPercent: number,
  customLpInput: string,
  slippageTolerancePercent: number,
  pool: OnChainLiquidityPoolState,
  userPosition?: UserLiquidityPosition | null
): RemoveLiquidityQuote {
  const userLpBalance = userPosition ? userPosition.lpBalanceRaw : 0n;
  const clampedSlippage = Math.max(0.1, Math.min(20, slippageTolerancePercent || 0.5));
  const slippageBps = BigInt(Math.round(clampedSlippage * 100));

  const fallback: RemoveLiquidityQuote = {
    withdrawPercent,
    lpBurnAmountRaw: 0n,
    lpBurnAmountFormatted: '0.00',
    expectedLioraRaw: 0n,
    expectedLioraFormatted: '0.00',
    expectedUsdtRaw: 0n,
    expectedUsdtFormatted: '0.00',
    minLioraRaw: 0n,
    minLioraFormatted: '0.00',
    minUsdtRaw: 0n,
    minUsdtFormatted: '0.00',
    slippageTolerancePercent: clampedSlippage,
    hasEnoughLpBalance: false,
    needsLpApproval: true,
    isValid: false,
    error: userLpBalance === 0n ? 'No LP tokens to withdraw' : undefined,
  };

  if (!pool.isHealthy || pool.totalLpSupply === 0n) {
    return fallback;
  }

  let lpBurnAmountRaw = 0n;

  if (withdrawPercent > 0) {
    const clampedPct = Math.min(100, Math.max(1, withdrawPercent));
    lpBurnAmountRaw = (userLpBalance * BigInt(Math.round(clampedPct * 100))) / 10000n;
  } else if (customLpInput && parseFloat(customLpInput) > 0) {
    try {
      lpBurnAmountRaw = parseUnits(customLpInput, 18);
    } catch {
      return { ...fallback, error: 'Invalid LP amount' };
    }
  }

  if (lpBurnAmountRaw <= 0n) {
    return { ...fallback, error: 'Select a withdrawal percentage or enter LP amount' };
  }

  const hasEnoughLpBalance = userLpBalance >= lpBurnAmountRaw;
  if (!hasEnoughLpBalance) {
    return {
      ...fallback,
      lpBurnAmountRaw,
      lpBurnAmountFormatted: formatDecimals(lpBurnAmountRaw, 18, 4),
      hasEnoughLpBalance: false,
      error: 'Withdrawal amount exceeds owned LP token balance',
    };
  }

  const expectedLioraRaw = (lpBurnAmountRaw * pool.reserveLiora) / pool.totalLpSupply;
  const expectedUsdtRaw = (lpBurnAmountRaw * pool.reserveUsdt) / pool.totalLpSupply;

  const minLioraRaw = (expectedLioraRaw * (10000n - slippageBps)) / 10000n;
  const minUsdtRaw = (expectedUsdtRaw * (10000n - slippageBps)) / 10000n;

  const needsLpApproval = userPosition ? userPosition.lpAllowanceRouter < lpBurnAmountRaw : true;

  return {
    withdrawPercent,
    lpBurnAmountRaw,
    lpBurnAmountFormatted: formatDecimals(lpBurnAmountRaw, 18, 4),
    expectedLioraRaw,
    expectedLioraFormatted: formatDecimals(expectedLioraRaw, 18, 2),
    expectedUsdtRaw,
    expectedUsdtFormatted: formatDecimals(expectedUsdtRaw, 18, 2),
    minLioraRaw,
    minLioraFormatted: formatDecimals(minLioraRaw, 18, 2),
    minUsdtRaw,
    minUsdtFormatted: formatDecimals(minUsdtRaw, 18, 2),
    slippageTolerancePercent: clampedSlippage,
    hasEnoughLpBalance: true,
    needsLpApproval,
    isValid: true,
  };
}

/**
 * Initial historical liquidity provisioning recorded during Gate C5 verification.
 */
export const INITIAL_VERIFIED_LIQUIDITY: VerifiedLiquidityRecord[] = [
  {
    id: 'c5_initial_pool_provision',
    txHash: '0x33cc7b5ba77eb874aeb9ae54394c8e7ef9206774c845b46e3e579737fa148ea6',
    type: 'ADD_LIQUIDITY',
    amountLiora: '216,250.0 LIORA',
    amountUsdt: '500.0 mUSDT',
    lpAmount: '10,398.317 Cake-LP',
    timestamp: 1731759346000,
    status: 'CONFIRMED',
    blockNumber: 143062946,
    explorerUrl: 'https://testnet.bscscan.com/tx/0x33cc7b5ba77eb874aeb9ae54394c8e7ef9206774c845b46e3e579737fa148ea6',
  },
];

/**
 * Loads verified liquidity history for a wallet, seeded with verified on-chain history.
 */
export function getWalletLiquidityHistory(userAddress?: string | null): VerifiedLiquidityRecord[] {
  if (typeof window === 'undefined') return INITIAL_VERIFIED_LIQUIDITY;

  const storageKey = userAddress
    ? `liora_testnet_liquidity_${userAddress.toLowerCase()}`
    : 'liora_testnet_liquidity_global';

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return INITIAL_VERIFIED_LIQUIDITY;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_VERIFIED_LIQUIDITY;
  } catch {
    return INITIAL_VERIFIED_LIQUIDITY;
  }
}

/**
 * Saves a new confirmed liquidity record to local wallet history.
 */
export function saveWalletLiquidityRecord(userAddress: string, record: VerifiedLiquidityRecord): void {
  if (typeof window === 'undefined') return;
  const storageKey = `liora_testnet_liquidity_${userAddress.toLowerCase()}`;
  try {
    const existing = getWalletLiquidityHistory(userAddress);
    // Deduplicate by txHash
    const updated = [record, ...existing.filter((item) => item.txHash !== record.txHash)];
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save liquidity record in localStorage:', err);
  }
}
