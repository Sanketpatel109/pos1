import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  X,
  CheckCircle2,
  Banknote,
  QrCode,
  BookOpen,
  Printer,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BillItem, Customer } from '../../types';
import { db, doc, setDoc } from '../../firebase';
import { posSound } from '../../utils/sound';
import { CashTender } from './CashTender';
import { UPIPayment } from './UPIPayment';
import { KhataPayment } from './KhataPayment';

export type PaymentTab = 'CASH' | 'UPI' | 'KHATA';

export interface CompletedSnapshot {
  billNo: number;
  total: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  itemCount: number;
  items: BillItem[];
  method: PaymentTab;
  tendered: number;
  changeDue: number;
  customerName?: string;
  upiRefNumber?: string;
  timestamp: string;
}

export interface PaymentModalProps {
  isOpen: boolean;
  orderNumber: number;
  terminalPrefix?: string;
  items: BillItem[];
  subtotal: number;
  taxRate: number;
  currencySymbol?: string;
  customers?: Customer[];
  storeVpa?: string;
  storeName?: string;
  discount?: number;
  discountType?: 'percentage' | 'flat';
  discountAmount?: number;
  enableLoyaltyPoints?: boolean;
  loyaltyPointValue?: number;
  onClose: () => void;
  onCompleteSale: (details: {
    billNo: number;
    paymentMethod: 'CASH' | 'UPI' | 'KHATA';
    tenderedAmount: number;
    changeDue: number;
    items: BillItem[];
    subtotal: number;
    taxAmount: number;
    discount?: number;
    discountAmount?: number;
    total: number;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    upiRefNumber?: string;
    isVerified?: boolean;
    verificationMethod?: 'soundbox' | 'utr' | 'gateway' | 'cash_tender';
    redeemedPoints?: number;
    pointsDiscount?: number;
  }) => void;
  onResetAndNewBill: () => void;
  onPrintAndNextCustomer?: (snapshot: CompletedSnapshot) => void;
  onDoneNoPrint?: () => void;
  onPrintDirectReceipt?: () => void;
  onAddNewCustomer?: (name: string, phone: string, creditLimit?: number) => Customer | void;
  canStaffKhata?: boolean;
  onRequestKhataAuth?: (onApproved: () => void) => void;
  onRequestCreditLimitOverride?: (customerName: string, amount: number, limit: number, onApproved: () => void) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  orderNumber,
  items,
  subtotal,
  taxRate,
  currencySymbol = '₹',
  customers = [],
  storeVpa = 'anandsupermarket@okaxis',
  storeName = 'Anand Supermarket',
  discount = 0,
  discountType = 'percentage',
  discountAmount = 0,
  enableLoyaltyPoints = true,
  loyaltyPointValue = 1,
  onClose,
  onCompleteSale,
  onResetAndNewBill,
  onPrintAndNextCustomer,
  onDoneNoPrint,
  onPrintDirectReceipt,
  onAddNewCustomer,
  canStaffKhata = true,
  onRequestKhataAuth,
  onRequestCreditLimitOverride,
}) => {
  const [activeTab, setActiveTab] = useState<PaymentTab>('CASH');
  const [tenderedInput, setTenderedInput] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [completedSnapshot, setCompletedSnapshot] = useState<CompletedSnapshot | null>(null);
  const [completedBillNo, setCompletedBillNo] = useState<number>(orderNumber);
  const [completedMethod, setCompletedMethod] = useState<'CASH' | 'UPI' | 'KHATA'>('CASH');
  const [completedCustomerName, setCompletedCustomerName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [redeemedPoints, setRedeemedPoints] = useState<number>(0);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');

  const totalItemCount = items.reduce((acc, it) => acc + it.quantity, 0);
  const taxAmount = (subtotal * taxRate) / 100;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;
  const pointValue = loyaltyPointValue || 1;
  const pointsDiscountAmount =
    enableLoyaltyPoints !== false && redeemedPoints > 0
      ? Math.round(redeemedPoints * pointValue * 100) / 100
      : 0;

  const netTotal = Math.max(
    0,
    Math.round((subtotal - discountAmount - pointsDiscountAmount + taxAmount) * 100) / 100
  );

  const prevIsOpenRef = useRef(false);

  // Whenever modal opens, initialize default tender to exact total
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setIsSuccess(false);
      setCompletedSnapshot(null);
      setIsSubmitting(false);
      setCompletedBillNo(orderNumber);
      setCompletedMethod('CASH');
      setCompletedCustomerName('');
      setRedeemedPoints(0);
      setSelectedCustomerId('');
      setIsCustomerSearchOpen(false);
      setCustomerSearchQuery('');
      setTenderedInput(netTotal > 0 ? netTotal.toString() : '');
      setActiveTab('CASH');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, orderNumber, netTotal]);

  // Keyboard navigation for Desktop
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcuts on Success Screen
      if (isSuccess) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handlePrintAndNextCustomer();
        } else if (e.key === 'Escape' || e.key === ' ') {
          e.preventDefault();
          handleDoneNoPrint();
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handlePrintAndNextCustomer();
        } else if (e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          handleShareWhatsApp();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Quick tab switches: 1 = Cash, 2 = UPI, 3 = Khata
      if (e.key === '1' && (e.metaKey || e.altKey || e.ctrlKey)) {
        e.preventDefault();
        setActiveTab('CASH');
      } else if (e.key === '2' && (e.metaKey || e.altKey || e.ctrlKey)) {
        e.preventDefault();
        setActiveTab('UPI');
      } else if (e.key === '3' && (e.metaKey || e.altKey || e.ctrlKey)) {
        e.preventDefault();
        setActiveTab('KHATA');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSuccess, onResetAndNewBill, onClose]);

  if (!isOpen) return null;

  const parsedTendered = parseFloat(tenderedInput) || 0;
  const changeDue = Math.max(0, parsedTendered - netTotal);

  // Common Bill persistence helper
  const persistBillRecord = async (
    method: 'CASH' | 'UPI' | 'KHATA',
    extraDetails?: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      upiRefNumber?: string;
      isVerified?: boolean;
      verificationMethod?: 'soundbox' | 'utr' | 'gateway' | 'cash_tender';
    }
  ) => {
    const timestamp = new Date().toISOString();
    const billRecord = {
      id: `bill-${orderNumber}-${Date.now()}`,
      billNo: orderNumber,
      items: items.map((it) => ({
        id: it.id,
        name: it.name,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        total: it.unitPrice * it.quantity,
        note: it.note || '',
      })),
      subtotal,
      taxRate,
      taxAmount,
      total: netTotal,
      paymentMethod: method,
      tenderedAmount: method === 'CASH' ? parsedTendered : netTotal,
      changeDue: method === 'CASH' ? changeDue : 0,
      timestamp,
      ...extraDetails,
    };

    // 1. LocalStorage bills history backup
    try {
      const existingBillsRaw = localStorage.getItem('monopos_bills_history');
      const existingBills = existingBillsRaw ? JSON.parse(existingBillsRaw) : [];
      existingBills.unshift(billRecord);
      localStorage.setItem('monopos_bills_history', JSON.stringify(existingBills.slice(0, 300)));
    } catch (lsErr) {
      console.warn('LocalStorage bills backup failed:', lsErr);
    }

    // 2. Firestore "bills" collection snapshot
    try {
      const billRef = doc(db, 'bills', billRecord.id);
      await setDoc(billRef, billRecord, { merge: true });
    } catch (firestoreErr) {
      console.warn('Firestore bill snapshot saved locally / cloud deferred:', firestoreErr);
    }

    // Snapshot immutable sale data for the Success Screen
    const snapshot: CompletedSnapshot = {
      billNo: orderNumber,
      total: netTotal,
      subtotal,
      taxRate,
      taxAmount,
      itemCount: totalItemCount,
      items: items.map((it) => ({ ...it })),
      method,
      tendered: method === 'CASH' ? parsedTendered : netTotal,
      changeDue: method === 'CASH' ? changeDue : 0,
      customerName: extraDetails?.customerName,
      upiRefNumber: extraDetails?.upiRefNumber,
      timestamp,
    };
    setCompletedSnapshot(snapshot);
    setCompletedBillNo(orderNumber);
    setCompletedMethod(method);
    if (extraDetails?.customerName) {
      setCompletedCustomerName(extraDetails.customerName);
    }
    setIsSuccess(true);

    // 3. Parent callback
    onCompleteSale({
      billNo: orderNumber,
      paymentMethod: method,
      tenderedAmount: method === 'CASH' ? parsedTendered : netTotal,
      changeDue: method === 'CASH' ? changeDue : 0,
      items,
      subtotal,
      taxAmount,
      discount,
      discountAmount,
      total: netTotal,
      customerId: extraDetails?.customerId || selectedCustomer?.id,
      customerName: extraDetails?.customerName || selectedCustomer?.name,
      customerPhone: extraDetails?.customerPhone || selectedCustomer?.phone,
      redeemedPoints: redeemedPoints > 0 ? redeemedPoints : undefined,
      pointsDiscount: pointsDiscountAmount > 0 ? pointsDiscountAmount : undefined,
      ...extraDetails,
    });
  };


  // 1. CASH COMPLETION
  const handleCompleteCashSale = async () => {
    if (parsedTendered < netTotal || netTotal <= 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      posSound?.playSuccess?.();
      await persistBillRecord('CASH', {
        verificationMethod: 'cash_tender',
        isVerified: true,
      });
    } catch (err) {
      console.error('Failed to complete cash sale:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. UPI COMPLETION
  const handleCompleteUpiSale = async (details: {
    upiRefNumber?: string;
    isVerified: boolean;
    verificationMethod: 'soundbox' | 'utr' | 'gateway';
  }) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      posSound?.playSuccess?.();
      await persistBillRecord('UPI', {
        upiRefNumber: details.upiRefNumber,
        isVerified: details.isVerified,
        verificationMethod: details.verificationMethod,
      });
    } catch (err) {
      console.error('Failed to complete UPI sale:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. KHATA COMPLETION
  const handleCompleteKhataSale = async (details: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    previousDue: number;
    newTotalDue: number;
  }) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      posSound?.playSuccess?.();

      // 1. Update customer's outstanding balance in Firestore
      try {
        const customerRef = doc(db, 'customers', details.customerId);
        await setDoc(
          customerRef,
          {
            creditBalance: details.newTotalDue,
            lastBilledAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (firestoreCustErr) {
        console.warn('Firestore customer balance update deferred/offline:', firestoreCustErr);
      }

      // 2. Save bill to Firestore with paymentMethod: "KHATA"
      await persistBillRecord('KHATA', {
        customerId: details.customerId,
        customerName: details.customerName,
        customerPhone: details.customerPhone,
      });
    } catch (err) {
      console.error('Failed to complete Khata debit sale:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp receipt summary formatter
  const generateReceiptSummaryText = () => {
    const formattedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const snapItems = completedSnapshot ? completedSnapshot.items : items;
    const snapBillNo = completedSnapshot ? completedSnapshot.billNo : completedBillNo;
    const snapCustomer = completedSnapshot ? (completedSnapshot.customerName || '') : completedCustomerName;
    const snapSubtotal = completedSnapshot ? completedSnapshot.subtotal : subtotal;
    const snapTaxAmount = completedSnapshot ? completedSnapshot.taxAmount : taxAmount;
    const snapTaxRate = completedSnapshot ? completedSnapshot.taxRate : taxRate;
    const snapTotal = completedSnapshot ? completedSnapshot.total : netTotal;
    const snapMethod = completedSnapshot ? completedSnapshot.method : completedMethod;
    const snapChange = completedSnapshot ? completedSnapshot.changeDue : changeDue;

    let text = `*${storeName}*\n`;
    text += `Bill #${snapBillNo} | ${formattedDate} ${formattedTime}\n`;
    if (snapCustomer) {
      text += `Customer: ${snapCustomer}\n`;
    }
    text += `--------------------------------\n`;
    snapItems.forEach((it) => {
      text += `${it.name} x${it.quantity} = ${currencySymbol}${(it.unitPrice * it.quantity).toFixed(2)}\n`;
    });
    text += `--------------------------------\n`;
    text += `Subtotal: ${currencySymbol}${snapSubtotal.toFixed(2)}\n`;
    if (snapTaxAmount > 0) {
      text += `GST (${snapTaxRate}%): ${currencySymbol}${snapTaxAmount.toFixed(2)}\n`;
    }
    text += `Total: *${currencySymbol}${snapTotal.toFixed(2)}*\n`;
    text += `Payment Mode: ${
      snapMethod === 'CASH'
        ? 'Cash'
        : snapMethod === 'UPI'
        ? 'UPI QR'
        : 'Khata'
    }\n`;
    if (snapMethod === 'CASH' && snapChange > 0) {
      text += `Change Returned: ${currencySymbol}${snapChange.toFixed(2)}\n`;
    }
    text += `Thank you for shopping with us!`;
    return text;
  };

  const handleShareWhatsApp = () => {
    posSound?.playTap?.();
    const receiptSummaryText = generateReceiptSummaryText();
    const url = `https://wa.me/?text=${encodeURIComponent(receiptSummaryText)}`;
    window.open(url, '_blank');
  };

  const handlePrintReceipt = () => {
    posSound?.playTap?.();
    if (onPrintDirectReceipt) {
      onPrintDirectReceipt();
    } else {
      window.print();
    }
  };

  const handlePrintAndNextCustomer = () => {
    posSound?.playTap?.();
    const snapshot: CompletedSnapshot = completedSnapshot || {
      billNo: completedBillNo || orderNumber,
      total: displayTotal,
      subtotal: displaySubtotal,
      taxRate,
      taxAmount,
      itemCount: displayItemCount,
      items: displayItems.map((it) => ({ ...it })),
      method: displayMethod,
      tendered: displayTendered,
      changeDue: displayChangeDue,
      customerName: displayCustomerName,
      timestamp: new Date().toISOString(),
    };

    if (onPrintAndNextCustomer) {
      onPrintAndNextCustomer(snapshot);
    } else {
      handlePrintReceipt();
      if (onDoneNoPrint) {
        onDoneNoPrint();
      } else {
        onResetAndNewBill();
      }
    }
  };

  const handleDoneNoPrint = () => {
    posSound?.playTap?.();
    if (onDoneNoPrint) {
      onDoneNoPrint();
    } else {
      onResetAndNewBill();
    }
  };

  // Safe display fallbacks
  const displayBillNo = completedSnapshot ? completedSnapshot.billNo : completedBillNo;
  const displayItems = completedSnapshot ? completedSnapshot.items : items;
  const displayItemCount = completedSnapshot ? completedSnapshot.itemCount : totalItemCount;
  const displaySubtotal = completedSnapshot ? completedSnapshot.subtotal : subtotal;
  const displayTotal = completedSnapshot ? completedSnapshot.total : netTotal;
  const displayMethod = completedSnapshot ? completedSnapshot.method : completedMethod;
  const displayCustomerName = completedSnapshot ? (completedSnapshot.customerName || '') : completedCustomerName;
  const displayTendered = completedSnapshot ? completedSnapshot.tendered : parsedTendered;
  const displayChangeDue = completedSnapshot ? completedSnapshot.changeDue : changeDue;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center sm:p-4 animate-in fade-in duration-150">
      {/* 
        ========================================================================
        MULTI-VIEWPORT CONTAINER CONTRACT
        - Mobile (<640px): Fullscreen takeover (fixed inset-0 bg-white flex flex-col)
        - Desktop (>=640px): Centered focus dialog (max-w-lg rounded-3xl bg-white)
        ========================================================================
      */}
      <div
        id="payment-modal-container"
        className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg bg-card text-card-foreground sm:rounded-xl shadow-xl flex flex-col overflow-hidden border border-border"
      >
        {/* ================= HEADER (56px) ================= */}
        <div className="h-14 px-4 bg-card border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isSuccess && (
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
                title="Back to Register"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 truncate flex items-center gap-1.5">
                {isSuccess ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 animate-pulse" />
                    <span>Payment Settled • Bill #{displayBillNo}</span>
                  </>
                ) : (
                  `Bill #${orderNumber}`
                )}
              </h2>
              <p className="text-[11px] text-zinc-500 truncate tabular-nums tracking-tight">
                {displayItemCount} item{displayItemCount !== 1 ? 's' : ''} •{' '}
                {isSuccess ? 'Paid' : 'Subtotal'} {currencySymbol}
                {(isSuccess ? displayTotal : displaySubtotal).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isSuccess ? handleDoneNoPrint : onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
              title={isSuccess ? 'Start Next Sale' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= SUCCESS SCREEN ================= */}
        {isSuccess ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start text-center">
            {/* Animated Celebration Icon */}
            <div className="relative my-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs border border-primary/20 animate-in zoom-in-75 duration-200">
                <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.5]" />
              </div>
              <div className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-wide uppercase shadow-xs">
                PAID
              </div>
            </div>

            {/* Total Paid Callout */}
            <h3 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight tabular-nums mt-1">
              {currencySymbol}
              {displayTotal.toFixed(2)}
            </h3>

            <p className="text-xs sm:text-sm text-zinc-600 mt-1 font-medium flex items-center justify-center gap-1.5 flex-wrap">
              <span>Bill #{displayBillNo} settled via</span>
              <span className="inline-flex items-center gap-1 font-medium text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-lg text-xs border border-zinc-200">
                {displayMethod === 'CASH' ? (
                  <>
                    <Banknote className="w-3.5 h-3.5 text-primary" /> Cash Tender
                  </>
                ) : displayMethod === 'UPI' ? (
                  <>
                    <QrCode className="w-3.5 h-3.5 text-primary" /> UPI / QR
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" /> Khata (Udhar)
                  </>
                )}
              </span>
              {displayCustomerName && (
                <span className="text-xs text-zinc-700 font-semibold">({displayCustomerName})</span>
              )}
            </p>

            {/* Kirana Cash & Change Due Breakdown */}
            {displayMethod === 'CASH' && (
              <div className="w-full max-w-sm mt-4 p-3.5 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-between text-left shadow-xs">
                <div>
                  <div className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                    Cash Received
                  </div>
                  <div className="text-sm font-bold text-zinc-800 tabular-nums tracking-tight">
                    {currencySymbol}{displayTendered.toFixed(2)}
                  </div>
                </div>

                <div className="h-8 w-px bg-primary/20" />

                <div className="text-right">
                  <div className="text-[11px] font-bold text-primary uppercase tracking-wide flex items-center justify-end gap-1">
                    <Banknote className="w-3.5 h-3.5 text-primary" />
                    Change Due
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-primary tabular-nums tracking-tight">
                    {currencySymbol}{displayChangeDue.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Bill Items Snapshot */}
            {displayItems.length > 0 && (
              <div className="w-full max-w-sm mt-3 p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-left">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
                    Items Sold ({displayItemCount})
                  </span>
                  <span>Amt</span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1 text-xs text-zinc-700">
                  {displayItems.slice(0, 4).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="truncate pr-2">
                        {it.name} <strong className="text-zinc-900 font-medium">×{it.quantity}</strong>
                      </span>
                      <span className="font-semibold tabular-nums tracking-tight text-zinc-800 shrink-0">
                        {currencySymbol}{(it.unitPrice * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {displayItems.length > 4 && (
                    <div className="text-[11px] text-zinc-400 italic pt-0.5">
                      + {displayItems.length - 4} more items...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Action Hub: One-Tap Print & Next Customer vs Done (No Print) */}
            <div className="mt-4 flex flex-col gap-2.5 w-full max-w-sm">
              {/* Primary 1-Tap Combined Action (Hardware & Execution) */}
              <button
                type="button"
                onClick={handlePrintAndNextCustomer}
                className="w-full h-12 sm:h-13 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-medium text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xs cursor-pointer transition-all"
              >
                <Printer className="w-5 h-5" />
                <span>Print & Next Customer</span>
                <span className="inline-flex items-center text-[11px] font-medium bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-lg border border-primary/30">
                  Enter ↵
                </span>
              </button>

              {/* Secondary Actions: Done (No Print) & WhatsApp Bill */}
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={handleDoneNoPrint}
                  className="h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-zinc-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                  <span>Done (No Print)</span>
                  <span className="hidden sm:inline-block text-[10px] bg-white text-zinc-600 px-1 py-0.5 rounded border border-zinc-200">
                    Esc
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="h-11 rounded-xl bg-primary/80 hover:bg-primary/70 text-primary-foreground font-medium text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  <Share2 className="w-4 h-4 text-primary-foreground" />
                  <span>WhatsApp Bill</span>
                  <span className="hidden sm:inline-block text-[10px] bg-primary/60 text-primary-foreground px-1 py-0.5 rounded border border-primary/30">
                    W
                  </span>
                </button>
              </div>

              <p className="text-[11px] text-zinc-400 text-center mt-0.5 font-medium">
                Fast counter queue • Press <kbd className="text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded text-[10px] border border-zinc-200 font-medium">Enter</kbd> to Print & Next or <kbd className="text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded text-[10px] border border-zinc-200">Esc</kbd> for Done
              </p>
            </div>
          </div>
        ) : (
          /* ================= ACTIVE CHECKOUT FLOW ================= */
          <div className="flex-1 flex flex-col min-h-0 bg-zinc-50/50">
            {/* Net Payable Callout */}
            <div className="px-5 py-4 bg-white border-b border-zinc-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Net Payable Total
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight tabular-nums">
                  {currencySymbol}
                  {netTotal.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                {discountAmount > 0 && (
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    Disc: -{currencySymbol}{discountAmount.toFixed(2)}
                  </div>
                )}
                {pointsDiscountAmount > 0 && (
                  <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    Points: -{currencySymbol}{pointsDiscountAmount.toFixed(2)} ({redeemedPoints} pts)
                  </div>
                )}
                <span className="text-[11px] text-zinc-400 font-medium">GST Included</span>
                <div className="text-xs font-semibold text-zinc-600 tabular-nums tracking-tight">
                  {currencySymbol}
                  {taxAmount.toFixed(2)} ({taxRate}%)
                </div>
              </div>

            </div>

            {/* Customer Loyalty & Points Redemption Section */}
            {enableLoyaltyPoints !== false && (
              <div className="px-4 py-2.5 bg-card border-b border-border text-xs">
                {!selectedCustomer ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Star className="size-3.5 fill-amber-500" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Customer Loyalty & Rewards
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setIsCustomerSearchOpen(!isCustomerSearchOpen)}
                      className="text-xs h-7 px-2.5 gap-1"
                    >
                      <Users className="size-3" />
                      <span>{isCustomerSearchOpen ? 'Cancel' : 'Link Customer'}</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                          <Star className="size-3.5 fill-amber-500" />
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-foreground mr-1.5">
                            {selectedCustomer.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {selectedCustomer.phone}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-semibold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                          <Star className="size-2.5 fill-amber-500 mr-1" />
                          {selectedCustomer.loyaltyPoints || 0} pts
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setSelectedCustomerId('');
                            setRedeemedPoints(0);
                          }}
                          className="size-6 text-muted-foreground hover:text-foreground"
                          title="Unlink Customer"
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Points Redemption Action */}
                    {(selectedCustomer.loyaltyPoints || 0) > 0 ? (
                      <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-xs">
                        <div>
                          {redeemedPoints > 0 ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                              ✓ Redeemed {redeemedPoints} pts (-{currencySymbol}{pointsDiscountAmount.toFixed(2)})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Available: <strong className="text-foreground">{selectedCustomer.loyaltyPoints} pts</strong> ({currencySymbol}{((selectedCustomer.loyaltyPoints || 0) * pointValue).toFixed(2)})
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="xs"
                          variant={redeemedPoints > 0 ? 'outline' : 'default'}
                          onClick={() => {
                            if (redeemedPoints > 0) {
                              setRedeemedPoints(0);
                            } else {
                              const maxPossiblePoints = Math.min(
                                selectedCustomer.loyaltyPoints || 0,
                                Math.floor(subtotal / pointValue)
                              );
                              setRedeemedPoints(maxPossiblePoints);
                            }
                          }}
                          className="h-7 px-2.5 text-xs font-semibold"
                        >
                          {redeemedPoints > 0 ? 'Remove' : `Redeem -${currencySymbol}${((selectedCustomer.loyaltyPoints || 0) * pointValue).toFixed(2)}`}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        Customer will automatically earn loyalty points on this order.
                      </p>
                    )}
                  </div>
                )}

                {/* Customer Search Dropdown */}
                {isCustomerSearchOpen && !selectedCustomer && (
                  <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                    <Input
                      type="text"
                      placeholder="Search customer by name or phone..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="h-8 text-xs"
                      autoFocus
                    />
                    <div className="max-h-36 overflow-y-auto divide-y divide-border border border-border rounded-lg bg-background">
                      {customers
                        .filter(
                          (c) =>
                            c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                            c.phone.includes(customerSearchQuery)
                        )
                        .slice(0, 5)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setIsCustomerSearchOpen(false);
                              setCustomerSearchQuery('');
                            }}
                            className="w-full text-left p-2 hover:bg-muted text-xs flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <p className="font-semibold text-foreground">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400">
                              <Star className="size-2.5 fill-amber-500 mr-1" />
                              {c.loyaltyPoints || 0} pts
                            </Badge>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3-Tab Mode Switcher */}
            <div className="p-3 bg-card border-b border-border">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('CASH')}
                  className={`h-10 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'CASH'
                      ? 'bg-card text-primary font-semibold shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-primary" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('UPI')}
                  className={`h-10 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'UPI'
                      ? 'bg-card text-primary font-semibold shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-primary" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('KHATA')}
                  className={`h-10 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'KHATA'
                      ? 'bg-card text-primary font-semibold shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>Khata (Udhar)</span>
                </button>
              </div>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col min-h-0">
              {activeTab === 'CASH' && (
                <CashTender
                  total={netTotal}
                  currencySymbol={currencySymbol}
                  tenderedInput={tenderedInput}
                  onTenderedChange={setTenderedInput}
                  onCompleteSale={handleCompleteCashSale}
                  isSubmitting={isSubmitting}
                />
              )}

              {activeTab === 'UPI' && (
                <UPIPayment
                  total={netTotal}
                  billNo={orderNumber}
                  currencySymbol={currencySymbol}
                  storeVpa={storeVpa}
                  storeName={storeName}
                  onConfirmPayment={handleCompleteUpiSale}
                  isSubmitting={isSubmitting}
                />
              )}

              {activeTab === 'KHATA' && (
                <KhataPayment
                  total={netTotal}
                  currencySymbol={currencySymbol}
                  customers={customers}
                  canStaffKhata={canStaffKhata}
                  onRequestKhataAuth={onRequestKhataAuth}
                  onRequestCreditLimitOverride={onRequestCreditLimitOverride}
                  onConfirmPayment={handleCompleteKhataSale}
                  onAddNewCustomer={onAddNewCustomer}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
