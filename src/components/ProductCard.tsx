import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tag, Check, AlertTriangle, Layers, ChevronDown, X } from 'lucide-react';
import { CatalogItem, PackagingOption } from '../types';

export interface ProductCardProps {
  item: CatalogItem;
  quantityInCart?: number;
  currencySymbol?: string;
  onSelect: (item: CatalogItem, pack?: PackagingOption | null) => void;
  disabled?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  quantityInCart = 0,
  currencySymbol = '₹',
  onSelect,
  disabled = false,
}) => {
  const [showPackPopover, setShowPackPopover] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const hasPacks = Boolean(item.packagingOptions && item.packagingOptions.length > 0);
  const isInCart = quantityInCart > 0;
  const isOutOfStock = item.stock !== undefined && item.stock <= 0;
  const isLowStock =
    item.stock !== undefined &&
    item.stock > 0 &&
    item.stock <= (item.lowStockThreshold ?? 5);

  // Close popup on escape key
  useEffect(() => {
    if (!showPackPopover) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPackPopover(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPackPopover]);

  const handleCardClick = () => {
    if (disabled) return;
    if (hasPacks) {
      setShowPackPopover((prev) => !prev);
    } else {
      if (isOutOfStock) return;
      onSelect(item, null);
    }
  };

  return (
    <div ref={cardRef} className={`relative w-full ${showPackPopover ? 'z-40' : ''}`}>
      <button
        type="button"
        id={`product-card-${item.id}`}
        onClick={handleCardClick}
        disabled={disabled || (!hasPacks && isOutOfStock)}
        aria-label={`Add ${item.name} to bill, ${currencySymbol}${item.price.toFixed(2)}`}
        className={`group relative flex flex-col justify-between w-full p-1.5 sm:p-2 rounded-lg border border-border bg-card text-left transition-all active:scale-[0.98] select-none cursor-pointer shadow-xs ${
          isInCart
            ? 'border-primary ring-2 ring-primary/20 shadow-xs'
            : 'hover:border-muted-foreground/40 hover:shadow-xs'
        } ${isOutOfStock ? 'opacity-55 cursor-not-allowed bg-muted/40' : ''}`}
      >
        {/* Top Floating Status Badges */}
        <div className="absolute top-1 left-1 right-1 sm:top-1.5 sm:left-1.5 sm:right-1.5 z-10 flex items-center justify-between pointer-events-none">
          {/* Low Stock / Out of Stock Badge */}
          {isOutOfStock ? (
            <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-sm shadow-xs">
              Out
            </span>
          ) : isLowStock ? (
            <span className="text-[7.5px] sm:text-[8.5px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-sm shadow-2xs flex items-center gap-0.5 tabular-nums tracking-tight font-medium">
              <AlertTriangle className="w-2.5 h-2.5 stroke-[2.5]" />
              <span>{item.stock} left</span>
            </span>
          ) : (
            <span />
          )}

          {/* Active Cart Counter Badge */}
          {isInCart && (
            <span className="bg-primary text-primary-foreground text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 ml-auto tabular-nums tracking-tight font-medium">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>{quantityInCart}</span>
            </span>
          )}
        </div>

        {/* Image wrapper */}
        <div className="h-16 sm:h-24 w-full bg-muted/30 rounded-md overflow-hidden shrink-0 relative flex items-center justify-center border border-border/60">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              referrerPolicy="no-referrer"
              className="h-16 sm:h-24 w-full object-cover rounded-md group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
          )}

          {/* Packaging Tiers Indicator Pill */}
          {hasPacks && (
            <div className="absolute bottom-1 right-1 z-10 flex items-center gap-0.5 px-1.5 py-0.5 bg-background/90 text-primary border border-primary/30 rounded text-[7.5px] sm:text-[8.5px] font-semibold backdrop-blur-xs shadow-xs">
              <Layers className="w-2.5 h-2.5" />
              <span>{item.packagingOptions!.length + 1} Sizes</span>
            </div>
          )}
        </div>

        {/* Product Metadata & Price */}
        <div className="flex flex-col justify-between flex-1 min-w-0 w-full mt-0.5 sm:mt-1 px-0.5">
          <p
            title={item.name}
            className="text-xs sm:text-sm font-medium text-foreground truncate leading-tight"
          >
            {item.name}
          </p>

          {/* Bottom row (Category & Price) */}
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate max-w-[55%]">
              {item.category}
            </span>
            <div className="flex items-center gap-0.5 text-xs sm:text-sm font-medium text-foreground tabular-nums tracking-tight">
              <span>{currencySymbol}{item.price.toFixed(2)}</span>
              {hasPacks && <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </div>
          </div>
        </div>
      </button>

      {/* Responsive Modal Popup for Size / Pack Tier Selection */}
      {showPackPopover && hasPacks && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Select Pack or Size for ${item.name}`}
          className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowPackPopover(false)}
        >
          <div
            className="w-full sm:max-w-md bg-card text-card-foreground rounded-t-xl sm:rounded-xl border border-border shadow-xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 p-4 sm:p-5 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Product details */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-11 h-11 rounded-2xl object-cover border border-zinc-200 shadow-2xs shrink-0 bg-white"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-400">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Select Pack / Size
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 truncate">
                    {item.name}
                  </h3>
                  <span className="text-[11px] text-zinc-500 truncate">
                    {item.category} • In Stock: {item.stock ?? '∞'} {item.unit || 'units'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-pack-modal"
                onClick={() => setShowPackPopover(false)}
                className="w-8 h-8 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Pack options */}
            <div className="space-y-2 py-3 overflow-y-auto flex-1 pr-0.5">
              {/* Standard Single Unit Option */}
              <button
                type="button"
                id="btn-select-pack-single"
                onClick={() => {
                  onSelect(item, null);
                  setShowPackPopover(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl border border-zinc-200/90 bg-zinc-50/50 hover:bg-blue-50/60 hover:border-blue-500/50 transition-all text-left group cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-blue-700 transition-colors">
                      Single {item.unit ? `(${item.unit})` : 'Piece'}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200/70 text-zinc-700">
                      Standard 1x
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-0.5">
                    Standard base unit pricing
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold font-mono text-zinc-900 group-hover:text-blue-700">
                    {currencySymbol}{item.price.toFixed(2)}
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-white border border-zinc-200 group-hover:border-blue-300 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-zinc-400 transition-all font-bold">
                    +
                  </div>
                </div>
              </button>

              {/* Configured Packaging Options */}
              {item.packagingOptions!.map((pack) => {
                const mult = pack.multiplier || 1;
                const perUnit = pack.sellingPrice / mult;
                const savingsPercent =
                  item.price > 0 && pack.sellingPrice > 0
                    ? Math.round(((item.price * mult - pack.sellingPrice) / (item.price * mult)) * 100)
                    : 0;

                return (
                  <button
                    key={pack.id}
                    type="button"
                    id={`btn-select-pack-${pack.id}`}
                    onClick={() => {
                      onSelect(item, pack);
                      setShowPackPopover(false);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-zinc-200/90 bg-zinc-50/50 hover:bg-blue-50/60 hover:border-blue-500/50 transition-all text-left group cursor-pointer shadow-2xs active:scale-[0.99]"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-blue-700 transition-colors truncate">
                          {pack.packName}
                        </span>
                        {savingsPercent > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300/60 rounded-full shrink-0">
                            Save {savingsPercent}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 flex-wrap">
                        <span>{mult} {item.unit || 'units'}</span>
                        <span>•</span>
                        <span>{currencySymbol}{perUnit.toFixed(2)} / {item.unit || 'ea'}</span>
                        {pack.barcode && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              EAN: {pack.barcode}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm sm:text-base font-bold font-mono text-zinc-900 group-hover:text-blue-700">
                        {currencySymbol}{pack.sellingPrice.toFixed(2)}
                      </span>
                      <div className="w-7 h-7 rounded-xl bg-white border border-zinc-200 group-hover:border-blue-300 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-zinc-400 transition-all font-bold">
                        +
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Cancel footer for phone users */}
            <div className="pt-2 sm:hidden border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowPackPopover(false)}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
