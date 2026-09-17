import {
  db,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  getDocFromServer,
  query,
  orderBy,
  limit,
} from '../firebase';
import {
  CatalogItem,
  Category,
  Customer,
  CashEntry,
  Order,
  ShopSettings,
  StaffMember,
} from '../types';

export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'list';

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string
): FirestoreErrorInfo {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Firestore ${operationType} Error on ${path}]:`, message);
  return {
    error: message,
    operationType,
    path,
  };
}

export interface LiveTableCounts {
  catalog: number;
  categories: number;
  orders: number;
  customers: number;
  cashEntries: number;
  settings: number;
  staff: number;
  heldOrders: number;
}

export interface LiveSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  tableCounts: LiveTableCounts;
  lastEvent: string;
  error: string | null;
}

// Global live sync state listeners
type SyncStateListener = (state: LiveSyncState) => void;
const syncStateListeners: Set<SyncStateListener> = new Set();

let currentSyncState: LiveSyncState = {
  isConnected: true,
  isSyncing: false,
  lastSyncAt: new Date(),
  tableCounts: {
    catalog: 0,
    categories: 0,
    orders: 0,
    customers: 0,
    cashEntries: 0,
    settings: 1,
    staff: 0,
    heldOrders: 0,
  },
  lastEvent: 'Initialized',
  error: null,
};

export function subscribeSyncState(listener: SyncStateListener): () => void {
  syncStateListeners.add(listener);
  listener(currentSyncState);
  return () => {
    syncStateListeners.delete(listener);
  };
}

function updateSyncState(patch: Partial<LiveSyncState>) {
  currentSyncState = { ...currentSyncState, ...patch };
  syncStateListeners.forEach((fn) => fn(currentSyncState));
}

// ============================================================================
// MULTI-TENANT ISOLATION HELPERS
// ============================================================================
let activeTenantId: string | null = null;

export function setActiveTenantId(tenantId: string | null): void {
  activeTenantId = tenantId;
}

export function getActiveTenantId(): string | null {
  return activeTenantId;
}

export function getTenantCollection(colName: string, overrideTenantId?: string) {
  const tId = overrideTenantId || activeTenantId;
  if (tId) {
    return collection(db, 'tenants', tId, colName);
  }
  return collection(db, colName);
}

export function getTenantDoc(colName: string, docId: string, overrideTenantId?: string) {
  const tId = overrideTenantId || activeTenantId;
  if (tId) {
    return doc(db, 'tenants', tId, colName, docId);
  }
  return doc(db, colName, docId);
}

/**
 * Validate Connection to Firestore on Boot
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDoc = await getDocFromServer(doc(db, 'test', 'connection'));
    updateSyncState({
      isConnected: true,
      lastSyncAt: new Date(),
      lastEvent: 'Firestore connection verified live',
    });
    return testDoc.exists();
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client currently operating in offline mode.');
      updateSyncState({
        isConnected: false,
        error: 'Firestore client is offline. Local changes will sync when online.',
      });
    } else {
      console.error('Firestore connection check:', error);
    }
    return false;
  }
}

// ============================================================================
// REAL-TIME LISTENERS (onSnapshot) FOR ALL TABLES
// ============================================================================

/**
 * Live Real-Time Catalog (Products) Listener
 */
export function listenToLiveCatalog(
  callback: (items: CatalogItem[]) => void,
  onError?: (err: FirestoreErrorInfo) => void,
  tenantId?: string
): () => void {
  const tId = tenantId || activeTenantId;
  if (!tId) {
    return () => {};
  }
  const colRef = getTenantCollection('catalog', tId);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: CatalogItem[] = [];
      snapshot.forEach((d) => {
        const raw = (d.data() || {}) as any;
        // Purge and ignore ghost/corrupted products with no name or 'Unnamed Product' and empty category
        if ((!raw.name || raw.name === 'Unnamed Product') && (!raw.category || raw.category === '')) {
          console.warn('Purging ghost unnamed product from Firestore:', d.id);
          deleteDoc(d.ref).catch(() => {});
          return;
        }
        const rawPrice =
          raw.price !== undefined
            ? raw.price
            : raw.sellingPrice !== undefined
            ? raw.sellingPrice
            : 0;
        const parsedPrice = Number(rawPrice);
        items.push({
          ...raw,
          id: d.id,
          name: raw.name || 'Product',
          price: isNaN(parsedPrice) ? 0 : parsedPrice,
        } as CatalogItem);
      });
      // Sort alphabetically by name
      items.sort((a, b) => a.name.localeCompare(b.name));
      updateSyncState({
        isConnected: true,
        lastSyncAt: new Date(),
        tableCounts: { ...currentSyncState.tableCounts, catalog: items.length },
        lastEvent: `Catalog updated (${items.length} items)`,
      });
      callback(items);
    },
    (err) => {
      const info = handleFirestoreError(err, 'read', 'catalog');
      updateSyncState({ isConnected: false, error: info.error });
      onError?.(info);
    }
  );
}

/**
 * Live Real-Time Categories Listener
 */
export function listenToLiveCategories(
  callback: (categories: Category[]) => void,
  onError?: (err: FirestoreErrorInfo) => void,
  tenantId?: string
): () => void {
  const tId = tenantId || activeTenantId;
  if (!tId) {
    return () => {};
  }
  const colRef = getTenantCollection('categories', tId);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const cats: Category[] = [];
      snapshot.forEach((d) => {
        cats.push({ id: d.id, ...d.data() } as Category);
      });
      updateSyncState({
        isConnected: true,
        lastSyncAt: new Date(),
        tableCounts: { ...currentSyncState.tableCounts, categories: snapshot.size },
        lastEvent: `Categories updated (${snapshot.size})`,
      });
      callback(cats);
    },
    (err) => {
      const info = handleFirestoreError(err, 'read', 'categories');
      onError?.(info);
    }
  );
}

/**
 * Live Real-Time Orders / Invoices Listener
 */
export function listenToLiveOrders(
  callback: (orders: Order[]) => void,
  onError?: (err: FirestoreErrorInfo) => void,
  tenantId?: string
): () => void {
  const tId = tenantId || activeTenantId;
  if (!tId) {
    return () => {};
  }
  const colRef = getTenantCollection('orders', tId);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((d) => {
        orders.push({ id: d.id, ...d.data() } as Order);
      });
      // Sort newest first
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      updateSyncState({
        isConnected: true,
        lastSyncAt: new Date(),
        tableCounts: { ...currentSyncState.tableCounts, orders: snapshot.size },
        lastEvent: `Orders updated (${snapshot.size} sales)`,
      });
      callback(orders);
    },
    (err) => {
      const info = handleFirestoreError(err, 'read', 'orders');
      onError?.(info);
    }
  );
}

/**
 * Live Real-Time Customers & Khata Ledger Listener
 */
export function listenToLiveCustomers(
  callback: (customers: Customer[]) => void,
  onError?: (err: FirestoreErrorInfo) => void,
  tenantId?: string
): () => void {
  const tId = tenantId || activeTenantId;
  if (!tId) {
    return () => {};
  }
  const colRef = getTenantCollection('customers', tId);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const customers: Customer[] = [];
      snapshot.forEach((d) => {
        customers.push({ id: d.id, ...d.data() } as Customer);
      });
      // Sort by name
      customers.sort((a, b) => a.name.localeCompare(b.name));
      updateSyncState({
        isConnected: true,
        lastSyncAt: new Date(),
        tableCounts: { ...currentSyncState.tableCounts, customers: snapshot.size },
        lastEvent: `Customers updated (${snapshot.size} khata accounts)`,
      });
      callback(customers);
    },
    (err) => {
      const info = handleFirestoreError(err, 'read', 'customers');
      onError?.(info);
    }
  );
}

/**
 * Live Real-Time Cash Register Entries Listener
 */
export function listenToLiveCashEntries(
  callback: (entries: CashEntry[]) => void,
  onError?: (err: FirestoreErrorInfo) => void,
  tenantId?: string
): () => void {
  const tId = tenantId || activeTenantId;
  if (!tId) {
    return () => {};
  }
  const colRef = getTenantCollection('cashEntries', tId);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const entries: CashEntry[] = [];
      snapshot.forEach((d) => {
        entries.push({ id: d.id, ...d.data() } as CashEntry);
      });
      // Sort newest first
      entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      updateSyncState({
        isConnected: true,
        lastSyncAt: new Date(),
        tableCounts: { ...currentSyncState.tableCounts, cashEntries: snapshot.size },
        lastEvent: `Cash register entries updated (${snapshot.size} records)`,
      });
      callback(entries);
    },
    (err) => {
      const info = handleFirestoreError(err, 'read', 'cashEntries');
      onError?.(info);
    }
  );
}

/**
 * Live Real-Time Store Settings Listener
 */
export function listenToLiveSettings(
  callback: (settings: ShopSettings) => void,
  onError?: (err: FirestoreErrorInfo) => void,
  tenantId?: string
): () => void {
  const tId = tenantId || activeTenantId;
  if (!tId) {
    return () => {};
  }
  const docRef = getTenantDoc('settings', 'store_config', tId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data() as ShopSettings;
        updateSyncState({
          isConnected: true,
          lastSyncAt: new Date(),
          tableCounts: { ...currentSyncState.tableCounts, settings: 1 },
          lastEvent: 'Store settings updated live',
        });
        callback(settings);
      }
    },
    (err) => {
      const info = handleFirestoreError(err, 'read', 'settings/store_config');
      onError?.(info);
    }
  );
}

/**
 * Live Real-Time Staff Members & PINs Listener
 */
export function listenToLiveStaff(
  callback: (staff: StaffMember[]) => void,
  onError?: (err: FirestoreErrorInfo) => void,
  tenantId?: string
): () => void {
  const tId = tenantId || activeTenantId;
  if (!tId) {
    return () => {};
  }
  const colRef = getTenantCollection('staff', tId);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const staff: StaffMember[] = [];
      snapshot.forEach((d) => {
        staff.push({ id: d.id, ...d.data() } as StaffMember);
      });
      updateSyncState({
        isConnected: true,
        lastSyncAt: new Date(),
        tableCounts: { ...currentSyncState.tableCounts, staff: snapshot.size },
        lastEvent: `Staff updated (${snapshot.size} operators)`,
      });
      callback(staff);
    },
    (err) => {
      const info = handleFirestoreError(err, 'read', 'staff');
      onError?.(info);
    }
  );
}

/**
 * Live Real-Time Held / Parked Bills Listener
 */
export function listenToLiveHeldOrders(
  callback: (held: Order[]) => void,
  onError?: (err: FirestoreErrorInfo) => void,
  tenantId?: string
): () => void {
  const tId = tenantId || activeTenantId;
  if (!tId) {
    return () => {};
  }
  const colRef = getTenantCollection('heldOrders', tId);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const heldList: Order[] = [];
      snapshot.forEach((d) => {
        heldList.push({ id: d.id, ...d.data() } as Order);
      });
      // Sort newest first
      heldList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      updateSyncState({
        isConnected: true,
        lastSyncAt: new Date(),
        tableCounts: { ...currentSyncState.tableCounts, heldOrders: snapshot.size },
        lastEvent: `Parked orders updated (${snapshot.size} on hold)`,
      });
      callback(heldList);
    },
    (err) => {
      const info = handleFirestoreError(err, 'read', 'heldOrders');
      onError?.(info);
    }
  );
}

// ============================================================================
// REAL-TIME LIVE MUTATIONS (Writes to Firestore immediately)
// ============================================================================

/**
 * Live Complete Order & Inventory Stock Deduction
 */
export async function liveSaveOrder(order: Order): Promise<void> {
  updateSyncState({ isSyncing: true });
  try {
    const batch = writeBatch(db);

    // 1. Order document in /orders
    const orderRef = getTenantDoc('orders', order.id);
    const sanitizedOrder = JSON.parse(JSON.stringify({
      ...order,
      syncedAt: new Date().toISOString(),
    }));
    batch.set(
      orderRef,
      sanitizedOrder,
      { merge: true }
    );

    // 2. Bill tender snapshot in /bills
    const billRef = getTenantDoc('bills', order.id);
    batch.set(
      billRef,
      {
        id: order.id,
        billNo: order.orderNumber,
        total: order.total,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        paymentMethod: order.paymentMethod,
        itemsCount: order.items.reduce((s, i) => s + i.quantity, 0),
        customerName: order.customerName || 'Walk-in Customer',
        staffName: order.staffName || 'Cashier',
        timestamp: order.createdAt,
      },
      { merge: true }
    );

    // 3. Customer khata update if order had credit payment mode
    if (order.customerId && (order.paymentMethod === 'CREDIT' || order.splitDetails?.credit)) {
      const creditToAdd = order.splitDetails?.credit || order.total;
      const custDoc = await getDoc(getTenantDoc('customers', order.customerId));
      if (custDoc.exists()) {
        const curBal = Number(custDoc.data().creditBalance || 0);
        const curOrders = Number(custDoc.data().totalOrders || 0);
        batch.update(getTenantDoc('customers', order.customerId), {
          creditBalance: curBal + creditToAdd,
          totalOrders: curOrders + 1,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await batch.commit();

    updateSyncState({
      isSyncing: false,
      lastSyncAt: new Date(),
      lastEvent: `Saved order #${order.orderNumber} to Firestore`,
    });
  } catch (err) {
    updateSyncState({ isSyncing: false, error: String(err) });
    throw err;
  }
}

/**
 * Live Delete / Void Order
 */
export async function liveDeleteOrder(orderId: string): Promise<void> {
  try {
    await deleteDoc(getTenantDoc('orders', orderId));
    try {
      await deleteDoc(getTenantDoc('bills', orderId));
    } catch {
      // Ignore if bill doc didn't exist
    }
    updateSyncState({
      lastSyncAt: new Date(),
      lastEvent: `Voided order ${orderId} in Firestore`,
    });
  } catch (err) {
    handleFirestoreError(err, 'delete', `orders/${orderId}`);
    throw err;
  }
}

/**
 * Live Purge All Orders
 */
export async function liveDeleteAllOrders(): Promise<void> {
  updateSyncState({ isSyncing: true });
  try {
    const snap = await getDocs(getTenantCollection('orders'));
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    updateSyncState({
      isSyncing: false,
      lastSyncAt: new Date(),
      lastEvent: 'Cleared all orders in Firestore',
    });
  } catch (err) {
    updateSyncState({ isSyncing: false });
    throw err;
  }
}

/**
 * Helper to strip undefined values so Firestore never rejects payloads
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Live Save / Add / Update Product in Catalog
 */
export async function liveSaveProduct(item: CatalogItem): Promise<void> {
  try {
    const itemRef = getTenantDoc('catalog', item.id);
    const sanitized = sanitizeForFirestore({
      ...item,
      name: item.name || 'Product',
      price: typeof item.price === 'number' ? item.price : 0,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(itemRef, sanitized, { merge: true });
    updateSyncState({
      lastSyncAt: new Date(),
      lastEvent: `Updated product ${item.name}`,
    });
  } catch (err) {
    handleFirestoreError(err, 'update', `catalog/${item.id}`);
    throw err;
  }
}

/**
 * Live Delete Product from Catalog
 */
export async function liveDeleteProduct(itemId: string): Promise<void> {
  try {
    await deleteDoc(getTenantDoc('catalog', itemId));
    updateSyncState({
      lastSyncAt: new Date(),
      lastEvent: `Deleted product from catalog`,
    });
  } catch (err) {
    handleFirestoreError(err, 'delete', `catalog/${itemId}`);
    throw err;
  }
}

/**
 * Live Update Product Stock Level
 */
export async function liveUpdateProductStock(itemId: string, newStock: number): Promise<void> {
  try {
    await setDoc(
      getTenantDoc('catalog', itemId),
      sanitizeForFirestore({
        stock: newStock,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, 'update', `catalog/${itemId}`);
    throw err;
  }
}

/**
 * Live Batch Deduct Stock after Sale
 * CRITICAL: Preserves full item (name, category, price, gstRate) so documents never turn into incomplete ghost documents!
 */
export async function liveBatchDeductStock(
  stockDeductions: Map<string, number>,
  catalog: CatalogItem[]
): Promise<void> {
  if (stockDeductions.size === 0) return;
  try {
    const batch = writeBatch(db);
    for (const item of catalog) {
      const deductQty = stockDeductions.get(item.name);
      if (deductQty !== undefined && item.stock !== undefined) {
        const updatedStock = Math.max(0, item.stock - deductQty);
        const fullItem = sanitizeForFirestore({
          ...item,
          stock: updatedStock,
          updatedAt: new Date().toISOString(),
        });
        batch.set(
          getTenantDoc('catalog', item.id),
          fullItem,
          { merge: true }
        );
      }
    }
    await batch.commit();
  } catch (err) {
    console.warn('Background live stock deduction deferred:', err);
  }
}

/**
 * Live Save / Add / Update Category
 */
export async function liveSaveCategory(category: Category): Promise<void> {
  try {
    await setDoc(
      getTenantDoc('categories', category.id),
      sanitizeForFirestore({
        ...category,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
    updateSyncState({
      lastSyncAt: new Date(),
      lastEvent: `Saved category ${category.name}`,
    });
  } catch (err) {
    handleFirestoreError(err, 'update', `categories/${category.id}`);
    throw err;
  }
}

/**
 * Live Delete Category
 */
export async function liveDeleteCategory(categoryId: string): Promise<void> {
  try {
    await deleteDoc(getTenantDoc('categories', categoryId));
  } catch (err) {
    handleFirestoreError(err, 'delete', `categories/${categoryId}`);
    throw err;
  }
}

/**
 * Live Save / Add / Update Customer
 */
export async function liveSaveCustomer(customer: Customer): Promise<void> {
  try {
    await setDoc(
      getTenantDoc('customers', customer.id),
      sanitizeForFirestore({
        ...customer,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
    updateSyncState({
      lastSyncAt: new Date(),
      lastEvent: `Saved customer ${customer.name}`,
    });
  } catch (err) {
    handleFirestoreError(err, 'update', `customers/${customer.id}`);
    throw err;
  }
}

/**
 * Live Settle Customer Khata Credit
 */
export async function liveSettleCustomerCredit(
  customerId: string,
  newBalance: number
): Promise<void> {
  try {
    await setDoc(
      getTenantDoc('customers', customerId),
      sanitizeForFirestore({
        creditBalance: newBalance,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, 'update', `customers/${customerId}`);
    throw err;
  }
}

/**
 * Live Save Cash Register Entry (IN / OUT)
 */
export async function liveSaveCashEntry(entry: CashEntry): Promise<void> {
  try {
    await setDoc(
      getTenantDoc('cashEntries', entry.id),
      sanitizeForFirestore({
        ...entry,
        createdAt: entry.createdAt || new Date().toISOString(),
      }),
      { merge: true }
    );
    updateSyncState({
      lastSyncAt: new Date(),
      lastEvent: `Recorded cash ${entry.type}: ${entry.amount}`,
    });
  } catch (err) {
    handleFirestoreError(err, 'create', `cashEntries/${entry.id}`);
    throw err;
  }
}

/**
 * Live Save Store Configuration Settings
 */
export async function liveSaveSettings(settings: ShopSettings): Promise<void> {
  try {
    await setDoc(
      getTenantDoc('settings', 'store_config'),
      sanitizeForFirestore({
        ...settings,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
    updateSyncState({
      lastSyncAt: new Date(),
      lastEvent: 'Updated store configuration',
    });
  } catch (err) {
    handleFirestoreError(err, 'update', 'settings/store_config');
    throw err;
  }
}

/**
 * Live Save Staff Member
 */
export async function liveSaveStaff(member: StaffMember): Promise<void> {
  try {
    await setDoc(
      getTenantDoc('staff', member.id),
      sanitizeForFirestore({
        ...member,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
    updateSyncState({
      lastSyncAt: new Date(),
      lastEvent: `Saved staff member ${member.name}`,
    });
  } catch (err) {
    handleFirestoreError(err, 'update', `staff/${member.id}`);
    throw err;
  }
}

/**
 * Live Update Staff PIN
 */
export async function liveUpdateStaffPin(staffId: string, newPin: string): Promise<void> {
  try {
    await setDoc(
      getTenantDoc('staff', staffId),
      {
        pin: newPin,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, 'update', `staff/${staffId}`);
    throw err;
  }
}

/**
 * Live Save / Park Held Order
 */
export async function liveSaveHeldOrder(order: Order): Promise<void> {
  try {
    await setDoc(
      getTenantDoc('heldOrders', order.id),
      {
        ...order,
        parkedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    updateSyncState({
      lastSyncAt: new Date(),
      lastEvent: `Parked ticket #${order.orderNumber} live in cloud`,
    });
  } catch (err) {
    handleFirestoreError(err, 'create', `heldOrders/${order.id}`);
    throw err;
  }
}

/**
 * Live Delete / Resume Held Order
 */
export async function liveDeleteHeldOrder(orderId: string): Promise<void> {
  try {
    await deleteDoc(getTenantDoc('heldOrders', orderId));
    updateSyncState({
      lastSyncAt: new Date(),
      lastEvent: `Resumed parked ticket ${orderId}`,
    });
  } catch (err) {
    handleFirestoreError(err, 'delete', `heldOrders/${orderId}`);
    throw err;
  }
}

/**
 * Live Clear All Held Orders
 */
export async function liveClearAllHeldOrders(): Promise<void> {
  try {
    const snap = await getDocs(getTenantCollection('heldOrders'));
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, 'delete', 'heldOrders');
    throw err;
  }
}
