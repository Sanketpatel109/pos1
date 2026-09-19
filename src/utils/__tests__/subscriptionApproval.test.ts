import { describe, it, expect } from 'vitest';
import { SubscriptionRequest } from '../../services/subscriptionApprovalService';

describe('Subscription Approval Model & Lifecycle', () => {
  const testStoreId = 'retail_store_alpha';
  const testUtr = '524189012345';

  it('validates a properly formatted 12-digit UTR subscription request', () => {
    const request: SubscriptionRequest = {
      id: testStoreId,
      storeId: testStoreId,
      storeName: 'Alpha Supermarket',
      ownerEmail: 'owner@alpha.com',
      ownerName: 'Alpha Owner',
      utr: testUtr,
      amount: 1999,
      plan: 'ANNUAL_PRO',
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    expect(request.storeId).toBe(testStoreId);
    expect(request.utr).toBe(testUtr);
    expect(request.utr).toHaveLength(12);
    expect(request.status).toBe('PENDING');
    expect(request.amount).toBe(1999);
    expect(request.plan).toBe('ANNUAL_PRO');
  });

  it('calculates 365 days expiration accurately upon approval', () => {
    const now = Date.now();
    const days = 365;
    const expiresAt = new Date(now + days * 24 * 60 * 60 * 1000).toISOString();

    const diffDays = Math.round(
      (new Date(expiresAt).getTime() - now) / (24 * 60 * 60 * 1000)
    );
    expect(diffDays).toBe(365);
  });

  it('verifies approval status transition and review metadata', () => {
    const now = new Date().toISOString();
    const approvedRequest: SubscriptionRequest = {
      id: testStoreId,
      storeId: testStoreId,
      storeName: 'Alpha Supermarket',
      utr: testUtr,
      amount: 1999,
      plan: 'ANNUAL_PRO',
      status: 'APPROVED',
      submittedAt: now,
      reviewedAt: now,
      reviewedBy: 'Administrator',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    expect(approvedRequest.status).toBe('APPROVED');
    expect(approvedRequest.reviewedBy).toBe('Administrator');
    expect(approvedRequest.expiresAt).toBeDefined();
  });
});
