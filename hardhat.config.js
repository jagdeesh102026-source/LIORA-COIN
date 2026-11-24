const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

// Testnet deployer accounts strictly bound to BSC Testnet (Chain ID 97)
const testnetDeployerAccounts =
  process.env.DEPLOYER_PRIVATE_KEY && process.env.DEPLOYER_PRIVATE_KEY.trim().length > 0
    ? [process.env.DEPLOYER_PRIVATE_KEY.trim()]
    : [];

// Mainnet accounts: strictly isolated from testnet deployer key (SEC-07 remediation).
// Never uses DEPLOYER_PRIVATE_KEY. Defaults to empty array [] to block accidental CLI signing.
// Production genesis requires explicit opt-in via ENABLE_MAINNET_DEPLOYMENT=true and dedicated MAINNET_DEPLOYER_PRIVATE_KEY.
const mainnetAccounts =
  process.env.ENABLE_MAINNET_DEPLOYMENT === "true" &&
  process.env.MAINNET_DEPLOYER_PRIVATE_KEY &&
  process.env.MAINNET_DEPLOYER_PRIVATE_KEY.trim().length > 0
    ? [process.env.MAINNET_DEPLOYER_PRIVATE_KEY.trim()]
    : [];

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
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
    },
  },
};
