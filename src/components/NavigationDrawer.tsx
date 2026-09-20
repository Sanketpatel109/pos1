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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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
  onRequestManagerOverride?: (targetScreen: ActiveScreen) => void;
  onOpenPermissionsModal?: () => void;
  onOpenZReport?: () => void;
  onSignOut?: () => void;
  licenseStatus?: LicenseStatus | null;
  subscriptionStatusInfo?: SubscriptionStatusInfo | null;
  onOpenSubscription?: () => void;
  onOpenSubscriptionSettings?: () => void;
  onOpenOffers?: () => void;
  offersCount?: number;
}

interface MenuItem {
  id: string;
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
  activeStaffRole = 'OWNER',
  user,
  isSyncing = false,
  onSelectScreen,
  onClose,
  onOpenStaffSwitch,
  onRequestManagerOverride,
  onOpenPermissionsModal,
  onOpenZReport,
  onSignOut,
  subscriptionStatusInfo,
  onOpenSubscription,
  onOpenSubscriptionSettings,
  onOpenOffers,
  offersCount = 0,
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
          id: 'cash-drawer',
          label: 'Cash Drawer (Till / Galla)',
          description: 'Cash In, Cash Out & denomination count',
          icon: Wallet,
        },
        {
          id: 'customer-credit',
          label: 'Customer Credit & Khata',
          description: 'Khata ledger, credit limits & WhatsApp',
          icon: CreditCard,
        },
        {
          id: 'products',
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
      groupTitle: 'Analytics & Admin',
      items: [
        {
          id: 'analytics',
          label: 'Analytics & Insights',
          description: 'Sales trends, peak hours & top items',
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
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="left"
        showCloseButton={true}
        className="w-[340px] sm:max-w-[340px] p-0 flex flex-col gap-0 border-r border-border bg-background"
      >
        {/* ── Store Brand Header ─────────────────────────────────── */}
        <SheetHeader className="p-3.5 pr-12 border-b border-border text-left">
          <div className="flex items-center gap-2.5">
            <Avatar className="size-9 rounded-lg shrink-0">
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                {(shopSettings.shopName || 'M').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-bold text-foreground truncate leading-tight">
                {shopSettings.shopName || 'MonoPOS Retail'}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 mt-1 text-xs">
                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-medium text-foreground truncate">
                  {activeStaffName}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-bold uppercase shrink-0">
                  {roleMeta.badgeLabel || currentRole}
                </Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* ── Quick Shift / Operator Switcher ───────────────────── */}
        {onOpenStaffSwitch && (
          <div className="px-3 pt-2.5 pb-1">
            <Button
              id="btn-drawer-switch-staff"
              variant="outline"
              size="sm"
              className="w-full justify-between h-8.5 px-3 text-xs font-semibold rounded-lg"
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
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3.5 no-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <div className="px-1 pt-1 pb-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {group.groupTitle}
                </span>
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
                    <Button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      variant={isActive ? 'default' : 'ghost'}
                      className={`w-full justify-start h-auto py-2 px-2.5 gap-2.5 text-left rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                          : 'hover:bg-muted text-foreground'
                      } ${!isAccessible ? 'opacity-70' : ''}`}
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
                        className={`size-7 rounded-md flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : isAccessible
                            ? 'bg-muted text-foreground'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        <Icon className="size-3.5" />
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
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 text-amber-700 dark:text-amber-400 border-amber-500/40 bg-amber-500/10 gap-0.5">
                              <Lock className="size-2.5" />
                              {reqRole}
                            </Badge>
                          )}
                        </div>
                        <span
                          className={`text-[10px] truncate block leading-tight mt-0.5 ${
                            isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                      {isAccessible ? (
                        <ChevronRight
                          className={`size-3.5 shrink-0 ${
                            isActive ? 'text-primary-foreground/60' : 'text-muted-foreground/40'
                          }`}
                        />
                      ) : (
                        <Lock className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
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
          <div className="px-3 py-1">
            <Card className="rounded-xl border border-border/70 shadow-none bg-card py-0">
              <CardContent className="p-2.5 px-2.5 py-2.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="size-7.5 rounded-full shrink-0">
                    {user.photoURL ? (
                      <AvatarImage src={user.photoURL} alt={user.displayName || 'Owner'} />
                    ) : null}
                    <AvatarFallback className="rounded-full bg-primary/15 text-primary text-xs font-bold">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'O'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate leading-tight">
                      {user.displayName || 'Store Owner'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  title="Sign Out of Store Account"
                  className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Subscription Status ───────────────────────────────── */}
        {subscriptionStatusInfo && (
          <div className="px-3 pb-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-8 px-2.5 text-xs rounded-lg"
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
        <div className="px-3 py-2 border-t border-border flex items-center justify-between bg-muted/30">
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
      </SheetContent>
    </Sheet>
  );
};
