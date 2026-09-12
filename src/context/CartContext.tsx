import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { BillItem, CatalogItem } from '../types';
import { calculateItemTaxSnapshot, calculateOrderTaxFromSnapshot } from '../constants/taxRates';

export interface CartContextType {
  currentBillItems: BillItem[];
  items: BillItem[]; // Convenient alias for currentBillItems
  addItem: (
    item:
      | CatalogItem
      | BillItem
      | {
          id?: string;
          itemId?: string;
          name: string;
          unitPrice?: number;
          price?: number;
          quantity?: number;
          gstRate?: number;
          note?: string;
          selectedPackName?: string;
          multiplier?: number;
          barcode?: string;
        }
  ) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  updateItemRate: (id: string, newRate: number) => void;
  clearCart: () => void;
  setCartItems: React.Dispatch<React.SetStateAction<BillItem[]>>;
  subtotal: number;
  gst: number;
  taxAmount: number; // Alias for gst
  grandTotal: number;
  itemCount: number;
  taxRate: number;
  setTaxRate: (rate: number) => void;
}

const INITIAL_BILL_ITEMS: BillItem[] = [
  {
    id: 'bi-1',
    name: 'French Fries',
    unitPrice: 50.0,
    quantity: 1,
    gstRate: 5,
    taxableAmount: 50.0,
    cgst: 1.25,
    sgst: 1.25,
    totalTax: 2.5,
    itemTotal: 52.5,
  },
  {
    id: 'bi-2',
    name: 'Pav Bhaji',
    unitPrice: 70.0,
    quantity: 1,
    gstRate: 5,
    taxableAmount: 70.0,
    cgst: 1.75,
    sgst: 1.75,
    totalTax: 3.5,
    itemTotal: 73.5,
  },
  {
    id: 'bi-3',
    name: 'Samosa',
    unitPrice: 15.0,
    quantity: 1,
    gstRate: 5,
    taxableAmount: 15.0,
    cgst: 0.38,
    sgst: 0.37,
    totalTax: 0.75,
    itemTotal: 15.75,
  },
  {
    id: 'bi-4',
    name: 'Cold Coffee',
    unitPrice: 45.0,
    quantity: 1,
    gstRate: 18,
    taxableAmount: 45.0,
    cgst: 4.05,
    sgst: 4.05,
    totalTax: 8.1,
    itemTotal: 53.1,
  },
];

const CartContext = createContext<CartContextType | undefined>(undefined);

export interface CartProviderProps {
  children: React.ReactNode;
  initialItems?: BillItem[];
  defaultTaxRate?: number;
}

export const CartProvider: React.FC<CartProviderProps> = ({
  children,
  initialItems = INITIAL_BILL_ITEMS,
  defaultTaxRate = 0,
}) => {
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>(initialItems);
  const [taxRate, setTaxRate] = useState<number>(defaultTaxRate);

  const addItem = useCallback(
    (
      item:
        | CatalogItem
        | BillItem
        | {
            id?: string;
            itemId?: string;
            name: string;
            unitPrice?: number;
            price?: number;
            quantity?: number;
            gstRate?: number;
            note?: string;
            selectedPackName?: string;
            multiplier?: number;
            barcode?: string;
          }
    ) => {
      const name = item.name;
      const unitPrice =
        'unitPrice' in item && typeof item.unitPrice === 'number'
          ? item.unitPrice
          : 'price' in item && typeof item.price === 'number'
          ? item.price
          : 0;
      const qtyToAdd =
        'quantity' in item && typeof item.quantity === 'number' ? item.quantity : 1;
      const note = 'note' in item ? item.note : undefined;
      const selectedPackName = 'selectedPackName' in item ? item.selectedPackName : undefined;
      const multiplier =
        'multiplier' in item && typeof item.multiplier === 'number'
          ? item.multiplier
          : 1;
      const barcode = 'barcode' in item ? item.barcode : undefined;
      const itemId =
        'itemId' in item
          ? item.itemId
          : 'category' in item
          ? item.id
          : undefined;

      const appliedGstRate =
        'gstRate' in item && typeof item.gstRate === 'number'
          ? item.gstRate
          : taxRate || 0;

      setCurrentBillItems((prev) => {
        const isAdHocKeypad = item.id && item.id.startsWith('qb-');
        const existingIndex = !isAdHocKeypad
          ? prev.findIndex(
              (i) =>
                i.name === name &&
                (i.selectedPackName || undefined) === (selectedPackName || undefined) &&
                (note ? i.note === note : true)
            )
          : -1;

        if (existingIndex > -1) {
          const updated = [...prev];
          const newQty = updated[existingIndex].quantity + qtyToAdd;
          const rateToUse =
            updated[existingIndex].gstRate !== undefined
              ? updated[existingIndex].gstRate!
              : appliedGstRate;
          const snapshot = calculateItemTaxSnapshot(
            updated[existingIndex].unitPrice,
            newQty,
            rateToUse
          );

          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: newQty,
            gstRate: snapshot.gstRate,
            taxableAmount: snapshot.taxableAmount,
            cgst: snapshot.cgst,
            sgst: snapshot.sgst,
            totalTax: snapshot.totalTax,
            itemTotal: snapshot.itemTotal,
          };
          return updated;
        }

        const snapshot = calculateItemTaxSnapshot(unitPrice, qtyToAdd, appliedGstRate);
        const newItem: BillItem = {
          id:
            item.id ||
            `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          itemId: itemId,
          name: name,
          unitPrice: unitPrice,
          quantity: qtyToAdd,
          selectedPackName: selectedPackName,
          multiplier: multiplier,
          barcode: barcode,
          note: note,
          gstRate: snapshot.gstRate,
          taxableAmount: snapshot.taxableAmount,
          cgst: snapshot.cgst,
          sgst: snapshot.sgst,
          totalTax: snapshot.totalTax,
          itemTotal: snapshot.itemTotal,
        };
        return [...prev, newItem];
      });
    },
    [taxRate]
  );

  const updateQty = useCallback((id: string, delta: number) => {
    setCurrentBillItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const snapshot = calculateItemTaxSnapshot(item.unitPrice, newQty, item.gstRate ?? 0);
            return {
              ...item,
              quantity: newQty,
              gstRate: snapshot.gstRate,
              taxableAmount: snapshot.taxableAmount,
              cgst: snapshot.cgst,
              sgst: snapshot.sgst,
              totalTax: snapshot.totalTax,
              itemTotal: snapshot.itemTotal,
            };
          }
          return item;
        })
        .filter((item): item is BillItem => item !== null)
    );
  }, []);

  const updateItemRate = useCallback((id: string, newRate: number) => {
    setCurrentBillItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const snapshot = calculateItemTaxSnapshot(newRate, item.quantity, item.gstRate ?? 0);
          return {
            ...item,
            unitPrice: newRate,
            gstRate: snapshot.gstRate,
            taxableAmount: snapshot.taxableAmount,
            cgst: snapshot.cgst,
            sgst: snapshot.sgst,
            totalTax: snapshot.totalTax,
            itemTotal: snapshot.itemTotal,
          };
        }
        return item;
      })
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setCurrentBillItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCurrentBillItems([]);
  }, []);

  const taxTotals = useMemo(() => {
    return calculateOrderTaxFromSnapshot(currentBillItems);
  }, [currentBillItems]);

  const subtotal = useMemo(() => {
    return currentBillItems.reduce(
      (acc, item) => acc + item.unitPrice * item.quantity,
      0
    );
  }, [currentBillItems]);

  const gst = useMemo(() => {
    return taxTotals.totalTax;
  }, [taxTotals]);

  const grandTotal = useMemo(() => {
    return subtotal + gst;
  }, [subtotal, gst]);

  const itemCount = useMemo(() => {
    return currentBillItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [currentBillItems]);

  const value = useMemo(
    () => ({
      currentBillItems,
      items: currentBillItems,
      addItem,
      removeItem,
      updateQty,
      updateItemRate,
      clearCart,
      setCartItems: setCurrentBillItems,
      subtotal,
      gst,
      taxAmount: gst,
      grandTotal,
      itemCount,
      taxRate,
      setTaxRate,
    }),
    [
      currentBillItems,
      addItem,
      removeItem,
      updateQty,
      updateItemRate,
      clearCart,
      subtotal,
      gst,
      grandTotal,
      itemCount,
      taxRate,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
