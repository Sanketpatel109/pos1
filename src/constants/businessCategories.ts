import { Category } from '../types';

export const BUSINESS_TYPE_CATEGORIES: Record<string, Category[]> = {
  grocery: [
    { id: 'cat-all', name: 'All Items' },
    { id: 'cat-grains', name: 'Grains & Pulses' },
    { id: 'cat-spices', name: 'Spices & Masalas' },
    { id: 'cat-packaged', name: 'Packaged Foods & Snacks' },
    { id: 'cat-beverages', name: 'Beverages & Dairy' },
    { id: 'cat-personal', name: 'Personal Care & Hygiene' },
    { id: 'cat-cleaning', name: 'Household & Cleaning' },
  ],
  clothing: [
    { id: 'cat-all', name: 'All Items' },
    { id: 'cat-mens', name: "Men's Wear" },
    { id: 'cat-womens', name: "Women's Wear" },
    { id: 'cat-kids', name: 'Kids & Teens' },
    { id: 'cat-footwear', name: 'Footwear' },
    { id: 'cat-accessories', name: 'Fashion Accessories' },
  ],
  cafe: [
    { id: 'cat-all', name: 'All Items' },
    { id: 'cat-hot-bev', name: 'Hot Beverages & Chai' },
    { id: 'cat-cold-bev', name: 'Cold Drinks & Shakes' },
    { id: 'cat-bakery', name: 'Bakery & Quick Bites' },
    { id: 'cat-meals', name: 'Main Courses & Combos' },
    { id: 'cat-desserts', name: 'Desserts & Ice Cream' },
  ],
  pharmacy: [
    { id: 'cat-all', name: 'All Items' },
    { id: 'cat-rx', name: 'Prescription Medicines' },
    { id: 'cat-otc', name: 'OTC & First Aid' },
    { id: 'cat-wellness', name: 'Health Supplements' },
    { id: 'cat-personal-care', name: 'Personal Care' },
    { id: 'cat-devices', name: 'Healthcare Devices' },
  ],
  general: [
    { id: 'cat-all', name: 'All Items' },
    { id: 'cat-general', name: 'General Merchandise' },
    { id: 'cat-stationery', name: 'Stationery & Office' },
    { id: 'cat-hardware', name: 'Hardware & Tools' },
    { id: 'cat-electronics', name: 'Electronics & Cables' },
    { id: 'cat-gifts', name: 'Gifts & Toys' },
  ],
};
