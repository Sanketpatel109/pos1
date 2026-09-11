import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Plus,
  Minus,
  CheckCircle,
  X,
  Calculator,
  ShieldCheck,
  Coffee,
  Truck,
  Milk,
  UserCheck,
} from 'lucide-react';
import { CashEntry } from '../types';
import { CashDenominationCounter } from './CashDenominationCounter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDenominationCalculator, setShowDenominationCalculator] = useState(false);
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

    setIsModalOpen(false);
    setAmount('');
    setReason('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-muted/30 text-foreground overflow-hidden">
      {/* Top Drawer Balance Strip with Metric Cards & Quick Actions */}
      <div className="bg-card border-b border-border p-3 sm:p-4 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Cash Drawer (Galla Management)
            </h2>
            <p className="text-xs text-muted-foreground">
              Track physical till balance, record petty cash expenses, and reconcile shifts
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showDenominationCalculator ? 'default' : 'outline'}
              onClick={() => setShowDenominationCalculator(!showDenominationCalculator)}
              className="h-9 px-3.5 text-xs font-medium gap-1.5 cursor-pointer"
              title="Physical Note Counter (10, 20, 50, 100, 200, 500)"
            >
              <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Count Galla Notes</span>
            </Button>

            {onOpenZReport && (
              <Button
                type="button"
                variant="default"
                onClick={onOpenZReport}
                className="h-9 px-4 text-xs font-medium gap-1.5 cursor-pointer"
                title="Official End-of-Day Shift Close & Cash Audit (Dukaan Hisaab)"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Day-End Close (Hisaab / Z-Report)</span>
              </Button>
            )}
          </div>
        </div>

        {/* 3 Balanced Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* 1. Current Galla Cash */}
          <div className="bg-background rounded-lg border border-border p-3.5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Current Galla Cash
              </span>
              <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-tight font-medium">
                {currencySymbol}
                {drawerBalance.toFixed(2)}
              </div>
              <span className="text-[11px] text-muted-foreground">
                In drawer (physical till)
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Total Cash In (Jama) */}
          <div className="bg-background rounded-lg border border-border p-3.5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Cash In (Jama)
              </span>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight font-medium">
                +{currencySymbol}
                {totalIn.toFixed(2)}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {inEntries.length} receipts & float additions
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          {/* 3. Total Cash Out (Kharcha) */}
          <div className="bg-background rounded-lg border border-border p-3.5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Cash Out (Kharcha)
              </span>
              <div className="text-xl sm:text-2xl font-bold text-destructive tabular-nums tracking-tight font-medium">
                -{currencySymbol}
                {totalOut.toFixed(2)}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {outEntries.length} petty cash expenses
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Non-Blocking Morning Rush Opening Float Banner */}
        {!hasOpeningFloatToday && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 flex-wrap">
                  <span>Morning Shift Opening Float</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 py-0 uppercase">
                    Non-Blocking
                  </Badge>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                  Serve morning rush customers without delay. Auto-carry over previous drawer balance ({currencySymbol}{defaultCarryoverAmount.toFixed(2)}) or reconcile float later.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Button
                type="button"
                size="xs"
                onClick={handleQuickOpenCarryover}
                className="h-7 px-3 bg-amber-900 hover:bg-black text-white text-xs font-medium cursor-pointer gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>Quick Carryover ({currencySymbol}{defaultCarryoverAmount.toFixed(2)})</span>
              </Button>
            </div>
          </div>
        )}

        {/* Physical Cash Denomination Counter Drawer */}
        {showDenominationCalculator && (
          <div className="pt-2 animate-in fade-in duration-150">
            <CashDenominationCounter
              currencySymbol={currencySymbol}
              expectedTotal={drawerBalance}
              onApplyTotal={(total) => {
                setAmount(total.toString());
                setReason('Physical cash drawer count');
                setEntryType('IN');
                setShowDenominationCalculator(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Main Dual-Column Content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 p-3 sm:p-4 gap-3 sm:gap-4 overflow-hidden">
        {/* Left Column: Direct Entry Form Pane */}
        <div className="w-full md:w-80 lg:w-96 bg-card rounded-lg border border-border shadow-xs flex flex-col shrink-0 overflow-hidden">
          <div className="p-3.5 border-b border-border">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Petty Cash Entry (Kharcha / Jama)
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Record drawer transactions instantly
            </p>
          </div>

          <form onSubmit={handleSaveEntry} className="p-4 space-y-4 overflow-y-auto no-scrollbar">
            {/* 2 Tabs: Kharcha & Jama */}
            <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg border border-border">
              <Button
                type="button"
                size="xs"
                variant={entryType === 'OUT' ? 'default' : 'ghost'}
                onClick={() => setEntryType('OUT')}
                className={`h-8 text-xs font-medium cursor-pointer gap-1.5 ${
                  entryType === 'OUT'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Cash OUT (Kharcha)</span>
              </Button>

              <Button
                type="button"
                size="xs"
                variant={entryType === 'IN' ? 'default' : 'ghost'}
                onClick={() => setEntryType('IN')}
                className={`h-8 text-xs font-medium cursor-pointer gap-1.5 ${
                  entryType === 'IN'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cash IN (Jama)</span>
              </Button>
            </div>

            {/* Quick Expense Shortcut Chips under Cash OUT */}
            {entryType === 'OUT' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Quick Expense Shortcuts
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {EXPENSE_SHORTCUTS.map((sc) => {
                    const Icon = sc.icon;
                    const isSelected = reason === sc.label;
                    return (
                      <Button
                        key={sc.label}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => setReason(sc.label)}
                        className={`h-8 px-2.5 text-[11px] font-medium justify-start gap-1.5 truncate cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{sc.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Amount ({currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 h-9 text-sm font-bold bg-background tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Expense Reason / Remarks *
              </label>
              <Input
                type="text"
                required
                placeholder={
                  entryType === 'OUT'
                    ? 'e.g. Chai / Nashta or Daily Milk'
                    : 'e.g. Extra Drawer Cash Deposit'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-9 text-xs bg-background"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              className={`w-full h-9 text-xs font-semibold cursor-pointer gap-1.5 ${
                entryType === 'OUT'
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {entryType === 'OUT' ? (
                <>
                  <Minus className="w-3.5 h-3.5" />
                  <span>Record Cash OUT (Kharcha)</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Cash IN (Jama)</span>
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="flex-1 flex flex-col min-h-0 bg-card rounded-lg border border-border shadow-xs overflow-hidden">
          {/* Filter Bar & Mobile Action Button */}
          <div className="p-3.5 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Cash Activity Log
              </h3>
              <Badge variant="secondary" className="text-[10px] py-0 ">
                {filteredEntries.length}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex gap-1">
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

              <Button
                size="xs"
                variant="default"
                onClick={() => setIsModalOpen(true)}
                className="md:hidden h-7 px-2.5 text-xs font-medium gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Log</span>
              </Button>
            </div>
          </div>

          {/* Audit Log Entries List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {filteredEntries.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-muted-foreground text-xs">
                No cash transactions recorded for this filter
              </div>
            ) : (
              filteredEntries.map((entry) => {
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
                  <div
                    key={entry.id}
                    className="p-3 flex flex-row items-center justify-between rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors gap-3"
                  >
                    {/* Left: Type Icon + Description & Metadata */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          entry.type === 'OPENING'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : entry.type === 'IN'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {entry.type === 'OPENING' ? (
                          <Clock className="w-4 h-4" />
                        ) : entry.type === 'IN' ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              entry.type === 'OPENING'
                                ? 'default'
                                : entry.type === 'IN'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className={`text-[9px] px-1.5 py-0 uppercase font-bold shrink-0 ${
                              entry.type === 'IN'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200'
                                : ''
                            }`}
                          >
                            {entry.type === 'IN' ? 'JAMA' : entry.type === 'OUT' ? 'KHARCHA' : 'FLOAT'}
                          </Badge>
                          <h4 className="font-medium text-xs sm:text-sm text-foreground truncate">
                            {entry.reason}
                          </h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          By <strong className="text-foreground font-medium">{entry.staffName}</strong> • {dateStr} at {timeStr}
                        </p>
                      </div>
                    </div>

                    {/* Right: Amount */}
                    <div className="text-right shrink-0">
                      <span
                        className={`font-bold text-sm sm:text-base tabular-nums tracking-tight font-medium ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-destructive'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {currencySymbol}
                        {entry.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Cash Entry Modal (Mobile View) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-lg border border-border shadow-2xl p-4 space-y-3 text-foreground bg-card">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="font-bold text-sm">
                Record {entryType === 'OUT' ? 'Cash OUT (Kharcha)' : 'Cash IN (Jama)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-3">
              <div className="grid grid-cols-2 gap-1.5 bg-muted p-1 rounded-lg border border-border">
                <Button
                  type="button"
                  size="xs"
                  variant={entryType === 'OUT' ? 'default' : 'ghost'}
                  onClick={() => setEntryType('OUT')}
                  className={`h-7 text-xs font-medium ${
                    entryType === 'OUT'
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : 'text-muted-foreground'
                  }`}
                >
                  Cash OUT (Kharcha)
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant={entryType === 'IN' ? 'default' : 'ghost'}
                  onClick={() => setEntryType('IN')}
                  className={`h-7 text-xs font-medium ${
                    entryType === 'IN'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'text-muted-foreground'
                  }`}
                >
                  Cash IN (Jama)
                </Button>
              </div>

              {entryType === 'OUT' && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Shortcuts:
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    {EXPENSE_SHORTCUTS.map((sc) => (
                      <Button
                        key={sc.label}
                        type="button"
                        size="xs"
                        variant={reason === sc.label ? 'default' : 'outline'}
                        onClick={() => setReason(sc.label)}
                        className="h-7 px-2 text-[10px] font-medium truncate justify-start"
                      >
                        {sc.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Amount ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                    {currencySymbol}
                  </span>
                  <Input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-7 h-8 text-xs bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Expense Reason / Remarks *
                </label>
                <Input
                  type="text"
                  required
                  placeholder={
                    entryType === 'OUT'
                      ? 'e.g. Chai / Nashta or Daily Milk'
                      : 'e.g. Extra Drawer Cash Deposit'
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-8 text-xs bg-background"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-8 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className={`flex-1 h-8 text-xs font-medium cursor-pointer ${
                    entryType === 'OUT'
                      ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
