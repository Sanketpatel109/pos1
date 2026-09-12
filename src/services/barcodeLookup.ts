/**
 * Service to lookup product details and detect multi-pack packaging tiers from global barcode registries.
 * Primary: Open Food Facts API (free, open source, millions of packaged FMCG products).
 */

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
  packaging?: PackagingDetectionResult;
}

/**
 * Heuristics to detect whether a product title or packaging string describes a multi-pack (e.g. 6-pack, Box of 12).
 */
export function detectPackagingTier(
  rawName: string,
  quantityStr?: string,
  packagingText?: string
): PackagingDetectionResult {
  const combined = `${rawName} ${quantityStr || ''} ${packagingText || ''}`.toLowerCase();

  // Common packaging multiplier patterns:
  // 1. "6 x 330ml", "12 x 500ml", "4 x 250g"
  // 2. "Pack of 6", "Box of 12", "Case of 24", "Tray of 24"
  // 3. "6-pack", "12 pack", "4pack"
  // 4. "6 pcs", "10 units", "12 cans", "6 bottles"
  const multiplierRegexes = [
    /(\d+)\s*(?:x|\*)\s*(?:\d+(?:\.\d+)?\s*(?:ml|l|cl|g|kg|oz)|cans?|bottles?|pcs|units?)/i,
    /(?:pack|box|case|tray|carton|set)\s*of\s*(\d+)/i,
    /(\d+)\s*[- ]?(?:pack|can|bottle|sachet|unit|pcs)\b/i,
    /\b(\d+)\s*in\s*1\b/i,
  ];

  let detectedMultiplier = 1;
  let packType = 'Pack';

  for (const regex of multiplierRegexes) {
    const match = combined.match(regex);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 1 && parsed <= 144) {
        detectedMultiplier = parsed;
        break;
      }
    }
  }

  // Detect pack container name: Box, Case, Pack, Carton, Tray
  if (/case|carton/i.test(combined)) {
    packType = 'Case';
  } else if (/box/i.test(combined)) {
    packType = 'Box';
  } else if (/tray/i.test(combined)) {
    packType = 'Tray';
  } else {
    packType = 'Pack';
  }

  // Detect unit: bottle, can, pcs
  let detectedUnit = 'pcs';
  if (/bottle/i.test(combined)) {
    detectedUnit = 'bottle';
  } else if (/can/i.test(combined)) {
    detectedUnit = 'can';
  }

  const isMultiPack = detectedMultiplier > 1;

  // Clean the base product name if it has trailing "(Pack of 6)" or "6x330ml"
  let cleanedBaseName = rawName
    .replace(/\s*[-–(]?\s*(?:pack|box|case|tray)\s*of\s*\d+\s*[)]?/gi, '')
    .replace(/\s*[-–(]?\s*\d+\s*[- ]?(?:pack|cans?|bottles?)\s*[)]?/gi, '')
    .replace(/\s*[-–(]?\s*\d+\s*(?:x|\*)\s*\d+.*[)]?/gi, '')
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
 * Maps categories returned by global databases to typical retail POS categories.
 */
export function mapToStoreCategory(categoriesStr: string, existingCategories: { name: string }[]): string {
  const lower = categoriesStr.toLowerCase();

  // Check against existing categories first
  for (const cat of existingCategories) {
    if (lower.includes(cat.name.toLowerCase())) {
      return cat.name;
    }
  }

  if (/beverage|drink|soda|water|juice|coffee|tea|cola|beer|wine|milk/i.test(lower)) {
    return findCategory(existingCategories, ['drinks', 'beverages']) || 'Drinks';
  }
  if (/snack|biscuit|cookie|chips|crisps|fast food|burger|pizza/i.test(lower)) {
    return findCategory(existingCategories, ['fast food', 'snacks']) || 'Fast Food';
  }
  if (/dessert|chocolate|sweet|ice cream|candy|cake/i.test(lower)) {
    return findCategory(existingCategories, ['desserts', 'sweets']) || 'Desserts';
  }
  if (/fruit|vegetable|produce/i.test(lower)) {
    return findCategory(existingCategories, ['produce', 'vegetables', 'fruits']) || 'Produce';
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
 * Looks up product details from Open Food Facts API with a 4s timeout.
 */
export async function lookupBarcodeDetails(
  barcode: string,
  existingCategories: { name: string }[] = []
): Promise<ProductLookupResult | null> {
  const cleanCode = barcode.trim();
  if (!cleanCode || cleanCode.length < 4) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    const rawName = p.product_name_en || p.product_name || p.generic_name || '';
    if (!rawName.trim()) {
      return null;
    }

    const brand = p.brands ? p.brands.split(',')[0].trim() : undefined;
    const packaging = detectPackagingTier(rawName, p.quantity, p.packaging_text);
    const category = mapToStoreCategory(p.categories || '', existingCategories);

    // Image: Prefer medium or front display
    const imageUrl = p.image_front_url || p.image_url || p.image_front_small_url;

    return {
      barcode: cleanCode,
      name: packaging.isMultiPack ? packaging.cleanedBaseName : rawName.trim(),
      brand,
      category,
      imageUrl,
      unit: packaging.detectedUnit,
      packaging,
    };
  } catch (err: any) {
    // Graceful silent fallback on timeout or network offline
    console.info('Barcode lookup skipped or offline:', err?.message || err);
    return null;
  }
}
