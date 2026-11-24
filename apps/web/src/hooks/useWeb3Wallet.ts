'use client';

import { useWeb3WalletContext, type EIP1193Provider } from '../context/Web3WalletContext';
export type { EIP6963ProviderDetail, EIP6963ProviderInfo, EIP1193Provider } from '../context/Web3WalletContext';

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
  isLocalDevnet?: boolean;
  isSupportedChain?: boolean;
  isWrongNetwork?: boolean;
  activeProvider?: EIP1193Provider | null;
  assertBscTransactionReady?: () => { ready: boolean; error?: string };
}

export function useWeb3Wallet() {
  return useWeb3WalletContext();
}
