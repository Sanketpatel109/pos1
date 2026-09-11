import { useState, useEffect } from 'react';

export interface BarcodeLookupProduct {
  name: string;
  brand?: string;
  quantity?: string;
  title: string;
  category?: string;
  imageUrl?: string;
}

export interface BarcodeLookupState {
  isLookingUp: boolean;
  product: BarcodeLookupProduct | null;
  error: string | null;
}

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

          const finalTitle = title || name || brand || cleanBarcode;

          setState({
            isLookingUp: false,
            product: {
              title: finalTitle,
              name: name || finalTitle,
              brand,
              quantity,
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
