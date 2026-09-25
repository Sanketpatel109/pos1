import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Verifies Razorpay Webhook HMAC-SHA256 Signature
 */
export function verifyRazorpaySignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

/**
 * HTTP Webhook Handler for Payment Gateway Settlement (Razorpay / Cashfree)
 * Endpoint: POST /api/webhooks/upi
 */
export async function handleUpiWebhook(req: Request, res: Response): Promise<void> {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.UPI_WEBHOOK_SECRET || '';
  const razorpaySignature = req.headers['x-razorpay-signature'] as string;

  // Verify signature if secret is configured in environment
  if (webhookSecret && razorpaySignature) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const isValid = verifyRazorpaySignature(rawBody, razorpaySignature, webhookSecret);
    if (!isValid) {
      console.warn('Unauthorized webhook signature mismatch');
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }
  }

  try {
    const event = req.body?.event;
    const payload = req.body?.payload;

    console.log(`Processing UPI webhook event: ${event}`);

    // Razorpay "payment.captured" or "order.paid"
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload?.payment?.entity;
      if (!payment) {
        res.status(400).json({ error: 'Missing payment entity in payload' });
        return;
      }

      // Extract transaction reference from notes or description
      const txnId =
        payment.notes?.txnId ||
        payment.notes?.transactionId ||
        payment.description?.match(/TXN_[A-Z0-9_]+/i)?.[0];

      const rrn =
        payment.acquirer_data?.rrn ||
        payment.acquirer_data?.bank_transaction_id ||
        payment.acquirer_data?.upi_transaction_id ||
        `UTR${payment.id.slice(-8)}`;

      if (txnId) {
        console.log(`Settling transaction ${txnId} for amount ₹${payment.amount / 100}`);
        const txnRef = db.collection('upi_transactions').doc(txnId);
        await txnRef.set(
          {
            status: 'SUCCESS',
            gatewayReferenceId: payment.id,
            bankUtrNumber: rrn,
            payerVpa: payment.vpa || null,
            settledAt: new Date().toISOString(),
            capturedAmount: payment.amount / 100,
          },
          { merge: true }
        );
      } else {
        console.warn('Payment captured without matching txnId in notes:', payment.id);
      }
    }

    // Acknowledge receipt to gateway immediately
    res.status(200).json({ status: 'ok', received: true });
  } catch (error) {
    console.error('Failed to process UPI webhook:', error);
    res.status(500).json({ error: 'Internal server error processing webhook' });
  }
}
