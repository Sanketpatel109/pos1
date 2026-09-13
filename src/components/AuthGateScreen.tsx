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
  CloudUpload,
  BarChart3,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthGateScreenProps {
  onAuthenticated: () => void;
  onDemoLogin?: () => void;
}

const HIGHLIGHTS = [
  { icon: Zap, label: '0.3s Billing', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { icon: CloudUpload, label: 'Live Cloud Sync', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  { icon: BarChart3, label: 'GSTR-1 Ready', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
];

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
        setError(null); // User closed popup
      } else {
        setError(err.message || 'Google sign-in failed. Try the direct redirect below.');
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
        setError('Email sign-in is disabled in Firebase. Please use "Continue with Google" or "Explore Interactive Demo" below.');
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
    <div className="relative min-h-screen w-full bg-slate-50/70 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-x-hidden font-sans">
      {/* Dynamic Ambient Mesh Lighting & Grid Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[750px] h-[380px] bg-gradient-to-b from-indigo-500/15 via-blue-500/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-10 w-[450px] h-[350px] bg-gradient-to-t from-emerald-500/10 via-sky-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-20 pointer-events-none -z-10" />

      <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center gap-5 sm:gap-6 py-8">

        {/* Live System Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold tracking-wide shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Cloud Core Online • Indian Retail Ready</span>
        </div>

        {/* Hero Brand Identity */}
        <div className="text-center space-y-2">
          <div className="relative group mx-auto inline-block">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-600 to-indigo-700 opacity-30 blur-sm group-hover:opacity-60 transition duration-500" />
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 text-white flex items-center justify-center shadow-xl text-3xl font-black tracking-tight border border-white/20">
              M
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-1.5">
              MonoPOS <span className="text-xs sm:text-sm font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">Retail OS</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
              Fast barcode billing, live cloud inventory, and instant GST reports in one unified app.
            </p>
          </div>
        </div>

        {/* Value Bento Highlights */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {HIGHLIGHTS.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md text-center shadow-2xs"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${f.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold text-foreground tracking-tight">{f.label}</span>
              </div>
            );
          })}
        </div>

        {/* Glassmorphic Auth Card */}
        <div className="w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl p-6 sm:p-7 space-y-4 relative overflow-hidden">
          {/* Subtle Top Gradient Line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          {/* Google 1-Tap Auth Button */}
          <Button
            id="btn-google-sign-in"
            type="button"
            variant="outline"
            size="lg"
            className="w-full h-12 gap-3 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
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

          {/* Direct Redirect Fallback Hint */}
          <div className="text-center -mt-1">
            <button
              type="button"
              onClick={handleGoogleRedirectSignIn}
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Popup blank or blocked? <span className="underline font-medium text-primary">Sign in directly without popup →</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">or email access</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Sleek Segmented Switcher (Sign In vs Create Account) */}
          {!isForgotPassword && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(null); setSuccessMessage(null); }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  !isSignUp
                    ? 'bg-white dark:bg-slate-700 text-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(null); setSuccessMessage(null); }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  isSignUp
                    ? 'bg-white dark:bg-slate-700 text-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Forgot Password Screen */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-3.5 pt-1">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-foreground">Reset your password</h3>
                <p className="text-xs text-muted-foreground">
                  Enter your registered email and we'll send you an instant reset link.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-email-reset" className="text-xs font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="auth-email-reset"
                    type="email"
                    placeholder="owner@supermarket.in"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <Button
                id="btn-submit-reset"
                type="submit"
                size="lg"
                className="w-full h-11 gap-2 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-500/25 cursor-pointer"
                disabled={loading || resetSent}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : resetSent ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {resetSent ? 'Reset Link Sent!' : 'Send Password Reset Link'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetSent(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="w-full text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer text-center py-1"
              >
                ← Back to Sign In
              </button>
            </form>
          ) : (
            /* Email / Password Form */
            <form onSubmit={handleEmailAuth} className="space-y-3.5 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="auth-email" className="text-xs font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="owner@supermarket.in"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password" className="text-xs font-semibold">Password</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    className="pl-10 pr-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                id="btn-submit-auth"
                type="submit"
                size="lg"
                className="w-full h-11 gap-2 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {isSignUp ? 'Create Store & Start 14-Day Free Trial' : 'Sign In to Register'}
              </Button>
            </form>
          )}

          {/* Feedback Messages */}
          {successMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Interactive Demo CTA Badge */}
        {onDemoLogin && (
          <div className="text-center pt-1">
            <button
              id="btn-explore-demo"
              type="button"
              onClick={onDemoLogin}
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 hover:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all shadow-2xs hover:scale-102 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Explore Interactive Demo (No Sign-In Required)</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Trust & Compliance Footer */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground font-medium pt-1">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            256-Bit Encrypted
          </span>
          <span>•</span>
          <span>🇮🇳 GST Compliant</span>
          <span>•</span>
          <span>99.9% Cloud Uptime</span>
        </div>
      </div>
    </div>
  );
};
