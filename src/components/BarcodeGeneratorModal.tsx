import React, { useState, useEffect } from 'react';
import { Printer, Barcode as BarcodeIcon, Sparkles } from 'lucide-react';
import { CatalogItem } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface BarcodeGeneratorModalProps {
  isOpen: boolean;
  catalog: CatalogItem[];
  currencySymbol: string;
  shopName: string;
  initialProductId?: string;
  onClose: () => void;
}

export const BarcodeGeneratorModal: React.FC<BarcodeGeneratorModalProps> = ({
  isOpen,
  catalog,
  currencySymbol,
  shopName,
  initialProductId,
  onClose,
}) => {
  const defaultItem = (initialProductId && catalog.find((c) => c.id === initialProductId)) || catalog[0] || null;
  const [selectedProductId, setSelectedProductId] = useState<string>(defaultItem ? defaultItem.id : '');
  const [productName, setProductName] = useState<string>(defaultItem ? defaultItem.name : 'Sample Product');
  const [barcodeValue, setBarcodeValue] = useState<string>(defaultItem?.barcode || '890103001');
  const [skuValue, setSkuValue] = useState<string>(defaultItem?.sku || 'SKU-001');
  const [priceValue, setPriceValue] = useState<number>(defaultItem ? defaultItem.price : 99);

  // Format options
  const [labelFormat, setLabelFormat] = useState<'thermal-single' | 'a4-24' | 'a4-40'>('a4-40');
  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      const activeItem = (initialProductId && catalog.find((c) => c.id === initialProductId)) || catalog[0] || null;
      if (activeItem) {
        setSelectedProductId(activeItem.id);
        setProductName(activeItem.name);
        setBarcodeValue(activeItem.barcode || `890${Math.floor(100000 + Math.random() * 900000)}`);
        setSkuValue(activeItem.sku || 'SKU-ITEM');
        setPriceValue(activeItem.price);
      }
    }
  }, [isOpen, initialProductId, catalog]);

  if (!isOpen) return null;

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    if (productId === 'custom') {
      setProductName('Custom Product');
      setBarcodeValue(`890${Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9)}`);
      setSkuValue('SKU-CUSTOM');
      setPriceValue(99);
      return;
    }
    const item = catalog.find((c) => c.id === productId);
    if (item) {
      setProductName(item.name);
      setBarcodeValue(item.barcode || `890${Math.floor(100000 + Math.random() * 900000)}`);
      setSkuValue(item.sku || 'SKU-ITEM');
      setPriceValue(item.price);
    }
  };

  const handleGenerateRandomBarcode = () => {
    const randomEan = '890' + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
    setBarcodeValue(randomEan);
  };

  const handlePrint = () => {
    window.print();
  };

  // Generates SVG bars based on the barcode string digits (simulated Code128 pattern)
  const renderSvgBarcode = (code: string) => {
    const bars: { width: number; isBlack: boolean }[] = [];
    bars.push({ width: 2, isBlack: true }, { width: 1, isBlack: false }, { width: 1, isBlack: true });

    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const b1 = (charCode % 3) + 1;
      const b2 = ((charCode >> 1) % 2) + 1;
      const b3 = ((charCode >> 2) % 3) + 1;
      const b4 = ((charCode >> 3) % 2) + 1;
      bars.push(
        { width: b1, isBlack: true },
        { width: b2, isBlack: false },
        { width: b3, isBlack: true },
        { width: b4, isBlack: false }
      );
    }
    bars.push({ width: 2, isBlack: true }, { width: 1, isBlack: false }, { width: 3, isBlack: true });

    let currentX = 10;
    const barHeight = 36;
    const svgElements: React.ReactNode[] = [];

    bars.forEach((bar, idx) => {
      if (bar.isBlack) {
        svgElements.push(
          <rect
            key={idx}
            x={currentX}
            y={0}
            width={bar.width}
            height={barHeight}
            fill="#000000"
          />
        );
      }
      currentX += bar.width;
    });

    const totalWidth = currentX + 10;

    return (
      <svg
        viewBox={`0 0 ${totalWidth} 50`}
        className="w-full h-11 max-h-11"
        preserveAspectRatio="xMidYMid meet"
      >
        {svgElements}
        <text
          x={totalWidth / 2}
          y={46}
          textAnchor="middle"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
          fill="#1c1b1d"
          letterSpacing="2"
        >
          {code}
        </text>
      </svg>
    );
  };

  const totalStickersToRender =
    labelFormat === 'thermal-single' ? 1 : labelFormat === 'a4-24' ? 24 : 40;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background text-foreground border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-border flex flex-row items-center justify-between shrink-0 space-y-0 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <BarcodeIcon className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground">
                Product Barcode Label Generator
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Thermal Roll (50x25mm) & A4 Sticker Sheet Printing
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 pr-6 sm:pr-8">
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-1.5 h-8 text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Printer className="size-3.5" />
              <span>Print Stickers</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content Layout: Left Controls, Right Preview */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Controls Column */}
          <div className="w-full md:w-80 border-r border-border bg-card p-4 overflow-y-auto space-y-3.5 shrink-0">
            {/* Select Product */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select Product from Catalog
              </Label>
              <Select value={selectedProductId} onValueChange={handleProductChange}>
                <SelectTrigger className="w-full h-8.5 text-xs bg-background">
                  <SelectValue placeholder="-- Select Product --">
                    {selectedProductId === 'custom'
                      ? '-- Custom Sticker --'
                      : catalog.find((c) => c.id === selectedProductId)
                      ? `${catalog.find((c) => c.id === selectedProductId)?.name} (${currencySymbol}${catalog.find((c) => c.id === selectedProductId)?.price.toFixed(2)})`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">-- Custom Sticker --</SelectItem>
                  {catalog.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({currencySymbol}{item.price.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Product Metadata Inputs */}
            <div className="space-y-2.5">
              <div className="space-y-1">
                <Label htmlFor="barcode-product-title" className="text-xs font-medium text-foreground">
                  Product Title
                </Label>
                <Input
                  id="barcode-product-title"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="barcode-price" className="text-xs font-medium text-foreground">
                    MRP / Price ({currencySymbol})
                  </Label>
                  <Input
                    id="barcode-price"
                    type="number"
                    value={priceValue}
                    onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-bold tabular-nums bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="barcode-sku" className="text-xs font-medium text-foreground">
                    SKU Code
                  </Label>
                  <Input
                    id="barcode-sku"
                    type="text"
                    value={skuValue}
                    onChange={(e) => setSkuValue(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="barcode-code" className="text-xs font-medium text-foreground">
                    Barcode (EAN-13 / Code128)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleGenerateRandomBarcode}
                    className="h-5 px-1 text-[11px] text-primary gap-1 cursor-pointer"
                  >
                    <Sparkles className="size-3" />
                    <span>Auto-Gen</span>
                  </Button>
                </div>
                <Input
                  id="barcode-code"
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  className="h-8 text-xs font-mono font-bold tracking-wider tabular-nums bg-background"
                />
              </div>
            </div>

            <Separator />

            {/* Paper / Sticker Format */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Paper / Sticker Sheet Format
              </Label>
              <div className="space-y-1.5">
                {[
                  { id: 'thermal-single', name: 'Thermal Roll (Single 50x25mm)', desc: '1 sticker for thermal label printer' },
                  { id: 'a4-24', name: 'A4 Sheet: 24 Labels (3x8 Grid)', desc: 'Standard Avery / Tally sticker sheet' },
                  { id: 'a4-40', name: 'A4 Sheet: 40 Labels (4x10 Grid)', desc: 'Compact retail grocery labels' },
                ].map((fmt) => (
                  <Button
                    key={fmt.id}
                    type="button"
                    variant={labelFormat === fmt.id ? 'default' : 'outline'}
                    onClick={() => setLabelFormat(fmt.id as any)}
                    className={`w-full h-auto p-2.5 flex flex-col items-start justify-start text-left cursor-pointer transition-all ${
                      labelFormat === fmt.id
                        ? 'shadow-xs'
                        : 'bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="text-xs font-semibold">{fmt.name}</span>
                      {labelFormat === fmt.id && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary-foreground/20 text-primary-foreground">
                          Active
                        </Badge>
                      )}
                    </div>
                    <span className={`text-[10px] block mt-0.5 font-normal ${labelFormat === fmt.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {fmt.desc}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Options Checkboxes */}
            <div className="space-y-2.5 pt-0.5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-store-name"
                  checked={showStoreName}
                  onCheckedChange={(checked) => setShowStoreName(Boolean(checked))}
                />
                <Label
                  htmlFor="show-store-name"
                  className="text-xs font-medium text-foreground cursor-pointer select-none leading-none"
                >
                  Include Store Name ({shopName})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-price"
                  checked={showPrice}
                  onCheckedChange={(checked) => setShowPrice(Boolean(checked))}
                />
                <Label
                  htmlFor="show-price"
                  className="text-xs font-medium text-foreground cursor-pointer select-none leading-none"
                >
                  Include Retail Price & Tax badge
                </Label>
              </div>
            </div>
          </div>

          {/* Right Sheet Preview Area */}
          <div className="flex-1 bg-muted/30 p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
            <div className="mb-3 text-center">
              <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold py-1 px-3 bg-card border-border shadow-2xs">
                Live Print Layout Preview ({totalStickersToRender} Sticker{totalStickersToRender > 1 ? 's' : ''})
              </Badge>
            </div>

            {/* Printable Canvas */}
            <Card
              id="printable-barcode-sheet"
              className={`bg-card shadow-sm border-border p-4 transition-all ${
                labelFormat === 'thermal-single'
                  ? 'w-64'
                  : labelFormat === 'a4-24'
                  ? 'w-full max-w-2xl grid grid-cols-3 gap-2.5'
                  : 'w-full max-w-2xl grid grid-cols-4 gap-2'
              }`}
            >
              <CardContent className="p-0 col-span-full contents">
                {Array.from({ length: totalStickersToRender }).map((_, idx) => (
                  <div
                    key={idx}
                    className="border border-dashed border-border/80 p-2 rounded-lg flex flex-col items-center justify-between text-center bg-card shadow-2xs"
                    style={{ minHeight: '105px' }}
                  >
                    {showStoreName && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-full">
                        {shopName}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-foreground leading-tight line-clamp-1">
                      {productName}
                    </span>

                    <div className="w-full my-0.5">
                      {renderSvgBarcode(barcodeValue)}
                    </div>

                    <div className="w-full flex items-center justify-between px-1 text-[10px] font-semibold text-foreground">
                      <span className="text-[9px] text-muted-foreground font-mono">{skuValue}</span>
                      {showPrice && (
                        <span className="text-xs font-bold text-foreground tabular-nums">
                          {currencySymbol}{priceValue.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="mt-4 flex items-center gap-2">
              <Button
                onClick={handlePrint}
                className="gap-2 font-semibold text-xs h-9 shadow-xs cursor-pointer"
              >
                <Printer className="size-4" />
                <span>Send to Sticker Printer</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
