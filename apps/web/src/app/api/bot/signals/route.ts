import { NextRequest, NextResponse } from 'next/server';
import { getTradingBotAccess } from '@/lib/server/entitlementService';
import { serverDb } from '@/lib/server/db';
import { PREVIEW_CONFIG } from '@/config/previewConfig';

// Confirmed Strategy Metadata & Simulated Telemetry
// Proprietary ALGOX V6_1_24 Pine Script source code remains strictly confidential on TradingView servers
const SIMULATED_BOT_SIGNALS = [
  {
    id: 'sig_001',
    strategy: 'ALGOX V6_1_24',
    strategyVersion: '6.1.24',
    pair: 'BTC/USDT',
    action: 'LONG',
    entryPrice: 94250.0,
    tp1: 96500.0,
    tp2: 98800.0,
    stopLoss: 92800.0,
    riskRewardRatio: 2.8,
    timeframe: '1H',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'ACTIVE',
    pnlPercent: +2.14,
    isSimulated: true,
    notes: 'Bullish momentum breakout above 200 EMA with volume expansion',
  },
  {
    id: 'sig_002',
    strategy: 'ALGOX V6_1_24',
    strategyVersion: '6.1.24',
    pair: 'LIORA/USDT',
    action: 'LONG',
    entryPrice: 0.0512,
    tp1: 0.0545,
    tp2: 0.058,
    stopLoss: 0.0485,
    riskRewardRatio: 3.2,
    timeframe: '15m',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: 'TP1_HIT',
    pnlPercent: +6.45,
    isSimulated: true,
    notes: 'Ascending triangle confirmed retest on BSC liquidity pool',
  },
  {
    id: 'sig_003',
    strategy: 'ALGOX V6_1_24',
    strategyVersion: '6.1.24',
    pair: 'ETH/USDT',
    action: 'SHORT',
    entryPrice: 3420.5,
    tp1: 3310.0,
    tp2: 3220.0,
    stopLoss: 3495.0,
    riskRewardRatio: 2.5,
    timeframe: '4H',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: 'TP2_HIT',
    pnlPercent: +5.86,
    isSimulated: true,
    notes: 'Resistance rejection at Fibonacci 0.618 retracement level',
  },
  {
    id: 'sig_004',
    strategy: 'ALGOX V6_1_24',
    strategyVersion: '6.1.24',
    pair: 'BNB/USDT',
    action: 'LONG',
    entryPrice: 635.0,
    tp1: 655.0,
    tp2: 675.0,
    stopLoss: 618.0,
    riskRewardRatio: 2.4,
    timeframe: '1H',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'CLOSED',
    pnlPercent: +4.2,
    isSimulated: true,
    notes: 'Cross-chain ecosystem volume accumulation signal',
  },
];

export async function GET(req: NextRequest) {
  try {
    if (PREVIEW_CONFIG.hideTradingBotSignals) {
      return NextResponse.json(
        {
          error: 'PREVIEW_RESTRICTION',
          message: PREVIEW_CONFIG.tradingBotRestrictedNotice,
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionCookie = req.cookies.get('liora_bot_session')?.value;
    let userId = searchParams.get('userId');
    const walletAddress = searchParams.get('walletAddress');

    if (sessionCookie) {
      const session = await serverDb.getSession(sessionCookie);
      if (session) userId = session.userId;
    }

    if (!userId) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication session required to access proprietary trading signals.',
        },
        { status: 401 }
      );
    }

    // Server-Side Entitlement Check Gateway
    const access = await getTradingBotAccess(userId, walletAddress);

    if (!access.hasAccess) {
      return NextResponse.json(
        {
          error: 'ACCESS_DENIED',
          status: access.status,
          reason: access.reason || 'Active 48-Hour Free Trial or Paid Subscription required.',
          message:
            access.status === 'TRIAL_EXPIRED'
              ? 'Your 48-Hour Free Trial has expired. Please upgrade to a subscription plan to continue receiving signals.'
              : 'Access to ALGOX V6_1_24 trading signals requires an active subscription or verified trial.',
          expiresAt: access.expiresAt,
        },
        { status: 403 }
      );
    }

    // Access Granted! Return protected signals and telemetry
    return NextResponse.json({
      success: true,
      strategy: 'ALGOX V6_1_24',
      disclaimer: 'SIMULATED DEMONSTRATION SIGNALS — NOT FINANCIAL ADVICE',
      access: {
        accessType: access.accessType,
        status: access.status,
        expiresAt: access.expiresAt,
        remainingTimeMs: access.remainingTimeMs,
        formattedRemaining: access.formattedRemaining,
      },
      signals: SIMULATED_BOT_SIGNALS,
      metrics: {
        winRatePercent: 78.4,
        profitFactor: 2.45,
        totalSimulatedTrades: 342,
        winningTrades: 268,
        losingTrades: 74,
        maxDrawdownPercent: 6.8,
        netPnlPercent: +184.2,
        sharpeRatio: 2.15,
        periodLabel: 'Last 90 Days (Backtest Telemetry)',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

