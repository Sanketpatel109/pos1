import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Upload, Sparkles, Check, AlertCircle, Barcode } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { posSound } from '../utils/sound';

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
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'field-barcode-camera-reader';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasCapturedRef = useRef<boolean>(false);

  const handleDetected = (decodedText: string) => {
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
  };

  const startCameraScanner = async () => {
    setCameraError(null);
    hasCapturedRef.current = false;

    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }

      const containerEl = document.getElementById(scannerContainerId);
      if (!containerEl) return;

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = html5QrCode;

      const scanConfig = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = Math.min(Math.floor(viewfinderWidth * 0.9), 340);
          const h = Math.min(Math.floor(viewfinderHeight * 0.65), 190);
          return {
            width: Math.max(w, 220),
            height: Math.max(h, 130),
          };
        },
      };

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          scanConfig,
          (text) => handleDetected(text),
          () => {}
        );
      } catch {
        await html5QrCode.start(
          { facingMode: 'user' },
          scanConfig,
          (text) => handleDetected(text),
          () => {}
        );
      }

      setCameraActive(true);
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('Unable to access camera. Check browser permissions or upload photo.');
      setCameraActive(false);
      setIsScanning(false);
    }
  };

  const stopCameraScanner = () => {
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
    setCameraActive(false);
    setIsScanning(false);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      hasCapturedRef.current = false;
      setCameraError(null);
      setManualCode('');
      timer = setTimeout(() => {
        startCameraScanner();
      }, 200);
    } else {
      stopCameraScanner();
    }
    return () => {
      clearTimeout(timer);
      stopCameraScanner();
    };
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsFileProcessing(true);
      setCameraError(null);

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
          ],
          verbose: false,
        });
        scannerRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      handleDetected(decodedText);
    } catch {
      setCameraError('No barcode detected in this image. Try another photo.');
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

  if (!isOpen) return null;

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
          <div className="bg-slate-950 rounded-xl overflow-hidden relative shadow-inner border border-slate-800 flex flex-col items-center justify-center min-h-[220px] max-h-[260px]">
            <div
              id={scannerContainerId}
              className="w-full h-full min-h-[220px] max-h-[260px] flex items-center justify-center overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:max-h-[260px] [&_video]:object-cover [&_video]:rounded-xl"
            />

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

            {/* Error Overlay */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/95 p-4 flex flex-col items-center justify-center text-center text-white gap-2 z-20">
                <AlertCircle className="w-7 h-7 text-amber-400" />
                <p className="text-xs font-bold text-slate-100">{cameraError}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={startCameraScanner}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload Photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Photo upload shortcut */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isFileProcessing}
                className="bg-black/75 hover:bg-black text-white text-[10px] px-2 py-1 rounded-md font-bold border border-white/20 backdrop-blur-xs flex items-center gap-1 cursor-pointer"
                title="Scan QR or Barcode from Photo"
              >
                <Upload className="w-3 h-3" />
                <span>{isFileProcessing ? 'Scanning...' : 'Upload Photo'}</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Manual or USB gun fallback input */}
          <form
            onSubmit={handleManualSubmit}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs"
          >
            <Barcode className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
            <input
              type="text"
              placeholder="Or type/paste barcode number..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full text-xs text-slate-900 placeholder-slate-400 bg-transparent focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 shrink-0"
            >
              Use Code
            </button>
          </form>

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
