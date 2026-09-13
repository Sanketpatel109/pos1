import React, { useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from '../firebase';
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  Check,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthGateScreenProps {
  onAuthenticated: () => void;
  onDemoLogin?: () => void;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({ onAuthenticated, onDemoLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for return from redirect Google sign-in
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          onAuthenticated();
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in result check:', err);
        if (err.code && err.code !== 'auth/popup-closed-by-user') {
          setError(err.message || 'Google sign-in error.');
        }
      });
  }, [onAuthenticated]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      onAuthenticated();
    } catch (err: any) {
      console.warn('Google popup sign-in encountered an issue, falling back to redirect:', err);
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/internal-error'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setError(redirectErr.message || 'Redirect sign-in failed.');
        }
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else {
        setError(err.message || 'Google sign-in failed. Try again or use email below.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirectSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error('Direct Google redirect failed:', err);
      setError(err.message || 'Google redirect failed.');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onAuthenticated();
    } catch (err: any) {
      console.error('Email auth failed:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try signing in instead.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email sign-in is disabled in Firebase. Please use Google sign-in.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address to receive a password reset link.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setSuccessMessage(`Password reset link sent to ${email.trim()}. Check your inbox and spam folder.`);
    } catch (err: any) {
      console.error('Password reset failed:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Failed to send password reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-slate-100 flex items-center justify-center p-4 lg:p-8 overflow-y-auto selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      {/* Main Split Grid */}
      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-slate-900/90 border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl my-auto">
        
        {/* LEFT COLUMN: Modern Retail Hero Showcase (Visible on Large Screens) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-10 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border-r border-slate-800/80 relative overflow-hidden">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 font-black text-xl tracking-tight">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">MonoPOS</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Retail Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400">Next-Gen Intelligent Billing & Inventory</p>
            </div>
          </div>

          {/* Center: Live Terminal Cart Simulation */}
          <div className="relative z-10 my-8 space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                Billing fast as lightning. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">
                  Zero delays at checkout.
                </span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Engineered for Indian retail — supermarkets, apparel, pharmacy, and cafes with instant GST invoices and offline sync.
              </p>
            </div>

            {/* Simulated Live POS Register Card */}
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-300">Terminal 01 • Active Order</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">#INV-1082</span>
              </div>

              {/* Sample Cart Items */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono">1x</span>
                    <span>Amul Butter Pasteurised (500g)</span>
                  </div>
                  <span className="font-semibold font-mono text-white">₹275.00</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono">2x</span>
                    <span>Tata Tea Gold Leaf (250g)</span>
                  </div>
                  <span className="font-semibold font-mono text-white">₹320.00</span>
                </div>
              </div>

              {/* Total & UPI Badge */}
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Total Payable</p>
                  <p className="text-lg font-black font-mono text-emerald-400">₹595.00</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  UPI QR Ready
                </div>
              </div>
            </div>

            {/* Micro Feature Badges */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px] font-medium text-slate-300">0.3s Scan</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-[11px] font-medium text-slate-300">GST Ready</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-medium text-slate-300">Auto Backup</span>
              </div>
            </div>
          </div>

          {/* Bottom Trust Quote */}
          <div className="relative z-10 pt-4 border-t border-slate-800/70 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
              KP
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              <span className="text-slate-200 font-medium">"Cut checkout lines in half during peak hours."</span> — Kirana Mart, Ahmedabad
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Streamlined, Frictionless Auth Container */}
        <div className="col-span-1 lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center">
          
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 font-black text-lg">
              M
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">MonoPOS Retail</span>
              <p className="text-xs text-slate-400">Intelligent Cloud POS</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5 mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isForgotPassword
                ? 'Reset Password'
                : isSignUp
                ? 'Get started with MonoPOS'
                : 'Welcome back'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {isForgotPassword
                ? 'Enter your registered email to receive a recovery link'
                : isSignUp
                ? 'Create your store account. 14-day full trial, no card needed.'
                : 'Sign in to access your billing registers, inventory & reports.'}
            </p>
          </div>

          {/* Mode Switcher Pill Tabs (Sign In vs Create Account) */}
          {!isForgotPassword && (
            <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(null); setSuccessMessage(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isSignUp
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(null); setSuccessMessage(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isSignUp
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Google 1-Tap Auth Button */}
          {!isForgotPassword && (
            <>
              <Button
                id="btn-google-sign-in"
                type="button"
                variant="outline"
                size="lg"
                className="w-full h-12 gap-3 text-sm font-semibold bg-slate-950 border-slate-700 hover:bg-slate-800 hover:text-white text-slate-200 transition-all rounded-xl"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>Continue with Google</span>
              </Button>

              {/* Minimalist divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  or with email
                </span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
            </>
          )}

          {/* FORGOT PASSWORD FORM */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="auth-email-reset" className="text-xs font-semibold text-slate-300">
                  Registered Email Address
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="auth-email-reset"
                    type="email"
                    placeholder="owner@yourstore.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    className="pl-10 h-11 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-400 focus-visible:ring-indigo-500 rounded-xl"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <Button
                id="btn-submit-reset"
                type="submit"
                size="lg"
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl gap-2 transition-all shadow-lg shadow-indigo-600/20"
                disabled={loading || resetSent}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : resetSent ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {resetSent ? 'Reset Email Sent!' : 'Send Reset Link'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetSent(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="w-full text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer text-center py-2"
              >
                ← Back to Sign In
              </button>
            </form>
          ) : (
            /* EMAIL / PASSWORD FORM */
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="auth-email" className="text-xs font-semibold text-slate-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="owner@yourstore.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    autoComplete="email"
                    className="pl-10 h-11 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-400 focus-visible:ring-indigo-500 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password" className="text-xs font-semibold text-slate-300">
                    Password
                  </Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    className="pl-10 pr-10 h-11 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-400 focus-visible:ring-indigo-500 rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                id="btn-submit-auth"
                type="submit"
                size="lg"
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl gap-2 transition-all shadow-lg shadow-indigo-600/20"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {isSignUp ? 'Create Free Store Account' : 'Sign In to Terminal'}
              </Button>
            </form>
          )}

          {/* Feedback alerts */}
          {successMessage && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Interactive Demo Bypass Link */}
          {onDemoLogin && (
            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <button
                id="btn-explore-demo"
                type="button"
                onClick={onDemoLogin}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 font-semibold cursor-pointer transition-colors py-1"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Explore Interactive Demo (No Sign-In Required) →</span>
              </button>
            </div>
          )}

          {/* Subtle Security Footnote */}
          <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> 256-bit Encrypted
            </span>
            <span>•</span>
            <span>GST Ready</span>
            <span>•</span>
            <span>Cloud Backup</span>
          </div>

        </div>

      </div>
    </div>
  );
};
