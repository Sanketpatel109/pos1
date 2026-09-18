import { BillItem, PromotionOffer, AppliedPromotion } from '../types';

export interface PromotionCalculationResult {
  appliedPromotions: AppliedPromotion[];
  totalPromotionsDiscount: number;
}

export const DEFAULT_PROMOTION_OFFERS: PromotionOffer[] = [
  {
    id: 'offer-fries-coffee-combo',
    name: 'Fries & Cold Coffee Combo',
    type: 'COMBO',
    enabled: true,
    description: 'French Fries + Cold Coffee bundle for only ₹80.00 (Save ₹15)',
    createdAt: new Date().toISOString(),
    comboItems: [
      { productName: 'French Fries', quantity: 1, price: 50 },
      { productName: 'Cold Coffee', quantity: 1, price: 45 },
    ],
    bundlePrice: 80.0,
  },
  {
    id: 'offer-samosa-bogo',
    name: 'Buy 2 Samosa, Get 1 Free',
    type: 'BOGO',
    enabled: true,
    description: 'Buy 2 Samosa, get 3rd Samosa 100% FREE',
    createdAt: new Date().toISOString(),
    targetProductName: 'Samosa',
    buyQuantity: 2,
    getQuantity: 1,
    discountPercent: 100,
  },
  {
    id: 'offer-min-spend-500',
    name: 'Spend ₹500, Get ₹50 OFF',
    type: 'MIN_SPEND',
    enabled: true,
    description: 'Instant ₹50 discount on all orders of ₹500 or more',
    createdAt: new Date().toISOString(),
    minSpendAmount: 500,
    discountType: 'flat',
    discountValue: 50,
  },
];

const STORAGE_KEY = 'monopos_active_promotions';

export function getStoredOffers(): PromotionOffer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored promotion offers:', err);
  }
  return DEFAULT_PROMOTION_OFFERS;
}

export function saveStoredOffers(offers: PromotionOffer[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  } catch (err) {
    console.warn('Failed to save promotion offers:', err);
  }
}

function itemMatches(
  cartItem: BillItem,
  targetProductId?: string,
  targetProductName?: string
): boolean {
  if (targetProductId) {
    if (cartItem.itemId && cartItem.itemId === targetProductId) return true;
    if (cartItem.id === targetProductId) return true;
  }
  if (targetProductName) {
    const query = targetProductName.toLowerCase().trim();
    if (!query) return false;
    const itemName = cartItem.name.toLowerCase();
    return itemName.includes(query) || query.includes(itemName);
  }
  return false;
}

/**
 * Evaluates active promotion offers against current cart items in real time.
 */
export function calculateCartPromotions(
  cartItems: BillItem[],
  offers: PromotionOffer[]
): PromotionCalculationResult {
  if (!cartItems || cartItems.length === 0 || !offers || offers.length === 0) {
    return { appliedPromotions: [], totalPromotionsDiscount: 0 };
  }

  const activeOffers = offers.filter((o) => o.enabled);
  if (activeOffers.length === 0) {
    return { appliedPromotions: [], totalPromotionsDiscount: 0 };
  }

  const appliedPromotions: AppliedPromotion[] = [];
  let totalPromotionsDiscount = 0;

  // Track remaining eligible quantities to avoid multiple offers discounting the same units
  const itemQuantities: Record<string, number> = {};
  cartItems.forEach((item) => {
    itemQuantities[item.id] = (itemQuantities[item.id] || 0) + item.quantity;
  });

  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  for (const offer of activeOffers) {
    // 1. COMBO / BUNDLE DEALS
    if (offer.type === 'COMBO' && offer.comboItems && offer.comboItems.length > 0) {
      const matchFoundForSlots: {
        requiredQty: number;
        matchingCartItems: { id: string; unitPrice: number; name: string }[];
      }[] = [];

      let canFormAtLeastOneCombo = true;

      for (const reqItem of offer.comboItems) {
        const matches = cartItems.filter(
          (c) =>
            itemMatches(c, reqItem.productId, reqItem.productName) &&
            (itemQuantities[c.id] || 0) > 0
        );

        const totalAvailQty = matches.reduce((sum, m) => sum + (itemQuantities[m.id] || 0), 0);
        if (totalAvailQty < reqItem.quantity) {
          canFormAtLeastOneCombo = false;
          break;
        }

        matchFoundForSlots.push({
          requiredQty: reqItem.quantity,
          matchingCartItems: matches.map((m) => ({
            id: m.id,
            unitPrice: m.unitPrice,
            name: m.name,
          })),
        });
      }

      if (canFormAtLeastOneCombo && matchFoundForSlots.length === offer.comboItems.length) {
        let maxSets = Infinity;
        for (let i = 0; i < offer.comboItems.length; i++) {
          const req = offer.comboItems[i];
          const slot = matchFoundForSlots[i];
          const totalAvail = slot.matchingCartItems.reduce(
            (sum, m) => sum + (itemQuantities[m.id] || 0),
            0
          );
          const setsForThisItem = Math.floor(totalAvail / req.quantity);
          maxSets = Math.min(maxSets, setsForThisItem);
        }

        if (maxSets > 0 && maxSets !== Infinity) {
          let standardPricePerSet = 0;
          for (let i = 0; i < offer.comboItems.length; i++) {
            const req = offer.comboItems[i];
            const slot = matchFoundForSlots[i];
            const avgUnitPrice = slot.matchingCartItems[0]?.unitPrice || req.price || 0;
            standardPricePerSet += avgUnitPrice * req.quantity;
          }

          const bundlePrice = offer.bundlePrice ?? 0;
          if (standardPricePerSet > bundlePrice) {
            const savingsPerSet = standardPricePerSet - bundlePrice;
            const totalDiscount = Number((savingsPerSet * maxSets).toFixed(2));

            // Consume quantities from cart tracker
            for (let i = 0; i < offer.comboItems.length; i++) {
              const req = offer.comboItems[i];
              const needed = req.quantity * maxSets;
              let remainingToDeduct = needed;

              for (const m of matchFoundForSlots[i].matchingCartItems) {
                const avail = itemQuantities[m.id] || 0;
                const deduct = Math.min(avail, remainingToDeduct);
                itemQuantities[m.id] = avail - deduct;
                remainingToDeduct -= deduct;
                if (remainingToDeduct <= 0) break;
              }
            }

            appliedPromotions.push({
              offerId: offer.id,
              offerName: offer.name,
              offerType: 'COMBO',
              discountAmount: totalDiscount,
              description: `${maxSets}x Combo Bundle applied at ₹${bundlePrice.toFixed(2)} each (saved ₹${totalDiscount.toFixed(2)})`,
            });
            totalPromotionsDiscount += totalDiscount;
          }
        }
      }
    }

    // 2. BUY X GET Y FREE (BOGO)
    else if (offer.type === 'BOGO' && (offer.targetProductId || offer.targetProductName)) {
      const buyQty = Math.max(1, offer.buyQuantity || 1);
      const getQty = Math.max(1, offer.getQuantity || 1);
      const discountPct = (offer.discountPercent ?? 100) / 100;
      const cycleSize = buyQty + getQty; // e.g. Buy 1 Get 1 -> 2 units

      const matchingItems = cartItems.filter(
        (c) =>
          itemMatches(c, offer.targetProductId, offer.targetProductName) &&
          (itemQuantities[c.id] || 0) > 0
      );

      for (const item of matchingItems) {
        const avail = itemQuantities[item.id] || 0;
        if (avail >= cycleSize) {
          const completedCycles = Math.floor(avail / cycleSize);
          const freeUnits = completedCycles * getQty;
          const discountForThisItem = Number(
            (freeUnits * item.unitPrice * discountPct).toFixed(2)
          );

          if (discountForThisItem > 0) {
            itemQuantities[item.id] = avail - completedCycles * cycleSize;

            appliedPromotions.push({
              offerId: offer.id,
              offerName: offer.name,
              offerType: 'BOGO',
              discountAmount: discountForThisItem,
              description: `${freeUnits}x ${item.name} free (${completedCycles}x BOGO applied, saved ₹${discountForThisItem.toFixed(2)})`,
            });
            totalPromotionsDiscount += discountForThisItem;
          }
        }
      }
    }

    // 3. MINIMUM ORDER SPEND DISCOUNT
    else if (offer.type === 'MIN_SPEND' && offer.minSpendAmount && offer.minSpendAmount > 0) {
      if (cartSubtotal >= offer.minSpendAmount) {
        let discount = 0;
        if (offer.discountType === 'percentage' && offer.discountValue) {
          discount = Number(((cartSubtotal * offer.discountValue) / 100).toFixed(2));
        } else if (offer.discountValue) {
          discount = Number(Math.min(cartSubtotal, offer.discountValue).toFixed(2));
        }

        if (discount > 0) {
          appliedPromotions.push({
            offerId: offer.id,
            offerName: offer.name,
            offerType: 'MIN_SPEND',
            discountAmount: discount,
            description: `Order over ₹${offer.minSpendAmount.toFixed(2)} qualifying discount (saved ₹${discount.toFixed(2)})`,
          });
          totalPromotionsDiscount += discount;
        }
      }
    }

    // 4. CATEGORY DISCOUNT
    else if (offer.type === 'CATEGORY' && offer.targetCategory && offer.categoryDiscountPercent) {
      const targetCat = offer.targetCategory.toLowerCase().trim();
      const pct = (offer.categoryDiscountPercent || 0) / 100;

      const matchingCategoryItems = cartItems.filter(
        (c) =>
          c.category &&
          c.category.toLowerCase().trim() === targetCat &&
          (itemQuantities[c.id] || 0) > 0
      );

      let categoryTotalDiscount = 0;
      let eligibleItemsCount = 0;

      for (const item of matchingCategoryItems) {
        const avail = itemQuantities[item.id] || 0;
        if (avail > 0) {
          const discountOnItem = Number((avail * item.unitPrice * pct).toFixed(2));
          categoryTotalDiscount += discountOnItem;
          eligibleItemsCount += avail;
          itemQuantities[item.id] = 0; // consumed
        }
      }

      if (categoryTotalDiscount > 0) {
        const roundedDiscount = Number(categoryTotalDiscount.toFixed(2));
        appliedPromotions.push({
          offerId: offer.id,
          offerName: offer.name,
          offerType: 'CATEGORY',
          discountAmount: roundedDiscount,
          description: `${offer.categoryDiscountPercent}% OFF on ${offer.targetCategory} (${eligibleItemsCount} items, saved ₹${roundedDiscount.toFixed(2)})`,
        });
        totalPromotionsDiscount += roundedDiscount;
      }
    }
  }

  return {
    appliedPromotions,
    totalPromotionsDiscount: Number(totalPromotionsDiscount.toFixed(2)),
  };
}
