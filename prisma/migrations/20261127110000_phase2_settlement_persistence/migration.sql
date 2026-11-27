-- CreateTable investment_settlements
CREATE TABLE IF NOT EXISTS "investment_settlements" (
    "id" TEXT NOT NULL,
    "investorAddress" TEXT NOT NULL,
    "investorName" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "tierNumber" TEXT NOT NULL,
    "planCategory" TEXT NOT NULL,
    "planDisplayName" TEXT NOT NULL,
    "principalINR" DECIMAL(28,2) NOT NULL,
    "principalUSD" DECIMAL(28,2) NOT NULL,
    "agreedReturnPercent" INTEGER NOT NULL,
    "agreedCashPayoutINR" DECIMAL(28,2) NOT NULL,
    "agreedCashPayoutUSD" DECIMAL(28,2) NOT NULL,
    "contractualSettlementINR" DECIMAL(28,2) NOT NULL,
    "contractualSettlementUSD" DECIMAL(28,2) NOT NULL,
    "multiplierFactor" DECIMAL(10,4) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "payoutMonth" INTEGER NOT NULL,
    "settlementPayoutMonth" INTEGER NOT NULL,
    "createdAtMs" BIGINT NOT NULL,
    "lockEndDateMs" BIGINT NOT NULL,
    "payoutDueDateMs" BIGINT NOT NULL,
    "initialAllocationPriceINR" TEXT NOT NULL,
    "initialAllocationPriceWei" TEXT NOT NULL,
    "collateralTokensAllocated" DOUBLE PRECISION NOT NULL,
    "originalCollateralTokensFormatted" TEXT NOT NULL,
    "originalCollateralTokensBaseUnits" TEXT NOT NULL,
    "roundingRemainderWei" TEXT NOT NULL,
    "collateralTokenAddress" TEXT NOT NULL,
    "collateralCustodyType" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "stageUpdatedAtMs" BIGINT NOT NULL,
    "payoutDispatched" JSONB,
    "paymentVerification" JSONB,
    "collateralReturned" JSONB,
    "dispute" JSONB,
    "collateralTxHash" TEXT,
    "idempotencyKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable settlement_audit_entries
CREATE TABLE IF NOT EXISTS "settlement_audit_entries" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "timestampMs" BIGINT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStage" TEXT NOT NULL,
    "newStage" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "referenceId" TEXT,

    CONSTRAINT "settlement_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable settlement_idempotency_keys
CREATE TABLE IF NOT EXISTS "settlement_idempotency_keys" (
    "idempotencyKey" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_idempotency_keys_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "investment_settlements_collateralTxHash_key" ON "investment_settlements"("collateralTxHash");
CREATE UNIQUE INDEX IF NOT EXISTS "investment_settlements_idempotencyKey_key" ON "investment_settlements"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "investment_settlements_investorAddress_idx" ON "investment_settlements"("investorAddress");
CREATE INDEX IF NOT EXISTS "investment_settlements_stage_idx" ON "investment_settlements"("stage");
CREATE INDEX IF NOT EXISTS "settlement_audit_entries_investmentId_idx" ON "settlement_audit_entries"("investmentId");
CREATE INDEX IF NOT EXISTS "settlement_audit_entries_timestampMs_idx" ON "settlement_audit_entries"("timestampMs");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'settlement_audit_entries_investmentId_fkey'
    ) THEN
        ALTER TABLE "settlement_audit_entries"
            ADD CONSTRAINT "settlement_audit_entries_investmentId_fkey"
            FOREIGN KEY ("investmentId") REFERENCES "investment_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
