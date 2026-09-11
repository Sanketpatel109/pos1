import React, { useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { posSound } from '../../utils/sound';

export interface CashTenderProps {
  total: number;
  currencySymbol?: string;
  tenderedInput: string;
  onTenderedChange: (val: string) => void;
  onCompleteSale: () => void;
  isSubmitting?: boolean;
}

export const CashTender: React.FC<CashTenderProps> = ({
  total,
  currencySymbol = '₹',
  tenderedInput,
  onTenderedChange,
  onCompleteSale,
  isSubmitting = false,
}) => {
  const cashInputRef = useRef<HTMLInputElement>(null);

  const parsedTendered = parseFloat(tenderedInput) || 0;
  const changeDue = Math.max(0, parsedTendered - total);
  const deficit = Math.max(0, total - parsedTendered);
  const isCashSufficient = parsedTendered >= total && total > 0;

  // Autofocus cash input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      cashInputRef.current?.select();
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  // Auto-fill cash received with exact bill total by default on mount/open if empty or zero
  useEffect(() => {
    if ((!tenderedInput || tenderedInput === '0') && total > 0) {
      onTenderedChange(total.toString());
    }
  }, [total]);

  const handleSelectNote = (amount: number) => {
    posSound?.playTap?.();
    onTenderedChange(amount.toString());
  };

  const formattedTotal = Number.isInteger(total) ? total.toString() : total.toFixed(2);
  const noteChips: { label: string; value: number }[] = [
    { label: `Exact (${currencySymbol}${formattedTotal})`, value: total },
  ];
  if (total < 100) {
    noteChips.push({ label: `${currencySymbol}100 Note`, value: 100 });
  }
  if (total < 200) {
    noteChips.push({ label: `${currencySymbol}200 Note`, value: 200 });
  }
  noteChips.push({ label: `${currencySymbol}500 Note`, value: 500 });

  return (
    <div className="flex flex-col gap-4 flex-1 animate-in fade-in duration-150">
      {/* Absolute Currency Note Chips */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">Quick Cash Presets</label>
        <div className="flex flex-wrap gap-1.5">
          {noteChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleSelectNote(chip.value)}
              className="flex-1 min-w-[95px] py-2 px-2 bg-muted hover:bg-muted/80 active:scale-95 border border-border rounded-xl text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs text-center whitespace-nowrap tabular-nums tracking-tight"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cash Received Input */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cash-tendered-input"
          className="text-xs font-semibold text-foreground flex items-center justify-between"
        >
          <span>Cash Received</span>
          <span className="text-xs text-muted-foreground font-normal">Type or tap presets</span>
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-medium text-muted-foreground">
            {currencySymbol}
          </span>
          <input
            id="cash-tendered-input"
            ref={cashInputRef}
            type="number"
            inputMode="decimal"
            step="any"
            value={tenderedInput}
            onChange={(e) => onTenderedChange(e.target.value)}
            placeholder={total.toFixed(2)}
            className="w-full h-14 pl-10 pr-4 bg-muted/40 border border-border focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-2xl font-bold text-foreground tabular-nums tracking-tight outline-hidden transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Live Change Calculation Status Box */}
      <div className="mt-auto">
        {isCashSufficient ? (
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-foreground flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              <span className="text-xs font-medium">Change Due:</span>
            </div>
            <span className="text-lg font-bold tabular-nums tracking-tight text-primary">
              {currencySymbol}
              {changeDue.toFixed(2)}
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-foreground flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <span className="text-xs font-medium">Remaining Due:</span>
            </div>
            <span className="text-lg font-bold tabular-nums tracking-tight text-destructive">
              {currencySymbol}
              {deficit.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Settle Cash CTA */}
      <button
        type="button"
        onClick={() => {
          posSound?.playTap?.();
          onCompleteSale();
        }}
        disabled={!isCashSufficient || isSubmitting}
        className={`w-full h-11 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
          isCashSufficient && !isSubmitting
            ? 'bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98]'
            : 'bg-muted text-muted-foreground border border-border cursor-not-allowed shadow-none'
        }`}
      >
        {isSubmitting ? (
          <span>Processing Cash Sale...</span>
        ) : (
          <span>Complete Cash Sale →</span>
        )}
      </button>
    </div>
  );
};
