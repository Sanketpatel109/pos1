import React, { useState, useEffect } from 'react';
import {
  Menu,
  PauseCircle,
  Maximize2,
  Minimize2,
  Plus,
  Camera,
} from 'lucide-react';

import { ActiveScreen, StaffRole } from '../types';
import { User } from '../firebase';
import { normalizeRole, ROLE_DEFINITIONS } from '../utils/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LicenseStatus } from '../services/subscriptionService';

export interface HeaderProps {
  storeName?: string;
  storeLogoUrl?: string;
  activeScreen?: ActiveScreen;
  orderNumber?: number;
  heldOrdersCount?: number;
  currentCartCount?: number;
  soundEnabled?: boolean;
  activeStaffName?: string;
  activeStaffRole?: StaffRole;
  user?: User | null;
  isSyncing?: boolean;
  onToggleSound?: () => void;
  onOpenMenu: () => void;
  onNavigate?: (screen: ActiveScreen) => void;
  onOpenSearch?: () => void;
  onOpenCustomItem?: () => void;
  onOpenScanner?: (mode?: 'add-to-bill' | 'price-check' | 'search') => void;
  onOpenStaffSwitch?: () => void;
  onOpenPriceCheck?: () => void;
  onOpenHeldOrders?: () => void;
  onOpenOffers?: () => void;
  activeOffersCount?: number;
  licenseStatus?: LicenseStatus | null;
  onOpenSubscription?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  storeName = 'MonoPOS Retail',
  storeLogoUrl = '',
  activeScreen = 'item-wise',
  heldOrdersCount = 0,
  currentCartCount = 0,
  activeStaffName = 'Store Owner',
  activeStaffRole = 'OWNER',
  onOpenMenu,
  onNavigate,
  onOpenStaffSwitch,
  onOpenHeldOrders,
  onOpenOffers,
  activeOffersCount = 0,
  onOpenCustomItem,
  onOpenScanner,
  licenseStatus,
  onOpenSubscription,
}) => {

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state with document and F11 keyboard shortcut
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {}
  };

  const currentRole = normalizeRole(activeStaffRole);
  const roleMeta = ROLE_DEFINITIONS[currentRole];
  const operatorDisplayName = activeStaffName || 'Staff';

  return (
    <header className="flex items-center justify-between gap-1 sm:gap-2 px-2.5 sm:px-3 py-1.5 h-14 w-full bg-card border-b border-border sticky top-0 z-40 shrink-0 select-none">
      {/* LEFT ZONE: [≡ Menu] and store/operator name */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
        {/* Navigation Menu Trigger [≡] */}
        <Button
          id="btn-sidebar-menu"
          variant="outline"
          size="icon-lg"
          onClick={onOpenMenu}
          aria-label="Open Navigation Menu"
          className="shrink-0"
        >
          <Menu className="size-4" />
        </Button>

        {/* Store Monogram / Logo & Name */}
        <div className="flex items-center gap-1.5 min-w-0">
          {storeLogoUrl ? (
            <img
              src={storeLogoUrl}
              alt={storeName}
              className="w-8 h-8 rounded-md object-contain shrink-0 border border-border/40 bg-muted/20"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs tracking-tight shrink-0 shadow-xs">
              {storeName ? storeName.charAt(0).toUpperCase() : 'M'}
            </div>
          )}
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight truncate">
              {storeName}
            </span>
            <span className="text-border text-xs font-semibold hidden md:inline">·</span>

            {/* Operator Tag on Desktop / Tablet */}
            <Button
              id="btn-header-operator"
              variant="ghost"
              size="xs"
              onClick={onOpenStaffSwitch}
              title={`Switch operator: ${operatorDisplayName} (${roleMeta.label})`}
              className="hidden md:inline-flex items-center gap-1 shrink-0 h-7"
            >
              <span className="text-xs font-medium text-muted-foreground">{operatorDisplayName}</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                {roleMeta.badgeLabel || 'OWNER'}
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT ZONE: [+] (Custom Item), [Camera] (Scan), [Pause] (Held Bills), [Maximize] (Kiosk) */}
      <div className="flex items-center gap-1 shrink-0">

        {/* [+] Custom Item Button */}
        {onOpenCustomItem && (
          <Button
            id="btn-header-custom-item"
            variant="outline"
            size="icon-lg"
            onClick={onOpenCustomItem}
            aria-label="Add Custom Item"
            title="Add Custom Item"
            className="shrink-0"
          >
            <Plus className="size-4" />
          </Button>
        )}

        {/* Camera/Scan Button */}
        {onOpenScanner && (
          <Button
            id="btn-header-scanner"
            variant="outline"
            size="icon-lg"
            onClick={() => onOpenScanner('add-to-bill')}
            aria-label="Scan Barcode / QR Code"
            title="Scan Barcode / QR Code"
            className="shrink-0"
          >
            <Camera className="size-4" />
          </Button>
        )}

        {/* Held Bills Button */}
        {onOpenHeldOrders && (
          <Button
            id="btn-header-held-bills"
            variant="outline"
            size="sm"
            onClick={onOpenHeldOrders}
            aria-label={`Held Bills (${heldOrdersCount})`}
            title={
              heldOrdersCount > 0
                ? `${heldOrdersCount} parked bill(s). Tap to recall or hold.`
                : currentCartCount > 0
                ? `Park / Hold Current Bill (${currentCartCount} items)`
                : 'Held Bills (0)'
            }
            className={`h-9 px-2.5 gap-1.5 shrink-0 cursor-pointer ${
              heldOrdersCount > 0 ? 'ring-2 ring-primary/30 font-bold' : ''
            }`}
          >
            <PauseCircle className="size-4" />
            <span className="hidden sm:inline text-xs font-semibold">
              {heldOrdersCount > 0 ? `Held (${heldOrdersCount})` : 'Hold'}
            </span>
            {heldOrdersCount > 0 && (
              <Badge
                variant="default"
                className="px-1.5 py-0 text-xs h-4 min-w-[16px] justify-center tabular-nums sm:hidden"
              >
                {heldOrdersCount}
              </Badge>
            )}
          </Button>
        )}


        {/* Kiosk Fullscreen Toggle */}
        <Button
          id="btn-header-kiosk-fullscreen"
          variant="outline"
          size="icon-lg"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit Fullscreen Kiosk Mode' : 'Enter Fullscreen Kiosk Mode'}
          title={
            isFullscreen
              ? 'Exit Fullscreen Kiosk Mode (F11 / Esc)'
              : 'Enter Edge-to-Edge Fullscreen Kiosk Mode (F11)'
          }
          className="shrink-0"
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>
      </div>
    </header>
  );
};
