import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useSubscriptionStatus, SubscriptionData } from '@/hooks/useSubscriptionStatus';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionContextType extends SubscriptionData {
  isLoading: boolean;
  error: string | null;
  checkSubscription: () => Promise<void>;
  requireActiveSubscription: () => boolean; // Returns true if blocked
  requireSubscriptionForCreate: () => boolean; // Alias for compatibility
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const subscription = useSubscriptionStatus();
  const { isAdmin, isSystemAdmin } = useAuth();

  const requireActiveSubscription = useCallback(() => {
    // System admins always have access (owner of the SaaS)
    if (isSystemAdmin) return false;
    
    // Account admins always have access
    if (isAdmin) return false;
    return subscription.isBlocked;
  }, [subscription.isBlocked, isAdmin, isSystemAdmin]);

  return (
    <SubscriptionContext.Provider
      value={{
        ...subscription,
        requireActiveSubscription,
        requireSubscriptionForCreate: requireActiveSubscription, // Alias
      }}
    >
      {children}
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
