import React from 'react';
import { Crown, AlertTriangle, XCircle, Clock, Sparkles } from 'lucide-react';
import { LicenseStatus } from '../services/subscriptionService';
import { Badge } from '@/components/ui/badge';

interface SubscriptionBadgeProps {
  licenseStatus: LicenseStatus | null;
  onClick?: () => void;
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  licenseStatus,
  onClick,
}) => {
  if (!licenseStatus) return null;

  const { status, displayLabel, isTrialActive, isGracePeriod, isExpired, daysRemaining } = licenseStatus;

  let badgeClass = '';
  let Icon = Sparkles;

  if (isExpired) {
    badgeClass = 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25';
    Icon = XCircle;
  } else if (isGracePeriod) {
    badgeClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25';
    Icon = AlertTriangle;
  } else if (isTrialActive) {
    badgeClass = 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15';
    Icon = daysRemaining <= 3 ? Clock : Sparkles;
  } else {
    // Active paid plan
    badgeClass = 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15';
    Icon = Crown;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 h-6 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${badgeClass}`}
      title={`Subscription: ${displayLabel}. Click to manage.`}
    >
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline">{displayLabel}</span>
      {/* On very small screens show abbreviated */}
      <span className="sm:hidden">
        {isTrialActive ? `${daysRemaining}d` : isExpired ? '!' : status}
      </span>
    </button>
  );
};
