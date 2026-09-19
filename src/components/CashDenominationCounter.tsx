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
    <Card className="border-0 shadow-none bg-background w-full">
      {/* Header bar with reset action */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border pr-12">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
              <Banknote className="size-5 text-primary shrink-0" />
              <span>Physical Cash Denomination Counter</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Count active legal banknotes & coins in till drawer (₹2000 withdrawn by RBI)
            </CardDescription>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="gap-1.5 cursor-pointer h-8 text-xs shrink-0 rounded-md"
            title="Reset all counts to 0"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset</span>
          </Button>
        </div>
      </CardHeader>

      {/* Grid of Banknotes & Coins */}
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Banknotes Column */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="size-4 text-primary" />
                <span>Banknotes</span>
                <Badge variant="secondary" className="text-[10px] font-medium py-0 px-1.5 ml-1">
                  {totalNotesCount} notes
                </Badge>
              </span>
              <span className="text-xs sm:text-sm font-bold text-primary tabular-nums">
                {currencySymbol}{banknoteTotal.toFixed(2)}
              </span>
            </div>

            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-muted/10">
              {ACTIVE_BANKNOTES.map((denom) => {
                const count = banknoteCounts[denom] || 0;
                const subtotal = denom * count;
                return (
                  <div
                    key={denom}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors gap-2"
                  >
                    {/* Denomination Badge */}
                    <div className="w-16 shrink-0">
                      <Badge
                        variant="outline"
                        className="font-bold text-xs px-2 py-0.5 w-full justify-center bg-primary/5 text-primary border-primary/25 rounded-md"
                      >
                        {currencySymbol}{denom}
                      </Badge>
                    </div>

                    {/* Integrated Stepper with shadcn Button and Input */}
                    <div className="flex items-center">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => handleUpdateBanknote(denom, count - 1)}
                        disabled={count <= 0}
                        className="size-7 rounded-r-none border-r-0 cursor-pointer hover:bg-muted"
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
                        className="w-12 h-7 rounded-none text-center text-xs font-bold tabular-nums px-1 focus-visible:z-10 bg-background"
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => handleUpdateBanknote(denom, count + 1)}
                        className="size-7 rounded-l-none border-l-0 cursor-pointer hover:bg-muted"
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
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="size-4 text-amber-600" />
                <span>Coins</span>
                <Badge variant="secondary" className="text-[10px] font-medium py-0 px-1.5 ml-1">
                  {totalCoinsCount} coins
                </Badge>
              </span>
              <span className="text-xs sm:text-sm font-bold text-foreground tabular-nums">
                {currencySymbol}{coinTotal.toFixed(2)}
              </span>
            </div>

            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-muted/10">
              {ACTIVE_COINS.map((denom) => {
                const count = coinCounts[denom] || 0;
                const subtotal = denom * count;
                return (
                  <div
                    key={denom}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors gap-2"
                  >
                    {/* Denomination Badge */}
                    <div className="w-16 shrink-0">
                      <Badge
                        variant="outline"
                        className="font-bold text-xs px-2 py-0.5 w-full justify-center bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 rounded-md"
                      >
                        {currencySymbol}{denom}
                      </Badge>
                    </div>

                    {/* Integrated Stepper with shadcn Button and Input */}
                    <div className="flex items-center">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => handleUpdateCoin(denom, count - 1)}
                        disabled={count <= 0}
                        className="size-7 rounded-r-none border-r-0 cursor-pointer hover:bg-muted"
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
                        className="w-12 h-7 rounded-none text-center text-xs font-bold tabular-nums px-1 focus-visible:z-10 bg-background"
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => handleUpdateCoin(denom, count + 1)}
                        className="size-7 rounded-l-none border-l-0 cursor-pointer hover:bg-muted"
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
            <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs text-muted-foreground space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 font-medium">
                  <Banknote className="size-3.5 text-primary" /> Total Banknotes:
                </span>
                <Badge variant="outline" className="font-semibold text-foreground text-xs rounded-md">
                  {totalNotesCount} notes
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 font-medium">
                  <Coins className="size-3.5 text-amber-600" /> Total Coins:
                </span>
                <Badge variant="outline" className="font-semibold text-foreground text-xs rounded-md">
                  {totalCoinsCount} coins
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Footer: Counted Total & System Match */}
      <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 sm:p-5 bg-muted/30 border-t border-border">
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Counted Drawer Total:
            </span>
            <span className="text-xl sm:text-2xl font-bold text-primary tabular-nums">
              {currencySymbol}{grandTotal.toFixed(2)}
            </span>
          </div>

          {expectedTotal !== undefined && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                System Expected: <span className="font-semibold text-foreground">{currencySymbol}{expectedTotal.toFixed(2)}</span>
              </span>
              {isExact ? (
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[10px] py-0.5 px-2 rounded-md">
                  <CheckCircle2 className="size-3" />
                  Exact Match
                </Badge>
              ) : isShort ? (
                <Badge variant="destructive" className="gap-1 text-[10px] py-0.5 px-2 rounded-md">
                  <AlertTriangle className="size-3" />
                  {currencySymbol}{Math.abs(variance).toFixed(2)} Shortage
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 gap-1 text-[10px] py-0.5 px-2 bg-emerald-500/10 rounded-md">
                  +{currencySymbol}{variance.toFixed(2)} Surplus
                </Badge>
              )}
            </div>
          )}
        </div>

        {onApplyTotal && (
          <Button
            type="button"
            size="default"
            onClick={() => onApplyTotal(grandTotal)}
            className="gap-2 cursor-pointer w-full sm:w-auto shrink-0 font-semibold shadow-xs rounded-md px-4"
          >
            <Check className="size-4" />
            <span>Apply Total to Cashier Drawer</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
