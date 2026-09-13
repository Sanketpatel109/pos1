import React, { useState } from 'react';
import { ShieldAlert, Check, Lock, Delete, KeyRound } from 'lucide-react';
import { StaffMember } from '../types';
import { verifyManagerOrOwnerPin, verifyOwnerPin, normalizeRole } from '../utils/permissions';
import { posSound } from '../utils/sound';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ForgotPinRecoveryModal } from './ForgotPinRecoveryModal';

interface ManagerPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  currentUserEmail?: string;
  activeStaffName?: string;
  activeStaffRole?: string;
  actionTitle?: string;
  actionDescription?: string;
  title?: string;
  description?: string;
  requiredRole?: 'MANAGER' | 'OWNER';
  requiredRoleLabel?: string;
  onPinReset?: (staffId: string, newPin: string) => Promise<void> | void;
  onAuthorized?: (authorizingStaff: StaffMember) => void;
  onSuccess?: (authorizingStaff: StaffMember) => void;
}

export const ManagerPinModal: React.FC<ManagerPinModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentUserEmail,
  activeStaffName,
  activeStaffRole,
  actionTitle,
  actionDescription,
  title,
  description,
  requiredRole = 'MANAGER',
  requiredRoleLabel,
  onPinReset,
  onAuthorized,
  onSuccess,
}) => {
  const displayTitle = title || actionTitle || 'Manager Authorization Required';
  const displayDesc = description || actionDescription || 'This area contains confidential business data or privileged controls.';
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Lock className="size-4 text-foreground" />
            <span>{displayTitle}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {requiredRoleLabel ? `Security Override • ${requiredRoleLabel}` : 'Security Override'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center text-center space-y-3">
          {/* Elevation notice */}
          <div className="w-full bg-muted/60 border border-border rounded-md p-2.5 text-left">
            <div className="flex items-center gap-1.5 text-foreground font-medium text-xs">
              <ShieldAlert className="size-3.5 text-primary shrink-0" />
              <span>Temporary Action Approval Only</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Authorizes this single operation only. Current session stays under{' '}
              <strong className="font-semibold text-foreground">
                {activeStaffName || 'Staff'} {activeStaffRole ? `(${activeStaffRole})` : ''}
              </strong>.
            </p>
          </div>

          <p className="text-xs text-muted-foreground max-w-xs">{displayDesc}</p>

          {/* Authorizers badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
              Approvers:
            </span>
            {managers.map((m) => (
              <Badge key={m.id} variant="secondary" className="text-[11px] font-medium">
                {m.name}
              </Badge>
            ))}
          </div>

          {/* PIN Display Circles */}
          <div className="flex justify-center gap-3 py-1">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`size-3.5 rounded-full border transition-all ${
                  pin.length > idx
                    ? 'bg-foreground border-foreground scale-110'
                    : 'bg-transparent border-input'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1">
              <ShieldAlert className="size-3.5 shrink-0" />
              {error}
            </p>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] pt-1">
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
              aria-label="Backspace"
              className="h-10 text-xs font-medium text-muted-foreground"
            >
              <Delete className="size-4" />
            </Button>
          </div>

          {/* Forgot PIN Recovery Link */}
          <div className="pt-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setIsRecoveryOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground h-auto p-0 flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="size-3" />
              Forgot PIN? Reset with Store Account
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pin.length < 4}
            onClick={() => handleSubmit()}
          >
            <Check className="size-3.5 mr-1" />
            Authorize
          </Button>
        </DialogFooter>

        {/* PIN Recovery Modal */}
        <ForgotPinRecoveryModal
          isOpen={isRecoveryOpen}
          onClose={() => setIsRecoveryOpen(false)}
          staffList={staffList}
          currentUserEmail={currentUserEmail}
          targetRole={isOwnerOnly ? 'OWNER' : 'ALL'}
          onPinReset={async (staffId, newPinVal) => {
            if (onPinReset) {
              await onPinReset(staffId, newPinVal);
            }
          }}
          onSuccess={(staff) => {
            setIsRecoveryOpen(false);
            if (onSuccess) onSuccess(staff);
            if (onAuthorized) onAuthorized(staff);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ManagerPinModal;
