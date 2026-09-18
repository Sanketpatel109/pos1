import { describe, it, expect } from 'vitest';
import {
  calculateRefundOrderState,
  calculateRestockedCatalog,
  RefundRequest,
} from '../retailCalculations';
import { Order, CatalogItem } from '../../types';

describe('Returns, Partial Refunds & Credit Notes Audit Suite', () => {
  const createMockOrder = (): Order => ({
    id: 'ord-1001',
    orderNumber: 1001,
    createdAt: new Date().toISOString(),
    status: 'completed',
    items: [
      {
        id: 'prod-shirt',
        name: 'Cotton Shirt',
        unitPrice: 500,
        quantity: 2,
        itemTotal: 1000,
      },
      {
        id: 'prod-socks',
        name: 'Woolen Socks',
        unitPrice: 100,
        quantity: 1,
        itemTotal: 100,
      },
    ],
    subtotal: 1100,
    taxRate: 0,
    taxAmount: 0,
    discount: 0,
    total: 1100,
    paymentMethod: 'CASH',
  });

  describe('Partial Returns & Status Progression', () => {
    it('should set status to partially_refunded when returning only 1 of 2 shirts', () => {
      const initialOrder = createMockOrder();
      const refundRequest: RefundRequest = {
        orderNumber: 1001,
        creditNoteNumber: 'CN-1001-A',
        refundedAt: new Date().toISOString(),
        refundAmount: 500,
        refundMethod: 'CASH',
        refundReason: 'Size too large',
        restockInventory: true,
        refundedItems: [
          {
            id: 'prod-shirt',
            name: 'Cotton Shirt',
            quantity: 1,
            unitPrice: 500,
            amount: 500,
          },
        ],
        staffName: 'Cashier John',
      };

      const result = calculateRefundOrderState(initialOrder, refundRequest);

      expect(result.isFullyRefunded).toBe(false);
      expect(result.updatedOrder.status).toBe('partially_refunded');
      expect(result.cumulativeRefundAmount).toBe(500);
      expect(result.updatedOrder.refundHistory).toHaveLength(1);
      expect(result.updatedOrder.refundHistory?.[0].creditNoteNumber).toBe('CN-1001-A');
      expect(result.mergedRefundedItems).toEqual([
        {
          id: 'prod-shirt',
          name: 'Cotton Shirt',
          quantity: 1,
          amount: 500,
        },
      ]);
    });

    it('should support sequential returns across days and transition to fully refunded', () => {
      const initialOrder = createMockOrder();

      // Step 1: Return 1 Shirt
      const refund1: RefundRequest = {
        orderNumber: 1001,
        creditNoteNumber: 'CN-1001-A',
        refundedAt: '2026-09-01T10:00:00Z',
        refundAmount: 500,
        refundMethod: 'CASH',
        refundReason: 'Color preference',
        restockInventory: true,
        refundedItems: [
          {
            id: 'prod-shirt',
            name: 'Cotton Shirt',
            quantity: 1,
            unitPrice: 500,
            amount: 500,
          },
        ],
      };
      const stateAfterFirst = calculateRefundOrderState(initialOrder, refund1);
      expect(stateAfterFirst.updatedOrder.status).toBe('partially_refunded');
      expect(stateAfterFirst.cumulativeRefundAmount).toBe(500);

      // Step 2: Return remaining Shirt and the Socks on Day 2
      const refund2: RefundRequest = {
        orderNumber: 1001,
        creditNoteNumber: 'CN-1001-B',
        refundedAt: '2026-09-02T14:30:00Z',
        refundAmount: 600, // 500 + 100
        refundMethod: 'CASH',
        refundReason: 'Customer moving out',
        restockInventory: true,
        refundedItems: [
          {
            id: 'prod-shirt',
            name: 'Cotton Shirt',
            quantity: 1,
            unitPrice: 500,
            amount: 500,
          },
          {
            id: 'prod-socks',
            name: 'Woolen Socks',
            quantity: 1,
            unitPrice: 100,
            amount: 100,
          },
        ],
      };
      const stateAfterSecond = calculateRefundOrderState(stateAfterFirst.updatedOrder, refund2);

      expect(stateAfterSecond.isFullyRefunded).toBe(true);
      expect(stateAfterSecond.updatedOrder.status).toBe('refunded');
      expect(stateAfterSecond.cumulativeRefundAmount).toBe(1100);
      expect(stateAfterSecond.updatedOrder.refundHistory).toHaveLength(2);
      expect(stateAfterSecond.updatedOrder.refundHistory?.[0].creditNoteNumber).toBe('CN-1001-A');
      expect(stateAfterSecond.updatedOrder.refundHistory?.[1].creditNoteNumber).toBe('CN-1001-B');

      // Verify merged quantities
      const shirtRefund = stateAfterSecond.mergedRefundedItems.find((r) => r.id === 'prod-shirt');
      expect(shirtRefund?.quantity).toBe(2);
      expect(shirtRefund?.amount).toBe(1000);

      const socksRefund = stateAfterSecond.mergedRefundedItems.find((r) => r.id === 'prod-socks');
      expect(socksRefund?.quantity).toBe(1);
      expect(socksRefund?.amount).toBe(100);
    });
  });

  describe('Inventory Restocking on Returns', () => {
    const mockCatalog: CatalogItem[] = [
      { id: 'prod-shirt', name: 'Cotton Shirt', price: 500, category: 'Apparel', stock: 15 },
      { id: 'prod-socks', name: 'Woolen Socks', price: 100, category: 'Apparel', stock: 5 },
    ];

    it('should increment catalog stock when restockInventory is true', () => {
      const returnedItems = [
        { id: 'prod-shirt', name: 'Cotton Shirt', quantity: 2 },
      ];

      const updatedCatalog = calculateRestockedCatalog(mockCatalog, returnedItems, true);
      const shirt = updatedCatalog.find((c) => c.id === 'prod-shirt');
      const socks = updatedCatalog.find((c) => c.id === 'prod-socks');

      expect(shirt?.stock).toBe(17); // 15 + 2
      expect(socks?.stock).toBe(5);  // unchanged
    });

    it('should NOT increment catalog stock when restockInventory is false (e.g. damaged goods)', () => {
      const returnedItems = [
        { id: 'prod-shirt', name: 'Cotton Shirt', quantity: 2 },
      ];

      const updatedCatalog = calculateRestockedCatalog(mockCatalog, returnedItems, false);
      const shirt = updatedCatalog.find((c) => c.id === 'prod-shirt');

      expect(shirt?.stock).toBe(15); // remains 15
    });
  });
});
