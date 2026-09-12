import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Loader2,
  Plus,
  X,
  Tag,
  ShoppingBag,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Category } from '../types';
import { GST_SLABS } from '../constants/taxRates';
import { useBarcodeLookup } from '../hooks/useBarcodeLookup';

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
  }) => void;
  onSaveAndAddToBill?: (product: {
    name: string;
    barcode: string;
    price: number;
    category: string;
    gstRate: number;
    stock: number;
    unit: string;
  }) => void;
}

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
      hasUserEditedNameRef.current = false;
      hasPopulatedFromLookupRef.current = false;

      const defaultCat =
        categories.find((c) => c.name !== 'ALL' && c.name !== 'All Items')?.name || 'General';
      setCategory(defaultCat);
      setGstRate('0');
      setCustomGstRate('');
      setStockQty('10');
      setUnit('pcs');

      // Immediate auto-focus on Product Name input so cashier can start typing right away
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

      // Only fill if cashier hasn't manually started typing a different name
      if (!hasUserEditedNameRef.current || !productName.trim()) {
        setProductName(lookupProduct.title);
        setFoundBadge(lookupProduct.brand || 'Product Found');

        if (lookupProduct.category && categories.some((c) => c.name.toLowerCase() === lookupProduct.category?.toLowerCase())) {
          setCategory(lookupProduct.category);
        }

        // Auto-focus Selling Price input as instructed
        setTimeout(() => {
          if (priceInputRef.current) {
            priceInputRef.current.focus();
            priceInputRef.current.select();
          }
        }, 60);
      }
    } else if (!isLookingUp && (lookupError || (!lookupProduct && !hasPopulatedFromLookupRef.current))) {
      // If not found or offline: Keep Product Name empty and ensure focus is on it
      if (!hasUserEditedNameRef.current) {
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 50);
      }
    }
  }, [isOpen, activeBarcode, lookupProduct, isLookingUp, lookupError, productName, categories]);

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

    const effectiveGst = gstRate === 'custom' ? parseFloat(customGstRate) || 0 : parseFloat(gstRate) || 0;
    const parsedStock = parseInt(stockQty, 10) || 10;

    const newProductData = {
      name: productName.trim(),
      barcode: activeBarcode,
      price: parsedPrice,
      category: category || 'General',
      gstRate: effectiveGst,
      stock: parsedStock,
      unit: unit || 'pcs',
    };

    if (onSaveAndAddToBill) {
      onSaveAndAddToBill(newProductData);
    } else if (onSaveProduct) {
      onSaveProduct(newProductData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-card text-card-foreground rounded-xl w-full max-w-md border border-border shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-card border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground leading-tight">
                Quick Add Product
              </h3>
              <p className="text-xs text-muted-foreground font-normal">
                Register unscanned barcode to catalog & bill
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barcode Badge Banner */}
        <div className="px-5 py-2.5 bg-muted/40 border-b border-border text-foreground flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <Barcode className="w-4 h-4 text-primary" />
            <span className="font-semibold tracking-wider tabular-nums">{activeBarcode || 'NO BARCODE'}</span>
          </div>
          {foundBadge && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium border border-primary/20">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              <span>Auto-filled</span>
            </span>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Product Name with Lookup Indicator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Product Name</span>
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
                placeholder={isLookingUp ? 'Looking up product...' : 'e.g. Britannia Good Day 100g'}
                className="w-full h-11 bg-muted/40 border border-border rounded-xl px-3.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-hidden transition-all pr-38"
                autoComplete="off"
              />
              {isLookingUp && (
                <div
                  id="product-lookup-indicator"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary pointer-events-none border border-primary/20"
                >
                  <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                  <span className="text-xs font-medium tracking-tight">Looking up product...</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Brand, item title, and pack size. Fully editable at any time.
            </p>
          </div>

          {/* Selling Price & Unit */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                Selling Price ({currencySymbol}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400">
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
                  className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-3 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all tabular-nums tracking-tight"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3 text-xs font-medium text-zinc-900 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all cursor-pointer"
              >
                <option value="pcs">pcs</option>
                <option value="pack">pack</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="ltr">ltr</option>
                <option value="ml">ml</option>
                <option value="box">box</option>
              </select>
            </div>
          </div>

          {/* Category & Stock */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3 text-xs font-medium text-zinc-900 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all cursor-pointer"
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

            <div>
              <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="10"
                className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 text-xs font-medium text-zinc-900 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden tabular-nums tracking-tight"
              />
            </div>
          </div>

          {/* GST Tax Slab */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              GST Slab
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {GST_SLABS.slice(0, 6).map((slab) => (
                <button
                  key={slab.rate}
                  type="button"
                  onClick={() => {
                    setGstRate(String(slab.rate));
                    setCustomGstRate('');
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer tabular-nums tracking-tight ${
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

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 px-4 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-xl text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!productName.trim() || !sellingPrice || parseFloat(sellingPrice) <= 0}
              className="flex-2 h-11 px-5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
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
