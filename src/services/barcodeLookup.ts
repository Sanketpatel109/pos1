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
  suggestedPrice?: number;
  packaging?: PackagingDetectionResult;
}

/**
 * Extracts retail price embedded in product titles (e.g. "Lays Classics Salted 20rs", "Parle-G 10 Rs", "Dairy Milk ₹40", "50/-").
 */
export function extractPriceFromTitle(title: string): number | undefined {
  if (!title) return undefined;
  const match = title.match(/(?:(?:rs\.?|₹)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|₹|\/-))/i);
  if (match) {
    const val = parseFloat(match[1] || match[2]);
    if (!isNaN(val) && val > 0 && val <= 50000) {
      return val;
    }
  }
  return undefined;
}

/**
 * Multi-source product lookup service:
 * 1. Checks local initial preset catalog for instant offline hit.
 * 2. Cascades through Open Food Facts (in.openfoodfacts.org for Indian barcodes, world.openfoodfacts.org for global).
 * 3. Falls back to Open Beauty Facts and Open Products Facts for non-food items.
 * 4. Extracts packaging and embedded prices (e.g. "20rs").
 */
export async function lookupBarcodeDetails(
  barcode: string,
  existingCategories: { name: string }[] = []
): Promise<ProductLookupResult | null> {
  const cleanCode = barcode.trim();
  if (!cleanCode || cleanCode.length < 4) return null;

  // 1. Try local sample preset match (Kinley water, beverages, snacks)
  try {
    const { INITIAL_CATALOG } = await import('../data/catalog');
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
      };
    }
  } catch {}

  // 2. Build prioritized API endpoints
  const isIndianCode = cleanCode.startsWith('890');
  const urls: string[] = isIndianCode
    ? [
        `https://in.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
        `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
        `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
      ]
    : [
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
        `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
        `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
      ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);

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
          p.generic_name ||
          p.brands ||
          ''
        ).trim();

        if (!rawName) continue;

        const brand = p.brands ? p.brands.split(',')[0].trim() : undefined;
        const packaging = detectPackagingTier(rawName, p.quantity, p.packaging_text);
        const category = mapToStoreCategory(p.categories || '', existingCategories);
        const imageUrl = p.image_front_url || p.image_url || p.image_front_small_url;
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
        };
      }
    } catch {
      // Continue to next endpoint on timeout or network error
    }
  }

  return null;
}
