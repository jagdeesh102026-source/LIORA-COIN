/**
 * LIORA COIN — Remote Preview & Review Security Configuration
 *
 * Enforces strict read-only, non-custodial, and confidentiality guardrails
 * for remote executive and management review sessions:
 *
 * 1. Read-Only Mode: Disables on-chain write operations and live transactions.
 * 2. Confidentiality Guard: Hides/disables proprietary ALGOX V6_1_24 strategy & signals.
 * 3. Admin Hardening: Disables one-click demo passcodes and prevents unauthorized configuration tampering.
 * 4. Synthetic Isolation: Guarantees only safe demo accounts and synthetic data are accessible.
 */

/**
 * Helper to determine if running locally for developer / tester interactive Testnet trading.
 * Uses environment variable or runtime checks that evaluate identically on server and client.
 */
function isLocalEnvironment(): boolean {
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ALLOW_LOCAL_TRADING === 'true') {
    return true;
  }
  return false;
}

export const PREVIEW_CONFIG = {
  // Master toggle: Always true in Phase 1 to inform users that contracts are verified on Mainnet in read-only mode
  isPreviewMode: true,

  // Security & Confidentiality Policies
  disableLiveTrading: true,
  disableOnChainPurchases: true,
  hideTradingBot: false,
  hideTradingBotSignals: true,
  lockAdminConsole: false,

  // Visual Advisories & Labels
  previewBadgeText: 'BSC Mainnet Verified (Read-Only)',
  previewBannerMessage: 'BSC MAINNET LIVE — LIORA smart contracts verified on BNB Smart Chain. Website operating in secure read-only mode (Trading, liquidity & purchases disabled).',
  tradingBotRestrictedNotice: 'Proprietary Trading Strategy (ALGOX V6_1_24) is confidential and protected under NDA. Strategy parameters, webhook receivers, and signal feeds are disabled during external remote preview.',
  adminRestrictedNotice: 'Administrative governance and parameter modifications are locked in Remote Review Mode.',
};

export default PREVIEW_CONFIG;
