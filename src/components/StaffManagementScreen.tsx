import React, { useState } from 'react';
import { Shield, KeyRound, Plus, Check, X, Lock, ShieldCheck, UserCheck, Settings2 } from '../icons/faIcons';
import { StaffMember, StaffRole, StorePermissions, DEFAULT_STORE_PERMISSIONS } from '../types';
import { normalizeRole, ROLE_DEFINITIONS } from '../utils/permissions';

interface StaffManagementScreenProps {
  staffList: StaffMember[];
  activeStaffId: string;
  permissions?: StorePermissions;
  onSelectStaff: (staffId: string) => void;
  onAddStaff: (staff: Omit<StaffMember, 'id'>) => void;
  onUpdatePin: (staffId: string, newPin: string) => void;
  onUpdatePermissions?: (newPermissions: StorePermissions) => void;
}

export const StaffManagementScreen: React.FC<StaffManagementScreenProps> = ({
  staffList,
  activeStaffId,
  permissions = DEFAULT_STORE_PERMISSIONS,
  onSelectStaff,
  onAddStaff,
  onUpdatePin,
  onUpdatePermissions,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('CASHIER');
  const [pin, setPin] = useState('');

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<StaffMember | null>(null);
  const [newPin, setNewPin] = useState('');

  const activeStaff = staffList.find((s) => s.id === activeStaffId) || staffList[0];

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || pin.length < 4) return;

    onAddStaff({
      name: name.trim(),
      role,
      pin,
      active: true,
    });

    setIsAddModalOpen(false);
    setName('');
    setPin('');
    setRole('CASHIER');
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForPin || newPin.length < 4) return;

    onUpdatePin(selectedStaffForPin.id, newPin);
    setIsPinModalOpen(false);
    setNewPin('');
    setSelectedStaffForPin(null);
  };

  const handleTogglePermission = (group: 'staff' | 'manager', key: string) => {
    if (!onUpdatePermissions) return;
    const current = { ...permissions };
    if (group === 'staff') {
      current.staff = {
        ...current.staff,
        [key]: !current.staff[key as keyof typeof current.staff],
      };
    } else {
      current.manager = {
        ...current.manager,
        [key]: !current.manager[key as keyof typeof current.manager],
      };
    }
    onUpdatePermissions(current);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fcf8fb] overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-[#f6f2f5] border-b border-[#d4d4d8] p-3.5 sm:p-4 flex justify-between items-center shrink-0">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
            Terminal Access & Cashier Management
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm sm:text-base font-extrabold text-[#1c1b1d]">
              {staffList.length} Registered Operators
            </span>
            <span className="text-xs text-[#77767b]">• Active: <strong className="text-[#1c1b1d]">{activeStaff?.name}</strong></span>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Add New Staff</span>
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
        {/* Active Session Indicator */}
        <div className="bg-white border border-[#d4d4d8] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#18181b] text-white flex items-center justify-center font-black text-lg">
              {activeStaff?.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-[#1c1b1d]">{activeStaff?.name}</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {normalizeRole(activeStaff?.role)}
                </span>
              </div>
              <p className="text-xs text-[#77767b] mt-0.5">
                Current active terminal operator • Bills and drawer entries are credited to this cashier
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <Check className="w-4 h-4" />
            <span>Terminal Session Active</span>
          </div>
        </div>

        {/* Staff Roster Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-extrabold text-xs text-[#1c1b1d] uppercase tracking-wider">
              Counter Staff & Cashiers
            </h4>
            <span className="text-[11px] text-[#77767b]">
              Tap "Switch To Operator" to permanently change cashier session
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffList.map((staff) => {
              const isActive = staff.id === activeStaffId;
              const normRole = normalizeRole(staff.role);
              const meta = ROLE_DEFINITIONS[normRole];

              return (
                <div
                  key={staff.id}
                  className={`border rounded-2xl p-4 flex flex-col justify-between bg-white shadow-2xs transition-all ${
                    isActive
                      ? 'border-[#18181b] ring-2 ring-[#18181b]'
                      : 'border-[#d4d4d8] hover:border-[#77767b]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isActive
                              ? 'bg-[#18181b] text-white'
                              : 'bg-[#f0edf0] text-[#1c1b1d]'
                          }`}
                        >
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-[#1c1b1d]">{staff.name}</h3>
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded font-black uppercase border inline-block mt-0.5 ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedStaffForPin(staff);
                          setIsPinModalOpen(true);
                        }}
                        className="p-2 bg-[#f6f2f5] hover:bg-[#eae7ea] rounded-xl text-[#1c1b1d] cursor-pointer"
                        title="Change 4-digit PIN"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-[#77767b] mt-2 line-clamp-2">
                      {meta.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#f0edf0]">
                    <span className="text-[11px] text-[#77767b] font-mono">
                      PIN: ••••
                    </span>

                    {isActive ? (
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                        Active Cashier
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectStaff(staff.id)}
                        className="px-3.5 py-1.5 bg-[#18181b] text-white rounded-xl text-xs font-extrabold hover:bg-black cursor-pointer shadow-2xs active:scale-95 transition-all"
                      >
                        Switch To Operator
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Permission Toggles (No Raw Code Tags) */}
        <div className="bg-white border border-[#d4d4d8] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f0edf0] pb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#18181b]" />
              <div>
                <h4 className="font-extrabold text-sm text-[#1c1b1d]">
                  Operational Security & Access Policies
                </h4>
                <p className="text-xs text-[#77767b]">
                  Control when billing staff require Manager/Owner PIN authorization
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">
              Owner Privileged
            </span>
          </div>

          <div className="divide-y divide-[#f0edf0]">
            {/* Toggle 1 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold text-[#1c1b1d]">
                  1. Allow Cashier to Sell on Khata (Udhar) without PIN
                </div>
                <div className="text-[11px] text-[#77767b] mt-0.5">
                  When disabled, counter staff must enter a Manager PIN to complete credit transactions.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={permissions.staff.allowKhata}
                onClick={() => handleTogglePermission('staff', 'allowKhata')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  permissions.staff.allowKhata ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    permissions.staff.allowKhata ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold text-[#1c1b1d]">
                  2. Allow Cashier to Modify Prices / Apply Manual Discounts
                </div>
                <div className="text-[11px] text-[#77767b] mt-0.5">
                  When disabled, changing item unit rates or adding discounts on the fly requires Manager authorization.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={permissions.staff.allowPriceOverride}
                onClick={() => handleTogglePermission('staff', 'allowPriceOverride')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  permissions.staff.allowPriceOverride ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    permissions.staff.allowPriceOverride ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold text-[#1c1b1d]">
                  3. Allow Staff to Receive Inward Supplier Stock
                </div>
                <div className="text-[11px] text-[#77767b] mt-0.5">
                  Allows cashiers and store assistants to enter supplier purchase invoices and replenish catalog stock.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={permissions.staff.allowStockInward}
                onClick={() => handleTogglePermission('staff', 'allowStockInward')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  permissions.staff.allowStockInward ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    permissions.staff.allowStockInward ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 4 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold text-[#1c1b1d]">
                  4. Allow Manager to View Buying Rates & Profit Margins
                </div>
                <div className="text-[11px] text-[#77767b] mt-0.5">
                  Displays wholesale cost rates and gross margin percentages to store managers in inventory reports.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={permissions.manager.viewCostPrice}
                onClick={() => handleTogglePermission('manager', 'viewCostPrice')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  permissions.manager.viewCostPrice ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    permissions.manager.viewCostPrice ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 5 */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold text-[#1c1b1d]">
                  5. Allow Manager to Cancel / Void Settled Bills
                </div>
                <div className="text-[11px] text-[#77767b] mt-0.5">
                  Allows store managers to void completed customer transactions without requiring the Owner PIN.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={permissions.manager.allowBillVoid}
                onClick={() => handleTogglePermission('manager', 'allowBillVoid')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  permissions.manager.allowBillVoid ? 'bg-emerald-600' : 'bg-zinc-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    permissions.manager.allowBillVoid ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal (Clean Overlay Modal) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-5 space-y-4 text-[#1c1b1d]">
            <div className="flex justify-between items-center border-b border-[#f0edf0] pb-2.5">
              <div>
                <h3 className="font-bold text-sm">Register New Operator</h3>
                <p className="text-[11px] text-[#77767b]">Add counter staff, cashier or manager</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#77767b] hover:text-[#1c1b1d] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Operator Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Role Privileges *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs font-bold text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
                >
                  <option value="CASHIER">STAFF / CASHIER (Fast POS Billing & Receipts)</option>
                  <option value="MANAGER">MANAGER (Approvals, Inward Stock & Cash Close)</option>
                  <option value="OWNER">STORE OWNER (Master Admin & Policy Access)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  4-Digit Security PIN *
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-sm font-mono text-center tracking-widest text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
                />
                <span className="text-[10px] text-[#77767b] block mt-1">
                  Used to authorize actions and switch terminal cashier
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#f6f2f5] text-[#1c1b1d] rounded-xl text-xs font-bold border border-[#d4d4d8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#18181b] text-white rounded-xl text-xs font-extrabold hover:bg-black cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  Save Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {isPinModalOpen && selectedStaffForPin && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3 text-[#1c1b1d]">
            <div className="flex justify-between items-center border-b border-[#f0edf0] pb-2">
              <h3 className="font-bold text-sm">
                Change PIN: {selectedStaffForPin.name}
              </h3>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="text-[#77767b] hover:text-[#1c1b1d]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Enter New 4-Digit PIN
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-sm font-mono text-center tracking-widest text-[#1c1b1d] focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#f6f2f5] text-[#1c1b1d] rounded-xl text-xs font-bold border border-[#d4d4d8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#18181b] text-white rounded-xl text-xs font-extrabold hover:bg-black cursor-pointer shadow-xs"
                >
                  Update PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
