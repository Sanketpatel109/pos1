import React, { useState } from 'react';
import { X, CheckCircle2, Banknote, QrCode, CreditCard, Printer, Vault } from 'lucide-react';
import { BillItem, PaymentMethod } from '../types';
import { hardware } from '../utils/hardware';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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

  const discountAmount = (subtotal * discountPercent) / 100;
  const netTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  const tenderedNumeric = parseFloat(tenderedAmount) || 0;
  const changeDue = Math.max(0, tenderedNumeric - netTotal);
  const shortAmount = Math.max(0, netTotal - tenderedNumeric);
  const hasEnteredTender = tenderedAmount.trim() !== '';

  const quickCashPresets = [
    { label: `${currencySymbol}${Math.ceil(netTotal)}`, amount: Math.ceil(netTotal) },
    { label: `${currencySymbol}${Math.ceil(netTotal / 50) * 50 || 50}`, amount: Math.ceil(netTotal / 50) * 50 || 50 },
    { label: `${currencySymbol}${Math.ceil(netTotal / 100) * 100 || 100}`, amount: Math.ceil(netTotal / 100) * 100 || 100 },
    { label: `${currencySymbol}${Math.ceil(netTotal / 500) * 500 || 500}`, amount: Math.ceil(netTotal / 500) * 500 || 500 },
  ];

  const handleFinish = () => {
    const finalTendered = method === 'cash' ? (tenderedNumeric > 0 ? tenderedNumeric : netTotal) : netTotal;
    const finalChange = method === 'cash' ? Math.max(0, finalTendered - netTotal) : 0;

    setCompletedOrderNum(orderNumber);
    setIsCompleted(true);

    onCompleteOrder({
      method,
      tendered: finalTendered,
      change: finalChange,
      discount: discountAmount,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card text-card-foreground rounded-2xl w-full max-w-md border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-bold">
              #{String(completedOrderNum).padStart(3, '0')}
            </Badge>
            <h2 className="text-base font-bold text-foreground">
              {isCompleted ? 'Payment Successful' : 'Checkout & Payment'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Body */}
        {isCompleted ? (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center mb-3 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">Order Completed!</h3>
            <p className="text-xs text-muted-foreground mt-1 font-normal">
              Order #{String(completedOrderNum).padStart(3, '0')} has been recorded successfully.
            </p>

            <div className="w-full bg-card border border-border rounded-xl p-4 my-4 text-left text-xs space-y-1.5 shadow-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Paid:</span>
                <span className="font-bold text-foreground tabular-nums tracking-tight">{currencySymbol}{netTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Method:</span>
                <span className="font-bold uppercase text-foreground">{method}</span>
              </div>
              {method === 'cash' && changeDue > 0 && (
                <div className="flex justify-between text-primary pt-1.5 border-t border-border">
                  <span className="font-bold">Change Returned:</span>
                  <span className="font-bold tabular-nums tracking-tight">{currencySymbol}{changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full">
              <Button
                onClick={() => {
                  window.print();
                  handleResetForNew();
                }}
                className="w-full h-11 text-xs font-medium gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print & Next Customer</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleResetForNew}
                className="w-full h-11 text-xs font-medium gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <span>Done (No Print)</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5">
            {/* Amount Banner */}
            <div className="bg-muted/40 rounded-xl border border-border p-4 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Amount Due</p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5 tabular-nums">
                  {currencySymbol}{netTotal.toFixed(2)}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{items.length} items</p>
                <p className="tabular-nums tracking-tight">Tax: {currencySymbol}{taxAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('cash')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    method === 'cash'
                      ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  <Banknote className="w-4 h-4 mb-1 text-primary" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    method === 'upi'
                      ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  <QrCode className="w-4 h-4 mb-1 text-primary" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    method === 'card'
                      ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mb-1 text-primary" />
                  <span>Card / POS</span>
                </button>
              </div>
            </div>

            {/* Method Specific Controls */}
            {method === 'cash' && (
              <div className="bg-card border border-border rounded-xl p-3.5 space-y-2.5 shadow-xs">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Cash Tendered
                  </label>
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {quickCashPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTenderedAmount(preset.amount.toString())}
                        className="h-8 px-2.5 bg-muted border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted/80 cursor-pointer shadow-2xs tabular-nums transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium z-10">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      placeholder={netTotal.toFixed(2)}
                      value={tenderedAmount}
                      onChange={(e) => setTenderedAmount(e.target.value)}
                      className="pl-7 h-10 text-xs tabular-nums"
                    />
                  </div>
                </div>

                {/* Change Due readout & Drawer Kick */}
                <div className="pt-2 border-t border-border text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasEnteredTender && tenderedNumeric > netTotal ? (
                        <span className="font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg text-xs">
                          Return Change:
                        </span>
                      ) : hasEnteredTender && tenderedNumeric < netTotal ? (
                        <span className="font-semibold text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-lg text-xs">
                          Still Owed:
                        </span>
                      ) : (
                        <span className="font-medium text-muted-foreground">Change Due:</span>
                      )}
                      <span
                        className={`font-bold text-base tabular-nums tracking-tight ${
                          hasEnteredTender && tenderedNumeric > netTotal
                            ? 'text-primary'
                            : hasEnteredTender && tenderedNumeric < netTotal
                            ? 'text-destructive'
                            : 'text-foreground'
                        }`}
                      >
                        {currencySymbol}
                        {(hasEnteredTender && tenderedNumeric < netTotal ? shortAmount : changeDue).toFixed(2)}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => hardware.kickCashDrawer()}
                      className="h-8 text-xs gap-1.5"
                      title="Open physical USB/RJ11 cash drawer"
                    >
                      <Vault className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Pop Drawer</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {method === 'upi' && (
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center text-center space-y-2 shadow-xs">
                <div className="p-3 bg-background border border-border rounded-xl shadow-xs text-foreground">
                  {/* SVG UPI QR representation */}
                  <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" fill="var(--color-card, white)" />
                    {/* Corners */}
                    <rect x="5" y="5" width="30" height="30" rx="4" fill="currentColor" />
                    <rect x="10" y="10" width="20" height="20" fill="var(--color-card, white)" />
                    <rect x="14" y="14" width="12" height="12" fill="currentColor" />

                    <rect x="65" y="5" width="30" height="30" rx="4" fill="currentColor" />
                    <rect x="70" y="10" width="20" height="20" fill="var(--color-card, white)" />
                    <rect x="74" y="14" width="12" height="12" fill="currentColor" />

                    <rect x="5" y="65" width="30" height="30" rx="4" fill="currentColor" />
                    <rect x="10" y="70" width="20" height="20" fill="var(--color-card, white)" />
                    <rect x="14" y="74" width="12" height="12" fill="currentColor" />

                    {/* QR matrix dots */}
                    <rect x="42" y="10" width="6" height="6" fill="currentColor" />
                    <rect x="52" y="10" width="6" height="6" fill="currentColor" />
                    <rect x="42" y="22" width="6" height="6" fill="currentColor" />
                    <rect x="52" y="28" width="6" height="6" fill="currentColor" />

                    <rect x="10" y="42" width="6" height="6" fill="currentColor" />
                    <rect x="22" y="42" width="6" height="6" fill="currentColor" />
                    <rect x="34" y="42" width="12" height="6" fill="currentColor" />
                    <rect x="52" y="42" width="6" height="12" fill="currentColor" />
                    <rect x="64" y="42" width="8" height="6" fill="currentColor" />
                    <rect x="78" y="42" width="12" height="6" fill="currentColor" />

                    <rect x="10" y="54" width="8" height="6" fill="currentColor" />
                    <rect x="24" y="54" width="6" height="6" fill="currentColor" />
                    <rect x="38" y="54" width="6" height="6" fill="currentColor" />
                    <rect x="64" y="54" width="12" height="6" fill="currentColor" />
                    <rect x="82" y="54" width="8" height="6" fill="currentColor" />

                    <rect x="42" y="68" width="12" height="6" fill="currentColor" />
                    <rect x="60" y="68" width="8" height="6" fill="currentColor" />
                    <rect x="74" y="68" width="16" height="6" fill="currentColor" />

                    <rect x="42" y="80" width="6" height="10" fill="currentColor" />
                    <rect x="54" y="80" width="12" height="6" fill="currentColor" />
                    <rect x="72" y="80" width="8" height="10" fill="currentColor" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-foreground tabular-nums tracking-tight">
                  Scan to Pay {currencySymbol}{netTotal.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  UPI ID: <span className="font-medium text-foreground">pos.merchant@okhdfcbank</span>
                </p>
              </div>
            )}

            {method === 'card' && (
              <div className="bg-card border border-border rounded-xl p-5 text-center space-y-2 shadow-xs">
                <div className="w-10 h-10 mx-auto bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
                  <CreditCard className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-foreground">Swipe, Tap or Insert Card on POS Terminal</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Terminal ID: POS-T091 | Ready for {currencySymbol}{netTotal.toFixed(2)}
                </p>
              </div>
            )}

            {/* Optional Customer & Table details */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Customer / Phone (Opt)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. John / 98765..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Table / Token (Opt)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. T-04, Takeaway"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>
            </div>

            {/* Quick Discount Toggle */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="font-medium text-xs text-muted-foreground">Quick Discount:</span>
              <div className="flex gap-1.5">
                {[0, 5, 10, 15].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setDiscountPercent(rate)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all tabular-nums ${
                      discountPercent === rate
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
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
          <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 text-xs"
            >
              Cancel
            </Button>

            <Button
              type="button"
              id="btn-confirm-payment"
              onClick={handleFinish}
              className="flex-1 h-10 text-xs font-medium gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Pay {currencySymbol}{netTotal.toFixed(2)}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
