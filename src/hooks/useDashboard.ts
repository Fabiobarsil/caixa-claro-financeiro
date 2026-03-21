import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, parseISO, addDays } from 'date-fns';

export interface DashboardMetrics {
  received: number;
  pending: number;
  expenses: number;
  profit: number;
  averageTicket: number;
  totalEntries: number;
  // Metrics for accounts receivable (monthly)
  upcomingValue: number;
  upcomingCount: number;
  overdueValue: number;
  overdueCount: number;
  // Global receivables metrics
  globalPending: number;
  globalNext30Days: number;
  globalOverdue: number;
}

export interface DashboardEntry {
  id: string;
  client_name?: string;
  item_name?: string;
  item_type?: 'servico' | 'produto';
  value: number;
  status: 'pago' | 'pendente';
  date: string;
  due_date: string | null;
  payment_date: string | null;
  payment_method: string;
}

export interface ChartDataPoint {
  date: string;
  received: number;
  pending: number;
  overdue: number;
}

interface ScheduleRow {
  id: string;
  entry_id: string;
  schedule_type: string;
  installment_number: number;
  installments_total: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  amount: number;
  amount_paid: number | null;
}

export function useDashboard(selectedMonth?: string) {
  const { user, accountId } = useAuth();

  // Parse selected month or use current month
  const { startDate, endDate } = useMemo(() => {
    const date = selectedMonth ? parseISO(`${selectedMonth}-01`) : new Date();
    return {
      startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
    };
  }, [selectedMonth]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', accountId, startDate, endDate],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, 'yyyy-MM-dd');
      const next30DaysStr = format(addDays(today, 30), 'yyyy-MM-dd');

      // Fetch transactions for the month (by date for listing, separate paid query by payment_date)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId!)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch paid transactions by payment_date in month (for accurate "Recebido")
      const { data: paidByPaymentDate, error: paidTxError } = await supabase
        .from('transactions')
        .select('id, amount, amount_paid, payment_date')
        .eq('account_id', accountId!)
        .eq('type', 'entrada')
        .eq('status', 'pago')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (paidTxError) throw paidTxError;

      // Fetch expenses for the month
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('account_id', accountId!)
        .gte('date', startDate)
        .lte('date', endDate);

      if (expensesError) throw expensesError;

      // Fetch entry schedules with due_date in month (for pending/overdue metrics)
      const { data: schedulesInMonth, error: schedulesError } = await supabase
        .from('entry_schedules')
        .select('*')
        .eq('account_id', accountId!)
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      if (schedulesError) throw schedulesError;

      // Fetch entry schedules PAID in month (by paid_at, for accurate "Recebido")
      const startDatetime = `${startDate}T00:00:00`;
      const endDatetime = `${endDate}T23:59:59.999`;
      const { data: paidSchedulesInMonth, error: paidSchError } = await supabase
        .from('entry_schedules')
        .select('*')
        .eq('status', 'pago')
        .gte('paid_at', startDatetime)
        .lte('paid_at', endDatetime);

      if (paidSchError) throw paidSchError;

      // Fetch ALL pending schedules globally (for global receivables)
      const { data: allPendingSchedules, error: allPendingError } = await supabase
        .from('entry_schedules')
        .select('*')
        .eq('status', 'pendente');

      if (allPendingError) throw allPendingError;

      // Fetch ALL transaction_ids that have any schedules (to know which transactions to exclude)
      const transactionIds = (transactionsData || []).map(e => e.id);
      const paidTxIds = (paidByPaymentDate || []).map(e => e.id);
      const allRelevantIds = [...new Set([...transactionIds, ...paidTxIds])];
      const { data: allSchedulesForTransactions } = await supabase
        .from('entry_schedules')
        .select('entry_id')
        .in('entry_id', allRelevantIds.length > 0 ? allRelevantIds : ['']);

      // Set of transaction_ids that have schedules
      const transactionIdsWithSchedules = new Set(
        (allSchedulesForTransactions || []).map(s => s.entry_id)
      );

      // Fetch clients and items for names
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      const { data: items } = await supabase
        .from('services_products')
        .select('id, name, type');

      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));
      const itemMap = new Map((items || []).map(i => [i.id, { name: i.name, type: i.type }]));

      // Map transactions with client/item names
      const transactions: DashboardEntry[] = (transactionsData || []).map(transaction => {
        const item = transaction.service_product_id ? itemMap.get(transaction.service_product_id) : null;
        return {
          id: transaction.id,
          client_name: transaction.client_id ? clientMap.get(transaction.client_id) : undefined,
          item_name: item?.name || transaction.description,
          item_type: item?.type as 'servico' | 'produto' | undefined,
          value: Number(transaction.amount),
          status: transaction.status as 'pago' | 'pendente',
          date: transaction.date,
          due_date: transaction.due_date || null,
          payment_date: transaction.payment_date || null,
          payment_method: transaction.payment_method,
        };
      });

      const schedules = (schedulesInMonth || []) as ScheduleRow[];
      const paidSchedules = (paidSchedulesInMonth || []) as ScheduleRow[];
      const globalSchedules = (allPendingSchedules || []) as ScheduleRow[];

      // Transactions WITHOUT any schedules (use transaction values)
      const transactionsWithoutSchedules = transactions.filter(e => !transactionIdsWithSchedules.has(e.id));

      // ===== RECEBIDO (Received) — REGIME DE CAIXA =====
      // Paid standalone transactions by payment_date in month
      const paidStandaloneInMonth = (paidByPaymentDate || []).filter(t => !transactionIdsWithSchedules.has(t.id));
      // Usar amount_paid quando disponível (pagamento parcial), senão amount
      const paidTransactionsValue = paidStandaloneInMonth
        .reduce((sum, e) => {
          const paid = Number(e.amount_paid ?? 0);
          return sum + (paid > 0 ? paid : Number(e.amount ?? 0));
        }, 0);

      // Paid schedules by paid_at in month (usar amount da parcela, não amount_paid que pode estar inflado)
      const paidSchedulesValue = paidSchedules
        .reduce((sum, s) => sum + Number(s.amount ?? 0), 0);

      const received = paidTransactionsValue + paidSchedulesValue;

      // ===== A RECEBER (Pending - Monthly) =====
      // Pending transactions without schedules
      const pendingTransactionsValue = transactionsWithoutSchedules
        .filter(e => e.status === 'pendente')
        .reduce((sum, e) => sum + e.value, 0);

      // Pending schedules in this month
      const pendingSchedulesValue = schedules
        .filter(s => s.status === 'pendente')
        .reduce((sum, s) => sum + Number(s.amount), 0);

      const pending = pendingTransactionsValue + pendingSchedulesValue;

      const totalExpenses = (expensesData || []).reduce((sum, e) => sum + Number(e.value), 0);

      // ===== A VENCER (Upcoming - Global, all pending with due_date >= today) =====
      const upcomingTransactionsData = transactionsWithoutSchedules.filter(e => {
        if (e.status !== 'pendente' || !e.due_date) return false;
        const dueDate = new Date(e.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today;
      });

      // Use globalSchedules for upcoming (not limited to month)
      const upcomingSchedules = globalSchedules.filter(s => {
        const dueDate = new Date(s.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today;
      });

      const upcomingValue = 
        upcomingTransactionsData.reduce((sum, e) => sum + e.value, 0) +
        upcomingSchedules.reduce((sum, s) => sum + Number(s.amount), 0);

      const upcomingCount = upcomingTransactionsData.length + upcomingSchedules.length;

      // ===== EM ATRASO (Overdue - Global, all pending with due_date < today) =====
      const overdueTransactionsData = transactionsWithoutSchedules.filter(e => {
        if (e.status !== 'pendente' || !e.due_date) return false;
        const dueDate = new Date(e.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      });

      // Use globalSchedules for overdue (not limited to month)
      const overdueSchedules = globalSchedules.filter(s => {
        const dueDate = new Date(s.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      });

      const overdueValue = 
        overdueTransactionsData.reduce((sum, e) => sum + e.value, 0) +
        overdueSchedules.reduce((sum, s) => sum + Number(s.amount), 0);

      const overdueCount = overdueTransactionsData.length + overdueSchedules.length;

      // ===== GLOBAL RECEIVABLES (from entry_schedules only) =====
      // Total pending globally
      const globalPending = globalSchedules.reduce((sum, s) => sum + Number(s.amount), 0);

      // Next 30 days (pendente, due_date between today and today+30)
      const globalNext30Days = globalSchedules
        .filter(s => {
          const dueDate = s.due_date;
          return dueDate >= todayStr && dueDate <= next30DaysStr;
        })
        .reduce((sum, s) => sum + Number(s.amount), 0);

      // Overdue globally (pendente, due_date < today)
      const globalOverdue = globalSchedules
        .filter(s => s.due_date < todayStr)
        .reduce((sum, s) => sum + Number(s.amount), 0);

      // Calculate average ticket (paid items count)
      const paidCount = paidStandaloneInMonth.length + paidSchedules.length;

      const metrics: DashboardMetrics = {
        received,
        pending,
        expenses: totalExpenses,
        profit: received - totalExpenses,
        averageTicket: paidCount > 0 ? received / paidCount : 0,
        totalEntries: transactions.length,
        upcomingValue,
        upcomingCount,
        overdueValue,
        overdueCount,
        globalPending,
        globalNext30Days,
        globalOverdue,
      };

      // Build chart data aggregating by due_date for pending/overdue and by payment_date/paid_at for received
      const chartDataMap = new Map<string, ChartDataPoint>();
      
      // Initialize all days in month
      const monthStart = new Date(startDate);
      const monthEnd = new Date(endDate);
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        chartDataMap.set(dateStr, { date: dateStr, received: 0, pending: 0, overdue: 0 });
      }

      // Aggregate pending transactions without schedules by due_date
      transactionsWithoutSchedules.forEach(transaction => {
        if (transaction.status !== 'pago' && transaction.due_date) {
          const dueDate = new Date(transaction.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const point = chartDataMap.get(transaction.due_date);
          if (point) {
            if (dueDate < today) {
              point.overdue += transaction.value;
            } else {
              point.pending += transaction.value;
            }
          }
        }
      });

      // Aggregate received standalone transactions strictly by payment_date in month
      paidStandaloneInMonth.forEach(transaction => {
        if (!transaction.payment_date) return;
        const point = chartDataMap.get(transaction.payment_date);
        if (point) {
          const paid = Number(transaction.amount_paid ?? 0);
          point.received += paid > 0 ? paid : Number(transaction.amount ?? 0);
        }
      });

      // Aggregate pending schedules in month by due_date
      schedules.forEach(schedule => {
        if (schedule.status === 'pendente') {
          const dueDate = new Date(schedule.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const point = chartDataMap.get(schedule.due_date);
          if (point) {
            if (dueDate < today) {
              point.overdue += Number(schedule.amount);
            } else {
              point.pending += Number(schedule.amount);
            }
          }
        }
      });

      // Aggregate received schedules strictly by paid_at in month
      paidSchedules.forEach(schedule => {
        if (!schedule.paid_at) return;
        const paidDate = format(new Date(schedule.paid_at), 'yyyy-MM-dd');
        const point = chartDataMap.get(paidDate);
        if (point) point.received += Number(schedule.amount ?? 0);
      });

      const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      return {
        metrics,
        recentEntries: transactions.slice(0, 5),
        pendingEntries: transactionsWithoutSchedules.filter(e => e.status === 'pendente').slice(0, 5),
        chartData,
      };
    },
    enabled: !!user && !!accountId,
  });

  return {
    metrics: data?.metrics || {
      received: 0,
      pending: 0,
      expenses: 0,
      profit: 0,
      averageTicket: 0,
      totalEntries: 0,
      upcomingValue: 0,
      upcomingCount: 0,
      overdueValue: 0,
      overdueCount: 0,
      globalPending: 0,
      globalNext30Days: 0,
      globalOverdue: 0,
    },
    recentEntries: data?.recentEntries || [],
    pendingEntries: data?.pendingEntries || [],
    chartData: data?.chartData || [],
    isLoading,
    error,
  };
}
