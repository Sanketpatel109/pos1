import React, { useState } from 'react';
import { X, Split, Banknote, Smartphone, CreditCard, Check } from 'lucide-react';
import { SplitPaymentDetail } from '../types';

interface SplitPaymentModalProps {
  isOpen: boolean;
  grandTotal: number;
  currencySymbol: string;
  initialSplit?: SplitPaymentDetail;
  onClose: () => void;
  onSaveSplit: (split: SplitPaymentDetail) => void;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  grandTotal,
  currencySymbol,
  initialSplit,
  onClose,
  onSaveSplit,
}) => {
  const [cashAmount, setCashAmount] = useState<string>(
    initialSplit?.cash ? String(initialSplit.cash) : ''
  );
  const [onlineAmount, setOnlineAmount] = useState<string>(
    initialSplit?.online ? String(initialSplit.online) : ''
  );
  const [creditAmount, setCreditAmount] = useState<string>(
    initialSplit?.credit ? String(initialSplit.credit) : ''
  );

  if (!isOpen) return null;

  const cashNum = parseFloat(cashAmount) || 0;
  const onlineNum = parseFloat(onlineAmount) || 0;
  const creditNum = parseFloat(creditAmount) || 0;
  const allocatedTotal = cashNum + onlineNum + creditNum;
  const remaining = grandTotal - allocatedTotal;

  const handleFillRemaining = (type: 'cash' | 'online' | 'credit') => {
    if (remaining <= 0) return;
    if (type === 'cash') setCashAmount(String(cashNum + remaining));
    if (type === 'online') setOnlineAmount(String(onlineNum + remaining));
    if (type === 'credit') setCreditAmount(String(creditNum + remaining));
  };

  const handleSave = () => {
    onSaveSplit({
      cash: cashNum,
      online: onlineNum,
      credit: creditNum,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-border shadow-2xl overflow-hidden flex flex-col text-foreground">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/50">
          <div className="flex items-center gap-2">
            <Split className="w-4 h-4 text-foreground" />
            <h2 className="font-bold text-sm text-foreground">Split Payment Allocation</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5">
          {/* Target Total Header */}
          <div className="bg-secondary p-3 rounded-xl border border-border flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-semibold">Total Due:</span>
            <span className="text-base font-extrabold text-foreground">
              {currencySymbol}
              {grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Cash Split Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-foreground" />
                <span>Cash Amount :</span>
              </label>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => handleFillRemaining('cash')}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  + Add Remainder
                </button>
              )}
            </div>
            <input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-primary tabular-nums"
            />
          </div>

          {/* Online Split Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-foreground" />
                <span>Online / UPI Amount :</span>
              </label>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => handleFillRemaining('online')}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  + Add Remainder
                </button>
              )}
            </div>
            <input
              type="number"
              value={onlineAmount}
              onChange={(e) => setOnlineAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-primary tabular-nums"
            />
          </div>

          {/* Khata / Credit Split Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-foreground" />
                <span>Khata / Credit Amount :</span>
              </label>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => handleFillRemaining('credit')}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  + Add Remainder
                </button>
              )}
            </div>
            <input
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-primary tabular-nums"
            />
          </div>

          {/* Allocation Status Indicator */}
          <div className="p-2.5 rounded-xl border border-border bg-muted/50 flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Difference / Remaining:</span>
            <span
              className={`font-bold tabular-nums ${
                Math.abs(remaining) < 0.01
                  ? 'text-primary'
                  : remaining > 0
                  ? 'text-foreground'
                  : 'text-destructive'
              }`}
            >
              {currencySymbol}
              {remaining.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-muted/50 border-t border-border flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-card hover:bg-muted text-foreground border border-border font-bold text-xs cursor-pointer transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xs cursor-pointer transition-colors"
          >
            CONFIRM SPLIT
          </button>
        </div>
      </div>
    </div>
  );
};
