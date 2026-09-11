import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Scan, Barcode } from 'lucide-react';
import { CatalogItem } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SearchModalProps {
  isOpen: boolean;
  catalog: CatalogItem[];
  currencySymbol: string;
  onClose: () => void;
  onSelectItem: (item: CatalogItem) => void;
  onOpenScanner?: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  catalog,
  currencySymbol,
  onClose,
  onSelectItem,
  onOpenScanner,
}) => {
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) return catalog;
    const q = query.trim().toLowerCase();
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [catalog, query]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Search className="size-4 text-foreground" />
            <span>Search Catalog Items</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Search products by title, SKU, barcode or category to quickly add to the bill.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/30">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search name, category, barcode, SKU..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="pl-8 pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {onOpenScanner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenScanner();
              }}
              className="gap-1.5 shrink-0 h-9 text-xs font-medium"
            >
              <Scan className="size-3.5" />
              <span>Scan</span>
            </Button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-border/60">
          {searchResults.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-xs">
              No items matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            searchResults.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectItem(item);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 hover:bg-muted/60 rounded-md cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 border border-border/40">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-semibold text-foreground truncate">{item.name}</h4>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                        {item.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.barcode && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Barcode className="size-3 text-muted-foreground" />
                          <span>{item.barcode}</span>
                        </span>
                      )}
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-3">
                  <span className="font-semibold text-xs text-foreground tabular-nums">
                    {currencySymbol}{item.price}
                  </span>
                  <Button
                    size="icon-xs"
                    variant="default"
                    className="size-6 shrink-0"
                    title="Add to bill"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
