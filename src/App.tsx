import React, { useState, useEffect } from 'react';
import {
  INITIAL_CATALOG,
  INITIAL_CATEGORIES,
  SAMPLE_CUSTOMERS,
  SAMPLE_STAFF,
  SAMPLE_CASH_ENTRIES,
  SAMPLE_ORDERS,
  DEFAULT_SHOP_SETTINGS,
} from './data/catalog';
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
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ItemWiseBillTerminal } from './components/ItemWiseBillTerminal';
import { QuickBillTerminal } from './components/QuickBillTerminal';
import { ReportsScreen } from './components/ReportsScreen';
import { CategoryProductManager } from './components/CategoryProductManager';
import { CustomerManagementScreen } from './components/CustomerManagementScreen';
import { CashManagementScreen } from './components/CashManagementScreen';
import { StaffManagementScreen } from './components/StaffManagementScreen';
import { PrintSettingsModal } from './components/PrintSettingsModal';
import { TrainingVideosModal } from './components/TrainingVideosModal';
import { SaveBillModal } from './components/SaveBillModal';
import { ReceiptModal } from './components/ReceiptModal';
import { CustomItemModal } from './components/CustomItemModal';
import { SearchModal } from './components/SearchModal';
import { BarcodeScannerModal, ScannerMode } from './components/BarcodeScannerModal';
import { PurchaseInwardModal } from './components/PurchaseInwardModal';
import { BarcodeGeneratorModal } from './components/BarcodeGeneratorModal';
import { PriceCheckModal } from './components/PriceCheckModal';
import { ManagerPinModal } from './components/ManagerPinModal';
import { RolePermissionsModal } from './components/RolePermissionsModal';
import {
  canAccessScreen,
  canDeleteOrder,
  getRequiredRoleForScreen,
  normalizeRole,
  ROLE_DEFINITIONS,
} from './utils/permissions';
import { hardware } from './utils/hardware';
import { Zap } from 'lucide-react';
import { posSound } from './utils/sound';
import { auth, onAuthStateChanged, User } from './firebase';
import { CloudSyncModal } from './components/CloudSyncModal';
import { QuickStaffSwitchModal } from './components/QuickStaffSwitchModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { pushAllToCloud, pullAllFromCloud, pushSingleOrder } from './services/cloudSync';

export default function App() {
  // Screen Routing
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('item-wise');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Firebase Auth & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Settings & Staff State
  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem('monopos_industrial_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SHOP_SETTINGS;
  });
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem('monopos_staff_list');
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
      return merged;
    } catch {
      return SAMPLE_STAFF;
    }
  });
  const [activeStaffId, setActiveStaffId] = useState<string>(() => {
    const saved = localStorage.getItem('monopos_active_staff_id');
    return saved || 'staff-1';
  });

  // Categories & Catalog State
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [catalog, setCatalog] = useState<CatalogItem[]>(INITIAL_CATALOG);

  // Customers & Khata Ledger State
  const [customers, setCustomers] = useState<Customer[]>(SAMPLE_CUSTOMERS);

  // Cash Drawer Entries
  const [cashEntries, setCashEntries] = useState<CashEntry[]>(SAMPLE_CASH_ENTRIES);

  // Active Billing State - Start with 3 default items matching the prompt screenshot
  const [orderNumber, setOrderNumber] = useState<number>(42);
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([
    {
      id: 'bi-1',
      name: 'French Fries',
      unitPrice: 50.0,
      quantity: 1,
    },
    {
      id: 'bi-2',
      name: 'Pav Bhaji',
      unitPrice: 70.0,
      quantity: 1,
    },
    {
      id: 'bi-3',
      name: 'Samosa',
      unitPrice: 15.0,
      quantity: 1,
    },
  ]);

  // Orders and Invoices History
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS);
  const [heldOrders, setHeldOrders] = useState<Order[]>([]);

  // Modals
  const [isSaveBillModalOpen, setIsSaveBillModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
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
  const [laserScanNotification, setLaserScanNotification] = useState<{
    productName: string;
    price: number;
    stock?: number;
    cartQty: number;
  } | null>(null);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // RBAC Manager Override & Matrix Modals
  const [isManagerPinModalOpen, setIsManagerPinModalOpen] = useState<boolean>(false);
  const [pendingRestrictedAction, setPendingRestrictedAction] = useState<{
    title: string;
    description: string;
    requiredRoleLabel?: string;
    onAuthorize: (authorizingStaff: StaffMember) => void;
  } | null>(null);
  const [isRolePermissionsOpen, setIsRolePermissionsOpen] = useState<boolean>(false);

  // Active staff object
  const activeStaff = staffList.find((s) => s.id === activeStaffId) || staffList[0];

  // Save settings and staff to localStorage on change
  useEffect(() => {
    localStorage.setItem('monopos_industrial_settings', JSON.stringify(shopSettings));
  }, [shopSettings]);

  useEffect(() => {
    localStorage.setItem('monopos_staff_list', JSON.stringify(staffList));
  }, [staffList]);

  useEffect(() => {
    localStorage.setItem('monopos_active_staff_id', activeStaffId);
  }, [activeStaffId]);

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
  const grandTotal = subtotal + taxAmount;

  // ITEM-WISE BILLING HANDLERS
  const handleAddItem = (item: CatalogItem) => {
    playSfx('add');
    setCurrentBillItems((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) =>
          i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: `bill-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          itemId: item.id,
          name: item.name,
          unitPrice: item.price,
          quantity: 1,
        },
      ];
    });
  };

  // Hardware Laser Barcode Scanner Gun Driver (USB / Bluetooth HID Keyboard Wedge)
  useEffect(() => {
    const unsubscribe = hardware.onLaserScan((scannedCode) => {
      if (isPriceCheckOpen) return;

      const clean = scannedCode.trim().toLowerCase();
      const match = catalog.find(
        (item) =>
          (item.barcode && item.barcode.toLowerCase() === clean) ||
          (item.sku && item.sku.toLowerCase() === clean) ||
          item.name.toLowerCase() === clean
      );

      if (match) {
        posSound.playBeep();
        handleAddItem(match);

        const existingInCart = currentBillItems.find((b) => b.name === match.name);
        const currentCartQty = existingInCart ? existingInCart.quantity + 1 : 1;

        setLaserScanNotification({
          productName: match.name,
          price: match.price,
          stock: match.stock !== undefined ? Math.max(0, match.stock - currentCartQty) : undefined,
          cartQty: currentCartQty,
        });
      } else {
        posSound.playBuzzer();
        setIsPriceCheckOpen(true);
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
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    if (delta > 0) playSfx('add');
    else playSfx('remove');

    setCurrentBillItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as BillItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    playSfx('remove');
    setCurrentBillItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearBill = () => {
    playSfx('remove');
    setCurrentBillItems([]);
  };

  const handleHoldBill = () => {
    if (currentBillItems.length === 0) return;
    playSfx('tap');
    const held: Order = {
      id: `held-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      items: [...currentBillItems],
      status: 'completed',
      subtotal,
      taxRate: shopSettings.taxRate,
      taxAmount,
      discount: 0,
      total: grandTotal,
      paymentMethod: 'CASH',
      staffName: activeStaff.name,
    };
    setHeldOrders((prev) => [held, ...prev]);
    setCurrentBillItems([]);
    setOrderNumber((prev) => prev + 1);
  };

  const handleAddCustomProduct = (customItem: BillItem) => {
    playSfx('add');
    setCurrentBillItems((prev) => [...prev, customItem]);
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
  }) => {
    playSfx('success');

    const newOrder: Order = {
      id: `order-${orderNumber}-${Date.now()}`,
      orderNumber,
      createdAt: data.orderDate,
      items: [...currentBillItems],
      status: 'completed',
      subtotal,
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
    };

    // If payment was CREDIT or SPLIT with credit, update customer khata balance
    if (data.customerId) {
      let creditToAdd = 0;
      if (data.paymentMode === 'CREDIT') {
        creditToAdd = data.grandTotal;
      } else if (data.paymentMode === 'SPLIT' && data.splitDetails?.credit) {
        creditToAdd = data.splitDetails.credit;
      }
      // Calculate loyalty points: 1 point per 100 spent
      const earnedPoints = Math.floor(data.grandTotal / 100);

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === data.customerId
            ? {
                ...c,
                creditBalance: (c.creditBalance || 0) + creditToAdd,
                loyaltyPoints: (c.loyaltyPoints || 0) + earnedPoints,
                totalOrders: (c.totalOrders || 0) + 1,
              }
            : c
        )
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

    // Auto-decrement inventory stock from catalog in real time
    setCatalog((prevCatalog) => {
      const stockDeductions = new Map<string, number>();
      newOrder.items.forEach((item) => {
        stockDeductions.set(item.name, (stockDeductions.get(item.name) || 0) + item.quantity);
      });

      return prevCatalog.map((prod) => {
        const deductQty = stockDeductions.get(prod.name);
        if (deductQty !== undefined && prod.stock !== undefined) {
          return {
            ...prod,
            stock: Math.max(0, prod.stock - deductQty),
          };
        }
        return prod;
      });
    });

    setOrders((prev) => [newOrder, ...prev]);
    setActiveReceiptOrder(newOrder);
    setIsReceiptModalOpen(true);
    setCurrentBillItems([]);
    setOrderNumber((prev) => prev + 1);

    // Auto-backup to Firebase if signed in
    if (currentUser) {
      pushSingleOrder(newOrder);
    }
  };

  // INWARD STOCK RECEIVING
  const handleInwardStock = (entry: InwardStockEntry) => {
    playSfx('success');
    setCatalog((prevCatalog) => {
      const itemUpdates = new Map<string, { qty: number; unitCost: number }>();
      entry.items.forEach((it) => {
        itemUpdates.set(it.productId, { qty: it.quantity, unitCost: it.unitCost });
      });

      return prevCatalog.map((prod) => {
        const incoming = itemUpdates.get(prod.id);
        if (incoming) {
          const currentStock = prod.stock ?? 0;
          return {
            ...prod,
            stock: currentStock + incoming.qty,
            costPrice: incoming.unitCost > 0 ? incoming.unitCost : prod.costPrice,
          };
        }
        return prod;
      });
    });
  };

  // CLOUD SYNC HANDLERS
  const handleManualCloudSync = async () => {
    setIsSyncing(true);
    try {
      await pushAllToCloud(
        {
          orders,
          catalog,
          customers,
          cashEntries,
          shopSettings,
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
      if (pulled.customers && pulled.customers.length > 0) setCustomers(pulled.customers);
      if (pulled.cashEntries && pulled.cashEntries.length > 0) setCashEntries(pulled.cashEntries);
      if (pulled.shopSettings) setShopSettings(pulled.shopSettings);
      setLastSyncedAt(new Date());
    } finally {
      setIsSyncing(false);
    }
  };

  // QUICK BILL HANDLERS
  const handleSaveQuickBill = (items: BillItem[]) => {
    setCurrentBillItems(items);
    setIsSaveBillModalOpen(true);
  };

  const handlePrintQuickBill = (items: BillItem[]) => {
    setCurrentBillItems(items);
    setActiveReceiptOrder(null);
    setIsReceiptModalOpen(true);
  };

  // CATEGORY & PRODUCT MANAGEMENT
  const handleAddCategory = (name: string) => {
    playSfx('add');
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const handleUpdateCategory = (id: string, name: string) => {
    playSfx('tap');
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const handleDeleteCategory = (id: string) => {
    playSfx('remove');
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddProduct = (item: Omit<CatalogItem, 'id'>) => {
    playSfx('add');
    const newProd: CatalogItem = {
      ...item,
      id: `item-${Date.now()}`,
    };
    setCatalog((prev) => [newProd, ...prev]);
  };

  const handleUpdateProduct = (item: CatalogItem) => {
    playSfx('tap');
    setCatalog((prev) => prev.map((p) => (p.id === item.id ? item : p)));
  };

  const handleDeleteProduct = (id: string) => {
    playSfx('remove');
    setCatalog((prev) => prev.filter((p) => p.id !== id));
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
      return [...prev, ...added];
    });

    const formattedItems: CatalogItem[] = newItems.map((item, idx) => ({
      id: `xls-item-${Date.now()}-${idx}`,
      name: item.name,
      category: item.category,
      price: item.price,
    }));

    setCatalog((prev) => [...formattedItems, ...prev]);
  };

  // CUSTOMER MANAGEMENT
  const handleAddNewCustomer = (name: string, phone: string) => {
    playSfx('add');
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name,
      phone,
      creditBalance: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
  };

  const handleAddFullCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    playSfx('add');
    const newCust: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
  };

  const handleSettleCredit = (customerId: string, amount: number, note: string) => {
    playSfx('success');
    const cust = customers.find((c) => c.id === customerId);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? { ...c, creditBalance: Math.max(0, (c.creditBalance || 0) - amount) }
          : c
      )
    );

    setCashEntries((prev) => [
      {
        id: `credit-repay-${Date.now()}`,
        type: 'IN',
        amount,
        reason: `Khata Repayment (${cust ? cust.name : 'Customer'}) - ${note}`,
        staffName: activeStaff.name,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
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
  };

  const handleUpdatePin = (staffId: string, newPin: string) => {
    playSfx('tap');
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, pin: newPin } : s))
    );
  };

  // REPORTS & ORDERS ACTIONS
  const handleViewOrder = (order: Order) => {
    setActiveReceiptOrder(order);
    setIsReceiptModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setCurrentBillItems(order.items);
    setOrderNumber(order.orderNumber);
    setActiveScreen('item-wise');
  };

  const handlePrintOrder = (order: Order) => {
    setActiveReceiptOrder(order);
    setIsReceiptModalOpen(true);
  };

  const handleDeleteOrder = (orderId: string) => {
    const currentRole = activeStaff?.role || 'CASHIER';
    if (canDeleteOrder(currentRole)) {
      playSfx('remove');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setPendingRestrictedAction({
        title: 'Void Sale Authorization',
        description: 'Deleting or voiding sales records requires Manager or Store Owner PIN authorization.',
        requiredRoleLabel: 'MANAGER / OWNER',
        onAuthorize: () => {
          playSfx('remove');
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
        },
      });
      setIsManagerPinModalOpen(true);
    }
  };

  const handleDeleteAllOrders = () => {
    const currentRole = activeStaff?.role || 'CASHIER';
    if (canDeleteOrder(currentRole)) {
      if (window.confirm('Are you sure you want to clear all report records?')) {
        playSfx('remove');
        setOrders([]);
      }
    } else {
      setPendingRestrictedAction({
        title: 'Bulk Void Sales Authorization',
        description: 'Purging sales history requires Manager or Store Owner authorization.',
        requiredRoleLabel: 'MANAGER / OWNER',
        onAuthorize: () => {
          if (window.confirm('Are you sure you want to clear all report records?')) {
            playSfx('remove');
            setOrders([]);
          }
        },
      });
      setIsManagerPinModalOpen(true);
    }
  };

  // Navigation router with RBAC access control
  const handleNavigate = (screen: ActiveScreen) => {
    if (screen === 'print-settings') {
      setIsPrintSettingsOpen(true);
      return;
    }
    if (screen === 'training-videos') {
      setIsTrainingVideosOpen(true);
      return;
    }

    const currentRole = activeStaff?.role || 'CASHIER';
    if (canAccessScreen(currentRole, screen)) {
      setActiveScreen(screen);
      setIsSidebarOpen(false);
    } else {
      const reqRole = getRequiredRoleForScreen(screen);
      setPendingRestrictedAction({
        title: `Manager Authorization Required`,
        description: `The "${screen.replace(/-/g, ' ')}" screen is restricted to ${reqRole}. Please enter a Manager or Store Owner 4-digit PIN to access.`,
        requiredRoleLabel: reqRole,
        onAuthorize: () => {
          setActiveScreen(screen);
          setIsSidebarOpen(false);
        },
      });
      setIsManagerPinModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#dcd9dc] flex justify-center items-center p-0 md:p-3 lg:p-4 selection:bg-[#18181b] selection:text-white overflow-hidden">
      {/* Responsive POS Station Container */}
      <div className="w-full max-w-7xl h-[100dvh] md:h-[94vh] bg-white md:rounded-3xl md:shadow-2xl md:border md:border-[#d4d4d8] flex flex-col overflow-hidden relative">
        {/* Top App Bar Header */}
        <Header
          activeScreen={activeScreen}
          orderNumber={orderNumber}
          heldOrdersCount={heldOrders.length}
          soundEnabled={shopSettings.soundEnabled}
          activeStaffName={activeStaff.name}
          activeStaffRole={activeStaff.role}
          user={currentUser}
          isSyncing={isSyncing}
          onOpenCloudModal={() => setIsCloudModalOpen(true)}
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
        />

        {/* Active Screen Surface */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#fcf8fb]">
          {activeScreen === 'item-wise' && (
            <ItemWiseBillTerminal
              currentBillItems={currentBillItems}
              catalog={catalog}
              categories={categories}
              currencySymbol={shopSettings.currencySymbol}
              orderNumber={orderNumber}
              taxRate={shopSettings.taxRate}
              onAddItem={handleAddItem}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearBill={handleClearBill}
              onHoldBill={handleHoldBill}
              onOpenAddCustomProduct={() => setIsCustomProductModalOpen(true)}
              onOpenScanner={(mode) => handleOpenScanner(mode || 'add-to-bill')}
              onOpenPriceCheck={() => setIsPriceCheckOpen(true)}
              onPrintBill={() => {
                setActiveReceiptOrder(null);
                setIsReceiptModalOpen(true);
              }}
              onSaveBill={() => setIsSaveBillModalOpen(true)}
            />
          )}

          {activeScreen === 'quick-bill' && (
            <QuickBillTerminal
              currencySymbol={shopSettings.currencySymbol}
              onSaveQuickBill={handleSaveQuickBill}
              onPrintQuickBill={handlePrintQuickBill}
            />
          )}

          {activeScreen === 'reports' && (
            <ReportsScreen
              orders={orders}
              currencySymbol={shopSettings.currencySymbol}
              onViewOrder={handleViewOrder}
              onEditOrder={handleEditOrder}
              onPrintOrder={handlePrintOrder}
              onDeleteOrder={handleDeleteOrder}
              onDeleteAllOrders={handleDeleteAllOrders}
            />
          )}

          {activeScreen === 'categories-products' && (
            <CategoryProductManager
              categories={categories}
              catalog={catalog}
              currencySymbol={shopSettings.currencySymbol}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onImportCatalogFromXls={handleImportCatalogFromXls}
              onOpenPurchaseInward={() => setIsPurchaseInwardOpen(true)}
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
            />
          )}

          {activeScreen === 'staff-management' && (
            <StaffManagementScreen
              staffList={staffList}
              activeStaffId={activeStaffId}
              onSelectStaff={handleSwitchStaff}
              onAddStaff={handleAddStaff}
              onUpdatePin={handleUpdatePin}
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
        onSelectScreen={handleNavigate}
        onRequestManagerOverride={(screen) => handleNavigate(screen)}
        onOpenPermissionsModal={() => {
          setIsSidebarOpen(false);
          setIsRolePermissionsOpen(true);
        }}
        onClose={() => setIsSidebarOpen(false)}
        onOpenScanner={(mode) => handleOpenScanner(mode || 'add-to-bill')}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        onOpenStaffSwitch={() => setIsStaffSwitchModalOpen(true)}
      />

      {/* Barcode & QR Code Scanner / Price Checker Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        mode={scannerMode}
        catalog={catalog}
        currencySymbol={shopSettings.currencySymbol}
        onClose={() => setIsScannerOpen(false)}
        onAddScannedItem={(item) => {
          handleAddItem(item);
        }}
        onSearchItem={(item) => {
          setActiveScreen('item-wise');
        }}
        onRegisterBarcode={(barcode) => {
          // Open product manager and register
          setActiveScreen('categories-products');
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

      {/* Save Bill Modal */}
      <SaveBillModal
        isOpen={isSaveBillModalOpen}
        subtotal={subtotal}
        taxRate={shopSettings.taxRate}
        customers={customers}
        currencySymbol={shopSettings.currencySymbol}
        onClose={() => setIsSaveBillModalOpen(false)}
        onAddNewCustomer={handleAddNewCustomer}
        onSaveAndComplete={handleSaveAndCompleteOrder}
      />

      {/* Invoice Details / Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        order={activeReceiptOrder}
        orderNumber={orderNumber}
        items={currentBillItems}
        subtotal={subtotal}
        taxRate={shopSettings.taxRate}
        taxAmount={taxAmount}
        total={grandTotal}
        shopSettings={shopSettings}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setActiveReceiptOrder(null);
        }}
        onEditOrder={() => {
          if (activeReceiptOrder) {
            handleEditOrder(activeReceiptOrder);
          }
        }}
      />

      {/* Custom Item Modal */}
      <CustomItemModal
        isOpen={isCustomProductModalOpen}
        currencySymbol={shopSettings.currencySymbol}
        onClose={() => setIsCustomProductModalOpen(false)}
        onAddCustomItem={handleAddCustomProduct}
      />

      {/* Print Settings Modal */}
      <PrintSettingsModal
        isOpen={isPrintSettingsOpen}
        settings={shopSettings}
        onClose={() => setIsPrintSettingsOpen(false)}
        onSaveSettings={setShopSettings}
      />

      {/* Training Videos Modal */}
      <TrainingVideosModal
        isOpen={isTrainingVideosOpen}
        onClose={() => setIsTrainingVideosOpen(false)}
      />

      {/* Cloud Sync & Google Auth Modal */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        user={currentUser}
        orders={orders}
        catalog={catalog}
        customers={customers}
        cashEntries={cashEntries}
        shopSettings={shopSettings}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onManualSync={handleManualCloudSync}
        onPullFromCloud={handlePullFromCloud}
      />

      {/* 1-Second 4-Digit Staff Shift Switch Modal */}
      <QuickStaffSwitchModal
        isOpen={isStaffSwitchModalOpen}
        staffList={staffList}
        activeStaffId={activeStaffId}
        onClose={() => setIsStaffSwitchModalOpen(false)}
        onSwitchStaff={handleSwitchStaff}
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
        onRequestManagerOverride={() => {
          setPendingRestrictedAction({
            title: 'Manager Authorization for Stock Editing',
            description: 'Direct shelf count adjustments require Manager or Store Owner PIN authorization.',
            requiredRoleLabel: 'MANAGER / OWNER',
            onAuthorize: () => {
              // Once authorized by manager PIN, grant temporary ability to edit stock in the open modal
            },
          });
          setIsManagerPinModalOpen(true);
        }}
        onUpdateStock={handleUpdateProductStock}
        onAddToCart={(item) => {
          handleAddItem(item);
          setIsPriceCheckOpen(false);
        }}
      />

      {/* Manager PIN Authorization Modal */}
      <ManagerPinModal
        isOpen={isManagerPinModalOpen}
        staffList={staffList}
        title={pendingRestrictedAction?.title || 'Manager Authorization'}
        description={pendingRestrictedAction?.description}
        requiredRoleLabel={pendingRestrictedAction?.requiredRoleLabel || 'MANAGER / OWNER'}
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

      {/* Floating Laser Gun Instant Scan Toast Notification */}
      {laserScanNotification && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-zinc-700/80 flex items-center gap-3.5 max-w-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                Laser Gun Scanned ⚡
              </span>
              <span className="text-[11px] font-mono font-bold bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                Qty in Bill: {laserScanNotification.cartQty}
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate mt-0.5">
              {laserScanNotification.productName} • {shopSettings.currencySymbol}{laserScanNotification.price.toFixed(2)}
            </p>
            {laserScanNotification.stock !== undefined && (
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Remaining Stock: <span className={`font-bold ${laserScanNotification.stock <= 5 ? 'text-amber-400' : 'text-zinc-200'}`}>{laserScanNotification.stock} units</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Real-Time Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
