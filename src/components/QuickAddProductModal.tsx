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
      hasUserEditedNameRef.current = false;
      hasPopulatedFromLookupRef.current = false;

      const defaultCat =
        categories.find((c) => c.name !== 'ALL' && c.name !== 'All Items')?.name || 'General';
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
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-card text-card-foreground rounded-xl w-full max-w-lg border border-border shadow-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Strictly Shadcn Default */}
        <div className="px-5 py-3.5 bg-card border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-tight">
                Quick Add Product
              </h3>
              <p className="text-xs text-muted-foreground">
                Register unscanned barcode to POS catalog & bill
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barcode & Auto-Lookup Banner */}
        <div className="px-5 py-2.5 bg-muted/50 border-b border-border text-foreground flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <Barcode className="w-4 h-4 text-primary" />
            <span className="font-mono font-medium tracking-wider tabular-nums">
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
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium border border-primary/20">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Auto-filled ({foundBadge})</span>
            </span>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Product Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                <span>Product Name / Brand</span>
                <span className="text-destructive">*</span>
              </label>
              {isLookingUp && (
                <span className="text-xs text-primary font-medium flex items-center gap-1 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Looking up online catalog...</span>
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                ref={nameInputRef}
                type="text"
                id="quick-add-product-name"
                value={productName}
                onChange={(e) => {
                  hasUserEditedNameRef.current = true;
                  setProductName(e.target.value);
                }}
                placeholder={isLookingUp ? 'Looking up product...' : 'e.g. Corona Extra, Absolut Vodka, Tata Salt'}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Pack Size / Multiplier Selector (1-Tap Shadcn Pills) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Pack Size</span>
              </label>
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
                  <button
                    key={p.count}
                    type="button"
                    onClick={() => setPackCount(p.count)}
                    className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/60 text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span>{p.label}</span>
                    {p.count > 1 && (
                      <span
                        className={`text-[10px] px-1 rounded-sm ${
                          isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'
                        }`}
                      >
                        {p.multiplierLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weight / Volume & Container Type (Dedicated Structured Fields) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Weight / Volume */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Weight / Volume</span>
                </label>
              </div>
              <input
                type="text"
                value={weightOrVolume}
                onChange={(e) => setWeightOrVolume(e.target.value)}
                placeholder="e.g. 750ml, 12 oz, 500g"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              />
              {/* Quick Pills */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {WEIGHT_PRESETS.slice(0, 5).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeightOrVolume(w)}
                    className={`text-[10px] px-1.5 py-0.5 rounded-sm border cursor-pointer transition-colors ${
                      weightOrVolume.toLowerCase() === w.toLowerCase()
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted/50 border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Container / Type */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Container Type</span>
                </label>
              </div>
              <input
                type="text"
                value={containerType}
                onChange={(e) => setContainerType(e.target.value)}
                placeholder="e.g. Bottle, Can, Pouch"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              />
              {/* Quick Pills */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {CONTAINER_PRESETS.slice(0, 5).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setContainerType(c)}
                    className={`text-[10px] px-1.5 py-0.5 rounded-sm border cursor-pointer transition-colors ${
                      containerType.toLowerCase() === c.toLowerCase()
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted/50 border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selling Price & Unit */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                <span>Selling Price ({currencySymbol})</span>
                <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  {currencySymbol}
                </span>
                <input
                  ref={priceInputRef}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 rounded-md border border-input bg-background pl-7 pr-3 text-xs font-semibold text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring transition-colors tabular-nums"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring transition-colors cursor-pointer"
              >
                <option value="pcs">pcs</option>
                <option value="pack">pack</option>
                <option value="bottle">bottle</option>
                <option value="can">can</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="ltr">ltr</option>
                <option value="ml">ml</option>
                <option value="box">box</option>
              </select>
            </div>
          </div>

          {/* Category & Initial Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring transition-colors cursor-pointer"
              >
                {categories
                  .filter((c) => c.name !== 'ALL' && c.name !== 'All Items')
                  .map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                {categories.length === 0 && <option value="General">General</option>}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Initial Stock</label>
              <input
                type="number"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="10"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring transition-colors tabular-nums"
              />
            </div>
          </div>

          {/* GST Tax Slab */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Tax / GST Slab</label>
            <div className="grid grid-cols-3 gap-1.5">
              {GST_SLABS.slice(0, 6).map((slab) => (
                <button
                  key={slab.rate}
                  type="button"
                  onClick={() => {
                    setGstRate(String(slab.rate));
                    setCustomGstRate('');
                  }}
                  className={`h-8 px-2 rounded-md border text-xs font-medium transition-colors cursor-pointer tabular-nums flex items-center justify-center ${
                    gstRate === String(slab.rate)
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {slab.label}
                </button>
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
                {sellingPrice ? parseFloat(sellingPrice).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 px-4 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-md text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!productName.trim() || !sellingPrice || parseFloat(sellingPrice) <= 0}
              className="flex-2 h-9 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Save & Add to Bill</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickAddProductModal;
