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
  Banknote,
  Calculator,
  ShieldCheck,
  Coffee,
  Truck,
  Milk,
  UserCheck,
} from '../icons/faIcons';
import { CashEntry } from '../types';
import { CashDenominationCounter } from './CashDenominationCounter';

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

  const totalIn = cashEntries
    .filter((e) => e.type === 'IN' || e.type === 'OPENING')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOut = cashEntries
    .filter((e) => e.type === 'OUT')
    .reduce((sum, e) => sum + e.amount, 0);

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
    <div className="flex-1 flex flex-col min-h-0 bg-[#fcf8fb] overflow-hidden">
      {/* Top Drawer Balance Strip with 2 Prominent Actions */}
      <div className="bg-[#f6f2f5] border-b border-[#d4d4d8] p-3.5 sm:p-4 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
              Current Galla Cash
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#1c1b1d]">
              {currencySymbol}
              {drawerBalance.toFixed(2)}
            </span>
          </div>

          {/* Consolidate to TWO prominent actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDenominationCalculator(!showDenominationCalculator)}
              className={`px-3.5 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                showDenominationCalculator
                  ? 'bg-[#18181b] text-white border-[#18181b]'
                  : 'bg-white hover:bg-[#eae7ea] text-[#1c1b1d] border-[#d4d4d8]'
              }`}
              title="Physical Note Counter (10, 20, 50, 100, 200, 500)"
            >
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span>Count Galla Notes</span>
            </button>

            {onOpenZReport && (
              <button
                type="button"
                onClick={onOpenZReport}
                className="px-4 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="Official End-of-Day Shift Close & Cash Audit (Dukaan Hisaab)"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Day-End Close (Hisaab / Z-Report)</span>
              </button>
            )}
          </div>
        </div>

        {/* Non-Blocking Morning Rush Opening Float Banner */}
        {!hasOpeningFloatToday && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 flex-wrap">
                  <span>Morning Shift Opening Float</span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-semibold uppercase">
                    Non-Blocking
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 leading-snug">
                  Serve morning rush customers without delay. Auto-carry over previous drawer balance ({currencySymbol}{defaultCarryoverAmount.toFixed(2)}) or reconcile float later.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleQuickOpenCarryover}
                className="py-1.5 px-3 bg-amber-900 hover:bg-black text-white text-xs font-black rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>Quick Carryover ({currencySymbol}{defaultCarryoverAmount.toFixed(2)})</span>
              </button>
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
                setIsModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Breakdown Badges (Indian Retail Terminology) */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] flex justify-between items-center shadow-2xs">
            <span className="text-[#77767b] font-bold">Total Cash In (Jama):</span>
            <span className="font-black text-emerald-700">
              +{currencySymbol}{totalIn.toFixed(2)}
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] flex justify-between items-center shadow-2xs">
            <span className="text-[#77767b] font-bold">Total Cash Out (Kharcha):</span>
            <span className="font-black text-[#ba1a1a]">
              -{currencySymbol}{totalOut.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left Column (Tablet View): Direct Entry Form Pane */}
        <div className="hidden md:flex md:w-1/3 lg:w-3/10 bg-white border-r border-[#d4d4d8] flex-col p-4 space-y-4">
          <h3 className="font-extrabold text-xs text-[#1c1b1d] uppercase tracking-wider">
            Petty Cash Entry (Kharcha / Jama)
          </h3>

          <form onSubmit={handleSaveEntry} className="space-y-3">
            {/* 2 Tabs: Kharcha & Jama (OPENING tab removed) */}
            <div className="grid grid-cols-2 gap-1 bg-[#f6f2f5] p-1 rounded-xl border border-[#d4d4d8]">
              <button
                type="button"
                onClick={() => setEntryType('OUT')}
                className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  entryType === 'OUT'
                    ? 'bg-[#18181b] text-white shadow-2xs'
                    : 'text-[#ba1a1a] hover:bg-red-50'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Cash OUT (Kharcha)</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType('IN')}
                className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  entryType === 'IN'
                    ? 'bg-[#18181b] text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cash IN (Jama)</span>
              </button>
            </div>

            {/* 4 One-Tap Expense Shortcut Chips under Cash OUT */}
            {entryType === 'OUT' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#77767b] block">
                  Quick Expense Shortcuts:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {EXPENSE_SHORTCUTS.map((sc) => {
                    const Icon = sc.icon;
                    const isSelected = reason === sc.label;
                    return (
                      <button
                        key={sc.label}
                        type="button"
                        onClick={() => setReason(sc.label)}
                        className={`p-2 rounded-xl text-[11px] font-bold text-left flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#18181b] text-white border-[#18181b]'
                            : 'bg-[#fcf8fb] hover:bg-[#eae7ea] text-[#1c1b1d] border-[#d4d4d8]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                Amount ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs font-mono text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                Expense Reason / Remarks *
              </label>
              <input
                type="text"
                required
                placeholder={
                  entryType === 'OUT'
                    ? 'e.g. Chai / Nashta or Daily Milk'
                    : 'e.g. Extra Drawer Cash Deposit'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold shadow-2xs cursor-pointer active:scale-95 transition-all"
            >
              Record {entryType === 'OUT' ? 'Cash OUT (Kharcha)' : 'Cash IN (Jama)'}
            </button>
          </form>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#fcf8fb]">
          {/* Filter Bar & Mobile Action Button */}
          <div className="p-3 bg-white border-b border-[#d4d4d8] flex justify-between items-center shrink-0">
            <h3 className="text-xs font-extrabold text-[#1c1b1d] uppercase tracking-wider">
              Cash Activity Log ({filteredEntries.length})
            </h3>

            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(['ALL', 'IN', 'OUT', 'OPENING'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterType(mode)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterType === mode
                        ? 'bg-[#18181b] text-white shadow-2xs'
                        : 'bg-[#f6f2f5] text-[#47464b] hover:bg-[#eae7ea]'
                    }`}
                  >
                    {mode === 'IN' ? 'Jama' : mode === 'OUT' ? 'Kharcha' : mode === 'OPENING' ? 'Float' : 'All'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="md:hidden px-2.5 py-1 bg-[#18181b] text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Log</span>
              </button>
            </div>
          </div>

          {/* Audit Log Entries */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2 no-scrollbar">
            {filteredEntries.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-[#77767b] text-xs">
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
                    className="bg-white border border-[#d4d4d8] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs hover:border-[#18181b] transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase font-mono ${
                            entry.type === 'OPENING'
                              ? 'bg-[#18181b] text-white'
                              : entry.type === 'IN'
                              ? 'bg-[#eae7ea] text-emerald-800'
                              : 'bg-[#ffdad6] text-[#ba1a1a]'
                          }`}
                        >
                          {entry.type === 'IN' ? 'JAMA' : entry.type === 'OUT' ? 'KHARCHA' : 'FLOAT'}
                        </span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-[#1c1b1d] truncate">
                          {entry.reason}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[#77767b] mt-1">
                        By <strong className="text-[#1c1b1d]">{entry.staffName}</strong> • {dateStr} at {timeStr}
                      </p>
                    </div>

                    <span
                      className={`font-mono font-black text-sm sm:text-base shrink-0 ${
                        isPositive ? 'text-emerald-700' : 'text-[#ba1a1a]'
                      }`}
                    >
                      {isPositive ? '+' : '-'}
                      {currencySymbol}
                      {entry.amount.toFixed(2)}
                    </span>
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
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3 text-[#1c1b1d]">
            <div className="flex justify-between items-center border-b border-[#f0edf0] pb-2">
              <h3 className="font-bold text-sm">
                Record {entryType === 'OUT' ? 'Cash OUT (Kharcha)' : 'Cash IN (Jama)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#77767b] hover:text-[#1c1b1d]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-3">
              <div className="grid grid-cols-2 gap-1.5 bg-[#f6f2f5] p-1 rounded-xl border border-[#d4d4d8]">
                <button
                  type="button"
                  onClick={() => setEntryType('OUT')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    entryType === 'OUT'
                      ? 'bg-[#18181b] text-white shadow-2xs'
                      : 'text-[#ba1a1a]'
                  }`}
                >
                  Cash OUT (Kharcha)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('IN')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    entryType === 'IN'
                      ? 'bg-[#18181b] text-white shadow-2xs'
                      : 'text-emerald-700'
                  }`}
                >
                  Cash IN (Jama)
                </button>
              </div>

              {entryType === 'OUT' && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#77767b] block">Shortcuts:</span>
                  <div className="grid grid-cols-2 gap-1">
                    {EXPENSE_SHORTCUTS.map((sc) => (
                      <button
                        key={sc.label}
                        type="button"
                        onClick={() => setReason(sc.label)}
                        className={`p-1.5 text-[10px] font-bold rounded-lg border text-left truncate ${
                          reason === sc.label
                            ? 'bg-[#18181b] text-white border-[#18181b]'
                            : 'bg-[#fcf8fb] text-[#1c1b1d] border-[#d4d4d8]'
                        }`}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Reason / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chai / Nashta or Milk"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-[#f6f2f5] text-[#1c1b1d] rounded-xl text-xs font-bold border border-[#d4d4d8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#18181b] text-white rounded-xl text-xs font-bold hover:bg-black"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
