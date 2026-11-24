const crypto = require("crypto");

/**
 * CommonJS test helper mirroring the TypeScript commerce engine
 * for Hardhat tests.
 */
class AllocationCalculator {
  static calculateInterpretationA(buyerTokens) {
    if (buyerTokens < 0n) throw new Error("Negative tokens not allowed");
    if (buyerTokens === 0n) {
      return { buyerAllocation: 0n, reserveAllocation: 0n, totalDisbursed: 0n };
    }
    const reserveAllocation = (buyerTokens * 30n) / 100n;
    const totalDisbursed = buyerTokens + reserveAllocation;
    return {
      buyerAllocation: buyerTokens,
      reserveAllocation,
      totalDisbursed,
    };
  }

  static calculateInterpretationB(buyerTokens) {
    if (buyerTokens < 0n) throw new Error("Negative tokens not allowed");
    if (buyerTokens === 0n) {
      return { buyerAllocation: 0n, reserveAllocation: 0n, totalDisbursed: 0n };
    }
    // Ceil division: ceil(buyer * 100 / 70)
    const totalDisbursed = (buyerTokens * 100n + 69n) / 70n;
    const reserveAllocation = totalDisbursed - buyerTokens;
    return {
      buyerAllocation: buyerTokens,
      reserveAllocation,
      totalDisbursed,
    };
  }
}

class ExchangePolicy {
  static CANONICAL_MIN_INR = 100000;
  static DEFAULT_TTL_MS = 15 * 60 * 1000;
  static MAX_ORACLE_AGE_MS = 60 * 60 * 1000;
  static SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"];

  static calculateCeilingMinimum(rateToInr) {
    if (rateToInr <= 0) throw new Error("Invalid rate");
    return Math.ceil((this.CANONICAL_MIN_INR / rateToInr) * 100) / 100;
  }

  static createQuote(currency = "INR", rateToInr = 1.0, currentTime = Date.now()) {
    if (rateToInr <= 0) throw new Error("Invalid rate");
    if (!this.SUPPORTED_CURRENCIES.includes(currency)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    const minOrderInCurrency = currency === "INR" 
      ? this.CANONICAL_MIN_INR 
      : this.calculateCeilingMinimum(rateToInr);

    return {
      quoteId: `quote_${currency}_${currentTime}`,
      currency,
      rateToInr,
      fetchedAt: currentTime,
      expiresAt: currentTime + this.DEFAULT_TTL_MS,
      canonicalMinOrderInr: this.CANONICAL_MIN_INR,
      minOrderInCurrency,
      isStale: false,
    };
  }

  static validate(amount, quote, currentTime = Date.now()) {
    if (amount <= 0) return { isValid: false, reason: "INVALID_AMOUNT" };
    if (!this.SUPPORTED_CURRENCIES.includes(quote.currency)) {
      return { isValid: false, reason: "UNSUPPORTED_CURRENCY" };
    }
    if (currentTime > quote.expiresAt) return { isValid: false, reason: "QUOTE_EXPIRED" };
    if (currentTime - quote.fetchedAt > this.MAX_ORACLE_AGE_MS || quote.isStale) {
      return { isValid: false, reason: "STALE_ORACLE_RATE" };
    }

    const inrEquivalent = amount * quote.rateToInr;
    if (amount < quote.minOrderInCurrency || inrEquivalent < (this.CANONICAL_MIN_INR - 0.001)) {
      return { isValid: false, reason: "BELOW_MINIMUM", inrEquivalent };
    }
    return { isValid: true, inrEquivalent };
  }
}

class WebhookVerifier {
  static generateSignature(payload, secret) {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  static verifySignature(payload, signature, secret) {
    if (!payload || !signature || !secret) return false;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuf = Buffer.from(signature, "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }
}

class IdempotentFulfillmentManager {
  constructor() {
    this.processedKeys = new Set();
    this.orders = new Map();
  }

  recordOrder(order) {
    this.orders.set(order.orderId, { ...order, state: "CREATED" });
  }

  fulfillPayment(key, orderId, fulfillmentFn) {
    if (this.processedKeys.has(key)) {
      const existing = this.orders.get(orderId);
      return { success: true, duplicate: true, txHash: existing ? existing.txHash : null };
    }

    const order = this.orders.get(orderId);
    if (!order) return { success: false, duplicate: false, error: "NOT_FOUND" };

    try {
      const result = fulfillmentFn(order);
      order.state = "FULFILLED";
      order.txHash = result.txHash;
      this.processedKeys.add(key);
      return { success: true, duplicate: false, txHash: result.txHash };
    } catch (err) {
      order.state = "FAILED";
      return { success: false, duplicate: false, error: err.message };
    }
  }
}

module.exports = {
  AllocationCalculator,
  ExchangePolicy,
  WebhookVerifier,
  IdempotentFulfillmentManager,
};
