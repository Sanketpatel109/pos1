import React, { useState } from 'react';
import { X, Split, Banknote, Smartphone, CreditCard, Check } from '../icons/faIcons';
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
      <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl overflow-hidden flex flex-col text-[#1c1b1d]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#d4d4d8] flex items-center justify-between bg-[#f6f2f5]">
          <div className="flex items-center gap-2">
            <Split className="w-4 h-4 text-[#18181b]" />
            <h2 className="font-bold text-sm text-[#1c1b1d]">Split Payment Allocation</h2>
          </div>
          <button onClick={onClose} className="text-[#77767b] hover:text-[#1c1b1d]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5">
          {/* Target Total Header */}
          <div className="bg-[#f0edf0] p-3 rounded-xl border border-[#d4d4d8] flex justify-between items-center">
            <span className="text-xs text-[#47464b] font-semibold">Total Due:</span>
            <span className="text-base font-extrabold font-mono text-[#1c1b1d]">
              {currencySymbol}
              {grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Cash Split Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-[#1c1b1d] flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-[#18181b]" />
                <span>Cash Amount :</span>
              </label>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => handleFillRemaining('cash')}
                  className="text-[10px] font-bold text-[#18181b] hover:underline cursor-pointer"
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
              className="w-full bg-white border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs font-mono text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
            />
          </div>

          {/* Online Split Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-[#1c1b1d] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#18181b]" />
                <span>Online / UPI Amount :</span>
              </label>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => handleFillRemaining('online')}
                  className="text-[10px] font-bold text-[#18181b] hover:underline cursor-pointer"
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
              className="w-full bg-white border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs font-mono text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
            />
          </div>

          {/* Khata / Credit Split Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-[#1c1b1d] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#18181b]" />
                <span>Khata / Credit Amount :</span>
              </label>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => handleFillRemaining('credit')}
                  className="text-[10px] font-bold text-[#18181b] hover:underline cursor-pointer"
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
              className="w-full bg-white border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs font-mono text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
            />
          </div>

          {/* Allocation Status Indicator */}
          <div className="p-2.5 rounded-xl border border-[#d4d4d8] bg-[#f6f2f5] flex justify-between items-center text-xs">
            <span className="text-[#47464b]">Difference / Remaining:</span>
            <span
              className={`font-mono font-bold ${
                Math.abs(remaining) < 0.01
                  ? 'text-emerald-700'
                  : remaining > 0
                  ? 'text-[#1c1b1d]'
                  : 'text-[#ba1a1a]'
              }`}
            >
              {currencySymbol}
              {remaining.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#f6f2f5] border-t border-[#d4d4d8] flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-white hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] font-bold text-xs"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 rounded-xl bg-[#18181b] hover:bg-black text-white font-extrabold text-xs shadow-xs"
          >
            CONFIRM SPLIT
          </button>
        </div>
      </div>
    </div>
  );
};
