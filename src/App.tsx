import React, { useState, useEffect, useRef } from 'react';
import {
  INITIAL_CATALOG,
  INITIAL_CATEGORIES,
  SAMPLE_CUSTOMERS,
  SAMPLE_STAFF,
  SAMPLE_CASH_ENTRIES,
  SAMPLE_ORDERS,
  DEFAULT_SHOP_SETTINGS,
} from './data/catalog';
import { BUSINESS_TYPE_CATEGORIES } from './constants/businessCategories';
import {
  CatalogItem,
  Category,
  BillItem,
  Order,
  ShopSettings,
  Customer,
  StaffMember,
  CashEntry,
  ActiveScreen,
  PaymentMethod,
  SplitPaymentDetail,
  InwardStockEntry,
  StorePermissions,
  DEFAULT_STORE_PERMISSIONS,
  PackagingOption,
  StaffRole,
} from './types';
import { resolveBarcodeMatch } from './utils/barcodeResolver';
import { ensureAllItemsFirst, isAllCategory } from './utils/categories';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ItemWiseBillTerminal } from './components/ItemWiseBillTerminal';
import { QuickBillTerminal } from './components/QuickBillTerminal';
import { getNextDailyToken } from './utils/token';
import { ReportsScreen } from './components/ReportsScreen';
import { CategoryProductManager } from './components/CategoryProductManager';
import { CustomerManagementScreen } from './components/CustomerManagementScreen';
import { CashManagementScreen } from './components/CashManagementScreen';
import { StaffManagementScreen } from './components/StaffManagementScreen';
import { PrintSettingsModal } from './components/PrintSettingsModal';
import { TrainingVideosModal } from './components/TrainingVideosModal';
import { PaymentModal } from './components/checkout/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { CustomItemModal } from './components/CustomItemModal';
import { SearchModal } from './components/SearchModal';
import { BarcodeScannerModal, ScannerMode } from './components/BarcodeScannerModal';
import { PurchaseInwardModal } from './components/PurchaseInwardModal';
import { BarcodeGeneratorModal } from './components/BarcodeGeneratorModal';
import { PriceCheckModal } from './components/PriceCheckModal';
import { QuickAddProductModal } from './components/QuickAddProductModal';
import { ManagerPinModal } from './components/ManagerPinModal';
import { RolePermissionsModal } from './components/RolePermissionsModal';
import { HeldOrdersModal } from './components/HeldOrdersModal';
import { ZReportModal } from './components/ZReportModal';
import {
  canAccessScreen,
  canDeleteOrder,
  canStaffSellKhata,
  canStaffOverridePrice,
  canStaffInwardStock,
  canViewCostPrice,
  getRequiredRoleForScreen,
  normalizeRole,
  ROLE_DEFINITIONS,
} from './utils/permissions';
import { hardware } from './utils/hardware';
import { Zap, PauseCircle, CheckCircle2, Printer, X, Camera } from 'lucide-react';
import { posSound } from './utils/sound';
import { auth, onAuthStateChanged, signOut, User, getDoc } from './firebase';
import { QuickStaffSwitchModal } from './components/QuickStaffSwitchModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthGateScreen } from './components/AuthGateScreen';
import { RefundResult } from './components/ProcessReturnModal';
import { TenantLicense } from './types';

import {
  getOrCreateLicense,
  getCachedLicense,
  clearCachedLicense,
  checkLicenseStatus,
  LicenseStatus,
} from './services/subscriptionService';
import { pushAllToCloud, pullAllFromCloud, pushSingleOrder } from './services/cloudSync';
import {
  testFirestoreConnection,
  subscribeSyncState,
  listenToLiveCatalog,
  listenToLiveCategories,
  listenToLiveOrders,
  listenToLiveCustomers,
  listenToLiveCashEntries,
  listenToLiveSettings,
  listenToLiveStaff,
  listenToLiveHeldOrders,
  liveSaveOrder,
  liveDeleteOrder,
  liveDeleteAllOrders,
  liveSaveProduct,
  liveDeleteProduct,
  liveUpdateProductStock,
  liveBatchDeductStock,
  liveSaveCategory,
  liveDeleteCategory,
  liveSaveCustomer,
  liveSettleCustomerCredit,
  liveSaveCashEntry,
  liveSaveSettings,
  liveSaveStaff,
  liveUpdateStaffPin,
  liveSaveHeldOrder,
  liveDeleteHeldOrder,
  liveClearAllHeldOrders,
  setActiveTenantId,
  getTenantDoc,
} from './services/liveSync';
import { useCart } from './context/CartContext';
import { DirectThermalReceipt, printDirectThermalReceipt } from './components/DirectThermalReceipt';
import { SubscriptionModal } from './components/SubscriptionModal';
import { StoreOnboardingModal } from './components/StoreOnboardingModal';
import { soundbox } from './utils/soundbox';

export default function App() {
  // Screen Routing
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('item-wise');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Firebase Auth & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'hardware' | 'store' | 'cloud'>('hardware');
  const [settingsInitialSubView, setSettingsInitialSubView] = useState<'overview' | 'diagnostics'>('overview');

  // Subscription / License State & Modals
  const [tenantLicense, setTenantLicense] = useState<TenantLicense | null>(() => getCachedLicense());
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [isStoreOnboardingOpen, setIsStoreOnboardingOpen] = useState<boolean>(false);

  // Settings State
  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => {
    const saved =
      localStorage.getItem('monopos_retail_settings') ||
      localStorage.getItem('monopos_industrial_settings');
    if (!saved) return DEFAULT_SHOP_SETTINGS;

    try {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SHOP_SETTINGS,
        ...parsed,
        enableDailyToken: parsed.enableDailyToken !== undefined ? parsed.enableDailyToken : true,
        enableLoyaltyPoints: parsed.enableLoyaltyPoints !== undefined ? parsed.enableLoyaltyPoints : true,
        loyaltyEarnSpendAmount: parsed.loyaltyEarnSpendAmount || 100,
        loyaltyPointValue: parsed.loyaltyPointValue || 1,
        permissions: {
          staff: {
            ...DEFAULT_STORE_PERMISSIONS.staff,
            ...(parsed.permissions?.staff || {}),
          },
          manager: {
            ...DEFAULT_STORE_PERMISSIONS.manager,
            ...(parsed.permissions?.manager || {}),
          },
        },
      };
    } catch {
      return DEFAULT_SHOP_SETTINGS;
    }
  });

  // Listen to Firebase Auth state with local persistence
  useEffect(() => {
    const savedUser = localStorage.getItem('monopos_auth_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.warn('Failed to parse saved user:', e);
      }
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          localStorage.setItem('monopos_auth_user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Store Staff',
          }));
        } catch {}
      } else {
        const saved = localStorage.getItem('monopos_auth_user');
        if (!saved) {
          setCurrentUser(null);
        }
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // When user signs in, fetch or create their tenant license
  useEffect(() => {
    if (!currentUser) {
      setTenantLicense(getCachedLicense()); // keep cached for offline
      return;
    }
    getOrCreateLicense(currentUser).then((license) => {
      setTenantLicense(license);
    });
  }, [currentUser]);

  // Recompute license status every minute
  useEffect(() => {
    if (!tenantLicense) {
      setLicenseStatus(null);
      return;
    }
    const compute = () => setLicenseStatus(checkLicenseStatus(tenantLicense));
    compute();
    const interval = setInterval(compute, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, [tenantLicense]);

  // Sync active tenant ID for Firestore isolation and check first-time onboarding
  useEffect(() => {
    if (currentUser) {
      const tenantId = `tenant_${currentUser.uid}`;
      setActiveTenantId(tenantId);
      const onboardedKey = `monopos_onboarded_${currentUser.uid}`;
      const userSettingsKey = `monopos_retail_settings_${currentUser.uid}`;

      // Check if store is already active/onboarded via tenant-scoped keys
      const hasExistingCatalog = (() => {
        try {
          const raw = localStorage.getItem(`monopos_live_catalog_${currentUser.uid}`);
          return raw ? JSON.parse(raw).length > 0 : false;
        } catch {
          return false;
        }
      })();

      const hasExistingOrders = (() => {
        try {
          const raw = localStorage.getItem(`monopos_orders_${currentUser.uid}`);
          return raw ? JSON.parse(raw).length > 0 : false;
        } catch {
          return false;
        }
      })();

      const localAlreadyOnboarded =
        localStorage.getItem(onboardedKey) === 'true' ||
        localStorage.getItem('monopos_onboarded') === 'true' ||
        Boolean(shopSettings.onboarded) ||
        hasExistingCatalog ||
        hasExistingOrders;

      // 1. Check local storage for this user's specific store settings
      const userSavedSettings =
        localStorage.getItem(userSettingsKey) ||
        localStorage.getItem('monopos_retail_settings');

      if (userSavedSettings) {
        try {
          const parsed = JSON.parse(userSavedSettings);
          if (parsed && typeof parsed === 'object') {
            setShopSettings((prev) => ({ ...prev, ...parsed }));
          }
        } catch {}
      }

      if (localAlreadyOnboarded) {
        localStorage.setItem(onboardedKey, 'true');
        localStorage.setItem('monopos_onboarded', 'true');
        setIsStoreOnboardingOpen(false);
      } else {
        // 2. Query Firestore directly before opening onboarding modal to avoid race conditions
        getDoc(getTenantDoc('settings', 'store_config', tenantId))
          .then((snap) => {
            if (snap.exists()) {
              const remote = snap.data() as ShopSettings;
              setShopSettings((prev) => ({ ...prev, ...remote }));
              localStorage.setItem(onboardedKey, 'true');
              localStorage.setItem('monopos_onboarded', 'true');
              localStorage.setItem(userSettingsKey, JSON.stringify(remote));
              setIsStoreOnboardingOpen(false);
              return;
            }
            // Only show onboarding if user has never configured a store and has 0 data
            setIsStoreOnboardingOpen(true);
          })
          .catch((err) => {
            console.warn('Firestore store config check deferred:', err);
            // Default to not showing onboarding modal when offline
            setIsStoreOnboardingOpen(false);
          });
      }
    } else {
      setActiveTenantId(null);
      setIsStoreOnboardingOpen(false);
    }
  }, [currentUser]);

  // Clean up legacy unscoped keys if present
  useEffect(() => {
    localStorage.removeItem('monopos_is_demo');
    localStorage.removeItem('monopos_live_catalog');
    localStorage.removeItem('monopos_orders');
    localStorage.removeItem('monopos_categories');
    localStorage.removeItem('monopos_customers');
    localStorage.removeItem('monopos_cash_entries');
    localStorage.removeItem('monopos_held_orders');
  }, []);

  // Handle sign-out: fully clear in-memory state so nothing bleeds into the next user
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('monopos_auth_user');
      setCurrentUser(null);
      clearCachedLicense();
      setTenantLicense(null);
      setLicenseStatus(null);
      setActiveTenantId('');
      setCatalog([]);
      setOrders([]);
      setCategories(ensureAllItemsFirst(BUSINESS_TYPE_CATEGORIES.grocery));
      setCustomers([]);
      setCashEntries([]);
      setHeldOrders([]);
      cartClearCart();
      setShopSettings(DEFAULT_SHOP_SETTINGS);
      setStaffList(SAMPLE_STAFF);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  // Staff State
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    const uid = currentUser?.uid;
    const saved = uid ? localStorage.getItem(`monopos_staff_list_${uid}`) : null;
    if (!saved) return SAMPLE_STAFF;
    try {
      const parsed: StaffMember[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map((s) => s.id));
      const merged = [...parsed];
      for (const sample of SAMPLE_STAFF) {
        if (!existingIds.has(sample.id)) {
          merged.push(sample);
        }
      }
      return merged
        .filter((s) => s.id !== 'staff-worker')
        .map((s) => ({
          ...s,
          role: normalizeRole(s.role),
        }));
    } catch {
      return SAMPLE_STAFF;
    }
  });
  const [activeStaffId, setActiveStaffId] = useState<string>(() => {
    const uid = currentUser?.uid;
    const saved = uid ? localStorage.getItem(`monopos_active_staff_id_${uid}`) : null;
    return saved || 'staff-1';
  });

  // Categories & Catalog State - strictly partitioned per user
  const [categories, setCategories] = useState<Category[]>(() => {
    const uid = currentUser?.uid;
    if (uid) {
      const saved = localStorage.getItem(`monopos_categories_${uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return ensureAllItemsFirst(parsed);
        } catch {}
      }
    }
    return ensureAllItemsFirst(BUSINESS_TYPE_CATEGORIES.grocery);
  });

  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    const uid = currentUser?.uid;
    if (uid) {
      const saved = localStorage.getItem(`monopos_live_catalog_${uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
              .filter((it: any) => it.name && it.name !== 'Unnamed Product')
              .map((it: any) => ({
                ...it,
                price: Number(it.price !== undefined ? it.price : it.sellingPrice) || 0,
              }));
          }
        } catch {}
      }
    }
    return [];
  });

  // Customers & Khata Ledger State
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const uid = currentUser?.uid;
    if (uid) {
      const saved = localStorage.getItem(`monopos_customers_${uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return [];
  });

  // Cash Drawer Entries
  const [cashEntries, setCashEntries] = useState<CashEntry[]>(() => {
    const uid = currentUser?.uid;
    if (uid) {
      const saved = localStorage.getItem(`monopos_cash_entries_${uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return [];
  });

  // Active Billing State - Shared via CartContext
  const [orderNumber, setOrderNumber] = useState<number>(() => {
    const uid = currentUser?.uid;
    if (uid) {
      const savedOrders = localStorage.getItem(`monopos_orders_${uid}`);
      if (savedOrders) {
        try {
          const parsed: Order[] = JSON.parse(savedOrders);
          const maxNo = Math.max(...parsed.map((o) => o.orderNumber || 0), 0);
          return maxNo > 0 ? maxNo + 1 : 1;
        } catch {}
      }
    }
    return 1;
  });
  const {
    currentBillItems,
    addItem: cartAddItem,
    removeItem: cartRemoveItem,
    updateQty: cartUpdateQty,
    updateItemRate: cartUpdateItemRate,
    clearCart: cartClearCart,
    setCartItems: setCurrentBillItems,
    discount,
    discountType,
    discountAmount,
    setDiscount,
  } = useCart();

  // Orders and Invoices History
  const [orders, setOrders] = useState<Order[]>(() => {
    const uid = currentUser?.uid;
    if (uid) {
      const saved = localStorage.getItem(`monopos_orders_${uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
    }
    return [];
  });
  const [heldOrders, setHeldOrders] = useState<Order[]>(() => {
    const uid = currentUser?.uid;
    if (uid) {
      try {
        const saved = localStorage.getItem(`monopos_held_orders_${uid}`);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isHeldOrdersModalOpen, setIsHeldOrdersModalOpen] = useState<boolean>(false);
  const [heldToastNotification, setHeldToastNotification] = useState<{
    id: number;
    orderNumber: number;
    itemsCount: number;
    total: number;
    action: 'parked' | 'resumed';
  } | null>(null);



  // Auto-dismiss held order toast notification
  useEffect(() => {
    if (!heldToastNotification) return;
    const timer = setTimeout(() => {
      setHeldToastNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [heldToastNotification]);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const [isReceiptDuplicate, setIsReceiptDuplicate] = useState<boolean>(false);
  const [isCustomProductModalOpen, setIsCustomProductModalOpen] = useState<boolean>(false);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState<boolean>(false);
  const [isTrainingVideosOpen, setIsTrainingVideosOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('add-to-bill');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isStaffSwitchModalOpen, setIsStaffSwitchModalOpen] = useState<boolean>(false);
  const [isPurchaseInwardOpen, setIsPurchaseInwardOpen] = useState<boolean>(false);
  const [isBarcodeGeneratorOpen, setIsBarcodeGeneratorOpen] = useState<boolean>(false);
  const [barcodeSelectedProductId, setBarcodeSelectedProductId] = useState<string | undefined>(undefined);
  const [isPriceCheckOpen, setIsPriceCheckOpen] = useState<boolean>(false);
  const [quickAddBarcode, setQuickAddBarcode] = useState<string | null>(null);
  const [laserScanNotification, setLaserScanNotification] = useState<{
    productName: string;
    price: number;
    stock?: number;
    cartQty: number;
  } | null>(null);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const lastSettledOrderRef = useRef<Order | null>(null);
  const [directPrintOrder, setDirectPrintOrder] = useState<Order | null>(null);
  const [isZReportOpen, setIsZReportOpen] = useState<boolean>(false);

  // RBAC Manager Override & Matrix Modals
  const [isManagerPinModalOpen, setIsManagerPinModalOpen] = useState<boolean>(false);
  const [pendingRestrictedAction, setPendingRestrictedAction] = useState<{
    title: string;
    description: string;
    requiredRoleLabel?: string;
    requiredRole?: 'MANAGER' | 'OWNER';
    onAuthorize: (authorizingStaff: StaffMember) => void;
  } | null>(null);
  const [isRolePermissionsOpen, setIsRolePermissionsOpen] = useState<boolean>(false);

  // Active staff object
  const activeStaff =
    staffList.find((s) => s.id === activeStaffId) ||
    staffList[0] || {
      id: 'staff-default',
      name: 'Store Operator',
      role: 'OWNER' as StaffRole,
      pin: '1234',
    };

  // Synchronize state when switching accounts
  useEffect(() => {
    if (!currentUser?.uid) {
      setCatalog([]);
      setOrders([]);
      setCategories(ensureAllItemsFirst(BUSINESS_TYPE_CATEGORIES.grocery));
      setCustomers([]);
      setCashEntries([]);
      setHeldOrders([]);
      cartClearCart();
      return;
    }

    const uid = currentUser.uid;

    try {
      const savedCatalog = localStorage.getItem(`monopos_live_catalog_${uid}`);
      if (savedCatalog) {
        const parsed = JSON.parse(savedCatalog);
        if (Array.isArray(parsed)) {
          setCatalog(
            parsed
              .filter((it: any) => it.name && it.name !== 'Unnamed Product')
              .map((it: any) => ({
                ...it,
                price: Number(it.price !== undefined ? it.price : it.sellingPrice) || 0,
              }))
          );
        }
      } else {
        setCatalog([]);
      }
    } catch {
      setCatalog([]);
    }

    try {
      const savedCats = localStorage.getItem(`monopos_categories_${uid}`);
      if (savedCats) {
        const parsed = JSON.parse(savedCats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(ensureAllItemsFirst(parsed));
        }
      } else {
        setCategories(ensureAllItemsFirst(BUSINESS_TYPE_CATEGORIES.grocery));
      }
    } catch {
      setCategories(ensureAllItemsFirst(BUSINESS_TYPE_CATEGORIES.grocery));
    }

    try {
      const savedOrders = localStorage.getItem(`monopos_orders_${uid}`);
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);
        if (Array.isArray(parsed)) setOrders(parsed);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    }

    try {
      const savedCusts = localStorage.getItem(`monopos_customers_${uid}`);
      if (savedCusts) {
        const parsed = JSON.parse(savedCusts);
        if (Array.isArray(parsed)) setCustomers(parsed);
      } else {
        setCustomers([]);
      }
    } catch {
      setCustomers([]);
    }

    try {
      const savedCash = localStorage.getItem(`monopos_cash_entries_${uid}`);
      if (savedCash) {
        const parsed = JSON.parse(savedCash);
        if (Array.isArray(parsed)) setCashEntries(parsed);
      } else {
        setCashEntries([]);
      }
    } catch {
      setCashEntries([]);
    }

    try {
      const savedHeld = localStorage.getItem(`monopos_held_orders_${uid}`);
      if (savedHeld) {
        const parsed = JSON.parse(savedHeld);
        if (Array.isArray(parsed)) setHeldOrders(parsed);
      } else {
        setHeldOrders([]);
      }
    } catch {
      setHeldOrders([]);
    }
  }, [currentUser?.uid]);

  // Save settings and staff to localStorage on change (strictly scoped per user)
  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      localStorage.setItem(`monopos_retail_settings_${currentUser.uid}`, JSON.stringify(shopSettings));
    } catch {}
  }, [shopSettings, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      localStorage.setItem(`monopos_staff_list_${currentUser.uid}`, JSON.stringify(staffList));
    } catch {}
  }, [staffList, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      localStorage.setItem(`monopos_active_staff_id_${currentUser.uid}`, activeStaffId);
    } catch {}
  }, [activeStaffId, currentUser?.uid]);

  // Persist catalog, categories, customers, and cash entries locally for offline durability & instant reload
  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      localStorage.setItem(`monopos_live_catalog_${currentUser.uid}`, JSON.stringify(catalog));
    } catch (err) {
      console.warn('Failed to persist live catalog:', err);
    }
  }, [catalog, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      localStorage.setItem(`monopos_categories_${currentUser.uid}`, JSON.stringify(categories));
    } catch (err) {
      console.warn('Failed to persist categories:', err);
    }
  }, [categories, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      localStorage.setItem(`monopos_customers_${currentUser.uid}`, JSON.stringify(customers));
    } catch (err) {
      console.warn('Failed to persist customers:', err);
    }
  }, [customers, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      localStorage.setItem(`monopos_cash_entries_${currentUser.uid}`, JSON.stringify(cashEntries));
    } catch (err) {
      console.warn('Failed to persist cash entries:', err);
    }
  }, [cashEntries, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      localStorage.setItem(`monopos_orders_${currentUser.uid}`, JSON.stringify(orders));
    } catch (err) {
      console.warn('Failed to persist orders:', err);
    }
  }, [orders, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    try {
      localStorage.setItem(`monopos_held_orders_${currentUser.uid}`, JSON.stringify(heldOrders));
    } catch (err) {
      console.warn('Failed to persist held orders:', err);
    }
  }, [heldOrders, currentUser?.uid]);

  // Real-time live Firestore synchronization across all 9 database points / collections
  useEffect(() => {
    if (!currentUser) return;

    const tenantId = `tenant_${currentUser.uid}`;
    setActiveTenantId(tenantId);
    testFirestoreConnection();

    const unsubSyncState = subscribeSyncState((state) => {
      setIsSyncing(state.isSyncing);
      if (state.lastSyncAt) setLastSyncedAt(state.lastSyncAt);
    });

    const unsubCatalog = listenToLiveCatalog(
      (items) => {
        const valid = items.filter((it) => it.name && it.name !== 'Unnamed Product');
        setCatalog(valid);
        if (currentUser?.uid) {
          try {
            localStorage.setItem(`monopos_live_catalog_${currentUser.uid}`, JSON.stringify(valid));
          } catch {}
        }
      },
      undefined,
      tenantId
    );

    const unsubCategories = listenToLiveCategories(
      (cats) => {
        if (cats.length > 0) {
          const ordered = ensureAllItemsFirst(cats);
          setCategories(ordered);
          if (currentUser?.uid) {
            try {
              localStorage.setItem(`monopos_categories_${currentUser.uid}`, JSON.stringify(ordered));
            } catch {}
          }
        }
      },
      undefined,
      tenantId
    );

    const unsubOrders = listenToLiveOrders(
      (remoteOrders) => {
        setOrders(remoteOrders);
        const maxOrderNum = Math.max(...remoteOrders.map((o) => o.orderNumber || 0), 0);
        if (maxOrderNum > 0) {
          setOrderNumber((prev) => Math.max(prev, maxOrderNum + 1));
        }
        if (currentUser?.uid) {
          try {
            localStorage.setItem(`monopos_orders_${currentUser.uid}`, JSON.stringify(remoteOrders));
          } catch {}
        }
      },
      undefined,
      tenantId
    );

    const unsubCustomers = listenToLiveCustomers(
      (custs) => {
        setCustomers(custs);
        if (currentUser?.uid) {
          try {
            localStorage.setItem(`monopos_customers_${currentUser.uid}`, JSON.stringify(custs));
          } catch {}
        }
      },
      undefined,
      tenantId
    );

    const unsubCash = listenToLiveCashEntries(
      (entries) => {
        setCashEntries(entries);
        if (currentUser?.uid) {
          try {
            localStorage.setItem(`monopos_cash_entries_${currentUser.uid}`, JSON.stringify(entries));
          } catch {}
        }
      },
      undefined,
      tenantId
    );

    const unsubSettings = listenToLiveSettings(
      (remoteSettings) => {
        if (remoteSettings) {
          setShopSettings((prev) => ({ ...prev, ...remoteSettings }));
          if (
            remoteSettings.onboarded ||
            (remoteSettings.shopName &&
              remoteSettings.shopName !== 'MonoPOS Express' &&
              remoteSettings.shopName !== 'Anand Supermarket')
          ) {
            localStorage.setItem(`monopos_onboarded_${currentUser.uid}`, 'true');
            setIsStoreOnboardingOpen(false);
          }
        }
      },
      undefined,
      tenantId
    );

    const unsubStaff = listenToLiveStaff(
      (staff) => {
        if (staff.length > 0) {
          setStaffList(staff);
          if (currentUser?.uid) {
            try {
              localStorage.setItem(`monopos_staff_list_${currentUser.uid}`, JSON.stringify(staff));
            } catch {}
          }
        }
      },
      undefined,
      tenantId
    );

    const unsubHeld = listenToLiveHeldOrders(
      (held) => {
        setHeldOrders(held);
        if (currentUser?.uid) {
          try {
            localStorage.setItem(`monopos_held_orders_${currentUser.uid}`, JSON.stringify(held));
          } catch {}
        }
      },
      undefined,
      tenantId
    );

    return () => {
      unsubSyncState();
      unsubCatalog();
      unsubCategories();
      unsubOrders();
      unsubCustomers();
      unsubCash();
      unsubSettings();
      unsubStaff();
      unsubHeld();
    };
  }, [currentUser]);

  // Handle First-Time Store Onboarding Setup
  const handleOnboardingComplete = ({
    shopSettings: updatedSettings,
    useSampleData,
    businessType,
    ownerPin,
  }: {
    shopSettings: Partial<ShopSettings>;
    useSampleData: boolean;
    businessType: string;
    ownerPin?: string;
  }) => {
    const newSettings: ShopSettings = {
      ...shopSettings,
      ...updatedSettings,
      onboarded: true,
      businessType,
    };
    setShopSettings(newSettings);
    if (currentUser) {
      localStorage.setItem(`monopos_onboarded_${currentUser.uid}`, 'true');
      localStorage.setItem(`monopos_retail_settings_${currentUser.uid}`, JSON.stringify(newSettings));
    }
    setIsStoreOnboardingOpen(false);
    liveSaveSettings(newSettings).catch((err) => console.warn('Live save settings error:', err));

    // Set tailored clean categories for the selected business type
    const tailoredCategories = BUSINESS_TYPE_CATEGORIES[businessType] || BUSINESS_TYPE_CATEGORIES.grocery;
    setCategories(tailoredCategories);
    if (currentUser) {
      localStorage.setItem(`monopos_categories_${currentUser.uid}`, JSON.stringify(tailoredCategories));
    }
    tailoredCategories.forEach((cat) => {
      liveSaveCategory(cat).catch(() => {});
    });

    // Update Owner PIN and Name if provided
    if (ownerPin && ownerPin.trim().length === 4) {
      const pinToSet = ownerPin.trim();
      const ownerName = newSettings.shopName ? `${newSettings.shopName} (Owner)` : 'Store Owner';
      setStaffList((prev) => {
        let found = false;
        const updated = prev.map((s) => {
          if (normalizeRole(s.role) === 'OWNER' || s.id === 'staff-owner') {
            found = true;
            return { ...s, pin: pinToSet, name: ownerName };
          }
          return s;
        });
        if (!found) {
          updated.unshift({
            id: 'staff-owner',
            name: ownerName,
            role: 'OWNER',
            pin: pinToSet,
            active: true,
          });
        }
        if (currentUser) {
          localStorage.setItem(`monopos_staff_list_${currentUser.uid}`, JSON.stringify(updated));
        }
        const ownerMember = updated.find((s) => normalizeRole(s.role) === 'OWNER');
        if (ownerMember) {
          liveSaveStaff(ownerMember).catch(() => {});
        }
        return updated;
      });
    }

    // If catalog already has items, preserve them; only initialize if empty
    const hasExistingCatalog = (() => {
      if (!currentUser) return false;
      try {
        const raw = localStorage.getItem(`monopos_live_catalog_${currentUser.uid}`);
        return raw ? JSON.parse(raw).length > 0 : false;
      } catch {
        return false;
      }
    })();

    if (catalog.length === 0 && !hasExistingCatalog) {
      setCatalog([]);
      if (currentUser) {
        localStorage.setItem(`monopos_live_catalog_${currentUser.uid}`, JSON.stringify([]));
      }
    }

    const hasExistingOrders = (() => {
      if (!currentUser) return false;
      try {
        const raw = localStorage.getItem(`monopos_orders_${currentUser.uid}`);
        return raw ? JSON.parse(raw).length > 0 : false;
      } catch {
        return false;
      }
    })();

    if (orders.length === 0 && !hasExistingOrders) {
      setOrders([]);
      if (currentUser) {
        localStorage.setItem(`monopos_orders_${currentUser.uid}`, JSON.stringify([]));
      }
    }

    if (currentUser) {
      localStorage.setItem(`monopos_onboarded_${currentUser.uid}`, 'true');
    }
    setIsStoreOnboardingOpen(false);
  };

  // Audio helper
  const playSfx = (action: 'tap' | 'add' | 'remove' | 'success') => {
    if (!shopSettings.soundEnabled) return;
    if (action === 'tap') posSound.playTap();
    else if (action === 'add') posSound.playAdd();
    else if (action === 'remove') posSound.playRemove();
    else if (action === 'success') posSound.playSuccess();
  };

  // Open Scanner with specified mode
  const handleOpenScanner = (mode: ScannerMode = 'add-to-bill') => {
    playSfx('tap');
    setScannerMode(mode);
    setIsScannerOpen(true);
  };

  // Hotkey F2 listener to toggle Price Check & Product Info
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsPriceCheckOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculations for current bill
  const subtotal = currentBillItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const taxAmount = (subtotal * shopSettings.taxRate) / 100;
  const grandTotal = Math.max(0, subtotal - (discountAmount || 0)) + taxAmount;


  // ITEM-WISE BILLING HANDLERS
  const handleAddItem = (item: CatalogItem) => {
    handleAddItemWithPack(item, null);
  };

  const handleAddItemWithPack = (item: CatalogItem, pack?: PackagingOption | null) => {
    playSfx('add');
    if (pack) {
      cartAddItem({
        id: item.id,
        itemId: item.id,
        name: item.name,
        unitPrice: pack.sellingPrice,
        price: pack.sellingPrice,
        quantity: 1,
        selectedPackName: pack.packName,
        multiplier: pack.multiplier || 1,
        barcode: pack.barcode,
        gstRate: item.gstRate,
      });
    } else {
      cartAddItem(item);
    }
  };

  // Hardware Laser Barcode Scanner Gun Driver (USB / Bluetooth HID Keyboard Wedge)
  useEffect(() => {
    const unsubscribe = hardware.onLaserScan((scannedCode) => {
      if (isPriceCheckOpen) return;

      const match = resolveBarcodeMatch(scannedCode, catalog);

      if (match) {
        posSound.playBeep();
        handleAddItemWithPack(match.item, match.pack);

        const existingInCart = currentBillItems.find(
          (b) =>
            b.name === match.item.name &&
            (b.selectedPackName || undefined) === (match.packName || undefined)
        );
        const currentCartQty = existingInCart ? existingInCart.quantity + 1 : 1;

        setLaserScanNotification({
          productName: match.displayName,
          price: match.unitPrice,
          stock:
            match.item.stock !== undefined
              ? Math.max(0, match.item.stock - currentCartQty * match.multiplier)
              : undefined,
          cartQty: currentCartQty,
        });
      } else {
        posSound.playBuzzer();
        setQuickAddBarcode(scannedCode);
      }
    });

    return () => unsubscribe();
  }, [catalog, isPriceCheckOpen, currentBillItems]);

  // Auto-dismiss laser scan floating notification
  useEffect(() => {
    if (laserScanNotification) {
      const timer = setTimeout(() => {
        setLaserScanNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [laserScanNotification]);

  const handleUpdateProductStock = (productId: string, newStock: number) => {
    setCatalog((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );
    liveUpdateProductStock(productId, newStock).catch((err) =>
      console.warn('Live stock update deferred:', err)
    );
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    if (delta > 0) playSfx('add');
    else playSfx('remove');
    cartUpdateQty(id, delta);
  };

  const handleUpdateItemRate = (id: string, newRate: number) => {
    playSfx('add');
    cartUpdateItemRate(id, newRate);
  };

  const handleRemoveItem = (id: string) => {
    playSfx('remove');
    cartRemoveItem(id);
  };

  const handleClearBill = () => {
    playSfx('remove');
    cartClearCart();
  };

  const handleHoldBill = (customItems?: BillItem[]) => {
    const itemsToHold = customItems && customItems.length > 0 ? customItems : currentBillItems;
    if (itemsToHold.length === 0) return;
    playSfx('tap');
    const itemsSubtotal = itemsToHold.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
    const itemsTax = (itemsSubtotal * shopSettings.taxRate) / 100;
    const itemsTotal = itemsSubtotal + itemsTax;
    const held: Order = {
      id: `held-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      items: [...itemsToHold],
      status: 'held',
      subtotal: itemsSubtotal,
      taxRate: shopSettings.taxRate,
      taxAmount: itemsTax,
      discount: 0,
      total: itemsTotal,
      paymentMethod: 'NONE',
      staffName: activeStaff.name,
    };
    const heldOrderNum = orderNumber;
    const itemsCount = itemsToHold.reduce((acc, i) => acc + i.quantity, 0);
    const amount = itemsTotal;

    setHeldOrders((prev) => [held, ...prev]);
    liveSaveHeldOrder(held).catch((err) => console.warn('Live held order save:', err));
    cartClearCart();
    setOrderNumber((prev) => prev + 1);

    setHeldToastNotification({
      id: Date.now(),
      orderNumber: heldOrderNum,
      itemsCount,
      total: amount,
      action: 'parked',
    });
  };

  const handleResumeHeldOrder = (
    order: Order,
    strategy: 'replace' | 'merge' | 'swap' = 'replace'
  ) => {
    playSfx('success');
    if (strategy === 'swap' && currentBillItems.length > 0) {
      // Park current items
      const swappedHeld: Order = {
        id: `held-${Date.now()}`,
        orderNumber,
        createdAt: new Date().toISOString(),
        items: [...currentBillItems],
        status: 'held',
        subtotal,
        taxRate: shopSettings.taxRate,
        taxAmount,
        discount: 0,
        total: grandTotal,
        paymentMethod: 'NONE',
        staffName: activeStaff.name,
      };
      setHeldOrders((prev) => [swappedHeld, ...prev.filter((o) => o.id !== order.id)]);
      liveSaveHeldOrder(swappedHeld).catch((err) => console.warn('Live swap save:', err));
      liveDeleteHeldOrder(order.id).catch((err) => console.warn('Live delete resumed:', err));
      setCurrentBillItems([...order.items]);
      setOrderNumber(order.orderNumber);
    } else if (strategy === 'merge') {
      // Merge items into current cart
      setCurrentBillItems((prev) => {
        const merged = [...prev];
        order.items.forEach((newItem) => {
          const existing = merged.find(
            (i) => (newItem.itemId && i.itemId === newItem.itemId) || i.name === newItem.name
          );
          if (existing) {
            existing.quantity += newItem.quantity;
          } else {
            merged.push({
              ...newItem,
              id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            });
          }
        });
        return merged;
      });
      setHeldOrders((prev) => prev.filter((o) => o.id !== order.id));
      liveDeleteHeldOrder(order.id).catch((err) => console.warn('Live delete resumed:', err));
    } else {
      // Replace
      setCurrentBillItems([...order.items]);
      setOrderNumber(order.orderNumber);
      setHeldOrders((prev) => prev.filter((o) => o.id !== order.id));
      liveDeleteHeldOrder(order.id).catch((err) => console.warn('Live delete resumed:', err));
    }

    setIsHeldOrdersModalOpen(false);

    setHeldToastNotification({
      id: Date.now(),
      orderNumber: order.orderNumber,
      itemsCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
      total: order.total,
      action: 'resumed',
    });
  };

  const handleDeleteHeldOrder = (orderId: string) => {
    playSfx('remove');
    setHeldOrders((prev) => prev.filter((o) => o.id !== orderId));
    liveDeleteHeldOrder(orderId).catch((err) => console.warn('Live delete held order:', err));
  };

  const handleClearAllHeldOrders = () => {
    if (window.confirm('Clear all parked tickets?')) {
      playSfx('remove');
      setHeldOrders([]);
      liveClearAllHeldOrders().catch((err) => console.warn('Live clear held orders:', err));
    }
  };

  const handleAddCustomProduct = (customItem: BillItem) => {
    playSfx('add');
    cartAddItem(customItem);
  };

  // Send formatted bill via WhatsApp (Standard for Indian retail)
  const handleShareOrderWhatsApp = (order: Order) => {
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    let text = `*${shopSettings.shopName}*\n`;
    text += `Invoice #${order.orderNumber} | ${formattedDate}\n`;
    text += `Customer: ${order.customerName}\n`;
    text += `--------------------------------\n`;
    order.items.forEach((i) => {
      text += `${i.name} x ${i.quantity} = ${shopSettings.currencySymbol}${(i.unitPrice * i.quantity).toFixed(2)}\n`;
    });
    text += `--------------------------------\n`;
    text += `Total Paid: *${shopSettings.currencySymbol}${order.total.toFixed(2)}* (${order.paymentMethod})\n`;
    if (order.paymentMethod === 'ONLINE' && order.upiRefNumber) {
      text += `UPI Ref / UTR: *${order.upiRefNumber}*\n`;
      text += `Payment Verification: *VERIFIED (${order.verificationMethod?.toUpperCase() || 'CONFIRMED'})*\n`;
    }
    if (order.paymentMethod === 'CASH' && order.tenderedAmount !== undefined && order.tenderedAmount > 0) {
      text += `Cash Tendered: ${shopSettings.currencySymbol}${order.tenderedAmount.toFixed(2)}\n`;
      const chg =
        order.changeDue !== undefined
          ? order.changeDue
          : Math.max(0, order.tenderedAmount - order.total);
      if (chg > 0) {
        text += `Change Returned: ${shopSettings.currencySymbol}${chg.toFixed(2)}\n`;
      }
    }
    text += `\nThank you for shopping with us!`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = order.customerPhone?.replace(/\D/g, '') || '';
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    if (phoneWithCountry) {
      window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  // SAVE BILL & COMPLETE INVOICE
  const handleSaveAndCompleteOrder = (data: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    discountPercent: number;
    discountAmount: number;
    includeGst: boolean;
    taxAmount: number;
    grandTotal: number;
    paymentMode: PaymentMethod;
    splitDetails?: SplitPaymentDetail;
    tenderedAmount?: number;
    changeDue?: number;
    note?: string;
    orderDate: string;
    printReceipt?: boolean;
    shareWhatsApp?: boolean;
    upiRefNumber?: string;
    isVerified?: boolean;
    verificationMethod?: 'soundbox' | 'utr' | 'gateway' | 'cash_tender';
    items?: BillItem[];
    fromPaymentModal?: boolean;
    tokenNumber?: number;
    tableOrToken?: string;
    redeemedPoints?: number;
  }) => {
    playSfx('success');

    const orderItems = (data.items && data.items.length > 0) ? [...data.items] : [...currentBillItems];
    const orderSubtotal = orderItems.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);

    const tokenNum = shopSettings.enableDailyToken
      ? (data.tokenNumber || getNextDailyToken())
      : undefined;

    const newOrder: Order = {
      id: `order-${orderNumber}-${Date.now()}`,
      orderNumber,
      terminalPrefix: shopSettings.terminalPrefix || 'A',
      orderNumberFormatted: `${shopSettings.terminalPrefix || 'A'}-${orderNumber}`,
      tokenNumber: tokenNum,
      tableOrToken: data.tableOrToken,
      createdAt: data.orderDate,
      items: orderItems,
      status: 'completed',
      subtotal: orderSubtotal,
      taxRate: data.includeGst ? shopSettings.taxRate : 0,
      taxAmount: data.taxAmount,
      discount: data.discountAmount,
      total: data.grandTotal,
      paymentMethod: data.paymentMode,
      splitDetails: data.splitDetails,
      tenderedAmount: data.tenderedAmount,
      changeDue: data.changeDue,
      customerName: data.customerName || 'Walk-in Customer',
      customerPhone: data.customerPhone || '',
      staffName: activeStaff.name,
      notes: data.note,
      upiRefNumber: data.upiRefNumber,
      isVerified: data.isVerified,
      verificationMethod: data.verificationMethod,
    };

    // If payment was CREDIT or SPLIT with credit, update customer khata balance & loyalty points
    if (data.customerId) {
      let creditToAdd = 0;
      if (data.paymentMode === 'CREDIT') {
        creditToAdd = data.grandTotal;
      } else if (data.paymentMode === 'SPLIT' && data.splitDetails?.credit) {
        creditToAdd = data.splitDetails.credit;
      }

      // Calculate loyalty points if enabled
      let earnedPoints = 0;
      const isLoyaltyOn = shopSettings.enableLoyaltyPoints !== false;
      const earnSpendRate = shopSettings.loyaltyEarnSpendAmount || 100;
      if (isLoyaltyOn) {
        earnedPoints = Math.floor(data.grandTotal / earnSpendRate);
      }
      const redeemed = data.redeemedPoints || 0;

      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === data.customerId) {
            const updated = {
              ...c,
              creditBalance: (c.creditBalance || 0) + creditToAdd,
              loyaltyPoints: Math.max(0, (c.loyaltyPoints || 0) - redeemed + earnedPoints),
              totalOrders: (c.totalOrders || 0) + 1,
            };
            liveSaveCustomer(updated).catch((err) =>
              console.warn('Live save customer on sale:', err)
            );
            return updated;
          }
          return c;
        })
      );
    }

    // Add to cash entries if Cash was received
    if (data.paymentMode === 'CASH') {
      setCashEntries((prev) => [
        {
          id: `cash-sale-${Date.now()}`,
          type: 'IN',
          amount: data.grandTotal,
          reason: `Bill #${orderNumber} (${data.customerName || 'Walk-in'})`,
          staffName: activeStaff.name,
          createdAt: data.orderDate,
        },
        ...prev,
      ]);
    } else if (data.paymentMode === 'SPLIT' && data.splitDetails?.cash) {
      setCashEntries((prev) => [
        {
          id: `cash-split-${Date.now()}`,
          type: 'IN',
          amount: data.splitDetails!.cash!,
          reason: `Bill #${orderNumber} Split (${data.customerName || 'Walk-in'})`,
          staffName: activeStaff.name,
          createdAt: data.orderDate,
        },
        ...prev,
      ]);
    }

    // Auto-decrement inventory stock from catalog in real time (taking multipliers into account)
    const stockDeductions = new Map<string, number>();
    newOrder.items.forEach((item) => {
      const unitsToDeduct = item.quantity * (item.multiplier || 1);
      stockDeductions.set(item.name, (stockDeductions.get(item.name) || 0) + unitsToDeduct);
    });

    setCatalog((prevCatalog) => {
      const updatedCatalog = prevCatalog.map((prod) => {
        const deductQty = stockDeductions.get(prod.name);
        if (deductQty !== undefined && prod.stock !== undefined) {
          return {
            ...prod,
            stock: Math.max(0, prod.stock - deductQty),
          };
        }
        return prod;
      });
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_live_catalog_${currentUser.uid}`, JSON.stringify(updatedCatalog));
        } catch {}
      }
      // Live stock deduction using the updatedCatalog so it has full item details (name, category, price)
      liveBatchDeductStock(stockDeductions, updatedCatalog).catch((err) =>
        console.warn('Live stock deduction failed:', err)
      );
      return updatedCatalog;
    });

    setOrders((prev) => [newOrder, ...prev]);
    setActiveReceiptOrder(newOrder);
    lastSettledOrderRef.current = newOrder;
    setIsReceiptDuplicate(false);

    // Voice Soundbox Announcement (Paytm/PhonePe style voice announcement)
    if (shopSettings.enableSoundbox !== false && newOrder.total > 0) {
      soundbox.announcePayment({
        amount: newOrder.total,
        paymentMethod: newOrder.paymentMethod,
        language: shopSettings.soundboxLanguage || 'en',
        shopName: shopSettings.shopName,
      });
    }

    // Live real-time bidirectional Firestore synchronization
    liveSaveOrder(newOrder).catch((err) => console.warn('Live order save failed:', err));

    if (data.paymentMode === 'CASH') {
      const cashSaleEntry: CashEntry = {
        id: `cash-sale-${newOrder.id}`,
        type: 'IN',
        amount: newOrder.total,
        reason: `Bill #${orderNumber} Sale (${data.customerName || 'Walk-in'})`,
        staffName: activeStaff.name,
        createdAt: data.orderDate,
      };
      liveSaveCashEntry(cashSaleEntry).catch((err) => console.warn('Live cash entry save:', err));
    } else if (data.paymentMode === 'SPLIT' && data.splitDetails?.cash && data.splitDetails.cash > 0) {
      const cashSplitEntry: CashEntry = {
        id: `cash-split-${newOrder.id}`,
        type: 'IN',
        amount: data.splitDetails.cash,
        reason: `Bill #${orderNumber} Split (${data.customerName || 'Walk-in'})`,
        staffName: activeStaff.name,
        createdAt: data.orderDate,
      };
      liveSaveCashEntry(cashSplitEntry).catch((err) => console.warn('Live cash split save:', err));
    }

    // Auto-backup to Firebase if signed in
    if (currentUser) {
      pushSingleOrder(newOrder);
    }

    // If completed from SaveBillModal directly (not from PaymentModal interactive success screen)
    if (!data.fromPaymentModal) {
      setCurrentBillItems([]);
      setOrderNumber((prev) => prev + 1);
      setIsReceiptModalOpen(false);

      if (data.shareWhatsApp) {
        handleShareOrderWhatsApp(newOrder);
      } else if (data.printReceipt) {
        setDirectPrintOrder(newOrder);
        printDirectThermalReceipt(newOrder, shopSettings);
      }
    }
  };

  // Indian Payment Engine Handler (Phase 2)
  const handlePaymentModalComplete = (details: {
    billNo: number;
    paymentMethod: 'CASH' | 'UPI' | 'KHATA';
    tenderedAmount: number;
    changeDue: number;
    items: BillItem[];
    subtotal: number;
    taxAmount: number;
    discount?: number;
    discountAmount?: number;
    total: number;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    upiRefNumber?: string;
    isVerified?: boolean;
    verificationMethod?: 'soundbox' | 'utr' | 'gateway' | 'cash_tender';
    redeemedPoints?: number;
    pointsDiscount?: number;
  }) => {
    // Map Phase 2 method to PaymentMethod enum
    let mappedMode: PaymentMethod = 'CASH';
    if (details.paymentMethod === 'UPI') mappedMode = 'ONLINE';
    else if (details.paymentMethod === 'KHATA') mappedMode = 'CREDIT';

    handleSaveAndCompleteOrder({
      customerName: details.customerName || (details.paymentMethod === 'KHATA' ? 'Khata Customer' : 'Walk-in Customer'),
      customerPhone: details.customerPhone || '',
      customerId: details.customerId,
      discountPercent: details.discount || 0,
      discountAmount: (details.discountAmount || 0) + (details.pointsDiscount || 0),
      includeGst: details.taxAmount > 0,
      taxAmount: details.taxAmount,
      grandTotal: details.total,
      paymentMode: mappedMode,
      orderDate: new Date().toISOString(),
      tenderedAmount: details.tenderedAmount,
      changeDue: details.changeDue,
      upiRefNumber: details.upiRefNumber,
      isVerified: details.isVerified,
      verificationMethod: details.verificationMethod,
      printReceipt: false,
      shareWhatsApp: false,
      items: details.items,
      fromPaymentModal: true,
      tokenNumber: shopSettings.enableDailyToken ? getNextDailyToken() : undefined,
      redeemedPoints: details.redeemedPoints,
    });
  };


  // Checkout completion flow: "Print & Next Customer"
  const handlePrintAndNextCustomer = () => {
    posSound?.playTap?.();
    const orderToPrint = lastSettledOrderRef.current || activeReceiptOrder;

    // 1. Close all modals immediately - DO NOT open receipt preview screen
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(false);

    // 2. Clear cart completely
    setCurrentBillItems([]);

    // 3. Increment bill number for next customer (e.g. #44 to #45)
    setOrderNumber((prev) => prev + 1);

    // 4. Trigger printer directly in the background using the bill that was just paid
    if (orderToPrint) {
      setDirectPrintOrder(orderToPrint);
      printDirectThermalReceipt(orderToPrint, shopSettings);
    }
  };

  // Checkout completion flow: "Done (No Print)"
  const handleDoneNoPrint = () => {
    posSound?.playTap?.();

    // 1. Close all modals immediately - DO NOT open any receipt screen
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(false);

    // 2. Clear the cart completely
    setCurrentBillItems([]);

    // 3. Increment the bill number for the next customer (e.g. #44 to #45)
    setOrderNumber((prev) => prev + 1);
  };

  // INWARD STOCK RECEIVING
  const handleInwardStock = (entry: InwardStockEntry) => {
    playSfx('success');
    const itemUpdates = new Map<string, { qty: number; unitCost: number }>();
    entry.items.forEach((it) => {
      itemUpdates.set(it.productId, { qty: it.quantity, unitCost: it.unitCost });
    });

    setCatalog((prevCatalog) => {
      return prevCatalog.map((prod) => {
        const incoming = itemUpdates.get(prod.id);
        if (incoming) {
          const currentStock = prod.stock ?? 0;
          const updatedProd = {
            ...prod,
            stock: currentStock + incoming.qty,
            costPrice: incoming.unitCost > 0 ? incoming.unitCost : prod.costPrice,
          };
          liveSaveProduct(updatedProd).catch((err) => console.warn('Live inward stock sync:', err));
          return updatedProd;
        }
        return prod;
      });
    });
  };

  // CLOUD SYNC HANDLERS (Manual Backup & Full Restore for all 9 collections)
  const handleManualCloudSync = async () => {
    setIsSyncing(true);
    try {
      await pushAllToCloud(
        {
          orders,
          catalog,
          categories,
          customers,
          cashEntries,
          shopSettings,
          staff: staffList,
          heldOrders,
        },
        currentUser?.email || undefined
      );
      setLastSyncedAt(new Date());
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsSyncing(true);
    try {
      const pulled = await pullAllFromCloud();
      if (pulled.orders && pulled.orders.length > 0) setOrders(pulled.orders);
      if (pulled.catalog && pulled.catalog.length > 0) setCatalog(pulled.catalog);
      if (pulled.categories && pulled.categories.length > 0) setCategories(ensureAllItemsFirst(pulled.categories));
      if (pulled.customers && pulled.customers.length > 0) setCustomers(pulled.customers);
      if (pulled.cashEntries && pulled.cashEntries.length > 0) setCashEntries(pulled.cashEntries);
      if (pulled.shopSettings) setShopSettings(pulled.shopSettings);
      if (pulled.staff && pulled.staff.length > 0) setStaffList(pulled.staff);
      if (pulled.heldOrders) setHeldOrders(pulled.heldOrders);
      setLastSyncedAt(new Date());
    } finally {
      setIsSyncing(false);
    }
  };

  // QUICK BILL HANDLERS
  const handleSaveQuickBill = (items: BillItem[]) => {
    setCurrentBillItems(items);
    setIsPaymentModalOpen(true);
  };

  const handlePrintQuickBill = (items: BillItem[]) => {
    if (items.length === 0) return;
    const qSubtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const qTax = (qSubtotal * shopSettings.taxRate) / 100;
    const draftOrder: Order = {
      id: `quick-${Date.now()}`,
      orderNumber,
      terminalPrefix: shopSettings.terminalPrefix || 'A',
      orderNumberFormatted: `${shopSettings.terminalPrefix || 'A'}-${orderNumber}`,
      createdAt: new Date().toISOString(),
      items: [...items],
      status: 'active',
      subtotal: qSubtotal,
      taxRate: shopSettings.taxRate,
      taxAmount: qTax,
      discount: 0,
      total: qSubtotal + qTax,
      paymentMethod: 'NONE',
      staffName: activeStaff.name,
    };
    setDirectPrintOrder(draftOrder);
    printDirectThermalReceipt(draftOrder, shopSettings);
  };

  // CATEGORY & PRODUCT MANAGEMENT
  const handleAddCategory = (name: string) => {
    playSfx('add');
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
    };
    setCategories((prev) => {
      const updated = ensureAllItemsFirst([...prev, newCat]);
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_categories_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    liveSaveCategory(newCat).catch((err) => console.warn('Live save category:', err));
  };

  const handleUpdateCategory = (id: string, name: string) => {
    playSfx('tap');
    setCategories((prev) => {
      const updated = ensureAllItemsFirst(prev.map((c) => (c.id === id ? { ...c, name } : c)));
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_categories_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    const targetCat = categories.find((c) => c.id === id);
    if (targetCat) {
      liveSaveCategory({ ...targetCat, name }).catch((err) => console.warn('Live update category:', err));
    }
  };

  const handleDeleteCategory = (id: string) => {
    const target = categories.find((c) => c.id === id);
    if (isAllCategory(target?.name)) return; // Prevent deleting "All Items"
    playSfx('remove');
    setCategories((prev) => {
      const updated = ensureAllItemsFirst(prev.filter((c) => c.id !== id));
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_categories_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    liveDeleteCategory(id).catch((err) => console.warn('Live delete category:', err));
  };

  const handleAddProduct = (item: Omit<CatalogItem, 'id'>) => {
    playSfx('add');
    const newProd: CatalogItem = {
      ...item,
      id: `item-${Date.now()}`,
    };
    setCatalog((prev) => {
      const updated = [newProd, ...prev];
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_live_catalog_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    liveSaveProduct(newProd).catch((err) => console.warn('Live save product:', err));
  };

  const handleQuickAddProduct = (productData: {
    name: string;
    barcode: string;
    price: number;
    category: string;
    gstRate: number;
    stock: number;
    unit: string;
    weightOrVolume?: string;
    containerType?: string;
    packCount?: number;
    packName?: string;
  }) => {
    playSfx('add');
    const packCount = productData.packCount && productData.packCount > 1 ? productData.packCount : 1;
    const packOption: PackagingOption | undefined =
      packCount > 1
        ? {
            id: `pack_${packCount}_${Date.now()}`,
            packName: productData.packName || `${packCount}-Pack`,
            barcode: productData.barcode,
            multiplier: packCount,
            sellingPrice: productData.price,
            isDefault: true,
          }
        : undefined;

    const newProd: CatalogItem = {
      id: `item-${Date.now()}`,
      name: productData.name,
      barcode: productData.barcode,
      price: productData.price,
      category: productData.category,
      gstRate: productData.gstRate,
      stock: productData.stock,
      unit: productData.unit,
      weightOrVolume: productData.weightOrVolume,
      containerType: productData.containerType,
      packCount: productData.packCount,
      packagingOptions: packOption ? [packOption] : undefined,
      lowStockThreshold: 5,
    };
    setCatalog((prev) => {
      const updated = [newProd, ...prev];
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_live_catalog_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    liveSaveProduct(newProd).catch((err) => console.warn('Live save quick product:', err));
    if (packOption) {
      handleAddItemWithPack(newProd, packOption);
    } else {
      handleAddItem(newProd);
    }
    posSound.playBeep();
    setQuickAddBarcode(null);
  };

  const handleUpdateProduct = (item: CatalogItem) => {
    playSfx('tap');
    setCatalog((prev) => {
      const updated = prev.map((p) => (p.id === item.id ? item : p));
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_live_catalog_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    liveSaveProduct(item).catch((err) => console.warn('Live update product:', err));
  };

  const handleDeleteProduct = (id: string) => {
    playSfx('remove');
    setCatalog((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_live_catalog_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    liveDeleteProduct(id).catch((err) => console.warn('Live delete product:', err));
  };

  const handleImportCatalogFromXls = (
    newCategories: string[],
    newItems: Omit<CatalogItem, 'id'>[]
  ) => {
    playSfx('success');
    setCategories((prev) => {
      const existingNames = new Set(prev.map((c) => c.name.toLowerCase()));
      const added: Category[] = [];
      newCategories.forEach((catName) => {
        if (!existingNames.has(catName.toLowerCase())) {
          added.push({
            id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
            name: catName,
          });
          existingNames.add(catName.toLowerCase());
        }
      });
      const updatedCats = ensureAllItemsFirst([...prev, ...added]);
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_categories_${currentUser.uid}`, JSON.stringify(updatedCats));
        } catch {}
      }
      return updatedCats;
    });

    setCatalog((prev) => {
      const catalogMap = new Map<string, CatalogItem>();
      // Map by barcode (if present) and by lowercase name
      prev.forEach((item) => {
        if (item.barcode) {
          catalogMap.set(`bc:${item.barcode.trim().toLowerCase()}`, item);
        }
        catalogMap.set(`name:${item.name.trim().toLowerCase()}`, item);
      });

      const updatedList = [...prev];
      const appendedItems: CatalogItem[] = [];

      newItems.forEach((item, idx) => {
        const barcodeKey = item.barcode ? `bc:${item.barcode.trim().toLowerCase()}` : null;
        const nameKey = `name:${item.name.trim().toLowerCase()}`;

        const existingItem = (barcodeKey && catalogMap.get(barcodeKey)) || catalogMap.get(nameKey);

        if (existingItem) {
          const targetIdx = updatedList.findIndex((p) => p.id === existingItem.id);
          if (targetIdx !== -1) {
            updatedList[targetIdx] = {
              ...updatedList[targetIdx],
              name: item.name,
              category: item.category || updatedList[targetIdx].category,
              price: item.price > 0 ? item.price : updatedList[targetIdx].price,
              costPrice: item.costPrice !== undefined ? item.costPrice : updatedList[targetIdx].costPrice,
              stock: item.stock !== undefined ? item.stock : updatedList[targetIdx].stock,
              lowStockThreshold: item.lowStockThreshold ?? updatedList[targetIdx].lowStockThreshold,
              barcode: item.barcode || updatedList[targetIdx].barcode,
              unit: item.unit || updatedList[targetIdx].unit,
              gstRate: item.gstRate !== undefined ? item.gstRate : updatedList[targetIdx].gstRate,
            };
          }
        } else {
          appendedItems.push({
            id: `csv-item-${Date.now()}-${idx}`,
            name: item.name,
            category: item.category,
            price: item.price,
            costPrice: item.costPrice,
            stock: item.stock ?? 20,
            lowStockThreshold: item.lowStockThreshold ?? 5,
            barcode: item.barcode,
            unit: item.unit ?? 'pcs',
            gstRate: item.gstRate ?? 5,
          });
        }
      });

      const finalItems = [...appendedItems, ...updatedList];
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_live_catalog_${currentUser.uid}`, JSON.stringify(finalItems));
        } catch {}
      }
      return finalItems;
    });
  };

  // CUSTOMER MANAGEMENT
  const handleAddNewCustomer = (name: string, phone: string, creditLimit: number = 2000) => {
    playSfx('add');
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name,
      phone,
      creditLimit,
      creditBalance: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    liveSaveCustomer(newCust).catch((err) => console.warn('Live save customer:', err));
    return newCust;
  };

  const handleAddFullCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    playSfx('add');
    const newCust: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    liveSaveCustomer(newCust).catch((err) => console.warn('Live save full customer:', err));
  };

  const handleSettleCredit = (customerId: string, amount: number, note: string) => {
    playSfx('success');
    const cust = customers.find((c) => c.id === customerId);
    const newCreditBalance = Math.max(0, (cust?.creditBalance || 0) - amount);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? { ...c, creditBalance: newCreditBalance }
          : c
      )
    );
    liveSettleCustomerCredit(customerId, newCreditBalance).catch((err) =>
      console.warn('Live credit settlement:', err)
    );

    const repayCashEntry: CashEntry = {
      id: `credit-repay-${Date.now()}`,
      type: 'IN',
      amount,
      reason: `Khata Repayment - ${cust ? cust.name : 'Customer'}${note ? ` (${note})` : ''}`,
      staffName: activeStaff.name,
      createdAt: new Date().toISOString(),
    };

    setCashEntries((prev) => [repayCashEntry, ...prev]);
    liveSaveCashEntry(repayCashEntry).catch((err) => console.warn('Live cash repay save:', err));
  };

  // CASH MANAGEMENT
  const handleAddCashEntry = (entry: Omit<CashEntry, 'id' | 'createdAt'>) => {
    playSfx('tap');
    const newEntry: CashEntry = {
      ...entry,
      id: `cash-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCashEntries((prev) => [newEntry, ...prev]);
    liveSaveCashEntry(newEntry).catch((err) => console.warn('Live cash entry save:', err));
  };

  // STAFF MANAGEMENT
  const handleSwitchStaff = (staffId: string) => {
    playSfx('tap');
    setActiveStaffId(staffId);
  };

  const handleAddStaff = (member: Omit<StaffMember, 'id'>) => {
    playSfx('add');
    const newMember: StaffMember = {
      ...member,
      id: `staff-${Date.now()}`,
    };
    setStaffList((prev) => [...prev, newMember]);
    liveSaveStaff(newMember).catch((err) => console.warn('Live staff save:', err));
  };

  const handleUpdatePin = async (staffId: string, newPin: string) => {
    playSfx('tap');
    setStaffList((prev) => {
      const updated = prev.map((s) => (s.id === staffId ? { ...s, pin: newPin } : s));
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_staff_list_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    try {
      await liveUpdateStaffPin(staffId, newPin);
    } catch (err) {
      console.warn('Live staff PIN update:', err);
    }
  };

  const handleUpdatePermissions = (newPermissions: StorePermissions) => {
    const updatedSettings = {
      ...shopSettings,
      permissions: newPermissions,
    };
    setShopSettings(updatedSettings);
    liveSaveSettings(updatedSettings).catch((err) => console.warn('Live settings save:', err));
  };

  // REPORTS & ORDERS ACTIONS
  const handleViewOrder = (order: Order) => {
    setActiveReceiptOrder(order);
    setIsReceiptDuplicate(true);
    setIsReceiptModalOpen(true);
  };

  const handlePrintOrder = (order: Order) => {
    setActiveReceiptOrder(order);
    setIsReceiptDuplicate(true);
    setIsReceiptModalOpen(true);
  };

  const executeDeleteSingleOrder = (orderId: string) => {
    playSfx('remove');
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    liveDeleteOrder(orderId).catch((err) => console.warn('Live delete order:', err));
  };

  const handleDeleteOrder = (orderId: string) => {
    const currentRole = activeStaff?.role || 'CASHIER';
    const permissions = shopSettings.permissions || DEFAULT_STORE_PERMISSIONS;
    if (canDeleteOrder(currentRole, permissions)) {
      executeDeleteSingleOrder(orderId);
    } else {
      const isOwnerRequired = normalizeRole(currentRole) === 'MANAGER' && !permissions.manager.allowBillVoid;
      setPendingRestrictedAction({
        title: isOwnerRequired ? 'Owner PIN Required for Invoice Void' : 'Void Sale Authorization',
        description: isOwnerRequired
          ? 'Store policy restricts managers from voiding finalized invoices. Store Owner PIN required to execute one-time void.'
          : 'Deleting or voiding sales records requires Manager or Store Owner PIN authorization.',
        requiredRoleLabel: isOwnerRequired ? 'OWNER ONLY' : 'MANAGER / OWNER',
        requiredRole: isOwnerRequired ? 'OWNER' : 'MANAGER',
        onAuthorize: () => {
          executeDeleteSingleOrder(orderId);
        },
      });
      setIsManagerPinModalOpen(true);
    }
  };

  const executeClearAllOrders = () => {
    if (window.confirm('Are you sure you want to clear all report records?')) {
      playSfx('remove');
      setOrders([]);
      liveDeleteAllOrders().catch((err) => console.warn('Live delete all orders:', err));
    }
  };

  const handleDeleteAllOrders = () => {
    const currentRole = activeStaff?.role || 'CASHIER';
    const permissions = shopSettings.permissions || DEFAULT_STORE_PERMISSIONS;
    if (canDeleteOrder(currentRole, permissions)) {
      executeClearAllOrders();
    } else {
      const isOwnerRequired = normalizeRole(currentRole) === 'MANAGER' && !permissions.manager.allowBillVoid;
      setPendingRestrictedAction({
        title: isOwnerRequired ? 'Owner PIN Required for Bulk Void' : 'Bulk Void Sales Authorization',
        description: isOwnerRequired
          ? 'Store policy restricts managers from voiding finalized invoices. Store Owner PIN required to execute one-time bulk void.'
          : 'Purging sales history requires Manager or Store Owner authorization.',
        requiredRoleLabel: isOwnerRequired ? 'OWNER ONLY' : 'MANAGER / OWNER',
        requiredRole: isOwnerRequired ? 'OWNER' : 'MANAGER',
        onAuthorize: () => {
          executeClearAllOrders();
        },
      });
      setIsManagerPinModalOpen(true);
    }
  };

  // Process customer return, restock catalog, and register cash out
  const handleProcessRefund = (refund: RefundResult) => {
    playSfx('remove');

    let customerToCredit: string | undefined;

    // 1. Update order status: 'refunded' vs 'partially_refunded' with cumulative items
    setOrders((prev) => {
      const updated = prev.map((ord) => {
        if (ord.id === refund.orderId) {
          customerToCredit = ord.customerId;

          const prevRefundedItems = ord.refundedItems || [];
          const mergedRefundedItems = [...prevRefundedItems.map((it) => ({ ...it }))];

          refund.refundedItems.forEach((newItem) => {
            const existingIdx = mergedRefundedItems.findIndex(
              (it) => it.id === newItem.id || it.name.toLowerCase() === newItem.name.toLowerCase()
            );
            if (existingIdx >= 0) {
              mergedRefundedItems[existingIdx] = {
                ...mergedRefundedItems[existingIdx],
                quantity: mergedRefundedItems[existingIdx].quantity + newItem.quantity,
                amount: Number(
                  (mergedRefundedItems[existingIdx].amount + newItem.amount).toFixed(2)
                ),
              };
            } else {
              mergedRefundedItems.push({ ...newItem });
            }
          });

          // Check if all units in the order have been refunded
          const totalOrderItemsQty = ord.items.reduce((sum, it) => sum + it.quantity, 0);
          const totalRefundedQty = mergedRefundedItems.reduce((sum, it) => sum + it.quantity, 0);
          const isFullyRefunded = totalRefundedQty >= totalOrderItemsQty;

          const cumulativeRefundAmount = Number(
            ((ord.refundAmount || 0) + refund.refundAmount).toFixed(2)
          );

          const refundOrder: Order = {
            ...ord,
            status: isFullyRefunded ? 'refunded' : 'partially_refunded',
            refundAmount: cumulativeRefundAmount,
            refundReason: refund.refundReason,
            refundedAt: refund.refundedAt,
            refundMethod: refund.refundMethod,
            refundedItems: mergedRefundedItems,
          };
          liveSaveOrder(refundOrder).catch(() => {});
          return refundOrder;
        }
        return ord;
      });
      if (currentUser?.uid) {
        try {
          localStorage.setItem(`monopos_orders_${currentUser.uid}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    // 2. Restock returned items to catalog
    if (refund.restockInventory && refund.refundedItems.length > 0) {
      setCatalog((prev) => {
        const updated = prev.map((item) => {
          const matched = refund.refundedItems.find(
            (r) => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase()
          );
          if (matched && typeof item.stock === 'number') {
            const newStock = item.stock + matched.quantity;
            const updatedItem = { ...item, stock: newStock };
            liveSaveProduct(updatedItem).catch(() => {});
            return updatedItem;
          }
          return item;
        });
        if (currentUser?.uid) {
          try {
            localStorage.setItem(`monopos_live_catalog_${currentUser.uid}`, JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    }

    // 3. If Cash refund, deduct from Cash Drawer
    if (refund.refundMethod === 'CASH') {
      handleAddCashEntry({
        type: 'OUT',
        amount: refund.refundAmount,
        reason: `Customer Refund - Bill #${refund.orderNumber} (${refund.refundReason})`,
      });
    }

    // 4. If Khata refund, deduct outstanding balance from customer's credit account
    if (refund.refundMethod === 'KHATA' && customerToCredit) {
      setCustomers((prev) => {
        const updated = prev.map((c) => {
          if (c.id === customerToCredit) {
            const newCreditBalance = Math.max(0, (c.creditBalance || 0) - refund.refundAmount);
            const updatedCust = { ...c, creditBalance: newCreditBalance };
            liveSaveCustomer(updatedCust).catch((err) =>
              console.warn('Live save customer refund:', err)
            );
            return updatedCust;
          }
          return c;
        });
        if (currentUser?.uid) {
          try {
            localStorage.setItem(`monopos_customers_${currentUser.uid}`, JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    }
  };

  // Navigation router with RBAC access control

  const handleNavigate = (screen: ActiveScreen) => {
    if (screen === 'print-settings') {
      const currentRole = activeStaff?.role || 'CASHIER';
      if (!canAccessScreen(currentRole, 'print-settings')) {
        setPendingRestrictedAction({
          title: 'Store & Admin Settings Authorization',
          description:
            'Accessing hardware configuration, cloud backups, and advanced diagnostics is restricted to Store Owner & Manager.',
          requiredRoleLabel: 'MANAGER / OWNER',
          requiredRole: 'MANAGER',
          onAuthorize: () => {
            setSettingsInitialTab('hardware');
            setSettingsInitialSubView('overview');
            setIsPrintSettingsOpen(true);
            setIsSidebarOpen(false);
          },
        });
        setIsManagerPinModalOpen(true);
        return;
      }
      setSettingsInitialTab('hardware');
      setSettingsInitialSubView('overview');
      setIsPrintSettingsOpen(true);
      setIsSidebarOpen(false);
      return;
    }

    if (screen === 'training-videos') {
      setIsTrainingVideosOpen(true);
      setIsSidebarOpen(false);
      return;
    }

    if (screen === 'barcode-generator') {
      setIsBarcodeGeneratorOpen(true);
      setIsSidebarOpen(false);
      return;
    }

    const currentRole = activeStaff?.role || 'CASHIER';
    const permissions = shopSettings.permissions || DEFAULT_STORE_PERMISSIONS;

    if (screen === 'purchase-inward') {
      if (!canStaffInwardStock(currentRole, permissions)) {
        setPendingRestrictedAction({
          title: 'Stock Inward Authorization',
          description: 'Receiving supplier crates requires Manager or Store Owner PIN authorization.',
          requiredRoleLabel: 'MANAGER / OWNER',
          requiredRole: 'MANAGER',
          onAuthorize: () => {
            setIsPurchaseInwardOpen(true);
            setIsSidebarOpen(false);
          },
        });
        setIsManagerPinModalOpen(true);
        return;
      }
      setIsPurchaseInwardOpen(true);
      setIsSidebarOpen(false);
      return;
    }

    if (canAccessScreen(currentRole, screen)) {
      setActiveScreen(screen);
      setIsSidebarOpen(false);
    } else {
      const reqRole = getRequiredRoleForScreen(screen);
      setPendingRestrictedAction({
        title: `Manager Authorization Required`,
        description: `The "${screen.replace(/-/g, ' ')}" screen is restricted to ${reqRole}. Please enter a Manager or Store Owner 4-digit PIN to access.`,
        requiredRoleLabel: reqRole,
        requiredRole: 'MANAGER',
        onAuthorize: () => {
          setActiveScreen(screen);
          setIsSidebarOpen(false);
        },
      });
      setIsManagerPinModalOpen(true);
    }
  };


  // Show nothing while auth is initializing (prevents flash)
  if (!authChecked) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-black animate-pulse">
          M
        </div>
      </div>
    );
  }

  // Show auth gate if user is not signed in (and auth has been checked)
  if (!currentUser) {
    return (
      <AuthGateScreen
        onAuthenticated={(localUser?: any) => {
          if (localUser) {
            setCurrentUser(localUser);
          }
        }}
      />
    );
  }

  return (
    <div className="w-full h-screen h-[100dvh] bg-background flex flex-col overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Responsive POS Station Container - Edge-to-Edge Full Screen for Retail Workstations */}
      <div className="w-full h-full bg-background flex flex-col overflow-hidden relative">
        {/* Top App Bar Header */}
        <Header
          storeName={shopSettings.shopName}
          storeLogoUrl={shopSettings.logoUrl}
          activeScreen={activeScreen}
          orderNumber={orderNumber}
          heldOrdersCount={heldOrders.length}
          soundEnabled={shopSettings.soundEnabled}
          activeStaffName={activeStaff.name}
          activeStaffRole={activeStaff.role}
          user={currentUser}
          isSyncing={isSyncing}
          onToggleSound={() =>
            setShopSettings((prev) => ({
              ...prev,
              soundEnabled: !prev.soundEnabled,
            }))
          }
          onOpenMenu={() => setIsSidebarOpen(true)}
          onNavigate={handleNavigate}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onOpenScanner={(mode) => handleOpenScanner(mode || 'add-to-bill')}
          onOpenCustomItem={() => setIsCustomProductModalOpen(true)}
          onOpenStaffSwitch={() => setIsStaffSwitchModalOpen(true)}
          onOpenPriceCheck={() => setIsPriceCheckOpen(true)}
          onOpenHeldOrders={() => setIsHeldOrdersModalOpen(true)}
          licenseStatus={licenseStatus}
          onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
        />

        {/* Active Screen Surface */}
        <div className="flex-1 flex flex-col min-h-0 bg-zinc-50">
          {(activeScreen === 'item-wise' ||
            ![
              'quick-bill',
              'reports',
              'categories-products',
              'customers',
              'credit-ledger',
              'cash-management',
              'staff-management',
            ].includes(activeScreen)) && (
            <ItemWiseBillTerminal

              currentBillItems={currentBillItems}
              catalog={catalog}
              categories={categories}
              currencySymbol={shopSettings.currencySymbol}
              orderNumber={orderNumber}
              heldOrdersCount={heldOrders.length}
              taxRate={shopSettings.taxRate}
              onAddItem={handleAddItemWithPack}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateItemRate={handleUpdateItemRate}
              canOverridePrice={canStaffOverridePrice(activeStaff?.role, shopSettings.permissions)}
              onRequestPriceOverrideAuth={(item, onApproved) => {
                setPendingRestrictedAction({
                  title: 'Price Override Authorization',
                  description: `Modifying unit selling price for "${item.name}" requires Manager or Store Owner PIN.`,
                  requiredRoleLabel: 'MANAGER / OWNER',
                  requiredRole: 'MANAGER',
                  onAuthorize: () => {
                    onApproved();
                  },
                });
                setIsManagerPinModalOpen(true);
              }}
              onRemoveItem={handleRemoveItem}
              onClearBill={handleClearBill}
              onHoldBill={handleHoldBill}
              onOpenHeldOrders={() => setIsHeldOrdersModalOpen(true)}
              onOpenAddCustomProduct={() => setIsCustomProductModalOpen(true)}
              onOpenScanner={(mode) => handleOpenScanner(mode || 'add-to-bill')}
              onOpenPriceCheck={() => setIsPriceCheckOpen(true)}
              onPrintBill={() => {
                if (currentBillItems.length === 0) return;
                const draftOrder: Order = {
                  id: `draft-${Date.now()}`,
                  orderNumber,
                  terminalPrefix: shopSettings.terminalPrefix || 'A',
                  orderNumberFormatted: `${shopSettings.terminalPrefix || 'A'}-${orderNumber}`,
                  createdAt: new Date().toISOString(),
                  items: [...currentBillItems],
                  status: 'active',
                  subtotal,
                  taxRate: shopSettings.taxRate,
                  taxAmount,
                  discount: discountAmount || 0,
                  total: grandTotal,

                  paymentMethod: 'NONE',
                  staffName: activeStaff.name,
                };
                setDirectPrintOrder(draftOrder);
                printDirectThermalReceipt(draftOrder, shopSettings);
              }}
              onSaveBill={() => setIsPaymentModalOpen(true)}
              onSwitchMode={() => {
                playSfx('tap');
                setActiveScreen('quick-bill');
              }}
            />
          )}

          {activeScreen === 'quick-bill' && (
            <QuickBillTerminal
              currencySymbol={shopSettings.currencySymbol}
              taxRate={shopSettings.taxRate}
              orderNumber={orderNumber}
              billNo={orderNumber}
              heldOrdersCount={heldOrders.length}
              onHoldBill={(items) => handleHoldBill(items)}
              onClearBill={handleClearBill}
              onOpenHeldOrders={() => setIsHeldOrdersModalOpen(true)}
              onSaveQuickBill={handleSaveQuickBill}
              onPrintQuickBill={handlePrintQuickBill}
              onSwitchMode={() => {
                playSfx('tap');
                setActiveScreen('item-wise');
              }}
            />
          )}

          {activeScreen === 'reports' && (
            <ReportsScreen
              orders={orders}
              currencySymbol={shopSettings.currencySymbol}
              shopSettings={shopSettings}
              onViewOrder={handleViewOrder}
              onPrintOrder={handlePrintOrder}
              onDeleteOrder={handleDeleteOrder}
              onDeleteAllOrders={handleDeleteAllOrders}
              onOpenZReport={() => setIsZReportOpen(true)}
              onProcessRefund={handleProcessRefund}
            />

          )}

          {activeScreen === 'categories-products' && (
            <CategoryProductManager
              categories={categories}
              catalog={catalog}
              currencySymbol={shopSettings.currencySymbol}
              staffRole={activeStaff?.role}
              permissions={shopSettings.permissions}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onImportCatalogFromXls={handleImportCatalogFromXls}
              onOpenPurchaseInward={() => {
                const currentRole = activeStaff?.role || 'CASHIER';
                const permissions = shopSettings.permissions || DEFAULT_STORE_PERMISSIONS;
                if (!canStaffInwardStock(currentRole, permissions)) {
                  setPendingRestrictedAction({
                    title: 'Stock Inward Authorization',
                    description: 'Receiving supplier crates requires Manager or Store Owner PIN authorization.',
                    requiredRoleLabel: 'MANAGER / OWNER',
                    requiredRole: 'MANAGER',
                    onAuthorize: () => {
                      setIsPurchaseInwardOpen(true);
                    },
                  });
                  setIsManagerPinModalOpen(true);
                  return;
                }
                setIsPurchaseInwardOpen(true);
              }}
              onOpenBarcodeGenerator={(productId) => {
                setBarcodeSelectedProductId(productId);
                setIsBarcodeGeneratorOpen(true);
              }}
            />
          )}

          {(activeScreen === 'customers' || activeScreen === 'credit-ledger') && (
            <CustomerManagementScreen
              customers={customers}
              orders={orders}
              currencySymbol={shopSettings.currencySymbol}
              enableLoyaltyPoints={shopSettings.enableLoyaltyPoints !== false}
              onAddCustomer={handleAddFullCustomer}
              onSettleCredit={handleSettleCredit}
            />
          )}

          {activeScreen === 'cash-management' && (
            <CashManagementScreen
              cashEntries={cashEntries}
              currencySymbol={shopSettings.currencySymbol}
              activeStaffName={activeStaff.name}
              onAddCashEntry={handleAddCashEntry}
              onOpenZReport={() => setIsZReportOpen(true)}
            />
          )}

          {activeScreen === 'staff-management' && (
            <StaffManagementScreen
              staffList={staffList}
              activeStaffId={activeStaffId}
              permissions={shopSettings.permissions || DEFAULT_STORE_PERMISSIONS}
              onSelectStaff={handleSwitchStaff}
              onAddStaff={handleAddStaff}
              onUpdatePin={handleUpdatePin}
              onUpdatePermissions={handleUpdatePermissions}
            />
          )}
        </div>
      </div>

      {/* Sidebar Navigation Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        activeScreen={activeScreen}
        shopSettings={shopSettings}
        activeStaffName={activeStaff.name}
        activeStaffRole={activeStaff.role}
        user={currentUser}
        heldOrdersCount={heldOrders.length}
        isSyncing={isSyncing}
        onOpenHeldOrders={() => setIsHeldOrdersModalOpen(true)}
        onSelectScreen={handleNavigate}
        onRequestManagerOverride={(screen) => handleNavigate(screen)}
        onOpenPermissionsModal={() => {
          setIsSidebarOpen(false);
          setIsRolePermissionsOpen(true);
        }}
        onClose={() => setIsSidebarOpen(false)}
        onOpenScanner={(mode) => handleOpenScanner(mode || 'add-to-bill')}
        onOpenStaffSwitch={() => setIsStaffSwitchModalOpen(true)}
        onOpenZReport={() => {
          setIsSidebarOpen(false);
          setIsZReportOpen(true);
        }}
        onOpenSubscription={() => {
          setIsSidebarOpen(false);
          setIsSubscriptionModalOpen(true);
        }}
        onSignOut={handleSignOut}
        licenseStatus={licenseStatus}
      />

      {/* SaaS Subscription & Upgrade Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        license={tenantLicense}
        licenseStatus={licenseStatus}
        onLicenseUpdated={(updated) => {
          setTenantLicense(updated);
        }}
        currencySymbol={shopSettings.currencySymbol}
      />

      {/* First-Time Store Onboarding Modal */}
      <StoreOnboardingModal
        isOpen={isStoreOnboardingOpen}
        onComplete={handleOnboardingComplete}
        initialSettings={shopSettings}
      />

      {/* Barcode & QR Code Scanner / Price Checker Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        mode={scannerMode}
        catalog={catalog}
        currencySymbol={shopSettings.currencySymbol}
        billItemCount={currentBillItems.reduce((acc, item) => acc + item.quantity, 0)}
        billTotal={currentBillItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)}
        onClose={() => setIsScannerOpen(false)}
        onAddScannedItem={(item, pack) => {
          handleAddItemWithPack(item, pack);
        }}
        onSearchItem={(item) => {
          setActiveScreen('item-wise');
        }}
        onRegisterBarcode={(barcode) => {
          setIsScannerOpen(false);
          setQuickAddBarcode(barcode);
        }}
        onAddCustomBillItem={(item) => {
          handleAddCustomProduct(item);
        }}
      />

      {/* Instant Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        catalog={catalog}
        currencySymbol={shopSettings.currencySymbol}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectItem={(item) => {
          handleAddItem(item);
        }}
        onOpenScanner={() => {
          handleOpenScanner('add-to-bill');
        }}
      />

      {/* Phase 2: Indian Payment Engine (Cash, UPI Soundbox, Khata) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        orderNumber={orderNumber}
        items={currentBillItems}
        subtotal={subtotal}
        taxRate={shopSettings.taxRate}
        currencySymbol={shopSettings.currencySymbol}
        customers={customers}
        storeVpa={shopSettings.upiId || 'anandsupermarket@okaxis'}
        storeName={shopSettings.shopName || 'Anand Supermarket'}
        upiVerificationMode={shopSettings.upiVerificationMode || 'manual'}
        razorpayKeyId={shopSettings.razorpayKeyId}
        discount={discount}
        discountType={discountType}
        discountAmount={discountAmount}
        enableLoyaltyPoints={shopSettings.enableLoyaltyPoints !== false}
        loyaltyPointValue={shopSettings.loyaltyPointValue || 1}
        canStaffKhata={canStaffSellKhata(activeStaff?.role, shopSettings.permissions)}
        onRequestKhataAuth={(onApproved) => {

          setPendingRestrictedAction({
            title: 'Customer Credit (Khata) Authorization',
            description: 'Selling on customer credit requires Manager or Store Owner PIN authorization.',
            requiredRoleLabel: 'MANAGER / OWNER',
            requiredRole: 'MANAGER',
            onAuthorize: () => {
              onApproved();
            },
          });
          setIsManagerPinModalOpen(true);
        }}
        onRequestCreditLimitOverride={(customerName, amount, limit, onApproved) => {
          setPendingRestrictedAction({
            title: 'Credit Limit Override Authorization',
            description: `Authorizing sale of ${shopSettings.currencySymbol}${amount.toFixed(2)} to ${customerName} (exceeds ${shopSettings.currencySymbol}${limit.toFixed(2)} credit limit) requires Manager or Store Owner PIN.`,
            requiredRoleLabel: 'MANAGER / OWNER',
            requiredRole: 'MANAGER',
            onAuthorize: () => {
              onApproved();
            },
          });
          setIsManagerPinModalOpen(true);
        }}
        onClose={() => setIsPaymentModalOpen(false)}
        onCompleteSale={handlePaymentModalComplete}
        onResetAndNewBill={handleDoneNoPrint}
        onPrintAndNextCustomer={handlePrintAndNextCustomer}
        onDoneNoPrint={handleDoneNoPrint}
        onPrintDirectReceipt={handlePrintAndNextCustomer}
        onAddNewCustomer={handleAddNewCustomer}
      />

      {/* Invoice Details / Receipt Modal - Used ONLY for Duplicate Receipt preview from Reports */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        order={activeReceiptOrder}
        orderNumber={activeReceiptOrder ? activeReceiptOrder.orderNumber : orderNumber}
        items={activeReceiptOrder ? activeReceiptOrder.items : currentBillItems}
        subtotal={activeReceiptOrder ? activeReceiptOrder.subtotal : subtotal}
        taxRate={shopSettings.taxRate}
        taxAmount={activeReceiptOrder ? activeReceiptOrder.taxAmount : taxAmount}
        total={activeReceiptOrder ? activeReceiptOrder.total : grandTotal}
        shopSettings={shopSettings}
        isDuplicate={isReceiptDuplicate}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setActiveReceiptOrder(null);
          setIsReceiptDuplicate(false);
        }}
      />

      {/* Direct Thermal Receipt (Hidden on screen, prints in background without opening any preview modal) */}
      <DirectThermalReceipt
        order={directPrintOrder}
        shopSettings={shopSettings}
      />

      {/* Custom Item Modal */}
      <CustomItemModal
        isOpen={isCustomProductModalOpen}
        currencySymbol={shopSettings.currencySymbol}
        onClose={() => setIsCustomProductModalOpen(false)}
        onAddCustomItem={handleAddCustomProduct}
      />

      {/* Store & Admin Settings Modal (Hardware, Store Profile, Cloud & Backup -> Advanced Diagnostics) */}
      <PrintSettingsModal
        isOpen={isPrintSettingsOpen || isCloudModalOpen}
        settings={shopSettings}
        onClose={() => {
          setIsPrintSettingsOpen(false);
          setIsCloudModalOpen(false);
        }}
        onSaveSettings={(newSettings) => {
          setShopSettings(newSettings);
          if (currentUser) {
            localStorage.setItem(`monopos_onboarded_${currentUser.uid}`, 'true');
            localStorage.setItem(`monopos_retail_settings_${currentUser.uid}`, JSON.stringify(newSettings));
          }
          liveSaveSettings(newSettings).catch((err) => console.warn('Live settings save:', err));
        }}
        user={currentUser}
        orders={orders}
        catalog={catalog}
        categories={categories}
        customers={customers}
        cashEntries={cashEntries}
        staffList={staffList}
        heldOrders={heldOrders}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onManualSync={handleManualCloudSync}
        onPullFromCloud={handlePullFromCloud}
        activeStaffRole={activeStaff?.role}
        onRequestManagerPin={(action) => {
          setPendingRestrictedAction(action);
          setIsManagerPinModalOpen(true);
        }}
        initialTab={isCloudModalOpen ? 'cloud' : settingsInitialTab}
        initialSubView={isCloudModalOpen ? 'diagnostics' : settingsInitialSubView}
      />

      {/* Training Videos Modal */}
      <TrainingVideosModal
        isOpen={isTrainingVideosOpen}
        onClose={() => setIsTrainingVideosOpen(false)}
      />

      {/* 1-Second 4-Digit Staff Shift Switch Modal */}
      <QuickStaffSwitchModal
        isOpen={isStaffSwitchModalOpen}
        staffList={staffList}
        activeStaffId={activeStaffId}
        currentUserEmail={currentUser?.email || undefined}
        onClose={() => setIsStaffSwitchModalOpen(false)}
        onSwitchStaff={handleSwitchStaff}
        onPinReset={handleUpdatePin}
        onNavigateToStaffManagement={() => setActiveScreen('staff-management')}
      />

      {/* Purchase Inward Stock Receiving Modal */}
      <PurchaseInwardModal
        isOpen={isPurchaseInwardOpen}
        catalog={catalog}
        currencySymbol={shopSettings.currencySymbol}
        activeStaffName={activeStaff.name}
        onClose={() => setIsPurchaseInwardOpen(false)}
        onInwardStock={handleInwardStock}
      />

      {/* Barcode & Price Sticker Sheet Generator Modal */}
      <BarcodeGeneratorModal
        isOpen={isBarcodeGeneratorOpen}
        catalog={catalog}
        currencySymbol={shopSettings.currencySymbol}
        shopName={shopSettings.shopName}
        initialProductId={barcodeSelectedProductId}
        onClose={() => {
          setIsBarcodeGeneratorOpen(false);
          setBarcodeSelectedProductId(undefined);
        }}
      />

      {/* Laser Gun Price Check & Info Modal */}
      <PriceCheckModal
        isOpen={isPriceCheckOpen}
        onClose={() => setIsPriceCheckOpen(false)}
        catalog={catalog}
        currencySymbol={shopSettings.currencySymbol}
        staffRole={activeStaff.role}
        permissions={shopSettings.permissions}
        onRequestCostUnlock={(onApproved) => {
          setPendingRestrictedAction({
            title: 'Cost Price Unlock Authorization',
            description: 'Viewing supplier cost price and profit margins requires Store Owner PIN authorization.',
            requiredRoleLabel: 'OWNER ONLY',
            requiredRole: 'OWNER',
            onAuthorize: () => {
              onApproved();
            },
          });
          setIsManagerPinModalOpen(true);
        }}
        onRequestManagerOverride={() => {
          setPendingRestrictedAction({
            title: 'Manager Authorization for Stock Editing',
            description: 'Direct shelf count adjustments require Manager or Store Owner PIN authorization.',
            requiredRoleLabel: 'MANAGER / OWNER',
            requiredRole: 'MANAGER',
            onAuthorize: () => {
              // Once authorized by manager PIN, grant temporary ability to edit stock in the open modal
            },
          });
          setIsManagerPinModalOpen(true);
        }}
        onUpdateStock={handleUpdateProductStock}
        onRegisterBarcode={(barcode) => {
          setIsPriceCheckOpen(false);
          setQuickAddBarcode(barcode);
        }}
        onAddToCart={(item) => {
          handleAddItem(item);
          setIsPriceCheckOpen(false);
        }}
      />

      {/* Quick Add Product Modal with Automatic Open Food Facts Lookup */}
      <QuickAddProductModal
        isOpen={Boolean(quickAddBarcode)}
        barcode={quickAddBarcode || ''}
        currencySymbol={shopSettings.currencySymbol}
        categories={categories}
        onClose={() => setQuickAddBarcode(null)}
        onSaveAndAddToBill={handleQuickAddProduct}
      />

      {/* Manager PIN Authorization Modal */}
      <ManagerPinModal
        isOpen={isManagerPinModalOpen}
        staffList={staffList}
        currentUserEmail={currentUser?.email || undefined}
        activeStaffName={activeStaff.name}
        activeStaffRole={activeStaff.role}
        title={pendingRestrictedAction?.title || 'Manager Authorization'}
        description={pendingRestrictedAction?.description}
        requiredRoleLabel={pendingRestrictedAction?.requiredRoleLabel || 'MANAGER / OWNER'}
        requiredRole={pendingRestrictedAction?.requiredRole || 'MANAGER'}
        onPinReset={handleUpdatePin}
        onClose={() => {
          setIsManagerPinModalOpen(false);
          setPendingRestrictedAction(null);
        }}
        onSuccess={(authorizingStaff) => {
          const action = pendingRestrictedAction;
          setIsManagerPinModalOpen(false);
          setPendingRestrictedAction(null);
          if (action?.onAuthorize) {
            action.onAuthorize(authorizingStaff);
          }
        }}
      />

      {/* Role & Permissions Capability Matrix Modal */}
      <RolePermissionsModal
        isOpen={isRolePermissionsOpen}
        staffList={staffList}
        activeStaffId={activeStaffId}
        currentUserEmail={currentUser?.email || undefined}
        permissions={shopSettings.permissions || DEFAULT_STORE_PERMISSIONS}
        onPinReset={handleUpdatePin}
        onUpdatePermissions={handleUpdatePermissions}
        onClose={() => setIsRolePermissionsOpen(false)}
        onSwitchStaff={(staffId) => {
          handleSwitchStaff(staffId);
          setIsRolePermissionsOpen(false);
        }}
        onOpenStaffSwitch={() => {
          setIsRolePermissionsOpen(false);
          setIsStaffSwitchModalOpen(true);
        }}
      />

      {/* Parked / Held Orders Modal */}
      <HeldOrdersModal
        isOpen={isHeldOrdersModalOpen}
        heldOrders={heldOrders}
        currentCartCount={currentBillItems.reduce((sum, i) => sum + i.quantity, 0)}
        currentCartTotal={grandTotal}
        currencySymbol={shopSettings.currencySymbol}
        shopSettings={shopSettings}
        onClose={() => setIsHeldOrdersModalOpen(false)}
        onResumeOrder={handleResumeHeldOrder}
        onDeleteOrder={handleDeleteHeldOrder}
        onClearAllHeld={handleClearAllHeldOrders}
      />

      {/* Official Day-End Close & Z-Report Shift Audit Modal */}
      <ZReportModal
        isOpen={isZReportOpen}
        orders={orders}
        cashEntries={cashEntries}
        shopSettings={shopSettings}
        activeStaffName={activeStaff.name}
        onClose={() => setIsZReportOpen(false)}
        onSaveZReport={(report) => {
          // Record shift close summary cash entry if desired
          handleAddCashEntry({
            type: 'OUT',
            amount: report.cashSales,
            reason: `Day-End Z-Report Shift Close Cash Deposit (${activeStaff.name})`,
          });
        }}
      />

      {/* Floating Laser Gun Instant Scan Toast Notification */}
      {laserScanNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-zinc-700/80 flex items-center gap-3.5 max-w-sm">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-primary uppercase tracking-wider">
                Laser Gun Scanned
              </span>
              <span className="text-[11px] font-bold bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                Qty in Bill: {laserScanNotification.cartQty}
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate mt-0.5">
              {laserScanNotification.productName} • {shopSettings.currencySymbol}{(Number(laserScanNotification.price) || 0).toFixed(2)}
            </p>
            {laserScanNotification.stock !== undefined && (
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Remaining Stock: <span className={`font-bold ${laserScanNotification.stock <= 5 ? 'text-amber-400' : 'text-zinc-200'}`}>{laserScanNotification.stock} units</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating Held / Resumed Order Interactive Toast */}
      {heldToastNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-950/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-zinc-700/80 flex items-center gap-3.5 max-w-sm animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              heldToastNotification.action === 'parked'
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {heldToastNotification.action === 'parked' ? (
              <PauseCircle className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  heldToastNotification.action === 'parked'
                    ? 'text-amber-400'
                    : 'text-primary'
                }`}
              >
                {heldToastNotification.action === 'parked'
                  ? 'Ticket Parked on Hold'
                  : 'Ticket Resumed to Cart'}
              </span>
              <span className="text-[11px] font-bold bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded">
                #{heldToastNotification.orderNumber}
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate mt-0.5">
              {heldToastNotification.itemsCount} item{heldToastNotification.itemsCount !== 1 ? 's' : ''} •{' '}
              {shopSettings.currencySymbol}
              {heldToastNotification.total.toFixed(2)}
            </p>
          </div>
          {heldToastNotification.action === 'parked' && (
            <button
              onClick={() => {
                setHeldToastNotification(null);
                setIsHeldOrdersModalOpen(true);
              }}
              className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-black text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
            >
              View
            </button>
          )}
        </div>
      )}



      {/* Real-Time Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
