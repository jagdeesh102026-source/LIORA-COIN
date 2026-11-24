/**
 * Centralized Brand Configuration — LIORA COIN
 *
 * Separates user-facing platform branding (LIORA COIN / Liora Coin / LIORA)
 * from historical immutable on-chain BSC Testnet contract metadata (OXENIQ)
 * so existing smart contracts, deployment artifacts, and storage compatibility
 * remain preserved until a dedicated LIORA BEP-20 contract is deployed.
 */

export const BRAND_CONFIG = {
  brandName: 'LIORA COIN',
  displayName: 'Liora Coin',
  exchangeName: 'Liora Coin Exchange',
  proposedSymbol: 'LIORA',
  symbolStatus: 'Proposed (Pending On-Chain Contract Confirmation)',
  tagline: 'Powering the Next Digital Era',
  blockchain: 'BNB Smart Chain',
  supportEmail: 'support@lioracoin.io',
  copyright: 'Liora Coin Protocol',
  assets: {
    logo: '/assets/liora-logo.png',
    logo512: '/assets/liora-logo-512.png',
    logo128: '/assets/liora-logo-128.png',
    logoOriginal: '/assets/liora-logo-original.png',
    faviconIco: '/favicon.ico',
    faviconPng: '/favicon.png',
    appleTouchIcon: '/apple-touch-icon.png',
  },
  legacyOnChain: {
    contractName: 'OXENIQ',
    contractSymbol: 'OXENIQ',
    note: 'Live BSC Testnet contracts (Chain ID 97) retain immutable OXENIQ metadata until a dedicated LIORA BEP-20 deployment is approved.',
  },
} as const;
