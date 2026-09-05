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

export interface StaffMember {
  id: string;
  name: string;
  role: 'MANAGER' | 'CASHIER' | 'WAITER' | 'Store Manager';
  pin: string;
  phone?: string;
  active: boolean;
}

export interface Order {
  id: string;
  orderNumber: number;
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
}

export type MarketRegion = 'IN' | 'US';

export interface ShopSettings {
  marketRegion?: MarketRegion;
  shopName: string;
  tagline?: string;
  address: string;
  phone: string;
  email?: string;
  gstin: string; // GSTIN for India, or EIN / Sales Tax ID for US
  upiId?: string; // UPI ID for India (e.g. store@upi)
  currencySymbol: string;
  taxRate: number; // percentage, e.g. 5
  taxLabel?: string; // 'GST' or 'Sales Tax'
  soundEnabled: boolean;
  paperWidth?: '58mm' | '80mm';
  printerPaperWidth?: '58mm' | '80mm';
  connectedBluetoothDevice?: string;
  showBarcode?: boolean;
  subscriptionExpiry?: string;
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
  | 'training-videos';
