import React, { useState, useRef, useEffect } from 'react';
import { Tag, Check, AlertTriangle, Layers, ChevronDown, Plus } from 'lucide-react';
import { CatalogItem, PackagingOption } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from 'cn';

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
    <>
      <Card
        ref={cardRef}
        id={`product-card-${item.id}`}
        onClick={handleCardClick}
        aria-label={`Add ${item.name} to bill, ${currencySymbol}${(Number(item.price) || 0).toFixed(2)}`}
        className={cn(
          "group relative flex flex-col justify-start gap-1.5 w-full p-2 text-left transition-all active:scale-[0.98] select-none cursor-pointer shadow-xs",
          isInCart
            ? "border-primary ring-2 ring-primary/25 bg-card"
            : "hover:border-foreground/30 hover:shadow-xs",
          (disabled || (!hasPacks && isOutOfStock)) && "opacity-55 cursor-not-allowed bg-muted/40"
        )}
      >
        {/* Top Floating Status Badges using shadcn Badge */}
        <div className="absolute top-1.5 left-1.5 right-1.5 z-10 flex items-center justify-between pointer-events-none">
          {/* Low Stock / Out of Stock Badge */}
          {isOutOfStock ? (
            <Badge
              variant="destructive"
              className="text-[8px] font-bold uppercase tracking-wider py-0 px-1.5 h-4"
            >
              Out
            </Badge>
          ) : isLowStock ? (
            <Badge
              variant="outline"
              className="text-[8.5px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 py-0 px-1.5 h-4 gap-0.5"
            >
              <AlertTriangle className="size-2.5 stroke-[2.5]" />
              <span>{item.stock} left</span>
            </Badge>
          ) : (
            <span />
          )}

          {/* Active Cart Counter Badge */}
          {isInCart && (
            <Badge
              variant="default"
              className="gap-0.5 text-[9px] font-bold py-0 px-1.5 h-4 ml-auto shadow-xs"
            >
              <Check className="size-2.5 stroke-[3]" />
              <span>{quantityInCart}</span>
            </Badge>
          )}
        </div>

        {/* Product Image / Visual Placeholder */}
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
            <Tag className="size-5 sm:size-6 text-muted-foreground" />
          )}

          {/* Packaging Tiers Indicator Pill */}
          {hasPacks && (
            <Badge
              variant="secondary"
              className="absolute bottom-1 right-1 z-10 gap-0.5 text-[8.5px] py-0 px-1.5 h-4 shadow-xs"
            >
              <Layers className="size-2.5" />
              <span>{item.packagingOptions!.length + 1} Sizes</span>
            </Badge>
          )}
        </div>

        {/* Product Metadata & Price */}
        <CardContent className="p-0 pt-0 flex flex-col justify-between flex-1 min-w-0 w-full">
          <p
            title={item.name}
            className="text-xs sm:text-sm font-medium text-foreground truncate leading-tight"
          >
            {item.name}
          </p>

          <div className="mt-1 flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate max-w-[55%] font-medium">
              {item.category}
            </span>
            <div className="flex items-center gap-0.5 text-xs sm:text-sm font-bold text-foreground tabular-nums">
              <span>{currencySymbol}{(Number(item.price) || 0).toFixed(2)}</span>
              {hasPacks && <ChevronDown className="size-3 text-muted-foreground" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsive Shadcn Dialog for Size / Pack Tier Selection */}
      {hasPacks && (
        <Dialog open={showPackPopover} onOpenChange={setShowPackPopover}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="size-11 rounded-lg object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="size-11 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                    <Layers className="size-5 text-primary" />
                  </div>
                )}
                <div>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold text-primary mb-1">
                    Select Pack / Size
                  </Badge>
                  <DialogTitle className="text-sm sm:text-base font-bold text-foreground">
                    {item.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {item.category} • In Stock: {item.stock ?? '∞'} {item.unit || 'units'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* List of Pack options */}
            <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto">
              {/* Standard Single Unit Option */}
              <Card
                id="btn-select-pack-single"
                onClick={() => {
                  onSelect(item, null);
                  setShowPackPopover(false);
                }}
                className="p-3 border hover:border-primary cursor-pointer transition-all hover:bg-muted/40 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        Single {item.unit ? `(${item.unit})` : 'Piece'}
                      </span>
                      <Badge variant="secondary" className="text-[9px]">
                        Standard 1x
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Standard base unit pricing
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-foreground">
                      {currencySymbol}{(Number(item.price) || 0).toFixed(2)}
                    </span>
                    <Button size="icon-sm" variant="outline" className="size-7">
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Configured Packaging Options */}
              {item.packagingOptions!.map((pack) => {
                const mult = pack.multiplier || 1;
                const basePrice = Number(item.price) || 0;
                const packPrice = Number(pack.sellingPrice) || 0;
                const perUnit = mult > 0 ? packPrice / mult : packPrice;
                const savingsPercent =
                  basePrice > 0 && packPrice > 0
                    ? Math.round(((basePrice * mult - packPrice) / (basePrice * mult)) * 100)
                    : 0;

                return (
                  <Card
                    key={pack.id}
                    id={`btn-select-pack-${pack.id}`}
                    onClick={() => {
                      onSelect(item, pack);
                      setShowPackPopover(false);
                    }}
                    className="p-3 border hover:border-primary cursor-pointer transition-all hover:bg-muted/40 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {pack.packName}
                          </span>
                          <Badge variant="secondary" className="text-[9px]">
                            {mult}x Pack
                          </Badge>
                          {savingsPercent > 0 && (
                            <Badge variant="default" className="text-[9px] bg-emerald-600 text-white">
                              Save {savingsPercent}%
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          {currencySymbol}{perUnit.toFixed(2)} / unit
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm sm:text-base font-bold text-foreground">
                          {currencySymbol}{packPrice.toFixed(2)}
                        </span>
                        <Button size="icon-sm" variant="outline" className="size-7">
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
