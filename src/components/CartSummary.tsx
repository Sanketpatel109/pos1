import React from 'react';
import { Trash2, PauseCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CartSummaryProps {
  totalItemCount: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currencySymbol?: string;
  onClearBill?: () => void;
  onHoldBill?: () => void;
  onPrintBill?: () => void;
  onPay: () => void;
  heldOrdersCount?: number;
  onOpenHeldOrders?: () => void;
  disabled?: boolean;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  totalItemCount,
  subtotal,
  taxRate,
  taxAmount,
  total,
  currencySymbol = '₹',
  onClearBill,
  onHoldBill,
  onPrintBill,
  onPay,
  heldOrdersCount = 0,
  onOpenHeldOrders,
  disabled = false,
}) => {
  return (
    <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 bg-card border-t border-border shrink-0 z-20 shadow-xs select-none">
      {/* Subtotals & GST Breakdown */}
      <div className="mb-2 text-xs text-muted-foreground">
        {/* Mobile View (<640px) */}
        <div className="flex sm:hidden items-center justify-between">
          <span>Items ({totalItemCount})</span>
          <span className="tabular-nums tracking-tight font-medium text-foreground">
            Subtotal: {currencySymbol}{subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex sm:hidden items-center justify-between mt-0.5 text-xs text-muted-foreground">
          <span>GST ({taxRate}%)</span>
          <span className="tabular-nums tracking-tight font-medium">
            +{currencySymbol}{taxAmount.toFixed(2)}
          </span>
        </div>

        {/* Tablet & Desktop View (>=640px) */}
        <div className="hidden sm:block space-y-1">
          <div className="flex justify-between items-center">
            <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
            <span className="tabular-nums tracking-tight font-medium text-foreground">
              {currencySymbol}{subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>GST Tax</span>
            <span className="tabular-nums tracking-tight font-medium">
              +{currencySymbol}{taxAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Cart Total Display */}
      <div className="flex justify-between items-baseline mb-3 pt-2 border-t border-border">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Total
        </span>
        <span
          id="cart-summary-total"
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums font-medium"
        >
          {currencySymbol}{total.toFixed(2)}
        </span>
      </div>

      {/* Action CTA Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Clear Bill Button */}
        {onClearBill && (
          <Button
            type="button"
            id="btn-cart-clear"
            variant="outline"
            size="icon-lg"
            onClick={onClearBill}
            disabled={disabled || totalItemCount === 0}
            title="Clear ticket items"
            className="w-11 h-11 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
          </Button>
        )}

        {/* Hold / Recall Bill Button */}
        {(onHoldBill || onOpenHeldOrders) && (
          <Button
            type="button"
            id="btn-cart-hold"
            variant="outline"
            size="icon-lg"
            onClick={() => {
              if (totalItemCount > 0 && onHoldBill) {
                onHoldBill();
              } else if (heldOrdersCount > 0 && onOpenHeldOrders) {
                onOpenHeldOrders();
              }
            }}
            disabled={totalItemCount === 0 && heldOrdersCount === 0}
            title={
              totalItemCount > 0
                ? 'Hold / Park Bill for next customer'
                : heldOrdersCount > 0
                ? `Recall ${heldOrdersCount} parked bill(s)`
                : 'Add items to hold bill'
            }
            className="w-11 h-11 shrink-0 relative"
          >
            <PauseCircle className="size-4" />
            {heldOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground font-semibold text-[9px] size-4 rounded-full flex items-center justify-center shadow-xs tabular-nums tracking-tight">
                {heldOrdersCount}
              </span>
            )}
          </Button>
        )}

        {/* Print Bill Button - Hardware / Execution */}
        {onPrintBill && (
          <Button
            type="button"
            id="btn-cart-print"
            variant="outline"
            onClick={onPrintBill}
            disabled={disabled || totalItemCount === 0}
            className="flex-1 h-11 text-xs font-medium gap-1.5"
          >
            <Printer className="size-4" />
            <span>Print</span>
          </Button>
        )}

        {/* Primary Pay Action CTA Button - Primary Counter Action */}
        <Button
          type="button"
          id="btn-cart-pay"
          variant="default"
          onClick={onPay}
          disabled={disabled || totalItemCount === 0}
          className="flex-[1.6] h-11 text-xs sm:text-sm font-semibold tracking-wide"
        >
          <span className="tabular-nums tracking-tight font-medium">
            Pay {currencySymbol}{total.toFixed(2)} →
          </span>
        </Button>
      </div>
    </div>
  );
};
