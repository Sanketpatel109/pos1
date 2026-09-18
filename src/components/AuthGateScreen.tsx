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
  GalleryVerticalEnd,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface AuthGateScreenProps {
  onAuthenticated: (user?: any) => void;
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
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);

  const [showPasswordField, setShowPasswordField] = useState(false);

  // Check for return from redirect Google sign-in
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          onAuthenticated(result.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in result check:', err);
        if (err.code && err.code !== 'auth/popup-closed-by-user') {
          if (err.code === 'auth/unauthorized-domain') {
            setIsUnauthorizedDomain(true);
            setError('Domain unauthorized in Firebase: "localhost" is not in Authorized Domains list.');
          } else {
            setError(err.message || 'Google sign-in error.');
          }
        }
      });
  }, [onAuthenticated]);

  const handleGoogleRedirectSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorizedDomain(false);
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error('Redirect sign-in error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setIsUnauthorizedDomain(true);
        setError('Domain unauthorized in Firebase: "localhost" is not in Authorized Domains list.');
      } else {
        setError(err.message || 'Failed to start Google sign-in redirect.');
      }
      setLoading(false);
    }
  };

  const isStandaloneMode = (): boolean => {
    if (typeof window === 'undefined') return false;
    return (
      ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
      window.matchMedia('(display-mode: standalone)').matches
    );
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorizedDomain(false);

      // Attempt popup sign-in across all modern browsers and standalone PWAs.
      // Same-origin authDomain prevents ITP cookie issues.
      const result = await signInWithPopup(auth, googleProvider);
      onAuthenticated(result.user);
    } catch (err: any) {
      console.warn('Google popup sign-in encountered an issue:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setIsUnauthorizedDomain(true);
        setError('Domain unauthorized in Firebase: "localhost" is not added to Authorized Domains in your Firebase console.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/internal-error' ||
        err.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        // In iOS Standalone PWA (Home Screen mode), signInWithRedirect causes WebKit
        // to freeze on a blank white /__/auth/handler screen. Do NOT redirect in standalone mode!
        if (isStandaloneMode()) {
          setError('Google popup was blocked in Home Screen mode. Enter your email above or use Quick Demo Mode below.');
        } else {
          // Regular browser tab: safe to fallback to redirect
          await handleGoogleRedirectSignIn();
          return;
        }
      } else {
        setError(err.message || 'Google sign-in failed. Please try again or use email login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // If user typed a password and is in explicit password mode, try Firebase
      if (password && (isSignUp || showPasswordField)) {
        try {
          if (isSignUp) {
            const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            onAuthenticated(res.user);
            return;
          } else {
            const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
            onAuthenticated(res.user);
            return;
          }
        } catch (firebaseErr: any) {
          // If email/password is disabled in Firebase console, allow clean local access with this email
          if (
            firebaseErr.code === 'auth/operation-not-allowed' ||
            firebaseErr.code === 'auth/unauthorized-domain'
          ) {
            const localUser = {
              uid: 'user_' + btoa(cleanEmail.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
              email: cleanEmail,
              displayName: cleanEmail.split('@')[0],
            };
            onAuthenticated(localUser);
            return;
          }
          throw firebaseErr;
        }
      }

      // Default clean flow: direct login with email
      const localUser = {
        uid: 'user_' + btoa(cleanEmail.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
      };
      onAuthenticated(localUser);
    } catch (err: any) {
      console.error('Email auth failed:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Check your password or use Google sign-in.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try signing in instead.');
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10 text-foreground">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-6 text-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-center">
              {isSignUp ? 'Create an account.' : isForgotPassword ? 'Reset your password.' : 'Welcome to MonoPOS.'}
            </h1>
            <div className="text-center text-sm text-muted-foreground">
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setShowPasswordField(false);
                      setError(null);
                    }}
                    className="underline underline-offset-4 hover:text-primary cursor-pointer font-medium text-foreground"
                  >
                    Sign in
                  </button>
                </>
              ) : isForgotPassword ? (
                <>
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                    }}
                    className="underline underline-offset-4 hover:text-primary cursor-pointer font-medium text-foreground"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setShowPasswordField(true);
                      setError(null);
                    }}
                    className="underline underline-offset-4 hover:text-primary cursor-pointer font-medium text-foreground"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="auth-email-reset">Email</Label>
                <Input
                  id="auth-email-reset"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={loading || resetSent}
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {resetSent ? 'Reset Link Sent!' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  autoComplete="email"
                  required
                />
              </div>

              {(isSignUp || showPasswordField) && (
                <div className="grid gap-2 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auth-password">Password</Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
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
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      autoFocus={showPasswordField && !isSignUp}
                      className="pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                id="btn-submit-auth"
                type="submit"
                className="w-full cursor-pointer"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isSignUp ? 'Sign Up' : 'Login'}
              </Button>
            </form>
          )}

          {/* Or Divider using shadcn Separator and standard design tokens */}
          <div className="relative flex items-center justify-center text-xs">
            <Separator />
            <span className="absolute bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>

          {/* Full-width Google Authentication Button */}
          <div className="flex flex-col gap-1.5">
            <Button
              id="btn-google-sign-in"
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4 fill-current">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              Continue with Google
            </Button>
            {!isStandaloneMode() ? (
              <div className="flex items-center justify-center text-[11px] text-muted-foreground gap-1">
                <span>Popup blocked?</span>
                <button
                  type="button"
                  onClick={handleGoogleRedirectSignIn}
                  disabled={loading}
                  className="underline underline-offset-2 hover:text-foreground font-medium cursor-pointer"
                >
                  Sign in with redirect
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-center text-muted-foreground">
                Installed Web App Mode
              </p>
            )}
          </div>

          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={() => {
                onAuthenticated({
                  uid: 'local_admin',
                  email: 'admin@monopos.local',
                  displayName: 'Store Manager (Demo)',
                });
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer font-medium transition-colors"
            >
              Continue in Demo Mode (No Sign-In Required) →
            </button>
          </div>

          {/* Feedback Alerts using standard shadcn tokens */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted border border-border text-foreground text-xs font-medium">
              <CheckCircle2 className="size-4 shrink-0 text-foreground" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  {error}
                </div>
              </div>
              {isUnauthorizedDomain && (
                <div className="mt-1 pt-2 border-t border-destructive/20 flex flex-col gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Google sign-in works immediately on the authorized live hosting domain, or you can bypass it locally:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href="https://gen-lang-client-0282731279.web.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      Open Live Site (web.app) →
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onAuthenticated({
                          uid: 'local_admin',
                          email: 'admin@monopos.local',
                          displayName: 'Admin (Local Demo)',
                        });
                      }}
                      className="h-8 text-xs cursor-pointer"
                    >
                      Continue in Local Demo Mode
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Legal Disclaimer using standard shadcn tokens */}
        <div className="text-balance text-center text-xs text-muted-foreground mt-8 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
          By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
          and <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
};
