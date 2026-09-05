import React from 'react';
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
} from 'lucide-react';
import { StaffMember, StaffRole } from '../types';
import { normalizeRole, ROLE_DEFINITIONS } from '../utils/permissions';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  activeStaffId: string;
  onSwitchStaff: (staffId: string) => void;
  onOpenStaffSwitch: () => void;
}

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({
  isOpen,
  onClose,
  staffList,
  activeStaffId,
  onSwitchStaff,
  onOpenStaffSwitch,
}) => {
  if (!isOpen) return null;

  const activeStaff = staffList.find((s) => s.id === activeStaffId) || staffList[0];
  const activeRole = normalizeRole(activeStaff.role);

  const capabilities = [
    {
      feature: 'Item-Wise POS & Quick Bill Terminal',
      description: 'Barcode scanning, bill creation, cart tenders & print receipts',
      worker: true,
      cashier: true,
      manager: true,
      owner: true,
    },
    {
      feature: 'Laser Gun Price Check & Info (F2)',
      description: 'Physical laser scanner price inquiry & live shelf stock query',
      worker: true,
      cashier: true,
      manager: true,
      owner: true,
    },
    {
      feature: 'Customer Directory & Khata Credit',
      description: 'Customer phone lookup & collecting credit repayments',
      worker: false,
      cashier: true,
      manager: true,
      owner: true,
    },
    {
      feature: 'Purchase Inward Stock Intake',
      description: 'Receiving supplier shipments and updating inventory counts',
      worker: true,
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Shelf Barcode Label Printing',
      description: 'Generating single and multi-page printable barcode labels',
      worker: true,
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Cash Drawer In / Out (Petty Cash)',
      description: 'Manual cash infusions or expense withdrawals outside sales',
      worker: false,
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Daily Sales Reports & Z-Report Close',
      description: 'Revenue totals, tender audit breakdowns & end-of-day drawer closing',
      worker: false,
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Wholesale Supplier Cost Prices & Margins',
      description: 'Viewing confidential wholesale item purchase costs and gross profit %',
      worker: false,
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Void / Delete Completed Orders',
      description: 'Canceling and removing past completed transactions from logs',
      worker: false,
      cashier: false,
      manager: true,
      owner: true,
    },
    {
      feature: 'Staff Accounts & 4-Digit Security PINs',
      description: 'Creating staff operators, editing security PINs, setting wage & roles',
      worker: false,
      cashier: false,
      manager: false,
      owner: true,
    },
    {
      feature: 'Google Cloud Sync & Database Restore',
      description: 'Master cloud backup, multi-device cloud synchronization & master restore',
      worker: false,
      cashier: false,
      manager: false,
      owner: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white leading-tight">
                  Role-Based Access Control (RBAC)
                </h2>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 font-mono px-2 py-0.5 rounded border border-zinc-700">
                  Active: {activeStaff.name} ({ROLE_DEFINITIONS[activeRole].badgeLabel})
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Distinct views and permissions for Store Owner, Manager, Cashier, and Worker
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Shift Switch Bar */}
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs">
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
                        : r === 'CASHIER'
                        ? 'bg-emerald-400'
                        : 'bg-zinc-400'
                    }`}
                  />
                  <span>{s.name}</span>
                  <span
                    className={`text-[9px] px-1 rounded uppercase font-mono ${
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

        {/* Role Cards Overview */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 border-b border-zinc-200 bg-[#faf8fb]">
          {/* Owner */}
          <div
            className={`p-3 rounded-2xl border transition-all ${
              activeRole === 'OWNER'
                ? 'bg-amber-50/80 border-amber-300 shadow-xs ring-1 ring-amber-400/40'
                : 'bg-white border-zinc-200 opacity-90'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                Store Owner
              </span>
              {activeRole === 'OWNER' && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                  Current View
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-zinc-900 mt-1">Master Administrator</p>
            <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
              Unrestricted access to all profit margins, staff PINs, cloud sync, and financial reports.
            </p>
          </div>

          {/* Manager */}
          <div
            className={`p-3 rounded-2xl border transition-all ${
              activeRole === 'MANAGER'
                ? 'bg-indigo-50/80 border-indigo-300 shadow-xs ring-1 ring-indigo-400/40'
                : 'bg-white border-zinc-200 opacity-90'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200">
                Store Manager
              </span>
              {activeRole === 'MANAGER' && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                  Current View
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-zinc-900 mt-1">Operations & Supervisor</p>
            <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
              Z-Report close, petty cash, purchase inward receiving, order discounts & cashier authorization.
            </p>
          </div>

          {/* Cashier & Worker */}
          <div
            className={`p-3 rounded-2xl border transition-all ${
              activeRole === 'CASHIER' || activeRole === 'WORKER'
                ? 'bg-emerald-50/80 border-emerald-300 shadow-xs ring-1 ring-emerald-400/40'
                : 'bg-white border-zinc-200 opacity-90'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                Cashier / Worker
              </span>
              {(activeRole === 'CASHIER' || activeRole === 'WORKER') && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                  Current View
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-zinc-900 mt-1">Focused Terminal POS</p>
            <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
              Fast retail checkout & Price Check (F2). Confidential costs and revenue reports locked.
            </p>
          </div>
        </div>

        {/* Feature Permissions Matrix Table */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="pb-2.5 font-bold">Module / Capability</th>
                <th className="pb-2.5 text-center px-2 w-20">Worker</th>
                <th className="pb-2.5 text-center px-2 w-20">Cashier</th>
                <th className="pb-2.5 text-center px-2 w-20">Manager</th>
                <th className="pb-2.5 text-center px-2 w-20">Owner</th>
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
                    {cap.worker ? (
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

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-zinc-600" />
            <span>Cashiers can request manager PIN authorization on locked screens anytime.</span>
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
    </div>
  );
};
