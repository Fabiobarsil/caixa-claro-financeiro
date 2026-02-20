import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function useProlabore() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prolabore-v2', user?.accountId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('v_financial_competencia')
        .select('tipo, valor')
        .eq('account_id', user!.accountId!)
        .gte('competencia', monthStart)
        .lte('competencia', monthEnd);

      if (error) throw error;

      const rows = data || [];

      // Lucro por competência: receitas - despesas, SEM filtro por status
      const receitas = rows
        .filter(r => r.tipo === 'receita')
        .reduce((s, r) => s + Number(r.valor ?? 0), 0);

      const despesas = rows
        .filter(r => r.tipo === 'despesa')
        .reduce((s, r) => s + Number(r.valor ?? 0), 0);

      const profit_m = receitas - despesas;
      const recommended_prolabore = Math.max(0, profit_m * 0.4);

      return { profit_m, recommended_prolabore };
    },
    enabled: !!user?.accountId,
  });
}
