import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { CatalogItem, Category } from '../types';
import { ensureAllItemsFirst } from '../utils/categories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from 'cn';

export interface CategoryBarProps {
  categories: (Category | string)[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  catalog?: CatalogItem[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  placeholder?: string;
  onOpenScanner?: () => void;
  onOpenQuickAdd?: () => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  catalog = [],
  searchQuery = '',
  onSearchChange = (_query: string) => {},
  placeholder = 'Search products, barcode, SKU...',
  onOpenQuickAdd,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Guarantee that "All Items" is always strictly the FIRST category chip
  const orderedCategories = useMemo(() => {
    return ensureAllItemsFirst(categories);
  }, [categories]);

  // Sync state if external search query changes
  useEffect(() => {
    if (searchQuery && !isSearchOpen) {
      setIsSearchOpen(true);
    }
  }, [searchQuery]);

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Helper to get item count per category
  const getItemCount = (categoryName: string): number => {
    if (!catalog || catalog.length === 0) return 0;
    if (categoryName === 'All Items' || categoryName === 'All') {
      return catalog.length;
    }
    return catalog.filter(
      (item) => (item.category || '').toLowerCase() === (categoryName || '').toLowerCase()
    ).length;
  };

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    onSearchChange('');
  };

  return (
    <div
      id="category-search-bar"
      className="w-full h-11 sm:h-12 px-2 sm:px-3 bg-card border-b border-border flex items-center gap-1.5 sm:gap-2 shrink-0 select-none z-10"
    >
      {isSearchOpen ? (
        /* ====================================================================
           INLINE SEARCH INPUT OVERLAY USING SHADCN COMPONENTS
           ==================================================================== */
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-2.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              type="text"
              id="input-inline-product-search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleCloseSearch();
                }
              }}
              placeholder={placeholder}
              aria-label="Search catalog products"
              className="pl-8 pr-8 h-8 sm:h-9 text-xs sm:text-sm"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onSearchChange('')}
                aria-label="Clear search query"
                className="absolute right-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCloseSearch}
            className="text-xs h-8 sm:h-9 px-3 cursor-pointer"
          >
            Done
          </Button>
        </div>
      ) : (
        /* ====================================================================
           SINGLE ROW: SHADCN BUTTONS + BADGES
           ==================================================================== */
        <>
          {/* Compact Search Icon Button */}
          <Button
            type="button"
            id="btn-toggle-catalog-search"
            variant="outline"
            size="icon-sm"
            onClick={handleOpenSearch}
            aria-label="Search Products"
            title="Search Products (Tap to open)"
            className="size-8 sm:size-9 shrink-0 relative cursor-pointer"
          >
            <Search className="size-4" />
            {searchQuery && (
              <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary ring-2 ring-background" />
            )}
          </Button>

          {/* Quick Add Product Button */}
          {onOpenQuickAdd && (
            <Button
              type="button"
              id="btn-category-quick-add"
              variant="outline"
              size="sm"
              onClick={onOpenQuickAdd}
              aria-label="Quick Add Product"
              title="Add product directly from this screen"
              className="h-8 sm:h-9 px-2.5 shrink-0 gap-1 bg-primary/10 border-primary/25 text-primary hover:bg-primary/20 hover:text-primary cursor-pointer text-xs font-semibold"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Add</span>
            </Button>
          )}

          {/* Scrollable Category Chips using shadcn Button & Badge */}
          <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap scrollbar-none py-0.5 flex-1 min-w-0">
            {orderedCategories.map((category) => {
              const catName =
                typeof category === 'string' ? category : category.name;
              const catId =
                typeof category === 'string' ? category : category.id;
              const isActive =
                selectedCategory.toLowerCase() === catName.toLowerCase();
              const count = getItemCount(catName);

              return (
                <Button
                  key={catId}
                  type="button"
                  id={`chip-category-${catName.toLowerCase().replace(/\s+/g, '-')}`}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSelectCategory(catName)}
                  className={cn(
                    "h-8 sm:h-9 px-3 gap-1.5 shrink-0 text-xs font-medium whitespace-nowrap cursor-pointer transition-all",
                    !isActive && "text-foreground bg-card hover:bg-muted"
                  )}
                >
                  <span className="leading-none">{catName}</span>
                  <Badge
                    variant={isActive ? 'secondary' : 'outline'}
                    className={cn(
                      "text-[9px] px-1.5 py-0 h-4 min-w-4 rounded-sm font-semibold tabular-nums leading-none",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                        : "text-muted-foreground border-border/70"
                    )}
                  >
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export const SearchCategoryRow = CategoryBar;
