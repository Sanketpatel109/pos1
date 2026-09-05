import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  Camera,
  Search,
  Tag,
  Plus,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Keyboard,
  Barcode,
  QrCode,
  Zap,
  ShoppingBag,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { CatalogItem } from '../types';

export type ScannerMode = 'add-to-bill' | 'price-check' | 'search';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  catalog: CatalogItem[];
  currencySymbol: string;
  initialMode?: ScannerMode;
  onClose: () => void;
  onItemScannedAndAdd?: (item: CatalogItem) => void;
  onItemScannedAndSearch?: (item: CatalogItem) => void;
  onRegisterNewBarcode?: (scannedCode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  catalog,
  currencySymbol,
  initialMode = 'add-to-bill',
  onClose,
  onItemScannedAndAdd,
  onItemScannedAndSearch,
  onRegisterNewBarcode,
}) => {
  const [mode, setMode] = useState<ScannerMode>(initialMode);
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScannedResult, setLastScannedResult] = useState<{
    code: string;
    item: CatalogItem | null;
    timestamp: number;
    actionTaken: string;
  } | null>(null);
  const [inspectedItem, setInspectedItem] = useState<CatalogItem | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-barcode-qr-reader';
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Sync mode when initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLastScannedResult(null);
      setInspectedItem(null);
      setManualCode('');
    }
  }, [isOpen, initialMode]);

  // Lookup helper function
  const findProductByCode = (code: string): CatalogItem | undefined => {
    const clean = code.trim().toLowerCase();
    return catalog.find(
      (item) =>
        (item.barcode && item.barcode.toLowerCase() === clean) ||
        (item.sku && item.sku.toLowerCase() === clean) ||
        item.id.toLowerCase() === clean ||
        item.name.toLowerCase() === clean
    );
  };

  // Main Handler when a barcode/QR code is detected
  const handleCodeDetected = (decodedText: string) => {
    const now = Date.now();
    // Debounce duplicate scans within 1.5 seconds if identical
    if (
      decodedText === lastScannedCodeRef.current &&
      now - lastScannedTimeRef.current < 1500
    ) {
      return;
    }

    lastScannedCodeRef.current = decodedText;
    lastScannedTimeRef.current = now;

    const matchedItem = findProductByCode(decodedText);

    if (matchedItem) {
      setInspectedItem(matchedItem);

      if (mode === 'add-to-bill') {
        if (onItemScannedAndAdd) {
          onItemScannedAndAdd(matchedItem);
        }
        setLastScannedResult({
          code: decodedText,
          item: matchedItem,
          timestamp: now,
          actionTaken: 'Added 1 unit to active bill',
        });
      } else if (mode === 'search') {
        if (onItemScannedAndSearch) {
          onItemScannedAndSearch(matchedItem);
          onClose();
        }
      } else {
        // Price check mode
        setLastScannedResult({
          code: decodedText,
          item: matchedItem,
          timestamp: now,
          actionTaken: 'Price & details retrieved',
        });
      }
    } else {
      setInspectedItem(null);
      setLastScannedResult({
        code: decodedText,
        item: null,
        timestamp: now,
        actionTaken: 'Barcode not found in catalog',
      });
    }
  };

  // Start Camera Scanner
  const startCameraScanner = async (cameraId?: string) => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setAvailableCameras(devices);
        const camToUse = cameraId || devices[devices.length - 1].id; // default back camera if available
        setSelectedCameraId(camToUse);

        await html5QrCode.start(
          camToUse,
          {
            fps: 15,
            qrbox: { width: 250, height: 180 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleCodeDetected(decodedText);
          },
          () => {
            // Frame error ignore
          }
        );
        setCameraActive(true);
        setIsScanning(true);
      } else {
        setCameraError('No camera devices detected on this device.');
      }
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      const errMsg =
        err instanceof Error ? err.message : 'Unable to access camera. Check browser permissions.';
      setCameraError(errMsg);
      setCameraActive(false);
      setIsScanning(false);
    }
  };

  // Stop Camera Scanner
  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Scanner stop error:', e);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
    setIsScanning(false);
  };

  // Manage camera lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Delay camera initialization slightly for DOM mounting
      const timer = setTimeout(() => {
        startCameraScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopCameraScanner();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Handle manual submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeDetected(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#d4d4d8] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#1c1b1d]">
        {/* Modal Top Header */}
        <div className="px-4 py-3.5 border-b border-[#d4d4d8] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#18181b] text-white flex items-center justify-center shadow-xs">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#1c1b1d] tracking-tight">
                Barcode & QR Scanner
              </h2>
              <p className="text-[10px] text-[#77767b] font-medium">
                Live camera scanner • USB barcode reader • Manual SKU lookup
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#77767b] hover:text-[#1c1b1d] hover:bg-[#f0edf0] transition-colors cursor-pointer"
            title="Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-4 py-2 bg-[#f6f2f5] border-b border-[#d4d4d8] flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setMode('add-to-bill')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              mode === 'add-to-bill'
                ? 'bg-[#18181b] text-white shadow-xs'
                : 'bg-white text-[#47464b] border border-[#d4d4d8] hover:bg-[#eae7ea]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Scan & Add to Bill</span>
          </button>

          <button
            onClick={() => setMode('price-check')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              mode === 'price-check'
                ? 'bg-[#18181b] text-white shadow-xs'
                : 'bg-white text-[#47464b] border border-[#d4d4d8] hover:bg-[#eae7ea]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Check Price & Info</span>
          </button>

          <button
            onClick={() => setMode('search')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              mode === 'search'
                ? 'bg-[#18181b] text-white shadow-xs'
                : 'bg-white text-[#47464b] border border-[#d4d4d8] hover:bg-[#eae7ea]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Scan to Filter Menu</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fcf8fb] no-scrollbar">
          {/* Camera Viewfinder Box */}
          <div className="bg-black rounded-2xl overflow-hidden relative shadow-inner border border-[#d4d4d8] flex flex-col items-center justify-center min-h-[220px] max-h-[280px]">
            {/* HTML5 QR Container */}
            <div id={scannerContainerId} className="w-full h-full object-cover"></div>

            {/* Overlaid Animated Targeting Reticle */}
            {cameraActive && isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-56 h-36 border-2 border-emerald-400/90 rounded-2xl relative shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-pulse">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br"></div>
                  {/* Red Laser Scan Line */}
                  <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-bounce"></div>
                </div>
                <span className="mt-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-white/20">
                  Align Barcode or QR Code within frame
                </span>
              </div>
            )}

            {/* Fallback / Error State */}
            {cameraError && (
              <div className="absolute inset-0 bg-[#18181b] p-4 flex flex-col items-center justify-center text-center text-white gap-2">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <p className="text-xs font-bold text-zinc-200">{cameraError}</p>
                <p className="text-[11px] text-zinc-400 max-w-xs">
                  You can still use your physical barcode scanner, keyboard, or the demo quick-scan chips below!
                </p>
                <button
                  onClick={() => startCameraScanner()}
                  className="mt-2 px-3 py-1.5 bg-white text-[#18181b] hover:bg-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
              </div>
            )}

            {/* Camera switch / Refresh control bar */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
              {availableCameras.length > 1 && (
                <button
                  onClick={() => {
                    const nextIdx =
                      (availableCameras.findIndex((c) => c.id === selectedCameraId) + 1) %
                      availableCameras.length;
                    startCameraScanner(availableCameras[nextIdx].id);
                  }}
                  className="bg-black/70 hover:bg-black text-white text-[10px] px-2 py-1 rounded-lg font-bold border border-white/20 backdrop-blur-xs flex items-center gap-1 cursor-pointer"
                  title="Switch Camera"
                >
                  <Camera className="w-3 h-3" />
                  <span>Switch</span>
                </button>
              )}
            </div>
          </div>

          {/* Manual Input / Hardware Scanner Form */}
          <form
            onSubmit={handleManualSubmit}
            className="flex items-center gap-2 bg-white border border-[#d4d4d8] rounded-2xl p-2 shadow-2xs"
          >
            <Barcode className="w-5 h-5 text-[#77767b] ml-1.5 shrink-0" />
            <input
              type="text"
              placeholder="Enter or scan Barcode / SKU (e.g. 890103001 or PIZZA-CH7)..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full text-xs text-[#1c1b1d] placeholder-[#77767b] bg-transparent focus:outline-hidden font-mono"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3.5 py-1.5 bg-[#18181b] hover:bg-black disabled:opacity-40 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all active:scale-95 shrink-0"
            >
              Lookup
            </button>
          </form>

          {/* Real-time Scan Result Card */}
          {lastScannedResult && (
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                lastScannedResult.item
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-amber-50/70 border-amber-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      lastScannedResult.item
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {lastScannedResult.item ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-extrabold text-[#1c1b1d] uppercase">
                        Code: {lastScannedResult.code}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                          lastScannedResult.item
                            ? 'bg-emerald-200/70 text-emerald-900'
                            : 'bg-amber-200/70 text-amber-900'
                        }`}
                      >
                        {lastScannedResult.actionTaken}
                      </span>
                    </div>

                    {lastScannedResult.item && (
                      <div className="mt-1 flex items-baseline gap-2">
                        <h4 className="text-sm font-extrabold text-[#1c1b1d]">
                          {lastScannedResult.item.name}
                        </h4>
                        <span className="text-xs font-black font-mono text-emerald-800">
                          {currencySymbol}
                          {lastScannedResult.item.price.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#77767b]">
                          ({lastScannedResult.item.category})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Action Button */}
                {lastScannedResult.item && mode !== 'add-to-bill' && (
                  <button
                    onClick={() => {
                      if (onItemScannedAndAdd && lastScannedResult.item) {
                        onItemScannedAndAdd(lastScannedResult.item);
                      }
                    }}
                    className="px-3 py-1.5 bg-[#18181b] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Bill</span>
                  </button>
                )}

                {!lastScannedResult.item && onRegisterNewBarcode && (
                  <button
                    onClick={() => {
                      onRegisterNewBarcode(lastScannedResult.code);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-[#18181b] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Product</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Demo Simulator Barcode Chips (Great for fast testing) */}
          <div className="bg-white border border-[#d4d4d8] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#1c1b1d] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#18181b]" />
                <span>One-Tap Test Barcodes</span>
              </span>
              <span className="text-[10px] text-[#77767b]">
                Click any item to simulate barcode scan
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {catalog.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCodeDetected(item.barcode || item.sku || item.name)}
                  className="px-2.5 py-2 rounded-xl bg-[#f6f2f5] hover:bg-[#eae7ea] active:scale-95 border border-[#d4d4d8] text-left transition-all cursor-pointer flex flex-col justify-between"
                >
                  <span className="text-[11px] font-bold text-[#1c1b1d] truncate">
                    {item.name}
                  </span>
                  <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-[#77767b]">
                    <span>{item.barcode || item.sku}</span>
                    <span className="font-bold text-[#1c1b1d]">
                      {currencySymbol}
                      {item.price}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="px-4 py-3 bg-white border-t border-[#d4d4d8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-[#77767b]">
            <Keyboard className="w-3.5 h-3.5" />
            <span>USB/Bluetooth Barcode Readers are auto-detected</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#18181b] hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95 shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
