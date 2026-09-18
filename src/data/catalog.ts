import {
  CatalogItem,
  Category,
  Customer,
  StaffMember,
  CashEntry,
  Order,
  ShopSettings,
  DEFAULT_STORE_PERMISSIONS,
} from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-all', name: 'All Items' },
];

export const CATEGORIES = INITIAL_CATEGORIES;

export const INITIAL_CATALOG: CatalogItem[] = [];

export const SAMPLE_CUSTOMERS: Customer[] = [];

export const INITIAL_CUSTOMERS = SAMPLE_CUSTOMERS;

export const SAMPLE_STAFF: StaffMember[] = [];

export const SAMPLE_CASH_ENTRIES: CashEntry[] = [];

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  marketRegion: 'IN',
  shopName: '',
  tagline: '',
  address: '',
  phone: '',
  email: '',
  terminalPrefix: 'A',
  gstin: '',
  upiId: '',
  upiPayeeName: '',
  upiVerificationMode: 'manual',
  razorpayKeyId: '',
  upiAutoDetectTimeoutSec: 5,
  currencySymbol: '₹',
  taxRate: 0,
  taxLabel: 'GST',
  soundEnabled: true,
  enableDailyToken: false,
  paperWidth: '58mm',
  printerPaperWidth: '58mm',
  connectedBluetoothDevice: '',
  showBarcode: true,
  subscriptionExpiry: '31 Dec 2026',
  permissions: DEFAULT_STORE_PERMISSIONS,
  logoUrl: '',
  printLogoOnReceipt: false,
  returnPolicyNote: 'Goods once sold can be exchanged within 7 days with original bill.',
  receiptFooterNote: '*** THANK YOU, VISIT AGAIN ***',
  enableLoyaltyPoints: false,
  loyaltyEarnSpendAmount: 100,
  loyaltyPointValue: 1,
};

export const SAMPLE_ORDERS: Order[] = [];

export const INITIAL_PAST_ORDERS = SAMPLE_ORDERS;
