-- LIORA COIN — Phase 2B: Canonical Ledger, Check Constraints & Double-Entry Invariants
-- Migration: 20261115120000_phase2b_canonical_ledger_and_constraints

BEGIN;

-- 1. Create LedgerAccountType Enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerAccountType') THEN
        CREATE TYPE "LedgerAccountType" AS ENUM ('USER_AVAILABLE', 'USER_LOCKED', 'PLATFORM_CUSTODY', 'CLEARING', 'FEE');
    END IF;
END $$;

-- 2. Create Ledger Accounts Table
CREATE TABLE IF NOT EXISTS "ledger_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "accountType" "LedgerAccountType" NOT NULL,
    "assetId" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ledger_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ledger_accounts_id_assetId_key" UNIQUE ("id", "assetId"),
    CONSTRAINT "chk_ledger_account_asset_format" CHECK ("assetId" ~* '^[a-z0-9_-]+:[a-z0-9_-]+:[a-z0-9_.-]+$')
);

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_accounts_user_type_asset_demo_key" 
    ON "ledger_accounts"("userId", "accountType", "assetId", "isDemo") 
    WHERE "userId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_accounts_platform_type_asset_demo_key" 
    ON "ledger_accounts"("accountType", "assetId", "isDemo") 
    WHERE "userId" IS NULL;

CREATE INDEX IF NOT EXISTS "ledger_accounts_userId_idx" ON "ledger_accounts"("userId");
CREATE INDEX IF NOT EXISTS "ledger_accounts_assetId_idx" ON "ledger_accounts"("assetId");

-- 3. Create Journal Transactions Header Table
CREATE TABLE IF NOT EXISTS "journal_transactions" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT,
    "reason" "LedgerReason" NOT NULL,
    "description" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "reversalOfId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "journal_transactions_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "journal_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "journal_transactions_idempotencyKey_key" ON "journal_transactions"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "journal_transactions_reversalOfId_key" ON "journal_transactions"("reversalOfId") WHERE "reversalOfId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "journal_transactions_referenceId_idx" ON "journal_transactions"("referenceId");
CREATE INDEX IF NOT EXISTS "journal_transactions_reason_idx" ON "journal_transactions"("reason");
CREATE INDEX IF NOT EXISTS "journal_transactions_createdAt_idx" ON "journal_transactions"("createdAt");

-- Trigger: Prevent deletion and tampering of journal transaction headers
CREATE OR REPLACE FUNCTION fn_prevent_journal_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Journal transactions are strictly immutable. DELETE is prohibited.';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD."id" <> NEW."id" OR OLD."reason" <> NEW."reason" OR OLD."isDemo" <> NEW."isDemo" OR (OLD."reversalOfId" IS DISTINCT FROM NEW."reversalOfId") THEN
            RAISE EXCEPTION 'Journal transaction headers are immutable. UPDATE of identity, reason, demo status, or reversal reference is prohibited.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_journal_mutation ON "journal_transactions";
CREATE TRIGGER trg_prevent_journal_mutation
BEFORE UPDATE OR DELETE ON "journal_transactions"
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_journal_mutation();

-- 4. Create Ledger Postings (Double-Entry Legs) Table
CREATE TABLE IF NOT EXISTS "ledger_postings" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "direction" "LedgerEntryType" NOT NULL,
    "amountBaseUnits" NUMERIC(78, 0) NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_postings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ledger_postings_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journal_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ledger_postings_account_asset_fkey" FOREIGN KEY ("accountId", "assetId") REFERENCES "ledger_accounts"("id", "assetId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chk_posting_amount_positive" CHECK ("amountBaseUnits" > 0),
    CONSTRAINT "chk_ledger_posting_asset_format" CHECK ("assetId" ~* '^[a-z0-9_-]+:[a-z0-9_-]+:[a-z0-9_.-]+$'),
    CONSTRAINT "ledger_postings_journalId_sequence_key" UNIQUE ("journalId", "sequence")
);

CREATE INDEX IF NOT EXISTS "ledger_postings_journalId_idx" ON "ledger_postings"("journalId");
CREATE INDEX IF NOT EXISTS "ledger_postings_accountId_idx" ON "ledger_postings"("accountId");
CREATE INDEX IF NOT EXISTS "ledger_postings_assetId_idx" ON "ledger_postings"("assetId");

-- Trigger: Prevent adding postings to already-committed/closed journals
CREATE OR REPLACE FUNCTION fn_prevent_late_posting()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_xmin BIGINT;
    v_cur_xid BIGINT;
BEGIN
    SELECT xmin::text::bigint INTO v_journal_xmin
    FROM "journal_transactions"
    WHERE "id" = NEW."journalId";

    IF v_journal_xmin IS NULL THEN
        RAISE EXCEPTION 'Referenced journal transaction % does not exist', NEW."journalId";
    END IF;

    SELECT pg_current_xact_id()::text::bigint INTO v_cur_xid;

    IF v_journal_xmin <> v_cur_xid THEN
        RAISE EXCEPTION 'Journal transaction % is already committed and closed. Adding postings to closed journals is strictly prohibited. Create a new journal or reversal transaction.', NEW."journalId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_late_posting ON "ledger_postings";
CREATE TRIGGER trg_prevent_late_posting
BEFORE INSERT ON "ledger_postings"
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_late_posting();

-- 5. Trigger: Verify Journal Finalization & Zero-Sum Balance (Deferred Constraint Trigger)
CREATE OR REPLACE FUNCTION fn_verify_journal_finalization()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
    v_imbalance RECORD;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM "ledger_postings"
    WHERE "journalId" = NEW."id";

    IF v_count < 2 THEN
        RAISE EXCEPTION 'Journal % is invalid: requires at least 2 postings, found %', NEW."id", v_count;
    END IF;

    FOR v_imbalance IN
        SELECT "assetId",
               SUM(CASE WHEN "direction" = 'DEBIT' THEN "amountBaseUnits" ELSE -"amountBaseUnits" END) as net_diff
        FROM "ledger_postings"
        WHERE "journalId" = NEW."id"
        GROUP BY "assetId"
        HAVING SUM(CASE WHEN "direction" = 'DEBIT' THEN "amountBaseUnits" ELSE -"amountBaseUnits" END) <> 0
    LOOP
        RAISE EXCEPTION 'Unbalanced double-entry journal % for asset %: net difference is %',
            NEW."id", v_imbalance."assetId", v_imbalance.net_diff;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_journal_finalization ON "journal_transactions";
CREATE CONSTRAINT TRIGGER trg_verify_journal_finalization
AFTER INSERT OR UPDATE ON "journal_transactions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION fn_verify_journal_finalization();

-- 6. Trigger: Immutability Enforcer (Append-Only Postings)
CREATE OR REPLACE FUNCTION fn_prevent_posting_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger postings are strictly append-only. UPDATE and DELETE are prohibited. Use reversal journal transactions.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_posting_mutation ON "ledger_postings";
CREATE TRIGGER trg_prevent_posting_mutation
BEFORE UPDATE OR DELETE ON "ledger_postings"
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_posting_mutation();

-- 7. Enhance Token Balances Table (No unsafe default networks or decimals, full precision)
ALTER TABLE "token_balances"
    ALTER COLUMN "balance" TYPE NUMERIC,
    ALTER COLUMN "lockedBalance" TYPE NUMERIC,
    ADD COLUMN IF NOT EXISTS "assetId" TEXT,
    ADD COLUMN IF NOT EXISTS "networkId" TEXT,
    ADD COLUMN IF NOT EXISTS "standard" TEXT,
    ADD COLUMN IF NOT EXISTS "contractAddress" TEXT,
    ADD COLUMN IF NOT EXISTS "decimals" INTEGER,
    ADD COLUMN IF NOT EXISTS "balanceBaseUnits" NUMERIC(78, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "lockedBaseUnits" NUMERIC(78, 0) NOT NULL DEFAULT 0;

-- Trigger: Ensure non-contradictory balance representation (balance strictly derived from base units and decimals)
CREATE OR REPLACE FUNCTION fn_sync_token_balances()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."decimals" IS NOT NULL AND NEW."decimals" >= 0 THEN
        NEW."balance" := (NEW."balanceBaseUnits" / (10 ^ NEW."decimals")::NUMERIC);
        NEW."lockedBalance" := (NEW."lockedBaseUnits" / (10 ^ NEW."decimals")::NUMERIC);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_token_balances ON "token_balances";
CREATE TRIGGER trg_sync_token_balances
BEFORE INSERT OR UPDATE ON "token_balances"
FOR EACH ROW
EXECUTE FUNCTION fn_sync_token_balances();

-- Non-negative & integrity check constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_balance_non_negative') THEN
        ALTER TABLE "token_balances" ADD CONSTRAINT "chk_balance_non_negative" CHECK ("balance" >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_locked_balance_non_negative') THEN
        ALTER TABLE "token_balances" ADD CONSTRAINT "chk_locked_balance_non_negative" CHECK ("lockedBalance" >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_locked_balance_lte_balance') THEN
        ALTER TABLE "token_balances" ADD CONSTRAINT "chk_locked_balance_lte_balance" CHECK ("lockedBalance" <= "balance");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_base_units_non_negative') THEN
        ALTER TABLE "token_balances" ADD CONSTRAINT "chk_base_units_non_negative" CHECK ("balanceBaseUnits" >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_locked_base_units_non_negative') THEN
        ALTER TABLE "token_balances" ADD CONSTRAINT "chk_locked_base_units_non_negative" CHECK ("lockedBaseUnits" >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_locked_lte_balance_base_units') THEN
        ALTER TABLE "token_balances" ADD CONSTRAINT "chk_locked_lte_balance_base_units" CHECK ("lockedBaseUnits" <= "balanceBaseUnits");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_token_balance_asset_format') THEN
        ALTER TABLE "token_balances" ADD CONSTRAINT "chk_token_balance_asset_format" CHECK ("assetId" IS NULL OR "assetId" ~* '^[a-z0-9_-]+:[a-z0-9_-]+:[a-z0-9_.-]+$');
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "token_balances_userId_assetId_isDemoBalance_key" 
    ON "token_balances"("userId", "assetId", "isDemoBalance");

-- 8. Enhance Payment Transactions Table (Compound Unique txHash + chainId)
DROP INDEX IF EXISTS "payment_transactions_txHash_key";
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_txHash_chainId_key" 
    ON "payment_transactions"("txHash", "chainId");

COMMIT;
