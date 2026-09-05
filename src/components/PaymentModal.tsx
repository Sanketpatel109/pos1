import React, { useState } from 'react';
import { X, CheckCircle2, Banknote, QrCode, CreditCard, ArrowRight, Printer } from 'lucide-react';
import { BillItem, PaymentMethod } from '../types';

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
  const tenderedNumeric = parseFloat(tenderedAmount) || netTotal;
  const changeDue = Math.max(0, tenderedNumeric - netTotal);

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
          { label: `${currencySymbol}100`, amount: 100 },
          { label: `${currencySymbol}200`, amount: 200 },
          { label: `${currencySymbol}500`, amount: 500 },
          { label: `${currencySymbol}2000`, amount: 2000 },
        ]
  ).filter((p) => p.amount >= netTotal || p.label === 'Exact');

  const handleFinish = () => {
    setCompletedOrderNum(orderNumber);
    setIsCompleted(true);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl w-full max-w-md border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-200 bg-zinc-50 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="bg-zinc-900 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
              #{String(completedOrderNum).padStart(3, '0')}
            </span>
            <h2 className="text-sm font-bold text-zinc-900">
              {isCompleted ? 'Payment Successful' : 'Checkout & Payment'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-zinc-500 hover:text-zinc-900 p-1 rounded-md hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {isCompleted ? (
          <div className="p-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Order Completed!</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Order #{String(completedOrderNum).padStart(3, '0')} has been recorded successfully.
            </p>

            <div className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 my-3 text-left text-xs font-mono space-y-1">
              <div className="flex justify-between text-zinc-600">
                <span>Total Paid:</span>
                <span className="font-bold text-zinc-900">{currencySymbol}{netTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Method:</span>
                <span className="font-bold uppercase text-zinc-900">{method}</span>
              </div>
              {method === 'cash' && changeDue > 0 && (
                <div className="flex justify-between text-emerald-700 pt-1 border-t border-zinc-200">
                  <span className="font-bold">Change Returned:</span>
                  <span className="font-bold">{currencySymbol}{changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full">
              <button
                onClick={handleResetForNew}
                className="flex-1 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-black text-white font-bold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Start Next Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 flex-1 overflow-y-auto space-y-3">
            {/* Amount Banner */}
            <div className="bg-zinc-900 text-white rounded-lg p-3 flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Total Amount Due</p>
                <p className="text-2xl font-extrabold font-mono tracking-tight text-white mt-0.5">
                  {currencySymbol}{netTotal.toFixed(2)}
                </p>
              </div>
              <div className="text-right text-[11px] text-zinc-300">
                <p>{items.length} items</p>
                <p className="text-zinc-400 font-mono">Tax: {currencySymbol}{taxAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMethod('cash')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    method === 'cash'
                      ? 'border-zinc-900 bg-zinc-100 text-zinc-900 ring-1 ring-zinc-900/20 font-bold'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <Banknote className="w-4 h-4 mb-0.5 text-zinc-800" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    method === 'upi'
                      ? 'border-zinc-900 bg-zinc-100 text-zinc-900 ring-1 ring-zinc-900/20 font-bold'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <QrCode className="w-4 h-4 mb-0.5 text-zinc-800" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    method === 'card'
                      ? 'border-zinc-900 bg-zinc-100 text-zinc-900 ring-1 ring-zinc-900/20 font-bold'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mb-0.5 text-zinc-800" />
                  <span>Card / POS</span>
                </button>
              </div>
            </div>

            {/* Method Specific Controls */}
            {method === 'cash' && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Cash Tendered
                  </label>
                  <div className="flex gap-1.5 mb-1.5 flex-wrap">
                    {quickCashPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTenderedAmount(preset.amount.toString())}
                        className="px-2 py-0.5 bg-white border border-zinc-300 rounded text-[11px] font-mono font-bold text-zinc-800 hover:bg-zinc-100 cursor-pointer shadow-2xs"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-zinc-400 font-mono text-xs">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      placeholder={netTotal.toFixed(2)}
                      value={tenderedAmount}
                      onChange={(e) => setTenderedAmount(e.target.value)}
                      className="w-full pl-6 pr-2.5 py-1.5 rounded-md border border-zinc-300 text-zinc-900 text-xs font-mono font-bold bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                {/* Change Due readout */}
                <div className="flex items-center justify-between pt-1.5 border-t border-zinc-200 text-xs">
                  <span className="font-semibold text-zinc-700">Change to Return:</span>
                  <span className={`font-mono font-bold text-sm ${changeDue > 0 ? 'text-emerald-700' : 'text-zinc-800'}`}>
                    {currencySymbol}{changeDue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {method === 'upi' && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 flex flex-col items-center text-center space-y-1.5">
                <div className="p-2 bg-white border border-zinc-300 rounded-lg shadow-2xs">
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
                <p className="text-xs font-mono font-bold text-zinc-800">
                  Scan to Pay {currencySymbol}{netTotal.toFixed(2)}
                </p>
                <p className="text-[10px] text-zinc-500">
                  UPI ID: <span className="font-mono font-semibold text-zinc-700">pos.merchant@okhdfcbank</span>
                </p>
              </div>
            )}

            {method === 'card' && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-center space-y-1.5">
                <div className="w-9 h-9 mx-auto bg-zinc-200 rounded-full flex items-center justify-center text-zinc-800">
                  <CreditCard className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-zinc-800">Swipe, Tap or Insert Card on POS Terminal</p>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Terminal ID: POS-T091 | Ready for {currencySymbol}{netTotal.toFixed(2)}
                </p>
              </div>
            )}

            {/* Optional Customer & Table details */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-0.5">
                  Customer / Phone (Opt)
                </label>
                <input
                  type="text"
                  placeholder="e.g. John / 98765..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2 py-1 rounded-md border border-zinc-300 text-xs text-zinc-900 bg-white focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-0.5">
                  Table / Token (Opt)
                </label>
                <input
                  type="text"
                  placeholder="e.g. T-04, Takeaway"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full px-2 py-1 rounded-md border border-zinc-300 text-xs text-zinc-900 bg-white focus:ring-1 focus:ring-zinc-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Discount Toggle */}
            <div className="flex items-center justify-between text-xs text-zinc-600 pt-0.5">
              <span>Quick Discount:</span>
              <div className="flex gap-1">
                {[0, 5, 10, 15].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setDiscountPercent(rate)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold cursor-pointer ${
                      discountPercent === rate
                        ? 'bg-zinc-900 text-white'
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
          <div className="p-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 font-medium text-xs hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              id="btn-confirm-payment"
              onClick={handleFinish}
              className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-black text-white font-bold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm & Pay {currencySymbol}{netTotal.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
