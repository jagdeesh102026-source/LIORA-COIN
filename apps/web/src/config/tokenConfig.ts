import { TokenMetadata } from '../types';

export const TOKEN_CONFIG: TokenMetadata = {
  name: "OXENIQ",
  symbol: "OXENIQ",
  decimals: 18,
  tagline: "POWERING THE NEXT DIGITAL ERA",
  initialSupply: "Fixed at Genesis Deployment (Deflationary Burning Enabled)",
  targetChain: "BNB Smart Chain (BEP-20)",
  supportedChains: [
    {
      id: 56,
      name: "BNB Smart Chain Mainnet",
      isTestnet: false,
      contractAddress: null, // Official address to be announced at Genesis Launch
      explorerUrl: "https://bscscan.com",
      rpcUrl: "https://bsc-dataseed.binance.org/",
    },
    {
      id: 97,
      name: "BNB Smart Chain Testnet",
      isTestnet: true,
      contractAddress: null, // Deployed via BSC Testnet script
      explorerUrl: "https://testnet.bscscan.com",
      rpcUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    },
    {
      id: 31337,
      name: "Local Simulation Devnet",
      isTestnet: true,
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      explorerUrl: "http://localhost:8545",
      rpcUrl: "http://127.0.0.1:8545",
    },
  ],
  initialLiquidityBudget: "$1,000 USD",
  allocationRatio: "70:30 Ecosystem Allocation Protocol",
};
