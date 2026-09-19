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

import { LIQUOR_AND_FMCG_REGISTRY } from '../data/liquorAndFMCGRegistry';
import { getBarcodeVariants } from '../utils/barcodeResolver';

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
  } else if (/(?:\b|\d)ml\b/i.test(combined)) {
    detectedUnit = 'ml';
  } else if (/(?:\b|\d)kg\b/i.test(combined)) {
    detectedUnit = 'kg';
  } else if (/(?:\b|\d)g\b/i.test(combined)) {
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

  // 2. Liquor, Spirits, Wine & Beer for Liquor Store POS
  if (/liquor|spirits|whiskey|whisky|vodka|tequila|rum|gin|cognac|brandy|bourbon|scotch|liqueur|alcoholic/i.test(lower)) {
    return findCategory(existingCategories, ['liquor', 'spirits', 'alcohol', 'drinks', 'beverages']) || 'Liquor';
  }
  if (/beer|lager|ale|cider|seltzer|malt|pilsner|stout/i.test(lower)) {
    return findCategory(existingCategories, ['beer & wine', 'beer', 'drinks', 'beverages']) || 'Beer & Wine';
  }
  if (/wine|champagne|prosecco|cabernet|chardonnay|merlot|pinot|sauvignon|moscato|rose|red wine|white wine/i.test(lower)) {
    return findCategory(existingCategories, ['beer & wine', 'wine', 'drinks', 'beverages']) || 'Beer & Wine';
  }

  // 3. Semantic matching for typical POS departments
  if (/beverage|drink|soda|water|juice|coffee|tea|cola|milk|seltzer/i.test(lower)) {
    return findCategory(existingCategories, ['drinks', 'beverages']) || 'Drinks';
  }
  if (/snack|biscuit|cookie|chips|crisps|crackers|fast food|burger|pizza|nacho|pretzel|namkeen/i.test(lower)) {
    return findCategory(existingCategories, ['fast food', 'snacks']) || 'Fast Food';
  }
  if (/dessert|chocolate|sweet|ice cream|candy|cake|pastry|bakery/i.test(lower)) {
    return findCategory(existingCategories, ['desserts', 'sweets', 'bakery']) || 'Desserts';
  }
  if (/fruit|vegetable|produce|salad|organic/i.test(lower)) {
    return findCategory(existingCategories, ['produce', 'vegetables', 'fruits']) || 'Produce';
  }
  if (/dairy|cheese|yogurt|butter|ghee/i.test(lower)) {
    return findCategory(existingCategories, ['dairy', 'groceries']) || 'Groceries';
  }
  if (/cereal|breakfast|oatmeal|condiment|sauce|ketchup|mustard|spice|pantry|grain|flour|atta/i.test(lower)) {
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

export { getBarcodeVariants };

/**
 * High-Speed Multi-Source Product Lookup Service:
 * 1. Checks local initial preset catalog for instant offline hit (0ms).
 * 2. Checks built-in Liquor Store & FMCG verified registry (0ms).
 * 3. Normalizes UPC-A, EAN-13, 890 GS1 India, and UPC-E variations.
 * 4. Queries global registries in parallel with fast 2.5s racing.
 * 5. Generates clean branded display titles (e.g. "Jack Daniel's Old No. 7 Tennessee Whiskey 750ml").
 */
export async function lookupBarcodeDetails(
  barcode: string,
  existingCategories: { name: string }[] = []
): Promise<ProductLookupResult | null> {
  const cleanCode = barcode.replace(/[\s-]/g, '').trim();
  if (!cleanCode || cleanCode.length < 3) return null;

  // 1. Generate normalized barcode variations
  const variants = getBarcodeVariants(cleanCode);

  // 3. Instant 0ms Offline Liquor & FMCG Verified Registry Hit
  for (const variant of variants) {
    const presetHit = LIQUOR_AND_FMCG_REGISTRY.find((item) => {
      const itemVariants = getBarcodeVariants(item.barcode);
      return itemVariants.includes(variant);
    });

    if (presetHit) {
      return {
        barcode: cleanCode,
        name: presetHit.name,
        brand: presetHit.brand,
        category: mapToStoreCategory(presetHit.category, existingCategories),
        unit: presetHit.unit,
        suggestedPrice: presetHit.suggestedPrice,
        sourceRegistry: 'Verified Product Registry',
        packaging: presetHit.packCount && presetHit.packCount > 1
          ? {
              isMultiPack: true,
              multiplier: presetHit.packCount,
              packName: presetHit.packName || `${presetHit.packCount}-Pack`,
              cleanedBaseName: presetHit.name,
              detectedUnit: presetHit.unit,
            }
          : undefined,
      };
    }
  }

  // 4. Books & Publications via Open Library (ISBN GS1 Prefix 978 / 979)
  if (cleanCode.startsWith('978') || cleanCode.startsWith('979')) {
    try {
      const bookCtrl = new AbortController();
      const bookTimer = setTimeout(() => bookCtrl.abort(), 2500);
      const bookResp = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(cleanCode)}.json`, {
        signal: bookCtrl.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(bookTimer);
      if (bookResp.ok) {
        const bookData = await bookResp.json();
        if (bookData.title) {
          const bookTitle = bookData.subtitle ? `${bookData.title}: ${bookData.subtitle}` : bookData.title;
          return {
            barcode: cleanCode,
            name: bookTitle,
            category: mapToStoreCategory('book publication reading education', existingCategories),
            unit: 'pcs',
            sourceRegistry: 'Open Library Books',
          };
        }
      }
    } catch {}
  }

  // 5. Check for Optional Commercial Barcode API Key (UPCitemdb / BarcodeLookup)
  let userApiKey = '';
  let userProvider = 'auto';
  if (typeof window !== 'undefined' && window.localStorage) {
    userApiKey = localStorage.getItem('pos_barcode_api_key') || '';
    userProvider = localStorage.getItem('pos_barcode_provider') || 'auto';
  }

  // 5a. If BarcodeLookup.com API key is provided, query directly
  if (userApiKey && (userProvider === 'barcodelookup' || userApiKey.length === 24 || userApiKey.length === 32)) {
    try {
      const blCtrl = new AbortController();
      const blTimer = setTimeout(() => blCtrl.abort(), 3000);
      const blResp = await fetch(
        `https://api.barcodelookup.com/v3/products?barcode=${encodeURIComponent(cleanCode)}&formatted=y&key=${encodeURIComponent(userApiKey)}`,
        { signal: blCtrl.signal }
      );
      clearTimeout(blTimer);
      if (blResp.ok) {
        const blData = await blResp.json();
        const p = blData.products?.[0];
        if (p && p.title) {
          return {
            barcode: cleanCode,
            name: p.title,
            brand: p.brand || undefined,
            category: mapToStoreCategory(p.category || '', existingCategories),
            imageUrl: p.images?.[0] || undefined,
            unit: 'pcs',
            sourceRegistry: 'BarcodeLookup Premium',
          };
        }
      }
    } catch {}
  }

  // 6. Online Cloud Multi-Registry Query (Parallelized with 2.8s Timeout)
  const isIndianCode = cleanCode.startsWith('890');

  // Build target candidate URLs across Food, Beauty, Products, and UPC registries
  const candidateUrls: { url: string; registry: string; isUpcDb?: boolean }[] = [];

  for (const queryCode of variants.slice(0, 3)) {
    const encoded = encodeURIComponent(queryCode);
    if (isIndianCode) {
      candidateUrls.push({
        url: `https://in.openfoodfacts.org/api/v2/product/${encoded}.json`,
        registry: 'Open Food Facts (India)',
      });
      candidateUrls.push({
        url: `https://world.openfoodfacts.org/api/v2/product/${encoded}.json`,
        registry: 'Open Food Facts (Global)',
      });
    } else {
      candidateUrls.push({
        url: `https://world.openfoodfacts.org/api/v2/product/${encoded}.json`,
        registry: 'Open Food Facts (Global)',
      });
      candidateUrls.push({
        url: `https://us.openfoodfacts.org/api/v2/product/${encoded}.json`,
        registry: 'Open Food Facts (USA)',
      });
    }
    candidateUrls.push({
      url: `https://world.openfoodfacts.org/api/v0/product/${encoded}.json`,
      registry: 'Open Food Facts',
    });
    candidateUrls.push({
      url: `https://world.openproductsfacts.org/api/v2/product/${encoded}.json`,
      registry: 'Open Products Facts (General Goods)',
    });
    candidateUrls.push({
      url: `https://world.openbeautyfacts.org/api/v2/product/${encoded}.json`,
      registry: 'Open Beauty Facts (Cosmetics & Toiletries)',
    });

    // Universal Merchandise & Electronics registry
    candidateUrls.push({
      url: `https://api.upcitemdb.com/prod/trial/lookup?upc=${encoded}`,
      registry: 'UPCitemdb Universal Registry',
      isUpcDb: true,
    });
  }

  // Query candidate endpoints in parallel
  const fetchProduct = async (endpoint: { url: string; registry: string; isUpcDb?: boolean }): Promise<ProductLookupResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (endpoint.isUpcDb && userApiKey) {
        headers['user_key'] = userApiKey;
        headers['key_type'] = '3scale';
      }

      const resp = await fetch(endpoint.url, {
        signal: controller.signal,
        headers,
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error('HTTP status ' + resp.status);
      const data = await resp.json();

      // UPCitemdb response format
      if (endpoint.isUpcDb && data.code === 'OK' && data.items && data.items.length > 0) {
        const item = data.items[0];
        const rawName = (item.title || '').trim();
        if (!rawName) throw new Error('No product title');

        const brand = (item.brand || '').trim();
        const packaging = detectPackagingTier(rawName);
        const category = mapToStoreCategory(item.category || '', existingCategories);
        const imageUrl = item.images?.[0] || undefined;
        const suggestedPrice = extractPriceFromTitle(rawName) || (item.lowest_recorded_price ? Number(item.lowest_recorded_price) : undefined);

        return {
          barcode: cleanCode,
          name: rawName,
          brand: brand || undefined,
          category,
          imageUrl,
          unit: packaging.detectedUnit,
          suggestedPrice,
          packaging,
          sourceRegistry: endpoint.registry,
        };
      }

      // Open Food / Products / Beauty Facts response format
      if ((data.status === 1 || data.status_verbose === 'product found') && data.product) {
        const p = data.product;
        const rawName = (
          p.product_name_en ||
          p.product_name ||
          p.product_name_en_imported ||
          p.generic_name ||
          p.brands ||
          ''
        ).trim();

        if (!rawName) throw new Error('No product name');

        const brand = (p.brands || p.brand_owner || '').split(',')[0].trim();
        const quantity = (p.quantity || '').trim();

        // Assemble clean branded commercial title: "Brand + Name + Quantity"
        let fullTitle = rawName;
        if (brand && !fullTitle.toLowerCase().includes(brand.toLowerCase())) {
          fullTitle = `${brand} ${fullTitle}`;
        }
        if (quantity && !fullTitle.toLowerCase().includes(quantity.toLowerCase())) {
          fullTitle = `${fullTitle} ${quantity}`;
        }
        fullTitle = fullTitle.replace(/\s+/g, ' ').trim();

        const packaging = detectPackagingTier(fullTitle, p.quantity, p.packaging_text);
        const category = mapToStoreCategory(p.categories || '', existingCategories);
        const imageUrl = p.image_front_url || p.image_url || p.image_front_small_url || p.image_small_url;
        const suggestedPrice = extractPriceFromTitle(fullTitle);

        return {
          barcode: cleanCode,
          name: fullTitle,
          brand: brand || undefined,
          category,
          imageUrl,
          unit: packaging.detectedUnit,
          suggestedPrice,
          packaging,
          sourceRegistry: endpoint.registry,
        };
      }
      throw new Error('Product not found in registry');
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    // Race first successful response
    const firstFound = await Promise.any(candidateUrls.map((item) => fetchProduct(item)));
    return firstFound;
  } catch {
    // All endpoints completed without hit or timed out
    return null;
  }
}

/**
 * Generates direct Google Web Search URL for any barcode
 */
export function getWebSearchUrl(barcode: string): string {
  const clean = barcode.replace(/[\s-]/g, '').trim();
  return `https://www.google.com/search?q=${encodeURIComponent(clean + ' UPC barcode')}`;
}

/**
 * Generates direct Amazon search URL for any barcode
 */
export function getAmazonSearchUrl(barcode: string): string {
  const clean = barcode.replace(/[\s-]/g, '').trim();
  return `https://www.amazon.com/s?k=${encodeURIComponent(clean)}`;
}

/**
 * Auto-fetches the exact high-res product photo from global retail CDNs.
 * Saves 99.9% database/server storage by returning an 80-byte CDN URL instead of a 100KB Base64 blob.
 * 
 * Lookup strategy:
 * 1. Exact Barcode Registry Lookup via Open Food Facts / UPCitemdb
 * 2. Text Search by Product Name / Brand
 */
export async function fetchProductImage(
  barcode?: string,
  productName?: string
): Promise<string | null> {
  // Strategy 1: Exact Barcode Registry Lookup
  if (barcode && barcode.trim()) {
    try {
      const barcodeRes = await lookupBarcodeDetails(barcode.trim());
      if (barcodeRes && barcodeRes.imageUrl) {
        return barcodeRes.imageUrl;
      }
    } catch {}
  }

  // Strategy 2: Product Name Search via Open Food Facts Search API
  if (productName && productName.trim()) {
    try {
      const cleanName = encodeURIComponent(productName.trim());
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${cleanName}&search_simple=1&action=process&json=1&page_size=5`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          for (const p of data.products) {
            const img = p.image_front_url || p.image_url || p.image_front_small_url || p.image_small_url;
            if (img && typeof img === 'string' && img.startsWith('http')) {
              return img;
            }
          }
        }
      }
    } catch {}
  }

  return null;
}
