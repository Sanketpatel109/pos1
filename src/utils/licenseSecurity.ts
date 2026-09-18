/**
 * MonoPOS License Security & Anti-Clock-Tampering Engine
 */

import { LicenseValidationResult } from '../types/subscription';

export const MONOPOS_SECRET = 'MONOPOS_SECURE_RETAIL_SECRET_2026_X9';
export const CLOCK_DRIFT_THRESHOLD_MS = 60 * 1000; // 60 seconds tolerance

/**
 * Robust SHA-256 implementation supporting both Node.js (test/server)
 * and Browser (Web Crypto API) or pure JS fallback.
 */
export async function computeSha256(message: string): Promise<string> {
  // Web Crypto API if available
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256PureJs(message);
}

/**
 * Synchronous SHA-256 implementation for fast synchronous checks (100% offline & portable)
 */
export function computeSha256Sync(message: string): string {
  return sha256PureJs(message);
}

/**
 * Pure JavaScript SHA-256 algorithm for 100% offline, synchronous guarantee
 */
function sha256PureJs(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let compositeWords = ascii;
  let wordCount = compositeWords.length;
  for (i = 0; i < wordCount; i++) {
    words[i >> 2] |= (compositeWords.charCodeAt(i) & 255) << (8 * (3 - (i % 4)));
  }
  words[wordCount >> 2] |= 128 << (8 * (3 - (wordCount % 4)));
  words[(((wordCount + 8) >> 6) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    let oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      if (j >= 16) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

/**
 * Checks if the system clock has been tampered with (moved backward by > 60s).
 * @param currentTimestamp Current Date.now()
 * @param lastRecordedTimestamp Previous Date.now() recorded from last action
 * @returns true if clock was rolled back beyond tolerance, false otherwise
 */
export function checkClockTampering(currentTimestamp: number, lastRecordedTimestamp: number): boolean {
  if (!lastRecordedTimestamp || lastRecordedTimestamp <= 0) return false;
  // If the clock is rewound backwards by more than 60 seconds
  return currentTimestamp < lastRecordedTimestamp - CLOCK_DRIFT_THRESHOLD_MS;
}

/**
 * Generates an offline license key for a given storeId and target expiry date (YYYYMMDD).
 * Format: MPOS-{YYYYMMDD}-{HASH12}
 */
export function generateLicenseKey(storeId: string, targetDateStr: string): string {
  const normalizedDate = targetDateStr.replace(/-/g, '').trim();
  const payload = `${storeId.trim()}:${normalizedDate}:${MONOPOS_SECRET}`;
  const fullHash = computeSha256Sync(payload);
  const hash12 = fullHash.substring(0, 12).toUpperCase();
  return `MPOS-${normalizedDate}-${hash12}`;
}

/**
 * Validates an offline license key for a storeId against format MPOS-{YYYYMMDD}-{HASH12}.
 * Checks SHA-256 integrity offline over `${storeId}:${targetDate}:MONOPOS_SECRET`.
 */
export function verifyLicenseKey(key: string, storeId: string): LicenseValidationResult {
  const cleanKey = (key || '').trim().toUpperCase();
  const parts = cleanKey.split('-');

  if (parts.length !== 3 || parts[0] !== 'MPOS') {
    return {
      valid: false,
      error: 'Invalid license key format. Expected format: MPOS-YYYYMMDD-XXXXXXXXXXXX',
    };
  }

  const targetDateStr = parts[1];
  const providedHash12 = parts[2];

  if (!/^\d{8}$/.test(targetDateStr)) {
    return {
      valid: false,
      error: 'Invalid expiry date format in license key. Must be YYYYMMDD.',
    };
  }

  if (providedHash12.length !== 12) {
    return {
      valid: false,
      error: 'Invalid license security signature length.',
    };
  }

  // Parse target date
  const year = parseInt(targetDateStr.substring(0, 4), 10);
  const month = parseInt(targetDateStr.substring(4, 6), 10) - 1;
  const day = parseInt(targetDateStr.substring(6, 8), 10);
  const expiryDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

  if (isNaN(expiryDate.getTime())) {
    return {
      valid: false,
      error: 'License expiry date is not a valid calendar date.',
    };
  }

  // Verify hash
  const payload = `${storeId.trim()}:${targetDateStr}:${MONOPOS_SECRET}`;
  const computedHash = computeSha256Sync(payload);
  const expectedHash12 = computedHash.substring(0, 12).toUpperCase();

  if (providedHash12 !== expectedHash12) {
    return {
      valid: false,
      error: 'License verification failed. Key signature is invalid or belongs to another store ID.',
    };
  }

  // Check if target date is already in the past
  if (expiryDate.getTime() < Date.now()) {
    return {
      valid: false,
      error: `License key expired on ${expiryDate.toISOString().split('T')[0]}.`,
      expiresAt: expiryDate.toISOString(),
    };
  }

  return {
    valid: true,
    expiresAt: expiryDate.toISOString(),
  };
}
