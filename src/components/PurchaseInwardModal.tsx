import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  PackagePlus,
  Truck,
  CheckCircle2,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';
import { CatalogItem, InwardStockEntry, InwardStockItem } from '../types';

interface PurchaseInwardModalProps {
  isOpen: boolean;
  catalog: CatalogItem[];
  currencySymbol: string;
  activeStaffName: string;
  onClose: () => void;
  onInwardStock: (entry: InwardStockEntry) => void;
}

export const PurchaseInwardModal: React.FC<PurchaseInwardModalProps> = ({
  isOpen,
  catalog,
  currencySymbol,
  activeStaffName,
  onClose,
  onInwardStock,
}) => {
  const [supplierName, setSupplierName] = useState('Metro Wholesale Supplies');
  const [invoiceNumber, setInvoiceNumber] = useState(`PO-${Date.now().toString().slice(-5)}`);
  const [notes, setNotes] = useState('');
  
  // Selected items to receive
  const [itemsToReceive, setItemsToReceive] = useState<InwardStockItem[]>([
    {
      productId: catalog[0]?.id || 'p-1',
      productName: catalog[0]?.name || 'Item',
      quantity: 10,
      unitCost: catalog[0]?.costPrice || 20,
    },
  ]);

  const [inwardHistory, setInwardHistory] = useState<InwardStockEntry[]>(() => {
    const saved = localStorage.getItem('monopos_inward_history');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'inw-1',
            supplierName: 'National Distributors',
            invoiceNumber: 'INV-8821',
            date: new Date(Date.now() - 86400000 * 2).toLocaleDateString(),
            items: [{ productId: 'p-1', productName: 'Cheesy 7 Pizza', quantity: 20, unitCost: 140 }],
            totalAmount: 2800,
            receivedBy: 'Ramesh',
          },
        ];
  });

  const [activeTab, setActiveTab] = useState<'new-inward' | 'history'>('new-inward');

  if (!isOpen) return null;

  const handleAddItem = () => {
    const firstItem = catalog[0];
    if (!firstItem) return;
    setItemsToReceive((prev) => [
      ...prev,
      {
        productId: firstItem.id,
        productName: firstItem.name,
        quantity: 5,
        unitCost: firstItem.costPrice || firstItem.price * 0.7,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItemsToReceive((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = catalog.find((c) => c.id === productId);
    if (!product) return;
    setItemsToReceive((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: product.id,
        productName: product.name,
        unitCost: product.costPrice || Math.round(product.price * 0.7),
      };
      return updated;
    });
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantity' | 'unitCost',
    value: number
  ) => {
    setItemsToReceive((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: Math.max(0, value),
      };
      return updated;
    });
  };

  const totalInwardCost = itemsToReceive.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsToReceive.length === 0) return;

    const newEntry: InwardStockEntry = {
      id: `inw-${Date.now()}`,
      supplierName: supplierName.trim() || 'Vendor Supplier',
      invoiceNumber: invoiceNumber.trim() || `PO-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      items: itemsToReceive,
      totalAmount: totalInwardCost,
      notes: notes.trim(),
      receivedBy: activeStaffName,
    };

    // Update history
    const updatedHistory = [newEntry, ...inwardHistory];
    setInwardHistory(updatedHistory);
    localStorage.setItem('monopos_inward_history', JSON.stringify(updatedHistory));

    // Call parent handler to increment stock in catalog
    onInwardStock(newEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl bg-card text-card-foreground rounded-xl border border-border shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-card border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                Purchase Order & Inward Stock Receiving
              </h2>
              <p className="text-xs text-zinc-500 font-normal">
                Log supplier shipments & automatically replenish inventory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-100 p-0.5 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('new-inward')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'new-inward'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Inward Stock
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Inward History ({inwardHistory.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'new-inward' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Supplier & Invoice info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Supplier / Vendor Name
                  </label>
                  <div className="flex items-center gap-2 bg-white border border-zinc-300 rounded-xl px-3 py-2">
                    <Truck className="w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Metro Cash & Carry, Local Distributor"
                      className="w-full text-xs font-semibold text-zinc-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Invoice / Bill Ref #
                  </label>
                  <div className="flex items-center gap-2 bg-white border border-zinc-300 rounded-xl px-3 py-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV-2026-904"
                      className="w-full text-xs font-semibold text-zinc-800 focus:outline-hidden "
                    />
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Received Inventory Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product
                  </button>
                </div>

                <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                  {itemsToReceive.map((item, idx) => {
                    const catalogItem = catalog.find((c) => c.id === item.productId);
                    const currentStock = catalogItem?.stock ?? 0;
                    const newStock = currentStock + item.quantity;

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <label className="text-xs text-muted-foreground block mb-0.5">Product</label>
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full h-10 bg-muted/40 border border-zinc-200 rounded-xl px-2.5 text-xs font-medium text-foreground focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          >
                            {catalog.map((catItem) => (
                              <option key={catItem.id} value={catItem.id}>
                                {catItem.name} (Current: {catItem.stock ?? 0} {catItem.unit || 'pcs'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="w-24">
                            <label className="text-xs text-muted-foreground block mb-0.5">Received Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 0)
                              }
                              className="w-full h-10 bg-muted/40 border border-zinc-200 rounded-xl px-2 text-xs font-medium text-center text-foreground focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums tracking-tight"
                            />
                          </div>

                          <div className="w-28">
                            <label className="text-xs text-muted-foreground block mb-0.5">
                              Cost/Unit ({currencySymbol})
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.unitCost}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)
                              }
                              className="w-full h-10 bg-muted/40 border border-zinc-200 rounded-xl px-2 text-xs font-medium text-center text-foreground focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums tracking-tight"
                            />
                          </div>

                          <div className="w-24 text-right">
                            <span className="text-xs text-muted-foreground block mb-0.5">New Stock</span>
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20 inline-block tabular-nums tracking-tight">
                              {newStock} {catalogItem?.unit || 'pcs'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={itemsToReceive.length === 1}
                            className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total & Submit */}
              <div className="p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-zinc-500 block font-medium">
                    Total Purchase Inward Value
                  </span>
                  <span className="text-xl font-bold text-zinc-900 tabular-nums tracking-tight">
                    {currencySymbol}{totalInwardCost.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    Received by {activeStaffName}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-none h-11 px-4 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none h-11 px-5 rounded-xl text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Stock Replenishment</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              {inwardHistory.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs">No previous inward shipments recorded.</div>
              ) : (
                inwardHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2 text-zinc-800"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-zinc-900">{entry.supplierName}</span>
                        <span className="text-[10px] bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-md font-bold">
                          {entry.invoiceNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-medium">{entry.date}</span>
                    </div>

                    <div className="text-xs text-zinc-600 bg-white p-2.5 rounded-xl border border-zinc-200 divide-y divide-zinc-100">
                      {entry.items.map((i, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 text-[11px]">
                          <span>{i.productName} × {i.quantity}</span>
                          <span className="font-bold text-zinc-900">
                            {currencySymbol}{(i.quantity * i.unitCost).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                      <span>Received by: <strong className="text-zinc-800">{entry.receivedBy}</strong></span>
                      <span className="text-xs font-black text-zinc-900">
                        Total: {currencySymbol}{entry.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
