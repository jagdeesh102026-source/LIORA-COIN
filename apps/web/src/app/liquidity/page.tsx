import type { Metadata } from 'next';
import { LioraLiquidityDashboard } from '../../components/exchange/LioraLiquidityDashboard';
import { MarketTicker } from '../../components/exchange/MarketTicker';
import { SecurityTrustSection } from '../../components/exchange/SecurityTrustSection';

export const metadata: Metadata = {
  title: 'Liquidity Management & Pool Administration | LIORA COIN',
  description:
    'Institutional non-custodial liquidity administration for the LIORA/mUSDT PancakeSwap V2 pool on BNB Smart Chain Testnet.',
};

export default function LiquidityPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Top Ticker */}
      <MarketTicker />

      {/* Main Liquidity Dashboard */}
      <LioraLiquidityDashboard />

      {/* Bottom Trust & Architecture Verification */}
      <SecurityTrustSection />
    </div>
  );
}
