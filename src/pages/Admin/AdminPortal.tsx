import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Building,
  Hash,
  Filter,
  Lock,
  AlertCircle,
  LogOut,
  ArrowLeft,
  DollarSign,
  Store,
  Users,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  SubscriptionRequest,
  subscribeToAllRequests,
  approveSubscription,
  rejectSubscription,
} from '../../services/subscriptionApprovalService';

const MASTER_FOUNDER_PIN = '9900';

export const AdminPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('monopos_founder_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Manual Direct Store Grant
  const [manualStoreId, setManualStoreId] = useState<string>('');
  const [isManualActivating, setIsManualActivating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeToAllRequests((list) => {
      setRequests(list);
    });
    return () => unsub();
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (pinInput.trim() === MASTER_FOUNDER_PIN) {
      setIsAuthenticated(true);
      sessionStorage.setItem('monopos_founder_auth', 'true');
      setPinInput('');
    } else {
      setPinError('Invalid Master Founder Passcode. Access Denied.');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('monopos_founder_auth');
    setIsAuthenticated(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const handleApprove = async (storeId: string) => {
    try {
      setActionLoadingId(storeId);
      setActionMessage(null);
      const res = await approveSubscription(storeId, 'Platform Founder', 365);
      const expiryDate = new Date(res.expiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      setActionMessage({
        type: 'success',
        text: `Store "${storeId}" approved successfully! Annual Pro activated until ${expiryDate}.`,
      });
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to approve subscription.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (storeId: string) => {
    try {
      setActionLoadingId(storeId);
      setActionMessage(null);
      await rejectSubscription(storeId, 'Payment reference could not be verified.', 'Platform Founder');
      setActionMessage({
        type: 'success',
        text: `Store "${storeId}" reference marked as rejected.`,
      });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to reject subscription.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = manualStoreId.trim();
    if (!cleanId) return;

    try {
      setIsManualActivating(true);
      setActionMessage(null);
      const res = await approveSubscription(cleanId, 'Platform Founder', 365);
      const expiryDate = new Date(res.expiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      setActionMessage({
        type: 'success',
        text: `Store "${cleanId}" manually granted Annual Pro until ${expiryDate}!`,
      });
      setManualStoreId('');
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to activate store.',
      });
    } finally {
      setIsManualActivating(false);
    }
  };

  // Metrics
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');
  const totalRevenue = approvedRequests.length * 1999;

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (filter === 'PENDING' && r.status !== 'PENDING') return false;
    if (filter === 'APPROVED' && r.status !== 'APPROVED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchStore = r.storeId?.toLowerCase().includes(q);
      const matchName = r.storeName?.toLowerCase().includes(q);
      const matchUtr = r.utr?.toLowerCase().includes(q);
      const matchEmail = r.ownerEmail?.toLowerCase().includes(q);
      return matchStore || matchName || matchUtr || matchEmail;
    }
    return true;
  });

  // ─── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="size-16 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
              <ShieldCheck className="size-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              MonoPOS Founder Portal
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Private platform administration console. Restricted exclusively to the platform creator.
            </p>
          </div>

          <Card className="border-border shadow-md">
            <CardContent className="pt-6 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2 text-center">
                  <span className="text-xs font-medium text-foreground block">
                    Master Founder Passcode
                  </span>
                  <Input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    autoFocus
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-3xl tracking-[0.6em] font-mono h-14 w-44 mx-auto"
                  />
                  {pinError && (
                    <p className="text-xs text-destructive font-medium flex items-center justify-center gap-1">
                      <AlertCircle className="size-3.5 shrink-0" />
                      {pinError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="default"
                  disabled={pinInput.length !== 4}
                  className="w-full font-bold cursor-pointer"
                >
                  Unlock Admin Portal
                </Button>
              </form>

              <div className="pt-2 text-center">
                <a
                  href="/"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
                >
                  <ArrowLeft className="size-3" />
                  Back to POS Store Terminal
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── ADMIN DASHBOARD ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-xs sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs font-bold">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground">
                MonoPOS Founder Console
              </h1>
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 border-primary/20 text-primary uppercase">
                Platform Admin
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Subscription verification & license management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2 hidden md:flex">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium">Live Firestore Sync</span>
          </div>

          <a
            href="/"
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Store className="size-3.5" />
            <span className="hidden sm:inline">Open POS Terminal</span>
          </a>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title="Lock Portal"
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Lock</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Action alert message */}
        {actionMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs border flex items-center gap-2.5 shadow-2xs animate-in fade-in duration-150 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="size-4 shrink-0" />
            )}
            <span className="font-semibold">{actionMessage.text}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Pending Approvals</span>
                <p className="text-2xl font-black text-foreground mt-0.5">
                  {pendingRequests.length}
                </p>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Awaiting UPI verification
                </span>
              </div>
              <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                <Clock className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Active Annual Pro Stores</span>
                <p className="text-2xl font-black text-foreground mt-0.5">
                  {approvedRequests.length}
                </p>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Unlocked & Synchronized
                </span>
              </div>
              <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">SaaS Subscription ARR</span>
                <p className="text-2xl font-black text-foreground mt-0.5">
                  ₹{totalRevenue.toLocaleString('en-IN')}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  @ ₹1,999 / year per store
                </span>
              </div>
              <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <DollarSign className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Direct Store Grant Bar */}
        <Card className="border-border shadow-xs bg-muted/20">
          <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                Direct Store Activation (Offline / Cash / Bank Transfer)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Grant 1-Year Annual Pro directly to any store without waiting for a customer UTR submission.
              </p>
            </div>

            <form onSubmit={handleManualActivate} className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="Enter Store ID (e.g. patel_mart)"
                value={manualStoreId}
                onChange={(e) => setManualStoreId(e.target.value)}
                className="font-mono text-xs h-8 sm:w-64"
              />
              <Button
                type="submit"
                disabled={!manualStoreId.trim() || isManualActivating}
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
              >
                <PlusCircle className="size-3.5" />
                {isManualActivating ? 'Granting...' : 'Grant 1-Year Pro'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscription Request Queue */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Customer Subscription Requests</span>
                  <Badge variant="outline" className="text-xs font-semibold bg-muted">
                    {requests.length} Total
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Review 12-digit UTR references submitted by store merchants. Match them with your UPI / Bank statement.
                </CardDescription>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search store, UTR..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8 w-44 font-mono"
                  />
                </div>

                <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted/30">
                  <Button
                    type="button"
                    variant={filter === 'PENDING' ? 'secondary' : 'ghost'}
                    size="xs"
                    onClick={() => setFilter('PENDING')}
                    className="text-xs font-semibold gap-1 cursor-pointer h-7"
                  >
                    <Clock className="size-3 text-amber-500" />
                    Pending ({pendingRequests.length})
                  </Button>
                  <Button
                    type="button"
                    variant={filter === 'APPROVED' ? 'secondary' : 'ghost'}
                    size="xs"
                    onClick={() => setFilter('APPROVED')}
                    className="text-xs font-semibold gap-1 cursor-pointer h-7"
                  >
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    Approved ({approvedRequests.length})
                  </Button>
                  <Button
                    type="button"
                    variant={filter === 'ALL' ? 'secondary' : 'ghost'}
                    size="xs"
                    onClick={() => setFilter('ALL')}
                    className="text-xs font-semibold gap-1 cursor-pointer h-7"
                  >
                    All ({requests.length})
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="size-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Clock className="size-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  No {filter === 'PENDING' ? 'pending' : ''} subscription requests found
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When a customer scans your UPI QR and submits their 12-digit UTR in their POS, it automatically appears here live.
                </p>
              </div>
            ) : (
              filteredRequests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isApproved = req.status === 'APPROVED';
                const isLoading = actionLoadingId === req.storeId;

                const submittedFormatted = req.submittedAt
                  ? new Date(req.submittedAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recently';

                const expiresFormatted = req.expiresAt
                  ? new Date(req.expiresAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : null;

                return (
                  <div
                    key={req.id || req.storeId}
                    className={`p-4 rounded-xl border transition-all ${
                      isPending
                        ? 'bg-card border-amber-500/30 shadow-xs'
                        : isApproved
                        ? 'bg-muted/20 border-emerald-500/20'
                        : 'bg-muted/10 border-border opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Store details */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <Building className="size-3.5 text-muted-foreground" />
                            {req.storeName || req.storeId}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold tracking-wider ${
                              isPending
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                                : isApproved
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-destructive/10 border-destructive/30 text-destructive'
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>
                            Store ID: <code className="font-mono text-foreground font-semibold">{req.storeId}</code>
                          </span>
                          {req.ownerEmail && (
                            <span>
                              Email: <span className="text-foreground">{req.ownerEmail}</span>
                            </span>
                          )}
                          <span>
                            Submitted: <span className="text-foreground">{submittedFormatted}</span>
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[11px] text-muted-foreground block">Subscription Fee</span>
                        <p className="text-lg font-bold text-foreground">
                          ₹{req.amount || 1999}
                        </p>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* UTR Reference & Approval Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <Hash className="size-3" />
                          12-Digit UPI UTR:
                        </span>
                        <code className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded text-foreground border border-border/80">
                          {req.utr}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleCopy(req.utr, req.storeId)}
                          title="Copy UTR to verify in Bank App"
                          className="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          {copiedUtr === req.storeId ? (
                            <Check className="size-3 text-emerald-600" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </Button>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-end">
                        {isApproved ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 className="size-4" />
                            <span>Annual Pro Active until {expiresFormatted}</span>
                          </div>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isLoading}
                              onClick={() => handleReject(req.storeId)}
                              className="h-8 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              Reject
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              disabled={isLoading}
                              onClick={() => handleApprove(req.storeId)}
                              className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                            >
                              <Sparkles className="size-3.5" />
                              {isLoading ? 'Approving...' : 'Approve (1 Year Pro)'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20 py-4 px-6 text-center text-xs text-muted-foreground">
        MonoPOS Cloud Platform Administration Console &bull; Private & Confidential
      </footer>
    </div>
  );
};
