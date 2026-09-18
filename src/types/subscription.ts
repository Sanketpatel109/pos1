/**
 * MonoPOS Subscription Engine Data Models
 */

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED';

export type SubscriptionPlan = 'FREE_TRIAL' | 'ANNUAL_PRO';

export interface SubscriptionState {
  storeId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  expiresAt: string; // ISO string timestamp
  trialStartedAt: string; // ISO string timestamp
  lastVerifiedUtr?: string;
  gracePeriodEndsAt?: string; // ISO string timestamp
  lastRecordedTimestamp: number; // Anti-clock-tampering timestamp
  tamperDetected?: boolean;
}

export interface LicenseValidationResult {
  valid: boolean;
  error?: string;
  expiresAt?: string; // ISO timestamp
}
