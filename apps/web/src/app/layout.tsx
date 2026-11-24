import type { Metadata } from 'next';
import './globals.css';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Web3WalletProvider } from '../context/Web3WalletContext';

export const metadata: Metadata = {
  title: 'LIORA — Powering the Next Digital Era',
  description: 'Official portal for LIORA: A high-security, utility token on BNB Smart Chain with audited UUPS upgradeable smart contracts and corporate timelock governance.',
  keywords: ['LIORA', 'BNB Smart Chain', 'BEP-20', 'Web3', 'Crypto', 'Token', 'DeFi', 'PancakeSwap'],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <Web3WalletProvider>
          <Header />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {children}
          </main>
          <Footer />
        </Web3WalletProvider>
      </body>
    </html>
  );
}
