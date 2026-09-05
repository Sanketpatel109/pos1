import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Filter,
  Eye,
  Edit3,
  Printer,
  Trash2,
  Download,
  Search,
  ArrowUpRight,
  Receipt,
} from 'lucide-react';
import { Order, PaymentMethod } from '../types';

interface ReportsScreenProps {
  orders: Order[];
  currencySymbol: string;
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onPrintOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onDeleteAllOrders: () => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  orders,
  currencySymbol,
  onViewOrder,
  onEditOrder,
  onPrintOrder,
  onDeleteOrder,
  onDeleteAllOrders,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    orders.length > 0 ? orders[0].id : ''
  );

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesFilter =
      selectedFilter === 'ALL' || order.paymentMethod === selectedFilter;

    const matchesSearch =
      searchQuery.trim() === '' ||
      order.orderNumber.toString().includes(searchQuery) ||
      (order.customerName &&
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.includes(searchQuery));

    return matchesFilter && matchesSearch;
  });

  // Active selected order for tablet preview pane
  const activeSelectedOrder =
    orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || null;

  // Calculate Metrics
  const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalBillsCount = filteredOrders.length;
  const avgOrderValue = totalBillsCount > 0 ? totalSales / totalBillsCount : 0;

  const cashSales = filteredOrders
    .filter((o) => o.paymentMethod === 'CASH')
    .reduce((sum, o) => sum + o.total, 0);

  const onlineSales = filteredOrders
    .filter((o) => o.paymentMethod === 'ONLINE')
    .reduce((sum, o) => sum + o.total, 0);

  const creditSales = filteredOrders
    .filter((o) => o.paymentMethod === 'CREDIT')
    .reduce((sum, o) => sum + o.total, 0);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Order #',
      'Date',
      'Customer',
      'Phone',
      'Items Count',
      'Subtotal',
      'Tax',
      'Discount',
      'Total',
      'Payment Method',
    ];

    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleString(),
      `"${o.customerName || 'Walk-in'}"`,
      `"${o.customerPhone || ''}"`,
      o.items.reduce((sum, i) => sum + i.quantity, 0),
      o.subtotal.toFixed(2),
      o.taxAmount.toFixed(2),
      o.discount.toFixed(2),
      o.total.toFixed(2),
      o.paymentMethod,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MonoPOS_Sales_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fcf8fb] overflow-hidden">
      {/* Top Metrics Summary Strip */}
      <div className="bg-[#f6f2f5] border-b border-[#d4d4d8] p-3 sm:p-4 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
              Total Revenue
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#1c1b1d]">
              {currencySymbol}
              {totalSales.toFixed(2)}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
              Total Bills
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#1c1b1d]">
              {totalBillsCount} Invoices
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
              Average Ticket
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#1c1b1d]">
              {currencySymbol}
              {avgOrderValue.toFixed(2)}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
              Payment Breakdown
            </span>
            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <span className="text-[#1c1b1d] font-bold">C: {currencySymbol}{cashSales.toFixed(0)}</span>
              <span className="text-[#1c1b1d] font-bold">O: {currencySymbol}{onlineSales.toFixed(0)}</span>
              <span className="text-[#1c1b1d] font-bold">K: {currencySymbol}{creditSales.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Responsive Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left Column: Filter + Invoices List */}
        <div className="flex-1 md:w-3/5 flex flex-col min-h-0 bg-white md:border-r border-[#d4d4d8]">
          {/* Filter and Search Bar */}
          <div className="p-3 border-b border-[#d4d4d8] bg-white flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              {/* Search Box */}
              <div className="flex-1 bg-[#f6f2f5] border border-[#d4d4d8] rounded-xl px-3 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#77767b]" />
                <input
                  type="text"
                  placeholder="Search by Bill # or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs text-[#1c1b1d] bg-transparent focus:outline-hidden placeholder-[#77767b]"
                />
              </div>

              {/* Export Button */}
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span> CSV
              </button>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {(['ALL', 'CASH', 'ONLINE', 'CREDIT', 'SPLIT'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedFilter(mode)}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    selectedFilter === mode
                      ? 'bg-[#18181b] text-white shadow-2xs'
                      : 'bg-[#f6f2f5] text-[#47464b] border border-[#d4d4d8] hover:bg-[#eae7ea]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {filteredOrders.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-[#77767b] text-xs">
                No bills found matching your filter criteria
              </div>
            ) : (
              filteredOrders.map((order) => {
                const dateObj = new Date(order.createdAt);
                const formattedTime = dateObj.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });
                const formattedDate = dateObj.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                });
                const isSelected = activeSelectedOrder?.id === order.id;

                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                    }}
                    className={`border rounded-2xl p-3 flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#f0edf0] border-[#18181b] ring-1 ring-[#18181b]'
                        : 'bg-white border-[#d4d4d8] hover:border-[#18181b] shadow-2xs'
                    }`}
                  >
                    {/* Left: Bill Meta */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs sm:text-sm text-[#1c1b1d] font-mono">
                          #{order.orderNumber}
                        </span>
                        <span className="text-[10px] font-extrabold bg-[#eae7ea] text-[#1c1b1d] px-2 py-0.5 rounded-md font-mono">
                          {order.paymentMethod}
                        </span>
                        <span className="text-[11px] text-[#77767b]">
                          {formattedDate}, {formattedTime}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-[#1c1b1d] truncate mt-1">
                        {order.customerName || 'Walk-in'} • {order.items.length} items
                      </p>
                    </div>

                    {/* Right: Amount & Action Icons */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className="font-black text-xs sm:text-sm font-mono text-[#1c1b1d]">
                        {currencySymbol}
                        {order.total.toFixed(2)}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewOrder(order);
                          }}
                          title="View Invoice Modal"
                          className="p-1.5 bg-white sm:bg-[#f6f2f5] hover:bg-[#eae7ea] rounded-lg text-[#1c1b1d] border border-[#d4d4d8]/60 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrintOrder(order);
                          }}
                          title="Print Thermal Receipt"
                          className="p-1.5 bg-white sm:bg-[#f6f2f5] hover:bg-[#eae7ea] rounded-lg text-[#1c1b1d] border border-[#d4d4d8]/60 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteOrder(order.id);
                          }}
                          title="Delete Invoice"
                          className="p-1.5 bg-white sm:bg-[#f6f2f5] hover:bg-[#ffdad6] text-[#ba1a1a] rounded-lg border border-[#d4d4d8]/60 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Clear Option */}
          {orders.length > 0 && (
            <div className="p-2.5 bg-[#f6f2f5] border-t border-[#d4d4d8] flex justify-between items-center text-xs text-[#77767b] shrink-0">
              <span className="font-mono">Invoices: {orders.length}</span>
              <button
                onClick={onDeleteAllOrders}
                className="text-[#ba1a1a] hover:underline font-bold text-[11px] cursor-pointer"
              >
                Clear All Invoices
              </button>
            </div>
          )}
        </div>

        {/* Right Column (Tablet View): Live Receipt Inspector Pane */}
        <div className="hidden md:flex md:w-2/5 bg-[#f6f2f5] flex-col min-h-0 p-4 overflow-y-auto">
          {activeSelectedOrder ? (
            <div className="bg-white border border-[#d4d4d8] rounded-2xl p-4 shadow-sm flex flex-col gap-3 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-dashed border-[#d4d4d8] pb-3">
                <div>
                  <span className="text-[10px] text-[#77767b] uppercase block">Selected Ticket</span>
                  <span className="text-base font-black text-[#1c1b1d]">
                    Bill #{activeSelectedOrder.orderNumber}
                  </span>
                </div>
                <span className="bg-[#18181b] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {activeSelectedOrder.paymentMethod}
                </span>
              </div>

              <div className="space-y-1 text-[#47464b] text-[11px]">
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold text-[#1c1b1d]">
                    {activeSelectedOrder.customerName || 'Walk-in Customer'}
                  </span>
                </div>
                {activeSelectedOrder.customerPhone && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="text-[#1c1b1d]">{activeSelectedOrder.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span className="text-[#1c1b1d]">
                    {new Date(activeSelectedOrder.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Staff / Cashier:</span>
                  <span className="text-[#1c1b1d]">{activeSelectedOrder.staffName || 'Staff'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border-t border-b border-dashed border-[#d4d4d8] py-2.5 space-y-1.5">
                <div className="flex justify-between font-bold text-[10px] text-[#77767b] uppercase">
                  <span>Item & Qty</span>
                  <span>Price</span>
                </div>
                {activeSelectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-[#1c1b1d]">
                    <span>
                      {item.name} <span className="text-[#77767b]">x{item.quantity}</span>
                    </span>
                    <span className="font-bold">
                      {currencySymbol}
                      {(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#77767b]">
                  <span>Subtotal:</span>
                  <span>{currencySymbol}{activeSelectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {activeSelectedOrder.taxAmount > 0 && (
                  <div className="flex justify-between text-[#77767b]">
                    <span>Tax ({activeSelectedOrder.taxRate}%):</span>
                    <span>+{currencySymbol}{activeSelectedOrder.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {activeSelectedOrder.discount > 0 && (
                  <div className="flex justify-between text-[#ba1a1a]">
                    <span>Discount:</span>
                    <span>-{currencySymbol}{activeSelectedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#1c1b1d] pt-1.5 border-t border-[#d4d4d8]">
                  <span>Grand Total:</span>
                  <span>{currencySymbol}{activeSelectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => onPrintOrder(activeSelectedOrder)}
                  className="py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => onViewOrder(activeSelectedOrder)}
                  className="py-2 bg-[#f4f4f5] hover:bg-[#eae7ea] text-[#1c1b1d] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-[#d4d4d8] cursor-pointer active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#77767b]">
              <Receipt className="w-8 h-8 text-[#c8c5cb] mb-2" />
              <p className="text-xs font-bold text-[#1c1b1d]">No Invoice Selected</p>
              <p className="text-[11px] text-[#77767b] mt-0.5">
                Click any invoice in the list to preview the thermal receipt
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
