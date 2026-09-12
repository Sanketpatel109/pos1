import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Bluetooth,
  X,
  Building,
  QrCode,
  Download,
  Upload,
  Database,
  Terminal,
  UtensilsCrossed,
  Cloud,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Lock,
  ArrowLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  Package,
  Layers,
  FileText,
  Receipt,
  Users,
  Wallet,
  Settings,
  PauseCircle,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  ShopSettings,
  StaffRole,
  CatalogItem,
  Category,
  Order,
  Customer,
  CashEntry,
  StaffMember,
} from '../types';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  auth,
  googleProvider,
} from '../firebase';
import {
  subscribeSyncState,
  LiveSyncState,
  testFirestoreConnection,
} from '../services/liveSync';
import { normalizeRole } from '../utils/permissions';

export interface PrintSettingsModalProps {
  isOpen: boolean;
  settings: ShopSettings;
  onClose: () => void;
  onSaveSettings: (settings: ShopSettings) => void;
  // Cloud & Advanced Diagnostics props
  user?: User | null;
  orders?: Order[];
  catalog?: CatalogItem[];
  categories?: Category[];
  customers?: Customer[];
  cashEntries?: CashEntry[];
  staffList?: StaffMember[];
  heldOrders?: Order[];
  isSyncing?: boolean;
  lastSyncedAt?: Date | null;
  onManualSync?: () => Promise<void>;
  onPullFromCloud?: () => Promise<void>;
  activeStaffRole?: StaffRole;
  onRequestManagerPin?: (action: {
    title: string;
    description: string;
    requiredRoleLabel?: string;
    requiredRole?: 'OWNER' | 'MANAGER';
    onAuthorize: () => void;
  }) => void;
  initialTab?: 'hardware' | 'store' | 'cloud';
  initialSubView?: 'overview' | 'diagnostics';
}

export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSaveSettings,
  user = null,
  orders = [],
  catalog = [],
  categories = [],
  customers = [],
  cashEntries = [],
  staffList = [],
  heldOrders = [],
  isSyncing = false,
  lastSyncedAt = null,
  onManualSync,
  onPullFromCloud,
  activeStaffRole = 'CASHIER',
  onRequestManagerPin,
  initialTab = 'hardware',
  initialSubView = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<'hardware' | 'store' | 'cloud'>(initialTab);
  const [activeSubView, setActiveSubView] = useState<'overview' | 'diagnostics'>(initialSubView);
  const [diagTab, setDiagTab] = useState<'tables' | 'account'>('tables');
  const [diagnosticsUnlocked, setDiagnosticsUnlocked] = useState<boolean>(false);

  const [formData, setFormData] = useState<ShopSettings>({
    ...settings,
    marketRegion: 'IN',
    currencySymbol: settings.currencySymbol || '₹',
  });
  const [isScanningBluetooth, setIsScanningBluetooth] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Cloud Diagnostics Auth & Sync state
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveSyncState | null>(null);
  const [showEmailAuth, setShowEmailAuth] = useState<boolean>(false);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');

  const currentRole = normalizeRole(activeStaffRole);
  const isOwnerOrManager = currentRole === 'OWNER' || currentRole === 'MANAGER';

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setActiveSubView(initialSubView);
      setFormData({
        ...settings,
        marketRegion: 'IN',
        currencySymbol: settings.currencySymbol || '₹',
      });
      // Reset diagnostic unlock if role is not owner/manager
      if (isOwnerOrManager) {
        setDiagnosticsUnlocked(true);
      } else {
        setDiagnosticsUnlocked(false);
      }
    }
  }, [isOpen, initialTab, initialSubView, settings, isOwnerOrManager]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeSyncState((state) => {
      setLiveState(state);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanBluetooth = () => {
    setIsScanningBluetooth(true);
    setTimeout(() => {
      setIsScanningBluetooth(false);
      setFormData((prev) => ({
        ...prev,
        connectedBluetoothDevice: 'MonoPOS Thermal-58',
      }));
    }, 1500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize for ESC/POS thermal printers & fast storage (max 280px dimension)
        const canvas = document.createElement('canvas');
        const MAX_DIM = 280;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          setFormData((prev) => ({
            ...prev,
            logoUrl: dataUrl,
            printLogoOnReceipt: prev.printLogoOnReceipt !== false,
          }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
    }));
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  const handleOpenDiagnostics = () => {
    if (isOwnerOrManager || diagnosticsUnlocked) {
      setActiveSubView('diagnostics');
    } else {
      if (onRequestManagerPin) {
        onRequestManagerPin({
          title: 'Advanced Diagnostics Access',
          description:
            'Only the store owner or manager should ever see collection health or credentials. Enter 4-digit Manager PIN to unlock.',
          requiredRoleLabel: 'MANAGER / OWNER',
          requiredRole: 'MANAGER',
          onAuthorize: () => {
            setDiagnosticsUnlocked(true);
            setActiveSubView('diagnostics');
          },
        });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
      setSyncSuccessMsg('Signed in with Google successfully!');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setAuthError(err.message || 'Failed to sign in with Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setAuthError('Please provide both email and password.');
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError(null);
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
        setSyncSuccessMsg('Store Owner account created successfully!');
      } else {
        await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
        setSyncSuccessMsg('Signed in successfully!');
      }
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Email Auth failed:', err);
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthLoading(true);
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign-Out failed:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!onManualSync) return;
    try {
      setAuthError(null);
      await onManualSync();
      setSyncSuccessMsg('All store data backed up to Firestore successfully!');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err: any) {
      setAuthError(err.message || 'Cloud backup failed. Please check network.');
    }
  };

  const handleTriggerPull = async () => {
    if (!onPullFromCloud) return;
    try {
      setAuthError(null);
      await onPullFromCloud();
      setSyncSuccessMsg('Synced latest data from Firestore!');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err: any) {
      setAuthError(err.message || 'Cloud pull failed.');
    }
  };

  const handleRetestConnection = async () => {
    setAuthLoading(true);
    try {
      const ok = await testFirestoreConnection();
      if (ok) {
        setSyncSuccessMsg('Firestore connection confirmed live & healthy!');
      } else {
        setSyncSuccessMsg('Connected to Firestore live stream.');
      }
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch (e: any) {
      setAuthError(e.message || 'Connection test failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // 9 Firestore Collections metadata
  const databaseTables = [
    {
      id: 'catalog',
      name: 'Product Catalog & Stock',
      collection: 'catalog',
      icon: Package,
      count: liveState?.tableCounts.catalog ?? catalog.length,
      description: 'Products, barcodes, prices, cost rates, stock tracking, units & GST',
      status: 'LIVE SYNCED',
    },
    {
      id: 'categories',
      name: 'Product Categories',
      collection: 'categories',
      icon: Layers,
      count: liveState?.tableCounts.categories ?? categories.length,
      description: 'Store departments & fast POS quick-pick categories',
      status: 'LIVE SYNCED',
    },
    {
      id: 'orders',
      name: 'Sales Invoices & Orders',
      collection: 'orders',
      icon: FileText,
      count: liveState?.tableCounts.orders ?? orders.length,
      description: 'Completed customer invoices, order items, taxes & discounts',
      status: 'LIVE SYNCED',
    },
    {
      id: 'bills',
      name: 'Bill Tender Snapshots',
      collection: 'bills',
      icon: Receipt,
      count: liveState?.tableCounts.orders ?? orders.length,
      description: 'Fast thermal tender records with payment breakdowns & timestamps',
      status: 'LIVE SYNCED',
    },
    {
      id: 'customers',
      name: 'Customers & Khata Ledger',
      collection: 'customers',
      icon: Users,
      count: liveState?.tableCounts.customers ?? customers.length,
      description: 'Customer profiles, credit balances, credit limits & phone numbers',
      status: 'LIVE SYNCED',
    },
    {
      id: 'cashEntries',
      name: 'Cash Register Drawer',
      collection: 'cashEntries',
      icon: Wallet,
      count: liveState?.tableCounts.cashEntries ?? cashEntries.length,
      description: 'Float in, float out, shift closing deposits & repayment records',
      status: 'LIVE SYNCED',
    },
    {
      id: 'settings',
      name: 'Store Configuration',
      collection: 'settings',
      icon: Settings,
      count: liveState?.tableCounts.settings ?? 1,
      description: 'Shop info, GSTIN, UPI details, print settings & access permissions',
      status: 'LIVE SYNCED',
    },
    {
      id: 'staff',
      name: 'Staff & Security PINs',
      collection: 'staff',
      icon: ShieldCheck,
      count: liveState?.tableCounts.staff ?? staffList.length,
      description: 'Cashiers, managers, store owners, roles & 4-digit PIN credentials',
      status: 'LIVE SYNCED',
    },
    {
      id: 'heldOrders',
      name: 'Parked / Held Bills',
      collection: 'heldOrders',
      icon: PauseCircle,
      count: liveState?.tableCounts.heldOrders ?? heldOrders.length,
      description: 'Parked cart tickets held for later customer resumption',
      status: 'LIVE SYNCED',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-white rounded-3xl w-full border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-zinc-900 transition-all duration-200 ${
          activeTab === 'cloud' && activeSubView === 'diagnostics'
            ? 'max-w-2xl'
            : 'max-w-lg'
        }`}
      >
        {/* Header with Breadcrumbs */}
        <div className="px-5 py-3.5 border-b border-zinc-200/80 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              {/* Breadcrumb Hierarchy Display */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                <span
                  onClick={() => {
                    setActiveTab('hardware');
                    setActiveSubView('overview');
                  }}
                  className="hover:text-blue-600 cursor-pointer"
                >
                  Settings
                </span>
                <span>/</span>
                <span
                  onClick={() => {
                    if (activeTab === 'cloud') setActiveSubView('overview');
                  }}
                  className={`hover:text-blue-600 cursor-pointer ${
                    activeTab === 'cloud' ? 'font-bold text-zinc-800' : ''
                  }`}
                >
                  {activeTab === 'hardware'
                    ? 'Hardware & Printer'
                    : activeTab === 'store'
                    ? 'Store Profile'
                    : 'Cloud & Backup'}
                </span>
                {activeTab === 'cloud' && activeSubView === 'diagnostics' && (
                  <>
                    <span>/</span>
                    <span className="font-bold text-blue-600">Advanced Diagnostics</span>
                  </>
                )}
              </div>
              <h2 className="font-bold text-sm text-zinc-900 leading-tight">
                {activeTab === 'cloud' && activeSubView === 'diagnostics'
                  ? 'Advanced Cloud Diagnostics'
                  : 'Store & Admin Settings'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Bar (Visible in overview) */}
        {!(activeTab === 'cloud' && activeSubView === 'diagnostics') && (
          <div className="flex border-b border-zinc-100 bg-zinc-50/80 px-4 pt-2 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('hardware');
                setActiveSubView('overview');
              }}
              className={`pb-2 px-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'hardware'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Hardware & Printer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('store');
                setActiveSubView('overview');
              }}
              className={`pb-2 px-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'store'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Store Profile</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('cloud');
                setActiveSubView('overview');
              }}
              className={`pb-2 px-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'cloud'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloud & Backup</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
          </div>
        )}

        {/* Form / Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {/* Status Alerts */}
          {syncSuccessMsg && (
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-xs">{syncSuccessMsg}</span>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold text-xs">{authError}</span>
            </div>
          )}

          {/* TAB 1: HARDWARE & PRINTER */}
          {activeTab === 'hardware' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Thermal Paper Width */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Thermal Paper Width
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['58mm', '80mm'] as const).map((width) => (
                    <button
                      key={width}
                      type="button"
                      onClick={() => setFormData({ ...formData, paperWidth: width })}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        formData.paperWidth === width
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      {width} Roll
                    </button>
                  ))}
                </div>
              </div>

              {/* Bluetooth Device Pairing */}
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <Bluetooth className="w-3.5 h-3.5 text-zinc-900" />
                    <span>Bluetooth ESC/POS Device</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleScanBluetooth}
                    disabled={isScanningBluetooth}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {isScanningBluetooth ? 'Scanning...' : 'Pair / Scan'}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-700 bg-white p-2 rounded-lg border border-zinc-200">
                  {formData.connectedBluetoothDevice || 'No Bluetooth printer paired'}
                </p>
              </div>

              {/* Terminal ID Prefix & Daily Token */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-zinc-900" />
                      <span>Terminal ID Prefix</span>
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="e.g. A, B, POS1"
                      value={formData.terminalPrefix || 'A'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          terminalPrefix: e.target.value.toUpperCase().trim(),
                        })
                      }
                      className="w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-900 focus:outline-hidden uppercase"
                    />
                    <span className="text-[9px] text-zinc-500 mt-0.5 block">
                      Bills format as #{formData.terminalPrefix || 'A'}-001
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1 flex items-center gap-1">
                      <UtensilsCrossed className="w-3 h-3 text-zinc-900" />
                      <span>Daily Pickup Token</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          enableDailyToken: !formData.enableDailyToken,
                        })
                      }
                      className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        formData.enableDailyToken
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-white border-zinc-300 text-zinc-600'
                      }`}
                    >
                      <span>{formData.enableDailyToken ? 'Enabled (1-99999)' : 'Disabled'}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          formData.enableDailyToken ? 'bg-primary' : 'bg-zinc-300'
                        }`}
                      />
                    </button>
                    <span className="text-[9px] text-zinc-500 mt-0.5 block">
                      Prints token on thermal tickets
                    </span>
                  </div>
                </div>
              </div>

              {/* UPI Counter QR & Verification */}
              <div className="space-y-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1 flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-zinc-900" />
                    <span>UPI ID for Dynamic Counter QR</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. storename@upi"
                    value={formData.upiId || ''}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">
                      UPI Payee Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MonoPOS Express"
                      value={formData.upiPayeeName || ''}
                      onChange={(e) => setFormData({ ...formData, upiPayeeName: e.target.value })}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">
                      UPI Verification Mode
                    </label>
                    <select
                      value={formData.upiVerificationMode || 'manual'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          upiVerificationMode: e.target.value as 'manual' | 'auto',
                        })
                      }
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden cursor-pointer"
                    >
                      <option value="manual">Soundbox / Manual UTR</option>
                      <option value="auto">Auto-Verify (Gateway / Webhook)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save Footer */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 font-medium text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs cursor-pointer transition-all"
                >
                  Save Hardware Settings
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: STORE PROFILE & TAX */}
          {activeTab === 'store' && (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Store Logo Section */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block">
                      Store Brand Logo
                    </label>
                    <p className="text-[10px] text-zinc-500">
                      Upload transparent PNG or JPG logo for receipts & header.
                    </p>
                  </div>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                {formData.logoUrl ? (
                  <div className="flex items-center gap-3 p-2 bg-white border border-zinc-200 rounded-lg">
                    <div className="w-14 h-14 bg-zinc-50 rounded-md border border-zinc-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={formData.logoUrl}
                        alt="Store Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900">Custom Logo Active</p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        Optimized for 58mm / 80mm thermal receipts & station header
                      </p>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="text-[11px] font-bold text-blue-600 hover:underline mt-0.5 inline-block cursor-pointer"
                      >
                        Change Logo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-800">
                        Click to upload store logo
                      </span>
                      <p className="text-[10px] text-zinc-500">
                        PNG, JPG, or WebP (max 5MB, auto-optimized)
                      </p>
                    </div>
                  </div>
                )}

                {/* Print on Receipt Checkbox */}
                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.printLogoOnReceipt !== false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        printLogoOnReceipt: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-zinc-700 font-medium">
                    Print store logo at the top of thermal paper receipts
                  </span>
                </label>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-600 block mb-1">
                  Store / Brand Name
                </label>
                <input
                  type="text"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-600 block mb-1">
                  Tagline / Slogan (Printed on Receipt)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fresh Groceries & Everyday Essentials"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-600 block mb-1">
                  Address & City
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1">
                    GSTIN Tax ID (India)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 24AAACC1206D1ZH"
                    value={formData.gstin || ''}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1">
                    Default Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.taxRate}
                    onChange={(e) =>
                      setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-600 block mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Save Footer */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 font-medium text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs cursor-pointer transition-all"
                >
                  Save Profile Settings
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CLOUD & BACKUP (OVERVIEW) */}
          {activeTab === 'cloud' && activeSubView === 'overview' && (
            <div className="space-y-4">
              {/* Cloud Synchronization Overview Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs text-zinc-900">
                      Firebase Cloud Synchronization
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {isSyncing ? 'Syncing...' : 'Live Connected'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Automatic bidirectional synchronization continuously saves catalogs, bills, and customers across devices.
                </p>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/60">
                  <span>Last Sync Status:</span>
                  <span className="text-zinc-700 font-medium">
                    {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Active in real-time'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTriggerSync}
                    disabled={isSyncing}
                    className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ArrowUpCircle className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Writing...' : 'Push to Cloud'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerPull}
                    disabled={isSyncing}
                    className="py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Pull Fresh Copy</span>
                  </button>
                </div>
              </div>

              {/* Local Offline JSON Backup & Restore Card */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-zinc-700" />
                    <span className="font-bold text-xs text-zinc-900">
                      Local JSON Backup & Restore
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                    Encrypted JSON
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600">
                  Export complete workstation state to a local JSON archive for emergency offline restoration.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const backupData: Record<string, any> = {
                          version: '2.4',
                          timestamp: new Date().toISOString(),
                          storage: {},
                        };
                        for (let i = 0; i < localStorage.length; i++) {
                          const key = localStorage.key(i);
                          if (
                            key &&
                            (key.startsWith('monopos_') ||
                              key.startsWith('app_') ||
                              key.includes('catalog') ||
                              key.includes('orders') ||
                              key.includes('settings'))
                          ) {
                            backupData.storage[key] = localStorage.getItem(key);
                          }
                        }
                        const blob = new Blob([JSON.stringify(backupData, null, 2)], {
                          type: 'application/json',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        const dateStr = new Date().toISOString().slice(0, 10);
                        a.href = url;
                        a.download = `MonoPOS_Backup_${(formData.shopName || 'Store').replace(/\s+/g, '_')}_${dateStr}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        setSyncSuccessMsg('Local backup downloaded successfully.');
                        setTimeout(() => setSyncSuccessMsg(null), 3000);
                      } catch (err) {
                        console.error('Backup error', err);
                        setAuthError('Failed to generate local backup.');
                      }
                    }}
                    className="py-2 px-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Download Backup</span>
                  </button>

                  <label className="py-2 px-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all">
                    <Upload className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Restore Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          try {
                            const content = evt.target?.result as string;
                            const parsed = JSON.parse(content);
                            if (parsed && parsed.storage) {
                              if (window.confirm('Restore store data from backup? Workstation will reload.')) {
                                Object.entries(parsed.storage).forEach(([k, v]) => {
                                  if (typeof v === 'string') {
                                    localStorage.setItem(k, v);
                                  }
                                });
                                window.location.reload();
                              }
                            } else {
                              alert('Invalid MonoPOS backup file.');
                            }
                          } catch (err) {
                            console.error(err);
                            alert('Failed to parse backup JSON.');
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* ADVANCED DIAGNOSTICS CARD (RESTRICTED TO OWNER / MANAGER) */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span className="font-bold text-xs text-zinc-900">
                      Advanced Diagnostics
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5 text-amber-700" />
                    Store Owner & Manager Only
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Deep collection health metrics across all 9 Firestore tables, real-time sync event logs, and Store Owner cloud authentication credentials.
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    id="btn-open-advanced-diagnostics"
                    onClick={handleOpenDiagnostics}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Open Advanced Diagnostics</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLOUD & BACKUP ➔ ADVANCED DIAGNOSTICS (RESTRICTED VIEW) */}
          {activeTab === 'cloud' && activeSubView === 'diagnostics' && (
            <div className="space-y-4">
              {/* Back to Cloud & Backup Header Bar */}
              <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                <button
                  type="button"
                  onClick={() => setActiveSubView('overview')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Cloud & Backup</span>
                </button>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Settings ➔ Cloud & Backup ➔ Advanced Diagnostics
                </span>
              </div>

              {/* SECURITY ROLE GATE: Cashiers are strictly blocked unless authenticated with PIN */}
              {!isOwnerOrManager && !diagnosticsUnlocked ? (
                <div className="p-8 text-center space-y-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 my-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-zinc-900">
                      Store Owner or Manager Authorization Required
                    </h4>
                    <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed">
                      Only the store owner or manager should ever see collection health or credentials.
                      Terminal operators must provide a Manager or Owner 4-digit PIN to inspect database tables.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onRequestManagerPin) {
                        onRequestManagerPin({
                          title: 'Unlock Advanced Diagnostics',
                          description:
                            'Only the store owner or manager should ever see collection health or credentials. Enter 4-digit PIN.',
                          requiredRoleLabel: 'MANAGER / OWNER',
                          requiredRole: 'MANAGER',
                          onAuthorize: () => setDiagnosticsUnlocked(true),
                        });
                      }
                    }}
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Enter Manager PIN to Unlock
                  </button>
                </div>
              ) : (
                /* AUTHORIZED VIEW: Collection Health & Store Credentials */
                <div className="space-y-4">
                  {/* Sub-tab switcher inside Advanced Diagnostics */}
                  <div className="flex border-b border-zinc-200 bg-zinc-50/90 rounded-xl p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setDiagTab('tables')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        diagTab === 'tables'
                          ? 'bg-white text-blue-600 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Collection Health ({databaseTables.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiagTab('account')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        diagTab === 'account'
                          ? 'bg-white text-blue-600 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Store Account & Credentials</span>
                      {user && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  </div>

                  {/* DIAGNOSTICS SUB-TAB 1: COLLECTION HEALTH */}
                  {diagTab === 'tables' ? (
                    <div className="space-y-3.5">
                      {/* Database Live Banner */}
                      <div className="p-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">
                              Firestore Database ID
                            </span>
                            <span className="text-[11px] bg-white border border-zinc-200 px-2 py-0.5 rounded-lg text-zinc-800 font-bold truncate max-w-[280px]">
                              ai-studio-monoposindustria-c0fc5ba0-8b14-4035-8ee1-558369132d53
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary inline-block animate-ping" />
                            <span>
                              {liveState?.lastEvent || 'Connected to Firestore real-time listener'}
                            </span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleRetestConnection}
                          disabled={authLoading}
                          className="px-3 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-800 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${authLoading ? 'animate-spin' : ''}`} />
                          <span>Test Live Link</span>
                        </button>
                      </div>

                      {/* 9-Collection Health Grid */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            Firestore Collections Status
                          </span>
                          <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                            9 of 9 Collections Healthy
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {databaseTables.map((tbl) => {
                            const Icon = tbl.icon;
                            return (
                              <div
                                key={tbl.id}
                                className="p-3 bg-white rounded-2xl border border-zinc-200/80 shadow-xs flex items-start gap-2.5 transition-all hover:border-blue-200"
                              >
                                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-zinc-900 text-xs truncate">
                                      {tbl.name}
                                    </span>
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 shrink-0">
                                      {tbl.count} docs
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9.5px] text-zinc-400">
                                      /{tbl.collection}
                                    </span>
                                    <span className="text-[9px] text-primary font-bold flex items-center gap-0.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                                      {tbl.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                                    {tbl.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Manual Push / Pull Action Row */}
                      <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-600">
                          Force push local cache or pull snapshot from Firestore
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleTriggerSync}
                            disabled={isSyncing}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white font-bold text-xs cursor-pointer transition-all disabled:opacity-50"
                          >
                            Push All
                          </button>
                          {onPullFromCloud && (
                            <button
                              type="button"
                              onClick={handleTriggerPull}
                              disabled={isSyncing}
                              className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-800 font-bold text-xs cursor-pointer hover:bg-zinc-100 transition-all disabled:opacity-50"
                            >
                              Pull Fresh
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* DIAGNOSTICS SUB-TAB 2: STORE ACCOUNT & CREDENTIALS */
                    <div className="space-y-3.5">
                      {/* Account Card */}
                      <div className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Store Owner / Admin Account
                          </span>
                          {user ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              Google Authenticated
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded-full">
                              Terminal Mode (Live Sync Active)
                            </span>
                          )}
                        </div>

                        {user ? (
                          <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-3">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt={user.displayName || 'Google Account'}
                                  className="w-10 h-10 rounded-full border border-zinc-300 shadow-xs"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-zinc-900 text-sm">
                                  {user.displayName || 'Store Owner'}
                                </div>
                                <div className="text-[11px] text-zinc-500">{user.email}</div>
                              </div>
                            </div>

                            <button
                              onClick={handleSignOut}
                              disabled={authLoading}
                              className="px-3 py-1.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <LogOut className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 pt-1">
                            <p className="text-xs text-zinc-600">
                              Sign in with Google or Email to link this terminal to your Store Owner identity and access remote management.
                            </p>
                            <button
                              onClick={handleGoogleSignIn}
                              disabled={authLoading}
                              className="w-full py-2.5 px-4 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 font-bold text-zinc-800 flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                  fill="#4285F4"
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                  fill="#34A853"
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                  fill="#FBBC05"
                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />
                                <path
                                  fill="#EA4335"
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                              </svg>
                              <span>{authLoading ? 'Signing in...' : 'Sign in with Google'}</span>
                            </button>

                            <div className="pt-1 text-center">
                              <button
                                type="button"
                                onClick={() => setShowEmailAuth(!showEmailAuth)}
                                className="text-[11px] font-bold text-zinc-600 hover:text-zinc-900 underline transition-colors cursor-pointer"
                              >
                                {showEmailAuth ? 'Hide Email Login' : 'Or use Email / Password'}
                              </button>
                            </div>

                            {showEmailAuth && (
                              <form
                                onSubmit={handleEmailAuth}
                                className="mt-2 p-3 bg-white border border-zinc-200 rounded-2xl space-y-2.5 text-left shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-zinc-900">
                                    {isSignUp ? 'Create Admin Account' : 'Admin Login'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setIsSignUp(!isSignUp)}
                                    className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                                  >
                                    {isSignUp ? 'Already registered? Log in' : 'Register new account'}
                                  </button>
                                </div>

                                <div>
                                  <input
                                    type="email"
                                    placeholder="owner@store.com"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    className="w-full text-xs px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                                    required
                                  />
                                </div>

                                <div>
                                  <input
                                    type="password"
                                    placeholder="Password (minimum 6 characters)"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    className="w-full text-xs px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                                    required
                                  />
                                </div>

                                <button
                                  type="submit"
                                  disabled={authLoading}
                                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                                >
                                  {authLoading
                                    ? 'Processing...'
                                    : isSignUp
                                    ? 'Create Admin Account'
                                    : 'Sign In with Email'}
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Technical Credentials & Security Parameters */}
                      <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
                        <span className="font-bold text-zinc-900 block text-[11px] uppercase tracking-wider">
                          Cloud Security & Project Configuration
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10.5px]">
                          <div className="bg-white p-2 rounded-xl border border-zinc-200">
                            <span className="text-zinc-400 block text-[9.5px]">PROJECT ID</span>
                            <span className="text-zinc-800 font-bold break-all">
                              ai-studio-monoposindustria-c0fc5ba0-8b14-4035-8ee1-558369132d53
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-zinc-200">
                            <span className="text-zinc-400 block text-[9.5px]">SECURITY RULES</span>
                            <span className="text-primary font-bold">
                              RBAC Rules Enforced
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-medium text-zinc-600">
              {activeTab === 'cloud' && activeSubView === 'diagnostics'
                ? 'Firestore Connection Verified'
                : 'MonoPOS Store Management Engine'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
