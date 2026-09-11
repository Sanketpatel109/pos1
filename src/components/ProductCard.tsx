import React from 'react';
import { Tag, Check, AlertTriangle } from '../icons/faIcons';
import { CatalogItem } from '../types';

export interface ProductCardProps {
  item: CatalogItem;
  quantityInCart?: number;
  currencySymbol?: string;
  onSelect: (item: CatalogItem) => void;
  disabled?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  quantityInCart = 0,
  currencySymbol = '₹',
  onSelect,
  disabled = false,
}) => {
  const isInCart = quantityInCart > 0;
  const isOutOfStock = item.stock !== undefined && item.stock <= 0;
  const isLowStock =
    item.stock !== undefined &&
    item.stock > 0 &&
    item.stock <= (item.lowStockThreshold ?? 5);

  return (
    <button
      type="button"
      id={`product-card-${item.id}`}
      onClick={() => {
        if (!disabled && !isOutOfStock) {
          onSelect(item);
        }
      }}
      disabled={disabled || isOutOfStock}
      aria-label={`Add ${item.name} to bill, ${currencySymbol}${item.price.toFixed(2)}`}
      className={`group relative flex flex-col justify-between w-full p-1.5 sm:p-2 rounded-2xl border border-zinc-200/80 bg-white text-left transition-all active:scale-[0.98] select-none cursor-pointer shadow-xs ${
        isInCart
          ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
          : 'hover:border-zinc-400 hover:shadow-xs'
      } ${isOutOfStock ? 'opacity-55 cursor-not-allowed bg-zinc-50' : ''}`}
    >
      {/* Top Floating Status Badges */}
      <div className="absolute top-1 left-1 right-1 sm:top-1.5 sm:left-1.5 sm:right-1.5 z-10 flex items-center justify-between pointer-events-none">
        {/* Low Stock / Out of Stock Badge */}
        {isOutOfStock ? (
          <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider bg-rose-600 text-white px-1.5 py-0.5 rounded-[5px] shadow-xs">
            Out
          </span>
        ) : isLowStock ? (
          <span className="text-[7.5px] sm:text-[8.5px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-300/60 px-1.5 py-0.5 rounded-[5px] shadow-2xs flex items-center gap-0.5 tabular-nums tracking-tight font-medium">
            <AlertTriangle className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>{item.stock} left</span>
          </span>
        ) : (
          <span />
        )}

        {/* Active Cart Counter Badge */}
        {isInCart && (
          <span className="bg-blue-600 text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 ml-auto tabular-nums tracking-tight font-medium">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
            <span>{quantityInCart}</span>
          </span>
        )}
      </div>

      {/* Image wrapper */}
      <div className="h-16 sm:h-24 w-full bg-zinc-50 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center border border-zinc-100">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="h-16 sm:h-24 w-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400" />
        )}
      </div>

      {/* Product Metadata & Price */}
      <div className="flex flex-col justify-between flex-1 min-w-0 w-full mt-0.5 sm:mt-1 px-0.5">
        <p
          title={item.name}
          className="text-xs sm:text-sm font-medium text-zinc-900 truncate leading-tight"
        >
          {item.name}
        </p>

        {/* Bottom row (Category & Price) */}
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider truncate max-w-[55%]">
            {item.category}
          </span>
          <span className="text-xs sm:text-sm font-medium text-zinc-900 tabular-nums tracking-tight">
            {currencySymbol}{item.price.toFixed(2)}
          </span>
        </div>
      </div>
    </button>
  );
};
