'use client';
import { useState, useEffect, useCallback } from 'react';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  chainName: string | null;
  balance: string | null;
  isConnecting: boolean;
  error: string | null;
  isBscTestnet: boolean;
  isBscMainnet: boolean;
}

const BSC_TESTNET_CHAIN_ID = 97;
const BSC_MAINNET_CHAIN_ID = 56;

export function useWeb3Wallet() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    chainName: null,
    balance: null,
    isConnecting: false,
    error: null,
    isBscTestnet: false,
    isBscMainnet: false,
  });

  const getChainName = (id: number): string => {
    if (id === BSC_MAINNET_CHAIN_ID) return 'BNB Smart Chain Mainnet';
    if (id === BSC_TESTNET_CHAIN_ID) return 'BSC Testnet';
    return `Chain #${id}`;
  };

  const updateWalletState = useCallback(async (ethereum: any) => {
    try {
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      const chainIdHex = await ethereum.request({ method: 'eth_chainId' });
      const chainIdNum = parseInt(chainIdHex, 16);

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        let balanceFormatted: string | null = null;
        try {
          const balanceHex = await ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest'],
          });
          const wei = BigInt(balanceHex);
          balanceFormatted = (Number(wei) / 1e18).toFixed(4);
        } catch (e) {
          console.warn('Failed to fetch balance', e);
        }

        setWallet({
          isConnected: true,
          address,
          chainId: chainIdNum,
          chainName: getChainName(chainIdNum),
          balance: balanceFormatted,
          isConnecting: false,
          error: null,
          isBscTestnet: chainIdNum === BSC_TESTNET_CHAIN_ID,
          isBscMainnet: chainIdNum === BSC_MAINNET_CHAIN_ID,
        });
      } else {
        setWallet((prev) => ({
          ...prev,
          isConnected: false,
          address: null,
          chainId: chainIdNum,
          chainName: getChainName(chainIdNum),
          balance: null,
          isConnecting: false,
          error: null,
          isBscTestnet: chainIdNum === BSC_TESTNET_CHAIN_ID,
          isBscMainnet: chainIdNum === BSC_MAINNET_CHAIN_ID,
        }));
      }
    } catch (err: any) {
      console.error('Wallet update error', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    updateWalletState(ethereum);

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setWallet((prev) => ({ ...prev, isConnected: false, address: null, balance: null }));
      } else {
        updateWalletState(ethereum);
      }
    };

    const handleChainChanged = () => {
      updateWalletState(ethereum);
    };

    ethereum.on?.('accountsChanged', handleAccountsChanged);
    ethereum.on?.('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [updateWalletState]);

  const connect = async () => {
    if (typeof window === 'undefined') return;
    const ethereum = (window as any).ethereum;

    if (!ethereum) {
      setWallet((prev) => ({
        ...prev,
        error: 'No Web3 wallet detected. Please install MetaMask, Trust Wallet, or Rabby.',
      }));
      return;
    }

    try {
      setWallet((prev) => ({ ...prev, isConnecting: true, error: null }));
      await ethereum.request({ method: 'eth_requestAccounts' });
      await updateWalletState(ethereum);
    } catch (err: any) {
      setWallet((prev) => ({
        ...prev,
        isConnecting: false,
        error: err?.message || 'Wallet connection was rejected.',
      }));
    }
  };

  const disconnect = () => {
    setWallet({
      isConnected: false,
      address: null,
      chainId: null,
      chainName: null,
      balance: null,
      isConnecting: false,
      error: null,
      isBscTestnet: false,
      isBscMainnet: false,
    });
  };

  const switchToBscTestnet = async () => {
    if (typeof window === 'undefined') return;
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const testnetHex = '0x61'; // 97
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: testnetHex }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: testnetHex,
                chainName: 'Binance Smart Chain Testnet',
                nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
                rpcUrls: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'],
                blockExplorerUrls: ['https://testnet.bscscan.com'],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add BSC Testnet', addError);
        }
      }
    }
  };

  return {
    ...wallet,
    connect,
    disconnect,
    switchToBscTestnet,
  };
}
