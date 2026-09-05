import React, { useState } from 'react';
import {
  X,
  Cloud,
  CloudCheck,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Database,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  auth,
  googleProvider,
} from '../firebase';
import { CatalogItem, Category, Order, Customer, CashEntry, ShopSettings } from '../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  orders: Order[];
  catalog: CatalogItem[];
  customers: Customer[];
  cashEntries: CashEntry[];
  shopSettings: ShopSettings;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  onManualSync: () => Promise<void>;
  onPullFromCloud?: () => Promise<void>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  orders,
  catalog,
  customers,
  cashEntries,
  shopSettings,
  isSyncing,
  lastSyncedAt,
  onManualSync,
  onPullFromCloud,
}) => {
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Email / Password Form State
  const [showEmailAuth, setShowEmailAuth] = useState<boolean>(false);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-lg w-full overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 leading-tight">Cloud Synchronization & Backup</h3>
              <p className="text-[11px] text-zinc-500">Real-time store database & cross-terminal backup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-700">
          {/* Notifications */}
          {syncSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* User Account Card */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Store Owner Account</span>
              {user ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Authenticated (Google)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded-full">
                  Local Mode Only
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
                      className="w-10 h-10 rounded-full border border-zinc-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center text-sm">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-zinc-900 text-sm">{user.displayName || 'Store Owner'}</div>
                    <div className="text-[11px] text-zinc-500">{user.email}</div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-zinc-600">
                  Sign in with Google to enable cross-device synchronization and automatic cloud backups to Firebase Firestore.
                </p>
                <button
                  id="btn-modal-google-login"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 font-bold text-zinc-800 flex items-center justify-center gap-3 transition-colors shadow-2xs cursor-pointer"
                >
                  {/* Google G Logo */}
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
                  <span>{authLoading ? 'Signing in...' : 'Continue with Google'}</span>
                </button>

                {/* Alternate Email/Password Option */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowEmailAuth(!showEmailAuth)}
                    className="text-[11px] font-bold text-zinc-600 hover:text-zinc-900 underline transition-colors cursor-pointer"
                  >
                    {showEmailAuth ? 'Hide Email / Password login' : 'Or sign in / register with Email & Password'}
                  </button>
                </div>

                {showEmailAuth && (
                  <form onSubmit={handleEmailAuth} className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900">
                        {isSignUp ? 'Create Store Admin Account' : 'Store Admin Email Login'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-[10px] font-semibold text-zinc-600 hover:text-zinc-900 underline cursor-pointer"
                      >
                        {isSignUp ? 'Have an account? Log in' : 'New store? Create account'}
                      </button>
                    </div>

                    <div>
                      <input
                        type="email"
                        placeholder="admin@yourstore.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        required
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        placeholder="Password (minimum 6 characters)"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {authLoading ? 'Processing...' : isSignUp ? 'Create Admin Account' : 'Sign In with Email'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Database Live Stats */}
          <div className="border border-zinc-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-zinc-600" />
                <span>Cloud Sync Data Counts</span>
              </span>
              <span className="text-[10px] text-zinc-500">
                {lastSyncedAt ? `Last synced: ${lastSyncedAt.toLocaleTimeString()}` : 'Not synced yet'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Invoices</span>
                <span className="text-base font-bold text-zinc-900 font-mono">{orders.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Products</span>
                <span className="text-base font-bold text-zinc-900 font-mono">{catalog.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Customers</span>
                <span className="text-base font-bold text-zinc-900 font-mono">{customers.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Cash Entries</span>
                <span className="text-base font-bold text-zinc-900 font-mono">{cashEntries.length}</span>
              </div>
            </div>

            {/* Sync Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                id="btn-cloud-push-sync"
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ArrowUpCircle className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Uploading...' : 'Backup All to Cloud'}</span>
              </button>

              {onPullFromCloud && (
                <button
                  id="btn-cloud-pull-sync"
                  onClick={handleTriggerPull}
                  disabled={isSyncing}
                  className="py-2 px-3 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Restore</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
