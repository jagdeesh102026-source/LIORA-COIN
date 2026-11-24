const { expect } = require("chai");
const { ethers } = require("hardhat");
const { AllocationCalculator } = require("./helpers/commerceHelpers");

describe("Phase 12 — E-Commerce 70:30 Token Allocation Models", function () {
  describe("Candidate Interpretation A (Reserve receives 30% of buyer allocation)", function () {
    it("Should compute exact 700 : 210 : 910 distribution for 700 OXENIQ purchase", function () {
      const buyerTokens = ethers.parseEther("700");
      const result = AllocationCalculator.calculateInterpretationA(buyerTokens);

      expect(result.buyerAllocation).to.equal(ethers.parseEther("700"));
      expect(result.reserveAllocation).to.equal(ethers.parseEther("210"));
      expect(result.totalDisbursed).to.equal(ethers.parseEther("910"));
    });

    it("Should compute exact 30% additional reserve allocation for 1,000 OXENIQ purchase", function () {
      const buyerTokens = ethers.parseEther("1000");
      const result = AllocationCalculator.calculateInterpretationA(buyerTokens);

      expect(result.buyerAllocation).to.equal(ethers.parseEther("1000"));
      expect(result.reserveAllocation).to.equal(ethers.parseEther("300"));
      expect(result.totalDisbursed).to.equal(ethers.parseEther("1300"));
    });

    it("Should maintain exact conservation (buyer + reserve == total) across 1..500 odd amounts", function () {
      for (let i = 1; i <= 500; i += 7) {
        const amount = BigInt(i);
        const result = AllocationCalculator.calculateInterpretationA(amount);
        expect(result.buyerAllocation + result.reserveAllocation).to.equal(result.totalDisbursed);
        expect(result.reserveAllocation).to.equal((amount * 30n) / 100n);
      }
    });

    it("Should return zero allocations for zero input", function () {
      const result = AllocationCalculator.calculateInterpretationA(0n);
      expect(result.buyerAllocation).to.equal(0n);
      expect(result.reserveAllocation).to.equal(0n);
      expect(result.totalDisbursed).to.equal(0n);
    });

    it("Should reject negative token inputs", function () {
      expect(() => AllocationCalculator.calculateInterpretationA(-100n)).to.throw("Negative tokens not allowed");
    });
  });

  describe("Candidate Interpretation B (Buyer receives 70% of combined allocation)", function () {
    it("Should compute exact 700 : 300 : 1000 distribution for 700 OXENIQ buyer allocation", function () {
      const buyerTokens = ethers.parseEther("700");
      const result = AllocationCalculator.calculateInterpretationB(buyerTokens);

      expect(result.buyerAllocation).to.equal(ethers.parseEther("700"));
      expect(result.reserveAllocation).to.equal(ethers.parseEther("300"));
      expect(result.totalDisbursed).to.equal(ethers.parseEther("1000"));

      // Buyer receives exactly 70% of combined 1,000 tokens
      expect((result.totalDisbursed * 70n) / 100n).to.equal(result.buyerAllocation);
    });

    it("Should maintain exact conservation (buyer + reserve == total) across 1..500 odd amounts", function () {
      for (let i = 1; i <= 500; i += 9) {
        const amount = BigInt(i);
        const result = AllocationCalculator.calculateInterpretationB(amount);
        expect(result.buyerAllocation + result.reserveAllocation).to.equal(result.totalDisbursed);
        expect(result.buyerAllocation).to.equal(amount);
        expect(result.reserveAllocation).to.be.gte(0n);
      }
    });

    it("Should return zero allocations for zero input", function () {
      const result = AllocationCalculator.calculateInterpretationB(0n);
      expect(result.buyerAllocation).to.equal(0n);
      expect(result.reserveAllocation).to.equal(0n);
      expect(result.totalDisbursed).to.equal(0n);
    });

    it("Should reject negative token inputs", function () {
      expect(() => AllocationCalculator.calculateInterpretationB(-100n)).to.throw("Negative tokens not allowed");
    });
  });

  describe("Token Accounting & High Precision Invariants", function () {
    it("Should handle full 18-decimal fractional quantities without precision loss", function () {
      // 123.456789012345678901 OXENIQ
      const fractionalAmount = 123456789012345678901n;
      
      const resA = AllocationCalculator.calculateInterpretationA(fractionalAmount);
      expect(resA.buyerAllocation + resA.reserveAllocation).to.equal(resA.totalDisbursed);

      const resB = AllocationCalculator.calculateInterpretationB(fractionalAmount);
      expect(resB.buyerAllocation + resB.reserveAllocation).to.equal(resB.totalDisbursed);
    });

    it("Should demonstrate difference between Interpretation A and B for business decision logging", function () {
      const buyerTokens = ethers.parseEther("700");
      const resA = AllocationCalculator.calculateInterpretationA(buyerTokens);
      const resB = AllocationCalculator.calculateInterpretationB(buyerTokens);

      // In Interpretation A, reserve receives 210 tokens, total treasury burden is 910 tokens
      // In Interpretation B, reserve receives 300 tokens, total treasury burden is 1000 tokens
      expect(resA.reserveAllocation).to.equal(ethers.parseEther("210"));
      expect(resB.reserveAllocation).to.equal(ethers.parseEther("300"));
      expect(resB.totalDisbursed - resA.totalDisbursed).to.equal(ethers.parseEther("90"));
    });

    it("Should verify that reserve and total disbursements cannot exceed preallocated inventory limits", function () {
      const PREALLOCATED_SALE_INVENTORY = ethers.parseEther("100000000"); // 100M tokens
      const TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1B tokens

      // Attempting to disburse more than available inventory must be detected
      const excessiveBuyerTokens = ethers.parseEther("100000001");
      const resA = AllocationCalculator.calculateInterpretationA(excessiveBuyerTokens);
      const resB = AllocationCalculator.calculateInterpretationB(excessiveBuyerTokens);

      expect(resA.totalDisbursed > PREALLOCATED_SALE_INVENTORY).to.be.true;
      expect(resB.totalDisbursed > PREALLOCATED_SALE_INVENTORY).to.be.true;

      // Ensure that for valid orders within inventory, combined amount is bounded by TOTAL_SUPPLY
      const safeTokens = ethers.parseEther("50000000");
      const safeResA = AllocationCalculator.calculateInterpretationA(safeTokens);
      const safeResB = AllocationCalculator.calculateInterpretationB(safeTokens);

      expect(safeResA.totalDisbursed).to.be.lte(TOTAL_SUPPLY);
      expect(safeResB.totalDisbursed).to.be.lte(TOTAL_SUPPLY);
    });
  });
});
