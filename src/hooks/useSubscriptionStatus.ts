import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SubscriptionStatusType = 'trial' | 'ativo' | 'pendente' | 'em_atraso' | 'cancelado' | 'expirado';
export type SubscriptionPlanType = 'mensal' | 'semestral' | 'anual' | null;

export interface SubscriptionData {
  subscriptionStatus: SubscriptionStatusType;
  plan: SubscriptionPlanType;
  selectedPlan: SubscriptionPlanType;
  startDate: string | null;
  expirationDate: string | null;
  nextBillingDate: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  trialDaysRemaining: number | null;
  isActive: boolean;
  isBlocked: boolean;
  isTrial: boolean;
  isPending: boolean;
  daysRemaining: number | null;
}

export interface UseSubscriptionStatusResult extends SubscriptionData {
  isLoading: boolean;
  error: string | null;
  checkSubscription: () => Promise<void>;
}

const initialData: SubscriptionData = {
  subscriptionStatus: 'expirado',
  plan: null,
  selectedPlan: null,
  startDate: null,
  expirationDate: null,
  nextBillingDate: null,
  trialStartDate: null,
  trialEndDate: null,
  trialDaysRemaining: null,
  isActive: false,
  isBlocked: true,
  isTrial: false,
  isPending: false,
  daysRemaining: null,
};

const TRIAL_DAYS = 14;

export function useSubscriptionStatus(): UseSubscriptionStatusResult {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<SubscriptionData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setData(initialData);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          subscription_status,
          subscription_plan,
          subscription_start_date,
          subscription_expiration_date,
          next_billing_date,
          plan_type,
          paid_until,
          trial_start_date,
          trial_end_date,
          trial_days,
          first_activity_at,
          selected_plan
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        setData(initialData);
        setIsLoading(false);
        return;
      }

      // Calculate trial dates
      let trialStartDate = profile.trial_start_date || profile.first_activity_at;
      let trialEndDate = profile.trial_end_date;
      let trialDaysRemaining: number | null = null;

      // If no trial dates but has first_activity_at, calculate trial end
      if (!trialEndDate && trialStartDate) {
        const startDate = new Date(trialStartDate);
        const trialDays = profile.trial_days || TRIAL_DAYS;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + trialDays);
        trialEndDate = endDate.toISOString();
      }

      // Calculate trial days remaining
      if (trialEndDate) {
        const endDate = new Date(trialEndDate);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        trialDaysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      // Determine subscription status
      const validStatuses: SubscriptionStatusType[] = ['trial', 'ativo', 'pendente', 'em_atraso', 'cancelado', 'expirado'];
      let status: SubscriptionStatusType = 'expirado';

      if (profile.subscription_status && validStatuses.includes(profile.subscription_status as SubscriptionStatusType)) {
        status = profile.subscription_status as SubscriptionStatusType;
      } else if (profile.subscription_status === 'active' || profile.plan_type === 'paid' || profile.plan_type === 'owner') {
        status = 'ativo';
      } else if (profile.subscription_status === 'inactive') {
        // Check if still in trial period
        if (trialDaysRemaining !== null && trialDaysRemaining > 0) {
          status = 'trial';
        } else {
          status = 'expirado';
        }
      }

      // Special case: owner always has access
      if (profile.plan_type === 'owner') {
        status = 'ativo';
      }

      // Check expiration for active subscriptions
      const expirationDate = profile.subscription_expiration_date || profile.paid_until;
      if (expirationDate && status === 'ativo') {
        const expDate = new Date(expirationDate);
        const now = new Date();
        if (expDate < now) {
          status = 'expirado';
        }
      }

      // Calculate days remaining for active subscription
      let daysRemaining: number | null = null;
      if (expirationDate && status === 'ativo') {
        const expDate = new Date(expirationDate);
        const now = new Date();
        const diffTime = expDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Determine plan
      const validPlans: SubscriptionPlanType[] = ['mensal', 'semestral', 'anual'];
      let plan: SubscriptionPlanType = null;
      if (profile.subscription_plan && validPlans.includes(profile.subscription_plan as SubscriptionPlanType)) {
        plan = profile.subscription_plan as SubscriptionPlanType;
      }

      // Determine selected plan (user choice before payment)
      let selectedPlan: SubscriptionPlanType = null;
      if (profile.selected_plan && validPlans.includes(profile.selected_plan as SubscriptionPlanType)) {
        selectedPlan = profile.selected_plan as SubscriptionPlanType;
      }

      // CRITICAL: Only block access when status is 'expirado'
      // trial and pendente should have full access
      const isActive = status === 'ativo';
      const isTrial = status === 'trial';
      const isPending = status === 'pendente';
      const isBlocked = status === 'expirado';

      setData({
        subscriptionStatus: status,
        plan,
        selectedPlan,
        startDate: profile.subscription_start_date,
        expirationDate,
        nextBillingDate: profile.next_billing_date,
        trialStartDate,
        trialEndDate,
        trialDaysRemaining: isTrial ? trialDaysRemaining : null,
        isActive,
        isBlocked,
        isTrial,
        isPending,
        daysRemaining,
      });

    } catch (err) {
      console.error('Error checking subscription:', err);
      setError(err instanceof Error ? err.message : 'Erro ao verificar assinatura');
      setData(initialData);
    } finally {
      setIsLoading(false);
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

  return {
    ...data,
    isLoading,
    error,
    checkSubscription,
  };
}
