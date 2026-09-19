import { db, doc, setDoc, onSnapshot, collection } from '../firebase';

export interface SubscriptionRequest {
  id: string; // storeId
  storeId: string;
  storeName: string;
  ownerEmail?: string;
  ownerName?: string;
  utr: string;
  amount: number;
  plan: 'ANNUAL_PRO';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  expiresAt?: string;
  rejectionReason?: string;
}

const COLLECTION_NAME = 'subscription_requests';

/**
 * Submits a 12-digit UPI UTR payment reference to Firestore for administrative approval.
 */
export async function submitSubscriptionUtr(
  storeId: string,
  utr: string,
  storeName: string = '',
  ownerEmail: string = '',
  ownerName: string = ''
): Promise<void> {
  const cleanStoreId = (storeId || 'monopos_store_default').trim();
  const cleanUtr = (utr || '').trim();

  const requestDoc: SubscriptionRequest = {
    id: cleanStoreId,
    storeId: cleanStoreId,
    storeName: storeName.trim() || cleanStoreId,
    ownerEmail: ownerEmail.trim(),
    ownerName: ownerName.trim(),
    utr: cleanUtr,
    amount: 1999,
    plan: 'ANNUAL_PRO',
    status: 'PENDING',
    submittedAt: new Date().toISOString(),
  };

  const docRef = doc(db, COLLECTION_NAME, cleanStoreId);
  await setDoc(docRef, requestDoc, { merge: true });
}

/**
 * Listens in real time for approval updates for a specific store.
 * When the administrator clicks "Approve", the store automatically receives the update.
 */
export function subscribeToStoreApproval(
  storeId: string,
  onStatusChange: (req: SubscriptionRequest | null) => void
): () => void {
  const cleanStoreId = (storeId || 'monopos_store_default').trim();
  const docRef = doc(db, COLLECTION_NAME, cleanStoreId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onStatusChange(snapshot.data() as SubscriptionRequest);
      } else {
        onStatusChange(null);
      }
    },
    (err) => {
      console.warn('[SubscriptionApprovalService] Error listening to store status:', err);
    }
  );
}

/**
 * Listens to all subscription payment requests across all stores (for the Administrator).
 */
export function subscribeToAllRequests(
  onUpdate: (requests: SubscriptionRequest[]) => void
): () => void {
  const colRef = collection(db, COLLECTION_NAME);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: SubscriptionRequest[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as SubscriptionRequest);
      });

      // Sort by submittedAt descending (newest first)
      list.sort((a, b) => {
        const timeA = new Date(a.submittedAt || 0).getTime();
        const timeB = new Date(b.submittedAt || 0).getTime();
        return timeB - timeA;
      });

      onUpdate(list);
    },
    (err) => {
      console.warn('[SubscriptionApprovalService] Error loading all requests:', err);
    }
  );
}

/**
 * Approves a subscription payment, extending Annual Pro for the specified number of days (default: 365).
 */
export async function approveSubscription(
  storeId: string,
  reviewerName: string = 'Admin',
  days: number = 365
): Promise<{ expiresAt: string }> {
  const cleanStoreId = (storeId || '').trim();
  if (!cleanStoreId) throw new Error('Invalid Store ID');

  const now = Date.now();
  const expiresAt = new Date(now + days * 24 * 60 * 60 * 1000).toISOString();

  const docRef = doc(db, COLLECTION_NAME, cleanStoreId);
  await setDoc(
    docRef,
    {
      id: cleanStoreId,
      storeId: cleanStoreId,
      status: 'APPROVED',
      plan: 'ANNUAL_PRO',
      amount: 1999,
      reviewedAt: new Date(now).toISOString(),
      reviewedBy: reviewerName,
      expiresAt,
    },
    { merge: true }
  );

  return { expiresAt };
}

/**
 * Rejects a subscription payment with an optional reason.
 */
export async function rejectSubscription(
  storeId: string,
  reason: string = 'Payment reference could not be verified.',
  reviewerName: string = 'Admin'
): Promise<void> {
  const cleanStoreId = (storeId || '').trim();
  if (!cleanStoreId) throw new Error('Invalid Store ID');

  const docRef = doc(db, COLLECTION_NAME, cleanStoreId);
  await setDoc(
    docRef,
    {
      id: cleanStoreId,
      storeId: cleanStoreId,
      status: 'REJECTED',
      rejectionReason: reason,
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerName,
    },
    { merge: true }
  );
}
