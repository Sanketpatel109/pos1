import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
  Barcode,
  Keyboard,
  Monitor,
  Smartphone,
  Info,
  SwitchCamera,
  WifiOff,
  ZoomIn,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { posSound } from '../utils/sound';
import { hardware } from '../utils/hardware';
import {
  getDeviceType,
  isMobileDevice,
  checkCameraPermission,
  isGetUserMediaSupported,
  enumerateCameras,
  releaseAllCameraTracks,
  classifyError,
  getActiveVideoTrack,
  isZoomSupported,
  applyZoom,
  applyCameraZoom,
  getDefaultZoomForDevice,
  createHardwareBarcodeDetector,
  detectBarcodeFromImage,
  type DeviceType,
} from '../utils/cameraCapability';

// Supported barcode formats for html5-qrcode
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

export interface FieldBarcodeScannerModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
}

export const FieldBarcodeScannerModal: React.FC<FieldBarcodeScannerModalProps> = ({
  isOpen,
  title = 'Scan Barcode with Camera',
  subtitle = 'Point camera at product or packaging barcode',
  onClose,
  onScan,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorType, setCameraErrorType] = useState<string | null>(null);
  const [cameraFixInstructions, setCameraFixInstructions] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [showFallbackPanel, setShowFallbackPanel] = useState<boolean>(false);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [hasMultipleCams, setHasMultipleCams] = useState<boolean>(false);
  const isMobile = typeof window !== 'undefined' && isMobileDevice();
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(() =>
    typeof window !== 'undefined' && isMobileDevice() ? 'environment' : 'user'
  );
  const isPhone = typeof window !== 'undefined' && getDeviceType() === 'phone';
  const [zoomSupported, setZoomSupported] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(() =>
    typeof window !== 'undefined' ? getDefaultZoomForDevice() : 1
  );
  const [zoomToast, setZoomToast] = useState<string | null>(null);
  const zoomToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);
  const [retryCount, setRetryCount] = useState<number>(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'field-barcode-camera-reader';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasCapturedRef = useRef<boolean>(false);
  const isSwitchingCameraRef = useRef<boolean>(false);
  const isScanningRef = useRef<boolean>(false);
  const hardwareTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Detect device type
  useEffect(() => {
    setDeviceType(getDeviceType());
  }, []);

  const handleDetected = useCallback((decodedText: string) => {
    const clean = decodedText.trim();
    if (!clean || hasCapturedRef.current) return;
    hasCapturedRef.current = true;

    // Haptic and audio feedback
    posSound.playBeep();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(60);
      } catch {}
    }

    stopCameraScanner();
    onScan(clean);
    onClose();
  }, [onScan, onClose]);

  // Listen to physical laser scanner guns & Bluetooth HID scanners while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = hardware.onLaserScan((scannedCode) => {
      handleDetected(scannedCode);
    });
    return () => unsubscribe();
  }, [isOpen, handleDetected]);

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

  const startCameraScanner = useCallback(async (targetFacing?: 'environment' | 'user') => {
    // Prevent concurrent starts
    if (isSwitchingCameraRef.current) return;
    isSwitchingCameraRef.current = true;

    setCameraError(null);
    setCameraErrorType(null);
    setCameraFixInstructions(null);
    hasCapturedRef.current = false;
    const defaultFacing = isMobile ? 'environment' : 'user';
    const modeToUse = targetFacing || facingMode || defaultFacing;

    try {
      // Step 1: Check getUserMedia support
      if (!isGetUserMediaSupported()) {
        setCameraError('Camera API not supported in this browser.');
        setCameraErrorType('not-supported');
        setCameraFixInstructions('Use Chrome, Edge, or Safari on HTTPS to access the camera.');
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
        } catch {}
        scannerRef.current = null;
      }
      releaseAllCameraTracks();
      // Wait for OS to release camera hardware
      await new Promise((r) => setTimeout(r, 250));

      const containerEl = document.getElementById(scannerContainerId);
      if (!containerEl) {
        isSwitchingCameraRef.current = false;
        return;
      }

      // Helper: create fresh scanner instance with ZXing engine for reliable 1D retail barcode decoding
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

      // Helper: fully destroy a scanner instance and release OS camera
      const destroyScanner = async (s: Html5Qrcode | null) => {
        if (!s) return;
        try { if (s.isScanning) await s.stop(); } catch {}
        try { await s.clear(); } catch {}
        releaseAllCameraTracks();
      };

      // Progressive camera start with full cleanup between attempts
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
              (text) => handleDetected(text),
              () => {}
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
            (text) => handleDetected(text),
            () => {}
          );
          setFacingMode(modeToUse);
          startedSuccessfully = true;
        } catch {
          console.warn(`Camera HD ${modeToUse} failed, trying simple constraint`);
          await destroyScanner(activeScanner);
          activeScanner = null;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Attempt 2: Simple facingMode constraint
      if (!startedSuccessfully) {
        try {
          activeScanner = createScanner();
          await activeScanner.start(
            { facingMode: modeToUse },
            scanConfig,
            (text) => handleDetected(text),
            () => {}
          );
          setFacingMode(modeToUse);
          startedSuccessfully = true;
        } catch {
          console.warn('Simple facing mode failed, trying alternate');
          await destroyScanner(activeScanner);
          activeScanner = null;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Attempt 3: Alternate facing mode
      if (!startedSuccessfully) {
        try {
          const altMode = modeToUse === 'environment' ? 'user' : 'environment';
          activeScanner = createScanner();
          await activeScanner.start(
            { facingMode: altMode },
            scanConfig,
            (text) => handleDetected(text),
            () => {}
          );
          setFacingMode(altMode);
          startedSuccessfully = true;
        } catch {
          console.warn('Alternate facing mode also failed');
          await destroyScanner(activeScanner);
          activeScanner = null;
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Attempt 4: Use specific deviceId (bypasses facingMode constraints)
      if (!startedSuccessfully) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const backCam = cameras.find((c) => /back|rear|environment/i.test(c.label));
            const camToUse = backCam || cameras[0];
            activeScanner = createScanner();
            await activeScanner.start(
              camToUse.id,
              scanConfig,
              (text) => handleDetected(text),
              () => {}
            );
            startedSuccessfully = true;
          }
        } catch {
          console.warn('Device ID fallback also failed');
          await destroyScanner(activeScanner);
          activeScanner = null;
        }
      }

      if (!startedSuccessfully || !activeScanner) {
        throw new Error('Could not start any camera. All methods failed.');
      }

      scannerRef.current = activeScanner;
      setCameraActive(true);
      setIsScanning(true);
      isScanningRef.current = true;
      setShowFallbackPanel(false);
      setRetryCount(0);

      enforceVideoPlayback();
      setTimeout(enforceVideoPlayback, 100);
      setTimeout(enforceVideoPlayback, 300);
      setTimeout(enforceVideoPlayback, 800);

      // Step 3: Launch Native Hardware Vision Engine (runs in parallel with ZXing)
      createHardwareBarcodeDetector().then((detector) => {
        if (!detector) return;
        const timer = setInterval(async () => {
          if (!isScanningRef.current || hasCapturedRef.current) return;
          const container = document.getElementById(scannerContainerId);
          const video = container?.querySelector('video');
          if (video && video.readyState >= 2 && !video.paused && video.videoWidth > 0) {
            const result = await detector(video);
            if (result && result.rawValue) {
              handleDetected(result.rawValue);
            }
          }
        }, 50);
        hardwareTimerRef.current = timer;
      });

      // Step 4: Check Digital Zoom support (Default 2x for phones, 1x for tablets/desktops)
      setTimeout(() => {
        const track = getActiveVideoTrack(scannerContainerId);
        setZoomSupported(true);
        const defaultZoom = getDefaultZoomForDevice();
        setZoomLevel(defaultZoom);
        applyCameraZoom(scannerContainerId, track, defaultZoom);
      }, 350);

      // Step 5: Enumerate cameras for toggle
      try {
        const cameras = await enumerateCameras();
        setHasMultipleCams(cameras.length > 1);
      } catch {}
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      const errResult = classifyError(err);
      setCameraError(errResult.error || 'Unable to access camera.');
      setCameraErrorType(errResult.errorType || 'unknown');
      setCameraFixInstructions(errResult.fixInstructions || null);
      setCameraActive(false);
      setIsScanning(false);
      isScanningRef.current = false;
      setShowFallbackPanel(true);

      // Single auto-retry after 2.5s (give OS time to release camera)
      if (retryCount < 1) {
        retryTimerRef.current = setTimeout(() => {
          setRetryCount((c) => c + 1);
          startCameraScanner(targetFacing);
        }, 2500);
      }
    } finally {
      isSwitchingCameraRef.current = false;
    }
  }, [facingMode, handleDetected, enforceVideoPlayback, retryCount]);

  const handleToggleCamera = useCallback(async () => {
    if (isSwitchingCameraRef.current) return;
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCameraScanner(nextMode);
  }, [facingMode, startCameraScanner]);

  const showZoomFeedback = useCallback((text: string) => {
    if (zoomToastTimerRef.current) clearTimeout(zoomToastTimerRef.current);
    setZoomToast(text);
    zoomToastTimerRef.current = setTimeout(() => {
      setZoomToast(null);
    }, 850);
  }, []);

  const handleSetZoom = useCallback(async (targetZoom: number) => {
    const track = getActiveVideoTrack(scannerContainerId);
    await applyCameraZoom(scannerContainerId, track, targetZoom);
    setZoomLevel(targetZoom);
  }, []);

  const handleToggleZoom = useCallback(async () => {
    const nextZoom = zoomLevel === 1 ? 2 : zoomLevel === 2 ? 3 : 1;
    await handleSetZoom(nextZoom);
    showZoomFeedback(`${nextZoom}x Zoom`);
  }, [zoomLevel, handleSetZoom, showZoomFeedback]);

  // Double-tap or double-click to toggle between 1x and 2x
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

  const stopCameraScanner = useCallback(() => {
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
          try {
            scannerRef.current.stop();
          } catch {}
        }
        try {
          scannerRef.current.clear();
        } catch {}
      } catch {}
      scannerRef.current = null;
    }
    releaseAllCameraTracks();
    setZoomLevel(1);
    setZoomToast(null);
    setCameraActive(false);
    setIsScanning(false);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      hasCapturedRef.current = false;
      setCameraError(null);
      setCameraErrorType(null);
      setCameraFixInstructions(null);
      setManualCode('');
      setShowFallbackPanel(false);
      setRetryCount(0);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsFileProcessing(true);
      setCameraError(null);
      setCameraErrorType(null);
      setCameraFixInstructions(null);

      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        setCameraActive(false);
      }
      if (hardwareTimerRef.current) {
        clearInterval(hardwareTimerRef.current);
        hardwareTimerRef.current = null;
      }
      isScanningRef.current = false;

      // Method 1: Hardware BarcodeDetector on uploaded image
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
          handleDetected(detected);
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

      const decodedText = await scanner.scanFile(file, true);
      handleDetected(decodedText);
    } catch {
      setCameraError('No barcode detected in this image. Try another photo or enter manually below.');
      setCameraErrorType('unknown');
    } finally {
      setIsFileProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetected(manualCode.trim());
  };

  // Focus manual input when fallback panel is shown
  useEffect(() => {
    if (showFallbackPanel && manualInputRef.current) {
      setTimeout(() => manualInputRef.current?.focus(), 200);
    }
  }, [showFallbackPanel]);

  if (!isOpen) return null;

  const isDesktop = deviceType === 'desktop';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-900">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 bg-slate-50">
          {/* Viewfinder Container */}
          <div
            className="bg-slate-950 rounded-xl overflow-hidden relative shadow-inner border border-slate-800 flex flex-col items-center justify-center min-h-[220px] max-h-[260px] select-none cursor-pointer touch-none"
            onDoubleClick={handleViewfinderDoubleTap}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            title="Double-tap to toggle 1x/2x zoom, or pinch to zoom"
          >
            <div
              id={scannerContainerId}
              className="w-full h-full min-h-[220px] max-h-[260px] flex items-center justify-center overflow-hidden relative [&_video]:!w-full [&_video]:!h-full [&_video]:!max-h-[260px] [&_video]:!object-cover [&_video]:!rounded-xl [&_video]:!block [&#qr-shaded-region]:!hidden"
            />

            {/* Transient Zoom Toast Badge */}
            {zoomToast && (
              <div className="absolute z-25 pointer-events-none px-3.5 py-1.5 rounded-full bg-black/90 border border-white/30 text-white font-bold text-xs backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-90 duration-150 flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                <span>{zoomToast}</span>
              </div>
            )}

            {/* Targeting Reticle */}
            {cameraActive && isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                <div className="w-52 h-32 border-2 border-emerald-400 rounded-xl relative shadow-[0_0_20px_rgba(52,211,153,0.35)] animate-pulse">
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-3 border-l-3 border-emerald-400 rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-3 border-r-3 border-emerald-400 rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-3 border-l-3 border-emerald-400 rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-3 border-r-3 border-emerald-400 rounded-br" />
                  <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-bounce" />
                </div>
                <span className="mt-2 bg-black/80 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-white/20">
                  Align Barcode in Frame
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
                  <div className="w-10 h-10 rounded-full bg-slate-700/80 flex items-center justify-center">
                    {isDesktop ? <Monitor className="w-5 h-5 text-slate-300" /> : <Smartphone className="w-5 h-5 text-slate-300" />}
                  </div>
                ) : cameraErrorType === 'permission-denied' ? (
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-red-400" />
                  </div>
                ) : (
                  <AlertCircle className="w-7 h-7 text-amber-400" />
                )}

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

                <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                  {cameraErrorType !== 'not-supported' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRetryCount(0);
                        startCameraScanner(facingMode);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
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

                {/* Desktop guidance */}
                {isDesktop && (
                  <div className="mt-1 bg-white/5 rounded-lg px-3 py-2 max-w-xs">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      <strong className="text-slate-300">💡 Tip:</strong> Connect a USB barcode scanner gun — it types barcodes directly into the input field below.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Camera Switch, Zoom & Photo upload shortcuts */}
            {cameraActive && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                {/* Digital Zoom toggle (1x, 2x Default for phone, 3x) */}
                {zoomSupported && (
                  <div className="flex items-center bg-black/80 rounded-md border border-white/20 p-0.5 backdrop-blur-xs shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleSetZoom(1)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        zoomLevel === 1
                          ? 'bg-blue-600 text-white shadow-xs'
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
                          ? 'bg-blue-600 text-white shadow-xs'
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
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-300 hover:text-white'
                      }`}
                      title="3x Zoom for small barcodes"
                    >
                      3x
                    </button>
                  </div>
                )}

                {hasMultipleCams && (
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    disabled={isSwitchingCameraRef.current}
                    className="bg-black/75 hover:bg-black text-white text-[10px] px-2 py-1 rounded-md font-bold border border-white/20 backdrop-blur-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-xs disabled:opacity-50"
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
                  className="bg-black/75 hover:bg-black text-white text-[10px] px-2 py-1 rounded-md font-bold border border-white/20 backdrop-blur-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-xs"
                  title="Scan QR or Barcode from Photo"
                >
                  <Upload className="w-3 h-3" />
                  <span>{isFileProcessing ? 'Scanning...' : 'Upload Photo'}</span>
                </button>
              </div>
            )}

            {/* Micro-tip for focal distance & double-tap shortcut */}
            {cameraActive && isScanning && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center pointer-events-none z-15">
                <span className="bg-black/80 backdrop-blur-xs text-slate-200 text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-white/15 shadow-sm flex items-center gap-1.5">
                  <span>💡 Hold 8-12 in away</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-semibold">Double-tap video for 1x/2x</span>
                </span>
              </div>
            )}

            {/* Hidden file input — capture attribute intentionally REMOVED
                to prevent mobile browsers from hijacking the native camera app */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* ============================================================ */}
          {/* ALWAYS-VISIBLE Manual / USB gun fallback input                */}
          {/* ============================================================ */}
          <form
            onSubmit={handleManualSubmit}
            className={`flex items-center gap-2 bg-white border rounded-xl p-1.5 shadow-2xs transition-all ${
              !cameraActive
                ? 'border-blue-500 ring-2 ring-blue-500/20'
                : 'border-slate-200'
            }`}
          >
            <Barcode className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
            <input
              ref={manualInputRef}
              type="text"
              placeholder={
                isDesktop
                  ? 'Scan with USB gun or type barcode number...'
                  : 'Or type/paste barcode number...'
              }
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full text-xs text-slate-900 placeholder-slate-400 bg-transparent focus:outline-hidden"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 shrink-0"
            >
              Use Code
            </button>
          </form>

          {/* USB / Bluetooth Scanner Notice (when camera is off) */}
          {!cameraActive && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
              <Keyboard className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                <strong>USB / Bluetooth scanner ready.</strong> Barcode guns type directly into the field above.
              </p>
            </div>
          )}

          {/* Fast DEV Simulator Chips */}
          {((typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || Boolean(import.meta.env?.DEV)) && (
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Test Barcodes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Coca-Cola', code: '5449000000996' },
                  { label: 'Box of 6', code: '8901030800066' },
                  { label: 'Case of 24', code: '8901030800240' },
                  { label: 'Unit EAN', code: '8901030012345' },
                ].map((testChip) => (
                  <button
                    key={testChip.code}
                    type="button"
                    onClick={() => handleDetected(testChip.code)}
                    className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-[10px] font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                    <span>{testChip.label}:</span>
                    <span className="font-mono text-slate-900 font-bold">{testChip.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
