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
  isDuplicate?: boolean;
  splitPaymentMode?: string;
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
}


export type ActiveScreen =
  | 'item-wise'
  | 'quick-bill'
  | 'reports'
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

export type SubscriptionPlan = 'TRIAL' | 'STARTER' | 'PRO' | 'ANNUAL';
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
  price: number;          // Monthly price in INR
  annualPrice?: number;   // Annual price in INR (for ANNUAL plan)
  maxRegisters: number;
  features: string[];
  popular?: boolean;
  badge?: string;
  period?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanInfo[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 499,
    maxRegisters: 1,
    features: [
      'Unlimited Billing & Receipts',
      '1 Register / Device',
      'Cloud Backup & Sync',
      'Barcode Scanning',
      'Cash Drawer Management',
    ],
  },
  {
    id: 'PRO',
    name: 'Pro Retail',
    price: 999,
    maxRegisters: 3,
    popular: true,
    features: [
      'Everything in Starter',
      'Up to 3 Registers / Devices',
      'GSTR-1 Tax Reports & Export',
      'Multi-Barcode & Packaging Tiers',
      'Staff Management & RBAC',
      'Customer Khata / Credit Ledger',
      'Purchase Inward & Stock Tracking',
    ],
  },
  {
    id: 'ANNUAL',
    name: 'Annual Super Saver',
    price: 666,
    annualPrice: 7999,
    maxRegisters: 3,
    features: [
      'Everything in Pro Retail',
      'Save 35% vs Monthly',
      'Priority WhatsApp Support',
      'Early Access to New Features',
    ],
  },
];
