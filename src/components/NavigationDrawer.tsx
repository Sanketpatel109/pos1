import React from 'react';
import {
  Layers,
  Zap,
  FileSpreadsheet,
  Package,
  CreditCard,
  Wallet,
  UserCheck,
  ChevronRight,
  Lock,
  Settings,
  LogOut,
  Barcode,
  Tag,
  TrendingUp,
  ArrowRightLeft,
  Cloud,
  Wifi,
  WifiOff,
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';

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
  const currentRole = normalizeRole(activeStaffRole);
  const roleMeta = ROLE_DEFINITIONS[currentRole];

  const menuGroups: MenuGroup[] = [
    {
      groupTitle: 'Billing Registers',
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
      groupTitle: 'Store Operations',
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
      groupTitle: 'Admin & Settings',
      items: [
        {
          id: 'analytics',
          label: 'Analytics & Insights',
          description: 'Sales velocity, hourly rush, margins & trends',
          icon: TrendingUp,
        },
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={true}
        className="!fixed !top-0 !left-0 !translate-x-0 !translate-y-0 !w-[340px] !max-w-[85vw] !h-full !max-h-none !rounded-none !rounded-r-xl !p-0 flex flex-col data-open:!animate-in data-open:!slide-in-from-left data-open:!duration-200 data-closed:!animate-out data-closed:!slide-out-to-left data-closed:!duration-150"
      >
        {/* ── Store Brand Header ─────────────────────────────────── */}
        <DialogHeader className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                {(shopSettings.shopName || 'M').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-bold text-foreground truncate">
                {shopSettings.shopName || 'MonoPOS Retail'}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 mt-1">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {activeStaffName}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-bold uppercase">
                  {roleMeta.badgeLabel || currentRole}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* ── Quick Shift / Operator Switcher ───────────────────── */}
        {onOpenStaffSwitch && (
          <div className="px-3 py-2">
            <Button
              id="btn-drawer-switch-staff"
              variant="outline"
              size="sm"
              className="w-full justify-between h-9 text-xs font-semibold"
              onClick={() => {
                onClose();
                onOpenStaffSwitch();
              }}
            >
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="size-3.5 text-primary" />
                Switch Shift / Lock PIN
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">Change →</span>
            </Button>
          </div>
        )}

        {/* ── Menu Navigation Items ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4 no-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <div className="px-1 pt-2 pb-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {group.groupTitle}
                </span>
              </div>

              <div className="space-y-0.5">
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
                    <Button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className={`w-full justify-start h-auto py-2.5 px-2.5 gap-3 text-left ${
                        isActive
                          ? 'shadow-xs'
                          : !isAccessible
                          ? 'opacity-80'
                          : ''
                      }`}
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
                    >
                      <div
                        className={`size-8 rounded-md flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : isAccessible
                            ? 'bg-muted text-foreground'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs font-semibold leading-tight ${
                              isActive ? 'text-primary-foreground' : 'text-foreground'
                            }`}
                          >
                            {item.label}
                          </span>
                          {isOffersItem && typeof offersCount === 'number' && offersCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {offersCount} Active
                            </Badge>
                          )}
                          {!isAccessible && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-amber-700 dark:text-amber-400 border-amber-500/40 bg-amber-500/10 gap-0.5">
                              <Lock className="size-2.5" />
                              {reqRole}
                            </Badge>
                          )}
                        </div>
                        <span
                          className={`text-[11px] truncate block mt-0.5 ${
                            isActive ? 'text-primary-foreground/75' : 'text-muted-foreground'
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                      {isAccessible ? (
                        <ChevronRight
                          className={`size-3.5 shrink-0 ${
                            isActive ? 'text-primary-foreground/60' : 'text-muted-foreground/50'
                          }`}
                        />
                      ) : (
                        <Lock className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── PWA Install ───────────────────────────────────────── */}
        <div className="px-3 py-1">
          <PWAInstallButton variant="sidebar" />
        </div>

        {/* ── User Account Section ──────────────────────────────── */}
        {user && onSignOut && (
          <>
            <Separator />
            <div className="p-3">
              <Card className="border-border/60">
                <CardContent className="p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="size-8 rounded-full">
                      {user.photoURL ? (
                        <AvatarImage src={user.photoURL} alt={user.displayName || 'Owner'} />
                      ) : null}
                      <AvatarFallback className="rounded-full bg-primary/15 text-primary text-xs font-bold">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'O'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {user.displayName || 'Store Owner'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    title="Sign Out of Store Account"
                    className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* ── Subscription Status ───────────────────────────────── */}
        {subscriptionStatusInfo && (
          <div className="px-3 pb-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-8 text-xs"
              onClick={() => {
                onClose();
                if (onOpenSubscriptionSettings) {
                  onOpenSubscriptionSettings();
                } else if (onOpenSubscription) {
                  onOpenSubscription();
                }
              }}
            >
              <span className="flex items-center gap-2 min-w-0">
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
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                Manage →
              </span>
            </Button>
          </div>
        )}

        {/* ── Cloud Sync & Thermal Footer ───────────────────────── */}
        <Separator />
        <div className="px-3 py-2 flex items-center justify-between">
          <Badge variant="secondary" className="text-[10px] gap-1.5 px-2 py-0.5 font-medium">
            {isSyncing ? (
              <>
                <Cloud className="size-3 animate-pulse text-primary" />
                <span>Syncing...</span>
              </>
            ) : navigator.onLine !== false ? (
              <>
                <Wifi className="size-3 text-emerald-500" />
                <span>Cloud Live</span>
              </>
            ) : (
              <>
                <WifiOff className="size-3 text-muted-foreground" />
                <span>Offline Mode</span>
              </>
            )}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold">
            {shopSettings.printerPaperWidth || shopSettings.paperWidth || '58mm'} Thermal
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
};
