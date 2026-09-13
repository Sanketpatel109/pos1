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
 * Generates interchangeable barcode variants for US UPC-A (12 digits) and international EAN-13 (13 digits with leading 0)
 */
function getBarcodeVariants(raw: string): string[] {
  const clean = raw.trim().toLowerCase();
  const set = new Set<string>([clean]);

  const alphanumeric = clean.replace(/[^a-z0-9]/g, '');
  if (alphanumeric) set.add(alphanumeric);

  // US UPC-A (12 digits) <-> EAN-13 (13 digits with leading 0)
  if (/^\d{12}$/.test(alphanumeric)) {
    set.add(`0${alphanumeric}`); // 13-digit EAN-13 representation
  } else if (/^0\d{12}$/.test(alphanumeric)) {
    set.add(alphanumeric.slice(1)); // 12-digit standard US UPC-A
  }

  // Handle leading zeroes
  const noLeadingZeroes = alphanumeric.replace(/^0+/, '');
  if (noLeadingZeroes) set.add(noLeadingZeroes);

  return Array.from(set);
}

/**
 * High-speed multi-barcode resolution helper.
 * Resolves standard single-unit barcodes (US UPC-A, EAN-13, Code 128) and nested multi-pack barcodes.
 * 
 * Lookup precedence:
 * 1. Nested pack barcode (e.g. 6-pack sleeve / carton barcode)
 * 2. Primary item barcode (e.g. individual bottle UPC)
 * 3. Primary item SKU
 */
export function resolveBarcodeMatch(
  scannedCode: string,
  catalog: CatalogItem[]
): ResolvedBarcodeMatch | null {
  if (!scannedCode || !scannedCode.trim()) return null;
  const scannedVariants = getBarcodeVariants(scannedCode);

  for (const item of catalog) {
    // 1. Check nested packaging option barcode (e.g. 6-pack, 12-pack, Case)
    if (item.packagingOptions && item.packagingOptions.length > 0) {
      for (const pack of item.packagingOptions) {
        if (!pack.barcode) continue;
        const packVariants = getBarcodeVariants(pack.barcode);
        const isMatch = scannedVariants.some((v) => packVariants.includes(v));
        if (isMatch) {
          return {
            item,
            pack,
            unitPrice: pack.sellingPrice,
            multiplier: pack.multiplier || 1,
            packName: pack.packName,
            displayName: `${item.name} (${pack.packName})`,
            barcode: scannedCode.trim(),
          };
        }
      }
    }

    // 2. Primary item barcode (e.g. US UPC-A 12-digit bottle barcode)
    if (item.barcode) {
      const itemVariants = getBarcodeVariants(item.barcode);
      const isMatch = scannedVariants.some((v) => itemVariants.includes(v));
      if (isMatch) {
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

    // 3. Fallback: SKU match
    if (item.sku) {
      const skuVariants = getBarcodeVariants(item.sku);
      const isMatch = scannedVariants.some((v) => skuVariants.includes(v));
      if (isMatch) {
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
  }

  return null;
}
