/**
 * LIORA COIN — Wallet Provider Resolution & Error Classification Helper
 * 
 * Provides robust EIP-1193 provider discovery, EIP-6963 multi-wallet resolution,
 * client-side preference persistence (e.g. MetaMask vs TronLink), strict BSC Testnet
 * compatibility validation, and comprehensive error classification.
 */

export const LIORA_WALLET_STORAGE_KEY = 'liora_selected_wallet_provider';

export interface EIP1193LikeProvider {
  request: (args: { method: string; params?: any[] | Record<string, any> }) => Promise<any>;
  on?: (eventName: string, handler: (...args: any[]) => void) => void;
  removeListener?: (eventName: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isRabby?: boolean;
  isTronLink?: boolean;
  isTron?: boolean;
  isTrust?: boolean;
  providers?: EIP1193LikeProvider[];
}

export class UnsupportedWalletProviderError extends Error {
  public walletName: string;
  constructor(walletName: string, message: string) {
    super(message);
    this.name = 'UnsupportedWalletProviderError';
    this.walletName = walletName;
  }
}

export interface DetectedProviderMeta {
  isTronLink: boolean;
  isMetaMask: boolean;
  isRabby: boolean;
  isTrust: boolean;
  displayName: string;
}

export interface PersistedWalletPreference {
  rdns?: string;
  name?: string;
  uuid?: string;
  account?: string;
  connectedAt?: number;
}

export interface DiscoveredProviderItem {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

export interface MatchedProviderResult {
  provider: any;
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  source: 'EIP6963' | 'PROVIDERS_ARRAY' | 'INJECTED_ETHEREUM';
}

/**
 * Inspects a provider to determine its wallet type.
 */
export function detectWalletProviderMeta(provider: any): DetectedProviderMeta {
  if (!provider) {
    return {
      isTronLink: false,
      isMetaMask: false,
      isRabby: false,
      isTrust: false,
      displayName: 'Unknown Provider',
    };
  }

  const isTronLink = Boolean(
    provider.isTronLink ||
    provider.isTron ||
    (typeof window !== 'undefined' && ((window as any).tronLink === provider || ((window as any).tronWeb && !provider.isMetaMask)))
  );

  const isRabby = Boolean(provider.isRabby);
  const isTrust = Boolean(provider.isTrust || provider.isTrustWallet);
  const isMetaMask = Boolean(provider.isMetaMask && !isTronLink && !isRabby);

  let displayName = 'Injected Browser Wallet';
  if (isTronLink) displayName = 'TronLink';
  else if (isRabby) displayName = 'Rabby';
  else if (isTrust) displayName = 'Trust Wallet';
  else if (isMetaMask) displayName = 'MetaMask';

  return {
    isTronLink,
    isMetaMask,
    isRabby,
    isTrust,
    displayName,
  };
}

/**
 * Safely reads the persisted wallet selection preference from browser localStorage.
 */
export function getPersistedWalletPreference(): PersistedWalletPreference | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(LIORA_WALLET_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedWalletPreference;
  } catch (err) {
    console.warn('Failed to parse persisted wallet preference:', err);
    return null;
  }
}

/**
 * Stores the selected wallet preference in browser localStorage.
 */
export function setPersistedWalletPreference(pref: PersistedWalletPreference): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LIORA_WALLET_STORAGE_KEY, JSON.stringify(pref));
  } catch (err) {
    console.warn('Failed to write persisted wallet preference:', err);
  }
}

/**
 * Clears the persisted wallet preference from browser localStorage.
 */
export function clearPersistedWalletPreference(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(LIORA_WALLET_STORAGE_KEY);
  } catch {}
}

/**
 * Resolves the matching EVM provider based on explicit user preference, EIP-6963 discovery,
 * or standard injected multi-provider arrays, guaranteeing that TronLink is NEVER silently selected.
 */
export function findMatchingEvmProvider(
  preference: PersistedWalletPreference | null,
  discoveredProviders: DiscoveredProviderItem[] = [],
  injectedEthereum?: any
): MatchedProviderResult | null {
  // Step 1: If user has an explicit saved preference, find that specific provider first
  if (preference) {
    // 1A. EIP-6963 announced providers matching preference
    if (discoveredProviders && discoveredProviders.length > 0) {
      if (preference.rdns) {
        const match = discoveredProviders.find(
          (p) => p.info.rdns?.toLowerCase() === preference.rdns?.toLowerCase()
        );
        if (match && !detectWalletProviderMeta(match.provider).isTronLink) {
          return {
            provider: match.provider,
            info: { ...match.info, icon: match.info.icon || '' },
            source: 'EIP6963',
          };
        }
      }
      if (preference.uuid) {
        const match = discoveredProviders.find((p) => p.info.uuid === preference.uuid);
        if (match && !detectWalletProviderMeta(match.provider).isTronLink) {
          return {
            provider: match.provider,
            info: { ...match.info, icon: match.info.icon || '' },
            source: 'EIP6963',
          };
        }
      }
      if (preference.name) {
        const match = discoveredProviders.find(
          (p) => p.info.name?.toLowerCase().includes(preference.name!.toLowerCase())
        );
        if (match && !detectWalletProviderMeta(match.provider).isTronLink) {
          return {
            provider: match.provider,
            info: { ...match.info, icon: match.info.icon || '' },
            source: 'EIP6963',
          };
        }
      }
    }

    // 1B. Multi-provider array in window.ethereum.providers
    if (injectedEthereum && Array.isArray(injectedEthereum.providers)) {
      const isMetaMaskPref =
        preference.name?.toLowerCase().includes('metamask') || preference.rdns === 'io.metamask';
      const isRabbyPref =
        preference.name?.toLowerCase().includes('rabby') || preference.rdns === 'io.rabby';
      const isTrustPref =
        preference.name?.toLowerCase().includes('trust') || preference.rdns?.includes('trust');

      if (isMetaMaskPref) {
        const mm = injectedEthereum.providers.find(
          (p: any) => p.isMetaMask && !p.isTronLink && !p.isTron && !p.isRabby
        );
        if (mm) {
          return {
            provider: mm,
            info: { uuid: 'injected-metamask', name: 'MetaMask', rdns: 'io.metamask', icon: '' },
            source: 'PROVIDERS_ARRAY',
          };
        }
      }

      if (isRabbyPref) {
        const rabby = injectedEthereum.providers.find((p: any) => p.isRabby);
        if (rabby) {
          return {
            provider: rabby,
            info: { uuid: 'injected-rabby', name: 'Rabby', rdns: 'io.rabby', icon: '' },
            source: 'PROVIDERS_ARRAY',
          };
        }
      }

      if (isTrustPref) {
        const trust = injectedEthereum.providers.find((p: any) => p.isTrust || p.isTrustWallet);
        if (trust) {
          return {
            provider: trust,
            info: { uuid: 'injected-trust', name: 'Trust Wallet', rdns: 'com.trustwallet.app', icon: '' },
            source: 'PROVIDERS_ARRAY',
          };
        }
      }
    }

    // 1C. Single injected window.ethereum matching preference
    if (injectedEthereum && typeof injectedEthereum.request === 'function') {
      const meta = detectWalletProviderMeta(injectedEthereum);
      if (!meta.isTronLink) {
        if (
          (preference.name?.toLowerCase().includes('metamask') && meta.isMetaMask) ||
          (preference.name?.toLowerCase().includes('rabby') && meta.isRabby) ||
          (preference.name?.toLowerCase().includes('trust') && meta.isTrust)
        ) {
          return {
            provider: injectedEthereum,
            info: {
              uuid: 'injected-fallback',
              name: meta.displayName,
              rdns: preference.rdns || 'injected.browser',
              icon: '',
            },
            source: 'INJECTED_ETHEREUM',
          };
        }
      }
    }

    // If explicit preference exists but that provider is currently not available,
    // NEVER silently fall back to TronLink or an arbitrary provider!
    return null;
  }

  // Step 2: No preference stored. Pick best available EVM provider, NEVER TronLink.
  // 2A. EIP-6963 announced providers
  if (discoveredProviders && discoveredProviders.length > 0) {
    const mm = discoveredProviders.find(
      (p) =>
        (p.info.rdns === 'io.metamask' || p.info.name.toLowerCase().includes('metamask')) &&
        !detectWalletProviderMeta(p.provider).isTronLink
    );
    if (mm) {
      return {
        provider: mm.provider,
        info: { ...mm.info, icon: mm.info.icon || '' },
        source: 'EIP6963',
      };
    }

    const anyEvm = discoveredProviders.find((p) => !detectWalletProviderMeta(p.provider).isTronLink);
    if (anyEvm) {
      return {
        provider: anyEvm.provider,
        info: { ...anyEvm.info, icon: anyEvm.info.icon || '' },
        source: 'EIP6963',
      };
    }
  }

  // 2B. injectedEthereum.providers
  if (injectedEthereum && Array.isArray(injectedEthereum.providers)) {
    const mm = injectedEthereum.providers.find(
      (p: any) => p.isMetaMask && !p.isTronLink && !p.isTron && !p.isRabby
    );
    if (mm) {
      return {
        provider: mm,
        info: { uuid: 'injected-metamask', name: 'MetaMask', rdns: 'io.metamask', icon: '' },
        source: 'PROVIDERS_ARRAY',
      };
    }

    const anyEvm = injectedEthereum.providers.find(
      (p: any) => !p.isTronLink && !p.isTron && (p.isMetaMask || p.isRabby || p.isTrust)
    );
    if (anyEvm) {
      const meta = detectWalletProviderMeta(anyEvm);
      return {
        provider: anyEvm,
        info: { uuid: 'injected-evm', name: meta.displayName, rdns: 'injected.evm', icon: '' },
        source: 'PROVIDERS_ARRAY',
      };
    }
  }

  // 2C. Single injected window.ethereum
  if (injectedEthereum && typeof injectedEthereum.request === 'function') {
    const meta = detectWalletProviderMeta(injectedEthereum);
    if (!meta.isTronLink) {
      return {
        provider: injectedEthereum,
        info: {
          uuid: 'injected-fallback',
          name: meta.displayName,
          rdns: 'injected.browser',
          icon: '',
        },
        source: 'INJECTED_ETHEREUM',
      };
    }
  }

  // If only TronLink is present or no valid EVM provider is available, return null
  return null;
}

/**
 * Resolves the optimal EIP-1193 provider, resolving conflicts when multiple
 * wallet extensions (such as MetaMask and TronLink) are simultaneously injected.
 */
export function resolveEip1193Provider(activeProvider?: any): EIP1193LikeProvider | null {
  // 1. If explicit active provider was passed from Web3WalletContext and is NOT TronLink
  if (activeProvider && typeof activeProvider.request === 'function') {
    const meta = detectWalletProviderMeta(activeProvider);
    if (!meta.isTronLink) {
      return activeProvider;
    }
  }

  if (typeof window === 'undefined') return null;

  const win = window as any;
  const ethereum = win.ethereum as EIP1193LikeProvider | undefined;

  // 2. Multi-provider array collision resolution (EIP-5749 / EIP-1193 providers array)
  if (ethereum && Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
    const evmProvider = ethereum.providers.find(
      (p) => !p.isTronLink && !p.isTron && (p.isMetaMask || p.isRabby || p.isTrust)
    );
    if (evmProvider) {
      return evmProvider;
    }

    const nonTron = ethereum.providers.find((p) => !p.isTronLink && !p.isTron);
    if (nonTron) {
      return nonTron;
    }

    // Only TronLink in array
    return null;
  }

  // 3. Single injected provider (only if not TronLink)
  if (ethereum && typeof ethereum.request === 'function') {
    const meta = detectWalletProviderMeta(ethereum);
    if (!meta.isTronLink) {
      return ethereum;
    }
  }

  // Fallback: If activeProvider was passed and nothing else exists, return it for explicit error classification
  return activeProvider || null;
}

/**
 * Validates that the provider is EVM-capable on BSC Testnet (Chain ID 97).
 * Strictly flags and blocks TronLink from attempting BSC contract executions.
 */
export function validateProviderForBscTestnet(provider: any): void {
  if (!provider || typeof provider.request !== 'function') {
    throw new Error('No compatible EIP-1193 browser wallet detected.');
  }

  const meta = detectWalletProviderMeta(provider);
  if (meta.isTronLink) {
    throw new UnsupportedWalletProviderError(
      'TronLink',
      'TronLink is a TRON-only wallet and does not support EVM smart contract transactions on BNB Smart Chain Testnet (Chain ID 97). Please switch to an EVM-compatible wallet such as MetaMask, Rabby, or Trust Wallet.'
    );
  }
}

/**
 * Classifies wallet and RPC errors into safe, actionable user-facing messages.
 * Guarantees zero sensitive credentials or internal memory addresses are exposed.
 */
export function classifyWalletError(err: any): string {
  if (!err) {
    return 'Transaction failed. Please try again.';
  }

  // Explicit Unsupported Provider Error
  if (err instanceof UnsupportedWalletProviderError || err.name === 'UnsupportedWalletProviderError') {
    return err.message;
  }

  const rawMessage = (err.message || '').toString();
  const lowerMessage = rawMessage.toLowerCase();
  const errCode = err.code;

  // 1. User Rejection / Cancellation
  if (
    errCode === 4001 ||
    errCode === 'ACTION_REJECTED' ||
    lowerMessage.includes('user rejected') ||
    lowerMessage.includes('user denied') ||
    lowerMessage.includes('cancelled') ||
    lowerMessage.includes('declined') ||
    lowerMessage.includes('rejected by user')
  ) {
    return 'Transaction signature request was cancelled in your wallet.';
  }

  // 2. Incompatible Provider / TronLink
  if (
    lowerMessage.includes('tron') ||
    lowerMessage.includes('unsupported method') ||
    (lowerMessage.includes('not supported') && lowerMessage.includes('chain'))
  ) {
    return 'Incompatible wallet detected. TronLink does not support EVM smart contract transactions on BSC Testnet. Please use MetaMask or an EVM wallet.';
  }

  // 3. Insufficient Gas
  if (
    lowerMessage.includes('insufficient funds') ||
    lowerMessage.includes('insufficient gas') ||
    lowerMessage.includes('gas required exceeds') ||
    lowerMessage.includes('intrinsic gas too low') ||
    lowerMessage.includes('exceeds balance')
  ) {
    return 'Insufficient tBNB balance to pay for network gas on BSC Testnet. Please fund your wallet from the BSC Testnet faucet.';
  }

  // 4. Chain ID / Network Mismatch
  if (
    errCode === 4902 ||
    lowerMessage.includes('unrecognized chain') ||
    lowerMessage.includes('wrong network') ||
    lowerMessage.includes('chain id')
  ) {
    return 'Your wallet is not connected to BNB Smart Chain Testnet (Chain ID 97). Please switch to BSC Testnet.';
  }

  // 5. RPC Network Failure
  if (
    lowerMessage.includes('network error') ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('connection refused') ||
    errCode === -32000 ||
    errCode === -32603
  ) {
    return 'RPC network communication failed on BSC Testnet. Please check your connection and try again.';
  }

  // 6. Contract Execution Reverted
  if (
    lowerMessage.includes('revert') ||
    lowerMessage.includes('execution reverted') ||
    lowerMessage.includes('transfer amount exceeds balance')
  ) {
    return 'Contract execution reverted on-chain. Please verify token balance and approved allowance.';
  }

  // 7. Clean generic fallback
  const shortMessage = err.shortMessage || rawMessage;
  if (shortMessage && shortMessage.length < 120 && !shortMessage.includes('0x')) {
    return shortMessage;
  }

  return 'Transaction failed or was rejected. Please review wallet details and try again.';
}
