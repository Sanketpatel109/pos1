import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { CatalogItem, Category } from '../types';

export interface CategoryBarProps {
  categories: (Category | string)[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  catalog?: CatalogItem[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  placeholder?: string;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  catalog = [],
  searchQuery = '',
  onSearchChange = (_query: string) => {},
  placeholder = 'Search products, barcode, SKU...',
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      (item) => item.category?.toLowerCase() === categoryName.toLowerCase()
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
           INLINE SEARCH INPUT OVERLAY
           Smoothly replaces the row to reclaim vertical screen space
           ==================================================================== */
        <div className="flex-1 flex items-center gap-2 bg-background border border-border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary rounded-lg px-2.5 h-9 sm:h-10 transition-all shadow-xs">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
          <input
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
            className="w-full text-xs sm:text-sm font-medium text-foreground placeholder-muted-foreground bg-transparent focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search query"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleCloseSearch}
            className="text-[11px] sm:text-xs font-medium text-foreground hover:bg-muted px-3 py-1.5 bg-secondary rounded-lg shrink-0 cursor-pointer active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      ) : (
        /* ====================================================================
           SINGLE ROW: [] + Scrollable Category Chips
           Mobile: compact h-7.5 (30px) search button & chips
           Desktop/Tablet: h-9 / h-10
           ==================================================================== */
        <>
          {/* Compact Search Icon Button */}
          <button
            type="button"
            id="btn-toggle-catalog-search"
            onClick={handleOpenSearch}
            aria-label="Search Products"
            title="Search Products (Tap to open)"
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg bg-muted/70 border border-border hover:bg-muted text-foreground flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs relative"
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground" />
            {searchQuery && (
              <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary ring-2 ring-background" />
            )}
          </button>

          {/* Scrollable Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap scrollbar-none py-0.5 flex-1 min-w-0">
            {categories.map((category) => {
              const catName =
                typeof category === 'string' ? category : category.name;
              const catId =
                typeof category === 'string' ? category : category.id;
              const isActive =
                selectedCategory.toLowerCase() === catName.toLowerCase();
              const count = getItemCount(catName);

              return (
                <button
                  key={catId}
                  type="button"
                  id={`chip-category-${catName.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => onSelectCategory(catName)}
                  className={`h-8 sm:h-9 px-3 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/50 border border-border text-foreground hover:bg-muted shadow-xs'
                  }`}
                >
                  <span className="leading-none">{catName}</span>
                  <span
                    className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-sm tabular-nums tracking-tight font-medium leading-none ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-background text-muted-foreground border border-border/50'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export const SearchCategoryRow = CategoryBar;
