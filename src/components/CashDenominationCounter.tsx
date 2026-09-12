import React, { useState, useEffect } from 'react';
import { Banknote, Coins, RotateCcw, Check, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="bg-card border border-border rounded-lg p-3.5 sm:p-4 space-y-4 shadow-xs text-foreground">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-primary" />
            <span>Physical Cash Denomination Counter</span>
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Count active legal banknotes & coins in till drawer (₹2000 withdrawn)
          </p>
        </div>

        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={handleReset}
          className="h-7 text-xs font-medium cursor-pointer gap-1"
          title="Reset all counts to 0"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </Button>
      </div>

      {/* Grid of Banknotes & Coins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Banknotes column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase px-1">
            <span className="flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-primary" />
              <span>Banknotes ({totalNotesCount} notes)</span>
            </span>
            <span className="text-primary font-bold">
              {currencySymbol}{banknoteTotal.toFixed(2)}
            </span>
          </div>

          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-background">
            {ACTIVE_BANKNOTES.map((denom) => {
              const count = banknoteCounts[denom] || 0;
              const subtotal = denom * count;
              return (
                <div
                  key={denom}
                  className="flex items-center justify-between p-2 hover:bg-muted/40 transition-colors gap-2"
                >
                  <div className="w-16 shrink-0 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs">
                      {currencySymbol}{denom}
                    </span>
                    <span className="text-[11px] text-muted-foreground ">×</span>
                  </div>

                  {/* Quick increment/decrement buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleUpdateBanknote(denom, count - 1)}
                      className="w-6 h-6 text-xs font-bold"
                    >
                      -
                    </Button>
                    <input
                      type="number"
                      min="0"
                      value={count === 0 ? '' : count}
                      onChange={(e) => handleUpdateBanknote(denom, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-14 h-7 text-center font-bold text-xs bg-background border border-border rounded-md focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleUpdateBanknote(denom, count + 1)}
                      className="w-6 h-6 text-xs font-bold"
                    >
                      +
                    </Button>
                  </div>

                  <div className="w-20 text-right font-bold text-xs text-foreground truncate">
                    {currencySymbol}{subtotal.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coins column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase px-1">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Coins ({totalCoinsCount} coins)</span>
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              {currencySymbol}{coinTotal.toFixed(2)}
            </span>
          </div>

          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-background">
            {ACTIVE_COINS.map((denom) => {
              const count = coinCounts[denom] || 0;
              const subtotal = denom * count;
              return (
                <div
                  key={denom}
                  className="flex items-center justify-between p-2 hover:bg-muted/40 transition-colors gap-2"
                >
                  <div className="w-16 shrink-0 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 font-bold text-xs">
                      {currencySymbol}{denom}
                    </span>
                    <span className="text-[11px] text-muted-foreground ">×</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleUpdateCoin(denom, count - 1)}
                      className="w-6 h-6 text-xs font-bold"
                    >
                      -
                    </Button>
                    <input
                      type="number"
                      min="0"
                      value={count === 0 ? '' : count}
                      onChange={(e) => handleUpdateCoin(denom, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-14 h-7 text-center font-bold text-xs bg-background border border-border rounded-md focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleUpdateCoin(denom, count + 1)}
                      className="w-6 h-6 text-xs font-bold"
                    >
                      +
                    </Button>
                  </div>

                  <div className="w-20 text-right font-bold text-xs text-foreground truncate">
                    {currencySymbol}{subtotal.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Denomination summary box */}
          <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Total Banknotes:</span>
              <span className="font-bold text-foreground">{totalNotesCount} notes</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Total Coins:</span>
              <span className="font-bold text-foreground">{totalCoinsCount} coins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grand Total & Action Footer */}
      <div className="p-3 bg-muted/40 rounded-lg border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Counted Drawer Total
          </span>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {currencySymbol}{grandTotal.toFixed(2)}
          </div>
        </div>

        {expectedTotal !== undefined && (
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
              isExact
                ? 'bg-primary/10 border-primary/20 text-primary'
                : isShort
                ? 'bg-destructive/10 border-destructive/20 text-destructive'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
            }`}
          >
            {isExact ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
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
          <Button
            type="button"
            variant="default"
            onClick={() => onApplyTotal(grandTotal)}
            className="w-full sm:w-auto px-4 h-9 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply to Till Count</span>
          </Button>
        )}
      </div>
    </div>
  );
};
