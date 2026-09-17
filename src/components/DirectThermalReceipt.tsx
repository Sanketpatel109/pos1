import React from 'react';
import { Order, ShopSettings, RefundRecord } from '../types';
import { calculateOrderTaxFromSnapshot } from '../constants/taxRates';
import { printThermalHtml } from '../utils/thermalPrinter';
import { Barcode128, getBarcodeSvgString } from './Barcode128';

export interface DirectThermalReceiptProps {
  order: Order | null;
  shopSettings: ShopSettings;
  isOriginalInvoice?: boolean;
}

export const DirectThermalReceipt: React.FC<DirectThermalReceiptProps> = ({
  order,
  shopSettings,
  isOriginalInvoice = false,
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
  const taxRate = order.taxRate || 0;
  const hasMultipleTaxes =
    taxSnapshotTotals.taxRateBreakdown.filter((b) => b.totalTax > 0).length > 1;

  const totalBaseUnitsSold = order.items.reduce(
    (sum, item) => sum + item.quantity * (item.multiplier || 1),
    0
  );
  const totalPacksSold = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const customFooter = shopSettings.receiptFooterNote?.trim();
  const showCustomFooter = customFooter && customFooter !== '*** THANK YOU, VISIT AGAIN ***';

  return (
    <div
      id="direct-thermal-receipt"
      className="direct-thermal-receipt-print-only print:m-0 w-full max-w-[320px] mx-auto bg-white text-black text-[11px] leading-tight p-2 font-mono"
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
        {shopSettings.address && (
          <p className="text-[10px] text-zinc-700">{shopSettings.address}</p>
        )}
        {shopSettings.phone && (
          <p className="text-[10px] text-zinc-700">Tel: {shopSettings.phone.trim()}</p>
        )}
        {shopSettings.gstin && (
          <p className="text-[10px] font-bold text-black">GSTIN: {shopSettings.gstin}</p>
        )}
        {isOriginalInvoice ? (
          <div className="border-y border-dashed border-black py-0.5 my-1 text-center font-bold tracking-widest text-[10px]">
            *** ORIGINAL TAX INVOICE ***
          </div>
        ) : order.status === 'refunded' ? (
          <div className="border-y border-dashed border-black py-0.5 my-1 text-center font-bold tracking-widest text-[10px]">
            *** FULLY REFUNDED / VOID ***
          </div>
        ) : order.status === 'partially_refunded' ? (
          <div className="border-y border-dashed border-black py-0.5 my-1 text-center font-bold tracking-widest text-[10px]">
            *** PARTIALLY REFUNDED ***
          </div>
        ) : null}
      </div>

      {/* Invoice Meta Table */}
      <div className="border-b border-dashed border-black pb-2 mb-2 text-[10px]">
        {Boolean(shopSettings.enableDailyToken) && (
          <div className="mb-2 py-1 px-2 border border-black rounded flex justify-between items-center font-bold">
            <span>PICKUP TOKEN:</span>
            <span className="text-base font-black">
              #{String(order.tokenNumber || ((order.orderNumber - 1) % 99999) + 1).padStart(2, '0')}
            </span>
          </div>
        )}
        <table className="w-full table-fixed border-collapse">
          <tbody>
            <tr>
              <td className="w-[35%] text-zinc-600 py-0.5">Invoice No:</td>
              <td className="w-[65%] text-right font-bold py-0.5">#{invoiceNo}</td>
            </tr>
            <tr>
              <td className="text-zinc-600 py-0.5">Date & Time:</td>
              <td className="text-right py-0.5">{formattedDate} {formattedTime}</td>
            </tr>
            <tr>
              <td className="text-zinc-600 py-0.5">Customer:</td>
              <td className="text-right py-0.5">{order.customerName || 'Walk-in Customer'}</td>
            </tr>
            <tr>
              <td className="text-zinc-600 py-0.5">Payment Mode:</td>
              <td className="text-right font-bold uppercase py-0.5">{order.paymentMethod}</td>
            </tr>
            {order.staffName && (
              <tr>
                <td className="text-zinc-600 py-0.5">Cashier:</td>
                <td className="text-right py-0.5">{order.staffName}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Itemized Table */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <table className="w-full table-fixed border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-black font-bold uppercase text-[9.5px]">
              <th className="w-[46%] text-left pb-1 font-bold">Item</th>
              <th className="w-[14%] text-center pb-1 font-bold">Qty</th>
              <th className="w-[20%] text-right pb-1 font-bold">Rate</th>
              <th className="w-[20%] text-right pb-1 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => {
              const refundedMatch = order.refundedItems?.find(
                (r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase()
              );
              const refundedQty = !isOriginalInvoice && refundedMatch ? refundedMatch.quantity : 0;
              const isItemFullyReturned = refundedQty >= item.quantity;
              const isItemPartiallyReturned = refundedQty > 0 && refundedQty < item.quantity;

              return (
                <React.Fragment key={idx}>
                  <tr className="border-b border-dotted border-zinc-200 last:border-0">
                    <td className={`text-left py-1 pr-1 truncate font-medium ${isItemFullyReturned ? 'line-through text-zinc-400' : ''}`}>
                      {item.name}
                      {isItemPartiallyReturned && (
                        <span className="block text-[8px] text-zinc-600 no-underline not-italic font-normal">
                          ({refundedQty} of {item.quantity} ret.)
                        </span>
                      )}
                      {isItemFullyReturned && order.status === 'partially_refunded' && (
                        <span className="block text-[8px] text-zinc-600 no-underline not-italic font-normal">
                          (Returned)
                        </span>
                      )}
                    </td>
                    <td className="text-center py-1 font-semibold">{item.quantity}</td>
                    <td className="text-right py-1">{item.unitPrice.toFixed(0)}</td>
                    <td className={`text-right py-1 font-bold ${isItemFullyReturned ? 'line-through text-zinc-400' : ''}`}>
                      {(item.unitPrice * item.quantity).toFixed(0)}
                    </td>
                  </tr>
                  {item.selectedPackName && (
                    <tr>
                      <td colSpan={4} className="text-[8.5px] text-zinc-600 pl-1 pb-1 font-mono">
                        * {item.selectedPackName} (@ {currencySymbol}{(item.unitPrice / (item.multiplier || 1)).toFixed(2)}/unit)
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Calculations & Totals Table */}
      <div className="border-b border-dashed border-black pb-2 mb-2 text-[10px]">
        <table className="w-full table-fixed border-collapse">
          <tbody>
            <tr>
              <td className="w-[60%] text-left py-0.5">Subtotal:</td>
              <td className="w-[40%] text-right py-0.5">{currencySymbol}{displaySubtotal.toFixed(2)}</td>
            </tr>
            {order.discount > 0 && (
              <tr>
                <td className="text-left py-0.5">Discount:</td>
                <td className="text-right py-0.5">-{currencySymbol}{order.discount.toFixed(2)}</td>
              </tr>
            )}
            {taxSnapshotTotals.taxRateBreakdown.filter(
              (b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0)
            ).length > 0 ? (
              taxSnapshotTotals.taxRateBreakdown
                .filter((b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0))
                .map((b) => (
                  <tr key={b.rate} className="text-zinc-700">
                    <td className="text-left py-0.5">
                      GST {b.rate}% (CGST {(b.rate / 2).toFixed(1)}% + SGST {(b.rate / 2).toFixed(1)}%):
                    </td>
                    <td className="text-right py-0.5">{currencySymbol}{b.totalTax.toFixed(2)}</td>
                  </tr>
                ))
            ) : totalTax > 0 ? (
              <tr className="text-zinc-700">
                <td className="text-left py-0.5">
                  GST {taxRate}% (CGST {(taxRate / 2).toFixed(1)}% + SGST {(taxRate / 2).toFixed(1)}%):
                </td>
                <td className="text-right py-0.5">{currencySymbol}{totalTax.toFixed(2)}</td>
              </tr>
            ) : null}

            {hasMultipleTaxes && totalTax > 0 && (
              <tr className="font-bold border-t border-dotted border-zinc-400">
                <td className="text-left py-0.5">Total Tax:</td>
                <td className="text-right py-0.5">{currencySymbol}{totalTax.toFixed(2)}</td>
              </tr>
            )}

            <tr className="border-t border-black font-bold text-xs">
              <td className="text-left pt-1">
                {order.status === 'refunded' && !isOriginalInvoice ? 'ORIGINAL TOTAL:' : 'GRAND TOTAL:'}
              </td>
              <td className={`text-right pt-1 font-black ${order.status === 'refunded' && !isOriginalInvoice ? 'line-through text-zinc-400' : ''}`}>
                {currencySymbol}{order.total.toFixed(2)}
              </td>
            </tr>

            {!isOriginalInvoice && order.refundAmount !== undefined && order.refundAmount > 0 && (
              <tr className="font-bold">
                <td className="text-left py-0.5">TOTAL REFUNDED:</td>
                <td className="text-right py-0.5 font-black">-{currencySymbol}{order.refundAmount.toFixed(2)}</td>
              </tr>
            )}

            {!isOriginalInvoice && order.status === 'partially_refunded' && order.refundAmount !== undefined && (
              <tr className="border-t border-black font-bold text-xs">
                <td className="text-left pt-1">NET PAID TOTAL:</td>
                <td className="text-right pt-1 font-black">{currencySymbol}{Math.max(0, order.total - order.refundAmount).toFixed(2)}</td>
              </tr>
            )}

            {totalBaseUnitsSold !== totalPacksSold && (
              <tr className="text-[9px] text-zinc-600">
                <td className="text-left py-0.5">Total Base Units:</td>
                <td className="text-right py-0.5 font-semibold">{totalBaseUnitsSold} units</td>
              </tr>
            )}

            {order.paymentMethod === 'CASH' && order.tenderedAmount !== undefined && order.tenderedAmount > 0 && (
              <>
                <tr className="border-t border-dotted border-zinc-400">
                  <td className="text-left pt-1">Cash Received:</td>
                  <td className="text-right pt-1 font-bold">{currencySymbol}{order.tenderedAmount.toFixed(2)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="text-left py-0.5">Change Returned:</td>
                  <td className="text-right py-0.5 font-black">
                    {currencySymbol}
                    {(order.changeDue !== undefined
                      ? order.changeDue
                      : Math.max(0, order.tenderedAmount - order.total)
                    ).toFixed(2)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Settlement Note */}
      <div className="text-center py-1 text-[10px] space-y-0.5 border-b border-dashed border-black pb-2 mb-2">
        {order.paymentMethod === 'ONLINE' ? (
          <>
            <div className="font-bold uppercase tracking-wider">
              PAID IN FULL • VERIFIED UPI
            </div>
            {order.upiRefNumber && <div>UTR / Ref: {order.upiRefNumber}</div>}
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
      <div className="text-center pt-2 space-y-1 text-[10px]">
        <div className="py-1 flex justify-center bg-white">
          <Barcode128
            value={
              order.orderNumberFormatted
                ? `ORD-${order.orderNumberFormatted.replace(/^#/, '')}`
                : `ORD-${order.orderNumber}`
            }
            width={1.2}
            height={32}
            displayValue={true}
            fontSize={9}
          />
        </div>
        <p className="font-bold pt-1">*** THANK YOU, VISIT AGAIN ***</p>
        {showCustomFooter && (
          <p className="text-[9px] text-zinc-600">{customFooter}</p>
        )}
      </div>
    </div>
  );
};

export interface ThermalReceiptOptions {
  isOriginalInvoice?: boolean;
}

export function generateThermalReceiptHtml(
  order: Order,
  shopSettings: ShopSettings,
  options?: ThermalReceiptOptions
): string {
  const isOriginal = Boolean(options?.isOriginalInvoice);
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
  const hasMultipleTaxes =
    taxSnapshotTotals.taxRateBreakdown.filter((b) => b.totalTax > 0).length > 1;

  const totalBaseUnitsSold = order.items.reduce(
    (sum, item) => sum + item.quantity * (item.multiplier || 1),
    0
  );
  const totalPacksSold = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const customFooter = shopSettings.receiptFooterNote?.trim();
  const showCustomFooter = customFooter && customFooter !== '*** THANK YOU, VISIT AGAIN ***';

  const itemsRowsHtml = order.items
    .map((item) => {
      const refundedMatch = order.refundedItems?.find(
        (r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase()
      );
      const refundedQty = !isOriginal && refundedMatch ? refundedMatch.quantity : 0;
      const isItemFullyReturned = refundedQty >= item.quantity;
      const isItemPartiallyReturned = refundedQty > 0 && refundedQty < item.quantity;

      const retTag = isItemPartiallyReturned
        ? `<div style="font-size: 8px; color: #555; text-decoration: none;">(${refundedQty} of ${item.quantity} ret.)</div>`
        : isItemFullyReturned && order.status === 'partially_refunded'
        ? `<div style="font-size: 8px; color: #555; text-decoration: none;">(Returned)</div>`
        : '';

      const packRow = item.selectedPackName
        ? `<tr><td colspan="4" style="font-size: 8.5px; color: #555; padding-left: 4px; padding-bottom: 2px;">* ${item.selectedPackName} (@ ${currencySymbol}${(item.unitPrice / (item.multiplier || 1)).toFixed(2)}/unit)</td></tr>`
        : '';
      return `
        <tr style="border-bottom: 1px dotted #d0d0d0;">
          <td style="width: 46%; text-align: left; padding: 3px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${isItemFullyReturned ? 'text-decoration: line-through; color: #888;' : ''}">${item.name}${retTag}</td>
          <td style="width: 14%; text-align: center; padding: 3px 0;">${item.quantity}</td>
          <td style="width: 20%; text-align: right; padding: 3px 0;">${item.unitPrice.toFixed(0)}</td>
          <td style="width: 20%; text-align: right; padding: 3px 0; font-weight: bold; ${isItemFullyReturned ? 'text-decoration: line-through; color: #888;' : ''}">${(item.unitPrice * item.quantity).toFixed(0)}</td>
        </tr>
        ${packRow}
      `;
    })
    .join('');

  const gstRowsHtml =
    taxSnapshotTotals.taxRateBreakdown.filter(
      (b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0)
    ).length > 0
      ? taxSnapshotTotals.taxRateBreakdown
          .filter((b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0))
          .map(
            (b) => `
              <tr style="color: #444;">
                <td style="width: 60%; text-align: left; padding: 1.5px 0;">GST ${b.rate}% (CGST ${(b.rate / 2).toFixed(1)}% + SGST ${(b.rate / 2).toFixed(1)}%):</td>
                <td style="width: 40%; text-align: right; padding: 1.5px 0;">${currencySymbol}${b.totalTax.toFixed(2)}</td>
              </tr>
            `
          )
          .join('')
      : totalTax > 0
      ? `
          <tr style="color: #444;">
            <td style="width: 60%; text-align: left; padding: 1.5px 0;">GST ${taxRate}% (CGST ${(taxRate / 2).toFixed(1)}% + SGST ${(taxRate / 2).toFixed(1)}%):</td>
            <td style="width: 40%; text-align: right; padding: 1.5px 0;">${currencySymbol}${totalTax.toFixed(2)}</td>
          </tr>
        `
      : '';

  const totalTaxRowHtml =
    hasMultipleTaxes && totalTax > 0
      ? `
        <tr style="font-weight: bold; border-top: 1px dotted #888;">
          <td style="width: 60%; text-align: left; padding: 2px 0;">Total Tax:</td>
          <td style="width: 40%; text-align: right; padding: 2px 0;">${currencySymbol}${totalTax.toFixed(2)}</td>
        </tr>
      `
      : '';

  const cashInfoRowsHtml =
    order.paymentMethod === 'CASH' && order.tenderedAmount !== undefined && order.tenderedAmount > 0
      ? `
        <tr style="border-top: 1px dotted #888;">
          <td style="width: 60%; text-align: left; padding: 2px 0;">Cash Received:</td>
          <td style="width: 40%; text-align: right; padding: 2px 0; font-weight: bold;">${currencySymbol}${order.tenderedAmount.toFixed(2)}</td>
        </tr>
        <tr style="font-weight: bold;">
          <td style="width: 60%; text-align: left; padding: 2px 0;">Change Returned:</td>
          <td style="width: 40%; text-align: right; padding: 2px 0; font-weight: 900;">${currencySymbol}${(order.changeDue !== undefined ? order.changeDue : Math.max(0, order.tenderedAmount - order.total)).toFixed(2)}</td>
        </tr>
      `
      : '';

  const logoHtml =
    shopSettings.logoUrl && shopSettings.printLogoOnReceipt !== false
      ? `<div style="text-align: center; margin-bottom: 4px;"><img src="${shopSettings.logoUrl}" alt="${shopSettings.shopName}" style="max-height: 48px; max-width: 130px; object-fit: contain; filter: grayscale(100%) contrast(200%);" /></div>`
      : '';

  const tokenHtml = Boolean(shopSettings.enableDailyToken)
    ? `
      <div style="margin: 4px 0 6px 0; padding: 4px 8px; border: 1px solid #000; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
        <span>PICKUP TOKEN:</span>
        <span style="font-size: 15px; font-weight: 900;">#${String(
          order.tokenNumber || ((order.orderNumber - 1) % 99999) + 1
        ).padStart(2, '0')}</span>
      </div>
    `
    : '';

  const refundStatusBannerHtml = isOriginal
    ? `<div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 0; margin-top: 4px; text-align: center; font-weight: bold; font-size: 10px;">*** ORIGINAL TAX INVOICE ***</div>`
    : order.status === 'refunded'
    ? `<div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 0; margin-top: 4px; text-align: center; font-weight: bold; font-size: 10px;">*** FULLY REFUNDED / VOID ***</div>`
    : order.status === 'partially_refunded'
    ? `<div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 0; margin-top: 4px; text-align: center; font-weight: bold; font-size: 10px;">*** PARTIALLY REFUNDED ***</div>`
    : '';

  return `
    <div class="text-center" style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
      ${logoHtml}
      <h3 class="font-extrabold uppercase" style="font-size: 13px;">${shopSettings.shopName || 'MonoPOS'}</h3>
      ${shopSettings.tagline ? `<div style="font-size: 9px; color: #555;">${shopSettings.tagline}</div>` : ''}
      ${shopSettings.address ? `<div style="font-size: 9px; color: #555;">${shopSettings.address}</div>` : ''}
      ${shopSettings.phone ? `<div style="font-size: 9px; color: #555;">Tel: ${shopSettings.phone.trim()}</div>` : ''}
      ${shopSettings.gstin ? `<div style="font-size: 9px; font-weight: bold;">GSTIN: ${shopSettings.gstin}</div>` : ''}
      ${refundStatusBannerHtml}
    </div>

    <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
      ${tokenHtml}
      <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
        <tr>
          <td style="width: 35%; color: #666; padding: 1px 0;">Invoice No:</td>
          <td style="width: 65%; text-align: right; font-weight: bold;">#${invoiceNo}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 1px 0;">Date & Time:</td>
          <td style="text-align: right;">${formattedDate} ${formattedTime}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 1px 0;">Customer:</td>
          <td style="text-align: right;">${order.customerName || 'Walk-in Customer'}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 1px 0;">Payment Mode:</td>
          <td style="text-align: right; font-weight: bold; text-transform: uppercase;">${order.paymentMethod}</td>
        </tr>
        ${order.staffName ? `
        <tr>
          <td style="color: #666; padding: 1px 0;">Cashier:</td>
          <td style="text-align: right;">${order.staffName}</td>
        </tr>` : ''}
      </table>
    </div>

    <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
      <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #000; font-size: 9.5px; font-weight: bold; text-transform: uppercase;">
            <th style="width: 46%; text-align: left; padding-bottom: 3px;">Item</th>
            <th style="width: 14%; text-align: center; padding-bottom: 3px;">Qty</th>
            <th style="width: 20%; text-align: right; padding-bottom: 3px;">Rate</th>
            <th style="width: 20%; text-align: right; padding-bottom: 3px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>
    </div>

    <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
      <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
        <tr>
          <td style="width: 60%; text-align: left; padding: 1.5px 0;">Subtotal:</td>
          <td style="width: 40%; text-align: right; padding: 1.5px 0;">${currencySymbol}${displaySubtotal.toFixed(2)}</td>
        </tr>
        ${order.discount > 0 ? `
        <tr>
          <td style="text-align: left; padding: 1.5px 0;">Discount:</td>
          <td style="text-align: right; padding: 1.5px 0;">-${currencySymbol}${order.discount.toFixed(2)}</td>
        </tr>` : ''}
        ${gstRowsHtml}
        ${totalTaxRowHtml}
        <tr style="border-top: 1px solid #000; font-size: 12px; font-weight: bold;">
          <td style="text-align: left; padding: 4px 0;">${order.status === 'refunded' && !isOriginal ? 'ORIGINAL TOTAL:' : 'GRAND TOTAL:'}</td>
          <td style="text-align: right; padding: 4px 0; font-weight: 900; ${order.status === 'refunded' && !isOriginal ? 'text-decoration: line-through; color: #888;' : ''}">${currencySymbol}${order.total.toFixed(2)}</td>
        </tr>
        ${
          !isOriginal && order.refundAmount !== undefined && order.refundAmount > 0
            ? `
          <tr style="font-weight: bold;">
            <td style="text-align: left; padding: 2px 0;">TOTAL REFUNDED:</td>
            <td style="text-align: right; padding: 2px 0; font-weight: 900;">-${currencySymbol}${order.refundAmount.toFixed(2)}</td>
          </tr>
        `
            : ''
        }
        ${
          !isOriginal && order.status === 'partially_refunded' && order.refundAmount !== undefined
            ? `
          <tr style="border-top: 1px solid #000; font-size: 12px; font-weight: bold;">
            <td style="text-align: left; padding: 4px 0;">NET PAID TOTAL:</td>
            <td style="text-align: right; padding: 4px 0; font-weight: 900;">${currencySymbol}${Math.max(0, order.total - order.refundAmount).toFixed(2)}</td>
          </tr>
        `
            : ''
        }
        ${totalBaseUnitsSold !== totalPacksSold ? `
        <tr style="font-size: 9px; color: #666;">
          <td style="text-align: left; padding: 1.5px 0;">Total Base Units:</td>
          <td style="text-align: right; padding: 1.5px 0;">${totalBaseUnitsSold} units</td>
        </tr>` : ''}
        ${cashInfoRowsHtml}
      </table>
    </div>

    <div class="text-center" style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
      <div class="font-bold uppercase">
        ${order.paymentMethod === 'ONLINE' ? 'PAID IN FULL • VERIFIED UPI' : order.paymentMethod === 'CASH' ? 'PAID IN FULL • CASH TENDER' : 'KHATA CREDIT DEBIT RECORD'}
      </div>
      ${order.upiRefNumber ? `<div>UTR / Ref: ${order.upiRefNumber}</div>` : ''}
    </div>

    <div class="text-center" style="font-size: 9px; padding-top: 6px;">
      <div style="display: flex; justify-content: center; margin: 4px 0;">
        ${getBarcodeSvgString(
          order.orderNumberFormatted
            ? `ORD-${order.orderNumberFormatted.replace(/^#/, '')}`
            : `ORD-${order.orderNumber}`,
          { width: 1.3, height: 32, displayValue: true, fontSize: 10 }
        )}
      </div>
      <div style="font-weight: bold; margin-top: 4px;">*** THANK YOU, VISIT AGAIN ***</div>
      ${showCustomFooter ? `<div style="color: #666; margin-top: 2px;">${customFooter}</div>` : ''}
    </div>
  `;
}

export function printDirectThermalReceipt(
  order: Order,
  shopSettings: ShopSettings,
  options?: ThermalReceiptOptions
): void {
  const html = generateThermalReceiptHtml(order, shopSettings, options);
  const title = options?.isOriginalInvoice
    ? `OriginalInvoice-#${order.orderNumber}`
    : `Receipt-#${order.orderNumber}`;
  printThermalHtml(html, title);
}

export function generateCreditNoteVoucherHtml(
  order: Order,
  refundRecord: RefundRecord,
  shopSettings: ShopSettings
): string {
  const dateObj = new Date(refundRecord.refundedAt || Date.now());
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

  const origDateObj = new Date(order.createdAt || Date.now());
  const origDate = origDateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const currencySymbol = shopSettings.currencySymbol || '₹';
  const prefix = shopSettings.terminalPrefix || 'A';
  const origInvoiceNo = order.orderNumberFormatted || `${prefix}-${order.orderNumber}`;
  const creditNoteNo = refundRecord.creditNoteNumber;

  const logoHtml =
    shopSettings.logoUrl && shopSettings.printLogoOnReceipt !== false
      ? `<div style="text-align: center; margin-bottom: 4px;"><img src="${shopSettings.logoUrl}" alt="${shopSettings.shopName}" style="max-height: 48px; max-width: 130px; object-fit: contain; filter: grayscale(100%) contrast(200%);" /></div>`
      : '';

  const returnedItemsRows = (refundRecord.refundedItems || [])
    .map(
      (item) => `
    <tr style="border-bottom: 1px dotted #d0d0d0;">
      <td style="width: 50%; text-align: left; padding: 3px 0;">${item.name}</td>
      <td style="width: 15%; text-align: center; padding: 3px 0;">${item.quantity}</td>
      <td style="width: 17%; text-align: right; padding: 3px 0;">${item.unitPrice.toFixed(0)}</td>
      <td style="width: 18%; text-align: right; padding: 3px 0; font-weight: bold;">${item.amount.toFixed(0)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <div class="text-center" style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
      ${logoHtml}
      <h3 class="font-extrabold uppercase" style="font-size: 13px;">${shopSettings.shopName || 'MonoPOS'}</h3>
      ${shopSettings.tagline ? `<div style="font-size: 9px; color: #555;">${shopSettings.tagline}</div>` : ''}
      ${shopSettings.address ? `<div style="font-size: 9px; color: #555;">${shopSettings.address}</div>` : ''}
      ${shopSettings.phone ? `<div style="font-size: 9px; color: #555;">Tel: ${shopSettings.phone.trim()}</div>` : ''}
      ${shopSettings.gstin ? `<div style="font-size: 9px; font-weight: bold;">GSTIN: ${shopSettings.gstin}</div>` : ''}
      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 0; margin-top: 5px; text-align: center; font-weight: bold; font-size: 11px;">
        *** CREDIT NOTE / REFUND VOUCHER ***
      </div>
    </div>

    <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
      <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
        <tr>
          <td style="width: 40%; color: #666; padding: 1px 0;">Credit Note No:</td>
          <td style="width: 60%; text-align: right; font-weight: bold;">#${creditNoteNo}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 1px 0;">Original Invoice:</td>
          <td style="text-align: right; font-weight: bold;">#${origInvoiceNo} (${origDate})</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 1px 0;">Refund Date:</td>
          <td style="text-align: right;">${formattedDate} ${formattedTime}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 1px 0;">Customer:</td>
          <td style="text-align: right;">${order.customerName || 'Walk-in Customer'}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 1px 0;">Refund Mode:</td>
          <td style="text-align: right; font-weight: bold; text-transform: uppercase;">${refundRecord.refundMethod}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 1px 0;">Return Reason:</td>
          <td style="text-align: right;">${refundRecord.refundReason || 'Customer Return'}</td>
        </tr>
        ${
          refundRecord.staffName
            ? `
        <tr>
          <td style="color: #666; padding: 1px 0;">Processed By:</td>
          <td style="text-align: right;">${refundRecord.staffName}</td>
        </tr>`
            : ''
        }
      </table>
    </div>

    <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
      <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #000; font-size: 9.5px; font-weight: bold; text-transform: uppercase;">
            <th style="width: 50%; text-align: left; padding-bottom: 3px;">Item Returned</th>
            <th style="width: 15%; text-align: center; padding-bottom: 3px;">Qty</th>
            <th style="width: 17%; text-align: right; padding-bottom: 3px;">Rate</th>
            <th style="width: 18%; text-align: right; padding-bottom: 3px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${returnedItemsRows}
        </tbody>
      </table>
    </div>

    <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
      <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
        <tr style="border-top: 1px solid #000; font-size: 12px; font-weight: bold;">
          <td style="text-align: left; padding: 4px 0;">TOTAL REFUNDED:</td>
          <td style="text-align: right; padding: 4px 0; font-weight: 900;">${currencySymbol}${refundRecord.refundAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="text-align: left; font-size: 9px; color: #666; padding-top: 2px;">Inventory Restocked:</td>
          <td style="text-align: right; font-size: 9px; font-weight: bold; padding-top: 2px;">${refundRecord.restockInventory ? 'YES' : 'NO'}</td>
        </tr>
      </table>
    </div>

    <div class="text-center" style="font-size: 9px; padding-top: 6px;">
      <div style="display: flex; justify-content: center; margin: 4px 0;">
        ${getBarcodeSvgString(
          `CN-${creditNoteNo.replace(/^#/, '')}`,
          { width: 1.3, height: 32, displayValue: true, fontSize: 10 }
        )}
      </div>
      <div style="font-weight: bold; margin-top: 6px;">*** REFUND ACKNOWLEDGEMENT ***</div>
      <div style="margin-top: 18px; border-top: 1px dotted #888; padding-top: 4px; display: flex; justify-content: space-between; font-size: 8.5px; color: #555;">
        <span>Customer Signature</span>
        <span>Store Seal / Signature</span>
      </div>
    </div>
  `;
}

export function printCreditNoteVoucher(
  order: Order,
  refundRecord: RefundRecord,
  shopSettings: ShopSettings
): void {
  const html = generateCreditNoteVoucherHtml(order, refundRecord, shopSettings);
  printThermalHtml(html, `CreditNote-#${refundRecord.creditNoteNumber}`);
}
