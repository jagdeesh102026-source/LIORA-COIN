'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3Wallet } from './useWeb3Wallet';
import {
  ManualSettlementEngine,
  InvestmentSettlementRecord,
  SettlementAuditLog,
  SettlementReconciliationSummary,
  PaymentRail,
} from '../lib/settlement/manualSettlementModel';
import { AUTHORIZED_TREASURY_WALLET } from '../lib/treasury/treasuryAccountingEngine';

export function useManualSettlement() {
  const { address, isConnected } = useWeb3Wallet();

  const [investments, setInvestments] = useState<InvestmentSettlementRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<SettlementAuditLog[]>([]);
  const [reconciliation, setReconciliation] = useState<SettlementReconciliationSummary | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);

  const isTreasuryOwner = address
    ? address.toLowerCase() === AUTHORIZED_TREASURY_WALLET.toLowerCase()
    : false;

  // Authoritative Backend Data Fetching (Task 1 / SEC-01)
  const refreshSettlements = useCallback(async () => {
    // If no wallet address is connected, there is no investor account to load
    if (!address) {
      setInvestments([]);
      setReconciliation(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    setIsSessionExpired(false);

    try {
      // Investor specific query if connected, otherwise admin query
      const url = address && !isTreasuryOwner
        ? `/api/settlement/investments?address=${encodeURIComponent(address)}`
        : `/api/settlement/investments`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(address ? { 'x-wallet-address': address } : {}),
        },
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        setIsSessionExpired(true);
        const data = await res.json().catch(() => ({}));
        setFetchError(data.message || 'Session expired or wallet not authenticated on server. Please sign in.');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.investments)) {
        setInvestments(data.investments);
        setReconciliation(ManualSettlementEngine.calculateReconciliation(data.investments));
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch authoritative settlement records from server.');
    } finally {
      setIsLoading(false);
    }
  }, [address, isTreasuryOwner]);

  useEffect(() => {
    refreshSettlements();
  }, [refreshSettlements]);

  // Derived user-specific investments
  const userInvestments = address
    ? investments.filter(
        (i) => i.investorAddress.toLowerCase() === address.toLowerCase()
      )
    : investments;

  const clearMessages = () => {
    setActionSuccess(null);
    setActionError(null);
  };

  // Actions wired directly to Backend REST APIs
  const createInvestment = async (params: {
    investorAddress: string;
    investorName: string;
    planId: string;
    initialAllocationPriceINR: string | number;
  }) => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/settlement/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to create investment record.');
      }

      setActionSuccess(`Plan created successfully! Allocated ${data.record?.originalCollateralTokensFormatted} LIORA collateral.`);
      await refreshSettlements();
      return true;
    } catch (err: any) {
      setActionError(err.message || 'Failed to create investment record.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const recordManualPayout = async (
    investmentId: string,
    payout: {
      amountPaidINR: number;
      paymentRail: PaymentRail;
      referenceNumber: string;
      adminNotes?: string;
    }
  ) => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/settlement/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          investmentId,
          ...payout,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to record manual payout.');
      }

      setActionSuccess(`Payment reference [${payout.referenceNumber}] recorded. Status: PAYMENT_DISPATCHED (Awaiting independent verification).`);
      await refreshSettlements();
      return true;
    } catch (err: any) {
      setActionError(err.message || 'Failed to record manual payout.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const correctManualPayoutReference = async (
    investmentId: string,
    newReferenceNumber: string,
    paymentRail: PaymentRail,
    reason: string
  ) => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/settlement/payout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          investmentId,
          newReferenceNumber,
          paymentRail,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to correct payment reference.');
      }

      setActionSuccess(`Payment reference successfully corrected to [${newReferenceNumber}]. Audit trail updated.`);
      await refreshSettlements();
      return true;
    } catch (err: any) {
      setActionError(err.message || 'Failed to correct payment reference.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmInvestorPayment = async (investmentId: string, notes?: string) => {
    if (!address) {
      setActionError('Connect your wallet to confirm payment receipt.');
      return false;
    }

    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/settlement/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          investmentId,
          method: 'INVESTOR_RECEIPT_CONFIRMATION',
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to confirm payment.');
      }

      setActionSuccess('Cash payment verified! Status: PAYMENT_INDEPENDENTLY_VERIFIED. You may now return the exact original collateral tokens.');
      await refreshSettlements();
      return true;
    } catch (err: any) {
      setActionError(err.message || 'Failed to confirm payment.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const returnCollateral = async (
    investmentId: string,
    txHash?: string,
    returnedTokensAmount?: string | number | bigint
  ) => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      // In sandbox mode, ensure a 66-character simulated hash if omitted
      const effectiveHash = txHash || `0x0000000000000000000000000000000000000000000000000000000000${Date.now().toString(16).padStart(12, '0')}`;
      const res = await fetch('/api/settlement/collateral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          investmentId,
          txHash: effectiveHash,
          returnedTokensAmount: returnedTokensAmount ? returnedTokensAmount.toString() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to return collateral.');
      }

      setActionSuccess('Exact original collateral tokens verified and returned to treasury. Settlement completed!');
      await refreshSettlements();
      return true;
    } catch (err: any) {
      setActionError(err.message || 'Failed to return collateral.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const raiseDispute = async (investmentId: string, reason: string) => {
    if (!address) {
      setActionError('Connect your wallet to file a dispute.');
      return false;
    }

    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/settlement/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          investmentId,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to raise dispute.');
      }

      setActionSuccess('Dispute registered. Collateral return is frozen pending independent arbitration.');
      await refreshSettlements();
      return true;
    } catch (err: any) {
      setActionError(err.message || 'Failed to raise dispute.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const resolveDispute = async (
    investmentId: string,
    resolution: 'RESOLVED_PAYMENT_VERIFIED' | 'RESOLVED_COLLATERAL_RELEASED',
    arbitrationNotes: string
  ) => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/settlement/dispute', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          investmentId,
          resolution,
          arbitrationNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to arbitrate dispute.');
      }

      setActionSuccess(`Dispute resolved [${resolution}]. Status updated.`);
      await refreshSettlements();
      return true;
    } catch (err: any) {
      setActionError(err.message || 'Failed to arbitrate dispute.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    investments,
    userInvestments,
    auditLogs,
    reconciliation,
    actionSuccess,
    actionError,
    isProcessing,
    isLoading,
    fetchError,
    isSessionExpired,
    isTreasuryOwner,
    isSandboxMode: true,
    authorizedTreasuryWallet: AUTHORIZED_TREASURY_WALLET,
    refreshSettlements,
    retryFetch: refreshSettlements,
    createInvestment,
    recordManualPayout,
    correctManualPayoutReference,
    confirmInvestorPayment,
    returnCollateral,
    raiseDispute,
    resolveDispute,
    clearMessages,
  };
}
