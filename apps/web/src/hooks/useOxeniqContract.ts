'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3Wallet } from './useWeb3Wallet';
import {
  fetchOnChainTokenMetadata,
  fetchOnChainAllocationData,
  fetchOnChainSaleData,
  fetchOnChainUserTokenBalance,
  fetchMainnetTokenOverview,
  fetchMainnetUserTokenBalance,
  type OnChainTokenData,
  type OnChainAllocationData,
  type OnChainSaleData,
  type MainnetTokenOverview,
} from '../lib/contracts/client';
import {
  BSC_MAINNET_LIORA_TOKEN_ADDRESS,
  BSC_MAINNET_CONFIG,
  BSC_TESTNET_TOKEN_ADDRESS,
  BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS,
  BSC_TESTNET_SALE_ADDRESS,
} from '../config/tokenConfig';

export interface OxeniqContractState {
  isLoading: boolean;
  isBalanceLoading: boolean;
  error: string | null;
  balanceError: string | null;
  tokenData: OnChainTokenData | null;
  mainnetOverview: MainnetTokenOverview | null;
  allocationData: OnChainAllocationData | null;
  saleData: OnChainSaleData | null;
  userBalance: string | null;
  userBalanceRaw: bigint | null;
  isTestnet: boolean;
  isMainnet: boolean;
  tokenAddress: string;
  mainnetTokenAddress: string;
  allocationManagerAddress: string;
  saleAddress: string;
  isWalletConnected: boolean;
  isWalletOnBscTestnet: boolean;
  isWalletOnBscMainnet: boolean;
  isWrongNetwork: boolean;
  walletNetworkError: string | null;
  refresh: () => Promise<void>;
  refreshUserBalance: () => Promise<void>;
}

export function useOxeniqContract(): OxeniqContractState {
  const { address, isConnected, chainId, isBscTestnet, isBscMainnet, isWrongNetwork, chainName } = useWeb3Wallet();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [tokenData, setTokenData] = useState<OnChainTokenData | null>(null);
  const [mainnetOverview, setMainnetOverview] = useState<MainnetTokenOverview | null>(null);
  const [allocationData, setAllocationData] = useState<OnChainAllocationData | null>(null);
  const [saleData, setSaleData] = useState<OnChainSaleData | null>(null);

  const [userBalance, setUserBalance] = useState<string | null>(null);
  const [userBalanceRaw, setUserBalanceRaw] = useState<bigint | null>(null);

  // Compute network error description
  const walletNetworkError = isConnected && !isBscMainnet && !isBscTestnet
    ? `Wallet is connected to ${chainName || `Chain #${chainId}`}. Connect to BNB Smart Chain Mainnet (Chain ID 56) or Testnet (Chain ID 97) to view your token balance.`
    : null;

  // Fetch user balance
  const loadUserBalance = useCallback(async () => {
    if (!isConnected || !address) {
      setUserBalance(null);
      setUserBalanceRaw(null);
      setBalanceError(null);
      setIsBalanceLoading(false);
      return;
    }

    setIsBalanceLoading(true);
    setBalanceError(null);

    try {
      if (isBscMainnet || (!isBscTestnet && chainId === 56)) {
        // Query official Mainnet token balance
        const balanceRes = await fetchMainnetUserTokenBalance(address, BSC_MAINNET_LIORA_TOKEN_ADDRESS);
        setUserBalance(balanceRes.formatted);
        setUserBalanceRaw(balanceRes.raw);
      } else if (isBscTestnet) {
        // Query testnet token balance
        const balanceRes = await fetchOnChainUserTokenBalance(address, BSC_TESTNET_TOKEN_ADDRESS);
        setUserBalance(balanceRes.formatted);
        setUserBalanceRaw(balanceRes.raw);
      } else {
        setUserBalance('0.00');
        setUserBalanceRaw(0n);
      }
    } catch (balanceErr: any) {
      console.warn('Failed to fetch user token balance from BSC:', balanceErr);
      setUserBalance(null);
      setUserBalanceRaw(null);
      setBalanceError('Failed to read balance from BSC RPC. Please verify connection.');
    } finally {
      setIsBalanceLoading(false);
    }
  }, [isConnected, address, isBscMainnet, isBscTestnet, chainId]);

  // Fetch all public contract data
  const loadContractData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Always fetch official BSC Mainnet token overview
      try {
        const mainnetRes = await fetchMainnetTokenOverview();
        setMainnetOverview(mainnetRes);
      } catch (mainnetErr: any) {
        console.warn('Failed to read Mainnet contract data:', mainnetErr);
      }

      // 2. Fetch BSC Testnet metadata for fallback/developer view
      try {
        const [tokenResult, allocResult, saleResult] = await Promise.all([
          fetchOnChainTokenMetadata(BSC_TESTNET_TOKEN_ADDRESS),
          fetchOnChainAllocationData(BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS),
          fetchOnChainSaleData(BSC_TESTNET_SALE_ADDRESS),
        ]);
        setTokenData(tokenResult);
        setAllocationData(allocResult);
        setSaleData(saleResult);
      } catch (testnetErr: any) {
        console.warn('Testnet metadata query notice:', testnetErr);
      }
    } catch (err: any) {
      console.warn('Failed to read contract data from BSC:', err);
      setError('Unable to load live contract data from BSC RPC. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }

    // 3. Refresh user balance
    await loadUserBalance();
  }, [loadUserBalance]);

  useEffect(() => {
    loadContractData();
  }, [loadContractData]);

  // Update balance when user address or network changes
  useEffect(() => {
    loadUserBalance();
  }, [loadUserBalance]);

  return {
    isLoading,
    isBalanceLoading,
    error,
    balanceError,
    tokenData,
    mainnetOverview,
    allocationData,
    saleData,
    userBalance,
    userBalanceRaw,
    isTestnet: isBscTestnet,
    isMainnet: isBscMainnet,
    tokenAddress: BSC_MAINNET_LIORA_TOKEN_ADDRESS,
    mainnetTokenAddress: BSC_MAINNET_LIORA_TOKEN_ADDRESS,
    allocationManagerAddress: BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS,
    saleAddress: BSC_TESTNET_SALE_ADDRESS,
    isWalletConnected: isConnected,
    isWalletOnBscTestnet: isBscTestnet,
    isWalletOnBscMainnet: isBscMainnet,
    isWrongNetwork,
    walletNetworkError,
    refresh: loadContractData,
    refreshUserBalance: loadUserBalance,
  };
}
