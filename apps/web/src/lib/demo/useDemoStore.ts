'use client';

import { useState, useEffect } from 'react';
import { demoStore } from './demoStore';
import {
  DemoUser,
  TokenItem,
  SwapTransaction,
  CommissionRecord,
  AdminCommissionConfig,
  PlatformStats,
} from './demoTypes';

export function useDemoStore() {
  const [, setTick] = useState(0);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
    const unsubscribe = demoStore.subscribe(() => {
      setTick((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  const activeUser = isClientReady ? demoStore.getActiveUser() : null;
  const tokens = demoStore.getTokens();
  const adminConfig = demoStore.getAdminConfig();
  const platformStats = demoStore.getPlatformStats();
  const userTransactions = demoStore.getTransactions();
  const allTransactions = demoStore.getAllTransactions();
  const userCommissions = demoStore.getCommissions();
  const allCommissions = demoStore.getAllCommissions();
  const referralSummaries = demoStore.getReferralSummaries();
  const allUsers = demoStore.getAllUsers();
  const isInitialized = demoStore.getInitialized() && isClientReady;

  return {
    isInitialized,
    activeUser,
    tokens,
    adminConfig,
    platformStats,
    userTransactions,
    allTransactions,
    userCommissions,
    allCommissions,
    referralSummaries,
    allUsers,
    // Methods
    login: (usernameOrEmail: string, password?: string) => demoStore.login(usernameOrEmail, password),
    register: (username: string, email: string, password?: string, phone?: string, sponsorCode?: string) =>
      demoStore.register(username, email, password, phone, sponsorCode),
    logout: () => demoStore.logout(),
    linkWallet: (address: string, isVerified = true) => demoStore.linkWallet(address, isVerified),
    calculateQuote: (from: any, to: any, amount: number, slippage: number) =>
      demoStore.calculateQuote(from, to, amount, slippage),
    executeSwap: (quote: any) => demoStore.executeSwap(quote),
    claimAllCommissions: (userId?: string) => demoStore.claimAllCommissions(userId),
    updateAdminConfig: (cfg: Partial<AdminCommissionConfig>) => demoStore.updateAdminConfig(cfg),
    simulateNewDownline: (level: 1 | 2 | 3) => demoStore.simulateNewDownline(level),
    resetToDefaults: () => demoStore.resetToDefaults(),
  };
}
