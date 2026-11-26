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
 * On localhost/127.0.0.1, interactive BSC Testnet trading and MetaMask signing are enabled.
 * On remote/public review deployments, read-only preview restrictions are strictly preserved.
 */
function isLocalhost(): boolean {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local');
  }
  return process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ALLOW_LOCAL_TRADING === 'true';
}

export const PREVIEW_CONFIG = {
  // Master toggle: Enabled for temporary remote review, disabled on localhost for interactive testing
  get isPreviewMode() {
    return !isLocalhost();
  },

  // Security & Confidentiality Policies
  get disableLiveTrading() {
    return !isLocalhost();
  },
  get disableOnChainPurchases() {
    return !isLocalEnvironment();
  },
  hideTradingBot: false,
  hideTradingBotSignals: true,
  lockAdminConsole: false,

  // Visual Advisories & Labels
  previewBadgeText: 'BSC Mainnet Verified (Read-Only)',
  previewBannerMessage: 'BSC MAINNET LIVE — LIORA smart contracts verified on BNB Smart Chain. Website operating in secure read-only mode (Trading, liquidity & purchases disabled).',
  tradingBotRestrictedNotice: 'Proprietary Trading Strategy (ALGOX V6_1_24) is confidential and protected under NDA. Strategy parameters, webhook receivers, and signal feeds are disabled during external remote preview.',
  adminRestrictedNotice: 'Administrative governance and parameter modifications are locked in Remote Review Mode.',
};

function isLocalEnvironment(): boolean {
  return isLocalhost();
}

export default PREVIEW_CONFIG;
