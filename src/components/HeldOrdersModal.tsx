import React, { useState, useEffect, useMemo } from 'react';
import {
  PauseCircle,
  Play,
  Trash2,
  Printer,
  Search,
  Clock,
  User,
  ShoppingCart,
  ArrowRightLeft,
  Layers,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Order, ShopSettings } from '../types';
import { printThermalHtml } from '../utils/thermalPrinter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export interface HeldOrdersModalProps {
  isOpen: boolean;
  heldOrders: Order[];
  currentCartCount: number;
  currentCartTotal: number;
  currencySymbol: string;
  shopSettings: ShopSettings;
  onClose: () => void;
  onResumeOrder: (order: Order, strategy: 'replace' | 'merge' | 'swap') => void;
  onDeleteOrder: (orderId: string) => void;
  onClearAllHeld?: () => void;
}

export const HeldOrdersModal: React.FC<HeldOrdersModalProps> = ({
  isOpen,
  heldOrders,
  currentCartCount,
  currentCartTotal,
  currencySymbol,
  shopSettings,
  onClose,
  onResumeOrder,
  onDeleteOrder,
  onClearAllHeld,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [orderToResume, setOrderToResume] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (orderToResume) {
          setOrderToResume(null);
        } else if (orderToDelete) {
          setOrderToDelete(null);
        } else if (orderToPrint) {
          setOrderToPrint(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, orderToResume, orderToDelete, orderToPrint, onClose]);

  // Reset local state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setOrderToResume(null);
      setOrderToDelete(null);
      setOrderToPrint(null);
    }
  }, [isOpen]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return heldOrders;
    const q = searchQuery.toLowerCase().trim();
    return heldOrders.filter((o) => {
      const matchNumber = String(o.orderNumber).includes(q);
      const matchStaff = o.staffName?.toLowerCase().includes(q);
      const matchCustomer = o.customerName?.toLowerCase().includes(q);
      const matchNote = (o as any).note?.toLowerCase().includes(q);
      const matchItems = o.items.some((item) => item.name.toLowerCase().includes(q));
      return matchNumber || matchStaff || matchCustomer || matchNote || matchItems;
    });
  }, [heldOrders, searchQuery]);

  if (!isOpen) return null;

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes === 1) return '1 min ago';
      if (diffMinutes < 60) return `${diffMinutes} mins ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) return '1 hour ago';
      return `${diffHours} hours ago`;
    } catch {
      return '';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  const handleResumeClick = (order: Order) => {
    if (currentCartCount > 0) {
      setOrderToResume(order);
    } else {
      onResumeOrder(order, 'replace');
    }
  };

  const handleConfirmDelete = (orderId: string) => {
    onDeleteOrder(orderId);
    setOrderToDelete(null);
  };

  const handlePrintSlip = (order: Order) => {
    const itemsHtml = order.items
      .map(
        (i) => `
        <div class="row" style="font-size: 10px; padding: 2px 0;">
          <span>${i.quantity}x ${i.name}</span>
          <span style="font-weight: bold;">${currencySymbol}${(i.unitPrice * i.quantity).toFixed(2)}</span>
        </div>
      `
      )
      .join('');

    const slipHtml = `
      <div class="text-center" style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <h3 class="font-extrabold uppercase">${shopSettings.shopName || 'MonoPOS'}</h3>
        <div style="font-size: 10px; font-weight: bold; margin-top: 2px;">PARKED ORDER TOKEN</div>
        <div style="font-size: 16px; font-weight: 900; margin: 4px 0;">#${order.orderNumber}</div>
      </div>
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; font-size: 10px;">
        <div class="row"><span>Date:</span><span>${new Date(order.createdAt).toLocaleDateString()}</span></div>
        <div class="row"><span>Time:</span><span>${formatTime(order.createdAt)}</span></div>
        ${order.staffName ? `<div class="row"><span>Cashier:</span><span>${order.staffName}</span></div>` : ''}
      </div>
      <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        ${itemsHtml}
      </div>
      <div class="row font-bold" style="font-size: 12px; margin-bottom: 8px;">
        <span>TOTAL DUE:</span>
        <span>${currencySymbol}${order.total.toFixed(2)}</span>
      </div>
      <div class="text-center" style="font-size: 9px; color: #555;">
        Present this token at the register to resume your order.
      </div>
    `;

    printThermalHtml(slipHtml, `Parked-Order-#${order.orderNumber}`);
    setOrderToPrint(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <PauseCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base font-bold text-foreground leading-tight">
                      Parked / Held Orders
                    </DialogTitle>
                    <Badge variant={heldOrders.length > 0 ? 'default' : 'secondary'} className="text-xs">
                      {heldOrders.length} {heldOrders.length === 1 ? 'Order' : 'Orders'}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Temporarily saved tickets waiting to be resumed or paid
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Search & Filter Bar */}
          {heldOrders.length > 0 && (
            <div className="px-4 py-2.5 sm:px-5 bg-muted/30 border-b border-border flex items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order #, item name, note, or cashier..."
                  className="pl-9 h-9 text-xs bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
              {heldOrders.length > 1 && onClearAllHeld && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onClearAllHeld}
                  className="text-xs shrink-0"
                >
                  Clear All
                </Button>
              )}
            </div>
          )}

          {/* Informational Cart Notice */}
          {currentCartCount > 0 && heldOrders.length > 0 && (
            <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs text-primary flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span>
                  Register currently has{' '}
                  <strong className="font-bold">
                    {currentCartCount} {currentCartCount === 1 ? 'item' : 'items'} ({currencySymbol}
                    {currentCartTotal.toFixed(2)})
                  </strong>
                </span>
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-xs">
                Safe Swap Available
              </Badge>
            </div>
          )}

          {/* Orders List Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-card">
            {heldOrders.length === 0 ? (
              <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mb-3 text-muted-foreground">
                  <PauseCircle className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  No Orders Currently on Hold
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  When a customer needs time to retrieve cash or an extra item, tap the{' '}
                  <strong className="text-foreground font-semibold">Hold button</strong> in the bill
                  terminal to park their ticket and immediately serve the next person in line.
                </p>
                <Card className="mt-5 text-left text-xs bg-muted/40 border-border w-full">
                  <CardHeader className="p-3 pb-1.5">
                    <CardTitle className="text-xs font-bold text-foreground">
                      How Cashiers Use Hold:
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-muted-foreground">
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Cart is saved safely in memory & local storage</li>
                      <li>Ticket counter advances for the next customer</li>
                      <li>One-click resume restores items back to register</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-sm font-semibold text-foreground">
                  No parked orders match "{searchQuery}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try searching by a different order number or cashier name
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const itemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
                const relativeTime = formatRelativeTime(order.createdAt);
                const exactTime = formatTime(order.createdAt);

                return (
                  <Card
                    key={order.id}
                    className="border-border hover:border-foreground/30 shadow-xs hover:shadow-sm transition-all"
                  >
                    <CardHeader className="p-3.5 sm:p-4 pb-2.5 border-b border-border flex-row items-start justify-between gap-2 space-y-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs font-bold tracking-wider">
                          Order #{order.orderNumber}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>
                            {relativeTime} ({exactTime})
                          </span>
                        </span>
                        {order.staffName && (
                          <Badge variant="secondary" className="text-xs gap-1 font-semibold">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span>{order.staffName}</span>
                          </Badge>
                        )}
                        {(order as any).note && (
                          <Badge variant="outline" className="text-xs font-medium">
                            Note: {(order as any).note}
                          </Badge>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Total Due
                        </span>
                        <span className="text-base sm:text-lg font-extrabold text-foreground tabular-nums">
                          {currencySymbol}
                          {order.total.toFixed(2)}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3.5 sm:p-4 pt-3 space-y-3">
                      {/* Items List Preview */}
                      <div className="bg-muted/30 border border-border rounded-lg p-2.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1.5">
                          <span>
                            Items ({itemsCount} {itemsCount === 1 ? 'unit' : 'units'})
                          </span>
                          <span className="tabular-nums">
                            Subtotal: {currencySymbol}
                            {order.subtotal.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {order.items.map((item, idx) => (
                            <span
                              key={item.id || idx}
                              className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground font-medium flex items-center gap-1.5 shadow-2xs"
                            >
                              <Badge
                                variant="default"
                                className="h-4 w-4 p-0 text-[10px] font-bold flex items-center justify-center"
                              >
                                {item.quantity}
                              </Badge>
                              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                                {item.name}
                              </span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {currencySymbol}
                                {(item.unitPrice * item.quantity).toFixed(2)}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOrderToDelete(order)}
                            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Discard</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOrderToPrint(order)}
                            className="text-xs text-muted-foreground hover:text-foreground gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Token</span>
                          </Button>
                        </div>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleResumeClick(order)}
                          className="gap-1.5 text-xs font-semibold shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume Ticket</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 bg-muted/30 border-t border-border flex flex-row items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground hidden sm:block">
              Held orders are preserved in your station storage even if refreshed.
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close (Esc)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog: Cart Conflict (Swap / Merge / Discard) */}
      <Dialog open={Boolean(orderToResume)} onOpenChange={(open) => !open && setOrderToResume(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Active Cart is Not Empty
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  You have <strong className="text-foreground">{currentCartCount} items ({currencySymbol}{currentCartTotal.toFixed(2)})</strong> currently in the register.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 my-2">
            <p className="text-xs text-muted-foreground">
              Choose how to handle your active cart before resuming Order #{orderToResume?.orderNumber}:
            </p>

            {/* Option 1: Swap & Hold */}
            <Button
              variant="default"
              className="w-full h-auto p-3 flex items-start gap-3 text-left justify-start whitespace-normal"
              onClick={() => {
                if (orderToResume) {
                  onResumeOrder(orderToResume, 'swap');
                  setOrderToResume(null);
                }
              }}
            >
              <div className="w-7 h-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0 mt-0.5">
                <ArrowRightLeft className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Park Current & Resume #{orderToResume?.orderNumber}
                  </span>
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    Recommended
                  </Badge>
                </div>
                <p className="text-xs text-primary-foreground/80 mt-1 font-normal leading-relaxed">
                  Your active cart of {currentCartCount} items will be safely held, and #{orderToResume?.orderNumber} loaded immediately.
                </p>
              </div>
            </Button>

            {/* Option 2: Merge Carts */}
            <Button
              variant="outline"
              className="w-full h-auto p-3 flex items-start gap-3 text-left justify-start whitespace-normal border-border"
              onClick={() => {
                if (orderToResume) {
                  onResumeOrder(orderToResume, 'merge');
                  setOrderToResume(null);
                }
              }}
            >
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-4 h-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-foreground block">
                  Merge Items Together
                </span>
                <p className="text-xs text-muted-foreground mt-1 font-normal leading-relaxed">
                  Combine the items from #{orderToResume?.orderNumber} into your current cart into a single ticket.
                </p>
              </div>
            </Button>

            {/* Option 3: Discard Active Cart */}
            <Button
              variant="outline"
              className="w-full h-auto p-3 flex items-start gap-3 text-left justify-start whitespace-normal border-destructive/30 hover:border-destructive hover:bg-destructive/10"
              onClick={() => {
                if (orderToResume) {
                  onResumeOrder(orderToResume, 'replace');
                  setOrderToResume(null);
                }
              }}
            >
              <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-destructive block">
                  Discard Current Cart & Resume
                </span>
                <p className="text-xs text-destructive/80 mt-1 font-normal leading-relaxed">
                  Clear the current {currentCartCount} items permanently and load #{orderToResume?.orderNumber}.
                </p>
              </div>
            </Button>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="ghost" size="sm" onClick={() => setOrderToResume(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog: Confirm Deletion */}
      <Dialog open={Boolean(orderToDelete)} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border shadow-2xl p-5">
          <DialogHeader className="gap-2">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Discard Order #{orderToDelete?.orderNumber}?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                This will permanently delete the parked ticket with {orderToDelete?.items.length} items ({currencySymbol}{orderToDelete?.total.toFixed(2)}).
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="flex-row justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setOrderToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => orderToDelete && handleConfirmDelete(orderToDelete.id)}
            >
              Discard Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog: Print Token Slip */}
      <Dialog open={Boolean(orderToPrint)} onOpenChange={(open) => !open && setOrderToPrint(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border shadow-2xl p-5">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-base font-bold text-foreground">
              Print Parked Order Token
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thermal receipt slip for Order #{orderToPrint?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {orderToPrint && (
            <div className="bg-muted/40 border border-border rounded-xl p-3 text-xs space-y-2 text-foreground font-mono">
              <div className="text-center border-b border-dashed border-border pb-2">
                <span className="font-bold text-xs block text-foreground font-sans">
                  {shopSettings.shopName}
                </span>
                <span className="text-[10px] text-muted-foreground block">PARKED ORDER TOKEN</span>
                <span className="text-base font-bold text-foreground block mt-1 bg-card border border-border rounded py-0.5">
                  #{orderToPrint.orderNumber}
                </span>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Date: {new Date(orderToPrint.createdAt).toLocaleDateString()}</span>
                <span>Time: {formatTime(orderToPrint.createdAt)}</span>
              </div>
              {orderToPrint.staffName && (
                <div className="text-xs text-muted-foreground">
                  Cashier: {orderToPrint.staffName}
                </div>
              )}

              <div className="border-t border-dashed border-border pt-1.5 space-y-1">
                {orderToPrint.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="truncate max-w-[150px]">
                      {i.quantity}x {i.name}
                    </span>
                    <span className="tabular-nums font-bold">
                      {currencySymbol}
                      {(i.unitPrice * i.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-border pt-1.5 flex justify-between font-bold text-xs text-foreground">
                <span>TOTAL DUE:</span>
                <span className="tabular-nums">
                  {currencySymbol}
                  {orderToPrint.total.toFixed(2)}
                </span>
              </div>

              <p className="text-[10px] text-center text-muted-foreground italic pt-1 font-sans">
                Present this slip at register when ready to complete your purchase.
              </p>
            </div>
          )}

          <DialogFooter className="flex-row justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setOrderToPrint(null)}>
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => orderToPrint && handlePrintSlip(orderToPrint)}
              className="gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
