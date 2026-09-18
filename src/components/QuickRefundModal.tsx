import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Search,
  Barcode,
  Camera,
  X,
  Clock,
  User,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Order } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface QuickRefundModalProps {
  isOpen: boolean;
  orders: Order[];
  currencySymbol: string;
  onClose: () => void;
  onSelectOrder: (order: Order) => void;
  onOpenScanner?: () => void;
}

export const QuickRefundModal: React.FC<QuickRefundModalProps> = ({
  isOpen,
  orders,
  currencySymbol,
  onClose,
  onSelectOrder,
  onOpenScanner,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Clean raw barcode input if scanned (e.g., 'ORD-A-12' -> 'A-12' or '12')
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredOrders = useMemo(() => {
    // Sort all orders by newest first
    const sorted = [...orders].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    if (!normalizedQuery) {
      return sorted.slice(0, 20); // Top 20 recent orders by default
    }

    const cleanCode = normalizedQuery
      .replace(/^ord-/, '')
      .replace(/^#/, '')
      .trim();

    return sorted.filter((o) => {
      const numStr = String(o.orderNumber).toLowerCase();
      const formattedNum = (o.orderNumberFormatted || '').toLowerCase().replace(/^#/, '');
      const custName = (o.customerName || '').toLowerCase();
      const custPhone = (o.customerPhone || '').toLowerCase();
      const itemsMatch = o.items.some((it) => it.name.toLowerCase().includes(normalizedQuery));

      return (
        numStr === cleanCode ||
        formattedNum === cleanCode ||
        formattedNum.includes(cleanCode) ||
        numStr.includes(cleanCode) ||
        custName.includes(normalizedQuery) ||
        custPhone.includes(normalizedQuery) ||
        itemsMatch
      );
    });
  }, [orders, normalizedQuery]);

  // Handle enter key to quickly pick exact or single match
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredOrders.length > 0) {
      e.preventDefault();
      const nonRefunded = filteredOrders.find((o) => o.status !== 'refunded') || filteredOrders[0];
      if (nonRefunded.status !== 'refunded') {
        onSelectOrder(nonRefunded);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Quick Return / Refund</span>
                  <Badge variant="outline" className="text-[10px] font-mono py-0">
                    Fast Access
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Scan receipt barcode or enter invoice number to issue a return
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scan & Search Bar */}
        <div className="p-3 sm:p-4 bg-muted/40 border-b border-border shrink-0 space-y-2">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan receipt barcode (e.g. ORD-A-12) or type Bill #..."
                className="pl-9 pr-8 h-10 text-sm bg-background font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {onOpenScanner && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="h-10 px-3 gap-1.5 shrink-0 cursor-pointer"
                title="Scan with Camera"
              >
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="hidden sm:inline text-xs font-semibold">Camera Scan</span>
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>
              {normalizedQuery
                ? `Showing ${filteredOrders.length} matching invoice${filteredOrders.length === 1 ? '' : 's'}`
                : 'Recent finalized sales (newest first):'}
            </span>
            <span className="text-[10px] italic">Tip: Press Enter to select top match</span>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 max-h-[55vh]">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-2.5 max-w-sm mx-auto">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <RotateCcw className="size-6 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No Completed Sales Yet</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When sales are finalized at the register, invoices will appear here for fast barcode lookup and returns.
                </p>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Search className="size-5 opacity-60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No matching invoices found</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No bills matched &ldquo;{searchQuery}&rdquo;. Check the bill number or scan the barcode from the receipt.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-xs"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isFullyRefunded = order.status === 'refunded';
              const isPartiallyRefunded = order.status === 'partially_refunded';
              const dateStr = new Date(order.createdAt).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              const invoiceLabel = order.orderNumberFormatted || `#${order.orderNumber}`;
              const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <Card
                  key={order.id}
                  className={`p-3 transition-all border ${
                    isFullyRefunded
                      ? 'opacity-60 bg-muted/20 border-border'
                      : 'hover:border-primary/50 hover:bg-muted/10 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!isFullyRefunded) {
                      onSelectOrder(order);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-foreground tracking-tight">
                          {invoiceLabel}
                        </span>
                        {isFullyRefunded ? (
                          <Badge variant="destructive" className="text-[9.5px] py-0">
                            Fully Refunded
                          </Badge>
                        ) : isPartiallyRefunded ? (
                          <Badge
                            variant="secondary"
                            className="text-[9.5px] py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          >
                            Partially Refunded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9.5px] py-0 uppercase font-mono">
                            {order.paymentMethod}
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dateStr}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span className="font-medium text-foreground">
                          {order.customerName || 'Walk-in Customer'}
                        </span>
                        <span>•</span>
                        <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                        {order.staffName && (
                          <>
                            <span>•</span>
                            <span>Billed by {order.staffName}</span>
                          </>
                        )}
                      </div>

                      {/* Items Preview */}
                      <div className="text-[11px] text-muted-foreground truncate max-w-md pt-0.5">
                        {order.items.map((it) => `${it.name} (${it.quantity})`).join(', ')}
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="text-right shrink-0 space-y-1">
                      <div className="font-black text-sm text-foreground tabular-nums">
                        {currencySymbol}{order.total.toFixed(2)}
                      </div>
                      {order.refundAmount && order.refundAmount > 0 && (
                        <div className="text-[10px] font-semibold text-destructive tabular-nums">
                          -{currencySymbol}{order.refundAmount.toFixed(2)} ref.
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant={isFullyRefunded ? 'ghost' : 'outline'}
                        disabled={isFullyRefunded}
                        className={`h-7 text-xs font-semibold gap-1 px-2.5 cursor-pointer ${
                          !isFullyRefunded
                            ? 'text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                            : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isFullyRefunded) {
                            onSelectOrder(order);
                          }
                        }}
                      >
                        {isFullyRefunded ? (
                          <span>Voided</span>
                        ) : isPartiallyRefunded ? (
                          <>
                            <span>Refund More</span>
                            <ArrowRight className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>Select</span>
                            <ArrowRight className="w-3 h-3" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
