import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, eachDayOfInterval, parseISO } from 'date-fns';
import { fetchCashReceived } from '@/lib/receivedCash';

// Janelas temporais disponíveis: 15, 30, 90 dias (default: 30)
export type TimeWindow = 15 | 30 | 90;

export interface BIMetrics {
  received: number;
  pending: number;
  expenses: number;
  profit: number;
  totalEntries: number;
  averageTicket: number;
}

export interface BIChartDataPoint {
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
}

export function useBIData(timeWindow: TimeWindow) {
  const { user, accountId } = useAuth();

  // Calculate date range based on time window
  const { startDate, endDate, today } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = subDays(now, timeWindow);
    
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd'),
      today: now,
    };
  }, [timeWindow]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['bi-data', accountId, timeWindow, startDate, endDate],
    queryFn: async () => {
      // ===== RECEBIDO — from canonical v_received_cash view =====
      const cashReceived = await fetchCashReceived({
        accountId: accountId!,
        startDate,
        endDate,
      });

      const received = cashReceived.total;
      const paidCount = cashReceived.paidStandaloneCount + cashReceived.paidScheduleCount;

      // Fetch pending transactions + schedules for "A Receber"
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId!)
        .eq('type', 'entrada')
        .eq('status', 'pendente')
        .gte('date', startDate)
        .lte('date', endDate);

      if (transactionsError) throw transactionsError;

      // Fetch transaction_ids that have schedules (to filter standalone)
      const transactionIds = (transactionsData || []).map(e => e.id);
      const { data: allSchedulesForTransactions } = await supabase
        .from('entry_schedules')
        .select('entry_id')
        .in('entry_id', transactionIds.length > 0 ? transactionIds : ['']);

      const transactionIdsWithSchedules = new Set(
        (allSchedulesForTransactions || []).map(s => s.entry_id)
      );

      const transactionsWithoutSchedules = (transactionsData || []).filter(e => !transactionIdsWithSchedules.has(e.id));

      // Pending schedules
      const { data: pendingSchedules, error: pendingSchedulesError } = await supabase
        .from('entry_schedules')
        .select('*')
        .eq('account_id', accountId!)
        .eq('status', 'pendente')
        .gte('due_date', startDate);

      if (pendingSchedulesError) throw pendingSchedulesError;

      const pendingTransactionsValue = transactionsWithoutSchedules
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const pendingSchedulesValue = (pendingSchedules || [])
        .reduce((sum, s) => sum + Number(s.amount), 0);

      const pending = pendingTransactionsValue + pendingSchedulesValue;

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('account_id', accountId!)
        .gte('date', startDate)
        .lte('date', endDate);

      if (expensesError) throw expensesError;

      const totalExpenses = (expensesData || []).reduce((sum, e) => sum + Number(e.value), 0);

      const metrics: BIMetrics = {
        received,
        pending,
        expenses: totalExpenses,
        profit: received - totalExpenses,
        averageTicket: paidCount > 0 ? received / paidCount : 0,
        totalEntries: (transactionsData || []).length,
      };

      // Build chart data for each day in the window
      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate),
      });

      const chartDataMap = new Map<string, BIChartDataPoint>();
      
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        chartDataMap.set(dateStr, { date: dateStr, received: 0, pending: 0, overdue: 0 });
      });

      // Aggregate received from cashReceived (v_received_cash view)
      cashReceived.byDate.forEach((value, dateStr) => {
        const point = chartDataMap.get(dateStr);
        if (point) point.received += value;
      });

      // Aggregate pending transactions (standalone)
      transactionsWithoutSchedules.forEach(transaction => {
        if (transaction.due_date) {
          const dueDate = new Date(transaction.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const point = chartDataMap.get(transaction.due_date);
          if (point) {
            if (dueDate < today) {
              point.overdue += Number(transaction.amount);
            } else {
              point.pending += Number(transaction.amount);
            }
          }
        }
      });

      // Aggregate pending schedules
      const lastDayStr = format(parseISO(endDate), 'yyyy-MM-dd');
      
      (pendingSchedules || []).forEach(schedule => {
        const dueDate = new Date(schedule.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const dueDateStr = format(dueDate, 'yyyy-MM-dd');
        
        let point = chartDataMap.get(dueDateStr);
        if (!point) {
          point = chartDataMap.get(lastDayStr);
        }
        
        if (point) {
          if (dueDate < today) {
            point.overdue += Number(schedule.amount);
          } else {
            point.pending += Number(schedule.amount);
          }
        }
      });

      const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      return {
        metrics,
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
    },
    chartData: data?.chartData || [],
    isLoading,
    error,
    timeWindow,
    startDate,
    endDate,
  };
}
