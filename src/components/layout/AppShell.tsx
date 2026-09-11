import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Zap,
  Package,
  Users,
  Wallet,
  BarChart3,
  Settings,
  X,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { Header, ConnectivityStatus } from './Header';

export type NavScreenId =
  | 'home'
  | 'quick-bill'
  | 'bills'
  | 'stock'
  | 'khata'
  | 'cash'
  | 'reports'
  | 'settings';

export interface NavItemConfig {
  id: NavScreenId;
  label: string; // Shopkeeper terminology strictly used
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface AppShellProps {
  activeScreen: NavScreenId;
  onNavigate: (screen: NavScreenId) => void;
  // Cashier & Shop Information
  storeName?: string;
  storeTagline?: string;
  cashierName?: string;
  cashierRole?: 'OWNER' | 'MANAGER' | 'CASHIER';
  shiftId?: string | number;
  connectivity?: ConnectivityStatus;
  onOpenOperatorSwitch?: () => void;
  // Layout Slots
  topActionSlot?: React.ReactNode;
  workspaceSlot: React.ReactNode;
  cartSlot?: React.ReactNode; // Strictly implements Current Bill Scroll Contract when passed
  // Optional Drawer / Modal Slots
  modalsSlot?: React.ReactNode;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'Home', icon: ShoppingBag },
  { id: 'quick-bill', label: 'Quick Bill', icon: Zap },
  { id: 'bills', label: 'Bills', icon: FileText },
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'khata', label: 'Khata', icon: Users },
  { id: 'cash', label: 'Cash Drawer', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const AppShell: React.FC<AppShellProps> = ({
  activeScreen,
  onNavigate,
  storeName = 'Anand Supermarket',
  storeTagline = 'Kirana & Retail POS Engine',
  cashierName = 'Anand',
  cashierRole = 'OWNER',
  shiftId = '1',
  connectivity = 'online',
  onOpenOperatorSwitch,
  topActionSlot,
  workspaceSlot,
  cartSlot,
  modalsSlot,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen change state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  return (
    <div className="w-screen h-screen w-[100vw] h-[100vh] h-[100dvh] bg-[#F8FAFC] text-[#0F172A] flex flex-col overflow-hidden select-none">
      {/* 
        ========================================================================
        TOP APP BAR / STATUS HEADER
        Clean single row layout with zero overlap:
        [≡ Menu] [Store/Avatar] | [● Synced] [ Held: 1] [ Kiosk]
        ========================================================================
      */}
      <Header
        storeName={storeName}
        storeTagline={storeTagline}
        cashierName={cashierName}
        cashierRole={cashierRole}
        shiftId={shiftId}
        connectivity={connectivity}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenOperatorSwitch={onOpenOperatorSwitch}
        actionSlot={topActionSlot}
      />

      {/* 
        ========================================================================
        MAIN 3-PANE WORKSPACE SCAFFOLD
        Pane 1: Left Navigation Rail (Desktop)
        Pane 2: Center Primary Workspace (Fluid 100% flex, canvas #F8FAFC)
        Pane 3: Right Current Bill / Cart Panel (Desktop ≥840px, if provided)
        ========================================================================
      */}
      <div className="flex-1 w-full min-h-0 flex flex-row overflow-hidden relative">
        {/* Navigation Rail (Desktop ≥840px) */}
        <aside
          aria-label="Terminal Navigation Rail"
          className="hidden md:flex flex-col items-center justify-between w-20 lg:w-24 bg-white border-r border-[#E2E8F0] py-3 px-1.5 shrink-0 z-20"
        >
          {/* Top Primary Screens */}
          <nav className="flex flex-col items-center gap-1.5 w-full">
            {NAV_ITEMS.slice(0, 6).map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  className={`w-full min-h-[46px] py-2 px-1 rounded-[12px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
                    isActive
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] active:bg-[#E2E8F0]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-semibold leading-none tracking-tight truncate w-full text-center px-0.5">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Administrative / Setup Screens */}
          <div className="flex flex-col items-center gap-1.5 w-full pt-2 border-t border-[#E2E8F0]">
            {NAV_ITEMS.slice(6).map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  className={`w-full min-h-[46px] py-2 px-1 rounded-[12px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-w-0 ${
                    isActive
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] active:bg-[#E2E8F0]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-semibold leading-none tracking-tight truncate w-full text-center px-0.5">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Primary Workspace (Center) */}
        <main
          id="pos-main-workspace"
          className="flex-1 h-full min-w-0 flex flex-col bg-[#F8FAFC] overflow-hidden relative"
        >
          {workspaceSlot}
        </main>

        {/* Optional Right Current Bill / Cart Panel (Desktop ≥840px) */}
        {cartSlot && (
          <aside
            aria-label="Current Bill Panel"
            className="hidden md:flex flex-col w-[360px] lg:w-[400px] xl:w-[430px] h-full bg-white border-l border-[#E2E8F0] shrink-0 z-20 overflow-hidden"
          >
            {cartSlot}
          </aside>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative w-72 max-w-[80vw] h-full bg-white shadow-2xl flex flex-col justify-between py-4 px-3 z-10 border-r border-[#E2E8F0]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[10px] bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm">
                    A
                  </div>
                  <span className="text-base font-bold text-[#0F172A]">
                    Navigation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#475569] hover:bg-[#F1F5F9]"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center justify-between w-full h-11 px-3 rounded-[12px] text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#0F172A] text-white'
                          : 'text-[#0F172A] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onOpenOperatorSwitch) onOpenOperatorSwitch();
                }}
                className="w-full h-12 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] px-3 flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#64748B]">Active Operator</span>
                  <span className="text-xs font-bold text-[#0F172A] truncate">
                    {cashierName}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase text-[#475569] bg-[#F1F5F9] border border-[#E2E8F0] px-1.5 py-0.5 rounded-[4px]">
                  {cashierRole}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {modalsSlot}
    </div>
  );
};
