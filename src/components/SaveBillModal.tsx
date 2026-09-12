import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Percent,
  Check,
  CreditCard,
  Banknote,
  Smartphone,
  Split,
  Plus,
  Receipt,
  FileText,
  Vault,
  AlertTriangle,
  ArrowRight,
  Printer,
  Send,
  QrCode,
  Volume2,
  ShieldCheck,
  Copy,
  ExternalLink,
  Maximize2,
  Sparkles,
  CheckCircle2,
  Radio,
  RefreshCw,
  Star,
  MessageSquare as Comment,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Customer, PaymentMethod, ShopSettings, SplitPaymentDetail } from '../types';
import { SplitPaymentModal } from './SplitPaymentModal';
import { hardware } from '../utils/hardware';
import { posSound } from '../utils/sound';

interface SaveBillModalProps {
  isOpen: boolean;
  subtotal: number;
  taxRate: number;
  customers: Customer[];
  currencySymbol: string;
  orderNumber?: number;
  shopSettings?: ShopSettings;
  onClose: () => void;
  onAddNewCustomer: (name: string, phone: string) => void;
  onSaveAndComplete: (data: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    discountPercent: number;
    discountAmount: number;
    includeGst: boolean;
    taxAmount: number;
    grandTotal: number;
    paymentMode: PaymentMethod;
    splitDetails?: SplitPaymentDetail;
    tenderedAmount?: number;
    changeDue?: number;
    note?: string;
    orderDate: string;
    printReceipt?: boolean;
    shareWhatsApp?: boolean;
    upiRefNumber?: string;
    isVerified?: boolean;
    verificationMethod?: 'soundbox' | 'utr' | 'gateway' | 'cash_tender';
  }) => void;
}

export const SaveBillModal: React.FC<SaveBillModalProps> = ({
  isOpen,
  subtotal,
  taxRate,
  customers,
  currencySymbol,
  orderNumber,
  shopSettings,
  onClose,
  onAddNewCustomer,
  onSaveAndComplete,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');

  // Discount
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [flatDiscount, setFlatDiscount] = useState<string>('0');

  // Tax & Note
  const [includeGst, setIncludeGst] = useState<boolean>(taxRate > 0);
  const [billNote, setBillNote] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString();
  });

  // Payment Method
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('CASH');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [splitDetails, setSplitDetails] = useState<SplitPaymentDetail>({
    cash: 0,
    online: 0,
    credit: 0,
  });
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);

  // Filtered customers
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Calculate final totals
  const discountAmount =
    discountType === 'percent'
      ? (subtotal * discountPercent) / 100
      : parseFloat(flatDiscount) || 0;

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = includeGst ? (discountedSubtotal * taxRate) / 100 : 0;
  const grandTotal = discountedSubtotal + taxAmount;

  // Tendered & Change calculations
  const tenderedNumeric = tenderedAmount ? parseFloat(tenderedAmount) || 0 : grandTotal;
  const hasEnteredTender = Boolean(tenderedAmount && !isNaN(parseFloat(tenderedAmount)));
  const changeDue = Math.max(0, (hasEnteredTender ? tenderedNumeric : grandTotal) - grandTotal);
  const shortAmount = Math.max(0, grandTotal - (hasEnteredTender ? tenderedNumeric : grandTotal));

  // Quick note presets for Cash payments (e.g. ₹20, ₹50, ₹100, ₹200, ₹500)
  const quickNotePresets = (
    currencySymbol === '$'
      ? [
          { label: 'Exact', amount: Math.ceil(grandTotal) },
          { label: `${currencySymbol}5`, amount: 5 },
          { label: `${currencySymbol}10`, amount: 10 },
          { label: `${currencySymbol}20`, amount: 20 },
          { label: `${currencySymbol}50`, amount: 50 },
          { label: `${currencySymbol}100`, amount: 100 },
        ]
      : [
          { label: 'Exact', amount: Math.ceil(grandTotal) },
          { label: `${currencySymbol}10`, amount: 10 },
          { label: `${currencySymbol}20`, amount: 20 },
          { label: `${currencySymbol}50`, amount: 50 },
          { label: `${currencySymbol}100`, amount: 100 },
          { label: `${currencySymbol}200`, amount: 200 },
          { label: `${currencySymbol}500`, amount: 500 },
        ]
  ).filter((p) => {
    if (p.label === 'Exact') return true;
    // Include all popular notes that are either >= 20 or >= grandTotal
    return p.amount >= grandTotal || p.amount >= 20;
  });

  // Payment Verification States (Option 1: Soundbox/UTR, Option 2: Auto Gateway, Option 3: Cash)
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [upiRefNumber, setUpiRefNumber] = useState<string>('');
  const [isUpiVerified, setIsUpiVerified] = useState<boolean>(false);
  const [isSoundboxAnnouncing, setIsSoundboxAnnouncing] = useState<boolean>(false);
  const [isAutoVerifying, setIsAutoVerifying] = useState<boolean>(false);
  const [verificationMethod, setVerificationMethod] = useState<
    'soundbox' | 'utr' | 'gateway' | 'cash_tender'
  >('soundbox');
  const [activeUpiTab, setActiveUpiTab] = useState<'soundbox' | 'auto'>('soundbox');
  const [isQrZoomed, setIsQrZoomed] = useState<boolean>(false);
  const [copiedLinkToast, setCopiedLinkToast] = useState<boolean>(false);

  const currentUpiId = shopSettings?.upiId || 'monopos.merchant@okhdfcbank';
  const payeeName = shopSettings?.upiPayeeName || shopSettings?.shopName || 'Retail Store';
  const upiIntentUri = `upi://pay?pa=${currentUpiId}&pn=${encodeURIComponent(
    payeeName
  )}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    `Bill #${orderNumber || '1'}`
  )}`;

  // Generate dynamic QR
  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(upiIntentUri, {
      width: 280,
      margin: 1,
      color: {
        dark: '#18181b',
        light: '#ffffff',
      },
    })
      .then((url) => setUpiQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [isOpen, upiIntentUri]);

  useEffect(() => {
    if (shopSettings?.upiVerificationMode) {
      setActiveUpiTab(shopSettings.upiVerificationMode);
    }
  }, [shopSettings?.upiVerificationMode]);

  // Soundbox Voice announcement and 1-tap confirmation
  const handleConfirmSoundbox = () => {
    setIsSoundboxAnnouncing(true);
    posSound.playBeep();
    setTimeout(() => {
      posSound.playSuccess();
    }, 120);

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          `Payment of ${grandTotal.toFixed(0)} rupees received on UPI`
        );
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    } catch {}

    const generatedUtr = `SBX${Math.floor(100000 + Math.random() * 900000)}`;
    setUpiRefNumber((prev) => prev || generatedUtr);
    setIsUpiVerified(true);
    setVerificationMethod('soundbox');
    setTimeout(() => setIsSoundboxAnnouncing(false), 2000);
  };

  // Auto-Verify simulation (Option 2 Gateway)
  const handleTriggerAutoVerify = () => {
    setIsAutoVerifying(true);
    setTimeout(() => {
      setIsAutoVerifying(false);
      setIsUpiVerified(true);
      setVerificationMethod('gateway');
      const randomUtr = `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      setUpiRefNumber(randomUtr);
      posSound.playSuccess();

      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            `Payment verified! ${grandTotal.toFixed(0)} rupees received.`
          );
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } catch {}
    }, 1200);
  };

  const handleCopyUpiLink = () => {
    navigator.clipboard.writeText(upiIntentUri);
    setCopiedLinkToast(true);
    setTimeout(() => setCopiedLinkToast(false), 2000);
  };

  if (!isOpen) return null;

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;
    onAddNewCustomer(newCustName.trim(), newCustPhone.trim());
    setIsAddingNewCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  const handleFinalSubmit = (
    action: 'paid-only' | 'pay-and-print' | 'pay-and-whatsapp' = 'paid-only'
  ) => {
    if (paymentMode === 'CREDIT' && !selectedCustomer) {
      alert('Please select or add a customer to issue credit (Khata).');
      return;
    }

    // Cash verification guard against short payment
    if (paymentMode === 'CASH' && hasEnteredTender && tenderedNumeric < grandTotal) {
      if (
        !window.confirm(
          `Warning: Customer gave ${currencySymbol}${tenderedNumeric.toFixed(2)}, which is less than the bill of ${currencySymbol}${grandTotal.toFixed(2)}. Do you still want to proceed?`
        )
      ) {
        return;
      }
    }

    const finalTendered =
      paymentMode === 'CASH'
        ? hasEnteredTender
          ? tenderedNumeric
          : grandTotal
        : grandTotal;
    const finalChange =
      paymentMode === 'CASH'
        ? Math.max(0, finalTendered - grandTotal)
        : 0;

    // Pop physical cash drawer if cash transaction
    if (paymentMode === 'CASH') {
      hardware.kickCashDrawer();
    }

    const cleanInputPhone = customerSearch.replace(/\D/g, '');
    const detectedPhone = selectedCustomer
      ? selectedCustomer.phone
      : cleanInputPhone.length >= 10
      ? cleanInputPhone
      : '';

    onSaveAndComplete({
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer
        ? selectedCustomer.name
        : detectedPhone
        ? `Customer (${detectedPhone})`
        : 'Walk-in Customer',
      customerPhone: detectedPhone,
      discountPercent: discountType === 'percent' ? discountPercent : 0,
      discountAmount,
      includeGst,
      taxAmount,
      grandTotal,
      paymentMode,
      splitDetails: paymentMode === 'SPLIT' ? splitDetails : undefined,
      tenderedAmount: finalTendered,
      changeDue: finalChange,
      note: billNote.trim() || undefined,
      orderDate,
      printReceipt: action === 'pay-and-print',
      shareWhatsApp: action === 'pay-and-whatsapp',
      upiRefNumber: paymentMode === 'ONLINE' ? upiRefNumber : undefined,
      isVerified:
        paymentMode === 'ONLINE'
          ? isUpiVerified
          : paymentMode === 'CASH'
          ? hasEnteredTender && tenderedNumeric >= grandTotal
          : true,
      verificationMethod:
        paymentMode === 'ONLINE' ? verificationMethod : 'cash_tender',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md border border-zinc-200 shadow-xl overflow-hidden flex flex-col max-h-[92vh] text-zinc-900">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200/80 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-sm text-zinc-900">Finalize & Pay Bill</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Customer Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-foreground" />
                <span>Customer (Optional)</span>
              </label>
              {!isAddingNewCustomer && (
                <button
                  onClick={() => setIsAddingNewCustomer(true)}
                  className="text-xs font-bold text-foreground hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Customer</span>
                </button>
              )}
            </div>

            {isAddingNewCustomer ? (
              <form
                onSubmit={handleCreateCustomer}
                className="bg-muted/50 p-3 rounded-xl border border-border space-y-2"
              >
                <div className="flex justify-between items-center text-xs font-bold text-foreground">
                  <span>Add New Customer</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCustomer(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden"
                  autoFocus
                />
                <input
                  type="tel"
                  placeholder="10-digit Mobile Number"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-foreground text-background text-white rounded-lg text-xs font-bold hover:bg-black transition-all cursor-pointer"
                >
                  Save Customer
                </button>
              </form>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (selectedCustomerId) setSelectedCustomerId('');
                  }}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-foreground"
                />

                {customerSearch && (
                  <div className="max-h-28 overflow-y-auto bg-white border border-border rounded-xl divide-y divide-[#d4d4d8] shadow-sm">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        No matching customer found
                      </div>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            setCustomerSearch(`${cust.name} (${cust.phone})`);
                          }}
                          className="w-full p-2 text-left text-xs hover:bg-muted/50 flex justify-between items-center"
                        >
                          <span className="font-semibold text-foreground">{cust.name}</span>
                          <div className="flex items-center gap-2">
                            {cust.loyaltyPoints !== undefined && cust.loyaltyPoints > 0 && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 text-amber-500" />
                                <span>{cust.loyaltyPoints} pts</span>
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {cust.phone}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg text-xs flex items-center justify-between">
                    <span className="text-primary font-medium truncate">
                      {selectedCustomer.name} • {selectedCustomer.phone}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 text-amber-500" />
                        <span>{selectedCustomer.loyaltyPoints || 0} pts</span>
                      </span>
                      {selectedCustomer.creditBalance > 0 && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          Khata: {currencySymbol}{selectedCustomer.creditBalance}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discount Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-foreground" />
              <span>Discount</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 5, 10].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setDiscountType('percent');
                    setDiscountPercent(pct);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    discountType === 'percent' && discountPercent === pct
                      ? 'bg-foreground text-background text-white border-foreground'
                      : 'bg-white text-muted-foreground border-border hover:bg-muted/50'
                  }`}
                >
                  {pct === 0 ? 'No Disc.' : `${pct}%`}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setDiscountType('flat')}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  discountType === 'flat'
                    ? 'bg-foreground text-background text-white border-foreground'
                    : 'bg-white text-muted-foreground border-border hover:bg-muted/50'
                }`}
              >
                Flat {currencySymbol}
              </button>
            </div>

            {discountType === 'flat' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Flat Amount:</span>
                <input
                  type="number"
                  value={flatDiscount}
                  onChange={(e) => setFlatDiscount(e.target.value)}
                  className="flex-1 bg-white border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-hidden "
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* Tax Checkbox */}
          <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-xl border border-border">
            <span className="text-xs font-semibold text-foreground">
              Include Tax ({taxRate}%)
            </span>
            <input
              type="checkbox"
              checked={includeGst}
              onChange={(e) => setIncludeGst(e.target.checked)}
              className="w-4 h-4 rounded text-foreground focus:ring-0 cursor-pointer accent-[#18181b]"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Payment Method :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  paymentMode === 'CASH'
                    ? 'bg-foreground text-background text-white border-foreground shadow-xs'
                    : 'bg-white text-foreground border-border hover:bg-muted/50'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>CASH</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('ONLINE')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  paymentMode === 'ONLINE'
                    ? 'bg-foreground text-background text-white border-foreground shadow-xs'
                    : 'bg-white text-foreground border-border hover:bg-muted/50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>ONLINE / UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('CREDIT')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  paymentMode === 'CREDIT'
                    ? 'bg-foreground text-background text-white border-foreground shadow-xs'
                    : 'bg-white text-foreground border-border hover:bg-muted/50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>KHATA (CREDIT)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMode('SPLIT');
                  setIsSplitModalOpen(true);
                }}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                  paymentMode === 'SPLIT'
                    ? 'bg-foreground text-background text-white border-foreground shadow-xs'
                    : 'bg-white text-foreground border-border hover:bg-muted/50'
                }`}
              >
                <Split className="w-4 h-4" />
                <span>SPLIT PAY</span>
              </button>
            </div>

            {/* CASH TENDERED & CHANGE CALCULATOR */}
            {paymentMode === 'CASH' && (
              <div className="mt-3 bg-muted/50 border-2 border-primary/30 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-150 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    <Banknote className="w-4 h-4 text-primary" />
                    <span>Cash Tendered (Customer Gave)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => hardware.kickCashDrawer()}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground bg-white px-2.5 py-1 rounded-lg border border-border flex items-center gap-1 hover:bg-muted transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Trigger physical USB/RJ11 Cash Drawer kick"
                  >
                    <Vault className="w-3 h-3 text-foreground" />
                    <span>Pop Drawer</span>
                  </button>
                </div>

                {/* Quick Currency Note Denomination Chips */}
                <div>
                  <div className="text-[10px] text-muted-foreground font-medium mb-1.5 flex items-center justify-between">
                    <span>Quick Currency Notes:</span>
                    <span className="text-[10px] text-zinc-500 ">Tap note handed by customer</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickNotePresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setTenderedAmount(preset.amount.toString())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                          parseFloat(tenderedAmount) === preset.amount
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm scale-105 ring-2 ring-primary/30'
                            : 'bg-white text-foreground border-border hover:bg-zinc-100 hover:border-zinc-400'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Tendered Input Field */}
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-muted-foreground text-base font-bold">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder={grandTotal.toFixed(2)}
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    className="w-full pl-8 pr-16 py-2 bg-white border-2 border-border rounded-xl text-lg font-black text-foreground focus:outline-hidden focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-inner"
                  />
                  {tenderedAmount && (
                    <button
                      type="button"
                      onClick={() => setTenderedAmount('')}
                      className="absolute right-2 top-2 px-2.5 py-1 text-[10px] font-bold bg-muted hover:bg-border text-muted-foreground rounded-lg transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Live Return Change vs Short Payment Readout */}
                {hasEnteredTender && tenderedNumeric > grandTotal ? (
                  <div className="bg-primary/10 border-2 border-primary/40 rounded-xl p-3 flex items-center justify-between text-primary shadow-sm animate-in zoom-in-95 duration-150">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-primary stroke-[3]" />
                        <span>Customer Gave {currencySymbol}{tenderedNumeric.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-primary font-medium">
                        Bill is {currencySymbol}{grandTotal.toFixed(2)} &middot; Return to customer:
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                        Change To Return
                      </span>
                      <span className="text-2xl font-black text-primary tracking-tight">
                        {currencySymbol}{changeDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : hasEnteredTender && tenderedNumeric < grandTotal ? (
                  <div className="bg-amber-50 border-2 border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-amber-950 shadow-sm animate-in zoom-in-95 duration-150">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.5]" />
                        <span>Short / Underpaid by Customer</span>
                      </div>
                      <p className="text-xs text-amber-900 font-medium">
                        Customer gave {currencySymbol}{tenderedNumeric.toFixed(2)} of {currencySymbol}{grandTotal.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        Still Owed
                      </span>
                      <span className="text-2xl font-black text-amber-700 tracking-tight">
                        {currencySymbol}{shortAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-border rounded-xl p-2.5 flex items-center justify-between text-zinc-700 text-xs">
                    <span className="font-semibold text-zinc-600">Exact Cash Expected:</span>
                    <span className="font-bold text-zinc-900">
                      {currencySymbol}{grandTotal.toFixed(2)} (No change due)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ONLINE / UPI PAYMENT & 3-WAY VERIFICATION SYSTEM */}
            {paymentMode === 'ONLINE' && (
              <div className="mt-3 bg-white border-2 border-primary/40 rounded-2xl p-3.5 space-y-3.5 animate-in fade-in duration-150 shadow-sm">
                {/* Verification Status Banner */}
                {isUpiVerified ? (
                  <div className="bg-primary text-primary-foreground rounded-xl p-3 flex items-center justify-between shadow-xs animate-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider">
                          Payment Verified & Confirmed
                        </div>
                        <div className="text-[11px] opacity-95">
                          {currencySymbol}{grandTotal.toFixed(2)} &middot; {upiRefNumber || 'Confirmed'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUpiVerified(false);
                        setUpiRefNumber('');
                      }}
                      className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg text-white font-semibold transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                      <span className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                        Dynamic UPI Payment & Verification
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                      Auto Amount: {currencySymbol}{grandTotal.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* 1. Dynamic UPI QR Code Display with Indian Apps */}
                <div className="bg-gradient-to-b from-zinc-50 to-white border border-zinc-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3.5">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setIsQrZoomed(true)}
                    title="Tap to zoom QR for customer"
                  >
                    {upiQrDataUrl ? (
                      <div className="relative bg-white p-1.5 rounded-xl border border-zinc-300 shadow-2xs">
                        <img
                          src={upiQrDataUrl}
                          alt="Dynamic UPI Payment QR"
                          className="w-32 h-32 rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Enlarge</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsQrZoomed(true);
                      }}
                      className="mt-1 w-full text-[10px] text-zinc-600 font-bold flex items-center justify-center gap-1 hover:text-zinc-900 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Zoom for Customer</span>
                    </button>
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div>
                      <div className="text-[11px] font-medium text-zinc-500">Scan using any UPI App:</div>
                      <div className="text-xs font-bold text-zinc-800 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap mt-0.5">
                        <span className="bg-white px-1.5 py-0.5 rounded border border-zinc-200 text-[10px]">Google Pay</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-zinc-200 text-[10px]">PhonePe</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-zinc-200 text-[10px]">Paytm</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-zinc-200 text-[10px]">BHIM</span>
                      </div>
                    </div>

                    <div className="bg-zinc-100/80 rounded-lg p-1.5 text-[10px] text-zinc-600 break-all">
                      <span className="text-zinc-400 select-none">UPI: </span>
                      <span className="font-semibold text-zinc-800">{currentUpiId}</span>
                    </div>

                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={handleCopyUpiLink}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedLinkToast ? 'Copied Link!' : 'Copy Intent Link'}</span>
                      </button>

                      <a
                        href={upiIntentUri}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer sm:hidden"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Pay in App</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Verification Mode Switcher (Option 1 vs Option 2) */}
                <div className="space-y-2">
                  <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveUpiTab('soundbox')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeUpiTab === 'soundbox'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Option 1: Soundbox / UTR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveUpiTab('auto')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeUpiTab === 'auto'
                          ? 'bg-white text-primary shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>Option 2: Auto-Verify</span>
                    </button>
                  </div>

                  {/* Mode 1: Soundbox Voice Confirmation & Manual UTR */}
                  {activeUpiTab === 'soundbox' && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-700 flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Soundbox / Speaker Announcement</span>
                        </span>
                        <span className="text-[9px] text-zinc-500 font-medium">Paytm / PhonePe Soundbox</span>
                      </div>

                      {/* 1-Tap Soundbox Confirmation Button */}
                      <button
                        type="button"
                        onClick={handleConfirmSoundbox}
                        className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-extrabold transition-all cursor-pointer ${
                          isSoundboxAnnouncing
                            ? 'bg-indigo-600 text-white border-indigo-600 animate-pulse'
                            : 'bg-white text-indigo-950 border-indigo-200 hover:bg-indigo-50/70 hover:border-indigo-300 shadow-2xs'
                        }`}
                      >
                        <Volume2 className="w-4 h-4 text-indigo-600" />
                        <span>
                          {isSoundboxAnnouncing
                            ? 'Announcing Soundbox Audio...'
                            : `Confirm Soundbox Announced (${currencySymbol}${grandTotal.toFixed(0)})`}
                        </span>
                      </button>

                      <div className="relative flex items-center justify-center my-1">
                        <div className="border-t border-zinc-200 w-full" />
                        <span className="bg-zinc-50 px-2 text-[10px] text-zinc-400 font-medium uppercase">
                          OR enter reference / UTR
                        </span>
                      </div>

                      {/* Manual UTR Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="12-digit UTR from customer screen (or last 4)"
                          value={upiRefNumber}
                          onChange={(e) => {
                            setUpiRefNumber(e.target.value);
                            if (e.target.value.length >= 4) {
                              setIsUpiVerified(true);
                              setVerificationMethod('utr');
                            }
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:border-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (upiRefNumber.trim()) {
                              setIsUpiVerified(true);
                              setVerificationMethod('utr');
                              posSound.playSuccess();
                            } else {
                              const autoRef = `UTR${Math.floor(100000 + Math.random() * 900000)}`;
                              setUpiRefNumber(autoRef);
                              setIsUpiVerified(true);
                              setVerificationMethod('utr');
                              posSound.playSuccess();
                            }
                          }}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          Verify UTR
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Auto-Verify Simulation (Gateway / Webhook) */}
                  {activeUpiTab === 'auto' && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
                          <span>Bank Webhook & Gateway Listener</span>
                        </span>
                        <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">
                          STATUS: {isUpiVerified ? 'VERIFIED' : 'WAITING FOR PAYMENT'}
                        </span>
                      </div>

                      <p className="text-[11px] text-primary/80 leading-snug">
                        Simulate the incoming cloud webhook notification from HDFC/ICICI/Razorpay/Cashfree.
                      </p>

                      <button
                        type="button"
                        disabled={isAutoVerifying || isUpiVerified}
                        onClick={handleTriggerAutoVerify}
                        className={`w-full py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isUpiVerified
                            ? 'bg-primary text-primary-foreground border-primary'
                            : isAutoVerifying
                            ? 'bg-zinc-800 text-white border-zinc-800 animate-pulse cursor-wait'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground border-primary shadow-xs active:scale-95'
                        }`}
                      >
                        {isAutoVerifying ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Receiving Bank Webhook...</span>
                          </>
                        ) : isUpiVerified ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Payment Approved by Bank Gateway!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Simulate Customer Scan & Payment Approval (1-Tap)</span>
                          </>
                        )}
                      </button>

                      {isUpiVerified && (
                        <div className="text-[10px] text-primary text-center">
                          Gateway Reference: <span className="font-bold">{upiRefNumber}</span> &middot; Confirmed via UPI
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bill Calculation Summary Box */}
          <div className="bg-secondary p-3 rounded-xl border border-border space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span className="">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-[#ba1a1a]">
                <span>Discount:</span>
                <span className="">
                  -{currencySymbol}
                  {discountAmount.toFixed(2)}
                </span>
              </div>
            )}

            {includeGst && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({taxRate}%):</span>
                <span className="">
                  +{currencySymbol}
                  {taxAmount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-end border-t border-border pt-1.5 text-sm font-bold text-foreground">
              <span>Final Total Due:</span>
              <span className="text-xl font-extrabold ">
                {currencySymbol}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer - Optimized for Mobile, Tablet & Web */}
        <div className="p-3.5 bg-white border-t border-zinc-200/80 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 font-medium text-xs cursor-pointer active:scale-95 transition-all shrink-0"
            >
              Cancel
            </button>

            {/* PAY & PRINT (Traditional Paper Slip) */}
            <button
              type="button"
              onClick={() => handleFinalSubmit('pay-and-print')}
              className="flex-1 h-11 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 font-medium text-xs shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-600" />
              <span>PAY & PRINT</span>
            </button>

            {/* PAID ONLY (Instant Finish - Fastest for UPI/Cash in India) */}
            <button
              type="button"
              onClick={() => handleFinalSubmit('paid-only')}
              className="flex-[1.4] h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs sm:text-sm shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>PAID ONLY</span>
            </button>
          </div>

          {/* Quick WhatsApp Bill option if customer phone is detected */}
          {(selectedCustomer?.phone || customerSearch.replace(/\D/g, '').length >= 10) && (
            <button
              type="button"
              onClick={() => handleFinalSubmit('pay-and-whatsapp')}
              className="w-full h-10 bg-primary/10 hover:bg-primary/15 text-primary border border-primary/30 font-medium text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Comment className="w-3.5 h-3.5 text-primary" />
              <span>Complete & WhatsApp Bill to {selectedCustomer?.phone || customerSearch.trim()}</span>
            </button>
          )}
        </div>
      </div>

      {/* Customer Full-Screen QR Modal (Scan from across the counter) */}
      {isQrZoomed && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsQrZoomed(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <div className="text-left">
                <h3 className="font-black text-sm text-zinc-900">{payeeName}</h3>
                <p className="text-[11px] text-zinc-500 ">UPI: {currentUpiId}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsQrZoomed(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-50 p-4 rounded-2xl border-2 border-dashed border-zinc-300 flex justify-center">
              {upiQrDataUrl && (
                <img
                  src={upiQrDataUrl}
                  alt="Full Screen UPI QR"
                  className="w-64 h-64 rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Total Amount To Pay
              </div>
              <div className="text-3xl font-black text-zinc-900">
                {currencySymbol}{grandTotal.toFixed(2)}
              </div>
              <p className="text-[11px] text-zinc-500">
                Scan with Google Pay, PhonePe, Paytm, BHIM, or any Banking App
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleConfirmSoundbox();
                  setIsQrZoomed(false);
                }}
                className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Soundbox Announced</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQrZoomed(false)}
                className="px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Payment Allocation Modal */}
      {isSplitModalOpen && (
        <SplitPaymentModal
          isOpen={isSplitModalOpen}
          grandTotal={grandTotal}
          currencySymbol={currencySymbol}
          initialSplit={splitDetails}
          onClose={() => setIsSplitModalOpen(false)}
          onSaveSplit={(split) => {
            setSplitDetails(split);
            setIsSplitModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
