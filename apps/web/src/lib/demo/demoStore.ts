/**
 * Liora Coin Exchange Demo Store
 * In-memory & LocalStorage-backed reactive demo store.
 * Manages demo authentication, wallet linking, exchange quotes,
 * transaction execution, and 3-level referral commission calculations.
 */

import {
  DemoUser,
  TokenItem,
  TokenSymbol,
  SwapQuote,
  SwapTransaction,
  CommissionRecord,
  ReferralLevelSummary,
  AdminCommissionConfig,
  PlatformStats,
} from './demoTypes';
import { isTestnetSandboxEnabled } from '../../config/tokenConfig';

const STORAGE_KEY_PREFIX = 'oxeniq_exchange_demo_v2_';

export const INITIAL_TOKENS: TokenItem[] = [
  {
    symbol: 'LIORA',
    name: 'Liora Coin',
    decimals: 18,
    iconBg: '#78350f',
    iconColor: '#fbbf24',
    priceUsd: 0.05, // 1 LIORA = $0.05 (1 USDT = 20 LIORA)
    userBalance: 12500,
    isPrimaryPair: true,
    address: '0xdf4FdDC848ED10d0b341BBe907C47D4d691EC877', // Legacy OXENIQ testnet deployment reference
  },
  {
    symbol: 'USDT',
    name: 'Tether USD (BSC)',
    decimals: 18,
    iconBg: '#064e3b',
    iconColor: '#34d399',
    priceUsd: 1.0,
    userBalance: 2450.0,
    isPrimaryPair: true,
    address: '0x55d398326f99059fF775485246999027B3197955',
  },
  {
    symbol: 'BNB',
    name: 'BNB (Gas Token)',
    decimals: 18,
    iconBg: '#78350f',
    iconColor: '#fbbf24',
    priceUsd: 620.0,
    userBalance: 4.85,
    isPrimaryPair: true,
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin (Binance-Peg)',
    decimals: 18,
    iconBg: '#7c2d12',
    iconColor: '#f97316',
    priceUsd: 96500.0,
    userBalance: 0.085,
    isPrimaryPair: false,
    address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum (Binance-Peg)',
    decimals: 18,
    iconBg: '#312e81',
    iconColor: '#a78bfa',
    priceUsd: 3450.0,
    userBalance: 1.45,
    isPrimaryPair: false,
    address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  },
  {
    symbol: 'CAKE',
    name: 'PancakeSwap Token',
    decimals: 18,
    iconBg: '#831843',
    iconColor: '#f472b6',
    priceUsd: 2.85,
    userBalance: 320.0,
    isPrimaryPair: false,
    address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
  },
];

export const INITIAL_USER_BALANCES: Record<string, Partial<Record<TokenSymbol, number>>> = {
  usr_demo_active_01: {
    LIORA: 12500,
    USDT: 2450.0,
    BNB: 4.85,
    BTC: 0.085,
    ETH: 1.45,
    CAKE: 320.0,
  },
  usr_sponsor_l1: {
    LIORA: 8500,
    USDT: 1200.0,
    BNB: 2.5,
    BTC: 0.04,
    ETH: 0.8,
    CAKE: 150.0,
  },
  usr_admin_01: {
    LIORA: 100000,
    USDT: 50000,
    BNB: 50.0,
    BTC: 2.5,
    ETH: 25.0,
    CAKE: 5000,
  },
};

const DEFAULT_NEW_USER_BALANCES: Partial<Record<TokenSymbol, number>> = {
  LIORA: 2500,
  USDT: 750,
  BNB: 1.25,
  BTC: 0.015,
  ETH: 0.25,
  CAKE: 80.0,
};

export const INITIAL_ADMIN_CONFIG: AdminCommissionConfig = {
  level1Percent: 5.0, // 5% of trading volume
  level2Percent: 3.0, // 3% of trading volume
  level3Percent: 1.0, // 1% of trading volume
  minSwapForCommissionUsd: 5.0,
  commissionCurrency: 'DYNAMIC',
};

// Seed Hierarchy:
// Top: OX-GENESIS (Admin)
//  -> OX-ELITE1 (Level 3 upline of Demo User)
//   -> OX-VIP88 (Level 2 upline of Demo User)
//    -> OX-MASTER7 (Level 1 upline of Demo User)
//     -> OX-789421 (Active Demo User: @trader_alex)
//      -> Level 1 Downlines: OX-USER101, OX-USER102, OX-USER103, OX-USER104
export const DEFAULT_ACTIVE_USER: DemoUser = {
  id: 'usr_demo_active_01',
  username: 'trader_alex',
  displayName: 'Alex Mercer',
  email: 'trader@oxeniq.com',
  // Demo credentials purged from source code (production uses server PostgreSQL auth only)
  phone: '+1 (555) 789-0123',
  referralCode: 'OX-789421',
  sponsorCode: 'OX-MASTER7',
  walletAddress: '0x9B4a8d29E306aF2A9fC5F35dD719f96b9f2De87a',
  isWalletVerified: true,
  registeredAt: '2026-10-15T09:30:00Z',
  kycTier: 'TIER_1_DEMO',
  role: 'USER',
};

export const SEED_USERS: DemoUser[] = [
  DEFAULT_ACTIVE_USER,
  {
    id: 'usr_admin_01',
    username: 'admin_dan',
    displayName: 'Dan Administrator',
    email: 'admin@oxeniq.com',
    // Demo credentials purged from source code (production uses server PostgreSQL auth only)
    referralCode: 'OX-GENESIS',
    sponsorCode: null,
    walletAddress: '0x5c7eE67FaBFD34D2cA2a4A87C3d6e530FE1F2477',
    isWalletVerified: true,
    registeredAt: '2026-06-01T00:00:00Z',
    kycTier: 'TIER_2_DEMO',
    role: 'ADMIN',
  },
  {
    id: 'usr_sponsor_l1',
    username: 'emily_mentor',
    displayName: 'Emily Mentor',
    email: 'emily.mentor@oxeniq.com',
    // Demo credentials purged from source code (production uses server PostgreSQL auth only)
    referralCode: 'OX-MASTER7',
    sponsorCode: 'OX-VIP88',
    walletAddress: '0x32A5FaA9F32d919641D3B4895C918E7F0a109867',
    isWalletVerified: true,
    registeredAt: '2026-09-01T12:00:00Z',
    kycTier: 'TIER_2_DEMO',
    role: 'USER',
  },
  {
    id: 'usr_sponsor_l2',
    username: 'david_lead',
    displayName: 'David Lead',
    email: 'david.lead@oxeniq.com',
    // Demo credentials purged from source code (production uses server PostgreSQL auth only)
    referralCode: 'OX-VIP88',
    sponsorCode: 'OX-ELITE1',
    walletAddress: '0x71C0a5812Bcf0c6291a57E0e44FaF36A7a90412e',
    isWalletVerified: true,
    registeredAt: '2026-08-15T10:00:00Z',
    kycTier: 'TIER_2_DEMO',
    role: 'USER',
  },
  {
    id: 'usr_sponsor_l3',
    username: 'sarah_director',
    displayName: 'Sarah Director',
    email: 'sarah.director@oxeniq.com',
    // Demo credentials purged from source code (production uses server PostgreSQL auth only)
    referralCode: 'OX-ELITE1',
    sponsorCode: 'OX-GENESIS',
    walletAddress: '0x18B27a3d9A662363a0eF51A310243C73b8897b6C',
    isWalletVerified: true,
    registeredAt: '2026-07-20T08:00:00Z',
    kycTier: 'TIER_2_DEMO',
    role: 'USER',
  },
  // Downline members under OX-789421
  {
    id: 'usr_downline_l1_a',
    username: 'michael_k',
    displayName: 'Michael K',
    email: 'michael.k@crypto.org',
    // Demo credentials purged from source code (production uses server PostgreSQL auth only)
    referralCode: 'OX-USER101',
    sponsorCode: 'OX-789421',
    walletAddress: '0x498aE722C19c28A8a9134F20E6704Af08C9971D0',
    isWalletVerified: true,
    registeredAt: '2026-10-18T14:22:00Z',
    kycTier: 'TIER_1_DEMO',
    role: 'USER',
  },
  {
    id: 'usr_downline_l1_b',
    username: 'lisa_trader',
    displayName: 'Lisa Trader',
    email: 'lisa.trader@defi.io',
    // Demo credentials purged from source code (production uses server PostgreSQL auth only)
    referralCode: 'OX-USER102',
    sponsorCode: 'OX-789421',
    walletAddress: '0x8A72F67448B6960Ff3D4DbB497727e4eFa3D1903',
    isWalletVerified: true,
    registeredAt: '2026-10-20T11:45:00Z',
    kycTier: 'TIER_1_DEMO',
    role: 'USER',
  },
  {
    id: 'usr_downline_l1_c',
    username: 'kevin_web3',
    displayName: 'Kevin Web3',
    email: 'kevin.web3@blockmail.com',
    // Demo credentials purged from source code (production uses server PostgreSQL auth only)
    referralCode: 'OX-USER103',
    sponsorCode: 'OX-789421',
    walletAddress: '0x62B98Fa047a27dE90479Fb4978f8B983d9876FaE',
    isWalletVerified: true,
    registeredAt: '2026-10-24T16:10:00Z',
    kycTier: 'TIER_1_DEMO',
    role: 'USER',
  },
  {
    id: 'usr_downline_l2_a',
    username: 'alice_v',
    displayName: 'Alice V',
    email: 'alice.v@invest.net',
    // Demo credentials purged from source code (production uses server PostgreSQL auth only)
    referralCode: 'OX-USER201',
    sponsorCode: 'OX-USER101',
    walletAddress: '0x098FcbFa6498B6960412e873Fa9B4a8d29E306aF',
    isWalletVerified: false,
    registeredAt: '2026-10-26T09:12:00Z',
    kycTier: 'UNVERIFIED',
    role: 'USER',
  },
  {
    id: 'usr_downline_l2_b',
    username: 'brian_t',
    displayName: 'Brian T',
    email: 'brian.t@venture.capital',
    // Demo credentials purged from source code (production uses server PostgreSQL auth only)
    referralCode: 'OX-USER202',
    sponsorCode: 'OX-USER102',
    walletAddress: '0x99A8c2Fa9F32d919641D3B4895C918E7F0a10986',
    isWalletVerified: true,
    registeredAt: '2026-10-27T17:30:00Z',
    kycTier: 'TIER_1_DEMO',
    role: 'USER',
  },
  {
    id: 'usr_downline_l3_a',
    username: 'charlotte_r',
    displayName: 'Charlotte R',
    email: 'charlotte.r@quantum.tech',
    // Demo credentials purged from source code (production uses server PostgreSQL auth only)
    referralCode: 'OX-USER301',
    sponsorCode: 'OX-USER201',
    walletAddress: '0x5C918E7F0a1098679B4a8d29E306aF2A9fC5F35d',
    isWalletVerified: true,
    registeredAt: '2026-10-28T13:00:00Z',
    kycTier: 'TIER_1_DEMO',
    role: 'USER',
  },
];

export const INITIAL_TRANSACTIONS: SwapTransaction[] = [
  {
    id: 'tx_seed_001',
    userId: DEFAULT_ACTIVE_USER.id,
    userWallet: DEFAULT_ACTIVE_USER.walletAddress!,
    fromToken: 'USDT',
    toToken: 'LIORA',
    fromAmount: 500,
    toAmount: 10000,
    rate: 20.0,
    txHash: '0x3a4b92c81d7e5f30894a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e',
    blockNumber: 42891045,
    timestamp: '2026-10-28T14:35:10Z',
    status: 'COMPLETED',
    gasFeeBnb: 0.00062,
    routing: 'PancakeSwap v3 (Direct)',
    slippageUsed: 0.5,
    isSimulated: true,
  },
  {
    id: 'tx_seed_002',
    userId: DEFAULT_ACTIVE_USER.id,
    userWallet: DEFAULT_ACTIVE_USER.walletAddress!,
    fromToken: 'BNB',
    toToken: 'LIORA',
    fromAmount: 1.5,
    toAmount: 18600,
    rate: 12400.0,
    txHash: '0x8f7a6b5c4d3e2f1a0b9c8d7e3a4b92c81d7e5f30894a8b7c6d5e4f3a2b1c0d9e',
    blockNumber: 42895600,
    timestamp: '2026-10-29T09:12:45Z',
    status: 'COMPLETED',
    gasFeeBnb: 0.00078,
    routing: 'PancakeSwap v2 (BNB -> LIORA)',
    slippageUsed: 0.5,
    isSimulated: true,
  },
  {
    id: 'tx_seed_003',
    userId: 'usr_downline_l1_a',
    userWallet: '0x498aE722C19c28A8a9134F20E6704Af08C9971D0',
    fromToken: 'USDT',
    toToken: 'LIORA',
    fromAmount: 1200,
    toAmount: 24000,
    rate: 20.0,
    txHash: '0x1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e3a4b92c81d7e5f30894a8b7c6d5e4f3a2b',
    blockNumber: 42897210,
    timestamp: '2026-10-29T16:40:00Z',
    status: 'COMPLETED',
    gasFeeBnb: 0.00065,
    routing: 'PancakeSwap v3 (Direct)',
    slippageUsed: 0.5,
    isSimulated: true,
  },
];

export const INITIAL_COMMISSIONS: CommissionRecord[] = [
  {
    id: 'comm_seed_001',
    transactionId: 'tx_seed_003',
    sourceUserId: 'usr_downline_l1_a',
    sourceUserIdentifier: 'michael_k (@michael.k@***.org)',
    beneficiaryUserId: DEFAULT_ACTIVE_USER.id,
    level: 1,
    commissionRatePercent: 5.0,
    tradeVolumeUsd: 1200,
    currency: 'LIORA',
    amount: 1200, // 5% of 24,000 LIORA = 1,200 LIORA ($60 USD value)
    status: 'APPROVED',
    createdAt: '2026-10-29T16:40:02Z',
  },
  {
    id: 'comm_seed_002',
    transactionId: 'tx_seed_003',
    sourceUserId: 'usr_downline_l1_a',
    sourceUserIdentifier: 'michael_k (@michael.k@***.org)',
    beneficiaryUserId: DEFAULT_ACTIVE_USER.id,
    level: 1,
    commissionRatePercent: 5.0,
    tradeVolumeUsd: 1200,
    currency: 'USDT',
    amount: 60, // alternative USDT allocation (5% of $1200)
    status: 'PAID',
    createdAt: '2026-10-29T16:40:02Z',
    paidAt: '2026-10-29T18:00:00Z',
  },
  {
    id: 'comm_seed_003',
    transactionId: 'tx_seed_historical_004',
    sourceUserId: 'usr_downline_l2_b',
    sourceUserIdentifier: 'brian_t (@brian.t@***.capital)',
    beneficiaryUserId: DEFAULT_ACTIVE_USER.id,
    level: 2,
    commissionRatePercent: 3.0,
    tradeVolumeUsd: 800,
    currency: 'LIORA',
    amount: 480, // 3% of 16,000 LIORA
    status: 'APPROVED',
    createdAt: '2026-10-30T10:15:00Z',
  },
];

// Helper to safely access browser localStorage
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (!isBrowser()) return defaultValue;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn(`[demoStore] Failed loading key ${key}:`, e);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[demoStore] Failed saving key ${key}:`, e);
  }
}

type Subscriber = () => void;

export class DemoStoreManager {
  private subscribers: Set<Subscriber> = new Set();

  private user: DemoUser | null = null;
  private users: DemoUser[] = [];
  private tokens: TokenItem[] = [];
  private transactions: SwapTransaction[] = [];
  private commissions: CommissionRecord[] = [];
  private adminConfig: AdminCommissionConfig = INITIAL_ADMIN_CONFIG;
  private userBalances: Record<string, Partial<Record<TokenSymbol, number>>> = {};
  private isInitialized: boolean = false;

  constructor() {
    this.init();
  }

  private normalizeSymbol(symbol: TokenSymbol): TokenSymbol {
    return symbol === 'OXENIQ' ? 'LIORA' : symbol;
  }

  private migrateLegacyBrandingData() {
    let migrated = false;

    if (this.tokens.some((t) => t.symbol === 'OXENIQ')) {
      this.tokens = this.tokens.map((t) =>
        t.symbol === 'OXENIQ'
          ? {
              ...t,
              symbol: 'LIORA',
              name: 'Liora Coin',
              iconBg: '#78350f',
              iconColor: '#fbbf24',
            }
          : t
      );
      migrated = true;
    }

    for (const uid of Object.keys(this.userBalances)) {
      const bal = this.userBalances[uid];
      if (bal && bal.OXENIQ !== undefined) {
        bal.LIORA = bal.LIORA !== undefined ? Math.max(bal.LIORA, bal.OXENIQ) : bal.OXENIQ;
        delete bal.OXENIQ;
        migrated = true;
      }
    }

    if (this.transactions.some((tx) => tx.fromToken === 'OXENIQ' || tx.toToken === 'OXENIQ')) {
      this.transactions = this.transactions.map((tx) => ({
        ...tx,
        fromToken: this.normalizeSymbol(tx.fromToken),
        toToken: this.normalizeSymbol(tx.toToken),
        routing: tx.routing.replace(/OXENIQ/g, 'LIORA'),
      }));
      migrated = true;
    }

    if (this.commissions.some((c) => c.currency === 'OXENIQ')) {
      this.commissions = this.commissions.map((c) =>
        c.currency === 'OXENIQ' ? { ...c, currency: 'LIORA' } : c
      );
      migrated = true;
    }

    if (migrated && isBrowser()) {
      saveToStorage('tokens', this.tokens);
      saveToStorage('user_balances', this.userBalances);
      saveToStorage('transactions', this.transactions);
      saveToStorage('commissions', this.commissions);
    }
  }

  public init() {
    this.user = loadFromStorage<DemoUser | null>('active_user', null);
    this.users = loadFromStorage<DemoUser[]>('users', SEED_USERS);
    this.tokens = loadFromStorage<TokenItem[]>('tokens', INITIAL_TOKENS);
    this.transactions = loadFromStorage<SwapTransaction[]>('transactions', INITIAL_TRANSACTIONS);
    this.commissions = loadFromStorage<CommissionRecord[]>('commissions', INITIAL_COMMISSIONS);
    this.adminConfig = loadFromStorage<AdminCommissionConfig>('admin_config', INITIAL_ADMIN_CONFIG);
    this.userBalances = loadFromStorage<Record<string, Partial<Record<TokenSymbol, number>>>>('user_balances', INITIAL_USER_BALANCES);
    this.migrateLegacyBrandingData();
    this.isInitialized = true;
  }

  public getInitialized(): boolean {
    return this.isInitialized;
  }

  public getAllUsers(): DemoUser[] {
    return [...this.users];
  }

  public subscribe(sub: Subscriber): () => void {
    this.subscribers.add(sub);
    return () => this.subscribers.delete(sub);
  }

  private notify() {
    this.subscribers.forEach((sub) => {
      try {
        sub();
      } catch (err) {
        console.error('[demoStore] subscriber error:', err);
      }
    });
  }

  // --- Auth & Profile ---
  public getActiveUser(): DemoUser | null {
    return this.user;
  }

  public setActiveUser(user: DemoUser | null) {
    this.user = user;
    saveToStorage('active_user', user);
    if (user) {
      // Ensure user is also in the users collection
      const idx = this.users.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        this.users[idx] = user;
      } else {
        this.users.push(user);
      }
      saveToStorage('users', this.users);

      // Ensure user has balances
      if (!this.userBalances[user.id]) {
        this.userBalances[user.id] = { ...DEFAULT_NEW_USER_BALANCES };
        saveToStorage('user_balances', this.userBalances);
      }
    }
    this.notify();
  }

  public login(
    usernameOrEmail: string,
    password?: string
  ): { success: boolean; user?: DemoUser; error?: string } {
    if (!isTestnetSandboxEnabled()) {
      return {
        success: false,
        error: 'Demo authentication is disabled in production. Use server-side account sign-in.',
      };
    }

    const cleanInput = (usernameOrEmail || '').trim().toLowerCase();
    if (!cleanInput) {
      return { success: false, error: 'Please enter your username or email address.' };
    }
    if (!password || !password.trim()) {
      return { success: false, error: 'Please enter your password.' };
    }

    // Look up existing user by username or email
    const existing = this.users.find(
      (u) =>
        u.username.toLowerCase() === cleanInput ||
        u.email.toLowerCase() === cleanInput
    );

    if (!existing) {
      return {
        success: false,
        error: 'Invalid username or password.',
      };
    }

    // Validate password
    const validPassword = existing.password;
    if (!validPassword || password.trim() !== validPassword) {
      return {
        success: false,
        error: 'Invalid username or password.',
      };
    }

    this.setActiveUser(existing);
    return { success: true, user: existing };
  }

  public register(
    username: string,
    email: string,
    password?: string,
    phone?: string,
    sponsorCode?: string
  ): { success: boolean; user?: DemoUser; error?: string } {
    if (!isTestnetSandboxEnabled()) {
      return {
        success: false,
        error: 'Demo registration is disabled in production. Use server-side account registration.',
      };
    }

    const cleanUsername = (username || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    // Check uniqueness of username and email
    const conflict = this.users.find(
      (u) =>
        u.username.toLowerCase() === cleanUsername.toLowerCase() ||
        u.email.toLowerCase() === cleanEmail
    );
    if (conflict) {
      return {
        success: false,
        error: 'An account with this username or email already exists. Please sign in.',
      };
    }

    const code = 'OX-' + Math.floor(100000 + Math.random() * 900000);
    const validSponsor =
      sponsorCode && sponsorCode.trim() ? sponsorCode.trim().toUpperCase() : 'OX-MASTER7';

    const newUser: DemoUser = {
      id: 'usr_' + Date.now(),
      username: cleanUsername,
      displayName: cleanUsername,
      email: cleanEmail,
      password: password?.trim() || undefined,
      phone: phone?.trim() || undefined,
      referralCode: code,
      sponsorCode: validSponsor,
      walletAddress: null,
      isWalletVerified: false,
      registeredAt: new Date().toISOString(),
      kycTier: 'TIER_1_DEMO',
      role: 'USER',
    };

    this.users.push(newUser);
    saveToStorage('users', this.users);

    this.userBalances[newUser.id] = { ...DEFAULT_NEW_USER_BALANCES };
    saveToStorage('user_balances', this.userBalances);

    this.setActiveUser(newUser);
    return { success: true, user: newUser };
  }

  public linkWallet(walletAddress: string, isVerified: boolean = true) {
    if (!this.user) return;
    const updated: DemoUser = {
      ...this.user,
      walletAddress,
      isWalletVerified: isVerified,
    };
    this.setActiveUser(updated);
  }

  public logout() {
    this.setActiveUser(null);
  }

  // --- Tokens & Balances ---
  public getTokens(userId?: string): TokenItem[] {
    const uid = userId || this.user?.id || DEFAULT_ACTIVE_USER.id;
    const userBalMap = this.userBalances[uid] || DEFAULT_NEW_USER_BALANCES;

    return this.tokens.map((t) => ({
      ...t,
      userBalance: userBalMap[t.symbol] ?? t.userBalance,
    }));
  }

  public getToken(symbol: TokenSymbol, userId?: string): TokenItem | undefined {
    const normalized = this.normalizeSymbol(symbol);
    return this.getTokens(userId).find((t) => t.symbol === normalized);
  }

  public updateBalance(symbol: TokenSymbol, delta: number, userId?: string) {
    const uid = userId || this.user?.id || DEFAULT_ACTIVE_USER.id;
    const normalized = this.normalizeSymbol(symbol);
    if (!this.userBalances[uid]) {
      this.userBalances[uid] = { ...(INITIAL_USER_BALANCES[uid] || DEFAULT_NEW_USER_BALANCES) };
    }
    const current = this.userBalances[uid][normalized] ?? 0;
    const newBal = Math.max(0, current + delta);
    this.userBalances[uid][normalized] = Number(newBal.toFixed(4));
    saveToStorage('user_balances', this.userBalances);
    this.notify();
  }

  // --- Exchange Calculation ---
  public calculateQuote(
    fromSymbol: TokenSymbol,
    toSymbol: TokenSymbol,
    fromAmount: number,
    slippagePercent: number = 0.5
  ): SwapQuote | null {
    if (!fromAmount || fromAmount <= 0) return null;
    const normFrom = this.normalizeSymbol(fromSymbol);
    const normTo = this.normalizeSymbol(toSymbol);
    const fromToken = this.tokens.find((t) => t.symbol === normFrom);
    const toToken = this.tokens.find((t) => t.symbol === normTo);
    if (!fromToken || !toToken) return null;

    // Exchange rate calculated from USD benchmark
    const fromValUsd = fromAmount * fromToken.priceUsd;
    const toAmountRaw = fromValUsd / toToken.priceUsd;
    const rate = toToken.priceUsd > 0 ? fromToken.priceUsd / toToken.priceUsd : 0;
    const inverseRate = rate > 0 ? 1 / rate : 0;

    // PancakeSwap price impact simulation (0.02% base + micro scaling)
    const priceImpact = Math.min(0.5, 0.02 + (fromValUsd / 100000) * 0.1);

    // Minimum received considering slippage
    const minReceived = toAmountRaw * (1 - slippagePercent / 100);

    // Gas fee simulation on BSC (~0.0006 to 0.0008 BNB)
    const feeBnb = 0.00065;
    const bnbToken = this.tokens.find((t) => t.symbol === 'BNB');
    const feeUsd = feeBnb * (bnbToken ? bnbToken.priceUsd : 620);

    return {
      fromToken: normFrom,
      toToken: normTo,
      fromAmount,
      toAmount: Number(toAmountRaw.toFixed(6)),
      exchangeRate: Number(rate.toFixed(6)),
      inverseRate: Number(inverseRate.toFixed(6)),
      slippagePercent,
      estimatedFeeBnb: feeBnb,
      estimatedFeeUsd: Number(feeUsd.toFixed(2)),
      priceImpactPercent: Number(priceImpact.toFixed(3)),
      routing: `PancakeSwap v3 (${normFrom} → ${normTo})`,
      minimumReceived: Number(minReceived.toFixed(6)),
    };
  }

  // --- Swap Execution & Commission Attribution ---
  public executeSwap(quote: SwapQuote): SwapTransaction {
    const active = this.user || DEFAULT_ACTIVE_USER;
    const wallet = active.walletAddress || '0x' + Math.random().toString(16).slice(2, 42);

    // 1. Update balances for the active user
    this.updateBalance(quote.fromToken, -quote.fromAmount, active.id);
    this.updateBalance(quote.toToken, quote.toAmount, active.id);

    // 2. Generate simulated BSC transaction
    const txId = 'tx_' + Date.now();
    const fakeHash =
      '0x' +
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const tx: SwapTransaction = {
      id: txId,
      userId: active.id,
      userWallet: wallet,
      fromToken: quote.fromToken,
      toToken: quote.toToken,
      fromAmount: quote.fromAmount,
      toAmount: quote.toAmount,
      rate: quote.exchangeRate,
      txHash: fakeHash,
      blockNumber: 42900000 + Math.floor(Math.random() * 10000),
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      gasFeeBnb: quote.estimatedFeeBnb,
      routing: quote.routing,
      slippageUsed: quote.slippagePercent,
      isSimulated: true,
    };

    this.transactions.unshift(tx);
    saveToStorage('transactions', this.transactions);

    // 3. Trigger 3-level upline referral commission calculation
    this.distributeReferralCommissions(tx, quote);

    this.notify();
    return tx;
  }

  /**
   * Distributes commissions to up to three levels of upline sponsors
   * Guaranteed idempotent (unique commission IDs tied to txId).
   */
  private distributeReferralCommissions(tx: SwapTransaction, quote: SwapQuote) {
    const buyer = this.user || DEFAULT_ACTIVE_USER;
    if (!buyer.sponsorCode) return;

    const fromToken = this.tokens.find((t) => t.symbol === quote.fromToken);
    const volumeUsd = quote.fromAmount * (fromToken ? fromToken.priceUsd : 1.0);
    if (volumeUsd < this.adminConfig.minSwapForCommissionUsd) return;

    const maskedIdentifier = buyer.username
      ? `@${buyer.username}`
      : buyer.email
        ? buyer.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        : 'Demo Trader';

    const normTo = this.normalizeSymbol(quote.toToken);
    const commissionCurrency: 'LIORA' | 'USDT' = normTo === 'LIORA' ? 'LIORA' : 'USDT';

    // Find Level 1 Sponsor
    const sponsorL1 = this.users.find((u) => u.referralCode === buyer.sponsorCode);
    if (sponsorL1) {
      this.createCommissionRecord(
        tx.id,
        buyer.id,
        maskedIdentifier,
        sponsorL1.id,
        1,
        this.adminConfig.level1Percent,
        volumeUsd,
        commissionCurrency
      );

      // Find Level 2 Sponsor
      if (sponsorL1.sponsorCode) {
        const sponsorL2 = this.users.find((u) => u.referralCode === sponsorL1.sponsorCode);
        if (sponsorL2) {
          this.createCommissionRecord(
            tx.id,
            buyer.id,
            maskedIdentifier,
            sponsorL2.id,
            2,
            this.adminConfig.level2Percent,
            volumeUsd,
            commissionCurrency
          );

          // Find Level 3 Sponsor
          if (sponsorL2.sponsorCode) {
            const sponsorL3 = this.users.find((u) => u.referralCode === sponsorL2.sponsorCode);
            if (sponsorL3) {
              this.createCommissionRecord(
                tx.id,
                buyer.id,
                maskedIdentifier,
                sponsorL3.id,
                3,
                this.adminConfig.level3Percent,
                volumeUsd,
                commissionCurrency
              );
            }
          }
        }
      }
    }

    saveToStorage('commissions', this.commissions);
  }

  private createCommissionRecord(
    txId: string,
    sourceUserId: string,
    sourceUserIdentifier: string,
    beneficiaryUserId: string,
    level: 1 | 2 | 3,
    ratePercent: number,
    volumeUsd: number,
    currency: 'LIORA' | 'OXENIQ' | 'USDT'
  ) {
    // Idempotency: verify this tx has not already granted commission to this beneficiary at this level
    const existing = this.commissions.find(
      (c) => c.transactionId === txId && c.beneficiaryUserId === beneficiaryUserId && c.level === level
    );
    if (existing) return;

    // Calculate commission amount
    const earnedUsd = volumeUsd * (ratePercent / 100);
    const normalizedCurrency = currency === 'OXENIQ' ? 'LIORA' : currency;
    const amount =
      normalizedCurrency === 'LIORA'
        ? earnedUsd / 0.05
        : earnedUsd;

    const record: CommissionRecord = {
      id: `comm_${Date.now()}_L${level}_${Math.random().toString(36).slice(2, 6)}`,
      transactionId: txId,
      sourceUserId,
      sourceUserIdentifier,
      beneficiaryUserId,
      level,
      commissionRatePercent: ratePercent,
      tradeVolumeUsd: Number(volumeUsd.toFixed(2)),
      currency: normalizedCurrency,
      amount: Number(amount.toFixed(2)),
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    };

    this.commissions.unshift(record);
  }

  // --- Commissions & Claims ---
  public getCommissions(userId?: string): CommissionRecord[] {
    const target = userId || this.user?.id || DEFAULT_ACTIVE_USER.id;
    return this.commissions.filter((c) => c.beneficiaryUserId === target);
  }

  public getAllCommissions(): CommissionRecord[] {
    return this.commissions;
  }

  public claimAllCommissions(userId?: string): { claimedOxeniq: number; claimedLiora: number; claimedUsdt: number } {
    const target = userId || this.user?.id || DEFAULT_ACTIVE_USER.id;
    let claimedLiora = 0;
    let claimedUsdt = 0;

    this.commissions = this.commissions.map((c) => {
      if (c.beneficiaryUserId === target && c.status === 'APPROVED') {
        if (c.currency === 'LIORA' || c.currency === 'OXENIQ') claimedLiora += c.amount;
        if (c.currency === 'USDT') claimedUsdt += c.amount;
        return { ...c, status: 'PAID', paidAt: new Date().toISOString() };
      }
      return c;
    });

    if (claimedLiora > 0) this.updateBalance('LIORA', claimedLiora, target);
    if (claimedUsdt > 0) this.updateBalance('USDT', claimedUsdt, target);

    saveToStorage('commissions', this.commissions);
    this.notify();
    return { claimedOxeniq: claimedLiora, claimedLiora, claimedUsdt };
  }

  // --- Referral Summaries ---
  public getReferralSummaries(userId?: string): {
    level1: ReferralLevelSummary;
    level2: ReferralLevelSummary;
    level3: ReferralLevelSummary;
    totalEarnedOxeniq: number;
    totalEarnedLiora: number;
    totalEarnedUsdt: number;
    totalVolumeUsd: number;
    totalNetworkCount: number;
  } {
    const targetUser = userId
      ? this.users.find((u) => u.id === userId)
      : this.user || DEFAULT_ACTIVE_USER;

    const refCode = targetUser?.referralCode || DEFAULT_ACTIVE_USER.referralCode;

    // Find Level 1 members (direct)
    const l1Users = this.users.filter((u) => u.sponsorCode === refCode);
    const l1Codes = new Set(l1Users.map((u) => u.referralCode));

    // Find Level 2 members
    const l2Users = this.users.filter((u) => u.sponsorCode && l1Codes.has(u.sponsorCode));
    const l2Codes = new Set(l2Users.map((u) => u.referralCode));

    // Find Level 3 members
    const l3Users = this.users.filter((u) => u.sponsorCode && l2Codes.has(u.sponsorCode));

    const userCommissions = this.getCommissions(targetUser?.id);

    const calcLevel = (
      lvl: 1 | 2 | 3,
      members: DemoUser[],
      pct: number
    ): ReferralLevelSummary => {
      const comms = userCommissions.filter((c) => c.level === lvl);
      const earnedLiora = comms
        .filter((c) => c.currency === 'LIORA' || c.currency === 'OXENIQ')
        .reduce((sum, c) => sum + c.amount, 0);
      const earnedUsdt = comms
        .filter((c) => c.currency === 'USDT')
        .reduce((sum, c) => sum + c.amount, 0);
      const vol = comms.reduce((sum, c) => sum + c.tradeVolumeUsd, 0);

      return {
        level: lvl,
        memberCount: members.length,
        totalVolumeUsd: Number(vol.toFixed(2)),
        commissionRatePercent: pct,
        earnedOxeniq: Number(earnedLiora.toFixed(2)),
        earnedLiora: Number(earnedLiora.toFixed(2)),
        earnedUsdt: Number(earnedUsdt.toFixed(2)),
      };
    };

    const l1 = calcLevel(1, l1Users, this.adminConfig.level1Percent);
    const l2 = calcLevel(2, l2Users, this.adminConfig.level2Percent);
    const l3 = calcLevel(3, l3Users, this.adminConfig.level3Percent);
    const totalLiora = Number((l1.earnedOxeniq + l2.earnedOxeniq + l3.earnedOxeniq).toFixed(2));

    return {
      level1: l1,
      level2: l2,
      level3: l3,
      totalEarnedOxeniq: totalLiora,
      totalEarnedLiora: totalLiora,
      totalEarnedUsdt: Number((l1.earnedUsdt + l2.earnedUsdt + l3.earnedUsdt).toFixed(2)),
      totalVolumeUsd: Number((l1.totalVolumeUsd + l2.totalVolumeUsd + l3.totalVolumeUsd).toFixed(2)),
      totalNetworkCount: l1.memberCount + l2.memberCount + l3.memberCount,
    };
  }

  // --- Transactions ---
  public getTransactions(userId?: string): SwapTransaction[] {
    const target = userId || this.user?.id || DEFAULT_ACTIVE_USER.id;
    return this.transactions.filter((t) => t.userId === target);
  }

  public getAllTransactions(): SwapTransaction[] {
    return this.transactions;
  }

  // --- Admin Configuration & Stats ---
  public getAdminConfig(): AdminCommissionConfig {
    return this.adminConfig;
  }

  public updateAdminConfig(newConfig: Partial<AdminCommissionConfig>) {
    this.adminConfig = { ...this.adminConfig, ...newConfig };
    saveToStorage('admin_config', this.adminConfig);
    this.notify();
  }

  public getPlatformStats(): PlatformStats {
    const totalVol = this.transactions.reduce((sum, tx) => {
      const t = this.tokens.find((tok) => tok.symbol === tx.fromToken);
      return sum + tx.fromAmount * (t ? t.priceUsd : 1);
    }, 0);

    const lioraPaid = this.commissions
      .filter((c) => c.status === 'PAID' && (c.currency === 'LIORA' || c.currency === 'OXENIQ'))
      .reduce((sum, c) => sum + c.amount, 0);

    const usdtPaid = this.commissions
      .filter((c) => c.status === 'PAID' && c.currency === 'USDT')
      .reduce((sum, c) => sum + c.amount, 0);

    const pendingLiabilityUsd = this.commissions
      .filter((c) => c.status === 'APPROVED' || c.status === 'PENDING')
      .reduce((sum, c) => {
        const valUsd = c.currency === 'LIORA' || c.currency === 'OXENIQ' ? c.amount * 0.05 : c.amount;
        return sum + valUsd;
      }, 0);

    const connectedWallets = this.users.filter((u) => u.walletAddress !== null).length;

    return {
      totalDemoUsers: this.users.length,
      connectedWalletsCount: connectedWallets,
      totalVolumeUsd: Number(totalVol.toFixed(2)),
      totalSwapsCount: this.transactions.length,
      totalOxeniqCommissionsPaid: Number(lioraPaid.toFixed(2)),
      totalLioraCommissionsPaid: Number(lioraPaid.toFixed(2)),
      totalUsdtCommissionsPaid: Number(usdtPaid.toFixed(2)),
      pendingCommissionsLiabilityUsd: Number(pendingLiabilityUsd.toFixed(2)),
    };
  }

  // --- Simulation Helpers ---
  public simulateNewDownline(level: 1 | 2 | 3): DemoUser {
    const active = this.user || DEFAULT_ACTIVE_USER;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newRefCode = `OX-SIM${randomSuffix}`;

    let sponsorCode = active.referralCode;
    if (level === 2) {
      // Pick a Level 1 user as sponsor
      const l1 = this.users.find((u) => u.sponsorCode === active.referralCode);
      if (l1) sponsorCode = l1.referralCode;
    } else if (level === 3) {
      // Pick a Level 2 user as sponsor
      const l1 = this.users.find((u) => u.sponsorCode === active.referralCode);
      const l2 = l1 ? this.users.find((u) => u.sponsorCode === l1.referralCode) : null;
      if (l2) sponsorCode = l2.referralCode;
    }

    const simUser: DemoUser = {
      id: `usr_sim_${Date.now()}`,
      username: `member_${randomSuffix}`,
      displayName: `Member ${randomSuffix}`,
      email: `member.${randomSuffix}@trader.io`,
      // Demo credentials purged from source code (production uses server PostgreSQL auth only)
      referralCode: newRefCode,
      sponsorCode,
      walletAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      isWalletVerified: true,
      registeredAt: new Date().toISOString(),
      kycTier: 'TIER_1_DEMO',
      role: 'USER',
    };

    this.users.push(simUser);
    saveToStorage('users', this.users);

    // Also simulate a swap from this new user so commissions trigger immediately!
    const fromAmount = 250 + Math.floor(Math.random() * 500);
    const toAmount = fromAmount * 20; // 20 LIORA per USDT
    const txId = `tx_sim_${Date.now()}`;
    const tx: SwapTransaction = {
      id: txId,
      userId: simUser.id,
      userWallet: simUser.walletAddress!,
      fromToken: 'USDT',
      toToken: 'LIORA',
      fromAmount,
      toAmount,
      rate: 20.0,
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      blockNumber: 42910000 + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      gasFeeBnb: 0.00065,
      routing: 'PancakeSwap v3 (Direct)',
      slippageUsed: 0.5,
      isSimulated: true,
    };

    this.transactions.unshift(tx);
    saveToStorage('transactions', this.transactions);

    // Calculate commission
    const quote: SwapQuote = {
      fromToken: 'USDT',
      toToken: 'LIORA',
      fromAmount,
      toAmount,
      exchangeRate: 20,
      inverseRate: 0.05,
      slippagePercent: 0.5,
      estimatedFeeBnb: 0.00065,
      estimatedFeeUsd: 0.4,
      priceImpactPercent: 0.02,
      routing: 'PancakeSwap v3 (Direct)',
      minimumReceived: toAmount * 0.995,
    };

    // Distribute
    this.distributeReferralCommissions(tx, quote);

    this.notify();
    return simUser;
  }

  public resetToDefaults() {
    this.user = null;
    this.users = [...SEED_USERS];
    this.tokens = [...INITIAL_TOKENS];
    this.transactions = [...INITIAL_TRANSACTIONS];
    this.commissions = [...INITIAL_COMMISSIONS];
    this.adminConfig = { ...INITIAL_ADMIN_CONFIG };
    this.userBalances = { ...INITIAL_USER_BALANCES };

    saveToStorage('active_user', this.user);
    saveToStorage('users', this.users);
    saveToStorage('tokens', this.tokens);
    saveToStorage('transactions', this.transactions);
    saveToStorage('commissions', this.commissions);
    saveToStorage('admin_config', this.adminConfig);
    saveToStorage('user_balances', this.userBalances);

    this.notify();
  }
}

export const demoStore = new DemoStoreManager();
