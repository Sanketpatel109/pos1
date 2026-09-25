import { db, doc, setDoc, onSnapshot } from '../firebase';
import { UPITransactionRecord } from '../types';

export interface CreateUpiTransactionParams {
  billNo: number;
  amount: number;
  currency?: string;
  storeVpa?: string;
  storeName?: string;
}

/**
 * Service to manage dynamic UPI payment transactions and real-time webhook listener
 */
export class UpiGatewayService {
  /**
   * Generates a unique atomic transaction reference ID
   */
  static generateTransactionId(billNo: number): string {
    const timestamp = Date.now().toString(36);
    const randomHex = Math.random().toString(36).substring(2, 6);
    return `TXN_${billNo}_${timestamp}_${randomHex}`.toUpperCase();
  }

  /**
   * Initializes a pending transaction record in Firestore
   */
  static async createTransaction(params: CreateUpiTransactionParams): Promise<UPITransactionRecord> {
    const txnId = this.generateTransactionId(params.billNo);
    const record: UPITransactionRecord = {
      id: txnId,
      billNo: params.billNo,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      payerVpa: params.storeVpa,
    };

    try {
      const docRef = doc(db, 'upi_transactions', txnId);
      await setDoc(docRef, record, { merge: true });
    } catch (err) {
      console.warn('UpiGatewayService: Failed to persist to Firestore, falling back locally', err);
    }

    return record;
  }

  /**
   * Subscribes to real-time status updates from payment gateway webhooks via Firestore
   */
  static subscribeToTransaction(
    txnId: string,
    onStatusChange: (record: UPITransactionRecord) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!txnId) return () => {};

    try {
      const docRef = doc(db, 'upi_transactions', txnId);
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UPITransactionRecord;
            onStatusChange(data);
          }
        },
        (error) => {
          console.warn(`UpiGatewayService: Listener subscription warning for ${txnId}:`, error);
          if (onError) onError(error);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('UpiGatewayService: Could not attach snapshot listener:', err);
      return () => {};
    }
  }

  /**
   * Mock / Test simulation trigger for testing webhook settlement
   */
  static async simulatePaymentSuccess(txnId: string, amount: number): Promise<void> {
    const updated: Partial<UPITransactionRecord> = {
      status: 'SUCCESS',
      bankUtrNumber: `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      gatewayReferenceId: `PAY_${Date.now().toString().slice(-8)}`,
      settledAt: new Date().toISOString(),
    };

    try {
      const docRef = doc(db, 'upi_transactions', txnId);
      await setDoc(docRef, updated, { merge: true });
    } catch (err) {
      console.warn('UpiGatewayService: Simulation fallback write error:', err);
    }
  }
}
