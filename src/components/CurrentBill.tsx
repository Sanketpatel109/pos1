import React, { useRef, useEffect, useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X, Check } from 'lucide-react';
import { BillItem } from '../types';
import { CartSummary } from './CartSummary';
import { PaymentModal } from './checkout/PaymentModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCart } from '../context/CartContext';

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
  onSwitchMode?: () => void;
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
  onSwitchMode,
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

  const { discount = 0, discountType = 'percentage', discountAmount = 0 } = useCart();
  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalDue = Math.max(0, subtotal - discountAmount) + taxAmount;


  return (
    <div className="flex flex-col bg-card border-t md:border-t-0 border-border z-10 min-h-0 h-full overflow-hidden select-none">
      {/* 
        ========================================================================
        BILL HEADER: Fixed at top (stays completely still)
        India-First Terminology: "Current Bill" · "Bill #042"
        ========================================================================
      */}
      <div className="flex justify-between items-center px-3 py-2 sm:px-4 sm:py-2.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <ShoppingBag className="w-4 h-4 text-foreground shrink-0" />
          <h2 className="text-sm text-foreground font-semibold tracking-tight truncate">
            Current Bill
          </h2>
          <Badge variant="secondary" className="text-xs px-2 py-0.5 tabular-nums">
            {totalItemCount}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Bill Number Badge (India-First: "Bill #042") */}
          <Badge variant="default" className="text-xs px-2 py-0.5 tabular-nums">
            Bill {displayBillNumber}
          </Badge>

          {onCloseMobile && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onCloseMobile}
              title="Close bill"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
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
        className="h-[176px] sm:h-[184px] md:h-auto md:flex-1 min-h-[176px] overflow-y-auto overscroll-contain px-2.5 sm:px-4 divide-y divide-border bg-card scrollbar-thin"
      >
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-2 text-muted-foreground">
            <ShoppingBag className="w-5 h-5 mb-1 text-muted-foreground/60 stroke-[1.5]" />
            <p className="text-xs font-semibold text-foreground">Bill is empty</p>
            <p className="text-xs text-muted-foreground">Tap products to add items</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.id}
              id={`bill-item-${item.id}`}
              className={`grid grid-cols-[1fr_84px_68px_24px] items-center gap-1.5 py-1 sm:py-1.5 transition-colors ${
                idx === items.length - 1 ? 'bg-muted/30' : ''
              }`}
            >
              {/* Column 1: Item Name (takes all remaining space, truncated) */}
              <div className="min-w-0 pr-1 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {item.name}
                  </h3>
                  {item.selectedPackName && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-semibold bg-primary/10 text-primary border-primary/20">
                      {item.selectedPackName}
                    </Badge>
                  )}
                  {item.stock !== undefined && item.stock <= 5 && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold shrink-0 border tabular-nums ${
                        item.stock <= 0
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {item.stock <= 0 ? '0 left' : `${item.stock} left`}
                    </span>
                  )}
                  {item.note && (
                    <Badge variant="outline" className="text-xs px-1 py-0 h-4 shrink-0">
                      {item.note}
                    </Badge>
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
                      <span className="text-xs text-muted-foreground">{currencySymbol}</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        autoFocus
                        value={editPriceVal}
                        onChange={(e) => setEditPriceVal(e.target.value)}
                        onBlur={() => handleSaveNewRate(item.id)}
                        className="w-16 h-6 px-1 text-xs font-bold text-foreground tabular-nums tracking-tight"
                      />
                      <Button
                        type="submit"
                        size="icon-xs"
                        variant="default"
                        title="Save price"
                        className="h-6 w-6"
                      >
                        <Check className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="secondary"
                        onClick={() => setEditingItemId(null)}
                        title="Cancel"
                        className="h-6 w-6"
                      >
                        <X className="size-3" />
                      </Button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInitiatePriceOverride(item)}
                      className="text-xs text-muted-foreground hover:text-primary truncate text-left group flex items-center gap-1 cursor-pointer tabular-nums tracking-tight font-medium"
                      title={canOverridePrice ? "Tap to edit price" : "Tap to override price (Manager PIN required)"}
                    >
                      <span>{currencySymbol}{item.unitPrice.toFixed(2)} / ea</span>
                      <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity underline">
                        edit
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Column 2: Quantity Stepper (Fixed width: exactly w-[84px] h-7) */}
              <div className="w-[84px] h-7 flex items-center justify-between bg-muted rounded-md px-1 shadow-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  id={`btn-decrement-${item.id}`}
                  onClick={() => {
                    if (item.quantity <= 1) {
                      onRemoveItem(item.id);
                    } else {
                      onUpdateQuantity(item.id, -1);
                    }
                  }}
                  aria-label={`Decrease quantity of ${item.name}`}
                  className="h-5 w-5 rounded p-0 text-foreground"
                >
                  <Minus className="size-3 stroke-[2.5]" />
                </Button>

                <span className="w-6 text-center text-xs font-semibold text-foreground tabular-nums tracking-tight font-medium">
                  {item.quantity}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  id={`btn-increment-${item.id}`}
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  aria-label={`Increase quantity of ${item.name}`}
                  className="h-5 w-5 rounded p-0 text-foreground"
                >
                  <Plus className="size-3 stroke-[2.5]" />
                </Button>
              </div>

              {/* Column 3: Total Price (Fixed width: exactly w-[68px]) */}
              <div className="w-[68px] text-right font-semibold text-foreground tabular-nums tracking-tight font-medium text-sm">
                {currencySymbol}{(item.unitPrice * item.quantity).toFixed(2)}
              </div>

              {/* Column 4: Trash Button (Fixed width: w-6) */}
              <div className="w-6 flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  id={`btn-remove-item-${item.id}`}
                  onClick={() => onRemoveItem(item.id)}
                  aria-label={`Remove ${item.name} from bill`}
                  title={`Remove ${item.name}`}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
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
        onSwitchMode={onSwitchMode}
        currentMode="item-wise"
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
        discount={discount}
        discountType={discountType}
        discountAmount={discountAmount}
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
