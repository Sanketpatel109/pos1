import React from 'react';
import {
  X,
  Layers,
  Zap,
  FileSpreadsheet,
  Package,
  Users,
  CreditCard,
  Wallet,
  UserCheck,
  Printer,
  HelpCircle,
  Shield,
  ChevronRight,
  Scan,
  Barcode,
} from 'lucide-react';
import { ActiveScreen, ShopSettings } from '../types';

interface SidebarProps {
  isOpen: boolean;
  activeScreen: ActiveScreen;
  shopSettings: ShopSettings;
  activeStaffName: string;
  onSelectScreen: (screen: ActiveScreen) => void;
  onClose: () => void;
  onOpenScanner?: (mode?: 'add-to-bill' | 'price-check' | 'search') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activeScreen,
  shopSettings,
  activeStaffName,
  onSelectScreen,
  onClose,
  onOpenScanner,
}) => {
  if (!isOpen) return null;

  const menuItems: {
    id: ActiveScreen;
    label: string;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'item-wise',
      label: 'Item Wise Bill',
      description: 'Standard product catalog & touchscreen POS',
      icon: Layers,
    },
    {
      id: 'quick-bill',
      label: 'Quick Bill POS',
      description: 'Fast over-the-counter keypad entry',
      icon: Zap,
    },
    {
      id: 'reports',
      label: 'Reports & Invoices',
      description: 'Daily audit, sales breakdown & receipts',
      icon: FileSpreadsheet,
    },
    {
      id: 'categories-products',
      label: 'Categories & Products',
      description: 'Inventory management & Excel bulk upload',
      icon: Package,
    },
    {
      id: 'customers',
      label: 'Customer Directory',
      description: 'Phone directory & purchase history',
      icon: Users,
    },
    {
      id: 'credit-ledger',
      label: 'Khata Credit Book',
      description: 'Credit balances & WhatsApp reminders',
      icon: CreditCard,
    },
    {
      id: 'cash-management',
      label: 'Cash Drawer',
      description: 'Opening balance, Cash In & Cash Out',
      icon: Wallet,
    },
    {
      id: 'staff-management',
      label: 'Staff & Cashiers',
      description: 'Switch operator or change terminal PIN',
      icon: UserCheck,
    },
    {
      id: 'print-settings',
      label: 'Printer & Store Meta',
      description: '58mm/80mm thermal & Bluetooth setup',
      icon: Printer,
    },
    {
      id: 'training-videos',
      label: 'Training & Help',
      description: 'Quick operation guides & workflows',
      icon: HelpCircle,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 border-r border-[#d4d4d8]">
        {/* Header */}
        <div className="p-4 border-b border-[#d4d4d8] bg-[#f6f2f5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#18181b] text-white flex items-center justify-center font-bold text-sm">
              M
            </div>
            <div>
              <h2 className="font-bold text-sm text-[#1c1b1d] leading-none">
                MonoPOS Industrial
              </h2>
              <p className="text-[11px] text-[#77767b] mt-1 font-mono">
                Terminal: {activeStaffName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg text-[#77767b] hover:text-[#1c1b1d] hover:bg-[#eae7ea] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Scanner Action Bar */}
        {onOpenScanner && (
          <div className="p-2 border-b border-[#d4d4d8] bg-[#faf8fb] grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                onClose();
                onOpenScanner('add-to-bill');
              }}
              className="p-2 rounded-xl bg-[#18181b] text-white text-xs font-bold flex flex-col items-center justify-center gap-1 hover:bg-black transition-all active:scale-95 cursor-pointer shadow-2xs text-center"
            >
              <Scan className="w-4 h-4" />
              <span className="text-[11px] leading-tight">Scan to Bill</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenScanner('price-check');
              }}
              className="p-2 rounded-xl bg-[#f0edf0] hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer text-center"
            >
              <Barcode className="w-4 h-4 text-[#18181b]" />
              <span className="text-[11px] leading-tight">Price Check</span>
            </button>
          </div>
        )}

        {/* Menu Navigation Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => {
                  onSelectScreen(item.id);
                  onClose();
                }}
                className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#18181b] text-white shadow-xs'
                    : 'hover:bg-[#f6f2f5] text-[#1c1b1d]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'bg-[#f0edf0] text-[#1c1b1d]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-bold leading-tight ${
                      isActive ? 'text-white' : 'text-[#1c1b1d]'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p
                    className={`text-[10px] truncate mt-0.5 ${
                      isActive ? 'text-zinc-400' : 'text-[#77767b]'
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-white' : 'text-[#77767b]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Store Information Footer */}
        <div className="p-3 border-t border-[#d4d4d8] bg-[#f6f2f5] flex items-center justify-between text-[11px] text-[#47464b]">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#18181b]" />
            <span className="font-semibold">{shopSettings.shopName}</span>
          </div>
          <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#d4d4d8]">
            58mm POS
          </span>
        </div>
      </div>
    </div>
  );
};
