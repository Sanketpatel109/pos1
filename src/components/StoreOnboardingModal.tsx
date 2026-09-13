import React, { useState } from 'react';
import {
  Store,
  Sparkles,
  ArrowRight,
  Check,
  Building2,
  Phone,
  MapPin,
  FileText,
  ShoppingBag,
  Coffee,
  Shirt,
  Pill,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShopSettings } from '../types';

interface StoreOnboardingModalProps {
  isOpen: boolean;
  onComplete: (config: {
    shopSettings: Partial<ShopSettings>;
    useSampleData: boolean;
    businessType: string;
  }) => void;
  initialSettings: ShopSettings;
}

const BUSINESS_TYPES = [
  { id: 'grocery', label: 'Supermarket / Kirana', icon: ShoppingBag, desc: 'FMCG, loose grains, packaged food' },
  { id: 'cafe', label: 'Cafe / Bakery / QSR', icon: Coffee, desc: 'Beverages, bakery items, quick meals' },
  { id: 'clothing', label: 'Apparel / Fashion', icon: Shirt, desc: 'Garments, footwear, sizes & tags' },
  { id: 'pharmacy', label: 'Pharmacy / Health', icon: Pill, desc: 'Medicines, personal care, cosmetics' },
  { id: 'general', label: 'General Retail', icon: Building2, desc: 'Stationery, gifts, electronics, hardware' },
];

export const StoreOnboardingModal: React.FC<StoreOnboardingModalProps> = ({
  isOpen,
  onComplete,
  initialSettings,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Clean slate for new merchants so they see clean fields with helpful placeholders instead of mock demo text
  const isDefaultMockData =
    !initialSettings.shopName ||
    initialSettings.shopName === 'MonoPOS Express' ||
    initialSettings.shopName === 'Anand Supermarket';

  const [shopName, setShopName] = useState(isDefaultMockData ? '' : initialSettings.shopName);
  const [tagline, setTagline] = useState(isDefaultMockData ? '' : (initialSettings.tagline || ''));
  const [phone, setPhone] = useState(isDefaultMockData ? '' : (initialSettings.phone || ''));
  const [address, setAddress] = useState(isDefaultMockData ? '' : (initialSettings.address || ''));
  const [gstin, setGstin] = useState(isDefaultMockData ? '' : (initialSettings.gstin || ''));
  const [currencySymbol, setCurrencySymbol] = useState(initialSettings.currencySymbol || '₹');
  const [businessType, setBusinessType] = useState<string>('grocery');

  if (!isOpen) return null;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!shopName.trim()) return;
      setStep(2);
    } else {
      // Production: Always launch 100% clean fresh store with zero fake sample items
      onComplete({
        shopSettings: {
          shopName: shopName.trim(),
          tagline: tagline.trim(),
          phone: phone.trim(),
          address: address.trim(),
          gstin: gstin.trim(),
          currencySymbol,
          enableDailyToken: businessType === 'cafe',
        },
        useSampleData: false,
        businessType,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-background/85 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10">
        {/* Progress Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-xs">
              M
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-foreground">
                Welcome to MonoPOS Retail
              </h2>
              <p className="text-xs text-muted-foreground">
                Step {step} of 2 — {step === 1 ? 'Store Details' : 'Store Type'}
              </p>
            </div>
          </div>
          {/* Step Indicator */}
          <div className="flex items-center gap-1.5">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step
                    ? 'w-7 bg-primary'
                    : s < step
                    ? 'w-3.5 bg-primary/40'
                    : 'w-3.5 bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleNext} className="p-5 sm:p-6 space-y-5">
          {/* STEP 1: Store Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="ob-name" className="text-xs font-semibold">Store / Business Name *</Label>
                <div className="relative">
                  <Store className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="ob-name"
                    placeholder="e.g., Krishna Supermarket, Blue Cafe"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="pl-9 h-11"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ob-currency" className="text-xs font-semibold">Currency</Label>
                  <select
                    id="ob-currency"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="₹">₹ (INR - Indian Rupee)</option>
                    <option value="$">$ (USD / International)</option>
                    <option value="£">£ (GBP - British Pound)</option>
                    <option value="€">€ (EUR - Euro)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="৳">৳ (BDT - Taka)</option>
                    <option value="₨">₨ (PKR / NPR)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ob-phone" className="text-xs font-semibold">Contact Phone</Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="ob-phone"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 h-11"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="ob-address" className="text-xs font-semibold">Address / City</Label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="ob-address"
                    placeholder="Shop #12, Market Road, Mumbai"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="ob-gstin" className="text-xs font-semibold">GSTIN / Tax ID (Optional)</Label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="ob-gstin"
                    placeholder="27AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="pl-9 h-11 uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Business Type */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Select your business type so we can tailor your categories and receipt layouts:
              </p>

              <div className="space-y-2">
                {BUSINESS_TYPES.map((bt) => {
                  const Icon = bt.icon;
                  const isSelected = businessType === bt.id;
                  return (
                    <div
                      key={bt.id}
                      onClick={() => setBusinessType(bt.id)}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs'
                          : 'border-border bg-card hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{bt.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{bt.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Clean store guarantee pill */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                  <strong>Clean Fresh Store:</strong> Initializes with ₹0 balance and 0 dummy data, ready for your real products and barcodes.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            {step === 2 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
              >
                ← Back
              </Button>
            ) : (
              <div />
            )}

            <Button type="submit" size="default" className="font-semibold gap-1.5">
              {step === 2 ? (
                <>
                  <Check className="w-4 h-4" />
                  Launch Store
                </>
              ) : (
                <>
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
