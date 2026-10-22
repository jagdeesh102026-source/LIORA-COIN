import type { Metadata } from 'next';
import './globals.css';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'OXENIQ — Powering the Next Digital Era',
  description: 'A market-priced utility token and decentralized ecosystem on BNB Smart Chain with forward-compatible cross-chain architecture.',
  keywords: ['OXENIQ', 'BNB Smart Chain', 'BEP-20', 'Web3', 'Crypto', 'Token', 'DeFi'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
