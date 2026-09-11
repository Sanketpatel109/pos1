/**
 * Statutory GST Tax Slabs & Configuration for Indian Goods and Services Tax
 * Centralizes all GST slab definitions and immutable tax calculations.
 */

export interface GstSlab {
  rate: number;
  label: string;
  description?: string;
  isCustom?: boolean;
}

/**
 * Single source of truth for all Indian statutory GST tax rates:
 * 0% (Exempt), 0.25% (Diamonds/Stones), 3% (Gold/Jewelry), 5% (Essentials),
 * 12% (Standard Low), 18% (Standard High), 28% (Luxury/Sin), and "Custom %".
 */
export const GST_SLABS: readonly GstSlab[] = [
  { rate: 0, label: '0% (Exempt)', description: 'Nil Rated / Exempt Goods' },
  { rate: 0.25, label: '0.25% (Diamonds/Stones)', description: 'Rough Diamonds & Precious Stones' },
  { rate: 3, label: '3% (Gold/Jewelry)', description: 'Gold, Silver & Finished Jewelry' },
  { rate: 5, label: '5% (Essentials)', description: 'Essential Food, Edibles & Daily Needs' },
  { rate: 12, label: '12% (Standard Low)', description: 'Processed Foods, Commodities & Apparel' },
  { rate: 18, label: '18% (Standard High)', description: 'Standard Goods, Fast Food & Restaurant' },
  { rate: 28, label: '28% (Luxury/Sin)', description: 'Luxury Goods, Aerated Drinks & Motor' },
  { rate: -1, label: 'Custom %', description: 'Enter specific statutory rate', isCustom: true },
] as const;

export interface ItemTaxSnapshot {
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  itemTotal: number;
}

/**
 * Computes an immutable tax snapshot for a line item.
 * Snapshots the applied GST rate, taxable amount, CGST, and SGST.
 */
export function calculateItemTaxSnapshot(
  unitPrice: number,
  quantity: number,
  gstRate: number = 0
): ItemTaxSnapshot {
  const safeRate = isNaN(gstRate) || gstRate < 0 ? 0 : Number(gstRate);
  const safeQty = isNaN(quantity) || quantity <= 0 ? 1 : Number(quantity);
  const safePrice = isNaN(unitPrice) || unitPrice < 0 ? 0 : Number(unitPrice);

  const taxableAmount = Number((safePrice * safeQty).toFixed(2));
  const totalTax = Number(((taxableAmount * safeRate) / 100).toFixed(2));
  const halfTax = Number((totalTax / 2).toFixed(2));
  const cgst = halfTax;
  const sgst = Number((totalTax - cgst).toFixed(2));
  const itemTotal = Number((taxableAmount + totalTax).toFixed(2));

  return {
    gstRate: safeRate,
    taxableAmount,
    cgst,
    sgst,
    totalTax,
    itemTotal,
  };
}

export interface TaxSlabSummary {
  gstRate: number;
  rate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export interface OrderTaxTotals {
  taxableSubtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalTax: number;
  taxRateBreakdown: TaxSlabSummary[];
}

/**
 * Calculates order tax totals strictly from each line item's saved tax snapshot.
 * Guarantees that historical invoices and GSTR-1 filings remain 100% frozen
 * when live catalog product tax rates are updated in the future.
 */
export function calculateOrderTaxFromSnapshot(
  items: Array<{
    unitPrice: number;
    quantity: number;
    gstRate?: number;
    taxableAmount?: number;
    cgst?: number;
    sgst?: number;
  }>
): OrderTaxTotals {
  if (!items || items.length === 0) {
    return {
      taxableSubtotal: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalTax: 0,
      taxRateBreakdown: [],
    };
  }

  let taxableSubtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  const slabMap = new Map<number, { taxable: number; cgst: number; sgst: number }>();

  items.forEach((item) => {
    const rate = item.gstRate !== undefined ? item.gstRate : 0;
    const taxable =
      item.taxableAmount !== undefined
        ? item.taxableAmount
        : Number((item.unitPrice * item.quantity).toFixed(2));

    let cgst = item.cgst;
    let sgst = item.sgst;

    if (cgst === undefined || sgst === undefined) {
      const snapshot = calculateItemTaxSnapshot(item.unitPrice, item.quantity, rate);
      cgst = snapshot.cgst;
      sgst = snapshot.sgst;
    }

    taxableSubtotal += taxable;
    totalCgst += cgst;
    totalSgst += sgst;

    const existing = slabMap.get(rate) || { taxable: 0, cgst: 0, sgst: 0 };
    existing.taxable += taxable;
    existing.cgst += cgst;
    existing.sgst += sgst;
    slabMap.set(rate, existing);
  });

  const breakdown: TaxSlabSummary[] = Array.from(slabMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([rate, val]) => ({
      gstRate: rate,
      rate,
      taxableAmount: Number(val.taxable.toFixed(2)),
      cgst: Number(val.cgst.toFixed(2)),
      sgst: Number(val.sgst.toFixed(2)),
      totalTax: Number((val.cgst + val.sgst).toFixed(2)),
    }));

  return {
    taxableSubtotal: Number(taxableSubtotal.toFixed(2)),
    totalCgst: Number(totalCgst.toFixed(2)),
    totalSgst: Number(totalSgst.toFixed(2)),
    totalTax: Number((totalCgst + totalSgst).toFixed(2)),
    taxRateBreakdown: breakdown,
  };
}
