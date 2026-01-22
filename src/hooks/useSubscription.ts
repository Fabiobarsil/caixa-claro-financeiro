import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionState {
  subscribed: boolean;
  planType: 'free' | 'paid';
  trialDaysUsed: number;
  trialDaysRemaining: number | null;
  trialExpired: boolean;
  firstActivityDate: string | null;
  subscriptionEnd: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  subscribed: false,
  planType: 'free',
  trialDaysUsed: 0,
  trialDaysRemaining: 14,
  trialExpired: false,
  firstActivityDate: null,
  subscriptionEnd: null,
  isLoading: true,
  error: null,
};

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<SubscriptionState>(initialState);

  const checkSubscription = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setState({ ...initialState, isLoading: false });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error('Error checking subscription:', error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error.message 
        }));
        return;
      }

      setState({
        subscribed: data.subscribed || false,
        planType: data.plan_type || 'free',
        trialDaysUsed: data.trial_days_used || 0,
        trialDaysRemaining: data.trial_days_remaining ?? null,
        trialExpired: data.trial_expired || false,
        firstActivityDate: data.first_activity_date || null,
        subscriptionEnd: data.subscription_end || null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error checking subscription:', err);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Erro ao verificar assinatura' 
      }));
    }
  }, [isAuthenticated, user]);

  // Check on mount and when auth changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Periodic refresh every minute
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, checkSubscription]);

  const createCheckout = useCallback(async (priceType: 'monthly' | 'yearly' = 'monthly') => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceType },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      
      return { success: true, url: data?.url };
    } catch (err) {
      console.error('Error creating checkout:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro ao criar checkout' 
      };
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      
      return { success: true, url: data?.url };
    } catch (err) {
      console.error('Error opening customer portal:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro ao abrir portal' 
      };
    }
  }, []);

  // Check if user can create new records
  const canCreateRecords = state.subscribed || !state.trialExpired;

  // Should show upgrade prompt (only after day 10 and trial expired)
  const shouldShowUpgradePrompt = state.trialExpired && state.trialDaysUsed >= 10;

  return {
    ...state,
    canCreateRecords,
    shouldShowUpgradePrompt,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
}
