import { useState, useCallback } from 'react';
import { SubscriptionStatusInfo } from '../store/useSubscriptionStore';

export interface UseSubscriptionGuardProps {
  statusInfo: SubscriptionStatusInfo;
  recordActivityTimestamp: () => void;
}

export function useSubscriptionGuard({ statusInfo, recordActivityTimestamp }: UseSubscriptionGuardProps) {
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);

  /**
   * Guards a checkout or printing action.
   * If subscription is valid / in grace period, records timestamp and executes the action.
   * If expired or tampered, blocks action and opens the SubscriptionExpiredModal.
   */
  const guardCheckoutAction = useCallback(
    (action: () => void): boolean => {
      if (statusInfo.isAccessible) {
        recordActivityTimestamp();
        action();
        return true;
      }

      // Block action and open expired modal
      setIsExpiredModalOpen(true);
      return false;
    },
    [statusInfo.isAccessible, recordActivityTimestamp]
  );

  return {
    isAccessible: statusInfo.isAccessible,
    isExpiredModalOpen,
    setIsExpiredModalOpen,
    guardCheckoutAction,
  };
}
