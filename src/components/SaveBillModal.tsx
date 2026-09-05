import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Percent,
  Check,
  CreditCard,
  Banknote,
  Smartphone,
  Split,
  Plus,
  Receipt,
  FileText,
  Vault,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Customer, PaymentMethod, SplitPaymentDetail } from '../types';
import { SplitPaymentModal } from './SplitPaymentModal';
import { hardware } from '../utils/hardware';

interface SaveBillModalProps {
  isOpen: boolean;
  subtotal: number;
  taxRate: number;
  customers: Customer[];
  currencySymbol: string;
  onClose: () => void;
  onAddNewCustomer: (name: string, phone: string) => void;
  onSaveAndComplete: (data: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    discountPercent: number;
    discountAmount: number;
    includeGst: boolean;
    taxAmount: number;
    grandTotal: number;
    paymentMode: PaymentMethod;
    splitDetails?: SplitPaymentDetail;
    tenderedAmount?: number;
    changeDue?: number;
    note?: string;
    orderDate: string;
  }) => void;
}

export const SaveBillModal: React.FC<SaveBillModalProps> = ({
  isOpen,
  subtotal,
  taxRate,
  customers,
  currencySymbol,
  onClose,
  onAddNewCustomer,
  onSaveAndComplete,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');

  // Discount
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [flatDiscount, setFlatDiscount] = useState<string>('0');

  // Tax & Note
  const [includeGst, setIncludeGst] = useState<boolean>(taxRate > 0);
  const [billNote, setBillNote] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString();
  });

  // Payment Method
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('CASH');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [splitDetails, setSplitDetails] = useState<SplitPaymentDetail>({
    cash: 0,
    online: 0,
    credit: 0,
  });
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);

  // Filtered customers
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Calculate final totals
  const discountAmount =
    discountType === 'percent'
      ? (subtotal * discountPercent) / 100
      : parseFloat(flatDiscount) || 0;

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = includeGst ? (discountedSubtotal * taxRate) / 100 : 0;
  const grandTotal = discountedSubtotal + taxAmount;

  // Tendered & Change calculations
  const tenderedNumeric = tenderedAmount ? parseFloat(tenderedAmount) || 0 : grandTotal;
  const hasEnteredTender = Boolean(tenderedAmount && !isNaN(parseFloat(tenderedAmount)));
  const changeDue = Math.max(0, (hasEnteredTender ? tenderedNumeric : grandTotal) - grandTotal);
  const shortAmount = Math.max(0, grandTotal - (hasEnteredTender ? tenderedNumeric : grandTotal));

  // Quick note presets for Cash payments (e.g. ₹20, ₹50, ₹100, ₹200, ₹500)
  const quickNotePresets = (
    currencySymbol === '$'
      ? [
          { label: 'Exact', amount: Math.ceil(grandTotal) },
          { label: `${currencySymbol}5`, amount: 5 },
          { label: `${currencySymbol}10`, amount: 10 },
          { label: `${currencySymbol}20`, amount: 20 },
          { label: `${currencySymbol}50`, amount: 50 },
          { label: `${currencySymbol}100`, amount: 100 },
        ]
      : [
          { label: 'Exact', amount: Math.ceil(grandTotal) },
          { label: `${currencySymbol}10`, amount: 10 },
          { label: `${currencySymbol}20`, amount: 20 },
          { label: `${currencySymbol}50`, amount: 50 },
          { label: `${currencySymbol}100`, amount: 100 },
          { label: `${currencySymbol}200`, amount: 200 },
          { label: `${currencySymbol}500`, amount: 500 },
          { label: `${currencySymbol}2000`, amount: 2000 },
        ]
  ).filter((p) => {
    if (p.label === 'Exact') return true;
    // Include all popular notes that are either >= 20 or >= grandTotal
    return p.amount >= grandTotal || p.amount >= 20;
  });

  if (!isOpen) return null;

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;
    onAddNewCustomer(newCustName.trim(), newCustPhone.trim());
    setIsAddingNewCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  const handleFinalSubmit = () => {
    const finalTendered =
      paymentMode === 'CASH'
        ? hasEnteredTender
          ? tenderedNumeric
          : grandTotal
        : grandTotal;
    const finalChange =
      paymentMode === 'CASH'
        ? Math.max(0, finalTendered - grandTotal)
        : 0;

    // Pop physical cash drawer if cash transaction
    if (paymentMode === 'CASH') {
      hardware.kickCashDrawer();
    }

    onSaveAndComplete({
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerPhone: selectedCustomer ? selectedCustomer.phone : '',
      discountPercent: discountType === 'percent' ? discountPercent : 0,
      discountAmount,
      includeGst,
      taxAmount,
      grandTotal,
      paymentMode,
      splitDetails: paymentMode === 'SPLIT' ? splitDetails : undefined,
      tenderedAmount: finalTendered,
      changeDue: finalChange,
      note: billNote.trim() || undefined,
      orderDate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md border border-[#d4d4d8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#1c1b1d]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#d4d4d8] flex items-center justify-between bg-[#f6f2f5]">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#18181b]" />
            <h2 className="font-bold text-sm text-[#1c1b1d]">Finalize & Pay Bill</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#77767b] hover:text-[#1c1b1d] hover:bg-[#eae7ea]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Customer Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[#1c1b1d] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#18181b]" />
                <span>Customer (Optional)</span>
              </label>
              {!isAddingNewCustomer && (
                <button
                  onClick={() => setIsAddingNewCustomer(true)}
                  className="text-xs font-bold text-[#18181b] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Customer</span>
                </button>
              )}
            </div>

            {isAddingNewCustomer ? (
              <form
                onSubmit={handleCreateCustomer}
                className="bg-[#f6f2f5] p-3 rounded-xl border border-[#d4d4d8] space-y-2"
              >
                <div className="flex justify-between items-center text-xs font-bold text-[#1c1b1d]">
                  <span>Add New Customer</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCustomer(false)}
                    className="text-[#77767b] hover:text-[#1c1b1d]"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-white border border-[#d4d4d8] rounded-lg px-2.5 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                  autoFocus
                />
                <input
                  type="tel"
                  placeholder="10-digit Mobile Number"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full bg-white border border-[#d4d4d8] rounded-lg px-2.5 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-[#18181b] text-white rounded-lg text-xs font-bold hover:bg-black transition-all cursor-pointer"
                >
                  Save Customer
                </button>
              </form>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (selectedCustomerId) setSelectedCustomerId('');
                  }}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs text-[#1c1b1d] focus:outline-hidden focus:border-[#18181b]"
                />

                {customerSearch && (
                  <div className="max-h-28 overflow-y-auto bg-white border border-[#d4d4d8] rounded-xl divide-y divide-[#d4d4d8] shadow-sm">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-2 text-center text-xs text-[#77767b]">
                        No matching customer found
                      </div>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            setCustomerSearch(`${cust.name} (${cust.phone})`);
                          }}
                          className="w-full p-2 text-left text-xs hover:bg-[#f6f2f5] flex justify-between items-center"
                        >
                          <span className="font-semibold text-[#1c1b1d]">{cust.name}</span>
                          <div className="flex items-center gap-2">
                            {cust.loyaltyPoints !== undefined && cust.loyaltyPoints > 0 && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                ★ {cust.loyaltyPoints} pts
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-[#77767b]">
                              {cust.phone}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs flex items-center justify-between">
                    <span className="text-emerald-950 font-medium truncate">
                      {selectedCustomer.name} • {selectedCustomer.phone}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                        ★ {selectedCustomer.loyaltyPoints || 0} pts
                      </span>
                      {selectedCustomer.creditBalance > 0 && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          Khata: {currencySymbol}{selectedCustomer.creditBalance}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discount Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1c1b1d] flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-[#18181b]" />
              <span>Discount</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 5, 10].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setDiscountType('percent');
                    setDiscountPercent(pct);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    discountType === 'percent' && discountPercent === pct
                      ? 'bg-[#18181b] text-white border-[#18181b]'
                      : 'bg-white text-[#47464b] border-[#d4d4d8] hover:bg-[#f6f2f5]'
                  }`}
                >
                  {pct === 0 ? 'No Disc.' : `${pct}%`}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setDiscountType('flat')}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  discountType === 'flat'
                    ? 'bg-[#18181b] text-white border-[#18181b]'
                    : 'bg-white text-[#47464b] border-[#d4d4d8] hover:bg-[#f6f2f5]'
                }`}
              >
                Flat {currencySymbol}
              </button>
            </div>

            {discountType === 'flat' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-[#77767b]">Flat Amount:</span>
                <input
                  type="number"
                  value={flatDiscount}
                  onChange={(e) => setFlatDiscount(e.target.value)}
                  className="flex-1 bg-white border border-[#d4d4d8] rounded-lg px-2 py-1 text-xs text-[#1c1b1d] focus:outline-hidden font-mono"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* Tax Checkbox */}
          <div className="flex items-center justify-between p-2.5 bg-[#f6f2f5] rounded-xl border border-[#d4d4d8]">
            <span className="text-xs font-semibold text-[#1c1b1d]">
              Include Tax ({taxRate}%)
            </span>
            <input
              type="checkbox"
              checked={includeGst}
              onChange={(e) => setIncludeGst(e.target.checked)}
              className="w-4 h-4 rounded text-[#18181b] focus:ring-0 cursor-pointer accent-[#18181b]"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1c1b1d] block">
              Payment Method :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  paymentMode === 'CASH'
                    ? 'bg-[#18181b] text-white border-[#18181b] shadow-xs'
                    : 'bg-white text-[#1c1b1d] border-[#d4d4d8] hover:bg-[#f6f2f5]'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>CASH</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('ONLINE')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  paymentMode === 'ONLINE'
                    ? 'bg-[#18181b] text-white border-[#18181b] shadow-xs'
                    : 'bg-white text-[#1c1b1d] border-[#d4d4d8] hover:bg-[#f6f2f5]'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>ONLINE / UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('CREDIT')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  paymentMode === 'CREDIT'
                    ? 'bg-[#18181b] text-white border-[#18181b] shadow-xs'
                    : 'bg-white text-[#1c1b1d] border-[#d4d4d8] hover:bg-[#f6f2f5]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>KHATA (CREDIT)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMode('SPLIT');
                  setIsSplitModalOpen(true);
                }}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  paymentMode === 'SPLIT'
                    ? 'bg-[#18181b] text-white border-[#18181b] shadow-xs'
                    : 'bg-white text-[#1c1b1d] border-[#d4d4d8] hover:bg-[#f6f2f5]'
                }`}
              >
                <Split className="w-4 h-4" />
                <span>SPLIT PAY</span>
              </button>
            </div>

            {/* CASH TENDERED & CHANGE CALCULATOR */}
            {paymentMode === 'CASH' && (
              <div className="mt-3 bg-[#f6f2f5] border-2 border-emerald-600/30 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-150 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-[#1c1b1d] flex items-center gap-1.5 uppercase tracking-wide">
                    <Banknote className="w-4 h-4 text-emerald-700" />
                    <span>Cash Tendered (Customer Gave)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => hardware.kickCashDrawer()}
                    className="text-[10px] font-bold text-[#47464b] hover:text-[#1c1b1d] bg-white px-2.5 py-1 rounded-lg border border-[#d4d4d8] flex items-center gap-1 hover:bg-[#eae7ea] transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Trigger physical USB/RJ11 Cash Drawer kick"
                  >
                    <Vault className="w-3 h-3 text-[#18181b]" />
                    <span>Pop Drawer</span>
                  </button>
                </div>

                {/* Quick Currency Note Denomination Chips */}
                <div>
                  <div className="text-[10px] text-[#77767b] font-medium mb-1.5 flex items-center justify-between">
                    <span>Quick Currency Notes:</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Tap note handed by customer</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickNotePresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTenderedAmount(preset.amount.toString())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold transition-all cursor-pointer border ${
                          parseFloat(tenderedAmount) === preset.amount
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm scale-105 ring-2 ring-emerald-500/30'
                            : 'bg-white text-[#1c1b1d] border-[#d4d4d8] hover:bg-zinc-100 hover:border-zinc-400'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Tendered Input Field */}
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-[#77767b] font-mono text-base font-bold">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder={grandTotal.toFixed(2)}
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    className="w-full pl-8 pr-16 py-2 bg-white border-2 border-[#d4d4d8] rounded-xl text-lg font-mono font-black text-[#1c1b1d] focus:outline-hidden focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-inner"
                  />
                  {tenderedAmount && (
                    <button
                      type="button"
                      onClick={() => setTenderedAmount('')}
                      className="absolute right-2 top-2 px-2.5 py-1 text-[10px] font-bold bg-[#eae7ea] hover:bg-[#d4d4d8] text-[#47464b] rounded-lg transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Live Return Change vs Short Payment Readout */}
                {hasEnteredTender && tenderedNumeric > grandTotal ? (
                  <div className="bg-emerald-50 border-2 border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-emerald-950 shadow-sm animate-in zoom-in-95 duration-150">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        <span>Customer Gave {currencySymbol}{tenderedNumeric.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-emerald-900 font-medium">
                        Bill is {currencySymbol}{grandTotal.toFixed(2)} &middot; Return to customer:
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Change To Return
                      </span>
                      <span className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
                        {currencySymbol}{changeDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : hasEnteredTender && tenderedNumeric < grandTotal ? (
                  <div className="bg-amber-50 border-2 border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-amber-950 shadow-sm animate-in zoom-in-95 duration-150">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.5]" />
                        <span>Short / Underpaid by Customer</span>
                      </div>
                      <p className="text-xs text-amber-900 font-medium">
                        Customer gave {currencySymbol}{tenderedNumeric.toFixed(2)} of {currencySymbol}{grandTotal.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        Still Owed
                      </span>
                      <span className="text-2xl font-black font-mono text-amber-700 tracking-tight">
                        {currencySymbol}{shortAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-[#d4d4d8] rounded-xl p-2.5 flex items-center justify-between text-zinc-700 text-xs">
                    <span className="font-semibold text-zinc-600">Exact Cash Expected:</span>
                    <span className="font-bold font-mono text-zinc-900">
                      {currencySymbol}{grandTotal.toFixed(2)} (No change due)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bill Calculation Summary Box */}
          <div className="bg-[#f0edf0] p-3 rounded-xl border border-[#d4d4d8] space-y-1.5 text-xs">
            <div className="flex justify-between text-[#47464b]">
              <span>Subtotal:</span>
              <span className="font-mono">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-[#ba1a1a]">
                <span>Discount:</span>
                <span className="font-mono">
                  -{currencySymbol}
                  {discountAmount.toFixed(2)}
                </span>
              </div>
            )}

            {includeGst && (
              <div className="flex justify-between text-[#47464b]">
                <span>Tax ({taxRate}%):</span>
                <span className="font-mono">
                  +{currencySymbol}
                  {taxAmount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-end border-t border-[#d4d4d8] pt-1.5 text-sm font-bold text-[#1c1b1d]">
              <span>Final Total Due:</span>
              <span className="text-xl font-extrabold font-mono">
                {currencySymbol}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-3 bg-[#f6f2f5] border-t border-[#d4d4d8] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] font-bold text-xs cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleFinalSubmit}
            className="flex-1 py-2.5 rounded-xl bg-[#18181b] hover:bg-black text-white font-extrabold text-xs shadow-sm cursor-pointer"
          >
            COMPLETE & PRINT
          </button>
        </div>
      </div>

      {/* Split Payment Allocation Modal */}
      {isSplitModalOpen && (
        <SplitPaymentModal
          isOpen={isSplitModalOpen}
          grandTotal={grandTotal}
          currencySymbol={currencySymbol}
          initialSplit={splitDetails}
          onClose={() => setIsSplitModalOpen(false)}
          onSaveSplit={(split) => {
            setSplitDetails(split);
            setIsSplitModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
