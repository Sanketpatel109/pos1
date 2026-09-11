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
} from '../icons/faIcons';
import { BillItem } from '../types';
import { useCart } from '../context/CartContext';

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
    'rounded-xl font-bold text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border shadow-2xs h-10 sm:h-11 md:h-12 lg:h-14 xl:h-16 bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50';

  return (
    <div className="flex-1 min-h-0 h-full w-full bg-zinc-50 overflow-hidden select-none flex flex-col md:flex-row">
      {/* 2-Column POS Terminal Canvas on md/lg/xl, stacked on mobile */}
      <div className="w-full h-full flex flex-col md:flex-row min-h-0 bg-zinc-50 overflow-hidden">
        {/* 
          ======================================================================
          BILL ITEMS & SETTLEMENT PANE
          Mobile (<768px): Top zone (h-[315px] sm:h-[335px] to fit at least 4 items visible before scrolling)
          Tablet/Desktop (>=768px): Right Column (order-2, md:w-5/12 or md:col-span-5, sticky full-height with border-l)
          ======================================================================
        */}
        <div className="order-1 md:order-2 w-full md:w-[38%] lg:w-[35%] h-[315px] sm:h-[335px] md:h-full flex flex-col min-h-0 border-b md:border-b-0 md:border-l border-zinc-200/80 overflow-hidden bg-white shrink-0">
          {/* Header Row: Bill Items & Bill #{billNo} */}
          <div className="flex justify-between items-center px-3 py-1.5 sm:px-4 sm:py-2.5 border-b border-zinc-200/80 bg-white shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-900 shrink-0" />
              <h2 className="text-xs sm:text-sm text-zinc-900 font-semibold tracking-tight truncate">
                Bill Items
              </h2>
              <span className="bg-zinc-100 text-zinc-800 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 rounded-full font-medium border border-zinc-200 shrink-0 tabular-nums tracking-tight">
                {totalItemCount}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Bill Number Badge (India-First: "Bill #042") */}
              <span className="bg-zinc-900 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-lg font-mono font-medium tracking-wide tabular-nums">
                Bill #{displayBillNo}
              </span>
            </div>
          </div>

          {/* Scrollable Items Stack (Internal Scroll Only - at least 4 items visible) */}
          <div
            ref={itemsContainerRef}
            className="flex-1 min-h-[160px] overflow-y-auto overscroll-contain px-3 sm:px-3.5 divide-y divide-zinc-100 bg-white scrollbar-thin"
          >
            {items.length === 0 ? (
              <div className="h-full min-h-[90px] flex flex-col items-center justify-center text-center py-4 text-zinc-400">
                <Receipt className="w-6 h-6 text-zinc-300 mb-1 stroke-[1.5]" />
                <p className="text-xs font-semibold text-zinc-900">Bill is empty</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Type an amount on keypad and tap "Add to Bill"
                </p>
              </div>
            ) : (
              items.map((item, idx) => (
                <div
                  key={item.id}
                  id={`bill-item-${item.id}`}
                  className={`py-1 sm:py-1.5 flex items-center justify-between gap-1.5 sm:gap-2 rounded-xs px-1 -mx-1 transition-colors ${
                    idx === items.length - 1 ? 'bg-zinc-50/50' : 'bg-white'
                  }`}
                >
                  {/* Column 1: Item Name & Sub-details */}
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <span className="text-[10px] sm:text-xs font-medium text-zinc-400 font-mono w-4 shrink-0 tabular-nums">
                      #{idx + 1}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-zinc-900 truncate leading-tight">
                        {item.name}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-[10px] sm:text-[11px] text-zinc-500 font-mono font-medium tabular-nums tracking-tight">
                          ({item.quantity} × {currencySymbol}
                          {item.unitPrice.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Quantity Stepper [ - {qty} + ] */}
                  <div className="w-[74px] sm:w-[82px] h-6 sm:h-7 flex items-center justify-between bg-zinc-100 rounded-lg px-1 shadow-2xs shrink-0">
                    <button
                      type="button"
                      id={`btn-qb-dec-${item.id}`}
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      className="h-5 w-5 flex items-center justify-center text-zinc-700 font-bold active:bg-zinc-200 rounded transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>

                    <span className="w-5 text-center text-xs font-medium text-zinc-900 tabular-nums tracking-tight">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      id={`btn-qb-inc-${item.id}`}
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="h-5 w-5 flex items-center justify-center text-zinc-700 font-bold active:bg-zinc-200 rounded transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Column 3: Total Price */}
                  <div className="w-[58px] sm:w-[68px] text-right font-medium text-zinc-900 tabular-nums tracking-tight text-xs sm:text-sm font-mono shrink-0">
                    {currencySymbol}
                    {(item.unitPrice * item.quantity).toFixed(2)}
                  </div>

                  {/* Column 4: Line Item Delete Button */}
                  <div className="w-6 flex items-center justify-end shrink-0">
                    <button
                      type="button"
                      id={`btn-remove-item-${item.id}`}
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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

          {/* Subtotal, Total, and Fixed Bottom Action Buttons Row */}
          <div className="px-3.5 py-2 sm:py-2.5 bg-white border-t border-zinc-200/80 shrink-0 flex flex-col gap-1.5 select-none">
            {/* Subtotal & GST Line */}
            <div className="flex justify-between items-center text-xs text-zinc-500">
              <span>
                Subtotal ({totalItemCount} items)
                {taxRate > 0 && (
                  <span className="text-zinc-400 ml-1">
                    · Incl. {currencySymbol}{taxAmount.toFixed(2)} GST
                  </span>
                )}
              </span>
              <span className="font-mono font-medium text-zinc-900 tabular-nums tracking-tight">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>

            {/* Total Line */}
            <div className="flex justify-between items-baseline border-t border-zinc-100 pt-1">
              <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                TOTAL
              </span>
              <span className="text-lg sm:text-xl font-bold text-zinc-900 font-mono leading-none tracking-tight tabular-nums">
                {currencySymbol}
                {grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Action Buttons Row: [  Clear ] [  Hold ] [  PRINT ] [ Pay ₹... → ] */}
            <div className="flex items-center gap-2 pt-0.5">
              {/* [  Clear ] */}
              <button
                type="button"
                id="btn-quickbill-clear"
                onClick={handleClearAll}
                disabled={items.length === 0}
                title="Clear active bill"
                className="flex items-center justify-center bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95 w-9 h-9 sm:w-10 sm:h-10 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* [  Hold ] */}
              <button
                type="button"
                id="btn-quickbill-hold"
                onClick={handleHold}
                disabled={items.length === 0 && heldOrdersCount === 0}
                title={
                  items.length > 0
                    ? 'Hold / Park Bill for next customer'
                    : heldOrdersCount > 0
                    ? `Recall ${heldOrdersCount} parked bill(s)`
                    : 'Add items to hold bill'
                }
                className="flex items-center justify-center rounded-xl transition-all active:scale-95 w-9 h-9 sm:w-10 sm:h-10 shrink-0 cursor-pointer border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed relative"
              >
                <PauseCircle className="w-4 h-4" />
                {heldOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-medium text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs tabular-nums">
                    {heldOrdersCount}
                  </span>
                )}
              </button>

              {/* [  PRINT ] */}
              <button
                type="button"
                id="btn-quickbill-print"
                onClick={() => onPrintQuickBill(items)}
                disabled={items.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all active:scale-[0.98] h-9 sm:h-10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs text-xs tracking-wider"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              {/* [ Pay ₹... → ] Primary Brand CTA */}
              <button
                type="button"
                id="btn-quickbill-pay"
                onClick={() => onSaveQuickBill(items)}
                disabled={items.length === 0}
                className="flex-[1.5] flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl transition-all active:scale-[0.98] shadow-xs h-9 sm:h-10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm tracking-wide"
              >
                <span>Pay ₹{grandTotal.toFixed(2)} →</span>
              </button>
            </div>
          </div>
        </div>

        {/* 
          ======================================================================
          KEYPAD REGISTER PANE (Active entry, presets, 4x4 keypad)
          Mobile (<768px): Bottom zone (order-2, flex-1)
          Tablet/Desktop (>=768px): Left Column (order-1, md:w-[62%] lg:w-[65%], centered keypad workspace)
          ======================================================================
        */}
        <div className="order-2 md:order-1 flex-1 md:w-[62%] lg:w-[65%] min-h-0 flex flex-col justify-center bg-zinc-50 p-2 sm:p-3 md:p-5 lg:p-8 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex flex-col gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
            {/* INPUT DISPLAY: 3 × ₹50.00 = ₹150.00 & Optional Note */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 lg:py-3 flex flex-col gap-1 sm:gap-1.5 shadow-xs shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Input Display
                </span>
                <input
                  type="text"
                  placeholder="Item note (optional)..."
                  value={itemLabel}
                  onChange={(e) => setItemLabel(e.target.value)}
                  className="text-right text-xs sm:text-sm font-medium text-zinc-900 bg-transparent focus:outline-hidden placeholder-zinc-400 max-w-[150px] sm:max-w-[180px] md:max-w-[220px]"
                />
              </div>

              <div className="flex items-center justify-between">
                {/* Left Side: Qty × Unit Price */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveField('qty')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-mono font-medium text-sm sm:text-base md:text-lg lg:text-xl cursor-pointer transition-all tabular-nums tracking-tight ${
                      activeField === 'qty'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                    title="Click to edit quantity multiplier"
                  >
                    {qty}
                  </button>

                  <span className="text-zinc-400 font-medium text-xs sm:text-sm md:text-base">
                    ×
                  </span>

                  <button
                    type="button"
                    onClick={() => setActiveField('amount')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-mono font-medium text-sm sm:text-base md:text-lg lg:text-xl cursor-pointer transition-all tabular-nums tracking-tight ${
                      activeField === 'amount'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                    title="Click to edit unit amount"
                  >
                    {currencySymbol}
                    {currentInput}
                  </button>
                </div>

                {/* Right Side: Computed = ₹150.00 */}
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm md:text-base text-zinc-400 font-medium">=</span>
                  <span className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-zinc-900 font-mono tabular-nums tracking-tight leading-none">
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
                  className="py-1 sm:py-1.5 md:py-2 lg:py-2.5 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 border border-zinc-200/80 rounded-xl text-xs sm:text-sm md:text-base font-medium text-zinc-800 transition-all cursor-pointer font-mono text-center shadow-2xs active:scale-95 tabular-nums tracking-tight"
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
                className={`rounded-xl font-medium text-xs sm:text-sm md:text-base lg:text-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center border shadow-2xs h-10 sm:h-11 md:h-12 lg:h-14 xl:h-16 ${
                  activeField === 'qty'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
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
                className="rounded-xl font-medium transition-all active:scale-95 cursor-pointer flex items-center justify-center border shadow-2xs h-10 sm:h-11 md:h-12 lg:h-14 xl:h-16 bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200"
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
                className="rounded-xl font-medium text-xs sm:text-sm md:text-base lg:text-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center border shadow-2xs h-10 sm:h-11 md:h-12 lg:h-14 xl:h-16 bg-white border-rose-200 text-rose-600 hover:bg-rose-50"
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
                className={`col-span-3 rounded-xl font-medium text-xs sm:text-sm md:text-base lg:text-lg tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center border shadow-xs h-10 sm:h-11 md:h-12 lg:h-14 xl:h-16 ${
                  parseFloat(currentInput) > 0
                    ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-600'
                    : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60'
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
