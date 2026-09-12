import React, { useState, useEffect, useCallback } from 'react';
import { Check, Delete, ShieldCheck, UserCheck, KeyRound, AlertCircle } from 'lucide-react';
import { StaffMember } from '../types';
import { posSound } from '../utils/sound';
import { normalizeRole, ROLE_DEFINITIONS } from '../utils/permissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        if (isVerifying) return;
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
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedStaff, verifyAndSwitch, onClose, isVerifying]);

  const handleKeypadPress = (digit: string) => {
    if (pin.length >= 4 || isVerifying) return;
    posSound.play('tap');
    const nextPin = pin + digit;
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <UserCheck className="size-4 text-foreground" />
            <span>Switch Cashier Shift</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select incoming operator and enter 4-digit terminal security PIN.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Select Operator */}
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Select Incoming Cashier / Operator
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {staffList.map((staff) => {
                const isCurrentActive = staff.id === activeStaffId;
                const isSelected = staff.id === selectedStaff.id;
                const normRole = normalizeRole(staff.role);
                const meta = ROLE_DEFINITIONS[normRole];

                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => handleSelectStaff(staff)}
                    className={`p-2.5 rounded-md border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Badge
                        variant={isSelected ? "outline" : "secondary"}
                        className={`text-[9px] px-1.5 py-0 uppercase ${isSelected ? 'text-primary-foreground border-primary-foreground/30' : ''}`}
                      >
                        {meta.badgeLabel}
                      </Badge>
                      {isCurrentActive && (
                        <span className="size-2 rounded-full bg-primary animate-pulse" title="Currently Logged In" />
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate">{staff.name}</span>
                    <span
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
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
          <div className="bg-muted/30 border border-border rounded-md p-3 text-center space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-foreground">
              <KeyRound className="size-3.5 text-muted-foreground" />
              <span>Enter 4-Digit PIN for {selectedStaff.name}</span>
            </div>

            {/* 4 PIN Dots */}
            <div className="flex justify-center items-center gap-3 py-1">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`size-3 rounded-full transition-all duration-150 ${
                      isFilled
                        ? 'bg-foreground scale-125 ring-2 ring-primary/40'
                        : 'bg-transparent border border-input'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error or Success Message */}
            {errorMsg && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary">
                <Check className="size-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          {/* On-Screen Touch Numpad */}
          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <Button
                key={digit}
                type="button"
                variant="outline"
                onClick={() => handleKeypadPress(digit)}
                className="h-10 text-base font-semibold"
              >
                {digit}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              className="h-10 text-xs font-medium text-muted-foreground"
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleKeypadPress('0')}
              className="h-10 text-base font-semibold"
            >
              0
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleBackspace}
              className="h-10 text-xs font-medium text-muted-foreground"
              title="Backspace"
            >
              <Delete className="size-4" />
            </Button>
          </div>

          {/* Footer with Staff Admin Link */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1 text-[11px]">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>PIN protected terminal shift</span>
            </div>
            {onNavigateToStaffManagement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToStaffManagement();
                }}
                className="text-[11px] font-medium text-foreground hover:underline cursor-pointer"
              >
                Manage Staff / Reset PIN
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickStaffSwitchModal;
