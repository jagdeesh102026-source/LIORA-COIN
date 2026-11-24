import { NextRequest, NextResponse } from 'next/server';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';
import { requireSettlementInvestor } from '@/lib/server/settlement/settlementAuth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'MISSING_PARAM: Investment ID required.' }, { status: 400 });
    }

    const inv = await SettlementPersistentStore.getInvestmentById(id);
    if (!inv) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND: Investment record not found.' }, { status: 404 });
    }

    // Role check: Investor or Admin
    const auth = await requireSettlementInvestor(req, inv.investorAddress);
    if (!auth.authorized) {
      return auth.response!;
    }

    const logs = await SettlementPersistentStore.getAuditLogs(id);

    return NextResponse.json({
      success: true,
      investment: inv,
      auditLogs: logs,
      sandboxMode: true,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
