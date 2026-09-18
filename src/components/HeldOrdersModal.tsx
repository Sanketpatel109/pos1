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
  X,
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

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
  onHoldCurrentCart?: () => void;
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
  onHoldCurrentCart,
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold">Parked / Held Orders</DialogTitle>
              <Badge variant={heldOrders.length > 0 ? 'default' : 'secondary'}>
                {heldOrders.length} {heldOrders.length === 1 ? 'Order' : 'Orders'}
              </Badge>
            </div>
            <DialogDescription>
              Temporarily saved tickets waiting to be resumed or paid
            </DialogDescription>
          </DialogHeader>

          {/* Search & Action Bar */}
          {heldOrders.length > 0 && (
            <div className="p-4 border-b border-border bg-muted/40 flex items-center gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order #, item name, note, or cashier..."
                  className="pl-9 pr-8 bg-background"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
              {heldOrders.length > 1 && onClearAllHeld && (
                <Button variant="destructive" size="sm" onClick={onClearAllHeld}>
                  Clear All
                </Button>
              )}
            </div>
          )}

          {/* Active Cart Banner */}
          {currentCartCount > 0 && (
            <div className="px-6 py-2.5 bg-muted/60 border-b border-border flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShoppingCart className="size-4 text-primary" />
                <span>
                  Active Cart:{' '}
                  <strong className="text-foreground">
                    {currentCartCount} items ({currencySymbol}
                    {currentCartTotal.toFixed(2)})
                  </strong>
                </span>
              </div>
              {onHoldCurrentCart && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onHoldCurrentCart();
                    onClose();
                  }}
                  className="h-7 text-xs gap-1.5"
                >
                  <PauseCircle className="size-3.5" />
                  <span>Park Current Cart</span>
                </Button>
              )}
            </div>
          )}

          {/* Orders List Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {heldOrders.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                  <PauseCircle className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  No Orders Currently on Hold
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  When a customer needs time to retrieve cash or an extra item, tap the{' '}
                  <strong className="text-foreground font-semibold">Hold button</strong> in the bill
                  terminal to park their ticket and immediately serve the next person in line.
                </p>
                <Card size="sm" className="mt-5 text-left w-full">
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold">How Cashiers Use Hold:</CardTitle>
                    <CardDescription className="text-xs">
                      Cart is saved safely and restores with one click back to the register.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-sm font-semibold text-foreground">
                  No parked orders match "{searchQuery}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try searching by order number, customer, or cashier
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const itemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
                const relativeTime = formatRelativeTime(order.createdAt);
                const exactTime = formatTime(order.createdAt);

                return (
                  <Card key={order.id} size="sm">
                    <CardHeader className="border-b border-border">
                      <CardTitle className="flex items-center gap-2 flex-wrap text-sm">
                        <span>Order #{order.orderNumber}</span>
                        <Badge variant="outline" className="font-normal text-xs gap-1">
                          <Clock className="size-3" />
                          <span>
                            {relativeTime} ({exactTime})
                          </span>
                        </Badge>
                        {order.staffName && (
                          <Badge variant="secondary" className="font-normal text-xs gap-1">
                            <User className="size-3" />
                            <span>{order.staffName}</span>
                          </Badge>
                        )}
                        {(order as any).note && (
                          <Badge variant="outline" className="font-normal text-xs">
                            Note: {(order as any).note}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {itemsCount} {itemsCount === 1 ? 'unit' : 'units'} • Subtotal:{' '}
                        {currencySymbol}
                        {order.subtotal.toFixed(2)}
                      </CardDescription>
                      <CardAction>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">
                            Total Due
                          </span>
                          <span className="text-base font-bold text-foreground tabular-nums">
                            {currencySymbol}
                            {order.total.toFixed(2)}
                          </span>
                        </div>
                      </CardAction>
                    </CardHeader>

                    <CardContent className="pt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {order.items.map((item, idx) => (
                          <Badge
                            key={item.id || idx}
                            variant="secondary"
                            className="gap-1.5 py-1 px-2.5 text-xs font-normal"
                          >
                            <span className="font-semibold text-foreground">{item.quantity}x</span>
                            <span className="max-w-[180px] truncate">{item.name}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {currencySymbol}
                              {(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOrderToDelete(order)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Discard</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOrderToPrint(order)}
                          className="gap-1.5"
                        >
                          <Printer className="size-3.5" />
                          <span>Token</span>
                        </Button>
                      </div>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleResumeClick(order)}
                        className="gap-1.5 font-medium"
                      >
                        <Play className="size-3.5 fill-current" />
                        <span>Resume Ticket</span>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>

          {/* Dialog Footer */}
          <DialogFooter className="p-4 border-t border-border flex flex-row items-center justify-between sm:justify-between shrink-0">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Active Cart is Not Empty</DialogTitle>
            <DialogDescription>
              You have{' '}
              <strong className="text-foreground">
                {currentCartCount} items ({currencySymbol}
                {currentCartTotal.toFixed(2)})
              </strong>{' '}
              currently in the register. Choose how to handle your active cart before resuming Order
              #{orderToResume?.orderNumber}:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Card
              className="cursor-pointer transition-colors hover:border-primary"
              size="sm"
              onClick={() => {
                if (orderToResume) {
                  onResumeOrder(orderToResume, 'swap');
                  setOrderToResume(null);
                }
              }}
            >
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ArrowRightLeft className="size-4 text-primary" />
                    <span>Park Current & Resume #{orderToResume?.orderNumber}</span>
                  </span>
                  <Badge variant="default" className="text-[10px]">
                    Recommended
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Your active cart will be safely parked, and #{orderToResume?.orderNumber} restored
                  immediately.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer transition-colors hover:border-foreground"
              size="sm"
              onClick={() => {
                if (orderToResume) {
                  onResumeOrder(orderToResume, 'merge');
                  setOrderToResume(null);
                }
              }}
            >
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="size-4" />
                  <span>Merge Items Together</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Combine the items from #{orderToResume?.orderNumber} into your current cart.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer transition-colors hover:border-destructive hover:bg-destructive/5"
              size="sm"
              onClick={() => {
                if (orderToResume) {
                  onResumeOrder(orderToResume, 'replace');
                  setOrderToResume(null);
                }
              }}
            >
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <Trash2 className="size-4" />
                  <span>Discard Current Cart & Resume</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Clear the active {currentCartCount} items permanently and load #
                  {orderToResume?.orderNumber}.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOrderToResume(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog: Confirm Deletion */}
      <Dialog open={Boolean(orderToDelete)} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Discard Order #{orderToDelete?.orderNumber}?</DialogTitle>
            <DialogDescription>
              This will permanently delete the parked ticket with {orderToDelete?.items.length}{' '}
              items ({currencySymbol}
              {orderToDelete?.total.toFixed(2)}).
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-row justify-end gap-2">
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Print Parked Order Token</DialogTitle>
            <DialogDescription>
              Thermal receipt slip for Order #{orderToPrint?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {orderToPrint && (
            <Card size="sm" className="bg-muted/30 font-mono text-xs">
              <CardContent className="space-y-2 pt-3">
                <div className="text-center border-b border-dashed border-border pb-2">
                  <span className="font-bold text-xs block text-foreground font-sans">
                    {shopSettings.shopName}
                  </span>
                  <span className="text-[10px] text-muted-foreground block font-sans">
                    PARKED ORDER TOKEN
                  </span>
                  <span className="text-base font-bold text-foreground block mt-1">
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

                <Separator className="my-1 border-dashed" />

                <div className="space-y-1">
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

                <Separator className="my-1 border-dashed" />

                <div className="flex justify-between font-bold text-xs text-foreground">
                  <span>TOTAL DUE:</span>
                  <span className="tabular-nums">
                    {currencySymbol}
                    {orderToPrint.total.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOrderToPrint(null)}>
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => orderToPrint && handlePrintSlip(orderToPrint)}
              className="gap-1.5"
            >
              <Printer className="size-3.5" />
              <span>Print Slip</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
