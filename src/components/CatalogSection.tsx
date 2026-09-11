import React from 'react';
import { CatalogItem } from '../types';
import { CATEGORIES } from '../data/catalog';

interface CatalogSectionProps {
  catalog: CatalogItem[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onAddItem: (item: CatalogItem) => void;
  currencySymbol: string;
  itemQuantities: Record<string, number>;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  catalog,
  selectedCategory,
  onSelectCategory,
  onAddItem,
  currencySymbol,
  itemQuantities,
}) => {
  const filteredItems = selectedCategory === 'All Items'
    ? catalog
    : catalog.filter((item) => item.category === selectedCategory);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Categories Bar */}
      <div className="flex overflow-x-auto gap-1.5 px-2.5 py-1.5 border-b border-zinc-200 bg-white shrink-0 scrollbar-none">
        {CATEGORIES.map((category) => {
          const catName = typeof category === 'string' ? category : category.name;
          const catId = typeof category === 'string' ? category : category.id;
          const isActive = selectedCategory === catName;
          return (
            <button
              key={catId}
              id={`cat-tab-${catName.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => onSelectCategory(catName)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {catName}
            </button>
          );
        })}
      </div>

      {/* Catalog Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {filteredItems.map((item) => {
            const currentQty = itemQuantities[item.name] || 0;

            return (
              <button
                key={item.id}
                id={`catalog-item-${item.id}`}
                onClick={() => onAddItem(item)}
                className={`bg-white border rounded-lg p-1.5 flex flex-col gap-1 hover:border-zinc-900 hover:shadow-2xs transition-all active:scale-95 text-left group cursor-pointer relative ${
                  currentQty > 0 ? 'border-zinc-800 ring-1 ring-zinc-800/20' : 'border-zinc-300'
                }`}
              >
                {/* Image Container */}
                <div className="w-full h-14 sm:h-16 bg-zinc-100 rounded overflow-hidden shrink-0 relative">
                  <img
                    alt={item.name}
                    src={item.image}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback placeholder if network fails
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  {currentQty > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-zinc-900 text-white text-[9px] font-bold px-1 py-0.2 rounded-full shadow-2xs">
                      {currentQty}
                    </span>
                  )}
                  {item.isVeg && (
                    <span className="absolute bottom-0.5 left-0.5 bg-white/90 backdrop-blur-xs p-0.5 rounded border border-green-600">
                      <span className="block w-1 h-1 rounded-full bg-green-600"></span>
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex flex-col justify-between flex-1 min-h-[34px]">
                  <p className="text-[11px] font-semibold text-zinc-900 leading-tight line-clamp-2">
                    {item.name}
                  </p>
                  <p className="text-xs font-bold text-zinc-900 mt-0.5 ">
                    {currencySymbol}{item.price}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
