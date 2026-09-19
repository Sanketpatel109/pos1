import { db, doc, getDoc, setDoc, onSnapshot } from '../firebase';

const ADMIN_CONFIG_COLLECTION = 'admin_config';
const WHITELIST_DOC_ID = 'whitelist';
const LOCAL_STORAGE_KEY = 'monopos_admin_whitelist';

// Default initial fallback list if database is empty
export const DEFAULT_INITIAL_ADMIN_EMAILS = [
  'sanketpatel109@gmail.com',
];

export interface WhitelistConfig {
  emails: string[];
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Normalizes email address for consistent comparison
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Checks whether an email is in the authorized whitelist
 */
export function isEmailWhitelisted(email: string, whitelist: string[]): boolean {
  if (!email) return false;
  const target = normalizeEmail(email);
  return whitelist.some((e) => normalizeEmail(e) === target);
}

/**
 * Subscribes to live updates of the admin email whitelist from Firestore.
 * Falls back to localStorage and default list if Firestore doc doesn't exist yet.
 */
export function subscribeToAdminWhitelist(callback: (emails: string[]) => void): () => void {
  // Load cached from localStorage immediately
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      }
    } catch {
      // Ignore cache parse failure
    }
  }

  const docRef = doc(db, ADMIN_CONFIG_COLLECTION, WHITELIST_DOC_ID);
  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as WhitelistConfig;
        const emails = Array.isArray(data.emails) ? data.emails.map(normalizeEmail) : [];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(emails));
        callback(emails);
      } else {
        // Doc not yet created in Firestore, seed with defaults or localStorage
        const initial = cached ? JSON.parse(cached) : DEFAULT_INITIAL_ADMIN_EMAILS;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
        callback(initial);
      }
    },
    (err) => {
      console.warn('Failed to subscribe to admin whitelist in Firestore:', err);
      // On network error or offline, use cached or defaults
      const initial = cached ? JSON.parse(cached) : DEFAULT_INITIAL_ADMIN_EMAILS;
      callback(initial);
    }
  );

  return unsubscribe;
}

/**
 * Adds an email to the authorized whitelist in Firestore & localStorage.
 */
export async function addAdminEmail(email: string, performedBy?: string): Promise<string[]> {
  const clean = normalizeEmail(email);
  if (!clean || !clean.includes('@') || !clean.includes('.')) {
    throw new Error('Please enter a valid email address.');
  }

  // Fetch latest
  let currentEmails: string[] = [];
  try {
    const docRef = doc(db, ADMIN_CONFIG_COLLECTION, WHITELIST_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as WhitelistConfig;
      if (Array.isArray(data.emails)) {
        currentEmails = data.emails.map(normalizeEmail);
      }
    }
  } catch (err) {
    console.warn('Could not read whitelist from Firestore:', err);
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        currentEmails = JSON.parse(cached);
      } catch {}
    }
  }

  if (currentEmails.length === 0) {
    currentEmails = [...DEFAULT_INITIAL_ADMIN_EMAILS];
  }

  if (currentEmails.includes(clean)) {
    throw new Error(`Email "${clean}" is already authorized.`);
  }

  const updatedEmails = [...currentEmails, clean];
  const payload: WhitelistConfig = {
    emails: updatedEmails,
    updatedAt: new Date().toISOString(),
    updatedBy: performedBy || 'Founder',
  };

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedEmails));

  try {
    const docRef = doc(db, ADMIN_CONFIG_COLLECTION, WHITELIST_DOC_ID);
    await setDoc(docRef, payload);
  } catch (err) {
    console.warn('Could not save whitelist to Firestore:', err);
  }

  return updatedEmails;
}

/**
 * Removes an email from the authorized whitelist.
 */
export async function removeAdminEmail(email: string, performedBy?: string): Promise<string[]> {
  const clean = normalizeEmail(email);

  let currentEmails: string[] = [];
  try {
    const docRef = doc(db, ADMIN_CONFIG_COLLECTION, WHITELIST_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as WhitelistConfig;
      if (Array.isArray(data.emails)) {
        currentEmails = data.emails.map(normalizeEmail);
      }
    }
  } catch (err) {
    console.warn('Could not read whitelist from Firestore:', err);
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        currentEmails = JSON.parse(cached);
      } catch {}
    }
  }

  if (currentEmails.length === 0) {
    currentEmails = [...DEFAULT_INITIAL_ADMIN_EMAILS];
  }

  const updatedEmails = currentEmails.filter((e) => e !== clean);
  const payload: WhitelistConfig = {
    emails: updatedEmails,
    updatedAt: new Date().toISOString(),
    updatedBy: performedBy || 'Founder',
  };

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedEmails));

  try {
    const docRef = doc(db, ADMIN_CONFIG_COLLECTION, WHITELIST_DOC_ID);
    await setDoc(docRef, payload);
  } catch (err) {
    console.warn('Could not remove email from Firestore whitelist:', err);
  }

  return updatedEmails;
}
