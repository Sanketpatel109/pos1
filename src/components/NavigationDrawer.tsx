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
  Crown,
  LogOut,
  Sparkles,
  Barcode,
  Tag,
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
import { LicenseStatus } from '../services/subscriptionService';
import { SubscriptionStatusInfo } from '../store/useSubscriptionStore';

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
  onOpenSubscription?: () => void;
  onOpenOffers?: () => void;
  offersCount?: number;
  onSignOut?: () => void;
  licenseStatus?: LicenseStatus | null;
  subscriptionStatusInfo?: SubscriptionStatusInfo;
  onOpenSubscriptionSettings?: () => void;
}

interface MenuItem {
  id: ActiveScreen | 'offers';
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
  user = null,
  isSyncing = false,
  onSelectScreen,
  onClose,
  onRequestManagerOverride,
  onOpenStaffSwitch,
  onOpenSubscription,
  onOpenOffers,
  offersCount,
  onSignOut,
  licenseStatus,
  subscriptionStatusInfo,
  onOpenSubscriptionSettings,
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
          label: 'Catalog & Barcode Billing',
          description: 'Product catalog & laser barcode billing',
          icon: Layers,
        },
        {
          id: 'quick-bill',
          label: 'Quick Numpad Register',
          description: 'Fast calculator & custom amount billing',
          icon: Zap,
        },
      ],
    },
    {
      groupTitle: 'STORE OPERATIONS',
      items: [
        {
          id: 'cash-management',
          label: 'Cash Drawer (Till / Galla)',
          description: 'Cash In, Cash Out & denomination count',
          icon: Wallet,
        },
        {
          id: 'credit-ledger',
          label: 'Customer Credit & Khata',
          description: 'Khata ledger, credit limits & WhatsApp',
          icon: CreditCard,
        },
        {
          id: 'categories-products',
          label: 'Products & Stock Inventory',
          description: 'Manage items, barcodes & stock levels',
          icon: Package,
        },
        {
          id: 'offers',
          label: 'Offers & Promotions',
          description: 'Combo bundles, BOGO & cart deals',
          icon: Tag,
        },
        {
          id: 'barcode-generator',
          label: 'Barcode Label Generator',
          description: 'Print thermal & A4 sticker sheets',
          icon: Barcode,
        },
      ],
    },
    {
      groupTitle: 'ADMIN & SETTINGS (Owner PIN)',
      items: [
        {
          id: 'reports',
          label: 'Sales & Tax Reports (GSTR-1)',
          description: 'Daily sales summary & GST tax export',
          icon: FileSpreadsheet,
        },
        {
          id: 'staff-management',
          label: 'Staff & Store Policies',
          description: 'Terminal operators & security policies',
          icon: UserCheck,
        },
        {
          id: 'print-settings',
          label: 'Store & Hardware Settings',
          description: 'Printer, UPI, Cloud & Hardware Config',
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
      <div className="relative w-84 max-w-[85vw] bg-card h-full shadow-2xl flex flex-col z-10 border-r border-border">
        {/* Store Brand Header */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              M
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-foreground leading-none truncate">
                {shopSettings.shopName || 'MonoPOS Retail'}
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-primary inline-block shrink-0" />
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {activeStaffName}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                  {roleMeta.badgeLabel || currentRole}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subscription / Plan Quick Pill */}
        {onOpenSubscription && (
          <div className="px-3 pt-2 pb-1 bg-muted/20 border-b border-border/50">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSubscription();
              }}
              className="w-full py-1.5 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/20 text-xs font-semibold text-primary flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>Plan: {licenseStatus?.displayLabel || 'Free Trial'}</span>
              </div>
              <span className="text-[11px] font-bold opacity-80">Manage →</span>
            </button>
          </div>
        )}

        {/* Quick Shift / Operator Switcher Bar */}
        {onOpenStaffSwitch && (
          <div className="px-3 pt-1.5 pb-1.5 border-b border-border/60 bg-muted/30">
            <button
              type="button"
              id="btn-drawer-switch-staff"
              onClick={() => {
                onClose();
                onOpenStaffSwitch();
              }}
              className="w-full py-1.5 px-2.5 rounded-lg bg-card hover:bg-muted border border-border text-xs font-semibold text-foreground flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                <span>Switch Shift / Lock PIN</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-normal">Change →</span>
            </button>
          </div>
        )}

        {/* Menu Navigation Items grouped cleanly */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <div className="px-2 pb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {group.groupTitle}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isOffersItem = item.id === 'offers';
                  const isActive = activeScreen === item.id;
                  const isAccessible = isOffersItem
                    ? true
                    : canAccessScreen(currentRole, item.id as ActiveScreen);
                  const reqRole = isOffersItem
                    ? ''
                    : getRequiredRoleForScreen(item.id as ActiveScreen);

                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      onClick={() => {
                        if (isOffersItem) {
                          onClose();
                          if (onOpenOffers) onOpenOffers();
                          return;
                        }
                        if (isAccessible) {
                          onSelectScreen(item.id as ActiveScreen);
                          onClose();
                        } else if (onRequestManagerOverride) {
                          onClose();
                          onRequestManagerOverride(item.id as ActiveScreen);
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
                          {isOffersItem && typeof offersCount === 'number' && offersCount > 0 && (
                            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                              {offersCount} Active
                            </span>
                          )}
                          {!isAccessible && (
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-amber-500/30">
                              <Lock className="w-2.5 h-2.5" />
                              {reqRole}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
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

        {/* User Account / Sign Out Section */}
        {user && onSignOut && (
          <div className="p-3 border-t border-border bg-card flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Owner'}
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-border"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'O'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">
                  {user.displayName || 'Store Owner'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer shrink-0"
              title="Sign Out of Store Account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Minimal Subscription Status Pill Footer */}
        {subscriptionStatusInfo && (
          <div className="px-2.5 py-1.5 border-t border-border bg-card/60">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenSubscriptionSettings) {
                  onOpenSubscriptionSettings();
                } else if (onOpenSubscription) {
                  onOpenSubscription();
                }
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`size-2 rounded-full shrink-0 ${
                    subscriptionStatusInfo.dotColor === 'green'
                      ? 'bg-emerald-500'
                      : subscriptionStatusInfo.dotColor === 'amber'
                      ? 'bg-amber-500'
                      : 'bg-destructive'
                  }`}
                />
                <span className="font-semibold text-xs text-foreground truncate">
                  {subscriptionStatusInfo.label}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground hover:text-foreground font-medium">
                Manage →
              </span>
            </button>
          </div>
        )}

        {/* Cloud Sync & Thermal Paper Format Footer */}
        <div className="p-2.5 border-t border-border bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isSyncing
                  ? 'bg-primary animate-ping'
                  : navigator.onLine !== false
                  ? 'bg-emerald-500'
                  : 'bg-muted-foreground'
              }`}
            />
            <span className="font-medium text-[11px] text-foreground">
              {isSyncing ? 'Syncing...' : navigator.onLine !== false ? 'Cloud Live' : 'Offline Mode'}
            </span>
          </div>
          <span className="text-[10px] font-semibold bg-card text-foreground px-2 py-0.5 rounded border border-border shadow-2xs">
            {shopSettings.printerPaperWidth || shopSettings.paperWidth || '58mm'} Thermal
          </span>
        </div>
      </div>
    </div>
  );
};
