import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Percent,
  Clock,
  Package,
  Layers,
  CreditCard,
  Users,
  Download,
  Printer,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Award,
  Wallet,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Order, CatalogItem, Category, Customer, CashEntry, StaffMember, ShopSettings } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

export type AnalyticsTimeRange = 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'all';

interface AnalyticsScreenProps {
  orders: Order[];
  catalog?: CatalogItem[];
  categories?: Category[];
  customers?: Customer[];
  cashEntries?: CashEntry[];
  staffList?: StaffMember[];
  currencySymbol: string;
  shopSettings?: ShopSettings;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  orders = [],
  catalog = [],
  categories = [],
  customers = [],
  cashEntries = [],
  staffList = [],
  currencySymbol = '₹',
  shopSettings,
}) => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('today');
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories' | 'payments' | 'staff'>('overview');

  // Filter orders by selected time range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const endOfYesterday = startOfToday - 1;
    const sevenDaysAgo = startOfToday - 6 * 86400000;
    const thirtyDaysAgo = startOfToday - 29 * 86400000;
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return orders.filter((order) => {
      // Exclude void or cancelled transactions from sales analytics
      if (order.status === 'cancelled' || (order.status as string) === 'VOID') return false;

      if (timeRange === 'all') return true;

      const orderTime = order.createdAt ? new Date(order.createdAt).getTime() : 0;
      if (!orderTime) return true;

      if (timeRange === 'today') {
        return orderTime >= startOfToday;
      }
      if (timeRange === 'yesterday') {
        return orderTime >= startOfYesterday && orderTime <= endOfYesterday;
      }
      if (timeRange === '7days') {
        return orderTime >= sevenDaysAgo;
      }
      if (timeRange === '30days') {
        return orderTime >= thirtyDaysAgo;
      }
      if (timeRange === 'thisMonth') {
        return orderTime >= startOfThisMonth;
      }
      return true;
    });
  }, [orders, timeRange]);

  // Catalog lookup map for cost prices and categories
  const catalogMap = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    catalog.forEach((item) => {
      map.set(item.id, item);
      if (item.name) {
        map.set(item.name.toLowerCase().trim(), item);
      }
      if (item.barcode) {
        map.set(item.barcode.trim(), item);
      }
    });
    return map;
  }, [catalog]);

  // Executive KPI Computations
  const kpis = useMemo(() => {
    let grossSales = 0;
    let netSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalCostOfGoods = 0;
    let completedOrdersCount = 0;
    let refundedOrdersCount = 0;
    let totalItemsSold = 0;

    filteredOrders.forEach((order) => {
      const isRefunded = order.status === 'refunded' || order.status === 'partially_refunded';
      if (isRefunded) {
        refundedOrdersCount++;
      } else {
        completedOrdersCount++;
        const orderTotal = Number(order.total) || 0;
        const orderDiscount = Number(order.discount) || 0;
        const orderTax = Number(order.taxAmount) || 0;

        netSales += orderTotal;
        grossSales += (orderTotal + orderDiscount);
        totalDiscount += orderDiscount;
        totalTax += orderTax;

        if (Array.isArray(order.items)) {
          order.items.forEach((item) => {
            const qty = Number(item.quantity) || 1;
            totalItemsSold += qty;

            // Find cost price from catalog
            const matchedCatalog = (item.itemId ? catalogMap.get(item.itemId) : null) ||
              catalogMap.get(item.name?.toLowerCase().trim() || '');
            const unitCost = matchedCatalog?.costPrice ?? 0;
            totalCostOfGoods += (unitCost * qty);
          });
        }
      }
    });

    const averageOrderValue = completedOrdersCount > 0 ? netSales / completedOrdersCount : 0;
    const averageBasketSize = completedOrdersCount > 0 ? totalItemsSold / completedOrdersCount : 0;
    const estimatedGrossProfit = netSales > 0 ? (netSales - totalCostOfGoods) : 0;
    const grossMarginPercent = netSales > 0 ? ((estimatedGrossProfit / netSales) * 100) : 0;

    return {
      grossSales,
      netSales,
      totalDiscount,
      totalTax,
      completedOrdersCount,
      refundedOrdersCount,
      totalItemsSold,
      averageOrderValue,
      averageBasketSize,
      estimatedGrossProfit,
      grossMarginPercent,
    };
  }, [filteredOrders, catalogMap]);

  // Hourly Retail Traffic & Peak Hours Analysis
  const hourlyTraffic = useMemo(() => {
    // 24 hours 00:00 to 23:00
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i - 12} PM` : `${i} AM`,
      sales: 0,
      orderCount: 0,
    }));

    filteredOrders.forEach((order) => {
      if (order.status === 'refunded' || (order.status as string) === 'VOID') return;
      if (!order.createdAt) return;
      const date = new Date(order.createdAt);
      const h = date.getHours();
      if (h >= 0 && h < 24) {
        hours[h].sales += (Number(order.total) || 0);
        hours[h].orderCount += 1;
      }
    });

    // Peak hour
    let peakHour = hours[0];
    let maxSales = 0;
    hours.forEach((h) => {
      if (h.sales > maxSales) {
        maxSales = h.sales;
        peakHour = h;
      }
    });

    return { hours, peakHour, maxSales };
  }, [filteredOrders]);

  // Top 10 Bestselling Products
  const topProducts = useMemo(() => {
    const productStats = new Map<string, {
      id: string;
      name: string;
      category: string;
      quantitySold: number;
      revenue: number;
      costPrice: number;
      currentStock: number;
      unitPrice: number;
    }>();

    filteredOrders.forEach((order) => {
      if (order.status === 'refunded' || (order.status as string) === 'VOID') return;
      if (!Array.isArray(order.items)) return;

      order.items.forEach((item) => {
        const name = item.name || 'Unnamed Item';
        const key = item.itemId || name.toLowerCase().trim();
        const matched = (item.itemId ? catalogMap.get(item.itemId) : null) || catalogMap.get(name.toLowerCase().trim());

        const qty = Number(item.quantity) || 1;
        const rev = Number(item.itemTotal) || (Number(item.unitPrice) * qty);

        const existing = productStats.get(key);
        if (existing) {
          existing.quantitySold += qty;
          existing.revenue += rev;
        } else {
          productStats.set(key, {
            id: item.itemId || key,
            name,
            category: item.category || matched?.category || 'General',
            quantitySold: qty,
            revenue: rev,
            costPrice: matched?.costPrice || 0,
            currentStock: matched?.stock ?? 0,
            unitPrice: Number(item.unitPrice) || 0,
          });
        }
      });
    });

    const sorted = Array.from(productStats.values()).sort((a, b) => b.revenue - a.revenue);
    return sorted.slice(0, 10);
  }, [filteredOrders, catalogMap]);

  // Low Stock High-Velocity Warning (urgent reorder alert)
  const lowStockAlerts = useMemo(() => {
    return topProducts.filter((p) => p.currentStock <= 5 && p.quantitySold > 0);
  }, [topProducts]);

  // Category Sales Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; quantity: number }>();

    filteredOrders.forEach((order) => {
      if (order.status === 'refunded' || (order.status as string) === 'VOID') return;
      if (!Array.isArray(order.items)) return;

      order.items.forEach((item) => {
        const matched = (item.itemId ? catalogMap.get(item.itemId) : null) || catalogMap.get(item.name?.toLowerCase().trim() || '');
        const catName = item.category || matched?.category || 'General';
        const qty = Number(item.quantity) || 1;
        const rev = Number(item.itemTotal) || (Number(item.unitPrice) * qty);

        const existing = map.get(catName);
        if (existing) {
          existing.revenue += rev;
          existing.quantity += qty;
        } else {
          map.set(catName, { name: catName, revenue: rev, quantity: qty });
        }
      });
    });

    const totalCatRevenue = Array.from(map.values()).reduce((sum, c) => sum + c.revenue, 0) || 1;
    return Array.from(map.values())
      .map((c) => ({
        ...c,
        percentage: ((c.revenue / totalCatRevenue) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, catalogMap]);

  // Payment Methods Breakdown
  const paymentBreakdown = useMemo(() => {
    const stats: Record<string, { count: number; amount: number }> = {
      CASH: { count: 0, amount: 0 },
      ONLINE: { count: 0, amount: 0 },
      UPI: { count: 0, amount: 0 },
      CARD: { count: 0, amount: 0 },
      CREDIT: { count: 0, amount: 0 },
      SPLIT: { count: 0, amount: 0 },
    };

    filteredOrders.forEach((order) => {
      if (order.status === 'refunded' || (order.status as string) === 'VOID') return;
      const method = (order.paymentMethod || 'CASH').toUpperCase();
      const orderTotal = Number(order.total) || 0;

      if (!stats[method]) {
        stats[method] = { count: 0, amount: 0 };
      }
      stats[method].count += 1;
      stats[method].amount += orderTotal;
    });

    const totalPaymentAmount = Object.values(stats).reduce((sum, s) => sum + s.amount, 0) || 1;
    return Object.entries(stats)
      .map(([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount,
        percentage: ((data.amount / totalPaymentAmount) * 100),
      }))
      .filter((p) => p.count > 0 || p.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filteredOrders]);

  // Cashier / Staff Productivity
  const staffBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; role: string; ordersCount: number; totalRevenue: number }>();

    filteredOrders.forEach((order) => {
      if (order.status === 'refunded' || (order.status as string) === 'VOID') return;
      const staffName = order.billerName || order.staffName || 'Cashier Desk';
      const rev = Number(order.total) || 0;

      const existing = map.get(staffName);
      if (existing) {
        existing.ordersCount += 1;
        existing.totalRevenue += rev;
      } else {
        const staffMeta = staffList.find((s) => s.name.toLowerCase() === staffName.toLowerCase());
        map.set(staffName, {
          name: staffName,
          role: staffMeta?.role || 'Staff',
          ordersCount: 1,
          totalRevenue: rev,
        });
      }
    });

    return Array.from(map.values())
      .map((s) => ({
        ...s,
        aov: s.ordersCount > 0 ? s.totalRevenue / s.ordersCount : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredOrders, staffList]);

  // CSV Export
  const handleExportCSV = () => {
    const rows = [
      ['Metric / Breakdown', 'Value'],
      ['Time Horizon', timeRange.toUpperCase()],
      ['Gross Sales', `${currencySymbol}${kpis.grossSales.toFixed(2)}`],
      ['Net Revenue', `${currencySymbol}${kpis.netSales.toFixed(2)}`],
      ['Completed Orders', `${kpis.completedOrdersCount}`],
      ['Refunded Orders', `${kpis.refundedOrdersCount}`],
      ['Average Order Value (AOV)', `${currencySymbol}${kpis.averageOrderValue.toFixed(2)}`],
      ['Total Items Sold', `${kpis.totalItemsSold}`],
      ['Gross Profit (Est.)', `${currencySymbol}${kpis.estimatedGrossProfit.toFixed(2)}`],
      ['Gross Margin %', `${kpis.grossMarginPercent.toFixed(1)}%`],
      ['Total Tax Collected', `${currencySymbol}${kpis.totalTax.toFixed(2)}`],
      ['Total Discount Given', `${currencySymbol}${kpis.totalDiscount.toFixed(2)}`],
      [],
      ['Top 10 Products', 'Quantity Sold', 'Revenue', 'Est. Profit Margin'],
      ...topProducts.map((p) => [
        p.name,
        p.quantitySold.toString(),
        `${currencySymbol}${p.revenue.toFixed(2)}`,
        p.costPrice > 0 ? `${(((p.unitPrice - p.costPrice) / p.unitPrice) * 100).toFixed(0)}%` : 'N/A',
      ]),
      [],
      ['Category', 'Revenue', 'Quantity', 'Share %'],
      ...categoryBreakdown.map((c) => [
        c.name,
        `${currencySymbol}${c.revenue.toFixed(2)}`,
        c.quantity.toString(),
        `${c.percentage.toFixed(1)}%`,
      ]),
      [],
      ['Payment Method', 'Transactions', 'Amount', 'Share %'],
      ...paymentBreakdown.map((p) => [
        p.method,
        p.count.toString(),
        `${currencySymbol}${p.amount.toFixed(2)}`,
        `${p.percentage.toFixed(1)}%`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Analytics_Report_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6 space-y-6">
      {/* ── Top Header & Time Filter Bar ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-4 sm:p-5 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Analytics & Business Intelligence
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  <Activity className="size-3 mr-1 animate-pulse" /> Live
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Revenue velocity, gross margin, peak shopping hours, and inventory insights.
              </p>
            </div>
          </div>
        </div>

        {/* Time Filter Buttons & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Filters */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: '7 Days' },
                { id: '30days', label: '30 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                id={`btn-time-filter-${filter.id}`}
                onClick={() => setTimeRange(filter.id)}
                className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                  timeRange === filter.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Export Actions */}
          <Button
            id="btn-export-analytics-csv"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 h-8.5"
            title="Download CSV Spreadsheet"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button
            id="btn-print-analytics"
            variant="outline"
            size="sm"
            onClick={handlePrintSummary}
            className="gap-1.5 h-8.5"
            title="Print Executive Summary"
          >
            <Printer className="size-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {/* ── 6 Executive KPI Metric Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Net Revenue */}
        <Card className="border border-border/70 hover:border-primary/50 transition-all shadow-xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Revenue</span>
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {currencySymbol}{kpis.netSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              Gross: {currencySymbol}{kpis.grossSales.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="border border-border/70 hover:border-primary/50 transition-all shadow-xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Bills</span>
            <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {kpis.completedOrdersCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {kpis.refundedOrdersCount > 0 ? `${kpis.refundedOrdersCount} returns/refunds` : 'Zero returns'}
            </p>
          </CardContent>
        </Card>

        {/* Average Order Value (AOV) */}
        <Card className="border border-border/70 hover:border-primary/50 transition-all shadow-xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Ticket (AOV)</span>
            <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <ArrowUpRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {currencySymbol}{kpis.averageOrderValue.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ~{kpis.averageBasketSize.toFixed(1)} items / basket
            </p>
          </CardContent>
        </Card>

        {/* Estimated Gross Profit */}
        <Card className="border border-border/70 hover:border-primary/50 transition-all shadow-xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Profit (Est.)</span>
            <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Award className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {currencySymbol}{kpis.estimatedGrossProfit.toFixed(2)}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {kpis.grossMarginPercent > 0 ? `${kpis.grossMarginPercent.toFixed(1)}% margin` : 'Enter cost prices'}
            </p>
          </CardContent>
        </Card>

        {/* Tax Collected */}
        <Card className="border border-border/70 hover:border-primary/50 transition-all shadow-xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tax (GST/VAT)</span>
            <div className="w-7 h-7 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Percent className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {currencySymbol}{kpis.totalTax.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              GSTR-1 compliance
            </p>
          </CardContent>
        </Card>

        {/* Total Discounts */}
        <Card className="border border-border/70 hover:border-primary/50 transition-all shadow-xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discounts Given</span>
            <div className="w-7 h-7 rounded-md bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {currencySymbol}{kpis.totalDiscount.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {kpis.grossSales > 0 ? `${((kpis.totalDiscount / kpis.grossSales) * 100).toFixed(1)}% of sales` : '0% discount'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Interactive View Tabs ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex border-b border-border gap-1 overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Sales & Peak Hours', icon: Clock },
            { id: 'products', label: 'Top Products & Velocity', icon: Package },
            { id: 'categories', label: 'Category Mix', icon: Layers },
            { id: 'payments', label: 'Payment Channels', icon: CreditCard },
            { id: 'staff', label: 'Cashier Productivity', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-analytics-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 ${
                  isSelected
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: OVERVIEW & PEAK HOURS ─────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Peak Hour Highlight Banner */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm sm:text-base">
                    Peak Rush Window: {hourlyTraffic.peakHour.label} - {hourlyTraffic.peakHour.hour === 23 ? '12 AM' : hourlyTraffic.peakHour.hour + 1 > 12 ? `${hourlyTraffic.peakHour.hour + 1 - 12} PM` : `${hourlyTraffic.peakHour.hour + 1} AM`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Generated <span className="font-bold text-foreground">{currencySymbol}{hourlyTraffic.peakHour.sales.toFixed(2)}</span> across <span className="font-bold text-foreground">{hourlyTraffic.peakHour.orderCount} bills</span>. Schedule additional checkout staff during this window.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary bg-card shrink-0">
                Peak Velocity
              </Badge>
            </div>

            {/* 24-Hour Hourly Sales Bar Chart */}
            <Card className="border border-border">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold">24-Hour Hourly Sales Velocity</CardTitle>
                    <CardDescription className="text-xs">
                      Retail sales distribution across store opening hours.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {timeRange === 'today' ? 'Today (Live)' : `${timeRange.toUpperCase()} Aggregate`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-4">
                <div className="h-56 sm:h-64 flex items-end gap-1 sm:gap-2 pt-6 pb-2 border-b border-border">
                  {hourlyTraffic.hours.map((h) => {
                    const heightPercent = hourlyTraffic.maxSales > 0 ? (h.sales / hourlyTraffic.maxSales) * 100 : 0;
                    const isPeak = h.sales === hourlyTraffic.maxSales && h.sales > 0;
                    return (
                      <div
                        key={h.hour}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-md border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                          <p className="font-bold">{h.label}</p>
                          <p>{currencySymbol}{h.sales.toFixed(2)} ({h.orderCount} orders)</p>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${Math.max(heightPercent, 2)}%` }}
                          className={`w-full max-w-[28px] rounded-t-sm transition-all duration-300 ${
                            isPeak
                              ? 'bg-primary shadow-xs ring-1 ring-primary/40'
                              : h.sales > 0
                              ? 'bg-primary/70 hover:bg-primary'
                              : 'bg-muted/40 hover:bg-muted/70'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Hour Labels */}
                <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-2 px-1">
                  <span>12 AM</span>
                  <span className="hidden sm:inline">4 AM</span>
                  <span>8 AM</span>
                  <span>12 PM</span>
                  <span>4 PM</span>
                  <span>8 PM</span>
                  <span>11 PM</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Metrics Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" /> Store Operational Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3">
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Order Completion Rate</span>
                    <span className="font-bold text-foreground">
                      {kpis.completedOrdersCount + kpis.refundedOrdersCount > 0
                        ? `${((kpis.completedOrdersCount / (kpis.completedOrdersCount + kpis.refundedOrdersCount)) * 100).toFixed(1)}%`
                        : '100%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Average Units per Bill</span>
                    <span className="font-bold text-foreground">{kpis.averageBasketSize.toFixed(1)} units</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Gross Discount Burden</span>
                    <span className="font-bold text-foreground">
                      {kpis.grossSales > 0 ? `${((kpis.totalDiscount / kpis.grossSales) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1.5">
                    <span className="text-muted-foreground">Tax Collection Rate</span>
                    <span className="font-bold text-foreground">
                      {kpis.netSales > 0 ? `${((kpis.totalTax / kpis.netSales) * 100).toFixed(1)}% effective` : '0%'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" /> Urgent Action Needed
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2.5">
                  {lowStockAlerts.length > 0 ? (
                    lowStockAlerts.slice(0, 3).map((item) => (
                      <div key={item.id} className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-foreground">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">Sold {item.quantitySold} units in period</p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {item.currentStock <= 0 ? 'Out of Stock' : `${item.currentStock} left`}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      All bestselling items maintain healthy inventory levels!
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── TAB 2: TOP PRODUCTS & PROFITABILITY ──────────────────────── */}
        {activeTab === 'products' && (
          <Card className="border border-border">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold">Top 10 Bestselling Products</CardTitle>
                  <CardDescription className="text-xs">
                    Ranked by revenue contribution and gross margin.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {topProducts.length} Items Listed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-5 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Est. Margin</TableHead>
                      <TableHead className="text-center">Stock Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                          No product sales recorded in the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      topProducts.map((p, idx) => {
                        const marginPercent = p.unitPrice > 0 && p.costPrice > 0
                          ? (((p.unitPrice - p.costPrice) / p.unitPrice) * 100)
                          : null;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="text-center font-bold text-xs text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-semibold text-xs text-foreground">
                              {p.name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {p.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-xs text-foreground">
                              {p.quantitySold}
                            </TableCell>
                            <TableCell className="text-right font-black text-xs text-primary">
                              {currencySymbol}{p.revenue.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {currencySymbol}{p.unitPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {p.costPrice > 0 ? `${currencySymbol}${p.costPrice.toFixed(2)}` : '—'}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {marginPercent !== null ? (
                                <span className={marginPercent >= 20 ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                                  {marginPercent.toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {p.currentStock <= 0 ? (
                                <Badge variant="destructive" className="text-[10px]">Out</Badge>
                              ) : p.currentStock <= 5 ? (
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">
                                  {p.currentStock} left
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  {p.currentStock} in stock
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── TAB 3: CATEGORY MIX ──────────────────────────────────────── */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border border-border">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-base sm:text-lg font-bold">Category Revenue Share</CardTitle>
                <CardDescription className="text-xs">
                  Sales distribution across product categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-3 space-y-4">
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No category data available.</p>
                ) : (
                  categoryBreakdown.map((cat) => (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Layers className="size-3.5 text-primary" /> {cat.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{cat.quantity} units</span>
                          <span className="font-black text-foreground">{currencySymbol}{cat.revenue.toFixed(2)}</span>
                          <span className="text-xs font-bold text-primary w-12 text-right">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                          className="h-full bg-primary rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-base font-bold">Category Summary</CardTitle>
                <CardDescription className="text-xs">Key metrics by department</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-1 space-y-3">
                <div className="p-3 bg-muted/40 rounded-lg">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold">Active Categories</p>
                  <p className="text-xl font-black text-foreground mt-0.5">{categoryBreakdown.length}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg">
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold">Top Performing Category</p>
                  <p className="text-base font-bold text-primary mt-0.5">
                    {categoryBreakdown[0]?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {categoryBreakdown[0] ? `${currencySymbol}${categoryBreakdown[0].revenue.toFixed(2)} (${categoryBreakdown[0].percentage.toFixed(1)}% of total)` : 'No sales'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TAB 4: PAYMENT CHANNELS ──────────────────────────────────── */}
        {activeTab === 'payments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-base sm:text-lg font-bold">Payment Methods Breakdown</CardTitle>
                <CardDescription className="text-xs">
                  Collection breakdown across Cash, UPI, Card, and Credit / Khata.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-3 space-y-4">
                {paymentBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No payment transactions recorded.</p>
                ) : (
                  paymentBreakdown.map((p) => (
                    <div key={p.method} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Wallet className="size-3.5 text-primary" /> {p.method}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{p.count} bills</span>
                          <span className="font-black text-foreground">{currencySymbol}{p.amount.toFixed(2)}</span>
                          <span className="text-xs font-bold text-primary w-12 text-right">
                            {p.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(p.percentage, 2)}%` }}
                          className="h-full bg-primary rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-base font-bold">Cash Drawer & Liquidity Insights</CardTitle>
                <CardDescription className="text-xs">Cash In, Cash Out, and Digital vs Paper Money</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-1 space-y-3">
                {(() => {
                  const cashTotal = paymentBreakdown.find((p) => p.method === 'CASH')?.amount || 0;
                  const digitalTotal = paymentBreakdown
                    .filter((p) => ['ONLINE', 'UPI', 'CARD'].includes(p.method))
                    .reduce((sum, p) => sum + p.amount, 0);
                  const creditTotal = paymentBreakdown.find((p) => p.method === 'CREDIT')?.amount || 0;

                  return (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Physical Cash In Register</p>
                        <p className="text-lg font-black text-foreground mt-0.5">{currencySymbol}{cashTotal.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-[11px] text-blue-700 dark:text-blue-400 uppercase font-semibold">Digital (UPI / QR / Bank Card)</p>
                        <p className="text-lg font-black text-foreground mt-0.5">{currencySymbol}{digitalTotal.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <p className="text-[11px] text-purple-700 dark:text-purple-400 uppercase font-semibold">Khata / Customer Credit Receivable</p>
                        <p className="text-lg font-black text-foreground mt-0.5">{currencySymbol}{creditTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TAB 5: CASHIER PRODUCTIVITY ─────────────────────────────── */}
        {activeTab === 'staff' && (
          <Card className="border border-border">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold">Cashier & Staff Productivity</CardTitle>
                  <CardDescription className="text-xs">
                    Order volume and revenue rung up per operator.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {staffBreakdown.length} Operators
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-5 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Orders Processed</TableHead>
                      <TableHead className="text-right">Total Revenue Rung Up</TableHead>
                      <TableHead className="text-right">Average Ticket (AOV)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                          No staff billing records found for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      staffBreakdown.map((s) => (
                        <TableRow key={s.name}>
                          <TableCell className="font-bold text-xs text-foreground flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            {s.name}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px]">
                              {s.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs text-foreground">
                            {s.ordersCount} bills
                          </TableCell>
                          <TableCell className="text-right font-black text-xs text-primary">
                            {currencySymbol}{s.totalRevenue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {currencySymbol}{s.aov.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
