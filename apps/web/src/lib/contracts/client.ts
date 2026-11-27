import { createPublicClient, fallback, http, formatUnits, type Address } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import {
  BSC_MAINNET_CONFIG,
  BSC_MAINNET_LIORA_TOKEN_ADDRESS,
  BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS,
  BSC_MAINNET_LIORA_TIMELOCK_ADDRESS,
  BSC_MAINNET_OPERATING_TREASURY_ADDRESS,
  BSC_MAINNET_GOVERNANCE_ADDRESS,
  BSC_TESTNET_CONFIG,
  BSC_TESTNET_TOKEN_ADDRESS,
  BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS,
  BSC_TESTNET_SALE_ADDRESS,
} from '../../config/tokenConfig';
import { OXENIQ_ABI } from './oxeniqAbi';
import { ALLOCATION_MANAGER_ABI } from './allocationManagerAbi';
import { testnetSaleAbi } from './testnetSaleAbi';

/**
 * Ordered BSC Mainnet read-only JSON-RPC endpoints for automatic failover.
 */
export const BSC_MAINNET_RPC_URLS: string[] = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_BSC_MAINNET_RPC,
      BSC_MAINNET_CONFIG.rpcUrl,
      'https://bsc-dataseed1.defibit.io/',
      'https://bsc-dataseed1.ninicoin.io/',
      'https://bsc.publicnode.com',
    ].filter((u): u is string => Boolean(u && u.trim()))
  )
);

/**
 * Dedicated read-only public client for BNB Smart Chain Mainnet (Chain ID 56).
 * Strictly read-only; uses ordered multi-RPC fallback transport to handle single-node rate limits/timeouts.
 */
export const bscMainnetPublicClient = createPublicClient({
  chain: bsc,
  transport: fallback(
    BSC_MAINNET_RPC_URLS.map((url) =>
      http(url, {
        retryCount: 1,
        retryDelay: 500,
        timeout: 10_000,
      })
    ),
    { rank: false, retryCount: 2, retryDelay: 500 }
  ),
});

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

/**
 * Standard ABI for LIORA UUPS Upgradeable ERC-20 on BSC Mainnet.
 */
export const LIORA_TOKEN_ABI = [
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
    name: 'operatingTreasury',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'reserveVault',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

export interface MainnetTokenOverview {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  totalSupplyRaw: bigint;
  operatingTreasuryAddress: string;
  reserveVaultAddress: string;
  timelockAddress: string;
  governanceAddress: string;
  treasuryBalance: string;
  treasuryBalanceRaw: bigint;
  reserveVaultBalance: string;
  reserveVaultBalanceRaw: bigint;
  chainId: number;
  networkName: string;
  explorerUrl: string;
}

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

async function withMainnetRpcTimeout<T>(operation: Promise<T>, label: string, timeoutMs = 15_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`BSC_MAINNET_RPC_TIMEOUT: ${label} timed out after ${timeoutMs}ms across fallback providers.`));
        }, timeoutMs);
      }),
    ]);
  } catch (err: any) {
    if (err?.message?.startsWith('BSC_MAINNET_RPC_TIMEOUT:')) {
      throw err;
    }
    throw new Error(`BSC_MAINNET_RPC_ERROR: ${label} failed (${err?.shortMessage || err?.message || 'Unknown RPC error'}).`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Reads official token overview and treasury balances from BNB Smart Chain Mainnet.
 * Live RPC query at contract 0xE7B7fAd9EFDE37b3c9d47216044ECed6f7fd630A.
 */
export async function fetchMainnetTokenOverview(): Promise<MainnetTokenOverview> {
  const tokenAddr = BSC_MAINNET_LIORA_TOKEN_ADDRESS as Address;
  const treasuryAddr = BSC_MAINNET_OPERATING_TREASURY_ADDRESS as Address;
  const reserveVaultAddr = BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS as Address;

  const [name, symbol, decimals, totalSupply, treasuryBalanceRaw, reserveVaultBalanceRaw] = await withMainnetRpcTimeout(
    Promise.all([
      bscMainnetPublicClient.readContract({
        address: tokenAddr,
        abi: LIORA_TOKEN_ABI,
        functionName: 'name',
      }),
      bscMainnetPublicClient.readContract({
        address: tokenAddr,
        abi: LIORA_TOKEN_ABI,
        functionName: 'symbol',
      }),
      bscMainnetPublicClient.readContract({
        address: tokenAddr,
        abi: LIORA_TOKEN_ABI,
        functionName: 'decimals',
      }),
      bscMainnetPublicClient.readContract({
        address: tokenAddr,
        abi: LIORA_TOKEN_ABI,
        functionName: 'totalSupply',
      }),
      bscMainnetPublicClient.readContract({
        address: tokenAddr,
        abi: LIORA_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [treasuryAddr],
      }),
      bscMainnetPublicClient.readContract({
        address: tokenAddr,
        abi: LIORA_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [reserveVaultAddr],
      }),
    ]),
    'fetchMainnetTokenOverview'
  );

  return {
    address: BSC_MAINNET_LIORA_TOKEN_ADDRESS,
    name,
    symbol,
    decimals,
    totalSupply: formatTokenBalance(totalSupply, decimals),
    totalSupplyRaw: totalSupply,
    operatingTreasuryAddress: BSC_MAINNET_OPERATING_TREASURY_ADDRESS,
    reserveVaultAddress: BSC_MAINNET_LIORA_RESERVE_VAULT_ADDRESS,
    timelockAddress: BSC_MAINNET_LIORA_TIMELOCK_ADDRESS,
    governanceAddress: BSC_MAINNET_GOVERNANCE_ADDRESS,
    treasuryBalance: formatTokenBalance(treasuryBalanceRaw, decimals),
    treasuryBalanceRaw,
    reserveVaultBalance: formatTokenBalance(reserveVaultBalanceRaw, decimals),
    reserveVaultBalanceRaw,
    chainId: 56,
    networkName: 'BNB Smart Chain Mainnet',
    explorerUrl: BSC_MAINNET_CONFIG.explorerUrl,
  };
}

/**
 * Reads user's LIORA token balance from BNB Smart Chain Mainnet.
 */
export async function fetchMainnetUserTokenBalance(
  userAddress: string,
  contractAddress: string = BSC_MAINNET_LIORA_TOKEN_ADDRESS
): Promise<{ raw: bigint; formatted: string }> {
  const raw = await withMainnetRpcTimeout(
    bscMainnetPublicClient.readContract({
      address: contractAddress as Address,
      abi: LIORA_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [userAddress as Address],
    }),
    'fetchMainnetUserTokenBalance'
  );

  return {
    raw,
    formatted: formatTokenBalance(raw, 18),
  };
}
