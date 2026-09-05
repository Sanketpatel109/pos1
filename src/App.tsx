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
import { posSound } from './utils/sound';

export default function App() {
  // Screen Routing
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('item-wise');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Settings & Staff State
  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem('monopos_industrial_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SHOP_SETTINGS;
  });
  const [staffList, setStaffList] = useState<StaffMember[]>(SAMPLE_STAFF);
  const [activeStaffId, setActiveStaffId] = useState<string>('staff-1');

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
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Active staff object
  const activeStaff = staffList.find((s) => s.id === activeStaffId) || staffList[0];

  // Save settings to localStorage on change
  useEffect(() => {
    localStorage.setItem('monopos_industrial_settings', JSON.stringify(shopSettings));
  }, [shopSettings]);

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

  // Hardware USB/Bluetooth barcode scanner global keypress buffer
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in text inputs or textareas
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const rawCode = buffer.trim();
          const match = catalog.find(
            (item) =>
              (item.barcode && item.barcode.toLowerCase() === rawCode.toLowerCase()) ||
              (item.sku && item.sku.toLowerCase() === rawCode.toLowerCase())
          );

          if (match) {
            handleAddItem(match);
          } else {
            // Open scanner to price check or show item not found
            setScannerMode('add-to-bill');
            setIsScannerOpen(true);
          }
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [catalog]);

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
      if (creditToAdd > 0) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === data.customerId
              ? {
                  ...c,
                  creditBalance: (c.creditBalance || 0) + creditToAdd,
                  totalOrders: (c.totalOrders || 0) + 1,
                }
              : c
          )
        );
      }
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

    setOrders((prev) => [newOrder, ...prev]);
    setActiveReceiptOrder(newOrder);
    setIsReceiptModalOpen(true);
    setCurrentBillItems([]);
    setOrderNumber((prev) => prev + 1);
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
    playSfx('remove');
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleDeleteAllOrders = () => {
    if (window.confirm('Are you sure you want to clear all report records?')) {
      playSfx('remove');
      setOrders([]);
    }
  };

  // Navigation router
  const handleNavigate = (screen: ActiveScreen) => {
    if (screen === 'print-settings') {
      setIsPrintSettingsOpen(true);
    } else if (screen === 'training-videos') {
      setIsTrainingVideosOpen(true);
    } else {
      setActiveScreen(screen);
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
        onSelectScreen={handleNavigate}
        onClose={() => setIsSidebarOpen(false)}
        onOpenScanner={(mode) => handleOpenScanner(mode || 'add-to-bill')}
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
    </div>
  );
}
