import React, { useState } from 'react';
import { X, Printer, Barcode as BarcodeIcon, Tag, Sliders, Check, Copy, Sparkles } from 'lucide-react';
import { CatalogItem } from '../types';

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

  React.useEffect(() => {
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
  
  // Format options
  const [labelFormat, setLabelFormat] = useState<'thermal-single' | 'a4-24' | 'a4-40'>('thermal-single');
  const [printQuantity, setPrintQuantity] = useState<number>(24);
  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
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
    // Generate deterministic pattern of bars from the string
    const bars: { width: number; isBlack: boolean }[] = [];
    // Start code
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
    // Stop code
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
        className="w-full h-12 max-h-12"
        preserveAspectRatio="xMidYMid meet"
      >
        {svgElements}
        <text
          x={totalWidth / 2}
          y={46}
          textAnchor="middle"
          fontSize="10"
          fontFamily="inherit"
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
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl bg-card text-card-foreground rounded-xl border border-border shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight">
                Product Barcode Label Generator
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Thermal Roll (50x25mm) & A4 Sticker Sheet Printing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Stickers</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout: Left Controls, Right Preview */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Controls Column */}
          <div className="w-full md:w-80 border-r border-zinc-200 bg-zinc-50 p-4 overflow-y-auto space-y-4">
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                Select Product from Catalog
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-hidden focus:border-zinc-900"
              >
                <option value="">-- Custom Sticker --</option>
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({currencySymbol}{item.price})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-zinc-600 block mb-1">Product Title</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1">MRP / Price ({currencySymbol})</label>
                  <input
                    type="number"
                    value={priceValue}
                    onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={skuValue}
                    onChange={(e) => setSkuValue(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-zinc-600">Barcode (EAN-13 / Code128)</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomBarcode}
                    className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Gen
                  </button>
                </div>
                <input
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800 tracking-wider"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 space-y-2.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                Paper / Sticker Sheet Format
              </label>

              <div className="space-y-1.5">
                {[
                  { id: 'thermal-single', name: 'Thermal Roll (Single 50x25mm)', desc: '1 sticker for thermal label printer' },
                  { id: 'a4-24', name: 'A4 Sheet: 24 Labels (3x8 Grid)', desc: 'Standard Avery / Tally sticker sheet' },
                  { id: 'a4-40', name: 'A4 Sheet: 40 Labels (4x10 Grid)', desc: 'Compact retail grocery labels' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setLabelFormat(fmt.id as any)}
                    className={`w-full p-2 rounded-xl border text-left cursor-pointer transition-all ${
                      labelFormat === fmt.id
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-2xs'
                        : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="text-xs font-bold block">{fmt.name}</span>
                    <span className={`text-[10px] ${labelFormat === fmt.id ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {fmt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900"
                />
                <span>Include Store Name ({shopName})</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900"
                />
                <span>Include Retail Price & Tax badge</span>
              </label>
            </div>
          </div>

          {/* Right Sheet Preview Area */}
          <div className="flex-1 bg-zinc-200 p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
            <div className="mb-2 text-center">
              <span className="text-xs font-extrabold text-zinc-600 uppercase tracking-wider">
                Live Print Layout Preview ({totalStickersToRender} Sticker{totalStickersToRender > 1 ? 's' : ''})
              </span>
            </div>

            {/* Printable Canvas */}
            <div
              id="printable-barcode-sheet"
              className={`bg-white shadow-xl rounded-xl p-4 border border-zinc-300 transition-all ${
                labelFormat === 'thermal-single'
                  ? 'w-64'
                  : labelFormat === 'a4-24'
                  ? 'w-full max-w-2xl grid grid-cols-3 gap-2.5'
                  : 'w-full max-w-2xl grid grid-cols-4 gap-2'
              }`}
            >
              {Array.from({ length: totalStickersToRender }).map((_, idx) => (
                <div
                  key={idx}
                  className="border border-dashed border-zinc-300 p-2 rounded-lg flex flex-col items-center justify-between text-center bg-white"
                  style={{ minHeight: '105px' }}
                >
                  {showStoreName && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-700 truncate max-w-full">
                      {shopName}
                    </span>
                  )}
                  <span className="text-[11px] font-black text-zinc-900 leading-tight line-clamp-1">
                    {productName}
                  </span>

                  <div className="w-full my-0.5">
                    {renderSvgBarcode(barcodeValue)}
                  </div>

                  <div className="w-full flex items-center justify-between px-1 text-[10px] font-bold text-zinc-800">
                    <span className="text-[9px] text-zinc-500">{skuValue}</span>
                    {showPrice && (
                      <span className="text-xs font-black text-zinc-950">
                        {currencySymbol}{priceValue.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Send to Sticker Printer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
