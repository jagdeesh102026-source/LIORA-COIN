/**
 * Liora Coin Exchange Demo — Core Types
 * Supporting non-custodial DEX exchange, 3-level referral system,
 * dual-currency commissions (LIORA & USDT), and user management.
 */

export interface DemoUser {
  id: string;
  username: string; // unique username for demo login
  displayName: string;
  email: string;
  password?: string; // demo password (not production plain-text)
  phone?: string;
  referralCode: string;
  sponsorCode: string | null; // upline referral code
  walletAddress: string | null;
  isWalletVerified: boolean;
  registeredAt: string;
  kycTier: 'UNVERIFIED' | 'TIER_1_DEMO' | 'TIER_2_DEMO';
  role?: 'USER' | 'ADMIN';
}

export type TokenSymbol = 'LIORA' | 'OXENIQ' | 'USDT' | 'BNB' | 'BTC' | 'ETH' | 'CAKE';

export interface TokenItem {
  symbol: TokenSymbol;
  name: string;
  decimals: number;
  iconBg: string;
  iconColor: string;
  priceUsd: number;
  userBalance: number;
  isPrimaryPair: boolean;
  address?: string;
}

export interface SwapQuote {
  fromToken: TokenSymbol;
  toToken: TokenSymbol;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number; // toAmount / fromAmount
  inverseRate: number;
  slippagePercent: number;
  estimatedFeeBnb: number;
  estimatedFeeUsd: number;
  priceImpactPercent: number;
  routing: string; // e.g. "PancakeSwap v3 (Direct)"
  minimumReceived: number;
}

export type TransactionStatus = 'PENDING' | 'ROUTING' | 'COMPLETED' | 'FAILED';
export type TransactionType = 'SWAP' | 'PURCHASE' | 'COMMISSION_CLAIM';

export interface SwapTransaction {
  id: string;
  userId: string;
  userWallet: string;
  fromToken: TokenSymbol;
  toToken: TokenSymbol;
  fromAmount: number;
  toAmount: number;
  rate: number;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  status: TransactionStatus;
  gasFeeBnb: number;
  routing: string;
  slippageUsed: number;
  isSimulated: true;
}

export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID';
export type CommissionCurrency = 'LIORA' | 'OXENIQ' | 'USDT';

export interface CommissionRecord {
  id: string;
  transactionId: string;
  sourceUserId: string;
  sourceUserIdentifier: string; // masked email or wallet
  beneficiaryUserId: string; // who earns this commission
  level: 1 | 2 | 3;
  commissionRatePercent: number;
  tradeVolumeUsd: number;
  currency: CommissionCurrency;
  amount: number;
  status: CommissionStatus;
  createdAt: string;
  paidAt?: string;
}

export interface ReferralLevelSummary {
  level: 1 | 2 | 3;
  memberCount: number;
  totalVolumeUsd: number;
  commissionRatePercent: number;
  earnedOxeniq: number;
  earnedLiora?: number;
  earnedUsdt: number;
}

export interface AdminCommissionConfig {
  level1Percent: number; // e.g. 5%
  level2Percent: number; // e.g. 3%
  level3Percent: number; // e.g. 1%
  minSwapForCommissionUsd: number; // e.g. $10
  commissionCurrency: 'DYNAMIC' | 'LIORA_ONLY' | 'OXENIQ_ONLY' | 'USDT_ONLY';
}

export interface PlatformStats {
  totalDemoUsers: number;
  connectedWalletsCount: number;
  totalVolumeUsd: number;
  totalSwapsCount: number;
  totalOxeniqCommissionsPaid: number;
  totalLioraCommissionsPaid?: number;
  totalUsdtCommissionsPaid: number;
  pendingCommissionsLiabilityUsd: number;
}

