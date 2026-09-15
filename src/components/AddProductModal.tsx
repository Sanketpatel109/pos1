import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Trash2, RefreshCw, X, Loader2, Check, Layers, Plus, Sparkles, Scale, CheckCircle2, Package } from 'lucide-react';
import { CatalogItem, Category, PackagingOption } from '../types';
import { GST_SLABS } from '../constants/taxRates';
import { FieldBarcodeScannerModal } from './FieldBarcodeScannerModal';
import { lookupBarcodeDetails } from '../services/barcodeLookup';

export interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: CatalogItem | null;
  categories: Category[];
  currencySymbol: string;
  canSeeCost: boolean;
  onSaveProduct: (productData: {
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
  }) => void;
}

/**
 * Compresses an image file client-side to max 400x400px and JPEG 0.7 quality.
 * Prevents saving raw multi-megabyte photos to local storage / database.
 */
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw white background for transparent formats
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG at 0.7 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);

      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      } else {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  categories,
  currencySymbol,
  canSeeCost,
  onSaveProduct,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productType, setProductType] = useState<'packaged' | 'loose'>('packaged');
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Fast Food');
  const [prodPrice, setProdPrice] = useState('');
  const [prodGstRate, setProdGstRate] = useState<string>('0');
  const [customGstRate, setCustomGstRate] = useState<string>('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodThreshold, setProdThreshold] = useState('5');
  const [prodUnit, setProdUnit] = useState('pcs');
  const [prodCostPrice, setProdCostPrice] = useState('');
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);

  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fieldScannerTarget, setFieldScannerTarget] = useState<{
    type: 'primary' | 'pack';
    packId?: string;
    label?: string;
  } | null>(null);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<{
    message: string;
    isMultiPack?: boolean;
    packName?: string;
  } | null>(null);

  // Auto-lookup barcode details from registry
  const handleProcessBarcodeLookup = async (barcodeToLookup: string) => {
    const code = barcodeToLookup.trim();
    if (!code || code.length < 4) return;
    setLookupFeedback(null);
    setIsLookingUpBarcode(true);

    try {
      const result = await lookupBarcodeDetails(code, categories);
      if (result) {
        const displayName = result.brand && !result.name.toLowerCase().includes(result.brand.toLowerCase())
          ? `${result.brand} - ${result.name}`
          : result.name;

        if (!prodName || !editingProduct) {
          setProdName(displayName);
        }
        if (result.category) {
          setProdCategory(result.category);
        }
        if (result.imageUrl && (!prodImageUrl || !editingProduct)) {
          setProdImageUrl(result.imageUrl);
        }
        if (result.unit) {
          setProdUnit(result.unit);
        }

        // Multi-pack packaging detection
        if (result.packaging?.isMultiPack && result.packaging.multiplier > 1) {
          const exists = packagingOptions.some((p) => p.multiplier === result.packaging!.multiplier);
          if (!exists) {
            const newPack: PackagingOption = {
              id: `pack_${Date.now()}`,
              packName: result.packaging.packName,
              barcode: code,
              multiplier: result.packaging.multiplier,
              sellingPrice: 0,
            };
            setPackagingOptions((prev) => [...prev, newPack]);
          }

          setLookupFeedback({
            message: `Found "${result.name}" • Auto-created ${result.packaging.packName}!`,
            isMultiPack: true,
            packName: result.packaging.packName,
          });
        } else {
          setLookupFeedback({
            message: `Found "${result.name}" • Product details auto-filled!`,
            isMultiPack: false,
          });
        }
      } else {
        setLookupFeedback({
          message: `Barcode ${code} recorded. Enter product details below.`,
          isMultiPack: false,
        });
      }
    } catch (err) {
      console.warn('Barcode lookup failed:', err);
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  // Clean Mode Switcher: Packaged vs Loose / By Weight
  const handleSwitchProductType = (type: 'packaged' | 'loose') => {
    setProductType(type);
    setLookupFeedback(null);
    if (type === 'loose') {
      if (prodUnit === 'pcs' || prodUnit === 'box' || prodUnit === 'pack') {
        setProdUnit('kg');
      }
      setProdBarcode('');
      setPackagingOptions([]);
      if (!prodSku || prodSku.startsWith('EAN-') || !prodSku.startsWith('PLU-')) {
        setProdSku(`PLU-${Math.floor(1000 + Math.random() * 9000)}`);
      }
      const produceCategory = categories.find((c) => /produce|veg|fruit|grocer/i.test(c.name));
      if (produceCategory && (!editingProduct || prodCategory === 'Fast Food')) {
        setProdCategory(produceCategory.name);
      }
    } else {
      if (prodUnit === 'kg' || prodUnit === 'gm') {
        setProdUnit('pcs');
      }
      if (prodSku.startsWith('PLU-') || prodSku.startsWith('LOOSE-')) {
        setProdSku('');
      }
    }
  };

  const generateNewPlu = () => {
    setProdSku(`PLU-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const isCustom = prodGstRate === 'custom';

  // Sync state when modal opens or editingProduct changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingProduct) {
      const isLoose =
        editingProduct.unit === 'kg' ||
        editingProduct.unit === 'gm' ||
        editingProduct.unit === 'ltr' ||
        Boolean(editingProduct.sku && (editingProduct.sku.startsWith('PLU-') || editingProduct.sku.startsWith('LOOSE-')));
      setProductType(isLoose ? 'loose' : 'packaged');

      setProdName(editingProduct.name);
      setProdCategory(editingProduct.category);
      setProdPrice(String(editingProduct.price));
      
      const currentRate = editingProduct.gstRate !== undefined ? Number(editingProduct.gstRate) : 0;
      const matchedSlab = GST_SLABS.find((s) => !s.isCustom && s.rate === currentRate);
      if (matchedSlab) {
        setProdGstRate(String(matchedSlab.rate));
        setCustomGstRate('');
      } else {
        setProdGstRate('custom');
        setCustomGstRate(String(currentRate));
      }

      setProdBarcode(editingProduct.barcode || '');
      setProdSku(editingProduct.sku || '');
      setProdImageUrl(editingProduct.image || '');
      setProdStock(String(editingProduct.stock ?? 10));
      setProdThreshold(String(editingProduct.lowStockThreshold ?? 5));
      setProdUnit(editingProduct.unit || (isLoose ? 'kg' : 'pcs'));
      setProdCostPrice(editingProduct.costPrice ? String(editingProduct.costPrice) : '');
      setPackagingOptions(
        editingProduct.packagingOptions
          ? JSON.parse(JSON.stringify(editingProduct.packagingOptions))
          : []
      );
    } else {
      setProductType('packaged');
      setProdName('');
      const defaultCategory =
        categories.find((c) => c.name !== 'ALL' && c.name !== 'All Items')?.name || 'Fast Food';
      setProdCategory(defaultCategory);
      setProdPrice('');
      setProdGstRate('0');
      setCustomGstRate('');
      setProdBarcode('');
      setProdSku('');
      setProdImageUrl('');
      setProdStock('10');
      setProdThreshold('5');
      setProdUnit('pcs');
      setProdCostPrice('');
      setPackagingOptions([]);
    }
    setIsCompressing(false);
    setIsDragOver(false);
  }, [isOpen, editingProduct, categories]);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      setIsCompressing(true);
      const compressedData = await compressImage(file);
      setProdImageUrl(compressedData);
    } catch (err) {
      console.error('Error processing image:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleAddPackagingRow = () => {
    setPackagingOptions((prev) => [
      ...prev,
      {
        id: `pack_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        packName: '',
        multiplier: 6,
        barcode: '',
        sellingPrice: 0,
      },
    ]);
  };

  const handleUpdatePackagingRow = (id: string, field: keyof PackagingOption, val: any) => {
    setPackagingOptions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const handleRemovePackagingRow = (id: string) => {
    setPackagingOptions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    const priceNum = parseFloat(prodPrice) || 0;
    const stockNum = parseInt(prodStock, 10) || 0;
    const threshNum = parseInt(prodThreshold, 10) || 5;
    const costNum = parseFloat(prodCostPrice) || undefined;
    const gstRateNum = isCustom
      ? parseFloat(customGstRate) || 0
      : parseFloat(prodGstRate) || 0;

    const validPackOptions = productType === 'packaged'
      ? packagingOptions
          .filter((p) => p.packName.trim() && p.multiplier > 0 && p.sellingPrice > 0)
          .map((p) => ({
            ...p,
            packName: p.packName.trim(),
            barcode: p.barcode ? p.barcode.trim() : '',
          }))
      : [];

    onSaveProduct({
      id: editingProduct ? editingProduct.id : undefined,
      name: prodName.trim(),
      category: prodCategory,
      price: priceNum,
      gstRate: gstRateNum,
      barcode: productType === 'packaged' ? (prodBarcode.trim() || undefined) : undefined,
      sku: prodSku.trim() || (productType === 'loose' ? `PLU-${Math.floor(1000 + Math.random() * 9000)}` : undefined),
      image: prodImageUrl.trim() || undefined,
      stock: stockNum,
      lowStockThreshold: threshNum,
      unit: prodUnit,
      costPrice: costNum,
      packagingOptions: validPackOptions.length > 0 ? validPackOptions : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-card text-card-foreground rounded-xl w-full max-w-sm sm:max-w-lg border border-border shadow-xl p-5 space-y-3.5 my-auto overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="font-bold text-sm text-foreground">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1 flex-1">
          {/* Segmented Mode Selector: Packaged Goods vs Loose / By Weight */}
          <div className="p-1 bg-zinc-100 rounded-2xl border border-zinc-200/90 grid grid-cols-2 gap-1 text-xs">
            <button
              type="button"
              id="tab-type-packaged"
              onClick={() => handleSwitchProductType('packaged')}
              className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                productType === 'packaged'
                  ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Package className={`w-4 h-4 ${productType === 'packaged' ? 'text-blue-600' : 'text-zinc-400'}`} />
              <span>Packaged Item</span>
            </button>

            <button
              type="button"
              id="tab-type-loose"
              onClick={() => handleSwitchProductType('loose')}
              className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                productType === 'loose'
                  ? 'bg-white text-emerald-950 shadow-xs border border-emerald-200'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Scale className={`w-4 h-4 ${productType === 'loose' ? 'text-emerald-600' : 'text-zinc-400'}`} />
              <span>Loose / By Weight</span>
            </button>
          </div>

          {/* Quick Scan Action (Only for Packaged Items) */}
          {productType === 'packaged' && !editingProduct && (
            <button
              type="button"
              id="btn-quick-scan-product"
              onClick={() => setFieldScannerTarget({ type: 'primary', label: 'New Product' })}
              className="w-full py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs text-xs active:scale-[0.99]"
            >
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Scan Barcode to Auto-Fill Name & Details</span>
            </button>
          )}

          {/* Loose Produce Unit Selector Bar (Only for Loose Items) */}
          {productType === 'loose' && (
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-2 text-xs">
              <span className="text-[11px] font-medium text-emerald-900 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Sold by weight/volume:</span>
              </span>
              <div className="flex gap-1.5">
                {(['kg', 'gm', 'ltr', 'pcs'] as const).map((unitOpt) => (
                  <button
                    key={unitOpt}
                    type="button"
                    onClick={() => setProdUnit(unitOpt)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      prodUnit === unitOpt
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {unitOpt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
              {productType === 'loose' ? 'Item Name *' : 'Product Name *'}
            </label>
            <input
              type="text"
              placeholder={productType === 'loose' ? 'e.g. Fresh Red Onions, Organic Apples' : 'e.g. Coca-Cola 330ml Can, Paneer Tikka Burger'}
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
              Category
            </label>
            <select
              value={prodCategory}
              onChange={(e) => setProdCategory(e.target.value)}
              className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 text-xs font-medium text-zinc-900 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all cursor-pointer"
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
            <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
              {productType === 'loose' ? `Price per ${prodUnit} (${currencySymbol}) *` : `Unit Price (${currencySymbol}) *`}
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={prodPrice}
              onChange={(e) => setProdPrice(e.target.value)}
              required
              min="0"
              step="any"
              className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all tabular-nums tracking-tight"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
              GST Slab (%) *
            </label>
            <select
              value={prodGstRate}
              onChange={(e) => setProdGstRate(e.target.value)}
              required
              className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 text-xs font-medium text-zinc-900 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all cursor-pointer"
            >
              {GST_SLABS.map((slab) => (
                <option key={slab.label} value={slab.isCustom ? 'custom' : String(slab.rate)}>
                  {slab.label}
                </option>
              ))}
            </select>
            {isCustom && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Enter custom GST % (e.g. 7.5)"
                  value={customGstRate}
                  onChange={(e) => setCustomGstRate(e.target.value)}
                  required
                  autoFocus
                  className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 text-xs font-medium text-zinc-900 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all tabular-nums tracking-tight"
                />
                <span className="text-xs font-bold text-zinc-500 shrink-0">%</span>
              </div>
            )}
          </div>

          {/* Barcode & SKU - Differentiated by Product Type */}
          {productType === 'packaged' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-zinc-700">
                    Barcode / EAN (Optional)
                  </label>
                  {prodBarcode.trim().length >= 6 && !isLookingUpBarcode && (
                    <button
                      type="button"
                      onClick={() => handleProcessBarcodeLookup(prodBarcode)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Auto-Fill</span>
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    id="input-prod-barcode"
                    placeholder="e.g. 5449000000996"
                    value={prodBarcode}
                    onChange={(e) => {
                      setProdBarcode(e.target.value);
                      if (lookupFeedback) setLookupFeedback(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleProcessBarcodeLookup(prodBarcode);
                      }
                    }}
                    className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl pl-3.5 pr-10 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all tabular-nums tracking-tight font-mono"
                  />
                  <button
                    type="button"
                    id="btn-scan-prod-barcode"
                    onClick={() => setFieldScannerTarget({
                      type: 'primary',
                      label: prodName || 'Product',
                    })}
                    title="Scan barcode with phone camera"
                    aria-label="Scan barcode with phone camera"
                    className="absolute right-1.5 w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Feedback */}
                {isLookingUpBarcode && (
                  <div className="mt-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200/80 flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
                    <span>Looking up product in registry...</span>
                  </div>
                )}
                {lookupFeedback && !isLookingUpBarcode && (
                  <div className={`mt-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1.5 ${
                    lookupFeedback.isMultiPack
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{lookupFeedback.message}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                  SKU Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. COCA-CAN-330"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all tabular-nums tracking-tight"
                />
              </div>
            </div>
          ) : (
            /* Loose produce: Display Store PLU lookup code and auto-generate */
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-zinc-700">
                  Item PLU / Quick Lookup Code *
                </label>
                <button
                  type="button"
                  onClick={generateNewPlu}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Generate New PLU</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. PLU-4011"
                value={prodSku}
                onChange={(e) => setProdSku(e.target.value)}
                required
                className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 text-xs font-semibold text-zinc-900 font-mono focus:bg-white focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:outline-hidden transition-all"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                Loose items use store PLU codes on the register instead of factory barcodes.
              </p>
            </div>
          )}

          {/* Packaging Tiers & Multi-Barcodes (Only for Packaged Items) */}
          {productType === 'packaged' && (
            <div className="bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-zinc-900">Packaging Tiers & Multi-Barcodes</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddPackagingRow}
                  className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tier</span>
                </button>
              </div>
              <p className="text-[10px] text-zinc-500">
                Link case/box barcodes and custom pack prices while tracking total inventory in base {prodUnit || 'units'}.
              </p>

              {packagingOptions.length === 0 ? (
                <div className="text-center py-2.5 px-2 bg-white rounded-xl border border-dashed border-zinc-200 text-zinc-400 text-xs">
                  No packaging tiers configured. Standard single {prodUnit || 'unit'} pricing applies.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                  {packagingOptions.map((pack, idx) => {
                    const basePrice = parseFloat(prodPrice) || 0;
                    const packPrice = pack.sellingPrice || 0;
                    const mult = pack.multiplier || 1;
                    const perUnitPrice = packPrice / mult;
                    const savings =
                      basePrice > 0 && packPrice > 0
                        ? Math.round(((basePrice * mult - packPrice) / (basePrice * mult)) * 100)
                        : 0;

                    return (
                      <div
                        key={pack.id || idx}
                        className="p-2.5 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-2"
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Pack Name */}
                          <div className="col-span-5">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-0.5">
                              Pack Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Box of 6"
                              value={pack.packName}
                              onChange={(e) => handleUpdatePackagingRow(pack.id, 'packName', e.target.value)}
                              required
                              className="w-full h-8 px-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-hidden"
                            />
                          </div>

                          {/* Multiplier */}
                          <div className="col-span-3">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-0.5">
                              Multiplier
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="6"
                                value={pack.multiplier || ''}
                                onChange={(e) =>
                                  handleUpdatePackagingRow(
                                    pack.id,
                                    'multiplier',
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                                required
                                className="w-full h-8 px-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-hidden tabular-nums"
                              />
                              <span className="absolute right-1.5 top-2 text-[9px] font-semibold text-zinc-400 pointer-events-none">
                                {prodUnit}
                              </span>
                            </div>
                          </div>

                          {/* Selling Price */}
                          <div className="col-span-3">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-0.5">
                              Price ({currencySymbol})
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="110"
                              value={pack.sellingPrice || ''}
                              onChange={(e) =>
                                handleUpdatePackagingRow(
                                  pack.id,
                                  'sellingPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              required
                              className="w-full h-8 px-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-900 focus:bg-white focus:ring-1 focus:ring-primary focus:outline-hidden tabular-nums"
                            />
                          </div>

                          {/* Remove Button */}
                          <div className="col-span-1 flex justify-end pt-3.5">
                            <button
                              type="button"
                              onClick={() => handleRemovePackagingRow(pack.id)}
                              title="Delete pack option"
                              className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Barcode & Live Savings breakdown */}
                        <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-zinc-100">
                          <div className="col-span-7">
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                id={`input-pack-barcode-${pack.id}`}
                                placeholder="Scan or enter pack barcode (EAN)..."
                                value={pack.barcode || ''}
                                onChange={(e) => handleUpdatePackagingRow(pack.id, 'barcode', e.target.value)}
                                className="w-full h-7 pl-2 pr-7 bg-zinc-50 border border-zinc-200 rounded-md text-[11px] font-mono text-zinc-800 placeholder:text-zinc-400 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                              />
                              <button
                                type="button"
                                id={`btn-scan-pack-barcode-${pack.id}`}
                                onClick={() => setFieldScannerTarget({
                                  type: 'pack',
                                  packId: pack.id,
                                  label: pack.packName || 'Packaging Tier',
                                })}
                                title="Scan pack barcode with phone camera"
                                aria-label="Scan pack barcode with phone camera"
                                className="absolute right-0.5 top-0.5 bottom-0.5 w-6 flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="col-span-5 text-right text-[10px] text-zinc-500 font-medium">
                            {packPrice > 0 && mult > 0 ? (
                              <span>
                                {currencySymbol}{perUnitPrice.toFixed(2)} / ea
                                {savings > 0 && (
                                  <span className="ml-1 text-emerald-600 font-bold">
                                    ({savings}% off)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-zinc-400">Unit rate preview</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-zinc-50 p-3 rounded-2xl border border-zinc-200/80">
            <div>
              <label className="text-[10px] font-semibold text-zinc-600 block mb-1">
                Stock on Hand
              </label>
              <input
                type="number"
                value={prodStock}
                onChange={(e) => setProdStock(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-900 focus:border-primary focus:outline-hidden tabular-nums tracking-tight"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-600 block mb-1">
                Reorder Alert (&lt;)
              </label>
              <input
                type="number"
                value={prodThreshold}
                onChange={(e) => setProdThreshold(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-900 focus:border-primary focus:outline-hidden tabular-nums tracking-tight"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-600 block mb-1">
                Inventory Unit
              </label>
              <select
                value={prodUnit}
                onChange={(e) => setProdUnit(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-900 focus:border-primary focus:outline-hidden cursor-pointer"
              >
                <option value="pcs">pcs (Pieces)</option>
                <option value="kg">kg (Kilograms)</option>
                <option value="gm">gm (Grams)</option>
                <option value="ltr">ltr (Liters)</option>
                <option value="box">box (Boxes)</option>
                <option value="pack">pack (Packs)</option>
                <option value="plate">plate / portion</option>
              </select>
            </div>
            {canSeeCost ? (
              <div>
                <label className="text-[10px] font-semibold text-zinc-600 block mb-1">
                  Cost Price ({currencySymbol})
                </label>
                <input
                  type="number"
                  placeholder="Optional"
                  value={prodCostPrice}
                  onChange={(e) => setProdCostPrice(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus:outline-hidden tabular-nums tracking-tight"
                />
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-semibold text-zinc-600 block mb-1">
                  Cost Price
                </label>
                <div className="text-[11px] font-medium text-zinc-400 py-1.5 px-2 bg-zinc-100 rounded-lg border border-zinc-200">
                  Restricted (Owner only)
                </div>
              </div>
            )}
          </div>

          {/* Photo Upload / Camera Dropzone */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
              Product Photo (Camera or Upload)
            </label>

            {/* Hidden file input supporting camera capture & gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              id="product-photo-input"
              className="hidden"
              onChange={handleImageCapture}
            />

            {isCompressing ? (
              <div className="w-full py-6 flex flex-col items-center justify-center gap-2 border border-zinc-200 rounded-2xl bg-zinc-50 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs font-medium">Optimizing and compressing photo...</span>
              </div>
            ) : !prodImageUrl ? (
              /* Dropzone when no image is selected */
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full py-4 px-3 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-primary bg-blue-50/60 scale-[0.99]'
                    : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50/60 hover:bg-zinc-50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-white shadow-xs border border-zinc-200 flex items-center justify-center mb-1.5 text-zinc-600">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-zinc-800">
                  Take Photo or Upload Image
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">
                  Tap for Camera / Gallery or Drag & Drop (Max 400x400 auto-compressed)
                </span>
              </div>
            ) : (
              /* Selected Image Preview (64x64) with Change & Remove */
              <div className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={prodImageUrl}
                    alt="Product preview"
                    className="w-16 h-16 rounded-xl object-cover border border-zinc-200 shadow-xs shrink-0 bg-white"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-zinc-800 truncate">
                      Photo Added
                    </span>
                    <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>Optimized & Ready</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdImageUrl('')}
                    className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              Save Product
            </button>
          </div>
        </form>
      </div>

      {/* Phone Camera Barcode Scanner Dialog for Fields */}
      <FieldBarcodeScannerModal
        isOpen={Boolean(fieldScannerTarget)}
        title={fieldScannerTarget?.label ? `Scan Barcode for ${fieldScannerTarget.label}` : 'Scan Barcode with Camera'}
        subtitle="Point phone camera at the barcode on the packaging or product"
        onClose={() => setFieldScannerTarget(null)}
        onScan={(scannedCode) => {
          if (!fieldScannerTarget) return;
          if (fieldScannerTarget.type === 'primary') {
            setProdBarcode(scannedCode);
            handleProcessBarcodeLookup(scannedCode);
          } else if (fieldScannerTarget.type === 'pack' && fieldScannerTarget.packId) {
            handleUpdatePackagingRow(fieldScannerTarget.packId, 'barcode', scannedCode);
          }
          setFieldScannerTarget(null);
        }}
      />
    </div>
  );
};

export const EditProductModal = AddProductModal;
export default AddProductModal;
