import { describe, it, expect } from 'vitest';
import {
  expandUpcE,
  getBarcodeVariants,
  resolveBarcodeMatch,
} from '../barcodeResolver';
import { CatalogItem } from '../../types';

describe('Barcode Resolver & Laser Scanner Suite', () => {
  describe('expandUpcE', () => {
    it('should decompress standard 8-digit UPC-E to standard 12-digit UPC-A', () => {
      // 01234565 expands to 012345000065
      const expanded = expandUpcE('01234565');
      expect(expanded).toBe('012345000065');
    });

    it('should return null for invalid or corrupt barcode lengths', () => {
      expect(expandUpcE('123')).toBeNull();
      expect(expandUpcE('abcdefgh')).toBeNull();
    });
  });

  describe('getBarcodeVariants', () => {
    it('should generate leading zero variants for 11-digit stripped barcodes', () => {
      const variants = getBarcodeVariants('12345678901');
      expect(variants).toContain('012345678901');   // 12-digit UPC-A
      expect(variants).toContain('0012345678901');  // 13-digit EAN-13
    });

    it('should generate 13-digit EAN variant for 12-digit UPC-A barcode', () => {
      const variants = getBarcodeVariants('012345678905');
      expect(variants).toContain('0012345678905'); // 13-digit EAN with prepended 0
      expect(variants).toContain('12345678905');  // 11-digit without leading 0
    });

    it('should generate stripped 12-digit and 13-digit variants from 14-digit GTIN case code', () => {
      const variants = getBarcodeVariants('10012345678902');
      expect(variants).toContain('0012345678902');
      expect(variants).toContain('012345678902');
    });
  });

  describe('resolveBarcodeMatch', () => {
    const mockCatalog: CatalogItem[] = [
      {
        id: 'coke-can',
        name: 'Coca-Cola 330ml Can',
        price: 40,
        category: 'Beverages',
        barcode: '049000028904', // 12-digit UPC
        sku: 'COKE-330',
        packagingOptions: [
          {
            id: 'coke-6pack',
            packName: 'Pack of 6',
            barcode: '049000028911', // Dedicated multi-pack barcode
            multiplier: 6,
            sellingPrice: 220, // Discounted pack price
          },
        ],
      },
      {
        id: 'lays-classic',
        name: 'Lays Classic Salted',
        price: 20,
        category: 'Snacks',
        sku: 'LAYS-SALT-20',
        // No barcode, only SKU
      },
    ];

    it('should resolve primary single-item barcode correctly', () => {
      const match = resolveBarcodeMatch('049000028904', mockCatalog);
      expect(match).not.toBeNull();
      expect(match?.displayName).toBe('Coca-Cola 330ml Can');
      expect(match?.unitPrice).toBe(40);
      expect(match?.multiplier).toBe(1);
      expect(match?.pack).toBeNull();
    });

    it('should prioritize nested multi-pack barcode when scanned', () => {
      const match = resolveBarcodeMatch('049000028911', mockCatalog);
      expect(match).not.toBeNull();
      expect(match?.displayName).toBe('Coca-Cola 330ml Can (Pack of 6)');
      expect(match?.unitPrice).toBe(220);
      expect(match?.multiplier).toBe(6);
      expect(match?.packName).toBe('Pack of 6');
    });

    it('should resolve item even if scanner strips leading zeros', () => {
      // Scanner sends 11 digits instead of 12
      const match = resolveBarcodeMatch('49000028904', mockCatalog);
      expect(match).not.toBeNull();
      expect(match?.item.id).toBe('coke-can');
    });

    it('should fallback to SKU match when barcode is absent or matches SKU', () => {
      const match = resolveBarcodeMatch('LAYS-SALT-20', mockCatalog);
      expect(match).not.toBeNull();
      expect(match?.displayName).toBe('Lays Classic Salted');
      expect(match?.unitPrice).toBe(20);
    });

    it('should return null for unknown unscanned codes', () => {
      const match = resolveBarcodeMatch('999999999999', mockCatalog);
      expect(match).toBeNull();
    });
  });
});
