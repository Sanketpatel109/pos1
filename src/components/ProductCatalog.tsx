import React, { useMemo } from 'react';
import { CatalogItem, Category } from '../types';
import { CategoryBar } from './CategoryBar';
import { ProductCard } from './ProductCard';
import { PackageOpen } from 'lucide-react';

export interface ProductCatalogProps {
  catalog: CatalogItem[];
  categories: (Category | string)[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currencySymbol?: string;
  itemQuantities?: Record<string, number>;
  onSelectItem: (item: CatalogItem) => void;
  className?: string;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  catalog,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  currencySymbol = '₹',
  itemQuantities = {},
  onSelectItem,
  className = '',
}) => {
  // Filter catalog by category and search query
  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      // Category filter
      const matchesCategory =
        !selectedCategory ||
        selectedCategory === 'All Items' ||
        selectedCategory === 'All' ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase();

      // Search query filter (matches name, barcode, sku, category)
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, searchQuery]);

  return (
    <div
      id="product-catalog-container"
      className={`flex flex-col h-full w-full bg-background overflow-hidden min-h-0 ${className}`}
    >
      {/* 
        ========================================================================
        SINGLE-ROW SEARCH & CATEGORY BAR
        Pins compact [] button on left + scrollable category chips beside it
        Reclaims vertical screen space by removing standalone search bars
        ========================================================================
      */}
      <CategoryBar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        catalog={catalog}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />

      {/* 
        ========================================================================
        PRODUCT GRID (3 Columns on Mobile, Scalable on Tablet/Desktop)
        Touch-optimized cards with crisp 1px borders and stock badges
        ========================================================================
      */}
      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-3 sm:px-3 sm:pt-2.5 sm:pb-4 min-h-0">
        {filteredCatalog.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5">
            {filteredCatalog.map((item) => {
              const qty = itemQuantities[item.name] || 0;
              return (
                <ProductCard
                  key={item.id}
                  item={item}
                  quantityInCart={qty}
                  currencySymbol={currencySymbol}
                  onSelect={onSelectItem}
                />
              );
            })}
          </div>
        ) : (
          /* Empty Search / Category Results State */
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 bg-card rounded-lg border border-border m-1 shadow-xs">
            <PackageOpen className="w-8 h-8 text-muted-foreground mb-2 stroke-[1.5]" />
            <p className="text-xs font-semibold text-foreground mb-1">
              No matching products
            </p>
            <p className="text-[10px] text-muted-foreground max-w-xs mb-3">
              {searchQuery
                ? `No items found matching "${searchQuery}". Try a different search term or check categories.`
                : `No items available in the "${selectedCategory}" category.`}
            </p>
            {(searchQuery || selectedCategory !== 'All Items') && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  onSelectCategory('All Items');
                }}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                Show All Items
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
