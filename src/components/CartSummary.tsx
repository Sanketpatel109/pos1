import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, PauseCircle, Printer, Tag, Percent, X, Check, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '../context/CartContext';

export interface CartSummaryProps {
  totalItemCount: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currencySymbol?: string;
  onClearBill?: () => void;
  onHoldBill?: () => void;
  onPrintBill?: () => void;
  onPay: () => void;
  heldOrdersCount?: number;
  onOpenHeldOrders?: () => void;
  disabled?: boolean;
  onSwitchMode?: () => void;
  currentMode?: 'item-wise' | 'quick-bill' | 'catalog';
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  totalItemCount,
  subtotal,
  taxRate,
  taxAmount,
  total,
  currencySymbol = '₹',
  onClearBill,
  onHoldBill,
  onPrintBill,
  onPay,
  heldOrdersCount = 0,
  onOpenHeldOrders,
  disabled = false,
  onSwitchMode,
  currentMode = 'item-wise',
}) => {
  const {
    discount = 0,
    discountType = 'percentage',
    discountAmount = 0,
    setDiscount,
  } = useCart();

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [tempDiscountVal, setTempDiscountVal] = useState<string>(discount > 0 ? String(discount) : '');
  const [tempDiscountType, setTempDiscountType] = useState<'percentage' | 'flat'>(discountType);

  const handleOpenDiscountModal = () => {
    setTempDiscountVal(discount > 0 ? String(discount) : '');
    setTempDiscountType(discountType);
    setIsDiscountModalOpen(true);
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(tempDiscountVal);
    if (!isNaN(val) && val > 0) {
      setDiscount(val, tempDiscountType);
    } else {
      setDiscount(0);
    }
    setIsDiscountModalOpen(false);
  };

  const handleQuickPreset = (presetPercent: number) => {
    setDiscount(presetPercent, 'percentage');
    setIsDiscountModalOpen(false);
  };

  const handleRoundOff = () => {
    const rawTotal = subtotal + taxAmount;
    const roundedTotal = Math.floor(rawTotal);
    const diff = Number((rawTotal - roundedTotal).toFixed(2));
    if (diff > 0) {
      setDiscount(diff, 'flat');
    }
    setIsDiscountModalOpen(false);
  };

  // Compute final net total including discount
  const finalTotal = Math.max(0, subtotal - discountAmount) + taxAmount;

  return (
    <div className="px-3 py-2 sm:px-4 sm:py-3.5 bg-accent border-t border-border shrink-0 z-20 shadow-xs select-none relative">
      {/* Subtotals & GST Breakdown */}
      <div className="mb-1.5 sm:mb-2 text-xs text-muted-foreground space-y-1">
        {/* Items & Subtotal */}
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
            <button
              type="button"
              onClick={handleOpenDiscountModal}
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                discountAmount > 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border'
              }`}
              title="Apply bill discount or round off"
            >
              <Percent className="size-2.5" />
              {discountAmount > 0 ? 'Discount' : '+ Disc'}
            </button>
          </span>
          <span className="tabular-nums tracking-tight font-medium text-foreground">
            {currencySymbol}{subtotal.toFixed(2)}
          </span>
        </div>

        {/* Discount Line (if applied) */}
        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in duration-150">
            <span className="flex items-center gap-1">
              <Tag className="size-3" />
              <span>Discount ({discountType === 'percentage' ? `${discount}%` : `Flat ${currencySymbol}${discount}`})</span>
              <button
                type="button"
                onClick={() => setDiscount(0)}
                className="text-muted-foreground hover:text-destructive text-[10px] ml-1 p-0.5 rounded hover:bg-destructive/10 cursor-pointer"
                title="Remove discount"
              >
                <X className="size-2.5" />
              </button>
            </span>
            <span className="tabular-nums font-semibold">
              -{currencySymbol}{discountAmount.toFixed(2)}
            </span>
          </div>
        )}

        {/* GST Tax Line */}
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>GST Tax ({taxRate}%)</span>
          <span className="tabular-nums tracking-tight font-medium">
            +{currencySymbol}{taxAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Cart Total Display */}
      <div className="flex justify-between items-baseline mb-2 sm:mb-3 pt-1.5 sm:pt-2 border-t border-border">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Total
        </span>
        <span
          id="cart-summary-total"
          className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums font-medium"
        >
          {currencySymbol}{finalTotal.toFixed(2)}
        </span>
      </div>

      {/* Action CTA Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2">

        {/* Clear Bill Button */}
        {onClearBill && (
          <Button
            type="button"
            id="btn-cart-clear"
            variant="outline"
            size="icon-lg"
            onClick={onClearBill}
            disabled={disabled || totalItemCount === 0}
            title="Clear ticket items"
            className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
          </Button>
        )}

        {/* Hold / Recall Bill Button */}
        {(onHoldBill || onOpenHeldOrders) && (
          <Button
            type="button"
            id="btn-cart-hold"
            variant="outline"
            size="icon-lg"
            onClick={() => {
              if (totalItemCount > 0 && onHoldBill) {
                onHoldBill();
              } else if (heldOrdersCount > 0 && onOpenHeldOrders) {
                onOpenHeldOrders();
              }
            }}
            disabled={totalItemCount === 0 && heldOrdersCount === 0}
            title={
              totalItemCount > 0
                ? 'Hold / Park Bill for next customer'
                : heldOrdersCount > 0
                ? `Recall ${heldOrdersCount} parked bill(s)`
                : 'Add items to hold bill'
            }
            className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 relative"
          >
            <PauseCircle className="size-4" />
            {heldOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground font-semibold text-[9px] size-4 rounded-full flex items-center justify-center shadow-xs tabular-nums tracking-tight">
                {heldOrdersCount}
              </span>
            )}
          </Button>
        )}

        {/* Switch Register Mode Button - beside Print Button */}
        {onSwitchMode && (
          <Button
            type="button"
            id="btn-cart-switch-mode"
            variant="outline"
            onClick={onSwitchMode}
            disabled={disabled}
            className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 text-muted-foreground hover:text-foreground"
            title={
              currentMode === 'quick-bill'
                ? 'Switch to Catalog & Barcode Billing (Product catalog & laser barcode billing)'
                : 'Switch to Quick Numpad Register (Fast calculator & custom amount billing)'
            }
            aria-label={
              currentMode === 'quick-bill'
                ? 'Switch to Catalog & Barcode Billing'
                : 'Switch to Quick Numpad Register'
            }
          >
            <ArrowLeftRight className="size-4" />
          </Button>
        )}

        {/* Print Bill Button - Hardware / Execution */}
        {onPrintBill && (
          <Button
            type="button"
            id="btn-cart-print"
            variant="outline"
            onClick={onPrintBill}
            disabled={disabled || totalItemCount === 0}
            className="flex-1 h-10 sm:h-11 text-xs font-medium gap-1.5"
          >
            <Printer className="size-4" />
            <span>Print</span>
          </Button>
        )}

        {/* Primary Pay Action CTA Button - Primary Counter Action */}
        <Button
          type="button"
          id="btn-cart-pay"
          variant="default"
          onClick={onPay}
          disabled={disabled || totalItemCount === 0}
          className="flex-[1.6] h-10 sm:h-11 text-xs sm:text-sm font-semibold tracking-wide"
        >
          <span className="tabular-nums tracking-tight font-medium">
            Pay {currencySymbol}{finalTotal.toFixed(2)} →
          </span>
        </Button>
      </div>

      {/* Interactive Bill Discount Modal - Portalled to document.body to prevent any stacking context clipping */}
      {isDiscountModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Apply Bill Discount"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            className="fixed inset-0 bg-transparent"
            onClick={() => setIsDiscountModalOpen(false)}
          />
          <div
            className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-4 z-10 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Percent className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Apply Bill Discount</h3>
                  <p className="text-[11px] text-muted-foreground">Discount on total subtotal ({currencySymbol}{subtotal.toFixed(2)})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Quick Presets
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPreset(pct)}
                    className="py-2 text-xs font-bold rounded-lg border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary hover:text-primary transition-all cursor-pointer text-center"
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleRoundOff}
                  className="py-2 text-[11px] font-bold rounded-lg border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary hover:text-primary transition-all cursor-pointer text-center"
                  title="Round total down to nearest rupee"
                >
                  Round
                </button>
              </div>
            </div>

            {/* Mode Switcher: % Percentage vs Flat Amount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Custom Discount
                </label>
                <div className="flex rounded-md bg-muted p-0.5 border border-border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTempDiscountType('percentage')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                      tempDiscountType === 'percentage'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    % Percent
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempDiscountType('flat')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
                      tempDiscountType === 'flat'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Flat {currencySymbol}
                  </button>
                </div>
              </div>

              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  max={tempDiscountType === 'percentage' ? 100 : subtotal}
                  step="any"
                  autoFocus
                  placeholder={tempDiscountType === 'percentage' ? 'e.g. 10 for 10%' : `e.g. 50 for ${currencySymbol}50`}
                  value={tempDiscountVal}
                  onChange={(e) => setTempDiscountVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyDiscount();
                    }
                  }}
                  className="w-full h-10 px-3 pr-10 text-sm font-semibold rounded-lg bg-background border border-border focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent tabular-nums"
                />
                <span className="absolute right-3 text-xs font-bold text-muted-foreground pointer-events-none">
                  {tempDiscountType === 'percentage' ? '%' : currencySymbol}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              {discountAmount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDiscount(0);
                    setIsDiscountModalOpen(false);
                  }}
                  className="px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer"
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="flex-1 py-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

