import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, eachDayOfInterval, parseISO, lastDayOfMonth } from 'date-fns';
import type { MonthPeriod } from '@/components/dashboard/TimeWindowSelector';

// ============================================
// MODELO FINANCEIRO CANÔNICO - FONTE ÚNICA DA VERDADE
// ============================================

// Re-export for backward compat
export type { MonthPeriod };

/**
 * Objeto canônico de consolidação financeira.
 */
export interface FinancialSnapshot {
  recebido: number;
  a_receber: number;
  em_atraso: number;
  despesas_pagas: number;
  despesas_a_vencer: number;
  despesas_em_atraso: number;
  lucro_real: number;
  total_entradas: number;
  total_saidas: number;
  total_atendimentos: number;
  ticket_medio: number;
}

export interface ChartDataPoint {
  date: string;
  recebido: number;
  a_receber: number;
  despesas: number;
}

export interface DistributionData {
  recebido: number;
  a_receber: number;
  em_atraso: number;
}

export interface ExpenseCategoryData {
  name: string;
  value: number;
}

export interface RiskMetrics {
  risco_percentual: number;
  nivel_risco: 'baixo' | 'medio' | 'alto';
  clientes_inadimplentes: number;
}

export interface ProjectionMetrics {
  saldo_projetado: number;
  recebiveis_futuros: number;
  despesas_futuras: number;
}

export interface CriticalDueDate {
  id: string;
  scheduleId?: string;
  clientName: string;
  value: number;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

export interface UseFinancialSnapshotReturn {
  snapshot: FinancialSnapshot;
  chartData: ChartDataPoint[];
  distribution: DistributionData;
  expensesByCategory: ExpenseCategoryData[];
  risk: RiskMetrics;
  projection: ProjectionMetrics;
  criticalDueDates: CriticalDueDate[];
  isLoading: boolean;
  error: Error | null;
  monthPeriod: MonthPeriod;
  monthLabel: string;
  startDate: string;
  endDate: string;
}

interface ScheduleRow {
  id: string;
  entry_id: string;
  schedule_type: string;
  installment_number: number;
  installments_total: number;
  due_date: string;
  paid_at: string | null;
  status: 'pago' | 'pendente';
  amount: number;
}

interface ExpenseRow {
  id: string;
  user_id: string;
  type: 'fixa' | 'variavel';
  category: string;
  value: number;
  date: string;
  status: 'pago' | 'pendente';
  notes: string | null;
}

/**
 * Hook canônico para dados financeiros por competência mensal.
 */
export function useFinancialSnapshot(monthPeriod: MonthPeriod): UseFinancialSnapshotReturn {
  const { user, accountId } = useAuth();

  const { startDate, endDate, today, todayStr, monthLabel } = useMemo(() => {
    const first = new Date(monthPeriod.year, monthPeriod.month, 1);
    const last = lastDayOfMonth(first);
    const startStr = format(first, 'yyyy-MM-dd');
    const endStr = format(last, 'yyyy-MM-dd');
    const now = new Date();
    const todayUtc = now.toISOString().slice(0, 10);
    const todayMidnight = new Date(todayUtc + 'T00:00:00Z');
    const label = format(first, "MMMM/yyyy");

    return {
      startDate: startStr,
      endDate: endStr,
      today: todayMidnight,
      todayStr: todayUtc,
      monthLabel: label,
    };
  }, [monthPeriod]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['financial-snapshot', monthPeriod.year, monthPeriod.month, accountId],
    queryFn: async () => {
      try {
      console.log('[FinancialSnapshot] Query params:', { startDate, endDate, todayStr, monthPeriod, accountId });

      // Parcelas pagas no período
      const { data: paidSchedules, error: paidSchedulesError } = await supabase
        .from('entry_schedules')
        .select('id, entry_id, schedule_type, installment_number, installments_total, due_date, paid_at, status, amount')
        .eq('status', 'pago')
        .gte('paid_at', startDate)
        .lte('paid_at', endDate + 'T23:59:59.999Z');

      if (paidSchedulesError) throw paidSchedulesError;

      // Parcelas pendentes com vencimento no período
      const { data: pendingSchedules, error: pendingSchedulesError } = await supabase
        .from('entry_schedules')
        .select(`
          id, entry_id, schedule_type, installment_number, installments_total,
          due_date, paid_at, status, amount,
          transactions!inner ( client_id, clients ( id, name ) )
        `)
        .eq('status', 'pendente')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      if (pendingSchedulesError) throw pendingSchedulesError;

      // Transactions no período
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, client_id, amount, status, date, due_date, payment_date, clients ( id, name )')
        .gte('date', startDate)
        .lte('date', endDate);

      if (transactionsError) throw transactionsError;

      // Check which transactions have schedules
      const transactionIds = (transactionsData || []).map(e => e.id);
      const { data: schedulesForTransactions } = await supabase
        .from('entry_schedules')
        .select('entry_id')
        .in('entry_id', transactionIds.length > 0 ? transactionIds : ['']);

      const transactionIdsWithSchedules = new Set(
        (schedulesForTransactions || []).map(s => s.entry_id)
      );

      const transactionsWithoutSchedules = (transactionsData || []).filter(
        e => !transactionIdsWithSchedules.has(e.id)
      );

      // Despesas do mês
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (expensesError) throw expensesError;

      const expenses = (expensesData || []) as ExpenseRow[];

      // ============================================
      // CALCULAR VALORES
      // ============================================

      // RECEBIDO
      let recebido = 0;
      (paidSchedules || []).forEach(s => { recebido += Number(s.amount); });
      transactionsWithoutSchedules
        .filter(e => e.status === 'pago')
        .forEach(e => {
          const paymentDate = e.payment_date || e.date;
          if (paymentDate >= startDate && paymentDate <= endDate) {
            recebido += Number(e.amount);
          }
        });

      // A_RECEBER (pendentes com vencimento >= hoje dentro do mês)
      let aReceber = 0;
      (pendingSchedules || [])
        .filter(s => s.due_date >= todayStr)
        .forEach(s => { aReceber += Number(s.amount); });
      transactionsWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date && e.due_date >= todayStr)
        .forEach(e => { aReceber += Number(e.amount); });

      // Atendimentos
      let totalAtendimentos = (paidSchedules || []).length;
      transactionsWithoutSchedules
        .filter(e => e.status === 'pago')
        .forEach(e => {
          const paymentDate = e.payment_date || e.date;
          if (paymentDate >= startDate && paymentDate <= endDate) totalAtendimentos++;
        });

      // EM_ATRASO (pendentes com vencimento < hoje)
      let emAtraso = 0;
      (pendingSchedules || [])
        .filter(s => s.due_date < todayStr)
        .forEach(s => { emAtraso += Number(s.amount); });
      transactionsWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date && e.due_date < todayStr)
        .forEach(e => { emAtraso += Number(e.amount); });

      // DESPESAS (split by status)
      const despesasPagas = expenses
        .filter(e => e.status === 'pago')
        .reduce((sum, e) => sum + Number(e.value), 0);
      const despesasAVencer = expenses
        .filter(e => e.status === 'pendente' && e.date >= todayStr)
        .reduce((sum, e) => sum + Number(e.value), 0);
      const despesasEmAtraso = expenses
        .filter(e => e.status === 'pendente' && e.date < todayStr)
        .reduce((sum, e) => sum + Number(e.value), 0);

      // DERIVADOS
      const lucroReal = recebido - despesasPagas;
      const totalEntradas = recebido + aReceber + emAtraso;
      const totalSaidas = despesasPagas + despesasAVencer + despesasEmAtraso;
      const ticketMedio = totalAtendimentos > 0 ? recebido / totalAtendimentos : 0;

      console.log('[FinancialSnapshot] Calc:', { recebido, aReceber, emAtraso, despesasPagas, lucroReal });

      const snapshot: FinancialSnapshot = {
        recebido,
        a_receber: aReceber,
        em_atraso: emAtraso,
        despesas_pagas: despesasPagas,
        despesas_a_vencer: despesasAVencer,
        despesas_em_atraso: despesasEmAtraso,
        lucro_real: lucroReal,
        total_entradas: totalEntradas,
        total_saidas: totalSaidas,
        total_atendimentos: totalAtendimentos,
        ticket_medio: ticketMedio,
      };

      // ============================================
      // DADOS PARA GRÁFICOS
      // ============================================
      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate),
      });

      const dailyData = new Map<string, { recebido: number; a_receber: number; despesas: number }>();
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        dailyData.set(dateStr, { recebido: 0, a_receber: 0, despesas: 0 });
      });

      (paidSchedules || []).forEach(s => {
        if (s.paid_at) {
          const paidDate = format(new Date(s.paid_at), 'yyyy-MM-dd');
          const point = dailyData.get(paidDate);
          if (point) point.recebido += Number(s.amount);
        }
      });

      (pendingSchedules || []).forEach(s => {
        const point = dailyData.get(s.due_date);
        if (point) point.a_receber += Number(s.amount);
      });

      transactionsWithoutSchedules
        .filter(e => e.status === 'pago')
        .forEach(e => {
          const paymentDate = e.payment_date || e.date;
          if (paymentDate >= startDate && paymentDate <= endDate) {
            const point = dailyData.get(paymentDate);
            if (point) point.recebido += Number(e.amount);
          }
        });

      transactionsWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date)
        .forEach(e => {
          const point = dailyData.get(e.due_date!);
          if (point) point.a_receber += Number(e.amount);
        });

      expenses.forEach(e => {
        const point = dailyData.get(e.date);
        if (point) point.despesas += Number(e.value);
      });

      // Acumulado
      const chartData: ChartDataPoint[] = [];
      let accR = 0, accA = 0, accD = 0;
      Array.from(dailyData.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, values]) => {
          accR += values.recebido;
          accA += values.a_receber;
          accD += values.despesas;
          chartData.push({ date, recebido: accR, a_receber: accA, despesas: accD });
        });

      // Distribuição
      const distribution: DistributionData = {
        recebido: snapshot.recebido,
        a_receber: snapshot.a_receber,
        em_atraso: snapshot.em_atraso,
      };

      // Despesas por Categoria
      const categoryMap = new Map<string, number>();
      expenses.forEach(e => {
        const cat = e.category || e.type || 'Outros';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(e.value));
      });
      const expensesByCategory: ExpenseCategoryData[] = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // ============================================
      // RISCO
      // ============================================
      const denominadorRisco = aReceber + emAtraso;
      const riscoPercentual = denominadorRisco > 0 ? (emAtraso / denominadorRisco) * 100 : 0;

      const clientesInadimplentes = new Set<string>();
      (pendingSchedules || [])
        .filter(s => s.due_date < todayStr)
        .forEach(s => {
          const clientId = (s.transactions as any)?.client_id;
          if (clientId) clientesInadimplentes.add(clientId);
        });
      transactionsWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date && e.due_date < todayStr)
        .forEach(e => { if (e.client_id) clientesInadimplentes.add(e.client_id); });

      let nivelRisco: 'baixo' | 'medio' | 'alto' = 'baixo';
      if (riscoPercentual > 30 || clientesInadimplentes.size > 5) nivelRisco = 'alto';
      else if (riscoPercentual > 15 || clientesInadimplentes.size > 2) nivelRisco = 'medio';

      const risk: RiskMetrics = {
        risco_percentual: riscoPercentual,
        nivel_risco: nivelRisco,
        clientes_inadimplentes: clientesInadimplentes.size,
      };

      // ============================================
      // PROJEÇÃO
      // ============================================
      const saldoProjetado = (recebido + aReceber) - (despesasPagas + despesasAVencer);
      const projection: ProjectionMetrics = {
        saldo_projetado: saldoProjetado,
        recebiveis_futuros: aReceber,
        despesas_futuras: despesasAVencer,
      };

      // ============================================
      // VENCIMENTOS CRÍTICOS
      // ============================================
      const allPendingItems: CriticalDueDate[] = [];

      (pendingSchedules || []).forEach(s => {
        const dueDate = new Date(s.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - today.getTime();
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const clientData = (s.transactions as any)?.clients;
        allPendingItems.push({
          id: (s.transactions as any)?.id || s.entry_id,
          scheduleId: s.id,
          clientName: clientData?.name || 'Cliente não identificado',
          value: Number(s.amount),
          dueDate: s.due_date,
          daysUntilDue,
          isOverdue: daysUntilDue < 0,
        });
      });

      transactionsWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date)
        .forEach(e => {
          const dueDate = new Date(e.due_date!);
          dueDate.setHours(0, 0, 0, 0);
          const diffTime = dueDate.getTime() - today.getTime();
          const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const clientData = e.clients as any;
          allPendingItems.push({
            id: e.id,
            clientName: clientData?.name || 'Cliente não identificado',
            value: Number(e.amount),
            dueDate: e.due_date!,
            daysUntilDue,
            isOverdue: daysUntilDue < 0,
          });
        });

      const criticalDueDates = allPendingItems
        .sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return a.daysUntilDue - b.daysUntilDue;
        })
        .slice(0, 5);

      return { snapshot, chartData, distribution, expensesByCategory, risk, projection, criticalDueDates };
      } catch (err) {
        console.error('[FinancialSnapshot] ERRO:', err);
        throw err;
      }
    },
    enabled: !!user && !!accountId,
    staleTime: 1000 * 60 * 5,
  });

  const defaultSnapshot: FinancialSnapshot = {
    recebido: 0, a_receber: 0, em_atraso: 0,
    despesas_pagas: 0, despesas_a_vencer: 0, despesas_em_atraso: 0,
    lucro_real: 0, total_entradas: 0, total_saidas: 0,
    total_atendimentos: 0, ticket_medio: 0,
  };

  return {
    snapshot: data?.snapshot || defaultSnapshot,
    chartData: data?.chartData || [],
    distribution: data?.distribution || { recebido: 0, a_receber: 0, em_atraso: 0 },
    expensesByCategory: data?.expensesByCategory || [],
    risk: data?.risk || { risco_percentual: 0, nivel_risco: 'baixo', clientes_inadimplentes: 0 },
    projection: data?.projection || { saldo_projetado: 0, recebiveis_futuros: 0, despesas_futuras: 0 },
    criticalDueDates: data?.criticalDueDates || [],
    isLoading,
    error: error as Error | null,
    monthPeriod,
    monthLabel,
    startDate,
    endDate,
  };
}
