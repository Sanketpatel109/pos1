import React, { useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '../firebase';
import {
  ShieldCheck,
  CloudUpload,
  BarChart3,
  Scan,
  Users,
  Zap,
  ArrowRight,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthGateScreenProps {
  onAuthenticated: () => void;
}

const FEATURES = [
  { icon: Zap, label: 'Instant Billing', desc: 'Keypad & barcode register' },
  { icon: CloudUpload, label: 'Cloud Backup', desc: 'Auto-sync to Firebase' },
  { icon: BarChart3, label: 'GSTR-1 Reports', desc: 'GST-ready tax export' },
  { icon: Scan, label: 'Barcode Scanning', desc: 'Camera & laser support' },
  { icon: Users, label: 'Staff & RBAC', desc: 'PIN-based operator shifts' },
  { icon: ShieldCheck, label: '14-Day Free Trial', desc: 'No credit card required' },
];

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({ onAuthenticated }) => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      onAuthenticated();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError(null); // User just closed the popup, not an error
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
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center gap-6 sm:gap-8">

        {/* Logo & Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto shadow-lg text-2xl sm:text-3xl font-black tracking-tighter">
            M
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            MonoPOS
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            India's smartest retail POS — billing, inventory, GST reports, and cloud backup in one app.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-xl bg-muted/50 border border-border/50 text-center"
            >
              <f.icon className="w-4 h-4 text-primary" />
              <span className="text-[10px] sm:text-[11px] font-semibold text-foreground leading-tight">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Auth Card */}
        <div className="w-full bg-card rounded-xl border border-border shadow-lg p-5 space-y-4">

          {/* Google 1-Tap Button */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full h-12 gap-3 text-sm font-semibold"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading && !showEmailForm ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email/Password Form */}
          {showEmailForm ? (
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="auth-email" className="text-xs font-medium">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="owner@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auth-password" className="text-xs font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-11 gap-2 text-sm font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {isSignUp ? 'Create Account & Start Trial' : 'Sign In'}
              </Button>

              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                className="w-full text-xs text-primary hover:underline font-medium cursor-pointer text-center py-1"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
            </form>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full h-11 gap-2 text-sm font-medium text-muted-foreground"
              onClick={() => setShowEmailForm(true)}
            >
              <Mail className="w-4 h-4" />
              Sign in with Email
            </Button>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Trial Guarantee */}
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-xs">
          Start your <span className="font-bold text-primary">14-day free trial</span> instantly.
          No credit card required. Full access to all features.
        </p>
      </div>
    </div>
  );
};
