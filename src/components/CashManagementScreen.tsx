import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Plus,
  Minus,
  CheckCircle,
  Calculator,
  ShieldCheck,
  Coffee,
  Truck,
  Milk,
  UserCheck,
  Receipt,
  FileText,
} from 'lucide-react';
import { CashEntry } from '../types';
import { CashDenominationCounter } from './CashDenominationCounter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from 'cn';

interface CashManagementScreenProps {
  cashEntries: CashEntry[];
  currencySymbol: string;
  activeStaffName: string;
  onAddCashEntry: (entry: Omit<CashEntry, 'id' | 'createdAt'>) => void;
  onOpenZReport?: () => void;
}

const EXPENSE_SHORTCUTS = [
  { label: 'Chai / Nashta', icon: Coffee },
  { label: 'Supplier Cash', icon: Truck },
  { label: 'Daily Milk / Bread', icon: Milk },
  { label: 'Owner Personal Draw', icon: UserCheck },
];

export const CashManagementScreen: React.FC<CashManagementScreenProps> = ({
  cashEntries,
  currencySymbol,
  activeStaffName,
  onAddCashEntry,
  onOpenZReport,
}) => {
  const [isDenomDialogOpen, setIsDenomDialogOpen] = useState(false);
  const [entryType, setEntryType] = useState<'IN' | 'OUT'>('OUT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT' | 'OPENING'>('ALL');

  // Calculate drawer balance
  const drawerBalance = cashEntries.reduce((sum, entry) => {
    if (entry.type === 'IN' || entry.type === 'OPENING') {
      return sum + entry.amount;
    }
    return sum - entry.amount;
  }, 0);

  const inEntries = cashEntries.filter((e) => e.type === 'IN' || e.type === 'OPENING');
  const totalIn = inEntries.reduce((sum, e) => sum + e.amount, 0);

  const outEntries = cashEntries.filter((e) => e.type === 'OUT');
  const totalOut = outEntries.reduce((sum, e) => sum + e.amount, 0);

  const filteredEntries = cashEntries.filter(
    (e) => filterType === 'ALL' || e.type === filterType
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const hasOpeningFloatToday = cashEntries.some(
    (e) => e.type === 'OPENING' && e.createdAt.startsWith(todayStr)
  );
  const defaultCarryoverAmount = drawerBalance > 0 ? drawerBalance : 500;

  const handleQuickOpenCarryover = () => {
    onAddCashEntry({
      type: 'OPENING',
      amount: defaultCarryoverAmount,
      reason: 'Morning Float (Carried Over Galla Balance)',
      staffName: activeStaffName,
    });
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !reason.trim()) return;

    onAddCashEntry({
      type: entryType,
      amount: amt,
      reason: reason.trim(),
      staffName: activeStaffName,
    });

    setAmount('');
    setReason('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-muted/30 border-b border-border px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Register Operations
            </span>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
              Live Till
            </Badge>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight mt-0.5">
            Cash Drawer & Galla Management
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDenomDialogOpen(true)}
            className="gap-2 cursor-pointer shadow-xs text-xs h-8"
          >
            <Calculator className="size-3.5 text-primary" />
            <span>Count Cash Notes</span>
          </Button>

          {onOpenZReport && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onOpenZReport}
              className="gap-2 cursor-pointer shadow-xs text-xs h-8"
            >
              <ShieldCheck className="size-3.5" />
              <span>Day-End Close (Z-Report)</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Scrollable Dashboard Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Unified Hero Metric Card: 3 columns with dividers */}
        <Card className="shadow-xs border-border bg-card">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* 1. Current Galla Balance */}
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-primary" />
                    Current Galla Cash
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                    {currencySymbol}
                    {drawerBalance.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    In physical register till
                  </p>
                </div>
                <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Wallet className="size-5" />
                </div>
              </div>

              {/* 2. Total Cash IN (Jama) */}
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <ArrowDownLeft className="size-3.5" />
                    Total Cash In (Jama)
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                    +{currencySymbol}
                    {totalIn.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {inEntries.length} receipts & float additions
                  </p>
                </div>
                <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="size-5" />
                </div>
              </div>

              {/* 3. Total Cash OUT (Kharcha) */}
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                    <ArrowUpRight className="size-3.5" />
                    Total Cash Out (Kharcha)
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-destructive tabular-nums tracking-tight">
                    -{currencySymbol}
                    {totalOut.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {outEntries.length} petty cash expenses
                  </p>
                </div>
                <div className="size-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <ArrowUpRight className="size-5" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Morning Shift Opening Float Notice */}
        {!hasOpeningFloatToday && (
          <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
            <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                  <Clock className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span>Morning Shift Opening Float Pending</span>
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[9px] py-0 uppercase">
                      Non-Blocking
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Serve morning customers without delay. Auto-carry over yesterday's balance ({currencySymbol}{defaultCarryoverAmount.toFixed(2)}) or count notes later.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleQuickOpenCarryover}
                className="gap-1.5 bg-amber-700 hover:bg-amber-800 text-white dark:bg-amber-600 dark:hover:bg-amber-700 cursor-pointer self-start sm:self-auto shrink-0 shadow-xs h-8 text-xs"
              >
                <CheckCircle className="size-3.5" />
                <span>Quick Carryover ({currencySymbol}{defaultCarryoverAmount.toFixed(2)})</span>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 2-Column Split: Direct Transaction Entry Form + Activity Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Direct Entry Card (4 cols on lg) */}
          <Card className="lg:col-span-4 shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                Record Cash Transaction
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Log petty expenses (Kharcha) or cash additions (Jama)
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4">
              <form onSubmit={handleSaveEntry} className="space-y-4">
                {/* 2 Big Buttons: Cash OUT vs Cash IN */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={entryType === 'OUT' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setEntryType('OUT')}
                    className="gap-1.5 cursor-pointer text-xs font-semibold h-9"
                  >
                    <Minus className="size-3.5" />
                    <span>Cash OUT (Kharcha)</span>
                  </Button>

                  <Button
                    type="button"
                    variant={entryType === 'IN' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEntryType('IN')}
                    className="gap-1.5 cursor-pointer text-xs font-semibold h-9"
                  >
                    <Plus className="size-3.5" />
                    <span>Cash IN (Jama)</span>
                  </Button>
                </div>

                {/* Quick Expense Shortcut Chips when Cash OUT is active */}
                {entryType === 'OUT' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Quick Expense Presets
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {EXPENSE_SHORTCUTS.map((sc) => {
                        const Icon = sc.icon;
                        const isSelected = reason === sc.label;
                        return (
                          <Button
                            key={sc.label}
                            type="button"
                            variant={isSelected ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setReason(sc.label)}
                            className={cn(
                              "h-8 px-2 text-xs font-medium justify-start gap-1.5 truncate cursor-pointer transition-colors",
                              isSelected && "border-primary text-primary font-semibold"
                            )}
                          >
                            <Icon className="size-3.5 shrink-0 opacity-70" />
                            <span className="truncate">{sc.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Amount Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="cash-amount" className="text-xs font-semibold">
                    Amount ({currencySymbol}) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold pointer-events-none">
                      {currencySymbol}
                    </span>
                    <Input
                      id="cash-amount"
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 h-9 text-sm font-bold tabular-nums"
                    />
                  </div>
                </div>

                {/* Reason Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="cash-reason" className="text-xs font-semibold">
                    Reason / Description *
                  </Label>
                  <Input
                    id="cash-reason"
                    type="text"
                    required
                    placeholder={
                      entryType === 'OUT'
                        ? 'e.g. Chai / Nashta or Daily Milk'
                        : 'e.g. Extra Drawer Cash Deposit'
                    }
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  variant={entryType === 'OUT' ? 'destructive' : 'default'}
                  className="w-full h-9 text-xs font-semibold cursor-pointer gap-2 shadow-xs"
                >
                  {entryType === 'OUT' ? (
                    <>
                      <Minus className="size-3.5" />
                      <span>Record Expense (Cash OUT)</span>
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" />
                      <span>Record Deposit (Cash IN)</span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Right Column: Cash Activity Ledger (8 cols on lg) */}
          <Card className="lg:col-span-8 shadow-xs">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Cash Activity Ledger
                </CardTitle>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {filteredEntries.length} Entries
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                {(['ALL', 'IN', 'OUT', 'OPENING'] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="xs"
                    variant={filterType === mode ? 'default' : 'outline'}
                    onClick={() => setFilterType(mode)}
                    className="h-7 px-2.5 text-xs font-medium cursor-pointer"
                  >
                    {mode === 'IN'
                      ? 'Jama'
                      : mode === 'OUT'
                      ? 'Kharcha'
                      : mode === 'OPENING'
                      ? 'Float'
                      : 'All'}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredEntries.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-2">
                  <Receipt className="size-8 stroke-[1.5] text-muted-foreground/60" />
                  <p className="text-xs font-medium text-foreground">
                    No cash transactions recorded
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-xs">
                    Entries recorded via Cash IN / OUT or billing receipts will automatically appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20 text-[11px]">Type</TableHead>
                      <TableHead className="text-[11px]">Description</TableHead>
                      <TableHead className="w-32 text-[11px]">Operator</TableHead>
                      <TableHead className="w-32 text-[11px]">Date & Time</TableHead>
                      <TableHead className="w-28 text-right text-[11px]">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => {
                      const isPositive = entry.type === 'IN' || entry.type === 'OPENING';
                      const dateObj = new Date(entry.createdAt);
                      const timeStr = dateObj.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      });
                      const dateStr = dateObj.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      });

                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="py-2.5">
                            <Badge
                              variant={
                                entry.type === 'OPENING'
                                  ? 'outline'
                                  : entry.type === 'IN'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className={cn(
                                "text-[9px] px-1.5 py-0 uppercase font-bold",
                                entry.type === 'IN' && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
                                entry.type === 'OPENING' && "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                              )}
                            >
                              {entry.type === 'IN' ? 'JAMA' : entry.type === 'OUT' ? 'KHARCHA' : 'FLOAT'}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-2.5 font-medium text-xs text-foreground">
                            {entry.reason}
                          </TableCell>

                          <TableCell className="py-2.5 text-xs text-muted-foreground">
                            {entry.staffName}
                          </TableCell>

                          <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {dateStr}, {timeStr}
                          </TableCell>

                          <TableCell className="py-2.5 text-right font-bold text-xs tabular-nums whitespace-nowrap">
                            <span
                              className={cn(
                                isPositive
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-destructive"
                              )}
                            >
                              {isPositive ? '+' : '-'}
                              {currencySymbol}
                              {entry.amount.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Denomination Counter Modal strictly using shadcn Dialog */}
      <Dialog open={isDenomDialogOpen} onOpenChange={setIsDenomDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <CashDenominationCounter
            currencySymbol={currencySymbol}
            expectedTotal={drawerBalance}
            onApplyTotal={(total) => {
              setAmount(total.toString());
              setReason('Physical cash drawer count');
              setEntryType('IN');
              setIsDenomDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
