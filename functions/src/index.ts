import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { handleUpiWebhook } from './upiWebhook';

const app = express();

// Standard CORS and body parser
app.use(cors({ origin: true }));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    // Preserve rawBody for HMAC-SHA256 signature verification
    req.rawBody = buf;
  }
}));

// Webhook endpoint: POST /webhook or POST /api/webhooks/upi
app.post('/webhook', handleUpiWebhook);
app.post('/api/webhooks/upi', handleUpiWebhook);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'monopos-gateway-webhooks' });
});

// Export Cloud Function
export const upiWebhook = functions.https.onRequest(app);
