export interface PackagingOption {
  id: string;              // e.g., "pack_6"
  packName: string;        // e.g., "Box of 6", "Carton of 12"
  barcode: string;         // Dedicated manufacturer EAN/Code-128
  multiplier: number;      // Number of base units (e.g., 6, 12)
  sellingPrice: number;    // Pack price (e.g., ₹110 vs ₹120 standard)
  isDefault?: boolean;     // Set true for standard single piece
}

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  isVeg?: boolean;
  sku?: string;
  barcode?: string;
  description?: string;
  stock?: number;
  lowStockThreshold?: number;
  unit?: string; // 'pcs' | 'kg' | 'g' | 'pack' | 'ltr'
  weightOrVolume?: string; // e.g. "750ml", "1L", "12 oz", "500g"
  containerType?: string; // e.g. "Bottle", "Can", "Pack", "Pouch", "Box", "Jar"
  packCount?: number; // e.g. 1, 4, 6, 12, 24
  costPrice?: number;
  gstRate?: number;
  packagingOptions?: PackagingOption[];
}

export interface InwardStockItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export interface InwardStockEntry {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  items: InwardStockItem[];
  totalAmount: number;
  notes?: string;
  receivedBy: string;
}

export interface ZReportData {
  id: string;
  date: string;
  closedAt: string;
  staffName: string;
  openingFloat: number;
  cashSales: number;
  onlineSales: number;
  creditSales: number;
  totalSales: number;
  totalOrders: number;
  cashIn: number;
  cashOut: number;
  expectedDrawerCash: number;
  actualCountedCash: number;
  variance: number; // actualCountedCash - expectedDrawerCash
  note?: string;
}

export interface Category {
  id: string;
  name: string;
  itemCount?: number;
}

export interface BillItem {
  id: string;
  itemId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  selectedPackName?: string; // e.g. "Box of 6"
  multiplier?: number;        // e.g. 6 (defaults to 1)
  barcode?: string;           // Barcode scanned or assigned
  category?: string;          // Category name e.g. "Drinks", "Snacks"
  gstRate?: number;
  taxableAmount?: number; // Snapshot of taxable value (unitPrice * quantity)
  cgst?: number;          // Snapshot of CGST amount
  sgst?: number;          // Snapshot of SGST amount
  totalTax?: number;      // Snapshot of combined tax amount
  itemTotal?: number;     // Snapshot of total amount (taxable + tax)
  note?: string;
  stock?: number;
}


export type OrderStatus = 'active' | 'held' | 'completed' | 'cancelled' | 'refunded' | 'partially_refunded' | 'credit';
export type PaymentMethod = 'NONE' | 'CASH' | 'ONLINE' | 'CREDIT' | 'SPLIT' | 'UPI' | 'CARD' | 'KHATA';

export interface SplitPaymentDetail {
  cash: number;
  online: number;
  credit: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditBalance: number;
  creditLimit?: number;
  loyaltyPoints?: number;
  totalOrders?: number;
  createdAt?: string;
}

export interface CashEntry {
  id: string;
  type: 'IN' | 'OUT' | 'OPENING';
  amount: number;
  reason: string;
  staffName?: string;
  createdAt: string;
}

export type StaffRole = 'OWNER' | 'MANAGER' | 'CASHIER';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  pin: string;
  phone?: string;
  active: boolean;
}

export interface Order {
  id: string;
  orderNumber: number;
  terminalPrefix?: string;
  orderNumberFormatted?: string;
  createdAt: string;
  items: BillItem[];
  status: OrderStatus;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  discountPercent?: number;
  total: number;
  paymentMethod: PaymentMethod;
  splitDetails?: SplitPaymentDetail;
  tenderedAmount?: number;
  changeDue?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  staffName?: string;
  billerName?: string;
  notes?: string;
  note?: string;
  tableOrToken?: string;
  tokenNumber?: number; // Rolling pickup token 1-99999
  customerGstin?: string; // Optional B2B Customer GSTIN
  upiRefNumber?: string;
  isVerified?: boolean;
  verificationMethod?: 'soundbox' | 'utr' | 'gateway' | 'cash_tender';
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  refundMethod?: 'CASH' | 'KHATA' | 'ONLINE';
  refundedItems?: { id: string; name: string; quantity: number; amount: number }[];
  refundHistory?: RefundRecord[];
  isDuplicate?: boolean;
  splitPaymentMode?: string;
  appliedPromotions?: AppliedPromotion[];
  promotionsDiscount?: number;
}

export interface RefundRecord {
  id: string;
  creditNoteNumber: string;
  refundedAt: string;
  refundAmount: number;
  refundMethod: 'CASH' | 'KHATA' | 'ONLINE';
  refundReason: string;
  restockInventory: boolean;
  refundedItems: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  staffName?: string;
}


export type MarketRegion = 'IN';

export interface StorePermissions {
  staff: {
    allowKhata: boolean;          // Sell on customer credit
    allowPriceOverride: boolean;   // Modify cart item prices
    allowStockInward: boolean;    // Receive supplier crates
  };
  manager: {
    viewCostPrice: boolean;       // View buying rates & margins
    allowBillVoid: boolean;       // Cancel completed invoices
  };
}

export const DEFAULT_STORE_PERMISSIONS: StorePermissions = {
  staff: {
    allowKhata: false,          // Sell on customer credit
    allowPriceOverride: false,   // Modify cart item prices
    allowStockInward: true,     // Receive supplier crates
  },
  manager: {
    viewCostPrice: true,        // View buying rates & margins
    allowBillVoid: true,        // Cancel completed invoices
  },
};

export interface ShopSettings {
  marketRegion?: MarketRegion;
  shopName: string;
  tagline?: string;
  address: string;
  phone: string;
  email?: string;
  terminalPrefix?: string; // e.g. "A" for Multi-Device terminal ID
  enableDailyToken?: boolean; // Rolling 1-99999 pickup token for fast food / counters
  gstin: string; // GSTIN for India, or EIN / Sales Tax ID for US
  upiId?: string; // UPI ID for India (e.g. store@upi)
  upiPayeeName?: string;
  upiVerificationMode?: 'manual' | 'auto';
  razorpayKeyId?: string;
  upiAutoDetectTimeoutSec?: number;
  currencySymbol: string;
  taxRate: number; // percentage, e.g. 5
  taxLabel?: string; // 'GST' or 'Sales Tax'
  soundEnabled: boolean;
  paperWidth?: '58mm' | '80mm';
  printerPaperWidth?: '58mm' | '80mm';
  connectedBluetoothDevice?: string;
  showBarcode?: boolean;
  subscriptionExpiry?: string;
  hardwareDrawerKickEnabled?: boolean;
  autoDrawerKick?: boolean;
  weighingScaleEnabled?: boolean;
  weighingScaleBaudRate?: number;
  permissions?: StorePermissions;
  logoUrl?: string;
  printLogoOnReceipt?: boolean;
  receiptFooterNote?: string;
  returnPolicyNote?: string;
  enableLoyaltyPoints?: boolean;
  loyaltyEarnSpendAmount?: number;
  loyaltyPointValue?: number;
  enableSoundbox?: boolean;
  soundboxLanguage?: 'en' | 'hi';
  onboarded?: boolean;
  businessType?: string;
  barcodeApiKey?: string;
  barcodeProvider?: 'auto' | 'upcitemdb' | 'barcodelookup';
}


export type ActiveScreen =
  | 'item-wise'
  | 'quick-bill'
  | 'reports'
  | 'analytics'
  | 'categories-products'
  | 'customers'
  | 'credit-ledger'
  | 'cash-management'
  | 'staff-management'
  | 'print-settings'
  | 'training-videos'
  | 'barcode-generator'
  | 'purchase-inward';

// ─── SaaS Subscription & Multi-Tenant Types ───────────────────────────────────

export type SubscriptionPlan = 'TRIAL' | 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'ANNUAL';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'GRACE' | 'EXPIRED';

export interface TenantLicense {
  tenantId: string;
  ownerUid: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhotoUrl?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialStartedAt: string;
  trialEndsAt: string;
  currentPeriodEnd: string; // When the current paid cycle ends (same as trialEndsAt for trial)
  billingCycle?: 'MONTHLY' | 'ANNUAL';
  maxRegisters: number;
  lastPaymentId?: string;
  lastPaymentGateway?: 'RAZORPAY' | 'STRIPE' | 'MANUAL' | 'SIMULATED';
  lastPaymentAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlanInfo {
  id: SubscriptionPlan;
  name: string;
  price: number;          // Monthly price in INR (0, 399, 799, 1499)
  annualPrice: number;    // Annual price in INR (0, 3999, 7999, 14999)
  maxRegisters: number;
  features: string[];
  popular?: boolean;
  badge?: string;
  period?: string;
  tagline?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanInfo[] = [
  {
    id: 'FREE',
    name: 'Free Forever',
    price: 0,
    annualPrice: 0,
    maxRegisters: 1,
    tagline: 'Ideal for trying out or micro single-register kiosks',
    features: [
      'Up to 50 Products in Catalog',
      'Up to 100 Orders / Month',
      '1 Register / Device',
      'Quick Bill + Item-Wise POS',
      'Thermal Receipt Printing (58/80mm)',
      'Offline PWA Mode (No Internet Needed)',
      'Camera Barcode Scanning',
    ],
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: 399,
    annualPrice: 3999,
    maxRegisters: 1,
    tagline: 'For solo storekeepers & single-counter retail',
    features: [
      'Unlimited Products & SKU Catalog',
      'Unlimited Orders & Invoices',
      '1 Register / Device',
      'Cloud Backup & Real-Time Sync',
      'Customer Management & Phone CRM',
      'Cash Drawer Float & Day Close',
      'Hold & Recall Parked Orders',
      'Rolling Pickup Tokens (1–99999)',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro Retail',
    price: 799,
    annualPrice: 7999,
    maxRegisters: 3,
    popular: true,
    badge: 'MOST POPULAR',
    tagline: 'For busy supermarkets & growing retail businesses',
    features: [
      'Everything in Starter',
      'Up to 3 Registers / Multi-Device Sync',
      'Customer Khata (Credit Ledger)',
      'Staff RBAC & 1-Sec PIN Switching',
      'Purchase Inward (Stock Receiving & GRN)',
      'Stock Tracking & Low-Stock Alerts',
      'Multi-Pack Barcodes & Packaging Tiers',
      'In-App Barcode Label Generator',
      'Digital Weighing Scale RS-232 live integration',
      'Z-Report & Cash Variance Audit',
      'Bilingual Soundbox & Split Payments',
      'GSTR-1 & Tally-Ready Financial Export',
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 1499,
    annualPrice: 14999,
    maxRegisters: 10,
    badge: 'ENTERPRISE',
    tagline: 'For multi-counter retail & high-volume stores',
    features: [
      'Everything in Pro Retail',
      'Up to 10 Registers / Multi-Device Sync',
      'Multi-Terminal ID Prefixes (A, B, C)',
      'Returns & Refund Management',
      'Advanced Role Permissions & Overrides',
      'Custom Receipt Branding (Logo & Custom Notes)',
      'Priority WhatsApp & Dedicated Support',
    ],
  },
];

export type OfferType = 'COMBO' | 'BOGO' | 'MIN_SPEND' | 'CATEGORY';

export interface PromotionOffer {
  id: string;
  name: string;
  type: OfferType;
  enabled: boolean;
  description?: string;
  createdAt: string;

  // COMBO DEALS (e.g. French Fries + Cold Coffee = ₹80)
  comboItems?: {
    productId?: string;
    productName: string;
    quantity: number;
    price?: number;
  }[];
  bundlePrice?: number;

  // BOGO DEALS (e.g. Buy 1 Samosa get 1 Free)
  targetProductId?: string;
  targetProductName?: string;
  buyQuantity?: number;
  getQuantity?: number;
  discountPercent?: number; // 100 for 100% free, 50 for 50% off

  // MIN_SPEND DEALS (e.g. Spend ₹500 get ₹50 off / 10% off)
  minSpendAmount?: number;
  discountType?: 'flat' | 'percentage';
  discountValue?: number;

  // CATEGORY DEALS (e.g. 15% off on all Beverages)
  targetCategory?: string;
  categoryDiscountPercent?: number;
}

export interface AppliedPromotion {
  offerId: string;
  offerName: string;
  offerType: OfferType;
  discountAmount: number;
  description: string;
}
