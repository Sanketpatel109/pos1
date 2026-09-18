import { describe, it, expect } from 'vitest';
import {
  checkClockTampering,
  generateLicenseKey,
  verifyLicenseKey,
  computeSha256Sync,
  CLOCK_DRIFT_THRESHOLD_MS,
} from '../licenseSecurity';

describe('licenseSecurity Engine', () => {
  const testStoreId = 'store_test_retail_001';

  describe('checkClockTampering', () => {
    it('returns false when current time progresses normally forward', () => {
      const lastRecorded = Date.now() - 5000;
      const current = Date.now();
      expect(checkClockTampering(current, lastRecorded)).toBe(false);
    });

    it('returns false when clock drift is within 60 second tolerance', () => {
      const current = 1000000;
      const lastRecorded = current + 30 * 1000; // 30s in future (< 60s threshold)
      expect(checkClockTampering(current, lastRecorded)).toBe(false);
    });

    it('returns true when clock is rewound backwards by more than 60 seconds', () => {
      const current = 1000000;
      const lastRecorded = current + CLOCK_DRIFT_THRESHOLD_MS + 1000; // 61s in future
      expect(checkClockTampering(current, lastRecorded)).toBe(true);
    });

    it('returns false when lastRecordedTimestamp is missing or 0', () => {
      expect(checkClockTampering(Date.now(), 0)).toBe(false);
    });
  });

  describe('Offline License Key Generation & Verification', () => {
    it('generates valid key in format MPOS-YYYYMMDD-XXXXXXXXXXXX', () => {
      const key = generateLicenseKey(testStoreId, '20281231');
      expect(key).toMatch(/^MPOS-20281231-[A-F0-9]{12}$/);
    });

    it('successfully validates a genuine future license key for the target store', () => {
      // Set future date 2 years ahead
      const futureYear = new Date().getFullYear() + 2;
      const targetDateStr = `${futureYear}1231`;
      const key = generateLicenseKey(testStoreId, targetDateStr);

      const result = verifyLicenseKey(key, testStoreId);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('rejects a key with invalid store ID (store mismatch)', () => {
      const futureYear = new Date().getFullYear() + 2;
      const targetDateStr = `${futureYear}1231`;
      const key = generateLicenseKey(testStoreId, targetDateStr);

      const wrongStoreResult = verifyLicenseKey(key, 'different_store_999');
      expect(wrongStoreResult.valid).toBe(false);
      expect(wrongStoreResult.error).toContain('License verification failed');
    });

    it('rejects a license key that has already expired in the past', () => {
      const pastKey = generateLicenseKey(testStoreId, '20200101');
      const result = verifyLicenseKey(pastKey, testStoreId);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('License key expired');
    });

    it('rejects malformed license key strings', () => {
      expect(verifyLicenseKey('INVALID-KEY', testStoreId).valid).toBe(false);
      expect(verifyLicenseKey('MPOS-2025-123', testStoreId).valid).toBe(false);
      expect(verifyLicenseKey('MPOS-ABCD1234-A1B2C3D4E5F6', testStoreId).valid).toBe(false);
    });
  });

  describe('computeSha256Sync', () => {
    it('produces deterministic 64-char hex hash', () => {
      const hash1 = computeSha256Sync('hello_monopos_test');
      const hash2 = computeSha256Sync('hello_monopos_test');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });
});
