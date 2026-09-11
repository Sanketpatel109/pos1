import React, { useState } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Calculator,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Order, CashEntry, ShopSettings, ZReportData } from '../types';
import { CashDenominationCounter, DenominationBreakdown } from './CashDenominationCounter';

interface ZReportModalProps {
  isOpen: boolean;
  orders: Order[];
  cashEntries: CashEntry[];
  shopSettings: ShopSettings;
  activeStaffName: string;
  onClose: () => void;
  onSaveZReport?: (report: ZReportData) => void;
}

export const ZReportModal: React.FC<ZReportModalProps> = ({
  isOpen,
  orders,
  cashEntries,
  shopSettings,
  activeStaffName,
  onClose,
  onSaveZReport,
}) => {
  // Opening Float
  const openingEntry = cashEntries.find((c) => c.type === 'OPENING');
  const openingFloat = openingEntry ? openingEntry.amount : 500;

  // Cash In / Cash Out
  const cashIn = cashEntries
    .filter((c) => c.type === 'IN')
    .reduce((sum, c) => sum + c.amount, 0);

  const cashOut = cashEntries
    .filter((c) => c.type === 'OUT')
    .reduce((sum, c) => sum + c.amount, 0);

  // Sales totals
  const cashSales = orders
    .filter((o) => o.paymentMethod === 'CASH' && o.status === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  const onlineSales = orders
    .filter((o) => o.paymentMethod === 'ONLINE' && o.status === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  const creditSales = orders
    .filter((o) => o.paymentMethod === 'CREDIT' && o.status === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  const totalSales = cashSales + onlineSales + creditSales;
  const totalOrders = orders.filter((o) => o.status === 'completed').length;

  // Expected Cash
  const expectedDrawerCash = openingFloat + cashSales + cashIn - cashOut;

  // Cashier Counted Input
  const [actualCountedCash, setActualCountedCash] = useState<number>(expectedDrawerCash);
  const [showDenominations, setShowDenominations] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isFinalized, setIsFinalized] = useState<boolean>(false);

  if (!isOpen) return null;

  const variance = actualCountedCash - expectedDrawerCash;
  const isShort = variance < -0.01;
  const isExcess = variance > 0.01;
  const isExact = Math.abs(variance) <= 0.01;

  // Discrepancy requirement rule: If short, cashier MUST provide reason before closing
  const isShortageWithoutReason = isShort && !notes.trim();

  const handlePrintSlip = () => {
    window.print();
  };

  const handleFinalize = () => {
    if (isShortageWithoutReason) return;

    const report: ZReportData = {
      id: `z-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      closedAt: new Date().toLocaleTimeString(),
      staffName: activeStaffName,
      openingFloat,
      cashSales,
      onlineSales,
      creditSales,
      totalSales,
      totalOrders,
      cashIn,
      cashOut,
      expectedDrawerCash,
      actualCountedCash,
      variance,
      note: notes.trim() || 'End of shift balanced',
    };

    const savedReports = JSON.parse(localStorage.getItem('monopos_z_reports') || '[]');
    savedReports.unshift(report);
    localStorage.setItem('monopos_z_reports', JSON.stringify(savedReports));

    setIsFinalized(true);
    if (onSaveZReport) onSaveZReport(report);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-zinc-100 text-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 leading-tight">
                  Day-End Close & Cash Audit (Z-Report)
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Dukaan Hisaab
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-normal">
                Reconcile physical cash drawer with terminal sales before shift closing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-zinc-800 no-scrollbar">
          {/* Metadata bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Terminal Cashier</span>
              <span className="font-bold text-zinc-900">{activeStaffName}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Shift Date</span>
              <span className="font-bold text-zinc-900">{new Date().toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Total Bills</span>
              <span className="font-bold text-zinc-900 tabular-nums">{totalOrders} Orders</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Total Sales</span>
              <span className="font-bold text-emerald-700 tabular-nums tracking-tight">
                {shopSettings.currencySymbol}{totalSales.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Mathematical Reconciliation Grid */}
          <div className="border border-zinc-200/80 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Cash Drawer Math Reconciliation
            </h3>

            <div className="space-y-2 text-xs divide-y divide-zinc-100">
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-600 font-medium">(+) Morning Opening Float</span>
                <span className="font-bold text-zinc-900 tabular-nums tracking-tight">
                  {shopSettings.currencySymbol}{openingFloat.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-600 font-medium">(+) Cash Sales Collected</span>
                <span className="font-bold text-emerald-600 tabular-nums tracking-tight">
                  +{shopSettings.currencySymbol}{cashSales.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-600 font-medium">(+) Cash In (Jama / Pay-ins)</span>
                <span className="font-bold text-emerald-600 tabular-nums tracking-tight">
                  +{shopSettings.currencySymbol}{cashIn.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-600 font-medium">(-) Cash Out (Kharcha / Petty Expenses)</span>
                <span className="font-bold text-rose-600 tabular-nums tracking-tight">
                  -{shopSettings.currencySymbol}{cashOut.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-sm font-bold bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                <span className="text-zinc-900">(=) Expected Cash in Galla:</span>
                <span className="text-zinc-950 font-bold tabular-nums tracking-tight">
                  {shopSettings.currencySymbol}{expectedDrawerCash.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Actual Physical Cash Counted Input */}
          <div className="border border-zinc-200/80 rounded-2xl p-4 bg-zinc-50 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">
                Actual Physical Cash Counted in Galla
              </label>
              <button
                type="button"
                onClick={() => setShowDenominations(!showDenominations)}
                className="text-xs font-medium text-zinc-700 hover:text-zinc-950 flex items-center gap-1.5 cursor-pointer bg-white border border-zinc-200/80 hover:bg-zinc-100 px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
              >
                <Calculator className="w-3.5 h-3.5 text-zinc-600" />
                <span>{showDenominations ? 'Hide Note Counter' : 'Count Notes (₹500 - ₹10)'}</span>
                {showDenominations ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {showDenominations && (
              <div className="pt-2">
                <CashDenominationCounter
                  currencySymbol={shopSettings.currencySymbol}
                  expectedTotal={expectedDrawerCash}
                  onApplyTotal={(total) => {
                    setActualCountedCash(total);
                  }}
                  onChange={(total) => {
                    setActualCountedCash(total);
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-500 text-sm">
                  {shopSettings.currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={actualCountedCash}
                  onChange={(e) => setActualCountedCash(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl font-bold text-lg text-zinc-900 focus:outline-hidden focus:border-primary tabular-nums tracking-tight"
                />
              </div>

              <button
                type="button"
                onClick={() => setActualCountedCash(expectedDrawerCash)}
                className="h-11 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium border border-zinc-200 rounded-xl cursor-pointer transition-colors"
              >
                Match Expected
              </button>
            </div>

            {/* Variance Alert Box */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
                isExact
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : isShort
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {isExact ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>
                  {isExact
                    ? 'Perfect Balance: Cash drawer matches system sales exactly!'
                    : isShort
                    ? `Cash Shortage: ${shopSettings.currencySymbol}${Math.abs(variance).toFixed(2)} missing`
                    : `Cash Excess: ${shopSettings.currencySymbol}${variance.toFixed(2)} surplus`}
                </span>
              </div>
              <span className="text-sm font-bold tabular-nums tracking-tight">
                {variance >= 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)}
              </span>
            </div>

            {/* Cashier Audit Notes / Mandatory when Shortage */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-zinc-700 block">
                  Cashier Audit Remarks {isShort && <span className="text-rose-600 font-bold">* (Required for Shortage)</span>}
                </label>
                {isShortageWithoutReason && (
                  <span className="text-[10px] font-bold text-rose-600">
                    Reason required before closing
                  </span>
                )}
              </div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  isShort
                    ? 'Explain cash shortage (e.g. Missing change ₹50 or counter unbilled chai)'
                    : 'e.g. Clean shift, cash verified'
                }
                className={`w-full bg-white border rounded-xl px-3 py-2 text-xs text-zinc-900 transition-colors focus:outline-hidden ${
                  isShortageWithoutReason
                    ? 'border-rose-400 ring-2 ring-rose-100 placeholder:text-rose-400'
                    : 'border-zinc-200 focus:border-primary'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-zinc-200/80 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-medium">
            {isFinalized ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Shift Audit Logged into System
              </span>
            ) : isShortageWithoutReason ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> State shortage reason above to close
              </span>
            ) : (
              <span>Review cash numbers before finalizing day close.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="h-11 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <Printer className="w-4 h-4 text-zinc-600" />
              <span>Print Z-Slip</span>
            </button>
            <button
              type="button"
              onClick={handleFinalize}
              disabled={isFinalized || isShortageWithoutReason}
              className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all"
            >
              {isFinalized ? 'Shift Closed' : 'Finalize & Close Shift'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
