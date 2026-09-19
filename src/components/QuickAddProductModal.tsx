import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Barcode,
  Loader2,
  Plus,
  X,
  ShoppingBag,
  Sparkles,
  Package,
  Layers,
  Scale,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { Category } from '../types';
import { GST_SLABS } from '../constants/taxRates';
import { useBarcodeLookup } from '../hooks/useBarcodeLookup';
import { getWebSearchUrl } from '../services/barcodeLookup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface QuickAddProductModalProps {
  isOpen: boolean;
  barcode?: string;
  initialBarcode?: string;
  currencySymbol?: string;
  categories?: Category[];
  onClose: () => void;
  onSaveProduct?: (product: {
    name: string;
    barcode: string;
    price: number;
    category: string;
    gstRate: number;
    stock: number;
    unit: string;
    image?: string;
    weightOrVolume?: string;
    containerType?: string;
    packCount?: number;
    packName?: string;
  }) => void;
  onSaveAndAddToBill?: (product: {
    name: string;
    barcode: string;
    price: number;
    category: string;
    gstRate: number;
    stock: number;
    unit: string;
    image?: string;
    weightOrVolume?: string;
    containerType?: string;
    packCount?: number;
    packName?: string;
  }) => void;
}

const PACK_PRESETS = [
  { count: 1, label: 'Single', multiplierLabel: '1x' },
  { count: 4, label: '4-Pack', multiplierLabel: '4x' },
  { count: 6, label: '6-Pack', multiplierLabel: '6x' },
  { count: 12, label: '12-Pack', multiplierLabel: '12x' },
  { count: 24, label: '24-Pack Case', multiplierLabel: '24x' },
];

const WEIGHT_PRESETS = [
  '750ml',
  '1.75L',
  '1L',
  '375ml',
  '50ml',
  '200ml',
  '355ml',
  '500ml',
  '12 oz',
  '16 oz',
  '24 oz',
  '500g',
  '1kg',
];

const CONTAINER_PRESETS = ['Bottle', 'Can', 'Pack', 'Case', 'Pouch', 'Box', 'Jar'];

export const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  isOpen,
  barcode,
  initialBarcode,
  currencySymbol = '₹',
  categories = [],
  onClose,
  onSaveProduct,
  onSaveAndAddToBill,
}) => {
  const activeBarcode = (barcode || initialBarcode || '').trim();

  // Form State
  const [productName, setProductName] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [category, setCategory] = useState<string>('General');
  const [gstRate, setGstRate] = useState<string>('0');
  const [customGstRate, setCustomGstRate] = useState<string>('');
  const [stockQty, setStockQty] = useState<string>('10');
  const [unit, setUnit] = useState<string>('pcs');

  // Specification States
  const [packCount, setPackCount] = useState<number>(1);
  const [weightOrVolume, setWeightOrVolume] = useState<string>('');
  const [containerType, setContainerType] = useState<string>('');
  const [foundBadge, setFoundBadge] = useState<string | null>(null);
  const [prodImageUrl, setProdImageUrl] = useState<string>('');

  // Refs for auto-focusing
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const hasUserEditedNameRef = useRef<boolean>(false);
  const hasPopulatedFromLookupRef = useRef<boolean>(false);

  // Open Food Facts Barcode Lookup Hook (2-second strict timeout)
  const { isLookingUp, product: lookupProduct, error: lookupError } = useBarcodeLookup(
    activeBarcode,
    isOpen && Boolean(activeBarcode)
  );

  // Reset or initialize on modal open
  useEffect(() => {
    if (isOpen) {
      setProductName('');
      setSellingPrice('');
      setFoundBadge(null);
      setPackCount(1);
      setWeightOrVolume('');
      setContainerType('');
      setProdImageUrl('');
      hasUserEditedNameRef.current = false;
      hasPopulatedFromLookupRef.current = false;

      const defaultCat = 'All Items';
      setCategory(defaultCat);
      setGstRate('0');
      setCustomGstRate('');
      setStockQty('10');
      setUnit('pcs');

      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, activeBarcode, categories]);

  // Handle lookup result changes
  useEffect(() => {
    if (!isOpen || !activeBarcode) return;

    if (lookupProduct && !hasPopulatedFromLookupRef.current) {
      hasPopulatedFromLookupRef.current = true;

      if (lookupProduct.imageUrl) {
        setProdImageUrl(lookupProduct.imageUrl);
      }

      // Extract pack, weight, container
      if (lookupProduct.packCount && lookupProduct.packCount > 1) {
        setPackCount(lookupProduct.packCount);
      }
      if (lookupProduct.weightOrVolume) {
        setWeightOrVolume(lookupProduct.weightOrVolume);
      }
      if (lookupProduct.containerType) {
        setContainerType(lookupProduct.containerType);
        if (lookupProduct.containerType === 'Bottle') {
          setUnit('bottle');
        } else if (lookupProduct.containerType === 'Can') {
          setUnit('can');
        }
      }

      // Auto-populate Name
      if (!hasUserEditedNameRef.current || !productName.trim()) {
        setProductName(lookupProduct.title);
        setFoundBadge(lookupProduct.brand || 'Product Found');

        // Pre-fill suggested retail price if available
        if (lookupProduct.suggestedPrice) {
          setSellingPrice(String(lookupProduct.suggestedPrice));
        }

        // Match category with store POS categories
        if (lookupProduct.category) {
          const directMatch = categories.find(
            (c) => c.name.toLowerCase() === lookupProduct.category?.toLowerCase()
          );
          if (directMatch) {
            setCategory(directMatch.name);
          } else {
            const lowerCat = lookupProduct.category.toLowerCase();
            const liquorCat = categories.find((c) => /liquor|spirits|alcohol/i.test(c.name));
            const beerCat = categories.find((c) => /beer|wine/i.test(c.name));
            const drinksCat = categories.find((c) => /drinks|beverages/i.test(c.name));

            if (/liquor|spirits|whiskey|vodka|tequila|rum|cognac/i.test(lowerCat) && liquorCat) {
              setCategory(liquorCat.name);
            } else if (/beer|wine/i.test(lowerCat) && (beerCat || liquorCat)) {
              setCategory(beerCat ? beerCat.name : liquorCat!.name);
            } else if (drinksCat) {
              setCategory(drinksCat.name);
            } else {
              setCategory(lookupProduct.category);
            }
          }
        }

        // Auto-focus Selling Price input if name is pre-filled, else focus name
        setTimeout(() => {
          if (priceInputRef.current) {
            priceInputRef.current.focus();
            priceInputRef.current.select();
          }
        }, 60);
      }
    } else if (
      !isLookingUp &&
      (lookupError || (!lookupProduct && !hasPopulatedFromLookupRef.current))
    ) {
      if (!hasUserEditedNameRef.current) {
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 50);
      }
    }
  }, [
    isOpen,
    activeBarcode,
    lookupProduct,
    isLookingUp,
    lookupError,
    productName,
    categories,
  ]);

  // Formatted Live Commercial Name
  const formattedPreviewTitle = useMemo(() => {
    const raw = productName.trim();
    if (!raw) return 'New Item';

    const parts: string[] = [raw];
    const packLabel = packCount > 1 ? (packCount === 24 ? '24-Pack Case' : `${packCount}-Pack`) : '';

    // If name doesn't already include the pack label, show in preview
    if (packLabel && !raw.toLowerCase().includes(packLabel.toLowerCase())) {
      parts.push(packLabel);
    }

    const detailPills: string[] = [];
    if (weightOrVolume && !raw.toLowerCase().includes(weightOrVolume.toLowerCase())) {
      detailPills.push(weightOrVolume);
    }
    if (containerType && !raw.toLowerCase().includes(containerType.toLowerCase())) {
      detailPills.push(packCount > 1 ? `${containerType}s` : containerType);
    }

    if (detailPills.length > 0) {
      parts.push(`(${detailPills.join(' ')})`);
    }

    return parts.join(' ');
  }, [productName, packCount, weightOrVolume, containerType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(sellingPrice);
    if (!productName.trim() || isNaN(parsedPrice) || parsedPrice <= 0) {
      if (!productName.trim()) {
        nameInputRef.current?.focus();
      } else {
        priceInputRef.current?.focus();
      }
      return;
    }

    const effectiveGst =
      gstRate === 'custom' ? parseFloat(customGstRate) || 0 : parseFloat(gstRate) || 0;
    const parsedStock = parseInt(stockQty, 10) || 10;

    const packLabel =
      packCount > 1 ? (packCount === 24 ? '24-Pack Case' : `${packCount}-Pack`) : 'Single';

    const newProductData = {
      name: formattedPreviewTitle,
      barcode: activeBarcode,
      price: parsedPrice,
      category: category || 'General',
      gstRate: effectiveGst,
      stock: parsedStock,
      unit: unit || 'pcs',
      image: prodImageUrl || lookupProduct?.imageUrl || undefined,
      weightOrVolume: weightOrVolume || undefined,
      containerType: containerType || undefined,
      packCount: packCount > 1 ? packCount : 1,
      packName: packLabel,
    };

    if (onSaveAndAddToBill) {
      onSaveAndAddToBill(newProductData);
    } else if (onSaveProduct) {
      onSaveProduct(newProductData);
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl"
        showCloseButton={false}
      >
        {/* Header - Strictly Shadcn Default */}
        <DialogHeader className="px-5 py-3.5 bg-card border-b border-border flex flex-row items-center justify-between shrink-0 space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-foreground leading-tight">
                Quick Add Product
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register unscanned barcode to POS catalog & bill
              </DialogDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        {/* Barcode & Auto-Lookup Banner */}
        <div className="px-5 py-2.5 bg-muted/40 border-b border-border text-foreground flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <Barcode className="w-4 h-4 text-primary" />
            <span className="font-mono font-semibold tracking-wider tabular-nums">
              {activeBarcode || 'NO BARCODE'}
            </span>
            {activeBarcode && (
              <a
                href={getWebSearchUrl(activeBarcode)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors ml-1 underline underline-offset-2"
                title="Search web / Google for this barcode"
              >
                <Globe className="w-3 h-3" />
                <span>Search Web</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
          {foundBadge && (
            <Badge variant="outline" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20 font-medium">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Auto-filled ({foundBadge})</span>
            </Badge>
          )}
        </div>

        {/* Auto-Fetched Packaging Photo Banner (0 KB Server Storage) */}
        {prodImageUrl && (
          <div className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={prodImageUrl}
                alt={productName || 'Product'}
                className="w-11 h-11 rounded-lg object-contain bg-white border border-border p-0.5 shrink-0 shadow-xs"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-foreground">Exact Packaging Image</span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold">
                    0 KB Server Space (CDN)
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  Official photo auto-linked from barcode registry
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setProdImageUrl('')}
              className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
              title="Remove image"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto flex-1 no-scrollbar">
            {/* Product Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="quick-add-product-name" className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Product Name / Brand</span>
                  <span className="text-destructive">*</span>
                </Label>
                {isLookingUp && (
                  <span className="text-xs text-primary font-medium flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Looking up online catalog...</span>
                  </span>
                )}
              </div>

              <Input
                ref={nameInputRef}
                type="text"
                id="quick-add-product-name"
                value={productName}
                onChange={(e) => {
                  hasUserEditedNameRef.current = true;
                  setProductName(e.target.value);
                }}
                placeholder={isLookingUp ? 'Looking up product...' : 'e.g. Corona Extra, Absolut Vodka, Tata Salt'}
                className="h-9 text-xs font-medium"
                autoComplete="off"
              />
            </div>

            {/* Pack Size / Multiplier Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Pack Size</span>
                </Label>
                {packCount > 1 && (
                  <span className="text-[11px] font-mono font-medium text-primary">
                    Inventory Multiplier: {packCount}x units
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PACK_PRESETS.map((p) => {
                  const isSelected = packCount === p.count;
                  return (
                    <Button
                      key={p.count}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => setPackCount(p.count)}
                      className="h-7 px-2.5 text-xs font-medium cursor-pointer"
                    >
                      {p.label}
                      {p.count > 1 && (
                        <span className={`text-[10px] ${isSelected ? 'opacity-80' : 'text-muted-foreground'}`}>
                          ({p.multiplierLabel})
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Container & Size / Volume Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bottle / Can / Box Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Container Type</span>
                </Label>
                <div className="flex flex-wrap gap-1">
                  {CONTAINER_PRESETS.slice(0, 5).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={containerType === type ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => setContainerType(containerType === type ? '' : type)}
                      className="h-6 px-2 text-[11px] cursor-pointer"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Volume / Weight */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Size / Volume</span>
                </Label>
                <div className="flex flex-wrap gap-1">
                  {WEIGHT_PRESETS.slice(0, 5).map((vol) => (
                    <Button
                      key={vol}
                      type="button"
                      variant={weightOrVolume === vol ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => setWeightOrVolume(weightOrVolume === vol ? '' : vol)}
                      className="h-6 px-2 text-[11px] cursor-pointer"
                    >
                      {vol}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Price */}
              <div className="space-y-1.5">
                <Label htmlFor="quick-add-selling-price" className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Selling Price ({currencySymbol})</span>
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-semibold text-muted-foreground">
                    {currencySymbol}
                  </span>
                  <Input
                    ref={priceInputRef}
                    type="number"
                    id="quick-add-selling-price"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-9 pl-7 text-xs font-semibold tabular-nums"
                  />
                </div>
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="quick-add-category" className="text-xs font-semibold text-foreground">
                  Category
                </Label>
                <Select
                  value={category}
                  onValueChange={(val) => val && setCategory(val)}
                >
                  <SelectTrigger id="quick-add-category" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Items">None (Show under All Items)</SelectItem>
                    {categories
                      .filter((c) => c.name !== 'ALL' && c.name !== 'All Items')
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unit & Stock Qty */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Base Unit</Label>
                <Select
                  value={unit}
                  onValueChange={(val) => val && setUnit(val)}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">pcs (Pieces)</SelectItem>
                    <SelectItem value="bottle">bottle</SelectItem>
                    <SelectItem value="can">can</SelectItem>
                    <SelectItem value="pack">pack</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="gm">gm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quick-add-stock-qty" className="text-xs font-semibold text-foreground">
                  Opening Stock
                </Label>
                <Input
                  type="number"
                  id="quick-add-stock-qty"
                  min="0"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="10"
                  className="h-9 text-xs font-medium tabular-nums"
                />
              </div>
            </div>

            {/* GST Tax Slab */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Tax / GST Slab</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {GST_SLABS.slice(0, 6).map((slab) => (
                  <Button
                    key={slab.rate}
                    type="button"
                    variant={gstRate === String(slab.rate) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setGstRate(String(slab.rate));
                      setCustomGstRate('');
                    }}
                    className="h-8 text-xs font-medium tabular-nums cursor-pointer"
                  >
                    {slab.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Live Receipt Preview Banner */}
            <div className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Receipt & Bill Preview
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground truncate max-w-[70%]">
                  {formattedPreviewTitle}
                </span>
                <span className="font-mono font-bold text-foreground">
                  {currencySymbol}
                  {sellingPrice ? (parseFloat(sellingPrice) || 0).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons in Footer */}
          <DialogFooter className="p-4 border-t border-border bg-card shrink-0 flex-row items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={!productName.trim() || !sellingPrice || (parseFloat(sellingPrice) || 0) <= 0}
              className="flex-[2] h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Save & Add to Bill</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddProductModal;
