import { describe, it, expect } from 'vitest';
import { calculateCartPromotions } from '../promotionsEngine';
import { BillItem, PromotionOffer } from '../../types';

describe('Promotions & Dynamic Discount Engine', () => {
  const createMockItem = (
    id: string,
    name: string,
    unitPrice: number,
    quantity: number,
    category: string = 'Snacks'
  ): BillItem => ({
    id,
    name,
    unitPrice,
    quantity,
    taxableAmount: unitPrice * quantity,
    cgst: 0,
    sgst: 0,
    totalTax: 0,
    itemTotal: unitPrice * quantity,
    category,
  });

  describe('Edge Cases', () => {
    it('should return empty promotions if cart is empty', () => {
      const offers: PromotionOffer[] = [
        {
          id: 'min-spend-500',
          name: 'Spend 500 Get 50',
          type: 'MIN_SPEND',
          enabled: true,
          minSpendAmount: 500,
          discountValue: 50,
          createdAt: '',
        },
      ];
      const result = calculateCartPromotions([], offers);
      expect(result.appliedPromotions).toHaveLength(0);
      expect(result.totalPromotionsDiscount).toBe(0);
    });

    it('should ignore disabled promotion offers', () => {
      const offers: PromotionOffer[] = [
        {
          id: 'min-spend-500-disabled',
          name: 'Spend 500 Get 50',
          type: 'MIN_SPEND',
          enabled: false,
          minSpendAmount: 500,
          discountValue: 50,
          createdAt: '',
        },
      ];
      const cart = [createMockItem('1', 'T-Shirt', 600, 1)];
      const result = calculateCartPromotions(cart, offers);
      expect(result.appliedPromotions).toHaveLength(0);
      expect(result.totalPromotionsDiscount).toBe(0);
    });
  });

  describe('COMBO / Bundle Deals', () => {
    const comboOffer: PromotionOffer = {
      id: 'fries-coffee-combo',
      name: 'Fries & Cold Coffee Combo',
      type: 'COMBO',
      enabled: true,
      comboItems: [
        { productName: 'French Fries', quantity: 1, price: 50 },
        { productName: 'Cold Coffee', quantity: 1, price: 45 },
      ],
      bundlePrice: 80, // Save 15 per combo
      createdAt: '',
    };

    it('should apply combo discount when both bundle items are present in cart', () => {
      const cart = [
        createMockItem('item-1', 'French Fries', 50, 1),
        createMockItem('item-2', 'Cold Coffee', 45, 1),
      ];

      const result = calculateCartPromotions(cart, [comboOffer]);
      expect(result.appliedPromotions).toHaveLength(1);
      expect(result.appliedPromotions[0].offerType).toBe('COMBO');
      expect(result.appliedPromotions[0].discountAmount).toBe(15);
      expect(result.totalPromotionsDiscount).toBe(15);
    });

    it('should apply multiple combos when quantities allow (2 sets)', () => {
      const cart = [
        createMockItem('item-1', 'French Fries', 50, 2),
        createMockItem('item-2', 'Cold Coffee', 45, 2),
      ];

      const result = calculateCartPromotions(cart, [comboOffer]);
      expect(result.appliedPromotions).toHaveLength(1);
      expect(result.appliedPromotions[0].discountAmount).toBe(30); // 15 * 2
      expect(result.totalPromotionsDiscount).toBe(30);
    });

    it('should NOT apply combo discount if one item is missing', () => {
      const cart = [createMockItem('item-1', 'French Fries', 50, 2)];

      const result = calculateCartPromotions(cart, [comboOffer]);
      expect(result.appliedPromotions).toHaveLength(0);
      expect(result.totalPromotionsDiscount).toBe(0);
    });
  });

  describe('BOGO (Buy X Get Y Free) Deals', () => {
    const bogoOffer: PromotionOffer = {
      id: 'samosa-bogo',
      name: 'Buy 2 Samosa, Get 1 Free',
      type: 'BOGO',
      enabled: true,
      targetProductName: 'Samosa',
      buyQuantity: 2,
      getQuantity: 1,
      discountPercent: 100,
      createdAt: '',
    };

    it('should not give free item if quantity is less than cycle size (buy 2 get 1 = 3 items needed)', () => {
      const cart = [createMockItem('item-samosa', 'Samosa', 20, 2)];
      const result = calculateCartPromotions(cart, [bogoOffer]);
      expect(result.appliedPromotions).toHaveLength(0);
      expect(result.totalPromotionsDiscount).toBe(0);
    });

    it('should give 1 free item when 3 items are added (1 cycle complete)', () => {
      const cart = [createMockItem('item-samosa', 'Samosa', 20, 3)];
      const result = calculateCartPromotions(cart, [bogoOffer]);
      expect(result.appliedPromotions).toHaveLength(1);
      expect(result.appliedPromotions[0].discountAmount).toBe(20); // 1 free Samosa @ ₹20
      expect(result.totalPromotionsDiscount).toBe(20);
    });

    it('should calculate 2 free items when 6 items are in cart', () => {
      const cart = [createMockItem('item-samosa', 'Samosa', 20, 6)];
      const result = calculateCartPromotions(cart, [bogoOffer]);
      expect(result.appliedPromotions).toHaveLength(1);
      expect(result.appliedPromotions[0].discountAmount).toBe(40); // 2 free @ ₹20 each
      expect(result.totalPromotionsDiscount).toBe(40);
    });
  });

  describe('MIN_SPEND Order Tier Discounts', () => {
    const flatMinSpendOffer: PromotionOffer = {
      id: 'min-500-flat-50',
      name: 'Spend ₹500, Get ₹50 OFF',
      type: 'MIN_SPEND',
      enabled: true,
      minSpendAmount: 500,
      discountType: 'flat',
      discountValue: 50,
      createdAt: '',
    };

    const pctMinSpendOffer: PromotionOffer = {
      id: 'min-1000-pct-10',
      name: 'Spend ₹1000, Get 10% OFF',
      type: 'MIN_SPEND',
      enabled: true,
      minSpendAmount: 1000,
      discountType: 'percentage',
      discountValue: 10,
      createdAt: '',
    };

    it('should not apply flat discount if subtotal is below minimum spend', () => {
      const cart = [createMockItem('1', 'Product A', 450, 1)];
      const result = calculateCartPromotions(cart, [flatMinSpendOffer]);
      expect(result.appliedPromotions).toHaveLength(0);
      expect(result.totalPromotionsDiscount).toBe(0);
    });

    it('should apply flat discount when subtotal meets threshold', () => {
      const cart = [createMockItem('1', 'Product A', 550, 1)];
      const result = calculateCartPromotions(cart, [flatMinSpendOffer]);
      expect(result.appliedPromotions).toHaveLength(1);
      expect(result.appliedPromotions[0].discountAmount).toBe(50);
      expect(result.totalPromotionsDiscount).toBe(50);
    });

    it('should apply percentage discount accurately when subtotal meets threshold', () => {
      const cart = [createMockItem('1', 'Product Premium', 1200, 1)];
      const result = calculateCartPromotions(cart, [pctMinSpendOffer]);
      expect(result.appliedPromotions).toHaveLength(1);
      expect(result.appliedPromotions[0].discountAmount).toBe(120); // 10% of 1200
      expect(result.totalPromotionsDiscount).toBe(120);
    });
  });

  describe('CATEGORY Level Discounts', () => {
    const categoryOffer: PromotionOffer = {
      id: 'beverages-15-off',
      name: '15% OFF All Beverages',
      type: 'CATEGORY',
      enabled: true,
      targetCategory: 'Beverages',
      categoryDiscountPercent: 15,
      createdAt: '',
    };

    it('should apply category discount only to items matching target category', () => {
      const cart = [
        createMockItem('bev-1', 'Cold Coffee', 100, 2, 'Beverages'), // 200 * 15% = 30
        createMockItem('snack-1', 'Samosa', 50, 2, 'Snacks'),        // 100 * 0% = 0
      ];

      const result = calculateCartPromotions(cart, [categoryOffer]);
      expect(result.appliedPromotions).toHaveLength(1);
      expect(result.appliedPromotions[0].discountAmount).toBe(30);
      expect(result.totalPromotionsDiscount).toBe(30);
    });
  });
});
