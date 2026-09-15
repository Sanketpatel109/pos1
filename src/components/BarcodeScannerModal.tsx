import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Monitor,
  Smartphone,
  Info,
  SwitchCamera,
  WifiOff,
  ZoomIn,
  Loader2,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CatalogItem, BillItem, PackagingOption } from '../types';
import { resolveBarcodeMatch } from '../utils/barcodeResolver';
import { lookupBarcodeDetails, ProductLookupResult } from '../services/barcodeLookup';
import { posSound } from '../utils/sound';
import {
  getDeviceType,
  isMobileDevice,
  checkCameraPermission,
  isGetUserMediaSupported,
  enumerateCameras,
  releaseAllCameraTracks,
  classifyError,
  getActiveVideoTrack,
  isTorchSupported as checkTorchSupport,
  toggleTorch as applyTorch,
  isZoomSupported,
  applyZoom,
  createHardwareBarcodeDetector,
  detectBarcodeFromImage,
  type CameraPermissionState,
  type CameraInfo,
  type DeviceType,
} from '../utils/cameraCapability';

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

// Supported barcode formats for html5-qrcode
const SUPPORTED_FORMATS = [
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
];

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
  const [cameraErrorType, setCameraErrorType] = useState<string | null>(null);
  const [cameraFixInstructions, setCameraFixInstructions] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');
  const [unrecognizedPromptCode, setUnrecognizedPromptCode] = useState<string | null>(null);
  const [isFetchingOnline, setIsFetchingOnline] = useState<boolean>(false);
  const [fetchedOnlineProduct, setFetchedOnlineProduct] = useState<ProductLookupResult | null>(null);
  const [onlinePriceInput, setOnlinePriceInput] = useState<string>('');
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [showFallbackPanel, setShowFallbackPanel] = useState<boolean>(false);
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionState>('unknown');
  const [retryCount, setRetryCount] = useState<number>(0);

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
  const [zoomSupported, setZoomSupported] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [availableCameras, setAvailableCameras] = useState<CameraInfo[]>([]);
  const [hasMultipleCams, setHasMultipleCams] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-barcode-qr-reader';
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSwitchingCameraRef = useRef<boolean>(false);
  const isScanningRef = useRef<boolean>(false);
  const hardwareTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const addItemCallback = onAddScannedItem || onItemScannedAndAdd;
  const searchItemCallback = onSearchItem || onItemScannedAndSearch;
  const registerBarcodeCallback = onRegisterBarcode || onRegisterNewBarcode;

  // Detect device type on mount
  useEffect(() => {
    setDeviceType(getDeviceType());
  }, []);

  // Sync mode when modal opens or prop changes
  useEffect(() => {
    if (isOpen) {
      setCurrentMode(propMode || initialMode);
      setLastScannedResult(null);
      setManualCode('');
      setCustomPriceInput('');
      setCameraError(null);
      setCameraErrorType(null);
      setCameraFixInstructions(null);
      setUnrecognizedPromptCode(null);
      setIsFetchingOnline(false);
      setFetchedOnlineProduct(null);
      setOnlinePriceInput('');
      setShowFallbackPanel(false);
      setRetryCount(0);
    }
  }, [isOpen, propMode, initialMode]);

  // Main Handler when a barcode/QR code is detected
  const handleCodeDetected = useCallback((decodedText: string) => {
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
      // Code not in local catalog -> Immediately search global product registries!
      posSound.playBuzzer();
      setLastScannedResult({
        code: cleanText,
        item: null,
        timestamp: now,
        actionTaken: `Searching product for ${cleanText}...`,
      });
      setUnrecognizedPromptCode(cleanText);
      setIsFetchingOnline(true);
      setFetchedOnlineProduct(null);
      setOnlinePriceInput('');

      lookupBarcodeDetails(cleanText).then((onlineRes) => {
        setIsFetchingOnline(false);
        if (onlineRes) {
          posSound.playBeep();
          setFetchedOnlineProduct(onlineRes);
          if (onlineRes.suggestedPrice) {
            setOnlinePriceInput(String(onlineRes.suggestedPrice));
          }
          setLastScannedResult({
            code: cleanText,
            item: null,
            displayName: onlineRes.name,
            timestamp: Date.now(),
            actionTaken: `Found: ${onlineRes.name} (${onlineRes.brand || 'Product'})`,
          });
        }
      }).catch(() => {
        setIsFetchingOnline(false);
      });
    }
  }, [catalog, currentMode, currencySymbol, addItemCallback, searchItemCallback, onClose]);

  // Helper to ensure video element plays inline with correct attributes on iOS Safari
  const enforceVideoPlayback = useCallback(() => {
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
  }, []);

  // Start Camera Scanner with iOS Safari & Chrome on iPhone mobile optimization
  const startCameraScanner = useCallback(async (targetFacing?: 'environment' | 'user') => {
    // Prevent concurrent starts
    if (isSwitchingCameraRef.current) return;
    isSwitchingCameraRef.current = true;

    setCameraError(null);
    setCameraErrorType(null);
    setCameraFixInstructions(null);
    setTorchOn(false);
    const modeToUse = targetFacing || facingMode;

    try {
      // Step 1: Check getUserMedia support
      if (!isGetUserMediaSupported()) {
        setCameraError('Camera API not supported in this browser.');
        setCameraErrorType('not-supported');
        setCameraFixInstructions('Use Chrome, Edge, or Safari on HTTPS to access camera, or type barcodes manually below.');
        setCameraActive(false);
        setIsScanning(false);
        isScanningRef.current = false;
        setShowFallbackPanel(true);
        isSwitchingCameraRef.current = false;
        return;
      }

      // Step 2: Clean up previous instance and hardware vision timers
      if (hardwareTimerRef.current) {
        clearInterval(hardwareTimerRef.current);
        hardwareTimerRef.current = null;
      }
      isScanningRef.current = false;

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
      // Nuclear cleanup: release any lingering camera tracks from ALL video elements
      releaseAllCameraTracks();
      // Wait for OS to fully release camera hardware (critical on iOS Safari / Chrome)
      await new Promise((r) => setTimeout(r, 250));

      const containerEl = document.getElementById(scannerContainerId);
      if (!containerEl) {
        console.warn('Scanner DOM container not mounted yet');
        isSwitchingCameraRef.current = false;
        return;
      }

      // Helper: create a fresh Html5Qrcode instance with native BarcodeDetector enabled
      const createScanner = () => new Html5Qrcode(scannerContainerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });

      // 15 FPS: optimal balance of smooth detection and low CPU/battery consumption on mobile
      // Omit qrbox to scan full frame without cropping distortion or dimension crashes
      const scanConfig = {
        fps: 15,
      };

      const onScanSuccess = (decodedText: string) => {
        handleCodeDetected(decodedText);
      };

      const onScanFailure = () => {
        // Silently ignore unreadable frames
      };

      // Helper: fully destroy a scanner instance and release OS camera
      const destroyScanner = async (s: Html5Qrcode | null) => {
        if (!s) return;
        try { if (s.isScanning) await s.stop(); } catch {}
        try { await s.clear(); } catch {}
        releaseAllCameraTracks();
      };

      let startedSuccessfully = false;
      let activeScanner: Html5Qrcode | null = null;

      // Attempt 1: HD resolution with requested facing mode & continuous autofocus
      try {
        activeScanner = createScanner();
        await activeScanner.start(
          {
            facingMode: modeToUse,
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          },
          scanConfig,
          onScanSuccess,
          onScanFailure
        );
        setFacingMode(modeToUse);
        startedSuccessfully = true;
      } catch (err1) {
        console.warn(`Camera HD ${modeToUse} failed:`, err1);
        await destroyScanner(activeScanner);
        activeScanner = null;
        await new Promise((r) => setTimeout(r, 200));
      }

      // Attempt 2: Simple facingMode constraint (fallback for Chrome on iOS / older mobile browsers)
      if (!startedSuccessfully) {
        try {
          activeScanner = createScanner();
          await activeScanner.start({ facingMode: modeToUse }, scanConfig, onScanSuccess, onScanFailure);
          setFacingMode(modeToUse);
          startedSuccessfully = true;
        } catch (err2) {
          console.warn(`Camera simple ${modeToUse} failed:`, err2);
          await destroyScanner(activeScanner);
          activeScanner = null;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Attempt 3: Alternate facing mode (front vs back)
      if (!startedSuccessfully) {
        try {
          const altMode = modeToUse === 'environment' ? 'user' : 'environment';
          activeScanner = createScanner();
          await activeScanner.start({ facingMode: altMode }, scanConfig, onScanSuccess, onScanFailure);
          setFacingMode(altMode);
          startedSuccessfully = true;
        } catch (err3) {
          console.warn('Alternate facing mode failed:', err3);
          await destroyScanner(activeScanner);
          activeScanner = null;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Attempt 4: Use specific deviceId
      if (!startedSuccessfully) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const backCam = cameras.find((c) => /back|rear|environment/i.test(c.label));
            const camToUse = backCam || cameras[0];
            activeScanner = createScanner();
            await activeScanner.start(camToUse.id, scanConfig, onScanSuccess, onScanFailure);
            startedSuccessfully = true;
          }
        } catch (err4) {
          console.warn('DeviceId fallback failed:', err4);
          await destroyScanner(activeScanner);
          activeScanner = null;
        }
      }

      if (!startedSuccessfully || !activeScanner) {
        throw new Error('Could not start any camera stream. Please check browser permissions.');
      }

      scannerRef.current = activeScanner;
      setCameraActive(true);
      setIsScanning(true);
      isScanningRef.current = true;
      setShowFallbackPanel(false);
      setRetryCount(0);

      // Force playsinline and inline attributes for WebKit/Safari
      enforceVideoPlayback();
      setTimeout(enforceVideoPlayback, 100);
      setTimeout(enforceVideoPlayback, 300);
      setTimeout(enforceVideoPlayback, 800);

      // Step 3: Launch Native Hardware Vision Engine (runs in parallel with ZXing for <5ms instant detection)
      createHardwareBarcodeDetector().then((detector) => {
        if (!detector) return;
        const timer = setInterval(async () => {
          if (!isScanningRef.current) return;
          const container = document.getElementById(scannerContainerId);
          const video = container?.querySelector('video');
          if (video && video.readyState >= 2 && !video.paused && video.videoWidth > 0) {
            const result = await detector(video);
            if (result && result.rawValue) {
              handleCodeDetected(result.rawValue);
            }
          }
        }, 75);
        hardwareTimerRef.current = timer;
      });

      // Step 4: Check Torch and Digital Zoom capabilities
      setTimeout(() => {
        const track = getActiveVideoTrack(scannerContainerId);
        setTorchSupported(checkTorchSupport(track));
        const hasZoom = isZoomSupported(track);
        setZoomSupported(hasZoom);
        setZoomLevel(1);
      }, 500);

      // Step 5: Enumerate cameras for toggle button
      try {
        const cameras = await enumerateCameras();
        if (cameras.length > 0) {
          setAvailableCameras(cameras);
          setHasMultipleCams(cameras.length > 1);
        }
      } catch {}
    } catch (err: unknown) {
      console.warn('Camera scanner startup error:', err);
      const errResult = classifyError(err);
      setCameraError(errResult.error || 'Unable to access camera.');
      setCameraErrorType(errResult.errorType || 'unknown');
      setCameraFixInstructions(errResult.fixInstructions || null);
      setCameraActive(false);
      setIsScanning(false);
      isScanningRef.current = false;
      setShowFallbackPanel(true);

      // Auto-retry once after 2.5 seconds if transient
      if (retryCount < 1) {
        retryTimerRef.current = setTimeout(() => {
          setRetryCount((c) => c + 1);
          startCameraScanner(targetFacing);
        }, 2500);
      }
    } finally {
      isSwitchingCameraRef.current = false;
    }
  }, [facingMode, handleCodeDetected, enforceVideoPlayback, retryCount]);

  // Toggle front/back camera (race-condition safe)
  const handleToggleCamera = useCallback(async () => {
    if (isSwitchingCameraRef.current) return;
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCameraScanner(nextMode);
  }, [facingMode, startCameraScanner]);

  // Toggle flashlight / torch (using proper track API)
  const handleToggleTorch = useCallback(async () => {
    const track = getActiveVideoTrack(scannerContainerId);
    if (!track) return;

    const nextTorch = !torchOn;
    const result = await applyTorch(track, nextTorch);
    if (result !== null) {
      setTorchOn(result);
    }
  }, [torchOn]);

  // Toggle digital zoom (1x / 2x for small product barcodes)
  const handleToggleZoom = useCallback(async () => {
    const track = getActiveVideoTrack(scannerContainerId);
    if (!track) return;

    const nextZoom = zoomLevel === 1 ? 2 : 1;
    const ok = await applyZoom(track, nextZoom);
    if (ok) {
      setZoomLevel(nextZoom);
    }
  }, [zoomLevel]);

  // Stop Camera Scanner with explicit track cleanup
  const stopCameraScanner = useCallback(async () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (hardwareTimerRef.current) {
      clearInterval(hardwareTimerRef.current);
      hardwareTimerRef.current = null;
    }
    isScanningRef.current = false;

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
    releaseAllCameraTracks();
    setTorchOn(false);
    setZoomLevel(1);
    setCameraActive(false);
    setIsScanning(false);
  }, []);

  // Manage camera lifecycle when modal opens/closes
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      timer = setTimeout(() => {
        startCameraScanner();
      }, 300);
    } else {
      stopCameraScanner();
    }
    return () => {
      clearTimeout(timer);
      stopCameraScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle Photo / Image File Scan with Hardware Vision + ZXing fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsFileProcessing(true);
      setCameraError(null);
      setCameraErrorType(null);
      setCameraFixInstructions(null);

      // Stop camera if running so container is clear
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        setCameraActive(false);
      }
      if (hardwareTimerRef.current) {
        clearInterval(hardwareTimerRef.current);
        hardwareTimerRef.current = null;
      }
      isScanningRef.current = false;

      // Method 1: Try Native Hardware BarcodeDetector on uploaded image
      try {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const detected = await detectBarcodeFromImage(img);
        URL.revokeObjectURL(objectUrl);
        if (detected) {
          handleCodeDetected(detected);
          setIsFileProcessing(false);
          if (e.target) e.target.value = '';
          return;
        }
      } catch (e) {
        console.warn('Image hardware detector error:', e);
      }

      // Method 2: Fallback to Html5Qrcode.scanFile
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, /* showImage= */ true);
      handleCodeDetected(decodedText);
    } catch (err) {
      console.warn('File decode error:', err);
      setCameraError('No barcode or QR code detected in this photo. Try another image or enter manually below.');
      setCameraErrorType('unknown');
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

  // Focus manual input when fallback is shown
  useEffect(() => {
    if (showFallbackPanel && manualInputRef.current) {
      setTimeout(() => manualInputRef.current?.focus(), 200);
    }
  }, [showFallbackPanel]);

  if (!isOpen) return null;

  const isPhone = deviceType === 'phone';
  const isDesktop = deviceType === 'desktop';

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
                {isDesktop
                  ? 'USB Scanner • Photo upload • Manual SKU'
                  : 'Live camera • Photo upload • USB Laser Gun • Manual SKU'}
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
              className="w-full h-full min-h-[220px] max-h-[280px] flex items-center justify-center overflow-hidden relative [&_video]:!w-full [&_video]:!h-full [&_video]:!max-h-[280px] [&_video]:!object-cover [&_video]:!rounded-xl [&_video]:!block [&#qr-shaded-region]:!hidden"
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

            {/* ============================================================ */}
            {/* COMPREHENSIVE FALLBACK / ERROR STATE                         */}
            {/* ============================================================ */}
            {(cameraError || (showFallbackPanel && !cameraActive)) && (
              <div className="absolute inset-0 bg-slate-900/95 p-4 flex flex-col items-center justify-center text-center text-white gap-2 z-20">
                {/* Error icon */}
                {cameraErrorType === 'not-found' ? (
                  <div className="w-11 h-11 rounded-full bg-slate-700/80 flex items-center justify-center">
                    {isDesktop ? <Monitor className="w-5 h-5 text-slate-300" /> : <Smartphone className="w-5 h-5 text-slate-300" />}
                  </div>
                ) : cameraErrorType === 'permission-denied' ? (
                  <div className="w-11 h-11 rounded-full bg-red-500/20 flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-red-400" />
                  </div>
                ) : (
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                )}

                {/* Error message */}
                <p className="text-xs font-bold text-slate-100">{cameraError}</p>

                {/* Device-specific fix instructions */}
                {cameraFixInstructions && (
                  <div className="flex items-start gap-1.5 bg-white/10 rounded-lg px-3 py-2 max-w-xs">
                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-300 text-left leading-relaxed">
                      {cameraFixInstructions}
                    </p>
                  </div>
                )}

                {/* Fallback action buttons */}
                <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                  {cameraErrorType !== 'not-supported' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRetryCount(0);
                        startCameraScanner(facingMode);
                      }}
                      className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-card text-foreground hover:bg-muted text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs border border-border"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>Upload Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowFallbackPanel(false);
                      manualInputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Type Barcode</span>
                  </button>
                </div>

                {/* Fallback guidance for desktop users */}
                {isDesktop && (
                  <div className="mt-2 bg-white/5 rounded-lg px-3 py-2 max-w-xs">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      <strong className="text-slate-300">💡 Tip:</strong> Connect a USB barcode scanner gun — it types barcodes directly into the input field below. No camera needed!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Camera Controls Overlay: Torch, Zoom, Switch Camera & Upload Photo */}
            {cameraActive && (
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

                {/* Digital Zoom toggle (1x / 2x for small product barcodes) */}
                {zoomSupported && (
                  <button
                    type="button"
                    onClick={handleToggleZoom}
                    className={`text-white text-[10px] px-2 py-1 rounded-md font-bold border backdrop-blur-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all ${
                      zoomLevel > 1
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-black/75 hover:bg-black border-white/20'
                    }`}
                    title={zoomLevel > 1 ? 'Reset to 1x Zoom' : 'Zoom 2x for small barcodes'}
                  >
                    <ZoomIn className="w-3 h-3" />
                    <span>{zoomLevel}x</span>
                  </button>
                )}

                {/* Only show camera toggle on devices with multiple cameras */}
                {hasMultipleCams && (
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    disabled={isSwitchingCameraRef.current}
                    className="bg-black/75 hover:bg-black text-white text-[10px] px-2 py-1 rounded-md font-bold border border-white/20 backdrop-blur-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                    title={facingMode === 'environment' ? 'Switch to Front Camera' : 'Switch to Back Camera'}
                  >
                    <SwitchCamera className="w-3 h-3" />
                    <span>{facingMode === 'environment' ? 'Front' : 'Back'}</span>
                  </button>
                )}

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
            )}

            {/* Micro-tip for focal distance on iPhone & mobile cameras */}
            {cameraActive && isScanning && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center pointer-events-none z-15">
                <span className="bg-black/75 backdrop-blur-xs text-slate-200 text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-white/10 shadow-xs">
                  💡 Hold 6-8 in (15-20 cm) away for sharp focus
                </span>
              </div>
            )}

            {/* Hidden file input for Photo/Image QR scan */}
            {/* NOTE: capture attribute intentionally REMOVED to prevent mobile browsers
                from forcing the native camera app (which conflicts with the live camera
                stream). Users can now choose gallery OR camera from the OS file picker. */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* New Product Detected Prompt Overlay with Live Online Fetching */}
            {unrecognizedPromptCode && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in-95">
                {isFetchingOnline ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center animate-spin">
                      <Loader2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-white text-sm font-bold">
                      Fetching Product Details...
                    </h4>
                    <p className="text-slate-300 text-xs font-mono bg-white/10 px-2 py-1 rounded">
                      Barcode: {unrecognizedPromptCode}
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      Searching India & global retail databases...
                    </p>
                  </div>
                ) : fetchedOnlineProduct ? (
                  <div className="w-full max-w-xs flex flex-col items-center gap-2">
                    {fetchedOnlineProduct.imageUrl ? (
                      <img
                        src={fetchedOnlineProduct.imageUrl}
                        alt={fetchedOnlineProduct.name}
                        className="w-16 h-16 object-contain rounded-xl bg-white p-1 shadow-md border border-white/20"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{fetchedOnlineProduct.sourceRegistry || 'Product Found Online'}</span>
                    </div>

                    <h4 className="text-white text-sm font-extrabold line-clamp-2 px-1 text-center leading-snug">
                      {fetchedOnlineProduct.brand && !fetchedOnlineProduct.name.toLowerCase().includes(fetchedOnlineProduct.brand.toLowerCase())
                        ? `${fetchedOnlineProduct.brand} - ${fetchedOnlineProduct.name}`
                        : fetchedOnlineProduct.name}
                    </h4>

                    {fetchedOnlineProduct.brand && (
                      <p className="text-slate-300 text-xs font-medium -mt-0.5">
                        Brand: <span className="text-white font-bold">{fetchedOnlineProduct.brand}</span>
                      </p>
                    )}

                    {/* Price Input */}
                    <div className="w-full bg-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2 border border-white/15 mt-1">
                      <span className="text-xs text-slate-300 font-medium">Selling Price:</span>
                      <div className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-lg border border-white/20">
                        <span className="text-xs font-bold text-amber-400">{currencySymbol}</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={onlinePriceInput}
                          onChange={(e) => setOnlinePriceInput(e.target.value)}
                          className="w-20 text-xs font-bold text-white bg-transparent focus:outline-hidden text-right"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-2 w-full">
                      {currentMode === 'add-to-bill' && onAddCustomBillItem && (
                        <button
                          type="button"
                          onClick={() => {
                            const price = parseFloat(onlinePriceInput) || fetchedOnlineProduct.suggestedPrice || 0;
                            const itemTitle = fetchedOnlineProduct.brand && !fetchedOnlineProduct.name.toLowerCase().includes(fetchedOnlineProduct.brand.toLowerCase())
                              ? `${fetchedOnlineProduct.brand} - ${fetchedOnlineProduct.name}`
                              : fetchedOnlineProduct.name;
                            onAddCustomBillItem({
                              id: `custom-${Date.now()}`,
                              name: itemTitle,
                              unitPrice: price,
                              quantity: 1,
                              category: fetchedOnlineProduct.category || 'General',
                              gstRate: 0,
                            });
                            posSound.playBeep();
                            setUnrecognizedPromptCode(null);
                            setFetchedOnlineProduct(null);
                          }}
                          className="flex-1 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Add to Bill</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const code = unrecognizedPromptCode;
                          setUnrecognizedPromptCode(null);
                          setFetchedOnlineProduct(null);
                          if (registerBarcodeCallback) {
                            registerBarcodeCallback(code);
                            onClose();
                          }
                        }}
                        className="flex-1 py-2 px-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save to POS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUnrecognizedPromptCode(null);
                          setFetchedOnlineProduct(null);
                        }}
                        className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-lg cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-xs flex flex-col items-center">
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
            )}
          </div>

          {/* ============================================================ */}
          {/* ALWAYS-VISIBLE Manual Input / Hardware Scanner Form           */}
          {/* This is the CRITICAL fallback — always visible regardless     */}
          {/* of camera state. USB scanner guns type directly here.         */}
          {/* ============================================================ */}
          <form
            onSubmit={handleManualSubmit}
            className={`flex items-center gap-2 bg-white border rounded-xl p-1.5 shadow-2xs transition-all ${
              !cameraActive
                ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20'
                : 'border-slate-200'
            }`}
          >
            <Barcode className="w-5 h-5 text-slate-400 ml-1.5 shrink-0" />
            <input
              ref={manualInputRef}
              type="text"
              placeholder={
                isDesktop
                  ? 'Scan with USB gun or type Barcode / SKU...'
                  : 'Enter or scan Barcode / SKU / QR text...'
              }
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full text-xs text-slate-900 placeholder-slate-400 bg-transparent focus:outline-hidden "
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 shrink-0"
            >
              Lookup
            </button>
          </form>

          {/* USB / Bluetooth Scanner Notice (shown when camera is off) */}
          {!cameraActive && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <Keyboard className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                <strong>USB / Bluetooth scanner ready.</strong> Barcode guns are auto-detected — just scan and the code appears above.
              </p>
            </div>
          )}

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
