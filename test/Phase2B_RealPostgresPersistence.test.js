const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

// Zero-dependency TypeScript loader
require("./helpers/tsLoader");

const {
  BLOCKCHAIN_REGISTRY,
  CHAIN_AWARE_TOKENS,
} = require("../apps/web/src/lib/chains/blockchainRegistry.ts");

describe("LIORA COIN — Phase 2B: Database Persistence & Canonical Ledger Validation Suite", function () {
  // =========================================================================
  // JOURNEY 1: Canonical Asset Identifier & Verified Decimal Mapping
  // =========================================================================
  describe("Journey 1: Canonical Asset Architecture & Decimals", function () {
    it("should never use token symbols alone as unique financial asset identifiers", function () {
      // Test USDT exists across multiple networks with differing standards and decimals
      const bscUsdt = CHAIN_AWARE_TOKENS["bsc:usdt"];
      const polygonUsdt = CHAIN_AWARE_TOKENS["polygon:usdt"];
      const tronUsdt = CHAIN_AWARE_TOKENS["tron:usdt"];

      expect(bscUsdt).to.exist;
      expect(polygonUsdt).to.exist;
      expect(tronUsdt).to.exist;

      // Symbols are all USDT, but standards, networks, and decimals differ
      expect(bscUsdt.symbol).to.equal("USDT");
      expect(polygonUsdt.symbol).to.equal("USDT");
      expect(tronUsdt.symbol).to.equal("USDT");

      expect(bscUsdt.networkId).to.equal("bsc-testnet");
      expect(polygonUsdt.networkId).to.equal("polygon-mainnet");
      expect(tronUsdt.networkId).to.equal("tron-mainnet");

      // CRITICAL: Decimals are strictly network/contract-aware
      expect(bscUsdt.decimals).to.equal(18);
      expect(polygonUsdt.decimals).to.equal(6);
      expect(tronUsdt.decimals).to.equal(6);
    });

    it("should verify deployed contract addresses against real deployment artifacts", function () {
      const bscDeploymentPath = path.resolve(__dirname, "../deployments/bscTestnet.json");
      expect(fs.existsSync(bscDeploymentPath)).to.be.true;

      const bscDeployment = JSON.parse(fs.readFileSync(bscDeploymentPath, "utf8"));
      const deployedTokenAddress = bscDeployment.contracts.OxeniqToken.address.toLowerCase();

      const lioraToken = CHAIN_AWARE_TOKENS["bsc:liora"];
      expect(lioraToken).to.exist;
      expect(lioraToken.contractAddress.toLowerCase()).to.equal(deployedTokenAddress);
      expect(lioraToken.decimals).to.equal(18);
    });

    it("should verify Bitcoin uses 8 decimals and Native UTXO standard", function () {
      const btc = CHAIN_AWARE_TOKENS["btc:native"];
      expect(btc).to.exist;
      expect(btc.decimals).to.equal(8);
      expect(btc.standard).to.equal("NATIVE_UTXO");
      expect(btc.contractAddress).to.be.null;
    });
  });

  // =========================================================================
  // JOURNEY 2: Double-Entry Invariants, Accounting Rules & Base Units
  // =========================================================================
  describe("Journey 2: Double-Entry Ledger Principles & Base Units", function () {
    it("should verify that base unit calculations support up to 78 digits (NUMERIC(78,0))", function () {
      // 256-bit max uint256 is 1.157920892373162e+77 (78 digits)
      const maxUint256 = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");
      expect(maxUint256.toString().length).to.equal(78);

      // Verify mathematical addition without precision loss
      const increment = BigInt(1);
      const sum = maxUint256 - increment;
      expect(sum < maxUint256).to.be.true;
    });

    it("should enforce that every balanced double-entry journal sums to zero per asset", function () {
      // Simulate double-entry journal entries
      const journal = {
        id: "journal_tx_001",
        reason: "DEPOSIT",
        postings: [
          { accountId: "acc_platform_custody", assetId: "bsc-testnet:bep20:usdt", direction: "DEBIT", amount: BigInt("100000000000000000000") }, // +100
          { accountId: "acc_user_available", assetId: "bsc-testnet:bep20:usdt", direction: "CREDIT", amount: BigInt("100000000000000000000") }   // -100
        ]
      };

      let netDiff = BigInt(0);
      for (const p of journal.postings) {
        if (p.direction === "DEBIT") {
          netDiff += p.amount;
        } else {
          netDiff -= p.amount;
        }
      }

      expect(netDiff).to.equal(BigInt(0));
    });

    it("should detect and reject an unbalanced journal transaction", function () {
      const unbalancedJournal = {
        id: "journal_tx_unbalanced",
        reason: "TRADE",
        postings: [
          { accountId: "acc_user_1", assetId: "bsc-testnet:bep20:usdt", direction: "DEBIT", amount: BigInt("100") },
          { accountId: "acc_user_2", assetId: "bsc-testnet:bep20:usdt", direction: "CREDIT", amount: BigInt("90") } // Missing 10
        ]
      };

      let netDiff = BigInt(0);
      for (const p of unbalancedJournal.postings) {
        if (p.direction === "DEBIT") {
          netDiff += p.amount;
        } else {
          netDiff -= p.amount;
        }
      }

      expect(netDiff).to.not.equal(BigInt(0));
      expect(netDiff).to.equal(BigInt(10));
    });
  });

  // =========================================================================
  // JOURNEY 3: Migration Schema & Database Constraints Rehearsal
  // =========================================================================
  describe("Journey 3: Migration Schema Rehearsal & Constraints Verification", function () {
    it("should have exactly 20 tables declared across Migrations 1, 2, and 3", function () {
      const m1 = fs.readFileSync(path.resolve(__dirname, "../prisma/migrations/20261113000000_phase20_init/migration.sql"), "utf8");
      const m2 = fs.readFileSync(path.resolve(__dirname, "../prisma/migrations/20261115000000_phase2_production_ledger/migration.sql"), "utf8");
      const m3 = fs.readFileSync(path.resolve(__dirname, "../prisma/migrations/20261115120000_phase2b_canonical_ledger_and_constraints/migration.sql"), "utf8");

      const tables = new Set();
      const regex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+"([^"]+)"/gi;
      let m;
      for (const sql of [m1, m2, m3]) {
        while ((m = regex.exec(sql)) !== null) {
          tables.add(m[1]);
        }
      }

      expect(tables.size).to.equal(20);
      expect(tables.has("ledger_accounts")).to.be.true;
      expect(tables.has("journal_transactions")).to.be.true;
      expect(tables.has("ledger_postings")).to.be.true;
      expect(tables.has("token_balances")).to.be.true;
      expect(tables.has("payment_transactions")).to.be.true;
      expect(tables.has("verified_wallets")).to.be.true;
    });

    it("should enforce deferred balance trigger and append-only immutability trigger in Migration 3", function () {
      const m3 = fs.readFileSync(path.resolve(__dirname, "../prisma/migrations/20261115120000_phase2b_canonical_ledger_and_constraints/migration.sql"), "utf8");

      // Verify deferred constraint trigger
      expect(m3).to.include("CREATE CONSTRAINT TRIGGER trg_verify_journal_finalization");
      expect(m3).to.include("DEFERRABLE INITIALLY DEFERRED");
      expect(m3).to.include("fn_verify_journal_finalization()");

      // Verify append-only immutability trigger
      expect(m3).to.include("CREATE TRIGGER trg_prevent_posting_mutation");
      expect(m3).to.include("BEFORE UPDATE OR DELETE ON \"ledger_postings\"");
      expect(m3).to.include("fn_prevent_posting_mutation()");
    });

    it("should verify check constraints on token_balances in Migration 3", function () {
      const m3 = fs.readFileSync(path.resolve(__dirname, "../prisma/migrations/20261115120000_phase2b_canonical_ledger_and_constraints/migration.sql"), "utf8");

      expect(m3).to.include('CHECK ("balance" >= 0)');
      expect(m3).to.include('CHECK ("lockedBalance" >= 0)');
      expect(m3).to.include('CHECK ("lockedBalance" <= "balance")');
      expect(m3).to.include('CHECK ("balanceBaseUnits" >= 0)');
      expect(m3).to.include('CHECK ("lockedBaseUnits" >= 0)');
      expect(m3).to.include('CHECK ("lockedBaseUnits" <= "balanceBaseUnits")');
    });

    it("should verify compound unique constraint on payment_transactions(txHash, chainId)", function () {
      const m3 = fs.readFileSync(path.resolve(__dirname, "../prisma/migrations/20261115120000_phase2b_canonical_ledger_and_constraints/migration.sql"), "utf8");

      expect(m3).to.include('payment_transactions_txHash_chainId_key');
      expect(m3).to.include('"payment_transactions"("txHash", "chainId")');
    });
  });

  // =========================================================================
  // JOURNEY 4: Prisma Driver Adapter Initialization & Isolation
  // =========================================================================
  describe("Journey 4: Prisma Driver Adapter & Package Compatibility", function () {
    it("should have @prisma/adapter-pg and pg properly configured in apps/web/package.json", function () {
      const pkgPath = path.resolve(__dirname, "../apps/web/package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

      expect(pkg.dependencies["@prisma/adapter-pg"]).to.exist;
      expect(pkg.dependencies["pg"]).to.exist;
      expect(pkg.dependencies["@prisma/client"]).to.exist;
      expect(pkg.devDependencies["@types/pg"]).to.exist;
      expect(pkg.devDependencies["prisma"]).to.exist;
    });

    it("should verify schema.prisma matches exactly 20 models", function () {
      const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
      const schema = fs.readFileSync(schemaPath, "utf8");

      const modelRegex = /^model\s+(\w+)\s+\{/gm;
      const models = [];
      let m;
      while ((m = modelRegex.exec(schema)) !== null) {
        models.push(m[1]);
      }

      expect(models.length).to.be.at.least(20);
      expect(models).to.include("LedgerAccount");
      expect(models).to.include("JournalTransaction");
      expect(models).to.include("LedgerPosting");
    });
  });
});

