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
} from 'lucide-react';
import { CashEntry } from '../types';

interface CashManagementScreenProps {
  cashEntries: CashEntry[];
  currencySymbol: string;
  activeStaffName: string;
  onAddCashEntry: (entry: Omit<CashEntry, 'id' | 'createdAt'>) => void;
}

export const CashManagementScreen: React.FC<CashManagementScreenProps> = ({
  cashEntries,
  currencySymbol,
  activeStaffName,
  onAddCashEntry,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'IN' | 'OUT' | 'OPENING'>('IN');
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
      {/* Top Drawer Balance Strip */}
      <div className="bg-[#f6f2f5] border-b border-[#d4d4d8] p-3.5 sm:p-4 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
              Current Drawer Cash Balance
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#1c1b1d]">
              {currencySymbol}
              {drawerBalance.toFixed(2)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setEntryType('IN');
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Cash In</span>
            </button>
            <button
              onClick={() => {
                setEntryType('OUT');
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-white hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Cash Out</span>
            </button>
            <button
              onClick={() => {
                setEntryType('OPENING');
                setIsModalOpen(true);
              }}
              className="px-3 py-2 bg-[#f0edf0] hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Set Float</span>
            </button>
          </div>
        </div>

        {/* Breakdown Badges */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] flex justify-between items-center shadow-2xs">
            <span className="text-[#77767b] font-bold">Total Inflow / Float:</span>
            <span className="font-black text-emerald-700">
              +{currencySymbol}{totalIn.toFixed(2)}
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] flex justify-between items-center shadow-2xs">
            <span className="text-[#77767b] font-bold">Total Cash Outflow:</span>
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
            Quick Petty Cash Entry
          </h3>

          <form onSubmit={handleSaveEntry} className="space-y-3">
            <div className="grid grid-cols-3 gap-1 bg-[#f6f2f5] p-1 rounded-xl border border-[#d4d4d8]">
              {(['IN', 'OUT', 'OPENING'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntryType(t)}
                  className={`py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    entryType === t
                      ? 'bg-[#18181b] text-white shadow-2xs'
                      : 'text-[#47464b] hover:text-[#1c1b1d]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                Amount ({currencySymbol})
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs font-mono text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                Expense Reason / Remarks
              </label>
              <input
                type="text"
                placeholder="e.g. Milk & Dairy Expense"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold shadow-2xs cursor-pointer active:scale-95 transition-all"
            >
              Record Cash {entryType}
            </button>
          </form>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#fcf8fb]">
          {/* Filter Bar */}
          <div className="p-3 bg-white border-b border-[#d4d4d8] flex justify-between items-center shrink-0">
            <h3 className="text-xs font-extrabold text-[#1c1b1d] uppercase tracking-wider">
              Cash Activity Log ({filteredEntries.length})
            </h3>

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
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Log Entries */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2 no-scrollbar">
            {filteredEntries.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-[#77767b] text-xs">
                No petty cash transactions recorded for this filter
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
                          {entry.type}
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

      {/* Add Cash Entry Modal (For Mobile view) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3 text-[#1c1b1d]">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">
                Record Cash {entryType === 'IN' ? 'In' : entryType === 'OUT' ? 'Out' : 'Float'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#77767b] hover:text-[#1c1b1d]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-2.5">
              <div className="grid grid-cols-3 gap-1.5 bg-[#f6f2f5] p-1 rounded-xl border border-[#d4d4d8]">
                {(['IN', 'OUT', 'OPENING'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEntryType(t)}
                    className={`py-1 rounded-lg text-xs font-bold transition-all ${
                      entryType === t
                        ? 'bg-[#18181b] text-white shadow-2xs'
                        : 'text-[#47464b]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Reason / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Milk & Dairy Expense"
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
