import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useProlabore() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prolabore', user?.accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_prolabore_mvp')
        .select('*')
        .eq('account_id', user!.accountId!)
        .order('competence', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!user?.accountId,
  });
}
