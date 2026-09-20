import { ActiveScreen } from '../types';

export const SCREEN_ROUTES: Record<ActiveScreen, string> = {
  'item-wise': '/',
  'quick-bill': '/quick-bill',
  'reports': '/reports',
  'analytics': '/analytics',
  'categories-products': '/inventory',
  'customers': '/customers',
  'credit-ledger': '/khata',
  'cash-management': '/cash-drawer',
  'staff-management': '/staff',
  'print-settings': '/settings',
  'training-videos': '/training',
  'barcode-generator': '/barcode-generator',
  'purchase-inward': '/purchase-inward',
};

// Aliases for user-friendly navigation and backward compatibility
export const ROUTE_ALIASES: Record<string, ActiveScreen> = {
  // Billing
  '/': 'item-wise',
  '/pos': 'item-wise',
  '/billing': 'item-wise',
  '/item-wise': 'item-wise',
  'item-wise': 'item-wise',
  'pos': 'item-wise',
  'billing': 'item-wise',

  // Quick Bill
  '/quick-bill': 'quick-bill',
  '/quick': 'quick-bill',
  'quick-bill': 'quick-bill',
  'quick': 'quick-bill',

  // Reports
  '/reports': 'reports',
  '/sales-reports': 'reports',
  'reports': 'reports',
  'sales-reports': 'reports',

  // Analytics
  '/analytics': 'analytics',
  '/insights': 'analytics',
  'analytics': 'analytics',
  'insights': 'analytics',

  // Catalog / Products / Inventory
  '/inventory': 'categories-products',
  '/catalog': 'categories-products',
  '/products': 'categories-products',
  '/categories-products': 'categories-products',
  'inventory': 'categories-products',
  'catalog': 'categories-products',
  'products': 'categories-products',
  'categories-products': 'categories-products',

  // Customers & Khata
  '/customers': 'customers',
  '/customer-credit': 'customers',
  'customers': 'customers',
  'customer-credit': 'customers',
  '/khata': 'credit-ledger',
  '/credit-ledger': 'credit-ledger',
  'khata': 'credit-ledger',
  'credit-ledger': 'credit-ledger',

  // Cash Drawer
  '/cash': 'cash-management',
  '/cash-drawer': 'cash-management',
  '/cash-management': 'cash-management',
  'cash': 'cash-management',
  'cash-drawer': 'cash-management',
  'cash-management': 'cash-management',

  // Staff Management
  '/staff': 'staff-management',
  '/staff-management': 'staff-management',
  '/team': 'staff-management',
  'staff': 'staff-management',
  'staff-management': 'staff-management',

  // Settings
  '/settings': 'print-settings',
  '/print-settings': 'print-settings',
  'settings': 'print-settings',
  'print-settings': 'print-settings',

  // Barcode
  '/barcode-generator': 'barcode-generator',
  'barcode-generator': 'barcode-generator',

  // Training
  '/training': 'training-videos',
  '/training-videos': 'training-videos',
  'training': 'training-videos',
  'training-videos': 'training-videos',

  // Purchase Inward
  '/purchase-inward': 'purchase-inward',
  '/stock-inward': 'purchase-inward',
  'purchase-inward': 'purchase-inward',
  'stock-inward': 'purchase-inward',
};

export const MODAL_SCREENS: ActiveScreen[] = [
  'print-settings',
  'training-videos',
  'barcode-generator',
  'purchase-inward',
];

export function isModalScreen(screen: ActiveScreen): boolean {
  return MODAL_SCREENS.includes(screen);
}

export function normalizeScreen(input?: string | null): ActiveScreen | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();
  if (ROUTE_ALIASES[clean]) return ROUTE_ALIASES[clean];
  const withoutSlash = clean.startsWith('/') ? clean.slice(1) : clean;
  if (ROUTE_ALIASES[withoutSlash]) return ROUTE_ALIASES[withoutSlash];
  return null;
}

export interface ResolvedStage {
  activeScreen: ActiveScreen;
  initialModal?: 'print-settings' | 'training-videos' | 'barcode-generator' | 'purchase-inward' | null;
  settingsTab?: 'hardware' | 'store' | 'cloud' | 'subscription';
}

export function resolveInitialStage(): ResolvedStage {
  if (typeof window === 'undefined') {
    return { activeScreen: 'item-wise' };
  }

  // Skip if admin route
  if (window.location.pathname.startsWith('/admin')) {
    return { activeScreen: 'item-wise' };
  }

  // Parse query params (e.g. ?tab=subscription or ?screen=reports)
  let queryTab: 'hardware' | 'store' | 'cloud' | 'subscription' | undefined;
  let fromQuery: ActiveScreen | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'hardware' || t === 'store' || t === 'cloud' || t === 'subscription') {
      queryTab = t;
    }
    const s = params.get('screen') || params.get('page');
    if (s) {
      fromQuery = normalizeScreen(s);
    }
  } catch {}

  // 1. Direct pathname
  const pathname = window.location.pathname.toLowerCase();
  let matchedScreen: ActiveScreen | null = null;
  if (pathname && pathname !== '/') {
    matchedScreen = normalizeScreen(pathname);
  }

  // 2. Hash (#/staff, etc.)
  if (!matchedScreen) {
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    if (hash) {
      matchedScreen = normalizeScreen(hash);
    }
  }

  // 3. Query string
  if (!matchedScreen && fromQuery) {
    matchedScreen = fromQuery;
  }

  // 4. Session / LocalStorage fallback
  if (!matchedScreen) {
    try {
      const saved = sessionStorage.getItem('monopos_active_screen') || localStorage.getItem('monopos_active_screen');
      if (saved) {
        matchedScreen = normalizeScreen(saved);
      }
    } catch {}
  }

  const target = matchedScreen || 'item-wise';

  // Handle modal-based screens vs full-page screens
  if (isModalScreen(target)) {
    let underlyingScreen: ActiveScreen = 'item-wise';
    try {
      const savedUnderlying = sessionStorage.getItem('monopos_underlying_screen') || localStorage.getItem('monopos_underlying_screen');
      if (savedUnderlying) {
        const parsed = normalizeScreen(savedUnderlying);
        if (parsed && !isModalScreen(parsed)) {
          underlyingScreen = parsed;
        }
      }
    } catch {}

    return {
      activeScreen: underlyingScreen,
      initialModal: target as any,
      settingsTab: queryTab,
    };
  }

  return {
    activeScreen: target,
    settingsTab: queryTab,
  };
}

export function syncScreenToUrl(screen: ActiveScreen, options?: { replace?: boolean; modalClosed?: boolean }) {
  if (typeof window === 'undefined') return;

  try {
    if (!isModalScreen(screen)) {
      sessionStorage.setItem('monopos_underlying_screen', screen);
      localStorage.setItem('monopos_underlying_screen', screen);
    }
    sessionStorage.setItem('monopos_active_screen', screen);
    localStorage.setItem('monopos_active_screen', screen);

    if (window.location.pathname.startsWith('/admin')) return;

    const targetPath = SCREEN_ROUTES[screen] || (screen === 'item-wise' ? '/' : `/${screen}`);
    const currentPath = window.location.pathname;

    if (currentPath !== targetPath) {
      if (options?.replace) {
        window.history.replaceState({ screen }, '', targetPath);
      } else {
        window.history.pushState({ screen }, '', targetPath);
      }
    }
  } catch (err) {
    console.warn('Failed to sync screen to URL:', err);
  }
}
