'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { botStore } from '../lib/bot/botStore';
import {
  UserBotSubscription,
  BotAccessCheckResult,
  SubscriptionPlanId,
  BotSignal,
  PaperTradeMetrics,
  BotAdminConfig,
} from '../lib/bot/botTypes';
import { useDemoStore } from '../lib/demo/useDemoStore';
import { useWeb3Wallet } from './useWeb3Wallet';

export function useTradingBot() {
  const { activeUser } = useDemoStore();
  const { address, chainId, signMessage } = useWeb3Wallet();

  const activeUserId = activeUser?.id || '';
  const activeWallet = activeUser?.walletAddress || address;

  // Local state mirrored from botStore
  const [subscription, setSubscription] = useState<UserBotSubscription>(() =>
    botStore.getSubscription(activeUserId || 'guest', activeWallet)
  );

  const [signals, setSignals] = useState<BotSignal[]>(() => botStore.getSignals());
  const [paperMetrics, setPaperMetrics] = useState<PaperTradeMetrics>(() => botStore.getPaperMetrics());
  const [adminConfig, setAdminConfig] = useState<BotAdminConfig>(() => botStore.getAdminConfig());
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [backendVerified, setBackendVerified] = useState<boolean>(false);
  const [backendLoading, setBackendLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Synchronize with server-authoritative API (only when authenticated session user exists)
  const syncWithBackend = useCallback(async () => {
    if (!activeUserId) {
      setBackendVerified(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/bot/subscription/status?walletAddress=${encodeURIComponent(activeWallet || '')}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.access) {
          setBackendVerified(data.access.isWalletVerified);
          // If server reports expired or revoked, synchronize local store
          if (data.access.status === 'TRIAL_EXPIRED' && subscription.status === 'TRIAL_ACTIVE') {
            botStore.checkAccess(activeUserId, activeWallet);
          }
        }
      }
    } catch {
      // Offline fallback: keep client store active
    }
  }, [activeUserId, activeWallet, subscription.status]);

  // Initial sync & interval polling
  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 15000); // 15s server sync
    return () => clearInterval(interval);
  }, [syncWithBackend]);

  // Subscribe to botStore updates
  useEffect(() => {
    const unsub = botStore.subscribe(() => {
      setSubscription(botStore.getSubscription(activeUserId, activeWallet));
      setSignals(botStore.getSignals());
      setPaperMetrics(botStore.getPaperMetrics());
      setAdminConfig(botStore.getAdminConfig());
    });
    return unsub;
  }, [activeUserId, activeWallet]);

  // Keep subscription in sync when user/wallet switches
  useEffect(() => {
    setSubscription(botStore.getSubscription(activeUserId, activeWallet));
  }, [activeUserId, activeWallet]);

  // 1-second reactive countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute live access check on every tick
  const accessCheck: BotAccessCheckResult = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = nowTick; // dependency trigger
    return botStore.checkAccess(activeUserId, activeWallet);
  }, [activeUserId, activeWallet, nowTick, subscription]);

  // SIWE Cryptographic Wallet Verification with Backend
  const verifyWalletWithBackend = useCallback(async () => {
    if (!activeWallet) {
      setApiError('Please connect a Web3 wallet first.');
      return false;
    }
    setBackendLoading(true);
    setApiError(null);
    try {
      // 1. Get Nonce
      const nonceRes = await fetch(`/api/auth/wallet-nonce?address=${activeWallet}`);
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok || !nonceData.nonce) {
        throw new Error(nonceData.error || 'Failed to generate authentication nonce');
      }

      // 2. Format EIP-4361 SIWE challenge message
      const challengeMsg = `lioracoin.com wants you to sign in with your Ethereum account:\n${activeWallet}\n\nSign in to Liora Coin Trading Bot\n\nURI: ${typeof window !== 'undefined' ? window.location.origin : 'https://lioracoin.com'}\nVersion: 1\nChain ID: ${chainId || 56}\nNonce: ${nonceData.nonce}\nIssued At: ${nonceData.issuedAt}`;

      // 3. Request user signature from connected wallet provider
      const signature = await signMessage(challengeMsg);
      if (!signature) {
        throw new Error('Wallet cryptographic signature is required to verify ownership.');
      }

      // 4. Verify on Backend
      const verifyRes = await fetch('/api/auth/verify-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        credentials: 'include',
        body: JSON.stringify({
          address: activeWallet,
          signature,
          nonce: nonceData.nonce,
          message: challengeMsg,
          chainId: chainId || 56,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Backend signature verification failed');
      }

      setBackendVerified(true);
      botStore.verifyWallet(activeUserId, activeWallet);
      return true;
    } catch (err: any) {
      setApiError(err.message || 'Wallet verification failed');
      return false;
    } finally {
      setBackendLoading(false);
    }
  }, [activeWallet, activeUserId, chainId, signMessage]);

  // Server-Backed Free Trial Activation
  const startFreeTrial = useCallback(async () => {
    setBackendLoading(true);
    setApiError(null);
    const targetWallet = activeWallet || '0x71C8409e51E2063f1ff764b8C06f7E8Ea9F2309C';

    try {
      // Call Server Route Handler
      const res = await fetch('/api/bot/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        credentials: 'include',
        body: JSON.stringify({
          walletAddress: targetWallet,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to activate trial on server');
      }

      // Update client store to match server timestamps
      const clientRes = botStore.startFreeTrial(activeUserId, targetWallet, activeUser?.username);
      return clientRes;
    } catch (err: any) {
      setApiError(err.message || 'Trial activation failed');
      // If error is about already used, also reflect in client
      if (err.message?.includes('already')) {
        return { success: false, error: err.message };
      }
      // Fallback to client store if offline
      return botStore.startFreeTrial(activeUserId, targetWallet, activeUser?.username);
    } finally {
      setBackendLoading(false);
    }
  }, [activeUserId, activeWallet, activeUser?.username]);

  // Server-Backed Subscription Upgrade / Renewal
  const subscribePlan = useCallback(
    async (planId: SubscriptionPlanId, paymentToken: 'USDT' | 'LIORA', txHash?: string) => {
      setBackendLoading(true);
      setApiError(null);
      const walletToUse = activeWallet || '0x71C8409e51E2063f1ff764b8C06f7E8Ea9F2309C';
      const actualTxHash = txHash || `0xmock_tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      try {
        const res = await fetch('/api/bot/subscription/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
          credentials: 'include',
          body: JSON.stringify({
            planId,
            paymentToken,
            payingWallet: walletToUse,
            txHash: actualTxHash,
            chainId: chainId || 56,
            isMockTest: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Server rejected subscription payment');
        }

        // Sync client store
        const clientRes = botStore.subscribePlan(activeUserId, planId, paymentToken, walletToUse, actualTxHash);
        return clientRes;
      } catch (err: any) {
        setApiError(err.message || 'Subscription processing failed');
        // Fallback for demo
        return botStore.subscribePlan(activeUserId, planId, paymentToken, walletToUse, actualTxHash);
      } finally {
        setBackendLoading(false);
      }
    },
    [activeUserId, activeWallet, chainId]
  );

  // Fetch Protected Signals from Server
  const fetchProtectedSignals = useCallback(async () => {
    if (!activeUserId) return;
    try {
      const res = await fetch(
        `/api/bot/signals?walletAddress=${encodeURIComponent(activeWallet || '')}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.signals) {
          setSignals(data.signals);
        }
      }
    } catch {
      // offline fallback
    }
  }, [activeUserId, activeWallet]);

  const revokeSession = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-requested-with': 'XMLHttpRequest' },
        credentials: 'include',
      });
    } catch { }
    return botStore.revokeSession(activeUserId);
  }, [activeUserId]);

  const updateAdminConfig = useCallback((updates: Partial<BotAdminConfig>) => {
    botStore.updateAdminConfig(updates);
  }, []);

  const adminSetTrialDuration = useCallback((hours: number) => {
    botStore.adminSetTrialDuration(hours);
  }, []);

  const adminExtendSubscription = useCallback((userId: string, days: number) => {
    return botStore.adminExtendSubscription(userId, days);
  }, []);

  const resetToDefaults = useCallback(() => {
    botStore.resetToDefaults();
  }, []);

  return {
    subscription,
    accessCheck,
    plans: adminConfig.plans,
    signals,
    paperMetrics,
    adminConfig,
    activeUser,
    activeWallet,
    backendVerified,
    backendLoading,
    apiError,
    setApiError,
    verifyWalletWithBackend,
    startFreeTrial,
    subscribePlan,
    revokeSession,
    fetchProtectedSignals,
    updateAdminConfig,
    adminSetTrialDuration,
    adminExtendSubscription,
    resetToDefaults,
  };
}
