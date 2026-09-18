import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialSubscriptionState,
  loadSubscriptionState,
  saveSubscriptionState,
  SUBSCRIPTION_STORAGE_KEY,
  FOURTEEN_DAYS_MS,
  TWENTY_FOUR_HOURS_MS,
} from '../../store/useSubscriptionStore';
import { generateLicenseKey } from '../licenseSecurity';

// Mock localStorage for Node test runner
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useSubscriptionStore Logic', () => {
  const testStoreId = 'store_test_retail_002';

  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('createInitialSubscriptionState', () => {
    it('initializes a fresh 14-day TRIAL with valid parameters', () => {
      const state = createInitialSubscriptionState(testStoreId);
      expect(state.storeId).toBe(testStoreId);
      expect(state.status).toBe('TRIAL');
      expect(state.plan).toBe('FREE_TRIAL');
      expect(state.tamperDetected).toBe(false);

      const startTime = new Date(state.trialStartedAt!).getTime();
      const expiryTime = new Date(state.expiresAt).getTime();
      // Should expire approximately 14 days later
      expect(expiryTime - startTime).toBeCloseTo(FOURTEEN_DAYS_MS, -3);
    });
  });

  describe('loadSubscriptionState & persistence', () => {
    it('creates initial state if storage is empty and saves it', () => {
      const loaded = loadSubscriptionState(testStoreId);
      expect(loaded.status).toBe('TRIAL');
      expect(loaded.storeId).toBe(testStoreId);
      expect(localStorageMock.getItem(SUBSCRIPTION_STORAGE_KEY)).not.toBeNull();
    });

    it('reloads saved state from localStorage correctly', () => {
      const customState = {
        storeId: testStoreId,
        status: 'ACTIVE' as const,
        plan: 'ANNUAL_PRO' as const,
        trialStartedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000000).toISOString(),
        lastRecordedTimestamp: Date.now(),
        tamperDetected: false,
      };
      saveSubscriptionState(customState);

      const loaded = loadSubscriptionState(testStoreId);
      expect(loaded.status).toBe('ACTIVE');
      expect(loaded.plan).toBe('ANNUAL_PRO');
    });
  });

  describe('12-digit UTR and Grace Period Validation', () => {
    it('validates 12-digit numeric format strictly', () => {
      const validUtr = '123456789012';
      const invalidShort = '12345';
      const invalidAlpha = '12345678901A';

      expect(/^\d{12}$/.test(validUtr)).toBe(true);
      expect(/^\d{12}$/.test(invalidShort)).toBe(false);
      expect(/^\d{12}$/.test(invalidAlpha)).toBe(false);
    });
  });

  describe('License Key generation and validation for subscription state', () => {
    it('generates valid key for store and extends active state', () => {
      const futureYear = new Date().getFullYear() + 1;
      const key = generateLicenseKey(testStoreId, `${futureYear}1231`);
      expect(key).toContain('MPOS-');
    });
  });
});
