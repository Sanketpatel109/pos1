import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  PauseCircle,
  Play,
  Trash2,
  Printer,
  Search,
  Clock,
  User,
  ShoppingBag,
  ArrowRightLeft,
  Layers,
  AlertCircle,
  FileText,
  CheckCircle2,
} from '../icons/faIcons';
import { Order, ShopSettings } from '../types';

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

  const handleTriggerResume = (order: Order) => {
    if (currentCartCount > 0) {
      // Prompt user to choose how to handle active cart
      setOrderToResume(order);
    } else {
      // Active cart is empty - directly restore
      onResumeOrder(order, 'replace');
    }
  };

  const handleConfirmDelete = (orderId: string) => {
    onDeleteOrder(orderId);
    setOrderToDelete(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl border border-[#d4d4d8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#1c1b1d] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#d4d4d8] bg-[#f6f2f5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold shadow-xs shrink-0">
              <PauseCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base text-[#1c1b1d] tracking-tight">
                  Parked / Held Orders
                </h2>
                <span className="bg-[#18181b] text-white text-[10px] font-mono font-black px-2 py-0.5 rounded-full">
                  {heldOrders.length} {heldOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>
              <p className="text-[11px] text-[#77767b] truncate mt-0.5">
                Temporarily saved tickets waiting to be resumed or paid
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#77767b] hover:text-[#1c1b1d] hover:bg-[#eae7ea] transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        {heldOrders.length > 0 && (
          <div className="px-4 py-2.5 sm:px-5 bg-white border-b border-[#f0edf0] flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#77767b] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order #, item name, note, or cashier..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#f6f2f5] border border-[#d4d4d8] rounded-xl text-xs text-[#1c1b1d] placeholder:text-[#77767b] focus:outline-none focus:border-[#18181b] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#77767b] hover:text-black font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {heldOrders.length > 1 && onClearAllHeld && (
              <button
                onClick={onClearAllHeld}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Clear All
              </button>
            )}
          </div>
        )}

        {/* Current Active Cart Banner Alert (if items exist in register) */}
        {currentCartCount > 0 && (
          <div className="px-4 py-2 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-900 shrink-0">
            <div className="flex items-center gap-1.5 font-medium">
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>
                Register currently has{' '}
                <strong className="font-bold">
                  {currentCartCount} {currentCartCount === 1 ? 'item' : 'items'} ({currencySymbol}
                  {currentCartTotal.toFixed(2)})
                </strong>
              </span>
            </div>
            <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100/70 px-2 py-0.5 rounded-md">
              Safe Swap Available
            </span>
          </div>
        )}

        {/* Orders List Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-[#fcf8fb]">
          {heldOrders.length === 0 ? (
            <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#f0edf0] border border-[#d4d4d8] flex items-center justify-center mb-3.5 text-[#77767b]">
                <PauseCircle className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#1c1b1d]">
                No Orders Currently on Hold
              </h3>
              <p className="text-xs text-[#77767b] mt-1.5 leading-relaxed">
                When a customer needs time to retrieve cash or an extra item, tap the{' '}
                <strong className="text-[#1c1b1d] font-bold">Hold button</strong> in the bill
                terminal to park their ticket and immediately serve the next person in line.
              </p>
              <div className="mt-5 p-3 rounded-xl bg-white border border-[#e4e4e7] text-left text-[11px] text-[#77767b] w-full">
                <span className="font-bold text-[#1c1b1d] block mb-1">
                  How Cashiers Use Hold:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                  <li>Cart is saved safely in memory & local storage</li>
                  <li>Ticket counter advances for the next customer</li>
                  <li>One-click resume restores items back to register</li>
                </ul>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-[#77767b]">
              <p className="text-xs font-bold text-[#1c1b1d]">
                No parked orders match "{searchQuery}"
              </p>
              <p className="text-[11px] text-[#77767b] mt-1">
                Try searching by a different order number or cashier name
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const itemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
              const relativeTime = formatRelativeTime(order.createdAt);
              const exactTime = formatTime(order.createdAt);

              return (
                <div
                  key={order.id}
                  className="bg-white border border-[#d4d4d8] hover:border-[#18181b] rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col gap-3"
                >
                  {/* Card Header: Order #, Time, Cashier, Amount */}
                  <div className="flex items-start justify-between gap-2 border-b border-[#f0edf0] pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#18181b] text-white font-mono font-black text-xs px-2.5 py-1 rounded-lg tracking-wider">
                        Order #{order.orderNumber}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-[#77767b] font-medium">
                        <Clock className="w-3 h-3 text-[#77767b]" />
                        <span>
                          {relativeTime} ({exactTime})
                        </span>
                      </span>
                      {order.staffName && (
                        <span className="flex items-center gap-1 text-[10px] text-zinc-600 bg-[#f0edf0] px-2 py-0.5 rounded-md font-semibold">
                          <User className="w-2.5 h-2.5 text-zinc-500" />
                          <span>{order.staffName}</span>
                        </span>
                      )}
                      {(order as any).note && (
                        <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                          Note: {(order as any).note}
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-[#77767b] uppercase block">
                        Total Due
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono text-[#1c1b1d]">
                        {currencySymbol}
                        {order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Items List Preview */}
                  <div className="bg-[#fcf8fb] border border-[#f0edf0] rounded-xl p-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[#77767b] font-bold mb-1.5">
                      <span>
                        Items ({itemsCount} {itemsCount === 1 ? 'unit' : 'units'})
                      </span>
                      <span className="font-mono">
                        Subtotal: {currencySymbol}
                        {order.subtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {order.items.map((item, idx) => (
                        <span
                          key={item.id || idx}
                          className="bg-white border border-[#d4d4d8] rounded-lg px-2 py-1 text-xs text-[#1c1b1d] font-semibold flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="bg-[#18181b] text-white text-[9px] font-mono font-black w-4 h-4 rounded flex items-center justify-center">
                            {item.quantity}
                          </span>
                          <span className="truncate max-w-[140px] sm:max-w-[200px]">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#77767b]">
                            {currencySymbol}
                            {(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {/* Left: Discard / Print Token */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setOrderToDelete(order)}
                        className="p-2 text-[#77767b] hover:text-[#ba1a1a] hover:bg-red-50 rounded-xl transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                        title="Discard held order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Discard</span>
                      </button>

                      <button
                        onClick={() => setOrderToPrint(order)}
                        className="px-2.5 py-1.5 text-zinc-700 hover:text-black hover:bg-[#f0edf0] rounded-xl transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 border border-[#d4d4d8]"
                        title="Print holding token slip for customer"
                      >
                        <Printer className="w-3.5 h-3.5 text-zinc-700" />
                        <span className="hidden sm:inline">Holding Slip</span>
                      </button>
                    </div>

                    {/* Right: Primary Resume Button */}
                    <button
                      onClick={() => handleTriggerResume(order)}
                      className="px-3.5 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Resume to Bill</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-[#f6f2f5] border-t border-[#d4d4d8] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#77767b] font-medium hidden sm:inline">
            Held orders are preserved in your station storage even if refreshed.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-[#eae7ea] border border-[#d4d4d8] rounded-xl text-xs font-extrabold text-[#1c1b1d] transition-all cursor-pointer text-center"
          >
            Close (Esc)
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUB-MODAL: RESUME CONFLICT STRATEGY SELECTOR
          Shown when active cart is NOT empty
          ========================================================================= */}
      {orderToResume && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[#d4d4d8] shadow-2xl p-5 text-[#1c1b1d] space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-[#f0edf0] pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-[#1c1b1d]">
                  Active Cart is Not Empty
                </h3>
                <p className="text-xs text-[#77767b] mt-0.5">
                  You have <strong className="text-black">{currentCartCount} items ({currencySymbol}{currentCartTotal.toFixed(2)})</strong> currently in the register.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-700 font-medium leading-relaxed">
              How would you like to handle your current cart when resuming{' '}
              <strong className="text-black font-black">Order #{orderToResume.orderNumber}</strong>?
            </p>

            <div className="space-y-2">
              {/* Option 1: Swap & Hold (Recommended) */}
              <button
                onClick={() => {
                  onResumeOrder(orderToResume, 'swap');
                  setOrderToResume(null);
                }}
                className="w-full p-3 rounded-xl border-2 border-[#18181b] bg-[#18181b] text-white hover:bg-black text-left flex items-start gap-3 transition-all cursor-pointer shadow-sm group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wide">
                      Swap & Park Current Cart
                    </span>
                    <span className="text-[9px] font-black uppercase bg-amber-400 text-black px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Saves current cart as a new parked order, and loads Order #{orderToResume.orderNumber} onto the counter.
                  </p>
                </div>
              </button>

              {/* Option 2: Merge Items */}
              <button
                onClick={() => {
                  onResumeOrder(orderToResume, 'merge');
                  setOrderToResume(null);
                }}
                className="w-full p-3 rounded-xl border border-[#d4d4d8] bg-white hover:bg-[#f6f2f5] text-left flex items-start gap-3 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#f0edf0] flex items-center justify-center shrink-0 mt-0.5 text-zinc-800">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-[#1c1b1d] block">
                    Combine / Merge Carts
                  </span>
                  <p className="text-[11px] text-[#77767b] mt-0.5">
                    Appends Order #{orderToResume.orderNumber}'s items into the current cart.
                  </p>
                </div>
              </button>

              {/* Option 3: Replace Cart */}
              <button
                onClick={() => {
                  onResumeOrder(orderToResume, 'replace');
                  setOrderToResume(null);
                }}
                className="w-full p-3 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 text-left flex items-start gap-3 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5 text-red-700">
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-red-900 block">
                    Overwrite / Discard Current Cart
                  </span>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    Discards current active items and restores Order #{orderToResume.orderNumber}.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setOrderToResume(null)}
                className="px-4 py-2 text-xs font-bold text-[#77767b] hover:text-[#1c1b1d] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-MODAL: CONFIRM DISCARD
          ========================================================================= */}
      {orderToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-5 text-[#1c1b1d] space-y-3.5 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#1c1b1d]">
                Discard Order #{orderToDelete.orderNumber}?
              </h3>
              <p className="text-xs text-[#77767b] mt-1">
                This will permanently delete the parked ticket with {orderToDelete.items.length} items ({currencySymbol}{orderToDelete.total.toFixed(2)}).
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0edf0]">
              <button
                onClick={() => setOrderToDelete(null)}
                className="px-3.5 py-2 text-xs font-bold text-[#77767b] hover:text-[#1c1b1d] rounded-xl hover:bg-[#f0edf0] transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={() => handleConfirmDelete(orderToDelete.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                Yes, Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-MODAL: PRINT HOLDING TOKEN SLIP
          ========================================================================= */}
      {orderToPrint && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs border border-[#d4d4d8] shadow-2xl p-4 text-[#1c1b1d] space-y-3 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-dashed border-zinc-300 pb-2">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                  Holding Slip
                </h4>
                <p className="text-[10px] text-zinc-500 font-mono">Token for Customer</p>
              </div>
              <button
                onClick={() => setOrderToPrint(null)}
                className="text-zinc-500 hover:text-zinc-900 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Ticket Preview */}
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 font-mono text-[11px] space-y-2 text-zinc-800">
              <div className="text-center border-b border-dashed border-zinc-300 pb-2">
                <span className="font-black text-xs block text-black">
                  {shopSettings.shopName}
                </span>
                <span className="text-[9px] text-zinc-500 block">PARKED ORDER TOKEN</span>
                <span className="text-base font-black text-zinc-950 block mt-1 bg-white border border-zinc-300 rounded py-0.5">
                  #{orderToPrint.orderNumber}
                </span>
              </div>

              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>Date: {new Date(orderToPrint.createdAt).toLocaleDateString()}</span>
                <span>Time: {formatTime(orderToPrint.createdAt)}</span>
              </div>
              {orderToPrint.staffName && (
                <div className="text-[10px] text-zinc-600">
                  Cashier: {orderToPrint.staffName}
                </div>
              )}

              <div className="border-t border-dashed border-zinc-300 pt-1.5 space-y-1">
                {orderToPrint.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[150px]">
                      {i.quantity}x {i.name}
                    </span>
                    <span>
                      {currencySymbol}
                      {(i.unitPrice * i.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-zinc-300 pt-1.5 flex justify-between font-black text-xs text-black">
                <span>TOTAL DUE:</span>
                <span>
                  {currencySymbol}
                  {orderToPrint.total.toFixed(2)}
                </span>
              </div>

              <p className="text-[9px] text-center text-zinc-500 italic pt-1">
                Present this slip at register when ready to complete your purchase.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setOrderToPrint(null)}
                className="flex-1 py-2 text-xs font-bold text-zinc-600 hover:text-black border border-zinc-300 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
