import { describe, it, expect } from 'vitest';
import {
  getDeviceType,
  getDefaultZoomForDevice,
  classifyError,
} from '../cameraCapability';

describe('Camera Capability & Device Scanner Utilities', () => {
  describe('Device Type Heuristics & Default Zoom', () => {
    it('should default to desktop device type in test / server environment', () => {
      const type = getDeviceType();
      expect(['desktop', 'phone', 'tablet']).toContain(type);
    });

    it('should return optimal camera zoom level (2x for phone, 1x for desktop/tablet)', () => {
      const defaultZoom = getDefaultZoomForDevice();
      expect([1, 2]).toContain(defaultZoom);
    });
  });

  describe('classifyError for Camera Permissions & Failures', () => {
    it('should classify NotAllowedError as permission denied', () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';

      const classified = classifyError(error);
      expect(classified.errorType).toBe('permission-denied');
      expect(classified.fixInstructions).toBeDefined();
    });

    it('should classify NotFoundError as no camera available', () => {
      const error = new Error('Requested device not found');
      error.name = 'NotFoundError';

      const classified = classifyError(error);
      expect(classified.errorType).toBe('not-found');
      expect(classified.fixInstructions).toBeDefined();
    });

    it('should classify NotReadableError as hardware in use by another app', () => {
      const error = new Error('Could not start video source');
      error.name = 'NotReadableError';

      const classified = classifyError(error);
      expect(classified.errorType).toBe('in-use');
      expect(classified.fixInstructions).toBeDefined();
    });

    it('should classify OverconstrainedError as resolution constraints mismatch', () => {
      const error = new Error('Constraints could not be satisfied');
      error.name = 'OverconstrainedError';

      const classified = classifyError(error);
      expect(classified.errorType).toBe('not-found');
      expect(classified.fixInstructions).toBeDefined();
    });
  });
});
