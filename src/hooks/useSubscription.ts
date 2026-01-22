import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionState {
  subscribed: boolean;
  planType: 'free' | 'paid';
  subscriptionStatus: 'active' | 'inactive';
  subscriptionSource: 'kiwify' | 'stripe';
  trialDaysUsed: number;
  trialDaysRemaining: number | null;
  trialExpired: boolean;
  firstActivityAt: string | null;
  paidUntil: string | null;
  isLoading: boolean;
  error: string | null;
}

const TRIAL_DAYS = 14;

const initialState: SubscriptionState = {
  subscribed: false,
  planType: 'free',
  subscriptionStatus: 'inactive',
  subscriptionSource: 'kiwify',
  trialDaysUsed: 0,
  trialDaysRemaining: TRIAL_DAYS,
  trialExpired: false,
  firstActivityAt: null,
  paidUntil: null,
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
      // Fetch subscription data directly from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('plan_type, subscription_status, subscription_source, paid_until, first_activity_at, trial_days')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error.message 
        }));
        return;
      }

      // If no profile found, use defaults
      if (!profile) {
        setState({ ...initialState, isLoading: false });
        return;
      }

      // Calculate trial status
      const trialDays = profile.trial_days || TRIAL_DAYS;
      let trialDaysUsed = 0;
      let firstActivityAt = profile.first_activity_at;

      if (firstActivityAt) {
        const firstDate = new Date(firstActivityAt);
        const today = new Date();
        trialDaysUsed = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        // Set first activity if not set
        const now = new Date().toISOString();
        await supabase
          .from('profiles')
          .update({ first_activity_at: now })
          .eq('user_id', user.id);
        firstActivityAt = now;
      }

      const trialExpired = trialDaysUsed > trialDays;
      const trialDaysRemaining = Math.max(0, trialDays - trialDaysUsed);

      // Check if subscription is active
      const isPaid = profile.plan_type === 'paid';
      const isActive = profile.subscription_status === 'active';
      const paidUntilValid = !profile.paid_until || new Date(profile.paid_until) > new Date();
      const subscribed = isPaid && isActive && paidUntilValid;

      setState({
        subscribed,
        planType: (profile.plan_type as 'free' | 'paid') || 'free',
        subscriptionStatus: (profile.subscription_status as 'active' | 'inactive') || 'inactive',
        subscriptionSource: (profile.subscription_source as 'kiwify' | 'stripe') || 'kiwify',
        trialDaysUsed,
        trialDaysRemaining: subscribed ? null : trialDaysRemaining,
        trialExpired: !subscribed && trialExpired,
        firstActivityAt,
        paidUntil: profile.paid_until,
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

  // Open Kiwify checkout (placeholder URL - will be configured)
  const openKiwifyCheckout = useCallback(() => {
    // Use environment variable or fallback placeholder
    const checkoutUrl = import.meta.env.VITE_KIWIFY_CHECKOUT_URL || 'https://kiwify.com.br';
    window.open(checkoutUrl, '_blank');
  }, []);

  // Check if user can create new records
  const canCreateRecords = state.subscribed || !state.trialExpired;

  // Should show upgrade prompt (after trial expired)
  const shouldShowUpgradePrompt = state.trialExpired && !state.subscribed;

  return {
    ...state,
    canCreateRecords,
    shouldShowUpgradePrompt,
    checkSubscription,
    openKiwifyCheckout,
  };
}
