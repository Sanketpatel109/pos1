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
  Globe,
  ExternalLink,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CatalogItem, BillItem, PackagingOption } from '../types';
import { resolveBarcodeMatch } from '../utils/barcodeResolver';
import { lookupBarcodeDetails, ProductLookupResult, getWebSearchUrl } from '../services/barcodeLookup';
import { posSound } from '../utils/sound';
import { hardware } from '../utils/hardware';
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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  applyCameraZoom,
  getDefaultZoomForDevice,
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

  const isMobile = typeof window !== 'undefined' && isMobileDevice();
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(() =>
    typeof window !== 'undefined' && isMobileDevice() ? 'environment' : 'user'
  );
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [zoomSupported, setZoomSupported] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(() =>
    typeof window !== 'undefined' ? getDefaultZoomForDevice() : 1
  );
  const [zoomToast, setZoomToast] = useState<string | null>(null);
  const zoomToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);
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

  // Listen to physical laser scanner guns & Bluetooth HID scanners while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = hardware.onLaserScan((scannedCode) => {
      handleCodeDetected(scannedCode);
    });
    return () => unsubscribe();
  }, [isOpen, handleCodeDetected]);

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
      video.style.setProperty('object-fit', 'contain', 'important');
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
    const defaultFacing = isMobile ? 'environment' : 'user';
    const modeToUse = targetFacing || facingMode || defaultFacing;

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

      // Helper: create a fresh Html5Qrcode instance with ZXing engine for full 1D retail barcode decoding
      const createScanner = () => new Html5Qrcode(scannerContainerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false,
        },
      });

      // Full-frame scanning without downscaled box: preserves sharp 1D barcode lines
      const scanConfig = {
        fps: isMobile ? 15 : 20,
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

      // Attempt 0: On laptops/desktops, directly select the webcam device for instant 1-shot start
      if (!isMobile) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const preferredCam =
              cameras.find((c) => /facetime|front|user|integrated|webcam/i.test(c.label)) ||
              cameras[0];
            activeScanner = createScanner();
            await activeScanner.start(
              preferredCam.id,
              scanConfig,
              onScanSuccess,
              onScanFailure
            );
            setFacingMode('user');
            startedSuccessfully = true;
          }
        } catch (desktopErr) {
          console.warn('Desktop camera direct selection fallback:', desktopErr);
          await destroyScanner(activeScanner);
          activeScanner = null;
        }
      }

      // Attempt 1: HD resolution with requested facing mode & continuous autofocus
      if (!startedSuccessfully) {
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
        }, 50);
        hardwareTimerRef.current = timer;
      });

      // Step 4: Check Torch and Digital Zoom capabilities (Default 2x for phones, 1x for tablets/desktops)
      setTimeout(() => {
        const track = getActiveVideoTrack(scannerContainerId);
        setTorchSupported(checkTorchSupport(track));
        setZoomSupported(true);
        const defaultZoom = getDefaultZoomForDevice();
        setZoomLevel(defaultZoom);
        applyCameraZoom(scannerContainerId, track, defaultZoom);
      }, 350);

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

  // Feedback toast banner for user zoom actions
  const showZoomFeedback = useCallback((text: string) => {
    if (zoomToastTimerRef.current) clearTimeout(zoomToastTimerRef.current);
    setZoomToast(text);
    zoomToastTimerRef.current = setTimeout(() => {
      setZoomToast(null);
    }, 850);
  }, []);

  // Set explicit digital zoom level (1x, 2x, 3x)
  const handleSetZoom = useCallback(async (targetZoom: number) => {
    const track = getActiveVideoTrack(scannerContainerId);
    await applyCameraZoom(scannerContainerId, track, targetZoom);
    setZoomLevel(targetZoom);
  }, []);

  // Toggle digital zoom (1x -> 2x -> 3x -> 1x)
  const handleToggleZoom = useCallback(async () => {
    const nextZoom = zoomLevel === 1 ? 2 : zoomLevel === 2 ? 3 : 1;
    await handleSetZoom(nextZoom);
    showZoomFeedback(`${nextZoom}x Zoom`);
  }, [zoomLevel, handleSetZoom, showZoomFeedback]);

  // Double-tap or double-click to toggle between 1x (wide) and 2x (sharp macro)
  const handleViewfinderDoubleTap = useCallback(() => {
    const nextZoom = zoomLevel === 1 ? 2 : 1;
    handleSetZoom(nextZoom);
    showZoomFeedback(`${nextZoom}x Zoom`);
  }, [zoomLevel, handleSetZoom, showZoomFeedback]);

  // Touch gesture handlers for mobile pinch-to-zoom and double-tap
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoomLevel;
    }
  }, [zoomLevel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      const raw = Math.min(Math.max(initialPinchZoomRef.current * ratio, 1), 3);
      const rounded = Math.round(raw * 10) / 10;
      const track = getActiveVideoTrack(scannerContainerId);
      applyCameraZoom(scannerContainerId, track, rounded);
      setZoomLevel(rounded);
    }
  }, [zoomLevel]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (initialPinchDistRef.current !== null && e.touches.length < 2) {
      initialPinchDistRef.current = null;
      showZoomFeedback(`${Math.round(zoomLevel * 10) / 10}x Zoom`);
      return;
    }

    // Single finger release: check for double tap (< 320ms between taps)
    if (e.changedTouches.length === 1 && !initialPinchDistRef.current) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 320) {
        e.preventDefault();
        handleViewfinderDoubleTap();
        lastTapTimeRef.current = 0;
      } else {
        lastTapTimeRef.current = now;
      }
    }
  }, [zoomLevel, handleViewfinderDoubleTap, showZoomFeedback]);

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
    if (zoomToastTimerRef.current) {
      clearTimeout(zoomToastTimerRef.current);
      zoomToastTimerRef.current = null;
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
    setZoomToast(null);
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg md:max-w-xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-border bg-card/80 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <Scan className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground leading-tight truncate">
                Barcode & QR Scanner
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                {isDesktop
                  ? 'USB Scanner • Photo upload • Manual SKU'
                  : 'Live camera • Photo upload • USB Laser Gun • Manual SKU'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode Selector Segmented Tabs */}
        <div className="px-3.5 py-2.5 bg-muted/40 border-b border-border shrink-0">
          <div className="grid grid-cols-3 gap-1 bg-muted/80 p-1 rounded-xl border border-border/40 text-xs">
            <button
              type="button"
              onClick={() => setCurrentMode('add-to-bill')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentMode === 'add-to-bill'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Scan & </span>Bill
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentMode('price-check')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentMode === 'price-check'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Check </span>Price
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentMode('search')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentMode === 'search'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Scan to </span>Filter
              </span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-card">
          {/* Camera Viewfinder Box */}
          <div
            className="bg-slate-950 rounded-xl overflow-hidden relative shadow-inner border border-slate-800 flex flex-col items-center justify-center h-44 sm:h-52 select-none cursor-pointer touch-none"
            onDoubleClick={handleViewfinderDoubleTap}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* HTML5 QR Container */}
            <div
              id={scannerContainerId}
              className="w-full h-full flex items-center justify-center overflow-hidden relative bg-black [&_video]:!w-full [&_video]:!h-full [&_video]:!object-contain [&_video]:!rounded-xl [&_video]:!block [&#qr-shaded-region]:!hidden"
            ></div>

            {/* Transient Zoom Toast Badge */}
            {zoomToast && (
              <div className="absolute z-25 pointer-events-none px-3.5 py-1.5 rounded-full bg-black/90 border border-white/30 text-white font-bold text-xs backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-90 duration-150 flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-primary" />
                <span>{zoomToast}</span>
              </div>
            )}

            {/* Floating Top Chip: Uncataloged Notice inside camera stream (doesn't block camera) */}
            {lastScannedResult && !lastScannedResult.item && (
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between bg-black/85 backdrop-blur-md border border-amber-500/40 text-white text-xs px-2.5 py-1.5 rounded-lg z-25 shadow-lg">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate text-[11px] sm:text-xs">
                    Uncataloged: <strong className="text-amber-400 font-mono">{lastScannedResult.code}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLastScannedResult(null);
                    setFetchedOnlineProduct(null);
                    setUnrecognizedPromptCode(null);
                    lastScannedCodeRef.current = '';
                  }}
                  className="p-0.5 text-slate-400 hover:text-white rounded"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Overlaid Animated Targeting Reticle - Wide format for 1D retail barcodes */}
            {cameraActive && isScanning && !lastScannedResult && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                <div className="w-52 sm:w-64 h-28 sm:h-36 border-2 border-primary rounded-xl relative shadow-[0_0_20px_rgba(52,211,153,0.25)] animate-pulse">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-3 border-l-3 border-primary rounded-tl"></div>
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-3 border-r-3 border-primary rounded-tr"></div>
                  <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-3 border-l-3 border-primary rounded-bl"></div>
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-3 border-r-3 border-primary rounded-br"></div>
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
                    <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
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

                {/* Digital Zoom toggle (1x, 2x Default for phone, 3x) */}
                {zoomSupported && (
                  <div className="flex items-center bg-black/80 rounded-md border border-white/20 p-0.5 backdrop-blur-xs">
                    <button
                      type="button"
                      onClick={() => handleSetZoom(1)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        zoomLevel === 1
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      title="1x Zoom"
                    >
                      1x
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetZoom(2)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                        zoomLevel === 2
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      title="2x Zoom (Recommended for Phone Barcode Scanning)"
                    >
                      <span>2x</span>
                      <span className="text-[8px] opacity-75 hidden sm:inline">Def</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetZoom(3)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        zoomLevel === 3
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      title="3x Zoom for small/dense barcodes"
                    >
                      3x
                    </button>
                  </div>
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

            {/* Micro-tip for focal distance & lighting */}
            {cameraActive && isScanning && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center pointer-events-none z-15">
                <span className="bg-black/85 backdrop-blur-xs text-slate-200 text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-white/20 shadow-xs flex items-center gap-1.5">
                  <span>💡 {!isMobile ? 'Hold 8–12 in away' : 'Hold 6–10 in away'}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-primary font-semibold">{!isMobile ? 'Keep steady' : 'Tap 2x'}</span>
                </span>
              </div>
            )}

            {/* Hidden file input for Photo/Image QR scan */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Manual Input / Hardware Scanner Form */}
          <form
            onSubmit={handleManualSubmit}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                ref={manualInputRef}
                type="text"
                placeholder={
                  isDesktop
                    ? 'Scan with USB gun or type Barcode / SKU...'
                    : 'Scan or type Barcode / SKU...'
                }
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="pl-9 h-9 sm:h-10 text-xs bg-background"
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              disabled={!manualCode.trim()}
              className="h-9 sm:h-10 text-xs px-3.5 sm:px-4 shrink-0 font-semibold"
            >
              Lookup
            </Button>
          </form>

          {/* USB / Bluetooth Scanner Notice (shown when camera is off) */}
          {!cameraActive && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-muted-foreground">
              <Keyboard className="w-3.5 h-3.5 text-foreground shrink-0" />
              <p className="leading-snug text-[11px] sm:text-xs">
                <strong className="text-foreground font-semibold">Barcode scanner ready.</strong> USB & Bluetooth laser guns type directly into the field above.
              </p>
            </div>
          )}

          {/* SINGLE UNIFIED HERO SCAN RESULT CARD */}
          {lastScannedResult && (
            <Card className="border-border bg-card shadow-xs overflow-hidden">
              <CardContent className="p-3 sm:p-3.5 space-y-3">
                {/* CASE 1: Item Found in Local Catalog */}
                {lastScannedResult.item ? (
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-bold text-foreground">
                            {lastScannedResult.code}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleCopyCode(lastScannedResult.code)}
                            title="Copy barcode"
                          >
                            {copiedCode ? (
                              <CheckCheck className="w-3 h-3 text-primary" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                          </Button>
                          <Badge variant="default" className="text-[10px]">
                            {lastScannedResult.actionTaken}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">
                            {lastScannedResult.item.name}
                          </h4>
                          <span className="text-xs font-extrabold text-primary">
                            {currencySymbol}
                            {(Number(lastScannedResult.item.price) || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({lastScannedResult.item.category})
                          </span>
                        </div>
                      </div>
                    </div>

                    {currentMode !== 'add-to-bill' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (addItemCallback && lastScannedResult.item) {
                            addItemCallback(lastScannedResult.item);
                          }
                        }}
                        className="gap-1 text-xs shrink-0 h-8 font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  /* CASE 2: Uncataloged Barcode (Single unified display) */
                  <div className="space-y-3">
                    {/* Header row: Code, Registry status, Web search, Close */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs text-foreground bg-muted px-1.5 py-0.5 rounded-md border border-border">
                            {lastScannedResult.code}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleCopyCode(lastScannedResult.code)}
                            title="Copy barcode"
                          >
                            {copiedCode ? (
                              <CheckCheck className="w-3 h-3 text-primary" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                          </Button>
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                            Not in Catalog
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={getWebSearchUrl(lastScannedResult.code)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-1 rounded-md border border-border transition-colors cursor-pointer"
                          title="Search Web for this barcode"
                        >
                          <Globe className="w-3 h-3" />
                          <span className="hidden sm:inline">Search Web</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setLastScannedResult(null);
                            setFetchedOnlineProduct(null);
                            setUnrecognizedPromptCode(null);
                            lastScannedCodeRef.current = '';
                          }}
                          title="Dismiss"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Online search in progress */}
                    {isFetchingOnline && (
                      <div className="flex items-center gap-2.5 p-2 bg-muted/40 rounded-lg text-xs text-muted-foreground border border-border/60">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                        <span className="text-[11px] leading-tight">
                          Searching India & global retail databases (Open Food Facts)...
                        </span>
                      </div>
                    )}

                    {/* Online product details found */}
                    {fetchedOnlineProduct && !isFetchingOnline && (
                      <div className="flex items-start gap-3 p-2.5 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                        {fetchedOnlineProduct.imageUrl ? (
                          <img
                            src={fetchedOnlineProduct.imageUrl}
                            alt={fetchedOnlineProduct.name}
                            className="w-12 h-12 object-contain rounded-lg bg-white p-1 shadow-xs border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <Sparkles className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 py-0">
                              <Check className="w-2.5 h-2.5 mr-1 stroke-[3]" />
                              {fetchedOnlineProduct.sourceRegistry || 'Retail Database'}
                            </Badge>
                            {fetchedOnlineProduct.brand && (
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {fetchedOnlineProduct.brand}
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2">
                            {fetchedOnlineProduct.brand && !fetchedOnlineProduct.name.toLowerCase().includes(fetchedOnlineProduct.brand.toLowerCase())
                              ? `${fetchedOnlineProduct.brand} - ${fetchedOnlineProduct.name}`
                              : fetchedOnlineProduct.name}
                          </h5>
                        </div>
                      </div>
                    )}

                    {/* Single action section: Price & Quick Add / Register */}
                    <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      {/* Quick Add to Bill input */}
                      {onAddCustomBillItem && (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            Price:
                          </span>
                          <div className="flex items-center border border-input rounded-md bg-background px-2 py-0.5 h-8 w-28 shrink-0">
                            <span className="text-xs font-bold text-muted-foreground">{currencySymbol}</span>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={fetchedOnlineProduct ? onlinePriceInput : customPriceInput}
                              onChange={(e) => {
                                if (fetchedOnlineProduct) {
                                  setOnlinePriceInput(e.target.value);
                                } else {
                                  setCustomPriceInput(e.target.value);
                                }
                              }}
                              className="w-full text-xs font-bold text-foreground focus:outline-hidden ml-1 text-right"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              const priceVal = fetchedOnlineProduct
                                ? (parseFloat(onlinePriceInput) || fetchedOnlineProduct.suggestedPrice || 0)
                                : (parseFloat(customPriceInput) || 0);

                              if (priceVal <= 0) return;

                              const itemTitle = fetchedOnlineProduct
                                ? (fetchedOnlineProduct.brand && !fetchedOnlineProduct.name.toLowerCase().includes(fetchedOnlineProduct.brand.toLowerCase())
                                  ? `${fetchedOnlineProduct.brand} - ${fetchedOnlineProduct.name}`
                                  : fetchedOnlineProduct.name)
                                : `Scanned Item (${lastScannedResult.code.slice(0, 12)})`;

                              onAddCustomBillItem({
                                id: `custom-${Date.now()}`,
                                itemId: `custom-${lastScannedResult.code}`,
                                name: itemTitle,
                                unitPrice: priceVal,
                                quantity: 1,
                                category: fetchedOnlineProduct?.category || 'General',
                                gstRate: 0,
                              });
                              posSound.playAdd();
                              setLastScannedResult(null);
                              setFetchedOnlineProduct(null);
                              setCustomPriceInput('');
                              setOnlinePriceInput('');
                              onClose();
                            }}
                            disabled={
                              fetchedOnlineProduct
                                ? (!onlinePriceInput && !fetchedOnlineProduct.suggestedPrice) || (parseFloat(onlinePriceInput) || fetchedOnlineProduct.suggestedPrice || 0) <= 0
                                : !customPriceInput || parseFloat(customPriceInput) <= 0
                            }
                            className="text-xs h-8 gap-1.5 font-semibold"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add to Bill</span>
                          </Button>
                        </div>
                      )}

                      {/* Register in Catalog */}
                      {registerBarcodeCallback && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const code = lastScannedResult.code;
                            setLastScannedResult(null);
                            setFetchedOnlineProduct(null);
                            registerBarcodeCallback(code);
                            onClose();
                          }}
                          className="text-xs h-8 gap-1 font-semibold shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Save to Catalog</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modal Bottom Action Footer */}
        <DialogFooter className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-muted/40 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 hidden sm:inline" />
              <span className="hidden sm:inline">Laser & Bluetooth scanner auto-detected</span>
            </div>
            {billItemCount > 0 && (
              <Badge variant="secondary" className="font-semibold text-xs">
                In Bill: {billItemCount} items • {currencySymbol}{billTotal.toFixed(2)}
              </Badge>
            )}
          </div>

          <Button
            type="button"
            id="btn-scanner-done"
            onClick={onClose}
            className="w-full sm:w-auto font-bold text-xs sm:text-sm h-9 sm:h-10"
          >
            <span>Done Scanning</span>
            <span className="opacity-50 mx-1">•</span>
            <span>Back to Bill</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
