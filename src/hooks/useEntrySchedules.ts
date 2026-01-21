import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ScheduleType = 'single' | 'installment' | 'monthly_package';

export interface EntrySchedule {
  id: string;
  user_id: string;
  entry_id: string;
  schedule_type: ScheduleType;
  installment_number: number;
  installments_total: number;
  due_date: string;
  paid_at: string | null;
  status: 'pendente' | 'pago';
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSchedulesInput {
  entry_id: string;
  schedule_type: ScheduleType;
  total_value: number;
  installments_total: number;
  first_due_date: string;
  interval_days: number;
}

/**
 * Distributes a total value across installments, ensuring cents are properly allocated
 */
function distributeAmount(total: number, count: number): number[] {
  const baseAmount = Math.floor(total * 100 / count) / 100;
  const amounts = Array(count).fill(baseAmount);
  
  // Calculate remainder and add to last installment
  const remainder = Math.round((total - baseAmount * count) * 100) / 100;
  amounts[count - 1] = Math.round((amounts[count - 1] + remainder) * 100) / 100;
  
  return amounts;
}

/**
 * Calculate due date for each installment
 */
function calculateDueDate(firstDueDate: string, index: number, intervalDays: number): string {
  const date = new Date(firstDueDate);
  date.setDate(date.getDate() + (index * intervalDays));
  return date.toISOString().split('T')[0];
}

export function useEntrySchedules(entryId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading, error } = useQuery({
    queryKey: ['entry_schedules', entryId],
    queryFn: async (): Promise<EntrySchedule[]> => {
      let query = supabase
        .from('entry_schedules')
        .select('*')
        .order('installment_number', { ascending: true });
      
      if (entryId) {
        query = query.eq('entry_id', entryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(s => ({
        ...s,
        amount: Number(s.amount),
      })) as EntrySchedule[];
    },
    enabled: !!user && (entryId !== undefined || entryId === null),
  });

  const { data: allSchedules = [], isLoading: allLoading } = useQuery({
    queryKey: ['entry_schedules', 'all'],
    queryFn: async (): Promise<EntrySchedule[]> => {
      const { data, error } = await supabase
        .from('entry_schedules')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(s => ({
        ...s,
        amount: Number(s.amount),
      })) as EntrySchedule[];
    },
    enabled: !!user,
  });

  const createSchedules = useMutation({
    mutationFn: async (input: CreateSchedulesInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      const amounts = distributeAmount(input.total_value, input.installments_total);
      
      const schedules = amounts.map((amount, index) => ({
        user_id: user.id,
        entry_id: input.entry_id,
        schedule_type: input.schedule_type,
        installment_number: index + 1,
        installments_total: input.installments_total,
        due_date: calculateDueDate(input.first_due_date, index, input.interval_days),
        status: 'pendente' as const,
        amount,
      }));

      const { error } = await supabase
        .from('entry_schedules')
        .insert(schedules);

      if (error) throw error;
      return schedules;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entry_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar parcelas:', error);
      toast.error('Erro ao criar parcelas: ' + error.message);
    },
  });

  const markScheduleAsPaid = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('entry_schedules')
        .update({ 
          status: 'pago',
          paid_at: new Date().toISOString(),
        })
        .eq('id', scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entry_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Parcela marcada como paga!');
    },
    onError: (error: Error) => {
      console.error('Erro ao marcar parcela como paga:', error);
      toast.error('Erro ao marcar parcela como paga');
    },
  });

  // Group schedules by entry for summary display
  const schedulesByEntry = allSchedules.reduce((acc, schedule) => {
    if (!acc[schedule.entry_id]) {
      acc[schedule.entry_id] = [];
    }
    acc[schedule.entry_id].push(schedule);
    return acc;
  }, {} as Record<string, EntrySchedule[]>);

  return {
    schedules,
    allSchedules,
    schedulesByEntry,
    isLoading: isLoading || allLoading,
    error,
    createSchedules,
    markScheduleAsPaid,
  };
}

/**
 * Get summary info for an entry's schedules
 */
export function getScheduleSummary(schedules: EntrySchedule[]) {
  if (!schedules || schedules.length === 0) return null;
  
  const total = schedules.length;
  const paid = schedules.filter(s => s.status === 'pago').length;
  const pending = total - paid;
  const type = schedules[0].schedule_type;
  
  const typeLabel = type === 'installment' 
    ? `${total}x` 
    : type === 'monthly_package' 
      ? `${total} meses` 
      : '';
  
  return {
    total,
    paid,
    pending,
    type,
    typeLabel,
    summary: `${typeLabel} — ${paid} ${paid === 1 ? 'paga' : 'pagas'} / ${pending} ${pending === 1 ? 'pendente' : 'pendentes'}`,
  };
}

/**
 * Calculate default due date (entry date + 30 days)
 */
export function getDefaultDueDate(entryDate: string): string {
  const date = new Date(entryDate);
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}
