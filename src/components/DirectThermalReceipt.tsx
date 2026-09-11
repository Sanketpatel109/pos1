import React from 'react';
import { Order, ShopSettings } from '../types';
import { calculateOrderTaxFromSnapshot } from '../constants/taxRates';

export interface DirectThermalReceiptProps {
  order: Order | null;
  shopSettings: ShopSettings;
}

export const DirectThermalReceipt: React.FC<DirectThermalReceiptProps> = ({
  order,
  shopSettings,
}) => {
  if (!order) return null;

  const dateObj = new Date(order.createdAt || Date.now());
  const formattedDate = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const currencySymbol = shopSettings.currencySymbol || '₹';
  const prefix = shopSettings.terminalPrefix || 'A';
  const invoiceNo = order.orderNumberFormatted || `${prefix}-${order.orderNumber}`;

  // Always use the invoice's saved tax snapshots, never live catalog data
  const taxSnapshotTotals = calculateOrderTaxFromSnapshot(order.items);
  const displaySubtotal =
    taxSnapshotTotals.taxableSubtotal > 0 ? taxSnapshotTotals.taxableSubtotal : order.subtotal;
  const totalTax =
    taxSnapshotTotals.totalTax > 0 ? taxSnapshotTotals.totalTax : (order.taxAmount || 0);
  const cgstAmount =
    taxSnapshotTotals.totalCgst > 0 ? taxSnapshotTotals.totalCgst : totalTax / 2;
  const sgstAmount =
    taxSnapshotTotals.totalSgst > 0 ? taxSnapshotTotals.totalSgst : totalTax / 2;
  const taxRate = order.taxRate || 0;

  return (
    <div
      id="direct-thermal-receipt"
      className="direct-thermal-receipt-print-only print:m-0 w-full max-w-[320px] mx-auto bg-white text-black text-[11px] leading-tight p-2"
    >
      {/* Store Header */}
      <div className="text-center space-y-0.5 border-b border-dashed border-black pb-2 mb-2">
        {shopSettings.logoUrl && shopSettings.printLogoOnReceipt !== false && (
          <div className="mb-1 flex justify-center">
            <img
              src={shopSettings.logoUrl}
              alt={shopSettings.shopName}
              className="max-h-12 max-w-[130px] object-contain mx-auto filter grayscale contrast-200"
            />
          </div>
        )}
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-black">
          {shopSettings.shopName}
        </h3>
        {shopSettings.tagline && (
          <p className="text-[10px] text-zinc-600">{shopSettings.tagline}</p>
        )}
        <p className="text-[10px] text-zinc-700">{shopSettings.address}</p>
        <p className="text-[10px] text-zinc-700">Tel: {shopSettings.phone}</p>
        {shopSettings.gstin && (
          <p className="text-[10px] font-bold text-black">GSTIN: {shopSettings.gstin}</p>
        )}
      </div>

      {/* Invoice Meta */}
      <div className="space-y-0.5 border-b border-dashed border-black pb-2 mb-2 text-[10px]">
        {Boolean(shopSettings.enableDailyToken) && (
          <div className="my-1 py-1 px-2 border border-black rounded text-center flex justify-between items-center font-bold">
            <span>PICKUP TOKEN:</span>
            <span className="text-base font-black">
              #{String(order.tokenNumber || ((order.orderNumber - 1) % 99999) + 1).padStart(2, '0')}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-zinc-600">Invoice No:</span>
          <span className="font-bold">#{invoiceNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Date & Time:</span>
          <span>{formattedDate} {formattedTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Customer:</span>
          <span className="font-semibold truncate max-w-[170px]">
            {order.customerName || 'Walk-in Customer'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Payment Mode:</span>
          <span className="font-bold uppercase">{order.paymentMethod}</span>
        </div>
        {order.staffName && (
          <div className="flex justify-between">
            <span className="text-zinc-600">Cashier:</span>
            <span>{order.staffName}</span>
          </div>
        )}
      </div>

      {/* Itemized Table */}
      <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2">
        <div className="grid grid-cols-12 text-[10px] font-bold border-b border-black pb-1 uppercase">
          <span className="col-span-6">Item</span>
          <span className="col-span-2 text-center">Qty</span>
          <span className="col-span-2 text-right">Rate</span>
          <span className="col-span-2 text-right">Total</span>
        </div>

        {order.items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 text-[10px] py-0.5">
            <span className="col-span-6 truncate font-medium">{item.name}</span>
            <span className="col-span-2 text-center font-semibold">{item.quantity}</span>
            <span className="col-span-2 text-right">{item.unitPrice.toFixed(0)}</span>
            <span className="col-span-2 text-right font-bold">
              {(item.unitPrice * item.quantity).toFixed(0)}
            </span>
          </div>
        ))}
      </div>

      {/* Calculations & Totals */}
      <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2 text-[10px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{currencySymbol}{displaySubtotal.toFixed(2)}</span>
        </div>

        {order.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{currencySymbol}{order.discount.toFixed(2)}</span>
          </div>
        )}

        {taxSnapshotTotals.taxRateBreakdown.filter(
          (b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0)
        ).length > 0 ? (
          taxSnapshotTotals.taxRateBreakdown
            .filter((b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0))
            .map((b) => (
              <div key={b.rate} className="flex justify-between text-zinc-700">
                <span>GST {b.rate}% (CGST {(b.rate / 2).toFixed(1)}% + SGST {(b.rate / 2).toFixed(1)}%):</span>
                <span>+{currencySymbol}{b.totalTax.toFixed(2)}</span>
              </div>
            ))
        ) : totalTax > 0 ? (
          <div className="flex justify-between text-zinc-700">
            <span>GST {taxRate}% (CGST {(taxRate / 2).toFixed(1)}% + SGST {(taxRate / 2).toFixed(1)}%):</span>
            <span>+{currencySymbol}{totalTax.toFixed(2)}</span>
          </div>
        ) : null}

        {totalTax > 0 && (
          <div className="flex justify-between font-bold border-t border-dotted border-zinc-400 pt-0.5">
            <span>Total Tax:</span>
            <span>+{currencySymbol}{totalTax.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-xs font-black border-t border-black pt-1">
          <span>GRAND TOTAL:</span>
          <span>{currencySymbol}{order.total.toFixed(2)}</span>
        </div>

        {/* Cash Tender & Change Info */}
        {order.paymentMethod === 'CASH' && order.tenderedAmount !== undefined && order.tenderedAmount > 0 && (
          <div className="pt-1 border-t border-dotted border-zinc-500 space-y-0.5">
            <div className="flex justify-between">
              <span>Cash Received:</span>
              <span className="font-bold">{currencySymbol}{order.tenderedAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Change Returned:</span>
              <span className="font-black">
                {currencySymbol}
                {(order.changeDue !== undefined
                  ? order.changeDue
                  : Math.max(0, order.tenderedAmount - order.total)
                ).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Settlement Note */}
      <div className="text-center py-1 text-[10px] space-y-0.5 border-b border-dashed border-black pb-2 mb-2">
        {order.paymentMethod === 'ONLINE' ? (
          <>
            <div className="font-bold uppercase tracking-wider">
              PAID IN FULL • VERIFIED UPI
            </div>
            {order.upiRefNumber && (
              <div>UTR / Ref: {order.upiRefNumber}</div>
            )}
          </>
        ) : order.paymentMethod === 'CASH' ? (
          <div className="font-bold uppercase tracking-wider">
            PAID IN FULL • CASH TENDER
          </div>
        ) : (
          <div className="font-bold uppercase tracking-wider">
            KHATA CREDIT DEBIT RECORD
          </div>
        )}
      </div>

      {/* Barcode & Footer */}
      <div className="text-center pt-1 space-y-1 text-[10px]">
        <div className="border-y border-black py-0.5 tracking-[0.2em] font-bold">
          *ORD-{order.orderNumber}-2026*
        </div>
        <p className="font-bold">*** THANK YOU, VISIT AGAIN ***</p>
        {shopSettings.footerMessage && (
          <p className="text-[9px] text-zinc-600">{shopSettings.footerMessage}</p>
        )}
      </div>
    </div>
  );
};
