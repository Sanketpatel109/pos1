import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Lock,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  FileText,
  Settings,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SubscriptionState } from '../types/subscription';
import { SubscriptionStatusInfo } from '../store/useSubscriptionStore';

export interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  state: SubscriptionState;
  statusInfo: SubscriptionStatusInfo;
  onClose: () => void;
  onSubmitUtr: (utr: string, meta?: { storeName?: string; ownerEmail?: string; ownerName?: string }) => { success: boolean; message: string };
  storeName?: string;
  ownerEmail?: string;
  onOpenSettings?: () => void;
  onOpenReports?: () => void;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  state,
  statusInfo,
  onClose,
  onSubmitUtr,
  storeName = '',
  ownerEmail = '',
  onOpenSettings,
  onOpenReports,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [utrInput, setUtrInput] = useState<string>('');
  const [utrMessage, setUtrMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Generate NPCI UPI QR string
  const cleanStoreId = encodeURIComponent(state.storeId || 'store');
  const upiPayload = `upi://pay?pa=monopos@upi&pn=MonoPOS&am=1999&cu=INR&tn=MonoPOS%20Pro%20${cleanStoreId}`;

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(upiPayload, {
        width: 180,
        margin: 2,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.warn('QR Code generation failed:', err));
    }
  }, [isOpen, upiPayload]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('monopos@upi').catch(() => {});
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleUtrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUtrMessage(null);
    const res = onSubmitUtr(utrInput, {
      storeName,
      ownerEmail,
    });
    if (res.success) {
      setUtrMessage({ type: 'success', text: res.message });
      setUtrInput('');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setUtrMessage({ type: 'error', text: res.message });
    }
  };


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-3xl border-border bg-card">
        {/* Header with Lock Notice */}
        <div className="p-5 sm:p-6 bg-muted/40 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 border border-destructive/20 shadow-xs">
                <Lock className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {statusInfo.isTampered
                    ? 'Security Lock: Clock Tamper Detected'
                    : 'Counter Billing Paused: Subscription Expired'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {statusInfo.isTampered
                    ? 'Local system clock was rolled back. Settle payment to restore.'
                    : `Your ${state.plan === 'ANNUAL_PRO' ? 'Annual Pro plan' : '14-Day Free Trial'} expired on ${statusInfo.expiresAtFormatted}.`}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Read-Only Safeguard Guarantee Notice */}
          <div className="mt-3.5 p-2.5 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] text-muted-foreground">
                Store records, sales history, and Z-reports are <strong className="text-foreground">100% safe & accessible</strong>.
              </span>
            </div>
            {onOpenReports && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  onClose();
                  onOpenReports();
                }}
                className="gap-1 text-[10px] shrink-0"
              >
                <FileText className="size-3" />
                View Sales
              </Button>
            )}
          </div>
        </div>

        {/* Modal Body: Renewal via UPI QR and UTR */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <QrCode className="size-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Renew Subscription via UPI (₹1,999/yr)
            </h3>
          </div>

          <div className="space-y-4">
            {/* UPI QR and Amount */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-muted/20 border border-border rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-xs border border-border/50 shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="MonoPOS UPI QR" className="size-32 object-contain" />
                ) : (
                  <div className="size-32 flex items-center justify-center bg-muted text-xs text-muted-foreground">
                    Generating QR...
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                <div>
                  <span className="text-[11px] text-muted-foreground">Annual Renewal:</span>
                  <p className="text-base font-bold text-foreground">₹1,999 <span className="text-xs font-normal text-muted-foreground">/ year</span></p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">UPI ID:</span>
                  <div className="flex items-center gap-1.5 mt-0.5 justify-center sm:justify-start">
                    <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                      monopos@upi
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={handleCopyUpi}
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Store ID: <span className="font-mono text-foreground font-semibold">{state.storeId}</span>
                </p>
              </div>
            </div>

            {/* Instant UPI Reference (UTR) Form */}
            <form onSubmit={handleUtrSubmit} className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="expired-modal-utr" className="text-xs font-medium">
                    Submit UPI Reference (UTR) Number
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {utrInput.length}/12
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Paid successfully? Enter the 12-digit UTR number from your payment receipt to unlock billing immediately. Your annual subscription confirms automatically in the background.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  id="expired-modal-utr"
                  type="text"
                  maxLength={12}
                  placeholder="12-digit UTR from UPI app receipt"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, ''))}
                  className="font-mono text-xs"
                />
                <Button
                  type="submit"
                  disabled={utrInput.trim().length !== 12}
                  size="sm"
                  className="shrink-0 cursor-pointer"
                >
                  Unlock Instantly
                </Button>
              </div>
            </form>

            {utrMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  utrMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-destructive/10 border border-destructive/20 text-destructive'
                }`}
              >
                {utrMessage.type === 'success' ? (
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                )}
                <span>{utrMessage.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-5 sm:px-6 flex items-center justify-between border-t border-border bg-muted/20">
            {onOpenSettings && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Settings className="size-3.5" />
                Open Settings
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs ml-auto"
            >
              Continue in Read-Only Mode
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
};
