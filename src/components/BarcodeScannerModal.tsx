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
  ShoppingBag,
  Sparkles,
  Upload,
  Copy,
  CheckCheck,
  Flashlight,
  FlashlightOff,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CatalogItem, BillItem, PackagingOption } from '../types';
import { resolveBarcodeMatch } from '../utils/barcodeResolver';
import { posSound } from '../utils/sound';

export type ScannerMode = 'add-to-bill' | 'price-check' | 'search';

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  catalog: CatalogItem[];
  currencySymbol: string;
  initialMode?: ScannerMode;
  mode?: ScannerMode;
  onClose: () => void;
  onItemScannedAndAdd?: (item: CatalogItem, pack?: PackagingOption | null) => void;
  onAddScannedItem?: (item: CatalogItem, pack?: PackagingOption | null) => void;
  onItemScannedAndSearch?: (item: CatalogItem) => void;
  onSearchItem?: (item: CatalogItem) => void;
  onRegisterNewBarcode?: (scannedCode: string) => void;
  onRegisterBarcode?: (scannedCode: string) => void;
  onAddCustomBillItem?: (item: BillItem) => void;
  billItemCount?: number;
  billTotal?: number;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  catalog,
  currencySymbol,
  initialMode = 'add-to-bill',
  mode: propMode,
  onClose,
  onItemScannedAndAdd,
  onAddScannedItem,
  onItemScannedAndSearch,
  onSearchItem,
  onRegisterNewBarcode,
  onRegisterBarcode,
  onAddCustomBillItem,
  billItemCount = 0,
  billTotal = 0,
}) => {
  const activeInitialMode = propMode || initialMode;
  const [currentMode, setCurrentMode] = useState<ScannerMode>(activeInitialMode);
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');
  const [unrecognizedPromptCode, setUnrecognizedPromptCode] = useState<string | null>(null);

  const [lastScannedResult, setLastScannedResult] = useState<{
    code: string;
    item: CatalogItem | null;
    displayName?: string;
    packName?: string;
    price?: number;
    timestamp: number;
    actionTaken: string;
  } | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-barcode-qr-reader';
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addItemCallback = onAddScannedItem || onItemScannedAndAdd;
  const searchItemCallback = onSearchItem || onItemScannedAndSearch;
  const registerBarcodeCallback = onRegisterBarcode || onRegisterNewBarcode;

  // Sync mode when modal opens or prop changes
  useEffect(() => {
    if (isOpen) {
      setCurrentMode(propMode || initialMode);
      setLastScannedResult(null);
      setManualCode('');
      setCustomPriceInput('');
      setCameraError(null);
      setUnrecognizedPromptCode(null);
    }
  }, [isOpen, propMode, initialMode]);

  // Main Handler when a barcode/QR code is detected
  const handleCodeDetected = (decodedText: string) => {
    const cleanText = decodedText.trim();
    if (!cleanText) return;

    const now = Date.now();
    // Debounce duplicate scans within 1.2 seconds if identical
    if (
      cleanText === lastScannedCodeRef.current &&
      now - lastScannedTimeRef.current < 1200
    ) {
      return;
    }

    lastScannedCodeRef.current = cleanText;
    lastScannedTimeRef.current = now;

    const match = resolveBarcodeMatch(cleanText, catalog);

    if (match) {
      posSound.playBeep();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(60);
        } catch {}
      }

      if (currentMode === 'add-to-bill') {
        if (addItemCallback) {
          addItemCallback(match.item, match.pack);
        }
        setLastScannedResult({
          code: cleanText,
          item: match.item,
          displayName: match.displayName,
          packName: match.packName,
          price: match.unitPrice,
          timestamp: now,
          actionTaken: match.packName
            ? `Added 1x ${match.displayName} (${currencySymbol}${match.unitPrice}) to Bill`
            : `Added 1 unit of ${match.item.name} (${currencySymbol}${match.unitPrice}) to Bill`,
        });
      } else if (currentMode === 'search') {
        if (searchItemCallback) {
          searchItemCallback(match.item);
          onClose();
        }
      } else {
        // Price check mode
        setLastScannedResult({
          code: cleanText,
          item: match.item,
          displayName: match.displayName,
          packName: match.packName,
          price: match.unitPrice,
          timestamp: now,
          actionTaken: `${match.displayName} - ${currencySymbol}${match.unitPrice.toFixed(2)} (Stock: ${match.item.stock ?? 'N/A'})`,
        });
      }
    } else {
      // Code not in catalog
      posSound.playBuzzer();
      setLastScannedResult({
        code: cleanText,
        item: null,
        timestamp: now,
        actionTaken: `Unrecognized Barcode: ${cleanText}`,
      });
      // Prompt user to add to POS
      setUnrecognizedPromptCode(cleanText);
    }
  };

  // Helper to ensure video element plays inline with correct attributes on iOS Safari
  const enforceVideoPlayback = () => {
    const container = document.getElementById(scannerContainerId);
    if (!container) return;
    const video = container.querySelector('video');
    if (video) {
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('muted', 'true');
      video.style.setProperty('width', '100%', 'important');
      video.style.setProperty('height', '100%', 'important');
      video.style.setProperty('object-fit', 'cover', 'important');
      video.style.setProperty('border-radius', '0.75rem', 'important');
      video.style.setProperty('display', 'block', 'important');
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  };

  // Start Camera Scanner with iOS Safari & Android mobile optimization
  const startCameraScanner = async (targetFacing?: 'environment' | 'user') => {
    setCameraError(null);
    setTorchOn(false);
    const modeToUse = targetFacing || facingMode;

    try {
      // Clean up previous instance
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch {
          // ignore cleanup errors
        }
        scannerRef.current = null;
      }

      const containerEl = document.getElementById(scannerContainerId);
      if (!containerEl) {
        console.warn('Scanner DOM container not mounted yet');
        return;
      }

      // Initialize Html5Qrcode with extensive format support
      // Note: useBarCodeDetectorIfSupported is set to false because on iOS 17+ Safari's native
      // BarcodeDetector throws a TypeError when given 1D formats (EAN-13, Code 128, etc.), which
      // freezes the camera feed into a black frame. ZXing decodes both 1D and 2D reliably on iOS/Android.
      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false,
        },
      });
      scannerRef.current = html5QrCode;

      // Safe responsive qrbox that never exceeds viewfinder boundaries
      const scanConfig = {
        fps: 24,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = Math.floor(viewfinderWidth * 0.82);
          const h = Math.floor(viewfinderHeight * 0.65);
          return {
            width: Math.max(50, Math.min(w, viewfinderWidth - 10)),
            height: Math.max(50, Math.min(h, viewfinderHeight - 10)),
          };
        },
      };

      const onScanSuccess = (decodedText: string) => {
        handleCodeDetected(decodedText);
      };

      const onScanFailure = () => {
        // Continuous frame analysis - silently ignore unreadable frames
      };

      // Start stream with requested facingMode
      try {
        await html5QrCode.start({ facingMode: modeToUse }, scanConfig, onScanSuccess, onScanFailure);
        setFacingMode(modeToUse);
      } catch (modeErr) {
        console.warn(`Starting camera with ${modeToUse} failed, trying fallback:`, modeErr);
        const altMode = modeToUse === 'environment' ? 'user' : 'environment';
        await html5QrCode.start({ facingMode: altMode }, scanConfig, onScanSuccess, onScanFailure);
        setFacingMode(altMode);
      }

      setCameraActive(true);
      setIsScanning(true);

      // Force playsinline and inline attributes to prevent black screen in WebKit/Safari
      enforceVideoPlayback();
      setTimeout(enforceVideoPlayback, 150);
      setTimeout(enforceVideoPlayback, 400);

      // Check if torch/flashlight is supported on this camera track
      try {
        const capabilities = (html5QrCode as any).getRunningTrackCapabilities?.();
        if (capabilities && Boolean(capabilities.torch)) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }
      } catch {
        setTorchSupported(false);
      }

      // Query devices for multiple camera options if needed
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
        }
      } catch {
        // Enumerate error is non-fatal
      }
    } catch (err: unknown) {
      console.warn('Camera scanner startup error:', err);
      let errMsg = 'Unable to access camera. Check browser permissions.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.toLowerCase().includes('permission')) {
          errMsg = 'Camera permission denied. Please allow camera access in your phone browser settings.';
        } else if (err.name === 'NotFoundError' || err.message.toLowerCase().includes('not found')) {
          errMsg = 'No video camera detected on this device.';
        } else if (err.name === 'NotReadableError' || err.message.toLowerCase().includes('in use')) {
          errMsg = 'Camera is in use by another app or browser tab. Please close other camera apps and retry.';
        } else {
          errMsg = err.message || errMsg;
        }
      }
      setCameraError(errMsg);
      setCameraActive(false);
      setIsScanning(false);
    }
  };

  // Toggle front/back camera
  const handleToggleCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCameraScanner(nextMode);
  };

  // Toggle flashlight / torch
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      const nextTorch = !torchOn;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Failed to toggle torch:', e);
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
    setTorchOn(false);
    setCameraActive(false);
    setIsScanning(false);
  };

  // Manage camera lifecycle when modal opens/closes
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      // Delay camera initialization slightly for DOM mounting
      timer = setTimeout(() => {
        startCameraScanner();
      }, 250);
    } else {
      stopCameraScanner();
    }
    return () => {
      clearTimeout(timer);
      stopCameraScanner();
    };
  }, [isOpen]);

  // Handle Photo / Image File Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsFileProcessing(true);
      setCameraError(null);

      // Stop camera if running so container is clear
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        setCameraActive(false);
      }

      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.AZTEC,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, /* showImage= */ true);
      handleCodeDetected(decodedText);
    } catch (err) {
      console.warn('File decode error:', err);
      setCameraError('No barcode or QR code detected in this photo. Try another image.');
    } finally {
      setIsFileProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle manual submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeDetected(manualCode.trim());
    setManualCode('');
  };

  // Handle adding an unrecognized code as a quick custom item
  const handleAddAsCustomItem = () => {
    if (!lastScannedResult?.code) return;
    const price = parseFloat(customPriceInput) || 0;
    if (onAddCustomBillItem) {
      onAddCustomBillItem({
        id: `custom-scan-${Date.now()}`,
        itemId: `custom-${lastScannedResult.code}`,
        name: `Scanned Item (${lastScannedResult.code.slice(0, 12)})`,
        unitPrice: price,
        quantity: 1,
      });
      posSound.playAdd();
      setLastScannedResult(null);
      setCustomPriceInput('');
      onClose();
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border-0 sm:border border-slate-200 rounded-none sm:rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[94vh] text-slate-900">
        {/* Modal Top Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Barcode & QR Scanner
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                Live camera • Photo upload • USB Laser Gun • Manual SKU
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setCurrentMode('add-to-bill')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              currentMode === 'add-to-bill'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Scan & Add to Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentMode('price-check')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              currentMode === 'price-check'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Check Price & Info</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentMode('search')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              currentMode === 'search'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Scan to Filter Menu</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#F8FAFC]">
          {/* Camera Viewfinder Box */}
          <div className="bg-slate-950 rounded-xl overflow-hidden relative shadow-inner border border-slate-800 flex flex-col items-center justify-center min-h-[220px] max-h-[280px]">
            {/* HTML5 QR Container */}
            <div
              id={scannerContainerId}
              className="w-full h-full min-h-[220px] max-h-[280px] flex items-center justify-center overflow-hidden relative [&_video]:!w-full [&_video]:!h-full [&_video]:!max-h-[280px] [&_video]:!object-cover [&_video]:!rounded-xl [&_video]:!block [&_#qr-shaded-region]:!hidden"
            ></div>

            {/* Overlaid Animated Targeting Reticle */}
            {cameraActive && isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                <div className="w-52 h-36 border-2 border-primary rounded-xl relative shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-pulse">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-3 border-l-3 border-primary rounded-tl"></div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-3 border-r-3 border-primary rounded-tr"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-3 border-l-3 border-primary rounded-bl"></div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-3 border-r-3 border-primary rounded-br"></div>
                  {/* Red Laser Scan Line */}
                  <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-bounce"></div>
                </div>
                <span className="mt-2 bg-black/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-white/20">
                  Align Barcode or QR Code
                </span>
              </div>
            )}

            {/* Fallback / Error State */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/95 p-4 flex flex-col items-center justify-center text-center text-white gap-2 z-20">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <p className="text-xs font-bold text-slate-100">{cameraError}</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Tip: You can upload a photo of the QR code, use a USB laser gun, or enter the SKU below.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => startCameraScanner(facingMode)}
                    className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-card text-foreground hover:bg-muted text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs border border-border"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>Upload Photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Camera Controls Overlay: Torch, Switch Camera & Upload Photo */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
              {torchSupported && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`text-white text-[10px] px-2 py-1 rounded-md font-bold border backdrop-blur-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all ${
                    torchOn
                      ? 'bg-amber-500 border-amber-400 text-black'
                      : 'bg-black/75 hover:bg-black border-white/20'
                  }`}
                  title={torchOn ? 'Turn off Torch' : 'Turn on Torch / Flashlight'}
                >
                  {torchOn ? <Flashlight className="w-3 h-3 text-black" /> : <FlashlightOff className="w-3 h-3" />}
                  <span>{torchOn ? 'Torch On' : 'Torch'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleCamera}
                className="bg-black/75 hover:bg-black text-white text-[10px] px-2 py-1 rounded-md font-bold border border-white/20 backdrop-blur-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                title={facingMode === 'environment' ? 'Switch to Front Camera' : 'Switch to Back Camera'}
              >
                <Camera className="w-3 h-3" />
                <span>{facingMode === 'environment' ? 'Front' : 'Back'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isFileProcessing}
                className="bg-black/75 hover:bg-black text-white text-[10px] px-2 py-1 rounded-md font-bold border border-white/20 backdrop-blur-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                title="Scan QR Code from Photo"
              >
                <Upload className="w-3 h-3" />
                <span>{isFileProcessing ? 'Scanning...' : 'Photo'}</span>
              </button>
            </div>

            {/* Hidden file input for Photo/Image QR scan */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* New Product Detected Prompt Overlay */}
            {unrecognizedPromptCode && (
              <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in-95">
                <div className="w-11 h-11 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-2 shadow-inner">
                  <Barcode className="w-5 h-5" />
                </div>
                <h4 className="text-white text-sm font-extrabold tracking-wide">
                  New Product Detected
                </h4>
                <p className="text-slate-300 text-xs mt-1 max-w-[280px]">
                  Barcode <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-sm">{unrecognizedPromptCode}</span> is not in your POS catalog.
                </p>
                <div className="flex items-center gap-2 mt-3.5 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const code = unrecognizedPromptCode;
                      setUnrecognizedPromptCode(null);
                      if (registerBarcodeCallback) {
                        registerBarcodeCallback(code);
                        onClose();
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add to POS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnrecognizedPromptCode(null)}
                    className="py-2 px-3 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-medium rounded-lg cursor-pointer active:scale-95 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Manual Input / Hardware Scanner Form */}
          <form
            onSubmit={handleManualSubmit}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs"
          >
            <Barcode className="w-5 h-5 text-slate-400 ml-1.5 shrink-0" />
            <input
              type="text"
              placeholder="Enter or scan Barcode / SKU / QR text..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full text-xs text-slate-900 placeholder-slate-400 bg-transparent focus:outline-hidden "
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 shrink-0"
            >
              Lookup
            </button>
          </form>

          {/* Real-time Scan Result Card */}
          {lastScannedResult && (
            <div
              className={`p-3 rounded-xl border transition-all ${
                lastScannedResult.item
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-amber-50/80 border-amber-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      lastScannedResult.item
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {lastScannedResult.item ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-900 truncate max-w-[200px]">
                        {lastScannedResult.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(lastScannedResult.code)}
                        className="text-slate-500 hover:text-slate-800 p-0.5 rounded cursor-pointer"
                        title="Copy code"
                      >
                        {copiedCode ? (
                          <CheckCheck className="w-3 h-3 text-primary" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                          lastScannedResult.item
                            ? 'bg-primary/20 text-primary'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {lastScannedResult.actionTaken}
                      </span>
                    </div>

                    {lastScannedResult.item && (
                      <div className="mt-1 flex items-baseline gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {lastScannedResult.item.name}
                        </h4>
                        <span className="text-xs font-extrabold text-primary">
                          {currencySymbol}
                          {lastScannedResult.item.price.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({lastScannedResult.item.category})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {lastScannedResult.item && currentMode !== 'add-to-bill' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (addItemCallback && lastScannedResult.item) {
                          addItemCallback(lastScannedResult.item);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}

                  {!lastScannedResult.item && registerBarcodeCallback && (
                    <button
                      type="button"
                      onClick={() => {
                        registerBarcodeCallback(lastScannedResult.code);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Register Item</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Unrecognized item: Quick Add to Bill as Custom Item option */}
              {!lastScannedResult.item && onAddCustomBillItem && (
                <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center gap-2">
                  <span className="text-[11px] font-medium text-amber-900">Quick Add to Bill:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center border border-slate-300 rounded-lg bg-white px-2 py-0.5">
                      <span className="text-xs font-bold text-slate-500">{currencySymbol}</span>
                      <input
                        type="number"
                        placeholder="Price"
                        value={customPriceInput}
                        onChange={(e) => setCustomPriceInput(e.target.value)}
                        className="w-16 text-xs font-bold text-slate-900 focus:outline-hidden ml-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAsCustomItem}
                      disabled={!customPriceInput || parseFloat(customPriceInput) <= 0}
                      className="px-2.5 py-1 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Add to Bill
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Demo Simulator Barcode Chips (Instant testing - Development only) */}
          {((typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || Boolean(import.meta.env?.DEV)) && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Instant Test Barcodes & QR Codes</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  Tap any product to simulate scan
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {catalog.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCodeDetected(item.barcode || item.sku || item.name)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-[11px] font-bold text-slate-900 truncate">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between mt-0.5 text-[10px] text-slate-500">
                      <span className="truncate max-w-[80px]">{item.barcode || item.sku || 'SKU'}</span>
                      <span className="font-bold text-slate-900">
                        {currencySymbol}
                        {item.price}
                      </span>
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleCodeDetected('8901063012480')}
                  className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 active:scale-95 border border-primary/20 text-left transition-all cursor-pointer flex flex-col justify-between"
                  title="Simulate scanning an unrecognized barcode (Bourbon Biscuit)"
                >
                  <span className="text-xs font-bold text-foreground truncate flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary shrink-0" />
                    <span>Unknown EAN Scan</span>
                  </span>
                  <div className="flex items-center justify-between mt-0.5 text-xs text-primary">
                    <span className="truncate">8901063012480</span>
                    <span className="font-bold">Lookup</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-3 sm:px-4 sm:py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              <span className="hidden sm:inline">Laser & Bluetooth barcode guns auto-detected</span>
            </div>
            {billItemCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                <span>In Bill:</span>
                <span className="font-extrabold">{billItemCount} items • {currencySymbol}{billTotal.toFixed(2)}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-scanner-done"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-1.5 rounded-xl sm:rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm cursor-pointer shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Done Scanning</span>
              <span className="opacity-75">•</span>
              <span>Back to Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
