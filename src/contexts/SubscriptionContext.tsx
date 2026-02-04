import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { useSubscriptionStatus, SubscriptionData } from '@/hooks/useSubscriptionStatus';
import { useAuth } from '@/contexts/AuthContext';
import PlanSelectionModal from '@/components/subscription/PlanSelectionModal';

interface SubscriptionContextType extends SubscriptionData {
  isLoading: boolean;
  error: string | null;
  checkSubscription: () => Promise<void>;
  showPlanModal: boolean;
  setShowPlanModal: (show: boolean) => void;
  requireActiveSubscription: () => boolean; // Returns true if blocked
  requireSubscriptionForCreate: () => boolean; // Alias for compatibility
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const subscription = useSubscriptionStatus();
  const { isAdmin, isSystemAdmin } = useAuth();
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Auto-show modal when subscription is blocked (but not for admins or system admins)
  useEffect(() => {
    // System admins are NEVER blocked by subscription
    if (isSystemAdmin) return;
    
    if (!subscription.isLoading && subscription.isBlocked && !isAdmin) {
      setShowPlanModal(true);
    }
  }, [subscription.isLoading, subscription.isBlocked, isAdmin, isSystemAdmin]);

  const requireActiveSubscription = useCallback(() => {
    // System admins always have access (owner of the SaaS)
    if (isSystemAdmin) return false;
    
    // Account admins always have access
    if (isAdmin) return false;
    
    if (subscription.isBlocked) {
      setShowPlanModal(true);
      return true;
    }
    return false;
  }, [subscription.isBlocked, isAdmin, isSystemAdmin]);

  // Determine if modal should be blocking (can't dismiss)
  // System admins and account admins are never blocked
  const isBlockingModal = subscription.isBlocked && !isAdmin && !isSystemAdmin;

  return (
    <SubscriptionContext.Provider
      value={{
        ...subscription,
        showPlanModal,
        setShowPlanModal,
        requireActiveSubscription,
        requireSubscriptionForCreate: requireActiveSubscription, // Alias
      }}
    >
      {children}
      <PlanSelectionModal
        open={showPlanModal}
        onOpenChange={setShowPlanModal}
        blocking={isBlockingModal}
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
