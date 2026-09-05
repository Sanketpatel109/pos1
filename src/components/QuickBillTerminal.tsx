import React, { useState } from 'react';
import {
  Delete,
  Printer,
  ShoppingCart,
  Plus,
  Trash2,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { BillItem } from '../types';

interface QuickBillTerminalProps {
  currencySymbol: string;
  onSaveQuickBill: (items: BillItem[]) => void;
  onPrintQuickBill: (items: BillItem[]) => void;
}

export const QuickBillTerminal: React.FC<QuickBillTerminalProps> = ({
  currencySymbol,
  onSaveQuickBill,
  onPrintQuickBill,
}) => {
  const [items, setItems] = useState<BillItem[]>([
    { id: 'qb-1', name: 'Quick Item #1', unitPrice: 100, quantity: 1 },
  ]);
  const [currentInput, setCurrentInput] = useState<string>('0');
  const [itemLabel, setItemLabel] = useState<string>('');

  const handleNumberPress = (val: string) => {
    if (val === 'C') {
      setCurrentInput('0');
      return;
    }
    if (val === 'DEL') {
      setCurrentInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    setCurrentInput((prev) => {
      if (prev === '0') return val === '.' ? '0.' : val;
      if (val === '.' && prev.includes('.')) return prev;
      return prev + val;
    });
  };

  const handleAddCustomAmount = (presetVal?: number) => {
    const amount = presetVal !== undefined ? presetVal : parseFloat(currentInput);
    if (isNaN(amount) || amount <= 0) return;

    const newItem: BillItem = {
      id: `qb-${Date.now()}`,
      name: itemLabel.trim() || `Quick Item @ ${currencySymbol}${amount}`,
      unitPrice: amount,
      quantity: 1,
    };

    setItems((prev) => [...prev, newItem]);
    setCurrentInput('0');
    setItemLabel('');
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
    setCurrentInput('0');
    setItemLabel('');
  };

  const totalAmount = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  const numpadKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'DEL'],
  ];

  const presets = [10, 20, 50, 100, 200, 500];

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#fcf8fb] overflow-hidden">
      {/* 
        ========================================================================
        LEFT COLUMN (Tablet): Calculator / Tactile Keypad, Presets & Input
        PHONE: Bottom section (order-2 md:order-1)
        ========================================================================
      */}
      <div className="order-2 md:order-1 w-full md:w-[62%] lg:w-[65%] flex flex-col p-3.5 sm:p-4 gap-2.5 overflow-y-auto bg-white md:border-r border-[#d4d4d8]">
        {/* Entry Screen */}
        <div className="bg-[#f0edf0] border border-[#d4d4d8] rounded-2xl p-3 flex items-center justify-between shadow-2xs">
          <div className="flex-1 mr-3">
            <label className="text-[10px] font-bold text-[#77767b] block uppercase mb-0.5">
              Item Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Chai, Extra Fries, Packing"
              value={itemLabel}
              onChange={(e) => setItemLabel(e.target.value)}
              className="w-full text-xs sm:text-sm font-semibold text-[#1c1b1d] bg-transparent focus:outline-hidden placeholder-[#77767b]"
            />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-[#77767b] block uppercase">
              Amount ({currencySymbol})
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#1c1b1d] font-mono leading-tight">
              {currencySymbol}
              {currentInput}
            </span>
          </div>
        </div>

        {/* Fast Quick Add Presets */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {presets.map((val) => (
            <button
              key={val}
              onClick={() => handleAddCustomAmount(val)}
              className="py-2 bg-[#f6f2f5] hover:bg-[#eae7ea] active:bg-[#dcd9dc] border border-[#d4d4d8] rounded-xl text-xs sm:text-sm font-extrabold text-[#1c1b1d] transition-all cursor-pointer font-mono"
            >
              +{val}
            </button>
          ))}
        </div>

        {/* Numpad 3x4 Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 flex-1 min-h-[220px]">
          {numpadKeys.flat().map((k) => (
            <button
              key={k}
              onClick={() => handleNumberPress(k)}
              className={`rounded-2xl font-black text-lg sm:text-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border shadow-2xs ${
                k === 'DEL'
                  ? 'bg-[#e4e4e7] border-[#d4d4d8] text-[#1c1b1d] hover:bg-[#dcd9dc]'
                  : 'bg-[#fcf8fb] border-[#d4d4d8] text-[#1c1b1d] hover:bg-[#f0edf0]'
              }`}
            >
              {k === 'DEL' ? <Delete className="w-5 h-5" /> : k}
            </button>
          ))}
        </div>

        {/* Add Entered Amount Button */}
        <button
          onClick={() => handleAddCustomAmount()}
          disabled={parseFloat(currentInput) <= 0}
          className="w-full py-3 bg-[#18181b] hover:bg-black text-white rounded-2xl text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shrink-0 active:scale-98"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add {currencySymbol}{currentInput} to Bill Stack</span>
        </button>
      </div>

      {/* 
        ========================================================================
        RIGHT COLUMN (Tablet): Quick Items Stack & Calculations & Pay
        PHONE: Top section (order-1 md:order-2)
        ========================================================================
      */}
      <div className="order-1 md:order-2 w-full md:w-[38%] lg:w-[35%] flex flex-col bg-white border-b md:border-b-0 border-[#d4d4d8] min-h-[40%] max-h-[48%] md:max-h-full md:h-full shrink-0">
        <div className="p-3.5 border-b border-[#d4d4d8] flex justify-between items-center bg-white shrink-0">
          <span className="text-xs sm:text-sm font-extrabold text-[#1c1b1d] uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-[#18181b]" />
            <span>Items Stack ({items.length})</span>
          </span>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[11px] font-bold text-[#ba1a1a] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Stack items list - Clean divider lines */}
        <div className="flex-1 overflow-y-auto px-4 divide-y divide-[#f0edf0] bg-white no-scrollbar">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#77767b]">
              <Receipt className="w-8 h-8 text-[#c8c5cb] mb-2" />
              <p className="text-xs font-bold text-[#1c1b1d]">Stack is empty</p>
              <p className="text-[11px] text-[#77767b] mt-0.5">
                Enter amount on the left keypad and tap "Add to Bill Stack"
              </p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                className="py-2.5 sm:py-3 flex items-center justify-between gap-2 bg-white transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-xs font-extrabold text-[#77767b] font-mono w-5 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-[#1c1b1d] truncate">
                      {item.name}
                    </span>
                    {item.category && item.category !== 'Quick Item' && (
                      <span className="text-[10px] text-[#77767b] font-medium truncate">{item.category}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-black text-xs sm:text-sm font-mono text-[#1c1b1d]">
                    {currencySymbol}
                    {item.unitPrice.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-[#77767b] hover:text-[#ba1a1a] p-1 rounded-md hover:bg-[#ffdad6]/50 transition-colors cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Footer on Tablet / Stack Bottom */}
        <div className="p-3.5 bg-white border-t border-[#d4d4d8] shrink-0 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-bold text-[#77767b] uppercase tracking-wider block">
                Total Quick Bill Due
              </span>
              <span className="text-xs text-[#1c1b1d] font-semibold">
                {items.length} items tallied
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-[#1c1b1d] font-mono leading-none">
              {currencySymbol}
              {totalAmount.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onPrintQuickBill(items)}
              disabled={items.length === 0}
              className="py-2.5 bg-[#f4f4f5] hover:bg-[#eae7ea] text-[#1c1b1d] rounded-xl font-extrabold text-xs uppercase border border-[#d4d4d8] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={() => onSaveQuickBill(items)}
              disabled={items.length === 0}
              className="py-2.5 bg-[#18181b] hover:bg-black text-white rounded-xl font-extrabold text-xs uppercase shadow-md flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Pay Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
