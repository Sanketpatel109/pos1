import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StaffMember } from '../types';
import { normalizeRole } from '../utils/permissions';
import { posSound } from '../utils/sound';

interface ForgotPinRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  currentUserEmail?: string;
  targetRole?: 'OWNER' | 'MANAGER' | 'ALL';
  targetStaffId?: string;
  onPinReset: (staffId: string, newPin: string) => Promise<void> | void;
  onSuccess?: (staff: StaffMember, newPin: string) => void;
}

export const ForgotPinRecoveryModal: React.FC<ForgotPinRecoveryModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentUserEmail,
  targetRole = 'ALL',
  targetStaffId,
  onPinReset,
  onSuccess,
}) => {
  // Find owner staff member
  const ownerStaff = staffList.find((s) => normalizeRole(s.role) === 'OWNER') || staffList[0];

  // Selected staff to reset
  const [selectedStaffId, setSelectedStaffId] = useState<string>(() => {
    if (targetStaffId) return targetStaffId;
    if (targetRole === 'OWNER') return ownerStaff?.id || '';
    return ownerStaff?.id || '';
  });

  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Sync target when opened
  useEffect(() => {
    if (isOpen) {
      if (targetStaffId) {
        setSelectedStaffId(targetStaffId);
      } else if (targetRole === 'OWNER' && ownerStaff) {
        setSelectedStaffId(ownerStaff.id);
      } else if (ownerStaff) {
        setSelectedStaffId(ownerStaff.id);
      }
      setNewPin('');
      setConfirmPin('');
      setError('');
      setIsSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen, targetStaffId, targetRole, ownerStaff]);

  if (!isOpen) return null;

  const currentTargetStaff = staffList.find((s) => s.id === selectedStaffId) || ownerStaff;
  const isTargetOwner = currentTargetStaff ? normalizeRole(currentTargetStaff.role) === 'OWNER' : false;

  const handlePinInput = (val: string, type: 'new' | 'confirm') => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    if (type === 'new') {
      setNewPin(cleaned);
    } else {
      setConfirmPin(cleaned);
    }
    setError('');
  };

  const handleResetSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!currentTargetStaff) {
      setError('Please select a staff member to reset.');
      return;
    }

    if (newPin.length !== 4) {
      setError('PIN must be exactly 4 numeric digits.');
      posSound.playBuzzer();
      return;
    }

    if (newPin !== confirmPin) {
      setError('Confirmation PIN does not match. Please re-enter.');
      posSound.playBuzzer();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onPinReset(currentTargetStaff.id, newPin);
      posSound.playBeep();
      setIsSuccess(true);

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(currentTargetStaff, newPin);
        }
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update PIN. Please try again.';
      setError(msg);
      posSound.playBuzzer();
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <KeyRound className="size-4 text-primary" />
            <span>{isTargetOwner ? 'Master Owner PIN Recovery' : 'Staff PIN Recovery'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isTargetOwner
              ? 'Reset your 4-digit Master Owner PIN using your authenticated store session.'
              : 'As the Store Owner, assign a new 4-digit PIN for this staff member.'}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
            <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="font-bold text-sm text-foreground">PIN Updated Successfully!</h3>
            <p className="text-xs text-muted-foreground">
              New PIN for <strong className="text-foreground">{currentTargetStaff?.name}</strong> has been saved and synced.
            </p>
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-4 py-1">
            {/* Authenticated Account Banner */}
            <Card className="bg-muted/40 border border-border">
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-foreground truncate">
                      {currentUserEmail || 'Store Owner Account'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Authorized Store Administrator
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/10 shrink-0">
                  Verified Session
                </Badge>
              </CardContent>
            </Card>

            {/* Target Staff Info */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Resetting PIN For
              </Label>
              {targetRole === 'ALL' && staffList.length > 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {staffList.map((staff) => {
                    const isSelected = staff.id === selectedStaffId;
                    const role = normalizeRole(staff.role);
                    return (
                      <Card
                        key={staff.id}
                        onClick={() => {
                          setSelectedStaffId(staff.id);
                          setError('');
                        }}
                        className={`cursor-pointer transition-all border p-2.5 ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                            : 'hover:border-muted-foreground/40'
                        }`}
                      >
                        <CardContent className="p-0 flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">
                              {staff.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {role}
                            </div>
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                              Selected
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      {currentTargetStaff?.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {currentTargetStaff ? normalizeRole(currentTargetStaff.role) : 'OWNER'}
                  </Badge>
                </div>
              )}
            </div>

            {/* New PIN & Confirm PIN Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recovery-new-pin" className="text-xs font-semibold text-foreground">
                    New 4-Digit PIN
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPin(!showPin)}
                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? (
                      <EyeOff className="size-3 mr-1" />
                    ) : (
                      <Eye className="size-3 mr-1" />
                    )}
                    {showPin ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <Input
                  id="recovery-new-pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => handlePinInput(e.target.value, 'new')}
                  placeholder="••••"
                  autoFocus
                  className="font-mono text-center text-lg tracking-widest h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recovery-confirm-pin" className="text-xs font-semibold text-foreground">
                  Confirm PIN
                </Label>
                <Input
                  id="recovery-confirm-pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => handlePinInput(e.target.value, 'confirm')}
                  placeholder="••••"
                  className="font-mono text-center text-lg tracking-widest h-10"
                />
              </div>
            </div>

            {/* Validation / Error Message */}
            {error && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {newPin.length === 4 && confirmPin.length === 4 && newPin === confirmPin && (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>PIN matches. Ready to save.</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={newPin.length !== 4 || confirmPin.length !== 4 || newPin !== confirmPin || isSubmitting}
              >
                {isSubmitting ? (
                  'Saving PIN...'
                ) : (
                  <>
                    <KeyRound className="size-3.5 mr-1" />
                    Save & Update PIN
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
