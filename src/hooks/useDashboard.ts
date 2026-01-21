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
}

export function useDashboard(selectedMonth?: string) {
  const { user } = useAuth();

  // Parse selected month or use current month
  const { startDate, endDate } = useMemo(() => {
    const date = selectedMonth ? parseISO(`${selectedMonth}-01`) : new Date();
    return {
      startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
    };
  }, [selectedMonth]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', startDate, endDate],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, 'yyyy-MM-dd');
      const next30DaysStr = format(addDays(today, 30), 'yyyy-MM-dd');

      // Fetch entries for the month
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (entriesError) throw entriesError;

      // Fetch expenses for the month
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (expensesError) throw expensesError;

      // Fetch entry schedules with due_date in month (for metrics)
      const { data: schedulesInMonth, error: schedulesError } = await supabase
        .from('entry_schedules')
        .select('*')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      if (schedulesError) throw schedulesError;

      // Fetch ALL pending schedules globally (for global receivables)
      const { data: allPendingSchedules, error: allPendingError } = await supabase
        .from('entry_schedules')
        .select('*')
        .eq('status', 'pendente');

      if (allPendingError) throw allPendingError;

      // Fetch ALL entry_ids that have any schedules (to know which entries to exclude)
      const entryIds = (entriesData || []).map(e => e.id);
      const { data: allSchedulesForEntries } = await supabase
        .from('entry_schedules')
        .select('entry_id')
        .in('entry_id', entryIds.length > 0 ? entryIds : ['']);

      // Set of entry_ids that have schedules
      const entryIdsWithSchedules = new Set(
        (allSchedulesForEntries || []).map(s => s.entry_id)
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

      // Map entries with client/item names
      const entries: DashboardEntry[] = (entriesData || []).map(entry => {
        const item = entry.service_product_id ? itemMap.get(entry.service_product_id) : null;
        return {
          id: entry.id,
          client_name: entry.client_id ? clientMap.get(entry.client_id) : undefined,
          item_name: item?.name,
          item_type: item?.type as 'servico' | 'produto' | undefined,
          value: Number(entry.value),
          status: entry.status as 'pago' | 'pendente',
          date: entry.date,
          due_date: entry.due_date || null,
          payment_date: entry.payment_date || null,
          payment_method: entry.payment_method,
        };
      });

      const schedules = (schedulesInMonth || []) as ScheduleRow[];
      const globalSchedules = (allPendingSchedules || []) as ScheduleRow[];

      // Entries WITHOUT any schedules (use entry values)
      const entriesWithoutSchedules = entries.filter(e => !entryIdsWithSchedules.has(e.id));

      // ===== RECEBIDO (Received) =====
      // Paid entries without schedules
      const paidEntriesValue = entriesWithoutSchedules
        .filter(e => e.status === 'pago')
        .reduce((sum, e) => sum + e.value, 0);

      // Paid schedules in this month (source of truth for installments)
      const paidSchedulesValue = schedules
        .filter(s => s.status === 'pago')
        .reduce((sum, s) => sum + Number(s.amount), 0);

      const received = paidEntriesValue + paidSchedulesValue;

      // ===== A RECEBER (Pending - Monthly) =====
      // Pending entries without schedules
      const pendingEntriesValue = entriesWithoutSchedules
        .filter(e => e.status === 'pendente')
        .reduce((sum, e) => sum + e.value, 0);

      // Pending schedules in this month
      const pendingSchedulesValue = schedules
        .filter(s => s.status === 'pendente')
        .reduce((sum, s) => sum + Number(s.amount), 0);

      const pending = pendingEntriesValue + pendingSchedulesValue;

      const totalExpenses = (expensesData || []).reduce((sum, e) => sum + Number(e.value), 0);

      // ===== A VENCER (Upcoming - Global, all pending with due_date >= today) =====
      const upcomingEntriesData = entriesWithoutSchedules.filter(e => {
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
        upcomingEntriesData.reduce((sum, e) => sum + e.value, 0) +
        upcomingSchedules.reduce((sum, s) => sum + Number(s.amount), 0);

      const upcomingCount = upcomingEntriesData.length + upcomingSchedules.length;

      // ===== EM ATRASO (Overdue - Global, all pending with due_date < today) =====
      const overdueEntriesData = entriesWithoutSchedules.filter(e => {
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
        overdueEntriesData.reduce((sum, e) => sum + e.value, 0) +
        overdueSchedules.reduce((sum, s) => sum + Number(s.amount), 0);

      const overdueCount = overdueEntriesData.length + overdueSchedules.length;

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
      const paidCount = entriesWithoutSchedules.filter(e => e.status === 'pago').length + 
                        schedules.filter(s => s.status === 'pago').length;

      const metrics: DashboardMetrics = {
        received,
        pending,
        expenses: totalExpenses,
        profit: received - totalExpenses,
        averageTicket: paidCount > 0 ? received / paidCount : 0,
        totalEntries: entries.length,
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

      // Aggregate entries without schedules
      entriesWithoutSchedules.forEach(entry => {
        if (entry.status === 'pago') {
          const paymentDate = entry.payment_date || entry.date;
          const point = chartDataMap.get(paymentDate);
          if (point) point.received += entry.value;
        } else if (entry.due_date) {
          const dueDate = new Date(entry.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const point = chartDataMap.get(entry.due_date);
          if (point) {
            if (dueDate < today) {
              point.overdue += entry.value;
            } else {
              point.pending += entry.value;
            }
          }
        }
      });

      // Aggregate schedules in month
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
        recentEntries: entries.slice(0, 5),
        pendingEntries: entriesWithoutSchedules.filter(e => e.status === 'pendente').slice(0, 5),
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
