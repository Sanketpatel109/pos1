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
  Zap,
  CloudUpload,
  BarChart3,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface AuthGateScreenProps {
  onAuthenticated: () => void;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({ onAuthenticated }) => {
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
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
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
        setError('Email sign-in is disabled in Firebase. Please use "Continue with Google".');
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
      setSuccessMessage(`Password reset link sent to ${email.trim()}. Check your inbox.`);
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
    <div className="min-h-screen w-full flex bg-background text-foreground">
      {/* LEFT COLUMN: Simplified, Ultra-Clean Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-base shadow-xs">
            M
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight">MonoPOS</span>
        </div>

        {/* Center Form Area */}
        <div className="w-full max-w-sm mx-auto my-auto py-8">
          {isForgotPassword ? (
            /* Forgot Password View */
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Reset Password</h2>
                <p className="text-xs text-muted-foreground">
                  Enter your email address and we'll send you an instant reset link.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email-reset" className="text-xs font-semibold">
                    Email address*
                  </Label>
                  <Input
                    id="auth-email-reset"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="default"
                  className="w-full font-semibold bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 cursor-pointer h-10"
                  disabled={loading || resetSent}
                >
                  {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                  {resetSent ? 'Reset Link Sent!' : 'Send Reset Link'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetSent(false);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full text-xs font-medium cursor-pointer"
                >
                  ← Back to Login
                </Button>
              </form>
            </div>
          ) : (
            /* Main Login / Register View */
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">
                  {isSignUp ? 'Create an account' : 'Welcome Back'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isSignUp
                    ? 'Start your 14-day free trial for your retail store.'
                    : 'Sign in to access your store register and inventory.'}
                </p>
              </div>

              {/* Google 1-Tap Login Button */}
              <Button
                id="btn-google-sign-in"
                type="button"
                variant="outline"
                size="default"
                className="w-full h-10 font-semibold gap-2.5 shadow-2xs hover:bg-muted/50 cursor-pointer"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>Continue with Google</span>
              </Button>

              {/* Or continue with Email Divider */}
              <div className="relative flex items-center justify-center text-xs text-muted-foreground">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <span className="relative bg-background px-3 text-[11px] font-medium text-muted-foreground">
                  Or continue with Email
                </span>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email" className="text-xs font-semibold">
                    Email address*
                  </Label>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auth-password" className="text-xs font-semibold">
                      Password*
                    </Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      className="pr-9"
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  id="btn-submit-auth"
                  type="submit"
                  size="default"
                  className="w-full font-semibold bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 cursor-pointer h-10 shadow-xs mt-1"
                  disabled={loading}
                >
                  {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                  {isSignUp ? 'Sign up for MonoPOS' : 'Sign in to MonoPOS'}
                </Button>
              </form>

              {/* Account Switcher */}
              <div className="text-center text-xs text-muted-foreground pt-1">
                {isSignUp ? (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(false); setError(null); }}
                      className="font-bold text-foreground hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </span>
                ) : (
                  <span>
                    New on our platform?{' '}
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(true); setError(null); }}
                      className="font-bold text-foreground hover:underline cursor-pointer"
                    >
                      Create an account
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Feedback Alerts */}
          {successMessage && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Clean Footer Trust Note */}
        <div className="text-center text-[11px] text-muted-foreground">
          Encrypted with 256-bit SSL • 🇮🇳 GST Compliant
        </div>
      </div>

      {/* RIGHT COLUMN: Streamlined Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 p-6 flex-col justify-between relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-neutral-900 text-white rounded-3xl m-4 shadow-2xl">
        {/* Ambient Lighting */}
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-600 via-zinc-900 to-black pointer-events-none" />
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Top Product Value Proposition */}
        <div className="relative z-10 space-y-3 p-6 pt-10 max-w-lg">
          <Badge variant="outline" className="text-white/80 border-white/20 bg-white/5 gap-1.5 text-xs">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Cloud Retail Engine
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Lightning-Fast Retail Billing
          </h1>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Engineered for high-volume supermarkets, apparel stores, cafes, and groceries across India.
          </p>

          <div className="flex items-center gap-3 pt-4">
            <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/15 gap-1 text-[11px]">
              <Zap className="size-3 text-amber-400" /> 0.3s Instant Billing
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/15 gap-1 text-[11px]">
              <CloudUpload className="size-3 text-indigo-400" /> Auto Cloud Backup
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/15 gap-1 text-[11px]">
              <BarChart3 className="size-3 text-emerald-400" /> GSTR-1 Tax Ready
            </Badge>
          </div>
        </div>

        {/* Bottom Social Proof Card */}
        <div className="relative z-10 bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white rounded-2xl p-6 shadow-2xl border border-white/20 mx-4 mb-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold tracking-tight">
              Trusted by 3,500+ Indian Retailers
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Powering daily counter sales with offline reliability, zero downtime, and instant digital receipts.
            </p>
          </div>

          {/* Social Proof Avatars & Uptime */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/60">
            <div className="flex items-center -space-x-2">
              <div className="size-7 rounded-full bg-slate-200 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[10px] font-bold text-slate-700">
                👨‍💼
              </div>
              <div className="size-7 rounded-full bg-slate-300 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[10px] font-bold text-slate-700">
                👩‍💼
              </div>
              <div className="size-7 rounded-full bg-slate-400 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[10px] font-bold text-slate-700">
                🧑‍💻
              </div>
              <div className="size-7 rounded-full bg-zinc-900 text-white border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[9px] font-black">
                +3.5k
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span>99.99% Cloud Uptime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
