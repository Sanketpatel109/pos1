import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  QrCode,
  KeyRound,
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
  onActivateLicenseKey: (key: string) => { success: boolean; message: string };
}

export const SubscriptionTab: React.FC<SubscriptionTabProps> = ({
  state,
  statusInfo,
  onSubmitUtr,
  onActivateLicenseKey,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [utrInput, setUtrInput] = useState<string>('');
  const [utrMessage, setUtrMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [licenseKeyInput, setLicenseKeyInput] = useState<string>('');
  const [licenseMessage, setLicenseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [copiedUpi, setCopiedUpi] = useState(false);

  // Generate NPCI UPI QR string:
  // upi://pay?pa=monopos@upi&pn=MonoPOS&am=1999&cu=INR&tn=MonoPOS%20Pro%20{storeId}
  const cleanStoreId = encodeURIComponent(state.storeId || 'store');
  const upiPayload = `upi://pay?pa=monopos@upi&pn=MonoPOS&am=1999&cu=INR&tn=MonoPOS%20Pro%20${cleanStoreId}`;

  useEffect(() => {
    QRCode.toDataURL(upiPayload, {
      width: 200,
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

  const handleLicenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLicenseMessage(null);
    const res = onActivateLicenseKey(licenseKeyInput);
    if (res.success) {
      setLicenseMessage({ type: 'success', text: res.message });
      setLicenseKeyInput('');
    } else {
      setLicenseMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Top Banner: Current Subscription Plan Overview */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
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
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Store ID: <span className="font-mono text-foreground font-semibold">{state.storeId}</span>
              </CardDescription>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-muted-foreground block">
                {statusInfo.isExpired ? 'Expired on' : 'Expires on'}
              </span>
              <span className="text-sm font-bold text-foreground">
                {statusInfo.expiresAtFormatted}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <span className="text-[11px] text-muted-foreground block">Billing Status</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                {statusInfo.isAccessible ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    Terminal Unlocked
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5 text-destructive" />
                    Counter Billing Locked
                  </>
                )}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <span className="text-[11px] text-muted-foreground block">Time Remaining</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                <Clock className="size-3.5 text-muted-foreground" />
                {statusInfo.isGracePeriod
                  ? `${statusInfo.hoursRemainingInGrace} Hours Grace`
                  : statusInfo.isExpired
                  ? 'Expired'
                  : `${statusInfo.daysRemaining} Days Left`}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <span className="text-[11px] text-muted-foreground block">Annual Price</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                <Sparkles className="size-3.5 text-primary" />
                ₹1,999 / year (All Features)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Columns: Renewal UPI QR & UTR Grace + Offline License Key */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Direct UPI QR Code & 12-Digit UTR Submission */}
        <Card className="border-border shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <QrCode className="size-5 text-primary" />
              <CardTitle className="text-base font-bold">Renew via UPI QR</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Scan with GPay, PhonePe, Paytm, or BHIM to pay ₹1,999/yr for MonoPOS Pro.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* QR Code Container */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-muted/20 border border-border rounded-lg">
              <div className="p-2 bg-white rounded-md shadow-xs border border-border/50 shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="MonoPOS UPI QR Code" className="size-36 object-contain" />
                ) : (
                  <div className="size-36 flex items-center justify-center bg-muted text-xs text-muted-foreground">
                    Generating QR...
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <div>
                  <span className="text-xs text-muted-foreground">Amount:</span>
                  <p className="text-lg font-bold text-foreground">₹1,999 <span className="text-xs font-normal text-muted-foreground">/ year</span></p>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground">UPI ID:</span>
                  <div className="flex items-center gap-1.5 mt-0.5 justify-center sm:justify-start">
                    <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
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

                <p className="text-[11px] text-muted-foreground">
                  Include note: <span className="font-mono text-foreground font-semibold">{`MonoPOS Pro ${state.storeId}`}</span>
                </p>
              </div>
            </div>

            <Separator />

            {/* 12-Digit UTR Reference Submission Form */}
            <form onSubmit={handleUtrSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sub-utr-input" className="text-xs font-medium">
                  Submit 12-Digit UPI Ref / UTR Number
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  After paying, enter the 12-digit UTR from your UPI app receipt to activate an <strong className="text-foreground">instant 24-hour grace period</strong>.
                </p>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="sub-utr-input"
                    type="text"
                    maxLength={12}
                    placeholder="e.g. 524189012345"
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
                    Activate Grace
                  </Button>
                </div>
              </div>

              {utrMessage && (
                <div
                  className={`p-2.5 rounded-md text-xs flex items-start gap-2 ${
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

        {/* Right Column: Offline License Key Activation */}
        <Card className="border-border shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              <CardTitle className="text-base font-bold">Offline License Activation</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Activate an official offline cryptographic key issued by your MonoPOS administrator.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-foreground">Offline Cryptographic Guarantee</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Keys work 100% offline without internet connection by verifying cryptographic SHA-256 signatures against your unique Store ID.
              </p>
              <div className="pt-1 text-[11px]">
                <span className="text-muted-foreground">Key Format: </span>
                <code className="font-mono text-foreground font-semibold">MPOS-YYYYMMDD-XXXXXXXXXXXX</code>
              </div>
            </div>

            <form onSubmit={handleLicenseSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sub-license-input" className="text-xs font-medium">
                  Enter License Key
                </Label>
                <Input
                  id="sub-license-input"
                  type="text"
                  placeholder="MPOS-20271231-A1B2C3D4E5F6"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                  className="font-mono text-xs uppercase tracking-wider"
                />
              </div>

              <Button
                type="submit"
                disabled={!licenseKeyInput.trim()}
                className="w-full cursor-pointer"
                size="sm"
              >
                Verify & Activate License
              </Button>

              {licenseMessage && (
                <div
                  className={`p-2.5 rounded-md text-xs flex items-start gap-2 ${
                    licenseMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-destructive/10 border border-destructive/20 text-destructive'
                  }`}
                >
                  {licenseMessage.type === 'success' ? (
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  )}
                  <span>{licenseMessage.text}</span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
