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
} from 'lucide-react';
import { Order, CashEntry, ShopSettings, ZReportData } from '../types';

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
  const [notes, setNotes] = useState<string>('End of shift balanced');
  const [isFinalized, setIsFinalized] = useState<boolean>(false);

  if (!isOpen) return null;

  const variance = actualCountedCash - expectedDrawerCash;
  const isShort = variance < -0.01;
  const isExcess = variance > 0.01;
  const isExact = Math.abs(variance) <= 0.01;

  const handlePrintSlip = () => {
    window.print();
  };

  const handleFinalize = () => {
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
      note: notes,
    };

    const savedReports = JSON.parse(localStorage.getItem('monopos_z_reports') || '[]');
    savedReports.unshift(report);
    localStorage.setItem('monopos_z_reports', JSON.stringify(savedReports));

    setIsFinalized(true);
    if (onSaveZReport) onSaveZReport(report);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white leading-tight">
                  Z-Report / Shift Close Audit
                </h2>
                <span className="text-[10px] uppercase font-black tracking-widest bg-amber-400 text-zinc-950 px-2 py-0.5 rounded-md">
                  Official Day Close
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                End-of-day cash reconciliation & financial audit slip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintSlip}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Z-Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-zinc-800">
          {/* Metadata bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 p-3 rounded-2xl border border-zinc-200 text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Terminal Operator</span>
              <span className="font-extrabold text-zinc-900">{activeStaffName}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Shift Date</span>
              <span className="font-extrabold text-zinc-900">{new Date().toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Total Bills</span>
              <span className="font-extrabold text-zinc-900">{totalOrders} Orders</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Total Sales</span>
              <span className="font-black text-emerald-700">
                {shopSettings.currencySymbol}{totalSales.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Mathematical Reconciliation Grid */}
          <div className="border border-zinc-200 rounded-2xl p-4 space-y-3 bg-white">
            <h3 className="text-xs font-black text-zinc-700 uppercase tracking-wider">
              Cash Drawer Math Reconciliation
            </h3>

            <div className="space-y-2 text-xs divide-y divide-zinc-100">
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-600 font-medium">(+) Opening Float</span>
                <span className="font-bold text-zinc-900">
                  {shopSettings.currencySymbol}{openingFloat.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-600 font-medium">(+) Cash Sales Collected</span>
                <span className="font-bold text-emerald-600">
                  +{shopSettings.currencySymbol}{cashSales.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-600 font-medium">(+) Cash-In (Pay-ins / Float added)</span>
                <span className="font-bold text-emerald-600">
                  +{shopSettings.currencySymbol}{cashIn.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-600 font-medium">(-) Cash-Out (Petty Cash / Expenses)</span>
                <span className="font-bold text-red-600">
                  -{shopSettings.currencySymbol}{cashOut.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-sm font-black bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                <span className="text-zinc-900">(=) Expected Cash in Till:</span>
                <span className="text-zinc-950">
                  {shopSettings.currencySymbol}{expectedDrawerCash.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Actual Physical Cash Counted Input */}
          <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50 space-y-3">
            <label className="text-xs font-black text-zinc-800 uppercase tracking-wider block">
              Actual Physical Cash Counted by Cashier
            </label>
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
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-zinc-300 rounded-xl font-black text-lg text-zinc-900 focus:outline-hidden focus:border-zinc-900"
                />
              </div>

              <button
                type="button"
                onClick={() => setActualCountedCash(expectedDrawerCash)}
                className="px-3 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Match Expected
              </button>
            </div>

            {/* Variance Alert Box */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                isExact
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : isShort
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {isExact ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span>
                  {isExact
                    ? 'Perfect Balance: Cash drawer matches system sales exactly!'
                    : isShort
                    ? `Cash Shortage: ${shopSettings.currencySymbol}${Math.abs(variance).toFixed(2)} missing`
                    : `Cash Excess: ${shopSettings.currencySymbol}${variance.toFixed(2)} surplus`}
                </span>
              </div>
              <span className="font-mono text-sm font-black">
                {variance >= 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)}
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-500 block mb-1">
                Cashier Audit Notes / Discrepancy Reason
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Clean shift, 1 cancel bill verified"
                className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-800"
              />
            </div>
          </div>

          {/* Thermal Z-Report Printable Slip Preview */}
          <div className="border border-zinc-200 rounded-2xl p-4 bg-white space-y-2">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
              Print Slip Preview (58mm / 80mm ESC/POS Monospace)
            </span>

            <div
              id="printable-z-report-slip"
              className="bg-zinc-50 p-4 rounded-xl border border-zinc-300 font-mono text-[11px] leading-relaxed text-zinc-900 max-w-sm mx-auto shadow-inner"
            >
              <div className="text-center pb-2 border-b border-dashed border-zinc-400">
                <div className="font-black text-sm uppercase">{shopSettings.shopName}</div>
                <div className="text-[10px] text-zinc-600">{shopSettings.address}</div>
                <div className="text-[10px] text-zinc-600">GSTIN: {shopSettings.gstin || 'UNREGISTERED'}</div>
                <div className="font-black text-xs mt-1">*** END OF DAY Z-REPORT ***</div>
              </div>

              <div className="py-2 border-b border-dashed border-zinc-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>DATE / TIME:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>TERMINAL:</span>
                  <span>POS-01</span>
                </div>
                <div className="flex justify-between">
                  <span>OPERATOR:</span>
                  <span>{activeStaffName}</span>
                </div>
                <div className="flex justify-between">
                  <span>COMPLETED BILLS:</span>
                  <span>{totalOrders}</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>CASH SALES:</span>
                  <span>{shopSettings.currencySymbol}{cashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ONLINE/UPI:</span>
                  <span>{shopSettings.currencySymbol}{onlineSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>KHATA/CREDIT:</span>
                  <span>{shopSettings.currencySymbol}{creditSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-zinc-200">
                  <span>GROSS SALES:</span>
                  <span>{shopSettings.currencySymbol}{totalSales.toFixed(2)}</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>(+) OPENING FLOAT:</span>
                  <span>{shopSettings.currencySymbol}{openingFloat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>(+) CASH PAY-IN:</span>
                  <span>{shopSettings.currencySymbol}{cashIn.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>(-) CASH EXPENSE:</span>
                  <span>{shopSettings.currencySymbol}{cashOut.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-zinc-300">
                  <span>EXPECTED CASH:</span>
                  <span>{shopSettings.currencySymbol}{expectedDrawerCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs">
                  <span>COUNTED CASH:</span>
                  <span>{shopSettings.currencySymbol}{actualCountedCash.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-black ${isShort ? 'text-red-700' : 'text-emerald-700'}`}>
                  <span>VARIANCE:</span>
                  <span>{shopSettings.currencySymbol}{variance.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-4 pb-2 text-center text-[10px] space-y-3">
                <div className="pt-6 border-b border-zinc-400 w-32 mx-auto"></div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Cashier / Manager Signature
                </div>
                <div className="text-[8px] text-zinc-400">--- END OF FINANCIAL AUDIT ---</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            {isFinalized ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Shift Audit Logged into System
              </span>
            ) : (
              <span>Review cash numbers before finalizing day close.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintSlip}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Z-Slip
            </button>
            <button
              onClick={handleFinalize}
              disabled={isFinalized}
              className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-xl text-xs font-black shadow-lg disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
            >
              {isFinalized ? 'Shift Closed' : 'Finalize & Close Shift'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
