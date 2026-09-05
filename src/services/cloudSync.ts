import {
  db,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  writeBatch,
} from '../firebase';
import { CatalogItem, Category, Customer, CashEntry, Order, ShopSettings } from '../types';

export interface CloudStoreData {
  orders: Order[];
  catalog: CatalogItem[];
  customers: Customer[];
  cashEntries: CashEntry[];
  shopSettings?: ShopSettings;
}

/**
 * Backup all in-memory POS data into Firebase Firestore
 */
export async function pushAllToCloud(data: CloudStoreData, ownerEmail?: string): Promise<void> {
  const batch = writeBatch(db);

  // 1. Settings
  if (data.shopSettings) {
    const settingsRef = doc(db, 'settings', 'store_config');
    batch.set(settingsRef, {
      ...data.shopSettings,
      updatedAt: new Date().toISOString(),
      syncedBy: ownerEmail || 'owner',
    }, { merge: true });
  }

  // 2. Orders (limit to last 200 orders in batch to prevent Firestore batch limit of 500 ops)
  const recentOrders = data.orders.slice(0, 150);
  for (const order of recentOrders) {
    const orderRef = doc(db, 'orders', order.id);
    batch.set(orderRef, {
      ...order,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  }

  // 3. Catalog Products
  for (const item of data.catalog) {
    const itemRef = doc(db, 'catalog', item.id);
    batch.set(itemRef, {
      ...item,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  }

  // 4. Customers
  for (const customer of data.customers) {
    const customerRef = doc(db, 'customers', customer.id);
    batch.set(customerRef, {
      ...customer,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  }

  // 5. Cash entries
  const recentCash = data.cashEntries.slice(0, 100);
  for (const entry of recentCash) {
    const cashRef = doc(db, 'cashEntries', entry.id);
    batch.set(cashRef, {
      ...entry,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  }

  await batch.commit();
}

/**
 * Automatically push a single completed order into Firestore
 */
export async function pushSingleOrder(order: Order): Promise<void> {
  try {
    const orderRef = doc(db, 'orders', order.id);
    await setDoc(orderRef, {
      ...order,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Background order cloud backup deferred:', err);
  }
}

/**
 * Restore data from Firebase Firestore
 */
export async function pullAllFromCloud(): Promise<Partial<CloudStoreData>> {
  const result: Partial<CloudStoreData> = {};

  try {
    // Orders
    const ordersSnap = await getDocs(collection(db, 'orders'));
    if (!ordersSnap.empty) {
      const pulledOrders: Order[] = [];
      ordersSnap.forEach((doc) => {
        pulledOrders.push(doc.data() as Order);
      });
      // Sort newest first
      pulledOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      result.orders = pulledOrders;
    }

    // Catalog
    const catalogSnap = await getDocs(collection(db, 'catalog'));
    if (!catalogSnap.empty) {
      const pulledCatalog: CatalogItem[] = [];
      catalogSnap.forEach((doc) => {
        pulledCatalog.push(doc.data() as CatalogItem);
      });
      result.catalog = pulledCatalog;
    }

    // Customers
    const customerSnap = await getDocs(collection(db, 'customers'));
    if (!customerSnap.empty) {
      const pulledCustomers: Customer[] = [];
      customerSnap.forEach((doc) => {
        pulledCustomers.push(doc.data() as Customer);
      });
      result.customers = pulledCustomers;
    }

    // Cash Entries
    const cashSnap = await getDocs(collection(db, 'cashEntries'));
    if (!cashSnap.empty) {
      const pulledCash: CashEntry[] = [];
      cashSnap.forEach((doc) => {
        pulledCash.push(doc.data() as CashEntry);
      });
      result.cashEntries = pulledCash;
    }

    // Settings
    const settingsDoc = await getDoc(doc(db, 'settings', 'store_config'));
    if (settingsDoc.exists()) {
      result.shopSettings = settingsDoc.data() as ShopSettings;
    }
  } catch (err) {
    console.error('Failed to pull from Firestore:', err);
    throw err;
  }

  return result;
}
