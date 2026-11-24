-- LIORA COIN — Phase 2: Production PostgreSQL Migration
-- Enterprise Relational Schema, Financial Ledger, Vesting & Idempotency Constraints

-- 1. Create Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PurchaseIntentStatus') THEN
        CREATE TYPE "PurchaseIntentStatus" AS ENUM ('INITIATED', 'PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'ALLOCATED', 'FAILED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AllocationClaimStatus') THEN
        CREATE TYPE "AllocationClaimStatus" AS ENUM ('LOCKED', 'UNLOCKED', 'CLAIMED', 'REVOKED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderSide') THEN
        CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderType') THEN
        CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerEntryType') THEN
        CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerReason') THEN
        CREATE TYPE "LedgerReason" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRADE', 'ALLOCATION_LOCK', 'COMMISSION', 'FEE', 'REORGANIZATION_ADJUSTMENT');
    END IF;
END $$;

-- 2. Alter Existing Tables with Production Integrity Columns
ALTER TABLE "users" 
    ADD COLUMN IF NOT EXISTS "isDevelopmentOnly" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT,
    ADD COLUMN IF NOT EXISTS "isMfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

ALTER TABLE "payment_transactions"
    ADD COLUMN IF NOT EXISTS "networkId" TEXT NOT NULL DEFAULT 'bsc-testnet',
    ADD COLUMN IF NOT EXISTS "amountRaw" TEXT NOT NULL DEFAULT '0',
    ADD COLUMN IF NOT EXISTS "purchaseIntentId" TEXT,
    ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
    ADD COLUMN IF NOT EXISTS "reorgDetected" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

ALTER TABLE "audit_logs"
    ADD COLUMN IF NOT EXISTS "severity" TEXT NOT NULL DEFAULT 'INFO';

-- 3. Create Authentication Nonces Table
CREATE TABLE IF NOT EXISTS "auth_nonces" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 97,
    "statement" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_nonces_nonce_key" ON "auth_nonces"("nonce");
CREATE INDEX IF NOT EXISTS "auth_nonces_address_idx" ON "auth_nonces"("address");
CREATE INDEX IF NOT EXISTS "auth_nonces_nonce_idx" ON "auth_nonces"("nonce");

-- 4. Create Investor Quotes Table
CREATE TABLE IF NOT EXISTS "investor_quotes" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "investmentAmount" DECIMAL(28,8) NOT NULL,
    "currency" TEXT NOT NULL,
    "investmentAmountUSD" DECIMAL(28,8) NOT NULL,
    "tokenPriceUSD" TEXT NOT NULL,
    "tokenPriceINR" TEXT NOT NULL,
    "tokenQuantity" TEXT NOT NULL,
    "lockTier" TEXT NOT NULL,
    "lockMonths" INTEGER NOT NULL,
    "lockStartTimeUTC" TIMESTAMP(3) NOT NULL,
    "estimatedUnlockTimeUTC" TIMESTAMP(3) NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "investor_quotes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "investor_quotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "investor_quotes_quoteId_key" ON "investor_quotes"("quoteId");
CREATE INDEX IF NOT EXISTS "investor_quotes_quoteId_idx" ON "investor_quotes"("quoteId");
CREATE INDEX IF NOT EXISTS "investor_quotes_userId_idx" ON "investor_quotes"("userId");

-- 5. Create Purchase Intents Table
CREATE TABLE IF NOT EXISTS "purchase_intents" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "status" "PurchaseIntentStatus" NOT NULL DEFAULT 'INITIATED',
    "amountUSD" DECIMAL(28,8) NOT NULL,
    "tokenQuantity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_intents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "purchase_intents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_intents_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "investor_quotes"("quoteId") ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_intents_idempotencyKey_key" ON "purchase_intents"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "purchase_intents_userId_idx" ON "purchase_intents"("userId");
CREATE INDEX IF NOT EXISTS "purchase_intents_quoteId_idx" ON "purchase_intents"("quoteId");

-- 6. Create Vesting Schedules Table
CREATE TABLE IF NOT EXISTS "vesting_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "beneficiaryWallet" TEXT NOT NULL,
    "totalTokensRaw" TEXT NOT NULL,
    "releasedTokensRaw" TEXT NOT NULL DEFAULT '0',
    "cliffDurationMonths" INTEGER NOT NULL DEFAULT 0,
    "lockDurationMonths" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "cliffEndAt" TIMESTAMP(3) NOT NULL,
    "lockEndAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "onChainVaultContract" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vesting_schedules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vesting_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "vesting_schedules_userId_idx" ON "vesting_schedules"("userId");
CREATE INDEX IF NOT EXISTS "vesting_schedules_beneficiaryWallet_idx" ON "vesting_schedules"("beneficiaryWallet");

-- 7. Create Investor Allocations Table
CREATE TABLE IF NOT EXISTS "investor_allocations" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "investmentAmountUSD" DECIMAL(28,8) NOT NULL,
    "tokenQuantity" TEXT NOT NULL,
    "lockTierMonths" INTEGER NOT NULL,
    "lockStartTimeUTC" TIMESTAMP(3) NOT NULL,
    "unlockTimeUTC" TIMESTAMP(3) NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "paymentVerificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "claimStatus" "AllocationClaimStatus" NOT NULL DEFAULT 'LOCKED',
    "txHash" TEXT,
    "isDemoAllocation" BOOLEAN NOT NULL DEFAULT false,
    "vestingScheduleId" TEXT,
    "purchaseIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investor_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "investor_allocations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "investor_allocations_purchaseIntentId_fkey" FOREIGN KEY ("purchaseIntentId") REFERENCES "purchase_intents"("id") ON DELETE SET NULL,
    CONSTRAINT "investor_allocations_vestingScheduleId_fkey" FOREIGN KEY ("vestingScheduleId") REFERENCES "vesting_schedules"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "investor_allocations_purchaseId_key" ON "investor_allocations"("purchaseId");
CREATE UNIQUE INDEX IF NOT EXISTS "investor_allocations_idempotencyKey_key" ON "investor_allocations"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "investor_allocations_purchaseIntentId_key" ON "investor_allocations"("purchaseIntentId");
CREATE INDEX IF NOT EXISTS "investor_allocations_userId_idx" ON "investor_allocations"("userId");
CREATE INDEX IF NOT EXISTS "investor_allocations_walletAddress_idx" ON "investor_allocations"("walletAddress");
CREATE INDEX IF NOT EXISTS "investor_allocations_claimStatus_idx" ON "investor_allocations"("claimStatus");

-- 8. Create Trading Orders & Executions Table
CREATE TABLE IF NOT EXISTS "trading_orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "orderType" "OrderType" NOT NULL DEFAULT 'MARKET',
    "price" DECIMAL(28,8),
    "amount" DECIMAL(28,18) NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "filledAmount" DECIMAL(28,18) NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "isDemoOrder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trading_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trading_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "trading_orders_orderId_key" ON "trading_orders"("orderId");
CREATE INDEX IF NOT EXISTS "trading_orders_userId_idx" ON "trading_orders"("userId");
CREATE INDEX IF NOT EXISTS "trading_orders_pair_idx" ON "trading_orders"("pair");
CREATE INDEX IF NOT EXISTS "trading_orders_status_idx" ON "trading_orders"("status");

CREATE TABLE IF NOT EXISTS "order_executions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "executionPrice" DECIMAL(28,8) NOT NULL,
    "executedAmount" DECIMAL(28,18) NOT NULL,
    "feeAmount" DECIMAL(28,18) NOT NULL,
    "feeAsset" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_executions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_executions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "trading_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "order_executions_orderId_idx" ON "order_executions"("orderId");

-- 9. Create Token Balances & Double-Entry Balance Movements Table
CREATE TABLE IF NOT EXISTS "token_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "balance" DECIMAL(36,18) NOT NULL,
    "balanceRaw" TEXT NOT NULL,
    "lockedBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "isDemoBalance" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_balances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "token_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "token_balances_userId_tokenSymbol_isDemoBalance_key" ON "token_balances"("userId", "tokenSymbol", "isDemoBalance");
CREATE INDEX IF NOT EXISTS "token_balances_userId_idx" ON "token_balances"("userId");

CREATE TABLE IF NOT EXISTS "balance_movements" (
    "id" TEXT NOT NULL,
    "balanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "balance_movements_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "token_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "balance_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "balance_movements_idempotencyKey_key" ON "balance_movements"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "balance_movements_userId_idx" ON "balance_movements"("userId");
CREATE INDEX IF NOT EXISTS "balance_movements_balanceId_idx" ON "balance_movements"("balanceId");
CREATE INDEX IF NOT EXISTS "balance_movements_createdAt_idx" ON "balance_movements"("createdAt");

