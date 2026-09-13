import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Scale,
  X,
} from 'lucide-react';
import { CatalogItem, Category, BillItem, PackagingOption } from '../types';
import { hardware } from '../utils/hardware';
import { ProductCatalog } from './ProductCatalog';
import { CurrentBill } from './CurrentBill';
import { useCart } from '../context/CartContext';

interface ItemWiseBillTerminalProps {
  currentBillItems?: BillItem[];
  catalog: CatalogItem[];
  categories: Category[];
  currencySymbol: string;
  orderNumber?: number;
  heldOrdersCount?: number;
  taxRate?: number;
  onAddItem?: (item: CatalogItem, pack?: PackagingOption | null) => void;
  onUpdateQuantity?: (id: string, delta: number) => void;
  onUpdateItemRate?: (id: string, newRate: number) => void;
  canOverridePrice?: boolean;
  onRequestPriceOverrideAuth?: (item: BillItem, onApproved: () => void) => void;
  onRemoveItem?: (id: string) => void;
  onClearBill?: () => void;
  onHoldBill?: () => void;
  onOpenHeldOrders?: () => void;
  onOpenAddCustomProduct?: () => void;
  onPrintBill: () => void;
  onSaveBill: () => void;
  onOpenScanner?: (mode?: 'add-to-bill' | 'price-check' | 'search') => void;
  onOpenPriceCheck?: () => void;
  onSwitchMode?: () => void;
}

export const ItemWiseBillTerminal: React.FC<ItemWiseBillTerminalProps> = ({
  currentBillItems: propCurrentBillItems,
  catalog,
  categories,
  currencySymbol,
  orderNumber = 42,
  heldOrdersCount = 0,
  taxRate = 0,
  onAddItem: propOnAddItem,
  onUpdateQuantity: propOnUpdateQuantity,
  onUpdateItemRate: propOnUpdateItemRate,
  canOverridePrice = true,
  onRequestPriceOverrideAuth,
  onRemoveItem: propOnRemoveItem,
  onClearBill: propOnClearBill,
  onHoldBill,
  onOpenHeldOrders,
  onPrintBill,
  onSaveBill,
  onOpenScanner,
  onOpenPriceCheck,
  onSwitchMode,
}) => {
  const {
    currentBillItems: cartItems,
    addItem: cartAddItem,
    updateQty: cartUpdateQty,
    removeItem: cartRemoveItem,
    clearCart: cartClearCart,
    updateItemRate: cartUpdateItemRate,
  } = useCart();

  const currentBillItems = propCurrentBillItems ?? cartItems;
  const onAddItem = propOnAddItem ?? cartAddItem;
  const onUpdateQuantity = propOnUpdateQuantity ?? cartUpdateQty;
  const onRemoveItem = propOnRemoveItem ?? cartRemoveItem;
  const onClearBill = propOnClearBill ?? cartClearCart;
  const onUpdateItemRate = propOnUpdateItemRate ?? cartUpdateItemRate;

  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scaleWeight, setScaleWeight] = useState<number>(0.0);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState<boolean>(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('input-inline-product-search') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
        } else {
          const searchBtn = document.getElementById('btn-toggle-catalog-search') as HTMLButtonElement | null;
          searchBtn?.click();
        }
      }
      if (e.key === 'F2' && onOpenPriceCheck) {
        e.preventDefault();
        onOpenPriceCheck();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenPriceCheck]);

  // Connect or simulate scale
  const handleConnectScale = async () => {
    const res = await hardware.connectWeighingScale();
    if (res.success) {
      hardware.onScaleReading((reading) => {
        setScaleWeight(reading.weight);
      });
    } else {
      setIsScaleModalOpen(true);
    }
  };

  const handleSimulateWeight = (kg: number) => {
    hardware.simulateScaleWeight(kg);
    setScaleWeight(kg);
  };

  // Enhanced onAddItem that checks for packaging options & weight scale
  const handleItemClick = (item: CatalogItem, pack?: PackagingOption | null) => {
    if (pack) {
      if (propOnAddItem) {
        propOnAddItem(item, pack);
      } else {
        cartAddItem({
          id: item.id,
          itemId: item.id,
          name: item.name,
          unitPrice: pack.sellingPrice,
          price: pack.sellingPrice,
          quantity: 1,
          selectedPackName: pack.packName,
          multiplier: pack.multiplier || 1,
          barcode: pack.barcode,
          gstRate: item.gstRate,
        });
      }
    } else {
      if (item.unit === 'kg' && scaleWeight > 0) {
        onAddItem({
          ...item,
          price: item.price,
        });
      } else {
        onAddItem(item);
      }
    }
  };

  // Pre-calculate cart quantities map for fast lookup
  const itemQuantitiesMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of currentBillItems) {
      map[item.name] = (map[item.name] || 0) + item.quantity;
    }
    return map;
  }, [currentBillItems]);

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-background overflow-hidden select-none">
      {/* 
        ========================================================================
        MOBILE LAYOUT (order-1 md:order-2):
        Top Zone: Current Bill Panel directly on screen above the catalog
        Desktop: Right Column (34-40% width)
        - Fixed Header ("Current Bill" · "Bill #042")
        - Scrollable Line Items with last added item always visible
        - Fixed Summary (Subtotal, GST, Total)
        - Direct Primary Action Button: "Pay ₹{total.toFixed(2)} →"
        ========================================================================
      */}
      <div className="order-1 md:order-2 w-full md:w-[40%] lg:w-[36%] xl:w-[34%] flex flex-col bg-card border-b md:border-b-0 border-border shrink-0 md:h-full md:max-h-full shadow-xs z-10">
        <CurrentBill
          orderNumber={orderNumber}
          items={currentBillItems}
          currencySymbol={currencySymbol}
          taxRate={taxRate}
          heldOrdersCount={heldOrdersCount}
          onUpdateQuantity={onUpdateQuantity}
          onUpdateItemRate={onUpdateItemRate}
          canOverridePrice={canOverridePrice}
          onRequestPriceOverrideAuth={onRequestPriceOverrideAuth}
          onRemoveItem={onRemoveItem}
          onClearBill={onClearBill}
          onHoldOrder={onHoldBill || (() => {})}
          onPrintBill={onPrintBill}
          onPay={onSaveBill}
          onOpenHeldOrders={onOpenHeldOrders}
          onSwitchMode={onSwitchMode}
        />
      </div>

      {/* 
        ========================================================================
        CATALOG SECTION (order-2 md:order-1):
        Mobile: Bottom zone directly on screen under Current Bill (flex-1)
        Desktop: Left pane (60-66% width)
        - Combined Single-Row Search [] + Scrollable Category Chips
        - Reclaims massive vertical screen space
        - 3-column touch-friendly product catalog grid on mobile (grid-cols-3)
        ========================================================================
      */}
      <div className="order-2 md:order-1 w-full md:w-[60%] lg:w-[64%] xl:w-[66%] flex flex-col min-h-0 bg-background md:border-r border-border flex-1 overflow-hidden">
        <ProductCatalog
          catalog={catalog}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currencySymbol={currencySymbol}
          itemQuantities={itemQuantitiesMap}
          onSelectItem={handleItemClick}
        />
      </div>

      {/* Simulated Scale Modal */}
      {isScaleModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Weighing Scale Simulation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div
            className="bg-card rounded-xl border border-border shadow-2xl p-5 w-full max-w-sm flex flex-col gap-3 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Weighing Scale Simulation</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Physical scale is not plugged in. Select or simulate weight to test weighed products:
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[0.25, 0.5, 1.0, 2.5].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    handleSimulateWeight(w);
                    setIsScaleModalOpen(false);
                  }}
                  className="py-2.5 bg-secondary hover:bg-secondary/80 rounded-md text-xs font-medium text-secondary-foreground border border-border transition-all tabular-nums tracking-tight font-medium cursor-pointer"
                >
                  {w} kg
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                handleSimulateWeight(0);
                setIsScaleModalOpen(false);
              }}
              className="w-full py-2.5 bg-card border border-destructive/30 text-destructive rounded-md text-xs font-medium hover:bg-destructive/10 transition-all cursor-pointer"
            >
              Reset Scale to 0.000 kg
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
