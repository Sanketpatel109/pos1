import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Copy,
  Check,
  X,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Building,
  ArrowRight,
  Hash,
  Filter,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  SubscriptionRequest,
  subscribeToAllRequests,
  approveSubscription,
  rejectSubscription,
} from '../services/subscriptionApprovalService';

export interface AdminSubscriptionApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewerName?: string;
}

export const AdminSubscriptionApprovalModal: React.FC<AdminSubscriptionApprovalModalProps> = ({
  isOpen,
  onClose,
  reviewerName = 'Administrator',
}) => {
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Manual activation input
  const [manualStoreId, setManualStoreId] = useState<string>('');
  const [isManualActivating, setIsManualActivating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAllRequests((list) => {
      setRequests(list);
    });
    return () => unsub();
  }, [isOpen]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const handleApprove = async (storeId: string) => {
    try {
      setActionLoadingId(storeId);
      setActionMessage(null);
      const res = await approveSubscription(storeId, reviewerName, 365);
      const expiryDate = new Date(res.expiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      setActionMessage({
        type: 'success',
        text: `Store "${storeId}" approved! MonoPOS Annual Pro unlocked until ${expiryDate}.`,
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
      await rejectSubscription(storeId, 'Payment could not be verified.', reviewerName);
      setActionMessage({
        type: 'success',
        text: `Store "${storeId}" payment reference marked as rejected.`,
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
      const res = await approveSubscription(cleanId, reviewerName, 365);
      const expiryDate = new Date(res.expiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      setActionMessage({
        type: 'success',
        text: `Store "${cleanId}" manually activated! Pro unlocked until ${expiryDate}.`,
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

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden rounded-3xl border-border bg-card max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-muted/40 border-b border-border flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Super-Admin Subscription Approvals
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold bg-primary/10 border-primary/20 text-primary"
                >
                  {pendingCount} Pending
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Verify customer UPI UTR references from your bank/UPI statement and approve 1-Year Annual Pro licenses.
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Action alert message */}
        {actionMessage && (
          <div
            className={`p-3 text-xs border-b flex items-center gap-2 shrink-0 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <XCircle className="size-4 shrink-0" />
            )}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
        )}

        {/* Toolbar: Search, Filters & Manual Store Activation */}
        <div className="p-4 border-b border-border bg-muted/20 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Store ID, Name, or 12-digit UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8 font-mono"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant={filter === 'PENDING' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setFilter('PENDING')}
                className="text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Clock className="size-3 text-amber-500" />
                Pending ({pendingCount})
              </Button>
              <Button
                type="button"
                variant={filter === 'APPROVED' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setFilter('APPROVED')}
                className="text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="size-3 text-emerald-500" />
                Approved
              </Button>
              <Button
                type="button"
                variant={filter === 'ALL' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setFilter('ALL')}
                className="text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Filter className="size-3" />
                All ({requests.length})
              </Button>
            </div>
          </div>

          {/* Quick Direct Store Grant Form */}
          <form onSubmit={handleManualActivate} className="flex gap-2 items-center pt-1">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden sm:inline">
              Direct Store Grant:
            </span>
            <Input
              type="text"
              placeholder="e.g. store_123 or patel_mart"
              value={manualStoreId}
              onChange={(e) => setManualStoreId(e.target.value)}
              className="font-mono text-xs h-7 flex-1 max-w-xs"
            />
            <Button
              type="submit"
              disabled={!manualStoreId.trim() || isManualActivating}
              size="xs"
              className="h-7 text-xs font-semibold gap-1 shrink-0 cursor-pointer"
            >
              <PlusCircle className="size-3" />
              {isManualActivating ? 'Granting...' : 'Grant 1-Year Pro'}
            </Button>
          </form>
        </div>

        {/* Requests List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="size-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Clock className="size-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                No {filter === 'PENDING' ? 'pending' : ''} subscription requests found
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                When a customer pays via UPI and submits their 12-digit UTR in their POS, it will automatically appear here in real time.
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isPending = req.status === 'PENDING';
              const isApproved = req.status === 'APPROVED';
              const isRejected = req.status === 'REJECTED';
              const isLoading = actionLoadingId === req.storeId;

              const submittedFormatted = req.submittedAt
                ? new Date(req.submittedAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
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
                            Owner: <span className="text-foreground">{req.ownerEmail}</span>
                          </span>
                        )}
                        <span>
                          Submitted: <span className="text-foreground">{submittedFormatted}</span>
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[11px] text-muted-foreground block">Amount Paid</span>
                      <p className="text-lg font-bold text-foreground">
                        ₹{req.amount || 1999}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* UTR Reference & Approval Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="size-3" />
                        12-Digit UPI UTR:
                      </span>
                      <code className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded text-foreground">
                        {req.utr}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleCopy(req.utr, req.storeId)}
                        title="Copy UTR to verify in Bank app"
                        className="h-6 w-6 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
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
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="size-4" />
                          <span>Active until {expiresFormatted}</span>
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
                            className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
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
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Firestore Realtime Sync Active</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
