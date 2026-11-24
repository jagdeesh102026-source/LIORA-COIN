'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { useWeb3Wallet } from '../hooks/useWeb3Wallet';
import {
  BSC_TESTNET_CONFIG,
  BSC_TESTNET_TOKEN_ADDRESS,
  BSC_TESTNET_SALE_ADDRESS,
  TESTNET_SALE_TOKENS_PER_BNB,
} from '../config/tokenConfig';
import { bscTestnetPublicClient, formatTokenBalance } from '../lib/contracts/client';
import { OXENIQ_ABI } from '../lib/contracts/oxeniqAbi';
import { testnetSaleAbi } from '../lib/contracts/testnetSaleAbi';
import { validatePurchaseReceiptEvents } from '../lib/contracts/receiptValidation';
import { parseBnbInput, getPurchaseButtonState } from '../lib/purchase/purchaseLogic';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  ExternalLink,
  RefreshCw,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Coins,
} from 'lucide-react';
import { parseEther, encodeFunctionData, type Address } from 'viem';
import { PREVIEW_CONFIG } from '../config/previewConfig';

export function TestnetPurchaseTerminal() {
  const {
    isConnected,
    address,
    balance: userBnbBalance,
    isBscTestnet,
    switchToBscTestnet,
    connect,
  } = useWeb3Wallet();

  const [bnbAmount, setBnbAmount] = useState<string>('0.01');
  const [availableInventory, setAvailableInventory] = useState<bigint | null>(null);
  const [tokensPerBnb, setTokensPerBnb] = useState<number>(TESTNET_SALE_TOKENS_PER_BNB);
  const [userOxeniqBalance, setUserOxeniqBalance] = useState<bigint | null>(null);
  const [isContractPaused, setIsContractPaused] = useState<boolean>(false);
  const [isLoadingOnChain, setIsLoadingOnChain] = useState<boolean>(false);
  const [rpcError, setRpcError] = useState<string | null>(null);

  // Transaction lifecycle state
  const [txStatus, setTxStatus] = useState<
    'idle' | 'broadcasting' | 'confirming' | 'confirmed' | 'error'
  >('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Exact integer-safe token calculation using parseBnbInput from shared purchaseLogic
  const { bnbWei, calculatedTokensWei, isBnbValid, parseError } = useMemo(
    () => parseBnbInput(bnbAmount, tokensPerBnb),
    [bnbAmount, tokensPerBnb]
  );

  const isSaleConfigured = Boolean(BSC_TESTNET_SALE_ADDRESS);

  // Read live on-chain inventory and user token balance
  const fetchOnChainData = useCallback(async () => {
    if (!isSaleConfigured || !BSC_TESTNET_SALE_ADDRESS) {
      setAvailableInventory(null);
      return;
    }

    setIsLoadingOnChain(true);
    setRpcError(null);
    try {
      const [inventory, paused, rate] = await Promise.all([
        bscTestnetPublicClient.readContract({
          address: BSC_TESTNET_SALE_ADDRESS as Address,
          abi: testnetSaleAbi,
          functionName: 'getAvailableInventory',
        }),
        bscTestnetPublicClient.readContract({
          address: BSC_TESTNET_SALE_ADDRESS as Address,
          abi: testnetSaleAbi,
          functionName: 'paused',
        }),
        bscTestnetPublicClient.readContract({
          address: BSC_TESTNET_SALE_ADDRESS as Address,
          abi: testnetSaleAbi,
          functionName: 'TOKENS_PER_BNB',
        }),
      ]);

      setAvailableInventory(inventory as bigint);
      setIsContractPaused(paused as boolean);
      setTokensPerBnb(Number(rate));

      if (address) {
        const tokenBal = await bscTestnetPublicClient.readContract({
          address: BSC_TESTNET_TOKEN_ADDRESS as Address,
          abi: OXENIQ_ABI,
          functionName: 'balanceOf',
          args: [address as Address],
        });
        setUserOxeniqBalance(tokenBal as bigint);
      }
    } catch (err: any) {
      console.warn('Failed to query on-chain sale contract data:', err);
      setRpcError('Unable to load live contract data from BSC Testnet RPC. Please check your connection.');
    } finally {
      setIsLoadingOnChain(false);
    }
  }, [isSaleConfigured, address]);

  useEffect(() => {
    fetchOnChainData();
  }, [fetchOnChainData]);

  // Handle purchase submission
  const handlePurchase = async () => {
    if (!isSaleConfigured || !BSC_TESTNET_SALE_ADDRESS) return;
    if (!isConnected || !address || !isBscTestnet) return;
    if (!isBnbValid || bnbWei <= 0n) return;

    setTxStatus('broadcasting');
    setTxError(null);
    setTxHash(null);

    try {
      const provider = (window as any).ethereum;
      if (!provider || typeof provider.request !== 'function') {
        throw new Error('No compatible browser wallet found.');
      }

      const valueWei = bnbWei;
      const callData = encodeFunctionData({
        abi: testnetSaleAbi,
        functionName: 'buyTokens',
        args: [address as Address],
      });

      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            to: BSC_TESTNET_SALE_ADDRESS,
            value: `0x${valueWei.toString(16)}`,
            data: callData,
          },
        ],
      });

      setTxHash(hash);
      setTxStatus('confirming');

      // Wait for transaction confirmation
      const receipt = await bscTestnetPublicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 60_000,
      });

      // Strict on-chain receipt validation: decode and verify TokensPurchased event
      const validation = validatePurchaseReceiptEvents({
        receipt,
        expectedSaleAddress: BSC_TESTNET_SALE_ADDRESS,
        expectedBuyer: address,
        expectedRecipient: address,
        expectedBnbPaidWei: valueWei,
        expectedTokensDeliveredWei: calculatedTokensWei,
      });

      if (validation.isValid) {
        setTxStatus('confirmed');
        fetchOnChainData();
      } else {
        setTxStatus('error');
        setTxError(validation.error || 'Purchase verification failed: TokensPurchased event did not match expected criteria.');
      }
    } catch (err: any) {
      setTxStatus('error');
      if (
        err?.code === 4001 ||
        err?.message?.toLowerCase().includes('user rejected') ||
        err?.message?.toLowerCase().includes('cancelled')
      ) {
        setTxError('Purchase transaction was cancelled in your wallet.');
      } else {
        setTxError(err?.message || 'Transaction failed. Please try again.');
      }
    }
  };

  // Determine button state, label, icon, and action using shared purchaseLogic
  const buttonState = useMemo(() => {
    const rawState = getPurchaseButtonState({
      isSaleConfigured,
      isConnected,
      isBscTestnet,
      isContractPaused,
      isBnbValid,
      bnbWei,
      calculatedTokensWei,
      parseError,
      availableInventory,
      userBnbBalance,
      bnbAmount,
      txStatus,
    });

    let icon = Coins;
    let action: () => void = handlePurchase;

    if (PREVIEW_CONFIG.disableOnChainPurchases && rawState.actionType === 'purchase') {
      return {
        disabled: true,
        label: 'Preview Mode (On-Chain Writes Disabled)',
        icon: Lock,
        action: () => {},
      };
    }

    if (!isSaleConfigured || isContractPaused || availableInventory === 0n) {
      icon = Lock;
      action = () => {};
    } else if (rawState.actionType === 'connect') {
      // Connect Testnet Wallet when disconnected
      icon = Wallet;
      action = () => connect();
    } else if (rawState.actionType === 'switchToBscTestnet') {
      // Switch to BSC Testnet (Chain #97) when on unsupported chain or mainnet
      icon = ArrowRight;
      action = () => switchToBscTestnet();
    } else if (txStatus === 'broadcasting' || txStatus === 'confirming') {
      icon = RefreshCw;
      action = () => {};
    } else if (rawState.disabled) {
      icon = AlertCircle;
      action = () => {};
    }

    return {
      disabled: rawState.disabled,
      label: rawState.label,
      icon,
      action,
    };
  }, [
    isSaleConfigured,
    isConnected,
    isBscTestnet,
    isContractPaused,
    isBnbValid,
    bnbWei,
    calculatedTokensWei,
    parseError,
    availableInventory,
    userBnbBalance,
    bnbAmount,
    txStatus,
    connect,
    switchToBscTestnet,
  ]);

  const presetAmounts = ['0.001', '0.005', '0.01', '0.05', '0.1'];

  return (
    <Card elevated className="border border-blue-500/30 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[var(--brand-accent)]">
              Sandbox Testing Terminal
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-[var(--brand-accent)] border border-blue-500/20">
              BSC Testnet #97
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-white">Testnet tBNB Purchase</h3>
        </div>
        <Badge status={isSaleConfigured ? 'Live' : 'Planned'} />
      </div>

      {/* Honest Testnet Notice Banner */}
      <div className="p-3.5 rounded-xl bg-blue-950/20 border border-[var(--brand-accent)]/30 text-xs text-blue-200 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-[var(--brand-accent)]">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Strict Testnet Sandbox Only — Zero Monetary Value</span>
        </div>
        <p className="text-secondary leading-relaxed">
          This terminal executes testnet purchases on <strong>BNB Smart Chain Testnet (Chain ID 97)</strong> using test BNB (tBNB).
          Tokens received have no monetary value and cannot be exchanged for real funds.
          Fixed test price: <strong>1 tBNB = 10,000 OXENIQ</strong> (0.0001 tBNB per OXENIQ).{' '}
          <span className="text-amber-300/90">
            Note: This live testnet contract dispenses legacy OXENIQ testnet tokens; dedicated LIORA contract deployment is pending confirmation.
          </span>
        </p>
      </div>

      {/* Input Selection */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-secondary flex justify-between items-center">
          <span>Test Payment Amount (tBNB)</span>
          {isConnected && (
            <span className="text-white font-medium">
              Wallet Balance: <strong className="text-[var(--brand-accent)]">{userBnbBalance || '0.0000'} tBNB</strong>
            </span>
          )}
        </label>

        <div className="relative">
          <input
            type="number"
            min="0.0001"
            step="0.001"
            value={bnbAmount}
            onChange={(e) => setBnbAmount(e.target.value)}
            disabled={!isSaleConfigured || txStatus === 'broadcasting' || txStatus === 'confirming'}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl py-3 px-4 text-lg font-bold text-white focus:outline-none focus:border-[var(--brand-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="0.01"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-secondary">
            tBNB
          </span>
        </div>

        {/* Quick Amount Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={!isSaleConfigured || txStatus === 'broadcasting' || txStatus === 'confirming'}
              onClick={() => setBnbAmount(preset)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                bnbAmount === preset
                  ? 'bg-[var(--brand-accent)] text-white border-[var(--brand-accent)]'
                  : 'bg-[var(--bg-elevated)] text-secondary border-[var(--border-subtle)] hover:text-white hover:border-[var(--border-accent)]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {preset} tBNB
            </button>
          ))}
        </div>
      </div>

      {/* RPC Error Notice with Retry */}
      {rpcError && (
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{rpcError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchOnChainData()}
            className="px-2.5 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-white text-xs border border-[var(--border-subtle)] transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Conversion Breakdown Card */}
      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-secondary">Fixed Testnet Exchange Rate:</span>
          <span className="text-white font-semibold">
            1 tBNB = {tokensPerBnb.toLocaleString()} OXENIQ
            <span className="text-[10px] text-emerald-400 ml-1.5 font-normal">(On-chain)</span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-secondary">Calculated Token Delivery:</span>
          <span className="text-base font-extrabold text-[var(--brand-accent)]">
            {isBnbValid ? `${formatTokenBalance(calculatedTokensWei, 18)} OXENIQ` : '0.00 OXENIQ'}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-secondary">Available Test Inventory:</span>
          <span className="text-white font-medium">
            {isSaleConfigured
              ? availableInventory !== null
                ? `${formatTokenBalance(availableInventory)} OXENIQ`
                : isLoadingOnChain
                ? 'Querying on-chain...'
                : 'Data unavailable'
              : 'Awaiting Sale Deployment'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-secondary">Sale Contract Status:</span>
          <span className={isContractPaused ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
            {isContractPaused ? 'Paused (Circuit Breaker)' : 'Active (Accepting Purchases)'}
          </span>
        </div>
        {isConnected && address && (
          <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-secondary">Your Current OXENIQ Balance (BSC Testnet):</span>
            <span className="text-emerald-400 font-semibold">
              {userOxeniqBalance !== null ? `${formatTokenBalance(userOxeniqBalance)} OXENIQ` : '0.00 OXENIQ'}
            </span>
          </div>
        )}
      </div>

      {/* Transaction Status Alerts */}
      {txStatus === 'confirming' && txHash && (
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            <span>Transaction Broadcasted — Awaiting On-Chain Confirmation</span>
          </div>
          <p className="text-[11px] break-all">
            Hash:{' '}
            <a
              href={`https://testnet.bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-accent)] underline inline-flex items-center gap-1"
            >
              {txHash} <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      )}

      {txStatus === 'confirmed' && txHash && (
        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Purchase Confirmed On-Chain!</span>
          </div>
          <p className="text-[11px]">
            {formatTokenBalance(calculatedTokensWei, 18)} OXENIQ has been transferred to your wallet.{' '}
            <a
              href={`https://testnet.bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline inline-flex items-center gap-1 font-semibold"
            >
              View on BSCScan Testnet <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      )}

      {txStatus === 'error' && txError && (
        <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 w-full">
            <span className="font-bold text-rose-400">Transaction Verification Error</span>
            <p className="text-[11px] leading-relaxed text-secondary">{txError}</p>
            {txHash && (
              <p className="text-[11px] break-all pt-1 border-t border-rose-500/20 text-rose-200">
                Transaction Hash:{' '}
                <a
                  href={`https://testnet.bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--brand-accent)] underline inline-flex items-center gap-1 font-semibold"
                >
                  {txHash} <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="space-y-2">
        <button
          type="button"
          disabled={buttonState.disabled}
          onClick={buttonState.action}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            buttonState.disabled
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              : 'bg-[var(--brand-accent)] hover:opacity-90 text-white shadow-lg shadow-blue-500/20 cursor-pointer'
          }`}
        >
          {React.createElement(buttonState.icon, {
            className: `w-4 h-4 ${txStatus === 'broadcasting' || txStatus === 'confirming' ? 'animate-spin' : ''}`,
          })}
          <span>{buttonState.label}</span>
        </button>

        <p className="text-[11px] text-muted text-center">
          {!isSaleConfigured
            ? 'Checkout remains strictly locked until the sale contract is deployed, funded, and verified on BSC Testnet.'
            : 'Requires a Web3 wallet connected to BNB Smart Chain Testnet (Chain ID 97).'}
        </p>
      </div>
    </Card>
  );
}
