import { BillItem, PromotionOffer, AppliedPromotion } from '../types';

export interface PromotionCalculationResult {
  appliedPromotions: AppliedPromotion[];
  totalPromotionsDiscount: number;
}

export const DEFAULT_PROMOTION_OFFERS: PromotionOffer[] = [
  {
    id: 'offer-coke-combo-default',
    name: 'Coke, Drink & Sweet Combo',
    type: 'COMBO',
    enabled: true,
    description: 'Get Coke + Drink + Sweet combo for only ₹10.00',
    createdAt: new Date().toISOString(),
    comboItems: [
      { productName: 'coke', quantity: 1 },
      { productName: 'drink', quantity: 1 },
      { productName: 'sweet', quantity: 1 },
    ],
    bundlePrice: 10.0,
  },
  {
    id: 'offer-coke-bogo-default',
    name: 'Buy 1 Get 1 Free on Coke',
    type: 'BOGO',
    enabled: true,
    description: 'Buy 1 Coke, get 1 Coke 100% FREE',
    createdAt: new Date().toISOString(),
    targetProductName: 'coke',
    buyQuantity: 1,
    getQuantity: 1,
    discountPercent: 100,
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

  for (const offer of activeOffers) {
    if (offer.type === 'COMBO' && offer.comboItems && offer.comboItems.length > 0) {
      // 1. Evaluate Combo / Bundle Deals
      // Find candidate items for each required part of the combo
      const matchFoundForSlots: {
        requiredQty: number;
        matchingCartItems: { id: string; unitPrice: number; name: string }[];
      }[] = [];

      let canFormAtLeastOneCombo = true;

      for (const reqItem of offer.comboItems) {
        const query = reqItem.productName.toLowerCase().trim();
        const matches = cartItems.filter(
          (c) =>
            c.name.toLowerCase().includes(query) &&
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
        // Calculate max sets
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
          // Calculate standard price for 1 combo set
          let standardPricePerSet = 0;
          for (let i = 0; i < offer.comboItems.length; i++) {
            const req = offer.comboItems[i];
            const slot = matchFoundForSlots[i];
            const avgUnitPrice =
              slot.matchingCartItems[0]?.unitPrice || 0;
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
              description: `${maxSets}x combo set${maxSets > 1 ? 's' : ''} applied at ₹${bundlePrice.toFixed(2)} each (saved ₹${totalDiscount.toFixed(2)})`,
            });
            totalPromotionsDiscount += totalDiscount;
          }
        }
      }
    } else if (offer.type === 'BOGO' && offer.targetProductName) {
      // 2. Evaluate Buy X Get Y Free (BOGO)
      const targetQuery = offer.targetProductName.toLowerCase().trim();
      const buyQty = Math.max(1, offer.buyQuantity || 1);
      const getQty = Math.max(1, offer.getQuantity || 1);
      const discountPct = (offer.discountPercent ?? 100) / 100;
      const cycleSize = buyQty + getQty; // e.g. Buy 1 Get 1 -> 2 units

      // Find matching items
      const matchingItems = cartItems.filter(
        (c) =>
          c.name.toLowerCase().includes(targetQuery) &&
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
  }

  return {
    appliedPromotions,
    totalPromotionsDiscount: Number(totalPromotionsDiscount.toFixed(2)),
  };
}
