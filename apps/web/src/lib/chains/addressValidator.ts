/**
 * LIORA COIN — Checksum-Aware Multi-Chain Address Validation
 *
 * Implements strict, chain-specific address validation and normalization for:
 * 1. EVM (BSC, Polygon) — 20-byte hex, optional EIP-55 checksum, normalized to lowercase.
 * 2. TRON (TVM) — Base58Check, 34 chars, starts with 'T', 0x41 prefix, double SHA-256 checksum.
 *    CRITICAL: Case sensitivity is strictly preserved (never lowercased).
 * 3. Bitcoin (UTXO) — Base58Check (P2PKH '1', P2SH '3') and Bech32/Bech32m (Native SegWit 'bc1q', Taproot 'bc1p').
 */

import crypto from 'crypto';
import { BlockchainFamily, NetworkId, AddressValidationResult } from './types';

// ============================================================================
// BASE58 ENCODING & DECODING HELPERS
// ============================================================================
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP: Record<string, number> = {};
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP[BASE58_ALPHABET[i]] = i;
}

export function decodeBase58(str: string): Uint8Array | null {
  if (!str || str.length === 0) return null;

  let bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = BASE58_MAP[char];
    if (value === undefined) {
      return null; // Invalid Base58 character (e.g. '0', 'O', 'I', 'l')
    }

    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Count leading zeroes in the input string
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
}

/**
 * Validates Base58Check encoded data with 4-byte double SHA-256 checksum.
 */
export function validateBase58Check(str: string, expectedPrefixByte?: number): boolean {
  const decoded = decodeBase58(str);
  if (!decoded || decoded.length < 5) return false;

  const payload = decoded.slice(0, decoded.length - 4);
  const checksum = decoded.slice(decoded.length - 4);

  if (expectedPrefixByte !== undefined && payload[0] !== expectedPrefixByte) {
    return false;
  }

  // Double SHA-256 of payload
  const hash1 = crypto.createHash('sha256').update(payload).digest();
  const hash2 = crypto.createHash('sha256').update(hash1).digest();

  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== hash2[i]) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// BECH32 HELPERS (BITCOIN SEGWIT & TAPROOT)
// ============================================================================
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (let p = 0; p < values.length; ++p) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[p];
    for (let i = 0; i < 5; ++i) {
      if ((top >> i) & 1) {
        chk ^= GEN[i];
      }
    }
    chk = chk >>> 0;
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (let p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) & 31);
  }
  return ret;
}

export function validateBech32(str: string, expectedHrp: string): boolean {
  const lower = str.toLowerCase();
  const upper = str.toUpperCase();
  // Mixed case is strictly invalid in Bech32
  if (str !== lower && str !== upper) return false;

  const pos = lower.lastIndexOf('1');
  if (pos < 1 || pos + 7 > lower.length || lower.length > 90) return false;

  const hrp = lower.slice(0, pos);
  if (hrp !== expectedHrp) return false;

  const data: number[] = [];
  for (let p = pos + 1; p < lower.length; ++p) {
    const d = BECH32_CHARSET.indexOf(lower.charAt(p));
    if (d === -1) return false;
    data.push(d);
  }

  const combined = hrpExpand(hrp).concat(data);
  const mod = bech32Polymod(combined);
  // Bech32 checksum is 1, Bech32m checksum is 0x2bc830a3 (for Taproot)
  return mod === 1 || mod === 0x2bc830a3;
}

// ============================================================================
// CHAIN-SPECIFIC VALIDATORS
// ============================================================================

/**
 * Validates EVM addresses (BSC, Polygon).
 * Supports standard 40-hex format with '0x' prefix.
 */
export function validateEvmAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
}

/**
 * Validates TRON Base58Check addresses.
 * 
 * Rules:
 * - Exactly 34 characters
 * - Starts with 'T'
 * - Uses valid Base58 alphabet (no 0, O, I, l)
 * - Decodes to 25 bytes with prefix byte 0x41
 * - Double SHA-256 checksum must match
 * 
 * CRITICAL: TRON addresses must NEVER be lowercased.
 */
export function validateTronAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();

  // Must start with 'T' and be exactly 34 chars long
  if (!trimmed.startsWith('T') || trimmed.length !== 34) {
    return false;
  }

  // Verify Base58Check with 0x41 prefix (TRON Mainnet & Testnet address prefix)
  return validateBase58Check(trimmed, 0x41);
}

/**
 * Validates Bitcoin addresses (P2PKH, P2SH, Native SegWit Bech32, and Taproot).
 */
export function validateBitcoinAddress(address: string, isTestnet = false): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();

  if (isTestnet) {
    // Testnet Bech32 starts with 'tb1' (HRP is 'tb')
    if (trimmed.toLowerCase().startsWith('tb1')) {
      return validateBech32(trimmed, 'tb');
    }
    // Testnet P2PKH starts with 'm' or 'n' (prefix 0x6f = 111)
    if (trimmed.startsWith('m') || trimmed.startsWith('n')) {
      return validateBase58Check(trimmed, 0x6f);
    }
    // Testnet P2SH starts with '2' (prefix 0xc4 = 196)
    if (trimmed.startsWith('2')) {
      return validateBase58Check(trimmed, 0xc4);
    }
    return false;
  }

  // Mainnet Bech32 (SegWit v0 'bc1q' or Taproot v1 'bc1p' - HRP is 'bc')
  if (trimmed.toLowerCase().startsWith('bc1')) {
    return validateBech32(trimmed, 'bc');
  }

  // Mainnet Legacy P2PKH starts with '1' (prefix 0x00 = 0)
  if (trimmed.startsWith('1')) {
    return validateBase58Check(trimmed, 0x00);
  }

  // Mainnet Nested SegWit P2SH starts with '3' (prefix 0x05 = 5)
  if (trimmed.startsWith('3')) {
    return validateBase58Check(trimmed, 0x05);
  }

  return false;
}

// ============================================================================
// COMPOSITE MULTI-CHAIN VALIDATOR & NORMALIZER
// ============================================================================

/**
 * Validates an address against a specific NetworkId with family-aware checksum rules.
 */
export function validateAddressForNetwork(
  address: string,
  networkId: NetworkId
): AddressValidationResult {
  if (!address || typeof address !== 'string') {
    return {
      valid: false,
      networkId,
      family: 'EVM',
      normalizedAddress: '',
      error: 'Address string is empty or invalid.'
    };
  }

  const trimmed = address.trim();

  switch (networkId) {
    case 'bsc-mainnet':
    case 'bsc-testnet':
    case 'local-devnet':
    case 'polygon-mainnet':
    case 'polygon-amoy': {
      const isValid = validateEvmAddress(trimmed);
      return {
        valid: isValid,
        networkId,
        family: 'EVM',
        normalizedAddress: isValid ? trimmed.toLowerCase() : trimmed,
        error: isValid ? undefined : `Invalid EVM address for ${networkId}. Must be a 42-character hex string starting with '0x'.`
      };
    }

    case 'tron-mainnet':
    case 'tron-shasta': {
      const isValid = validateTronAddress(trimmed);
      return {
        valid: isValid,
        networkId,
        family: 'TRON',
        // CRITICAL: TRON Base58 addresses must NOT be lowercased.
        normalizedAddress: trimmed,
        error: isValid ? undefined : `Invalid TRON address for ${networkId}. Must be 34 characters starting with 'T' with a valid Base58Check checksum.`
      };
    }

    case 'bitcoin-mainnet': {
      const isValid = validateBitcoinAddress(trimmed, false);
      const isBech32 = trimmed.toLowerCase().startsWith('bc1');
      return {
        valid: isValid,
        networkId,
        family: 'BITCOIN',
        normalizedAddress: isBech32 ? trimmed.toLowerCase() : trimmed,
        error: isValid ? undefined : `Invalid Bitcoin mainnet address. Must be a valid P2PKH ('1...'), P2SH ('3...'), or Bech32 ('bc1...').`
      };
    }

    case 'bitcoin-testnet': {
      const isValid = validateBitcoinAddress(trimmed, true);
      const isBech32 = trimmed.toLowerCase().startsWith('tb1');
      return {
        valid: isValid,
        networkId,
        family: 'BITCOIN',
        normalizedAddress: isBech32 ? trimmed.toLowerCase() : trimmed,
        error: isValid ? undefined : `Invalid Bitcoin testnet address. Must start with 'm', 'n', '2', or 'tb1'.`
      };
    }

    default:
      return {
        valid: false,
        networkId,
        family: 'EVM',
        normalizedAddress: trimmed,
        error: `Unsupported networkId: ${networkId}`
      };
  }
}

/**
 * Safely normalizes an address according to its blockchain family:
 * - EVM: Lowercase
 * - TRON: Preserves exact Base58 case (NEVER lowercase)
 * - Bitcoin: Lowercase for Bech32 ('bc1...'), preserves case for Base58 ('1...', '3...')
 */
export function normalizeAddressForNetwork(address: string, networkId: NetworkId): string {
  const res = validateAddressForNetwork(address, networkId);
  return res.normalizedAddress;
}
