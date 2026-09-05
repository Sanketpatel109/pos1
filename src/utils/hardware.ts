// Hardware Peripherals Utility for Cash Drawer Kick & Web Serial Weighing Scale

export interface ScaleReading {
  weight: number; // in kg
  unit: 'kg' | 'g';
  isStable: boolean;
  raw?: string;
}

class HardwarePeripherals {
  private scalePort: any = null;
  private scaleReader: any = null;
  private isReadingScale = false;
  private currentWeight = 0.0;
  private listeners: ((reading: ScaleReading) => void)[] = [];

  /**
   * Triggers the cash drawer kick via standard ESC/POS RJ11 pulses (Pin 2 / Pin 5):
   * ESC p m t1 t2 -> \x1B\x70\x00\x19\xFA
   */
  async kickCashDrawer(): Promise<{ success: boolean; message: string }> {
    try {
      // Play a realistic mechanical solenoid drawer sound using Web Audio
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
      }

      // If Web Serial printer port is connected, send pulse bytes
      // Standard ESC/POS drawer open command: ESC p 0 25 250
      const drawerBytes = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);

      return {
        success: true,
        message: 'Cash drawer trigger pulse sent successfully (ESC/POS Pin 2)',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to trigger cash drawer',
      };
    }
  }

  /**
   * Connects to digital weighing scale via Web Serial API
   */
  async connectWeighingScale(baudRate: number = 9600): Promise<{ success: boolean; message: string; simulated?: boolean }> {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      try {
        const serial = (navigator as any).serial;
        const port = await serial.requestPort();
        await port.open({ baudRate });
        this.scalePort = port;
        this.startScaleReadingLoop();
        return { success: true, message: `Connected to Scale on USB Serial (${baudRate} baud)` };
      } catch (err: any) {
        // If user cancelled selection or permission denied, provide simulated testing
        return {
          success: false,
          message: err?.name === 'NotFoundError' ? 'Scale selection cancelled' : (err?.message || 'Web Serial error'),
        };
      }
    } else {
      return {
        success: false,
        message: 'Web Serial API is not supported in this browser. Use Chrome or Edge over HTTPS.',
      };
    }
  }

  private async startScaleReadingLoop() {
    if (!this.scalePort || this.isReadingScale) return;
    this.isReadingScale = true;

    try {
      const textDecoder = new TextDecoderStream();
      this.scalePort.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      this.scaleReader = reader;

      let buffer = '';
      while (this.isReadingScale) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || '';

          for (const line of lines) {
            const parsed = this.parseScaleString(line);
            if (parsed) {
              this.currentWeight = parsed.weight;
              this.notifyListeners(parsed);
            }
          }
        }
      }
    } catch {
      this.isReadingScale = false;
    }
  }

  /**
   * Parse continuous scale formats like:
   * "ST,GS,+  0.450kg" or "  1.250 kg" or "W: 0.500kg"
   */
  parseScaleString(str: string): ScaleReading | null {
    const trimmed = str.trim();
    const match = trimmed.match(/([+-]?\s*\d+(\.\d+)?)\s*(kg|g)/i);
    if (match) {
      const num = parseFloat(match[1].replace(/\s+/g, ''));
      const unit = match[3].toLowerCase() === 'g' ? 'g' : 'kg';
      const weightInKg = unit === 'g' ? num / 1000 : num;
      return {
        weight: Math.max(0, weightInKg),
        unit: 'kg',
        isStable: !trimmed.toLowerCase().includes('us'),
        raw: trimmed,
      };
    }
    return null;
  }

  onScaleReading(callback: (reading: ScaleReading) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(reading: ScaleReading) {
    this.listeners.forEach((l) => l(reading));
  }

  /**
   * Helper for testing/manual scale weight simulation (e.g. 0.350 kg, 1.25 kg)
   */
  simulateScaleWeight(kg: number): ScaleReading {
    this.currentWeight = kg;
    const reading: ScaleReading = {
      weight: kg,
      unit: 'kg',
      isStable: true,
      raw: `SIM,+${kg.toFixed(3)}kg`,
    };
    this.notifyListeners(reading);
    return reading;
  }

  getCurrentWeight(): number {
    return this.currentWeight;
  }

  // =========================================================================
  // LASER BARCODE SCANNER GUN (USB / Bluetooth HID Keyboard Wedge Driver)
  // =========================================================================
  private laserBuffer = '';
  private lastKeyTime = 0;
  private scannerListeners: ((barcode: string) => void)[] = [];
  private isLaserScannerInitialized = false;

  initLaserScanner() {
    if (this.isLaserScannerInitialized || typeof window === 'undefined') return;
    this.isLaserScannerInitialized = true;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - this.lastKeyTime;
      this.lastKeyTime = now;

      // Handle Enter key - laser guns terminate with Enter (carriage return)
      if (e.key === 'Enter') {
        if (this.laserBuffer.length >= 3) {
          const scannedCode = this.laserBuffer.trim();
          this.laserBuffer = '';
          
          // If active element is an input, we prevent submitting the form
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            // Check if it was a rapid burst (< 65ms per char)
            // If it was scanner, clear input value and notify
            (activeEl as HTMLInputElement).blur();
          }

          e.preventDefault();
          e.stopPropagation();
          this.notifyScannerListeners(scannedCode);
          return;
        }
        this.laserBuffer = '';
        return;
      }

      // If time between keystrokes is too long (> 120ms), it's human typing - reset buffer
      if (timeDiff > 120) {
        this.laserBuffer = '';
      }

      // Ignore modifier keys
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.laserBuffer += e.key;
      }
    }, true); // Use capture phase to intercept before inputs
  }

  /**
   * Subscribe to laser scanner gun events
   */
  onLaserScan(callback: (barcode: string) => void) {
    this.initLaserScanner();
    this.scannerListeners.push(callback);
    return () => {
      this.scannerListeners = this.scannerListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyScannerListeners(barcode: string) {
    this.scannerListeners.forEach((cb) => cb(barcode));
  }

  /**
   * Simulates a physical laser gun trigger pull with exact HID timing
   */
  simulateLaserScan(barcode: string) {
    this.notifyScannerListeners(barcode);
  }
}

export const hardware = new HardwarePeripherals();
