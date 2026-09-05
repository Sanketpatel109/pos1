import { ActiveScreen, StaffMember, StaffRole } from '../types';

export function normalizeRole(role?: string): 'OWNER' | 'MANAGER' | 'CASHIER' | 'WORKER' {
  if (!role) return 'CASHIER';
  const upper = role.toUpperCase();
  if (upper === 'OWNER' || upper === 'STORE OWNER') return 'OWNER';
  if (upper === 'MANAGER' || upper === 'STORE MANAGER') return 'MANAGER';
  if (upper === 'WORKER' || upper === 'WAITER' || upper === 'HELPER') return 'WORKER';
  return 'CASHIER';
}

export interface RoleMeta {
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'WORKER';
  label: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

export const ROLE_DEFINITIONS: Record<'OWNER' | 'MANAGER' | 'CASHIER' | 'WORKER', RoleMeta> = {
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
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-900',
    badgeBorder: 'border-indigo-300',
    description: 'Day-to-day operations, Z-Report cash reconciliation, purchase inward stock & cashier supervision.',
  },
  CASHIER: {
    role: 'CASHIER',
    label: 'Billing Cashier',
    badgeLabel: 'Cashier',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
    description: 'High-speed checkout, barcode scanning, Khata credit collection & customer receipts.',
  },
  WORKER: {
    role: 'WORKER',
    label: 'Store Floor Worker',
    badgeLabel: 'Floor Worker',
    badgeBg: 'bg-zinc-100',
    badgeText: 'text-zinc-800',
    badgeBorder: 'border-zinc-300',
    description: 'Aisle stocktaking, barcode label printing, delivery receiving & basic checkout.',
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

  if (role === 'WORKER') {
    // Worker allowed screens
    const workerAllowed: ActiveScreen[] = [
      'item-wise',
      'quick-bill',
      'purchase-inward',
      'barcode-generator',
      'training-videos',
    ];
    return workerAllowed.includes(screen);
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
export function canViewCostPrice(roleRaw?: string): boolean {
  const role = normalizeRole(roleRaw);
  return role === 'OWNER' || role === 'MANAGER';
}

/**
 * Checks if the role is permitted to delete or void a finalized order.
 */
export function canDeleteOrder(roleRaw?: string): boolean {
  const role = normalizeRole(roleRaw);
  return role === 'OWNER' || role === 'MANAGER';
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
