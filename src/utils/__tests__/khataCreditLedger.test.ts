import { describe, it, expect } from 'vitest';
import {
  calculateCustomerCreditUpdate,
  calculateCustomerSettlement,
} from '../retailCalculations';
import { Customer } from '../../types';

describe('Customer Khata (Credit Ledger) & Loyalty Suite', () => {
  const mockCustomer: Customer = {
    id: 'cust-101',
    name: 'Sharma Ji',
    phone: '9876543210',
    creditBalance: 150.0,
    creditLimit: 5000.0,
    loyaltyPoints: 50,
    totalOrders: 10,
  };

  describe('Credit Sales & Loyalty Accrual', () => {
    it('should increment customer creditBalance when selling on Khata', () => {
      const updated = calculateCustomerCreditUpdate(
        mockCustomer,
        350.0, // Credit to add
        350.0, // Grand Total
        0,     // Points redeemed
        { enableLoyalty: true, earnSpendRate: 100 }
      );

      expect(updated.creditBalance).toBe(500.0); // 150 + 350
      expect(updated.totalOrders).toBe(11);      // 10 + 1
      expect(updated.loyaltyPoints).toBe(53);     // 50 + floor(350/100) = 53
    });

    it('should deduct redeemed loyalty points and add newly earned points', () => {
      const updated = calculateCustomerCreditUpdate(
        mockCustomer,
        0,     // Cash sale (no credit added)
        500.0, // Grand Total
        30,    // Redeemed 30 points
        { enableLoyalty: true, earnSpendRate: 100 } // Earns 5 points
      );

      expect(updated.creditBalance).toBe(150.0); // Unchanged
      expect(updated.loyaltyPoints).toBe(25);     // 50 - 30 + 5 = 25
    });

    it('should safely handle disabled loyalty configuration', () => {
      const updated = calculateCustomerCreditUpdate(
        mockCustomer,
        200.0,
        200.0,
        0,
        { enableLoyalty: false }
      );

      expect(updated.creditBalance).toBe(350.0);
      expect(updated.loyaltyPoints).toBe(50); // Points don't change
    });
  });

  describe('Customer Debt Settlement (Khata Repayment)', () => {
    it('should handle partial debt repayment accurately', () => {
      const { updatedCustomer, settledAmount, remainingBalance } = calculateCustomerSettlement(
        mockCustomer,
        100.0 // Paying ₹100 out of ₹150 debt
      );

      expect(settledAmount).toBe(100.0);
      expect(remainingBalance).toBe(50.0);
      expect(updatedCustomer.creditBalance).toBe(50.0);
    });

    it('should handle exact full debt repayment', () => {
      const { updatedCustomer, settledAmount, remainingBalance } = calculateCustomerSettlement(
        mockCustomer,
        150.0 // Full settlement
      );

      expect(settledAmount).toBe(150.0);
      expect(remainingBalance).toBe(0.0);
      expect(updatedCustomer.creditBalance).toBe(0.0);
    });

    it('should cap settlement if customer pays more than current balance and prevent negative balances', () => {
      const { updatedCustomer, settledAmount, remainingBalance } = calculateCustomerSettlement(
        mockCustomer,
        500.0 // Trying to pay ₹500 on ₹150 debt
      );

      expect(settledAmount).toBe(150.0); // Capped at current balance
      expect(remainingBalance).toBe(0.0);
      expect(updatedCustomer.creditBalance).toBe(0.0);
    });
  });
});
