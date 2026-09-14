/**
 * Camera Capability Utility
 * =========================
 * Provides device-type detection, camera permission pre-checking,
 * camera enumeration, progressive start with fallback, and explicit
 * stream track cleanup. Works across iOS Safari, Android Chrome,
 * desktop Chrome/Firefox/Safari, and tablet browsers.
 */

// ---------------------------------------------------------------------------
// Device Type Detection
// ---------------------------------------------------------------------------

export type DeviceType = 'phone' | 'tablet' | 'desktop';

/**
 * Best-effort device type classification via user-agent heuristics + screen size.
 * Mobile-first: phones and tablets get adaptive camera UIs; desktops get fallback-first UIs.
 */
export function getDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipod/i.test(ua);
  const isIPad =
    /ipad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) return 'phone';
  if (isIPad) return 'tablet';

  if (isAndroid) {
    // Android tablets typically have 'Android' but not 'Mobile' in UA
    const isMobile = /mobile/i.test(ua);
    return isMobile ? 'phone' : 'tablet';
  }

  // Touch-capable large screens are likely tablets
  if (
    typeof window !== 'undefined' &&
    'ontouchstart' in window &&
    Math.min(window.screen.width, window.screen.height) >= 600
  ) {
    return 'tablet';
  }

  return 'desktop';
}

/**
 * Whether the current device is a mobile device (phone or tablet).
 */
export function isMobileDevice(): boolean {
  const type = getDeviceType();
  return type === 'phone' || type === 'tablet';
}

/**
 * Returns true if the current device is running iOS (iPhone, iPad, iPod).
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Returns true if running Chrome on iOS (CriOS user agent).
 * Chrome on iOS uses WKWebView which has camera quirks.
 */
export function isIOSChrome(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /CriOS/i.test(navigator.userAgent);
}

/**
 * Returns true if running native Safari on iOS (not Chrome/Firefox/etc).
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return isIOS() && /safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
}

/**
 * Builds MediaTrackConstraints for camera with HD resolution and autofocus.
 * This is critical — without explicit resolution constraints, iOS often provides
 * a very low resolution stream (352×288 or 640×480) that ZXing can't decode.
 */
export function buildVideoConstraints(
  facingMode?: 'environment' | 'user',
  deviceId?: string
): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
  };

  if (deviceId) {
    constraints.deviceId = { exact: deviceId };
  } else if (facingMode) {
    constraints.facingMode = { ideal: facingMode };
  }

  // Request continuous autofocus when available (important for barcode scanning)
  // Note: TypeScript doesn't have types for focusMode yet, but it's a valid constraint
  try {
    (constraints as any).focusMode = { ideal: 'continuous' };
  } catch {}

  return constraints;
}

/**
 * Builds simpler video constraints for browsers with limited constraint support
 * (e.g., Chrome on iOS / some Android WebViews).
 */
export function buildSimpleVideoConstraints(
  facingMode?: 'environment' | 'user',
  deviceId?: string
): MediaTrackConstraints {
  if (deviceId) {
    return { deviceId: { exact: deviceId } };
  }
  return { facingMode: facingMode || 'environment' };
}

// ---------------------------------------------------------------------------
// Camera Permission Pre-Check
// ---------------------------------------------------------------------------

export type CameraPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';

/**
 * Non-invasive camera permission check via navigator.permissions API.
 * Falls back to 'unknown' on browsers that don't support it (e.g. iOS Safari).
 */
export async function checkCameraPermission(): Promise<CameraPermissionState> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      'permissions' in navigator &&
      navigator.permissions?.query
    ) {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state as CameraPermissionState;
    }
  } catch {
    // permissions.query for 'camera' is not supported on this browser
  }
  return 'unknown';
}

/**
 * Checks if getUserMedia is available in a secure context.
 */
export function isGetUserMediaSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

// ---------------------------------------------------------------------------
// Camera Enumeration
// ---------------------------------------------------------------------------

export interface CameraInfo {
  deviceId: string;
  label: string;
  facingMode: 'environment' | 'user' | 'unknown';
}

/**
 * Enumerates available video input devices. Must be called after the user has
 * granted camera permission (labels are blank until then on most browsers).
 */
export async function enumerateCameras(): Promise<CameraInfo[]> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${d.deviceId.slice(0, 6)}`,
        facingMode: guessFacingMode(d.label),
      }));
  } catch {
    return [];
  }
}

function guessFacingMode(label: string): CameraInfo['facingMode'] {
  const l = label.toLowerCase();
  if (l.includes('back') || l.includes('rear') || l.includes('environment')) return 'environment';
  if (l.includes('front') || l.includes('face') || l.includes('user') || l.includes('selfie')) return 'user';
  return 'unknown';
}

/**
 * Returns true if the device has more than one camera (front + back).
 */
export async function hasMultipleCameras(): Promise<boolean> {
  const cameras = await enumerateCameras();
  return cameras.length > 1;
}

// ---------------------------------------------------------------------------
// Explicit Stream Track Cleanup
// ---------------------------------------------------------------------------

/**
 * Explicitly stops ALL active MediaStreamTracks for video on the page.
 * This is the nuclear option when Html5Qrcode.stop() doesn't fully release
 * the camera (common on mobile Safari and some Android browsers).
 */
export function releaseAllCameraTracks(): void {
  try {
    // Find all video elements and stop their source streams
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      const stream = (video as HTMLVideoElement).srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        (video as HTMLVideoElement).srcObject = null;
      }
    });
  } catch {
    // Cleanup errors are non-fatal
  }
}

/**
 * Stops a specific MediaStream's tracks (used when we hold a reference).
 */
export function releaseStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Progressive Camera Start with Auto-Retry
// ---------------------------------------------------------------------------

export interface CameraStartResult {
  success: boolean;
  error?: string;
  errorType?: 'permission-denied' | 'not-found' | 'in-use' | 'not-supported' | 'unknown';
  /**
   * User-friendly, device-specific instructions for resolving the error.
   */
  fixInstructions?: string;
}

/**
 * Attempts to open a camera stream as a quick pre-flight test, then immediately
 * releases it. This verifies that camera access is possible before Html5Qrcode
 * takes over. Returns detailed error info on failure.
 */
export async function testCameraAccess(
  facingMode: 'environment' | 'user' = 'environment'
): Promise<CameraStartResult> {
  if (!isGetUserMediaSupported()) {
    return {
      success: false,
      error: 'Camera API not supported in this browser.',
      errorType: 'not-supported',
      fixInstructions: getFixInstructions('not-supported'),
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
    });
    // Immediately release — we only wanted to verify access
    releaseStream(stream);
    return { success: true };
  } catch (err: unknown) {
    return classifyError(err);
  }
}

/**
 * Classifies a camera error into a user-friendly result with fix instructions.
 */
export function classifyError(err: unknown): CameraStartResult {
  const e = err instanceof Error ? err : new Error(String(err));
  const msg = e.message.toLowerCase();
  const name = e.name;

  if (name === 'NotAllowedError' || msg.includes('permission')) {
    return {
      success: false,
      error: 'Camera permission denied.',
      errorType: 'permission-denied',
      fixInstructions: getFixInstructions('permission-denied'),
    };
  }

  if (name === 'NotFoundError' || msg.includes('not found') || msg.includes('requested device not found')) {
    return {
      success: false,
      error: 'No camera detected on this device.',
      errorType: 'not-found',
      fixInstructions: getFixInstructions('not-found'),
    };
  }

  if (name === 'NotReadableError' || msg.includes('in use') || msg.includes('could not start')) {
    return {
      success: false,
      error: 'Camera is in use by another app or tab.',
      errorType: 'in-use',
      fixInstructions: getFixInstructions('in-use'),
    };
  }

  if (name === 'OverconstrainedError' || msg.includes('overconstrained')) {
    return {
      success: false,
      error: 'Camera does not support the requested settings.',
      errorType: 'not-found',
      fixInstructions: getFixInstructions('not-found'),
    };
  }

  return {
    success: false,
    error: e.message || 'Unable to access camera.',
    errorType: 'unknown',
    fixInstructions: getFixInstructions('unknown'),
  };
}

function getFixInstructions(errorType: CameraStartResult['errorType']): string {
  const device = getDeviceType();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOSDevice = isIOS();
  const isChromeIOS = isIOSChrome();
  const isAndroid = /android/i.test(ua);
  const isSafari = isIOSSafari();

  switch (errorType) {
    case 'permission-denied':
      if (isChromeIOS) {
        return 'In iPhone Settings → Chrome → Turn ON Camera. Then tap the lock 🔒 icon in Chrome address bar to Allow.';
      }
      if (isIOSDevice) {
        return 'In Safari: Tap "aA" (or settings icon) in address bar → Website Settings → Camera → Allow. Then reload.';
      }
      if (isAndroid) {
        return 'Tap the 🔒 icon in the address bar → Permissions / Site Settings → Camera → Allow. Then reload.';
      }
      return 'Click the camera/lock icon in your browser address bar and allow camera access. Then reload the page.';

    case 'not-found':
      if (device === 'desktop') {
        return 'No camera detected. Use a USB barcode scanner gun, type the barcode number manually, or upload a photo of the barcode below.';
      }
      return 'No camera found. Try closing other camera apps, then tap Retry. You can also type the barcode manually below.';

    case 'in-use':
      return 'Close any other apps or browser tabs using the camera, then tap Retry.';

    case 'not-supported':
      if (isChromeIOS) {
        return 'Please ensure iOS is up to date, or open this website in Safari on your iPhone for native camera access.';
      }
      if (isSafari && !isIOSDevice) {
        return 'Camera scanning may not work in this browser. Please use Chrome or open the app in Safari on your phone.';
      }
      return 'Camera is not supported in this browser. Use a USB barcode scanner or enter barcodes manually.';

    default:
      return 'Camera access failed. You can use a USB barcode scanner, type the barcode manually, or upload a photo.';
  }
}

// ---------------------------------------------------------------------------
// Torch / Flashlight
// ---------------------------------------------------------------------------

/**
 * Safely toggles the torch/flashlight on the active video track.
 * Returns the new torch state (true = on, false = off) or null if unsupported.
 */
export async function toggleTorch(
  videoTrack: MediaStreamTrack | null,
  desiredState: boolean
): Promise<boolean | null> {
  if (!videoTrack) return null;

  try {
    const capabilities = videoTrack.getCapabilities?.() as any;
    if (!capabilities?.torch) return null;

    await videoTrack.applyConstraints({
      advanced: [{ torch: desiredState } as any],
    });
    return desiredState;
  } catch {
    return null;
  }
}

/**
 * Checks if torch/flashlight is supported on the given video track.
 */
export function isTorchSupported(videoTrack: MediaStreamTrack | null): boolean {
  if (!videoTrack) return false;
  try {
    const capabilities = videoTrack.getCapabilities?.() as any;
    return Boolean(capabilities?.torch);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Digital Zoom Controls
// ---------------------------------------------------------------------------

export interface ZoomCapabilities {
  supported: boolean;
  min: number;
  max: number;
  step: number;
  current: number;
}

/**
 * Checks if digital zoom is supported by the active video track.
 */
export function isZoomSupported(videoTrack: MediaStreamTrack | null): boolean {
  if (!videoTrack) return false;
  try {
    const capabilities = videoTrack.getCapabilities?.() as any;
    return Boolean(capabilities?.zoom && capabilities.zoom.max > 1);
  } catch {
    return false;
  }
}

/**
 * Gets zoom capabilities and current zoom value.
 */
export function getZoomCapabilities(videoTrack: MediaStreamTrack | null): ZoomCapabilities | null {
  if (!videoTrack) return null;
  try {
    const capabilities = (videoTrack.getCapabilities?.() as any) || {};
    const settings = (videoTrack.getSettings?.() as any) || {};
    if (capabilities.zoom && capabilities.zoom.max > 1) {
      return {
        supported: true,
        min: capabilities.zoom.min || 1,
        max: capabilities.zoom.max || 1,
        step: capabilities.zoom.step || 0.1,
        current: settings.zoom || 1,
      };
    }
  } catch {}
  return null;
}

/**
 * Applies a digital zoom level to the active video track.
 */
export async function applyZoom(
  videoTrack: MediaStreamTrack | null,
  zoomLevel: number
): Promise<boolean> {
  if (!videoTrack) return false;
  try {
    await (videoTrack as any).applyConstraints({
      advanced: [{ zoom: zoomLevel } as any],
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Native Hardware BarcodeDetector Engine (Apple Vision / Android ML Kit)
// ---------------------------------------------------------------------------

export interface NativeDetectorResult {
  rawValue: string;
  format: string;
}

/**
 * Creates a native BarcodeDetector function running against the raw <video> element.
 * Supported on iOS 17+ Safari/WebKit, Android Chrome, and modern desktop Chrome.
 * Decodes 1D product barcodes (EAN-13, UPC-A, Code 128) and QR codes in <5ms.
 */
export async function createHardwareBarcodeDetector(): Promise<
  ((video: HTMLVideoElement) => Promise<NativeDetectorResult | null>) | null
> {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }

  try {
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    let formats: string[] = [];
    if (typeof BarcodeDetectorClass.getSupportedFormats === 'function') {
      try {
        formats = await BarcodeDetectorClass.getSupportedFormats();
      } catch {
        formats = [];
      }
    }

    // Default fallback format list if getSupportedFormats is not implemented
    if (!formats || formats.length === 0) {
      formats = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'];
    }

    const detector = new BarcodeDetectorClass({ formats });

    return async (video: HTMLVideoElement): Promise<NativeDetectorResult | null> => {
      if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
      try {
        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length > 0) {
          const item = barcodes[0];
          if (item && item.rawValue) {
            return {
              rawValue: String(item.rawValue).trim(),
              format: String(item.format || 'unknown'),
            };
          }
        }
      } catch {
        // Individual frame detection error is non-fatal
      }
      return null;
    };
  } catch (err) {
    console.warn('Native BarcodeDetector creation error:', err);
    return null;
  }
}

/**
 * Scans an image (e.g. from gallery upload) using the hardware BarcodeDetector if available.
 */
export async function detectBarcodeFromImage(
  imageSource: ImageBitmap | HTMLImageElement | HTMLCanvasElement
): Promise<string | null> {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }

  try {
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    let formats: string[] = [];
    if (typeof BarcodeDetectorClass.getSupportedFormats === 'function') {
      try {
        formats = await BarcodeDetectorClass.getSupportedFormats();
      } catch {
        formats = [];
      }
    }
    if (!formats || formats.length === 0) {
      formats = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'];
    }
    const detector = new BarcodeDetectorClass({ formats });
    const barcodes = await detector.detect(imageSource);
    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
      return String(barcodes[0].rawValue).trim();
    }
  } catch {
    // Non-fatal
  }
  return null;
}

// ---------------------------------------------------------------------------
// Utility: Get active video track from Html5Qrcode instance
// ---------------------------------------------------------------------------

/**
 * Extracts the active MediaStreamTrack from the scanner container's video element.
 * This is needed because Html5Qrcode doesn't expose the track directly in all versions.
 */
export function getActiveVideoTrack(containerId: string): MediaStreamTrack | null {
  try {
    const container = document.getElementById(containerId);
    if (!container) return null;
    const video = container.querySelector('video');
    if (!video) return null;
    const stream = video.srcObject as MediaStream | null;
    if (!stream) return null;
    const tracks = stream.getVideoTracks();
    return tracks.length > 0 ? tracks[0] : null;
  } catch {
    return null;
  }
}

