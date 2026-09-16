import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Delete,
  Printer,
  Plus,
  Minus,
  Trash2,
  Receipt,
  PauseCircle,
  ShoppingBag,
} from 'lucide-react';
import { BillItem } from '../types';
import { useCart } from '../context/CartContext';
import { CartSummary } from './CartSummary';

export interface QuickBillPOSProps {
  currencySymbol?: string;
  taxRate?: number;
  terminalPrefix?: string;
  orderNumber?: number;
  billNo?: number;
  heldOrdersCount?: number;
  onHoldBill?: (items: BillItem[]) => void;
  onClearBill?: () => void;
  onOpenHeldOrders?: () => void;
  onSaveQuickBill: (items: BillItem[]) => void;
  onPrintQuickBill: (items: BillItem[]) => void;
  onSwitchMode?: () => void;
}

export const QuickBillPOS: React.FC<QuickBillPOSProps> = ({
  currencySymbol = '₹',
  taxRate = 0,
  terminalPrefix,
  orderNumber,
  billNo,
  heldOrdersCount = 0,
  onHoldBill,
  onClearBill,
  onOpenHeldOrders,
  onSaveQuickBill,
  onPrintQuickBill,
  onSwitchMode,
}) => {
  const {
    currentBillItems: items,
    addItem,
    updateQty,
    removeItem,
    clearCart,
  } = useCart();
  const [currentInput, setCurrentInput] = useState<string>('0');
  const [qty, setQty] = useState<number>(1);
  const [activeField, setActiveField] = useState<'amount' | 'qty'>('amount');
  const [itemLabel, setItemLabel] = useState<string>('');

  const itemsContainerRef = useRef<HTMLDivElement>(null);
  const prevItemsLengthRef = useRef<number>(items.length);

  // Auto-scroll so items list moves up and the last added item is always visible (same as itemwise bill)
  useEffect(() => {
    if (items.length > prevItemsLengthRef.current && itemsContainerRef.current) {
      itemsContainerRef.current.scrollTo({
        top: itemsContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      const timeoutId = setTimeout(() => {
        if (itemsContainerRef.current) {
          itemsContainerRef.current.scrollTop = itemsContainerRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    prevItemsLengthRef.current = items.length;
  }, [items.length]);

  const activePrefix = (terminalPrefix || localStorage.getItem('terminal_prefix') || 'A').trim().toUpperCase() || 'A';
  const rawBillNum =
    billNo !== undefined
      ? billNo
      : orderNumber !== undefined
      ? orderNumber
      : 42;
  const displayBillNo = `${activePrefix}-${String(rawBillNum).padStart(3, '0')}`;

  // Handle digit input for active field (Amount vs Qty)
  const handleDigitPress = (val: string) => {
    if (activeField === 'amount') {
      setCurrentInput((prev) => {
        if (prev === '0') return val === '.' ? '0.' : val;
        if (val === '.' && prev.includes('.')) return prev;
        return prev + val;
      });
    } else {
      if (val === '.') return; // Qty cannot have decimal
      setQty((prev) => {
        if (prev === 1 && val !== '0') return parseInt(val, 10);
        const newQty = parseInt(`${prev}${val}`, 10);
        return isNaN(newQty) ? 1 : Math.min(newQty, 999);
      });
    }
  };

  // Backspace logic
  const handleBackspace = () => {
    if (activeField === 'amount') {
      setCurrentInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else {
      setQty((prev) => {
        const str = String(prev);
        if (str.length <= 1) return 1;
        return parseInt(str.slice(0, -1), 10) || 1;
      });
    }
  };

  // Clear all current inputs
  const handleClear = () => {
    setCurrentInput('0');
    setQty(1);
    setItemLabel('');
    setActiveField('amount');
  };

  // Toggle or switch between Qty multiplier mode and Amount mode
  const handleQtyToggle = () => {
    const currentVal = parseFloat(currentInput);
    if (
      activeField === 'amount' &&
      currentVal > 0 &&
      currentVal <= 999 &&
      !currentInput.includes('.')
    ) {
      // Ergonomic Kirana shortcut: user types "3", then taps "× Qty" -> qty becomes 3, resets amount to 0
      setQty(currentVal);
      setCurrentInput('0');
      setActiveField('amount');
    } else {
      setActiveField((prev) => (prev === 'amount' ? 'qty' : 'amount'));
    }
  };

  // Presets fast-add (e.g. +10, +20, +50, +100, +200, +500)
  const handleAddPreset = (val: number) => {
    setActiveField('amount');
    setCurrentInput((prev) => {
      const current = parseFloat(prev) || 0;
      return String(current + val);
    });
  };

  // Add Item to stack
  const handleAddCustomAmount = useCallback(() => {
    const amount = parseFloat(currentInput);
    if (isNaN(amount) || amount <= 0) return;

    const finalQty = Math.max(1, qty);
    const newItem: BillItem = {
      id: `qb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name:
        itemLabel.trim() || `Item #${items.length + 1}`,
      unitPrice: amount,
      quantity: finalQty,
    };

    addItem(newItem);
    setCurrentInput('0');
    setQty(1);
    setItemLabel('');
    setActiveField('amount');
  }, [currentInput, qty, itemLabel, items.length, addItem]);

  // Stepper quantity update
  const handleUpdateQuantity = (id: string, delta: number) => {
    updateQty(id, delta);
  };

  // Remove individual line item
  const handleRemoveItem = (id: string) => {
    removeItem(id);
  };

  // Whole cart clear
  const handleClearAll = () => {
    clearCart();
    setCurrentInput('0');
    setQty(1);
    setItemLabel('');
    setActiveField('amount');
    if (onClearBill) {
      onClearBill();
    }
  };

  // Hold bill
  const handleHold = () => {
    if (items.length > 0) {
      if (onHoldBill) {
        onHoldBill(items);
      }
      clearCart();
      setCurrentInput('0');
      setQty(1);
      setItemLabel('');
      setActiveField('amount');
    } else if (heldOrdersCount > 0 && onOpenHeldOrders) {
      onOpenHeldOrders();
    }
  };

  // Physical keyboard support for rapid cashier entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddCustomAmount();
        }
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDigitPress('.');
      } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handleQtyToggle();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter' || e.key === '+') {
        e.preventDefault();
        handleAddCustomAmount();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddCustomAmount, activeField, currentInput]);

  // Financial totals
  const totalItemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + taxAmount;

  const inputAmountVal = parseFloat(currentInput) || 0;
  const computedInputTotal = qty * inputAmountVal;

  const keyBtnClass =
    'rounded-md font-bold text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border shadow-xs h-10 sm:h-11 md:h-12 lg:h-14 xl:h-16 bg-card border-border text-foreground hover:bg-muted';

  return (
    <div className="flex-1 min-h-0 h-full w-full bg-background overflow-hidden select-none flex flex-col md:flex-row">
      {/* 2-Column POS Terminal Canvas on md/lg/xl, stacked on mobile */}
      <div className="w-full h-full flex flex-col md:flex-row min-h-0 bg-background overflow-hidden">
        {/* 
          ======================================================================
          BILL ITEMS & SETTLEMENT PANE
          Mobile (<768px): Top zone (h-[315px] sm:h-[335px] to fit at least 4 items visible before scrolling)
          Tablet/Desktop (>=768px): Right Column (order-2, md:w-5/12 or md:col-span-5, sticky full-height with border-l)
          ======================================================================
        */}
        <div className="order-1 md:order-2 w-full md:w-[38%] lg:w-[35%] h-[345px] sm:h-[365px] md:h-full flex flex-col min-h-0 border-b md:border-b-0 md:border-l border-border overflow-hidden bg-card shrink-0">
          {/* Header Row: Current Bill & Bill #{displayBillNo} */}
          <div className="flex justify-between items-center px-3 py-2 sm:px-4 sm:py-2.5 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
              <h2 className="text-xs sm:text-sm text-foreground font-semibold tracking-tight truncate">
                Current Bill
              </h2>
              <span className="bg-muted text-foreground text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium border border-border shrink-0 tabular-nums tracking-tight font-medium">
                {totalItemCount}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Bill Number Badge (India-First: "Bill #042") */}
              <span className="bg-blue-600 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-semibold tracking-wide tabular-nums font-medium shadow-xs">
                Bill #{displayBillNo}
              </span>
            </div>
          </div>

          {/* Scrollable Items Stack (Internal Scroll Only - never push CartSummary off screen) */}
          <div
            ref={itemsContainerRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-3.5 divide-y divide-border bg-card scrollbar-thin"
          >
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-2 text-muted-foreground">
                <ShoppingBag className="w-5 h-5 mb-1 text-muted-foreground/60 stroke-[1.5]" />
                <p className="text-xs font-semibold text-foreground">Bill is empty</p>
                <p className="text-[10px] text-muted-foreground">Tap products to add items</p>
              </div>
            ) : (
              items.map((item, idx) => (
                <div
                  key={item.id}
                  id={`bill-item-${item.id}`}
                  className={`py-1 sm:py-1.5 flex items-center justify-between gap-1.5 sm:gap-2 rounded-xs px-1 -mx-1 transition-colors ${
                    idx === items.length - 1 ? 'bg-muted/30' : 'bg-card'
                  }`}
                >
                  {/* Column 1: Item Name & Sub-details */}
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground w-4 shrink-0 tabular-nums">
                      #{idx + 1}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-foreground truncate leading-tight">
                        {item.name}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium tabular-nums tracking-tight">
                          ({item.quantity} × {currencySymbol}
                          {item.unitPrice.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Quantity Stepper [ - {qty} + ] */}
                  <div className="w-[74px] sm:w-[82px] h-6 sm:h-7 flex items-center justify-between bg-muted rounded-md px-1 shadow-xs shrink-0">
                    <button
                      type="button"
                      id={`btn-qb-dec-${item.id}`}
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      className="h-5 w-5 flex items-center justify-center text-foreground font-bold active:bg-muted-foreground/20 rounded transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>

                    <span className="w-5 text-center text-xs font-medium text-foreground tabular-nums tracking-tight font-medium">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      id={`btn-qb-inc-${item.id}`}
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="h-5 w-5 flex items-center justify-center text-foreground font-bold active:bg-muted-foreground/20 rounded transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Column 3: Total Price */}
                  <div className="w-[58px] sm:w-[68px] text-right font-medium text-foreground tabular-nums tracking-tight font-medium text-xs sm:text-sm shrink-0">
                    {currencySymbol}
                    {(item.unitPrice * item.quantity).toFixed(2)}
                  </div>

                  {/* Column 4: Line Item Delete Button */}
                  <div className="w-6 flex items-center justify-end shrink-0">
                    <button
                      type="button"
                      id={`btn-remove-item-${item.id}`}
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                      aria-label={`Remove ${item.name}`}
                      title={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subtotal, Total, and Bottom Action Buttons Row */}
          <CartSummary
            totalItemCount={totalItemCount}
            subtotal={subtotal}
            taxRate={taxRate}
            taxAmount={taxAmount}
            total={grandTotal}
            currencySymbol={currencySymbol}
            heldOrdersCount={heldOrdersCount}
            onClearBill={handleClearAll}
            onHoldBill={handleHold}
            onPrintBill={() => onPrintQuickBill(items)}
            onPay={() => onSaveQuickBill(items)}
            disabled={items.length === 0}
            onSwitchMode={onSwitchMode}
            currentMode="quick-bill"
          />
        </div>

        {/* 
          ======================================================================
          KEYPAD REGISTER PANE (Active entry, presets, 4x4 keypad)
          Mobile (<768px): Bottom zone (order-2, flex-1)
          Tablet/Desktop (>=768px): Left Column (order-1, md:w-[62%] lg:w-[65%], centered keypad workspace)
          ======================================================================
        */}
        <div className="order-2 md:order-1 flex-1 md:w-[62%] lg:w-[65%] min-h-0 flex flex-col justify-center bg-background p-2 sm:p-3 md:p-5 lg:p-8 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
            {/* INPUT DISPLAY: 3 × ₹50.00 = ₹150.00 & Optional Note */}
            <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 lg:py-3 flex flex-col gap-1 sm:gap-1.5 shadow-xs shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Input Display
                </span>
                <input
                  type="text"
                  placeholder="Item note (optional)..."
                  value={itemLabel}
                  onChange={(e) => setItemLabel(e.target.value)}
                  className="text-right text-xs sm:text-sm font-medium text-foreground bg-transparent focus:outline-hidden placeholder-muted-foreground max-w-[150px] sm:max-w-[180px] md:max-w-[220px]"
                />
              </div>

              <div className="flex items-center justify-between">
                {/* Left Side: Qty × Unit Price */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveField('qty')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-medium text-sm sm:text-base md:text-lg lg:text-xl cursor-pointer transition-all tabular-nums tracking-tight font-medium ${
                      activeField === 'qty'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80'
                    }`}
                    title="Click to edit quantity multiplier"
                  >
                    {qty}
                  </button>

                  <span className="text-muted-foreground font-medium text-xs sm:text-sm md:text-base">
                    ×
                  </span>

                  <button
                    type="button"
                    onClick={() => setActiveField('amount')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-medium text-sm sm:text-base md:text-lg lg:text-xl cursor-pointer transition-all tabular-nums tracking-tight font-medium ${
                      activeField === 'amount'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80'
                    }`}
                    title="Click to edit unit amount"
                  >
                    {currencySymbol}
                    {currentInput}
                  </button>
                </div>

                {/* Right Side: Computed = ₹150.00 */}
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm md:text-base text-muted-foreground font-medium">=</span>
                  <span className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground tabular-nums tracking-tight font-medium leading-none">
                    {currencySymbol}
                    {computedInputTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Amount Fast-Add Presets: [ +10 ] [ +20 ] [ +50 ] [ +100 ] [ +200 ] [ +500 ] */}
            <div className="grid grid-cols-6 gap-1 sm:gap-1.5 md:gap-2 lg:gap-2.5 shrink-0">
              {[10, 20, 50, 100, 200, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAddPreset(val)}
                  className="py-1 sm:py-1.5 md:py-2 lg:py-2.5 bg-secondary hover:bg-secondary/80 border border-border rounded-md text-xs sm:text-sm md:text-base font-medium text-secondary-foreground transition-all cursor-pointer text-center shadow-xs active:scale-95 tabular-nums tracking-tight font-medium"
                >
                  +{val}
                </button>
              ))}
            </div>

            {/* Keypad Grid (4 columns × 4 rows) */}
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 md:gap-2 lg:gap-2.5 shrink-0">
              {/* Row 1 */}
              <button
                type="button"
                onClick={() => handleDigitPress('1')}
                className={keyBtnClass}
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleDigitPress('2')}
                className={keyBtnClass}
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleDigitPress('3')}
                className={keyBtnClass}
              >
                3
              </button>
              <button
                type="button"
                onClick={handleQtyToggle}
                className={`rounded-md font-medium text-xs sm:text-sm md:text-base lg:text-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center border shadow-xs h-10 sm:h-11 md:h-12 lg:h-14 xl:h-16 ${
                  activeField === 'qty'
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-secondary border-border text-secondary-foreground hover:bg-secondary/80'
                }`}
                title="Toggle or Set Quantity multiplier"
              >
                × Qty
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleDigitPress('4')}
                className={keyBtnClass}
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleDigitPress('5')}
                className={keyBtnClass}
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleDigitPress('6')}
                className={keyBtnClass}
              >
                6
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="rounded-md font-medium transition-all active:scale-95 cursor-pointer flex items-center justify-center border shadow-xs h-10 sm:h-11 md:h-12 lg:h-14 xl:h-16 bg-secondary border-border text-secondary-foreground hover:bg-secondary/80"
                title="Backspace"
              >
                <Delete className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={() => handleDigitPress('7')}
                className={keyBtnClass}
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleDigitPress('8')}
                className={keyBtnClass}
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleDigitPress('9')}
                className={keyBtnClass}
              >
                9
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md font-medium text-xs sm:text-sm md:text-base lg:text-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center border shadow-xs h-10 sm:h-11 md:h-12 lg:h-14 xl:h-16 bg-card border-destructive/30 text-destructive hover:bg-destructive/10"
                title="Clear"
              >
                C
              </button>

              {/* Row 4: [ 0 ] and [ ADD TO BILL ] spanning 3 columns */}
              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className={keyBtnClass}
              >
                0
              </button>
              <button
                type="button"
                id="btn-quickbill-add-to-bill"
                onClick={handleAddCustomAmount}
                disabled={parseFloat(currentInput) <= 0}
                className={`col-span-3 rounded-md font-medium text-xs sm:text-sm md:text-base lg:text-lg tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center border shadow-xs h-10 sm:h-11 md:h-12 lg:h-14 xl:h-16 ${
                  parseFloat(currentInput) > 0
                    ? 'bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60'
                }`}
              >
                <span>Add to Bill</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickBillPOS;
