import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, Delete, ShieldCheck, UserCheck, KeyRound, AlertCircle } from '../icons/faIcons';
import { StaffMember } from '../types';
import { posSound } from '../utils/sound';
import { normalizeRole, ROLE_DEFINITIONS } from '../utils/permissions';

interface QuickStaffSwitchModalProps {
  isOpen: boolean;
  staffList: StaffMember[];
  activeStaffId: string;
  onClose: () => void;
  onSwitchStaff: (staffId: string) => void;
  onNavigateToStaffManagement?: () => void;
}

export const QuickStaffSwitchModal: React.FC<QuickStaffSwitchModalProps> = ({
  isOpen,
  staffList,
  activeStaffId,
  onClose,
  onSwitchStaff,
  onNavigateToStaffManagement,
}) => {
  const activeStaff = staffList.find((s) => s.id === activeStaffId) || staffList[0];
  
  // Pick a target staff to switch to (default to another staff if possible)
  const defaultTarget = staffList.find((s) => s.id !== activeStaffId) || activeStaff;
  const [selectedStaff, setSelectedStaff] = useState<StaffMember>(defaultTarget || staffList[0]);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // When modal opens or activeStaff changes, reset state
  useEffect(() => {
    if (isOpen) {
      const nextTarget = staffList.find((s) => s.id !== activeStaffId) || activeStaff;
      setSelectedStaff(nextTarget || staffList[0]);
      setPin('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsVerifying(false);
    }
  }, [isOpen, activeStaffId, staffList]);

  // Handle PIN verification
  const verifyAndSwitch = useCallback(
    (pinToVerify: string, staff: StaffMember) => {
      if (pinToVerify.length !== 4) return;

      setIsVerifying(true);
      if (staff.pin === pinToVerify) {
        posSound.play('success');
        setSuccessMsg(`Switched shift to ${staff.name}`);
        setErrorMsg(null);
        setTimeout(() => {
          onSwitchStaff(staff.id);
          onClose();
        }, 350);
      } else {
        posSound.play('remove');
        setErrorMsg(`Incorrect PIN for ${staff.name}. Please try again.`);
        setPin('');
        setIsVerifying(false);
      }
    },
    [onClose, onSwitchStaff]
  );

  // Physical keyboard listener (numpad + digits)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPin((prev) => {
          if (prev.length >= 4) return prev;
          const next = prev + e.key;
          posSound.play('tap');
          setErrorMsg(null);
          if (next.length === 4) {
            setTimeout(() => verifyAndSwitch(next, selectedStaff), 50);
          }
          return next;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        posSound.play('remove');
        setPin((prev) => prev.slice(0, -1));
        setErrorMsg(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedStaff, verifyAndSwitch, onClose]);

  if (!isOpen) return null;

  const handleKeypadPress = (digit: string) => {
    if (pin.length >= 4 || isVerifying) return;
    const nextPin = pin + digit;
    posSound.play('tap');
    setPin(nextPin);
    setErrorMsg(null);

    if (nextPin.length === 4) {
      setTimeout(() => verifyAndSwitch(nextPin, selectedStaff), 50);
    }
  };

  const handleBackspace = () => {
    posSound.play('remove');
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    posSound.play('remove');
    setPin('');
    setErrorMsg(null);
  };

  const handleSelectStaff = (staff: StaffMember) => {
    posSound.play('tap');
    setSelectedStaff(staff);
    setPin('');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-zinc-100 text-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 leading-tight">Switch Cashier Shift</h2>
              <p className="text-xs text-zinc-500 font-normal">1-Second Counter Switch with 4-Digit PIN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Step 1: Select Operator */}
          <div>
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
              Select Incoming Cashier / Operator
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {staffList.map((staff) => {
                const isCurrentActive = staff.id === activeStaffId;
                const isSelected = staff.id === selectedStaff.id;

                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => handleSelectStaff(staff)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs scale-[1.02]'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      {(() => {
                        const normRole = normalizeRole(staff.role);
                        const meta = ROLE_DEFINITIONS[normRole];
                        return (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono uppercase ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : `${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder}`
                            }`}
                          >
                            {meta.badgeLabel}
                          </span>
                        );
                      })()}
                      {isCurrentActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Currently Logged In" />
                      )}
                    </div>
                    <span className="text-xs font-black truncate">{staff.name}</span>
                    <span
                      className={`text-[10px] font-mono mt-0.5 ${
                        isSelected ? 'text-blue-100' : 'text-zinc-500'
                      }`}
                    >
                      {isCurrentActive ? 'Active Now' : 'Tap to Switch'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: 4-Digit PIN Input & Indicators */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-700">
              <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
              <span>Enter 4-Digit PIN for {selectedStaff.name}</span>
            </div>

            {/* 4 PIN Dots */}
            <div className="flex justify-center items-center gap-4 py-1">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      isFilled
                        ? 'bg-zinc-900 scale-125 ring-4 ring-zinc-300'
                        : 'bg-zinc-200 border-2 border-zinc-300'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error or Success Message */}
            {errorMsg && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-600 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Security note */}
            <p className="text-[11px] text-zinc-400 font-medium">
              Authorized operators enter 4-digit terminal security PIN
            </p>
          </div>

          {/* On-Screen Touch Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="py-3 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl text-lg font-black text-zinc-900 shadow-2xs active:scale-95 transition-all cursor-pointer font-mono"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-3 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 active:scale-95 transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-3 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl text-lg font-black text-zinc-900 shadow-2xs active:scale-95 transition-all cursor-pointer font-mono"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-700 active:scale-95 transition-all cursor-pointer"
              title="Backspace"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Footer with Staff Admin Link */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Owner master password kept safe</span>
            </div>
            {onNavigateToStaffManagement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToStaffManagement();
                }}
                className="text-[11px] font-bold text-zinc-800 hover:text-black hover:underline cursor-pointer"
              >
                Manage Staff / Reset PIN
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
