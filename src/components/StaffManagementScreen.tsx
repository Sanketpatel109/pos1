import React, { useState } from 'react';
import { UserCheck, Shield, KeyRound, Plus, Check, X, ShieldCheck, Lock } from 'lucide-react';
import { StaffMember, StaffRole } from '../types';
import { normalizeRole, ROLE_DEFINITIONS } from '../utils/permissions';

interface StaffManagementScreenProps {
  staffList: StaffMember[];
  activeStaffId: string;
  onSelectStaff: (staffId: string) => void;
  onAddStaff: (staff: Omit<StaffMember, 'id'>) => void;
  onUpdatePin: (staffId: string, newPin: string) => void;
}

export const StaffManagementScreen: React.FC<StaffManagementScreenProps> = ({
  staffList,
  activeStaffId,
  onSelectStaff,
  onAddStaff,
  onUpdatePin,
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
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForPin || newPin.length < 4) return;

    onUpdatePin(selectedStaffForPin.id, newPin);
    setIsPinModalOpen(false);
    setNewPin('');
    setSelectedStaffForPin(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fcf8fb] overflow-hidden">
      {/* Top Bar */}
      <div className="bg-[#f6f2f5] border-b border-[#d4d4d8] p-3.5 sm:p-4 flex justify-between items-center shrink-0">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
            Terminal Access & Cashier Management
          </span>
          <span className="text-sm sm:text-base font-extrabold text-[#1c1b1d]">
            {staffList.length} Registered Operators
          </span>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Add Operator</span>
        </button>
      </div>

      {/* Main Responsive Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left Column (Tablet View): Active Session Card + Quick Add Form */}
        <div className="hidden md:flex md:w-1/3 lg:w-3/10 bg-white border-r border-[#d4d4d8] flex-col p-4 space-y-4">
          <div className="bg-[#f6f2f5] border border-[#d4d4d8] rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
              Active Terminal Session
            </span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#18181b] text-white flex items-center justify-center font-black text-base">
                {activeStaff?.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-black text-sm text-[#1c1b1d]">{activeStaff?.name}</h3>
                <span className="text-[10px] font-bold bg-[#eae7ea] text-[#1c1b1d] px-2 py-0.5 rounded font-mono">
                  {activeStaff?.role}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 pt-1">
              <Check className="w-3.5 h-3.5" /> Logged In & Signed To Bills
            </p>
          </div>

          {/* Quick Register */}
          <div className="space-y-3 pt-2 border-t border-[#f0edf0]">
            <h4 className="font-extrabold text-xs text-[#1c1b1d] uppercase tracking-wider">
              Quick Add Operator
            </h4>
            <form onSubmit={handleCreateStaff} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Operator Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter 02 Cashier"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Role / Privileges
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
                >
                  <option value="OWNER">OWNER (Master Store Admin)</option>
                  <option value="MANAGER">MANAGER (Operations & Approvals)</option>
                  <option value="CASHIER">CASHIER (Standard POS Checkout)</option>
                  <option value="WORKER">WORKER (Stock Receiving & Labels)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs font-mono text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold shadow-2xs cursor-pointer active:scale-95 transition-all"
              >
                Register Operator
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Staff Roster Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 no-scrollbar bg-[#fcf8fb]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {staffList.map((staff) => {
              const isActive = staff.id === activeStaffId;
              return (
                <div
                  key={staff.id}
                  className={`border rounded-2xl p-4 flex flex-col justify-between shadow-2xs transition-all ${
                    isActive
                      ? 'bg-white border-[#18181b] ring-2 ring-[#18181b]'
                      : 'bg-white border-[#d4d4d8] hover:border-[#18181b]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isActive
                            ? 'bg-[#18181b] text-white'
                            : 'bg-[#f0edf0] text-[#1c1b1d]'
                        }`}
                      >
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs sm:text-sm text-[#1c1b1d]">{staff.name}</h3>
                        {(() => {
                          const normRole = normalizeRole(staff.role);
                          const meta = ROLE_DEFINITIONS[normRole];
                          return (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                            >
                              {meta.label}
                            </span>
                          );
                        })()}
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

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#f0edf0]">
                    <span className="text-[11px] text-[#77767b] font-mono">
                      PIN: ••••
                    </span>

                    {isActive ? (
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
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
      </div>

      {/* Add Staff Modal (For Mobile view) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3 text-[#1c1b1d]">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Create Staff Account</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#77767b] hover:text-[#1c1b1d]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Operator Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter 03 Cashier"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                >
                  <option value="OWNER">OWNER (Master Store Admin)</option>
                  <option value="MANAGER">MANAGER (Operations & Approvals)</option>
                  <option value="CASHIER">CASHIER (Standard POS Checkout)</option>
                  <option value="WORKER">WORKER (Stock Receiving & Labels)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 bg-[#f6f2f5] text-[#1c1b1d] rounded-xl text-xs font-bold border border-[#d4d4d8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#18181b] text-white rounded-xl text-xs font-bold hover:bg-black"
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3 text-[#1c1b1d]">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">
                Change PIN for {selectedStaffForPin.name}
              </h3>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="text-[#77767b] hover:text-[#1c1b1d]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 py-2 bg-[#f6f2f5] text-[#1c1b1d] rounded-xl text-xs font-bold border border-[#d4d4d8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#18181b] text-white rounded-xl text-xs font-bold hover:bg-black"
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
