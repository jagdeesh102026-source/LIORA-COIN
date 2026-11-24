'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3Wallet } from './useWeb3Wallet';
import { fetchUserTestnetBalances, UserTestnetBalances } from '../lib/dex/dexOnChainClient';

export interface UseTestnetBalancesReturn {
  balances: UserTestnetBalances | null;
  lioraBalance: string;
  usdtBalance: string;
  bnbBalance: string;
  isLoading: boolean;
  error: string | null;
  refreshBalances: () => Promise<void>;
}

export function useTestnetBalances(): UseTestnetBalancesReturn {
  const { address, isConnected, isBscTestnet } = useWeb3Wallet();

  const [balances, setBalances] = useState<UserTestnetBalances | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalances = useCallback(async () => {
    if (!isConnected || !address || !isBscTestnet) {
      setBalances(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchUserTestnetBalances(address);
      setBalances(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch testnet token balances.');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, isBscTestnet]);

  useEffect(() => {
    refreshBalances();
    // Periodic refresh every 15 seconds
    const interval = setInterval(refreshBalances, 15000);
    return () => clearInterval(interval);
  }, [refreshBalances]);

  return {
    balances,
    lioraBalance: balances?.lioraFormatted || '0.00',
    usdtBalance: balances?.usdtFormatted || '0.00',
    bnbBalance: balances?.bnbFormatted || '0.00',
    isLoading,
    error,
    refreshBalances,
  };
}
