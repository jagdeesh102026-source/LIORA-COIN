'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3Wallet } from './useWeb3Wallet';
import {
  treasuryAccounting,
  TreasuryStateSnapshot,
  ReconciliationReport,
  PrimarySaleReceipt,
  LiquidityProvisionBatch,
  AUTHORIZED_TREASURY_WALLET,
} from '../lib/treasury/treasuryAccountingEngine';
import {
  LiquidityProvisioningWorkflow,
  LiquidityProvisionPlan,
} from '../lib/treasury/liquidityProvisioningWorkflow';
import { useDexOnChainLiquidity } from './useDexOnChainLiquidity';

export function useTreasuryAccounting() {
  const { address, isConnected } = useWeb3Wallet();
  const { pool, refreshPool } = useDexOnChainLiquidity();

  const [state, setState] = useState<TreasuryStateSnapshot>(() =>
    treasuryAccounting.getTreasuryState()
  );
  const [reconciliation, setReconciliation] = useState<ReconciliationReport>(() =>
    treasuryAccounting.performTreasuryReconciliation()
  );
  const [primarySales, setPrimarySales] = useState<PrimarySaleReceipt[]>([]);
  const [liquidityBatches, setLiquidityBatches] = useState<LiquidityProvisionBatch[]>([]);
  const [provisionPlan, setProvisionPlan] = useState<LiquidityProvisionPlan | null>(null);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isTreasuryAuthority = address
    ? treasuryAccounting.isAuthorizedTreasuryWallet(address)
    : false;

  const refreshTreasury = useCallback(() => {
    const s = treasuryAccounting.getTreasuryState();
    const r = treasuryAccounting.performTreasuryReconciliation();
    setState(s);
    setReconciliation(r);
    setPrimarySales(treasuryAccounting.getPrimarySales());
    setLiquidityBatches(treasuryAccounting.getLiquidityBatches());

    if (pool) {
      const plan = LiquidityProvisioningWorkflow.planProvisioningBatch(pool);
      setProvisionPlan(plan);
    }
  }, [pool]);

  useEffect(() => {
    refreshTreasury();
  }, [refreshTreasury]);

  const executeLiquidityBatch = useCallback(async () => {
    if (!isTreasuryAuthority) {
      setActionError('UNAUTHORIZED_TREASURY_ACCESS: Only the authorized treasury wallet can execute liquidity provisioning.');
      return false;
    }

    if (!provisionPlan || !provisionPlan.canExecute) {
      setActionError(provisionPlan?.blockReason || 'Cannot execute liquidity batch.');
      return false;
    }

    setIsProvisioning(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // Simulate/Record confirmed provision batch with caller address verification
      const result = LiquidityProvisioningWorkflow.executeProvisionBatch(
        provisionPlan,
        false,
        undefined,
        address || undefined
      );
      if (!result.success) {
        throw new Error(result.error);
      }

      setActionSuccess(
        `Successfully allocated ${provisionPlan.usdtToAllocateFormatted} USDT and paired ${provisionPlan.requiredLioraFormatted} LIORA into protocol liquidity!`
      );
      refreshTreasury();
      await refreshPool();
      return true;
    } catch (err: any) {
      setActionError(err.message || 'Liquidity provisioning batch failed.');
      return false;
    } finally {
      setIsProvisioning(false);
    }
  }, [isTreasuryAuthority, address, provisionPlan, refreshTreasury, refreshPool]);

  return {
    state,
    reconciliation,
    primarySales,
    liquidityBatches,
    provisionPlan,
    isProvisioning,
    actionSuccess,
    actionError,
    isTreasuryAuthority,
    authorizedTreasuryWallet: AUTHORIZED_TREASURY_WALLET,
    refreshTreasury,
    executeLiquidityBatch,
    clearMessages: () => {
      setActionSuccess(null);
      setActionError(null);
    },
  };
}
