import React, { useRef } from 'react';
import {
  Printer,
  Share2,
  Edit3,
  X,
  CheckCircle,
  Copy,
  Receipt,
  QrCode,
} from 'lucide-react';
import { Order, ShopSettings, BillItem } from '../types';

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
  onClose: () => void;
  onEditOrder?: () => void;
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
  onClose,
  onEditOrder,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Resolve active data from order or live items
  const activeOrderNum = order ? order.orderNumber : orderNumber;
  const activeItems = order ? order.items : items;
  const activeSubtotal = order ? order.subtotal : subtotal;
  const activeTaxRate = order ? order.taxRate : taxRate;
  const activeTaxAmount = order ? order.taxAmount : taxAmount;
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
                  {shopSettings.currencySymbol === '₹' || shopSettings.marketRegion === 'IN'
                    ? `GSTIN: ${shopSettings.gstin}`
                    : `Tax ID / EIN: ${shopSettings.gstin}`}
                </p>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="text-[11px] space-y-0.5 border-b border-dashed border-[#77767b] pb-2">
              <div className="flex justify-between">
                <span className="text-[#77767b]">Invoice No:</span>
                <span className="font-bold">#{activeOrderNum}</span>
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

              {activeTaxAmount > 0 && (
                <>
                  {shopSettings.currencySymbol === '₹' || shopSettings.marketRegion === 'IN' ? (
                    <>
                      <div className="flex justify-between text-[#47464b]">
                        <span>CGST ({(activeTaxRate / 2).toFixed(1)}%):</span>
                        <span>
                          +{shopSettings.currencySymbol}
                          {(activeTaxAmount / 2).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#47464b]">
                        <span>SGST ({(activeTaxRate / 2).toFixed(1)}%):</span>
                        <span>
                          +{shopSettings.currencySymbol}
                          {(activeTaxAmount / 2).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-[#47464b]">
                      <span>Sales Tax ({activeTaxRate}%):</span>
                      <span>
                        +{shopSettings.currencySymbol}
                        {activeTaxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between text-sm font-extrabold text-[#1c1b1d] border-t border-[#d4d4d8] pt-1">
                <span>GRAND TOTAL:</span>
                <span>
                  {shopSettings.currencySymbol}
                  {activeTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* India UPI QR Code Payment Block */}
            {(shopSettings.currencySymbol === '₹' || shopSettings.marketRegion === 'IN') &&
              shopSettings.upiId && (
                <div className="text-center py-2 px-1 bg-[#faf8fb] rounded-xl border border-dashed border-[#d4d4d8] space-y-1.5">
                  <div className="text-[10px] font-bold text-[#1c1b1d] uppercase tracking-wider flex items-center justify-center gap-1">
                    <QrCode className="w-3 h-3 text-[#18181b]" />
                    <span>Scan & Pay via UPI</span>
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=4&data=${encodeURIComponent(
                        `upi://pay?pa=${shopSettings.upiId}&pn=${encodeURIComponent(
                          shopSettings.shopName
                        )}&am=${activeTotal.toFixed(2)}&cu=INR`
                      )}`}
                      alt="UPI QR Code"
                      className="w-24 h-24 border border-[#d4d4d8] rounded-lg p-0.5 bg-white"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-[9px] font-mono text-[#77767b] leading-tight">
                    <span>UPI ID: {shopSettings.upiId}</span>
                    <br />
                    <span className="text-[8px] text-[#99989d]">GPay · PhonePe · Paytm · BHIM</span>
                  </div>
                </div>
              )}

            {/* US Tip & Signature Guide */}
            {(shopSettings.currencySymbol === '$' || shopSettings.marketRegion === 'US') && (
              <div className="text-[10px] text-[#47464b] border-b border-dashed border-[#77767b] pb-2 space-y-1">
                <div className="font-bold text-[9px] text-[#77767b] uppercase">Suggested Gratuity:</div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span>15%: ${(activeSubtotal * 0.15).toFixed(2)}</span>
                  <span>18%: ${(activeSubtotal * 0.18).toFixed(2)}</span>
                  <span>20%: ${(activeSubtotal * 0.2).toFixed(2)}</span>
                </div>
                <div className="pt-2 flex justify-between text-[11px] font-mono">
                  <span>Tip: ____________</span>
                  <span>Total: ____________</span>
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
          {onEditOrder && (
            <button
              onClick={() => {
                onClose();
                onEditOrder();
              }}
              className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>EDIT</span>
            </button>
          )}

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
