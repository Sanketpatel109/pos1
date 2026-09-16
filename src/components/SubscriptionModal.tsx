import React, { useState } from 'react';
import {
  X,
  Crown,
  Sparkles,
  Check,
  Zap,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CreditCard,
  Loader2,
  Users,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TenantLicense,
  SubscriptionPlan,
  SUBSCRIPTION_PLANS,
} from '../types';
import {
  LicenseStatus,
  simulatePlanUpgrade,
  loadRazorpayCheckoutScript,
} from '../services/subscriptionService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: TenantLicense | null;
  licenseStatus: LicenseStatus | null;
  onLicenseUpdated: (updated: TenantLicense) => void;
  currencySymbol?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  license,
  licenseStatus,
  onLicenseUpdated,
  currencySymbol = '₹',
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('PRO');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>(() => {
    return (
      localStorage.getItem('monopos_razorpay_key') ||
      (import.meta as any).env?.VITE_RAZORPAY_KEY_ID ||
      ''
    );
  });
  const [showGatewayConfig, setShowGatewayConfig] = useState(false);

  if (!isOpen) return null;

  const currentPlan = license?.plan || 'TRIAL';
  const isTrial = currentPlan === 'TRIAL';
  const isExpired = licenseStatus?.isExpired;
  const isGrace = licenseStatus?.isGracePeriod;

  const handleSaveRazorpayKey = (key: string) => {
    setRazorpayKey(key);
    if (key.trim()) {
      localStorage.setItem('monopos_razorpay_key', key.trim());
    } else {
      localStorage.removeItem('monopos_razorpay_key');
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!license?.ownerUid) return;

    // Free plan instant activation
    if (plan === 'FREE') {
      try {
        setIsProcessing(true);
        const updated = await simulatePlanUpgrade(license.ownerUid, 'FREE', {
          gateway: 'SIMULATED',
          amount: 0,
          billingCycle: 'ANNUAL',
        });
        if (updated) {
          onLicenseUpdated(updated);
          setUpgradeSuccess('Switched to the Free Forever plan.');
          setTimeout(() => setUpgradeSuccess(null), 4000);
        }
      } catch (err) {
        console.error('Free plan activation error:', err);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    const planInfo = SUBSCRIPTION_PLANS.find((p) => p.id === plan);
    const amountInRupees = billingCycle === 'ANNUAL' ? (planInfo?.annualPrice || 7999) : (planInfo?.price || 799);

    // If Razorpay key is configured, initiate real payment popup
    if (razorpayKey.trim()) {
      try {
        setIsProcessing(true);
        const scriptLoaded = await loadRazorpayCheckoutScript();
        if (!scriptLoaded) {
          throw new Error('Could not load Razorpay SDK');
        }

        const options = {
          key: razorpayKey.trim(),
          amount: amountInRupees * 100, // paise
          currency: 'INR',
          name: 'MonoPOS Retail',
          description: `${planInfo?.name || plan} (${billingCycle}) SaaS Subscription`,
          image: 'https://cdn-icons-png.flaticon.com/512/891/891462.png',
          prefill: {
            name: license.ownerName || 'Store Owner',
            email: license.ownerEmail || 'store@monopos.retail',
          },
          theme: {
            color: '#2563eb',
          },
          handler: async (response: any) => {
            const paymentId = response?.razorpay_payment_id || `pay_${Date.now()}`;
            const updated = await simulatePlanUpgrade(license.ownerUid, plan, {
              paymentId,
              gateway: 'RAZORPAY',
              amount: amountInRupees,
              billingCycle,
            });
            if (updated) {
              onLicenseUpdated(updated);
              setUpgradeSuccess(`Payment received (${paymentId})! Activated ${plan} Plan.`);
              setTimeout(() => setUpgradeSuccess(null), 5000);
            }
            setIsProcessing(false);
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      } catch (err) {
        console.error('Razorpay popup error, falling back to instant activation:', err);
      }
    }

    // Default Sandbox / Instant Demo Mode
    try {
      setIsProcessing(true);
      setUpgradeSuccess(null);
      const updated = await simulatePlanUpgrade(license.ownerUid, plan, {
        gateway: 'SIMULATED',
        amount: amountInRupees,
        billingCycle,
      });
      if (updated) {
        onLicenseUpdated(updated);
        setUpgradeSuccess(`Successfully upgraded to the ${plan} Plan (${billingCycle})!`);
        setTimeout(() => {
          setUpgradeSuccess(null);
        }, 4000);
      }
    } catch (err) {
      console.error('Upgrade error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] z-10">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                MonoPOS Plans & Subscriptions
              </h2>
              <p className="text-xs text-muted-foreground">
                Simple, transparent retail pricing. Switch or cancel anytime.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Status Alert Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isExpired
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : isGrace
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                : isTrial
                ? 'bg-primary/5 border-primary/20 text-foreground'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {isExpired ? (
                <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
              ) : isGrace ? (
                <Clock className="w-6 h-6 text-amber-600 shrink-0" />
              ) : isTrial ? (
                <Sparkles className="w-6 h-6 text-primary shrink-0" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">
                    {isTrial
                      ? '14-Day Free Pro Trial'
                      : `${license?.plan} Plan Active`}
                  </span>
                  <Badge variant="outline" className="text-[11px] px-2 py-0">
                    {licenseStatus?.displayLabel || currentPlan}
                  </Badge>
                </div>
                <p className="text-xs opacity-90 mt-0.5">
                  {isExpired
                    ? 'Your subscription period has ended. Choose a plan below to keep multi-device sync and premium features uninterrupted.'
                    : isGrace
                    ? 'Your account is in grace period. Please renew to avoid service pause.'
                    : isTrial
                    ? `You have ${licenseStatus?.daysRemaining ?? 14} days remaining in your free Pro trial. No credit card required.`
                    : `Next renewal: ${
                        license?.currentPeriodEnd
                          ? new Date(license.currentPeriodEnd).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Active'
                      }`}
                </p>
              </div>
            </div>

            {isTrial && (
              <Button
                size="sm"
                className="shrink-0 font-semibold gap-1.5"
                onClick={() => handleUpgrade('PRO')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Upgrade to Pro
              </Button>
            )}
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <div className="flex items-center gap-3 bg-muted/60 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('ANNUAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  billingCycle === 'ANNUAL'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Annual Billing</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  Save 17%
                </span>
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              (Get 2 months free with Annual plans)
            </span>
          </div>

          {/* Success Banner */}
          {upgradeSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{upgradeSuccess}</span>
            </div>
          )}

          {/* Plans Grid (4 columns on desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = license?.plan === plan.id;
              const isSelected = selectedPlan === plan.id;
              const isPro = plan.id === 'PRO';
              const isBusiness = plan.id === 'BUSINESS';
              const isFree = plan.id === 'FREE';

              // Price display
              const priceDisplay = isFree
                ? '₹0'
                : billingCycle === 'ANNUAL'
                ? `${currencySymbol}${plan.annualPrice.toLocaleString()}`
                : `${currencySymbol}${plan.price.toLocaleString()}`;

              const periodDisplay = isFree
                ? 'forever'
                : billingCycle === 'ANNUAL'
                ? '/year'
                : '/month';

              const monthlyEquivalent =
                !isFree && billingCycle === 'ANNUAL'
                  ? `~${currencySymbol}${Math.round(plan.annualPrice / 12)}/mo`
                  : null;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all cursor-pointer ${
                    isPro
                      ? 'border-primary shadow-lg bg-card ring-2 ring-primary/20'
                      : isBusiness
                      ? 'border-indigo-500/50 bg-card shadow-xs'
                      : isSelected
                      ? 'border-foreground/50 bg-card shadow-xs'
                      : 'border-border bg-card/60 hover:border-border/80'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <span
                      className={`absolute -top-2.5 right-4 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full tracking-wider shadow-xs ${
                        isPro
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}

                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-base text-foreground flex items-center justify-between">
                        {plan.name}
                        {isCurrent && (
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            Current
                          </Badge>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 min-h-[32px] leading-snug">
                        {plan.tagline}
                      </p>
                    </div>

                    <div className="pt-2 pb-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                          {priceDisplay}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {periodDisplay}
                        </span>
                      </div>
                      {monthlyEquivalent && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          {monthlyEquivalent} (billed annually)
                        </p>
                      )}
                    </div>

                    {/* Hardware / Register Cap */}
                    <div className="py-1 px-2 rounded-md bg-muted/50 border border-border/50 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                      <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        {plan.maxRegisters === 1
                          ? '1 Counter / Register'
                          : `Up to ${plan.maxRegisters} Counters / Devices`}
                      </span>
                    </div>

                    {/* Feature List */}
                    <div className="pt-2 border-t border-border/60 space-y-1.5">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-foreground/90 leading-tight">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border/40">
                    <Button
                      type="button"
                      variant={isCurrent ? 'outline' : isPro ? 'default' : 'secondary'}
                      size="sm"
                      className="w-full font-semibold"
                      disabled={isCurrent || isProcessing}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpgrade(plan.id);
                      }}
                    >
                      {isProcessing && selectedPlan === plan.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isCurrent ? (
                        'Active Plan'
                      ) : isFree ? (
                        'Switch to Free'
                      ) : (
                        `Choose ${plan.name}`
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Gateway Configuration (Collapsible for Developer / Store Admin) */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Payment Gateway Settings
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {razorpayKey.trim() ? '🟢 Razorpay Active' : '🟡 Instant Sandbox'}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setShowGatewayConfig(!showGatewayConfig)}
                className="text-xs text-primary hover:underline font-medium cursor-pointer"
              >
                {showGatewayConfig ? 'Hide Config' : 'Configure Key'}
              </button>
            </div>

            {showGatewayConfig && (
              <div className="pt-2 border-t border-border/50 space-y-2">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter your Razorpay Key ID (<code>rzp_test_...</code> or <code>rzp_live_...</code>). When configured, upgrading launches the real UPI QR, Card & Netbanking modal. Leave blank for instant zero-friction sandbox upgrades.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={razorpayKey}
                    onChange={(e) => handleSaveRazorpayKey(e.target.value)}
                    placeholder="rzp_test_YourKeyIdHere"
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-hidden font-mono"
                  />
                  {razorpayKey && (
                    <button
                      type="button"
                      onClick={() => handleSaveRazorpayKey('')}
                      className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Guarantee & Support Footnote */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Cancel anytime. Offline PWA always retains your local database.</span>
            </div>
            <div className="flex items-center gap-3 font-medium">
              <span>Need help choosing a plan or hardware bundle?</span>
              <a
                href="https://wa.me/919876543210?text=Hello%20MonoPOS%20Support%2C%20I%20need%20help%20with%20my%20subscription"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Chat on WhatsApp →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
