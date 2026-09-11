import React from 'react';
import { Trash2, PauseCircle, Printer } from '../icons/faIcons';

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
    <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 bg-white border-t border-zinc-200/80 shrink-0 z-20 shadow-xs select-none">
      {/* Subtotals & GST Breakdown */}
      {/* Mobile: single-line compact breakdown ("Subtotal: ₹... · Incl. ₹... GST") */}
      {/* Tablet & Desktop: full expanded breakdown */}
      <div className="mb-2 text-xs text-zinc-500">
        {/* Mobile View (<640px) */}
        <div className="flex sm:hidden justify-between items-center text-[11px] leading-tight">
          <span>
            Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})
            {taxAmount > 0 && (
              <span className="text-zinc-400 ml-1">· Incl. {currencySymbol}{taxAmount.toFixed(2)} GST</span>
            )}
          </span>
          <span className="font-medium text-zinc-900 tabular-nums tracking-tight">
            {currencySymbol}{subtotal.toFixed(2)}
          </span>
        </div>

        {/* Tablet & Desktop View (>=640px) */}
        <div className="hidden sm:flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
            <span className="font-medium text-zinc-900 tabular-nums tracking-tight">
              {currencySymbol}{subtotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="tabular-nums tracking-tight">GST {taxRate}%</span>
            <span className="font-medium text-zinc-900 tabular-nums tracking-tight">
              +{currencySymbol}{taxAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Grand Total Header - Clean TOTAL with Tabular Numerics */}
      <div className="flex justify-between items-baseline mb-2.5 sm:mb-3 border-t border-zinc-200/80 pt-1.5 sm:pt-2">
        <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
          TOTAL
        </span>
        <span className="text-xl sm:text-2xl md:text-3xl text-zinc-900 font-bold leading-none tabular-nums tracking-tight">
          {currencySymbol}{total.toFixed(2)}
        </span>
      </div>

      {/* Action Buttons Row - Design System Button Hierarchy */}
      <div className="flex items-center gap-2">
        {/* Delete / Clear Button - Destructive */}
        {onClearBill && (
          <button
            type="button"
            id="btn-cart-clear"
            onClick={onClearBill}
            disabled={disabled || totalItemCount === 0}
            title="Clear active bill"
            className="flex items-center justify-center bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95 w-11 h-11 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs font-medium"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Pause / Hold Button - Secondary */}
        {(onHoldBill || onOpenHeldOrders) && (
          <button
            type="button"
            id="btn-cart-hold"
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
            className={`flex items-center justify-center rounded-xl transition-all active:scale-95 w-11 h-11 shrink-0 cursor-pointer font-medium relative ${
              totalItemCount === 0 && heldOrdersCount > 0
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 shadow-xs'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <PauseCircle className="w-4 h-4" />
            {heldOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs tabular-nums tracking-tight">
                {heldOrdersCount}
              </span>
            )}
          </button>
        )}

        {/* Print Bill Button - Hardware / Execution */}
        {onPrintBill && (
          <button
            type="button"
            id="btn-cart-print"
            onClick={onPrintBill}
            disabled={disabled || totalItemCount === 0}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-4 font-medium transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs text-xs tracking-wide"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        )}

        {/* Primary Pay Action CTA Button - Primary Counter Action */}
        <button
          type="button"
          id="btn-cart-pay"
          onClick={onPay}
          disabled={disabled || totalItemCount === 0}
          className="flex-[1.6] flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-5 font-medium transition-all active:scale-[0.98] shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm tracking-wide"
        >
          <span className="tabular-nums tracking-tight font-medium">Pay {currencySymbol}{total.toFixed(2)} →</span>
        </button>
      </div>
    </div>
  );
};
