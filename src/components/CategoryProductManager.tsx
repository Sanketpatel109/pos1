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
} from '../icons/faIcons';
import { Category, CatalogItem, StaffRole, StorePermissions } from '../types';
import { canViewCostPrice } from '../utils/permissions';
import { AddProductModal } from './AddProductModal';

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
    <div className="flex-1 flex flex-col min-h-0 bg-[#fcf8fb] overflow-hidden">
      {/* 
        ========================================================================
        TABLET VIEW: 2-Column Split (Left: Categories, Right: Products)
        MOBILE VIEW: Segmented Tab Switcher
        ========================================================================
      */}

      {/* Mobile-only Segmented Tab Header */}
      <div className="md:hidden p-3 bg-[#f6f2f5] border-b border-[#d4d4d8] flex items-center justify-between gap-2 shrink-0">
        <div className="flex bg-white p-1 rounded-xl border border-[#d4d4d8]">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-[#18181b] text-white shadow-2xs'
                : 'text-[#47464b] hover:text-[#1c1b1d]'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#18181b] text-white shadow-2xs'
                : 'text-[#47464b] hover:text-[#1c1b1d]'
            }`}
          >
            Products ({catalog.length})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsXlsModalOpen(true)}
            className="p-2 bg-white hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer shadow-2xs"
            title="Import CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <button
            onClick={
              activeTab === 'categories'
                ? handleOpenAddCategory
                : handleOpenAddProduct
            }
            className="p-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer shadow-2xs"
            title="Add Item"
          >
            <Plus className="w-4 h-4" />
          </button>
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
          } md:flex flex-col md:w-1/3 lg:w-3/10 bg-[#f6f2f5] md:border-r border-[#d4d4d8] min-h-0 flex-1 md:flex-none`}
        >
          {/* Categories Header */}
          <div className="p-3.5 border-b border-[#d4d4d8] flex justify-between items-center bg-[#f6f2f5] shrink-0">
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-[#1c1b1d] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#18181b]" />
                <span>Categories ({categories.length})</span>
              </h2>
            </div>
            <button
              onClick={handleOpenAddCategory}
              className="px-2.5 py-1.5 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Categories List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
            {categories.map((cat) => {
              const count =
                cat.name === 'ALL' || cat.name === 'All Items'
                  ? catalog.length
                  : catalog.filter((i) => i.category.toLowerCase() === cat.name.toLowerCase()).length;

              return (
                <div
                  key={cat.id}
                  className="bg-white border border-[#d4d4d8] rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-[#18181b] transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#f0edf0] text-[#1c1b1d] flex items-center justify-center font-bold text-xs shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs text-[#1c1b1d] truncate">{cat.name}</h3>
                      <p className="text-[10px] text-[#77767b] font-mono">
                        {count} items
                      </p>
                    </div>
                  </div>

                  {cat.name !== 'ALL' && cat.name !== 'All Items' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 rounded-lg bg-[#f6f2f5] hover:bg-[#eae7ea] text-[#1c1b1d] cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg bg-[#f6f2f5] hover:bg-[#ffdad6] text-[#ba1a1a] cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
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
          } md:flex flex-col md:w-2/3 lg:w-7/10 bg-white min-h-0 flex-1`}
        >
          {/* Products Filter & Actions Header */}
          <div className="p-3.5 border-b border-[#d4d4d8] bg-white flex flex-col gap-2.5 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
              <div className="flex-1 bg-[#f6f2f5] border border-[#d4d4d8] rounded-xl px-3 py-2 flex items-center gap-2 focus-within:border-[#18181b] focus-within:bg-white transition-all">
                <Search className="w-4 h-4 text-[#77767b] shrink-0" />
                <input
                  type="text"
                  placeholder="Search catalog items by name, barcode, SKU, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs text-[#1c1b1d] bg-transparent focus:outline-hidden placeholder-[#77767b]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[#77767b] hover:text-[#1c1b1d] p-0.5 rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {onOpenPurchaseInward && (
                  <button
                    type="button"
                    onClick={onOpenPurchaseInward}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                    title="Receive vendor stock & inward purchase"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Inward Stock</span>
                  </button>
                )}

                {/* Tools Dropdown Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                    className="px-3 py-2 bg-[#f6f2f5] hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                    title="Tools Menu"
                  >
                    <span>Tools ▾</span>
                  </button>

                  {isToolsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsToolsOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#d4d4d8] rounded-xl shadow-lg p-1.5 z-30 flex flex-col gap-1">
                        {onOpenBarcodeGenerator && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsToolsOpen(false);
                              onOpenBarcodeGenerator();
                            }}
                            className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Print Labels</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsOpen(false);
                            handleDownloadSampleCsv();
                          }}
                          className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          <span>Download Template</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsOpen(false);
                            setIsXlsModalOpen(true);
                          }}
                          className="w-full px-2.5 py-1.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Import CSV</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddProduct}
                  className="px-3.5 py-2 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Quick Stock Filters */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProductFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  productFilter === 'ALL'
                    ? 'bg-[#18181b] text-white shadow-2xs'
                    : 'bg-[#f6f2f5] text-[#47464b] border border-[#d4d4d8] hover:bg-[#eae7ea]'
                }`}
              >
                All Items ({catalog.length})
              </button>

              <button
                type="button"
                onClick={() => setProductFilter('LOW_STOCK')}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  productFilter === 'LOW_STOCK'
                    ? 'bg-amber-500 text-zinc-950 shadow-2xs'
                    : lowStockCount > 0
                    ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                    : 'bg-[#f6f2f5] text-[#77767b] border border-[#d4d4d8]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock Alerts ({lowStockCount})</span>
              </button>
            </div>
          </div>

          {/* Products Grid / List */}
          <div className="flex-1 overflow-y-auto p-3.5 bg-[#fcf8fb] no-scrollbar">
            {catalog.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-center text-[#77767b]">
                <Package className="w-9 h-9 text-[#c8c5cb] mb-2" />
                <p className="text-xs font-bold text-[#1c1b1d]">Product Catalog is Empty</p>
                <p className="text-[11px] text-[#77767b] mt-0.5">Click "Add Product" or "Import CSV" to populate</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {catalog
                  .filter((item) => {
                    const matchesSearch =
                      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.barcode && item.barcode.includes(searchQuery)) ||
                      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));

                    if (!matchesSearch) return false;

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
                      <div
                        key={item.id}
                        className="bg-white border border-[#d4d4d8] rounded-2xl p-3 flex flex-col justify-between shadow-2xs hover:border-[#18181b] hover:shadow-xs transition-all gap-2"
                      >
                        <div className="w-full h-24 bg-[#f0edf0] rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center">
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
                            <Tag className="w-7 h-7 text-[#77767b]" />
                          )}

                          {/* Live Stock Overlay Pill */}
                          <div className="absolute top-2 right-2">
                            {isOutOfStock ? (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-zinc-950 px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {currentStock} {item.unit || 'pcs'} left
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-white/90 backdrop-blur-xs text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded-md shadow-xs">
                                {currentStock} {item.unit || 'pcs'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-xs sm:text-sm text-[#1c1b1d] truncate">
                            {item.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold text-[#77767b] bg-[#f0edf0] px-2 py-0.5 rounded inline-block uppercase">
                              {item.category}
                            </span>
                            {(item.barcode || item.sku) && (
                              <span className="text-[10px] font-mono text-[#1c1b1d] bg-[#eae7ea] px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Barcode className="w-2.5 h-2.5 text-[#77767b]" />
                                <span>{item.barcode || item.sku}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#f0edf0]">
                          <div>
                            <span className="font-black text-sm font-mono text-[#1c1b1d]">
                              {currencySymbol}
                              {item.price.toFixed(2)}
                            </span>
                            {item.costPrice && canSeeCost && (
                              <span className="text-[10px] text-zinc-400 block font-mono">
                                Cost: {currencySymbol}{item.costPrice.toFixed(0)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {onOpenBarcodeGenerator && (
                              <button
                                type="button"
                                onClick={() => onOpenBarcodeGenerator(item.id)}
                                className="p-1.5 rounded-lg bg-[#f6f2f5] hover:bg-indigo-50 text-indigo-700 cursor-pointer transition-colors"
                                title="Print Barcode Label for this item"
                              >
                                <Barcode className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(item)}
                              className="p-1.5 rounded-lg bg-[#f6f2f5] hover:bg-[#eae7ea] text-[#1c1b1d] cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteProduct(item.id)}
                              className="p-1.5 rounded-lg bg-[#f6f2f5] hover:bg-[#ffdad6] text-[#ba1a1a] cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
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
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3">
            <h3 className="font-bold text-sm text-[#1c1b1d]">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <input
                type="text"
                placeholder="Category Name (e.g. Desserts)"
                value={categoryNameInput}
                onChange={(e) => setCategoryNameInput(e.target.value)}
                className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-2 text-xs text-[#1c1b1d] focus:outline-hidden"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 py-2 bg-[#f6f2f5] text-[#1c1b1d] rounded-xl text-xs font-bold border border-[#d4d4d8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#18181b] text-white rounded-xl text-xs font-bold hover:bg-black"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
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
      />

      {/* CSV Bulk Import Modal */}
      {isXlsModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3 text-[#1c1b1d]">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Bulk Catalog Import</h3>
              <button
                onClick={() => setIsXlsModalOpen(false)}
                className="text-[#77767b] hover:text-[#1c1b1d]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#47464b] space-y-1">
              <span>Upload a .csv file with inventory details. Existing barcodes will update stock and pricing; new items will be added:</span>
              <code className="bg-[#f0edf0] p-1.5 rounded text-[10px] font-mono block leading-relaxed break-all">
                name, barcode, category, selling_price, cost_price, gst_rate, stock_quantity, unit
              </code>
            </p>

            <button
              onClick={handleDownloadSampleCsv}
              className="w-full py-2 bg-[#f6f2f5] hover:bg-[#eae7ea] border border-[#d4d4d8] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV Template</span>
            </button>

            <label className="w-full py-3 bg-[#18181b] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
              <Upload className="w-3.5 h-3.5" />
              <span>Select CSV File</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
