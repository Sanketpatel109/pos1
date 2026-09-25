import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Loader2,
  Radio,
  Hand,
  ArrowRight,
  AlertTriangle,
  RotateCw,
  Volume2,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';
import { posSound } from '../../utils/sound';
import { soundbox } from '../../utils/soundbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UpiGatewayService } from '../../services/upiGatewayService';

export interface UPIPaymentProps {
  total: number;
  billNo: number;
  currencySymbol?: string;
  storeVpa?: string;
  storeName?: string;
  verificationMode?: 'manual' | 'auto';
  razorpayKeyId?: string;
  qrTimeoutSeconds?: number;
  soundboxAnnouncement?: boolean;
  onConfirmPayment: (details: {
    upiRefNumber?: string;
    isVerified: boolean;
    verificationMethod: 'soundbox' | 'utr' | 'gateway';
  }) => void;
  isSubmitting?: boolean;
}

export const UPIPayment: React.FC<UPIPaymentProps> = ({
  total,
  billNo,
  currencySymbol = '₹',
  storeVpa = '',
  storeName = 'Store',
  verificationMode = 'manual',
  razorpayKeyId,
  qrTimeoutSeconds = 180,
  soundboxAnnouncement = true,
  onConfirmPayment,
  isSubmitting = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeMode, setActiveMode] = useState<'manual' | 'auto'>(verificationMode);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [autoStatus, setAutoStatus] = useState<'listening' | 'detected' | 'completed'>('listening');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(qrTimeoutSeconds);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [txnRefId, setTxnRefId] = useState<string>('');
  const [qrKey, setQrKey] = useState<number>(Date.now());

  // Synchronize initial prop if changed externally
  useEffect(() => {
    setActiveMode(verificationMode);
  }, [verificationMode]);

  // Generate unique transaction ID on mount or regeneration
  useEffect(() => {
    const id = UpiGatewayService.generateTransactionId(billNo);
    setTxnRefId(id);
    setSecondsRemaining(qrTimeoutSeconds);
    setIsExpired(false);
    setAutoStatus('listening');
  }, [billNo, qrKey, qrTimeoutSeconds]);

  // Dynamic NPCI UPI URL String with locked amount and reference
  const sanitizedStoreName = encodeURIComponent(storeName || 'Store').replace(/%20/g, '+');
  const upiPayload = `upi://pay?pa=${storeVpa}&pn=${sanitizedStoreName}&am=${total.toFixed(2)}&cu=INR&tn=Bill-${billNo}&tr=${txnRefId}`;

  // Render QR Canvas
  useEffect(() => {
    if (!canvasRef.current || isExpired) return;

    QRCode.toCanvas(canvasRef.current, upiPayload, {
      width: 210,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    }).catch((err) => {
      console.error('Failed to generate UPI QR canvas:', err);
    });
  }, [upiPayload, isExpired]);

  // Expiration Countdown Timer
  useEffect(() => {
    if (isExpired || autoStatus === 'completed' || isSubmitting) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExpired, autoStatus, isSubmitting]);

  // Trigger mobile haptic feedback
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {
        // Safe fallback
      }
    }
  }, []);

  // Manual payment submission handler
  const handleManualConfirm = useCallback(() => {
    if (isSubmitting || autoStatus === 'completed') return;
    triggerHaptic();
    posSound?.playTap?.();

    if (soundboxAnnouncement) {
      soundbox.announcePayment({
        amount: total,
        paymentMethod: 'UPI',
        shopName: storeName,
      }).catch(() => {});
    }

    onConfirmPayment({
      upiRefNumber: utrNumber.trim() || undefined,
      isVerified: true,
      verificationMethod: utrNumber.trim() ? 'utr' : 'soundbox',
    });
  }, [isSubmitting, autoStatus, triggerHaptic, soundboxAnnouncement, total, storeName, onConfirmPayment, utrNumber]);

  // Keyboard shortcut: Press Enter to quickly confirm manual payment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isSubmitting && activeMode === 'manual' && !isExpired) {
        e.preventDefault();
        handleManualConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualConfirm, isSubmitting, activeMode, isExpired]);

  // Auto-Detect Payment Engine (Real-Time Listener + Fallback Demo Simulator)
  useEffect(() => {
    if (activeMode !== 'auto' || isExpired || autoStatus === 'completed') {
      return;
    }

    setAutoStatus('listening');

    // 1. Initialize pending transaction in Firestore
    UpiGatewayService.createTransaction({
      billNo,
      amount: total,
      storeVpa,
      storeName,
    });

    // 2. Subscribe to real-time webhook updates
    const unsubscribe = UpiGatewayService.subscribeToTransaction(txnRefId, (record) => {
      if (record.status === 'SUCCESS') {
        setAutoStatus('detected');
        triggerHaptic();
        posSound?.playSuccess?.();

        if (soundboxAnnouncement) {
          soundbox.announcePayment({
            amount: total,
            paymentMethod: 'UPI',
            shopName: storeName,
          }).catch(() => {});
        }

        setTimeout(() => {
          setAutoStatus('completed');
          onConfirmPayment({
            isVerified: true,
            verificationMethod: 'gateway',
            upiRefNumber: record.bankUtrNumber || record.gatewayReferenceId || `UPI${Date.now().toString().slice(-6)}`,
          });
        }, 500);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeMode, txnRefId, isExpired, billNo, total, storeVpa, storeName, triggerHaptic, soundboxAnnouncement, onConfirmPayment]);

  const handleSimulatePayment = () => {
    if (isSubmitting || autoStatus === 'completed') return;
    UpiGatewayService.simulatePaymentSuccess(txnRefId, total);
  };

  const handleRegenerateQr = () => {
    setQrKey(Date.now());
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col items-center gap-2.5 py-0.5 animate-in fade-in duration-150 w-full max-w-sm mx-auto">
      {/* Mode Switcher Pill (Manual Confirm vs Auto-Detect) */}
      <div className="w-full flex items-center justify-between p-0.5 bg-muted rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setActiveMode('manual')}
          className={`flex-1 h-7.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'manual'
              ? 'bg-card text-foreground font-semibold shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Hand className="size-3 text-primary" />
          <span>Manual Confirm</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveMode('auto');
            if (isExpired) {
              handleRegenerateQr();
            }
          }}
          className={`flex-1 h-7.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'auto'
              ? 'bg-card text-primary font-semibold shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="size-3 text-primary animate-pulse" />
          <span>Auto-Detect</span>
          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border border-primary/20">
            Zero-Touch
          </Badge>
        </button>
      </div>

      {/* Dynamic QR Box */}
      <div
        className={`flex flex-col items-center p-2.5 bg-card rounded-xl border shadow-xs relative w-full transition-all duration-300 ${
          activeMode === 'auto' && autoStatus === 'listening'
            ? 'border-primary/50 ring-2 ring-primary/10'
            : 'border-border'
        }`}
      >
        <div className="relative w-[155px] h-[155px] sm:w-[170px] sm:h-[170px] flex items-center justify-center bg-card rounded-lg overflow-hidden p-0.5">
          <canvas
            ref={canvasRef}
            className={`w-full h-full object-contain transition-opacity duration-200 ${
              isExpired ? 'opacity-10 blur-xs' : 'opacity-100'
            }`}
            aria-label={`NPCI UPI QR Code for ${currencySymbol}${total.toFixed(2)}`}
          />

          {/* QR Expired Overlay */}
          {isExpired && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-3 text-center animate-in fade-in duration-200">
              <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertTriangle className="size-5" />
              </div>
              <p className="text-xs font-bold text-foreground">QR Expired</p>
              <p className="text-[10px] text-muted-foreground">Timeout reached to prevent stale payment errors.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRegenerateQr}
                className="h-7 text-[11px] gap-1.5 font-semibold mt-1 cursor-pointer"
              >
                <RotateCw className="size-3.5" />
                <span>Regenerate QR</span>
              </Button>
            </div>
          )}

          {/* Overlay when payment is auto-detected */}
          {activeMode === 'auto' && (autoStatus === 'detected' || autoStatus === 'completed') && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 animate-in zoom-in-95 duration-150">
              <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="size-7 stroke-[2.5]" />
              </div>
              <p className="text-xs font-bold text-foreground">Payment Received!</p>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {currencySymbol}
                {total.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Amount & Scan Badge */}
        <div className="mt-1.5 flex items-center justify-between w-full px-1">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block size-2 rounded-full ${
              activeMode === 'auto' ? 'bg-primary animate-ping' : 'bg-emerald-500'
            }`} />
            <span className="text-[11px] font-medium text-foreground">Scan via Any UPI App</span>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 tabular-nums tracking-tight">
            {currencySymbol}
            {total.toFixed(2)}
          </span>
        </div>

        {/* Store UPI ID / VPA & Security row */}
        <div className="mt-1.5 pt-1.5 border-t border-border/50 w-full flex items-center justify-between text-[11px]">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
            <ShieldCheck className="size-3 text-muted-foreground" /> VPA:
          </span>
          <span className="font-mono text-foreground font-medium truncate max-w-[200px]">{storeVpa || 'merchant@upi'}</span>
        </div>
      </div>

      {/* ================= MODE 1: MANUAL CONFIRMATION ================= */}
      {activeMode === 'manual' && !isExpired && (
        <div className="w-full space-y-2 animate-in fade-in duration-150">
          {/* Last 4 Digits of UPI / UTR (Optional) */}
          <div className="flex items-center gap-2">
            <Label htmlFor="upi-utr-input" className="text-[11px] font-medium text-muted-foreground shrink-0">
              Last 4 UTR digits (optional):
            </Label>
            <Input
              id="upi-utr-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="e.g. 4521"
              className="h-8 text-xs tracking-wider tabular-nums flex-1"
            />
          </div>

          {/* Confirm UPI Payment CTA */}
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleManualConfirm}
            className="w-full h-11 text-sm font-semibold gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Recording UPI Payment...</span>
              </>
            ) : (
              <>
                <span>
                  Payment Received ({currencySymbol}
                  {total.toFixed(2)})
                </span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>
              Tap button or press <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border text-[9px]">Enter</kbd>
            </span>
            {soundboxAnnouncement && (
              <span className="flex items-center gap-1 text-primary">
                <Volume2 className="size-3" /> Voice Alert ON
              </span>
            )}
          </div>
        </div>
      )}

      {/* ================= MODE 2: AUTO-DETECT (HANDS-FREE) ================= */}
      {activeMode === 'auto' && !isExpired && (
        <div className="w-full space-y-2 animate-in fade-in duration-150">
          {/* Live Auto-detect Radar Banner */}
          <div className="w-full p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary animate-ping" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {autoStatus === 'detected' || autoStatus === 'completed'
                    ? 'Payment Verified! Settling...'
                    : 'Listening for UPI Webhook...'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {autoStatus === 'detected' || autoStatus === 'completed'
                    ? 'Auto-printing receipt & resetting'
                    : `Zero-touch settlement active (${formatCountdown(secondsRemaining)})`}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px] tabular-nums font-semibold bg-background text-primary border-primary/30 shrink-0">
              {secondsRemaining > 0 ? formatCountdown(secondsRemaining) : '0:00'}
            </Badge>
          </div>

          {/* Action Row in Auto-Detect */}
          <div className="flex items-center gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={handleManualConfirm}
              className="flex-1 h-8 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              Mark as Paid (Bypass)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSubmitting || autoStatus !== 'listening'}
              onClick={handleSimulatePayment}
              className="h-8 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/10 border border-dashed border-border px-2.5 cursor-pointer shrink-0"
              title="Test Gateway Auto-Settlement in Sandbox"
            >
              <FlaskConical className="size-3 mr-1" />
              Test Settle
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
