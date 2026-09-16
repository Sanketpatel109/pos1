import React, { useState } from 'react';
import {
  Package,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  X,
  Tag,
  Search,
  Barcode,
  AlertTriangle,
  Truck,
  Printer,
} from 'lucide-react';
import { Category, CatalogItem, StaffRole, StorePermissions, PackagingOption } from '../types';
import { canViewCostPrice } from '../utils/permissions';
import { AddProductModal } from './AddProductModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface CategoryProductManagerProps {
  categories: Category[];
  catalog: CatalogItem[];
  currencySymbol: string;
  staffRole?: StaffRole;
  permissions?: StorePermissions;
  onAddCategory: (name: string) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddProduct: (item: Omit<CatalogItem, 'id'>) => void;
  onUpdateProduct: (item: CatalogItem) => void;
  onDeleteProduct: (id: string) => void;
  onImportCatalogFromXls: (
    categories: string[],
    items: Omit<CatalogItem, 'id'>[]
  ) => void;
  onOpenPurchaseInward?: () => void;
  onOpenBarcodeGenerator?: (productId?: string) => void;
}

export const CategoryProductManager: React.FC<CategoryProductManagerProps> = ({
  categories,
  catalog,
  currencySymbol,
  staffRole = 'CASHIER',
  permissions,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onImportCatalogFromXls,
  onOpenPurchaseInward,
  onOpenBarcodeGenerator,
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>('categories');
  const [productFilter, setProductFilter] = useState<'ALL' | 'LOW_STOCK'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isStaffRole = staffRole?.toUpperCase() === 'STAFF' || staffRole?.toUpperCase() === 'CASHIER';
  const canSeeCost = !isStaffRole && canViewCostPrice(staffRole, permissions);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogItem | null>(null);

  // Low stock count calculation
  const lowStockCount = catalog.filter(
    (item) => (item.stock ?? 0) <= (item.lowStockThreshold ?? 5)
  ).length;

  // XLS Import Modal
  const [isXlsModalOpen, setIsXlsModalOpen] = useState(false);

  // CATEGORY ACTIONS
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryNameInput('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryNameInput(cat.name);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return;

    if (editingCategory) {
      onUpdateCategory(editingCategory.id, categoryNameInput.trim());
    } else {
      onAddCategory(categoryNameInput.trim());
    }
    setIsCategoryModalOpen(false);
    setCategoryNameInput('');
    setEditingCategory(null);
  };

  // PRODUCT ACTIONS
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (item: CatalogItem) => {
    setEditingProduct(item);
    setIsProductModalOpen(true);
  };

  const handleSaveProductModal = (productData: {
    id?: string;
    name: string;
    category: string;
    price: number;
    gstRate: number;
    barcode?: string;
    sku?: string;
    image?: string;
    stock: number;
    lowStockThreshold: number;
    unit: string;
    costPrice?: number;
    packagingOptions?: PackagingOption[];
  }) => {
    if (editingProduct && productData.id) {
      onUpdateProduct({
        ...editingProduct,
        ...productData,
      });
    } else {
      onAddProduct({
        name: productData.name,
        category: productData.category,
        price: productData.price,
        gstRate: productData.gstRate,
        barcode: productData.barcode,
        sku: productData.sku,
        image: productData.image,
        stock: productData.stock,
        lowStockThreshold: productData.lowStockThreshold,
        unit: productData.unit,
        costPrice: productData.costPrice,
        packagingOptions: productData.packagingOptions,
      });
    }
    setIsProductModalOpen(false);
  };

  // CSV Template download with standard Indian retail columns
  const handleDownloadSampleCsv = () => {
    const headers = 'name,barcode,category,selling_price,cost_price,gst_rate,stock_quantity,unit';
    const sampleRows = [
      'Amul Butter 500g,8901262010114,Dairy,275,250,5,30,pcs',
      'Tata Salt 1kg,8901030383123,Grocery,28,24,0,50,pcs',
      'Fortune Sunlite Oil 1L,8906007281017,Oil & Ghee,155,140,5,20,pack',
      'Maggi Noodles 70g,8901058852311,Instant Food,14,12,12,100,pcs',
      'Aashirvaad Atta 5kg,8901725181222,Flour & Grains,265,240,0,15,pack',
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...sampleRows].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', 'MonoPOS_Inventory_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Upload Parser supporting header detection and flexible column mapping
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert('CSV file appears empty or missing rows.');
        return;
      }

      // Helper to parse CSV line respecting quotes
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headerCols = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));

      // Find column indices
      const nameIdx = headerCols.findIndex((h) => h === 'name' || h === 'productname' || h === 'item');
      const barcodeIdx = headerCols.findIndex((h) => h === 'barcode' || h === 'code' || h === 'upc' || h === 'ean');
      const categoryIdx = headerCols.findIndex((h) => h === 'category' || h === 'cat');
      const priceIdx = headerCols.findIndex((h) => h === 'sellingprice' || h === 'price' || h === 'mrp' || h === 'rate');
      const costPriceIdx = headerCols.findIndex((h) => h === 'costprice' || h === 'cost' || h === 'purchaseprice');
      const gstIdx = headerCols.findIndex((h) => h === 'gstrate' || h === 'gst' || h === 'tax' || h === 'taxrate');
      const stockIdx = headerCols.findIndex((h) => h === 'stockquantity' || h === 'stock' || h === 'qty' || h === 'quantity');
      const unitIdx = headerCols.findIndex((h) => h === 'unit' || h === 'uom');

      const newCats: string[] = [];
      const newItems: Omit<CatalogItem, 'id'>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length === 0 || cols.every((c) => !c)) continue;

        let name = '';
        let category = 'General';
        let price = 0;
        let barcode: string | undefined = undefined;
        let costPrice: number | undefined = undefined;
        let gstRate: number | undefined = 5;
        let stock: number | undefined = 20;
        let unit = 'pcs';

        // Check if header-based or legacy fallback (Category, Product Name, Price)
        if (nameIdx !== -1) {
          name = cols[nameIdx] || '';
          if (categoryIdx !== -1 && cols[categoryIdx]) category = cols[categoryIdx];
          if (priceIdx !== -1 && cols[priceIdx]) price = parseFloat(cols[priceIdx]) || 0;
          if (barcodeIdx !== -1 && cols[barcodeIdx]) barcode = cols[barcodeIdx];
          if (costPriceIdx !== -1 && cols[costPriceIdx]) costPrice = parseFloat(cols[costPriceIdx]) || undefined;
          if (gstIdx !== -1 && cols[gstIdx]) gstRate = parseFloat(cols[gstIdx]) || 0;
          if (stockIdx !== -1 && cols[stockIdx]) stock = parseFloat(cols[stockIdx]) || 0;
          if (unitIdx !== -1 && cols[unitIdx]) unit = cols[unitIdx];
        } else {
          // Legacy 3-column fallback: Category, Product Name, Price
          category = cols[0] || 'General';
          name = cols[1] || '';
          price = parseFloat(cols[2]) || 0;
        }

        if (name.trim()) {
          if (!newCats.includes(category.trim())) newCats.push(category.trim());
          newItems.push({
            name: name.trim(),
            category: category.trim(),
            price: price >= 0 ? price : 0,
            barcode: barcode?.trim() || undefined,
            costPrice: costPrice,
            gstRate: gstRate,
            stock: stock,
            lowStockThreshold: 5,
            unit: unit.trim() || 'pcs',
          });
        }
      }

      if (newItems.length > 0) {
        onImportCatalogFromXls(newCats, newItems);
        alert(`Successfully imported/updated ${newItems.length} items from CSV!`);
        setIsXlsModalOpen(false);
      } else {
        alert('No valid products found in the uploaded file. Please check column format.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground overflow-hidden">
      {/* 
        ========================================================================
        TABLET VIEW: 2-Column Split (Left: Categories, Right: Products)
        MOBILE VIEW: Segmented Tab Switcher
        ========================================================================
      */}

      {/* Mobile-only Segmented Tab Header */}
      <div className="md:hidden p-3 bg-card border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex bg-muted/40 p-1 rounded-lg border border-border">
          <Button
            size="xs"
            variant={activeTab === 'categories' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('categories')}
            className="h-7 text-xs font-medium cursor-pointer"
          >
            Categories ({categories.length})
          </Button>
          <Button
            size="xs"
            variant={activeTab === 'products' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('products')}
            className="h-7 text-xs font-medium cursor-pointer"
          >
            Products ({catalog.length})
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setIsXlsModalOpen(true)}
            className="cursor-pointer"
            title="Import CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="default"
            onClick={
              activeTab === 'categories'
                ? handleOpenAddCategory
                : handleOpenAddProduct
            }
            className="cursor-pointer"
            title="Add Item"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* 
          LEFT COLUMN: Categories Management
          Visible on tablet always, or on phone when activeTab === 'categories'
        */}
        <div
          className={`${
            activeTab === 'categories' ? 'flex' : 'hidden'
          } md:flex flex-col md:w-1/3 lg:w-3/10 bg-muted/20 md:border-r border-border min-h-0 flex-1 md:flex-none`}
        >
          {/* Categories Header */}
          <div className="p-3.5 border-b border-border flex justify-between items-center bg-card shrink-0">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" />
                <span>Categories ({categories.length})</span>
              </h2>
            </div>
            <Button
              size="xs"
              variant="default"
              onClick={handleOpenAddCategory}
              className="h-7 px-2.5 gap-1 text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </Button>
          </div>

          {/* Categories List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {categories.map((cat) => {
              const catName = (cat.name || '').trim();
              const isAllCat = catName.toUpperCase() === 'ALL' || catName.toLowerCase() === 'all items';
              const count = isAllCat
                ? catalog.length
                : catalog.filter((i) => (i.category || '').trim().toLowerCase() === catName.toLowerCase()).length;
              const isSelected = selectedCategory
                ? selectedCategory.toLowerCase() === catName.toLowerCase()
                : isAllCat;

              return (
                <Card
                  key={cat.id}
                  onClick={() => {
                    if (isAllCat) {
                      setSelectedCategory(null);
                    } else {
                      setSelectedCategory((prev) => (prev?.toLowerCase() === catName.toLowerCase() ? null : catName));
                    }
                    setActiveTab('products');
                  }}
                  className={`p-3 flex items-center justify-between shadow-xs border transition-all bg-card cursor-pointer ${
                    isSelected
                      ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}>
                      <Layers className={`w-4 h-4 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`font-semibold text-xs truncate ${isSelected ? 'text-primary font-bold' : 'text-foreground'}`}>
                        {cat.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {count} items
                      </p>
                    </div>
                  </div>

                  {!isAllCat && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleOpenEditCategory(cat)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => onDeleteCategory(cat.id)}
                        className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* 
          RIGHT COLUMN: Product Catalog
          Visible on tablet always, or on phone when activeTab === 'products'
        */}
        <div
          className={`${
            activeTab === 'products' ? 'flex' : 'hidden'
          } md:flex flex-col md:w-2/3 lg:w-7/10 bg-background min-h-0 flex-1`}
        >
          {/* Products Filter & Actions Header */}
          <div className="p-3.5 border-b border-border bg-card flex flex-col gap-2.5 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search catalog items by name, barcode, SKU, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 h-8 text-xs bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {onOpenPurchaseInward && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onOpenPurchaseInward}
                    className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer text-primary border-primary/30 hover:bg-primary/5 dark:text-primary"
                    title="Receive vendor stock & inward purchase"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Inward Stock</span>
                  </Button>
                )}

                {/* Tools Dropdown Menu */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                    className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer"
                    title="Tools Menu"
                  >
                    <span>Tools ▾</span>
                  </Button>

                  {isToolsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsToolsOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-popover border border-border rounded-lg shadow-lg p-1.5 z-30 flex flex-col gap-1 text-popover-foreground">
                        {onOpenBarcodeGenerator && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsToolsOpen(false);
                              onOpenBarcodeGenerator();
                            }}
                            className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-muted rounded-md flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Barcode className="w-3.5 h-3.5 text-primary" />
                            <span>Print Labels</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsOpen(false);
                            handleDownloadSampleCsv();
                          }}
                          className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-muted rounded-md flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Download Template</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsOpen(false);
                            setIsXlsModalOpen(true);
                          }}
                          className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-foreground hover:bg-muted rounded-md flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                          <span>Import CSV</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  type="button"
                  variant="default"
                  onClick={handleOpenAddProduct}
                  className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </Button>
              </div>
            </div>

            {/* Quick Stock Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="xs"
                variant={productFilter === 'ALL' && !selectedCategory ? 'default' : 'outline'}
                onClick={() => {
                  setProductFilter('ALL');
                  setSelectedCategory(null);
                }}
                className="h-7 px-3 text-xs font-medium cursor-pointer"
              >
                All Items ({catalog.length})
              </Button>

              <Button
                size="xs"
                variant={productFilter === 'LOW_STOCK' ? 'default' : 'outline'}
                onClick={() => setProductFilter('LOW_STOCK')}
                className={`h-7 px-3 text-xs font-medium cursor-pointer gap-1.5 ${
                  productFilter !== 'LOW_STOCK' && lowStockCount > 0 ? 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400' : ''
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock Alerts ({lowStockCount})</span>
              </Button>

              {selectedCategory && (
                <Badge
                  variant="secondary"
                  className="h-7 px-2.5 text-xs font-medium gap-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 cursor-pointer transition-colors"
                  onClick={() => setSelectedCategory(null)}
                  title="Click to clear category filter"
                >
                  <span>Category: {selectedCategory}</span>
                  <X className="w-3.5 h-3.5" />
                </Badge>
              )}
            </div>
          </div>

          {/* Products Grid / List */}
          <div className="flex-1 overflow-y-auto p-3.5 bg-background no-scrollbar">
            {catalog.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Package className="w-9 h-9 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-bold text-foreground">Product Catalog is Empty</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Click "Add Product" or "Import CSV" to populate</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {catalog
                  .filter((item) => {
                    const q = (searchQuery || '').trim().toLowerCase();
                    const itemName = (item.name || '').toLowerCase();
                    const itemCat = (item.category || '').toLowerCase();
                    const itemBarcode = item.barcode || '';
                    const itemSku = (item.sku || '').toLowerCase();

                    const matchesSearch =
                      !q ||
                      itemName.includes(q) ||
                      itemCat.includes(q) ||
                      itemBarcode.includes(searchQuery.trim()) ||
                      itemSku.includes(q);

                    if (!matchesSearch) return false;

                    if (selectedCategory) {
                      const isAll = selectedCategory.toUpperCase() === 'ALL' || selectedCategory.toLowerCase() === 'all items';
                      if (!isAll && (item.category || '').trim().toLowerCase() !== selectedCategory.trim().toLowerCase()) {
                        return false;
                      }
                    }

                    if (productFilter === 'LOW_STOCK') {
                      return (item.stock ?? 0) <= (item.lowStockThreshold ?? 5);
                    }
                    return true;
                  })
                  .map((item) => {
                    const currentStock = item.stock ?? 0;
                    const threshold = item.lowStockThreshold ?? 5;
                    const isOutOfStock = currentStock <= 0;
                    const isLowStock = !isOutOfStock && currentStock <= threshold;

                    return (
                      <Card
                        key={item.id}
                        className="p-3 flex flex-col justify-between shadow-xs hover:border-primary/50 transition-all gap-2 border-border bg-card"
                      >
                        <div className="w-full h-24 bg-muted rounded-md overflow-hidden shrink-0 relative flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Tag className="w-7 h-7 text-muted-foreground/50" />
                          )}

                          {/* Live Stock Overlay Pill */}
                          <div className="absolute top-2 right-2">
                            {isOutOfStock ? (
                              <Badge variant="destructive" className="text-[10px] font-semibold py-0 shadow-xs uppercase">
                                Out of Stock
                              </Badge>
                            ) : isLowStock ? (
                              <Badge variant="outline" className="text-[10px] font-semibold py-0 shadow-xs bg-amber-500 text-zinc-950 border-amber-600 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {currentStock} {item.unit || 'pcs'} left
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] font-medium py-0 shadow-xs">
                                {currentStock} {item.unit || 'pcs'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                            {item.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[10px] py-0 uppercase font-medium">
                              {item.category}
                            </Badge>
                            {(item.barcode || item.sku) && (
                              <Badge variant="secondary" className="text-[10px] py-0 flex items-center gap-1">
                                <Barcode className="w-2.5 h-2.5 text-muted-foreground" />
                                <span>{item.barcode || item.sku}</span>
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div>
                            <span className="font-bold text-sm text-foreground tabular-nums tracking-tight font-medium">
                              {currencySymbol}
                              {(Number(item.price) || 0).toFixed(2)}
                            </span>
                            {item.costPrice !== undefined && canSeeCost && (
                              <span className="text-[10px] text-muted-foreground block tabular-nums">
                                Cost: {currencySymbol}{(Number(item.costPrice) || 0).toFixed(0)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {onOpenBarcodeGenerator && (
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                type="button"
                                onClick={() => onOpenBarcodeGenerator(item.id)}
                                className="cursor-pointer text-primary hover:bg-primary/10"
                                title="Print Barcode Label for this item"
                              >
                                <Barcode className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              type="button"
                              onClick={() => handleOpenEditProduct(item)}
                              className="cursor-pointer text-muted-foreground hover:text-foreground"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              type="button"
                              onClick={() => onDeleteProduct(item.id)}
                              className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <Card className="w-full max-w-sm border-border shadow-2xl p-4 space-y-3 bg-card text-foreground">
            <h3 className="font-bold text-sm text-foreground">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <Input
                type="text"
                placeholder="Category Name (e.g. Desserts)"
                value={categoryNameInput}
                onChange={(e) => setCategoryNameInput(e.target.value)}
                className="w-full h-9 text-xs bg-background"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 h-9 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1 h-9 text-xs font-medium cursor-pointer"
                >
                  Save
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Product Add/Edit Modal with modern Photo Upload / Camera dropzone */}
      <AddProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        editingProduct={editingProduct}
        categories={categories}
        currencySymbol={currencySymbol}
        canSeeCost={canSeeCost}
        onSaveProduct={handleSaveProductModal}
        initialCategory={selectedCategory || undefined}
      />

      {/* CSV Bulk Import Modal */}
      {isXlsModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <Card className="w-full max-w-sm border-border shadow-2xl p-4 space-y-3 bg-card text-foreground">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Bulk Catalog Import</h3>
              <button
                onClick={() => setIsXlsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground space-y-1">
              <span>Upload a .csv file with inventory details. Existing barcodes will update stock and pricing; new items will be added:</span>
              <code className="bg-muted p-1.5 rounded text-[10px] block leading-relaxed break-all mt-1">
                name, barcode, category, selling_price, cost_price, gst_rate, stock_quantity, unit
              </code>
            </p>

            <Button
              variant="outline"
              onClick={handleDownloadSampleCsv}
              className="w-full h-9 text-xs font-medium gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV Template</span>
            </Button>

            <label className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Select CSV File</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </Card>
        </div>
      )}
    </div>
  );
};

