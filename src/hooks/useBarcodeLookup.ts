import { useState, useEffect } from 'react';

export interface BarcodeLookupProduct {
  name: string;
  brand?: string;
  quantity?: string;
  title: string;
  category?: string;
  imageUrl?: string;
  weightOrVolume?: string;
  containerType?: string;
  packCount?: number;
  packName?: string;
}

export interface BarcodeLookupState {
  isLookingUp: boolean;
  product: BarcodeLookupProduct | null;
  error: string | null;
}

/**
 * Smart extractor for multi-pack patterns:
 * e.g., "6 x 355ml", "12 x 12 fl oz", "Pack of 6", "12 pack"
 */
export const extractPackInfo = (
  rawText: string
): { packCount: number; packName: string; unitWeight?: string } => {
  if (!rawText) return { packCount: 1, packName: 'Single' };

  // 1. Pattern like "6 x 355ml", "12 x 12 fl oz", "24 x 330 ml"
  const multiPattern = /(\d+)\s*[xX*]\s*(\d+(?:\.\d+)?\s*(?:ml|l|ltr|liter|litres|g|kg|oz|fl\s*oz))/i;
  const multiMatch = rawText.match(multiPattern);
  if (multiMatch) {
    const count = parseInt(multiMatch[1], 10);
    if (count > 1) {
      return {
        packCount: count,
        packName: count === 24 ? '24-Pack Case' : `${count}-Pack`,
        unitWeight: multiMatch[2].replace(/\s+/g, ' ').trim(),
      };
    }
  }

  // 2. Pattern like "6-pack", "12 pack", "pack of 6", "4pk"
  const packPattern = /(\d+)\s*[-]?\s*(?:pack|pk|can|bottle|piece|pcs|btl)\b|pack\s*(?:of)?\s*(\d+)/i;
  const packMatch = rawText.match(packPattern);
  if (packMatch) {
    const count = parseInt(packMatch[1] || packMatch[2], 10);
    if (count > 1) {
      return {
        packCount: count,
        packName: count === 24 ? '24-Pack Case' : `${count}-Pack`,
      };
    }
  }

  return { packCount: 1, packName: 'Single' };
};

/**
 * Normalizes weight or volume strings: e.g. "750 ml" -> "750ml", "1 L" -> "1L", "12 fl oz" -> "12 oz"
 */
export const extractWeightOrVolume = (rawText: string): string => {
  if (!rawText) return '';
  const match = rawText.match(/(\d+(?:\.\d+)?)\s*(ml|l|ltr|liter|litres|g|kg|fl\s*oz|oz|lb)\b/i);
  if (!match) return '';

  const num = match[1];
  const rawUnit = match[2].toLowerCase();

  if (rawUnit === 'ml') return `${num}ml`;
  if (rawUnit.startsWith('l') && !rawUnit.includes('b')) return `${num}L`;
  if (rawUnit === 'kg') return `${num}kg`;
  if (rawUnit === 'g') return `${num}g`;
  if (rawUnit.includes('fl') || rawUnit === 'oz') return `${num} oz`;
  if (rawUnit === 'lb') return `${num} lb`;

  return `${num} ${rawUnit}`;
};

/**
 * Extracts packaging/container type (e.g. Bottle, Can, Pack, Pouch, Box, Jar)
 */
export const extractContainerType = (rawText: string): string => {
  if (!rawText) return '';
  const lower = rawText.toLowerCase();

  if (/\b(can|canette|tin|tinplate|aluminium can)\b/i.test(lower)) return 'Can';
  if (/\b(bottle|bouteille|glass|flacon|verre)\b/i.test(lower)) return 'Bottle';
  if (/\b(pouch|sachet|bag|packet)\b/i.test(lower)) return 'Pouch';
  if (/\b(box|carton|tetrapak|tetra pak|brique)\b/i.test(lower)) return 'Box';
  if (/\b(jar|bocal|pot)\b/i.test(lower)) return 'Jar';
  if (/\b(case|caisse)\b/i.test(lower)) return 'Case';
  if (/\b(pack)\b/i.test(lower)) return 'Pack';

  return '';
};

/**
 * Formats Open Food Facts product details into a clean commercial display title:
 * e.g., "Brand + Name + Weight/Quantity" (e.g. "Cadbury Dairy Milk Silk 150g")
 */
export const formatOpenFoodFactsTitle = (product: any): string => {
  if (!product) return '';

  const rawName = (
    product.product_name_en ||
    product.product_name ||
    product.generic_name ||
    ''
  ).trim();

  const rawBrand = (
    product.brands ||
    product.brand_owner ||
    ''
  )
    .split(',')[0]
    .trim();

  const rawQuantity = (
    product.quantity ||
    (product.net_weight_value
      ? `${product.net_weight_value} ${product.net_weight_unit || ''}`
      : '')
  ).trim();

  const parts: string[] = [];

  if (rawBrand) {
    parts.push(rawBrand);
  }

  if (rawName) {
    // Avoid repeating brand name if rawName already starts with brand
    if (rawBrand && rawName.toLowerCase().startsWith(rawBrand.toLowerCase())) {
      parts.length = 0; // Replace with the full branded name
      parts.push(rawName);
    } else {
      parts.push(rawName);
    }
  }

  if (rawQuantity) {
    const combinedCurrent = parts.join(' ').toLowerCase();
    if (!combinedCurrent.includes(rawQuantity.toLowerCase())) {
      parts.push(rawQuantity);
    }
  }

  return parts.filter(Boolean).join(' ').trim();
};

/**
 * Barcode Lookup Hook
 * Triggers a background lookup to Open Food Facts API with a strict 2-second timeout.
 */
export const useBarcodeLookup = (barcode?: string, enabled: boolean = true) => {
  const [state, setState] = useState<BarcodeLookupState>({
    isLookingUp: false,
    product: null,
    error: null,
  });

  useEffect(() => {
    const cleanBarcode = barcode?.trim();
    if (!enabled || !cleanBarcode) {
      setState({
        isLookingUp: false,
        product: null,
        error: null,
      });
      return;
    }

    let isMounted = true;
    setState({
      isLookingUp: true,
      product: null,
      error: null,
    });

    const controller = new AbortController();
    // Strict 2-second timeout using AbortController so billing is never blocked
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 2000);

    const performLookup = async () => {
      try {
        const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(
          cleanBarcode
        )}.json`;

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error status ${response.status}`);
        }

        const json = await response.json();
        if (!isMounted) return;

        if (json.status === 1 && json.product) {
          const title = formatOpenFoodFactsTitle(json.product);
          const brand = (json.product.brands || json.product.brand_owner || '')
            .split(',')[0]
            .trim();
          const quantity = (json.product.quantity || '').trim();
          const name = (
            json.product.product_name_en ||
            json.product.product_name ||
            json.product.generic_name ||
            ''
          ).trim();

          const packagingText = [
            json.product.packaging || '',
            json.product.packaging_text || '',
            ...(json.product.packaging_materials_tags || []),
            ...(json.product.packaging_shapes_tags || []),
            name,
            title,
          ].join(' ');

          // Smart Extraction
          const fullSearchText = `${title} ${quantity} ${packagingText}`;
          const packInfo = extractPackInfo(fullSearchText);
          const weightOrVol = packInfo.unitWeight || extractWeightOrVolume(quantity || fullSearchText);
          const container = extractContainerType(packagingText);

          const finalTitle = title || name || brand || cleanBarcode;

          setState({
            isLookingUp: false,
            product: {
              title: finalTitle,
              name: name || finalTitle,
              brand,
              quantity,
              weightOrVolume: weightOrVol,
              containerType: container,
              packCount: packInfo.packCount,
              packName: packInfo.packName,
              category: json.product.categories_tags?.[0]?.replace('en:', '') || '',
              imageUrl: json.product.image_front_small_url || json.product.image_url || '',
            },
            error: null,
          });
        } else {
          // Unrecognized barcode or product not found
          setState({
            isLookingUp: false,
            product: null,
            error: 'Not found',
          });
        }
      } catch (err: any) {
        if (!isMounted) return;
        const isTimeout = err.name === 'AbortError';
        setState({
          isLookingUp: false,
          product: null,
          error: isTimeout ? 'Timeout' : 'Network/Offline',
        });
      } finally {
        clearTimeout(timeoutId);
      }
    };

    performLookup();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [barcode, enabled]);

  return state;
};
