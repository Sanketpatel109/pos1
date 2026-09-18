import {
  Order,
  RefundRecord,
  CatalogItem,
  InwardStockEntry,
  Customer,
  CashEntry,
  BillItem,
} from '../types';

export interface RefundRequest {
  orderNumber: number;
  creditNoteNumber: string;
  refundedAt: string;
  refundAmount: number;
  refundMethod: 'CASH' | 'KHATA' | 'ONLINE';
  refundReason: string;
  restockInventory: boolean;
  refundedItems: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  staffName?: string;
}

export interface RefundCalculationResult {
  updatedOrder: Order;
  isFullyRefunded: boolean;
  cumulativeRefundAmount: number;
  newRefundRecord: RefundRecord;
  mergedRefundedItems: { id: string; name: string; quantity: number; amount: number }[];
}

/**
 * Calculates updated order state, cumulative refund totals, and immutable refund audit records.
 * Guarantees that partial returns update the bill to 'partially_refunded' and full returns to 'refunded',
 * preserving a complete append-only refund history with credit note numbers.
 */
export function calculateRefundOrderState(
  order: Order,
  refund: RefundRequest
): RefundCalculationResult {
  const safeRefundAmount = isNaN(refund.refundAmount) || refund.refundAmount < 0 ? 0 : refund.refundAmount;
  const cumulativeRefundAmount = Number(
    ((order.refundAmount || 0) + safeRefundAmount).toFixed(2)
  );

  // Merge previously refunded items with new refund items
  const prevRefundedItems = order.refundedItems || [];
  const mergedRefundedItems = [...prevRefundedItems];

  refund.refundedItems.forEach((newItem) => {
    const existing = mergedRefundedItems.find((r) => r.id === newItem.id);
    if (existing) {
      existing.quantity += newItem.quantity;
      existing.amount = Number((existing.amount + newItem.amount).toFixed(2));
    } else {
      mergedRefundedItems.push({
        id: newItem.id,
        name: newItem.name,
        quantity: newItem.quantity,
        amount: newItem.amount,
      });
    }
  });

  // Calculate if every single purchased item quantity has now been returned
  const isFullyRefunded = order.items.every((item) => {
    const ref = mergedRefundedItems.find((r) => r.id === item.id);
    return ref && ref.quantity >= item.quantity;
  });

  const newRefundRecord: RefundRecord = {
    id: refund.creditNoteNumber,
    creditNoteNumber: refund.creditNoteNumber,
    refundedAt: refund.refundedAt,
    refundAmount: safeRefundAmount,
    refundMethod: refund.refundMethod,
    refundReason: refund.refundReason,
    restockInventory: refund.restockInventory,
    refundedItems: refund.refundedItems,
    staffName: refund.staffName || order.staffName || 'Staff',
  };

  const prevHistory = order.refundHistory || [];
  const updatedHistory = [...prevHistory, newRefundRecord];

  const updatedOrder: Order = {
    ...order,
    status: isFullyRefunded ? 'refunded' : 'partially_refunded',
    refundAmount: cumulativeRefundAmount,
    refundReason: refund.refundReason,
    refundedAt: refund.refundedAt,
    refundMethod: refund.refundMethod,
    refundedItems: mergedRefundedItems,
    refundHistory: updatedHistory,
  };

  return {
    updatedOrder,
    isFullyRefunded,
    cumulativeRefundAmount,
    newRefundRecord,
    mergedRefundedItems,
  };
}

/**
 * Updates catalog inventory stock when returned items are accepted back into stock.
 */
export function calculateRestockedCatalog(
  catalog: CatalogItem[],
  refundedItems: { id: string; name: string; quantity: number }[],
  restockInventory: boolean
): CatalogItem[] {
  if (!restockInventory || !refundedItems || refundedItems.length === 0) {
    return catalog;
  }

  return catalog.map((item) => {
    const matched = refundedItems.find(
      (r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase()
    );
    if (matched && typeof item.stock === 'number') {
      return {
        ...item,
        stock: item.stock + Math.max(0, matched.quantity),
      };
    }
    return item;
  });
}

/**
 * Updates catalog inventory stock and cost price when receiving supplier stock crates.
 */
export function calculateInwardStockUpdates(
  catalog: CatalogItem[],
  entry: InwardStockEntry
): CatalogItem[] {
  if (!entry.items || entry.items.length === 0) {
    return catalog;
  }

  const itemUpdates = new Map<string, { qty: number; unitCost: number }>();
  entry.items.forEach((it) => {
    itemUpdates.set(it.productId, { qty: it.quantity, unitCost: it.unitCost });
  });

  return catalog.map((prod) => {
    const incoming = itemUpdates.get(prod.id);
    if (incoming) {
      const currentStock = prod.stock ?? 0;
      return {
        ...prod,
        stock: currentStock + Math.max(0, incoming.qty),
        costPrice: incoming.unitCost > 0 ? incoming.unitCost : prod.costPrice,
      };
    }
    return prod;
  });
}

/**
 * Deducts sold item quantities from catalog stock during bill settlement.
 */
export function calculateStockDeductionsOnSale(
  catalog: CatalogItem[],
  soldItems: BillItem[]
): CatalogItem[] {
  if (!soldItems || soldItems.length === 0) return catalog;

  const soldMap = new Map<string, number>();
  soldItems.forEach((b) => {
    const mult = b.multiplier || 1;
    const totalUnitsSold = b.quantity * mult;
    const key = b.itemId || b.id;
    soldMap.set(key, (soldMap.get(key) || 0) + totalUnitsSold);
  });

  return catalog.map((item) => {
    const soldQty = soldMap.get(item.id);
    if (soldQty !== undefined && typeof item.stock === 'number') {
      return {
        ...item,
        stock: Math.max(0, item.stock - soldQty),
      };
    }
    return item;
  });
}

/**
 * Updates a customer's Khata credit balance and loyalty points on sale completion.
 */
export function calculateCustomerCreditUpdate(
  customer: Customer,
  creditToAdd: number,
  grandTotal: number,
  redeemedPoints: number = 0,
  loyaltySettings: { enableLoyalty?: boolean; earnSpendRate?: number } = {}
): Customer {
  const safeCredit = isNaN(creditToAdd) || creditToAdd < 0 ? 0 : creditToAdd;
  const newCreditBalance = Number(((customer.creditBalance || 0) + safeCredit).toFixed(2));

  let earnedPoints = 0;
  const isLoyaltyOn = loyaltySettings.enableLoyalty !== false;
  const rate = loyaltySettings.earnSpendRate || 100;
  if (isLoyaltyOn && rate > 0) {
    earnedPoints = Math.floor(grandTotal / rate);
  }

  const currentPoints = customer.loyaltyPoints || 0;
  const newLoyaltyPoints = Math.max(0, currentPoints - redeemedPoints + earnedPoints);
  const totalOrders = (customer.totalOrders || 0) + 1;

  return {
    ...customer,
    creditBalance: newCreditBalance,
    loyaltyPoints: newLoyaltyPoints,
    totalOrders,
  };
}

/**
 * Settles customer debt (partial payment or full settlement) and prevents negative balances.
 */
export function calculateCustomerSettlement(
  customer: Customer,
  settlementAmount: number
): { updatedCustomer: Customer; settledAmount: number; remainingBalance: number } {
  const safeAmount = isNaN(settlementAmount) || settlementAmount < 0 ? 0 : settlementAmount;
  const currentBalance = customer.creditBalance || 0;
  const remainingBalance = Number(Math.max(0, currentBalance - safeAmount).toFixed(2));
  const settledAmount = Number(Math.min(currentBalance, safeAmount).toFixed(2));

  return {
    updatedCustomer: {
      ...customer,
      creditBalance: remainingBalance,
    },
    settledAmount,
    remainingBalance,
  };
}

export interface DrawerReconciliationResult {
  openingFloat: number;
  cashSales: number;
  onlineSales: number;
  creditSales: number;
  splitSales: number;
  totalSales: number;
  totalOrders: number;
  cashIn: number;
  cashOut: number;
  expectedDrawerCash: number;
  actualCountedCash: number;
  variance: number;
  isShort: boolean;
  isExcess: boolean;
  isExact: boolean;
}

/**
 * Reconciles cash drawer balances and calculates variance for Z-Report shift closure.
 */
export function calculateDrawerReconciliation(
  openingFloat: number,
  orders: Order[],
  cashEntries: CashEntry[],
  actualCountedCash: number
): DrawerReconciliationResult {
  const safeOpening = isNaN(openingFloat) || openingFloat < 0 ? 0 : openingFloat;
  const completedOrders = orders.filter((o) => o.status === 'completed');

  const cashSales = completedOrders
    .filter((o) => o.paymentMethod === 'CASH')
    .reduce((sum, o) => sum + (o.tenderedAmount && o.changeDue !== undefined ? o.total : o.total), 0);

  const onlineSales = completedOrders
    .filter((o) => o.paymentMethod === 'ONLINE' || o.paymentMethod === 'UPI' || o.paymentMethod === 'CARD')
    .reduce((sum, o) => sum + o.total, 0);

  const creditSales = completedOrders
    .filter((o) => o.paymentMethod === 'CREDIT' || o.paymentMethod === 'KHATA')
    .reduce((sum, o) => sum + o.total, 0);

  const splitSales = completedOrders
    .filter((o) => o.paymentMethod === 'SPLIT')
    .reduce((sum, o) => sum + o.total, 0);

  const totalSales = Number((cashSales + onlineSales + creditSales + splitSales).toFixed(2));
  const totalOrders = completedOrders.length;

  const cashIn = cashEntries
    .filter((e) => e.type === 'IN')
    .reduce((sum, e) => sum + e.amount, 0);

  const cashOut = cashEntries
    .filter((e) => e.type === 'OUT')
    .reduce((sum, e) => sum + e.amount, 0);

  const expectedDrawerCash = Number((safeOpening + cashSales + cashIn - cashOut).toFixed(2));
  const safeCounted = isNaN(actualCountedCash) || actualCountedCash < 0 ? 0 : actualCountedCash;
  const variance = Number((safeCounted - expectedDrawerCash).toFixed(2));

  const isShort = variance < -0.01;
  const isExcess = variance > 0.01;
  const isExact = Math.abs(variance) <= 0.01;

  return {
    openingFloat: safeOpening,
    cashSales: Number(cashSales.toFixed(2)),
    onlineSales: Number(onlineSales.toFixed(2)),
    creditSales: Number(creditSales.toFixed(2)),
    splitSales: Number(splitSales.toFixed(2)),
    totalSales,
    totalOrders,
    cashIn: Number(cashIn.toFixed(2)),
    cashOut: Number(cashOut.toFixed(2)),
    expectedDrawerCash,
    actualCountedCash: safeCounted,
    variance,
    isShort,
    isExcess,
    isExact,
  };
}
