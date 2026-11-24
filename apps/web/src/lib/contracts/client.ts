import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { bscTestnet } from 'viem/chains';
import {
  BSC_TESTNET_CONFIG,
  BSC_TESTNET_TOKEN_ADDRESS,
  BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS,
  BSC_TESTNET_SALE_ADDRESS,
} from '../../config/tokenConfig';
import { OXENIQ_ABI } from './oxeniqAbi';
import { ALLOCATION_MANAGER_ABI } from './allocationManagerAbi';
import { testnetSaleAbi } from './testnetSaleAbi';

/**
 * Dedicated read-only public client for BNB Smart Chain Testnet.
 * Never connects private keys or submits mutating transactions.
 */
export const bscTestnetPublicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(BSC_TESTNET_CONFIG.rpcUrl, {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 10_000,
  }),
});

export interface OnChainTokenData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  totalSupplyRaw: bigint;
  owner: string;
}

export interface OnChainAllocationData {
  address: string;
  token: string;
  owner: string;
  recipient70: string;
  recipient30: string;
}

export interface OnChainSaleData {
  address: string;
  tokenAddress: string;
  owner: string;
  tokensPerBnb: number;
  availableInventory: bigint;
  availableInventoryFormatted: string;
  isPaused: boolean;
}

/**
 * Exact integer-safe token amount calculation for BNB testnet purchases.
 * Formula: tokensDeliveredWei = bnbWei * tokensPerBnb
 * Both BNB and OXENIQ have 18 decimals, maintaining exact integer precision.
 */
export function calculateTokensForBnb(
  bnbWei: bigint,
  tokensPerBnb: bigint | number = 10000
): bigint {
  if (bnbWei < 0n) throw new Error('BNB amount cannot be negative');
  return bnbWei * BigInt(tokensPerBnb);
}

/**
 * Formats a raw bigint token balance with decimals into a human-readable string.
 * Example: 1000000000000000000000000000n -> "1,000,000,000"
 */
export function formatTokenBalance(rawBalance: bigint | null, decimals: number = 18): string {
  if (rawBalance === null || rawBalance === undefined) return '0.00';
  if (rawBalance === 0n) return '0.00';

  const formattedStr = formatUnits(rawBalance, decimals);
  const parts = formattedStr.split('.');
  const intPartWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (!parts[1] || parts[1] === '0') {
    return intPartWithCommas;
  }

  // Display at most 4 decimal places, trimming trailing zeros
  const decPart = parts[1].slice(0, 4).replace(/0+$/, '');
  return decPart ? `${intPartWithCommas}.${decPart}` : intPartWithCommas;
}

/**
 * Reads token metadata from BSC Testnet OxeniqToken contract.
 */
export async function fetchOnChainTokenMetadata(
  contractAddress: string = BSC_TESTNET_TOKEN_ADDRESS
): Promise<OnChainTokenData> {
  const addr = contractAddress as Address;

  const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: OXENIQ_ABI,
      functionName: 'name',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: OXENIQ_ABI,
      functionName: 'symbol',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: OXENIQ_ABI,
      functionName: 'decimals',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: OXENIQ_ABI,
      functionName: 'totalSupply',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: OXENIQ_ABI,
      functionName: 'owner',
    }),
  ]);

  return {
    address: contractAddress,
    name,
    symbol,
    decimals,
    totalSupply: formatTokenBalance(totalSupply, decimals),
    totalSupplyRaw: totalSupply,
    owner,
  };
}

/**
 * Reads AllocationManager configuration from BSC Testnet.
 */
export async function fetchOnChainAllocationData(
  contractAddress: string = BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS
): Promise<OnChainAllocationData> {
  const addr = contractAddress as Address;

  const [token, owner, recipient70, recipient30] = await Promise.all([
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: ALLOCATION_MANAGER_ABI,
      functionName: 'token',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: ALLOCATION_MANAGER_ABI,
      functionName: 'owner',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: ALLOCATION_MANAGER_ABI,
      functionName: 'recipient70',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: ALLOCATION_MANAGER_ABI,
      functionName: 'recipient30',
    }),
  ]);

  return {
    address: contractAddress,
    token,
    owner,
    recipient70,
    recipient30,
  };
}

/**
 * Reads user's OXENIQ token balance from BSC Testnet.
 */
export async function fetchOnChainUserTokenBalance(
  userAddress: string,
  contractAddress: string = BSC_TESTNET_TOKEN_ADDRESS
): Promise<{ raw: bigint; formatted: string }> {
  const raw = await bscTestnetPublicClient.readContract({
    address: contractAddress as Address,
    abi: OXENIQ_ABI,
    functionName: 'balanceOf',
    args: [userAddress as Address],
  });

  return {
    raw,
    formatted: formatTokenBalance(raw, 18),
  };
}

/**
 * Reads TestnetTokenSale configuration and inventory from BSC Testnet.
 */
export async function fetchOnChainSaleData(
  contractAddress: string = BSC_TESTNET_SALE_ADDRESS
): Promise<OnChainSaleData> {
  if (!contractAddress) {
    throw new Error('Testnet sale contract address is not configured');
  }

  const addr = contractAddress as Address;

  const [tokensPerBnb, inventory, isPaused, token, owner] = await Promise.all([
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: testnetSaleAbi,
      functionName: 'TOKENS_PER_BNB',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: testnetSaleAbi,
      functionName: 'getAvailableInventory',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: testnetSaleAbi,
      functionName: 'paused',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: testnetSaleAbi,
      functionName: 'token',
    }),
    bscTestnetPublicClient.readContract({
      address: addr,
      abi: testnetSaleAbi,
      functionName: 'owner',
    }),
  ]);

  return {
    address: contractAddress,
    tokenAddress: token,
    owner,
    tokensPerBnb: Number(tokensPerBnb),
    availableInventory: inventory,
    availableInventoryFormatted: formatTokenBalance(inventory, 18),
    isPaused,
  };
}
