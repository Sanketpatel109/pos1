import { CatalogItem, PackagingOption } from '../types';

export interface ResolvedBarcodeMatch {
  item: CatalogItem;
  pack: PackagingOption | null;
  unitPrice: number;
  multiplier: number;
  packName?: string;
  displayName: string;
  barcode: string;
}

/**
 * High-speed multi-barcode resolution helper.
 * Resolves both standard single-unit barcodes and nested multi-pack barcodes.
 * 
 * Lookup precedence:
 * 1. Nested pack barcode (e.g. 6-pack sleeve / carton barcode)
 * 2. Primary item barcode (e.g. individual piece EAN)
 * 3. Primary item SKU
 */
export function resolveBarcodeMatch(
  scannedCode: string,
  catalog: CatalogItem[]
): ResolvedBarcodeMatch | null {
  if (!scannedCode || !scannedCode.trim()) return null;
  const clean = scannedCode.trim().toLowerCase();

  for (const item of catalog) {
    // 1. Check nested packaging option barcode
    if (item.packagingOptions && item.packagingOptions.length > 0) {
      const matchedPack = item.packagingOptions.find(
        (p) => p.barcode && p.barcode.trim().toLowerCase() === clean
      );
      if (matchedPack) {
        return {
          item,
          pack: matchedPack,
          unitPrice: matchedPack.sellingPrice,
          multiplier: matchedPack.multiplier || 1,
          packName: matchedPack.packName,
          displayName: `${item.name} (${matchedPack.packName})`,
          barcode: scannedCode.trim(),
        };
      }
    }

    // 2. Primary item barcode
    if (item.barcode && item.barcode.trim().toLowerCase() === clean) {
      return {
        item,
        pack: null,
        unitPrice: item.price,
        multiplier: 1,
        packName: undefined,
        displayName: item.name,
        barcode: scannedCode.trim(),
      };
    }

    // 3. Fallback: SKU match
    if (item.sku && item.sku.trim().toLowerCase() === clean) {
      return {
        item,
        pack: null,
        unitPrice: item.price,
        multiplier: 1,
        packName: undefined,
        displayName: item.name,
        barcode: scannedCode.trim(),
      };
    }
  }

  return null;
}
