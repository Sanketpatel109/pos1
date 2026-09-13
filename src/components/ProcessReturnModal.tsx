import React, { useState } from 'react';
import {
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ShoppingBag,
  ArrowRight,
  Wallet,
  CreditCard,
  Building,
} from 'lucide-react';
import { Order, BillItem } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface RefundResult {
  orderId: string;
  orderNumber: number;
  refundedItems: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  refundAmount: number;
  refundMethod: 'CASH' | 'KHATA' | 'ONLINE';
  refundReason: string;
  restockInventory: boolean;
  refundedAt: string;
}

interface ProcessReturnModalProps {
  isOpen: boolean;
  order: Order | null;
  currencySymbol?: string;
  onClose: () => void;
  onConfirmRefund: (refund: RefundResult) => void;
}

export const ProcessReturnModal: React.FC<ProcessReturnModalProps> = ({
  isOpen,
  order,
  currencySymbol = '₹',
  onClose,
  onConfirmRefund,
}) => {
  if (!isOpen || !order) return null;

  // Track return quantities per item
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    order.items.forEach((item) => {
      init[item.id] = 0;
    });
    return init;
  });

  const [refundMethod, setRefundMethod] = useState<'CASH' | 'KHATA' | 'ONLINE'>(
    order.paymentMethod === 'CREDIT' ? 'KHATA' : 'CASH'
  );
  const [refundReason, setRefundReason] = useState<string>(
    'Customer Return (Defective/Damaged)'
  );
  const [restockInventory, setRestockInventory] = useState<boolean>(true);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [lastRefund, setLastRefund] = useState<RefundResult | null>(null);

  // Return all toggle
  const handleSelectAll = () => {
    const allSelected = order.items.every((item) => returnQtys[item.id] === item.quantity);
    const updated: Record<string, number> = {};
    order.items.forEach((item) => {
      updated[item.id] = allSelected ? 0 : item.quantity;
    });
    setReturnQtys(updated);
  };

  // Adjust item return qty
  const handleSetQty = (id: string, qty: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, qty));
    setReturnQtys((prev) => ({
      ...prev,
      [id]: clamped,
    }));
  };

  // Calculations
  const selectedItems = order.items
    .filter((item) => (returnQtys[item.id] || 0) > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      quantity: returnQtys[item.id] || 0,
      unitPrice: item.unitPrice,
      amount: Number((item.unitPrice * (returnQtys[item.id] || 0)).toFixed(2)),
    }));

  const totalReturnUnits = Object.values(returnQtys).reduce((sum, q) => sum + q, 0);
  const refundSubtotal = selectedItems.reduce((sum, it) => sum + it.amount, 0);
  // Prorate GST if applicable
  const refundTax = order.subtotal > 0 ? (refundSubtotal * order.taxRate) / 100 : 0;
  const totalRefundAmount = Number((refundSubtotal + refundTax).toFixed(2));

  const handleProcessRefund = () => {
    if (selectedItems.length === 0 || totalRefundAmount <= 0) return;

    const result: RefundResult = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      refundedItems: selectedItems,
      refundAmount: totalRefundAmount,
      refundMethod,
      refundReason,
      restockInventory,
      refundedAt: new Date().toISOString(),
    };

    setLastRefund(result);
    setIsSuccess(true);
    onConfirmRefund(result);
  };

  const handlePrintCreditNote = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="fixed inset-0 bg-transparent" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Process Return / Refund
                </h2>
                <Badge variant="outline" className="text-xs">
                  Bill #{order.orderNumber}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {order.customerName || 'Walk-in Customer'} • Original Total: {currencySymbol}{order.total.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess && lastRefund ? (
          /* Success & Credit Note Screen */
          <div className="p-6 flex flex-col items-center text-center space-y-4 overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">
                Refund Processed Successfully
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Credit note issued for Bill #{order.orderNumber}.{' '}
                {lastRefund.restockInventory ? 'Items restocked in catalog.' : ''}
              </p>
            </div>

            {/* Credit Note Summary Card */}
            <Card className="w-full p-4 text-left text-xs space-y-2 bg-muted/40 border-border">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="font-bold uppercase tracking-wider text-muted-foreground">Credit Note Voucher</span>
                <span className="font-mono text-foreground font-bold">CN-{Date.now().toString().slice(-6)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Refund Method:</span>
                <span className="font-bold text-foreground">{lastRefund.refundMethod}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Items Returned:</span>
                <span className="font-bold text-foreground">{lastRefund.refundedItems.length} items</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Reason:</span>
                <span className="font-medium text-foreground">{lastRefund.refundReason}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-bold text-sm text-foreground">
                <span>Total Refunded:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold tabular-nums">
                  {currencySymbol}{lastRefund.refundAmount.toFixed(2)}
                </span>
              </div>
            </Card>

            <div className="w-full flex items-center gap-3 pt-2">
              <Button
                type="button"
                onClick={handlePrintCreditNote}
                variant="outline"
                className="flex-1 h-10 text-xs font-bold gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Credit Note</span>
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Active Return Selection Form */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Action Bar: Select All / None */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Select Items to Return
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                {order.items.every((item) => returnQtys[item.id] === item.quantity)
                  ? 'Deselect All'
                  : 'Return All Items'}
              </button>
            </div>

            {/* Line Items List with Return Stepper */}
            <div className="space-y-2 border border-border rounded-xl p-2 bg-muted/10 max-h-56 overflow-y-auto">
              {order.items.map((item) => {
                const currentReturnQty = returnQtys[item.id] || 0;
                const isSelected = currentReturnQty > 0;

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {currencySymbol}{item.unitPrice.toFixed(2)} each • Purchased: {item.quantity}
                      </p>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetQty(item.id, currentReturnQty - 1, item.quantity)}
                        disabled={currentReturnQty <= 0}
                        className="w-7 h-7 rounded-md border border-border bg-card flex items-center justify-center font-bold text-xs hover:bg-muted transition-all disabled:opacity-30 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-bold text-xs tabular-nums text-foreground">
                        {currentReturnQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSetQty(item.id, currentReturnQty + 1, item.quantity)}
                        disabled={currentReturnQty >= item.quantity}
                        className="w-7 h-7 rounded-md border border-border bg-card flex items-center justify-center font-bold text-xs hover:bg-muted transition-all disabled:opacity-30 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Return Settings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Refund Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  Refund Method
                </label>
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-muted rounded-xl border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setRefundMethod('CASH')}
                    className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      refundMethod === 'CASH'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Wallet className="size-3" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundMethod('KHATA')}
                    className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      refundMethod === 'KHATA'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CreditCard className="size-3" />
                    <span>Khata</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundMethod('ONLINE')}
                    className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      refundMethod === 'ONLINE'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Building className="size-3" />
                    <span>UPI</span>
                  </button>
                </div>
              </div>

              {/* Reason for Return */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  Reason for Return
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-medium rounded-xl bg-card border border-border text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="Customer Return (Defective/Damaged)">Defective / Damaged</option>
                  <option value="Customer Return (Wrong Product)">Wrong Product Given</option>
                  <option value="Customer Changed Mind">Customer Changed Mind</option>
                  <option value="Expired / Quality Issue">Expired / Quality Issue</option>
                  <option value="Billing Error / Duplicate">Billing Error / Duplicate</option>
                </select>
              </div>
            </div>

            {/* Restock Toggle */}
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/20 cursor-pointer">
              <input
                type="checkbox"
                checked={restockInventory}
                onChange={(e) => setRestockInventory(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
              />
              <span className="text-xs font-medium text-foreground">
                Restock returned items back to product inventory
              </span>
            </label>

            {/* Refund Totals Summary */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Selected for Return:</span>
                <span className="font-bold text-foreground tabular-nums">
                  {totalReturnUnits} units ({selectedItems.length} items)
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Refund Subtotal:</span>
                <span className="font-bold text-foreground tabular-nums">
                  {currencySymbol}{refundSubtotal.toFixed(2)}
                </span>
              </div>
              {refundTax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Prorated GST Adjustment:</span>
                  <span className="font-bold text-foreground tabular-nums">
                    +{currencySymbol}{refundTax.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-border text-sm font-bold text-foreground">
                <span>Total Refund Amount:</span>
                <span className="text-base sm:text-lg text-amber-500 font-extrabold tabular-nums">
                  {currencySymbol}{totalRefundAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-10 text-xs font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleProcessRefund}
                disabled={totalRefundAmount <= 0}
                className="flex-[1.5] h-10 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-zinc-950 cursor-pointer shadow-xs disabled:opacity-40"
              >
                <span>Issue Refund ({currencySymbol}{totalRefundAmount.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
