import React, { useState, useEffect } from 'react';
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
import { Order, BillItem } from '../types';
import { calculateOrderTaxFromSnapshot } from '../constants/taxRates';
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

  // Helper to compute already refunded count for a given item
  const getAlreadyRefundedQty = (itemId: string, itemName: string): number => {
    if (!order?.refundedItems) return 0;
    return order.refundedItems
      .filter((r) => r.id === itemId || r.name.toLowerCase() === itemName.toLowerCase())
      .reduce((sum, r) => sum + r.quantity, 0);
  };

  const getAvailableReturnQty = (item: BillItem): number => {
    const already = getAlreadyRefundedQty(item.id, item.name);
    return Math.max(0, item.quantity - already);
  };

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

  // Reset modal state whenever opened or target order changes
  useEffect(() => {
    if (isOpen && order) {
      const init: Record<string, number> = {};
      order.items.forEach((item) => {
        init[item.id] = 0;
      });
      setReturnQtys(init);
      setIsSuccess(false);
      setLastRefund(null);
      setRefundMethod(order.paymentMethod === 'CREDIT' ? 'KHATA' : 'CASH');
      setRefundReason('Customer Return (Defective/Damaged)');
      setRestockInventory(true);
    }
  }, [isOpen, order?.id]);

  const totalAvailableUnits = order.items.reduce(
    (sum, it) => sum + getAvailableReturnQty(it),
    0
  );

  // Return all available toggle
  const handleSelectAll = () => {
    const allAvailableSelected = order.items.every((item) => {
      const avail = getAvailableReturnQty(item);
      return avail === 0 || (returnQtys[item.id] || 0) === avail;
    });

    const updated: Record<string, number> = {};
    order.items.forEach((item) => {
      const avail = getAvailableReturnQty(item);
      updated[item.id] = allAvailableSelected ? 0 : avail;
    });
    setReturnQtys(updated);
  };

  // Adjust item return qty safely within available remaining bounds
  const handleSetQty = (id: string, qty: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, qty));
    setReturnQtys((prev) => ({
      ...prev,
      [id]: clamped,
    }));
  };

  // Selected items calculation
  const selectedItems = order.items
    .filter((item) => (returnQtys[item.id] || 0) > 0)
    .map((item) => {
      const qty = returnQtys[item.id] || 0;
      return {
        id: item.id,
        name: item.name,
        quantity: qty,
        unitPrice: item.unitPrice,
        amount: Number((item.unitPrice * qty).toFixed(2)),
        gstRate: item.gstRate,
        taxableAmount: item.taxableAmount,
        cgst: item.cgst,
        sgst: item.sgst,
      };
    });

  const totalReturnUnits = Object.values(returnQtys).reduce((sum, q) => sum + q, 0);
  const refundSubtotal = selectedItems.reduce((sum, it) => sum + it.amount, 0);

  // Prorate discount if the original order included a discount
  const discountRatio =
    order.subtotal > 0 && order.discount > 0 ? order.discount / order.subtotal : 0;
  const proratedDiscount = Number((refundSubtotal * discountRatio).toFixed(2));
  const effectiveRefundSubtotal = Math.max(0, refundSubtotal - proratedDiscount);

  // Prorate tax accurately from item snapshot or order tax rate
  const taxSnapshot = calculateOrderTaxFromSnapshot(selectedItems);
  const refundTax =
    taxSnapshot.totalTax > 0
      ? Number((taxSnapshot.totalTax * (1 - discountRatio)).toFixed(2))
      : order.subtotal > 0 && order.taxRate > 0
      ? Number(((effectiveRefundSubtotal * order.taxRate) / 100).toFixed(2))
      : 0;

  // Total refund amount strictly cannot exceed remaining unrefunded order balance
  const remainingOrderBalance = Math.max(0, order.total - (order.refundAmount || 0));
  const rawRefundAmount = Number((effectiveRefundSubtotal + refundTax).toFixed(2));
  const totalRefundAmount = Math.min(remainingOrderBalance, rawRefundAmount);

  const handleProcessRefund = () => {
    if (selectedItems.length === 0 || totalRefundAmount <= 0) return;

    const result: RefundResult = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      refundedItems: selectedItems.map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.amount,
      })),
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
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Select Items to Return
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {totalAvailableUnits > 0
                    ? `${totalAvailableUnits} unreturned units available across this bill`
                    : 'All items in this bill have already been refunded'}
                </p>
              </div>
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={handleSelectAll}
                disabled={totalAvailableUnits === 0}
                className="text-xs font-bold text-primary p-0 h-auto"
              >
                {order.items.every((item) => {
                  const avail = getAvailableReturnQty(item);
                  return avail === 0 || (returnQtys[item.id] || 0) === avail;
                })
                  ? 'Deselect All'
                  : 'Return All Available'}
              </Button>
            </div>

            {/* Line Items List with Stepper */}
            <div className="space-y-2 border border-border rounded-xl p-2 bg-muted/20 max-h-56 overflow-y-auto">
              {order.items.map((item) => {
                const alreadyRefunded = getAlreadyRefundedQty(item.id, item.name);
                const availableQty = getAvailableReturnQty(item);
                const currentReturnQty = returnQtys[item.id] || 0;
                const isSelected = currentReturnQty > 0;
                const isFullyReturned = availableQty === 0;

                return (
                  <Card
                    key={item.id}
                    className={`transition-all ${
                      isSelected
                        ? 'border-primary/40 bg-primary/5 shadow-2xs'
                        : isFullyReturned
                        ? 'border-border/60 bg-muted/30 opacity-70'
                        : 'border-border bg-card shadow-none'
                    }`}
                  >
                    <CardContent className="p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-xs font-bold truncate ${isFullyReturned ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {item.name}
                          </p>
                          {isFullyReturned && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 text-destructive border-destructive/30">
                              Already Returned ({alreadyRefunded})
                            </Badge>
                          )}
                          {!isFullyReturned && alreadyRefunded > 0 && (
                            <Badge variant="secondary" className="text-[9px] py-0 px-1 text-amber-700 dark:text-amber-400">
                              {alreadyRefunded} prev. returned
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {currencySymbol}{item.unitPrice.toFixed(2)} each • Available: <span className="font-semibold text-foreground">{availableQty}</span> of {item.quantity}
                        </p>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => handleSetQty(item.id, currentReturnQty - 1, availableQty)}
                          disabled={currentReturnQty <= 0 || isFullyReturned}
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
                          onClick={() => handleSetQty(item.id, currentReturnQty + 1, availableQty)}
                          disabled={currentReturnQty >= availableQty || isFullyReturned}
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
                {proratedDiscount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Prorated Discount:</span>
                    <span className="font-bold tabular-nums">
                      -{currencySymbol}{proratedDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
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
