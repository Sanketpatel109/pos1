import React, { useRef } from 'react';
import {
  Printer,
  Share2,
  X,
  CheckCircle,
  Copy,
  Receipt,
  QrCode,
} from '../icons/faIcons';
import { Order, ShopSettings, BillItem } from '../types';
import { calculateOrderTaxFromSnapshot } from '../constants/taxRates';

interface ReceiptModalProps {
  isOpen: boolean;
  order: Order | null;
  orderNumber?: number;
  items?: BillItem[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
  shopSettings: ShopSettings;
  isDuplicate?: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  order,
  orderNumber = 42,
  items = [],
  subtotal = 0,
  taxRate = 0,
  taxAmount = 0,
  total = 0,
  shopSettings,
  isDuplicate = false,
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Resolve active data from order or live items
  const activeOrderNum = order ? order.orderNumber : orderNumber;
  const activeItems = order ? order.items : items;
  
  // Calculate immutable tax totals from snapshot
  const taxSnapshotTotals = calculateOrderTaxFromSnapshot(activeItems);
  const activeSubtotal =
    taxSnapshotTotals.taxableSubtotal > 0
      ? taxSnapshotTotals.taxableSubtotal
      : order
      ? order.subtotal
      : subtotal;
  const activeTaxRate = order ? order.taxRate : taxRate;
  const activeTaxAmount =
    taxSnapshotTotals.totalTax > 0
      ? taxSnapshotTotals.totalTax
      : order
      ? order.taxAmount
      : taxAmount;
  const activeDiscount = order ? order.discount : 0;
  const activeTotal = order ? order.total : total;
  const activeDate = order ? new Date(order.createdAt) : new Date();
  const activePaymentMethod = order ? order.paymentMethod : 'CASH';
  const activeCustomerName = order ? order.customerName : 'Walk-in Customer';
  const activeCustomerPhone = order ? order.customerPhone : '';

  const formattedDate = activeDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = activeDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    let text = `*${shopSettings.shopName}*\n`;
    text += `Invoice #${activeOrderNum} | ${formattedDate} ${formattedTime}\n`;
    text += `Customer: ${activeCustomerName}\n`;
    text += `--------------------------------\n`;
    activeItems.forEach((i) => {
      text += `${i.name} x ${i.quantity} = ${shopSettings.currencySymbol}${(i.unitPrice * i.quantity).toFixed(2)}\n`;
    });
    text += `--------------------------------\n`;
    text += `Total: *${shopSettings.currencySymbol}${activeTotal.toFixed(2)}* (${activePaymentMethod})\n`;
    if (activePaymentMethod === 'CASH' && order?.tenderedAmount !== undefined && order.tenderedAmount > 0) {
      text += `Cash Tendered: ${shopSettings.currencySymbol}${order.tenderedAmount.toFixed(2)}\n`;
      const changeVal = order.changeDue !== undefined ? order.changeDue : Math.max(0, order.tenderedAmount - activeTotal);
      if (changeVal > 0) {
        text += `Change Returned: ${shopSettings.currencySymbol}${changeVal.toFixed(2)}\n`;
      }
    }
    text += `Thank you for your visit!`;

    const encoded = encodeURIComponent(text);
    if (activeCustomerPhone) {
      window.open(`https://wa.me/${activeCustomerPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl overflow-hidden flex flex-col max-h-[94vh] text-[#1c1b1d]">
        {/* Top Control Header */}
        <div className="px-4 py-3 border-b border-[#d4d4d8] flex items-center justify-between bg-[#f6f2f5]">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#18181b]" />
            <h2 className="font-bold text-sm text-[#1c1b1d]">Invoice #{activeOrderNum}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#77767b] hover:text-[#1c1b1d] hover:bg-[#eae7ea]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Container (Thermal Paper Simulation) */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#f0edf0] flex justify-center no-scrollbar">
          <div
            ref={receiptRef}
            className="w-full bg-white p-4 shadow-sm border border-[#d4d4d8] rounded-xl text-[#1c1b1d] font-mono text-xs space-y-3 print:m-0 print:border-none print:shadow-none"
          >
            {/* Store Header */}
            <div className="text-center space-y-1 border-b border-dashed border-[#77767b] pb-3">
              <div className="w-10 h-10 bg-[#18181b] text-white rounded-full mx-auto flex items-center justify-center font-bold text-sm">
                M
              </div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-[#1c1b1d]">
                {shopSettings.shopName}
              </h3>
              {shopSettings.tagline && (
                <p className="text-[10px] text-[#77767b]">{shopSettings.tagline}</p>
              )}
              <p className="text-[10px] text-[#47464b]">{shopSettings.address}</p>
              <p className="text-[10px] text-[#47464b]">Tel: {shopSettings.phone}</p>
              {shopSettings.gstin && (
                <p className="text-[10px] text-[#47464b] font-bold">
                  GSTIN: {shopSettings.gstin}
                </p>
              )}
              {(isDuplicate || order?.isDuplicate) && (
                <div className="mt-1.5 py-1 px-2 text-center bg-zinc-100 border-y border-dashed border-zinc-400 font-bold text-[11px] tracking-widest text-zinc-900 uppercase font-mono">
                  *** DUPLICATE COPY ***
                </div>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="text-[11px] space-y-0.5 border-b border-dashed border-[#77767b] pb-2">
              {Boolean(shopSettings.enableDailyToken) && (
                <div className="my-1.5 py-1.5 px-2 bg-slate-900 text-white rounded-lg flex items-center justify-between text-center">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300 block text-left">
                      PICKUP TOKEN
                    </span>
                    {order?.tableOrToken && (
                      <span className="text-[9px] text-slate-400 block text-left">
                        {order.tableOrToken}
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-black tracking-tight font-mono text-emerald-400">
                    #{String(order?.tokenNumber || (typeof activeOrderNum === 'number' ? ((activeOrderNum - 1) % 99999) + 1 : 1)).padStart(2, '0')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#77767b]">Invoice No:</span>
                <span className="font-bold">#{order?.orderNumberFormatted || `${shopSettings.terminalPrefix || 'A'}-${activeOrderNum}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77767b]">Date & Time:</span>
                <span>
                  {formattedDate} {formattedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77767b]">Customer:</span>
                <span className="font-semibold truncate max-w-[150px]">
                  {activeCustomerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#77767b]">Payment Mode:</span>
                <span className="font-bold uppercase">{activePaymentMethod}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="space-y-1.5 border-b border-dashed border-[#77767b] pb-3">
              <div className="grid grid-cols-12 text-[10px] font-bold text-[#77767b] border-b border-[#d4d4d8] pb-1 uppercase">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Rate</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              {activeItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px] py-0.5">
                  <span className="col-span-6 truncate font-medium">{item.name}</span>
                  <span className="col-span-2 text-center">{item.quantity}</span>
                  <span className="col-span-2 text-right">{item.unitPrice.toFixed(0)}</span>
                  <span className="col-span-2 text-right font-bold">
                    {(item.unitPrice * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations & Total */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-[#77767b] pb-2">
              <div className="flex justify-between text-[#47464b]">
                <span>Subtotal:</span>
                <span>
                  {shopSettings.currencySymbol}
                  {activeSubtotal.toFixed(2)}
                </span>
              </div>

              {activeDiscount > 0 && (
                <div className="flex justify-between text-[#ba1a1a]">
                  <span>Discount:</span>
                  <span>
                    -{shopSettings.currencySymbol}
                    {activeDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              {taxSnapshotTotals.taxRateBreakdown.filter(
                (b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0)
              ).length > 0 ? (
                taxSnapshotTotals.taxRateBreakdown
                  .filter((b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0))
                  .map((b) => (
                    <div key={b.rate} className="flex justify-between text-[#47464b]">
                      <span>GST {b.rate}% (CGST {(b.rate / 2).toFixed(1)}% + SGST {(b.rate / 2).toFixed(1)}%):</span>
                      <span>
                        +{shopSettings.currencySymbol}
                        {b.totalTax.toFixed(2)}
                      </span>
                    </div>
                  ))
              ) : activeTaxAmount > 0 ? (
                <div className="flex justify-between text-[#47464b]">
                  <span>GST {activeTaxRate}% (CGST {(activeTaxRate / 2).toFixed(1)}% + SGST {(activeTaxRate / 2).toFixed(1)}%):</span>
                  <span>
                    +{shopSettings.currencySymbol}
                    {activeTaxAmount.toFixed(2)}
                  </span>
                </div>
              ) : null}

              {activeTaxAmount > 0 && (
                <div className="flex justify-between font-bold text-[#1c1b1d] border-t border-dotted border-[#d4d4d8] pt-1">
                  <span>Total Tax:</span>
                  <span>
                    +{shopSettings.currencySymbol}
                    {activeTaxAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-extrabold text-[#1c1b1d] border-t border-[#d4d4d8] pt-1">
                <span>GRAND TOTAL:</span>
                <span>
                  {shopSettings.currencySymbol}
                  {activeTotal.toFixed(2)}
                </span>
              </div>

              {/* Cash Tendered & Change Return Slip Information */}
              {activePaymentMethod === 'CASH' && order?.tenderedAmount !== undefined && order.tenderedAmount > 0 && (
                <div className="pt-2 border-t border-dashed border-[#77767b] space-y-1 text-[11px]">
                  <div className="flex justify-between text-[#47464b]">
                    <span>Cash Tendered (Received):</span>
                    <span className="font-mono font-bold text-[#1c1b1d]">
                      {shopSettings.currencySymbol}{order.tenderedAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Change Returned:</span>
                    <span className="font-mono font-black text-xs">
                      {shopSettings.currencySymbol}
                      {(order.changeDue !== undefined
                        ? order.changeDue
                        : Math.max(0, order.tenderedAmount - activeTotal)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Status & Verification Proof (No payment QR on paid receipts) */}
            {activePaymentMethod === 'ONLINE' ? (
              <div className="text-center py-2 px-2 bg-emerald-50 rounded-xl border border-emerald-300 space-y-1 my-1">
                <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span>Paid In Full • Verified UPI</span>
                </div>
                {order?.upiRefNumber && (
                  <div className="text-[11px] font-mono font-black text-emerald-950">
                    UTR / Ref: {order.upiRefNumber}
                  </div>
                )}
                <div className="text-[9px] font-mono text-emerald-700">
                  Verification: {order?.verificationMethod?.toUpperCase() || 'CONFIRMED'} &middot; Status: SUCCESS
                </div>
              </div>
            ) : activePaymentMethod === 'CASH' ? (
              <div className="text-center py-2 px-2 bg-zinc-50 rounded-xl border border-zinc-300 space-y-0.5 my-1">
                <div className="text-[10px] font-black text-zinc-900 uppercase tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span>Paid In Full • Cash Tender</span>
                </div>
                <div className="text-[9px] font-mono text-zinc-600">
                  Cash collected at billing counter &middot; No balance due
                </div>
              </div>
            ) : (activePaymentMethod === 'CREDIT' || activePaymentMethod === 'KHATA' || order?.status === 'unpaid') ? (
              /* Reserve QR codes strictly for unpaid / Khata credit slips so customers can pay outstanding balance */
              shopSettings.upiId && (
                <div className="text-center py-2 px-1 bg-amber-50 rounded-xl border border-amber-300 space-y-1.5 my-1">
                  <div className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center justify-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-amber-800" />
                    <span>Unpaid Khata Credit • Scan to Pay</span>
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=4&data=${encodeURIComponent(
                        `upi://pay?pa=${shopSettings.upiId}&pn=${encodeURIComponent(
                          shopSettings.shopName
                        )}&am=${activeTotal.toFixed(2)}&cu=INR`
                      )}`}
                      alt="UPI QR Code"
                      className="w-24 h-24 border border-amber-300 rounded-lg p-0.5 bg-white shadow-2xs"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-[9px] font-mono text-amber-900 leading-tight">
                    <span className="font-bold">Balance Due: {shopSettings.currencySymbol}{activeTotal.toFixed(2)}</span>
                    <br />
                    <span>UPI ID: {shopSettings.upiId}</span>
                    <br />
                    <span className="text-[8px] text-amber-700">Scan with GPay, PhonePe, Paytm, or BHIM to clear balance</span>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center py-2 px-2 bg-zinc-50 rounded-xl border border-zinc-300 space-y-0.5 my-1">
                <div className="text-[10px] font-black text-zinc-900 uppercase tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span>Paid In Full • {activePaymentMethod}</span>
                </div>
                <div className="text-[9px] font-mono text-zinc-600">
                  Transaction Authorized &middot; No balance due
                </div>
              </div>
            )}

            {/* Barcode & Footer Note */}
            <div className="text-center pt-1 space-y-1">
              <div className="h-9 bg-repeating-linear-gradient flex items-center justify-center font-mono text-[10px] tracking-[0.25em] text-[#1c1b1d] border-y border-[#d4d4d8] py-1">
                *ORD-{activeOrderNum}-2026*
              </div>
              <p className="text-[10px] text-[#77767b] pt-1">
                *** THANK YOU, VISIT AGAIN ***
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-3 bg-[#f6f2f5] border-t border-[#d4d4d8] flex items-center gap-2 shrink-0">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>SHARE</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-[#18181b] hover:bg-black text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
