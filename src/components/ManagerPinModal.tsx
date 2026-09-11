import React, { useState } from 'react';
import { ShieldAlert, KeyRound, X, Check, Lock, Delete } from '../icons/faIcons';
import { StaffMember } from '../types';
import { verifyManagerOrOwnerPin, verifyOwnerPin, normalizeRole } from '../utils/permissions';
import { posSound } from '../utils/sound';

interface ManagerPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  activeStaffName?: string;
  activeStaffRole?: string;
  actionTitle?: string;
  actionDescription?: string;
  title?: string;
  description?: string;
  requiredRole?: 'MANAGER' | 'OWNER';
  requiredRoleLabel?: string;
  onAuthorized?: (authorizingStaff: StaffMember) => void;
  onSuccess?: (authorizingStaff: StaffMember) => void;
}

export const ManagerPinModal: React.FC<ManagerPinModalProps> = ({
  isOpen,
  onClose,
  staffList,
  activeStaffName,
  activeStaffRole,
  actionTitle,
  actionDescription,
  title,
  description,
  requiredRole = 'MANAGER',
  requiredRoleLabel,
  onAuthorized,
  onSuccess,
}) => {
  const displayTitle = title || actionTitle || 'Manager Authorization Required';
  const displayDesc = description || actionDescription || 'This area contains confidential business data or privileged controls.';
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isOwnerOnly = requiredRole === 'OWNER';
  const managers = staffList.filter(
    (s) => s.active && (isOwnerOnly ? normalizeRole(s.role) === 'OWNER' : (normalizeRole(s.role) === 'OWNER' || normalizeRole(s.role) === 'MANAGER'))
  );

  const handleKeypadPress = (val: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + val);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    const { verified, staff } = isOwnerOnly
      ? verifyOwnerPin(pin, staffList)
      : verifyManagerOrOwnerPin(pin, staffList);

    if (verified && staff) {
      posSound.playBeep();
      if (onSuccess) onSuccess(staff);
      if (onAuthorized) onAuthorized(staff);
      setPin('');
      setError('');
      onClose();
    } else {
      posSound.playBuzzer();
      setError(isOwnerOnly ? 'Invalid PIN. Store Owner PIN required.' : 'Invalid PIN. Manager or Owner PIN required.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-zinc-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-white">{displayTitle}</h3>
              <p className="text-[11px] text-zinc-400">
                {requiredRoleLabel ? `Security Override • ${requiredRoleLabel}` : 'Security Override'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col items-center text-center">
          {/* Decoupled Elevation vs Session Notice */}
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3 text-left">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Temporary Action Approval Only</span>
            </div>
            <p className="text-[10px] text-amber-800 mt-0.5 leading-snug">
              Authorizes this single operation only. The terminal session remains active under{' '}
              <strong className="font-extrabold text-amber-950 underline decoration-amber-400">
                {activeStaffName || 'Staff'} {activeStaffRole ? `(${activeStaffRole})` : ''}
              </strong>.
            </p>
          </div>

          <p className="text-xs text-zinc-600 mb-3 max-w-xs">{displayDesc}</p>

          {/* Authorizers badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
              Eligible Approvers:
            </span>
            {managers.map((m) => (
              <span
                key={m.id}
                className="text-[10px] font-medium bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-200"
              >
                {m.name}
              </span>
            ))}
          </div>

          {/* PIN Display Circles */}
          <div className="flex justify-center gap-3 my-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > idx
                    ? 'bg-zinc-900 border-zinc-900 scale-110'
                    : 'bg-transparent border-zinc-300'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-medium mt-2 flex items-center gap-1 animate-in fade-in">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 w-full mt-4 max-w-[240px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="h-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-base font-bold text-zinc-800 transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-600 transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-base font-bold text-zinc-800 transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              aria-label="Backspace"
              className="h-11 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-600 transition-all active:scale-95 shadow-2xs cursor-pointer flex items-center justify-center"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full mt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pin.length < 4}
              onClick={() => handleSubmit()}
              className="flex-1 py-2.5 bg-zinc-900 hover:bg-black disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Authorize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
