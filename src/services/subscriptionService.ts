import { db, doc, getDoc, setDoc } from '../firebase';
import { TenantLicense, SubscriptionPlan, SubscriptionStatus } from '../types';
import type { User } from 'firebase/auth';

const TENANT_COLLECTION = 'tenants';
const LOCAL_KEY = 'monopos_tenant_license';
const TRIAL_DAYS = 14;
const GRACE_HOURS = 48;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

// ─── Core Service ─────────────────────────────────────────────────────────────

/**
 * Provision a new 14-day free trial for a first-time Google sign-in.
 */
function createTrialLicense(user: User): TenantLicense {
  const now = new Date();
  const trialEnd = addDays(now, TRIAL_DAYS);
  return {
    tenantId: `tenant_${user.uid}`,
    ownerUid: user.uid,
    ownerEmail: user.email || '',
    ownerName: user.displayName || 'Store Owner',
    ownerPhotoUrl: user.photoURL || undefined,
    plan: 'TRIAL',
    status: 'TRIAL',
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialEnd.toISOString(),
    currentPeriodEnd: trialEnd.toISOString(),
    maxRegisters: 3, // Full access during trial
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Try to read a cached license from localStorage for instant offline startup.
 */
export function getCachedLicense(): TenantLicense | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TenantLicense;
  } catch {
    return null;
  }
}

/**
 * Cache the license locally for offline resilience.
 */
export function cacheLicense(license: TenantLicense): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(license));
  } catch {}
}

/**
 * Clear the cached license on sign-out.
 */
export function clearCachedLicense(): void {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {}
}

/**
 * Fetch or auto-create a tenant license for the signed-in user.
 * - If this is a new user → provisions a 14-day free trial in Firestore.
 * - If existing → returns the stored license.
 * - Always caches the result locally for offline access.
 */
export async function getOrCreateLicense(user: User): Promise<TenantLicense> {
  const docRef = doc(db, TENANT_COLLECTION, user.uid);

  try {
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const license = snapshot.data() as TenantLicense;
      // Update owner info in case name/photo changed
      const updated: TenantLicense = {
        ...license,
        ownerName: user.displayName || license.ownerName,
        ownerEmail: user.email || license.ownerEmail,
        ownerPhotoUrl: user.photoURL || license.ownerPhotoUrl,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, updated, { merge: true });
      cacheLicense(updated);
      return updated;
    }

    // New user → provision trial
    const trial = createTrialLicense(user);
    await setDoc(docRef, trial);
    cacheLicense(trial);
    return trial;
  } catch (err) {
    console.warn('[SubscriptionService] Firestore unavailable, using cached license:', err);
    const cached = getCachedLicense();
    if (cached && cached.ownerUid === user.uid) {
      return cached;
    }
    // Fallback: create a local-only trial (will sync when online)
    const localTrial = createTrialLicense(user);
    cacheLicense(localTrial);
    return localTrial;
  }
}

// ─── Status Checks ────────────────────────────────────────────────────────────

export interface LicenseStatus {
  isValid: boolean;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  daysRemaining: number;
  isTrialActive: boolean;
  isGracePeriod: boolean;
  isExpired: boolean;
  expiresAt: Date;
  displayLabel: string;
}

/**
 * Compute the current status of a tenant license, including grace period logic.
 */
export function checkLicenseStatus(license: TenantLicense): LicenseStatus {
  const now = new Date();
  const expiresAt = new Date(license.currentPeriodEnd);
  const graceEnd = addHours(expiresAt, GRACE_HOURS);
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const isTrial = license.plan === 'TRIAL';
  const isBeforeExpiry = now < expiresAt;
  const isInGrace = !isBeforeExpiry && now < graceEnd;
  const isExpired = now >= graceEnd;

  let status: SubscriptionStatus;
  let displayLabel: string;

  if (isBeforeExpiry) {
    status = isTrial ? 'TRIAL' : 'ACTIVE';
    displayLabel = isTrial
      ? `Trial: ${daysRemaining}d left`
      : `${license.plan} Active`;
  } else if (isInGrace) {
    status = 'GRACE';
    const graceHoursLeft = Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60)));
    displayLabel = `Grace: ${graceHoursLeft}h left`;
  } else {
    status = 'EXPIRED';
    displayLabel = 'Expired — Renew';
  }

  return {
    isValid: isBeforeExpiry || isInGrace,
    status,
    plan: license.plan,
    daysRemaining,
    isTrialActive: isTrial && isBeforeExpiry,
    isGracePeriod: isInGrace,
    isExpired,
    expiresAt,
    displayLabel,
  };
}

/**
 * Simulate upgrading the plan (for demo/testing — in production this would be
 * triggered by a Stripe/Razorpay webhook).
 */
export async function simulatePlanUpgrade(
  ownerUid: string,
  plan: SubscriptionPlan
): Promise<TenantLicense | null> {
  const docRef = doc(db, TENANT_COLLECTION, ownerUid);
  try {
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;

    const current = snapshot.data() as TenantLicense;
    const now = new Date();
    const periodEnd = plan === 'ANNUAL'
      ? addDays(now, 365)
      : addDays(now, 30);

    const updated: TenantLicense = {
      ...current,
      plan,
      status: 'ACTIVE',
      currentPeriodEnd: periodEnd.toISOString(),
      maxRegisters: plan === 'STARTER' ? 1 : 3,
      updatedAt: now.toISOString(),
    };

    await setDoc(docRef, updated, { merge: true });
    cacheLicense(updated);
    return updated;
  } catch (err) {
    console.error('[SubscriptionService] Plan upgrade failed:', err);
    return null;
  }
}
