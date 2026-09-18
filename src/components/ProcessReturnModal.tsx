import React, { useState, useEffect } from 'react';
import {
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
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
  creditNoteNumber: string;
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

    const cnNumber = `CN-${Date.now().toString().slice(-6)}`;
    const result: RefundResult = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      creditNoteNumber: cnNumber,
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
        <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">${lastRefund.creditNoteNumber}</div>
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

    printThermalHtml(slipHtml, `Credit-Note-${lastRefund.creditNoteNumber}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base font-semibold">Process Return / Refund</DialogTitle>
            <Badge variant="secondary">Bill #{order.orderNumber}</Badge>
          </div>
          <DialogDescription>
            {order.customerName || 'Walk-in Customer'} • Original Total: {currencySymbol}{order.total.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        {/* Modal Body */}
        {isSuccess && lastRefund ? (
          /* Success & Credit Note Screen */
          <div className="p-6 flex flex-col items-center text-center space-y-4 overflow-y-auto">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <CheckCircle2 className="size-6" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground">
                Refund Processed Successfully
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Credit note issued for Bill #{order.orderNumber}.{' '}
                {lastRefund.restockInventory ? 'Items restocked in catalog.' : ''}
              </p>
            </div>

            {/* Credit Note Summary Card */}
            <Card size="sm" className="w-full text-left">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  <span className="text-muted-foreground uppercase tracking-wider">Credit Note Voucher</span>
                  <Badge variant="outline" className="font-mono">{lastRefund.creditNoteNumber}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs pt-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Refund Method:</span>
                  <span className="font-semibold text-foreground">{lastRefund.refundMethod}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Items Returned:</span>
                  <span className="font-semibold text-foreground">{lastRefund.refundedItems.length} items</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Reason:</span>
                  <span className="font-medium text-foreground">{lastRefund.refundReason}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between items-baseline pt-0.5 text-sm font-semibold text-foreground">
                  <span>Total Refunded:</span>
                  <span className="text-base font-bold text-primary tabular-nums">
                    {currencySymbol}{lastRefund.refundAmount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="w-full flex flex-row items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={handlePrintCreditNote}
                variant="outline"
                size="sm"
                className="gap-1.5 flex-1"
              >
                <Printer className="size-3.5" />
                <span>Print Credit Note</span>
              </Button>
              <Button
                type="button"
                onClick={onClose}
                variant="default"
                size="sm"
                className="flex-1"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : totalAvailableUnits === 0 ? (
          /* Empty State: All Items Already Refunded */
          <div className="p-8 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 overflow-y-auto">
            <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <CheckCircle2 className="size-7 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground">
                All Items Fully Refunded
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bill #{order.orderNumber} has no remaining refundable items. All {order.items.reduce((sum, it) => sum + it.quantity, 0)} units purchased on this invoice have already been returned.
              </p>
            </div>

            {order.refundHistory && order.refundHistory.length > 0 && (
              <Card size="sm" className="w-full text-left bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold">Previous Refund Records</CardTitle>
                  <CardDescription className="text-xs">
                    {order.refundHistory.length} credit note{order.refundHistory.length === 1 ? '' : 's'} recorded
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-0 text-xs">
                  {order.refundHistory.map((rec) => (
                    <div key={rec.creditNoteNumber} className="flex justify-between items-center text-muted-foreground">
                      <span className="font-mono text-foreground font-semibold">{rec.creditNoteNumber}</span>
                      <span className="font-bold text-foreground tabular-nums">{currencySymbol}{rec.refundAmount.toFixed(2)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <DialogFooter className="w-full flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Close Window
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Active Return Selection Form */
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Action Bar: Select All / None */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Select Items to Return
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {totalAvailableUnits > 0
                      ? `${totalAvailableUnits} unreturned units available across this bill`
                      : 'All items in this bill have already been refunded'}
                  </p>
                </div>
                {totalAvailableUnits > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleSelectAll}
                    className="text-xs font-medium"
                  >
                    {order.items.every((item) => {
                      const avail = getAvailableReturnQty(item);
                      return avail === 0 || (returnQtys[item.id] || 0) === avail;
                    })
                      ? 'Deselect All'
                      : 'Return All Available'}
                  </Button>
                )}
              </div>

              {/* Line Items Table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[45%] text-xs font-semibold">Item</TableHead>
                      <TableHead className="text-center text-xs font-semibold">Unit Price</TableHead>
                      <TableHead className="text-center text-xs font-semibold">Return Qty</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Refund Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => {
                      const alreadyRefunded = getAlreadyRefundedQty(item.id, item.name);
                      const availableQty = getAvailableReturnQty(item);
                      const currentReturnQty = returnQtys[item.id] || 0;
                      const isSelected = currentReturnQty > 0;
                      const isFullyReturned = availableQty === 0;

                      return (
                        <TableRow
                          key={item.id}
                          className={isSelected ? 'bg-muted/30' : undefined}
                        >
                          <TableCell className="py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`font-medium text-xs ${
                                  isFullyReturned ? 'line-through text-muted-foreground' : 'text-foreground'
                                }`}
                              >
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                                <span>
                                  Available: <strong className="text-foreground">{availableQty}</strong> of {item.quantity}
                                </span>
                                {alreadyRefunded > 0 && (
                                  <Badge
                                    variant={isFullyReturned ? 'destructive' : 'secondary'}
                                    className="text-[10px] px-1.5 py-0 h-4"
                                  >
                                    {alreadyRefunded} refunded
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs tabular-nums py-2.5 text-muted-foreground">
                            {currencySymbol}{item.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                onClick={() =>
                                  handleSetQty(item.id, currentReturnQty - 1, availableQty)
                                }
                                disabled={currentReturnQty <= 0 || isFullyReturned}
                                className="size-7"
                              >
                                -
                              </Button>
                              <span className="w-6 text-center text-xs font-semibold tabular-nums text-foreground">
                                {currentReturnQty}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                onClick={() =>
                                  handleSetQty(item.id, currentReturnQty + 1, availableQty)
                                }
                                disabled={currentReturnQty >= availableQty || isFullyReturned}
                                className="size-7"
                              >
                                +
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold tabular-nums py-2.5">
                            {currencySymbol}{(item.unitPrice * currentReturnQty).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Return Settings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Refund Method */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Refund Method
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      type="button"
                      variant={refundMethod === 'CASH' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRefundMethod('CASH')}
                      className="text-xs gap-1.5"
                    >
                      <Wallet className="size-3.5" />
                      <span>Cash</span>
                    </Button>
                    <Button
                      type="button"
                      variant={refundMethod === 'KHATA' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRefundMethod('KHATA')}
                      className="text-xs gap-1.5"
                    >
                      <CreditCard className="size-3.5" />
                      <span>Khata</span>
                    </Button>
                    <Button
                      type="button"
                      variant={refundMethod === 'ONLINE' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRefundMethod('ONLINE')}
                      className="text-xs gap-1.5"
                    >
                      <Building className="size-3.5" />
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
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Customer Return (Defective/Damaged)">
                        Defective / Damaged
                      </SelectItem>
                      <SelectItem value="Customer Return (Wrong Product)">
                        Wrong Product Given
                      </SelectItem>
                      <SelectItem value="Customer Changed Mind">
                        Customer Changed Mind
                      </SelectItem>
                      <SelectItem value="Expired / Quality Issue">
                        Expired / Quality Issue
                      </SelectItem>
                      <SelectItem value="Billing Error / Duplicate">
                        Billing Error / Duplicate
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Restock Checkbox */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-muted/20">
                <Checkbox
                  id="restock-inventory"
                  checked={restockInventory}
                  onCheckedChange={(checked) => setRestockInventory(Boolean(checked))}
                />
                <Label htmlFor="restock-inventory" className="text-xs font-medium cursor-pointer">
                  Restock returned items back to product inventory
                </Label>
              </div>

              {/* Refund Totals Summary */}
              <Card size="sm">
                <CardContent className="space-y-1.5 text-xs">
                  {totalReturnUnits === 0 ? (
                    <div className="py-2 text-center text-muted-foreground">
                      Use the <strong className="text-foreground font-semibold">+</strong> button on items above to choose quantities to return.
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Items Selected for Return:</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {totalReturnUnits} units ({selectedItems.length} items)
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Refund Subtotal:</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {currencySymbol}{refundSubtotal.toFixed(2)}
                        </span>
                      </div>
                      {proratedDiscount > 0 && (
                        <div className="flex justify-between text-destructive">
                          <span>Prorated Discount:</span>
                          <span className="font-semibold tabular-nums">
                            -{currencySymbol}{proratedDiscount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {refundTax > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Prorated GST Adjustment:</span>
                          <span className="font-semibold text-foreground tabular-nums">
                            +{currencySymbol}{refundTax.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <Separator className="my-1" />
                      <div className="flex justify-between items-baseline pt-0.5 text-sm font-semibold text-foreground">
                        <span>Total Refund Amount:</span>
                        <span className="text-base sm:text-lg font-bold text-primary tabular-nums">
                          {currencySymbol}{totalRefundAmount.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <DialogFooter className="p-4 border-t border-border flex flex-row items-center justify-between sm:justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleProcessRefund}
                disabled={totalRefundAmount <= 0}
                className="gap-1.5"
              >
                {totalRefundAmount <= 0 ? (
                  <span>Select Items to Refund</span>
                ) : (
                  <>
                    <span>Issue Refund ({currencySymbol}{totalRefundAmount.toFixed(2)})</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
