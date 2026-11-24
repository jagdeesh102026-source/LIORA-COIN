const { expect } = require("chai");
const path = require("path");
const fs = require("fs");

describe("Phase 8A — Hardhat Configuration & Mainnet Isolation Guards (SEC-07)", function () {
  const hardhatConfigPath = path.resolve(__dirname, "..", "hardhat.config.js");
  const hardhatConfigContent = fs.readFileSync(hardhatConfigPath, "utf8");

  it("1. should define isolated mainnet accounts that default to empty array", function () {
    // Reload config fresh
    delete require.cache[require.resolve("../hardhat.config.js")];
    const originalEnable = process.env.ENABLE_MAINNET_DEPLOYMENT;
    const originalMainnetKey = process.env.MAINNET_DEPLOYER_PRIVATE_KEY;

    try {
      delete process.env.ENABLE_MAINNET_DEPLOYMENT;
      delete process.env.MAINNET_DEPLOYER_PRIVATE_KEY;

      const config = require("../hardhat.config.js");
      expect(config.networks.bscMainnet).to.exist;
      expect(config.networks.bscMainnet.accounts).to.be.an("array");
      expect(config.networks.bscMainnet.accounts.length).to.equal(0);
    } finally {
      if (originalEnable !== undefined) process.env.ENABLE_MAINNET_DEPLOYMENT = originalEnable;
      if (originalMainnetKey !== undefined) process.env.MAINNET_DEPLOYER_PRIVATE_KEY = originalMainnetKey;
    }
  });

  it("2. should NEVER attach DEPLOYER_PRIVATE_KEY to bscMainnet accounts", function () {
    delete require.cache[require.resolve("../hardhat.config.js")];
    const originalDeployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    const originalEnable = process.env.ENABLE_MAINNET_DEPLOYMENT;
    const mockKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    try {
      process.env.DEPLOYER_PRIVATE_KEY = mockKey;
      delete process.env.ENABLE_MAINNET_DEPLOYMENT;
      delete process.env.MAINNET_DEPLOYER_PRIVATE_KEY;

      const config = require("../hardhat.config.js");
      // bscTestnet receives the testnet key
      expect(config.networks.bscTestnet.accounts).to.include(mockKey);
      // bscMainnet must strictly NOT receive the testnet key
      expect(config.networks.bscMainnet.accounts).to.not.include(mockKey);
      expect(config.networks.bscMainnet.accounts.length).to.equal(0);
    } finally {
      if (originalDeployerKey !== undefined) {
        process.env.DEPLOYER_PRIVATE_KEY = originalDeployerKey;
      } else {
        delete process.env.DEPLOYER_PRIVATE_KEY;
      }
      if (originalEnable !== undefined) process.env.ENABLE_MAINNET_DEPLOYMENT = originalEnable;
    }
  });

  it("3. should require BOTH ENABLE_MAINNET_DEPLOYMENT='true' AND MAINNET_DEPLOYER_PRIVATE_KEY for mainnet accounts", function () {
    delete require.cache[require.resolve("../hardhat.config.js")];
    const originalEnable = process.env.ENABLE_MAINNET_DEPLOYMENT;
    const originalMainnetKey = process.env.MAINNET_DEPLOYER_PRIVATE_KEY;
    const mockMainnetKey = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    try {
      // Case A: Key present but ENABLE flag false
      process.env.ENABLE_MAINNET_DEPLOYMENT = "false";
      process.env.MAINNET_DEPLOYER_PRIVATE_KEY = mockMainnetKey;
      let config = require("../hardhat.config.js");
      expect(config.networks.bscMainnet.accounts.length).to.equal(0);

      // Case B: Flag true but key missing
      delete require.cache[require.resolve("../hardhat.config.js")];
      process.env.ENABLE_MAINNET_DEPLOYMENT = "true";
      delete process.env.MAINNET_DEPLOYER_PRIVATE_KEY;
      config = require("../hardhat.config.js");
      expect(config.networks.bscMainnet.accounts.length).to.equal(0);

      // Case C: Both flag true and key present
      delete require.cache[require.resolve("../hardhat.config.js")];
      process.env.ENABLE_MAINNET_DEPLOYMENT = "true";
      process.env.MAINNET_DEPLOYER_PRIVATE_KEY = mockMainnetKey;
      config = require("../hardhat.config.js");
      expect(config.networks.bscMainnet.accounts.length).to.equal(1);
      expect(config.networks.bscMainnet.accounts[0]).to.equal(mockMainnetKey);
    } finally {
      if (originalEnable !== undefined) {
        process.env.ENABLE_MAINNET_DEPLOYMENT = originalEnable;
      } else {
        delete process.env.ENABLE_MAINNET_DEPLOYMENT;
      }
      if (originalMainnetKey !== undefined) {
        process.env.MAINNET_DEPLOYER_PRIVATE_KEY = originalMainnetKey;
      } else {
        delete process.env.MAINNET_DEPLOYER_PRIVATE_KEY;
      }
      delete require.cache[require.resolve("../hardhat.config.js")];
    }
  });

  it("4. should enforce exact chain IDs for bscTestnet (97) and bscMainnet (56)", function () {
    const config = require("../hardhat.config.js");
    expect(config.networks.bscTestnet.chainId).to.equal(97);
    expect(config.networks.bscMainnet.chainId).to.equal(56);
    expect(config.networks.hardhat.chainId).to.equal(31337);
  });

  it("5. should contain bytecode/code safety comments referencing SEC-07 remediation", function () {
    expect(hardhatConfigContent).to.include("SEC-07 remediation");
    expect(hardhatConfigContent).to.include("mainnetAccounts");
    expect(hardhatConfigContent).to.include("testnetDeployerAccounts");
  });

  it("6. should verify deployment scripts block chainId 56 execution", function () {
    const deployScriptPath = path.resolve(__dirname, "..", "scripts", "deploy.js");
    const deployScriptContent = fs.readFileSync(deployScriptPath, "utf8");
    expect(deployScriptContent).to.include("chainId === 56");
    expect(deployScriptContent).to.include("CRITICAL SAFETY ABORT: BSC Mainnet (Chain ID 56)");

    const saleDeployScriptPath = path.resolve(__dirname, "..", "scripts", "deploy-testnet-sale.js");
    const saleDeployScriptContent = fs.readFileSync(saleDeployScriptPath, "utf8");
    expect(saleDeployScriptContent).to.include("chainId === 56");
    expect(saleDeployScriptContent).to.include("CRITICAL SAFETY ABORT: BSC Mainnet (Chain ID 56)");
  });
});

