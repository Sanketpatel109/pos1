import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  Menu,
  PauseCircle,
  Plus,
  Camera,
} from '../../icons/faIcons';

export type ConnectivityStatus = 'online' | 'syncing' | 'offline';

export interface HeaderProps {
  storeName?: string;
  storeTagline?: string;
  cashierName?: string;
  cashierRole?: 'OWNER' | 'MANAGER' | 'CASHIER';
  shiftId?: string | number;
  connectivity?: ConnectivityStatus;
  isFullscreen?: boolean;
  heldOrdersCount?: number;
  onToggleFullscreen?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenOperatorSwitch?: () => void;
  onOpenHeldOrders?: () => void;
  onOpenCustomItem?: () => void;
  onOpenScanner?: () => void;
  actionSlot?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  cashierName = 'Anand',
  isFullscreen: externalIsFullscreen,
  heldOrdersCount = 0,
  onToggleFullscreen: externalOnToggleFullscreen,
  onOpenMobileMenu,
  onOpenOperatorSwitch,
  onOpenHeldOrders,
  onOpenCustomItem,
  onOpenScanner,
}) => {
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = externalIsFullscreen !== undefined ? externalIsFullscreen : internalFullscreen;

  const toggleFullscreen = () => {
    if (externalOnToggleFullscreen) {
      externalOnToggleFullscreen();
      return;
    }
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setInternalFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        setInternalFullscreen(false);
      }
    } catch {
      setInternalFullscreen((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setInternalFullscreen(Boolean(document.fullscreenElement));
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

  return (
    <header className="flex items-center justify-between gap-1 sm:gap-2 px-2.5 sm:px-3 py-1.5 h-14 w-full bg-white border-b border-slate-200 sticky top-0 z-40 shrink-0 select-none">
      {/* 
        ========================================================================
        LEFT ZONE: [≡ Menu] (36x36px) [Store/Avatar (32x32px)]
        Clean single-line layout without overlapping or clipping text
        ========================================================================
      */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open Navigation Menu"
          className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Menu className="w-[18px] h-[18px]" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs tracking-tight shrink-0 shadow-2xs">
            A
          </div>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">
              Anand
              <span className="hidden sm:inline"> Supermarket</span>
            </span>
            <span className="text-slate-300 text-xs font-semibold hidden md:inline">·</span>

            <button
              type="button"
              onClick={onOpenOperatorSwitch}
              className="hidden md:flex items-center gap-1 hover:bg-slate-50 py-0.5 px-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <span className="text-xs font-medium text-slate-600">{cashierName}</span>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[9px] uppercase font-bold px-1.5 py-0.2 rounded">
                OWNER
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        RIGHT ZONE: [+] (Custom Item), [] (Scan), [ 1] (Held Bills), [] (Kiosk)
        Consistent 36x36px rounded-lg (w-9 h-9, 18px icons, bg-slate-50 border-slate-200 text-slate-700)
        Compact button spacing: gap-1
        ========================================================================
      */}
      <div className="flex items-center gap-1 shrink-0">
        {onOpenCustomItem && (
          <button
            type="button"
            onClick={onOpenCustomItem}
            aria-label="Add Custom Item"
            title="Add Custom Item"
            className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
          >
            <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        )}

        {onOpenScanner && (
          <button
            type="button"
            onClick={onOpenScanner}
            aria-label="Scan Barcode / QR Code"
            title="Scan Barcode / QR Code"
            className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
          >
            <Camera className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        )}

        {onOpenHeldOrders && (
          <button
            type="button"
            onClick={onOpenHeldOrders}
            aria-label={`Held Bills (${heldOrdersCount})`}
            title={
              heldOrdersCount > 0
                ? `${heldOrdersCount} parked bill(s). Tap to recall.`
                : 'Held Bills (0)'
            }
            className={`h-9 min-w-[36px] px-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs ${
              heldOrdersCount > 0 ? 'ring-1 ring-blue-300' : ''
            }`}
          >
            <PauseCircle className="w-4 h-4 text-slate-700 shrink-0" strokeWidth={2} />
            <span className="bg-blue-600 text-white text-[11px] font-semibold rounded-full w-4 h-4 flex items-center justify-center shrink-0 leading-none">
              {heldOrdersCount}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit Fullscreen Kiosk Mode' : 'Enter Fullscreen Kiosk Mode'}
          title={isFullscreen ? 'Exit Fullscreen Kiosk Mode (F11)' : 'Enter Kiosk Mode (F11)'}
          className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
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
