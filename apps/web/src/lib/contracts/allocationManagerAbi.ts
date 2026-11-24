/**
 * Minimal ABI for AllocationManager read-only on-chain queries.
 * Strictly view/pure calls only - no state changes or signature requests.
 */
export const ALLOCATION_MANAGER_ABI = [
  {
    type: 'function',
    name: 'token',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address', name: '' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address', name: '' }],
  },
  {
    type: 'function',
    name: 'recipient70',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address', name: '' }],
  },
  {
    type: 'function',
    name: 'recipient30',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address', name: '' }],
  },
] as const;
