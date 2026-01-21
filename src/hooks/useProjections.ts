import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';

export interface ProjectionMetrics {
  // Projection by period
  projection30: { receivables: number; expenses: number; balance: number };
  projection60: { receivables: number; expenses: number; balance: number };
  projection90: { receivables: number; expenses: number; balance: number };
  
  // Risk metrics
  overduePercentage: number;
  delinquentClientsCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  
  // Critical due dates
  criticalDueDates: Array<{
    id: string;
    scheduleId?: string;
    clientName: string;
    value: number;
    dueDate: string;
    daysUntilDue: number;
    isOverdue: boolean;
  }>;
  
  // Insight data
  insightData: {
    overdueImpact: number;
    potentialRecovery: number;
    trend: 'positive' | 'negative' | 'neutral';
  };
}

export function useProjections() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['projections'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, 'yyyy-MM-dd');
      
      const date30 = format(addDays(today, 30), 'yyyy-MM-dd');
      const date60 = format(addDays(today, 60), 'yyyy-MM-dd');
      const date90 = format(addDays(today, 90), 'yyyy-MM-dd');

      // Fetch all pending schedules
      const { data: pendingSchedules, error: schedulesError } = await supabase
        .from('entry_schedules')
        .select(`
          id,
          entry_id,
          amount,
          due_date,
          status,
          entries!inner (
            client_id,
            clients (
              id,
              name
            )
          )
        `)
        .eq('status', 'pendente')
        .order('due_date', { ascending: true });

      if (schedulesError) throw schedulesError;

      // Fetch recurring expenses (fixed)
      const { data: fixedExpenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('type', 'fixa');

      if (expensesError) throw expensesError;

      // Calculate monthly fixed expenses total
      const monthlyFixedExpenses = (fixedExpenses || []).reduce(
        (sum, e) => sum + Number(e.value), 
        0
      );

      // Calculate projections for each period
      const calculateProjection = (endDateStr: string) => {
        const receivables = (pendingSchedules || [])
          .filter(s => s.due_date >= todayStr && s.due_date <= endDateStr)
          .reduce((sum, s) => sum + Number(s.amount), 0);
        
        // Estimate expenses based on fixed monthly expenses
        const monthsInPeriod = endDateStr === date30 ? 1 : endDateStr === date60 ? 2 : 3;
        const expenses = monthlyFixedExpenses * monthsInPeriod;
        
        return {
          receivables,
          expenses,
          balance: receivables - expenses,
        };
      };

      const projection30 = calculateProjection(date30);
      const projection60 = calculateProjection(date60);
      const projection90 = calculateProjection(date90);

      // Calculate risk metrics
      const allSchedules = pendingSchedules || [];
      const overdueSchedules = allSchedules.filter(s => s.due_date < todayStr);
      const totalPendingValue = allSchedules.reduce((sum, s) => sum + Number(s.amount), 0);
      const overdueValue = overdueSchedules.reduce((sum, s) => sum + Number(s.amount), 0);
      
      const overduePercentage = totalPendingValue > 0 
        ? (overdueValue / totalPendingValue) * 100 
        : 0;

      // Count unique delinquent clients
      const delinquentClientIds = new Set(
        overdueSchedules
          .map(s => (s.entries as any)?.client_id)
          .filter(Boolean)
      );
      const delinquentClientsCount = delinquentClientIds.size;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (overduePercentage > 30 || delinquentClientsCount > 5) {
        riskLevel = 'high';
      } else if (overduePercentage > 15 || delinquentClientsCount > 2) {
        riskLevel = 'medium';
      }

      // Get critical due dates (next 5, prioritizing overdue and near-term)
      const criticalDueDates = allSchedules
        .map(s => {
          const dueDate = new Date(s.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const diffTime = dueDate.getTime() - today.getTime();
          const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          const clientData = (s.entries as any)?.clients;
          
          return {
            id: (s.entries as any)?.id || s.entry_id,
            scheduleId: s.id,
            clientName: clientData?.name || 'Cliente não identificado',
            value: Number(s.amount),
            dueDate: s.due_date,
            daysUntilDue,
            isOverdue: daysUntilDue < 0,
          };
        })
        .sort((a, b) => {
          // Overdue first, then by days until due
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return a.daysUntilDue - b.daysUntilDue;
        })
        .slice(0, 5);

      // Calculate insight data
      const potentialRecovery = overdueValue;
      const trend = overduePercentage > 20 ? 'negative' : overduePercentage < 10 ? 'positive' : 'neutral';

      const insightData = {
        overdueImpact: overdueValue,
        potentialRecovery,
        trend,
      };

      return {
        projection30,
        projection60,
        projection90,
        overduePercentage,
        delinquentClientsCount,
        riskLevel,
        criticalDueDates,
        insightData,
      } as ProjectionMetrics;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    projections: data || {
      projection30: { receivables: 0, expenses: 0, balance: 0 },
      projection60: { receivables: 0, expenses: 0, balance: 0 },
      projection90: { receivables: 0, expenses: 0, balance: 0 },
      overduePercentage: 0,
      delinquentClientsCount: 0,
      riskLevel: 'low' as const,
      criticalDueDates: [],
      insightData: { overdueImpact: 0, potentialRecovery: 0, trend: 'neutral' as const },
    },
    isLoading,
    error,
  };
}
