import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    const chainIdParam = searchParams.get('chainId');
    const isProd = process.env.NODE_ENV === 'production' || process.env.OXENIQ_ENV === 'production';
    const chainId = chainIdParam ? parseInt(chainIdParam, 10) : (isProd ? 56 : 97);

    if (isProd && chainId !== 56) {
      return NextResponse.json(
        { success: false, error: 'UNSUPPORTED_CHAIN_ID', message: 'Production authentication supports BSC Mainnet (Chain ID 56) only.' },
        { status: 400 }
      );
    }

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing EVM wallet address parameter' },
        { status: 400 }
      );
    }

    const cleanAddr = address.toLowerCase();
    const nonce = await serverDb.createNonce(cleanAddr, 5 * 60 * 1000); // 5 min TTL
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const domain = req.headers.get('host') || 'lioracoin.com';
    const uri = req.nextUrl.origin || `https://${domain}`;
    const statement = 'Sign in with Ethereum to Liora Coin (LIORA) non-custodial platform.';

    // Canonical EIP-4361 SIWE formatted challenge string
    const siweMessage = [
      `${domain} wants you to sign in with your Ethereum account:`,
      cleanAddr,
      '',
      statement,
      '',
      `URI: ${uri}`,
      `Version: 1`,
      `Chain ID: ${chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${now.toISOString()}`,
      `Expiration Time: ${expiresAt.toISOString()}`
    ].join('\n');

    return NextResponse.json({
      success: true,
      address: cleanAddr,
      nonce,
      domain,
      uri,
      chainId,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      statement,
      siweMessage
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error generating nonce' },
      { status: 500 }
    );
  }
}
