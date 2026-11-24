-- Phase 20: PostgreSQL Initial Migration for Liora Coin Trading Bot
-- Generates all 8 models with relations, unique constraints, and indexes

-- Enums
CREATE TYPE "UserRole" AS ENUM ('USER', 'TRADER', 'VIP', 'ADMIN');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('NO_SUBSCRIPTION', 'TRIAL_ACTIVE', 'TRIAL_EXPIRED', 'ACTIVE_PAID', 'EXPIRED', 'REVOKED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');
CREATE TYPE "PaymentToken" AS ENUM ('USDT', 'LIORA');

-- 1. Users Table
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- 2. Verified Wallets Table
CREATE TABLE "verified_wallets" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 97,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "nonceChallenge" TEXT,
    "signatureProof" TEXT,

    CONSTRAINT "verified_wallets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "verified_wallets_walletAddress_key" ON "verified_wallets"("walletAddress");
CREATE INDEX "verified_wallets_userId_idx" ON "verified_wallets"("userId");
CREATE INDEX "verified_wallets_walletAddress_idx" ON "verified_wallets"("walletAddress");

-- 3. Trading Bot Trials Table (Strict 1-trial-per-user AND 1-trial-per-wallet)
CREATE TABLE "trading_bot_trials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "durationHours" INTEGER NOT NULL DEFAULT 48,
    "trialUsed" BOOLEAN NOT NULL DEFAULT true,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,

    CONSTRAINT "trading_bot_trials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "trading_bot_trials_userId_key" ON "trading_bot_trials"("userId");
CREATE UNIQUE INDEX "trading_bot_trials_walletAddress_key" ON "trading_bot_trials"("walletAddress");
CREATE INDEX "trading_bot_trials_userId_idx" ON "trading_bot_trials"("userId");
CREATE INDEX "trading_bot_trials_walletAddress_idx" ON "trading_bot_trials"("walletAddress");

-- 4. Subscription Plans Table
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "durationHours" INTEGER,
    "priceUsd" DECIMAL(10,2) NOT NULL,
    "priceLiora" DECIMAL(18,4) NOT NULL,
    "priceUsdt" DECIMAL(18,4) NOT NULL,
    "billingPeriodLabel" TEXT NOT NULL,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[] NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- 5. Trading Bot Subscriptions Table
CREATE TABLE "trading_bot_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'NO_SUBSCRIPTION',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "paymentRef" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trading_bot_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trading_bot_subscriptions_userId_idx" ON "trading_bot_subscriptions"("userId");
CREATE INDEX "trading_bot_subscriptions_status_idx" ON "trading_bot_subscriptions"("status");

-- 6. Payment Transactions Table (Unique txHash idempotency)
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "payingWallet" TEXT NOT NULL,
    "treasuryAddress" TEXT NOT NULL,
    "amount" DECIMAL(28,18) NOT NULL,
    "tokenSymbol" "PaymentToken" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "blockNumber" BIGINT,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "associatedSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_transactions_txHash_key" ON "payment_transactions"("txHash");
CREATE INDEX "payment_transactions_txHash_idx" ON "payment_transactions"("txHash");
CREATE INDEX "payment_transactions_payingWallet_idx" ON "payment_transactions"("payingWallet");

-- 7. Trading Bot Sessions Table
CREATE TABLE "trading_bot_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionIdentifier" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,

    CONSTRAINT "trading_bot_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "trading_bot_sessions_sessionIdentifier_key" ON "trading_bot_sessions"("sessionIdentifier");
CREATE INDEX "trading_bot_sessions_userId_idx" ON "trading_bot_sessions"("userId");
CREATE INDEX "trading_bot_sessions_sessionIdentifier_idx" ON "trading_bot_sessions"("sessionIdentifier");

-- 8. Audit Logs Table
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- Foreign Keys
ALTER TABLE "verified_wallets" ADD CONSTRAINT "verified_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trading_bot_trials" ADD CONSTRAINT "trading_bot_trials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trading_bot_subscriptions" ADD CONSTRAINT "trading_bot_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trading_bot_subscriptions" ADD CONSTRAINT "trading_bot_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payingWallet_fkey" FOREIGN KEY ("payingWallet") REFERENCES "verified_wallets"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_associatedSubscriptionId_fkey" FOREIGN KEY ("associatedSubscriptionId") REFERENCES "trading_bot_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trading_bot_sessions" ADD CONSTRAINT "trading_bot_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

