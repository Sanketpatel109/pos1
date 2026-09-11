import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';
import { posSound } from '../../utils/sound';

export interface UPIPaymentProps {
  total: number;
  billNo: number;
  currencySymbol?: string;
  storeVpa?: string;
  storeName?: string;
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
  storeVpa = 'anandsupermarket@okaxis',
  storeName = 'Anand Supermarket',
  onConfirmPayment,
  isSubmitting = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [utrNumber, setUtrNumber] = useState<string>('');

  // Dynamic NPCI UPI URL String:
  // upi://pay?pa=anandsupermarket@okaxis&pn=Anand+Supermarket&am=${total}&cu=INR&tn=Bill-${billNo}
  const upiPayload = `upi://pay?pa=${storeVpa}&pn=${encodeURIComponent(storeName).replace(/%20/g, '+')}&am=${total}&cu=INR&tn=Bill-${billNo}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, upiPayload, {
      width: 240,
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

  return (
    <div className="flex flex-col items-center gap-4 py-1 animate-in fade-in duration-150">
      {/* Dynamic QR Box */}
      <div className="flex flex-col items-center p-3.5 bg-card rounded-2xl border border-border shadow-xs relative">
        <div className="relative w-[190px] h-[190px] sm:w-[210px] sm:h-[210px] flex items-center justify-center bg-card rounded-xl overflow-hidden p-1">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
            aria-label={`NPCI UPI QR Code for ₹${total}`}
          />
        </div>

        {/* Amount & Merchant details badge below QR */}
        <div className="mt-2.5 flex items-center justify-between w-full px-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-foreground">Scan via Any UPI App</span>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 tabular-nums tracking-tight">
            {currencySymbol}
            {total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Store UPI ID / VPA row */}
      <div className="w-full flex items-center justify-between bg-muted/40 px-3.5 py-2.5 rounded-xl border border-border">
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Merchant UPI ID (VPA)
          </span>
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">
            {storeVpa}
          </span>
        </div>
      </div>

      {/* Last 4 Digits of UPI / UTR (Optional) */}
      <div className="w-full flex flex-col gap-1.5">
        <label htmlFor="upi-utr-input" className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span>Last 4 Digits of UPI / UTR (Optional)</span>
          <span className="text-xs text-muted-foreground font-normal">e.g. 4521</span>
        </label>
        <input
          id="upi-utr-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={utrNumber}
          onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="e.g. 4521"
          className="w-full h-11 px-3 bg-muted/40 border border-border focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-sm text-foreground outline-hidden transition-all shadow-xs tracking-wider tabular-nums"
        />
      </div>

      {/* Confirm UPI Payment CTA */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => {
          posSound?.playTap?.();
          onConfirmPayment({
            upiRefNumber: utrNumber.trim() || undefined,
            isVerified: true,
            verificationMethod: utrNumber.trim() ? 'utr' : 'gateway',
          });
        }}
        className="w-full h-11 mt-1 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98]"
      >
        {isSubmitting ? (
          <span>Recording UPI Payment...</span>
        ) : (
          <span>
            Payment Received ({currencySymbol}
            {total.toFixed(2)}) →
          </span>
        )}
      </button>
    </div>
  );
};
