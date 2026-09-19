import React, { useMemo } from 'react';
import { CatalogItem, Category, PackagingOption } from '../types';
import { CategoryBar } from './CategoryBar';
import { ProductCard } from './ProductCard';
import { PackageOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface ProductCatalogProps {
  catalog: CatalogItem[];
  categories: (Category | string)[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currencySymbol?: string;
  itemQuantities?: Record<string, number>;
  onSelectItem: (item: CatalogItem, pack?: PackagingOption | null) => void;
  onOpenQuickAdd?: () => void;
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
  onOpenQuickAdd,
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
        (item.category || '').toLowerCase() === selectedCategory.toLowerCase();

      // Search query filter (matches name, barcode, sku, category)
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase() === cleanQ(q)) ||
        (item.sku && (item.sku || '').toLowerCase().includes(q)) ||
        ((item.category || '').toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, searchQuery]);

  function cleanQ(val: string) {
    return val.trim();
  }

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
        onOpenQuickAdd={onOpenQuickAdd}
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
          <Card className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 m-1 shadow-xs border-dashed">
            <PackageOpen className="size-8 text-muted-foreground mb-2 stroke-[1.5]" />
            <p className="text-xs font-semibold text-foreground mb-1">
              No matching products
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs mb-3">
              {searchQuery
                ? `No items found matching "${searchQuery}". Try a different search term or check categories.`
                : catalog.length === 0
                ? 'Your store catalog is empty. Tap "+ Add First Product" below or "+ Add" in the top bar to add your products.'
                : `No items available in the "${selectedCategory}" category.`}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {onOpenQuickAdd && (
                <Button
                  type="button"
                  id="btn-empty-quick-add"
                  size="sm"
                  onClick={onOpenQuickAdd}
                  className="gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>Add First Product</span>
                </Button>
              )}

              {(searchQuery || (selectedCategory !== 'All Items' && selectedCategory !== 'All')) && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onSearchChange('');
                    onSelectCategory('All Items');
                  }}
                  className="cursor-pointer shadow-xs"
                >
                  Show All Items
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
