import React, { useState, useEffect } from 'react';
import {
  Menu,
  PauseCircle,
  Maximize2,
  Minimize2,
  Plus,
  Camera,
  Cloud,
} from '../icons/faIcons';
import { ActiveScreen, StaffRole } from '../types';
import { User } from '../firebase';
import { normalizeRole, ROLE_DEFINITIONS } from '../utils/permissions';

export interface HeaderProps {
  activeScreen?: ActiveScreen;
  orderNumber?: number;
  heldOrdersCount?: number;
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
}

export const Header: React.FC<HeaderProps> = ({
  heldOrdersCount = 0,
  activeStaffName = 'Anand',
  activeStaffRole = 'OWNER',
  isSyncing = false,
  onOpenMenu,
  onOpenStaffSwitch,
  onOpenHeldOrders,
  onOpenCustomItem,
  onOpenScanner,
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
  const operatorDisplayName = activeStaffName || 'Anand';

  return (
    <header className="flex items-center justify-between gap-1 sm:gap-2 px-2.5 sm:px-3 py-1.5 h-14 w-full bg-white border-b border-zinc-200/80 sticky top-0 z-40 shrink-0 select-none">
      {/* 
        ========================================================================
        LEFT ZONE: [≡ Menu] (36x36px) and store/operator name ("Anand")
        Avatar circle: 32x32px (w-8 h-8, text-xs)
        ========================================================================
      */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
        {/* Navigation Menu Trigger [≡] */}
        <button
          id="btn-sidebar-menu"
          type="button"
          onClick={onOpenMenu}
          aria-label="Open Navigation Menu"
          className="w-9 h-9 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs"
        >
          <Menu className="w-[18px] h-[18px]" strokeWidth={2} />
        </button>

        {/* Store Monogram & Name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-tight shrink-0 shadow-xs">
            A
          </div>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="text-xs sm:text-sm font-bold text-zinc-900 tracking-tight truncate">
              Anand
              <span className="hidden sm:inline"> Supermarket</span>
            </span>
            <span className="text-zinc-300 text-xs font-semibold hidden md:inline">·</span>

            {/* Operator Tag on Desktop / Tablet */}
            <button
              type="button"
              id="btn-header-operator"
              onClick={onOpenStaffSwitch}
              title={`Switch operator: ${operatorDisplayName} (${roleMeta.label})`}
              className="hidden md:flex items-center gap-1 hover:bg-zinc-50 py-0.5 px-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <span className="text-xs font-medium text-zinc-600">{operatorDisplayName}</span>
              <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 font-mono text-[9px] uppercase font-medium px-1.5 py-0.2 rounded">
                {roleMeta.badgeLabel || 'OWNER'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        RIGHT ZONE: [+] (Custom Item), [] (Scan), [ 1] (Held Bills), [] (Kiosk)
        Consistent 36x36px rounded-xl (w-9 h-9, 18px icons, bg-zinc-50 border-zinc-200 text-zinc-700)
        Compact button spacing: gap-1
        ========================================================================
      */}
      <div className="flex items-center gap-1 shrink-0">
        {/* [+] Custom Item Button */}
        {onOpenCustomItem && (
          <button
            type="button"
            id="btn-header-custom-item"
            onClick={onOpenCustomItem}
            aria-label="Add Custom Item"
            title="Add Custom Item"
            className="w-9 h-9 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        )}

        {/* [] Camera/Scan Button */}
        {onOpenScanner && (
          <button
            type="button"
            id="btn-header-scanner"
            onClick={() => onOpenScanner('add-to-bill')}
            aria-label="Scan Barcode / QR Code"
            title="Scan Barcode / QR Code"
            className="w-9 h-9 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs"
          >
            <Camera className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        )}

        {/* [ 1] Held Bills Button */}
        {onOpenHeldOrders && (
          <button
            type="button"
            id="btn-header-held-bills"
            onClick={onOpenHeldOrders}
            aria-label={`Held Bills (${heldOrdersCount})`}
            title={
              heldOrdersCount > 0
                ? `${heldOrdersCount} parked bill(s). Tap to recall.`
                : 'Held Bills (0)'
            }
            className={`h-9 min-w-[36px] px-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs ${
              heldOrdersCount > 0 ? 'ring-2 ring-blue-600/30' : ''
            }`}
          >
            <PauseCircle className="w-4 h-4 text-zinc-700 shrink-0" strokeWidth={2} />
            <span className="bg-blue-600 text-white text-[11px] font-semibold rounded-full w-4 h-4 flex items-center justify-center shrink-0 leading-none tabular-nums tracking-tight">
              {heldOrdersCount}
            </span>
          </button>
        )}

        {/* [] Kiosk Fullscreen Toggle */}
        <button
          type="button"
          id="btn-header-kiosk-fullscreen"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit Fullscreen Kiosk Mode' : 'Enter Fullscreen Kiosk Mode'}
          title={
            isFullscreen
              ? 'Exit Fullscreen Kiosk Mode (F11 / Esc)'
              : 'Enter Edge-to-Edge Fullscreen Kiosk Mode (F11)'
          }
          className="w-9 h-9 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-xs"
        >
          {isFullscreen ? (
            <Minimize2 className="w-[18px] h-[18px]" strokeWidth={2} />
          ) : (
            <Maximize2 className="w-[18px] h-[18px]" strokeWidth={2} />
          )}
        </button>
      </div>
    </header>
  );
};
