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
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-md flex flex-col items-center gap-4">

        {/* Top Status Badge */}
        <Badge variant="outline" className="gap-2 px-3 py-1 text-xs font-semibold bg-background shadow-xs">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Cloud Core Online • Indian Retail POS</span>
        </Badge>

        {/* Main Shadcn Card */}
        <Card className="w-full shadow-lg border-border bg-card">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="size-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl mx-auto shadow-xs">
              M
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              MonoPOS Retail
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Utilitarian billing, live cloud inventory & GSTR-1 reports
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Google 1-Tap Auth Button */}
            <Button
              id="btn-google-sign-in"
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-11 font-semibold gap-3 shadow-xs cursor-pointer"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin text-primary" />
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

            {/* Direct Redirect Fallback Link */}
            <div className="text-center -mt-1">
              <button
                type="button"
                onClick={handleGoogleRedirectSignIn}
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                Popup blank or blocked? <span className="underline font-medium text-primary">Sign in directly →</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center text-xs uppercase text-muted-foreground my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <span className="relative bg-card px-2 text-[10px] font-bold tracking-wider text-muted-foreground">
                or email access
              </span>
            </div>

            {/* Segmented Mode Switcher */}
            {!isForgotPassword && (
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg border border-border/50">
                <Button
                  type="button"
                  variant={!isSignUp ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setIsSignUp(false); setError(null); setSuccessMessage(null); }}
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant={isSignUp ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setIsSignUp(true); setError(null); setSuccessMessage(null); }}
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  Create Account
                </Button>
              </div>
            )}

            {/* Forgot Password Flow */}
            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-3 pt-1">
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">Reset Password</h4>
                  <p className="text-xs text-muted-foreground">
                    Enter your registered email and we'll send you an instant reset link.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="auth-email-reset" className="text-xs font-semibold">Email Address</Label>
                  <div className="relative">
                    <Mail className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="auth-email-reset"
                      type="email"
                      placeholder="owner@supermarket.in"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      className="pl-9"
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <Button
                  id="btn-submit-reset"
                  type="submit"
                  size="default"
                  className="w-full font-semibold cursor-pointer"
                  disabled={loading || resetSent}
                >
                  {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                  {resetSent ? 'Reset Link Sent!' : 'Send Password Reset Link'}
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
                  ← Back to Sign In
                </Button>
              </form>
            ) : (
              /* Standard Email / Password Form */
              <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email" className="text-xs font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="auth-email"
                      type="email"
                      placeholder="owner@supermarket.in"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      className="pl-9"
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
                        className="text-xs text-primary hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      className="pl-9 pr-9"
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  id="btn-submit-auth"
                  type="submit"
                  size="default"
                  className="w-full font-semibold cursor-pointer"
                  disabled={loading}
                >
                  {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                  {isSignUp ? 'Create Store & Start Free Trial' : 'Sign In'}
                </Button>
              </form>
            )}

            {/* Feedback Alerts */}
            {successMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-1 border-t border-border">
            {/* Feature Pills using Shadcn Badge */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 w-full pt-1">
              <Badge variant="secondary" className="gap-1 font-medium text-[10px]">
                <Zap className="size-3 text-amber-500" /> Fast Billing
              </Badge>
              <Badge variant="secondary" className="gap-1 font-medium text-[10px]">
                <CloudUpload className="size-3 text-indigo-500" /> Cloud Sync
              </Badge>
              <Badge variant="secondary" className="gap-1 font-medium text-[10px]">
                <BarChart3 className="size-3 text-emerald-500" /> GSTR-1
              </Badge>
              <Badge variant="secondary" className="gap-1 font-medium text-[10px]">
                <ShieldCheck className="size-3 text-primary" /> 14-Day Trial
              </Badge>
            </div>

            {/* Interactive Demo CTA */}
            {onDemoLogin && (
              <Button
                id="btn-explore-demo"
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDemoLogin}
                className="w-full text-xs text-muted-foreground hover:text-primary gap-1 font-medium cursor-pointer"
              >
                ⚡ Explore Interactive Demo (No Sign-In Required) →
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Trust Footer */}
        <p className="text-[11px] text-muted-foreground text-center">
          Encrypted with 256-bit SSL • 🇮🇳 GST Compliant • Works Offline
        </p>
      </div>
    </div>
  );
};
