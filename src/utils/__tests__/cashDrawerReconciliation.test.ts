import { describe, it, expect } from 'vitest';
import { calculateDrawerReconciliation } from '../retailCalculations';
import { Order, CashEntry } from '../../types';

describe('Cash Drawer Reconciliation & Z-Report Suite', () => {
  const mockOrders: Order[] = [
    {
      id: 'ord-1',
      orderNumber: 1,
      createdAt: '',
      status: 'completed',
      items: [],
      subtotal: 500,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      total: 500,
      paymentMethod: 'CASH',
    },
    {
      id: 'ord-2',
      orderNumber: 2,
      createdAt: '',
      status: 'completed',
      items: [],
      subtotal: 1000,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      total: 1000,
      paymentMethod: 'UPI', // Online sale (not in drawer)
    },
    {
      id: 'ord-3',
      orderNumber: 3,
      createdAt: '',
      status: 'completed',
      items: [],
      subtotal: 300,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      total: 300,
      paymentMethod: 'KHATA', // Credit sale (not in drawer)
    },
    {
      id: 'ord-4',
      orderNumber: 4,
      createdAt: '',
      status: 'cancelled', // Cancelled order (should be ignored)
      items: [],
      subtotal: 200,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      total: 200,
      paymentMethod: 'CASH',
    },
  ];

  const mockCashEntries: CashEntry[] = [
    {
      id: 'entry-1',
      type: 'IN',
      amount: 100, // Petty cash deposit
      reason: 'Change replenishment',
      createdAt: '',
    },
    {
      id: 'entry-2',
      type: 'OUT',
      amount: 50, // Drawer payout for milk supplier
      reason: 'Milk crate payout',
      createdAt: '',
    },
  ];

  it('should compute exact expected drawer cash (openingFloat + cashSales + cashIn - cashOut)', () => {
    // Opening float: 1000
    // Cash sales: 500
    // Cash In: 100
    // Cash Out: 50
    // Expected: 1000 + 500 + 100 - 50 = 1550
    const result = calculateDrawerReconciliation(1000, mockOrders, mockCashEntries, 1550);

    expect(result.cashSales).toBe(500);
    expect(result.onlineSales).toBe(1000);
    expect(result.creditSales).toBe(300);
    expect(result.totalSales).toBe(1800);
    expect(result.cashIn).toBe(100);
    expect(result.cashOut).toBe(50);
    expect(result.expectedDrawerCash).toBe(1550);
    expect(result.actualCountedCash).toBe(1550);
    expect(result.variance).toBe(0);
    expect(result.isExact).toBe(true);
    expect(result.isShort).toBe(false);
    expect(result.isExcess).toBe(false);
  });

  it('should detect cash shortage when counted cash is less than expected', () => {
    // Expected: 1550, Counted: 1500 (₹50 shortage)
    const result = calculateDrawerReconciliation(1000, mockOrders, mockCashEntries, 1500);

    expect(result.expectedDrawerCash).toBe(1550);
    expect(result.actualCountedCash).toBe(1500);
    expect(result.variance).toBe(-50);
    expect(result.isShort).toBe(true);
    expect(result.isExact).toBe(false);
    expect(result.isExcess).toBe(false);
  });

  it('should detect cash excess when counted cash is more than expected', () => {
    // Expected: 1550, Counted: 1600 (₹50 excess)
    const result = calculateDrawerReconciliation(1000, mockOrders, mockCashEntries, 1600);

    expect(result.expectedDrawerCash).toBe(1550);
    expect(result.actualCountedCash).toBe(1600);
    expect(result.variance).toBe(50);
    expect(result.isExcess).toBe(true);
    expect(result.isShort).toBe(false);
    expect(result.isExact).toBe(false);
  });

  it('should ignore cancelled and non-completed orders in sales aggregation', () => {
    const result = calculateDrawerReconciliation(0, mockOrders, [], 0);
    expect(result.totalOrders).toBe(3); // 3 completed orders, 1 cancelled excluded
  });
});
