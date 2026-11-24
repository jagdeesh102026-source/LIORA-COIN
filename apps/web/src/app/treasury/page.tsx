import React from 'react';
import { Metadata } from 'next';
import { TreasuryOverviewDashboard } from '../../components/treasury/TreasuryOverviewDashboard';

export const metadata: Metadata = {
  title: 'Treasury & Liquidity Accounting | LIORA COIN',
  description: 'Official double-entry reserve ledger, 100% sale proceeds liquidity allocation, and Cake-LP custody audit.',
};

export default function TreasuryPage() {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <TreasuryOverviewDashboard />
    </div>
  );
}
