import React from 'react';
import {
  X,
  Layers,
  Zap,
  FileSpreadsheet,
  Package,
  CreditCard,
  Wallet,
  UserCheck,
  Printer,
  ChevronRight,
  Lock,
  Settings,
} from 'lucide-react';
import { ActiveScreen, ShopSettings, StaffRole } from '../types';
import { User } from '../firebase';
import { PWAInstallButton } from './PWAInstallButton';
import {
  normalizeRole,
  ROLE_DEFINITIONS,
  canAccessScreen,
  getRequiredRoleForScreen,
} from '../utils/permissions';

export interface NavigationDrawerProps {
  isOpen: boolean;
  activeScreen: ActiveScreen;
  shopSettings: ShopSettings;
  activeStaffName: string;
  activeStaffRole?: StaffRole;
  user?: User | null;
  heldOrdersCount?: number;
  isSyncing?: boolean;
  onOpenHeldOrders?: () => void;
  onSelectScreen: (screen: ActiveScreen) => void;
  onClose: () => void;
  onOpenScanner?: (mode?: 'add-to-bill' | 'price-check' | 'search') => void;
  onOpenCloudModal?: () => void;
  onOpenStaffSwitch?: () => void;
  onRequestManagerOverride?: (screen: ActiveScreen) => void;
  onOpenPermissionsModal?: () => void;
  onOpenZReport?: () => void;
}

interface MenuItem {
  id: ActiveScreen;
  label: string;
  description: string;
  icon: React.ElementType;
}

interface MenuGroup {
  groupTitle: string;
  items: MenuItem[];
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  activeScreen,
  shopSettings,
  activeStaffName,
  activeStaffRole = 'CASHIER',
  isSyncing = false,
  onSelectScreen,
  onClose,
  onRequestManagerOverride,
  onOpenCloudModal,
}) => {
  if (!isOpen) return null;

  const currentRole = normalizeRole(activeStaffRole);
  const roleMeta = ROLE_DEFINITIONS[currentRole];

  const menuGroups: MenuGroup[] = [
    {
      groupTitle: 'BILLING REGISTERS',
      items: [
        {
          id: 'item-wise',
          label: 'Items Register',
          description: 'Barcode & Menu billing',
          icon: Layers,
        },
        {
          id: 'quick-bill',
          label: 'Keypad Register',
          description: 'Fast Calculator billing',
          icon: Zap,
        },
      ],
    },
    {
      groupTitle: 'STORE OPERATIONS',
      items: [
        {
          id: 'cash-management',
          label: 'Galla / Cash Drawer',
          description: 'Cash In, Cash Out & daily balance',
          icon: Wallet,
        },
        {
          id: 'credit-ledger',
          label: 'Customer Khata (Udhar)',
          description: 'Customer balance & credit limits',
          icon: CreditCard,
        },
        {
          id: 'categories-products',
          label: 'Products & Stock',
          description: 'Manage items & inventory',
          icon: Package,
        },
      ],
    },
    {
      groupTitle: 'ADMIN & SETTINGS (Owner PIN)',
      items: [
        {
          id: 'reports',
          label: 'Sales & Tax Reports (GSTR-1)',
          description: 'Daily sales summary & GST export',
          icon: FileSpreadsheet,
        },
        {
          id: 'staff-management',
          label: 'Staff & Store Policy',
          description: 'Terminal operators & security policies',
          icon: UserCheck,
        },
        {
          id: 'print-settings',
          label: 'Store & Admin Settings',
          description: 'Printer, UPI, Cloud & Advanced Diagnostics',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-80 max-w-[85vw] bg-card h-full shadow-2xl flex flex-col z-10 border-r border-border">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs">
              M
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground leading-none">
                MonoPOS • {shopSettings.shopName || 'Anand Supermarket'}
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                <span className="text-xs font-medium text-muted-foreground">
                  {activeStaffName} ({roleMeta.label})
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Navigation Items grouped cleanly */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <div className="px-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.groupTitle}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;
                  const isAccessible = canAccessScreen(currentRole, item.id);
                  const reqRole = getRequiredRoleForScreen(item.id);

                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      onClick={() => {
                        if (isAccessible) {
                          onSelectScreen(item.id);
                          onClose();
                        } else if (onRequestManagerOverride) {
                          onClose();
                          onRequestManagerOverride(item.id);
                        }
                      }}
                      className={`w-full p-2.5 rounded-lg flex items-center gap-3 transition-all text-left cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : isAccessible
                          ? 'hover:bg-muted text-foreground'
                          : 'hover:bg-amber-500/10 text-foreground opacity-85'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : isAccessible
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={`text-xs font-semibold leading-tight ${
                              isActive ? 'text-primary-foreground' : 'text-foreground'
                            }`}
                          >
                            {item.label}
                          </p>
                          {!isAccessible && (
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-amber-500/30">
                              <Lock className="w-2.5 h-2.5" />
                              {reqRole}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs truncate mt-0.5 ${
                            isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                      {isAccessible ? (
                        <ChevronRight
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`}
                        />
                      ) : (
                        <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* PWA In-App Install Card */}
        <div className="px-3 pt-1 pb-1">
          <PWAInstallButton variant="sidebar" />
        </div>

        {/* Store Information & Cloud Sync Footer */}
        <div className="p-3 border-t border-border bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isSyncing
                  ? 'bg-primary animate-ping'
                  : navigator.onLine !== false
                  ? 'bg-primary'
                  : 'bg-muted-foreground'
              }`}
            />
            <span className="font-medium text-xs text-foreground">
              Cloud Status: {isSyncing ? 'Syncing...' : navigator.onLine !== false ? 'Live (Protected)' : 'Offline'}
            </span>
          </div>
          <span className="text-xs font-medium bg-card text-foreground px-2 py-0.5 rounded-md border border-border shadow-xs">
            58mm POS
          </span>
        </div>
      </div>
    </div>
  );
};
