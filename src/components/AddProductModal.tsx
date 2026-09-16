import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Trash2, RefreshCw, X, Loader2, Check, Layers, Plus, Sparkles, Scale, CheckCircle2, Package } from 'lucide-react';
import { CatalogItem, Category, PackagingOption } from '../types';
import { GST_SLABS } from '../constants/taxRates';
import { FieldBarcodeScannerModal } from './FieldBarcodeScannerModal';
import { lookupBarcodeDetails } from '../services/barcodeLookup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="sm:max-w-lg max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl"
          showCloseButton={false}
        >
          <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-foreground">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            <DialogDescription className="sr-only">
              {editingProduct ? 'Update product details in your catalog' : 'Add a new product to your catalog'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
              {/* Segmented Mode Selector: Packaged Goods vs Loose / By Weight */}
              <div className="p-1 bg-muted rounded-xl border border-border grid grid-cols-2 gap-1 text-xs">
                <Button
                  type="button"
                  id="tab-type-packaged"
                  variant={productType === 'packaged' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSwitchProductType('packaged')}
                  className="h-8 gap-2 font-semibold text-xs shadow-none cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>Packaged Item</span>
                </Button>

                <Button
                  type="button"
                  id="tab-type-loose"
                  variant={productType === 'loose' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSwitchProductType('loose')}
                  className="h-8 gap-2 font-semibold text-xs shadow-none cursor-pointer"
                >
                  <Scale className="w-4 h-4" />
                  <span>Loose / By Weight</span>
                </Button>
              </div>

              {/* Quick Scan Action (Only for Packaged Items) */}
              {productType === 'packaged' && !editingProduct && (
                <Button
                  type="button"
                  id="btn-quick-scan-product"
                  variant="outline"
                  onClick={() => setFieldScannerTarget({ type: 'primary', label: 'New Product' })}
                  className="w-full h-9 gap-2 font-semibold text-xs border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-primary" />
                  <span>Scan Barcode to Auto-Fill Name & Details</span>
                </Button>
              )}

              {/* Loose Produce Unit Selector Bar (Only for Loose Items) */}
              {productType === 'loose' && (
                <Card className="bg-muted/30 border-border shadow-none">
                  <CardContent className="p-2.5 flex items-center justify-between gap-2 text-xs">
                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Sold by weight/volume:</span>
                    </span>
                    <div className="flex gap-1.5">
                      {(['kg', 'gm', 'ltr', 'pcs'] as const).map((unitOpt) => (
                        <Button
                          key={unitOpt}
                          type="button"
                          variant={prodUnit === unitOpt ? 'default' : 'outline'}
                          size="xs"
                          onClick={() => setProdUnit(unitOpt)}
                          className="h-7 px-2.5 text-xs font-semibold"
                        >
                          {unitOpt}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="input-prod-name" className="text-xs font-semibold text-foreground">
                  {productType === 'loose' ? 'Item Name' : 'Product Name'} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="input-prod-name"
                  type="text"
                  placeholder={productType === 'loose' ? 'e.g. Fresh Red Onions, Organic Apples' : 'e.g. Coca-Cola 330ml Can, Paneer Tikka Burger'}
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="h-9 text-xs"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="select-prod-category" className="text-xs font-semibold text-foreground">
                  Category
                </Label>
                <Select
                  value={prodCategory}
                  onValueChange={(val) => val && setProdCategory(val)}
                >
                  <SelectTrigger id="select-prod-category" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c.name !== 'ALL' && c.name !== 'All Items')
                      .map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="input-prod-price" className="text-xs font-semibold text-foreground">
                  {productType === 'loose' ? `Price per ${prodUnit} (${currencySymbol})` : `Unit Price (${currencySymbol})`} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="input-prod-price"
                  type="number"
                  placeholder="0.00"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  required
                  min="0"
                  step="any"
                  className="h-9 text-xs tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="select-prod-gst" className="text-xs font-semibold text-foreground">
                  GST Slab (%) <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={prodGstRate}
                  onValueChange={(val) => val && setProdGstRate(val)}
                >
                  <SelectTrigger id="select-prod-gst" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select GST rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_SLABS.map((slab) => (
                      <SelectItem key={slab.label} value={slab.isCustom ? 'custom' : String(slab.rate)}>
                        {slab.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCustom && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="Enter custom GST % (e.g. 7.5)"
                      value={customGstRate}
                      onChange={(e) => setCustomGstRate(e.target.value)}
                      required
                      autoFocus
                      className="h-9 text-xs tabular-nums"
                    />
                    <span className="text-xs font-bold text-muted-foreground shrink-0">%</span>
                  </div>
                )}
              </div>

              {/* Barcode & SKU - Differentiated by Product Type */}
              {productType === 'packaged' ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="input-prod-barcode" className="text-xs font-semibold text-foreground">
                        Barcode / EAN (Optional)
                      </Label>
                      {prodBarcode.trim().length >= 6 && !isLookingUpBarcode && (
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          onClick={() => handleProcessBarcodeLookup(prodBarcode)}
                          className="text-[10px] font-semibold text-primary p-0 h-auto gap-1"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Auto-Fill</span>
                        </Button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <Input
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
                        className="h-9 pr-9 text-xs font-mono tabular-nums"
                      />
                      <Button
                        type="button"
                        id="btn-scan-prod-barcode"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setFieldScannerTarget({
                          type: 'primary',
                          label: prodName || 'Product',
                        })}
                        title="Scan barcode with phone camera"
                        aria-label="Scan barcode with phone camera"
                        className="absolute right-1 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Status Feedback */}
                    {isLookingUpBarcode && (
                      <div className="mt-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                        <span>Looking up product in registry...</span>
                      </div>
                    )}
                    {lookupFeedback && !isLookingUpBarcode && (
                      <div className={`mt-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1.5 ${
                        lookupFeedback.isMultiPack
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{lookupFeedback.message}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="input-prod-sku" className="text-xs font-semibold text-foreground">
                      SKU Code (Optional)
                    </Label>
                    <Input
                      type="text"
                      id="input-prod-sku"
                      placeholder="e.g. COCA-CAN-330"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      className="h-9 text-xs tabular-nums"
                    />
                  </div>
                </div>
              ) : (
                /* Loose produce: Display Store PLU lookup code and auto-generate */
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="input-prod-sku" className="text-xs font-semibold text-foreground">
                      Item PLU / Quick Lookup Code <span className="text-destructive">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      onClick={generateNewPlu}
                      className="text-[10px] font-semibold text-primary p-0 h-auto gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Generate New PLU</span>
                    </Button>
                  </div>
                  <Input
                    type="text"
                    id="input-prod-sku"
                    placeholder="e.g. PLU-4011"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    required
                    className="h-9 text-xs font-mono font-semibold"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Loose items use store PLU codes on the register instead of factory barcodes.
                  </p>
                </div>
              )}

              {/* Packaging Tiers & Multi-Barcodes (Only for Packaged Items) */}
              {productType === 'packaged' && (
                <Card className="bg-muted/20 border-border shadow-none space-y-2.5">
                  <CardHeader className="p-3 pb-0 flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-primary" />
                      <CardTitle className="text-xs font-bold text-foreground">
                        Packaging Tiers & Multi-Barcodes
                      </CardTitle>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      onClick={handleAddPackagingRow}
                      className="text-xs font-semibold text-primary p-0 h-auto gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Tier</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <CardDescription className="text-[10px] text-muted-foreground">
                      Link case/box barcodes and custom pack prices while tracking total inventory in base {prodUnit || 'units'}.
                    </CardDescription>

                    {packagingOptions.length === 0 ? (
                      <div className="text-center py-3 px-2 bg-background rounded-lg border border-dashed border-border text-muted-foreground text-xs">
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
                            <Card
                              key={pack.id || idx}
                              className="p-2.5 bg-background border-border shadow-none space-y-2"
                            >
                              <div className="grid grid-cols-12 gap-2 items-center">
                                {/* Pack Name */}
                                <div className="col-span-5 space-y-1">
                                  <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                    Pack Name
                                  </Label>
                                  <Input
                                    type="text"
                                    placeholder="e.g. Box of 6"
                                    value={pack.packName}
                                    onChange={(e) => handleUpdatePackagingRow(pack.id, 'packName', e.target.value)}
                                    required
                                    className="h-8 text-xs font-medium"
                                  />
                                </div>

                                {/* Multiplier */}
                                <div className="col-span-3 space-y-1">
                                  <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                    Multiplier
                                  </Label>
                                  <div className="relative">
                                    <Input
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
                                      className="h-8 text-xs font-semibold tabular-nums pr-7"
                                    />
                                    <span className="absolute right-1.5 top-2 text-[9px] font-semibold text-muted-foreground pointer-events-none">
                                      {prodUnit}
                                    </span>
                                  </div>
                                </div>

                                {/* Selling Price */}
                                <div className="col-span-3 space-y-1">
                                  <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                    Price ({currencySymbol})
                                  </Label>
                                  <Input
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
                                    className="h-8 text-xs font-bold tabular-nums"
                                  />
                                </div>

                                {/* Remove Button */}
                                <div className="col-span-1 flex justify-end pt-4">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => handleRemovePackagingRow(pack.id)}
                                    title="Delete pack option"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Barcode & Live Savings breakdown */}
                              <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-border">
                                <div className="col-span-7">
                                  <div className="relative flex items-center">
                                    <Input
                                      type="text"
                                      id={`input-pack-barcode-${pack.id}`}
                                      placeholder="Scan or enter pack barcode (EAN)..."
                                      value={pack.barcode || ''}
                                      onChange={(e) => handleUpdatePackagingRow(pack.id, 'barcode', e.target.value)}
                                      className="h-7 pr-7 text-[11px] font-mono"
                                    />
                                    <Button
                                      type="button"
                                      id={`btn-scan-pack-barcode-${pack.id}`}
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => setFieldScannerTarget({
                                        type: 'pack',
                                        packId: pack.id,
                                        label: pack.packName || 'Packaging Tier',
                                      })}
                                      title="Scan pack barcode with phone camera"
                                      aria-label="Scan pack barcode with phone camera"
                                      className="absolute right-0.5 text-primary hover:text-primary hover:bg-primary/10"
                                    >
                                      <Camera className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="col-span-5 text-right text-[10px] text-muted-foreground font-medium">
                                  {packPrice > 0 && mult > 0 ? (
                                    <span>
                                      {currencySymbol}{perUnitPrice.toFixed(2)} / ea
                                      {savings > 0 && (
                                        <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 text-primary">
                                          {savings}% off
                                        </Badge>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Unit rate preview</span>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="bg-muted/20 border-border shadow-none">
                <CardContent className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                      Stock on Hand
                    </Label>
                    <Input
                      type="number"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      className="h-8 text-xs font-medium tabular-nums"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                      Reorder Alert (&lt;)
                    </Label>
                    <Input
                      type="number"
                      value={prodThreshold}
                      onChange={(e) => setProdThreshold(e.target.value)}
                      className="h-8 text-xs font-medium tabular-nums"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                      Inventory Unit
                    </Label>
                    <Select
                      value={prodUnit}
                      onValueChange={(val) => val && setProdUnit(val)}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pcs">pcs (Pieces)</SelectItem>
                        <SelectItem value="kg">kg (Kilograms)</SelectItem>
                        <SelectItem value="gm">gm (Grams)</SelectItem>
                        <SelectItem value="ltr">ltr (Liters)</SelectItem>
                        <SelectItem value="box">box (Boxes)</SelectItem>
                        <SelectItem value="pack">pack (Packs)</SelectItem>
                        <SelectItem value="plate">plate / portion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {canSeeCost ? (
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        Cost Price ({currencySymbol})
                      </Label>
                      <Input
                        type="number"
                        placeholder="Optional"
                        value={prodCostPrice}
                        onChange={(e) => setProdCostPrice(e.target.value)}
                        className="h-8 text-xs font-medium tabular-nums"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        Cost Price
                      </Label>
                      <div className="h-8 text-[11px] font-medium text-muted-foreground flex items-center px-2 bg-muted/50 rounded-md border border-border">
                        Restricted (Owner only)
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Photo Upload / Camera Dropzone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Product Photo (Camera or Upload)
                </Label>

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
                  <div className="w-full py-6 flex flex-col items-center justify-center gap-2 border border-border rounded-xl bg-muted/20 text-muted-foreground">
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
                    className={`w-full py-4 px-3 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                      isDragOver
                        ? 'border-primary bg-primary/5 scale-[0.99]'
                        : 'border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-card shadow-xs border border-border flex items-center justify-center mb-1.5 text-muted-foreground">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      Take Photo or Upload Image
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Tap for Camera / Gallery or Drag & Drop (Max 400x400 auto-compressed)
                    </span>
                  </div>
                ) : (
                  /* Selected Image Preview with Change & Remove */
                  <Card className="w-full p-2.5 bg-muted/20 border-border shadow-none flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={prodImageUrl}
                        alt="Product preview"
                        className="w-14 h-14 rounded-lg object-cover border border-border shadow-xs shrink-0 bg-background"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate">
                          Photo Added
                        </span>
                        <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Optimized & Ready</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 text-xs font-semibold gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Change</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setProdImageUrl('')}
                        className="h-8 text-xs font-semibold text-destructive hover:text-destructive gap-1"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-border bg-card shrink-0 flex-row items-center gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-10 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                className="flex-1 h-10 text-xs font-semibold"
              >
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </>
  );
};

export const EditProductModal = AddProductModal;
export default AddProductModal;
