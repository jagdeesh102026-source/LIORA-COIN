-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustodialAllocationStatus') THEN
        CREATE TYPE "CustodialAllocationStatus" AS ENUM (
            'PENDING_PAYMENT_VERIFICATION',
            'ACTIVE_CUSTODIAL_ALLOCATION',
            'MATURED_AWAITING_PAYOUT',
            'PAYMENT_DISPATCHED',
            'PAYMENT_INDEPENDENTLY_VERIFIED',
            'SETTLEMENT_COMPLETED',
            'CANCELLED',
            'REJECTED'
        );
    END IF;
END $$;

-- CreateTable custodial_allocations
CREATE TABLE IF NOT EXISTS "custodial_allocations" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "investorAddress" TEXT NOT NULL,
    "investorName" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "tierNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "principalINR" DECIMAL(28,2) NOT NULL,
    "principalUSD" DECIMAL(28,2) NOT NULL,
    "contractualSettlementINR" DECIMAL(28,2) NOT NULL,
    "multiplierFactor" DECIMAL(10,4) NOT NULL,
    "lockDurationMonths" INTEGER NOT NULL,
    "settlementPayoutMonth" INTEGER NOT NULL,
    "allocationPriceINR" TEXT NOT NULL,
    "allocatedTokensFormatted" TEXT NOT NULL,
    "allocatedTokensBaseUnits" DECIMAL(78,0) NOT NULL,
    "status" "CustodialAllocationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT_VERIFICATION',
    "custodyModel" TEXT NOT NULL DEFAULT 'COMPANY_CONTROLLED_CUSTODY_OPTION_A',
    "custodyHoldingAddress" TEXT NOT NULL,
    "isInvestorTransferable" BOOLEAN NOT NULL DEFAULT false,
    "isInvestorWithdrawable" BOOLEAN NOT NULL DEFAULT false,
    "isCustodialAllocation" BOOLEAN NOT NULL DEFAULT true,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "maturesAt" TIMESTAMP(3),
    "payoutDueDate" TIMESTAMP(3),

    CONSTRAINT "custodial_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable custodial_payment_records
CREATE TABLE IF NOT EXISTS "custodial_payment_records" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "canonicalReferenceKey" TEXT NOT NULL,
    "amountPaid" DECIMAL(28,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentRail" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifyingAdmin" TEXT,
    "adminNotes" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "dispatchedBy" TEXT,
    "collateralTxHash" TEXT,
    "collateralReturnedAt" TIMESTAMP(3),

    CONSTRAINT "custodial_payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable payment_reference_registry
CREATE TABLE IF NOT EXISTS "payment_reference_registry" (
    "id" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "normalizedRef" TEXT NOT NULL,
    "rawReference" TEXT NOT NULL,
    "paymentRail" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'BSC_TESTNET',
    "allocationOrInvId" TEXT NOT NULL,
    "amountPaidINR" DECIMAL(28,2) NOT NULL,
    "registeredBy" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "correctionReason" TEXT,
    "correctedBy" TEXT,
    "correctedAt" TIMESTAMP(3),

    CONSTRAINT "payment_reference_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable custodial_treasury_snapshots
CREATE TABLE IF NOT EXISTS "custodial_treasury_snapshots" (
    "id" TEXT NOT NULL,
    "treasuryAddress" TEXT NOT NULL,
    "totalOnChainHoldingsBaseUnits" DECIMAL(78,0) NOT NULL,
    "reservedCustodialAllocationsBaseUnits" DECIMAL(78,0) NOT NULL,
    "unrestrictedFreeBaseUnits" DECIMAL(78,0) NOT NULL,
    "lastReconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciledBlockNumber" BIGINT,
    "isSolvent" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custodial_treasury_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable custodial_treasury_movements
CREATE TABLE IF NOT EXISTS "custodial_treasury_movements" (
    "id" TEXT NOT NULL,
    "treasuryAddress" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "amountBaseUnits" DECIMAL(78,0) NOT NULL,
    "balanceBefore" DECIMAL(78,0) NOT NULL,
    "balanceAfter" DECIMAL(78,0) NOT NULL,
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "purpose" TEXT NOT NULL,
    "authorizedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custodial_treasury_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable custodial_ledger_audits
CREATE TABLE IF NOT EXISTS "custodial_ledger_audits" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custodial_ledger_audits_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "custodial_allocations_allocationId_key" ON "custodial_allocations"("allocationId");
CREATE UNIQUE INDEX IF NOT EXISTS "custodial_allocations_idempotencyKey_key" ON "custodial_allocations"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "custodial_allocations_investorAddress_idx" ON "custodial_allocations"("investorAddress");
CREATE INDEX IF NOT EXISTS "custodial_allocations_status_idx" ON "custodial_allocations"("status");
CREATE INDEX IF NOT EXISTS "custodial_allocations_planId_idx" ON "custodial_allocations"("planId");

CREATE UNIQUE INDEX IF NOT EXISTS "custodial_payment_records_allocationId_key" ON "custodial_payment_records"("allocationId");
CREATE INDEX IF NOT EXISTS "custodial_payment_records_canonicalReferenceKey_idx" ON "custodial_payment_records"("canonicalReferenceKey");
CREATE INDEX IF NOT EXISTS "custodial_payment_records_verificationStatus_idx" ON "custodial_payment_records"("verificationStatus");

CREATE UNIQUE INDEX IF NOT EXISTS "payment_reference_registry_canonicalKey_key" ON "payment_reference_registry"("canonicalKey");
CREATE INDEX IF NOT EXISTS "payment_reference_registry_canonicalKey_idx" ON "payment_reference_registry"("canonicalKey");
CREATE INDEX IF NOT EXISTS "payment_reference_registry_normalizedRef_idx" ON "payment_reference_registry"("normalizedRef");

CREATE UNIQUE INDEX IF NOT EXISTS "custodial_treasury_snapshots_treasuryAddress_key" ON "custodial_treasury_snapshots"("treasuryAddress");

CREATE UNIQUE INDEX IF NOT EXISTS "custodial_treasury_movements_idempotencyKey_key" ON "custodial_treasury_movements"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "custodial_treasury_movements_treasuryAddress_idx" ON "custodial_treasury_movements"("treasuryAddress");
CREATE INDEX IF NOT EXISTS "custodial_treasury_movements_movementType_idx" ON "custodial_treasury_movements"("movementType");

CREATE INDEX IF NOT EXISTS "custodial_ledger_audits_allocationId_idx" ON "custodial_ledger_audits"("allocationId");
CREATE INDEX IF NOT EXISTS "custodial_ledger_audits_actor_idx" ON "custodial_ledger_audits"("actor");
CREATE INDEX IF NOT EXISTS "custodial_ledger_audits_action_idx" ON "custodial_ledger_audits"("action");
CREATE INDEX IF NOT EXISTS "custodial_ledger_audits_timestamp_idx" ON "custodial_ledger_audits"("timestamp");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custodial_payment_records_allocationId_fkey') THEN
        ALTER TABLE "custodial_payment_records" ADD CONSTRAINT "custodial_payment_records_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "custodial_allocations"("allocationId") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custodial_treasury_movements_treasuryAddress_fkey') THEN
        ALTER TABLE "custodial_treasury_movements" ADD CONSTRAINT "custodial_treasury_movements_treasuryAddress_fkey" FOREIGN KEY ("treasuryAddress") REFERENCES "custodial_treasury_snapshots"("treasuryAddress") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
