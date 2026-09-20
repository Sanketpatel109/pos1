import React, { useState } from 'react';
import { Tag, Save, PackagePlus } from 'lucide-react';
import { BillItem, CatalogItem, Category } from '../types';
import { GST_SLABS, calculateItemTaxSnapshot } from '../constants/taxRates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface CustomItemModalProps {
  isOpen: boolean;
  currencySymbol: string;
  categories?: Category[];
  onClose: () => void;
  onAddCustomItem: (item: BillItem) => void;
  onSaveToCatalog?: (product: Omit<CatalogItem, 'id'>) => void;
}

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
  isOpen,
  currencySymbol,
  categories = [],
  onClose,
  onAddCustomItem,
  onSaveToCatalog,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [gstRate, setGstRate] = useState<string>('0');
  const [customGstRate, setCustomGstRate] = useState<string>('');

  // New: Save to catalog feature
  const [alsoSaveToCatalog, setAlsoSaveToCatalog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const isCustom = gstRate === 'custom';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    const qtyNum = parseInt(quantity, 10);
    const effectiveGstRate = isCustom
      ? parseFloat(customGstRate) || 0
      : parseFloat(gstRate) || 0;

    if (!name.trim() || isNaN(priceNum) || priceNum <= 0) return;

    const validQty = isNaN(qtyNum) || qtyNum <= 0 ? 1 : qtyNum;
    const taxSnapshot = calculateItemTaxSnapshot(priceNum, validQty, effectiveGstRate);

    // Determine the category name
    const categoryName = selectedCategory === '__new__'
      ? newCategoryName.trim()
      : selectedCategory || 'General';

    const billItemId = alsoSaveToCatalog ? `item-${Date.now()}` : `custom-${Date.now()}`;

    // Add to current bill
    onAddCustomItem({
      id: billItemId,
      itemId: alsoSaveToCatalog ? billItemId : undefined,
      name: name.trim(),
      unitPrice: priceNum,
      quantity: validQty,
      category: alsoSaveToCatalog ? categoryName : undefined,
      gstRate: taxSnapshot.gstRate,
      taxableAmount: taxSnapshot.taxableAmount,
      cgst: taxSnapshot.cgst,
      sgst: taxSnapshot.sgst,
      totalTax: taxSnapshot.totalTax,
      itemTotal: taxSnapshot.itemTotal,
    });

    // Also save as a permanent catalog product
    if (alsoSaveToCatalog && onSaveToCatalog) {
      onSaveToCatalog({
        name: name.trim(),
        price: priceNum,
        category: categoryName,
        gstRate: effectiveGstRate,
      });
    }

    // Reset form
    onClose();
    setName('');
    setPrice('');
    setQuantity('1');
    setGstRate('0');
    setCustomGstRate('');
    setAlsoSaveToCatalog(false);
    setSelectedCategory('');
    setNewCategoryName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Tag className="size-4 text-foreground" />
            <span>Add Custom Item to Bill</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter item name, pricing, and tax details to add directly to the current ticket.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="custom-item-name" className="text-xs font-medium">
              Item Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="custom-item-name"
              type="text"
              placeholder="e.g. Special Thali / Extra Cheese"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="custom-item-price" className="text-xs font-medium">
                Unit Price ({currencySymbol}) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="custom-item-price"
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-item-qty" className="text-xs font-medium">
                Quantity
              </Label>
              <Input
                id="custom-item-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-item-gst" className="text-xs font-medium">
              GST Slab (%) <span className="text-destructive">*</span>
            </Label>
            <Select value={gstRate} onValueChange={(val) => val && setGstRate(val)}>
              <SelectTrigger id="custom-item-gst" className="w-full">
                <SelectValue placeholder="Select GST rate" />
              </SelectTrigger>
              <SelectContent>
                {GST_SLABS.map((slab) => (
                  <SelectItem key={slab.label} value={slab.isCustom ? 'custom' : String(slab.rate)}>
                    {slab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCustom && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Enter custom GST % (e.g. 7.5)"
                  value={customGstRate}
                  onChange={(e) => setCustomGstRate(e.target.value)}
                  required
                  autoFocus
                />
                <span className="text-xs font-semibold text-muted-foreground shrink-0">%</span>
              </div>
            )}
          </div>

          {/* ── Save to Catalog Toggle ─────────────────────────────── */}
          {onSaveToCatalog && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="save-to-catalog-toggle"
                  checked={alsoSaveToCatalog}
                  onCheckedChange={(checked) => setAlsoSaveToCatalog(checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor="save-to-catalog-toggle"
                    className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
                  >
                    <PackagePlus className="size-3.5 text-primary" />
                    Also save as a permanent product
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    Save to catalog so you don't have to type it again next time. Add image & other details later from Inventory.
                  </p>
                </div>
                {alsoSaveToCatalog && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 shrink-0">
                    <Save className="size-2.5 mr-0.5" /> Saving
                  </Badge>
                )}
              </div>

              {alsoSaveToCatalog && (
                <div className="space-y-1.5 pl-6">
                  <Label htmlFor="custom-item-category" className="text-xs font-medium">
                    Category
                  </Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(val) => {
                      setSelectedCategory(val);
                      if (val !== '__new__') setNewCategoryName('');
                    }}
                  >
                    <SelectTrigger id="custom-item-category" className="w-full">
                      <SelectValue placeholder="Select or create category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">
                        + Create New Category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedCategory === '__new__' && (
                    <Input
                      type="text"
                      placeholder="New category name (e.g. Beverages)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="mt-1.5"
                      autoFocus
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
            >
              {alsoSaveToCatalog ? 'Add to Bill & Save Product' : 'Add to Bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const AddCustomItemModal = CustomItemModal;
export default CustomItemModal;
