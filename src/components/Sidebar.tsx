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
  Cloud,
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
import { Lock, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  activeScreen: ActiveScreen;
  shopSettings: ShopSettings;
  activeStaffName: string;
  activeStaffRole?: StaffRole;
  user?: User | null;
  onSelectScreen: (screen: ActiveScreen) => void;
  onClose: () => void;
  onOpenScanner?: (mode?: 'add-to-bill' | 'price-check' | 'search') => void;
  onOpenCloudModal?: () => void;
  onOpenStaffSwitch?: () => void;
  onRequestManagerOverride?: (screen: ActiveScreen) => void;
  onOpenPermissionsModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activeScreen,
  shopSettings,
  activeStaffName,
  activeStaffRole = 'CASHIER',
  user = null,
  onSelectScreen,
  onClose,
  onOpenScanner,
  onOpenCloudModal,
  onOpenStaffSwitch,
  onRequestManagerOverride,
  onOpenPermissionsModal,
}) => {
  if (!isOpen) return null;

  const currentRole = normalizeRole(activeStaffRole);
  const roleMeta = ROLE_DEFINITIONS[currentRole];

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
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {onOpenStaffSwitch ? (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenStaffSwitch();
                    }}
                    className="text-[11px] text-zinc-800 hover:text-black font-semibold font-mono flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>{activeStaffName}</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-[#77767b] font-mono">
                    Terminal: {activeStaffName}
                  </p>
                )}
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${roleMeta.badgeBg} ${roleMeta.badgeText} ${roleMeta.badgeBorder}`}
                >
                  {roleMeta.badgeLabel}
                </span>
              </div>
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

        {/* Role Mode Bar */}
        <div className="px-3.5 py-2 bg-[#faf8fb] border-b border-[#d4d4d8] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-zinc-500">View:</span>
            <span className="text-xs font-bold text-zinc-900">{roleMeta.label}</span>
          </div>
          {onOpenPermissionsModal && (
            <button
              onClick={() => {
                onClose();
                onOpenPermissionsModal();
              }}
              className="text-[10px] font-bold text-zinc-700 hover:text-black bg-white hover:bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <ShieldCheck className="w-3 h-3 text-zinc-600" />
              Role Matrix
            </button>
          )}
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
                className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#18181b] text-white shadow-xs'
                    : isAccessible
                    ? 'hover:bg-[#f6f2f5] text-[#1c1b1d]'
                    : 'hover:bg-amber-50/60 text-[#1c1b1d] opacity-85'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : isAccessible
                      ? 'bg-[#f0edf0] text-[#1c1b1d]'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p
                      className={`text-xs font-bold leading-tight ${
                        isActive ? 'text-white' : 'text-[#1c1b1d]'
                      }`}
                    >
                      {item.label}
                    </p>
                    {!isAccessible && (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded flex items-center gap-0.5 border border-amber-300">
                        <Lock className="w-2.5 h-2.5" />
                        {reqRole}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[10px] truncate mt-0.5 ${
                      isActive ? 'text-zinc-400' : 'text-[#77767b]'
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
                {isAccessible ? (
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-white' : 'text-[#77767b]'
                    }`}
                  />
                ) : (
                  <Lock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                )}
              </button>
            );
          })}
        </div>

        {/* PWA In-App Install Card */}
        <div className="px-3 pt-2 pb-1">
          <PWAInstallButton variant="sidebar" />
        </div>

        {/* Cloud Sync Quick Card */}
        {onOpenCloudModal && (
          <div className="p-3 border-t border-[#d4d4d8] bg-white">
            <button
              onClick={() => {
                onOpenCloudModal();
                onClose();
              }}
              className="w-full p-2.5 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
                  <Cloud className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <span>Cloud Sync</span>
                    {user ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {user ? (user.displayName || user.email) : 'Sign in with Google'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md shrink-0">
                {user ? 'Online' : 'Local'}
              </span>
            </button>
          </div>
        )}

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
