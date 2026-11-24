import { parseEventLogs, type Log, type Hex } from 'viem';
import { testnetSaleAbi } from './testnetSaleAbi';

export interface PurchaseReceiptLike {
  status: 'success' | 'reverted' | string;
  logs?: readonly (Log | { address: string; topics: Hex[] | string[]; data: Hex | string })[] | any[];
}

export interface PurchaseReceiptValidationParams {
  receipt: PurchaseReceiptLike;
  expectedSaleAddress: string;
  expectedBuyer: string;
  expectedRecipient: string;
  expectedBnbPaidWei: bigint;
  expectedTokensDeliveredWei: bigint;
}

export interface PurchaseEventData {
  buyer: string;
  recipient: string;
  bnbPaid: bigint;
  tokensDelivered: bigint;
  contractAddress: string;
}

export interface PurchaseValidationResult {
  isValid: boolean;
  error?: string;
  event?: PurchaseEventData;
}

/**
 * Validates that a transaction receipt contains exactly one valid TokensPurchased event
 * matching the expected contract, buyer, recipient, BNB amount, and delivered token amount.
 */
export function validatePurchaseReceiptEvents({
  receipt,
  expectedSaleAddress,
  expectedBuyer,
  expectedRecipient,
  expectedBnbPaidWei,
  expectedTokensDeliveredWei,
}: PurchaseReceiptValidationParams): PurchaseValidationResult {
  if (!receipt || typeof receipt !== 'object') {
    return {
      isValid: false,
      error: 'Transaction receipt is missing or malformed.',
    };
  }

  // 1. Transaction status check
  if (receipt.status !== 'success') {
    return {
      isValid: false,
      error: `Reverted transaction: Transaction failed on-chain with status "${receipt.status}". No tokens were delivered.`,
    };
  }

  // 2. Receipt logs presence check
  if (!receipt.logs || !Array.isArray(receipt.logs) || receipt.logs.length === 0) {
    return {
      isValid: false,
      error: 'Missing purchase event: Transaction receipt contains no logs. No TokensPurchased event was emitted.',
    };
  }

  // 3. Decode TokensPurchased event logs using ABI
  let allPurchaseEvents: any[] = [];
  try {
    allPurchaseEvents = parseEventLogs({
      abi: testnetSaleAbi,
      logs: receipt.logs as any,
      eventName: 'TokensPurchased',
    });
  } catch (err: any) {
    return {
      isValid: false,
      error: `Successful receipt with invalid event data: Failed to decode event logs (${err?.message || 'invalid log data'}).`,
    };
  }

  // 4. Missing purchase event check
  if (allPurchaseEvents.length === 0) {
    return {
      isValid: false,
      error: 'Missing purchase event: No TokensPurchased event was found in the confirmed transaction receipt.',
    };
  }

  // 5. Verify contract origin
  const saleContractEvents = allPurchaseEvents.filter(
    (e) => e.address && e.address.toLowerCase() === expectedSaleAddress.toLowerCase()
  );

  if (saleContractEvents.length === 0) {
    return {
      isValid: false,
      error: `Incorrect sale contract address: Purchase event originated from ${allPurchaseEvents[0].address}, expected configured sale contract ${expectedSaleAddress}.`,
    };
  }

  // 6. Exactly one matching purchase event check (Duplicate matching purchase events check)
  if (saleContractEvents.length > 1 || allPurchaseEvents.length > 1) {
    return {
      isValid: false,
      error: `Duplicate matching purchase events: Expected exactly 1 purchase event, but found ${saleContractEvents.length} from sale contract (${allPurchaseEvents.length} total).`,
    };
  }

  const targetEvent = saleContractEvents[0];
  const args = targetEvent.args;

  // 7. Event arguments validity check
  if (!args || typeof args !== 'object') {
    return {
      isValid: false,
      error: 'Successful receipt with invalid event data: Event arguments are missing.',
    };
  }

  const { buyer, recipient, bnbPaid, tokensDelivered } = args;

  if (
    buyer === undefined ||
    recipient === undefined ||
    bnbPaid === undefined ||
    tokensDelivered === undefined
  ) {
    return {
      isValid: false,
      error: 'Successful receipt with invalid event data: Event arguments are incomplete.',
    };
  }

  // 8. Buyer verification
  if (typeof buyer !== 'string' || buyer.toLowerCase() !== expectedBuyer.toLowerCase()) {
    return {
      isValid: false,
      error: `Incorrect buyer: Expected buyer ${expectedBuyer.toLowerCase()}, but event recorded ${typeof buyer === 'string' ? buyer.toLowerCase() : 'invalid'}.`,
    };
  }

  // 9. Recipient verification
  if (typeof recipient !== 'string' || recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
    return {
      isValid: false,
      error: `Incorrect recipient: Expected recipient ${expectedRecipient.toLowerCase()}, but event recorded ${typeof recipient === 'string' ? recipient.toLowerCase() : 'invalid'}.`,
    };
  }

  // 10. BNB paid amount verification (integer-safe BigInt)
  let bnbPaidBigInt: bigint;
  try {
    bnbPaidBigInt = typeof bnbPaid === 'bigint' ? bnbPaid : BigInt(bnbPaid);
  } catch {
    return {
      isValid: false,
      error: 'Successful receipt with invalid event data: bnbPaid cannot be converted to BigInt.',
    };
  }

  if (bnbPaidBigInt !== expectedBnbPaidWei) {
    return {
      isValid: false,
      error: `Incorrect BNB amount: Expected payment of ${expectedBnbPaidWei.toString()} wei tBNB, but event recorded ${bnbPaidBigInt.toString()} wei.`,
    };
  }

  // 11. Tokens delivered amount verification (integer-safe BigInt)
  let tokensDeliveredBigInt: bigint;
  try {
    tokensDeliveredBigInt = typeof tokensDelivered === 'bigint' ? tokensDelivered : BigInt(tokensDelivered);
  } catch {
    return {
      isValid: false,
      error: 'Successful receipt with invalid event data: tokensDelivered cannot be converted to BigInt.',
    };
  }

  if (tokensDeliveredBigInt !== expectedTokensDeliveredWei) {
    return {
      isValid: false,
      error: `Incorrect token delivery amount: Expected ${expectedTokensDeliveredWei.toString()} tokens delivered, but event recorded ${tokensDeliveredBigInt.toString()} tokens.`,
    };
  }

  // All checks passed!
  return {
    isValid: true,
    event: {
      buyer,
      recipient,
      bnbPaid: bnbPaidBigInt,
      tokensDelivered: tokensDeliveredBigInt,
      contractAddress: targetEvent.address,
    },
  };
}

