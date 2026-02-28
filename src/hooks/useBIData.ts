import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, eachDayOfInterval, parseISO } from 'date-fns';

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
      const todayStr = format(today, 'yyyy-MM-dd');

      // Fetch transactions in the time window
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch expenses in the time window
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (expensesError) throw expensesError;

      // Fetch entry schedules:
      // 1. Paid schedules with paid_at in the time window
      // 2. Pending schedules with due_date from startDate onwards (including future)
      const { data: paidSchedulesInWindow, error: paidSchedulesError } = await supabase
        .from('entry_schedules')
        .select('*')
        .eq('status', 'pago')
        .gte('paid_at', startDate)
        .lte('paid_at', endDate + 'T23:59:59');

      if (paidSchedulesError) throw paidSchedulesError;

      const { data: pendingSchedules, error: pendingSchedulesError } = await supabase
        .from('entry_schedules')
        .select('*')
        .eq('status', 'pendente')
        .gte('due_date', startDate);

      if (pendingSchedulesError) throw pendingSchedulesError;

      // Combine both sets of schedules
      const schedulesInWindow = [...(paidSchedulesInWindow || []), ...(pendingSchedules || [])];

      // Fetch all transaction_ids that have any schedules
      const transactionIds = (transactionsData || []).map(e => e.id);
      const { data: allSchedulesForTransactions } = await supabase
        .from('entry_schedules')
        .select('entry_id')
        .in('entry_id', transactionIds.length > 0 ? transactionIds : ['']);

      // Set of transaction_ids that have schedules
      const transactionIdsWithSchedules = new Set(
        (allSchedulesForTransactions || []).map(s => s.entry_id)
      );

      const schedules = (schedulesInWindow || []) as ScheduleRow[];

      // Transactions WITHOUT any schedules (use transaction values)
      const transactionsWithoutSchedules = (transactionsData || []).filter(e => !transactionIdsWithSchedules.has(e.id));

      // ===== RECEBIDO (Received) =====
      const paidTransactionsValue = transactionsWithoutSchedules
        .filter(e => e.status === 'pago')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const paidSchedulesValue = schedules
        .filter(s => s.status === 'pago')
        .reduce((sum, s) => sum + Number(s.amount), 0);

      const received = paidTransactionsValue + paidSchedulesValue;

      // ===== A RECEBER (Pending) =====
      const pendingTransactionsValue = transactionsWithoutSchedules
        .filter(e => e.status === 'pendente')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const pendingSchedulesValue = schedules
        .filter(s => s.status === 'pendente')
        .reduce((sum, s) => sum + Number(s.amount), 0);

      const pending = pendingTransactionsValue + pendingSchedulesValue;

      const totalExpenses = (expensesData || []).reduce((sum, e) => sum + Number(e.value), 0);

      // Calculate average ticket
      const paidCount = transactionsWithoutSchedules.filter(e => e.status === 'pago').length + 
                        schedules.filter(s => s.status === 'pago').length;

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

      // Aggregate transactions without schedules
      transactionsWithoutSchedules.forEach(transaction => {
        if (transaction.status === 'pago') {
          const paymentDate = transaction.payment_date || transaction.date;
          const point = chartDataMap.get(paymentDate);
          if (point) point.received += Number(transaction.amount);
        } else if (transaction.due_date) {
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

      // Aggregate schedules
      // For pending schedules with future due_date, aggregate on the last day of the chart
      const lastDayStr = format(parseISO(endDate), 'yyyy-MM-dd');
      
      schedules.forEach(schedule => {
        if (schedule.status === 'pago' && schedule.paid_at) {
          const paidDate = format(new Date(schedule.paid_at), 'yyyy-MM-dd');
          const point = chartDataMap.get(paidDate);
          if (point) point.received += Number(schedule.amount);
        } else if (schedule.status === 'pendente') {
          const dueDate = new Date(schedule.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const dueDateStr = format(dueDate, 'yyyy-MM-dd');
          
          // Check if due_date is within the chart range
          let point = chartDataMap.get(dueDateStr);
          
          // If due_date is in the future (outside chart range), aggregate on the last day
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
