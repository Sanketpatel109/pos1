/**
 * Multi-Registry Global & US Barcode Lookup Service
 *
 * Supports:
 * - US Products: 12-digit UPC-A, 8-digit UPC-E, and 13-digit EAN variants
 * - US Registries: US Open Food Facts (us.openfoodfacts.org) & Global Open Food Facts
 * - Personal Care / Cosmetics: Open Beauty Facts (world.openbeautyfacts.org)
 * - General Merchandise / Electronics: Open Products Facts (world.openproductsfacts.org)
 * - Indian FMCG (890 GS1 prefix): in.openfoodfacts.org
 * - Local offline catalog hit matching
 * - Multi-pack bundling detection & clean base naming
 * - Price extraction for both USD ($) and INR (₹, Rs)
 */

import { INITIAL_CATALOG } from '../data/catalog';

export interface PackagingDetectionResult {
  isMultiPack: boolean;
  multiplier: number;
  packName: string;
  cleanedBaseName: string;
  detectedUnit: string;
}

export interface ProductLookupResult {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  unit: string;
  suggestedPrice?: number;
  packaging?: PackagingDetectionResult;
  sourceRegistry?: string;
}

/**
 * Extracts retail price embedded in product titles:
 * - US formats: "$1.99", "$2.49", "$25", "1.99$"
 * - Indian formats: "Lays Classics Salted 20rs", "Parle-G 10 Rs", "Dairy Milk ₹40", "50/-"
 */
export function extractPriceFromTitle(title: string): number | undefined {
  if (!title) return undefined;

  // US Dollar check: $1.99, $25, 2.99$
  const usMatch = title.match(/(?:\$\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*\$)/i);
  if (usMatch) {
    const val = parseFloat(usMatch[1] || usMatch[2]);
    if (!isNaN(val) && val > 0 && val <= 50000) {
      return val;
    }
  }

  // Indian Rupee check: Rs. 20, ₹20, 20rs, 50/-
  const inMatch = title.match(/(?:(?:rs\.?|₹)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|₹|\/-))/i);
  if (inMatch) {
    const val = parseFloat(inMatch[1] || inMatch[2]);
    if (!isNaN(val) && val > 0 && val <= 50000) {
      return val;
    }
  }

  return undefined;
}

/**
 * Detects whether a product title represents a multi-pack or bulk bundle
 * (e.g. "Pack of 6", "12 fl oz (Pack of 12)", "6x330ml", "Case of 24").
 */
export function detectPackagingTier(
  rawName: string,
  quantity?: string,
  packagingText?: string
): PackagingDetectionResult {
  const combined = `${rawName} ${quantity || ''} ${packagingText || ''}`.toLowerCase();

  let detectedMultiplier = 1;
  let packType = 'Pack';

  // 1. Check for multiplier patterns (e.g. "pack of 6", "box of 12", "case of 24", "12 pack", "6x330ml")
  const packOfMatch = combined.match(/(?:pack|box|case|tray|bundle)\s*of\s*(\d+)/i);
  const numPackMatch = combined.match(/(\d+)\s*[- ]?(?:pack|pk|cans?|bottles?|ct|count|pieces?)/i);
  const xMultMatch = combined.match(/(\d+)\s*[xX*]\s*\d+/i);

  if (packOfMatch) {
    detectedMultiplier = parseInt(packOfMatch[1], 10);
  } else if (numPackMatch) {
    detectedMultiplier = parseInt(numPackMatch[1], 10);
  } else if (xMultMatch) {
    detectedMultiplier = parseInt(xMultMatch[1], 10);
  }

  if (isNaN(detectedMultiplier) || detectedMultiplier <= 0 || detectedMultiplier > 1000) {
    detectedMultiplier = 1;
  }

  // Container classification
  if (/case|carton/i.test(combined)) {
    packType = 'Case';
  } else if (/box/i.test(combined)) {
    packType = 'Box';
  } else if (/tray/i.test(combined)) {
    packType = 'Tray';
  } else {
    packType = 'Pack';
  }

  // Unit detection (supports US imperial fl oz / oz / lb and metric ml / g / pcs)
  let detectedUnit = 'pcs';
  if (/fl(?:\.|\s*)oz/i.test(combined)) {
    detectedUnit = 'fl oz';
  } else if (/(?:\b|\d)oz\b/i.test(combined)) {
    detectedUnit = 'oz';
  } else if (/gallon|gal\b/i.test(combined)) {
    detectedUnit = 'gal';
  } else if (/\blb\b|lbs\b|pound/i.test(combined)) {
    detectedUnit = 'lb';
  } else if (/bottle/i.test(combined)) {
    detectedUnit = 'bottle';
  } else if (/can\b/i.test(combined)) {
    detectedUnit = 'can';
  } else if (/ml\b/i.test(combined)) {
    detectedUnit = 'ml';
  } else if (/\bkg\b/i.test(combined)) {
    detectedUnit = 'kg';
  } else if (/\bg\b/i.test(combined)) {
    detectedUnit = 'g';
  }

  const isMultiPack = detectedMultiplier > 1;

  // Clean the base product title of multi-pack noise
  let cleanedBaseName = rawName
    .replace(/\s*[-–(]?\s*(?:pack|box|case|tray)\s*of\s*\d+\s*[)]?/gi, '')
    .replace(/\s*[-–(]?\s*\d+\s*[- ]?(?:pack|pk|cans?|bottles?|ct|count)\s*[)]?/gi, '')
    .replace(/\s*[-–(]?\s*\d+\s*[xX*]\s*\d+.*[)]?/gi, '')
    .trim();

  if (!cleanedBaseName) {
    cleanedBaseName = rawName;
  }

  return {
    isMultiPack,
    multiplier: detectedMultiplier,
    packName: isMultiPack ? `${packType} of ${detectedMultiplier}` : 'Single Unit',
    cleanedBaseName,
    detectedUnit,
  };
}

/**
 * Maps categories returned by global and US databases to store POS categories.
 */
export function mapToStoreCategory(categoriesStr: string, existingCategories: { name: string }[]): string {
  const lower = categoriesStr.toLowerCase();

  // 1. Direct match with user's store categories
  for (const cat of existingCategories) {
    if (lower.includes(cat.name.toLowerCase())) {
      return cat.name;
    }
  }

  // 2. Semantic matching for typical POS departments
  if (/beverage|drink|soda|water|juice|coffee|tea|cola|beer|wine|milk|seltzer/i.test(lower)) {
    return findCategory(existingCategories, ['drinks', 'beverages']) || 'Drinks';
  }
  if (/snack|biscuit|cookie|chips|crisps|crackers|fast food|burger|pizza|nacho|pretzel/i.test(lower)) {
    return findCategory(existingCategories, ['fast food', 'snacks']) || 'Fast Food';
  }
  if (/dessert|chocolate|sweet|ice cream|candy|cake|pastry|bakery/i.test(lower)) {
    return findCategory(existingCategories, ['desserts', 'sweets', 'bakery']) || 'Desserts';
  }
  if (/fruit|vegetable|produce|salad|organic/i.test(lower)) {
    return findCategory(existingCategories, ['produce', 'vegetables', 'fruits']) || 'Produce';
  }
  if (/dairy|cheese|yogurt|butter/i.test(lower)) {
    return findCategory(existingCategories, ['dairy', 'groceries']) || 'Groceries';
  }
  if (/cereal|breakfast|oatmeal|condiment|sauce|ketchup|mustard|spice/i.test(lower)) {
    return findCategory(existingCategories, ['groceries', 'pantry']) || 'Groceries';
  }

  return existingCategories[0]?.name || 'General';
}

function findCategory(categories: { name: string }[], matches: string[]): string | null {
  for (const cat of categories) {
    for (const match of matches) {
      if (cat.name.toLowerCase().includes(match)) {
        return cat.name;
      }
    }
  }
  return null;
}

/**
 * Generates barcode variants to handle US UPC-A (12-digit) and EAN-13 (13-digit) normalization.
 *
 * In retail:
 * - A US UPC-A is 12 digits (e.g. 049000000443).
 * - When scanned as an EAN-13, a leading 0 is added (e.g. 004900000443).
 * - Some databases store items under the 12-digit key, others under the 13-digit key.
 */
export function getBarcodeVariants(barcode: string): string[] {
  const clean = barcode.replace(/[\s-]/g, '').trim();
  const variants = new Set<string>();
  variants.add(clean);

  // If 13-digit starting with 0, add stripped 12-digit UPC-A
  if (clean.length === 13 && clean.startsWith('0')) {
    variants.add(clean.slice(1));
  }

  // If 12-digit (standard US UPC-A), add 13-digit EAN-13 with leading 0
  if (clean.length === 12) {
    variants.add(`0${clean}`);
  }

  // If string starts with 0 and has >= 8 characters, also add version without leading zero
  if (clean.startsWith('0') && clean.length >= 8) {
    variants.add(clean.replace(/^0+/, ''));
    variants.add(clean.slice(1));
  }

  // If 11-digit, add padded 12-digit and 13-digit versions
  if (clean.length === 11) {
    variants.add(`0${clean}`);
    variants.add(`00${clean}`);
  }

  return Array.from(variants);
}

/**
 * Multi-source product lookup service:
 * 1. Checks local initial preset catalog for instant offline hit.
 * 2. Generates UPC/EAN variants (12-digit UPC-A and 13-digit EAN-13).
 * 3. Dynamically queries US and global registries:
 *    - For US / Global barcodes: us.openfoodfacts.org, world.openfoodfacts.org,
 *      world.openbeautyfacts.org, world.openproductsfacts.org.
 *    - For Indian barcodes (890 GS1 prefix): in.openfoodfacts.org prioritized.
 * 4. Extracts packaging tiers, units, and retail prices.
 */
export async function lookupBarcodeDetails(
  barcode: string,
  existingCategories: { name: string }[] = []
): Promise<ProductLookupResult | null> {
  const cleanCode = barcode.replace(/[\s-]/g, '').trim();
  if (!cleanCode || cleanCode.length < 4) return null;

  // 1. Try local sample preset match (Kinley water, beverages, snacks)
  const localHit = INITIAL_CATALOG.find((item) => {
    if (item.barcode === cleanCode) return true;
    if (item.packagingOptions?.some((p) => p.barcode === cleanCode)) return true;
    return false;
  });

  if (localHit) {
    return {
      barcode: cleanCode,
      name: localHit.name,
      category: localHit.category,
      imageUrl: localHit.image,
      unit: localHit.unit || 'pcs',
      suggestedPrice: localHit.price,
      sourceRegistry: 'Local Store Catalog',
    };
  }

  // 2. Generate normalized barcode variations (12-digit UPC <-> 13-digit EAN)
  const variants = getBarcodeVariants(cleanCode);
  const isIndianCode = cleanCode.startsWith('890');

  // 3. Query prioritized endpoints across all variants
  for (const queryCode of variants) {
    const endpoints: { url: string; registryName: string }[] = isIndianCode
      ? [
          {
            url: `https://in.openfoodfacts.org/api/v2/product/${encodeURIComponent(queryCode)}.json`,
            registryName: 'Open Food Facts (India)',
          },
          {
            url: `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(queryCode)}.json`,
            registryName: 'Open Food Facts (Global)',
          },
          {
            url: `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(queryCode)}.json`,
            registryName: 'Open Beauty Facts',
          },
          {
            url: `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(queryCode)}.json`,
            registryName: 'Open Products Facts',
          },
        ]
      : [
          {
            url: `https://us.openfoodfacts.org/api/v2/product/${encodeURIComponent(queryCode)}.json`,
            registryName: 'Open Food Facts (USA)',
          },
          {
            url: `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(queryCode)}.json`,
            registryName: 'Open Food Facts (Global)',
          },
          {
            url: `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(queryCode)}.json`,
            registryName: 'Open Beauty Facts (Cosmetics & Personal Care)',
          },
          {
            url: `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(queryCode)}.json`,
            registryName: 'Open Products Facts (General Merchandise)',
          },
          {
            url: `https://in.openfoodfacts.org/api/v2/product/${encodeURIComponent(queryCode)}.json`,
            registryName: 'Open Food Facts',
          },
        ];

    for (const { url, registryName } of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          const rawName = (
            p.product_name_en ||
            p.product_name ||
            p.product_name_en_imported ||
            p.generic_name ||
            p.brands ||
            ''
          ).trim();

          if (!rawName) continue;

          const brand = p.brands ? p.brands.split(',')[0].trim() : undefined;
          const packaging = detectPackagingTier(rawName, p.quantity, p.packaging_text);
          const category = mapToStoreCategory(p.categories || '', existingCategories);
          const imageUrl = p.image_front_url || p.image_url || p.image_front_small_url || p.image_small_url;
          const suggestedPrice = extractPriceFromTitle(rawName);

          const finalName = packaging.isMultiPack ? packaging.cleanedBaseName : rawName;

          return {
            barcode: cleanCode,
            name: finalName,
            brand,
            category,
            imageUrl,
            unit: packaging.detectedUnit,
            suggestedPrice,
            packaging,
            sourceRegistry: registryName,
          };
        }
      } catch {
        // Continue seamlessly to next registry on timeout or network hiccup
      }
    }
  }

  return null;
}
