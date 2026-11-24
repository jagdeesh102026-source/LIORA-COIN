'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWeb3Wallet } from './useWeb3Wallet';
import { useDexOnChainLiquidity } from './useDexOnChainLiquidity';
import {
  PrimaryTokenSaleEngine,
  PrimarySaleQuote,
  PrimarySalePricingModel,
  PurchaseExecutionResult,
} from '../lib/sale/primaryTokenSaleEngine';
import { useTreasuryAccounting } from './useTreasuryAccounting';

export function usePrimaryTokenSale() {
  const { isConnected, address, chainId, switchToBscTestnet } = useWeb3Wallet();
  const { pool } = useDexOnChainLiquidity();
  const { refreshTreasury } = useTreasuryAccounting();

  const [usdtInput, setUsdtInput] = useState<string>('100');
  const [pricingModel, setPricingModel] = useState<PrimarySalePricingModel>('FIXED_BASELINE');
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);

  const isBscTestnet = chainId === 97;

  // Derive quote dynamically based on user input, pool state, and pricing model
  const quote = useMemo<PrimarySaleQuote>(() => {
    const spotPrice = pool?.spotPriceUsd || 0.002322;
    return PrimaryTokenSaleEngine.calculateSaleQuote(usdtInput, pricingModel, spotPrice, 0);
  }, [usdtInput, pricingModel, pool?.spotPriceUsd]);

  // Execute test purchase
  const executePurchase = useCallback(async (): Promise<boolean> => {
    setPurchaseError(null);
    setPurchaseSuccess(null);

    if (!isConnected || !address) {
      setPurchaseError('Please connect your Web3 wallet to continue.');
      return false;
    }
    if (!isBscTestnet) {
      setPurchaseError('Please switch to BNB Smart Chain Testnet (Chain ID 97).');
      return false;
    }
    if (!quote.isValid || !quote.isExecutable) {
      setPurchaseError(quote.executionDisabledReason || quote.error || 'Invalid purchase quote.');
      return false;
    }

    setIsPurchasing(true);
    try {
      // Simulate/Execute testnet purchase
      const result: PurchaseExecutionResult = PrimaryTokenSaleEngine.executePurchase(
        quote,
        address,
        false
      );

      if (!result.success || !result.receipt) {
        throw new Error(result.error || 'Purchase failed.');
      }

      setLastReceipt(result.receipt);
      setPurchaseSuccess(
        `Successfully purchased ${result.receipt.tokensDeliveredFormatted} LIORA! 100% of proceeds (${result.receipt.usdtPaidFormatted} USDT) allocated to protocol liquidity.`
      );
      refreshTreasury();
      return true;
    } catch (err: any) {
      setPurchaseError(err.message || 'Purchase transaction failed.');
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, [isConnected, address, isBscTestnet, quote, refreshTreasury]);

  return {
    usdtInput,
    setUsdtInput,
    pricingModel,
    setPricingModel,
    quote,
    isPurchasing,
    purchaseSuccess,
    purchaseError,
    lastReceipt,
    isBscTestnet,
    executePurchase,
    clearMessages: () => {
      setPurchaseSuccess(null);
      setPurchaseError(null);
    },
  };
}
