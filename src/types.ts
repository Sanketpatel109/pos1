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
}

export type OrderStatus = 'active' | 'held' | 'completed' | 'cancelled';
export type PaymentMethod = 'NONE' | 'CASH' | 'ONLINE' | 'CREDIT' | 'SPLIT';

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
