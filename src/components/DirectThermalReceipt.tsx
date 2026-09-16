import React from 'react';
import { Order, ShopSettings } from '../types';
import { calculateOrderTaxFromSnapshot } from '../constants/taxRates';
import { printThermalHtml } from '../utils/thermalPrinter';

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

  const totalBaseUnitsSold = order.items.reduce(
    (sum, item) => sum + item.quantity * (item.multiplier || 1),
    0
  );
  const totalPacksSold = order.items.reduce((sum, item) => sum + item.quantity, 0);

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
          <span>{order.customerName || 'Walk-in'}</span>
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
          <div key={idx} className="py-0.5 border-b border-dotted border-zinc-200 last:border-0">
            <div className="grid grid-cols-12 text-[10px]">
              <span className="col-span-6 truncate font-medium">{item.name}</span>
              <span className="col-span-2 text-center font-semibold">{item.quantity}</span>
              <span className="col-span-2 text-right">{item.unitPrice.toFixed(0)}</span>
              <span className="col-span-2 text-right font-bold">
                {(item.unitPrice * item.quantity).toFixed(0)}
              </span>
            </div>
            {item.selectedPackName && (
              <div className="text-[8.5px] text-zinc-600 pl-1 font-mono">
                * {item.selectedPackName} (@ {currencySymbol}{(item.unitPrice / (item.multiplier || 1)).toFixed(2)}/unit)
              </div>
            )}
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

        {totalBaseUnitsSold !== totalPacksSold && (
          <div className="flex justify-between text-[9px] text-zinc-600 pt-0.5">
            <span>Total Base Units:</span>
            <span className="font-semibold">{totalBaseUnitsSold} units</span>
          </div>
        )}

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
        {shopSettings.receiptFooterNote && (
          <p className="text-[9px] text-zinc-600">{shopSettings.receiptFooterNote}</p>
        )}
      </div>
    </div>
  );
};

export function generateThermalReceiptHtml(order: Order, shopSettings: ShopSettings): string {
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

  const taxSnapshotTotals = calculateOrderTaxFromSnapshot(order.items);
  const displaySubtotal =
    taxSnapshotTotals.taxableSubtotal > 0 ? taxSnapshotTotals.taxableSubtotal : order.subtotal;
  const totalTax =
    taxSnapshotTotals.totalTax > 0 ? taxSnapshotTotals.totalTax : (order.taxAmount || 0);
  const taxRate = order.taxRate || 0;

  const totalBaseUnitsSold = order.items.reduce(
    (sum, item) => sum + item.quantity * (item.multiplier || 1),
    0
  );
  const totalPacksSold = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const itemsHtml = order.items
    .map((item) => {
      const packRow = item.selectedPackName
        ? `<div style="font-size: 9px; color: #555; padding-left: 4px;">* ${item.selectedPackName} (@ ${currencySymbol}${(item.unitPrice / (item.multiplier || 1)).toFixed(2)}/unit)</div>`
        : '';
      return `
        <div style="padding: 2px 0; border-bottom: 1px dotted #e5e5e5;">
          <div class="row">
            <span style="max-width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</span>
            <span style="text-align: center;">${item.quantity}</span>
            <span style="text-align: right;">${item.unitPrice.toFixed(0)}</span>
            <span style="text-align: right; font-weight: bold;">${(item.unitPrice * item.quantity).toFixed(0)}</span>
          </div>
          ${packRow}
        </div>
      `;
    })
    .join('');

  const gstBreakdownHtml =
    taxSnapshotTotals.taxRateBreakdown.filter(
      (b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0)
    ).length > 0
      ? taxSnapshotTotals.taxRateBreakdown
          .filter((b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0))
          .map(
            (b) => `
              <div class="row" style="color: #444;">
                <span>GST ${b.rate}% (CGST ${(b.rate / 2).toFixed(1)}% + SGST ${(b.rate / 2).toFixed(1)}%):</span>
                <span>+${currencySymbol}${b.totalTax.toFixed(2)}</span>
              </div>
            `
          )
          .join('')
      : totalTax > 0
      ? `
          <div class="row" style="color: #444;">
            <span>GST ${taxRate}% (CGST ${(taxRate / 2).toFixed(1)}% + SGST ${(taxRate / 2).toFixed(1)}%):</span>
            <span>+${currencySymbol}${totalTax.toFixed(2)}</span>
          </div>
        `
      : '';

  const tokenHtml = Boolean(shopSettings.enableDailyToken)
    ? `
      <div style="margin: 4px 0; padding: 4px 8px; border: 1px solid #000; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
        <span>PICKUP TOKEN:</span>
        <span style="font-size: 14px; font-weight: 900;">#${String(
          order.tokenNumber || ((order.orderNumber - 1) % 99999) + 1
        ).padStart(2, '0')}</span>
      </div>
    `
    : '';

  const cashInfoHtml =
    order.paymentMethod === 'CASH' && order.tenderedAmount !== undefined && order.tenderedAmount > 0
      ? `
        <div style="border-top: 1px dotted #888; padding-top: 4px; margin-top: 4px;">
          <div class="row">
            <span>Cash Received:</span>
            <span class="font-bold">${currencySymbol}${order.tenderedAmount.toFixed(2)}</span>
          </div>
          <div class="row font-bold">
            <span>Change Returned:</span>
            <span style="font-weight: 900;">${currencySymbol}${(order.changeDue !== undefined ? order.changeDue : Math.max(0, order.tenderedAmount - order.total)).toFixed(2)}</span>
          </div>
        </div>
      `
      : '';

  const logoHtml =
    shopSettings.logoUrl && shopSettings.printLogoOnReceipt !== false
      ? `<div style="text-align: center; margin-bottom: 4px;"><img src="${shopSettings.logoUrl}" alt="${shopSettings.shopName}" style="max-height: 48px; max-width: 130px; object-fit: contain; filter: grayscale(100%) contrast(200%);" /></div>`
      : '';

  return `
    <div class="text-center" style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
      ${logoHtml}
      <h3 class="font-extrabold uppercase" style="font-size: 13px;">${shopSettings.shopName || 'MonoPOS'}</h3>
      ${shopSettings.tagline ? `<div style="font-size: 9px; color: #555;">${shopSettings.tagline}</div>` : ''}
      <div style="font-size: 9px; color: #555;">${shopSettings.address || ''}</div>
      <div style="font-size: 9px; color: #555;">Tel: ${shopSettings.phone || ''}</div>
      ${shopSettings.gstin ? `<div style="font-size: 9px; font-weight: bold;">GSTIN: ${shopSettings.gstin}</div>` : ''}
    </div>

    <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
      ${tokenHtml}
      <div class="row"><span style="color: #666;">Invoice No:</span><span class="font-bold">#${invoiceNo}</span></div>
      <div class="row"><span style="color: #666;">Date & Time:</span><span>${formattedDate} ${formattedTime}</span></div>
      <div class="row"><span style="color: #666;">Customer:</span><span>${order.customerName || 'Walk-in'}</span></div>
      <div class="row"><span style="color: #666;">Payment Mode:</span><span class="font-bold uppercase">${order.paymentMethod}</span></div>
      ${order.staffName ? `<div class="row"><span style="color: #666;">Cashier:</span><span>${order.staffName}</span></div>` : ''}
    </div>

    <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
      <div class="row font-bold uppercase" style="border-bottom: 1px solid #000; padding-bottom: 3px; font-size: 9px;">
        <span style="width: 55%;">Item</span>
        <span style="width: 15%; text-align: center;">Qty</span>
        <span style="width: 15%; text-align: right;">Rate</span>
        <span style="width: 15%; text-align: right;">Total</span>
      </div>
      ${itemsHtml}
    </div>

    <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
      <div class="row"><span>Subtotal:</span><span>${currencySymbol}${displaySubtotal.toFixed(2)}</span></div>
      ${order.discount > 0 ? `<div class="row"><span>Discount:</span><span>-${currencySymbol}${order.discount.toFixed(2)}</span></div>` : ''}
      ${gstBreakdownHtml}
      ${totalTax > 0 ? `<div class="row font-bold" style="border-top: 1px dotted #888; padding-top: 2px;"><span>Total Tax:</span><span>+${currencySymbol}${totalTax.toFixed(2)}</span></div>` : ''}
      <div class="row font-bold" style="border-top: 1px solid #000; padding-top: 4px; font-size: 12px;">
        <span>GRAND TOTAL:</span>
        <span>${currencySymbol}${order.total.toFixed(2)}</span>
      </div>
      ${totalBaseUnitsSold !== totalPacksSold ? `<div class="row" style="font-size: 9px; color: #666;"><span>Total Base Units:</span><span>${totalBaseUnitsSold} units</span></div>` : ''}
      ${cashInfoHtml}
    </div>

    <div class="text-center" style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
      <div class="font-bold uppercase">
        ${order.paymentMethod === 'ONLINE' ? 'PAID IN FULL • VERIFIED UPI' : order.paymentMethod === 'CASH' ? 'PAID IN FULL • CASH TENDER' : 'KHATA CREDIT DEBIT RECORD'}
      </div>
      ${order.upiRefNumber ? `<div>UTR / Ref: ${order.upiRefNumber}</div>` : ''}
    </div>

    <div class="text-center" style="font-size: 9px; padding-top: 4px;">
      <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; font-weight: bold; letter-spacing: 0.15em;">*ORD-${order.orderNumber}-2026*</div>
      <div style="font-weight: bold; margin-top: 4px;">*** THANK YOU, VISIT AGAIN ***</div>
      ${shopSettings.receiptFooterNote ? `<div style="color: #666; margin-top: 2px;">${shopSettings.receiptFooterNote}</div>` : ''}
    </div>
  `;
}

export function printDirectThermalReceipt(order: Order, shopSettings: ShopSettings): void {
  const html = generateThermalReceiptHtml(order, shopSettings);
  printThermalHtml(html, `Receipt-#${order.orderNumber}`);
}
