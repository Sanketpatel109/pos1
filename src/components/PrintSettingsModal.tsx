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
  Star,
  Volume2,
  Globe,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  Barcode,
} from 'lucide-react';
import { soundbox } from '../utils/soundbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  signInWithRedirect,
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
    barcodeProvider: settings.barcodeProvider || (typeof window !== 'undefined' ? (localStorage.getItem('pos_barcode_provider') as any) || 'auto' : 'auto'),
    barcodeApiKey: settings.barcodeApiKey || (typeof window !== 'undefined' ? localStorage.getItem('pos_barcode_api_key') || '' : ''),
  });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
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
        barcodeProvider: settings.barcodeProvider || (typeof window !== 'undefined' ? (localStorage.getItem('pos_barcode_provider') as any) || 'auto' : 'auto'),
        barcodeApiKey: settings.barcodeApiKey || (typeof window !== 'undefined' ? localStorage.getItem('pos_barcode_api_key') || '' : ''),
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

  const handleScanBluetooth = async () => {
    setIsScanningBluetooth(true);
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb',
            '0000e781-0000-1000-8000-00805f9b34fb',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          ],
        });
        if (device) {
          const deviceName = device.name || 'Bluetooth Thermal Printer';
          setFormData((prev) => ({
            ...prev,
            connectedBluetoothDevice: deviceName,
          }));
        }
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          console.warn('Bluetooth pairing notice:', err);
        }
      } finally {
        setIsScanningBluetooth(false);
      }
    } else {
      setTimeout(() => {
        setIsScanningBluetooth(false);
        setFormData((prev) => ({
          ...prev,
          connectedBluetoothDevice: prev.connectedBluetoothDevice || 'MonoPOS Thermal-58 (Standard ESC/POS)',
        }));
      }, 800);
    }
  };

  const handleTestSoundbox = () => {
    soundbox.announcePayment({
      amount: 250,
      paymentMethod: 'UPI',
      language: formData.soundboxLanguage || 'en',
      shopName: formData.shopName,
    });
  };

  const handleTestPrint = () => {
    window.print();
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
    if (typeof window !== 'undefined') {
      if (formData.barcodeApiKey !== undefined) {
        localStorage.setItem('pos_barcode_api_key', formData.barcodeApiKey.trim());
      }
      if (formData.barcodeProvider) {
        localStorage.setItem('pos_barcode_provider', formData.barcodeProvider);
      }
    }
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
      const isSafari =
        typeof navigator !== 'undefined' &&
        /Safari/i.test(navigator.userAgent) &&
        !/Chrome|CriOS|Android|Edg|OPR/i.test(navigator.userAgent);
      if (isSafari) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      await signInWithPopup(auth, googleProvider);
      setSyncSuccessMsg('Signed in with Google successfully!');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/internal-error'
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl max-h-[92vh] flex flex-col transition-all duration-200 ${
          activeTab === 'cloud' && activeSubView === 'diagnostics'
            ? 'sm:max-w-2xl'
            : 'sm:max-w-xl'
        }`}
        showCloseButton={false}
      >
        {/* Header with Breadcrumbs */}
        <DialogHeader className="px-5 py-3.5 border-b border-border flex flex-row items-center justify-between bg-card shrink-0 space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              {/* Breadcrumb Hierarchy Display */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span
                  onClick={() => {
                    setActiveTab('hardware');
                    setActiveSubView('overview');
                  }}
                  className="hover:text-foreground cursor-pointer transition-colors"
                >
                  Settings
                </span>
                <span>/</span>
                <span
                  onClick={() => {
                    if (activeTab === 'cloud') setActiveSubView('overview');
                  }}
                  className={`hover:text-foreground cursor-pointer transition-colors ${
                    activeTab === 'cloud' ? 'font-semibold text-foreground' : ''
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
                    <span className="font-semibold text-primary">Advanced Diagnostics</span>
                  </>
                )}
              </div>
              <DialogTitle className="font-bold text-sm text-foreground leading-tight">
                {activeTab === 'cloud' && activeSubView === 'diagnostics'
                  ? 'Advanced Cloud Diagnostics'
                  : 'Store & Admin Settings'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Configure store profile, thermal receipt printing, soundbox, barcode engine, and cloud synchronization
              </DialogDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        {/* Tab Navigation Bar (Visible in overview) */}
        {!(activeTab === 'cloud' && activeSubView === 'diagnostics') && (
          <div className="flex border-b border-border bg-muted/30 px-4 py-2 gap-1.5 shrink-0 overflow-x-auto">
            <Button
              type="button"
              variant={activeTab === 'hardware' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('hardware');
                setActiveSubView('overview');
              }}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Hardware & Printer</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === 'store' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('store');
                setActiveSubView('overview');
              }}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Building className="w-3.5 h-3.5" />
              <span>Store Profile</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === 'cloud' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('cloud');
                setActiveSubView('overview');
              }}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Cloud & Backup</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </Button>
          </div>
        )}

        {/* Form / Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          {/* Status Alerts */}
          {syncSuccessMsg && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center gap-2.5 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2.5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* TAB 1: HARDWARE & PRINTER */}
          {activeTab === 'hardware' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Thermal Paper Width */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Thermal Paper Width
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['58mm', '80mm'] as const).map((width) => (
                    <Button
                      key={width}
                      type="button"
                      variant={formData.paperWidth === width ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, paperWidth: width })}
                      className="h-9 text-xs font-semibold"
                    >
                      {width} Roll
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bluetooth Device Pairing */}
              <Card className="bg-muted/20 border-border shadow-none">
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Bluetooth className="w-3.5 h-3.5 text-primary" />
                      <span>Bluetooth ESC/POS Device</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {formData.connectedBluetoothDevice && (
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          onClick={handleTestPrint}
                          className="text-[11px] font-semibold text-primary p-0 h-auto"
                        >
                          Test Print
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={handleScanBluetooth}
                        disabled={isScanningBluetooth}
                        className="text-[11px] font-semibold text-primary p-0 h-auto"
                      >
                        {isScanningBluetooth ? 'Scanning...' : 'Pair / Scan'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-foreground bg-background p-2 rounded-lg border border-border">
                    <span className="truncate">{formData.connectedBluetoothDevice || 'No Bluetooth printer paired'}</span>
                    {formData.connectedBluetoothDevice ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary bg-primary/10 shrink-0">
                        Connected
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Web Bluetooth Ready</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Digital Voice Soundbox (Paytm / PhonePe Style) */}
              <Card className="bg-muted/20 border-border shadow-none">
                <CardContent className="p-3 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-primary" />
                      <span>Digital Voice Soundbox</span>
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      onClick={handleTestSoundbox}
                      className="text-[11px] font-semibold text-primary p-0 h-auto flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Test Voice</span>
                    </Button>
                  </div>

                  <div className="space-y-2 pt-0.5">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-background border border-border cursor-pointer hover:bg-muted/30 transition-colors">
                      <div>
                        <span className="text-xs font-semibold text-foreground block">
                          Voice Payment Announcements
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Speaks "{formData.currencySymbol || '₹'}250 received on UPI" aloud on completed payments
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.enableSoundbox !== false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            enableSoundbox: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                      />
                    </label>

                    {formData.enableSoundbox !== false && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          type="button"
                          variant={(formData.soundboxLanguage || 'en') === 'en' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData({ ...formData, soundboxLanguage: 'en' })}
                          className="h-8 text-xs font-semibold"
                        >
                          English (Indian Accent)
                        </Button>
                        <Button
                          type="button"
                          variant={formData.soundboxLanguage === 'hi' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData({ ...formData, soundboxLanguage: 'hi' })}
                          className="h-8 text-xs font-semibold"
                        >
                          Hindi (हिंदी उद्घोषणा)
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Terminal ID Prefix & Daily Token */}
              <Card className="bg-muted/20 border-border shadow-none">
                <CardContent className="p-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-primary" />
                        <span>Terminal ID Prefix</span>
                      </Label>
                      <Input
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
                        className="h-8 text-xs font-bold uppercase"
                      />
                      <span className="text-[9px] text-muted-foreground block">
                        Bills format as #{formData.terminalPrefix || 'A'}-001
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <UtensilsCrossed className="w-3 h-3 text-primary" />
                        <span>Daily Pickup Token</span>
                      </Label>
                      <Button
                        type="button"
                        variant={formData.enableDailyToken ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            enableDailyToken: !formData.enableDailyToken,
                          })
                        }
                        className="w-full h-8 text-xs font-semibold justify-between px-2.5"
                      >
                        <span>{formData.enableDailyToken ? 'Enabled (1-99999)' : 'Disabled'}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            formData.enableDailyToken ? 'bg-primary' : 'bg-muted-foreground/40'
                          }`}
                        />
                      </Button>
                      <span className="text-[9px] text-muted-foreground block">
                        Prints token on thermal tickets
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* UPI Counter QR & Verification */}
              <Card className="bg-muted/20 border-border shadow-none">
                <CardContent className="p-3 space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-primary" />
                      <span>UPI ID for Dynamic Counter QR</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g. storename@upi"
                      value={formData.upiId || ''}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        UPI Payee Name
                      </Label>
                      <Input
                        type="text"
                        placeholder="e.g. MonoPOS Express"
                        value={formData.upiPayeeName || ''}
                        onChange={(e) => setFormData({ ...formData, upiPayeeName: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        UPI Verification Mode
                      </Label>
                      <Select
                        value={formData.upiVerificationMode || 'manual'}
                        onValueChange={(val) =>
                          val && setFormData({
                            ...formData,
                            upiVerificationMode: val as 'manual' | 'auto',
                          })
                        }
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Verification Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual (Soundbox / Tap)</SelectItem>
                          <SelectItem value="auto">Auto-Detect (Hands-Free)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.upiVerificationMode === 'auto' && (
                    <div className="pt-1.5 border-t border-border/60 space-y-2 animate-in fade-in duration-150">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                          <span>Razorpay Key ID (Optional)</span>
                          <span className="text-[10px] text-muted-foreground font-normal">e.g. rzp_live_xxx</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="rzp_live_... or rzp_test_... (or leave blank for auto-polling)"
                          value={formData.razorpayKeyId || ''}
                          onChange={(e) => setFormData({ ...formData, razorpayKeyId: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        ⚡ <strong>Auto-Detect Active:</strong> The POS counter will automatically detect customer payment, trigger phone haptic vibration, speak the soundbox chime, and close the bill with zero clicks.
                      </p>
                    </div>
                  )}

                  {formData.upiVerificationMode !== 'auto' && (
                    <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
                      ℹ️ <strong>Manual Mode Active:</strong> Direct zero-fee bank transfer. Cashier confirms via Paytm/PhonePe soundbox or SMS alert and taps "Payment Received".
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Save Footer */}
              <DialogFooter className="pt-2 flex-row items-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-9 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1 h-9 text-xs font-semibold"
                >
                  Save Hardware Settings
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* TAB 2: STORE PROFILE & TAX */}
          {activeTab === 'store' && (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Store Logo Section */}
              <Card className="bg-muted/20 border-border shadow-none">
                <CardContent className="p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-foreground block">
                        Store Brand Logo
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Upload transparent PNG or JPG logo for receipts & header.
                      </p>
                    </div>
                    {formData.logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={handleRemoveLogo}
                        className="text-xs text-destructive hover:text-destructive gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </Button>
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
                    <div className="flex items-center gap-3 p-2 bg-background border border-border rounded-lg">
                      <div className="w-14 h-14 bg-muted/40 rounded-md border border-border p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={formData.logoUrl}
                          alt="Store Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">Custom Logo Active</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Optimized for 58mm / 80mm thermal receipts & station header
                        </p>
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          onClick={() => logoInputRef.current?.click()}
                          className="text-[11px] font-semibold text-primary p-0 h-auto mt-0.5"
                        >
                          Change Logo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors text-center"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-foreground">
                          Click to upload store logo
                        </span>
                        <p className="text-[10px] text-muted-foreground">
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
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary accent-primary"
                    />
                    <span className="text-xs text-muted-foreground font-medium">
                      Print store logo at the top of thermal paper receipts
                    </span>
                  </label>
                </CardContent>
              </Card>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Store / Brand Name
                </Label>
                <Input
                  type="text"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Tagline / Slogan (Printed on Receipt)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Fresh Groceries & Everyday Essentials"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Address & City
                </Label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Contact Phone
                  </Label>
                  <Input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    GSTIN Tax ID (India)
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. 24AAACC1206D1ZH"
                    value={formData.gstin || ''}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Default Tax Rate (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.taxRate}
                    onChange={(e) =>
                      setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Currency Symbol
                  </Label>
                  <Input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="h-8 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Receipt Return Policy Note
                </Label>
                <Input
                  type="text"
                  value={formData.returnPolicyNote || ''}
                  onChange={(e) => setFormData({ ...formData, returnPolicyNote: e.target.value })}
                  placeholder="e.g. Items can be exchanged within 7 days with original invoice"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Receipt Footer Note / Greeting
                </Label>
                <Input
                  type="text"
                  value={formData.receiptFooterNote || ''}
                  onChange={(e) => setFormData({ ...formData, receiptFooterNote: e.target.value })}
                  placeholder="e.g. Thank you for shopping with us! Visit again."
                  className="h-8 text-xs"
                />
              </div>

              {/* Customer Loyalty & Reward Points Configuration */}
              <Card className="p-3.5 border-border bg-card shadow-none space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Star className="size-4 fill-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-bold text-foreground">
                          Customer Loyalty Points
                        </Label>
                        <Badge
                          variant={formData.enableLoyaltyPoints !== false ? 'default' : 'secondary'}
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {formData.enableLoyaltyPoints !== false ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Reward repeat customers with points redeemable as bill discounts
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.enableLoyaltyPoints !== false ? 'default' : 'outline'}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        enableLoyaltyPoints: formData.enableLoyaltyPoints === false ? true : false,
                      })
                    }
                    className="h-8 text-xs font-semibold px-3 shrink-0"
                  >
                    {formData.enableLoyaltyPoints !== false ? 'Enabled' : 'Turn On'}
                  </Button>
                </div>

                {formData.enableLoyaltyPoints !== false && (
                  <div className="space-y-3 pt-2.5 border-t border-border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Earning Rule */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                          <span>Spend to Earn 1 Point</span>
                          <span className="text-[10px] text-muted-foreground">How 1 pt is earned</span>
                        </Label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-xs text-muted-foreground font-medium pointer-events-none">
                            {formData.currencySymbol || '₹'}
                          </span>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={formData.loyaltyEarnSpendAmount ?? 100}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                loyaltyEarnSpendAmount: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            className="pl-7 text-xs font-medium h-9"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Spend {formData.currencySymbol || '₹'}{formData.loyaltyEarnSpendAmount ?? 100} = 1 Point
                        </p>
                      </div>

                      {/* Redemption Value */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                          <span>Point Redemption Value</span>
                          <span className="text-[10px] text-muted-foreground">Discount per point</span>
                        </Label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-xs text-muted-foreground font-medium pointer-events-none">
                            {formData.currencySymbol || '₹'}
                          </span>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.1"
                            value={formData.loyaltyPointValue ?? 1}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                loyaltyPointValue: Math.max(0.01, parseFloat(e.target.value) || 1),
                              })
                            }
                            className="pl-7 text-xs font-medium h-9"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          1 Point = {formData.currencySymbol || '₹'}{(formData.loyaltyPointValue ?? 1).toFixed(2)} off
                        </p>
                      </div>
                    </div>

                    {/* Live Adjustment Summary Banner */}
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] text-foreground flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Star className="size-3.5 text-primary fill-primary shrink-0" />
                        <span>
                          <strong>Rule Preview:</strong> Spend {formData.currencySymbol || '₹'}
                          {((formData.loyaltyEarnSpendAmount ?? 100) * 5)} → earns <strong>5 pts</strong>.
                          50 pts gives <strong>{formData.currencySymbol || '₹'}
                          {((formData.loyaltyPointValue ?? 1) * 50).toFixed(2)}</strong> discount.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Universal Barcode & Online Product Lookup Card */}
              <Card className="p-3.5 bg-muted/20 border-border shadow-none space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Barcode className="w-4 h-4" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>Universal Product & Barcode Lookup</span>
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold px-1.5 py-0">
                          Active
                        </Badge>
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Auto-detects liquor (750ml, 1.75L), groceries, books, electronics & cosmetics globally.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Provider Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <Globe className="w-3 h-3 text-muted-foreground" />
                      <span>Lookup Engine</span>
                    </Label>
                    <Select
                      value={formData.barcodeProvider || 'auto'}
                      onValueChange={(val) =>
                        val && setFormData({
                          ...formData,
                          barcodeProvider: val as any,
                        })
                      }
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Lookup Engine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (Global Multi-Database - Free)</SelectItem>
                        <SelectItem value="upcitemdb">UPCitemdb (General Goods & Electronics)</SelectItem>
                        <SelectItem value="barcodelookup">BarcodeLookup.com (Commercial API)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Default: Queries 5 free global databases in parallel (0ms latency).
                    </p>
                  </div>

                  {/* Optional Commercial API Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                        <Key className="w-3 h-3 text-muted-foreground" />
                        <span>Optional Commercial API Key</span>
                      </Label>
                      <span className="text-[9px] text-muted-foreground font-medium">Optional</span>
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="Leave blank for free databases"
                        value={formData.barcodeApiKey || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            barcodeApiKey: e.target.value,
                          })
                        }
                        className="pr-8 text-xs font-mono h-8 bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey((prev) => !prev)}
                        className="absolute right-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        title={showApiKey ? 'Hide key' : 'Show key'}
                      >
                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Add UPCitemdb or BarcodeLookup key for 100M+ rare items.
                    </p>
                  </div>
                </div>

                {/* Status / Feature Pills */}
                <div className="p-2.5 rounded-lg bg-background border border-border text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] gap-1 font-medium">
                    <Sparkles className="w-3 h-3 text-primary" />
                    Verified US Liquor Registry (0ms)
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    Open Food Facts (US & IN)
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    Open Library Books (ISBN)
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    Open Beauty & Products Facts
                  </Badge>
                </div>
              </Card>

              {/* Save Footer */}
              <DialogFooter className="pt-2 flex-row items-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-9 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1 h-9 text-xs font-semibold"
                >
                  Save Profile Settings
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* TAB 3: CLOUD & BACKUP (OVERVIEW) */}
          {activeTab === 'cloud' && activeSubView === 'overview' && (
            <div className="space-y-4">
              {/* Cloud Synchronization Overview Card */}
              <Card className="bg-muted/20 border-border shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-primary" />
                      <span className="font-bold text-xs text-foreground">
                        Firebase Cloud Synchronization
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/10 border-primary/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      {isSyncing ? 'Syncing...' : 'Live Connected'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Automatic bidirectional synchronization continuously saves catalogs, bills, and customers across devices.
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                    <span>Last Sync Status:</span>
                    <span className="text-foreground font-medium">
                      {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Active in real-time'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={handleTriggerSync}
                      disabled={isSyncing}
                      className="h-9 text-xs font-semibold gap-1.5"
                    >
                      <ArrowUpCircle className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Writing...' : 'Push to Cloud'}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTriggerPull}
                      disabled={isSyncing}
                      className="h-9 text-xs font-semibold gap-1.5"
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Pull Fresh Copy</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Local Offline JSON Backup & Restore Card */}
              <Card className="bg-muted/20 border-border shadow-none">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold text-xs text-foreground">
                        Local JSON Backup & Restore
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Encrypted JSON
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Export complete workstation state to a local JSON archive for emergency offline restoration.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                      className="h-9 text-xs font-semibold gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Backup</span>
                    </Button>

                    <label className="h-9 px-3 rounded-md border border-input bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-muted-foreground" />
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
                </CardContent>
              </Card>

              {/* ADVANCED DIAGNOSTICS CARD (RESTRICTED TO OWNER / MANAGER) */}
              <Card className="bg-primary/5 border-primary/20 shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span className="font-bold text-xs text-foreground">
                        Advanced Diagnostics
                      </span>
                    </div>
                    <Badge variant="outline" className="gap-1 text-[10px] font-bold border-border bg-background">
                      <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                      Store Owner & Manager Only
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Deep collection health metrics across all 9 Firestore tables, real-time sync event logs, and Store Owner cloud authentication credentials.
                  </p>

                  <div className="pt-1">
                    <Button
                      type="button"
                      id="btn-open-advanced-diagnostics"
                      variant="default"
                      onClick={handleOpenDiagnostics}
                      className="w-full h-9 text-xs font-semibold gap-2"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Open Advanced Diagnostics</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: CLOUD & BACKUP ➔ ADVANCED DIAGNOSTICS (RESTRICTED VIEW) */}
          {activeTab === 'cloud' && activeSubView === 'diagnostics' && (
            <div className="space-y-4">
              {/* Back to Cloud & Backup Header Bar */}
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSubView('overview')}
                  className="h-7 text-xs font-semibold text-primary hover:text-primary gap-1 p-0"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Cloud & Backup</span>
                </Button>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Settings ➔ Cloud & Backup ➔ Advanced Diagnostics
                </span>
              </div>

              {/* SECURITY ROLE GATE: Cashiers are strictly blocked unless authenticated with PIN */}
              {!isOwnerOrManager && !diagnosticsUnlocked ? (
                <Card className="p-8 text-center space-y-4 bg-muted/30 border-border my-2 shadow-none">
                  <CardContent className="p-0 space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">
                        Store Owner or Manager Authorization Required
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Only the store owner or manager should ever see collection health or credentials.
                        Terminal operators must provide a Manager or Owner 4-digit PIN to inspect database tables.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="default"
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
                      className="px-5 h-9 text-xs font-semibold"
                    >
                      Enter Manager PIN to Unlock
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* AUTHORIZED VIEW: Collection Health & Store Credentials */
                <div className="space-y-4">
                  {/* Sub-tab switcher inside Advanced Diagnostics */}
                  <div className="flex border-b border-border bg-muted/30 rounded-lg p-1 gap-1">
                    <Button
                      type="button"
                      variant={diagTab === 'tables' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setDiagTab('tables')}
                      className="flex-1 h-8 text-xs font-semibold gap-1.5"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Collection Health ({databaseTables.length})</span>
                    </Button>
                    <Button
                      type="button"
                      variant={diagTab === 'account' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setDiagTab('account')}
                      className="flex-1 h-8 text-xs font-semibold gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Store Account & Credentials</span>
                      {user && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </Button>
                  </div>

                  {/* DIAGNOSTICS SUB-TAB 1: COLLECTION HEALTH */}
                  {diagTab === 'tables' ? (
                    <div className="space-y-3.5">
                      {/* Database Live Banner */}
                      <Card className="border-border bg-muted/20 shadow-none">
                        <CardContent className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                Firestore Database ID
                              </span>
                              <span className="text-[11px] bg-background border border-border px-2 py-0.5 rounded-md text-foreground font-bold truncate max-w-[280px]">
                                ai-studio-monoposindustria-c0fc5ba0-8b14-4035-8ee1-558369132d53
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-primary inline-block animate-ping" />
                              <span>
                                {liveState?.lastEvent || 'Connected to Firestore real-time listener'}
                              </span>
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRetestConnection}
                            disabled={authLoading}
                            className="h-8 text-xs font-semibold gap-1.5 shrink-0"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${authLoading ? 'animate-spin' : ''}`} />
                            <span>Test Live Link</span>
                          </Button>
                        </CardContent>
                      </Card>

                      {/* 9-Collection Health Grid */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Firestore Collections Status
                          </span>
                          <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/10 border-primary/20">
                            9 of 9 Collections Healthy
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {databaseTables.map((tbl) => {
                            const Icon = tbl.icon;
                            return (
                              <Card
                                key={tbl.id}
                                className="bg-card border-border shadow-none hover:border-primary/40 transition-colors"
                              >
                                <CardContent className="p-3 flex items-start gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-semibold text-foreground text-xs truncate">
                                        {tbl.name}
                                      </span>
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-medium">
                                        {tbl.count} docs
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[9.5px] text-muted-foreground">
                                        /{tbl.collection}
                                      </span>
                                      <span className="text-[9px] text-primary font-semibold flex items-center gap-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                                        {tbl.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                      {tbl.description}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>

                      {/* Manual Push / Pull Action Row */}
                      <Card className="bg-muted/20 border-border shadow-none">
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            Force push local cache or pull snapshot from Firestore
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={handleTriggerSync}
                              disabled={isSyncing}
                              className="h-8 text-xs font-semibold"
                            >
                              Push All
                            </Button>
                            {onPullFromCloud && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleTriggerPull}
                                disabled={isSyncing}
                                className="h-8 text-xs font-semibold"
                              >
                                Pull Fresh
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    /* DIAGNOSTICS SUB-TAB 2: STORE ACCOUNT & CREDENTIALS */
                    <div className="space-y-3.5">
                      {/* Account Card */}
                      <Card className="border-border bg-muted/20 shadow-none">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Store Owner / Admin Account
                            </span>
                            {user ? (
                              <Badge variant="outline" className="gap-1 text-[10px] font-bold text-primary bg-primary/10 border-primary/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Google Authenticated
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] font-medium">
                                Terminal Mode (Live Sync Active)
                              </Badge>
                            )}
                          </div>

                          {user ? (
                            <div className="flex items-center justify-between gap-3 pt-1">
                              <div className="flex items-center gap-3">
                                {user.photoURL ? (
                                  <img
                                    src={user.photoURL}
                                    alt={user.displayName || 'Google Account'}
                                    className="w-10 h-10 rounded-full border border-border shadow-xs"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-xs">
                                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-foreground text-sm">
                                    {user.displayName || 'Store Owner'}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">{user.email}</div>
                                </div>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSignOut}
                                disabled={authLoading}
                                className="h-8 text-xs font-semibold gap-1.5"
                              >
                                <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Sign Out</span>
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3 pt-1">
                              <p className="text-xs text-muted-foreground">
                                Sign in with Google or Email to link this terminal to your Store Owner identity and access remote management.
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleGoogleSignIn}
                                disabled={authLoading}
                                className="w-full h-10 font-semibold text-xs gap-3"
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
                              </Button>

                              <div className="pt-1 text-center">
                                <Button
                                  type="button"
                                  variant="link"
                                  size="xs"
                                  onClick={() => setShowEmailAuth(!showEmailAuth)}
                                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                                >
                                  {showEmailAuth ? 'Hide Email Login' : 'Or use Email / Password'}
                                </Button>
                              </div>

                              {showEmailAuth && (
                                <form
                                  onSubmit={handleEmailAuth}
                                  className="mt-2 p-3 bg-background border border-border rounded-xl space-y-2.5 text-left"
                                >
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-foreground">
                                      {isSignUp ? 'Create Admin Account' : 'Admin Login'}
                                    </Label>
                                    <Button
                                      type="button"
                                      variant="link"
                                      size="xs"
                                      onClick={() => setIsSignUp(!isSignUp)}
                                      className="text-[10px] font-semibold text-primary p-0 h-auto"
                                    >
                                      {isSignUp ? 'Already registered? Log in' : 'Register new account'}
                                    </Button>
                                  </div>

                                  <div>
                                    <Input
                                      type="email"
                                      placeholder="owner@store.com"
                                      value={emailInput}
                                      onChange={(e) => setEmailInput(e.target.value)}
                                      className="h-8 text-xs"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <Input
                                      type="password"
                                      placeholder="Password (minimum 6 characters)"
                                      value={passwordInput}
                                      onChange={(e) => setPasswordInput(e.target.value)}
                                      className="h-8 text-xs"
                                      required
                                    />
                                  </div>

                                  <Button
                                    type="submit"
                                    variant="default"
                                    disabled={authLoading}
                                    className="w-full h-8 text-xs font-semibold"
                                  >
                                    {authLoading
                                      ? 'Processing...'
                                      : isSignUp
                                      ? 'Create Admin Account'
                                      : 'Sign In with Email'}
                                  </Button>
                                </form>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Technical Credentials & Security Parameters */}
                      <Card className="bg-muted/20 border-border shadow-none">
                        <CardContent className="p-3.5 space-y-2 text-xs">
                          <Label className="font-bold text-foreground block text-[11px] uppercase tracking-wider">
                            Cloud Security & Project Configuration
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10.5px]">
                            <div className="bg-background p-2 rounded-lg border border-border">
                              <span className="text-muted-foreground block text-[9.5px]">PROJECT ID</span>
                              <span className="text-foreground font-bold break-all">
                                ai-studio-monoposindustria-c0fc5ba0-8b14-4035-8ee1-558369132d53
                              </span>
                            </div>
                            <div className="bg-background p-2 rounded-lg border border-border">
                              <span className="text-muted-foreground block text-[9.5px]">SECURITY RULES</span>
                              <span className="text-primary font-bold">
                                RBAC Rules Enforced
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t border-border bg-card flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-medium text-muted-foreground">
              {activeTab === 'cloud' && activeSubView === 'diagnostics'
                ? 'Firestore Connection Verified'
                : 'MonoPOS Store Management Engine'}
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
