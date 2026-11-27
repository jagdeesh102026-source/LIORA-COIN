'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { encodeFunctionData, parseUnits, getAddress, type Address } from 'viem';
import { useWeb3Wallet } from './useWeb3Wallet';
import { isTestnetSandboxEnabled } from '../config/tokenConfig';
import {
  resolveEip1193Provider,
  validateProviderForBscTestnet,
  classifyWalletError,
} from '../lib/dex/walletProviderHelper';
import {
  LIORA_TOKEN_ADDRESS,
  MOCK_USDT_ADDRESS,
  PANCAKESWAP_ROUTER_ADDRESS,
  PANCAKESWAP_PAIR_ADDRESS,
  ILLUSTRATIVE_USD_INR_RATE,
  ERC20_ABI,
  PANCAKESWAP_ROUTER_ABI,
  fetchOnChainPoolState,
  fetchUserTestnetBalances,
  calculateOnChainSwapQuote,
  getWalletSwapHistory,
  saveWalletSwapRecord,
  type OnChainPoolState,
  type UserTestnetBalances,
  type CalculatedSwapQuote,
  type VerifiedSwapRecord,
} from '../lib/dex/dexOnChainClient';

export interface UseDexOnChainSwapReturn {
  // Pool state
  pool: OnChainPoolState | null;
  isPoolLoading: boolean;
  poolError: string | null;
  refreshPool: () => Promise<void>;

  // User Balances
  balances: UserTestnetBalances | null;
  isBalancesLoading: boolean;
  balancesError: string | null;
  refreshBalances: () => Promise<void>;

  // Trading Form State
  direction: 'LIORA -> mUSDT' | 'mUSDT -> LIORA';
  toggleDirection: () => void;
  setDirection: (dir: 'LIORA -> mUSDT' | 'mUSDT -> LIORA') => void;
  fromSymbol: string;
  toSymbol: string;
  amountIn: string;
  setAmountIn: (val: string) => void;
  slippagePercent: number;
  setSlippagePercent: (val: number) => void;
  quote: CalculatedSwapQuote;

  // Validation
  hasInsufficientBalance: boolean;
  isInputZeroOrEmpty: boolean;
  needsApproval: boolean;

  // Actions & Execution
  isApproving: boolean;
  isSwapping: boolean;
  pendingTxHash: string | null;
  approvalError: string | null;
  swapError: string | null;
  lastExecutedSwap: VerifiedSwapRecord | null;
  approveToken: () => Promise<boolean>;
  executeSwap: () => Promise<boolean>;
  clearErrors: () => void;
  setMaxAmount: () => void;

  // Transaction History
  history: VerifiedSwapRecord[];
  refreshHistory: () => void;

  // Network State
  isBscTestnet: boolean;
  isConnected: boolean;
  address: string | null;
}

export function useDexOnChainSwap(): UseDexOnChainSwapReturn {
  const { address, isConnected, isBscTestnet, chainId, activeProvider } = useWeb3Wallet();

  // Pool state
  const [pool, setPool] = useState<OnChainPoolState | null>(null);
  const [isPoolLoading, setIsPoolLoading] = useState<boolean>(true);
  const [poolError, setPoolError] = useState<string | null>(null);

  // User balances
  const [balances, setBalances] = useState<UserTestnetBalances | null>(null);
  const [isBalancesLoading, setIsBalancesLoading] = useState<boolean>(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);

  // Trade form
  const [direction, setDirection] = useState<'LIORA -> mUSDT' | 'mUSDT -> LIORA'>('mUSDT -> LIORA');
  const [amountIn, setAmountIn] = useState<string>('1.0');
  const [slippagePercent, setSlippagePercent] = useState<number>(0.5);

  // Execution states
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [lastExecutedSwap, setLastExecutedSwap] = useState<VerifiedSwapRecord | null>(null);

  // Transaction History
  const [history, setHistory] = useState<VerifiedSwapRecord[]>([]);

  const fromSymbol = direction === 'LIORA -> mUSDT' ? 'LIORA' : 'mUSDT';
  const toSymbol = direction === 'LIORA -> mUSDT' ? 'mUSDT' : 'LIORA';

  // Load pool state
  const loadPool = useCallback(async () => {
    setIsPoolLoading(true);
    setPoolError(null);
    try {
      const state = await fetchOnChainPoolState();
      setPool(state);
    } catch (err: any) {
      console.error('Failed to read PancakeSwap V2 pool reserves:', err);
      setPool(null);
      setPoolError(
        'Failed to read live reserves from BSC Testnet RPC. Please check network connectivity or refresh.'
      );
    } finally {
      setIsPoolLoading(false);
    }
  }, []);

  // Load user balances
  const loadBalances = useCallback(async () => {
    if (!address || !isConnected) {
      setBalances(null);
      setIsBalancesLoading(false);
      return;
    }
    setIsBalancesLoading(true);
    setBalancesError(null);
    try {
      const b = await fetchUserTestnetBalances(address);
      setBalances(b);
    } catch (err: any) {
      console.warn('Failed to read user balances from BSC Testnet:', err);
      setBalancesError('Could not load token balances from testnet.');
    } finally {
      setIsBalancesLoading(false);
    }
  }, [address, isConnected]);

  // Load history
  const refreshHistory = useCallback(() => {
    setHistory(getWalletSwapHistory(address));
  }, [address]);

  const clearErrors = useCallback(() => {
    setApprovalError(null);
    setSwapError(null);
  }, []);

  // Initial load & polling
  useEffect(() => {
    loadPool();
    const interval = setInterval(() => {
      loadPool();
    }, 15000); // 15s poll
    return () => clearInterval(interval);
  }, [loadPool]);

  useEffect(() => {
    setBalances(null);
    setPendingTxHash(null);
    clearErrors();

    if (address && isConnected) {
      loadBalances();
      refreshHistory();
      const interval = setInterval(() => {
        loadBalances();
      }, 15000);
      return () => clearInterval(interval);
    } else {
      setBalances(null);
    }
  }, [address, isConnected, loadBalances, refreshHistory, clearErrors]);

  // Toggle trade direction
  const toggleDirection = useCallback(() => {
    setDirection((prev) => (prev === 'LIORA -> mUSDT' ? 'mUSDT -> LIORA' : 'LIORA -> mUSDT'));
  }, []);

  // Calculate live executable quote
  const quote = useMemo<CalculatedSwapQuote>(() => {
    if (!pool) {
      return {
        direction,
        amountInRaw: 0n,
        amountInFormatted: amountIn,
        expectedAmountOutRaw: 0n,
        expectedAmountOutFormatted: '0.00',
        minAmountOutRaw: 0n,
        minAmountOutFormatted: '0.00',
        executionPrice: 0,
        spotPrice: 0,
        priceImpactPercent: 0,
        tradingFeeRaw: 0n,
        tradingFeeFormatted: '0.00',
        slippageTolerancePercent: slippagePercent,
        hasSufficientLiquidity: false,
        error: poolError || 'Loading pool reserves...',
      };
    }
    return calculateOnChainSwapQuote(direction, amountIn, slippagePercent, pool);
  }, [pool, direction, amountIn, slippagePercent, poolError]);

  // Validation
  const numInput = parseFloat(amountIn) || 0;
  const isInputZeroOrEmpty = !amountIn || numInput <= 0;

  const currentAvailableBalanceRaw = useMemo(() => {
    if (!balances) return 0n;
    return direction === 'LIORA -> mUSDT' ? balances.lioraRaw : balances.usdtRaw;
  }, [balances, direction]);

  const hasInsufficientBalance = useMemo(() => {
    if (!balances || isInputZeroOrEmpty) return false;
    return quote.amountInRaw > currentAvailableBalanceRaw;
  }, [balances, quote.amountInRaw, currentAvailableBalanceRaw, isInputZeroOrEmpty]);

  // Check if ERC-20 approval is required
  const needsApproval = useMemo(() => {
    if (!balances || isInputZeroOrEmpty || quote.amountInRaw <= 0n) return false;
    const allowance = direction === 'LIORA -> mUSDT' ? balances.lioraAllowance : balances.usdtAllowance;
    return allowance < quote.amountInRaw;
  }, [balances, direction, isInputZeroOrEmpty, quote.amountInRaw]);

  // Set Max Amount helper
  const setMaxAmount = useCallback(() => {
    if (!balances) return;
    const maxVal = direction === 'LIORA -> mUSDT' ? balances.lioraFormatted : balances.usdtFormatted;
    setAmountIn(maxVal.replace(/,/g, ''));
  }, [balances, direction]);

  // Approve token
  const approveToken = useCallback(async (): Promise<boolean> => {
    clearErrors();

    if (!isTestnetSandboxEnabled()) {
      setApprovalError('Testnet swap approvals are disabled in production.');
      return false;
    }

    const provider = resolveEip1193Provider(activeProvider);
    if (!provider) {
      setApprovalError('No compatible Web3 browser wallet detected.');
      return false;
    }

    try {
      validateProviderForBscTestnet(provider);
    } catch (valErr: any) {
      setApprovalError(valErr.message);
      return false;
    }

    if (!isConnected || !address) {
      setApprovalError('Please connect your wallet first.');
      return false;
    }

    if (!isBscTestnet) {
      setApprovalError('Unsupported network. Please switch to BNB Smart Chain Testnet (#97).');
      return false;
    }

    // Verify chain ID directly from provider
    try {
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);
      if (currentChainId !== 97) {
        setApprovalError('Your wallet is not connected to BNB Smart Chain Testnet (Chain ID 97). Please switch networks in your wallet.');
        return false;
      }

      // Verify active account matches displayed account
      const currentAccounts = await provider.request({ method: 'eth_accounts' });
      const activeAccount = currentAccounts && currentAccounts.length > 0 ? currentAccounts[0] : null;
      if (!activeAccount || activeAccount.toLowerCase() !== address.toLowerCase()) {
        setApprovalError('Active wallet account changed in your extension. Please refresh your transaction details.');
        return false;
      }
    } catch {
      // Continue with validation
    }

    // Verify native gas balance
    if (balances && balances.bnbFormatted && parseFloat(balances.bnbFormatted) <= 0.0001) {
      setApprovalError('Insufficient tBNB balance to pay for transaction gas on BSC Testnet. Please fund your wallet from the faucet.');
      return false;
    }

    const tokenAddress = direction === 'LIORA -> mUSDT' ? LIORA_TOKEN_ADDRESS : MOCK_USDT_ADDRESS;
    const routerAddress = PANCAKESWAP_ROUTER_ADDRESS;
    const amountToApprove = quote.amountInRaw;

    if (amountToApprove <= 0n) {
      setApprovalError('Invalid approval amount. Please enter a valid trade quantity.');
      return false;
    }

    setIsApproving(true);
    try {
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [getAddress(routerAddress), amountToApprove],
      });

      const txParams: Record<string, any> = {
        from: getAddress(address),
        to: getAddress(tokenAddress),
        data,
        value: '0x0',
      };

      // Best-effort gas estimation to pre-detect reverts
      try {
        const estGas = await provider.request({
          method: 'eth_estimateGas',
          params: [txParams],
        });
        if (estGas) {
          txParams.gas = estGas;
        }
      } catch (estErr) {
        // Allow wallet to estimate gas internally
      }

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      setPendingTxHash(txHash);
      // Wait for confirmation then reload balances
      await new Promise((r) => setTimeout(r, 4000));
      await loadBalances();
      setPendingTxHash(null);
      return true;
    } catch (err: any) {
      const safeMessage = classifyWalletError(err);
      console.error('Approval failed:', safeMessage);
      setApprovalError(safeMessage);
      setPendingTxHash(null);
      return false;
    } finally {
      setIsApproving(false);
    }
  }, [
    clearErrors,
    activeProvider,
    isConnected,
    address,
    isBscTestnet,
    balances,
    direction,
    quote.amountInRaw,
    loadBalances,
  ]);

  // Execute Swap
  const executeSwap = useCallback(async (): Promise<boolean> => {
    clearErrors();

    if (!isTestnetSandboxEnabled()) {
      setSwapError('Testnet DEX swap execution is disabled in production.');
      return false;
    }

    const provider = resolveEip1193Provider(activeProvider);
    if (!provider) {
      setSwapError('No compatible Web3 browser wallet detected.');
      return false;
    }

    try {
      validateProviderForBscTestnet(provider);
    } catch (valErr: any) {
      setSwapError(valErr.message);
      return false;
    }

    if (!isConnected || !address) {
      setSwapError('Please connect your wallet to execute swap.');
      return false;
    }

    if (!isBscTestnet) {
      setSwapError('Please switch network to BNB Smart Chain Testnet (#97).');
      return false;
    }

    // Verify chain ID directly from provider
    try {
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);
      if (currentChainId !== 97) {
        setSwapError('Your wallet is not connected to BNB Smart Chain Testnet (Chain ID 97). Please switch networks in your wallet.');
        return false;
      }

      // Verify active account matches displayed account
      const currentAccounts = await provider.request({ method: 'eth_accounts' });
      const activeAccount = currentAccounts && currentAccounts.length > 0 ? currentAccounts[0] : null;
      if (!activeAccount || activeAccount.toLowerCase() !== address.toLowerCase()) {
        setSwapError('Active wallet account changed in your extension. Please refresh your transaction details.');
        return false;
      }
    } catch {
      // Continue with validation
    }

    if (needsApproval) {
      setSwapError('Token allowance must be approved prior to swapping.');
      return false;
    }

    if (!quote.hasSufficientLiquidity || quote.expectedAmountOutRaw <= 0n) {
      setSwapError('Cannot execute swap: insufficient liquidity or invalid output.');
      return false;
    }

    // Verify gas balance
    if (balances && balances.bnbFormatted && parseFloat(balances.bnbFormatted) <= 0.0001) {
      setSwapError('Insufficient tBNB balance to pay for transaction gas on BSC Testnet. Please fund your wallet from the faucet.');
      return false;
    }

    setIsSwapping(true);
    try {
      const routerAddress = getAddress(PANCAKESWAP_ROUTER_ADDRESS);
      const recipient = getAddress(address);

      const path: Address[] =
        direction === 'LIORA -> mUSDT'
          ? [getAddress(LIORA_TOKEN_ADDRESS), getAddress(MOCK_USDT_ADDRESS)]
          : [getAddress(MOCK_USDT_ADDRESS), getAddress(LIORA_TOKEN_ADDRESS)];

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 min deadline

      const data = encodeFunctionData({
        abi: PANCAKESWAP_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [quote.amountInRaw, quote.minAmountOutRaw, path, recipient, deadline],
      });

      const txParams: Record<string, any> = {
        from: getAddress(address),
        to: routerAddress,
        data,
        value: '0x0',
      };

      try {
        const estGas = await provider.request({
          method: 'eth_estimateGas',
          params: [txParams],
        });
        if (estGas) {
          txParams.gas = estGas;
        }
      } catch (estErr) {
        // Allow wallet to estimate gas internally
      }

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      setPendingTxHash(txHash);

      const record: VerifiedSwapRecord = {
        id: `swap_${Date.now()}`,
        txHash,
        direction,
        amountIn: `${amountIn} ${fromSymbol}`,
        amountOut: `${parseFloat(quote.expectedAmountOutFormatted).toFixed(4)} ${toSymbol}`,
        timestamp: Date.now(),
        status: 'CONFIRMED',
        explorerUrl: `https://testnet.bscscan.com/tx/${txHash}`,
      };

      saveWalletSwapRecord(address, record);
      setLastExecutedSwap(record);
      refreshHistory();

      // Wait and refresh balances & pool
      await new Promise((r) => setTimeout(r, 4000));
      await Promise.all([loadBalances(), loadPool()]);
      setPendingTxHash(null);
      return true;
    } catch (err: any) {
      const safeMessage = classifyWalletError(err);
      console.error('Swap execution failed:', safeMessage);
      setSwapError(safeMessage);
      setPendingTxHash(null);
      return false;
    } finally {
      setIsSwapping(false);
    }
  }, [
    clearErrors,
    activeProvider,
    isConnected,
    address,
    isBscTestnet,
    needsApproval,
    quote,
    balances,
    direction,
    amountIn,
    fromSymbol,
    toSymbol,
    refreshHistory,
    loadBalances,
    loadPool,
  ]);

  return {
    pool,
    isPoolLoading,
    poolError,
    refreshPool: loadPool,
    balances,
    isBalancesLoading,
    balancesError,
    refreshBalances: loadBalances,
    direction,
    toggleDirection,
    setDirection,
    fromSymbol,
    toSymbol,
    amountIn,
    setAmountIn,
    slippagePercent,
    setSlippagePercent,
    quote,
    hasInsufficientBalance,
    isInputZeroOrEmpty,
    needsApproval,
    isApproving,
    isSwapping,
    pendingTxHash,
    approvalError,
    swapError,
    lastExecutedSwap,
    approveToken,
    executeSwap,
    clearErrors,
    setMaxAmount,
    history,
    refreshHistory,
    isBscTestnet,
    isConnected,
    address,
  };
}
