/**
 * ABI definition for TestnetTokenSale contract on BNB Smart Chain Testnet.
 */
export const testnetSaleAbi = [
  {
    type: 'function',
    name: 'buyTokens',
    stateMutability: 'payable',
    inputs: [{ name: 'recipient', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'calculateTokenAmount',
    stateMutability: 'pure',
    inputs: [{ name: 'bnbAmountWei', type: 'uint256' }],
    outputs: [{ name: 'tokenAmount', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getAvailableInventory',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'TOKENS_PER_BNB',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'token',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'event',
    name: 'TokensPurchased',
    inputs: [
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'bnbPaid', type: 'uint256', indexed: false },
      { name: 'tokensDelivered', type: 'uint256', indexed: false },
    ],
  },
] as const;
