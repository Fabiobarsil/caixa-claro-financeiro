import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, eachDayOfInterval, parseISO } from 'date-fns';

export type TimeWindow = 30 | 60 | 90;

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
  const { user } = useAuth();

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
    queryKey: ['bi-data', timeWindow, startDate, endDate],
    queryFn: async () => {
      const todayStr = format(today, 'yyyy-MM-dd');

      // Fetch entries in the time window
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (entriesError) throw entriesError;

      // Fetch expenses in the time window
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (expensesError) throw expensesError;

      // Fetch entry schedules with due_date in the time window
      const { data: schedulesInWindow, error: schedulesError } = await supabase
        .from('entry_schedules')
        .select('*')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      if (schedulesError) throw schedulesError;

      // Fetch all entry_ids that have any schedules
      const entryIds = (entriesData || []).map(e => e.id);
      const { data: allSchedulesForEntries } = await supabase
        .from('entry_schedules')
        .select('entry_id')
        .in('entry_id', entryIds.length > 0 ? entryIds : ['']);

      // Set of entry_ids that have schedules
      const entryIdsWithSchedules = new Set(
        (allSchedulesForEntries || []).map(s => s.entry_id)
      );

      const schedules = (schedulesInWindow || []) as ScheduleRow[];

      // Entries WITHOUT any schedules (use entry values)
      const entriesWithoutSchedules = (entriesData || []).filter(e => !entryIdsWithSchedules.has(e.id));

      // ===== RECEBIDO (Received) =====
      const paidEntriesValue = entriesWithoutSchedules
        .filter(e => e.status === 'pago')
        .reduce((sum, e) => sum + Number(e.value), 0);

      const paidSchedulesValue = schedules
        .filter(s => s.status === 'pago')
        .reduce((sum, s) => sum + Number(s.amount), 0);

      const received = paidEntriesValue + paidSchedulesValue;

      // ===== A RECEBER (Pending) =====
      const pendingEntriesValue = entriesWithoutSchedules
        .filter(e => e.status === 'pendente')
        .reduce((sum, e) => sum + Number(e.value), 0);

      const pendingSchedulesValue = schedules
        .filter(s => s.status === 'pendente')
        .reduce((sum, s) => sum + Number(s.amount), 0);

      const pending = pendingEntriesValue + pendingSchedulesValue;

      const totalExpenses = (expensesData || []).reduce((sum, e) => sum + Number(e.value), 0);

      // Calculate average ticket
      const paidCount = entriesWithoutSchedules.filter(e => e.status === 'pago').length + 
                        schedules.filter(s => s.status === 'pago').length;

      const metrics: BIMetrics = {
        received,
        pending,
        expenses: totalExpenses,
        profit: received - totalExpenses,
        averageTicket: paidCount > 0 ? received / paidCount : 0,
        totalEntries: (entriesData || []).length,
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

      // Aggregate entries without schedules
      entriesWithoutSchedules.forEach(entry => {
        if (entry.status === 'pago') {
          const paymentDate = entry.payment_date || entry.date;
          const point = chartDataMap.get(paymentDate);
          if (point) point.received += Number(entry.value);
        } else if (entry.due_date) {
          const dueDate = new Date(entry.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const point = chartDataMap.get(entry.due_date);
          if (point) {
            if (dueDate < today) {
              point.overdue += Number(entry.value);
            } else {
              point.pending += Number(entry.value);
            }
          }
        }
      });

      // Aggregate schedules
      schedules.forEach(schedule => {
        if (schedule.status === 'pago' && schedule.paid_at) {
          const paidDate = format(new Date(schedule.paid_at), 'yyyy-MM-dd');
          const point = chartDataMap.get(paidDate);
          if (point) point.received += Number(schedule.amount);
        } else if (schedule.status === 'pendente') {
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

      const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      return {
        metrics,
        chartData,
      };
    },
    enabled: !!user,
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
