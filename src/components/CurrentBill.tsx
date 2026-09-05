import React from 'react';
import { Minus, Plus, Trash2, PauseCircle, Printer, ShoppingCart, ShoppingBag } from 'lucide-react';
import { BillItem } from '../types';

interface CurrentBillProps {
  orderNumber: number;
  items: BillItem[];
  currencySymbol: string;
  taxRate: number;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearBill: () => void;
  onHoldOrder: () => void;
  onPrintBill: () => void;
  onPay: () => void;
}

export const CurrentBill: React.FC<CurrentBillProps> = ({
  orderNumber,
  items,
  currencySymbol,
  taxRate,
  onUpdateQuantity,
  onRemoveItem,
  onClearBill,
  onHoldOrder,
  onPrintBill,
  onPay,
}) => {
  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalDue = subtotal + taxAmount;

  return (
    <div className="flex-1 flex flex-col bg-[#f4f4f5] border-t border-zinc-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 min-h-0">
      {/* Bill Header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-zinc-300/70 bg-[#f4f4f5] shrink-0">
        <h2 className="text-sm md:text-base text-zinc-900 font-bold tracking-tight">Current Bill</h2>
        <span className="bg-zinc-900 text-zinc-100 text-[11px] px-2 py-0.5 rounded font-mono font-bold tracking-wide">
          Order #{String(orderNumber).padStart(3, '0')}
        </span>
      </div>

      {/* Bill Items List */}
      <div className="flex-1 overflow-y-auto px-3 py-1.5 space-y-0.5 divide-y divide-zinc-200/80">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6 text-zinc-400">
            <ShoppingBag className="w-8 h-8 mb-1.5 stroke-1 text-zinc-300" />
            <p className="text-xs font-medium text-zinc-600">Bill is empty</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Tap catalog items below or add a custom item</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-1.5 gap-2">
              <div className="flex flex-col flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs md:text-sm font-semibold text-zinc-900 truncate">
                    {item.name}
                  </h3>
                  {item.note && (
                    <span className="text-[9px] bg-zinc-200 text-zinc-700 px-1 py-0.2 rounded font-mono">
                      {item.note}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  {currencySymbol}{item.unitPrice.toFixed(2)} / ea
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* Stepper */}
                <div className="flex items-center bg-zinc-200/90 rounded-md border border-zinc-300 p-0.5 shadow-2xs">
                  <button
                    id={`btn-decrement-${item.id}`}
                    onClick={() => {
                      if (item.quantity <= 1) {
                        onRemoveItem(item.id);
                      } else {
                        onUpdateQuantity(item.id, -1);
                      }
                    }}
                    aria-label={`Decrease quantity of ${item.name}`}
                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-800 hover:bg-zinc-300/80 active:bg-zinc-400 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3 stroke-[2.5]" />
                  </button>

                  <span className="text-xs text-zinc-900 w-5 text-center font-bold font-mono">
                    {item.quantity}
                  </span>

                  <button
                    id={`btn-increment-${item.id}`}
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    aria-label={`Increase quantity of ${item.name}`}
                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-800 hover:bg-zinc-300/80 active:bg-zinc-400 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>

                {/* Line Total */}
                <span className="font-bold text-xs md:text-sm text-zinc-900 min-w-[3.5rem] text-right font-mono">
                  {currencySymbol}{(item.unitPrice * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Total and Actions Section */}
      <div className="px-3 py-2.5 bg-white border-t border-zinc-200 shrink-0 z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.03)]">
        {/* Subtotals & Tax Breakdown */}
        <div className="flex flex-col gap-0.5 mb-2 text-[11px] text-zinc-600">
          <div className="flex justify-between items-center">
            <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
            <span className="font-mono font-medium">{currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Tax ({taxRate}%)</span>
            <span className="font-mono font-medium">{currencySymbol}{taxAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Grand Total */}
        <div className="flex justify-between items-end mb-2.5 border-t border-zinc-200 pt-1.5">
          <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-wider">
            Total Due
          </span>
          <span className="text-xl md:text-2xl text-zinc-900 font-extrabold leading-none tracking-tight font-mono">
            {currencySymbol}{totalDue.toFixed(2)}
          </span>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 shrink-0">
            {/* Delete / Clear */}
            <button
              id="btn-clear-bill"
              onClick={onClearBill}
              disabled={items.length === 0}
              title="Clear current bill"
              className="flex items-center justify-center bg-zinc-200 text-zinc-800 rounded-lg hover:bg-red-100 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 w-9 h-9 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Hold / Pause */}
            <button
              id="btn-hold-order"
              onClick={onHoldOrder}
              disabled={items.length === 0}
              title="Hold this order to serve another customer"
              className="flex items-center justify-center bg-zinc-200 text-zinc-800 rounded-lg hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 w-9 h-9 cursor-pointer"
            >
              <PauseCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-1 gap-1.5">
            {/* Print Bill */}
            <button
              id="btn-print-bill"
              onClick={onPrintBill}
              disabled={items.length === 0}
              className="flex-1 flex flex-row items-center justify-center gap-1 bg-zinc-200 text-zinc-800 rounded-lg hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 h-9 cursor-pointer font-bold text-[11px] uppercase tracking-wide"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Pay Button */}
            <button
              id="btn-pay-bill"
              onClick={onPay}
              disabled={items.length === 0}
              className="flex-1 flex flex-row items-center justify-center gap-1.5 bg-zinc-900 text-white rounded-lg hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-2xs h-9 cursor-pointer font-bold text-[11px] uppercase tracking-wide"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Pay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
