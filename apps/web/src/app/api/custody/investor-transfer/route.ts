import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CustodialAllocationLedger } from '@/lib/custody/custodialAllocationLedger';
import { SettlementPersistentStore } from '@/lib/server/settlement/settlementPersistentStore';

export const dynamic = 'force-dynamic';

const attemptActionSchema = z.object({
  allocationId: z.string().min(5),
  callerAddress: z.string().startsWith('0x').length(42),
  action: z.enum(['TRANSFER', 'SPLIT', 'SWAP', 'BURN', 'WITHDRAW', 'MINT']),
  recipientAddress: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
});

/**
 * POST /api/custody/investor-transfer
 * Option A Inviolable Server-Side Enforcement:
 * Strictly blocks and audits any attempt by an investor to transfer, split, swap, burn, mint, or withdraw custodial LIORA.
 * Returns HTTP 403 Forbidden.
 */
export async function POST(req: NextRequest) {
  try {
    const chainIdHeader = req.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader, 10) : undefined;
    const sandboxCheck = SettlementPersistentStore.enforceSandboxRestrictions({ chainId });
    if (!sandboxCheck.permitted) {
      return NextResponse.json({ success: false, error: sandboxCheck.error }, { status: 400 });
    }

    const body = await req.json();
    const parsed = attemptActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await CustodialAllocationLedger.rejectInvestorTokenAction(
      parsed.data.allocationId,
      parsed.data.callerAddress,
      parsed.data.action
    );

    return NextResponse.json(
      {
        success: false,
        code: result.code,
        error: result.error,
        custodyModel: 'COMPANY_CONTROLLED_CUSTODY_OPTION_A',
        isInvestorTransferable: false,
        isInvestorWithdrawable: false,
      },
      { status: 403 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'SERVER_EXCEPTION', message: err.message },
      { status: 500 }
    );
  }
}
