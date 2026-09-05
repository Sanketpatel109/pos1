import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Scan, Barcode } from 'lucide-react';
import { CatalogItem } from '../types';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Header */}
        <div className="p-2.5 border-b border-zinc-200 flex items-center gap-2 bg-zinc-50">
          <Search className="w-4 h-4 text-zinc-500 shrink-0 ml-1" />
          <input
            type="text"
            placeholder="Search name, category, barcode, SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full py-1 px-1 bg-transparent text-xs md:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenScanner && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScanner();
              }}
              title="Scan Barcode or QR Code"
              className="p-1.5 bg-[#18181b] hover:bg-black text-white rounded-lg cursor-pointer flex items-center gap-1 text-[11px] font-bold shrink-0 shadow-2xs"
            >
              <Scan className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scan</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 px-2 py-1 bg-zinc-200 rounded-lg cursor-pointer shrink-0"
          >
            Esc
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-zinc-100 no-scrollbar">
          {searchResults.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
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
                className="flex items-center justify-between p-2 hover:bg-zinc-100 rounded-xl cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-zinc-900 truncate">{item.name}</h4>
                      <span className="text-[9px] px-1 py-0.2 bg-zinc-200 rounded text-zinc-700 font-medium">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.barcode && (
                        <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-0.5">
                          <Barcode className="w-3 h-3 text-zinc-400" />
                          <span>{item.barcode}</span>
                        </span>
                      )}
                      {item.description && (
                        <p className="text-[11px] text-zinc-400 truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="font-mono font-bold text-xs text-zinc-900">
                    {currencySymbol}{item.price}
                  </span>
                  <button
                    className="w-6 h-6 rounded bg-zinc-900 group-hover:bg-black text-white flex items-center justify-center transition-colors shadow-2xs"
                    title="Add to bill"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
