import React, { useState } from 'react';
import { X, CheckCircle2, Banknote, QrCode, CreditCard, ArrowRight, Printer, Vault } from '../icons/faIcons';
import { BillItem, PaymentMethod } from '../types';
import { hardware } from '../utils/hardware';

interface PaymentModalProps {
  isOpen: boolean;
  orderNumber: number;
  items: BillItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  currencySymbol: string;
  onClose: () => void;
  onCompleteOrder: (paymentDetails: {
    method: PaymentMethod;
    tendered: number;
    change: number;
    discount: number;
    customerName?: string;
    tableNumber?: string;
  }) => void;
  onPrintDirect: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  orderNumber,
  items,
  subtotal,
  taxRate: _taxRate,
  taxAmount,
  currencySymbol,
  onClose,
  onCompleteOrder,
  onPrintDirect: _onPrintDirect,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completedOrderNum, setCompletedOrderNum] = useState<number>(orderNumber);

  if (!isOpen) return null;

  const discountVal = (subtotal * discountPercent) / 100;
  const netTotal = Math.max(0, subtotal + taxAmount - discountVal);
  const hasEnteredTender = Boolean(tenderedAmount && !isNaN(parseFloat(tenderedAmount)));
  const tenderedNumeric = hasEnteredTender ? parseFloat(tenderedAmount) || 0 : netTotal;
  const changeDue = Math.max(0, tenderedNumeric - netTotal);
  const shortAmount = Math.max(0, netTotal - tenderedNumeric);

  const quickCashPresets = (
    currencySymbol === '$'
      ? [
          { label: 'Exact', amount: Math.ceil(netTotal) },
          { label: `${currencySymbol}5`, amount: 5 },
          { label: `${currencySymbol}10`, amount: 10 },
          { label: `${currencySymbol}20`, amount: 20 },
          { label: `${currencySymbol}50`, amount: 50 },
          { label: `${currencySymbol}100`, amount: 100 },
        ]
      : [
          { label: 'Exact', amount: Math.ceil(netTotal) },
          { label: `${currencySymbol}10`, amount: 10 },
          { label: `${currencySymbol}20`, amount: 20 },
          { label: `${currencySymbol}50`, amount: 50 },
          { label: `${currencySymbol}100`, amount: 100 },
          { label: `${currencySymbol}200`, amount: 200 },
          { label: `${currencySymbol}500`, amount: 500 },
        ]
  ).filter((p) => p.amount >= netTotal || p.label === 'Exact' || p.amount >= 20);

  const handleFinish = () => {
    setCompletedOrderNum(orderNumber);
    setIsCompleted(true);

    // Physical Cash Drawer Kick for cash tenders
    if (method === 'cash') {
      hardware.kickCashDrawer();
    }

    onCompleteOrder({
      method,
      tendered: method === 'cash' ? tenderedNumeric : netTotal,
      change: method === 'cash' ? changeDue : 0,
      discount: discountVal,
      customerName: customerName.trim() || undefined,
      tableNumber: tableNumber.trim() || undefined,
    });
  };

  const handleResetForNew = () => {
    setIsCompleted(false);
    setTenderedAmount('');
    setDiscountPercent(0);
    setCustomerName('');
    setTableNumber('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 border border-blue-100 text-blue-600 font-mono text-xs font-bold px-2 py-0.5 rounded-lg shadow-2xs">
              #{String(completedOrderNum).padStart(3, '0')}
            </span>
            <h2 className="text-base font-bold text-zinc-900">
              {isCompleted ? 'Payment Successful' : 'Checkout & Payment'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-zinc-400 hover:text-zinc-700 p-2 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {isCompleted ? (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mb-3 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Order Completed!</h3>
            <p className="text-xs text-zinc-500 mt-1 font-normal">
              Order #{String(completedOrderNum).padStart(3, '0')} has been recorded successfully.
            </p>

            <div className="w-full bg-white border border-zinc-200/80 rounded-2xl p-4 my-4 text-left text-xs font-mono space-y-1.5 shadow-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Total Paid:</span>
                <span className="font-bold text-zinc-900 tabular-nums tracking-tight">{currencySymbol}{netTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Method:</span>
                <span className="font-bold uppercase text-zinc-900">{method}</span>
              </div>
              {method === 'cash' && changeDue > 0 && (
                <div className="flex justify-between text-emerald-700 pt-1.5 border-t border-zinc-100">
                  <span className="font-bold">Change Returned:</span>
                  <span className="font-bold tabular-nums tracking-tight">{currencySymbol}{changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => {
                  window.print();
                  handleResetForNew();
                }}
                className="w-full h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-all shadow-xs active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print & Next Customer</span>
              </button>
              <button
                onClick={handleResetForNew}
                className="w-full h-11 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                <span>Done (No Print)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5">
            {/* Amount Banner */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Total Amount Due</p>
                <p className="text-2xl font-bold font-mono tracking-tight text-zinc-900 mt-0.5 tabular-nums">
                  {currencySymbol}{netTotal.toFixed(2)}
                </p>
              </div>
              <div className="text-right text-[11px] text-zinc-500">
                <p>{items.length} items</p>
                <p className="font-mono tabular-nums tracking-tight">Tax: {currencySymbol}{taxAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('cash')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                    method === 'cash'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <Banknote className="w-4 h-4 mb-1 text-blue-600" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                    method === 'upi'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <QrCode className="w-4 h-4 mb-1 text-blue-600" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                    method === 'card'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mb-1 text-blue-600" />
                  <span>Card / POS</span>
                </button>
              </div>
            </div>

            {/* Method Specific Controls */}
            {method === 'cash' && (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Cash Tendered
                  </label>
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {quickCashPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTenderedAmount(preset.amount.toString())}
                        className="h-8 px-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-medium text-zinc-800 hover:bg-zinc-100 cursor-pointer shadow-2xs tabular-nums transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs font-medium">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      placeholder={netTotal.toFixed(2)}
                      value={tenderedAmount}
                      onChange={(e) => setTenderedAmount(e.target.value)}
                      className="w-full h-11 pl-8 pr-3 rounded-xl border border-zinc-200 text-zinc-900 text-xs font-mono font-medium bg-zinc-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 tabular-nums tracking-tight transition-all"
                    />
                  </div>
                </div>

                {/* Change Due readout & Drawer Kick */}
                <div className="pt-2 border-t border-zinc-100 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasEnteredTender && tenderedNumeric > netTotal ? (
                        <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-lg text-[11px]">
                          Return Change:
                        </span>
                      ) : hasEnteredTender && tenderedNumeric < netTotal ? (
                        <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg text-[11px]">
                          Still Owed:
                        </span>
                      ) : (
                        <span className="font-medium text-zinc-600">Change Due:</span>
                      )}
                      <span
                        className={`font-mono font-bold text-base tabular-nums tracking-tight ${
                          hasEnteredTender && tenderedNumeric > netTotal
                            ? 'text-emerald-600'
                            : hasEnteredTender && tenderedNumeric < netTotal
                            ? 'text-amber-600'
                            : 'text-zinc-900'
                        }`}
                      >
                        {currencySymbol}
                        {(hasEnteredTender && tenderedNumeric < netTotal ? shortAmount : changeDue).toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => hardware.kickCashDrawer()}
                      className="h-8 px-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors active:scale-[0.98]"
                      title="Open physical USB/RJ11 cash drawer"
                    >
                      <Vault className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Pop Drawer</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {method === 'upi' && (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col items-center text-center space-y-2 shadow-xs">
                <div className="p-3 bg-white border border-zinc-200 rounded-2xl shadow-xs">
                  {/* SVG UPI QR representation */}
                  <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" fill="white" />
                    {/* Corners */}
                    <rect x="5" y="5" width="30" height="30" rx="4" fill="#09090b" />
                    <rect x="10" y="10" width="20" height="20" fill="white" />
                    <rect x="14" y="14" width="12" height="12" fill="#09090b" />

                    <rect x="65" y="5" width="30" height="30" rx="4" fill="#09090b" />
                    <rect x="70" y="10" width="20" height="20" fill="white" />
                    <rect x="74" y="14" width="12" height="12" fill="#09090b" />

                    <rect x="5" y="65" width="30" height="30" rx="4" fill="#09090b" />
                    <rect x="10" y="70" width="20" height="20" fill="white" />
                    <rect x="14" y="74" width="12" height="12" fill="#09090b" />

                    {/* QR matrix dots */}
                    <rect x="42" y="10" width="6" height="6" fill="#09090b" />
                    <rect x="52" y="10" width="6" height="6" fill="#09090b" />
                    <rect x="42" y="22" width="6" height="6" fill="#09090b" />
                    <rect x="52" y="28" width="6" height="6" fill="#09090b" />

                    <rect x="10" y="42" width="6" height="6" fill="#09090b" />
                    <rect x="22" y="42" width="6" height="6" fill="#09090b" />
                    <rect x="34" y="42" width="12" height="6" fill="#09090b" />
                    <rect x="52" y="42" width="6" height="12" fill="#09090b" />
                    <rect x="64" y="42" width="8" height="6" fill="#09090b" />
                    <rect x="78" y="42" width="12" height="6" fill="#09090b" />

                    <rect x="10" y="54" width="8" height="6" fill="#09090b" />
                    <rect x="24" y="54" width="6" height="6" fill="#09090b" />
                    <rect x="38" y="54" width="6" height="6" fill="#09090b" />
                    <rect x="64" y="54" width="12" height="6" fill="#09090b" />
                    <rect x="82" y="54" width="8" height="6" fill="#09090b" />

                    <rect x="42" y="68" width="12" height="6" fill="#09090b" />
                    <rect x="60" y="68" width="8" height="6" fill="#09090b" />
                    <rect x="74" y="68" width="16" height="6" fill="#09090b" />

                    <rect x="42" y="80" width="6" height="10" fill="#09090b" />
                    <rect x="54" y="80" width="12" height="6" fill="#09090b" />
                    <rect x="72" y="80" width="8" height="10" fill="#09090b" />
                  </svg>
                </div>
                <p className="text-xs font-mono font-bold text-zinc-800 tabular-nums tracking-tight">
                  Scan to Pay {currencySymbol}{netTotal.toFixed(2)}
                </p>
                <p className="text-[10px] text-zinc-500">
                  UPI ID: <span className="font-mono font-medium text-zinc-700">pos.merchant@okhdfcbank</span>
                </p>
              </div>
            )}

            {method === 'card' && (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 text-center space-y-2 shadow-xs">
                <div className="w-10 h-10 mx-auto bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-zinc-900">Swipe, Tap or Insert Card on POS Terminal</p>
                <p className="text-[10px] text-zinc-500 font-mono tabular-nums">
                  Terminal ID: POS-T091 | Ready for {currencySymbol}{netTotal.toFixed(2)}
                </p>
              </div>
            )}

            {/* Optional Customer & Table details */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Customer / Phone (Opt)
                </label>
                <input
                  type="text"
                  placeholder="e.g. John / 98765..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Table / Token (Opt)
                </label>
                <input
                  type="text"
                  placeholder="e.g. T-04, Takeaway"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Quick Discount Toggle */}
            <div className="flex items-center justify-between text-xs text-zinc-600 pt-1">
              <span className="font-medium text-[11px] text-zinc-500">Quick Discount:</span>
              <div className="flex gap-1.5">
                {[0, 5, 10, 15].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setDiscountPercent(rate)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium cursor-pointer transition-all tabular-nums ${
                      discountPercent === rate
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!isCompleted && (
          <div className="p-4 border-t border-zinc-100 bg-white flex items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              id="btn-confirm-payment"
              onClick={handleFinish}
              className="flex-1 h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-all shadow-xs active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Pay {currencySymbol}{netTotal.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
