import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useSubscription, SubscriptionState } from '@/hooks/useSubscription';
import UpgradeModal from '@/components/subscription/UpgradeModal';

interface SubscriptionContextType extends SubscriptionState {
  canCreateRecords: boolean;
  shouldShowUpgradePrompt: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: (priceType?: 'monthly' | 'yearly') => Promise<{ success: boolean; url?: string; error?: string }>;
  openCustomerPortal: () => Promise<{ success: boolean; url?: string; error?: string }>;
  requireSubscriptionForCreate: () => boolean; // Returns true if blocked, shows modal
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const subscription = useSubscription();
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const requireSubscriptionForCreate = useCallback(() => {
    if (subscription.canCreateRecords) {
      return false; // Not blocked
    }
    
    // Blocked - show upgrade modal
    setShowBlockedModal(true);
    return true;
  }, [subscription.canCreateRecords]);

  return (
    <SubscriptionContext.Provider
      value={{
        ...subscription,
        requireSubscriptionForCreate,
      }}
    >
      {children}
      <UpgradeModal
        open={showBlockedModal}
        onOpenChange={setShowBlockedModal}
        context="create-blocked"
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}
