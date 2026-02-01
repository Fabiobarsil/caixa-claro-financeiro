import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserStats {
  accountCreatedAt: string | null;
  totalEntries: number;
  totalClients: number;
  totalMovimentado: number;
  hasFirstPayment: boolean;
}

export function useUserStats() {
  const { user, accountId } = useAuth();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['user-stats', accountId],
    queryFn: async (): Promise<UserStats> => {
      // Fetch profile for account creation date
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', user!.id)
        .maybeSingle();

      // RLS handles filtering by account_id
      // Fetch total transactions count
      const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      // Fetch total clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Fetch total movimentado (sum of all transaction amounts)
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('amount, status');

      const totalMovimentado = (transactionsData || []).reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0
      );

      const hasFirstPayment = (transactionsData || []).some(
        transaction => transaction.status === 'pago'
      );

      return {
        accountCreatedAt: profile?.created_at || null,
        totalEntries: transactionsCount || 0,
        totalClients: clientsCount || 0,
        totalMovimentado,
        hasFirstPayment,
      };
    },
    enabled: !!user && !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: stats || {
      accountCreatedAt: null,
      totalEntries: 0,
      totalClients: 0,
      totalMovimentado: 0,
      hasFirstPayment: false,
    },
    isLoading,
    error,
  };
}
