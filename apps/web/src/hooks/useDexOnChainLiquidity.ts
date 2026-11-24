'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { encodeFunctionData, parseUnits, formatUnits, getAddress, type Address } from 'viem';
import { useWeb3Wallet } from './useWeb3Wallet';
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
  ERC20_ABI,
  PANCAKESWAP_PAIR_ABI,
  PANCAKESWAP_ROUTER_ABI,
  fetchOnChainLiquidityPoolState,
  fetchUserLiquidityPosition,
  calculateAddLiquidityQuote,
  calculateRemoveLiquidityQuote,
  getWalletLiquidityHistory,
  saveWalletLiquidityRecord,
  type OnChainLiquidityPoolState,
  type UserLiquidityPosition,
  type AddLiquidityQuote,
  type RemoveLiquidityQuote,
  type VerifiedLiquidityRecord,
} from '../lib/dex/dexOnChainClient';

export interface UseDexOnChainLiquidityReturn {
  // Pool State
  pool: OnChainLiquidityPoolState | null;
  isPoolLoading: boolean;
  poolError: string | null;
  refreshPool: () => Promise<void>;

  // User Position
  position: UserLiquidityPosition | null;
  isPositionLoading: boolean;
  positionError: string | null;
  refreshPosition: () => Promise<void>;

  // Add Liquidity State
  addAmountLiora: string;
  setAddAmountLiora: (val: string) => void;
  addAmountUsdt: string;
  setAddAmountUsdt: (val: string) => void;
  addInputField: 'LIORA' | 'mUSDT';
  handleLioraInputChange: (val: string) => void;
  handleUsdtInputChange: (val: string) => void;
  setMaxLiora: () => void;
  setMaxUsdt: () => void;
  addSlippagePercent: number;
  setAddSlippagePercent: (val: number) => void;
  addQuote: AddLiquidityQuote;

  // Remove Liquidity State
  withdrawPercent: number;
  setWithdrawPercent: (pct: number) => void;
  customLpInput: string;
  setCustomLpInput: (val: string) => void;
  removeSlippagePercent: number;
  setRemoveSlippagePercent: (val: number) => void;
  removeQuote: RemoveLiquidityQuote;

  // Execution & Action States
  isApprovingLiora: boolean;
  isApprovingUsdt: boolean;
  isApprovingLp: boolean;
  isSupplying: boolean;
  isRemoving: boolean;
  pendingTxHash: string | null;
  actionError: string | null;
  lastExecutedTx: VerifiedLiquidityRecord | null;
  clearActionError: () => void;

  // Actions
  approveLiora: () => Promise<boolean>;
  approveUsdt: () => Promise<boolean>;
  approveLpToken: () => Promise<boolean>;
  supplyLiquidity: () => Promise<boolean>;
  removeLiquidity: () => Promise<boolean>;

  // History
  history: VerifiedLiquidityRecord[];
  refreshHistory: () => void;

  // Network & Wallet
  isBscTestnet: boolean;
  isConnected: boolean;
  address: string | null;
  activeWalletInfo?: any;
  walletName?: string;
}

export function useDexOnChainLiquidity(): UseDexOnChainLiquidityReturn {
  const { address, isConnected, isBscTestnet, activeProvider, activeWalletInfo } = useWeb3Wallet();

  // Pool State
  const [pool, setPool] = useState<OnChainLiquidityPoolState | null>(null);
  const [isPoolLoading, setIsPoolLoading] = useState<boolean>(true);
  const [poolError, setPoolError] = useState<string | null>(null);

  // User Position State
  const [position, setPosition] = useState<UserLiquidityPosition | null>(null);
  const [isPositionLoading, setIsPositionLoading] = useState<boolean>(false);
  const [positionError, setPositionError] = useState<string | null>(null);

  // Add Liquidity Form State
  const [addAmountLiora, setAddAmountLiora] = useState<string>('10.0');
  const [addAmountUsdt, setAddAmountUsdt] = useState<string>('');
  const [addInputField, setAddInputField] = useState<'LIORA' | 'mUSDT'>('LIORA');
  const [addSlippagePercent, setAddSlippagePercent] = useState<number>(0.5);

  // Remove Liquidity Form State
  const [withdrawPercent, setWithdrawPercent] = useState<number>(50);
  const [customLpInput, setCustomLpInput] = useState<string>('');
  const [removeSlippagePercent, setRemoveSlippagePercent] = useState<number>(0.5);

  // Action States
  const [isApprovingLiora, setIsApprovingLiora] = useState<boolean>(false);
  const [isApprovingUsdt, setIsApprovingUsdt] = useState<boolean>(false);
  const [isApprovingLp, setIsApprovingLp] = useState<boolean>(false);
  const [isSupplying, setIsSupplying] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastExecutedTx, setLastExecutedTx] = useState<VerifiedLiquidityRecord | null>(null);

  // History State
  const [history, setHistory] = useState<VerifiedLiquidityRecord[]>(() =>
    getWalletLiquidityHistory(address)
  );

  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  const refreshHistory = useCallback(() => {
    setHistory(getWalletLiquidityHistory(address));
  }, [address]);

  // Load Pool State
  const loadPool = useCallback(async () => {
    try {
      setIsPoolLoading(true);
      setPoolError(null);
      const data = await fetchOnChainLiquidityPoolState();
      setPool(data);
    } catch (err: any) {
      console.warn('Failed to fetch liquidity pool state:', err);
      setPoolError('Unable to read PancakeSwap V2 pool reserves on BSC Testnet.');
    } finally {
      setIsPoolLoading(false);
    }
  }, []);

  // Load User Position
  const loadPosition = useCallback(async () => {
    if (!address) {
      setPosition(null);
      return;
    }
    try {
      setIsPositionLoading(true);
      setPositionError(null);
      const data = await fetchUserLiquidityPosition(address);
      setPosition(data);
    } catch (err: any) {
      console.warn('Failed to fetch user liquidity position:', err);
      setPositionError('Unable to read LP balance and token allowances.');
    } finally {
      setIsPositionLoading(false);
    }
  }, [address]);

  // Initial & Polling Effects (every 15s)
  useEffect(() => {
    loadPool();
    const interval = setInterval(() => {
      loadPool();
    }, 15_000);
    return () => clearInterval(interval);
  }, [loadPool]);

  useEffect(() => {
    // Immediately clear position and transient execution state when account changes
    setPosition(null);
    setPendingTxHash(null);
    clearActionError();

    if (address && isConnected) {
      loadPosition();
      refreshHistory();
      const interval = setInterval(() => {
        loadPosition();
      }, 15_000);
      return () => clearInterval(interval);
    } else {
      setPosition(null);
    }
  }, [address, isConnected, loadPosition, refreshHistory, clearActionError]);

  // Linked Two-Way Input Handlers
  const handleLioraInputChange = useCallback(
    (val: string) => {
      setAddAmountLiora(val);
      setAddInputField('LIORA');
      if (!val || isNaN(Number(val)) || Number(val) <= 0 || !pool || pool.reserveLiora === 0n) {
        setAddAmountUsdt('');
        return;
      }
      try {
        const lioraRaw = parseUnits(val, 18);
        const usdtRaw = (lioraRaw * pool.reserveUsdt) / pool.reserveLiora;
        const usdtNum = Number(usdtRaw) / 1e18;
        setAddAmountUsdt(usdtNum > 0 ? usdtNum.toFixed(4) : '');
      } catch {
        setAddAmountUsdt('');
      }
    },
    [pool]
  );

  const handleUsdtInputChange = useCallback(
    (val: string) => {
      setAddAmountUsdt(val);
      setAddInputField('mUSDT');
      if (!val || isNaN(Number(val)) || Number(val) <= 0 || !pool || pool.reserveUsdt === 0n) {
        setAddAmountLiora('');
        return;
      }
      try {
        const usdtRaw = parseUnits(val, 18);
        const lioraRaw = (usdtRaw * pool.reserveLiora) / pool.reserveUsdt;
        const lioraNum = Number(lioraRaw) / 1e18;
        setAddAmountLiora(lioraNum > 0 ? lioraNum.toFixed(4) : '');
      } catch {
        setAddAmountLiora('');
      }
    },
    [pool]
  );

  // Sync initial mUSDT calculation once pool loads
  useEffect(() => {
    if (pool && addInputField === 'LIORA' && addAmountLiora && !addAmountUsdt) {
      handleLioraInputChange(addAmountLiora);
    }
  }, [pool, addInputField, addAmountLiora, addAmountUsdt, handleLioraInputChange]);

  const setMaxLiora = useCallback(() => {
    if (!position || position.lioraBalanceRaw === 0n) return;
    const maxVal = (Number(position.lioraBalanceRaw) / 1e18).toFixed(4);
    handleLioraInputChange(maxVal);
  }, [position, handleLioraInputChange]);

  const setMaxUsdt = useCallback(() => {
    if (!position || position.usdtBalanceRaw === 0n) return;
    const maxVal = (Number(position.usdtBalanceRaw) / 1e18).toFixed(4);
    handleUsdtInputChange(maxVal);
  }, [position, handleUsdtInputChange]);

  // Derived Add Liquidity Quote
  const addQuote = useMemo(() => {
    if (!pool) {
      return calculateAddLiquidityQuote('LIORA', '0', addSlippagePercent, {
        pairAddress: PANCAKESWAP_PAIR_ADDRESS,
        reserveLiora: 0n,
        reserveUsdt: 0n,
        formattedLiora: '0.00',
        formattedUsdt: '0.00',
        totalLpSupply: 0n,
        formattedTotalLpSupply: '0.00',
        ratioLioraPerUsdt: 0,
        ratioUsdtPerLiora: 0,
        spotPriceUsd: 0,
        spotPriceInr: 0,
        blockTimestampLast: 0,
        isHealthy: false,
        token0Address: '',
        token1Address: '',
      });
    }
    const currentInput = addInputField === 'LIORA' ? addAmountLiora : addAmountUsdt;
    return calculateAddLiquidityQuote(addInputField, currentInput, addSlippagePercent, pool, position);
  }, [pool, addInputField, addAmountLiora, addAmountUsdt, addSlippagePercent, position]);

  // Derived Remove Liquidity Quote
  const removeQuote = useMemo(() => {
    if (!pool) {
      return calculateRemoveLiquidityQuote(0, '0', removeSlippagePercent, {
        pairAddress: PANCAKESWAP_PAIR_ADDRESS,
        reserveLiora: 0n,
        reserveUsdt: 0n,
        formattedLiora: '0.00',
        formattedUsdt: '0.00',
        totalLpSupply: 0n,
        formattedTotalLpSupply: '0.00',
        ratioLioraPerUsdt: 0,
        ratioUsdtPerLiora: 0,
        spotPriceUsd: 0,
        spotPriceInr: 0,
        blockTimestampLast: 0,
        isHealthy: false,
        token0Address: '',
        token1Address: '',
      });
    }
    return calculateRemoveLiquidityQuote(
      withdrawPercent,
      customLpInput,
      removeSlippagePercent,
      pool,
      position
    );
  }, [pool, withdrawPercent, customLpInput, removeSlippagePercent, position]);

  // Prerequisite Verification Helper (Guarantees active provider and account match displayed state)
  const verifyExecutionPrerequisites = useCallback(
    async (provider: any): Promise<{ valid: boolean; account?: string; error?: string }> => {
      if (!provider) {
        return { valid: false, error: 'No compatible Web3 browser wallet detected.' };
      }
      try {
        validateProviderForBscTestnet(provider);
      } catch (valErr: any) {
        return { valid: false, error: valErr.message };
      }
      if (!isConnected || !address) {
        return { valid: false, error: 'Please connect your wallet first.' };
      }
      if (!isBscTestnet) {
        return {
          valid: false,
          error: 'Unsupported network. Please switch to BNB Smart Chain Testnet (#97).',
        };
      }

      // Live verification of active provider accounts
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        const currentAccount = accounts && accounts.length > 0 ? accounts[0] : null;
        if (!currentAccount || currentAccount.toLowerCase() !== address.toLowerCase()) {
          return {
            valid: false,
            error:
              'Active wallet account changed in your extension. Please verify your selected account and refresh.',
          };
        }

        // Live verification of provider chainId
        const chainHex = await provider.request({ method: 'eth_chainId' });
        const currentChain = parseInt(chainHex, 16);
        if (currentChain !== 97) {
          return {
            valid: false,
            error:
              'Wallet network changed. Please ensure you are connected to BNB Smart Chain Testnet (Chain ID 97).',
          };
        }

        return { valid: true, account: currentAccount };
      } catch (err: any) {
        return { valid: false, error: 'Failed to verify live wallet status with provider.' };
      }
    },
    [isConnected, address, isBscTestnet]
  );

  // APPROVE LIORA
  const approveLiora = useCallback(async (): Promise<boolean> => {
    clearActionError();
    const provider = resolveEip1193Provider(activeProvider);
    if (!provider) {
      setActionError('No compatible EVM wallet provider available.');
      return false;
    }
    const check = await verifyExecutionPrerequisites(provider);
    if (!check.valid || !check.account) {
      setActionError(check.error || 'Transaction aborted.');
      return false;
    }

    const routerAddress = PANCAKESWAP_ROUTER_ADDRESS;
    const amountToApprove = addQuote.amountLioraRaw;
    if (amountToApprove <= 0n) {
      setActionError('Please enter a valid LIORA amount before approving.');
      return false;
    }

    setIsApprovingLiora(true);
    try {
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [getAddress(routerAddress), amountToApprove],
      });

      const txParams = {
        from: getAddress(check.account),
        to: getAddress(LIORA_TOKEN_ADDRESS),
        data,
        value: '0x0',
      };

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      setPendingTxHash(txHash);
      await new Promise((r) => setTimeout(r, 4000));
      await loadPosition();
      setPendingTxHash(null);
      return true;
    } catch (err: any) {
      const safeMessage = classifyWalletError(err);
      console.error('LIORA approval failed:', safeMessage);
      setActionError(safeMessage);
      setPendingTxHash(null);
      return false;
    } finally {
      setIsApprovingLiora(false);
    }
  }, [clearActionError, activeProvider, verifyExecutionPrerequisites, addQuote.amountLioraRaw, loadPosition]);

  // APPROVE mUSDT
  const approveUsdt = useCallback(async (): Promise<boolean> => {
    clearActionError();
    const provider = resolveEip1193Provider(activeProvider);
    if (!provider) {
      setActionError('No compatible EVM wallet provider available.');
      return false;
    }
    const check = await verifyExecutionPrerequisites(provider);
    if (!check.valid || !check.account) {
      setActionError(check.error || 'Transaction aborted.');
      return false;
    }

    const routerAddress = PANCAKESWAP_ROUTER_ADDRESS;
    const amountToApprove = addQuote.amountUsdtRaw;
    if (amountToApprove <= 0n) {
      setActionError('Please enter a valid mUSDT amount before approving.');
      return false;
    }

    setIsApprovingUsdt(true);
    try {
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [getAddress(routerAddress), amountToApprove],
      });

      const txParams = {
        from: getAddress(check.account),
        to: getAddress(MOCK_USDT_ADDRESS),
        data,
        value: '0x0',
      };

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      setPendingTxHash(txHash);
      await new Promise((r) => setTimeout(r, 4000));
      await loadPosition();
      setPendingTxHash(null);
      return true;
    } catch (err: any) {
      const safeMessage = classifyWalletError(err);
      console.error('mUSDT approval failed:', safeMessage);
      setActionError(safeMessage);
      setPendingTxHash(null);
      return false;
    } finally {
      setIsApprovingUsdt(false);
    }
  }, [clearActionError, activeProvider, verifyExecutionPrerequisites, addQuote.amountUsdtRaw, loadPosition]);

  // APPROVE CAKE-LP TOKEN (For Remove Liquidity)
  const approveLpToken = useCallback(async (): Promise<boolean> => {
    clearActionError();
    const provider = resolveEip1193Provider(activeProvider);
    if (!provider) {
      setActionError('No compatible EVM wallet provider available.');
      return false;
    }
    const check = await verifyExecutionPrerequisites(provider);
    if (!check.valid || !check.account) {
      setActionError(check.error || 'Transaction aborted.');
      return false;
    }

    const routerAddress = PANCAKESWAP_ROUTER_ADDRESS;
    const amountToApprove = removeQuote.lpBurnAmountRaw;
    if (amountToApprove <= 0n) {
      setActionError('Please select an LP withdrawal amount before approving.');
      return false;
    }

    setIsApprovingLp(true);
    try {
      const data = encodeFunctionData({
        abi: PANCAKESWAP_PAIR_ABI,
        functionName: 'approve',
        args: [getAddress(routerAddress), amountToApprove],
      });

      const txParams = {
        from: getAddress(check.account),
        to: getAddress(PANCAKESWAP_PAIR_ADDRESS),
        data,
        value: '0x0',
      };

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      setPendingTxHash(txHash);
      await new Promise((r) => setTimeout(r, 4000));
      await loadPosition();
      setPendingTxHash(null);
      return true;
    } catch (err: any) {
      const safeMessage = classifyWalletError(err);
      console.error('LP token approval failed:', safeMessage);
      setActionError(safeMessage);
      setPendingTxHash(null);
      return false;
    } finally {
      setIsApprovingLp(false);
    }
  }, [clearActionError, activeProvider, verifyExecutionPrerequisites, removeQuote.lpBurnAmountRaw, loadPosition]);

  // SUPPLY LIQUIDITY
  const supplyLiquidity = useCallback(async (): Promise<boolean> => {
    clearActionError();
    const provider = resolveEip1193Provider(activeProvider);
    if (!provider) {
      setActionError('No compatible EVM wallet provider available.');
      return false;
    }
    const check = await verifyExecutionPrerequisites(provider);
    if (!check.valid || !check.account) {
      setActionError(check.error || 'Transaction aborted.');
      return false;
    }

    if (addQuote.needsLioraApproval || addQuote.needsUsdtApproval) {
      setActionError('Both LIORA and mUSDT token allowances must be approved prior to adding liquidity.');
      return false;
    }
    if (!addQuote.hasSufficientLioraBalance || !addQuote.hasSufficientUsdtBalance) {
      setActionError('Insufficient token balance to complete liquidity provision.');
      return false;
    }

    setIsSupplying(true);
    try {
      const routerAddress = getAddress(PANCAKESWAP_ROUTER_ADDRESS);
      const recipient = getAddress(check.account);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minute auto-expiry

      const data = encodeFunctionData({
        abi: PANCAKESWAP_ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          getAddress(LIORA_TOKEN_ADDRESS),
          getAddress(MOCK_USDT_ADDRESS),
          addQuote.amountLioraRaw,
          addQuote.amountUsdtRaw,
          addQuote.amountLioraMinRaw,
          addQuote.amountUsdtMinRaw,
          recipient,
          deadline,
        ],
      });

      const txParams = {
        from: getAddress(check.account),
        to: routerAddress,
        data,
        value: '0x0',
      };

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      setPendingTxHash(txHash);

      const record: VerifiedLiquidityRecord = {
        id: `liq_add_${Date.now()}`,
        txHash,
        type: 'ADD_LIQUIDITY',
        amountLiora: `${Number(formatUnits(addQuote.amountLioraRaw, 18)).toFixed(4)} LIORA`,
        amountUsdt: `${Number(formatUnits(addQuote.amountUsdtRaw, 18)).toFixed(4)} mUSDT`,
        lpAmount: `~${addQuote.expectedLpMintedFormatted} Cake-LP`,
        timestamp: Date.now(),
        status: 'CONFIRMED',
        explorerUrl: `https://testnet.bscscan.com/tx/${txHash}`,
      };

      saveWalletLiquidityRecord(check.account, record);
      setLastExecutedTx(record);
      refreshHistory();

      // Refresh on-chain states
      await new Promise((r) => setTimeout(r, 4000));
      await Promise.all([loadPosition(), loadPool()]);
      setPendingTxHash(null);
      return true;
    } catch (err: any) {
      const safeMessage = classifyWalletError(err);
      console.error('Add liquidity failed:', safeMessage);
      setActionError(safeMessage);
      setPendingTxHash(null);
      return false;
    } finally {
      setIsSupplying(false);
    }
  }, [
    clearActionError,
    activeProvider,
    verifyExecutionPrerequisites,
    addQuote,
    refreshHistory,
    loadPosition,
    loadPool,
  ]);

  // REMOVE LIQUIDITY
  const removeLiquidity = useCallback(async (): Promise<boolean> => {
    clearActionError();
    const provider = resolveEip1193Provider(activeProvider);
    if (!provider) {
      setActionError('No compatible EVM wallet provider available.');
      return false;
    }
    const check = await verifyExecutionPrerequisites(provider);
    if (!check.valid || !check.account) {
      setActionError(check.error || 'Transaction aborted.');
      return false;
    }

    if (!removeQuote.hasEnoughLpBalance || removeQuote.lpBurnAmountRaw <= 0n) {
      setActionError('Cannot remove liquidity: insufficient or zero LP token balance.');
      return false;
    }
    if (removeQuote.needsLpApproval) {
      setActionError('Cake-LP allowance must be approved prior to redeeming liquidity.');
      return false;
    }

    setIsRemoving(true);
    try {
      const routerAddress = getAddress(PANCAKESWAP_ROUTER_ADDRESS);
      const recipient = getAddress(check.account);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minute deadline

      const data = encodeFunctionData({
        abi: PANCAKESWAP_ROUTER_ABI,
        functionName: 'removeLiquidity',
        args: [
          getAddress(LIORA_TOKEN_ADDRESS),
          getAddress(MOCK_USDT_ADDRESS),
          removeQuote.lpBurnAmountRaw,
          removeQuote.minLioraRaw,
          removeQuote.minUsdtRaw,
          recipient,
          deadline,
        ],
      });

      const txParams = {
        from: getAddress(check.account),
        to: routerAddress,
        data,
        value: '0x0',
      };

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      setPendingTxHash(txHash);

      const record: VerifiedLiquidityRecord = {
        id: `liq_rem_${Date.now()}`,
        txHash,
        type: 'REMOVE_LIQUIDITY',
        amountLiora: `${removeQuote.expectedLioraFormatted} LIORA`,
        amountUsdt: `${removeQuote.expectedUsdtFormatted} mUSDT`,
        lpAmount: `${removeQuote.lpBurnAmountFormatted} Cake-LP`,
        timestamp: Date.now(),
        status: 'CONFIRMED',
        explorerUrl: `https://testnet.bscscan.com/tx/${txHash}`,
      };

      saveWalletLiquidityRecord(check.account, record);
      setLastExecutedTx(record);
      refreshHistory();

      // Refresh on-chain states
      await new Promise((r) => setTimeout(r, 4000));
      await Promise.all([loadPosition(), loadPool()]);
      setPendingTxHash(null);
      return true;
    } catch (err: any) {
      const safeMessage = classifyWalletError(err);
      console.error('Remove liquidity failed:', safeMessage);
      setActionError(safeMessage);
      setPendingTxHash(null);
      return false;
    } finally {
      setIsRemoving(false);
    }
  }, [
    clearActionError,
    activeProvider,
    verifyExecutionPrerequisites,
    removeQuote,
    refreshHistory,
    loadPosition,
    loadPool,
  ]);

  return {
    pool,
    isPoolLoading,
    poolError,
    refreshPool: loadPool,
    position,
    isPositionLoading,
    positionError,
    refreshPosition: loadPosition,
    addAmountLiora,
    setAddAmountLiora,
    addAmountUsdt,
    setAddAmountUsdt,
    addInputField,
    handleLioraInputChange,
    handleUsdtInputChange,
    setMaxLiora,
    setMaxUsdt,
    addSlippagePercent,
    setAddSlippagePercent,
    addQuote,
    withdrawPercent,
    setWithdrawPercent,
    customLpInput,
    setCustomLpInput,
    removeSlippagePercent,
    setRemoveSlippagePercent,
    removeQuote,
    isApprovingLiora,
    isApprovingUsdt,
    isApprovingLp,
    isSupplying,
    isRemoving,
    pendingTxHash,
    actionError,
    lastExecutedTx,
    clearActionError,
    approveLiora,
    approveUsdt,
    approveLpToken,
    supplyLiquidity,
    removeLiquidity,
    history,
    refreshHistory,
    isBscTestnet,
    isConnected,
    address,
    activeWalletInfo,
    walletName: activeWalletInfo?.name || 'MetaMask',
  };
}
