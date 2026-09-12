import { ActiveScreen, StaffMember, StaffRole, StorePermissions } from '../types';

export function normalizeRole(role?: string): 'OWNER' | 'MANAGER' | 'CASHIER' {
  if (!role) return 'CASHIER';
  const upper = role.toUpperCase();
  if (upper === 'OWNER' || upper === 'STORE OWNER') return 'OWNER';
  if (upper === 'MANAGER' || upper === 'STORE MANAGER') return 'MANAGER';
  return 'CASHIER';
}

export interface RoleMeta {
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  label: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

export const ROLE_DEFINITIONS: Record<'OWNER' | 'MANAGER' | 'CASHIER', RoleMeta> = {
  OWNER: {
    role: 'OWNER',
    label: 'Store Owner',
    badgeLabel: 'Owner',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    description: 'Full business administration, financial profit audits, cloud sync & staff management.',
  },
  MANAGER: {
    role: 'MANAGER',
    label: 'Store Manager',
    badgeLabel: 'Manager',
    badgeBg: 'bg-muted',
    badgeText: 'text-foreground',
    badgeBorder: 'border-border',
    description: 'Day-to-day operations, Z-Report cash reconciliation, purchase inward stock & cashier supervision.',
  },
  CASHIER: {
    role: 'CASHIER',
    label: 'Billing Cashier',
    badgeLabel: 'Cashier',
    badgeBg: 'bg-secondary',
    badgeText: 'text-secondary-foreground',
    badgeBorder: 'border-border',
    description: 'High-speed checkout, barcode scanning, Khata credit collection & customer receipts.',
  },
};

/**
 * Checks whether a given role can directly access a screen without manager elevation.
 */
export function canAccessScreen(roleRaw?: string, screen?: ActiveScreen): boolean {
  if (!screen) return true;
  const role = normalizeRole(roleRaw);

  if (role === 'OWNER') {
    return true; // Owner has access to everything
  }

  if (role === 'MANAGER') {
    // Manager has access to everything except Staff PINs/Creation (Owner only)
    if (screen === 'staff-management') return false;
    return true;
  }

  if (role === 'CASHIER') {
    // Cashier allowed screens
    const cashierAllowed: ActiveScreen[] = [
      'item-wise',
      'quick-bill',
      'customers',
      'credit-ledger',
      'training-videos',
    ];
    return cashierAllowed.includes(screen);
  }

  return false;
}

/**
 * Screen requirement labels when locked
 */
export function getRequiredRoleForScreen(screen: ActiveScreen): 'OWNER' | 'MANAGER' {
  if (screen === 'staff-management') return 'OWNER';
  return 'MANAGER';
}

/**
 * Checks if the role is permitted to see wholesale cost prices and gross margins.
 */
export function canViewCostPrice(roleRaw?: string, permissions?: StorePermissions): boolean {
  const role = normalizeRole(roleRaw);
  if (role === 'OWNER') return true;
  if (role === 'MANAGER') {
    return permissions?.manager ? permissions.manager.viewCostPrice : true;
  }
  return false;
}

/**
 * Checks if the role is permitted to delete or void a finalized order.
 */
export function canDeleteOrder(roleRaw?: string, permissions?: StorePermissions): boolean {
  const role = normalizeRole(roleRaw);
  if (role === 'OWNER') return true;
  if (role === 'MANAGER') {
    return permissions?.manager ? permissions.manager.allowBillVoid : true;
  }
  return false;
}

/**
 * Checks if staff role can sell on customer credit (Khata) without manager elevation.
 */
export function canStaffSellKhata(roleRaw?: string, permissions?: StorePermissions): boolean {
  const role = normalizeRole(roleRaw);
  if (role === 'OWNER' || role === 'MANAGER') return true;
  return permissions?.staff ? permissions.staff.allowKhata : false;
}

/**
 * Checks if staff role can modify cart item unit prices without manager elevation.
 */
export function canStaffOverridePrice(roleRaw?: string, permissions?: StorePermissions): boolean {
  const role = normalizeRole(roleRaw);
  if (role === 'OWNER' || role === 'MANAGER') return true;
  return permissions?.staff ? permissions.staff.allowPriceOverride : false;
}

/**
 * Checks if staff role can receive supplier crates / stock inward without manager elevation.
 */
export function canStaffInwardStock(roleRaw?: string, permissions?: StorePermissions): boolean {
  const role = normalizeRole(roleRaw);
  if (role === 'OWNER' || role === 'MANAGER') return true;
  return permissions?.staff ? permissions.staff.allowStockInward : true;
}

/**
 * Checks if the role can manage staff and view/reset staff PINs.
 */
export function canManageStaff(roleRaw?: string): boolean {
  const role = normalizeRole(roleRaw);
  return role === 'OWNER';
}

/**
 * Checks if the role can initiate Google Account Cloud Sync or reset cloud database.
 */
export function canAccessCloudSync(roleRaw?: string): boolean {
  const role = normalizeRole(roleRaw);
  return role === 'OWNER';
}

/**
 * Validates a PIN strictly against active Store Owner staff.
 * Hierarchy Rule: Only the Owner (via Owner PIN) can change store permissions.
 */
export function verifyOwnerPin(
  pin: string,
  staffList: StaffMember[]
): { verified: boolean; staff?: StaffMember } {
  const cleaned = pin.trim();
  const found = staffList.find(
    (s) => s.active && s.pin === cleaned && normalizeRole(s.role) === 'OWNER'
  );

  if (found) {
    return { verified: true, staff: found };
  }
  return { verified: false };
}

/**
 * Validates a PIN against manager or owner staff members.
 */
export function verifyManagerOrOwnerPin(
  pin: string,
  staffList: StaffMember[]
): { verified: boolean; staff?: StaffMember } {
  const cleaned = pin.trim();
  const found = staffList.find(
    (s) =>
      s.active &&
      s.pin === cleaned &&
      (normalizeRole(s.role) === 'OWNER' || normalizeRole(s.role) === 'MANAGER')
  );

  if (found) {
    return { verified: true, staff: found };
  }
  return { verified: false };
}
