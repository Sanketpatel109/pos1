import { describe, it, expect } from 'vitest';
import {
  calculateInwardStockUpdates,
  calculateStockDeductionsOnSale,
} from '../retailCalculations';
import { CatalogItem, InwardStockEntry, BillItem } from '../../types';

describe('Inventory & Stock Management Suite', () => {
  const mockCatalog: CatalogItem[] = [
    {
      id: 'prod-milk',
      name: 'Full Cream Milk 1L',
      price: 66,
      costPrice: 58,
      category: 'Dairy',
      stock: 20,
    },
    {
      id: 'prod-biscuits',
      name: 'Butter Biscuits',
      price: 30,
      costPrice: 22,
      category: 'Bakery',
      stock: 50,
    },
  ];

  describe('Purchase Inward Receiving', () => {
    it('should accurately increase product stock and update cost price', () => {
      const inwardEntry: InwardStockEntry = {
        id: 'inward-001',
        supplierName: 'Amul Dairy Distributor',
        invoiceNumber: 'INV-9821',
        date: new Date().toISOString(),
        items: [
          {
            productId: 'prod-milk',
            productName: 'Full Cream Milk 1L',
            quantity: 30,
            unitCost: 59.5, // New wholesale cost price
          },
        ],
        totalAmount: 1785,
        receivedBy: 'Manager Dave',
      };

      const updated = calculateInwardStockUpdates(mockCatalog, inwardEntry);
      const milk = updated.find((p) => p.id === 'prod-milk');
      const biscuits = updated.find((p) => p.id === 'prod-biscuits');

      expect(milk?.stock).toBe(50); // 20 + 30
      expect(milk?.costPrice).toBe(59.5);
      expect(biscuits?.stock).toBe(50); // Untouched
    });

    it('should handle multi-item inward entries with different quantities', () => {
      const inwardEntry: InwardStockEntry = {
        id: 'inward-002',
        supplierName: 'Metro Cash & Carry',
        invoiceNumber: 'INV-5544',
        date: new Date().toISOString(),
        items: [
          { productId: 'prod-milk', productName: 'Full Cream Milk 1L', quantity: 10, unitCost: 58 },
          { productId: 'prod-biscuits', productName: 'Butter Biscuits', quantity: 25, unitCost: 21 },
        ],
        totalAmount: 1105,
        receivedBy: 'Owner',
      };

      const updated = calculateInwardStockUpdates(mockCatalog, inwardEntry);
      expect(updated.find((p) => p.id === 'prod-milk')?.stock).toBe(30); // 20 + 10
      expect(updated.find((p) => p.id === 'prod-biscuits')?.stock).toBe(75); // 50 + 25
    });
  });

  describe('Stock Deductions on Sale Settlement', () => {
    it('should deduct standard single item quantities from inventory', () => {
      const soldItems: BillItem[] = [
        { id: 'prod-milk', name: 'Full Cream Milk 1L', unitPrice: 66, quantity: 3 },
      ];

      const updated = calculateStockDeductionsOnSale(mockCatalog, soldItems);
      const milk = updated.find((p) => p.id === 'prod-milk');
      expect(milk?.stock).toBe(17); // 20 - 3
    });

    it('should correctly multiply deduction for bulk packaging options (e.g. Pack of 6)', () => {
      const soldItems: BillItem[] = [
        {
          id: 'prod-biscuits-pack-6',
          itemId: 'prod-biscuits',
          name: 'Butter Biscuits (Box of 6)',
          unitPrice: 170,
          quantity: 2, // 2 boxes
          multiplier: 6, // 2 * 6 = 12 base units
        },
      ];

      const updated = calculateStockDeductionsOnSale(mockCatalog, soldItems);
      const biscuits = updated.find((p) => p.id === 'prod-biscuits');
      expect(biscuits?.stock).toBe(38); // 50 - 12
    });

    it('should clamp stock to zero and never produce negative stock', () => {
      const soldItems: BillItem[] = [
        { id: 'prod-milk', name: 'Full Cream Milk 1L', unitPrice: 66, quantity: 999 },
      ];

      const updated = calculateStockDeductionsOnSale(mockCatalog, soldItems);
      const milk = updated.find((p) => p.id === 'prod-milk');
      expect(milk?.stock).toBe(0);
    });
  });
});
