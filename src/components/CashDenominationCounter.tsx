import React, { useState, useEffect } from 'react';
import { Banknote, Coins, RotateCcw, Check, CheckCircle2, AlertTriangle, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

// Strictly active Indian currency notes (₹2000 withdrawn by RBI)
export const ACTIVE_BANKNOTES = [500, 200, 100, 50, 20, 10] as const;
export const ACTIVE_COINS = [5, 2, 1] as const;

export const CashDenominationCounter: React.FC<CashDenominationCounterProps> = ({
  currencySymbol = '₹',
  expectedTotal,
  initialCounts,
  onChange,
  onApplyTotal,
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
    <Card className="shadow-xs border-border">
      {/* Header bar */}
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Banknote className="size-4 text-primary" />
            <span>Physical Cash Denomination Counter</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Count active legal banknotes & coins in till drawer (₹2000 withdrawn by RBI)
          </CardDescription>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleReset}
          className="gap-1.5 cursor-pointer h-7 text-xs"
          title="Reset all counts to 0"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset</span>
        </Button>
      </CardHeader>

      {/* Grid of Banknotes & Coins */}
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Banknotes Column */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b">
              <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Banknote className="size-3.5 text-primary" />
                <span>Banknotes ({totalNotesCount} notes)</span>
              </span>
              <span className="text-xs font-bold text-primary tabular-nums">
                {currencySymbol}{banknoteTotal.toFixed(2)}
              </span>
            </div>

            <div className="divide-y divide-border border rounded-md overflow-hidden bg-background">
              {ACTIVE_BANKNOTES.map((denom) => {
                const count = banknoteCounts[denom] || 0;
                const subtotal = denom * count;
                return (
                  <div
                    key={denom}
                    className="flex items-center justify-between p-2 hover:bg-muted/40 transition-colors gap-2"
                  >
                    <div className="w-16 shrink-0 flex items-center gap-1.5">
                      <Badge variant="outline" className="font-bold text-xs px-2 py-0.5 min-w-[50px] justify-center bg-primary/5 text-primary border-primary/20">
                        {currencySymbol}{denom}
                      </Badge>
                      <span className="text-xs text-muted-foreground">×</span>
                    </div>

                    {/* Stepper with shadcn Button and Input */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => handleUpdateBanknote(denom, count - 1)}
                        disabled={count <= 0}
                        className="size-6 cursor-pointer"
                      >
                        <Minus className="size-3" />
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={count === 0 ? '' : count}
                        placeholder="0"
                        onChange={(e) =>
                          handleUpdateBanknote(denom, parseInt(e.target.value, 10) || 0)
                        }
                        className="w-14 h-6 text-center text-xs font-bold tabular-nums p-0"
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => handleUpdateBanknote(denom, count + 1)}
                        className="size-6 cursor-pointer"
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>

                    {/* Line Subtotal */}
                    <span className="w-16 text-right font-bold text-xs tabular-nums text-foreground">
                      {currencySymbol}{subtotal.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coins Column */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b">
              <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Coins className="size-3.5 text-amber-600" />
                <span>Coins ({totalCoinsCount} coins)</span>
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {currencySymbol}{coinTotal.toFixed(2)}
              </span>
            </div>

            <div className="divide-y divide-border border rounded-md overflow-hidden bg-background">
              {ACTIVE_COINS.map((denom) => {
                const count = coinCounts[denom] || 0;
                const subtotal = denom * count;
                return (
                  <div
                    key={denom}
                    className="flex items-center justify-between p-2 hover:bg-muted/40 transition-colors gap-2"
                  >
                    <div className="w-16 shrink-0 flex items-center gap-1.5">
                      <Badge variant="outline" className="font-bold text-xs px-2 py-0.5 min-w-[50px] justify-center bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20">
                        {currencySymbol}{denom}
                      </Badge>
                      <span className="text-xs text-muted-foreground">×</span>
                    </div>

                    {/* Stepper with shadcn Button and Input */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => handleUpdateCoin(denom, count - 1)}
                        disabled={count <= 0}
                        className="size-6 cursor-pointer"
                      >
                        <Minus className="size-3" />
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={count === 0 ? '' : count}
                        placeholder="0"
                        onChange={(e) =>
                          handleUpdateCoin(denom, parseInt(e.target.value, 10) || 0)
                        }
                        className="w-14 h-6 text-center text-xs font-bold tabular-nums p-0"
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => handleUpdateCoin(denom, count + 1)}
                        className="size-6 cursor-pointer"
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>

                    {/* Line Subtotal */}
                    <span className="w-16 text-right font-bold text-xs tabular-nums text-foreground">
                      {currencySymbol}{subtotal.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick summary notes */}
            <div className="p-3 bg-muted/40 rounded-md border text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Total Banknotes:</span>
                <strong className="text-foreground font-semibold">{totalNotesCount} notes</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Coins:</span>
                <strong className="text-foreground font-semibold">{totalCoinsCount} coins</strong>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Footer: Counted Total & System Match */}
      <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted/20 border-t">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Counted Drawer Total:
            </span>
            <span className="text-lg sm:text-xl font-bold text-primary tabular-nums">
              {currencySymbol}{grandTotal.toFixed(2)}
            </span>
          </div>

          {expectedTotal !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                System Expected: <strong>{currencySymbol}{expectedTotal.toFixed(2)}</strong>
              </span>
              {isExact ? (
                <Badge variant="default" className="bg-emerald-600 text-white gap-1 text-[10px] py-0 px-2">
                  <CheckCircle2 className="size-3" />
                  Exact Match
                </Badge>
              ) : isShort ? (
                <Badge variant="destructive" className="gap-1 text-[10px] py-0 px-2">
                  <AlertTriangle className="size-3" />
                  {currencySymbol}{Math.abs(variance).toFixed(2)} Shortage
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 gap-1 text-[10px] py-0 px-2 bg-emerald-500/10">
                  +{currencySymbol}{variance.toFixed(2)} Surplus
                </Badge>
              )}
            </div>
          )}
        </div>

        {onApplyTotal && (
          <Button
            type="button"
            size="sm"
            onClick={() => onApplyTotal(grandTotal)}
            className="gap-2 cursor-pointer w-full sm:w-auto shadow-xs"
          >
            <Check className="size-4" />
            <span>Apply Total to Cashier Drawer</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
