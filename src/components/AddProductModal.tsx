import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Trash2,
  RefreshCw,
  X,
  Loader2,
  Check,
  Layers,
  Plus,
  Sparkles,
  Scale,
  Package,
} from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  initialCategory?: string;
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

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

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
  initialCategory,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'basic' | 'inventory' | 'packs'>('basic');
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
        const displayName =
          result.brand && !result.name.toLowerCase().includes(result.brand.toLowerCase())
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
    setActiveTab('basic');

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
        initialCategory ||
        categories.find((c) => c.name !== 'ALL' && c.name !== 'All Items')?.name ||
        'Fast Food';
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
  }, [isOpen, editingProduct, categories, initialCategory]);

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

    const validPackOptions =
      productType === 'packaged'
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
      barcode: productType === 'packaged' ? prodBarcode.trim() || undefined : undefined,
      sku:
        prodSku.trim() ||
        (productType === 'loose' ? `PLU-${Math.floor(1000 + Math.random() * 9000)}` : undefined),
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground">
          {/* Dialog Header */}
          <DialogHeader className="p-5 pb-4 border-b border-border bg-card shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {editingProduct
                    ? 'Update product specifications, pricing, tax rates, and inventory rules.'
                    : 'Enter product details, pricing, tax rates, inventory, and packaging.'}
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground h-8 w-8"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Form Container */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            {/* shadcn Tabs Navigation */}
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as any)}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-5 pt-3 pb-0 border-b border-border bg-muted/20 shrink-0">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic" className="text-xs font-medium gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>General & Pricing</span>
                  </TabsTrigger>
                  <TabsTrigger value="inventory" className="text-xs font-medium gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span>Inventory & Stock</span>
                    {parseInt(prodStock, 10) > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1">
                        {prodStock}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="packs" className="text-xs font-medium gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Packaging & Photo</span>
                    {(packagingOptions.length > 0 || Boolean(prodImageUrl)) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary ml-1" />
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Scrollable Tab Contents */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* TAB 1: GENERAL & PRICING */}
                <TabsContent value="basic" className="space-y-4 mt-0">
                  {/* Item Type Selector */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg border border-border">
                    <Button
                      type="button"
                      variant={productType === 'packaged' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleSwitchProductType('packaged')}
                      className="h-8 gap-1.5 text-xs font-medium"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Packaged Item</span>
                    </Button>
                    <Button
                      type="button"
                      variant={productType === 'loose' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleSwitchProductType('loose')}
                      className="h-8 gap-1.5 text-xs font-medium"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Loose / By Weight</span>
                    </Button>
                  </div>

                  {/* Quick Barcode Scan Banner */}
                  {productType === 'packaged' && !editingProduct && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setFieldScannerTarget({ type: 'primary', label: 'New Product' })
                      }
                      className="w-full h-9 text-xs font-medium gap-2 border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Scan Barcode to Auto-Fill Details</span>
                    </Button>
                  )}

                  {/* Feedback on barcode lookup */}
                  {lookupFeedback && (
                    <div className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-muted text-muted-foreground border border-border">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{lookupFeedback.message}</span>
                    </div>
                  )}

                  {/* Product Name & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="input-prod-name" className="text-xs font-medium">
                        {productType === 'loose' ? 'Item Name' : 'Product Name'}{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="input-prod-name"
                        type="text"
                        placeholder={
                          productType === 'loose'
                            ? 'e.g. Fresh Red Onions, Organic Apples'
                            : 'e.g. Coca-Cola 330ml Can'
                        }
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        autoFocus
                        required
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="select-prod-category" className="text-xs font-medium">
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
                  </div>

                  {/* Price & GST Slab */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="input-prod-price" className="text-xs font-medium">
                        {productType === 'loose'
                          ? `Price per ${prodUnit} (${currencySymbol})`
                          : `Selling Price (${currencySymbol})`}{' '}
                        <span className="text-destructive">*</span>
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
                        className="h-9 text-xs tabular-nums font-semibold"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="select-prod-gst" className="text-xs font-medium">
                        GST Slab (%) <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={prodGstRate}
                        onValueChange={(val) => val && setProdGstRate(val)}
                      >
                        <SelectTrigger id="select-prod-gst" className="w-full h-9 text-xs">
                          <SelectValue placeholder="Select GST slab" />
                        </SelectTrigger>
                        <SelectContent>
                          {GST_SLABS.map((slab) => (
                            <SelectItem
                              key={slab.label}
                              value={slab.isCustom ? 'custom' : String(slab.rate)}
                            >
                              {slab.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Custom GST input */}
                  {isCustom && (
                    <div className="grid gap-2">
                      <Label htmlFor="input-custom-gst" className="text-xs font-medium">
                        Custom GST Percentage (%)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="input-custom-gst"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="e.g. 7.5"
                          value={customGstRate}
                          onChange={(e) => setCustomGstRate(e.target.value)}
                          required
                          className="h-9 text-xs tabular-nums"
                        />
                        <span className="text-xs font-bold text-muted-foreground">%</span>
                      </div>
                    </div>
                  )}

                  {/* Barcode & SKU */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="input-prod-barcode" className="text-xs font-medium">
                        Barcode / EAN (Optional)
                      </Label>
                      <div className="relative flex items-center">
                        <Input
                          id="input-prod-barcode"
                          type="text"
                          placeholder="Scan or enter barcode"
                          value={prodBarcode}
                          onChange={(e) => {
                            setProdBarcode(e.target.value);
                            handleProcessBarcodeLookup(e.target.value);
                          }}
                          disabled={productType === 'loose'}
                          className="h-9 text-xs font-mono pr-9"
                        />
                        {productType === 'packaged' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setFieldScannerTarget({ type: 'primary', label: 'Product Barcode' })
                            }
                            className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Scan with Camera"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="input-prod-sku" className="text-xs font-medium">
                          SKU Code (Optional)
                        </Label>
                        {productType === 'loose' && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={generateNewPlu}
                            className="h-auto p-0 text-[11px] text-primary"
                          >
                            Generate PLU
                          </Button>
                        )}
                      </div>
                      <Input
                        id="input-prod-sku"
                        type="text"
                        placeholder="e.g. COCA-CAN-330"
                        value={prodSku}
                        onChange={(e) => setProdSku(e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: INVENTORY & STOCK */}
                <TabsContent value="inventory" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader className="p-4 pb-3">
                      <CardTitle className="text-xs font-semibold">
                        Stock & Inventory Rules
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Track on-hand stock and configure automated reorder thresholds.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="input-prod-stock" className="text-xs font-medium">
                            Stock on Hand
                          </Label>
                          <Input
                            id="input-prod-stock"
                            type="number"
                            min="0"
                            value={prodStock}
                            onChange={(e) => setProdStock(e.target.value)}
                            required
                            className="h-9 text-xs tabular-nums"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="input-prod-threshold" className="text-xs font-medium">
                            Reorder Alert (&lt;)
                          </Label>
                          <Input
                            id="input-prod-threshold"
                            type="number"
                            min="0"
                            value={prodThreshold}
                            onChange={(e) => setProdThreshold(e.target.value)}
                            className="h-9 text-xs tabular-nums"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="select-prod-unit" className="text-xs font-medium">
                            Inventory Unit
                          </Label>
                          <Select value={prodUnit} onValueChange={(val) => val && setProdUnit(val)}>
                            <SelectTrigger id="select-prod-unit" className="w-full h-9 text-xs">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pcs">pcs (Pieces)</SelectItem>
                              <SelectItem value="kg">kg (Kilogram)</SelectItem>
                              <SelectItem value="gm">gm (Gram)</SelectItem>
                              <SelectItem value="ltr">ltr (Litre)</SelectItem>
                              <SelectItem value="ml">ml (Millilitre)</SelectItem>
                              <SelectItem value="box">box (Box)</SelectItem>
                              <SelectItem value="pack">pack (Pack)</SelectItem>
                              <SelectItem value="bottle">bottle (Bottle)</SelectItem>
                              <SelectItem value="can">can (Can)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {canSeeCost && (
                          <div className="grid gap-2">
                            <Label htmlFor="input-prod-cost" className="text-xs font-medium">
                              Cost Price ({currencySymbol})
                            </Label>
                            <Input
                              id="input-prod-cost"
                              type="number"
                              min="0"
                              step="any"
                              placeholder="Optional"
                              value={prodCostPrice}
                              onChange={(e) => setProdCostPrice(e.target.value)}
                              className="h-9 text-xs tabular-nums"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB 3: PACKAGING & PHOTO */}
                <TabsContent value="packs" className="space-y-4 mt-0">
                  {/* Packaging Tiers Card */}
                  {productType === 'packaged' ? (
                    <Card>
                      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
                        <div>
                          <CardTitle className="text-xs font-semibold">
                            Packaging Tiers & Multi-Barcodes
                          </CardTitle>
                          <CardDescription className="text-[11px] mt-0.5">
                            Link case/box barcodes and custom pack prices while tracking inventory in base {prodUnit}.
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddPackagingRow}
                          className="h-8 text-xs font-medium gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Tier</span>
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        {packagingOptions.length === 0 ? (
                          <div className="text-center py-6 px-4 rounded-lg border border-dashed border-border text-muted-foreground text-xs space-y-1 bg-muted/10">
                            <p className="font-medium text-foreground">No packaging tiers configured</p>
                            <p className="text-[11px]">Standard single {prodUnit} pricing applies at checkout.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {packagingOptions.map((pack, idx) => (
                              <div
                                key={pack.id || idx}
                                className="p-3 rounded-lg border border-border bg-muted/20 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                              >
                                <div className="sm:col-span-4 grid gap-1.5">
                                  <Label className="text-[11px] font-medium text-muted-foreground">
                                    Pack Name
                                  </Label>
                                  <Input
                                    type="text"
                                    placeholder="e.g. 6-Pack, Box of 24"
                                    value={pack.packName}
                                    onChange={(e) =>
                                      handleUpdatePackagingRow(pack.id, 'packName', e.target.value)
                                    }
                                    required
                                    className="h-8 text-xs"
                                  />
                                </div>

                                <div className="sm:col-span-2 grid gap-1.5">
                                  <Label className="text-[11px] font-medium text-muted-foreground">
                                    Qty (x {prodUnit})
                                  </Label>
                                  <Input
                                    type="number"
                                    min="2"
                                    value={pack.multiplier}
                                    onChange={(e) =>
                                      handleUpdatePackagingRow(
                                        pack.id,
                                        'multiplier',
                                        parseInt(e.target.value, 10) || 1
                                      )
                                    }
                                    required
                                    className="h-8 text-xs tabular-nums"
                                  />
                                </div>

                                <div className="sm:col-span-3 grid gap-1.5">
                                  <Label className="text-[11px] font-medium text-muted-foreground">
                                    Pack Price ({currencySymbol})
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="0.00"
                                    value={pack.sellingPrice || ''}
                                    onChange={(e) =>
                                      handleUpdatePackagingRow(
                                        pack.id,
                                        'sellingPrice',
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    required
                                    className="h-8 text-xs tabular-nums font-semibold"
                                  />
                                </div>

                                <div className="sm:col-span-3 flex items-center gap-1.5">
                                  <div className="flex-1 grid gap-1.5">
                                    <Label className="text-[11px] font-medium text-muted-foreground">
                                      Pack Barcode
                                    </Label>
                                    <Input
                                      type="text"
                                      placeholder="Barcode"
                                      value={pack.barcode}
                                      onChange={(e) =>
                                        handleUpdatePackagingRow(pack.id, 'barcode', e.target.value)
                                      }
                                      className="h-8 text-xs font-mono"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemovePackagingRow(pack.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    title="Delete Tier"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : null}

                  {/* Product Photo Card */}
                  <Card>
                    <CardHeader className="p-4 pb-3">
                      <CardTitle className="text-xs font-semibold">
                        Product Photo (Camera or Upload)
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Add a clear product image for touch grid recognition (auto-compressed).
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageCapture}
                        className="hidden"
                      />

                      {isCompressing ? (
                        <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2 border border-dashed border-border rounded-lg">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          <span className="text-xs font-medium">Optimizing image...</span>
                        </div>
                      ) : !prodImageUrl ? (
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
                          className={`w-full py-6 px-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                            isDragOver
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/20'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-card border border-border shadow-xs flex items-center justify-center mb-2 text-muted-foreground">
                            <Camera className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            Take Photo or Upload Image
                          </span>
                          <span className="text-[11px] text-muted-foreground mt-0.5">
                            Tap for Camera / Gallery or Drag & Drop (Max 400x400)
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 border border-border rounded-lg flex items-center justify-between gap-3 bg-muted/10">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={prodImageUrl}
                              alt="Product preview"
                              className="w-14 h-14 rounded-md object-cover border border-border shrink-0 bg-background"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-foreground block truncate">
                                Image attached
                              </span>
                              <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Optimized</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-8 text-xs font-medium gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Change</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setProdImageUrl('')}
                              className="h-8 text-xs font-medium text-destructive hover:text-destructive gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>

              {/* Dialog Footer */}
              <DialogFooter className="p-4 border-t border-border bg-card shrink-0 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="h-9 px-4 text-xs font-medium"
                >
                  Cancel
                </Button>

                <div className="flex items-center gap-2">
                  {activeTab === 'basic' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('inventory')}
                      className="h-9 text-xs font-medium"
                    >
                      Next: Inventory ➔
                    </Button>
                  )}
                  {activeTab === 'inventory' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('packs')}
                      className="h-9 text-xs font-medium"
                    >
                      Next: Packs & Photo ➔
                    </Button>
                  )}
                  <Button type="submit" variant="default" className="h-9 px-5 text-xs font-semibold">
                    Save Product
                  </Button>
                </div>
              </DialogFooter>
            </Tabs>
          </form>
        </DialogContent>
      </Dialog>

      {/* Camera Barcode Scanner Submodal */}
      <FieldBarcodeScannerModal
        isOpen={Boolean(fieldScannerTarget)}
        title={
          fieldScannerTarget?.label
            ? `Scan Barcode for ${fieldScannerTarget.label}`
            : 'Scan Barcode with Camera'
        }
        subtitle="Point camera at the item's barcode"
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
