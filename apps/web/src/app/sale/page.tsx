import React from 'react';
import { Metadata } from 'next';
import { PrimarySaleTerminal } from '../../components/sale/PrimarySaleTerminal';

export const metadata: Metadata = {
  title: 'Primary Token Sale | LIORA COIN',
  description: 'Purchase LIORA tokens directly from protocol treasury with 100% of proceeds allocated into liquidity.',
};

export default function SalePage() {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <PrimarySaleTerminal />
    </div>
  );
}
