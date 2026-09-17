import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
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
  RotateCcw,
} from 'lucide-react';
import { Order, PaymentMethod, CatalogItem, ShopSettings } from '../types';
import { calculateOrderTaxFromSnapshot } from '../constants/taxRates';
import { downloadTallyXml } from '../utils/tallyExport';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { ProcessReturnModal, RefundResult } from './ProcessReturnModal';

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
  onProcessRefund?: (refund: RefundResult) => void;
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
  onProcessRefund,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [returnTargetOrder, setReturnTargetOrder] = useState<Order | null>(null);
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

    const q = searchQuery.trim().toLowerCase();
    const cleanQ = q.replace(/^ord-/, '').replace(/^#/, '');
    const matchesSearch =
      !q ||
      order.orderNumber.toString().includes(q) ||
      order.orderNumber.toString().includes(cleanQ) ||
      (order.orderNumberFormatted && order.orderNumberFormatted.toLowerCase().includes(q)) ||
      (order.orderNumberFormatted && order.orderNumberFormatted.toLowerCase().includes(cleanQ)) ||
      (order.id && order.id.toLowerCase().includes(q)) ||
      (order.customerName &&
        order.customerName.toLowerCase().includes(q)) ||
      (order.customerPhone && order.customerPhone.includes(q));

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
        (Number(item.price) || 0).toFixed(2),
        totalValuation.toFixed(2),
        status,
      ];
    });

    triggerCsvDownload('MonoPOS_Inventory_Stock_Report', headers, rows);
  };

  // 5. Official Tally Prime & ERP 9 XML Sales Vouchers Export
  const handleExportTallyXML = () => {
    downloadTallyXml(orders, shopSettings?.shopName || 'MonoPOS Retail');
    setIsExportMenuOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground overflow-hidden">
      {/* Top Metrics Summary Strip - Clean default shadcn Cards */}
      <div className="bg-muted/30 border-b border-border p-3 sm:p-4 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 gap-1 border-border shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Total Sales
            </span>
            <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
              {currencySymbol}{totalSales.toFixed(2)}
            </span>
          </Card>

          <Card className="p-4 gap-1 border-border shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Total Bills
            </span>
            <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
              {totalBillsCount} Bills
            </span>
          </Card>

          <Card className="p-4 gap-1 border-border shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Avg. Bill Value
            </span>
            <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
              {currencySymbol}{avgOrderValue.toFixed(2)}
            </span>
          </Card>

          <Card className="p-4 gap-1 border-border shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Payment Breakdown
            </span>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-foreground">
                <span className="text-muted-foreground">Cash:</span>
                <span className="font-semibold tabular-nums">{currencySymbol}{cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-foreground">
                <span className="text-muted-foreground">UPI:</span>
                <span className="font-semibold tabular-nums">{currencySymbol}{onlineSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-foreground">
                <span className="text-muted-foreground">Khata:</span>
                <span className="font-semibold tabular-nums">{currencySymbol}{creditSales.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* CA / GST Monthly Sales Export Bar (GSTR-1 for Tax Consultant) */}
      <div className="bg-card border-b border-border px-3 sm:px-4 py-2.5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-md bg-muted border border-border flex items-center justify-center shrink-0 text-foreground">
            <Receipt className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">CA / GST Monthly Sales (GSTR-1)</span>
              <Badge variant="secondary" className="text-[10px] py-0">
                {monthlyOrdersCount} {monthlyOrdersCount === 1 ? 'bill' : 'bills'} in {gstMonth}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">One-tap GSTR-1 preparation for the store's tax consultant</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Input
            type="month"
            id="gst-month-selector"
            value={gstMonth}
            onChange={(e) => setGstMonth(e.target.value)}
            className="h-8 w-auto px-2.5 text-xs font-medium bg-background"
            title="Select Month (YYYY-MM)"
          />
          <Button
            type="button"
            id="btn-export-gst-report"
            onClick={handleExportMonthlyGSTR1CSV}
            className="h-8 px-3 gap-1.5 text-xs font-medium cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>Export GST Report (CSV)</span>
          </Button>
        </div>
      </div>

      {/* Main Responsive Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left Column: Filter + Invoices List in Default shadcn Table */}
        <div className="flex-1 flex flex-col min-h-0 bg-card md:border-r border-border">
          {/* Filter and Search Bar */}
          <div className="p-3 border-b border-border bg-card flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              {/* Search Box */}
              <div className="flex-1 relative">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search by Bill # or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 h-8 text-xs bg-background"
                />
              </div>

              {/* Export Dropdown Menu */}
              <div className="relative shrink-0">
                <Button
                  type="button"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  variant="outline"
                  className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer"
                >
                  <Download className="size-3.5" />
                  <span>Export</span>
                  <ChevronDown className="size-3 opacity-70" />
                </Button>

                {isExportMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsExportMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-popover rounded-lg border border-border shadow-lg py-1.5 z-50 text-xs text-popover-foreground animate-in fade-in duration-100">
                      <div className="px-3 py-1.5 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Download CSV / Excel
                      </div>
                      <button
                        type="button"
                        onClick={handleExportMonthlyGSTR1CSV}
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 cursor-pointer font-bold text-foreground border-b border-border"
                      >
                        <Receipt className="size-4 text-foreground" />
                        <div>
                          <div className="leading-tight">CA Monthly GSTR-1 ({gstMonth})</div>
                          <div className="text-[10px] text-muted-foreground font-normal">Monthly tax consultant CSV ({monthlyOrdersCount} bills)</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportSalesCSV}
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 cursor-pointer font-bold text-foreground"
                      >
                        <FileSpreadsheet className="size-4 text-foreground" />
                        <div>
                          <div className="leading-tight">Sales Orders Report</div>
                          <div className="text-[10px] text-muted-foreground font-normal">Detailed customer bills & taxes</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportGSTR1CSV}
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 cursor-pointer font-bold text-foreground"
                      >
                        <Receipt className="size-4 text-foreground" />
                        <div>
                          <div className="leading-tight">GSTR-1 Tax Summary</div>
                          <div className="text-[10px] text-muted-foreground font-normal">CGST & SGST sales tax breakdown</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportItemWiseCSV}
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 cursor-pointer font-bold text-foreground"
                      >
                        <BarChart3 className="size-4 text-foreground" />
                        <div>
                          <div className="leading-tight">Item-Wise Sales Breakdown</div>
                          <div className="text-[10px] text-muted-foreground font-normal">Units sold & revenue per dish</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportInventoryCSV}
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 cursor-pointer font-bold text-foreground"
                      >
                        <Layers className="size-4 text-foreground" />
                        <div>
                          <div className="leading-tight">Inventory & Valuation</div>
                          <div className="text-[10px] text-muted-foreground font-normal">Current stock & low stock alerts</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportTallyXML}
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 cursor-pointer font-bold text-foreground border-t border-border"
                      >
                        <FileText className="size-4 text-foreground" />
                        <div>
                          <div className="leading-tight flex items-center gap-1.5">
                            <span>Tally Prime & ERP 9 (XML)</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">Official</Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-normal">Importable Sales Vouchers XML</div>
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
                <Button
                  key={filterItem.key}
                  size="sm"
                  variant={selectedFilter === filterItem.key ? 'default' : 'outline'}
                  onClick={() => setSelectedFilter(filterItem.key as 'ALL' | PaymentMethod)}
                  className="h-7 px-3 text-xs font-medium cursor-pointer"
                >
                  {filterItem.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Invoices List - Rendered with clean default shadcn Table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-xs">
                <TableRow>
                  <TableHead className="w-[85px]">Bill #</TableHead>
                  <TableHead className="min-w-[130px]">Date & Time</TableHead>
                  <TableHead className="min-w-[140px]">Customer</TableHead>
                  <TableHead className="w-[80px]">Items</TableHead>
                  <TableHead className="w-[90px]">Payment</TableHead>
                  <TableHead className="w-[95px]">Status</TableHead>
                  <TableHead className="text-right w-[110px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center text-muted-foreground text-xs">
                      No bills found matching your filter criteria
                    </TableCell>
                  </TableRow>
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
                        ? 'Khata'
                        : order.paymentMethod === 'CASH'
                        ? 'Cash'
                        : order.paymentMethod;

                    const itemsCount = order.items.reduce((sum, it) => sum + it.quantity, 0);

                    return (
                      <TableRow
                        key={order.id}
                        data-state={isSelected ? 'selected' : undefined}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          if (typeof window !== 'undefined' && window.innerWidth < 768) {
                            onViewOrder(order);
                          }
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-muted/80' : 'hover:bg-muted/50'
                        }`}
                      >
                        <TableCell className="font-semibold tabular-nums text-xs">
                          <div className="flex items-center gap-1.5">
                            <span>#{order.orderNumber}</span>
                            {shopSettings?.enableDailyToken && order.tokenNumber && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-medium">
                                #{String(order.tokenNumber).padStart(2, '0')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formattedDate}, {formattedTime}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground max-w-[160px] truncate">
                          {order.customerName || 'Walk-in Customer'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {paymentModeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.status === 'refunded' ? (
                            <Badge variant="destructive" className="text-[10px] py-0 font-medium">
                              Refunded
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] py-0 font-normal">
                              Paid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums text-xs text-foreground">
                          {currencySymbol}{order.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer Bill Counter */}
          {orders.length > 0 && (
            <div className="p-2.5 bg-card border-t border-border flex justify-between items-center text-xs text-muted-foreground shrink-0">
              <span className="tabular-nums">Bills: {filteredOrders.length} of {orders.length}</span>
              <span className="text-[11px] text-muted-foreground">GST Sequence Maintained</span>
            </div>
          )}
        </div>

        {/* Right Column: Live Receipt Inspector Pane using default shadcn Card */}
        <div className="hidden md:flex md:w-[380px] lg:w-[420px] bg-muted/10 flex-col min-h-0 p-4 overflow-y-auto">
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
            const taxRate = activeSelectedOrder.taxRate || 0;
            const halfTaxRate = (taxRate / 2).toFixed(1).replace(/\.0$/, '');

            const paymentBadgeLabel =
              activeSelectedOrder.paymentMethod === 'CREDIT'
                ? 'Khata (Credit)'
                : activeSelectedOrder.paymentMethod === 'ONLINE'
                ? 'UPI'
                : activeSelectedOrder.paymentMethod === 'CASH'
                ? 'Cash'
                : activeSelectedOrder.paymentMethod;

            const totalItemCount = activeSelectedOrder.items.reduce((sum, item) => sum + item.quantity, 0);
            const activeTaxBreakdown = taxTotals.taxRateBreakdown.filter(
              (b) => b.rate > 0 && (b.totalTax > 0 || b.cgst > 0 || b.sgst > 0)
            );

            return (
              <Card className="shadow-xs border-border bg-card flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold tabular-nums">
                          Bill #{activeSelectedOrder.orderNumber}
                        </CardTitle>
                        {shopSettings?.enableDailyToken && activeSelectedOrder.tokenNumber && (
                          <Badge variant="secondary" className="text-[10px] py-0">
                            Token #{String(activeSelectedOrder.tokenNumber).padStart(2, '0')}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        {activeSelectedOrder.customerName || 'Walk-in Customer'} • {billDateTime}
                      </CardDescription>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Billed by: {activeSelectedOrder.staffName || 'Staff'}
                        {activeSelectedOrder.tableOrToken && (
                          <span className="ml-2 font-medium text-foreground">
                            • Table / Buzzer: {activeSelectedOrder.tableOrToken}
                          </span>
                        )}
                      </p>
                    </div>
                    {activeSelectedOrder.status === 'refunded' ? (
                      <Badge variant="destructive" className="text-[10px] py-0 shrink-0">
                        Refunded
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0 shrink-0">
                        {paymentBadgeLabel}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 py-3 text-xs flex-1 overflow-y-auto">
                  {/* Items List */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                      <span>Items ({totalItemCount})</span>
                      <span>Amount</span>
                    </div>
                    <Separator />
                    {activeSelectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-foreground">
                        <span className="truncate pr-2">
                          {item.name} <span className="text-muted-foreground tabular-nums">×{item.quantity}</span>
                        </span>
                        <span className="font-semibold shrink-0 tabular-nums">
                          {currencySymbol}
                          {(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Tax Breakdown */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Taxable Value:</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {currencySymbol}{taxableValue.toFixed(2)}
                      </span>
                    </div>

                    {activeTaxBreakdown.length > 0 ? (
                      activeTaxBreakdown.map((b) => (
                        <div key={b.rate} className="flex justify-between text-[11px] text-muted-foreground">
                          <span>GST {b.rate}% (CGST {(b.rate / 2).toFixed(1)}% + SGST {(b.rate / 2).toFixed(1)}%):</span>
                          <span className="font-medium text-foreground tabular-nums">
                            +{currencySymbol}{b.totalTax.toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : totalTax > 0 ? (
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>GST {taxRate}% (CGST {halfTaxRate}% + SGST {halfTaxRate}%):</span>
                        <span className="font-medium text-foreground tabular-nums">
                          +{currencySymbol}{totalTax.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Tax (0% GST):</span>
                        <span className="tabular-nums">{currencySymbol}0.00</span>
                      </div>
                    )}

                    {totalTax > 0 && (
                      <div className="flex justify-between font-medium text-foreground border-t border-border pt-1">
                        <span>Total Tax:</span>
                        <span className="tabular-nums">
                          {currencySymbol}{totalTax.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {activeSelectedOrder.discount > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Discount:</span>
                        <span className="tabular-nums">-{currencySymbol}{activeSelectedOrder.discount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Grand Total */}
                  <div className="flex justify-between text-sm font-bold text-foreground">
                    <span>Grand Total:</span>
                    <span className="tabular-nums text-base">{currencySymbol}{activeSelectedOrder.total.toFixed(2)}</span>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 pt-3 border-t border-border bg-muted/10">
                  <Button
                    type="button"
                    onClick={() => {
                      setReturnTargetOrder(activeSelectedOrder);
                      setIsReturnModalOpen(true);
                    }}
                    disabled={activeSelectedOrder.status === 'refunded'}
                    variant="outline"
                    className="w-full h-8 text-xs font-medium cursor-pointer"
                  >
                    <RotateCcw className="size-3.5 mr-1.5" />
                    <span>{activeSelectedOrder.status === 'refunded' ? 'Already Refunded' : 'Process Return / Refund'}</span>
                  </Button>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      type="button"
                      onClick={() => onPrintOrder(activeSelectedOrder)}
                      variant="default"
                      className="h-8 text-xs font-medium cursor-pointer"
                    >
                      <Printer className="size-3.5 mr-1.5" />
                      <span>Print Receipt</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onDeleteOrder(activeSelectedOrder.id)}
                      variant="destructive"
                      className="h-8 text-xs font-medium cursor-pointer"
                    >
                      <Trash2 className="size-3.5 mr-1.5" />
                      <span>Void Bill</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })() : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Receipt className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold text-foreground">No Bill Selected</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Click any row in the table to inspect the receipt
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Process Return / Refund Modal */}
      <ProcessReturnModal
        isOpen={isReturnModalOpen}
        order={returnTargetOrder}
        currencySymbol={currencySymbol}
        onClose={() => {
          setIsReturnModalOpen(false);
          setReturnTargetOrder(null);
        }}
        onConfirmRefund={(refund) => {
          if (onProcessRefund) {
            onProcessRefund(refund);
          }
        }}
      />
    </div>
  );
};

