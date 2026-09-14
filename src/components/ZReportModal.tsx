import React, { useState } from 'react';
import {
  Printer,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Calculator,
  ChevronDown,
  ChevronUp,
  Eye,
  Share2,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Order, CashEntry, ShopSettings, ZReportData } from '../types';
import { CashDenominationCounter } from './CashDenominationCounter';
import { printThermalHtml } from '../utils/thermalPrinter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ZReportModalProps {
  isOpen: boolean;
  orders: Order[];
  cashEntries: CashEntry[];
  shopSettings: ShopSettings;
  activeStaffName: string;
  onClose: () => void;
  onSaveZReport?: (report: ZReportData) => void;
}

export const ZReportModal: React.FC<ZReportModalProps> = ({
  isOpen,
  orders,
  cashEntries,
  shopSettings,
  activeStaffName,
  onClose,
  onSaveZReport,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'slip'>('audit');

  // Opening Float
  const openingEntry = cashEntries.find((c) => c.type === 'OPENING');
  const openingFloat = openingEntry ? openingEntry.amount : 500;

  // Cash In / Cash Out
  const cashIn = cashEntries
    .filter((c) => c.type === 'IN')
    .reduce((sum, c) => sum + c.amount, 0);

  const cashOut = cashEntries
    .filter((c) => c.type === 'OUT')
    .reduce((sum, c) => sum + c.amount, 0);

  // Sales totals
  const cashSales = orders
    .filter((o) => o.paymentMethod === 'CASH' && o.status === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  const onlineSales = orders
    .filter(
      (o) =>
        (o.paymentMethod === 'ONLINE' || o.paymentMethod === 'UPI' || o.paymentMethod === 'CARD') &&
        o.status === 'completed'
    )
    .reduce((sum, o) => sum + o.total, 0);

  const creditSales = orders
    .filter(
      (o) =>
        (o.paymentMethod === 'CREDIT' || o.paymentMethod === 'KHATA') &&
        o.status === 'completed'
    )
    .reduce((sum, o) => sum + o.total, 0);

  const splitSales = orders
    .filter((o) => o.paymentMethod === 'SPLIT' && o.status === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  const totalSales = cashSales + onlineSales + creditSales + splitSales;
  const totalOrders = orders.filter((o) => o.status === 'completed').length;
  const totalTax = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + (o.taxAmount || 0), 0);

  // Expected Cash
  const expectedDrawerCash = openingFloat + cashSales + cashIn - cashOut;

  // Cashier Counted Input
  const [actualCountedCash, setActualCountedCash] = useState<number>(expectedDrawerCash);
  const [showDenominations, setShowDenominations] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isFinalized, setIsFinalized] = useState<boolean>(false);
  const [printSuccessNotice, setPrintSuccessNotice] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  const currencySymbol = shopSettings.currencySymbol || '₹';
  const variance = actualCountedCash - expectedDrawerCash;
  const isShort = variance < -0.01;
  const isExcess = variance > 0.01;
  const isExact = Math.abs(variance) <= 0.01;

  // Discrepancy requirement rule: If short, cashier MUST provide reason before closing
  const isShortageWithoutReason = isShort && !notes.trim();

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const generateZSlipHtml = () => {
    return `
      <div class="text-center pb-2 mb-2 divider">
        ${
          shopSettings.logoUrl && shopSettings.printLogoOnReceipt !== false
            ? `<img src="${shopSettings.logoUrl}" style="max-height: 45px; max-width: 140px; margin: 0 auto 4px auto; filter: grayscale(100%); display: block;" />`
            : ''
        }
        <div style="font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">
          ${shopSettings.shopName || 'MonoPOS Retail'}
        </div>
        ${shopSettings.tagline ? `<div style="font-size: 10px; color: #333;">${shopSettings.tagline}</div>` : ''}
        ${shopSettings.address ? `<div style="font-size: 10px; color: #444;">${shopSettings.address}</div>` : ''}
        ${shopSettings.phone ? `<div style="font-size: 10px; color: #444;">Tel: ${shopSettings.phone}</div>` : ''}
        ${shopSettings.gstin ? `<div style="font-size: 10px; font-weight: bold;">GSTIN: ${shopSettings.gstin}</div>` : ''}
      </div>

      <div class="text-center" style="font-weight: 800; font-size: 12px; letter-spacing: 0.5px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px;">
        *** DAILY Z-REPORT / SHIFT AUDIT ***
        <div style="font-size: 9px; font-weight: normal; text-transform: uppercase; margin-top: 2px;">End of Day Register Close</div>
      </div>

      <div class="divider" style="padding-bottom: 6px; font-size: 10px;">
        <div class="row"><span>Report ID:</span><b>Z-${String(now.getTime()).slice(-8)}</b></div>
        <div class="row"><span>Date & Time:</span><span>${formattedDate} ${formattedTime}</span></div>
        <div class="row"><span>Terminal:</span><b>Register ${shopSettings.terminalPrefix || 'A'}</b></div>
        <div class="row"><span>Cashier:</span><b>${activeStaffName}</b></div>
      </div>

      <div class="divider" style="padding-bottom: 6px; font-size: 10px;">
        <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; margin-bottom: 4px;">Sales Breakdown</div>
        <div class="row"><span>Completed Orders:</span><b>${totalOrders}</b></div>
        <div class="row"><span>Cash Sales:</span><span>${currencySymbol}${cashSales.toFixed(2)}</span></div>
        <div class="row"><span>Online / UPI Sales:</span><span>${currencySymbol}${onlineSales.toFixed(2)}</span></div>
        <div class="row"><span>Credit (Khata) Sales:</span><span>${currencySymbol}${creditSales.toFixed(2)}</span></div>
        ${splitSales > 0 ? `<div class="row"><span>Split Payments:</span><span>${currencySymbol}${splitSales.toFixed(2)}</span></div>` : ''}
        ${totalTax > 0 ? `<div class="row" style="color: #444;"><span>GST / Tax Collected:</span><span>${currencySymbol}${totalTax.toFixed(2)}</span></div>` : ''}
        <div class="row dotted-divider" style="font-weight: 800; font-size: 12px; padding-top: 4px; margin-top: 4px;">
          <span>TOTAL SALES:</span>
          <span>${currencySymbol}${totalSales.toFixed(2)}</span>
        </div>
      </div>

      <div class="divider" style="padding-bottom: 6px; font-size: 10px;">
        <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; margin-bottom: 4px;">Cash Drawer Reconciliation</div>
        <div class="row"><span>(+) Opening Float:</span><span>${currencySymbol}${openingFloat.toFixed(2)}</span></div>
        <div class="row"><span>(+) Cash Sales:</span><span>${currencySymbol}${cashSales.toFixed(2)}</span></div>
        <div class="row"><span>(+) Cash In (Jama):</span><span>${currencySymbol}${cashIn.toFixed(2)}</span></div>
        <div class="row"><span>(-) Cash Out (Petty):</span><span>-${currencySymbol}${cashOut.toFixed(2)}</span></div>
        <div class="row dotted-divider" style="font-weight: bold; padding-top: 4px; margin-top: 4px;">
          <span>(=) Expected Drawer Cash:</span>
          <span>${currencySymbol}${expectedDrawerCash.toFixed(2)}</span>
        </div>
        <div class="row" style="font-weight: bold;">
          <span>Actual Counted Cash:</span>
          <span>${currencySymbol}${actualCountedCash.toFixed(2)}</span>
        </div>
        <div class="row" style="font-weight: 800; font-size: 11px; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">
          <span>CASH VARIANCE:</span>
          <span>
            ${variance >= 0 ? '+' : ''}${currencySymbol}${variance.toFixed(2)}
            (${isExact ? 'BALANCED' : isShort ? 'SHORTAGE' : 'EXCESS'})
          </span>
        </div>
        ${notes.trim() ? `<div style="margin-top: 4px; font-size: 9px;"><b>Cashier Remarks:</b> ${notes.trim()}</div>` : ''}
      </div>

      <div class="divider" style="padding-top: 8px; padding-bottom: 8px; font-size: 10px;">
        <div class="row" style="padding: 6px 0;">
          <span>Cashier Signature:</span>
          <span>____________________</span>
        </div>
        <div class="row" style="padding: 6px 0;">
          <span>Manager Signature:</span>
          <span>____________________</span>
        </div>
      </div>

      <div class="text-center" style="font-size: 9px; color: #555; padding-top: 8px;">
        <div>*** SHIFT CLOSED & AUDITED ***</div>
        <div>MonoPOS Retail System Audit Slip</div>
      </div>
    `;
  };

  const handlePrintSlip = () => {
    const html = generateZSlipHtml();
    printThermalHtml(html, `Z-Report-${formattedDate.replace(/ /g, '-')}`);
    setPrintSuccessNotice('Z-Slip sent to printer! Check your printer dialog.');
    setTimeout(() => setPrintSuccessNotice(null), 5000);
  };

  const handleShareWhatsApp = () => {
    let text = `*📊 DAILY Z-REPORT / SHIFT AUDIT*\n`;
    text += `*Store:* ${shopSettings.shopName || 'MonoPOS Retail'}\n`;
    text += `*Date & Time:* ${formattedDate} ${formattedTime}\n`;
    text += `*Cashier:* ${activeStaffName} | *Terminal:* Register ${shopSettings.terminalPrefix || 'A'}\n`;
    text += `--------------------------------\n`;
    text += `*Total Bills:* ${totalOrders}\n`;
    text += `*Cash Sales:* ${currencySymbol}${cashSales.toFixed(2)}\n`;
    text += `*Online/UPI:* ${currencySymbol}${onlineSales.toFixed(2)}\n`;
    text += `*Credit/Khata:* ${currencySymbol}${creditSales.toFixed(2)}\n`;
    if (splitSales > 0) text += `*Split Payments:* ${currencySymbol}${splitSales.toFixed(2)}\n`;
    if (totalTax > 0) text += `*GST / Tax:* ${currencySymbol}${totalTax.toFixed(2)}\n`;
    text += `*TOTAL REVENUE: ${currencySymbol}${totalSales.toFixed(2)}*\n`;
    text += `--------------------------------\n`;
    text += `*Opening Float:* ${currencySymbol}${openingFloat.toFixed(2)}\n`;
    text += `*Expected Drawer Cash:* ${currencySymbol}${expectedDrawerCash.toFixed(2)}\n`;
    text += `*Actual Counted Cash:* ${currencySymbol}${actualCountedCash.toFixed(2)}\n`;
    text += `*Cash Variance:* *${variance >= 0 ? '+' : ''}${currencySymbol}${variance.toFixed(2)} (${isExact ? 'BALANCED' : isShort ? 'SHORTAGE' : 'EXCESS'})*\n`;
    if (notes.trim()) text += `*Remarks:* ${notes.trim()}\n`;
    text += `--------------------------------\n`;
    text += `_Generated via MonoPOS Retail Engine_`;

    try {
      navigator.clipboard.writeText(text);
    } catch {}

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleFinalize = () => {
    if (isShortageWithoutReason) return;

    const report: ZReportData = {
      id: `z-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      closedAt: new Date().toLocaleTimeString(),
      staffName: activeStaffName,
      openingFloat,
      cashSales,
      onlineSales,
      creditSales,
      totalSales,
      totalOrders,
      cashIn,
      cashOut,
      expectedDrawerCash,
      actualCountedCash,
      variance,
      note: notes.trim() || 'End of shift balanced',
    };

    const savedReports = JSON.parse(localStorage.getItem('monopos_z_reports') || '[]');
    savedReports.unshift(report);
    localStorage.setItem('monopos_z_reports', JSON.stringify(savedReports));

    setIsFinalized(true);
    if (onSaveZReport) onSaveZReport(report);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Printable Z-Slip DOM backup for direct spoolers */}
      <div
        id="printable-z-report-slip"
        className="z-report-print-slip print:m-0 w-full max-w-[320px] mx-auto bg-white text-black text-[11px] leading-tight font-mono"
        dangerouslySetInnerHTML={{ __html: generateZSlipHtml() }}
      />

      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold text-foreground leading-tight">
                    Day-End Close & Cash Audit (Z-Report)
                  </DialogTitle>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                    Dukaan Hisaab
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Reconcile physical cash drawer with terminal sales before shift closing
                </DialogDescription>
              </div>
            </div>

            {/* Segmented Tab Navigation for UX */}
            <div className="flex items-center bg-muted p-1 rounded-lg border border-border shrink-0 self-start sm:self-auto">
              <Button
                variant={activeTab === 'audit' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('audit')}
                className="h-7 px-3 text-xs font-semibold cursor-pointer"
              >
                <Calculator className="size-3.5 mr-1" />
                Audit Input
              </Button>
              <Button
                variant={activeTab === 'slip' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('slip')}
                className="h-7 px-3 text-xs font-semibold cursor-pointer"
              >
                <Receipt className="size-3.5 mr-1" />
                Preview Z-Slip
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Notice Toast */}
        {printSuccessNotice && (
          <div className="px-4 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="size-4 text-emerald-600 shrink-0" />
            <span>{printSuccessNotice}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-foreground">
          {activeTab === 'slip' ? (
            /* ─── Thermal Z-Slip Live Preview Mode ─── */
            <div className="flex flex-col items-center py-1">
              <div className="w-full max-w-[340px] bg-white border border-border shadow-md rounded-xl p-4 font-mono text-[11px] leading-tight text-black">
                <div dangerouslySetInnerHTML={{ __html: generateZSlipHtml() }} />
              </div>
            </div>
          ) : (
            /* ─── Cash Drawer Audit Mode ─── */
            <>
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Card className="p-3 border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                    Cashier
                  </span>
                  <span className="font-bold text-foreground text-xs truncate block">
                    {activeStaffName}
                  </span>
                </Card>
                <Card className="p-3 border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                    Shift Date
                  </span>
                  <span className="font-bold text-foreground text-xs">
                    {formattedDate}
                  </span>
                </Card>
                <Card className="p-3 border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                    Total Bills
                  </span>
                  <span className="font-bold text-foreground text-xs tabular-nums">
                    {totalOrders} Orders
                  </span>
                </Card>
                <Card className="p-3 border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                    Total Sales
                  </span>
                  <span className="font-bold text-primary text-xs tabular-nums tracking-tight">
                    {currencySymbol}{totalSales.toFixed(2)}
                  </span>
                </Card>
              </div>

              {/* Mathematical Drawer Reconciliation */}
              <Card className="border-border shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cash Drawer Math Reconciliation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2 text-xs divide-y divide-border/60">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground font-medium">(+) Morning Opening Float</span>
                    <span className="font-bold text-foreground tabular-nums tracking-tight">
                      {currencySymbol}{openingFloat.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground font-medium">(+) Cash Sales Collected</span>
                    <span className="font-bold text-primary tabular-nums tracking-tight">
                      +{currencySymbol}{cashSales.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground font-medium">(+) Cash In (Jama / Additions)</span>
                    <span className="font-bold text-primary tabular-nums tracking-tight">
                      +{currencySymbol}{cashIn.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground font-medium">(-) Cash Out (Kharcha / Payouts)</span>
                    <span className="font-bold text-destructive tabular-nums tracking-tight">
                      -{currencySymbol}{cashOut.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 text-sm font-bold bg-muted/40 p-3 rounded-lg border border-border/80">
                    <span className="text-foreground">(=) Expected Cash in Galla:</span>
                    <span className="text-foreground font-extrabold tabular-nums tracking-tight">
                      {currencySymbol}{expectedDrawerCash.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Physical Cash Counted Section */}
              <Card className="border-border bg-muted/20 shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Physical Cash Counted in Drawer
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDenominations(!showDenominations)}
                      className="h-7 px-2.5 text-xs font-medium cursor-pointer"
                    >
                      <Calculator className="size-3.5 mr-1" />
                      <span>{showDenominations ? 'Hide Notes Counter' : 'Count Notes (₹500 - ₹10)'}</span>
                      {showDenominations ? (
                        <ChevronUp className="size-3.5 ml-1" />
                      ) : (
                        <ChevronDown className="size-3.5 ml-1" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3">
                  {showDenominations && (
                    <div className="pt-1 pb-2">
                      <CashDenominationCounter
                        currencySymbol={currencySymbol}
                        expectedTotal={expectedDrawerCash}
                        onApplyTotal={(total) => setActualCountedCash(total)}
                        onChange={(total) => setActualCountedCash(total)}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        value={actualCountedCash}
                        onChange={(e) => setActualCountedCash(parseFloat(e.target.value) || 0)}
                        className="pl-7 pr-3 h-10 font-bold text-base bg-background tabular-nums tracking-tight"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setActualCountedCash(expectedDrawerCash)}
                      className="h-10 px-3.5 text-xs font-semibold cursor-pointer shrink-0"
                    >
                      Match Expected
                    </Button>
                  </div>

                  {/* Variance Alert Banner */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                      isExact
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : isShort
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isExact ? (
                        <CheckCircle2 className="size-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="size-4 shrink-0" />
                      )}
                      <span>
                        {isExact
                          ? 'Perfect Balance: Cash drawer matches expected sales exactly!'
                          : isShort
                          ? `Cash Shortage: ${currencySymbol}${Math.abs(variance).toFixed(2)} missing`
                          : `Cash Excess: ${currencySymbol}${variance.toFixed(2)} surplus`}
                      </span>
                    </div>
                    <span className="text-sm font-extrabold tabular-nums tracking-tight">
                      {variance >= 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)}
                    </span>
                  </div>

                  {/* Cashier Remarks Input */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="audit-remarks" className="text-xs font-medium text-muted-foreground">
                        Audit Remarks {isShort && <span className="text-destructive font-bold">* (Required for Shortage)</span>}
                      </Label>
                      {isShortageWithoutReason && (
                        <span className="text-[10px] font-bold text-destructive">
                          Reason required to close shift
                        </span>
                      )}
                    </div>
                    <Input
                      id="audit-remarks"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        isShort
                          ? 'Explain cash shortage (e.g. Unaccounted change or vendor payout)'
                          : 'e.g. Shift balanced, verified with cash counter'
                      }
                      className={
                        isShortageWithoutReason
                          ? 'border-destructive ring-1 ring-destructive/30'
                          : ''
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Footer Actions with Perfect UX Separation */}
        <DialogFooter className="p-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {activeTab === 'slip' ? (
            /* Footer for Z-Slip Preview Tab */
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('audit')}
                className="text-xs font-medium cursor-pointer self-start sm:self-auto"
              >
                ← Back to Audit Input
              </Button>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="text-xs font-semibold cursor-pointer gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-800"
                >
                  <Share2 className="size-4 text-emerald-600" />
                  <span>Share on WhatsApp</span>
                </Button>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handlePrintSlip}
                  className="text-xs font-semibold cursor-pointer gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800"
                >
                  <Printer className="size-4" />
                  <span>Print Z-Slip</span>
                </Button>
              </div>
            </>
          ) : (
            /* Footer for Cash Audit Input Tab */
            <>
              <div className="text-xs text-muted-foreground font-medium">
                {isFinalized ? (
                  <span className="text-primary font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" /> Shift Audit Logged into System
                  </span>
                ) : isShortageWithoutReason ? (
                  <span className="text-destructive font-semibold flex items-center gap-1">
                    <AlertTriangle className="size-3.5" /> State shortage reason above to close
                  </span>
                ) : (
                  <span>Review cash numbers before finalizing day close.</span>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('slip')}
                  className="text-xs font-semibold cursor-pointer gap-1.5"
                >
                  <Eye className="size-4" />
                  <span>Preview Z-Slip</span>
                </Button>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleFinalize}
                  disabled={isFinalized || isShortageWithoutReason}
                  className="text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isFinalized ? 'Shift Closed' : 'Finalize & Close Shift'}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
