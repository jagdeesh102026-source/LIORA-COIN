const path = require("path");
const fs = require("fs");
const dns = require("dns");
const { ethers } = require("ethers");
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  const originalLookup = dns.lookup;
  const resolver = new dns.promises.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);
  dns.lookup = function (hostname, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    originalLookup(hostname, options, (err, address, family) => {
      if (!err && address) return callback(null, address, family);
      resolver.resolve4(hostname).then(
        (addrs) => (addrs && addrs.length > 0 ? callback(null, addrs[0], 4) : callback(err)),
        () => callback(err)
      );
    });
  };
} catch (e) {}
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

// Configure resilient network timeout (60s) for verification API
try {
  const { Agent } = require("undici");
  const { setMockDispatcher } = require("@nomicfoundation/hardhat-verify/internal/undici");
  setMockDispatcher(new Agent({ connect: { timeout: 60000 }, headersTimeout: 60000 }));
} catch (e) {}

// Testnet deployer accounts strictly bound to BSC Testnet (Chain ID 97)
const testnetDeployerAccounts =
  process.env.DEPLOYER_PRIVATE_KEY && process.env.DEPLOYER_PRIVATE_KEY.trim().length > 0
    ? [process.env.DEPLOYER_PRIVATE_KEY.trim()]
    : [];

// Mainnet accounts: strictly isolated from testnet deployer key (SEC-07 remediation).
// Never uses DEPLOYER_PRIVATE_KEY. Defaults to empty array [] to block accidental CLI signing.
// Production genesis requires explicit opt-in via ENABLE_MAINNET_DEPLOYMENT=true and dedicated MAINNET_DEPLOYER_PRIVATE_KEY
// or an encrypted keystore file (MAINNET_DEPLOYER_KEYSTORE_PATH + MAINNET_DEPLOYER_KEYSTORE_PASSWORD).
let mainnetAccounts = [];
if (process.env.ENABLE_MAINNET_DEPLOYMENT === "true") {
  if (process.env.MAINNET_DEPLOYER_PRIVATE_KEY && process.env.MAINNET_DEPLOYER_PRIVATE_KEY.trim().length > 0) {
    mainnetAccounts = [process.env.MAINNET_DEPLOYER_PRIVATE_KEY.trim()];
  } else if (
    process.env.MAINNET_DEPLOYER_KEYSTORE_PATH &&
    fs.existsSync(path.resolve(__dirname, process.env.MAINNET_DEPLOYER_KEYSTORE_PATH))
  ) {
    const keystoreContent = fs.readFileSync(path.resolve(__dirname, process.env.MAINNET_DEPLOYER_KEYSTORE_PATH), "utf8");
    const password = process.env.MAINNET_DEPLOYER_KEYSTORE_PASSWORD || "";
    try {
      const wallet = ethers.Wallet.fromEncryptedJsonSync(keystoreContent, password);
      mainnetAccounts = [wallet.privateKey];
    } catch (err) {
      console.error("Failed to decrypt mainnet keystore:", err.message);
    }
  }
}

// Etherscan / BscScan API Key Configuration
// Supports unified Etherscan V2 API key (ETHERSCAN_API_KEY) and legacy BscScan API key (BSCSCAN_API_KEY)
const verificationApiKey =
  (process.env.ETHERSCAN_API_KEY && process.env.ETHERSCAN_API_KEY.trim()) ||
  (process.env.BSCSCAN_API_KEY && process.env.BSCSCAN_API_KEY.trim()) ||
  "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    bscTestnet: {
      url: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      accounts: testnetDeployerAccounts,
    },
    bscMainnet: {
      url: process.env.NEXT_PUBLIC_BSC_MAINNET_RPC || "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: mainnetAccounts,
    },
  },
  etherscan: {
    apiKey: verificationApiKey,
  },
};
