import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionState {
  subscribed: boolean;
  planType: 'free' | 'paid' | 'owner';
  subscriptionStatus: string;
  subscriptionSource: 'kiwify' | 'stripe';
  subscriptionPlan: string | null;
  selectedPlan: string | null;
  subscriptionExpirationDate: string | null;
  trialDaysUsed: number;
  trialDaysRemaining: number | null;
  trialExpired: boolean;
  isTrial: boolean;
  isPending: boolean;
  firstActivityAt: string | null;
  paidUntil: string | null;
  isLoading: boolean;
  error: string | null;
}

const TRIAL_DAYS = 14;

const initialState: SubscriptionState = {
  subscribed: false,
  planType: 'free',
  subscriptionStatus: 'trial',
  subscriptionSource: 'kiwify',
  subscriptionPlan: null,
  selectedPlan: null,
  subscriptionExpirationDate: null,
  trialDaysUsed: 0,
  trialDaysRemaining: TRIAL_DAYS,
  trialExpired: false,
  isTrial: true,
  isPending: false,
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
        .select('plan_type, subscription_status, subscription_source, subscription_plan, selected_plan, subscription_expiration_date, paid_until, first_activity_at, trial_days, trial_start_date, trial_end_date')
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
      let firstActivityAt = profile.first_activity_at || profile.trial_start_date;

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

      // Determine status
      const subscriptionStatus = profile.subscription_status || 'trial';
      const isTrial = subscriptionStatus === 'trial';
      const isPending = subscriptionStatus === 'pendente';
      
      // Check if subscription is active
      const isPaid = profile.plan_type === 'paid';
      const isOwner = profile.plan_type === 'owner';
      const isActive = subscriptionStatus === 'ativo' || isOwner;
      const paidUntilValid = !profile.paid_until || new Date(profile.paid_until) > new Date();
      const subscribed = (isPaid || isOwner) && isActive && paidUntilValid;

      setState({
        subscribed,
        planType: (profile.plan_type as 'free' | 'paid' | 'owner') || 'free',
        subscriptionStatus,
        subscriptionSource: (profile.subscription_source as 'kiwify' | 'stripe') || 'kiwify',
        subscriptionPlan: profile.subscription_plan || null,
        selectedPlan: profile.selected_plan || null,
        subscriptionExpirationDate: profile.subscription_expiration_date || null,
        trialDaysUsed,
        trialDaysRemaining: subscribed ? null : trialDaysRemaining,
        trialExpired: !subscribed && trialExpired && !isTrial && !isPending,
        isTrial,
        isPending,
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

  // Open Kiwify checkout with plan selection
  const openKiwifyCheckout = useCallback((plan?: 'mensal' | 'semestral' | 'anual') => {
    let checkoutUrl: string;
    
    switch (plan) {
      case 'mensal':
        checkoutUrl = import.meta.env.VITE_KIWIFY_CHECKOUT_MENSAL;
        break;
      case 'semestral':
        checkoutUrl = import.meta.env.VITE_KIWIFY_CHECKOUT_SEMESTRAL;
        break;
      case 'anual':
        checkoutUrl = import.meta.env.VITE_KIWIFY_CHECKOUT_ANUAL;
        break;
      default:
        checkoutUrl = import.meta.env.VITE_KIWIFY_CHECKOUT_MENSAL || 'https://kiwify.com.br';
    }
    
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
    }
  }, []);

  // CRITICAL: User can create records during trial and pending states
  // Only block when expired
  const canCreateRecords = state.subscribed || state.isTrial || state.isPending || !state.trialExpired;

  // Should show upgrade prompt only when truly expired
  const shouldShowUpgradePrompt = state.subscriptionStatus === 'expirado';

  return {
    ...state,
    canCreateRecords,
    shouldShowUpgradePrompt,
    checkSubscription,
    openKiwifyCheckout,
  };
}
