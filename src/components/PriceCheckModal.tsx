import React, { useState, useEffect } from 'react';
import {
  X,
  Scan,
  Barcode,
  Package,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Minus,
  ShoppingCart,
  Sparkles,
  Zap,
  Info,
  DollarSign,
  TrendingUp,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { CatalogItem, StaffRole, StorePermissions } from '../types';
import { hardware } from '../utils/hardware';
import { posSound } from '../utils/sound';
import { canViewCostPrice, canAccessScreen } from '../utils/permissions';

interface PriceCheckModalProps {
  isOpen: boolean;
  catalog: CatalogItem[];
  currencySymbol: string;
  staffRole?: StaffRole;
  permissions?: StorePermissions;
  onClose: () => void;
  onAddToCart: (item: CatalogItem) => void;
  onUpdateStock: (productId: string, newStock: number) => void;
  onRegisterBarcode?: (barcode: string) => void;
  onRequestManagerOverride?: () => void;
  onRequestCostUnlock?: (onApproved: () => void) => void;
}

export const PriceCheckModal: React.FC<PriceCheckModalProps> = ({
  isOpen,
  catalog,
  currencySymbol,
  staffRole = 'CASHIER',
  permissions,
  onClose,
  onAddToCart,
  onUpdateStock,
  onRegisterBarcode,
  onRequestManagerOverride,
  onRequestCostUnlock,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [isEditingStock, setIsEditingStock] = useState<boolean>(false);
  const [tempStockValue, setTempStockValue] = useState<string>('');
  const [isCostUnlocked, setIsCostUnlocked] = useState<boolean>(false);

  // Default to first product if none selected
  useEffect(() => {
    if (isOpen && !selectedProduct && catalog.length > 0) {
      setSelectedProduct(catalog[0]);
    }
  }, [isOpen, catalog, selectedProduct]);

  // Hook into physical laser scanner gun
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = hardware.onLaserScan((barcode) => {
      handleLookupBarcode(barcode);
    });

    return () => unsubscribe();
  }, [isOpen, catalog]);

  if (!isOpen) return null;

  const handleLookupBarcode = (code: string) => {
    const clean = code.trim().toLowerCase();
    setLastScannedCode(code);
    setNotFoundCode(null);

    const found = catalog.find(
      (item) =>
        (item.barcode && item.barcode.toLowerCase() === clean) ||
        (item.sku && item.sku.toLowerCase() === clean) ||
        item.name.toLowerCase() === clean
    );

    if (found) {
      posSound.playBeep();
      setSelectedProduct(found);
      setIsEditingStock(false);
    } else {
      posSound.playBuzzer();
      setNotFoundCode(code);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleLookupBarcode(manualInput.trim());
      setManualInput('');
    }
  };

  const handleSaveAdjustedStock = () => {
    if (!selectedProduct) return;
    const num = parseInt(tempStockValue, 10);
    if (!isNaN(num) && num >= 0) {
      onUpdateStock(selectedProduct.id, num);
      setSelectedProduct({
        ...selectedProduct,
        stock: num,
      });
      setIsEditingStock(false);
      posSound.playTap();
    }
  };

  const canViewCosts = isCostUnlocked || canViewCostPrice(staffRole, permissions);
  const canEditInventory = canAccessScreen(staffRole, 'categories-products');

  const productCost = selectedProduct?.costPrice || 0;
  const productPrice = selectedProduct?.price || 0;
  const profitPerUnit = productCost > 0 ? productPrice - productCost : 0;
  const profitMarginPercent =
    productCost > 0 && productPrice > 0 ? ((productPrice - productCost) / productPrice) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl border border-zinc-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-zinc-900">
                  Price Check & Product Info
                </h2>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-primary" />
                  Laser Gun Ready (HID)
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Pull physical laser scanner trigger or enter barcode/SKU to inspect stock & pricing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-800 p-1.5 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Scanner & Manual Input Bar */}
        <div className="p-3 sm:p-4 border-b border-zinc-200 bg-zinc-50/50">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Scan barcode with laser gun or type barcode / SKU / name..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black cursor-pointer transition-all active:scale-95 shrink-0"
            >
              Lookup
            </button>
          </form>

          {/* Laser Gun Simulator Chips for quick browser testing */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 text-[11px]">
            <span className="text-zinc-500 font-medium whitespace-nowrap shrink-0 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Simulate Laser Scan:
            </span>
            {catalog.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  hardware.simulateLaserScan(item.barcode || item.name);
                }}
                className="px-2 py-1 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-lg text-[10px] whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
              >
                {item.name} ({item.barcode || 'Scan'})
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {notFoundCode && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-900">
                    No product found for barcode "{notFoundCode}"
                  </p>
                  <p className="text-[11px] text-red-600">
                    This item is not registered in your catalog yet.
                  </p>
                </div>
              </div>
              {onRegisterBarcode && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRegisterBarcode(notFoundCode);
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                >
                  Register Now
                </button>
              )}
            </div>
          )}

          {selectedProduct ? (
            <div className="space-y-4">
              {/* Product Title & Category */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                    {selectedProduct.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                      {selectedProduct.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">
                        {selectedProduct.category}
                      </span>
                      {selectedProduct.sku && (
                        <span className="text-[10px] text-zinc-500">
                          SKU: {selectedProduct.sku}
                        </span>
                      )}
                      {selectedProduct.barcode && (
                        <span className="text-[10px] text-zinc-500">
                          EAN: {selectedProduct.barcode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-zinc-900">
                    {currencySymbol}
                    {(Number(selectedProduct.price) || 0).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">Selling Price (incl. tax)</span>
                </div>
              </div>

              {/* Product Info & Stock Count Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Stock on Hand */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Stock on Hand
                  </span>
                  <div className="my-1">
                    <div className="text-xl font-black text-zinc-900">
                      {selectedProduct.stock ?? '∞'}{' '}
                      <span className="text-xs font-normal text-zinc-500">
                        {selectedProduct.unit || 'pcs'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold flex items-center gap-1 ${
                      selectedProduct.stock !== undefined && selectedProduct.stock <= 0
                        ? 'text-red-600'
                        : selectedProduct.stock !== undefined &&
                          selectedProduct.stock <= (selectedProduct.lowStockThreshold ?? 5)
                        ? 'text-amber-600'
                        : 'text-primary'
                    }`}
                  >
                    {selectedProduct.stock !== undefined && selectedProduct.stock <= 0
                      ? 'Out of Stock'
                      : selectedProduct.stock !== undefined &&
                        selectedProduct.stock <= (selectedProduct.lowStockThreshold ?? 5)
                      ? 'Low Stock Alert'
                      : 'Stock Adequate'}
                  </span>
                </div>

                {/* Reorder Threshold */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Reorder Alert
                  </span>
                  <div className="my-1">
                    <div className="text-xl font-black text-zinc-900">
                      &lt; {selectedProduct.lowStockThreshold ?? 5}{' '}
                      <span className="text-xs font-normal text-zinc-500">
                        {selectedProduct.unit || 'pcs'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">Warning Threshold</span>
                </div>

                {/* Cost Price */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Cost Price
                  </span>
                  <div className="my-1">
                    {canViewCosts ? (
                      <div className="text-xl font-black text-zinc-900">
                        {selectedProduct.costPrice
                          ? `${currencySymbol}${selectedProduct.costPrice.toFixed(2)}`
                          : 'N/A'}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRequestCostUnlock) {
                            onRequestCostUnlock(() => setIsCostUnlocked(true));
                          }
                        }}
                        className="text-xs font-bold text-zinc-400 hover:text-zinc-700 flex items-center gap-1 py-1 cursor-pointer group"
                        title="Tap to unlock with Manager or Owner PIN"
                      >
                        <Lock className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                        <span>Confidential</span>
                        <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity underline">
                          unlock
                        </span>
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {canViewCosts ? 'Supplier Cost' : 'Manager / Owner Only'}
                  </span>
                </div>

                {/* Profit Margin */}
                <div className="bg-muted/50 border border-border rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Profit Margin
                  </span>
                  <div className="flex items-baseline gap-1 my-1">
                    <span className="text-xl font-bold text-foreground tabular-nums">
                      {canViewCosts ? `${profitMarginPercent.toFixed(1)}%` : '•••'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {canViewCosts
                      ? `${currencySymbol}${profitPerUnit.toFixed(2)} / unit`
                      : 'Protected metric'}
                  </span>
                </div>
              </div>

              {/* Quick Stock Count Adjustment Box */}
              <div className="bg-muted/40 border border-border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    Direct Inventory Count Adjustment
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {canEditInventory
                      ? 'Need to correct shelf count after physical stock audit?'
                      : 'Requires Manager or Store Owner authorization to adjust live stock counts.'}
                  </p>
                </div>

                {!canEditInventory ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (onRequestManagerOverride) {
                          onRequestManagerOverride();
                        }
                      }}
                      className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                    >
                      <Lock className="w-3 h-3 text-primary-foreground" />
                      <span>Manager Auth to Edit</span>
                    </button>
                  </div>
                ) : isEditingStock ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      value={tempStockValue}
                      onChange={(e) => setTempStockValue(e.target.value)}
                      className="w-24 bg-card border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSaveAdjustedStock}
                      className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingStock(false)}
                      className="px-2 py-1 text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const current = selectedProduct.stock ?? 0;
                        if (current > 0) {
                          onUpdateStock(selectedProduct.id, current - 1);
                          setSelectedProduct({ ...selectedProduct, stock: current - 1 });
                          posSound.playTap();
                        }
                      }}
                      className="w-8 h-8 rounded-lg bg-card border border-border text-foreground font-bold flex items-center justify-center hover:bg-muted cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTempStockValue(String(selectedProduct.stock ?? 0));
                        setIsEditingStock(true);
                      }}
                      className="px-3 py-1.5 bg-card border border-border text-foreground font-bold text-xs rounded-lg hover:bg-muted cursor-pointer"
                    >
                      Set: {selectedProduct.stock ?? 0}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = selectedProduct.stock ?? 0;
                        onUpdateStock(selectedProduct.id, current + 1);
                        setSelectedProduct({ ...selectedProduct, stock: current + 1 });
                        posSound.playTap();
                      }}
                      className="w-8 h-8 rounded-lg bg-card border border-border text-foreground font-bold flex items-center justify-center hover:bg-muted cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-400">
              <Scan className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-sm font-bold text-zinc-700">No Product Scanned</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Scan any barcode with your laser gun or select from the chips above
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 bg-zinc-50">
          <span className="text-[11px] text-zinc-500 font-medium">
            Tip: Press <kbd className="bg-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded text-[10px]">F2</kbd> anytime to open Price Check
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            >
              Close
            </button>
            {selectedProduct && (
              <button
                type="button"
                onClick={() => {
                  onAddToCart(selectedProduct);
                  posSound.playAdd();
                  onClose();
                }}
                className="px-4 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Add to Bill ({currencySymbol}{(Number(selectedProduct.price) || 0).toFixed(2)})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
