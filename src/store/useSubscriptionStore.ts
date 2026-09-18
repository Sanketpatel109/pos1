import { useState, useEffect, useCallback, useMemo } from 'react';
import { SubscriptionState, SubscriptionStatus } from '../types/subscription';
import { checkClockTampering, verifyLicenseKey } from '../utils/licenseSecurity';

export const SUBSCRIPTION_STORAGE_KEY = 'monopos_sub_v1';
export const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface SubscriptionStatusInfo {
  status: SubscriptionStatus;
  isAccessible: boolean; // true if counter billing is allowed
  isExpired: boolean;
  isGracePeriod: boolean;
  isTrial: boolean;
  isPro: boolean;
  isTampered: boolean;
  daysRemaining: number;
  hoursRemainingInGrace?: number;
  label: string; // e.g. "Pro: 240d", "Trial: 4d", "Grace: 18h", "Expired"
  dotColor: 'green' | 'amber' | 'red';
  expiresAtFormatted: string;
}

/**
 * Initializes default 14-day trial state for a new installation / store
 */
export function createInitialSubscriptionState(storeId: string): SubscriptionState {
  const now = Date.now();
  const expires = new Date(now + FOURTEEN_DAYS_MS);
  return {
    storeId: storeId || 'monopos_store_default',
    status: 'TRIAL',
    plan: 'FREE_TRIAL',
    trialStartedAt: new Date(now).toISOString(),
    expiresAt: expires.toISOString(),
    lastRecordedTimestamp: now,
    tamperDetected: false,
  };
}

/**
 * Loads subscription state from localStorage or initializes a new 14-day trial
 */
export function loadSubscriptionState(storeId: string): SubscriptionState {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SubscriptionState;
      if (parsed && parsed.expiresAt) {
        // If storeId changed and parsed had different storeId, update storeId
        if (storeId && parsed.storeId !== storeId) {
          return {
            ...parsed,
            storeId,
          };
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse subscription state from localStorage:', err);
  }

  const initial = createInitialSubscriptionState(storeId);
  try {
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

/**
 * Saves subscription state to localStorage
 */
export function saveSubscriptionState(state: SubscriptionState): void {
  try {
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save subscription state to localStorage:', err);
  }
}

export function useSubscriptionStore(storeId: string = 'monopos_store_default') {
  const [state, setState] = useState<SubscriptionState>(() => loadSubscriptionState(storeId));

  // Sync state if storeId prop changes
  useEffect(() => {
    setState((prev) => {
      if (prev.storeId !== storeId) {
        return loadSubscriptionState(storeId);
      }
      return prev;
    });
  }, [storeId]);

  // Persist state changes
  useEffect(() => {
    saveSubscriptionState(state);
  }, [state]);

  /**
   * Anti-clock-tampering heartbeat & status resolution
   */
  const evaluateStatus = useCallback((): SubscriptionStatusInfo => {
    const now = Date.now();
    let isTampered = Boolean(state.tamperDetected);

    // 1. Clock Tamper Check
    if (checkClockTampering(now, state.lastRecordedTimestamp)) {
      isTampered = true;
      if (!state.tamperDetected) {
        setState((prev) => ({
          ...prev,
          tamperDetected: true,
          status: 'EXPIRED',
        }));
      }
    }

    const expiryTime = new Date(state.expiresAt).getTime();
    const graceEndTime = state.gracePeriodEndsAt ? new Date(state.gracePeriodEndsAt).getTime() : 0;
    const isPastExpiry = now > expiryTime;
    const isWithinGrace = state.status === 'GRACE_PERIOD' && graceEndTime > now;

    let resolvedStatus: SubscriptionStatus = state.status;

    if (isTampered) {
      resolvedStatus = 'EXPIRED';
    } else if (isWithinGrace) {
      resolvedStatus = 'GRACE_PERIOD';
    } else if (isPastExpiry) {
      resolvedStatus = 'EXPIRED';
    } else if (state.plan === 'ANNUAL_PRO') {
      resolvedStatus = 'ACTIVE';
    } else {
      resolvedStatus = 'TRIAL';
    }

    // Days remaining until expiration
    const msRemaining = Math.max(0, expiryTime - now);
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

    // Hours remaining in grace period
    const hoursRemainingInGrace = isWithinGrace ? Math.max(1, Math.ceil((graceEndTime - now) / (60 * 60 * 1000))) : undefined;

    // Accessibility for counter billing
    const isAccessible = !isTampered && (resolvedStatus === 'ACTIVE' || resolvedStatus === 'TRIAL' || resolvedStatus === 'GRACE_PERIOD');

    // Label & Dot Color for Navigation Footer Pill
    let label = '';
    let dotColor: 'green' | 'amber' | 'red' = 'green';

    if (isTampered) {
      label = 'Clock Tampered';
      dotColor = 'red';
    } else if (resolvedStatus === 'EXPIRED') {
      label = 'Expired';
      dotColor = 'red';
    } else if (resolvedStatus === 'GRACE_PERIOD') {
      label = `Grace: ${hoursRemainingInGrace}h`;
      dotColor = 'amber';
    } else if (resolvedStatus === 'TRIAL') {
      label = `Trial: ${daysRemaining}d`;
      dotColor = daysRemaining <= 3 ? 'amber' : 'green';
    } else {
      label = `Pro: ${daysRemaining}d`;
      dotColor = 'green';
    }

    const expiresAtFormatted = new Date(state.expiresAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return {
      status: resolvedStatus,
      isAccessible,
      isExpired: resolvedStatus === 'EXPIRED',
      isGracePeriod: resolvedStatus === 'GRACE_PERIOD',
      isTrial: resolvedStatus === 'TRIAL',
      isPro: resolvedStatus === 'ACTIVE',
      isTampered,
      daysRemaining,
      hoursRemainingInGrace,
      label,
      dotColor,
      expiresAtFormatted,
    };
  }, [state]);

  const statusInfo = useMemo(() => evaluateStatus(), [evaluateStatus]);

  /**
   * Updates lastRecordedTimestamp on each transaction / critical counter action
   */
  const recordActivityTimestamp = useCallback(() => {
    const now = Date.now();
    setState((prev) => ({
      ...prev,
      lastRecordedTimestamp: Math.max(prev.lastRecordedTimestamp, now),
    }));
  }, []);

  /**
   * Submits a 12-digit UPI UTR number to instantly unlock 24 hours of grace period
   */
  const submitUtr = useCallback((utr: string): { success: boolean; message: string } => {
    const cleanUtr = (utr || '').trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      return {
        success: false,
        message: 'Invalid UPI Reference (UTR) number. Must be exactly 12 numeric digits.',
      };
    }

    const now = Date.now();
    const graceEnd = new Date(now + TWENTY_FOUR_HOURS_MS);

    setState((prev) => ({
      ...prev,
      status: 'GRACE_PERIOD',
      lastVerifiedUtr: cleanUtr,
      gracePeriodEndsAt: graceEnd.toISOString(),
      lastRecordedTimestamp: now,
      tamperDetected: false,
    }));

    return {
      success: true,
      message: 'Payment reference submitted! Instant 24-hour grace period activated. Billing unlocked.',
    };
  }, []);

  /**
   * Activates an offline license key (MPOS-YYYYMMDD-HASH12)
   */
  const activateLicenseKey = useCallback((key: string): { success: boolean; message: string } => {
    const validation = verifyLicenseKey(key, state.storeId);
    if (!validation.valid || !validation.expiresAt) {
      return {
        success: false,
        message: validation.error || 'Invalid license key.',
      };
    }

    const now = Date.now();
    setState((prev) => ({
      ...prev,
      status: 'ACTIVE',
      plan: 'ANNUAL_PRO',
      expiresAt: validation.expiresAt!,
      gracePeriodEndsAt: undefined,
      lastRecordedTimestamp: now,
      tamperDetected: false,
    }));

    return {
      success: true,
      message: `License key activated successfully! Annual Pro extended to ${new Date(validation.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
    };
  }, [state.storeId]);

  return {
    state,
    statusInfo,
    submitUtr,
    activateLicenseKey,
    recordActivityTimestamp,
    evaluateStatus,
  };
}
