'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  NetworkId,
  BlockchainConfig,
  ChainAdapter,
  getChainConfig,
  getChainConfigByChainId,
  isChainEnabled,
  defaultBscAdapter,
  BscChainAdapter
} from '../lib/chains';
import {
  getPersistedWalletPreference,
  setPersistedWalletPreference,
  clearPersistedWalletPreference,
  findMatchingEvmProvider,
  validateProviderForBscTestnet,
  detectWalletProviderMeta,
  type PersistedWalletPreference,
} from '../lib/dex/walletProviderHelper';

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP1193Provider {
  request: (args: { method: string; params?: any[] | Record<string, any> }) => Promise<any>;
  on?: (eventName: string, handler: (...args: any[]) => void) => void;
  removeListener?: (eventName: string, handler: (...args: any[]) => void) => void;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

export interface Web3WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  chainName: string | null;
  balance: string | null;
  isConnecting: boolean;
  error: string | null;
  isBscTestnet: boolean;
  isBscMainnet: boolean;
  isLocalDevnet: boolean;
  isSupportedChain: boolean;
  isWrongNetwork: boolean;
  activeWalletInfo: EIP6963ProviderInfo | null;
  activeProvider: EIP1193Provider | null;
  discoveredProviders: EIP6963ProviderDetail[];
  activeNetworkId?: NetworkId | null;
  chainConfig?: BlockchainConfig | null;
  chainAdapter?: ChainAdapter;
  connect: (providerDetail?: EIP6963ProviderDetail | unknown) => Promise<boolean>;
  disconnect: () => void;
  switchToBscTestnet: () => Promise<boolean>;
  switchToBscMainnet: () => Promise<boolean>;
  switchNetwork: (target: number | NetworkId) => Promise<boolean>;
  clearError: () => void;
  assertBscTransactionReady: () => { ready: boolean; error?: string };
  signMessage: (message: string) => Promise<string | null>;
}

const BSC_MAINNET_CHAIN_ID = 56;
const BSC_TESTNET_CHAIN_ID = 97;
const LOCAL_DEVNET_CHAIN_ID = 31337;

// Production Gate: In this phase, BSC Mainnet transactions remain strictly disabled.
// Only BSC Testnet (#97) and Local Devnet (#31337) are authorized for operations.
const SUPPORTED_CHAIN_IDS = [BSC_TESTNET_CHAIN_ID, LOCAL_DEVNET_CHAIN_ID];
// Supported networks: BSC Mainnet (#56) for read-only connectivity, BSC Testnet (#97), and Local Devnet (#31337).
// Note: Write transactions on BSC Mainnet remain strictly blocked by assertBscTransactionReady().
const SUPPORTED_CHAIN_IDS = [BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID, LOCAL_DEVNET_CHAIN_ID];

const BSC_CHAIN_PARAMS: Record<number, any> = {
  [BSC_TESTNET_CHAIN_ID]: {
    chainId: '0x61',
    chainName: 'BNB Smart Chain Testnet',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
  },
  [BSC_MAINNET_CHAIN_ID]: {
    chainId: '0x38',
    chainName: 'BNB Smart Chain Mainnet',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    blockExplorerUrls: ['https://bscscan.com'],
  },
};

export const Web3WalletContext = createContext<Web3WalletState | undefined>(undefined);

export const Web3WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [discoveredProviders, setDiscoveredProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [activeProvider, setActiveProvider] = useState<EIP1193Provider | null>(null);
  const [activeWalletInfo, setActiveWalletInfo] = useState<EIP6963ProviderInfo | null>(null);
  const [isClientReady, setIsClientReady] = useState<boolean>(false);

  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client hydration guard to prevent SSR mismatches
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const activeProviderRef = useRef<EIP1193Provider | null>(null);
  activeProviderRef.current = activeProvider;

  const isBscTestnet = chainId === BSC_TESTNET_CHAIN_ID;
  const isBscMainnet = chainId === BSC_MAINNET_CHAIN_ID;
  const isLocalDevnet = chainId === LOCAL_DEVNET_CHAIN_ID;
  const isSupportedChain = chainId !== null && SUPPORTED_CHAIN_IDS.includes(chainId);
  const isConnected = address !== null;
  const isWrongNetwork = isConnected && !isSupportedChain;

  const getChainName = useCallback((id: number | null): string => {
    if (!id) return 'Unknown Network';
    if (id === BSC_MAINNET_CHAIN_ID) return 'BNB Smart Chain Mainnet';
    if (id === BSC_TESTNET_CHAIN_ID) return 'BSC Testnet';
    if (id === LOCAL_DEVNET_CHAIN_ID) return 'Local Devnet';
    return `Unsupported Chain (#${id})`;
  }, []);

  const chainName = getChainName(chainId);

  // EIP-6963 Provider Discovery listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAnnounceProvider = (event: Event) => {
      const customEvent = event as CustomEvent<EIP6963ProviderDetail>;
      if (!customEvent.detail || !customEvent.detail.info || !customEvent.detail.provider) return;

      const newDetail = customEvent.detail;
      setDiscoveredProviders((prev) => {
        const exists = prev.some(
          (p) => p.info.uuid === newDetail.info.uuid || p.info.rdns === newDetail.info.rdns
        );
        if (exists) {
          return prev.map((p) =>
            p.info.uuid === newDetail.info.uuid || p.info.rdns === newDetail.info.rdns
              ? newDetail
              : p
          );
        }
        return [...prev, newDetail];
      });
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounceProvider as EventListener);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounceProvider as EventListener);
    };
  }, []);

  // Fetch balance helper
  const fetchBalance = useCallback(async (provider: EIP1193Provider, targetAddress: string) => {
    try {
      const balanceHex = await provider.request({
        method: 'eth_getBalance',
        params: [targetAddress, 'latest'],
      });
      const wei = BigInt(balanceHex);
      const formatted = (Number(wei) / 1e18).toFixed(4);
      setBalance(formatted);
    } catch (err) {
      console.warn('Failed to fetch wallet balance', err);
      setBalance(null);
    }
  }, []);

  // Refresh wallet state helper
  const refreshWalletState = useCallback(
    async (provider: EIP1193Provider) => {
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        const chainIdHex = await provider.request({ method: 'eth_chainId' });
        const currentChainId = parseInt(chainIdHex, 16);
        setChainId(currentChainId);

        if (accounts && accounts.length > 0) {
          const currentAddress = accounts[0];
          setAddress(currentAddress);
          await fetchBalance(provider, currentAddress);
        } else {
          setAddress(null);
          setBalance(null);
        }
      } catch (err) {
        console.warn('Failed to refresh wallet state', err);
      }
    },
    [fetchBalance]
  );

  // Setup EIP-1193 event listeners on active provider
  useEffect(() => {
    const provider = activeProvider;
    if (!provider || typeof provider.on !== 'function') return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setAddress(null);
        setBalance(null);
      } else {
        const nextAddress = accounts[0];
        setAddress(nextAddress);
        fetchBalance(provider, nextAddress);

        // Update stored preference with the new active account
        const currentPref = getPersistedWalletPreference();
        if (currentPref) {
          setPersistedWalletPreference({
            ...currentPref,
            account: nextAddress,
          });
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const parsedId = parseInt(chainIdHex, 16);
      setChainId(parsedId);
      if (address) {
        fetchBalance(provider, address);
      }
    };

    const handleDisconnect = () => {
      clearPersistedWalletPreference();
      setAddress(null);
      setChainId(null);
      setBalance(null);
      setActiveProvider(null);
      setActiveWalletInfo(null);
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
    provider.on('disconnect', handleDisconnect);

    return () => {
      if (typeof provider.removeListener === 'function') {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
        provider.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [activeProvider, address, fetchBalance]);

  // Check for already connected injected provider on mount (silent check with preference preservation)
  useEffect(() => {
    if (!isClientReady || typeof window === 'undefined') return;

    let isMounted = true;

    const checkExistingConnection = async () => {
      const preference = getPersistedWalletPreference();
      const winEthereum = typeof window !== 'undefined' ? (window as any).ethereum : undefined;

      // Find matching EVM provider using EIP-6963 and preference
      const match = findMatchingEvmProvider(preference, discoveredProviders, winEthereum);
      if (!match || !match.provider || typeof match.provider.request !== 'function') {
        // If user had a preference (e.g. MetaMask) but extension is not detected or is TronLink:
        if (preference && preference.name) {
          if (isMounted) {
            setActiveWalletInfo({
              uuid: preference.uuid || 'stored-preference',
              name: preference.name,
              icon: '',
              rdns: preference.rdns || '',
            });
          }
        }
        return;
      }

      try {
        // Passive account check (never prompts user or requests account access on mount)
        const accounts = await match.provider.request({ method: 'eth_accounts' });
        if (!isMounted) return;

        if (accounts && accounts.length > 0) {
          // If preference has a specific account and it's present in active accounts, use it; else accounts[0]
          const targetAccount =
            preference?.account &&
              accounts.some((a: string) => a.toLowerCase() === preference.account!.toLowerCase())
              ? preference.account
              : accounts[0];

          setActiveProvider(match.provider);
          setActiveWalletInfo(match.info);
          setAddress(targetAccount);

          const chainIdHex = await match.provider.request({ method: 'eth_chainId' });
          if (!isMounted) return;
          const currentChainId = parseInt(chainIdHex, 16);
          setChainId(currentChainId);

          await fetchBalance(match.provider, targetAccount);

          // Update stored account if it changed
          if (preference && preference.account?.toLowerCase() !== targetAccount.toLowerCase()) {
            setPersistedWalletPreference({
              ...preference,
              account: targetAccount,
            });
          }
        } else if (preference) {
          // Extension detected, but accounts locked/disconnected
          setActiveWalletInfo(match.info);
          setAddress(null);
          setBalance(null);
        }
      } catch (e) {
        console.warn('Silent wallet reconnection check failed:', e);
      }
    };

    checkExistingConnection();

    return () => {
      isMounted = false;
    };
  }, [isClientReady, discoveredProviders, fetchBalance]);

  // Connect handler
  const connect = async (providerDetail?: EIP6963ProviderDetail | unknown): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);

    let providerToUse: EIP1193Provider | null = null;
    let walletInfoToUse: EIP6963ProviderInfo | null = null;

    const isDetail =
      providerDetail &&
      typeof providerDetail === 'object' &&
      'provider' in providerDetail &&
      'info' in providerDetail;

    if (isDetail) {
      const detail = providerDetail as EIP6963ProviderDetail;
      providerToUse = detail.provider;
      walletInfoToUse = detail.info;
    } else {
      // Find best EVM provider, prioritizing MetaMask/Rabby, NEVER TronLink
      const matched = findMatchingEvmProvider(
        getPersistedWalletPreference(),
        discoveredProviders,
        typeof window !== 'undefined' ? (window as any).ethereum : undefined
      );
      if (matched) {
        providerToUse = matched.provider;
        walletInfoToUse = matched.info;
      }
    }

    if (!providerToUse) {
      setIsConnecting(false);
      setError(
        'No compatible Web3 wallet detected. Please install a browser extension (such as MetaMask or Rabby) or open this page in a mobile Web3 wallet.'
      );
      return false;
    }

    try {
      validateProviderForBscTestnet(providerToUse);
    } catch (valErr: any) {
      setIsConnecting(false);
      setError(valErr.message);
      return false;
    }

    try {
      const accounts = await providerToUse.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet.');
      }

      setActiveProvider(providerToUse);
      setActiveWalletInfo(walletInfoToUse);

      const chainIdHex = await providerToUse.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);
      setChainId(currentChainId);

      const currentAddress = accounts[0];
      setAddress(currentAddress);
      await fetchBalance(providerToUse, currentAddress);

      // Persist user selection to localStorage
      if (walletInfoToUse) {
        setPersistedWalletPreference({
          rdns: walletInfoToUse.rdns,
          name: walletInfoToUse.name,
          uuid: walletInfoToUse.uuid,
          account: currentAddress,
          connectedAt: Date.now(),
        });
      }

      setIsConnecting(false);
      return true;
    } catch (err: any) {
      setIsConnecting(false);
      if (
        err?.code === 4001 ||
        err?.message?.toLowerCase().includes('user rejected') ||
        err?.message?.toLowerCase().includes('cancelled')
      ) {
        setError('Connection request was cancelled in your wallet.');
      } else {
        setError(err?.message || 'Failed to connect wallet. Please try again.');
      }
      return false;
    }
  };

  // Disconnect handler
  const disconnect = () => {
    clearPersistedWalletPreference();
    setAddress(null);
    setChainId(null);
    setBalance(null);
    setActiveProvider(null);
    setActiveWalletInfo(null);
    setError(null);
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Active Multi-Chain adapter and config derived from current chainId
  const activeNetworkId: NetworkId | null =
    chainId === 97 ? 'bsc-testnet' : chainId === 56 ? 'bsc-mainnet' : chainId === 31337 ? 'local-devnet' : null;
  const chainConfig = activeNetworkId ? getChainConfig(activeNetworkId) : null;
  const chainAdapter = activeNetworkId ? new BscChainAdapter(activeNetworkId) : defaultBscAdapter;

  // Switch network helper (supports both numeric chain IDs and string NetworkIds)
  const switchNetwork = async (target: number | NetworkId): Promise<boolean> => {
    let targetConfig: BlockchainConfig | null = null;
    let targetChainId: number | null = null;

    if (typeof target === 'string') {
      targetConfig = getChainConfig(target as NetworkId);
      if (typeof targetConfig?.chainId === 'number') {
        targetChainId = targetConfig.chainId;
      }
    } else {
      targetChainId = target;
      targetConfig = getChainConfigByChainId(target);
    }

    if (targetConfig && !targetConfig.enabled) {
      setError(`Network [${targetConfig.name}] is disabled in this phase. Real transactions and settlement are restricted to BNB Smart Chain.`);
      return false;
    }

    if (targetConfig && targetConfig.family !== 'EVM') {
      setError(`Network family [${targetConfig.family}] requires a dedicated wallet adapter (e.g. TronLink, UniSat) and is disabled in this phase.`);
      return false;
    }

    if (!targetChainId) {
      setError(`Invalid target network parameter: ${target}`);
      return false;
    }

    const provider = activeProviderRef.current || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!provider) {
      setError('No active wallet provider available to switch networks.');
      return false;
    }

    const hexChainId = `0x${targetChainId.toString(16)}`;
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
      setChainId(targetChainId);
      setError(null);
      return true;
    } catch (switchError: any) {
      // Chain not added error code 4902
      if (switchError.code === 4902 || switchError?.message?.includes('4902') || switchError?.data?.originalError?.code === 4902) {
        const chainParams = BSC_CHAIN_PARAMS[targetChainId];
        if (chainParams) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [chainParams],
            });
            setChainId(targetChainId);
            setError(null);
            return true;
          } catch (addError: any) {
            if (addError?.code === 4001 || addError?.message?.toLowerCase().includes('user rejected')) {
              setError('Adding BNB Smart Chain was cancelled in your wallet.');
            } else {
              setError(addError?.message || 'Failed to add BNB Smart Chain to wallet.');
            }
            return false;
          }
        }
      }

      if (switchError?.code === 4001 || switchError?.message?.toLowerCase().includes('user rejected')) {
        setError('Network switch was cancelled in your wallet.');
      } else {
        setError(switchError?.message || 'Failed to switch network.');
      }
      return false;
    }
  };

  const switchToBscTestnet = () => switchNetwork(BSC_TESTNET_CHAIN_ID);
  const switchToBscMainnet = () => switchNetwork(BSC_MAINNET_CHAIN_ID);

  const assertBscTransactionReady = useCallback((): { ready: boolean; error?: string } => {
    if (!isConnected || !address) {
      return { ready: false, error: 'Wallet not connected. Please connect your wallet first.' };
    }
    if (!isSupportedChain) {
      const isMainnet = chainId === BSC_MAINNET_CHAIN_ID;
      // Mainnet transactions remain STRICTLY disabled for Phase 1 (Read-Only Mode)
      if (chainId === BSC_MAINNET_CHAIN_ID) {
        return {
          ready: false,
          error: isMainnet
            ? 'BNB Smart Chain Mainnet transactions are disabled in this phase. Real settlements require separate approval. Please switch to BSC Testnet (#97).'
            : `Unsupported network (Chain #${chainId}). Liora Coin testing transactions are supported exclusively on BSC Testnet (#97).`,
          error: 'BNB Smart Chain Mainnet transactions and write operations remain strictly disabled. The portal is operating in verified read-only mode.',
        };
      }
      if (!isSupportedChain || chainId !== BSC_TESTNET_CHAIN_ID) {
        return {
          ready: false,
          error: `Unsupported network (Chain #${chainId}). Liora Coin testing transactions are supported exclusively on BSC Testnet (#97).`,
        };
      }
      return { ready: true };
    }, [isConnected, address, isSupportedChain, chainId]);

  const signMessage = useCallback(
    async (message: string): Promise<string | null> => {
      if (!address) {
        setError('No wallet connected to sign message');
        return null;
      }
      const provider = activeProviderRef.current || (typeof window !== 'undefined' ? (window as any).ethereum : null);
      if (!provider || typeof provider.request !== 'function') {
        setError('No EVM wallet provider available for message signing');
        return null;
      }
      try {
        const signature = await provider.request({
          method: 'personal_sign',
          params: [message, address],
        });
        return signature as string;
      } catch (err: any) {
        console.error('Wallet personal_sign error:', err);
        setError(err.message || 'Signature rejected by user');
        return null;
      }
    },
    [address]
  );

  return (
    <Web3WalletContext.Provider
      value={{
        isConnected,
        address,
        chainId,
        chainName,
        balance,
        isConnecting,
        error,
        isBscTestnet,
        isBscMainnet,
        isLocalDevnet,
        isSupportedChain,
        isWrongNetwork,
        activeWalletInfo,
        activeProvider,
        discoveredProviders,
        activeNetworkId,
        chainConfig,
        chainAdapter,
        connect,
        disconnect,
        switchToBscTestnet,
        switchToBscMainnet,
        switchNetwork,
        clearError,
        assertBscTransactionReady,
        signMessage,
      }}
    >
      {children}
    </Web3WalletContext.Provider>
  );
};

export const useWeb3WalletContext = () => {
  const context = useContext(Web3WalletContext);
  if (!context) {
    throw new Error('useWeb3WalletContext must be used within a Web3WalletProvider');
  }
  return context;
};
