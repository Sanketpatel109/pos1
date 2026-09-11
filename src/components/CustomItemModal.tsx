import React, { useState } from 'react';
import { Tag } from 'lucide-react';
import { BillItem } from '../types';
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
  onClose: () => void;
  onAddCustomItem: (item: BillItem) => void;
}

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
  isOpen,
  currencySymbol,
  onClose,
  onAddCustomItem,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [gstRate, setGstRate] = useState<string>('0');
  const [customGstRate, setCustomGstRate] = useState<string>('');

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

    onAddCustomItem({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      unitPrice: priceNum,
      quantity: validQty,
      gstRate: taxSnapshot.gstRate,
      taxableAmount: taxSnapshot.taxableAmount,
      cgst: taxSnapshot.cgst,
      sgst: taxSnapshot.sgst,
      totalTax: taxSnapshot.totalTax,
      itemTotal: taxSnapshot.itemTotal,
    });

    onClose();
    setName('');
    setPrice('');
    setQuantity('1');
    setGstRate('0');
    setCustomGstRate('');
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
              Add to Bill
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const AddCustomItemModal = CustomItemModal;
export default CustomItemModal;
