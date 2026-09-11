import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Trash2, RefreshCw, X, Loader2, Check } from 'lucide-react';
import { CatalogItem, Category } from '../types';
import { GST_SLABS } from '../constants/taxRates';

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

  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const isCustom = prodGstRate === 'custom';

  // Sync state when modal opens or editingProduct changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingProduct) {
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
      setProdUnit(editingProduct.unit || 'pcs');
      setProdCostPrice(editingProduct.costPrice ? String(editingProduct.costPrice) : '');
    } else {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(prodPrice);
    if (!prodName.trim() || isNaN(priceNum) || priceNum < 0) return;

    const stockNum = parseInt(prodStock, 10) || 0;
    const threshNum = parseInt(prodThreshold, 10) || 5;
    const costNum = parseFloat(prodCostPrice) || undefined;
    const gstRateNum = isCustom
      ? parseFloat(customGstRate) || 0
      : parseFloat(prodGstRate) || 0;

    onSaveProduct({
      id: editingProduct ? editingProduct.id : undefined,
      name: prodName.trim(),
      category: prodCategory,
      price: priceNum,
      gstRate: gstRateNum,
      barcode: prodBarcode.trim() || undefined,
      sku: prodSku.trim() || undefined,
      image: prodImageUrl.trim() || undefined,
      stock: stockNum,
      lowStockThreshold: threshNum,
      unit: prodUnit,
      costPrice: costNum,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-zinc-950/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-sm sm:max-w-md border border-zinc-200 shadow-2xl p-5 space-y-3.5 my-auto overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h3 className="font-bold text-sm text-zinc-900">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
              Product Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Paneer Tikka Burger"
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
              Unit Price ({currencySymbol}) *
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

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                Barcode / EAN (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 890103001"
                value={prodBarcode}
                onChange={(e) => setProdBarcode(e.target.value)}
                className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all tabular-nums tracking-tight"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                SKU Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. PIZZA-CH7"
                value={prodSku}
                onChange={(e) => setProdSku(e.target.value)}
                className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-hidden transition-all tabular-nums tracking-tight"
              />
            </div>
          </div>

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
                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
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
    </div>
  );
};

export const EditProductModal = AddProductModal;
export default AddProductModal;
