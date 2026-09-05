import React, { useState } from 'react';
import {
  Minus,
  Plus,
  Trash2,
  PauseCircle,
  Printer,
  ShoppingCart,
  Search,
  X,
  Sparkles,
  Tag,
  PlusCircle,
  Check,
  ShoppingBag,
  Scan,
  Barcode,
  Scale,
  AlertTriangle,
} from 'lucide-react';
import { CatalogItem, Category, BillItem } from '../types';
import { hardware } from '../utils/hardware';

interface ItemWiseBillTerminalProps {
  currentBillItems: BillItem[];
  catalog: CatalogItem[];
  categories: Category[];
  currencySymbol: string;
  orderNumber?: number;
  taxRate?: number;
  onAddItem: (item: CatalogItem) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateItemRate?: (id: string, newRate: number) => void;
  onRemoveItem: (id: string) => void;
  onClearBill: () => void;
  onHoldBill?: () => void;
  onOpenAddCustomProduct: () => void;
  onPrintBill: () => void;
  onSaveBill: () => void;
  onOpenScanner?: (mode?: 'add-to-bill' | 'price-check' | 'search') => void;
  onOpenPriceCheck?: () => void;
}

export const ItemWiseBillTerminal: React.FC<ItemWiseBillTerminalProps> = ({
  currentBillItems,
  catalog,
  categories,
  currencySymbol,
  orderNumber = 42,
  taxRate = 0,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onClearBill,
  onHoldBill,
  onOpenAddCustomProduct,
  onPrintBill,
  onSaveBill,
  onOpenScanner,
  onOpenPriceCheck,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const [scaleWeight, setScaleWeight] = useState<number>(0.0);
  const [isScaleConnected, setIsScaleConnected] = useState<boolean>(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState<boolean>(false);

  // Connect or simulate scale
  const handleConnectScale = async () => {
    const res = await hardware.connectWeighingScale();
    if (res.success) {
      setIsScaleConnected(true);
      hardware.onScaleReading((reading) => {
        setScaleWeight(reading.weight);
      });
    } else {
      // If Web Serial not supported or rejected, prompt simulated scale modal
      setIsScaleModalOpen(true);
    }
  };

  const handleSimulateWeight = (kg: number) => {
    hardware.simulateScaleWeight(kg);
    setScaleWeight(kg);
  };

  // Enhanced onAddItem that checks for weight scale
  const handleItemClick = (item: CatalogItem) => {
    if (item.unit === 'kg' && scaleWeight > 0) {
      // Add as weighted item
      onAddItem({
        ...item,
        price: item.price,
      });
    } else {
      onAddItem(item);
    }
  };

  // Filter products by selected category and search query (including barcode / SKU)
  const filteredCatalog = catalog.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All Items' ||
      selectedCategory === 'ALL' ||
      item.category.toLowerCase() === selectedCategory.toLowerCase();

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      (item.sku && item.sku.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  // Calculate totals
  const totalItemsCount = currentBillItems.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = currentBillItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + taxAmount;

  const formattedOrderNumber = String(orderNumber).padStart(3, '0');

  // Helper to get cart quantity for a specific catalog item
  const getItemCartQty = (itemName: string) => {
    const found = currentBillItems.find((i) => i.name === itemName);
    return found ? found.quantity : 0;
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#fcf8fb] overflow-hidden">
      {/* 
        ========================================================================
        MENU ITEMS / CATALOG SECTION
        Tablet / Desktop: Left Column (w-full md:w-[62%] lg:w-[65%] md:border-r border-[#d4d4d8] flex flex-col)
        Phone: Bottom half of flex-col or standard stacked section
        ========================================================================
      */}
      <div className="order-2 md:order-1 w-full md:w-[62%] lg:w-[65%] flex flex-col min-h-0 bg-white md:border-r border-[#d4d4d8]">
        {/* Search & Category Filter Header Bar */}
        <div className="border-b border-[#d4d4d8] bg-white shrink-0">
          {/* Mobile View: Single Compact Row (< md) */}
          <div className="md:hidden p-2">
            {isMobileSearchOpen || searchQuery ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#f6f2f5] border border-[#18181b] rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[#77767b] shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs text-[#1c1b1d] placeholder-[#77767b] bg-transparent focus:outline-hidden"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-[#77767b] hover:text-[#1c1b1d] p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsMobileSearchOpen(false);
                  }}
                  className="px-2.5 py-1.5 bg-[#f0edf0] hover:bg-[#eae7ea] text-[#1c1b1d] rounded-xl text-xs font-bold cursor-pointer shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-hidden">
                {/* Mobile Scan Button */}
                {onOpenScanner && (
                  <button
                    onClick={() => onOpenScanner('add-to-bill')}
                    className="px-2.5 py-1.5 rounded-xl border border-[#d4d4d8] bg-[#18181b] text-white text-xs font-extrabold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all shadow-2xs"
                    title="Scan Barcode / QR"
                  >
                    <Scan className="w-3.5 h-3.5 text-white" />
                    <span>Scan</span>
                  </button>
                )}

                {/* Compact Search Trigger Pill */}
                <button
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#d4d4d8] bg-[#f0edf0] hover:bg-[#eae7ea] text-[#1c1b1d] text-xs font-extrabold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all shadow-2xs"
                  title="Search Menu"
                >
                  <Search className="w-3.5 h-3.5 text-[#1c1b1d]" />
                  <span>Search</span>
                </button>

                {/* Inline Category Horizontal Scroll */}
                <div className="flex overflow-x-auto no-scrollbar gap-1.5 py-0.5 flex-1">
                  {categories.map((cat) => {
                    const isActive =
                      selectedCategory.toLowerCase() === cat.name.toLowerCase() ||
                      (cat.name === 'All Items' && selectedCategory === 'ALL');

                    const count =
                      cat.name === 'All Items' || cat.name === 'ALL'
                        ? catalog.length
                        : catalog.filter((i) => i.category.toLowerCase() === cat.name.toLowerCase()).length;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                          isActive
                            ? 'bg-[#18181b] text-white shadow-2xs'
                            : 'border border-[#d4d4d8] bg-[#fcf8fb] text-[#47464b] hover:bg-[#eae7ea] hover:text-[#1c1b1d]'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span
                          className={`text-[9px] px-1 py-0.1 rounded-full font-mono ${
                            isActive ? 'bg-white/20 text-white' : 'bg-[#e5e1e4] text-[#77767b]'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Desktop & Tablet View: Full Header (>= md) */}
          <div className="hidden md:flex flex-col gap-2.5 p-3">
            {/* Live Search Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#f6f2f5] border border-[#d4d4d8] rounded-xl px-3 py-2 flex items-center gap-2 focus-within:border-[#18181b] focus-within:bg-white transition-all">
                <Search className="w-4 h-4 text-[#77767b] shrink-0" />
                <input
                  type="text"
                  placeholder="Search menu items by name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs text-[#1c1b1d] placeholder-[#77767b] bg-transparent focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[#77767b] hover:text-[#1c1b1d] p-0.5 rounded-full hover:bg-[#eae7ea] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Digital Weighing Scale Button */}
              <button
                type="button"
                onClick={handleConnectScale}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 cursor-pointer border ${
                  scaleWeight > 0
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-[#f6f2f5] hover:bg-[#eae7ea] text-[#1c1b1d] border-[#d4d4d8]'
                }`}
                title="Connect Digital Weighing Scale (Web Serial)"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{scaleWeight > 0 ? `${scaleWeight.toFixed(3)} kg` : 'Scale'}</span>
              </button>

              {/* Price Check & Info (Laser Gun) Button */}
              {onOpenPriceCheck && (
                <button
                  type="button"
                  onClick={onOpenPriceCheck}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#f6f2f5] hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 cursor-pointer"
                  title="Price Check & Product Stock Info (F2 or Laser Gun)"
                >
                  <Scan className="w-3.5 h-3.5 text-zinc-700" />
                  <span>Price Check</span>
                  <span className="text-[10px] font-mono bg-zinc-200 text-zinc-700 px-1 rounded">F2</span>
                </button>
              )}

              {onOpenScanner && (
                <button
                  onClick={() => onOpenScanner('add-to-bill')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs"
                  title="Camera Barcode / QR Scanner"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Camera</span>
                </button>
              )}

              <button
                onClick={onOpenAddCustomProduct}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#f6f2f5] hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 cursor-pointer"
                title="Add Custom Item"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Custom Item</span>
              </button>
            </div>

            {/* Category Horizontal Scroll Pills */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 py-0.5">
              {categories.map((cat) => {
                const isActive =
                  selectedCategory.toLowerCase() === cat.name.toLowerCase() ||
                  (cat.name === 'All Items' && selectedCategory === 'ALL');

                const count =
                  cat.name === 'All Items' || cat.name === 'ALL'
                    ? catalog.length
                    : catalog.filter((i) => i.category.toLowerCase() === cat.name.toLowerCase()).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-[#18181b] text-white shadow-xs'
                        : 'border border-[#d4d4d8] bg-[#fcf8fb] text-[#47464b] hover:bg-[#eae7ea] hover:text-[#1c1b1d]'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#e5e1e4] text-[#77767b]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Catalog Items Grid */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3.5 bg-[#fcf8fb]">
          {filteredCatalog.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center text-[#77767b]">
              <Tag className="w-8 h-8 text-[#c8c5cb] mb-2" />
              <p className="text-xs font-bold text-[#1c1b1d]">No items match "{searchQuery || selectedCategory}"</p>
              <p className="text-[11px] text-[#77767b] mt-0.5">Try searching for a different item or select another category</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3">
              {filteredCatalog.map((item) => {
                const qtyInCart = getItemCartQty(item.name);
                const isInCart = qtyInCart > 0;

                return (
                  <button
                    key={item.id}
                    id={`product-card-${item.id}`}
                    onClick={() => handleItemClick(item)}
                    className={`bg-white border rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col justify-between text-left transition-all active:scale-95 cursor-pointer relative group ${
                      isInCart
                        ? 'border-[#18181b] ring-2 ring-[#18181b]/10 shadow-sm'
                        : 'border-[#d4d4d8] hover:border-[#18181b] hover:shadow-sm'
                    } ${item.stock !== undefined && item.stock <= 0 ? 'opacity-65' : ''}`}
                  >
                    {/* Active Cart Counter Badge */}
                    {isInCart && (
                      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 bg-[#18181b] text-white text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm font-mono flex items-center gap-0.5 sm:gap-1">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>{qtyInCart}</span>
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    {item.stock !== undefined && (
                      <div className="absolute top-1.5 left-1.5 z-10">
                        {item.stock <= 0 ? (
                          <span className="text-[8px] font-black uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5 rounded shadow-xs">
                            Out of Stock
                          </span>
                        ) : item.stock <= (item.lowStockThreshold ?? 5) ? (
                          <span className="text-[8px] font-bold uppercase tracking-wider bg-amber-500 text-zinc-950 px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                            <AlertTriangle className="w-2 h-2" />
                            {item.stock} left
                          </span>
                        ) : (
                          <span className="text-[8px] font-mono font-medium text-zinc-600 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded border border-zinc-200">
                            {item.stock} {item.unit || 'pcs'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Thumbnail Image Container */}
                    <div className="w-full h-16 sm:h-24 md:h-28 bg-[#f0edf0] rounded-lg sm:rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center mb-1.5 sm:mb-2">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Tag className="w-5 h-5 sm:w-7 sm:h-7 text-[#77767b]" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold leading-tight sm:leading-snug text-[#1c1b1d] line-clamp-2">
                        {item.name}
                      </p>
                      <div className="flex items-center justify-between mt-1 sm:mt-1.5 pt-1 border-t border-[#f0edf0]">
                        <span className="text-[9px] sm:text-[10px] font-semibold text-[#77767b] uppercase truncate max-w-[60%]">
                          {item.category}
                        </span>
                        <span className="text-[11px] sm:text-xs font-black font-mono text-[#1c1b1d]">
                          {currencySymbol}
                          {item.price.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 
        ========================================================================
        CURRENT BILL / ACTIVE CART SECTION
        Tablet / Desktop: Right Column (w-full md:w-[38%] lg:w-[35%] flex flex-col bg-white)
        Phone: Top half of screen (h-[48%]) with smooth scrolling
        ========================================================================
      */}
      <div className="order-1 md:order-2 w-full md:w-[38%] lg:w-[35%] flex flex-col bg-white border-b md:border-b-0 border-[#d4d4d8] min-h-[42%] max-h-[50%] md:max-h-full md:h-full shrink-0">
        {/* Terminal Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-[#d4d4d8] bg-white shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#18181b]" />
            <h2 className="text-base sm:text-[17px] text-[#1c1b1d] font-extrabold tracking-tight">
              Current Bill
            </h2>
            <span className="bg-[#f0edf0] text-[#1c1b1d] text-[10px] px-2 py-0.5 rounded-full font-bold font-mono">
              {totalItemsCount} items
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-[#18181b] text-white text-[11px] px-2.5 py-0.5 rounded-md font-bold font-mono tracking-wider">
              Order #{formattedOrderNumber}
            </span>
          </div>
        </div>

        {/* Bill Items List - Separated cleanly by divider lines */}
        <div className="flex-1 overflow-y-auto px-4 divide-y divide-[#f0edf0] bg-white no-scrollbar">
          {currentBillItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#77767b]">
              <ShoppingCart className="w-9 h-9 text-[#c8c5cb] mb-2 stroke-[1.5]" />
              <p className="text-xs font-bold text-[#1c1b1d]">No items in active bill</p>
              <p className="text-[11px] text-[#77767b] mt-0.5">
                Tap any product on the menu to start building ticket
              </p>
            </div>
          ) : (
            currentBillItems.map((item) => {
              const itemTotal = item.unitPrice * item.quantity;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 sm:py-3 gap-2 bg-white transition-colors"
                >
                  {/* Left: Item Info */}
                  <div className="flex flex-col flex-1 min-w-0 pr-2">
                    <h3 className="text-xs sm:text-sm font-bold text-[#1c1b1d] truncate">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-[#77767b] font-mono mt-0.5">
                      {currencySymbol}
                      {item.unitPrice.toFixed(2)} / ea
                    </p>
                  </div>

                  {/* Middle / Right: Quantity Stepper Pill & Total */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="flex items-center bg-[#f0edf0] rounded-xl border border-[#e4e4e7] p-0.5">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[#1c1b1d] hover:bg-white active:bg-[#dcd9dc] transition-colors cursor-pointer"
                        title="Decrease"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <span className="text-xs text-[#1c1b1d] w-6 sm:w-7 text-center font-bold font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[#1c1b1d] hover:bg-white active:bg-[#dcd9dc] transition-colors cursor-pointer"
                        title="Increase"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>

                    <span className="font-extrabold text-xs sm:text-sm text-[#1c1b1d] min-w-[3.5rem] text-right font-mono">
                      {currencySymbol}
                      {itemTotal.toFixed(2)}
                    </span>

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-[#77767b] hover:text-[#ba1a1a] p-1 rounded-md hover:bg-[#ffdad6]/50 transition-colors cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Total and Actions Section */}
        <div className="px-4 py-3.5 bg-white border-t border-[#d4d4d8] shrink-0 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          {/* Subtotals & Taxes */}
          <div className="flex flex-col gap-1 mb-2.5 text-xs text-[#47464b]">
            <div className="flex justify-between items-center">
              <span>Subtotal ({totalItemsCount} items)</span>
              <span className="font-bold text-[#1c1b1d] font-mono">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between items-center">
                <span>Tax ({taxRate}%)</span>
                <span className="font-bold text-[#1c1b1d] font-mono">
                  +{currencySymbol}
                  {taxAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-end mb-3 border-t border-[#d4d4d8] pt-2">
            <div>
              <span className="text-[10px] text-[#77767b] font-bold uppercase tracking-wider block">
                Total Due
              </span>
              <span className="text-xs font-bold text-[#1c1b1d]">Net Amount Payable</span>
            </div>
            <span className="text-2xl sm:text-3xl text-[#1c1b1d] font-black leading-none tracking-tight font-mono">
              {currencySymbol}
              {grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Action Buttons Grid */}
          <div className="flex items-center gap-2">
            {/* Delete / Clear */}
            <button
              onClick={onClearBill}
              disabled={currentBillItems.length === 0}
              title="Clear active bill"
              className="flex items-center justify-center bg-[#e4e4e7] text-[#18181b] hover:bg-[#ba1a1a] hover:text-white rounded-xl transition-all active:scale-95 w-11 h-11 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Pause / Hold */}
            <button
              onClick={onHoldBill || onClearBill}
              disabled={currentBillItems.length === 0}
              title="Hold / Pause Order"
              className="flex items-center justify-center bg-[#f4f4f5] text-[#18181b] hover:bg-[#dcd9dc] rounded-xl transition-all active:scale-95 w-11 h-11 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-[#d4d4d8]/70"
            >
              <PauseCircle className="w-4 h-4" />
            </button>

            {/* Print Button */}
            <button
              onClick={onPrintBill}
              disabled={currentBillItems.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#f4f4f5] text-[#1c1b1d] hover:bg-[#eae7ea] rounded-xl transition-all active:scale-95 h-11 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-[#d4d4d8]"
            >
              <Printer className="w-4 h-4" />
              <span className="font-extrabold uppercase text-[11px] tracking-wider">Print</span>
            </button>

            {/* Pay Button */}
            <button
              onClick={onSaveBill}
              disabled={currentBillItems.length === 0}
              className="flex-[1.4] flex items-center justify-center gap-1.5 bg-[#18181b] text-white hover:bg-black rounded-xl transition-all active:scale-95 shadow-md h-11 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="font-extrabold uppercase text-[11px] tracking-wider">Pay Bill</span>
            </button>
          </div>
        </div>
      </div>

      {/* Digital Weighing Scale Modal */}
      {isScaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#d4d4d8] bg-[#fcf8fb]">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#18181b]" />
                <h3 className="text-sm font-bold text-[#1c1b1d]">Digital Weighing Scale</h3>
              </div>
              <button
                onClick={() => setIsScaleModalOpen(false)}
                className="text-[#77767b] hover:text-[#1c1b1d] p-1 rounded-lg hover:bg-[#eae7ea] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Digital LED Display */}
              <div className="bg-[#18181b] text-emerald-400 font-mono rounded-xl p-4 text-center border-2 border-[#27272a] shadow-inner">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Scale Readout</p>
                <div className="text-4xl font-black tracking-wider">
                  {scaleWeight.toFixed(3)} <span className="text-xl font-normal text-emerald-500">kg</span>
                </div>
                <div className="flex justify-center items-center gap-3 mt-2 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full ${scaleWeight > 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                    {scaleWeight > 0 ? '● STABLE' : '○ ZERO'}
                  </span>
                  <span className="text-zinc-400">
                    {isScaleConnected ? 'USB Serial COM: Connected' : 'Manual / Simulation Mode'}
                  </span>
                </div>
              </div>

              {/* Physical USB Serial Connect */}
              <button
                type="button"
                onClick={async () => {
                  const res = await hardware.connectWeighingScale();
                  if (res.success) {
                    setIsScaleConnected(true);
                    hardware.onScaleReading((reading) => setScaleWeight(reading.weight));
                  }
                }}
                className="w-full py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Pair Physical Scale (Web Serial API)</span>
              </button>

              {/* Quick Weight & Tare Controls */}
              <div>
                <label className="text-[10px] font-bold text-[#77767b] uppercase block mb-1.5">
                  Quick Tare & Preset Weights
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSimulateWeight(0)}
                    className="py-1.5 bg-[#f6f2f5] hover:bg-[#eae7ea] border border-[#d4d4d8] rounded-lg text-xs font-bold text-red-600 cursor-pointer"
                  >
                    Tare (0.0)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateWeight(0.25)}
                    className="py-1.5 bg-[#f6f2f5] hover:bg-[#eae7ea] border border-[#d4d4d8] rounded-lg text-xs font-mono font-bold text-[#1c1b1d] cursor-pointer"
                  >
                    0.250kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateWeight(0.5)}
                    className="py-1.5 bg-[#f6f2f5] hover:bg-[#eae7ea] border border-[#d4d4d8] rounded-lg text-xs font-mono font-bold text-[#1c1b1d] cursor-pointer"
                  >
                    0.500kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateWeight(1.0)}
                    className="py-1.5 bg-[#f6f2f5] hover:bg-[#eae7ea] border border-[#d4d4d8] rounded-lg text-xs font-mono font-bold text-[#1c1b1d] cursor-pointer"
                  >
                    1.000kg
                  </button>
                </div>
              </div>

              {/* Manual numeric input */}
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Manual Weight Input (kg)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.005"
                    min="0"
                    placeholder="e.g. 1.350"
                    value={scaleWeight || ''}
                    onChange={(e) => handleSimulateWeight(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-[#1c1b1d] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScaleModalOpen(false)}
                    className="px-4 py-1.5 bg-[#18181b] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

