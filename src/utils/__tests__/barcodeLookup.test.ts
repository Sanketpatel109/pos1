import { describe, it, expect } from 'vitest';
import {
  extractPriceFromTitle,
  detectPackagingTier,
  mapToStoreCategory,
} from '../../services/barcodeLookup';

describe('Global Barcode Lookup & Package Recognition Suite', () => {
  describe('extractPriceFromTitle', () => {
    it('should extract US Dollar prices embedded in titles', () => {
      expect(extractPriceFromTitle('Coca-Cola 20 fl oz $1.99 Bottle')).toBe(1.99);
      expect(extractPriceFromTitle('Jack Daniels Whiskey 750ml $24.99')).toBe(24.99);
      expect(extractPriceFromTitle('Premium Olive Oil 50$')).toBe(50.0);
    });

    it('should extract Indian Rupee prices embedded in titles', () => {
      expect(extractPriceFromTitle('Lays Classic Salted 20rs')).toBe(20.0);
      expect(extractPriceFromTitle('Parle-G 10 Rs')).toBe(10.0);
      expect(extractPriceFromTitle('Dairy Milk Silk ₹80')).toBe(80.0);
      expect(extractPriceFromTitle('Amul Butter 500g 275/-')).toBe(275.0);
    });

    it('should return undefined when no price pattern is found', () => {
      expect(extractPriceFromTitle('Heinz Tomato Ketchup 32 oz')).toBeUndefined();
      expect(extractPriceFromTitle('')).toBeUndefined();
    });
  });

  describe('detectPackagingTier', () => {
    it('should identify multi-pack "Pack of 6" and clean base product title', () => {
      const result = detectPackagingTier('Corona Extra Beer Pack of 6');
      expect(result.isMultiPack).toBe(true);
      expect(result.multiplier).toBe(6);
      expect(result.packName).toBe('Pack of 6');
      expect(result.cleanedBaseName).toBe('Corona Extra Beer');
    });

    it('should identify case quantities "Case of 24"', () => {
      const result = detectPackagingTier('Red Bull Energy Drink (Case of 24)');
      expect(result.isMultiPack).toBe(true);
      expect(result.multiplier).toBe(24);
      expect(result.packName).toBe('Case of 24');
      expect(result.cleanedBaseName).toBe('Red Bull Energy Drink');
    });

    it('should identify numeric multiplier patterns like "12-pack" or "6 cans"', () => {
      const result = detectPackagingTier('Diet Coke 12-pack 12 fl oz');
      expect(result.isMultiPack).toBe(true);
      expect(result.multiplier).toBe(12);
      expect(result.detectedUnit).toBe('fl oz');
    });

    it('should handle single unit products accurately', () => {
      const result = detectPackagingTier('Colgate Total Toothpaste 150g');
      expect(result.isMultiPack).toBe(false);
      expect(result.multiplier).toBe(1);
      expect(result.packName).toBe('Single Unit');
      expect(result.detectedUnit).toBe('g');
    });
  });

  describe('mapToStoreCategory', () => {
    const storeCategories = [
      { name: 'Beverages' },
      { name: 'Snacks' },
      { name: 'Dairy & Eggs' },
      { name: 'Personal Care' },
    ];

    it('should match category directly to existing store category if present', () => {
      const mapped = mapToStoreCategory('Snacks and Confectionery', storeCategories);
      expect(mapped).toBe('Snacks');
    });

    it('should map soda and juices to Beverages', () => {
      const mapped = mapToStoreCategory('Cold Drinks, Soda, Sparkling Water', storeCategories);
      expect(mapped).toBe('Beverages');
    });
  });
});
