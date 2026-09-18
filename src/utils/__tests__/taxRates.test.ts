import { describe, it, expect } from 'vitest';
import {
  GST_SLABS,
  calculateItemTaxSnapshot,
  calculateOrderTaxFromSnapshot,
} from '../../constants/taxRates';

describe('GST Tax Rates & Calculation Engine', () => {
  describe('Statutory GST Slabs', () => {
    it('should include all statutory Indian GST tax slabs', () => {
      const rates = GST_SLABS.map((s) => s.rate);
      expect(rates).toContain(0);
      expect(rates).toContain(0.25);
      expect(rates).toContain(3);
      expect(rates).toContain(5);
      expect(rates).toContain(12);
      expect(rates).toContain(18);
      expect(rates).toContain(28);
      expect(rates).toContain(-1); // Custom slab option
    });
  });

  describe('calculateItemTaxSnapshot', () => {
    it('should compute exact CGST and SGST split (5% on ₹100 item)', () => {
      const snapshot = calculateItemTaxSnapshot(100, 1, 5);
      expect(snapshot.taxableAmount).toBe(100.0);
      expect(snapshot.totalTax).toBe(5.0);
      expect(snapshot.cgst).toBe(2.5);
      expect(snapshot.sgst).toBe(2.5);
      expect(snapshot.itemTotal).toBe(105.0);
      expect(snapshot.gstRate).toBe(5);
    });

    it('should calculate 18% GST on multiple quantities (2 x ₹50)', () => {
      const snapshot = calculateItemTaxSnapshot(50, 2, 18);
      expect(snapshot.taxableAmount).toBe(100.0);
      expect(snapshot.totalTax).toBe(18.0);
      expect(snapshot.cgst).toBe(9.0);
      expect(snapshot.sgst).toBe(9.0);
      expect(snapshot.itemTotal).toBe(118.0);
    });

    it('should handle exempt (0% GST) items correctly', () => {
      const snapshot = calculateItemTaxSnapshot(250, 4, 0);
      expect(snapshot.taxableAmount).toBe(1000.0);
      expect(snapshot.totalTax).toBe(0.0);
      expect(snapshot.cgst).toBe(0.0);
      expect(snapshot.sgst).toBe(0.0);
      expect(snapshot.itemTotal).toBe(1000.0);
    });

    it('should handle fractional pricing and decimal rounding accurately', () => {
      const snapshot = calculateItemTaxSnapshot(33.33, 3, 12);
      expect(snapshot.taxableAmount).toBe(99.99);
      // 99.99 * 0.12 = 11.9988 -> 12.00
      expect(snapshot.totalTax).toBe(12.0);
      expect(snapshot.cgst).toBe(6.0);
      expect(snapshot.sgst).toBe(6.0);
      expect(snapshot.itemTotal).toBe(111.99);
    });

    it('should safely fallback for negative or invalid parameters', () => {
      const snapshot = calculateItemTaxSnapshot(-10, -5, -18);
      expect(snapshot.taxableAmount).toBe(0.0);
      expect(snapshot.totalTax).toBe(0.0);
      expect(snapshot.cgst).toBe(0.0);
      expect(snapshot.sgst).toBe(0.0);
    });
  });

  describe('calculateOrderTaxFromSnapshot', () => {
    it('should return zero totals for empty cart', () => {
      const totals = calculateOrderTaxFromSnapshot([]);
      expect(totals.taxableSubtotal).toBe(0);
      expect(totals.totalTax).toBe(0);
      expect(totals.taxRateBreakdown).toHaveLength(0);
    });

    it('should correctly aggregate mixed multi-slab items (5%, 12%, 18%)', () => {
      const items = [
        { unitPrice: 100, quantity: 1, gstRate: 5 },  // Taxable: 100, Tax: 5 (CGST: 2.5, SGST: 2.5)
        { unitPrice: 200, quantity: 1, gstRate: 12 }, // Taxable: 200, Tax: 24 (CGST: 12, SGST: 12)
        { unitPrice: 100, quantity: 2, gstRate: 18 }, // Taxable: 200, Tax: 36 (CGST: 18, SGST: 18)
      ];

      const totals = calculateOrderTaxFromSnapshot(items);

      expect(totals.taxableSubtotal).toBe(500.0);
      expect(totals.totalCgst).toBe(32.5); // 2.5 + 12 + 18
      expect(totals.totalSgst).toBe(32.5);
      expect(totals.totalTax).toBe(65.0);
      expect(totals.taxRateBreakdown).toHaveLength(3);

      const slab5 = totals.taxRateBreakdown.find((b) => b.gstRate === 5);
      expect(slab5).toBeDefined();
      expect(slab5?.taxableAmount).toBe(100.0);
      expect(slab5?.totalTax).toBe(5.0);

      const slab12 = totals.taxRateBreakdown.find((b) => b.gstRate === 12);
      expect(slab12).toBeDefined();
      expect(slab12?.taxableAmount).toBe(200.0);
      expect(slab12?.totalTax).toBe(24.0);

      const slab18 = totals.taxRateBreakdown.find((b) => b.gstRate === 18);
      expect(slab18).toBeDefined();
      expect(slab18?.taxableAmount).toBe(200.0);
      expect(slab18?.totalTax).toBe(36.0);
    });

    it('should preserve immutable snapshots for historical invoices', () => {
      // Historical item with frozen snapshot values
      const historicalItems = [
        {
          unitPrice: 150,
          quantity: 2,
          gstRate: 5,
          taxableAmount: 300,
          cgst: 7.5,
          sgst: 7.5,
        },
      ];

      const totals = calculateOrderTaxFromSnapshot(historicalItems);
      expect(totals.taxableSubtotal).toBe(300.0);
      expect(totals.totalCgst).toBe(7.5);
      expect(totals.totalSgst).toBe(7.5);
      expect(totals.totalTax).toBe(15.0);
    });
  });
});
