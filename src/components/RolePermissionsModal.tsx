import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  Lock,
  UserCheck,
  KeyRound,
  Layers,
  FileSpreadsheet,
  Package,
  Wallet,
  Cloud,
  ChevronRight,
  Eye,
  Trash2,
  Tag,
  Sliders,
  AlertTriangle,
  ShieldAlert,
  Delete,
} from 'lucide-react';
import { StaffMember, StaffRole, StorePermissions, DEFAULT_STORE_PERMISSIONS } from '../types';
import { normalizeRole, ROLE_DEFINITIONS, verifyOwnerPin } from '../utils/permissions';
import { posSound } from '../utils/sound';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  activeStaffId: string;
  permissions?: StorePermissions;
  onUpdatePermissions?: (newPermissions: StorePermissions) => void;
  onSwitchStaff: (staffId: string) => void;
  onOpenStaffSwitch: () => void;
}

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({
  isOpen,
  onClose,
  staffList,
  activeStaffId,
  permissions = DEFAULT_STORE_PERMISSIONS,
  onUpdatePermissions,
  onSwitchStaff,
  onOpenStaffSwitch,
}) => {
  const [activeTab, setActiveTab] = useState<'STORE_POLICIES' | 'ROLE_MATRIX'>('STORE_POLICIES');
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState<boolean>(false);
  const [showOwnerPinDialog, setShowOwnerPinDialog] = useState<boolean>(false);
  const [ownerPinInput, setOwnerPinInput] = useState<string>('');
  const [ownerPinError, setOwnerPinError] = useState<string>('');
  const [pendingToggle, setPendingToggle] = useState<{
    section: 'staff' | 'manager';
    key: string;
    nextVal: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const activeStaff = staffList.find((s) => s.id === activeStaffId) || staffList[0];
  const activeRole = normalizeRole(activeStaff.role);
  const isActualOwner = activeRole === 'OWNER';
  const canEditPolicies = isActualOwner || isOwnerUnlocked;

  const currentPermissions: StorePermissions = {
    staff: {
      ...DEFAULT_STORE_PERMISSIONS.staff,
      ...(permissions?.staff || {}),
    },
    manager: {
      ...DEFAULT_STORE_PERMISSIONS.manager,
      ...(permissions?.manager || {}),
    },
  };

  const handleToggleClick = (section: 'staff' | 'manager', key: string, currentVal: boolean) => {
    posSound?.playTap?.();
    const nextVal = !currentVal;

    if (canEditPolicies) {
      applyPermissionToggle(section, key, nextVal);
    } else {
      setPendingToggle({ section, key, nextVal });
      setOwnerPinInput('');
      setOwnerPinError('');
      setShowOwnerPinDialog(true);
    }
  };

  const applyPermissionToggle = (section: 'staff' | 'manager', key: string, nextVal: boolean) => {
    const updated: StorePermissions = {
      ...currentPermissions,
      [section]: {
        ...currentPermissions[section],
        [key]: nextVal,
      },
    };
    if (onUpdatePermissions) {
      onUpdatePermissions(updated);
    }
  };

  const handleVerifyOwnerPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ownerPinInput.trim()) {
      setOwnerPinError('Please enter the 4-digit Store Owner PIN');
      return;
    }

    const { verified, staff } = verifyOwnerPin(ownerPinInput, staffList);
    if (verified && staff) {
      posSound?.playBeep?.();
      setIsOwnerUnlocked(true);
      setShowOwnerPinDialog(false);
      setOwnerPinError('');
      if (pendingToggle) {
        applyPermissionToggle(pendingToggle.section, pendingToggle.key, pendingToggle.nextVal);
        setPendingToggle(null);
      }
      setOwnerPinInput('');
    } else {
      posSound?.playBuzzer?.();
      setOwnerPinError('Invalid PIN. Only the Store Owner PIN can alter policy rules.');
      setOwnerPinInput('');
    }
  };

  const capabilities = [
    {
      feature: 'Item-Wise POS & Quick Bill Terminal',
      description: 'Barcode scanning, bill creation, cart tenders & print receipts',
      cashier: true,
      manager: true,
      owner: true,
    },
    {
      feature: 'Laser Gun Price Check & Info (F2)',
      description: 'Physical laser scanner price inquiry & live shelf stock query',
      cashier: true,
      manager: true,
      owner: true,
    },
    {
      feature: 'Customer Directory & Khata Credit',
      description: 'Customer phone lookup & collecting credit repayments',
      cashier: true,
      manager: true,
      owner: true,
    },
    {
      feature: 'Purchase Inward Stock Intake',
      description: 'Receiving supplier shipments and updating inventory counts',
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Shelf Barcode Label Printing',
      description: 'Generating single and multi-page printable barcode labels',
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Cash Drawer In / Out (Petty Cash)',
      description: 'Manual cash infusions or expense withdrawals outside sales',
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Daily Sales Reports & Z-Report Close',
      description: 'Revenue totals, tender audit breakdowns & end-of-day drawer closing',
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Wholesale Supplier Cost Prices & Margins',
      description: 'Viewing confidential wholesale item purchase costs and gross profit %',
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Void / Delete Completed Orders',
      description: 'Canceling and removing past completed transactions from logs',
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Staff Accounts & 4-Digit Security PINs',
      description: 'Creating staff operators, editing security PINs, setting wage & roles',
      cashier: false,
      manager: false,
      owner: true,
    },
    {
      feature: 'Google Cloud Sync & Database Restore',
      description: 'Master cloud backup, multi-device cloud synchronization & master restore',
      cashier: false,
      manager: false,
      owner: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white leading-tight">
                  Store Policy & Role Permissions
                </h2>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                  Active: {activeStaff.name} ({ROLE_DEFINITIONS[activeRole].badgeLabel})
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                5-Toggle Store Permissions and Role Capabilities Matrix
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex border-b border-zinc-200 bg-zinc-100/70 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              posSound?.playTap?.();
              setActiveTab('STORE_POLICIES');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'STORE_POLICIES'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Store Policy (5 Toggles)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              posSound?.playTap?.();
              setActiveTab('ROLE_MATRIX');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ROLE_MATRIX'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-zinc-600" />
            <span>Role Capabilities Matrix</span>
          </button>
        </div>

        {/* TAB 1: 5-TOGGLE STORE PERMISSIONS MODEL */}
        {activeTab === 'STORE_POLICIES' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
            {/* Hierarchy Rule Callout & Owner Unlock State */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-amber-950">
                    Hierarchy Rule: Store Owner Authority
                  </h3>
                  <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                    Only the Store Owner (via 4-Digit Owner PIN) can alter store policy rules.
                    Managers manage staff PINs and daily approvals; they cannot alter policy rules.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                {canEditPolicies ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Owner Verified</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingToggle(null);
                      setOwnerPinInput('');
                      setOwnerPinError('');
                      setShowOwnerPinDialog(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock with Owner PIN</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section A: Staff Permissions */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Staff Permissions (Cashier & Worker)
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium">Daily Counter Operations</span>
              </div>

              <div className="divide-y divide-zinc-100">
                {/* 1. allowKhata */}
                <div className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900">Sell on Customer Credit (Khata)</span>
                        <code className="text-[10px] bg-zinc-100 text-zinc-600 px-1 py-0.5 rounded ">
                          staff.allowKhata
                        </code>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                        Allow cashiers to finalize sales on customer credit without requiring manager PIN elevation.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleClick('staff', 'allowKhata', currentPermissions.staff.allowKhata)
                    }
                    className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      currentPermissions.staff.allowKhata ? 'bg-emerald-600' : 'bg-zinc-300'
                    }`}
                    aria-label="Toggle allowKhata"
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        currentPermissions.staff.allowKhata ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. allowPriceOverride */}
                <div className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900">Modify Cart Item Prices</span>
                        <code className="text-[10px] bg-zinc-100 text-zinc-600 px-1 py-0.5 rounded ">
                          staff.allowPriceOverride
                        </code>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                        Allow staff to adjust line item selling rates in cart without requiring manager PIN elevation.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleClick(
                        'staff',
                        'allowPriceOverride',
                        currentPermissions.staff.allowPriceOverride
                      )
                    }
                    className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      currentPermissions.staff.allowPriceOverride ? 'bg-emerald-600' : 'bg-zinc-300'
                    }`}
                    aria-label="Toggle allowPriceOverride"
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        currentPermissions.staff.allowPriceOverride ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. allowStockInward */}
                <div className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900">Receive Supplier Crates (Stock Inward)</span>
                        <code className="text-[10px] bg-zinc-100 text-zinc-600 px-1 py-0.5 rounded ">
                          staff.allowStockInward
                        </code>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                        Allow floor staff to intake supplier shipments and update inventory counts.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleClick(
                        'staff',
                        'allowStockInward',
                        currentPermissions.staff.allowStockInward
                      )
                    }
                    className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      currentPermissions.staff.allowStockInward ? 'bg-emerald-600' : 'bg-zinc-300'
                    }`}
                    aria-label="Toggle allowStockInward"
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        currentPermissions.staff.allowStockInward ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Section B: Manager Permissions */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Manager Permissions (Supervisors)
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium">Store Operations</span>
              </div>

              <div className="divide-y divide-zinc-100">
                {/* 4. viewCostPrice */}
                <div className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900">View Buying Rates & Margins</span>
                        <code className="text-[10px] bg-zinc-100 text-zinc-600 px-1 py-0.5 rounded ">
                          manager.viewCostPrice
                        </code>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                        Allow store managers to view confidential wholesale purchase prices and profit margins.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleClick(
                        'manager',
                        'viewCostPrice',
                        currentPermissions.manager.viewCostPrice
                      )
                    }
                    className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      currentPermissions.manager.viewCostPrice ? 'bg-emerald-600' : 'bg-zinc-300'
                    }`}
                    aria-label="Toggle viewCostPrice"
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        currentPermissions.manager.viewCostPrice ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 5. allowBillVoid */}
                <div className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900">Cancel / Void Completed Invoices</span>
                        <code className="text-[10px] bg-zinc-100 text-zinc-600 px-1 py-0.5 rounded ">
                          manager.allowBillVoid
                        </code>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                        Allow managers to cancel or void finalized billing records without store owner approval.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleClick(
                        'manager',
                        'allowBillVoid',
                        currentPermissions.manager.allowBillVoid
                      )
                    }
                    className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      currentPermissions.manager.allowBillVoid ? 'bg-emerald-600' : 'bg-zinc-300'
                    }`}
                    aria-label="Toggle allowBillVoid"
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        currentPermissions.manager.allowBillVoid ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROLE MATRIX & ACTIVE SHIFT SWITCH */}
        {activeTab === 'ROLE_MATRIX' && (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            {/* Quick Shift Switch Bar */}
            <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center gap-2 text-zinc-700 font-medium">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Switch active role on the counter:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {staffList.map((s) => {
                  const r = normalizeRole(s.role);
                  const meta = ROLE_DEFINITIONS[r];
                  const isSelected = s.id === activeStaffId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSwitchStaff(s.id);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300'
                      }`}
                      title={`Switch to ${s.name}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          r === 'OWNER'
                            ? 'bg-amber-400'
                            : r === 'MANAGER'
                            ? 'bg-indigo-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                      <span>{s.name}</span>
                      <span
                        className={`text-[9px] px-1 rounded uppercase ${
                          isSelected ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {meta.badgeLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Permissions Matrix Table */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="pb-2.5 font-bold">Module / Capability</th>
                    <th className="pb-2.5 text-center px-2 w-24">Cashier</th>
                    <th className="pb-2.5 text-center px-2 w-24">Manager</th>
                    <th className="pb-2.5 text-center px-2 w-24">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {capabilities.map((cap, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-2.5 pr-2">
                        <div className="font-bold text-zinc-900">{cap.feature}</div>
                        <div className="text-[11px] text-zinc-500">{cap.description}</div>
                      </td>
                      <td className="py-2.5 text-center px-2">
                        {cap.cashier ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-400">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-center px-2">
                        {cap.manager ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-400">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-center px-2">
                        {cap.owner ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-400">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-zinc-600" />
            <span>Staff can request one-time Manager PIN elevation on disabled actions anytime.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Owner PIN Verification Modal for Modifying Policy Rules */}
      {showOwnerPinDialog && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-sm overflow-hidden flex flex-col">
            <div className="bg-zinc-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Store Owner PIN Required</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOwnerPinDialog(false);
                  setPendingToggle(null);
                }}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center">
              <p className="text-xs text-zinc-600 text-center mb-4 leading-relaxed">
                Hierarchy Rule: Only the <strong>Store Owner</strong> can change store permissions.
                Enter 4-digit Owner PIN to authorize policy modification.
              </p>

              {/* PIN display boxes */}
              <div className="flex gap-2.5 mb-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-11 h-12 rounded-xl border-2 flex items-center justify-center text-lg font-black transition-all ${
                      ownerPinInput.length > i
                        ? 'border-amber-500 bg-amber-50/50 text-amber-950'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-400'
                    }`}
                  >
                    {ownerPinInput.length > i ? '•' : ''}
                  </div>
                ))}
              </div>

              {ownerPinError && (
                <p className="text-xs font-semibold text-red-600 mb-3 text-center">{ownerPinError}</p>
              )}

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-1.5 w-full max-w-[220px] mt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (ownerPinInput.length < 6) {
                        setOwnerPinInput((prev) => prev + num);
                        setOwnerPinError('');
                      }
                    }}
                    className="h-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-base font-bold text-zinc-800 transition-all active:scale-95 shadow-2xs cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setOwnerPinInput('');
                    setOwnerPinError('');
                  }}
                  className="h-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-600 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (ownerPinInput.length < 6) {
                      setOwnerPinInput((prev) => prev + '0');
                      setOwnerPinError('');
                    }
                  }}
                  className="h-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-base font-bold text-zinc-800 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOwnerPinInput((prev) => prev.slice(0, -1));
                    setOwnerPinError('');
                  }}
                  aria-label="Backspace"
                  className="h-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-600 transition-all active:scale-95 shadow-2xs cursor-pointer flex items-center justify-center"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 w-full mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowOwnerPinDialog(false);
                    setPendingToggle(null);
                  }}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={ownerPinInput.length < 4}
                  onClick={() => handleVerifyOwnerPin()}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1 ${
                    ownerPinInput.length >= 4
                      ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Authorize</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

