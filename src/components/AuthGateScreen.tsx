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
  Store,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  const [showPasswordField, setShowPasswordField] = useState(false);

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
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // In clean minimal login mode: if password field not shown yet, reveal it for the user
    if (!isSignUp && !showPasswordField) {
      setShowPasswordField(true);
      return;
    }

    if (!password) {
      setError('Please enter your password.');
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white text-zinc-950 px-4 py-12 selection:bg-zinc-100">
      <div className="w-full max-w-[370px] mx-auto">
        {/* Top Minimal Outline Icon */}
        <div className="flex justify-center mb-5">
          <svg
            className="size-7 text-zinc-950"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Top drawer/lid capsule */}
            <rect x="7" y="3.5" width="10" height="3" rx="1.5" />
            {/* Lower main body with rounded corners */}
            <rect x="4" y="8.5" width="16" height="12" rx="3" />
            {/* Center horizontal notch */}
            <line x1="10" y1="14.5" x2="14" y2="14.5" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-center text-zinc-950">
          {isSignUp ? 'Create an account.' : isForgotPassword ? 'Reset your password.' : 'Welcome to MonoPOS.'}
        </h1>

        {/* Subtitle / Mode Toggle */}
        <p className="text-sm text-zinc-500 text-center mt-2">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setShowPasswordField(false);
                  setError(null);
                }}
                className="underline underline-offset-4 text-zinc-950 font-normal hover:text-zinc-700 cursor-pointer"
              >
                Sign in
              </button>
            </span>
          ) : isForgotPassword ? (
            <span>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError(null);
                }}
                className="underline underline-offset-4 text-zinc-950 font-normal hover:text-zinc-700 cursor-pointer"
              >
                Sign in
              </button>
            </span>
          ) : (
            <span>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setShowPasswordField(true);
                  setError(null);
                }}
                className="underline underline-offset-4 text-zinc-950 font-normal hover:text-zinc-700 cursor-pointer"
              >
                Sign up
              </button>
            </span>
          )}
        </p>

        {isForgotPassword ? (
          /* Forgot Password View */
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-email-reset" className="text-sm font-medium text-zinc-950">
                Email
              </Label>
              <Input
                id="auth-email-reset"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                autoComplete="email"
                autoFocus
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-950 shadow-none transition-colors"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-black text-white hover:bg-zinc-800 font-medium rounded-md text-sm cursor-pointer shadow-none transition-colors"
              disabled={loading || resetSent}
            >
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}
              {resetSent ? 'Reset Link Sent!' : 'Send Reset Link'}
            </Button>
          </form>
        ) : (
          /* Standard Login / Signup Form */
          <form onSubmit={handleEmailAuth} className="mt-8 space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="auth-email" className="text-sm font-medium text-zinc-950">
                Email
              </Label>
              <Input
                id="auth-email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                autoComplete="email"
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-950 shadow-none transition-colors"
                required
              />
            </div>

            {/* Password Field (revealed on sign up or when user proceeds with email login) */}
            {(isSignUp || showPasswordField) && (
              <div className="space-y-2 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password" className="text-sm font-medium text-zinc-950">
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
                      className="text-xs text-zinc-500 hover:text-zinc-950 underline underline-offset-4 cursor-pointer"
                    >
                      Forgot password?
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
                    className="h-10 pr-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-950 shadow-none transition-colors"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    autoFocus={showPasswordField && !isSignUp}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Main Submit Button */}
            <Button
              id="btn-submit-auth"
              type="submit"
              className="w-full h-10 bg-black text-white hover:bg-zinc-800 font-medium rounded-md text-sm cursor-pointer shadow-none transition-colors"
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}
              {isSignUp ? 'Sign Up' : 'Login'}
            </Button>
          </form>
        )}

        {/* Or Divider */}
        <div className="relative my-6 text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-zinc-200">
          <span className="relative z-10 bg-white px-2 text-zinc-400 font-normal">
            Or
          </span>
        </div>

        {/* 2-Column Social Buttons (Apple + Google) with Full Unclipped Text */}
        <div className="grid grid-cols-2 gap-3">
          {/* Apple Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-10 rounded-md border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-950 font-normal text-xs sm:text-[13px] gap-2 shadow-none cursor-pointer px-2 flex items-center justify-center whitespace-nowrap transition-colors"
          >
            <svg className="size-4 shrink-0 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.65-.79 1.1-1.89.98-2.99-.95.04-2.1.63-2.78 1.43-.59.69-1.12 1.8-1.01 2.87 1.07.08 2.15-.52 2.81-1.31z" />
            </svg>
            <span>Continue with Apple</span>
          </Button>

          {/* Google Button */}
          <Button
            id="btn-google-sign-in"
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-10 rounded-md border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-950 font-normal text-xs sm:text-[13px] gap-2 shadow-none cursor-pointer px-2 flex items-center justify-center whitespace-nowrap transition-colors"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </Button>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Bottom Legal Disclaimer */}
        <div className="mt-8 text-center text-xs text-zinc-500 leading-relaxed max-w-[280px] mx-auto">
          By clicking continue, you agree to our{' '}
          <a href="#" className="underline underline-offset-4 text-zinc-700 hover:text-zinc-950">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="underline underline-offset-4 text-zinc-700 hover:text-zinc-950">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  );
};
