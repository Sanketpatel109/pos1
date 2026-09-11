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
  ShieldCheck,
  ChevronDown,
  BarChart3,
  Layers,
} from '../icons/faIcons';
import { Order, PaymentMethod, CatalogItem, ShopSettings } from '../types';
import { calculateOrderTaxFromSnapshot } from '../constants/taxRates';

interface ReportsScreenProps {
  orders: Order[];
  catalog?: CatalogItem[];
  currencySymbol: string;
  shopSettings?: ShopSettings;
  onViewOrder: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onPrintOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onDeleteAllOrders: () => void;
  onOpenZReport?: () => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  orders,
  catalog = [],
  currencySymbol,
  shopSettings,
  onViewOrder,
  onEditOrder,
  onPrintOrder,
  onDeleteOrder,
  onDeleteAllOrders,
  onOpenZReport,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    orders.length > 0 ? orders[0].id : ''
  );
  const [gstMonth, setGstMonth] = useState<string>(() => {
    if (orders.length > 0 && orders[0].createdAt) {
      return orders[0].createdAt.slice(0, 7);
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  const monthlyOrders = orders.filter((o) => o.createdAt && o.createdAt.startsWith(gstMonth));
  const monthlyOrdersCount = monthlyOrders.length;

  // Helper for safe CSV cell encoding
  const formatCsvCell = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  // Generic CSV Download Helper
  const triggerCsvDownload = (
    filename: string,
    headers: string[],
    rows: (string | number)[][],
    appendDate: boolean = true
  ) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        headers.map(formatCsvCell).join(','),
        ...rows.map((r) => r.map(formatCsvCell).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const finalFilename = appendDate
      ? `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
      : `${filename}.csv`;
    link.setAttribute('download', finalFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  // CA / GST Monthly Sales Export (GSTR-1 for Tax Consultant)
  // Columns: Bill Number, Date, Customer GSTIN (blank for B2C), Taxable Amount, CGST, SGST, Total Tax, Total Bill, Payment Mode
  const handleExportMonthlyGSTR1CSV = () => {
    const monthlyOrders = orders.filter((o) => {
      if (!o.createdAt) return false;
      return o.createdAt.startsWith(gstMonth);
    });

    const headers = [
      'Bill Number',
      'Date',
      'Customer GSTIN (blank for B2C)',
      'Taxable Amount',
      'CGST',
      'SGST',
      'Total Tax',
      'Total Bill',
      'Payment Mode',
    ];

    const rows = monthlyOrders.map((o) => {
      const billNumber =
        o.orderNumberFormatted ||
        `#${o.terminalPrefix || 'A'}-${String(o.orderNumber).padStart(3, '0')}`;
      const date = o.createdAt ? o.createdAt.slice(0, 10) : '';
      const customerGstin = (o as any).customerGstin || '';

      // Strictly use invoice's saved tax snapshots, never live catalog
      const taxTotals = calculateOrderTaxFromSnapshot(o.items);
      const taxableAmount = (taxTotals.taxableSubtotal > 0 ? taxTotals.taxableSubtotal : (o.subtotal ?? (o.total - (o.taxAmount || 0)))).toFixed(2);
      const cgst = (taxTotals.totalCgst > 0 ? taxTotals.totalCgst : ((o.taxAmount || 0) / 2)).toFixed(2);
      const sgst = (taxTotals.totalSgst > 0 ? taxTotals.totalSgst : ((o.taxAmount || 0) / 2)).toFixed(2);
      const totalTax = (taxTotals.totalTax > 0 ? taxTotals.totalTax : (o.taxAmount || 0)).toFixed(2);
      const totalBill = o.total.toFixed(2);
      const paymentMode = o.paymentMethod || 'CASH';

      return [
        billNumber,
        date,
        customerGstin,
        taxableAmount,
        cgst,
        sgst,
        totalTax,
        totalBill,
        paymentMode,
      ];
    });

    triggerCsvDownload(`MonoPOS_GST_Monthly_Sales_${gstMonth}`, headers, rows, false);
  };

  // 1. Detailed Sales CSV
  const handleExportSalesCSV = () => {
    const headers = [
      'Order #',
      'Date & Time',
      'Customer Name',
      'Customer Phone',
      'Items Count',
      'Subtotal',
      'Tax Amount',
      'Discount',
      'Total Amount',
      'Payment Method',
      'Status',
    ];

    const rows = filteredOrders.map((o) => {
      const taxTotals = calculateOrderTaxFromSnapshot(o.items);
      const subtotal = taxTotals.taxableSubtotal > 0 ? taxTotals.taxableSubtotal : o.subtotal;
      const taxAmount = taxTotals.totalTax > 0 ? taxTotals.totalTax : o.taxAmount;

      return [
        o.orderNumber,
        `"${new Date(o.createdAt).toLocaleString()}"`,
        `"${o.customerName || 'Walk-in Customer'}"`,
        `"${o.customerPhone || ''}"`,
        o.items.reduce((sum, i) => sum + i.quantity, 0),
        subtotal.toFixed(2),
        taxAmount.toFixed(2),
        o.discount.toFixed(2),
        o.total.toFixed(2),
        o.paymentMethod,
        o.status,
      ];
    });

    triggerCsvDownload('MonoPOS_Sales_Bills', headers, rows);
  };

  // 2. GSTR-1 Indian Tax Breakdown CSV
  const handleExportGSTR1CSV = () => {
    const headers = [
      'Invoice No',
      'Invoice Date',
      'Customer Name',
      'Customer Phone',
      'Taxable Value',
      'CGST Rate %',
      'CGST Amount',
      'SGST Rate %',
      'SGST Amount',
      'Total Tax',
      'Invoice Total',
      'Payment Mode',
    ];

    const rows: (string | number)[][] = [];
    filteredOrders.forEach((o) => {
      const taxTotals = calculateOrderTaxFromSnapshot(o.items);
      const invoiceNo = o.orderNumberFormatted || `#${o.terminalPrefix || 'A'}-${o.orderNumber}`;
      const invoiceDate = `"${new Date(o.createdAt).toLocaleDateString()}"`;
      const custName = `"${o.customerName || 'B2C Walk-in'}"`;
      const custPhone = `"${o.customerPhone || ''}"`;
      const pMode = o.paymentMethod || 'CASH';

      if (taxTotals.taxRateBreakdown.length > 0) {
        taxTotals.taxRateBreakdown.forEach((b) => {
          rows.push([
            invoiceNo,
            invoiceDate,
            custName,
            custPhone,
            b.taxableAmount.toFixed(2),
            `${(b.gstRate / 2).toFixed(1)}%`,
            b.cgst.toFixed(2),
            `${(b.gstRate / 2).toFixed(1)}%`,
            b.sgst.toFixed(2),
            b.totalTax.toFixed(2),
            (b.taxableAmount + b.totalTax).toFixed(2),
            pMode,
          ]);
        });
      } else {
        const halfTaxRate = (o.taxRate || 5) / 2;
        const halfTaxAmount = (o.taxAmount || 0) / 2;
        rows.push([
          invoiceNo,
          invoiceDate,
          custName,
          custPhone,
          o.subtotal.toFixed(2),
          `${halfTaxRate.toFixed(1)}%`,
          halfTaxAmount.toFixed(2),
          `${halfTaxRate.toFixed(1)}%`,
          halfTaxAmount.toFixed(2),
          (o.taxAmount || 0).toFixed(2),
          o.total.toFixed(2),
          pMode,
        ]);
      }
    });

    triggerCsvDownload('MonoPOS_GSTR1_Tax_Report', headers, rows);
  };

  // 3. Item-Wise Product Sales CSV
  const handleExportItemWiseCSV = () => {
    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();

    filteredOrders.forEach((o) => {
      o.items.forEach((item) => {
        const key = item.name.toLowerCase();
        const existing = itemMap.get(key) || { name: item.name, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += item.quantity * item.unitPrice;
        itemMap.set(key, existing);
      });
    });

    const headers = ['Product Name', 'Total Units Sold', 'Gross Revenue', 'Average Selling Price'];
    const rows = Array.from(itemMap.values()).map((data) => [
      `"${data.name}"`,
      data.qty,
      data.revenue.toFixed(2),
      (data.revenue / (data.qty || 1)).toFixed(2),
    ]);

    triggerCsvDownload('MonoPOS_Item_Wise_Sales', headers, rows);
  };

  // 4. Inventory Valuation & Stock Report
  const handleExportInventoryCSV = () => {
    const headers = [
      'Product Name',
      'Category',
      'Barcode',
      'SKU',
      'In Stock',
      'Unit',
      'Low Stock Threshold',
      'Cost Price',
      'Selling Price',
      'Total Inventory Value',
      'Status',
    ];

    const rows = catalog.map((item) => {
      const stock = item.stock ?? 0;
      const threshold = item.lowStockThreshold ?? 5;
      const cost = item.costPrice || item.price * 0.7;
      const totalValuation = stock * cost;
      const status = stock === 0 ? 'Out of Stock' : stock <= threshold ? 'LOW STOCK' : 'Normal';

      return [
        `"${item.name}"`,
        `"${item.category}"`,
        `"${item.barcode || ''}"`,
        `"${item.sku || ''}"`,
        stock,
        `"${item.unit || 'pcs'}"`,
        threshold,
        cost.toFixed(2),
        item.price.toFixed(2),
        totalValuation.toFixed(2),
        status,
      ];
    });

    triggerCsvDownload('MonoPOS_Inventory_Stock_Report', headers, rows);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fcf8fb] overflow-hidden">
      {/* Top Metrics Summary Strip */}
      <div className="bg-[#f6f2f5] border-b border-[#d4d4d8] p-3 sm:p-4 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
              TOTAL SALES
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#1c1b1d]">
              {currencySymbol}
              {totalSales.toFixed(2)}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
              TOTAL BILLS
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#1c1b1d]">
              {totalBillsCount} Bills
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block">
              AVG BILL VALUE
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#1c1b1d]">
              {currencySymbol}
              {avgOrderValue.toFixed(2)}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-[#d4d4d8] shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77767b] block mb-1">
              PAYMENT BREAKDOWN
            </span>
            <div className="space-y-0.5 text-xs font-mono">
              <div className="flex justify-between text-[#1c1b1d]">
                <span className="text-[#77767b]">Cash:</span>
                <span className="font-bold">{currencySymbol}{cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#1c1b1d]">
                <span className="text-[#77767b]">UPI:</span>
                <span className="font-bold">{currencySymbol}{onlineSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#1c1b1d]">
                <span className="text-[#77767b]">Khata:</span>
                <span className="font-bold">{currencySymbol}{creditSales.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CA / GST Monthly Sales Export Bar (GSTR-1 for Tax Consultant) */}
      <div className="bg-white border-b border-[#d4d4d8] px-3 sm:px-4 py-2.5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 text-blue-600">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">CA / GST Monthly Sales (GSTR-1)</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded border border-slate-200">
                {monthlyOrdersCount} {monthlyOrdersCount === 1 ? 'bill' : 'bills'} in {gstMonth}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">One-tap GSTR-1 preparation for the store's tax consultant</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <input
              type="month"
              id="gst-month-selector"
              value={gstMonth}
              onChange={(e) => setGstMonth(e.target.value)}
              className="h-9 px-2.5 bg-slate-50 hover:bg-white border border-slate-300 focus:border-blue-600 rounded-xl text-xs font-semibold text-slate-800 outline-hidden transition-all shadow-2xs cursor-pointer"
              title="Select Month (YYYY-MM)"
            />
          </div>
          <button
            type="button"
            id="btn-export-gst-report"
            onClick={handleExportMonthlyGSTR1CSV}
            className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GST Report (CSV)</span>
          </button>
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

              {/* Export Dropdown Menu */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="px-3 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {isExportMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsExportMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-zinc-200 shadow-2xl py-1.5 z-50 text-xs text-zinc-800 animate-in fade-in duration-100">
                      <div className="px-3 py-1.5 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Download CSV / Excel
                      </div>
                      <button
                        type="button"
                        onClick={handleExportMonthlyGSTR1CSV}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 cursor-pointer font-bold text-blue-700 border-b border-zinc-100"
                      >
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="leading-tight">CA Monthly GSTR-1 ({gstMonth})</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Monthly tax consultant CSV ({monthlyOrdersCount} bills)</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportSalesCSV}
                        className="w-full px-3 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 cursor-pointer font-bold text-zinc-800"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="leading-tight">Sales Orders Report</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Detailed customer bills & taxes</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportGSTR1CSV}
                        className="w-full px-3 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 cursor-pointer font-bold text-zinc-800"
                      >
                        <Receipt className="w-4 h-4 text-indigo-600" />
                        <div>
                          <div className="leading-tight">GSTR-1 Tax Summary</div>
                          <div className="text-[10px] text-zinc-400 font-normal">CGST & SGST sales tax breakdown</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportItemWiseCSV}
                        className="w-full px-3 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 cursor-pointer font-bold text-zinc-800"
                      >
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="leading-tight">Item-Wise Sales Breakdown</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Units sold & revenue per dish</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportInventoryCSV}
                        className="w-full px-3 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 cursor-pointer font-bold text-zinc-800"
                      >
                        <Layers className="w-4 h-4 text-amber-600" />
                        <div>
                          <div className="leading-tight">Inventory & Valuation</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Current stock & low stock alerts</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Filter Chips: All | Cash | UPI | Khata | Split */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'CASH', label: 'Cash' },
                { key: 'ONLINE', label: 'UPI' },
                { key: 'CREDIT', label: 'Khata' },
                { key: 'SPLIT', label: 'Split' },
              ].map((filterItem) => (
                <button
                  key={filterItem.key}
                  onClick={() => setSelectedFilter(filterItem.key as 'ALL' | PaymentMethod)}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    selectedFilter === filterItem.key
                      ? 'bg-[#18181b] text-white shadow-2xs'
                      : 'bg-[#f6f2f5] text-[#47464b] border border-[#d4d4d8] hover:bg-[#eae7ea]'
                  }`}
                >
                  {filterItem.label}
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

                const paymentModeLabel =
                  order.paymentMethod === 'ONLINE'
                    ? 'UPI'
                    : order.paymentMethod === 'CREDIT'
                    ? 'KHATA'
                    : order.paymentMethod;

                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        onViewOrder(order);
                      }
                    }}
                    className={`border rounded-2xl p-3 flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#f0edf0] border-[#18181b] ring-1 ring-[#18181b]'
                        : 'bg-white border-[#d4d4d8] hover:border-[#18181b] shadow-2xs'
                    }`}
                  >
                    {/* Left: Bill Meta */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs sm:text-sm text-[#1c1b1d] font-mono">
                          #{order.orderNumber}
                        </span>
                        {shopSettings?.enableDailyToken && order.tokenNumber && (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded font-mono">
                            TOKEN #{String(order.tokenNumber).padStart(2, '0')}
                          </span>
                        )}
                        <span className="text-[10px] font-extrabold bg-[#eae7ea] text-[#1c1b1d] px-2 py-0.5 rounded-md font-mono">
                          {paymentModeLabel}
                        </span>
                        <span className="text-[11px] text-[#77767b]">
                          {formattedDate}, {formattedTime}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-[#1c1b1d] truncate mt-1">
                        {order.customerName || 'Walk-in'} • {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>

                    {/* Right: Amount (Row-level [eye] and [trash] removed to prevent accidental voiding) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-xs sm:text-sm font-mono text-[#1c1b1d]">
                        {currencySymbol}
                        {order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bill Counter (Clear All Invoices button removed for statutory compliance) */}
          {orders.length > 0 && (
            <div className="p-2.5 bg-[#f6f2f5] border-t border-[#d4d4d8] flex justify-between items-center text-xs text-[#77767b] shrink-0 font-mono">
              <span>Bills: {filteredOrders.length} of {orders.length}</span>
              <span className="text-[11px] text-zinc-500">GST Sequence Maintained</span>
            </div>
          )}
        </div>

        {/* Right Column (Tablet View): Live Receipt Inspector Pane */}
        <div className="hidden md:flex md:w-2/5 bg-[#f6f2f5] flex-col min-h-0 p-4 overflow-y-auto">
          {activeSelectedOrder ? (() => {
            const billDateObj = new Date(activeSelectedOrder.createdAt);
            const formattedDateStr = billDateObj.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            const formattedTimeStr = billDateObj.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
            const billDateTime = `${formattedDateStr}, ${formattedTimeStr}`;

            const taxTotals = calculateOrderTaxFromSnapshot(activeSelectedOrder.items);
            const taxableValue =
              taxTotals.taxableSubtotal > 0
                ? taxTotals.taxableSubtotal
                : activeSelectedOrder.subtotal || 0;
            const totalTax =
              taxTotals.totalTax > 0
                ? taxTotals.totalTax
                : activeSelectedOrder.taxAmount || 0;
            const cgstAmount =
              taxTotals.totalCgst > 0
                ? taxTotals.totalCgst
                : totalTax / 2;
            const sgstAmount =
              taxTotals.totalSgst > 0
                ? taxTotals.totalSgst
                : totalTax / 2;
            const taxRate = activeSelectedOrder.taxRate || 0;
            const halfTaxRate = (taxRate / 2).toFixed(1).replace(/\.0$/, '');

            const paymentBadgeLabel =
              activeSelectedOrder.paymentMethod === 'CREDIT'
                ? 'KHATA - UNPAID'
                : activeSelectedOrder.paymentMethod === 'ONLINE'
                ? 'UPI - PAID'
                : `${activeSelectedOrder.paymentMethod} - PAID`;

            const totalItemCount = activeSelectedOrder.items.reduce((sum, item) => sum + item.quantity, 0);
            const activeTaxBreakdown = taxTotals.taxRateBreakdown.filter(
              (b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0)
            );

            return (
              <div className="bg-white border border-[#d4d4d8] rounded-2xl p-4 shadow-sm flex flex-col gap-3 font-mono text-xs">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-dashed border-[#d4d4d8] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-[#1c1b1d]">
                        Bill #{activeSelectedOrder.orderNumber}
                      </span>
                      {shopSettings?.enableDailyToken && activeSelectedOrder.tokenNumber && (
                        <span className="bg-emerald-600 text-white font-mono text-[11px] font-black px-2 py-0.5 rounded shadow-2xs">
                          TOKEN #{String(activeSelectedOrder.tokenNumber).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#47464b] mt-0.5">
                      {activeSelectedOrder.customerName || 'Walk-in Customer'} • {billDateTime}
                    </p>
                    <p className="text-[10px] text-[#77767b] font-medium mt-0.5">
                      Billed by: {activeSelectedOrder.staffName || 'Anand (Store Owner)'}
                      {activeSelectedOrder.tableOrToken && (
                        <span className="ml-2 font-semibold text-[#1c1b1d]">
                          • Table / Buzzer: {activeSelectedOrder.tableOrToken}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="bg-[#18181b] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                    [ {paymentBadgeLabel} ]
                  </span>
                </div>

                {/* Items Section */}
                <div className="border-t border-b border-dashed border-[#d4d4d8] py-2.5 space-y-1.5">
                  <div className="flex justify-between font-bold text-[10px] text-[#77767b] uppercase">
                    <span>ITEMS ({totalItemCount})</span>
                    <span>AMOUNT</span>
                  </div>
                  {activeSelectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-[#1c1b1d]">
                      <span className="truncate pr-2">
                        • {item.name} <span className="text-[#77767b]">x{item.quantity}</span>
                      </span>
                      <span className="font-bold shrink-0">
                        {currencySymbol}
                        {(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Statutory Tax Breakdown */}
                <div className="space-y-1 text-xs text-[#47464b] border-t border-dashed border-[#d4d4d8] pt-2.5">
                  <div className="flex justify-between">
                    <span>Taxable Value:</span>
                    <span className="font-semibold text-[#1c1b1d]">
                      {currencySymbol}{taxableValue.toFixed(2)}
                    </span>
                  </div>

                  {activeTaxBreakdown.length > 0 ? (
                    activeTaxBreakdown.map((b) => (
                      <div key={b.rate} className="flex justify-between text-[11px] text-[#47464b]">
                        <span>GST {b.rate}% (CGST {(b.rate / 2).toFixed(1)}% + SGST {(b.rate / 2).toFixed(1)}%):</span>
                        <span className="font-semibold text-[#1c1b1d]">
                          +{currencySymbol}{b.totalTax.toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : totalTax > 0 ? (
                    <div className="flex justify-between text-[11px] text-[#47464b]">
                      <span>GST {taxRate}% (CGST {halfTaxRate}% + SGST {halfTaxRate}%):</span>
                      <span className="font-semibold text-[#1c1b1d]">
                        +{currencySymbol}{totalTax.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[11px] text-[#77767b]">
                      <span>Tax (Exempt / 0% GST):</span>
                      <span>{currencySymbol}0.00</span>
                    </div>
                  )}

                  {totalTax > 0 && (
                    <div className="flex justify-between font-bold text-[#1c1b1d] border-t border-dotted border-[#d4d4d8] pt-1">
                      <span>Total Tax:</span>
                      <span>
                        {currencySymbol}{totalTax.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {activeSelectedOrder.discount > 0 && (
                    <div className="flex justify-between text-[#ba1a1a]">
                      <span>Discount:</span>
                      <span>-{currencySymbol}{activeSelectedOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Grand Total */}
                <div className="flex justify-between text-sm font-black text-[#1c1b1d] pt-2 border-t border-[#d4d4d8]">
                  <span>GRAND TOTAL:</span>
                  <span>{currencySymbol}{activeSelectedOrder.total.toFixed(2)}</span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onPrintOrder(activeSelectedOrder)}
                    className="py-2.5 px-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs transition-all text-center leading-tight"
                    title="Print Duplicate Receipt"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>Print Duplicate Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteOrder(activeSelectedOrder.id)}
                    className="py-2.5 px-2 bg-white hover:bg-red-50 text-[#ba1a1a] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-red-200 hover:border-red-300 cursor-pointer active:scale-95 transition-all text-center leading-tight"
                    title="Cancel / Void Bill (Requires Manager or Owner PIN)"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0 text-[#ba1a1a]" />
                    <span>Cancel / Void Bill</span>
                  </button>
                </div>
              </div>
            );
          })() : (
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
