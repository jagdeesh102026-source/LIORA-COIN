'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3Wallet } from './useWeb3Wallet';
import {
  fetchOnChainTokenMetadata,
  fetchOnChainAllocationData,
  fetchOnChainSaleData,
  fetchOnChainUserTokenBalance,
  type OnChainTokenData,
  type OnChainAllocationData,
  type OnChainSaleData,
} from '../lib/contracts/client';
import {
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
  allocationData: OnChainAllocationData | null;
  saleData: OnChainSaleData | null;
  userBalance: string | null;
  userBalanceRaw: bigint | null;
  isTestnet: boolean;
  tokenAddress: string;
  allocationManagerAddress: string;
  saleAddress: string;
  isWalletConnected: boolean;
  isWalletOnBscTestnet: boolean;
  isWrongNetwork: boolean;
  walletNetworkError: string | null;
  refresh: () => Promise<void>;
  refreshUserBalance: () => Promise<void>;
}

export function useOxeniqContract(): OxeniqContractState {
  const { address, isConnected, chainId, isBscTestnet, isWrongNetwork, chainName } = useWeb3Wallet();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [tokenData, setTokenData] = useState<OnChainTokenData | null>(null);
  const [allocationData, setAllocationData] = useState<OnChainAllocationData | null>(null);
  const [saleData, setSaleData] = useState<OnChainSaleData | null>(null);

  const [userBalance, setUserBalance] = useState<string | null>(null);
  const [userBalanceRaw, setUserBalanceRaw] = useState<bigint | null>(null);

  // Compute network error description
  const walletNetworkError = isConnected && !isBscTestnet
    ? `Wallet is connected to ${chainName || `Chain #${chainId}`}. Switch network to BNB Smart Chain Testnet (Chain ID 97) to view and transact with your testnet OXENIQ balance.`
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

    if (!isBscTestnet) {
      setUserBalance(null);
      setUserBalanceRaw(null);
      setBalanceError('Unsupported network. Switch to BSC Testnet (#97).');
      setIsBalanceLoading(false);
      return;
    }

    setIsBalanceLoading(true);
    setBalanceError(null);

    try {
      const balanceRes = await fetchOnChainUserTokenBalance(address, BSC_TESTNET_TOKEN_ADDRESS);
      setUserBalance(balanceRes.formatted);
      setUserBalanceRaw(balanceRes.raw);
    } catch (balanceErr: any) {
      console.warn('Failed to fetch user token balance from BSC Testnet:', balanceErr);
      setUserBalance(null);
      setUserBalanceRaw(null);
      setBalanceError('Failed to read balance from BSC Testnet RPC. Please verify connection.');
    } finally {
      setIsBalanceLoading(false);
    }
  }, [isConnected, address, isBscTestnet]);

  // Fetch all public contract data
  const loadContractData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch public token, allocation, and sale metadata from BSC Testnet RPC
      const [tokenResult, allocResult, saleResult] = await Promise.all([
        fetchOnChainTokenMetadata(BSC_TESTNET_TOKEN_ADDRESS),
        fetchOnChainAllocationData(BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS),
        fetchOnChainSaleData(BSC_TESTNET_SALE_ADDRESS),
      ]);

      setTokenData(tokenResult);
      setAllocationData(allocResult);
      setSaleData(saleResult);
    } catch (err: any) {
      console.warn('Failed to read contract data from BSC Testnet:', err);
      setError('Unable to load live contract data from BSC Testnet RPC. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }

    // 2. Refresh user balance
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
    allocationData,
    saleData,
    userBalance,
    userBalanceRaw,
    isTestnet: isBscTestnet,
    tokenAddress: BSC_TESTNET_TOKEN_ADDRESS,
    allocationManagerAddress: BSC_TESTNET_ALLOCATION_MANAGER_ADDRESS,
    saleAddress: BSC_TESTNET_SALE_ADDRESS,
    isWalletConnected: isConnected,
    isWalletOnBscTestnet: isBscTestnet,
    isWrongNetwork,
    walletNetworkError,
    refresh: loadContractData,
    refreshUserBalance: loadUserBalance,
  };
}
