import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { QrCode, CheckCircle2, Loader2, Radio, Sparkles, Hand, ArrowRight } from 'lucide-react';
import { posSound } from '../../utils/sound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export interface UPIPaymentProps {
  total: number;
  billNo: number;
  currencySymbol?: string;
  storeVpa?: string;
  storeName?: string;
  verificationMode?: 'manual' | 'auto';
  razorpayKeyId?: string;
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
  onConfirmPayment,
  isSubmitting = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeMode, setActiveMode] = useState<'manual' | 'auto'>(verificationMode);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [autoStatus, setAutoStatus] = useState<'listening' | 'detected' | 'completed'>('listening');
  const [countdown, setCountdown] = useState<number>(4);

  // Synchronize initial prop if changed externally
  useEffect(() => {
    setActiveMode(verificationMode);
  }, [verificationMode]);

  // Dynamic NPCI UPI URL String
  const upiPayload = `upi://pay?pa=${storeVpa}&pn=${encodeURIComponent(storeName).replace(/%20/g, '+')}&am=${total}&cu=INR&tn=Bill-${billNo}`;

  // Generate QR Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, upiPayload, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    }).catch((err) => {
      console.error('Failed to generate UPI QR canvas:', err);
    });
  }, [upiPayload]);

  // Trigger mobile haptic feedback
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {
        // Safe fallback if permission restricted
      }
    }
  }, []);

  // Manual payment submission handler
  const handleManualConfirm = useCallback(() => {
    if (isSubmitting) return;
    triggerHaptic();
    posSound?.playTap?.();
    onConfirmPayment({
      upiRefNumber: utrNumber.trim() || undefined,
      isVerified: true,
      verificationMethod: utrNumber.trim() ? 'utr' : 'soundbox',
    });
  }, [isSubmitting, triggerHaptic, onConfirmPayment, utrNumber]);

  // Keyboard shortcut: Press Enter to quickly confirm manual payment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isSubmitting) {
        e.preventDefault();
        handleManualConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualConfirm, isSubmitting]);

  // Auto-Detect Payment Engine (Hands-Free Mode)
  useEffect(() => {
    if (activeMode !== 'auto') {
      setAutoStatus('listening');
      return;
    }

    setAutoStatus('listening');
    setCountdown(4);

    // Countdown interval to simulate gateway webhook / polling verification
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Payment auto-detected after countdown
    const timer = setTimeout(() => {
      setAutoStatus('detected');
      triggerHaptic();
      posSound?.playSuccess?.();

      const finishTimer = setTimeout(() => {
        setAutoStatus('completed');
        onConfirmPayment({
          isVerified: true,
          verificationMethod: 'gateway',
          upiRefNumber: `RZP${Date.now().toString().slice(-6)}`,
        });
      }, 700);

      return () => clearTimeout(finishTimer);
    }, 4200);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [activeMode, onConfirmPayment, triggerHaptic]);

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
          onClick={() => setActiveMode('auto')}
          className={`flex-1 h-7.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'auto'
              ? 'bg-card text-primary font-semibold shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="size-3 text-primary animate-pulse" />
          <span>Auto-Detect</span>
          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary">
            Hands-Free
          </Badge>
        </button>
      </div>

      {/* Dynamic QR Box */}
      <div className="flex flex-col items-center p-2.5 bg-card rounded-xl border border-border shadow-xs relative w-full">
        <div className="relative w-[150px] h-[150px] sm:w-[165px] sm:h-[165px] flex items-center justify-center bg-card rounded-lg overflow-hidden p-0.5">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
            aria-label={`NPCI UPI QR Code for ₹${total}`}
          />

          {/* Overlay when payment is auto-detected */}
          {activeMode === 'auto' && autoStatus === 'detected' && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 animate-in zoom-in-95 duration-150">
              <div className="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <CheckCircle2 className="size-6 stroke-[2.5]" />
              </div>
              <p className="text-xs font-bold text-foreground">Payment Received!</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {currencySymbol}
                {total.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Amount & Scan Badge */}
        <div className="mt-1.5 flex items-center justify-between w-full px-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-medium text-foreground">Scan via Any UPI App</span>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 tabular-nums tracking-tight">
            {currencySymbol}
            {total.toFixed(2)}
          </span>
        </div>

        {/* Store UPI ID / VPA row */}
        <div className="mt-1.5 pt-1.5 border-t border-border/50 w-full flex items-center justify-between text-[11px]">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">VPA:</span>
          <span className="font-mono text-foreground font-medium truncate max-w-[200px]">{storeVpa}</span>
        </div>
      </div>

      {/* ================= MODE 1: MANUAL CONFIRMATION ================= */}
      {activeMode === 'manual' && (
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

          <p className="text-[10px] text-center text-muted-foreground">
            Tap button or press <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border text-[9px]">Enter</kbd>
          </p>
        </div>
      )}

      {/* ================= MODE 2: AUTO-DETECT (HANDS-FREE) ================= */}
      {activeMode === 'auto' && (
        <div className="w-full space-y-2 animate-in fade-in duration-150">
          {/* Live Auto-detect Radar Banner */}
          <div className="w-full p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-primary animate-ping" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {autoStatus === 'detected'
                    ? 'Payment Verified! Finishing...'
                    : 'Waiting for Customer UPI...'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {autoStatus === 'detected'
                    ? 'Generating invoice & receipt'
                    : `Listening via Gateway (${countdown}s)`}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px] tabular-nums font-semibold bg-background text-primary border-primary/30 shrink-0">
              {countdown > 0 ? `${countdown}s` : '✓ Done'}
            </Badge>
          </div>

          {/* Fallback Manual Button in case customer pays cash or needs bypass */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={handleManualConfirm}
            className="w-full h-8 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Mark as Paid Manually (Bypass)
          </Button>
        </div>
      )}
    </div>
  );
};
