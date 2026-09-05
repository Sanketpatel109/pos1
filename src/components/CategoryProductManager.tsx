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
import { Category, CatalogItem } from '../types';

interface CategoryProductManagerProps {
  categories: Category[];
  catalog: CatalogItem[];
  currencySymbol: string;
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
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogItem | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodStock, setProdStock] = useState('20');
  const [prodThreshold, setProdThreshold] = useState('5');
  const [prodUnit, setProdUnit] = useState('pcs');
  const [prodCostPrice, setProdCostPrice] = useState('');

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
    setProdName('');
    setProdCategory(categories.find((c) => c.name !== 'ALL' && c.name !== 'All Items')?.name || 'Fast Food');
    setProdPrice('');
    setProdBarcode('');
    setProdSku('');
    setProdImageUrl('');
    setProdStock('25');
    setProdThreshold('5');
    setProdUnit('pcs');
    setProdCostPrice('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (item: CatalogItem) => {
    setEditingProduct(item);
    setProdName(item.name);
    setProdCategory(item.category);
    setProdPrice(String(item.price));
    setProdBarcode(item.barcode || '');
    setProdSku(item.sku || '');
    setProdImageUrl(item.image || '');
    setProdStock(String(item.stock ?? 20));
    setProdThreshold(String(item.lowStockThreshold ?? 5));
    setProdUnit(item.unit || 'pcs');
    setProdCostPrice(item.costPrice ? String(item.costPrice) : '');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(prodPrice);
    if (!prodName.trim() || isNaN(priceNum)) return;

    const stockNum = parseInt(prodStock) || 0;
    const threshNum = parseInt(prodThreshold) || 5;
    const costNum = parseFloat(prodCostPrice) || undefined;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: prodName.trim(),
        category: prodCategory,
        price: priceNum,
        barcode: prodBarcode.trim() || undefined,
        sku: prodSku.trim() || undefined,
        image: prodImageUrl.trim() || undefined,
        stock: stockNum,
        lowStockThreshold: threshNum,
        unit: prodUnit.trim() || 'pcs',
        costPrice: costNum,
      });
    } else {
      onAddProduct({
        name: prodName.trim(),
        category: prodCategory,
        price: priceNum,
        barcode: prodBarcode.trim() || undefined,
        sku: prodSku.trim() || undefined,
        image: prodImageUrl.trim() || undefined,
        stock: stockNum,
        lowStockThreshold: threshNum,
        unit: prodUnit.trim() || 'pcs',
        costPrice: costNum,
      });
    }
    setIsProductModalOpen(false);
  };

  // CSV Template download
  const handleDownloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Category,Product Name,Price', 'Pizza,Cheesy 7 Pizza,220', 'Fast Food,Veg Burger,60', 'Drinks,Cold Coffee,45'].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', 'MonoPOS_Catalog_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Upload Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const newCats: string[] = [];
      const newItems: Omit<CatalogItem, 'id'>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [cat, name, price] = line.split(',');
        if (cat && name && price) {
          if (!newCats.includes(cat.trim())) newCats.push(cat.trim());
          newItems.push({
            name: name.trim(),
            category: cat.trim(),
            price: parseFloat(price.trim()) || 0,
          });
        }
      }

      if (newItems.length > 0) {
        onImportCatalogFromXls(newCats, newItems);
        alert(`Successfully imported ${newItems.length} products from CSV!`);
        setIsXlsModalOpen(false);
      }
    };
    reader.readAsText(file);
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

                {onOpenBarcodeGenerator && (
                  <button
                    type="button"
                    onClick={() => onOpenBarcodeGenerator()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                    title="Print barcode stickers sheet"
                  >
                    <Barcode className="w-3.5 h-3.5" />
                    <span>Print Labels</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsXlsModalOpen(true)}
                  className="px-3 py-2 bg-[#f6f2f5] hover:bg-[#eae7ea] text-[#1c1b1d] border border-[#d4d4d8] rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Import CSV</span>
                </button>

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
                            {item.costPrice && (
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

      {/* Product Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-[#d4d4d8] shadow-2xl p-4 space-y-3">
            <h3 className="font-bold text-sm text-[#1c1b1d]">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paneer Tikka Burger"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Category
                </label>
                <select
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                >
                  {categories
                    .filter((c) => c.name !== 'ALL' && c.name !== 'All Items')
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Unit Price ({currencySymbol})
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                    Barcode / EAN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 890103001"
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PIZZA-CH7"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f6f2f5] p-2.5 rounded-xl border border-[#d4d4d8]">
                <div>
                  <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                    Stock on Hand
                  </label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full bg-white border border-[#d4d4d8] rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-[#1c1b1d] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                    Reorder Alert (&lt;)
                  </label>
                  <input
                    type="number"
                    value={prodThreshold}
                    onChange={(e) => setProdThreshold(e.target.value)}
                    className="w-full bg-white border border-[#d4d4d8] rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-[#1c1b1d] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                    Inventory Unit
                  </label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full bg-white border border-[#d4d4d8] rounded-lg px-2 py-1 text-xs font-bold text-[#1c1b1d] focus:outline-hidden"
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="ltr">ltr</option>
                    <option value="ml">ml</option>
                    <option value="box">box</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                    Cost Price ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    placeholder="Optional"
                    value={prodCostPrice}
                    onChange={(e) => setProdCostPrice(e.target.value)}
                    className="w-full bg-white border border-[#d4d4d8] rounded-lg px-2 py-1 text-xs font-mono text-[#1c1b1d] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#77767b] block mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  className="w-full bg-[#fcf8fb] border border-[#d4d4d8] rounded-xl px-3 py-1.5 text-xs text-[#1c1b1d] focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2 bg-[#f6f2f5] text-[#1c1b1d] rounded-xl text-xs font-bold border border-[#d4d4d8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#18181b] text-white rounded-xl text-xs font-bold hover:bg-black"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

            <p className="text-xs text-[#47464b]">
              Upload a .csv file formatted with 3 columns:
              <br />
              <code className="bg-[#f0edf0] px-1.5 py-0.5 rounded text-[11px] font-mono mt-1 block">
                Category, Product Name, Price
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
