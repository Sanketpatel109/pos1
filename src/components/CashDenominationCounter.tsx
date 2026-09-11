import React, { useState, useEffect } from 'react';
import { Banknote, Coins, RotateCcw, Check, CheckCircle2, AlertTriangle } from '../icons/faIcons';

export interface DenominationBreakdown {
  banknotes: Record<number, number>; // 500, 200, 100, 50, 20, 10
  coins: Record<number, number>;     // 5, 2, 1
}

interface CashDenominationCounterProps {
  currencySymbol?: string;
  expectedTotal?: number;
  initialCounts?: DenominationBreakdown;
  onChange?: (total: number, breakdown: DenominationBreakdown) => void;
  onApplyTotal?: (total: number) => void;
  compact?: boolean;
}

// Strictly active Indian currency notes (₹2000 has been withdrawn by RBI)
export const ACTIVE_BANKNOTES = [500, 200, 100, 50, 20, 10] as const;
export const ACTIVE_COINS = [5, 2, 1] as const;

export const CashDenominationCounter: React.FC<CashDenominationCounterProps> = ({
  currencySymbol = '₹',
  expectedTotal,
  initialCounts,
  onChange,
  onApplyTotal,
  compact = false,
}) => {
  const [banknoteCounts, setBanknoteCounts] = useState<Record<number, number>>(() => {
    if (initialCounts?.banknotes) return { ...initialCounts.banknotes };
    return { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 };
  });

  const [coinCounts, setCoinCounts] = useState<Record<number, number>>(() => {
    if (initialCounts?.coins) return { ...initialCounts.coins };
    return { 5: 0, 2: 0, 1: 0 };
  });

  const banknoteTotal = ACTIVE_BANKNOTES.reduce(
    (sum, denom) => sum + denom * (banknoteCounts[denom] || 0),
    0
  );

  const coinTotal = ACTIVE_COINS.reduce(
    (sum, denom) => sum + denom * (coinCounts[denom] || 0),
    0
  );

  const grandTotal = banknoteTotal + coinTotal;
  const totalNotesCount = ACTIVE_BANKNOTES.reduce(
    (sum, denom) => sum + (banknoteCounts[denom] || 0),
    0
  );
  const totalCoinsCount = ACTIVE_COINS.reduce(
    (sum, denom) => sum + (coinCounts[denom] || 0),
    0
  );

  useEffect(() => {
    if (onChange) {
      onChange(grandTotal, {
        banknotes: banknoteCounts,
        coins: coinCounts,
      });
    }
  }, [banknoteCounts, coinCounts, grandTotal, onChange]);

  const handleUpdateBanknote = (denom: number, count: number) => {
    const validCount = Math.max(0, Math.floor(count) || 0);
    setBanknoteCounts((prev) => ({ ...prev, [denom]: validCount }));
  };

  const handleUpdateCoin = (denom: number, count: number) => {
    const validCount = Math.max(0, Math.floor(count) || 0);
    setCoinCounts((prev) => ({ ...prev, [denom]: validCount }));
  };

  const handleReset = () => {
    const zeroBanknotes: Record<number, number> = {};
    ACTIVE_BANKNOTES.forEach((d) => (zeroBanknotes[d] = 0));
    const zeroCoins: Record<number, number> = {};
    ACTIVE_COINS.forEach((d) => (zeroCoins[d] = 0));
    setBanknoteCounts(zeroBanknotes);
    setCoinCounts(zeroCoins);
  };

  const variance = expectedTotal !== undefined ? grandTotal - expectedTotal : 0;
  const isExact = Math.abs(variance) <= 0.01;
  const isShort = variance < -0.01;

  return (
    <div className="bg-white border border-[#d4d4d8] rounded-2xl p-3.5 sm:p-4 space-y-4 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-3">
        <div>
          <h4 className="text-xs font-black text-[#1c1b1d] uppercase tracking-wider flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-emerald-700" />
            <span>Physical Cash Denomination Counter</span>
          </h4>
          <p className="text-[11px] text-[#77767b]">
            Count active legal banknotes & coins in till drawer (₹2000 withdrawn)
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="px-2.5 py-1 text-xs font-bold text-[#77767b] hover:text-[#1c1b1d] hover:bg-[#f4f4f5] rounded-lg border border-[#e4e4e7] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          title="Reset all counts to 0"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Grid of Banknotes & Coins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Banknotes column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#47464b] uppercase px-1">
            <span className="flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-700" />
              <span>Banknotes ({totalNotesCount} notes)</span>
            </span>
            <span className="font-mono text-emerald-800 font-extrabold">
              {currencySymbol}{banknoteTotal.toFixed(2)}
            </span>
          </div>

          <div className="divide-y divide-[#f4f4f5] border border-[#e4e4e7] rounded-xl overflow-hidden bg-[#fafafa]">
            {ACTIVE_BANKNOTES.map((denom) => {
              const count = banknoteCounts[denom] || 0;
              const subtotal = denom * count;
              return (
                <div
                  key={denom}
                  className="flex items-center justify-between p-2 hover:bg-white transition-colors gap-2"
                >
                  <div className="w-16 shrink-0 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-mono font-black text-xs">
                      {currencySymbol}{denom}
                    </span>
                    <span className="text-[11px] text-[#77767b] font-mono">×</span>
                  </div>

                  {/* Quick increment/decrement buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateBanknote(denom, count - 1)}
                      className="w-6 h-6 rounded-md bg-white border border-[#d4d4d8] text-xs font-bold text-[#1c1b1d] hover:bg-slate-100 flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={count === 0 ? '' : count}
                      onChange={(e) => handleUpdateBanknote(denom, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-14 h-7 text-center font-mono font-bold text-xs bg-white border border-[#d4d4d8] rounded-md focus:outline-hidden focus:border-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateBanknote(denom, count + 1)}
                      className="w-6 h-6 rounded-md bg-white border border-[#d4d4d8] text-xs font-bold text-[#1c1b1d] hover:bg-slate-100 flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-20 text-right font-mono font-bold text-xs text-[#1c1b1d] truncate">
                    {currencySymbol}{subtotal.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coins column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#47464b] uppercase px-1">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>Coins ({totalCoinsCount} coins)</span>
            </span>
            <span className="font-mono text-amber-800 font-extrabold">
              {currencySymbol}{coinTotal.toFixed(2)}
            </span>
          </div>

          <div className="divide-y divide-[#f4f4f5] border border-[#e4e4e7] rounded-xl overflow-hidden bg-[#fafafa]">
            {ACTIVE_COINS.map((denom) => {
              const count = coinCounts[denom] || 0;
              const subtotal = denom * count;
              return (
                <div
                  key={denom}
                  className="flex items-center justify-between p-2 hover:bg-white transition-colors gap-2"
                >
                  <div className="w-16 shrink-0 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono font-black text-xs">
                      {currencySymbol}{denom}
                    </span>
                    <span className="text-[11px] text-[#77767b] font-mono">×</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateCoin(denom, count - 1)}
                      className="w-6 h-6 rounded-md bg-white border border-[#d4d4d8] text-xs font-bold text-[#1c1b1d] hover:bg-slate-100 flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={count === 0 ? '' : count}
                      onChange={(e) => handleUpdateCoin(denom, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-14 h-7 text-center font-mono font-bold text-xs bg-white border border-[#d4d4d8] rounded-md focus:outline-hidden focus:border-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateCoin(denom, count + 1)}
                      className="w-6 h-6 rounded-md bg-white border border-[#d4d4d8] text-xs font-bold text-[#1c1b1d] hover:bg-slate-100 flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-20 text-right font-mono font-bold text-xs text-[#1c1b1d] truncate">
                    {currencySymbol}{subtotal.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Denomination summary box */}
          <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between items-center text-[#64748b]">
              <span>Total Banknotes:</span>
              <span className="font-mono font-bold text-[#0f172a]">{totalNotesCount} notes</span>
            </div>
            <div className="flex justify-between items-center text-[#64748b]">
              <span>Total Coins:</span>
              <span className="font-mono font-bold text-[#0f172a]">{totalCoinsCount} coins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grand Total & Action Footer */}
      <div className="p-3 bg-[#f4f4f5] rounded-xl border border-[#d4d4d8] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#77767b] block">
            Counted Drawer Total
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#18181b]">
            {currencySymbol}{grandTotal.toFixed(2)}
          </div>
        </div>

        {expectedTotal !== undefined && (
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
              isExact
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : isShort
                ? 'bg-red-50 border-red-300 text-red-800'
                : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}
          >
            {isExact ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            )}
            <span>
              {isExact
                ? 'Matches Expected Drawer Cash'
                : isShort
                ? `Short by ${currencySymbol}${Math.abs(variance).toFixed(2)}`
                : `Excess by ${currencySymbol}${variance.toFixed(2)}`}
            </span>
          </div>
        )}

        {onApplyTotal && (
          <button
            type="button"
            onClick={() => onApplyTotal(grandTotal)}
            className="w-full sm:w-auto px-4 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply to Till Count</span>
          </button>
        )}
      </div>
    </div>
  );
};
