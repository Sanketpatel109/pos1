import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SubscriptionState } from '../../types/subscription';
import { SubscriptionStatusInfo } from '../../store/useSubscriptionStore';

export interface SubscriptionTabProps {
  state: SubscriptionState;
  statusInfo: SubscriptionStatusInfo;
  onSubmitUtr: (utr: string) => { success: boolean; message: string };
}

export const SubscriptionTab: React.FC<SubscriptionTabProps> = ({
  state,
  statusInfo,
  onSubmitUtr,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [utrInput, setUtrInput] = useState<string>('');
  const [utrMessage, setUtrMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Generate NPCI UPI QR string:
  // upi://pay?pa=monopos@upi&pn=MonoPOS&am=1999&cu=INR&tn=MonoPOS%20Pro%20{storeId}
  const cleanStoreId = encodeURIComponent(state.storeId || 'store');
  const upiPayload = `upi://pay?pa=monopos@upi&pn=MonoPOS&am=1999&cu=INR&tn=MonoPOS%20Pro%20${cleanStoreId}`;

  useEffect(() => {
    QRCode.toDataURL(upiPayload, {
      width: 220,
      margin: 2,
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR Code generation failed:', err));
  }, [upiPayload]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('monopos@upi').catch(() => {});
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleUtrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUtrMessage(null);
    const res = onSubmitUtr(utrInput);
    if (res.success) {
      setUtrMessage({ type: 'success', text: res.message });
      setUtrInput('');
    } else {
      setUtrMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-5 w-full pb-8">
      {/* Top Card: Current Subscription Plan Overview */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold">
                  {state.plan === 'ANNUAL_PRO' ? 'MonoPOS Annual Pro' : 'MonoPOS Free Trial'}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    statusInfo.dotColor === 'green'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : statusInfo.dotColor === 'amber'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                      : 'border-destructive/30 bg-destructive/10 text-destructive font-semibold'
                  }
                >
                  <span
                    className={`inline-block size-1.5 rounded-full mr-1.5 ${
                      statusInfo.dotColor === 'green'
                        ? 'bg-emerald-500'
                        : statusInfo.dotColor === 'amber'
                        ? 'bg-amber-500'
                        : 'bg-destructive'
                    }`}
                  />
                  {statusInfo.status === 'ACTIVE'
                    ? 'Active'
                    : statusInfo.status === 'TRIAL'
                    ? '14-Day Free Trial'
                    : statusInfo.status === 'GRACE_PERIOD'
                    ? 'Grace Period (24h Active)'
                    : 'Expired'}
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Store ID: <span className="font-mono text-foreground font-semibold">{state.storeId}</span>
              </CardDescription>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] text-muted-foreground block">
                {statusInfo.isExpired ? 'Expired on' : 'Expires on'}
              </span>
              <span className="text-sm font-bold text-foreground">
                {statusInfo.expiresAtFormatted}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <span className="text-[11px] text-muted-foreground block">Billing Terminal</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                {statusInfo.isAccessible ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Counter Unlocked
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5 text-destructive shrink-0" />
                    Counter Locked
                  </>
                )}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <span className="text-[11px] text-muted-foreground block">Time Remaining</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                <Clock className="size-3.5 text-muted-foreground shrink-0" />
                {statusInfo.isGracePeriod
                  ? `${statusInfo.hoursRemainingInGrace} Hours Grace`
                  : statusInfo.isExpired
                  ? 'Expired'
                  : `${statusInfo.daysRemaining} Days Left`}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <span className="text-[11px] text-muted-foreground block">All Features Plan</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                <Sparkles className="size-3.5 text-primary shrink-0" />
                ₹1,999 / year
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Renewal via UPI QR Code & 12-Digit UTR Submission */}
      <Card className="border-border shadow-xs w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="size-5 text-primary" />
            <CardTitle className="text-base font-bold">Renew via UPI QR</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Scan with GPay, PhonePe, Paytm, or BHIM to pay ₹1,999/yr for MonoPOS Pro.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* QR Code and Payment Details */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 bg-muted/20 border border-border rounded-lg">
            <div className="p-2.5 bg-white rounded-md shadow-xs border border-border/50 shrink-0 flex flex-col items-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="MonoPOS UPI QR Code" className="size-36 object-contain" />
              ) : (
                <div className="size-36 flex items-center justify-center bg-muted text-xs text-muted-foreground">
                  Generating QR...
                </div>
              )}
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-1">Scan to Pay</span>
            </div>

            <div className="space-y-3 text-center sm:text-left flex-1 min-w-0 w-full">
              <div>
                <span className="text-[11px] text-muted-foreground block">Renewal Amount:</span>
                <p className="text-2xl font-bold text-foreground">
                  ₹1,999 <span className="text-xs font-normal text-muted-foreground">/ year</span>
                </p>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground block">UPI ID:</span>
                <div className="flex items-center gap-1.5 mt-0.5 justify-center sm:justify-start">
                  <code className="text-xs font-mono bg-muted px-2.5 py-1 rounded text-foreground font-semibold">
                    monopos@upi
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    onClick={handleCopyUpi}
                    title="Copy UPI ID"
                    className="h-7 w-7 shrink-0 cursor-pointer"
                  >
                    {copiedUpi ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground block">Reference Note:</span>
                <p className="text-xs font-mono text-foreground font-semibold truncate" title={`MonoPOS Pro ${state.storeId}`}>
                  MonoPOS Pro {state.storeId}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* UPI Reference (UTR) Submission Form */}
          <form onSubmit={handleUtrSubmit} className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="sub-utr-input" className="text-xs font-medium">
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

            <div className="flex gap-2 max-w-md">
              <Input
                id="sub-utr-input"
                type="text"
                maxLength={12}
                placeholder="e.g. 524189012345"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, ''))}
                className="font-mono text-xs flex-1"
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

            {utrMessage && (
              <div
                className={`p-2.5 rounded-md text-xs flex items-start gap-2 max-w-md ${
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

