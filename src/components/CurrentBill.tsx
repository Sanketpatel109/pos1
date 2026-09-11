import React, { useRef, useEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X, Check } from '../icons/faIcons';
import { BillItem } from '../types';
import { CartSummary } from './CartSummary';
import { PaymentModal } from './checkout/PaymentModal';

export interface CurrentBillProps {
  orderNumber: number;
  terminalPrefix?: string;
  items: BillItem[];
  currencySymbol?: string;
  taxRate?: number;
  heldOrdersCount?: number;
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateItemRate?: (id: string, newRate: number) => void;
  canOverridePrice?: boolean;
  onRequestPriceOverrideAuth?: (item: BillItem, onApproved: () => void) => void;
  onRemoveItem: (id: string) => void;
  onClearBill: () => void;
  onHoldOrder: () => void;
  onPrintBill: () => void;
  onPay?: () => void;
  onCompleteSale?: (details: {
    billNo: number;
    paymentMethod: 'CASH' | 'UPI' | 'KHATA';
    tenderedAmount: number;
    changeDue: number;
    items: BillItem[];
    subtotal: number;
    taxAmount: number;
    total: number;
  }) => void;
  onResetAndNewBill?: () => void;
  onOpenHeldOrders?: () => void;
  onCloseMobile?: () => void;
}

export const CurrentBill: React.FC<CurrentBillProps> = ({
  orderNumber,
  terminalPrefix,
  items,
  currencySymbol = '₹',
  taxRate = 5,
  heldOrdersCount = 0,
  onUpdateQuantity,
  onUpdateItemRate,
  canOverridePrice = true,
  onRequestPriceOverrideAuth,
  onRemoveItem,
  onClearBill,
  onHoldOrder,
  onPrintBill,
  onPay,
  onCompleteSale,
  onResetAndNewBill,
  onOpenHeldOrders,
  onCloseMobile,
}) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState<string>('');

  const handleInitiatePriceOverride = (item: BillItem) => {
    if (canOverridePrice) {
      setEditingItemId(item.id);
      setEditPriceVal(item.unitPrice.toString());
    } else if (onRequestPriceOverrideAuth) {
      onRequestPriceOverrideAuth(item, () => {
        setEditingItemId(item.id);
        setEditPriceVal(item.unitPrice.toString());
      });
    }
  };

  const handleSaveNewRate = (itemId: string) => {
    const num = parseFloat(editPriceVal);
    if (!isNaN(num) && num >= 0 && onUpdateItemRate) {
      onUpdateItemRate(itemId, num);
    }
    setEditingItemId(null);
  };
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  const prevItemsLengthRef = useRef<number>(items.length);
  const activePrefix = (terminalPrefix || localStorage.getItem('terminal_prefix') || 'A').trim().toUpperCase() || 'A';
  const displayBillNumber = `#${activePrefix}-${String(orderNumber).padStart(3, '0')}`;

  // Auto-scroll so the last added item is always visible on mobile and desktop
  useEffect(() => {
    if (items.length > prevItemsLengthRef.current && itemsContainerRef.current) {
      itemsContainerRef.current.scrollTo({
        top: itemsContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    prevItemsLengthRef.current = items.length;
  }, [items.length]);

  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalDue = subtotal + taxAmount;

  return (
    <div className="flex flex-col bg-white border-t md:border-t-0 border-zinc-200/80 z-10 min-h-0 h-full overflow-hidden select-none">
      {/* 
        ========================================================================
        BILL HEADER: Fixed at top (stays completely still)
        India-First Terminology: "Current Bill" · "Bill #042"
        ========================================================================
      */}
      <div className="flex justify-between items-center px-3 py-2 sm:px-4 sm:py-2.5 border-b border-zinc-200/80 bg-white shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-900 shrink-0" />
          <h2 className="text-xs sm:text-sm text-zinc-900 font-semibold tracking-tight truncate">
            Current Bill
          </h2>
          <span className="bg-zinc-100 text-zinc-800 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium border border-zinc-200 shrink-0 tabular-nums tracking-tight">
            {totalItemCount}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Bill Number Badge (India-First: "Bill #042") */}
          <span className="bg-zinc-900 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-lg font-mono font-medium tracking-wide tabular-nums">
            Bill {displayBillNumber}
          </span>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              title="Close bill"
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 
        ========================================================================
        LINE ITEMS LIST:
        Mobile (<768px): Height h-[176px] sm:h-[184px] (comfortably shows at least 4 items before scrolling)
        Tablet/Desktop (>=768px): flex-1 md:h-auto overflow-y-auto
        ========================================================================
      */}
      <div
        ref={itemsContainerRef}
        className="h-[176px] sm:h-[184px] md:h-auto md:flex-1 min-h-[176px] overflow-y-auto overscroll-contain px-2.5 sm:px-4 divide-y divide-zinc-100 bg-white scrollbar-thin"
      >
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-2 text-zinc-400">
            <ShoppingBag className="w-5 h-5 mb-1 text-zinc-300 stroke-[1.5]" />
            <p className="text-xs font-semibold text-zinc-800">Bill is empty</p>
            <p className="text-[10px] text-zinc-500">Tap products to add items</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.id}
              id={`bill-item-${item.id}`}
              className={`grid grid-cols-[1fr_84px_68px_24px] items-center gap-1.5 py-1 sm:py-1.5 transition-colors ${
                idx === items.length - 1 ? 'bg-zinc-50/50' : ''
              }`}
            >
              {/* Column 1: Item Name (takes all remaining space, truncated) */}
              <div className="min-w-0 pr-1 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-sm font-medium text-zinc-900 truncate">
                    {item.name}
                  </h3>
                  {item.note && (
                    <span className="text-[9px] bg-zinc-100 text-zinc-600 px-1 py-0.2 rounded font-mono border border-zinc-200 shrink-0">
                      {item.note}
                    </span>
                  )}
                </div>
                {/* Unit price with Price Override trigger */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {editingItemId === item.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveNewRate(item.id);
                      }}
                      className="flex items-center gap-1"
                    >
                      <span className="text-[11px] font-mono text-zinc-400">{currencySymbol}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        autoFocus
                        value={editPriceVal}
                        onChange={(e) => setEditPriceVal(e.target.value)}
                        onBlur={() => handleSaveNewRate(item.id)}
                        className="w-16 h-5 px-1 bg-zinc-50 border border-blue-600 rounded text-[11px] font-bold text-zinc-900 outline-hidden tabular-nums tracking-tight"
                      />
                      <button
                        type="submit"
                        title="Save price"
                        className="h-5 px-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold cursor-pointer shadow-xs flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingItemId(null)}
                        title="Cancel"
                        className="h-5 px-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-[9px] cursor-pointer flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInitiatePriceOverride(item)}
                      className="text-[11px] text-zinc-500 hover:text-blue-600 font-mono truncate text-left group flex items-center gap-1 cursor-pointer tabular-nums tracking-tight"
                      title={canOverridePrice ? "Tap to edit price" : "Tap to override price (Manager PIN required)"}
                    >
                      <span>{currencySymbol}{item.unitPrice.toFixed(2)} / ea</span>
                      <span className="text-[9px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity underline">
                        edit
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Column 2: Quantity Stepper (Fixed width: exactly w-[84px] h-7) */}
              <div className="w-[84px] h-7 flex items-center justify-between bg-zinc-100 rounded-lg px-1 shadow-2xs">
                <button
                  type="button"
                  id={`btn-decrement-${item.id}`}
                  onClick={() => {
                    if (item.quantity <= 1) {
                      onRemoveItem(item.id);
                    } else {
                      onUpdateQuantity(item.id, -1);
                    }
                  }}
                  aria-label={`Decrease quantity of ${item.name}`}
                  className="h-5 w-5 flex items-center justify-center text-zinc-700 font-bold active:bg-zinc-200 rounded transition-colors cursor-pointer"
                >
                  <Minus className="w-3 h-3 stroke-[2.5]" />
                </button>

                <span className="w-6 text-center text-xs font-semibold text-zinc-900 tabular-nums tracking-tight">
                  {item.quantity}
                </span>

                <button
                  type="button"
                  id={`btn-increment-${item.id}`}
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  aria-label={`Increase quantity of ${item.name}`}
                  className="h-5 w-5 flex items-center justify-center text-zinc-700 font-bold active:bg-zinc-200 rounded transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>

              {/* Column 3: Total Price (Fixed width: exactly w-[68px]) */}
              <div className="w-[68px] text-right font-semibold text-zinc-900 tabular-nums tracking-tight text-sm">
                {currencySymbol}{(item.unitPrice * item.quantity).toFixed(2)}
              </div>

              {/* Column 4: Trash Button (Fixed width: w-6) */}
              <div className="w-6 flex items-center justify-end">
                <button
                  type="button"
                  id={`btn-remove-item-${item.id}`}
                  onClick={() => onRemoveItem(item.id)}
                  aria-label={`Remove ${item.name} from bill`}
                  title={`Remove ${item.name}`}
                  className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 
        ========================================================================
        SUMMARY & DIRECT PAYMENT CTA
        Subtotal, GST, Total, and blue "Pay ₹... →" (#2563EB) directly visible
        Mobile: Merged Subtotal + GST ("Incl. ₹... GST") + Prominent TOTAL
        Desktop: Full Subtotal row + GST row + TOTAL row
        ========================================================================
      */}
      <CartSummary
        totalItemCount={totalItemCount}
        subtotal={subtotal}
        taxRate={taxRate}
        taxAmount={taxAmount}
        total={totalDue}
        currencySymbol={currencySymbol}
        heldOrdersCount={heldOrdersCount}
        onClearBill={onClearBill}
        onHoldBill={onHoldOrder}
        onPrintBill={onPrintBill}
        onPay={() => {
          if (onPay) {
            onPay();
          } else {
            setIsPaymentModalOpen(true);
          }
        }}
        onOpenHeldOrders={onOpenHeldOrders}
        disabled={items.length === 0}
      />

      {/* Phase 2: Indian Payment Engine Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        orderNumber={orderNumber}
        terminalPrefix={activePrefix}
        items={items}
        subtotal={subtotal}
        taxRate={taxRate}
        currencySymbol={currencySymbol}
        onClose={() => setIsPaymentModalOpen(false)}
        onCompleteSale={(details) => {
          if (onCompleteSale) {
            onCompleteSale(details);
          }
        }}
        onResetAndNewBill={() => {
          setIsPaymentModalOpen(false);
          if (onResetAndNewBill) {
            onResetAndNewBill();
          } else {
            onClearBill();
          }
        }}
        onPrintAndNextCustomer={() => {
          setIsPaymentModalOpen(false);
          if (onPrintBill) onPrintBill();
          if (onResetAndNewBill) {
            onResetAndNewBill();
          } else {
            onClearBill();
          }
        }}
        onDoneNoPrint={() => {
          setIsPaymentModalOpen(false);
          if (onResetAndNewBill) {
            onResetAndNewBill();
          } else {
            onClearBill();
          }
        }}
        onPrintDirectReceipt={onPrintBill}
      />
    </div>
  );
};
