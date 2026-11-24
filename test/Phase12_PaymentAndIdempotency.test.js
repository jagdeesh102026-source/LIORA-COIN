const { expect } = require("chai");
const { 
  ExchangePolicy, 
  WebhookVerifier, 
  IdempotentFulfillmentManager 
} = require("./helpers/commerceHelpers");

describe("Phase 12 — Payment Validation, Webhook Authentication & Idempotency", function () {
  
  describe("1. Canonical ₹1,00,000 INR Minimum Purchase Enforcement", function () {
    const CANONICAL_MIN = 100000;

    it("Should accurately enforce the canonical ₹1,00,000 INR minimum requirement", function () {
      const quote = ExchangePolicy.createQuote("INR", 1.0);
      expect(quote.minOrderInCurrency).to.equal(CANONICAL_MIN);
      expect(quote.canonicalMinOrderInr).to.equal(CANONICAL_MIN);
    });

    it("Should approve orders meeting exactly ₹1,00,000", function () {
      const quote = ExchangePolicy.createQuote("INR", 1.0);
      const res = ExchangePolicy.validate(100000, quote);
      expect(res.isValid).to.be.true;
      expect(res.inrEquivalent).to.equal(100000);
    });

    it("Should approve orders exceeding the minimum requirement (e.g., ₹2,50,000)", function () {
      const quote = ExchangePolicy.createQuote("INR", 1.0);
      const res = ExchangePolicy.validate(250000, quote);
      expect(res.isValid).to.be.true;
      expect(res.inrEquivalent).to.equal(250000);
    });

    it("Should reject orders below the minimum threshold (e.g. ₹99,999.99 and ₹1,000)", function () {
      const quote = ExchangePolicy.createQuote("INR", 1.0);

      // ₹99,999.99 test
      const resJustBelow = ExchangePolicy.validate(99999.99, quote);
      expect(resJustBelow.isValid).to.be.false;
      expect(resJustBelow.reason).to.equal("BELOW_MINIMUM");

      // Arbitrary low amount test
      const resLow = ExchangePolicy.validate(1000, quote);
      expect(resLow.isValid).to.be.false;
      expect(resLow.reason).to.equal("BELOW_MINIMUM");
    });

    it("Should reject invalid, zero, or negative purchase amounts", function () {
      const quote = ExchangePolicy.createQuote("INR", 1.0);

      const zero = ExchangePolicy.validate(0, quote);
      expect(zero.isValid).to.be.false;
      expect(zero.reason).to.equal("INVALID_AMOUNT");

      const negative = ExchangePolicy.validate(-50000, quote);
      expect(negative.isValid).to.be.false;
      expect(negative.reason).to.equal("INVALID_AMOUNT");
    });
  });

  describe("2. Multi-Currency Ceiling Minimum & Safe Monetary Conversion", function () {
    it("Should correctly derive USD ceiling minimum guaranteeing ₹1,00,000 (at 84.50 rate)", function () {
      const RATE_USD = 84.50;
      const quote = ExchangePolicy.createQuote("USD", RATE_USD);
      // ceil(100,000 / 84.50 * 100) / 100 = 1183.44 USD
      expect(quote.minOrderInCurrency).to.equal(1183.44);

      // 1183.43 * 84.50 = 99,999.835 (< 100,000) -> Must reject
      const belowMin = ExchangePolicy.validate(1183.43, quote);
      expect(belowMin.isValid).to.be.false;
      expect(belowMin.reason).to.equal("BELOW_MINIMUM");

      // 1183.44 * 84.50 = 100,000.68 (>= 100,000) -> Must accept
      const exactMin = ExchangePolicy.validate(1183.44, quote);
      expect(exactMin.isValid).to.be.true;
      expect(exactMin.inrEquivalent).to.be.at.least(100000);
    });

    it("Should correctly derive EUR ceiling minimum guaranteeing ₹1,00,000 (at 91.80 rate)", function () {
      const RATE_EUR = 91.80;
      const quote = ExchangePolicy.createQuote("EUR", RATE_EUR);
      // ceil(100,000 / 91.80 * 100) / 100 = 1089.33 EUR
      expect(quote.minOrderInCurrency).to.equal(1089.33);

      const belowMin = ExchangePolicy.validate(1089.32, quote);
      expect(belowMin.isValid).to.be.false;
      expect(belowMin.reason).to.equal("BELOW_MINIMUM");

      const exactMin = ExchangePolicy.validate(1089.33, quote);
      expect(exactMin.isValid).to.be.true;
      expect(exactMin.inrEquivalent).to.be.at.least(100000);
    });

    it("Should correctly derive GBP ceiling minimum guaranteeing ₹1,00,000 (at 107.20 rate)", function () {
      const RATE_GBP = 107.20;
      const quote = ExchangePolicy.createQuote("GBP", RATE_GBP);
      // ceil(100,000 / 107.20 * 100) / 100 = 932.84 GBP
      expect(quote.minOrderInCurrency).to.equal(932.84);

      const belowMin = ExchangePolicy.validate(932.83, quote);
      expect(belowMin.isValid).to.be.false;
      expect(belowMin.reason).to.equal("BELOW_MINIMUM");

      const exactMin = ExchangePolicy.validate(932.84, quote);
      expect(exactMin.isValid).to.be.true;
      expect(exactMin.inrEquivalent).to.be.at.least(100000);
    });

    it("Should reject unsupported or unconfigured currency quotes", function () {
      expect(() => {
        ExchangePolicy.createQuote("JPY", 0.55);
      }).to.throw("Unsupported currency: JPY");
    });
  });

  describe("3. Quote Expiration & Stale Oracle Rate Defenses", function () {
    const RATE = 84.50;

    it("Should expire quotes past their 15-minute TTL", function () {
      const now = Date.now();
      const quote = ExchangePolicy.createQuote("USD", RATE, now);

      // 10 minutes elapsed: valid
      const tenMins = ExchangePolicy.validate(2000, quote, now + 10 * 60 * 1000);
      expect(tenMins.isValid).to.be.true;

      // 16 minutes elapsed: expired
      const sixteenMins = ExchangePolicy.validate(2000, quote, now + 16 * 60 * 1000);
      expect(sixteenMins.isValid).to.be.false;
      expect(sixteenMins.reason).to.equal("QUOTE_EXPIRED");
    });

    it("Should reject quotes with oracle data older than 60 minutes (stale defense)", function () {
      const now = Date.now();
      const quote = ExchangePolicy.createQuote("USD", RATE, now);

      const sixtyOneMins = ExchangePolicy.validate(2000, quote, now + 61 * 60 * 1000);
      expect(sixtyOneMins.isValid).to.be.false;
    });

    it("Should reject explicitly marked stale quotes", function () {
      const quote = ExchangePolicy.createQuote("USD", RATE);
      quote.isStale = true;

      const res = ExchangePolicy.validate(2000, quote);
      expect(res.isValid).to.be.false;
      expect(res.reason).to.equal("STALE_ORACLE_RATE");
    });
  });

  describe("4. Webhook Signature Authentication", function () {
    const SECRET = "oxeniq_test_webhook_secret_key_123456";
    const PAYLOAD = JSON.stringify({
      order_id: "order_oxeniq_001",
      payment_id: "pay_gw_987654321",
      amount: 100000,
      currency: "INR",
      status: "SUCCESS"
    });

    it("Should authenticate valid HMAC-SHA256 signatures", function () {
      const signature = WebhookVerifier.generateSignature(PAYLOAD, SECRET);
      const isValid = WebhookVerifier.verifySignature(PAYLOAD, signature, SECRET);
      expect(isValid).to.be.true;
    });

    it("Should reject tampered payloads or forged signatures", function () {
      const signature = WebhookVerifier.generateSignature(PAYLOAD, SECRET);
      const tamperedPayload = PAYLOAD.replace("100000", "200000");

      const isValid = WebhookVerifier.verifySignature(tamperedPayload, signature, SECRET);
      expect(isValid).to.be.false;
    });

    it("Should reject webhooks with incorrect secrets", function () {
      const signature = WebhookVerifier.generateSignature(PAYLOAD, SECRET);
      const isValid = WebhookVerifier.verifySignature(PAYLOAD, signature, "wrong_secret");
      expect(isValid).to.be.false;
    });
  });

  describe("5. Idempotent Order Processing & Duplicate Delivery Prevention", function () {
    let manager;

    beforeEach(function () {
      manager = new IdempotentFulfillmentManager();
      manager.recordOrder({
        orderId: "OX_ORD_1001",
        customer: "0x1234567890123456789012345678901234567890",
        amountInr: 100000,
        tokensToDeliver: "1000000000000000000000",
      });
    });

    it("Should fulfill token order on first verified payment notification", function () {
      const key = "GATEWAY:PAY_12345:OX_ORD_1001";
      let executionCount = 0;

      const result = manager.fulfillPayment(key, "OX_ORD_1001", (order) => {
        executionCount++;
        return { txHash: "0xabc123def456" };
      });

      expect(result.success).to.be.true;
      expect(result.duplicate).to.be.false;
      expect(result.txHash).to.equal("0xabc123def456");
      expect(executionCount).to.equal(1);
    });

    it("Should prevent duplicate token delivery when webhook is replayed", function () {
      const key = "GATEWAY:PAY_12345:OX_ORD_1001";
      let executionCount = 0;

      // First webhook
      const firstResult = manager.fulfillPayment(key, "OX_ORD_1001", () => {
        executionCount++;
        return { txHash: "0xabc123def456" };
      });
      expect(firstResult.success).to.be.true;
      expect(firstResult.duplicate).to.be.false;

      // Duplicate webhook replay
      const secondResult = manager.fulfillPayment(key, "OX_ORD_1001", () => {
        executionCount++;
        return { txHash: "0xSECOND_UNINTENDED_TX" };
      });

      // Crucial: second call is identified as duplicate, returning original txHash without re-executing
      expect(secondResult.success).to.be.true;
      expect(secondResult.duplicate).to.be.true;
      expect(secondResult.txHash).to.equal("0xabc123def456");
      expect(executionCount).to.equal(1);
    });

    it("Should cleanly handle and record failed fulfillments", function () {
      const key = "GATEWAY:PAY_FAILED:OX_ORD_1001";

      const result = manager.fulfillPayment(key, "OX_ORD_1001", () => {
        throw new Error("RPC provider timeout on BSC node");
      });

      expect(result.success).to.be.false;
      expect(result.duplicate).to.be.false;
      expect(result.error).to.equal("RPC provider timeout on BSC node");
    });
  });
});
