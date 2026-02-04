import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SubscriptionStatusType = 'ativo' | 'pendente' | 'em_atraso' | 'cancelado' | 'expirado';
export type SubscriptionPlanType = 'mensal' | 'semestral' | 'anual' | null;

export interface SubscriptionData {
  subscriptionStatus: SubscriptionStatusType;
  plan: SubscriptionPlanType;
  startDate: string | null;
  expirationDate: string | null;
  nextBillingDate: string | null;
  isActive: boolean;
  isBlocked: boolean;
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
  startDate: null,
  expirationDate: null,
  nextBillingDate: null,
  isActive: false,
  isBlocked: true,
  daysRemaining: null,
};

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
          paid_until
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

      // Determine subscription status
      // Priority: new fields > legacy fields
      let status: SubscriptionStatusType = 'expirado';
      let expirationDate = profile.subscription_expiration_date || profile.paid_until;
      
      // Check if subscription_status is one of the new enum values
      const validStatuses: SubscriptionStatusType[] = ['ativo', 'pendente', 'em_atraso', 'cancelado', 'expirado'];
      if (profile.subscription_status && validStatuses.includes(profile.subscription_status as SubscriptionStatusType)) {
        status = profile.subscription_status as SubscriptionStatusType;
      } else if (profile.subscription_status === 'active' || profile.plan_type === 'paid') {
        // Legacy status mapping
        status = 'ativo';
      } else if (profile.subscription_status === 'inactive' || profile.plan_type === 'free') {
        status = 'expirado';
      }

      // Check if subscription has expired based on date
      if (expirationDate) {
        const expDate = new Date(expirationDate);
        const now = new Date();
        if (expDate < now && status === 'ativo') {
          status = 'expirado';
        }
      }

      // Calculate days remaining
      let daysRemaining: number | null = null;
      if (expirationDate && status === 'ativo') {
        const expDate = new Date(expirationDate);
        const now = new Date();
        const diffTime = expDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Determine plan
      let plan: SubscriptionPlanType = null;
      const validPlans: SubscriptionPlanType[] = ['mensal', 'semestral', 'anual'];
      if (profile.subscription_plan && validPlans.includes(profile.subscription_plan as SubscriptionPlanType)) {
        plan = profile.subscription_plan as SubscriptionPlanType;
      }

      const isActive = status === 'ativo';
      const isBlocked = status !== 'ativo';

      setData({
        subscriptionStatus: status,
        plan,
        startDate: profile.subscription_start_date,
        expirationDate,
        nextBillingDate: profile.next_billing_date,
        isActive,
        isBlocked,
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
