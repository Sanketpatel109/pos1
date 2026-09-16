import React, { useState } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ArrowRight,
  Wallet,
  CreditCard,
  Building,
} from 'lucide-react';
import { Order } from '../types';
import { printThermalHtml } from '../utils/thermalPrinter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    if (!lastRefund) return;
    const itemsHtml = lastRefund.refundedItems
      .map(
        (i) => `
        <div class="row" style="font-size: 10px; padding: 2px 0;">
          <span>${i.quantity}x ${i.name}</span>
          <span style="font-weight: bold;">${currencySymbol}${i.amount.toFixed(2)}</span>
        </div>
      `
      )
      .join('');

    const slipHtml = `
      <div class="text-center" style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <h3 class="font-extrabold uppercase">CREDIT NOTE VOUCHER</h3>
        <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">CN-${Date.now().toString().slice(-6)}</div>
        <div style="font-size: 10px; color: #555;">Original Bill #${order.orderNumber}</div>
      </div>
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
        <div class="row"><span>Date & Time:</span><span>${new Date().toLocaleString('en-GB')}</span></div>
        <div class="row"><span>Customer:</span><span>${order.customerName || 'Walk-in Customer'}</span></div>
        <div class="row"><span>Refund Mode:</span><span class="font-bold uppercase">${lastRefund.refundMethod}</span></div>
        <div class="row"><span>Reason:</span><span>${lastRefund.refundReason}</span></div>
      </div>
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        ${itemsHtml}
      </div>
      <div class="row font-bold" style="font-size: 12px; margin-bottom: 8px;">
        <span>TOTAL REFUNDED:</span>
        <span>${currencySymbol}${lastRefund.refundAmount.toFixed(2)}</span>
      </div>
      <div class="text-center" style="font-size: 9px; color: #555;">
        ${lastRefund.restockInventory ? 'Items restocked in store inventory.' : 'Items marked damaged / not restocked.'}
      </div>
    `;

    printThermalHtml(slipHtml, `Credit-Note-CN-${Date.now().toString().slice(-6)}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground leading-tight">
                  Process Return / Refund
                </DialogTitle>
                <Badge variant="secondary" className="text-xs">
                  Bill #{order.orderNumber}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {order.customerName || 'Walk-in Customer'} • Original Total: {currencySymbol}{order.total.toFixed(2)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        {isSuccess && lastRefund ? (
          /* Success & Credit Note Screen */
          <div className="p-6 flex flex-col items-center text-center space-y-4 overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
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
            <Card className="w-full bg-muted/40 border-border">
              <CardContent className="p-4 text-left text-xs space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground">
                    Credit Note Voucher
                  </span>
                  <span className="font-mono text-foreground font-bold">
                    CN-{Date.now().toString().slice(-6)}
                  </span>
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
                  <span className="text-primary font-extrabold tabular-nums">
                    {currencySymbol}{lastRefund.refundAmount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="w-full flex items-center gap-3 pt-2">
              <Button
                type="button"
                onClick={handlePrintCreditNote}
                variant="outline"
                className="flex-1 h-10 text-xs font-bold gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Credit Note</span>
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 text-xs font-bold"
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
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={handleSelectAll}
                className="text-xs font-bold text-primary p-0 h-auto"
              >
                {order.items.every((item) => returnQtys[item.id] === item.quantity)
                  ? 'Deselect All'
                  : 'Return All Items'}
              </Button>
            </div>

            {/* Line Items List with Stepper */}
            <div className="space-y-2 border border-border rounded-xl p-2 bg-muted/20 max-h-56 overflow-y-auto">
              {order.items.map((item) => {
                const currentReturnQty = returnQtys[item.id] || 0;
                const isSelected = currentReturnQty > 0;

                return (
                  <Card
                    key={item.id}
                    className={`transition-all ${
                      isSelected
                        ? 'border-primary/40 bg-primary/5 shadow-2xs'
                        : 'border-border bg-card shadow-none'
                    }`}
                  >
                    <CardContent className="p-2.5 flex items-center justify-between gap-2">
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
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => handleSetQty(item.id, currentReturnQty - 1, item.quantity)}
                          disabled={currentReturnQty <= 0}
                          className="h-7 w-7 text-xs font-bold"
                        >
                          -
                        </Button>
                        <span className="w-7 text-center font-bold text-xs tabular-nums text-foreground">
                          {currentReturnQty}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => handleSetQty(item.id, currentReturnQty + 1, item.quantity)}
                          disabled={currentReturnQty >= item.quantity}
                          className="h-7 w-7 text-xs font-bold"
                        >
                          +
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Return Settings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Refund Method */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Refund Method
                </Label>
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-muted/50 rounded-lg border border-border text-xs">
                  <Button
                    type="button"
                    variant={refundMethod === 'CASH' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setRefundMethod('CASH')}
                    className="h-8 gap-1 text-xs"
                  >
                    <Wallet className="size-3" />
                    <span>Cash</span>
                  </Button>
                  <Button
                    type="button"
                    variant={refundMethod === 'KHATA' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setRefundMethod('KHATA')}
                    className="h-8 gap-1 text-xs"
                  >
                    <CreditCard className="size-3" />
                    <span>Khata</span>
                  </Button>
                  <Button
                    type="button"
                    variant={refundMethod === 'ONLINE' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setRefundMethod('ONLINE')}
                    className="h-8 gap-1 text-xs"
                  >
                    <Building className="size-3" />
                    <span>UPI</span>
                  </Button>
                </div>
              </div>

              {/* Reason for Return */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Reason for Return
                </Label>
                <Select value={refundReason} onValueChange={(val) => val && setRefundReason(val)}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer Return (Defective/Damaged)">Defective / Damaged</SelectItem>
                    <SelectItem value="Customer Return (Wrong Product)">Wrong Product Given</SelectItem>
                    <SelectItem value="Customer Changed Mind">Customer Changed Mind</SelectItem>
                    <SelectItem value="Expired / Quality Issue">Expired / Quality Issue</SelectItem>
                    <SelectItem value="Billing Error / Duplicate">Billing Error / Duplicate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Restock Toggle */}
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
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
            <Card className="bg-muted/30 border-border shadow-none">
              <CardContent className="p-3.5 space-y-1.5 text-xs">
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
                  <span className="text-base sm:text-lg font-extrabold text-primary tabular-nums">
                    {currencySymbol}{totalRefundAmount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <DialogFooter className="flex-row items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-10 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleProcessRefund}
                disabled={totalRefundAmount <= 0}
                className="flex-[1.5] h-10 text-xs font-semibold gap-1.5 shadow-xs"
              >
                <span>Issue Refund ({currencySymbol}{totalRefundAmount.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
