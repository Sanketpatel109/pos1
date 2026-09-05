import React from 'react';
import {
  Menu,
  Search,
  Plus,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShoppingBag,
  Zap,
  BarChart3,
  Package,
  Users,
  Wallet,
  UserCheck,
  Scan,
} from 'lucide-react';
import { ActiveScreen } from '../types';

interface HeaderProps {
  activeScreen: ActiveScreen;
  orderNumber: number;
  heldOrdersCount?: number;
  soundEnabled?: boolean;
  activeStaffName?: string;
  onToggleSound?: () => void;
  onOpenMenu: () => void;
  onNavigate: (screen: ActiveScreen) => void;
  onOpenSearch?: () => void;
  onOpenCustomItem?: () => void;
  onOpenScanner?: (mode?: 'add-to-bill' | 'price-check' | 'search') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  orderNumber,
  heldOrdersCount = 0,
  soundEnabled = true,
  activeStaffName = 'Alex Cashier',
  onToggleSound,
  onOpenMenu,
  onNavigate,
  onOpenSearch,
  onOpenCustomItem,
  onOpenScanner,
}) => {
  const getScreenTitle = () => {
    switch (activeScreen) {
      case 'item-wise':
        return 'Item-Wise Terminal';
      case 'quick-bill':
        return 'Quick Bill Terminal';
      case 'reports':
        return 'Reports & Invoices';
      case 'categories-products':
        return 'Catalog Manager';
      case 'customers':
        return 'Customer Directory';
      case 'credit-ledger':
        return 'Khata Credit Ledger';
      case 'cash-management':
        return 'Cash Drawer';
      case 'staff-management':
        return 'Staff Terminals';
      default:
        return 'MonoPOS Industrial';
    }
  };

  const navItems: { id: ActiveScreen; label: string; icon: React.ReactNode }[] = [
    { id: 'item-wise', label: 'Item-Wise', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { id: 'quick-bill', label: 'Quick Bill', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'categories-products', label: 'Catalog', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'cash-management', label: 'Cash Drawer', icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'staff-management', label: 'Staff', icon: <UserCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="flex justify-between items-center px-3 sm:px-4 h-15 w-full bg-white border-b border-[#d4d4d8] sticky top-0 z-40 shrink-0">
      {/* Left: Hamburger Menu & Screen Title */}
      <div className="flex items-center gap-2.5">
        <button
          id="btn-sidebar-menu"
          onClick={onOpenMenu}
          aria-label="Open Navigation Menu"
          className="text-[#1c1b1d] hover:bg-[#f0edf0] p-2 rounded-xl transition-colors active:scale-95 cursor-pointer flex items-center justify-center border border-transparent hover:border-[#d4d4d8]"
        >
          <Menu className="w-5 h-5 text-[#1c1b1d]" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#18181b] text-white rounded-lg flex items-center justify-center font-black text-xs tracking-tighter">
            M
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-extrabold text-[#1c1b1d] tracking-tight leading-none">
              {getScreenTitle()}
            </h1>
            <span className="text-[10px] text-[#77767b] font-mono leading-tight mt-0.5 hidden sm:block">
              MonoPOS v2.4 • Shift #1
            </span>
          </div>
        </div>
      </div>

      {/* Center: Tablet Quick Screen Navigation Bar */}
      <div className="hidden lg:flex items-center gap-1 bg-[#f6f2f5] p-1 rounded-xl border border-[#d4d4d8]">
        {navItems.map((item) => {
          const isActive =
            activeScreen === item.id ||
            (item.id === 'customers' && activeScreen === 'credit-ledger');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#18181b] text-white shadow-xs'
                  : 'text-[#47464b] hover:text-[#1c1b1d] hover:bg-[#eae7ea]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Cashier Badge & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Operator info pill */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#f0edf0] border border-[#d4d4d8] rounded-xl px-2.5 py-1 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[#77767b] font-medium">Operator:</span>
          <span className="text-[#1c1b1d] font-bold">{activeStaffName}</span>
        </div>

        {onToggleSound && (
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Audio Feedback' : 'Enable Audio Feedback'}
            className="p-2 rounded-xl text-[#77767b] hover:text-[#1c1b1d] hover:bg-[#f0edf0] transition-colors active:scale-95 cursor-pointer border border-[#d4d4d8]/60"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#18181b]" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        )}

        {onOpenScanner && (
          <button
            id="btn-header-scanner"
            onClick={() => onOpenScanner('add-to-bill')}
            title="Scan Barcode / QR Code (Add Product / Check Price)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-[#f0edf0] hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Scan className="w-4 h-4 text-[#18181b]" />
            <span className="hidden sm:inline">Scan</span>
          </button>
        )}

        {onOpenCustomItem && activeScreen === 'item-wise' && (
          <button
            id="btn-header-custom-item"
            onClick={onOpenCustomItem}
            className="bg-[#18181b] text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold text-xs hover:bg-black transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Custom Item</span>
          </button>
        )}
      </div>
    </header>
  );
};

