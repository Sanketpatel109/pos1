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
 * Decompresses an 8-digit or 6-digit UPC-E code to its standard 12-digit UPC-A equivalent.
 */
export function expandUpcE(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  let numberSystem = '0';
  let body = '';
  let checkDigit = '';

  if (digits.length === 8) {
    numberSystem = digits[0];
    body = digits.slice(1, 7);
    checkDigit = digits[7];
  } else if (digits.length === 6) {
    body = digits;
  } else if (digits.length === 7) {
    numberSystem = digits[0];
    body = digits.slice(1);
  } else {
    return null;
  }

  if (body.length !== 6) return null;

  const d1 = body[0];
  const d2 = body[1];
  const d3 = body[2];
  const d4 = body[3];
  const d5 = body[4];
  const d6 = body[5];

  let manufacturer = '';
  let product = '';

  switch (d6) {
    case '0':
    case '1':
    case '2':
      manufacturer = `${d1}${d2}${d6}00`;
      product = `00${d3}${d4}${d5}`;
      break;
    case '3':
      manufacturer = `${d1}${d2}${d3}00`;
      product = `000${d4}${d5}`;
      break;
    case '4':
      manufacturer = `${d1}${d2}${d3}${d4}0`;
      product = `0000${d5}`;
      break;
    default: // '5', '6', '7', '8', '9'
      manufacturer = `${d1}${d2}${d3}${d4}${d5}`;
      product = `0000${d6}`;
      break;
  }

  // Calculate check digit if missing
  if (!checkDigit) {
    const uncheck = `${numberSystem}${manufacturer}${product}`;
    let oddSum = 0;
    let evenSum = 0;
    for (let i = 0; i < 11; i++) {
      const n = parseInt(uncheck[i], 10);
      if (i % 2 === 0) oddSum += n;
      else evenSum += n;
    }
    const total = oddSum * 3 + evenSum;
    const mod = total % 10;
    checkDigit = String(mod === 0 ? 0 : 10 - mod);
  }

  return `${numberSystem}${manufacturer}${product}${checkDigit}`;
}

/**
 * Generates interchangeable barcode variants for US UPC-A (12 digits),
 * international EAN-13 (13 digits), Indian GS1 (890 prefix), UPC-E (8 digits),
 * and GTIN-14 case barcodes.
 */
export function getBarcodeVariants(raw: string): string[] {
  if (!raw) return [];
  const clean = raw.trim().toLowerCase();
  const set = new Set<string>([clean]);

  const alphanumeric = clean.replace(/[^a-z0-9]/g, '');
  if (alphanumeric) set.add(alphanumeric);

  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly) set.add(digitsOnly);

  // 11-digit UPC (missing leading zero dropped by some scanners/databases)
  if (digitsOnly.length === 11) {
    set.add(`0${digitsOnly}`); // 12-digit standard US UPC-A
    set.add(`00${digitsOnly}`); // 13-digit EAN-13 representation
  }

  // 12-digit US UPC-A <-> 13-digit EAN-13 with leading 0
  if (digitsOnly.length === 12) {
    set.add(`0${digitsOnly}`); // 13-digit EAN
    if (digitsOnly.startsWith('0')) {
      set.add(digitsOnly.slice(1)); // 11-digit stripped
    }
  }

  // 13-digit EAN-13 starting with 0 -> standard 12-digit US UPC-A
  if (digitsOnly.length === 13) {
    if (digitsOnly.startsWith('0')) {
      set.add(digitsOnly.slice(1)); // 12-digit US UPC-A
      if (digitsOnly.startsWith('00')) {
        set.add(digitsOnly.slice(2)); // 11-digit stripped
      }
    }
  }

  // 14-digit GTIN / ITF-14 case barcode -> strip packaging indicator
  if (digitsOnly.length === 14) {
    const stripped13 = digitsOnly.slice(1);
    set.add(stripped13);
    if (stripped13.startsWith('0')) {
      set.add(stripped13.slice(1)); // 12-digit
    }
  }

  // 8-digit or 7-digit UPC-E decompression
  if (digitsOnly.length === 8 || digitsOnly.length === 7 || digitsOnly.length === 6) {
    const expanded = expandUpcE(digitsOnly);
    if (expanded) {
      set.add(expanded);
      set.add(`0${expanded}`);
    }
  }

  // Handle stripped leading zeroes
  const noLeadingZeroes = digitsOnly.replace(/^0+/, '');
  if (noLeadingZeroes && noLeadingZeroes.length >= 6) {
    set.add(noLeadingZeroes);
  }

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
