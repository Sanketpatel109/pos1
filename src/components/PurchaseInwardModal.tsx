import React, { useState } from 'react';
import {
  PackagePlus,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  Truck,
} from 'lucide-react';
import { CatalogItem, InwardStockEntry, InwardStockItem } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface PurchaseInwardModalProps {
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
  const [itemsToReceive, setItemsToReceive] = useState<InwardStockItem[]>(() => [
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
            items: [
              {
                productId: catalog[0]?.id || 'p-1',
                productName: catalog[0]?.name || 'Cheesy 7 Pizza',
                quantity: 20,
                unitCost: 140,
              },
            ],
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
        unitCost: firstItem.costPrice || Math.round(firstItem.price * 0.7),
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary shrink-0" />
            <DialogTitle className="text-base font-semibold">
              Purchase Inward & Stock Receiving
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Log supplier delivery shipments, record acquisition costs, and automatically replenish catalog inventory.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new-inward">Receive Inward Stock</TabsTrigger>
              <TabsTrigger value="history">
                Inward History ({inwardHistory.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* TAB 1: NEW INWARD SHIPMENT */}
            <TabsContent value="new-inward" className="space-y-4 mt-0">
              <form id="form-purchase-inward" onSubmit={handleSubmit} className="space-y-4">
                {/* Supplier & Invoice info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="input-supplier-name" className="text-xs font-medium">
                      Supplier / Vendor Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="input-supplier-name"
                      type="text"
                      required
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Metro Cash & Carry, Local Distributor"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="input-invoice-number" className="text-xs font-medium">
                      Invoice / Bill Ref # <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="input-invoice-number"
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV-2026-904"
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium leading-none">Received Inventory Items</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select items received from shipment and verify quantity and acquisition cost per unit.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      className="text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </Button>
                  </div>

                  <Separator />

                  <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[42%] text-xs font-semibold">Product</TableHead>
                          <TableHead className="w-[18%] text-xs font-semibold text-center">Received Qty</TableHead>
                          <TableHead className="w-[20%] text-xs font-semibold text-right">Cost/Unit ({currencySymbol})</TableHead>
                          <TableHead className="w-[14%] text-xs font-semibold text-center">New Stock</TableHead>
                          <TableHead className="w-[6%] text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemsToReceive.map((item, idx) => {
                          const catalogItem = catalog.find((c) => c.id === item.productId);
                          const currentStock = catalogItem?.stock ?? 0;
                          const newStock = currentStock + item.quantity;
                          const unit = catalogItem?.unit || 'pcs';

                          return (
                            <TableRow key={idx}>
                              <TableCell className="py-2.5">
                                <Select
                                  value={item.productId}
                                  onValueChange={(val) => handleProductSelect(idx, val)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {catalog.map((catItem) => (
                                      <SelectItem key={catItem.id} value={catItem.id}>
                                        {catItem.name} (Current: {catItem.stock ?? 0} {catItem.unit || 'pcs'})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              <TableCell className="py-2.5">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateItem(
                                      idx,
                                      'quantity',
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className="text-center tabular-nums"
                                  required
                                />
                              </TableCell>

                              <TableCell className="py-2.5">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.unitCost}
                                  onChange={(e) =>
                                    handleUpdateItem(
                                      idx,
                                      'unitCost',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="text-right tabular-nums font-medium"
                                  required
                                />
                              </TableCell>

                              <TableCell className="py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    {currentStock}
                                  </span>
                                  <span className="text-xs text-muted-foreground">➔</span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs font-semibold tabular-nums px-2 py-0.5"
                                  >
                                    {newStock} {unit}
                                  </Badge>
                                </div>
                              </TableCell>

                              <TableCell className="py-2.5 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(idx)}
                                  disabled={itemsToReceive.length === 1}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </form>
            </TabsContent>

            {/* TAB 2: INWARD HISTORY */}
            <TabsContent value="history" className="space-y-4 mt-0">
              {inwardHistory.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-muted-foreground rounded-md border border-dashed border-border bg-muted/20">
                  No previous inward shipments recorded.
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[30%] text-xs font-semibold">Supplier & Invoice</TableHead>
                        <TableHead className="w-[20%] text-xs font-semibold">Date</TableHead>
                        <TableHead className="w-[30%] text-xs font-semibold">Items Received</TableHead>
                        <TableHead className="w-[20%] text-xs font-semibold text-right">Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inwardHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="py-3">
                            <div className="space-y-1">
                              <span className="font-semibold text-xs text-foreground block">
                                {entry.supplierName}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {entry.invoiceNumber}
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 text-xs text-muted-foreground">
                            {entry.date}
                            <span className="block text-[11px] mt-0.5 text-foreground">
                              By: {entry.receivedBy}
                            </span>
                          </TableCell>

                          <TableCell className="py-3 text-xs">
                            <div className="space-y-0.5">
                              {entry.items.map((it, idx) => (
                                <div key={idx} className="text-[11px] text-muted-foreground">
                                  {it.productName} × {it.quantity}
                                </div>
                              ))}
                            </div>
                          </TableCell>

                          <TableCell className="py-3 text-right">
                            <span className="text-xs font-bold text-foreground tabular-nums">
                              {currencySymbol}{entry.totalAmount.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </div>

          {/* Dialog Footer */}
          {activeTab === 'new-inward' && (
            <DialogFooter className="p-4 border-t border-border flex flex-row items-center justify-between sm:justify-between shrink-0">
              <div>
                <span className="text-xs text-muted-foreground block">Total Inward Value</span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  {currencySymbol}{totalInwardCost.toFixed(2)}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Received by {activeStaffName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" form="form-purchase-inward">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  <span>Confirm Stock Inward</span>
                </Button>
              </div>
            </DialogFooter>
          )}

          {activeTab === 'history' && (
            <DialogFooter className="p-4 border-t border-border flex flex-row items-center justify-between sm:justify-end shrink-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseInwardModal;
