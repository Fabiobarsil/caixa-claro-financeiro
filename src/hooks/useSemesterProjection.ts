import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addMonths, startOfMonth, lastDayOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MonthPeriod } from '@/hooks/useFinancialSnapshot';

export interface SemesterBarData {
  month: string; // "Jan/25"
  monthKey: string; // "2025-01"
  receitas: number;
  despesas: number;
}

export function useSemesterProjection(monthPeriod: MonthPeriod) {
  const { user, accountId } = useAuth();

  const baseDate = new Date(monthPeriod.year, monthPeriod.month, 1);

  return useQuery({
    queryKey: ['semester-projection', monthPeriod.year, monthPeriod.month, accountId],
    queryFn: async () => {
      const months: { start: string; end: string; label: string; key: string }[] = [];

      for (let i = 0; i < 6; i++) {
        const d = addMonths(baseDate, i);
        const s = startOfMonth(d);
        const e = lastDayOfMonth(d);
        months.push({
          start: format(s, 'yyyy-MM-dd'),
          end: format(e, 'yyyy-MM-dd'),
          label: format(s, 'MMM/yy', { locale: ptBR }),
          key: format(s, 'yyyy-MM'),
        });
      }

      const globalStart = months[0].start;
      const globalEnd = months[5].end;

      // Fetch paid schedules + pending schedules in the 6-month window
      const [schedulesRes, transactionsRes, expensesRes] = await Promise.all([
        supabase
          .from('entry_schedules')
          .select('id, due_date, paid_at, status, amount')
          .or(`and(status.eq.pago,paid_at.gte.${globalStart},paid_at.lte.${globalEnd}T23:59:59.999Z),and(status.eq.pendente,due_date.gte.${globalStart},due_date.lte.${globalEnd})`),
        supabase
          .from('transactions')
          .select('id, amount, status, date, due_date, payment_date')
          .gte('date', globalStart)
          .lte('date', globalEnd),
        supabase
          .from('expenses')
          .select('id, value, date, status')
          .gte('date', globalStart)
          .lte('date', globalEnd),
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (transactionsRes.error) throw transactionsRes.error;
      if (expensesRes.error) throw expensesRes.error;

      // Find transactions that have schedules
      const transactionIds = (transactionsRes.data || []).map(t => t.id);
      const { data: scheduledTxs } = await supabase
        .from('entry_schedules')
        .select('entry_id')
        .in('entry_id', transactionIds.length > 0 ? transactionIds : ['']);
      const txWithSchedules = new Set((scheduledTxs || []).map(s => s.entry_id));

      const standaloneTransactions = (transactionsRes.data || []).filter(t => !txWithSchedules.has(t.id));

      // Build monthly buckets
      const buckets = new Map<string, { receitas: number; despesas: number }>();
      months.forEach(m => buckets.set(m.key, { receitas: 0, despesas: 0 }));

      // Schedules → receitas
      (schedulesRes.data || []).forEach(s => {
        let monthKey: string | null = null;
        if (s.status === 'pago' && s.paid_at) {
          monthKey = s.paid_at.slice(0, 7);
        } else if (s.status === 'pendente') {
          monthKey = s.due_date.slice(0, 7);
        }
        if (monthKey && buckets.has(monthKey)) {
          buckets.get(monthKey)!.receitas += Number(s.amount);
        }
      });

      // Standalone transactions → receitas
      standaloneTransactions.forEach(t => {
        let refDate: string | null = null;
        if (t.status === 'pago') {
          refDate = t.payment_date || t.date;
        } else if (t.status === 'pendente') {
          refDate = t.due_date || t.date;
        }
        if (refDate) {
          const mk = refDate.slice(0, 7);
          if (buckets.has(mk)) {
            buckets.get(mk)!.receitas += Number(t.amount);
          }
        }
      });

      // Expenses → despesas
      (expensesRes.data || []).forEach(e => {
        const mk = e.date.slice(0, 7);
        if (buckets.has(mk)) {
          buckets.get(mk)!.despesas += Number(e.value);
        }
      });

      const result: SemesterBarData[] = months.map(m => ({
        month: m.label,
        monthKey: m.key,
        receitas: buckets.get(m.key)!.receitas,
        despesas: buckets.get(m.key)!.despesas,
      }));

      return result;
    },
    enabled: !!user && !!accountId,
    staleTime: 1000 * 60 * 5,
  });
}
