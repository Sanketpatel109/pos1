import { describe, it, expect } from 'vitest';
import {
  normalizeRole,
  canAccessScreen,
  canViewCostPrice,
  canDeleteOrder,
  canStaffSellKhata,
  canStaffOverridePrice,
  canStaffInwardStock,
  verifyOwnerPin,
  verifyManagerOrOwnerPin,
} from '../permissions';
import { StaffMember, StorePermissions } from '../../types';

describe('Role-Based Access Control (RBAC) & Permissions Engine', () => {
  describe('normalizeRole', () => {
    it('should normalize valid owner inputs to OWNER', () => {
      expect(normalizeRole('OWNER')).toBe('OWNER');
      expect(normalizeRole('Store Owner')).toBe('OWNER');
      expect(normalizeRole('store owner')).toBe('OWNER');
    });

    it('should normalize manager inputs to MANAGER', () => {
      expect(normalizeRole('MANAGER')).toBe('MANAGER');
      expect(normalizeRole('Store Manager')).toBe('MANAGER');
      expect(normalizeRole('store manager')).toBe('MANAGER');
    });

    it('should fallback unknown, null, or cashier inputs to CASHIER', () => {
      expect(normalizeRole('CASHIER')).toBe('CASHIER');
      expect(normalizeRole('Billing Cashier')).toBe('CASHIER');
      expect(normalizeRole(undefined)).toBe('CASHIER');
      expect(normalizeRole('')).toBe('CASHIER');
      expect(normalizeRole('INTERN')).toBe('CASHIER');
    });
  });

  describe('canAccessScreen', () => {
    it('Store Owner should have unrestricted access to all screens', () => {
      expect(canAccessScreen('OWNER', 'staff-management')).toBe(true);
      expect(canAccessScreen('OWNER', 'reports')).toBe(true);
      expect(canAccessScreen('OWNER', 'categories-products')).toBe(true);
      expect(canAccessScreen('OWNER', 'print-settings')).toBe(true);
      expect(canAccessScreen('OWNER', 'quick-bill')).toBe(true);
    });

    it('Store Manager should access operational screens but NOT staff-management PIN settings', () => {
      expect(canAccessScreen('MANAGER', 'reports')).toBe(true);
      expect(canAccessScreen('MANAGER', 'categories-products')).toBe(true);
      expect(canAccessScreen('MANAGER', 'quick-bill')).toBe(true);
      expect(canAccessScreen('MANAGER', 'staff-management')).toBe(false);
    });

    it('Cashier should be locked out of reports, inventory, and staff management', () => {
      // Locked screens
      expect(canAccessScreen('CASHIER', 'reports')).toBe(false);
      expect(canAccessScreen('CASHIER', 'categories-products')).toBe(false);
      expect(canAccessScreen('CASHIER', 'staff-management')).toBe(false);
      expect(canAccessScreen('CASHIER', 'print-settings')).toBe(false);

      // Allowed screens
      expect(canAccessScreen('CASHIER', 'quick-bill')).toBe(true);
      expect(canAccessScreen('CASHIER', 'item-wise')).toBe(true);
      expect(canAccessScreen('CASHIER', 'customers')).toBe(true);
      expect(canAccessScreen('CASHIER', 'credit-ledger')).toBe(true);
    });
  });

  describe('Auditing and Cost Price Permissions', () => {
    const mockPermissions: StorePermissions = {
      staff: {
        allowPriceOverride: false,
        allowKhata: false,
        allowStockInward: true,
      },
      manager: {
        viewCostPrice: false,
        allowBillVoid: true,
      },
    };

    it('Owner should always be allowed to view wholesale cost prices', () => {
      expect(canViewCostPrice('OWNER', mockPermissions)).toBe(true);
    });

    it('Manager view cost price should respect store permission flags', () => {
      expect(canViewCostPrice('MANAGER', mockPermissions)).toBe(false);

      const permissive: StorePermissions = {
        ...mockPermissions,
        manager: { ...mockPermissions.manager, viewCostPrice: true },
      };
      expect(canViewCostPrice('MANAGER', permissive)).toBe(true);
    });

    it('Cashier should never be permitted to view wholesale cost prices', () => {
      expect(canViewCostPrice('CASHIER', mockPermissions)).toBe(false);
    });

    it('Owner can always void bills, manager follows permissions, cashier is denied', () => {
      expect(canDeleteOrder('OWNER', mockPermissions)).toBe(true);
      expect(canDeleteOrder('MANAGER', mockPermissions)).toBe(true);
      expect(canDeleteOrder('CASHIER', mockPermissions)).toBe(false);
    });
  });

  describe('Staff Operation Policies', () => {
    it('Cashier Khata and Price Override flags should follow store policy', () => {
      const restrictedPermissions: StorePermissions = {
        staff: {
          allowPriceOverride: false,
          allowKhata: false,
          allowStockInward: false,
        },
        manager: { viewCostPrice: true, allowBillVoid: true },
      };

      expect(canStaffSellKhata('CASHIER', restrictedPermissions)).toBe(false);
      expect(canStaffOverridePrice('CASHIER', restrictedPermissions)).toBe(false);
      expect(canStaffInwardStock('CASHIER', restrictedPermissions)).toBe(false);

      const openPermissions: StorePermissions = {
        ...restrictedPermissions,
        staff: {
          allowPriceOverride: true,
          allowKhata: true,
          allowStockInward: true,
        },
      };

      expect(canStaffSellKhata('CASHIER', openPermissions)).toBe(true);
      expect(canStaffOverridePrice('CASHIER', openPermissions)).toBe(true);
      expect(canStaffInwardStock('CASHIER', openPermissions)).toBe(true);
    });
  });

  describe('PIN Verification and Escalations', () => {
    const mockStaff: StaffMember[] = [
      {
        id: '1',
        name: 'Super Owner',
        role: 'OWNER',
        pin: '1234',
        active: true,
        phone: '9999999999',
      },
      {
        id: '2',
        name: 'Inactive Owner',
        role: 'OWNER',
        pin: '9999',
        active: false,
        phone: '8888888888',
      },
      {
        id: '3',
        name: 'Shift Manager',
        role: 'MANAGER',
        pin: '5678',
        active: true,
        phone: '7777777777',
      },
      {
        id: '4',
        name: 'Line Cashier',
        role: 'CASHIER',
        pin: '0000',
        active: true,
        phone: '6666666666',
      },
    ];

    it('verifyOwnerPin should only verify active Owner PINs', () => {
      // Correct active Owner PIN
      const res1 = verifyOwnerPin('1234', mockStaff);
      expect(res1.verified).toBe(true);
      expect(res1.staff?.name).toBe('Super Owner');

      // Manager PIN trying to pass as Owner
      const res2 = verifyOwnerPin('5678', mockStaff);
      expect(res2.verified).toBe(false);

      // Inactive Owner PIN
      const res3 = verifyOwnerPin('9999', mockStaff);
      expect(res3.verified).toBe(false);

      // Random incorrect PIN
      const res4 = verifyOwnerPin('1111', mockStaff);
      expect(res4.verified).toBe(false);
    });

    it('verifyManagerOrOwnerPin should verify both Manager and Owner PINs, but reject Cashier', () => {
      // Owner PIN
      expect(verifyManagerOrOwnerPin('1234', mockStaff).verified).toBe(true);

      // Manager PIN
      expect(verifyManagerOrOwnerPin('5678', mockStaff).verified).toBe(true);

      // Cashier PIN
      expect(verifyManagerOrOwnerPin('0000', mockStaff).verified).toBe(false);

      // Inactive Owner PIN
      expect(verifyManagerOrOwnerPin('9999', mockStaff).verified).toBe(false);
    });
  });
});
