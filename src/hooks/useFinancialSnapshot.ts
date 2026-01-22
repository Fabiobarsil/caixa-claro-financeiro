import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, eachDayOfInterval, parseISO } from 'date-fns';

// ============================================
// MODELO FINANCEIRO CANÔNICO - FONTE ÚNICA DA VERDADE
// ============================================
// Nenhuma tela, componente ou gráfico pode calcular valores financeiros por conta própria.
// Todo valor financeiro exibido deve ser derivado EXCLUSIVAMENTE deste snapshot.
// ============================================

export type TimeWindow = 30 | 60 | 90;

/**
 * Objeto canônico de consolidação financeira.
 * Todo componente que exibe valores financeiros DEVE consumir este objeto.
 */
export interface FinancialSnapshot {
  // Entradas
  recebido: number;           // tipo=entrada, status=pago, filtrado por data_pagamento
  a_receber: number;          // tipo=entrada, status=pendente, data_vencimento >= hoje
  em_atraso: number;          // tipo=entrada, status=pendente, data_vencimento < hoje
  
  // Saídas
  despesas_pagas: number;     // tipo=saida, status=pago
  despesas_a_vencer: number;  // tipo=saida, status=pendente, data_vencimento >= hoje
  despesas_em_atraso: number; // tipo=saida, status=pendente, data_vencimento < hoje
  
  // Derivados
  lucro_real: number;         // RECEBIDO - DESPESAS_PAGAS (nunca valores futuros)
  total_entradas: number;     // recebido + a_receber + em_atraso
  total_saidas: number;       // despesas_pagas + despesas_a_vencer + despesas_em_atraso
  
  // Métricas auxiliares
  total_atendimentos: number; // Contagem de entradas pagas
  ticket_medio: number;       // recebido / total_atendimentos
}

/**
 * Ponto de dados para gráficos de evolução.
 * Apenas valores realizados (pagos).
 */
export interface ChartDataPoint {
  date: string;
  recebido: number;       // Acumulado de entradas pagas
  despesas: number;       // Acumulado de saídas pagas
}

/**
 * Dados para gráfico de distribuição.
 */
export interface DistributionData {
  recebido: number;
  a_receber: number;
  em_atraso: number;
}

/**
 * Métricas de risco financeiro derivadas do snapshot.
 */
export interface RiskMetrics {
  risco_percentual: number;    // em_atraso / (a_receber + em_atraso)
  nivel_risco: 'baixo' | 'medio' | 'alto';
  clientes_inadimplentes: number;
}

/**
 * Projeção financeira derivada do snapshot.
 */
export interface ProjectionMetrics {
  saldo_projetado: number;   // (recebido + a_receber) - (despesas_pagas + despesas_a_vencer)
  recebiveis_futuros: number;
  despesas_futuras: number;
}

/**
 * Vencimento crítico para lista de prioridades.
 */
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
  risk: RiskMetrics;
  projection: ProjectionMetrics;
  criticalDueDates: CriticalDueDate[];
  isLoading: boolean;
  error: Error | null;
  timeWindow: TimeWindow;
  startDate: string;
  endDate: string;
}

// Interface interna para schedules
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

// Interface interna para expenses
interface ExpenseRow {
  id: string;
  user_id: string;
  type: 'fixa' | 'variavel';
  category: string;
  value: number;
  date: string;
  notes: string | null;
}

/**
 * Hook canônico para dados financeiros.
 * Esta é a ÚNICA fonte de dados financeiros para todo o sistema.
 * 
 * @param timeWindow Período em dias (30, 60 ou 90)
 * @returns Snapshot financeiro completo e dados derivados
 */
export function useFinancialSnapshot(timeWindow: TimeWindow): UseFinancialSnapshotReturn {
  const { user } = useAuth();

  // Calcular intervalo de datas
  const { startDate, endDate, today, todayStr } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = subDays(now, timeWindow);
    
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd'),
      today: now,
      todayStr: format(now, 'yyyy-MM-dd'),
    };
  }, [timeWindow]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['financial-snapshot', timeWindow, startDate, endDate],
    queryFn: async () => {
      // ============================================
      // 1. BUSCAR DADOS BRUTOS
      // ============================================
      
      // Parcelas/schedules pagos no período (por data_pagamento)
      const { data: paidSchedules, error: paidSchedulesError } = await supabase
        .from('entry_schedules')
        .select(`
          id,
          entry_id,
          schedule_type,
          installment_number,
          installments_total,
          due_date,
          paid_at,
          status,
          amount,
          entries!inner (
            client_id,
            clients (
              id,
              name
            )
          )
        `)
        .eq('status', 'pago')
        .gte('paid_at', startDate)
        .lte('paid_at', endDate + 'T23:59:59');

      if (paidSchedulesError) throw paidSchedulesError;

      // Parcelas pendentes com vencimento a partir do início do período
      const { data: pendingSchedules, error: pendingSchedulesError } = await supabase
        .from('entry_schedules')
        .select(`
          id,
          entry_id,
          schedule_type,
          installment_number,
          installments_total,
          due_date,
          paid_at,
          status,
          amount,
          entries!inner (
            client_id,
            clients (
              id,
              name
            )
          )
        `)
        .eq('status', 'pendente')
        .gte('due_date', startDate);

      if (pendingSchedulesError) throw pendingSchedulesError;

      // Entries sem schedules (para compatibilidade)
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select(`
          id,
          client_id,
          value,
          status,
          date,
          due_date,
          payment_date,
          clients (
            id,
            name
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate);

      if (entriesError) throw entriesError;

      // Verificar quais entries têm schedules
      const entryIds = (entriesData || []).map(e => e.id);
      const { data: schedulesForEntries } = await supabase
        .from('entry_schedules')
        .select('entry_id')
        .in('entry_id', entryIds.length > 0 ? entryIds : ['']);

      const entryIdsWithSchedules = new Set(
        (schedulesForEntries || []).map(s => s.entry_id)
      );

      // Entries sem schedules
      const entriesWithoutSchedules = (entriesData || []).filter(
        e => !entryIdsWithSchedules.has(e.id)
      );

      // Despesas no período
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (expensesError) throw expensesError;

      const expenses = (expensesData || []) as ExpenseRow[];

      // ============================================
      // 2. CLASSIFICAR CONFORME REGRAS CANÔNICAS
      // ============================================
      
      // RECEBIDO (entradas pagas, por data_pagamento)
      let recebido = 0;
      let totalAtendimentos = 0;

      // De schedules pagos
      (paidSchedules || []).forEach(s => {
        recebido += Number(s.amount);
        totalAtendimentos++;
      });

      // De entries sem schedules
      entriesWithoutSchedules
        .filter(e => e.status === 'pago')
        .forEach(e => {
          // Verificar se payment_date está no período
          const paymentDate = e.payment_date || e.date;
          if (paymentDate >= startDate && paymentDate <= endDate) {
            recebido += Number(e.value);
            totalAtendimentos++;
          }
        });

      // A_RECEBER (pendentes com vencimento >= hoje)
      let aReceber = 0;
      (pendingSchedules || [])
        .filter(s => s.due_date >= todayStr)
        .forEach(s => {
          aReceber += Number(s.amount);
        });

      entriesWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date && e.due_date >= todayStr)
        .forEach(e => {
          aReceber += Number(e.value);
        });

      // EM_ATRASO (pendentes com vencimento < hoje)
      let emAtraso = 0;
      (pendingSchedules || [])
        .filter(s => s.due_date < todayStr)
        .forEach(s => {
          emAtraso += Number(s.amount);
        });

      entriesWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date && e.due_date < todayStr)
        .forEach(e => {
          emAtraso += Number(e.value);
        });

      // DESPESAS_PAGAS
      // Para despesas, consideramos que se estão no período, são "pagas"
      // (não temos status de despesa separado no schema atual)
      const despesasPagas = expenses.reduce((sum, e) => sum + Number(e.value), 0);

      // DESPESAS_A_VENCER e DESPESAS_EM_ATRASO
      // Como não temos despesas futuras no modelo atual, esses valores são 0
      const despesasAVencer = 0;
      const despesasEmAtraso = 0;

      // ============================================
      // 3. CALCULAR DERIVADOS
      // ============================================
      
      // LUCRO_REAL = RECEBIDO - DESPESAS_PAGAS (nunca valores futuros)
      const lucroReal = recebido - despesasPagas;

      const totalEntradas = recebido + aReceber + emAtraso;
      const totalSaidas = despesasPagas + despesasAVencer + despesasEmAtraso;
      const ticketMedio = totalAtendimentos > 0 ? recebido / totalAtendimentos : 0;

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
      // 4. DADOS PARA GRÁFICOS
      // ============================================
      
      // Gráfico de evolução: apenas valores realizados (pagos)
      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate),
      });

      const dailyData = new Map<string, { recebido: number; despesas: number }>();
      
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        dailyData.set(dateStr, { recebido: 0, despesas: 0 });
      });

      // Agregar schedules pagos por data de pagamento
      (paidSchedules || []).forEach(s => {
        if (s.paid_at) {
          const paidDate = format(new Date(s.paid_at), 'yyyy-MM-dd');
          const point = dailyData.get(paidDate);
          if (point) {
            point.recebido += Number(s.amount);
          }
        }
      });

      // Agregar entries sem schedules pagos
      entriesWithoutSchedules
        .filter(e => e.status === 'pago')
        .forEach(e => {
          const paymentDate = e.payment_date || e.date;
          if (paymentDate >= startDate && paymentDate <= endDate) {
            const point = dailyData.get(paymentDate);
            if (point) {
              point.recebido += Number(e.value);
            }
          }
        });

      // Agregar despesas por data
      expenses.forEach(e => {
        const point = dailyData.get(e.date);
        if (point) {
          point.despesas += Number(e.value);
        }
      });

      // Converter para array acumulado
      const chartData: ChartDataPoint[] = [];
      let accRecebido = 0;
      let accDespesas = 0;

      Array.from(dailyData.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, values]) => {
          accRecebido += values.recebido;
          accDespesas += values.despesas;
          chartData.push({
            date,
            recebido: accRecebido,
            despesas: accDespesas,
          });
        });

      // Distribuição
      const distribution: DistributionData = {
        recebido: snapshot.recebido,
        a_receber: snapshot.a_receber,
        em_atraso: snapshot.em_atraso,
      };

      // ============================================
      // 5. MÉTRICAS DE RISCO
      // ============================================
      
      // risco_percentual = em_atraso / (a_receber + em_atraso)
      const denominadorRisco = aReceber + emAtraso;
      const riscoPercentual = denominadorRisco > 0 ? (emAtraso / denominadorRisco) * 100 : 0;

      // Contar clientes inadimplentes (únicos com parcelas em atraso)
      const clientesInadimplentes = new Set<string>();
      (pendingSchedules || [])
        .filter(s => s.due_date < todayStr)
        .forEach(s => {
          const clientId = (s.entries as any)?.client_id;
          if (clientId) clientesInadimplentes.add(clientId);
        });

      entriesWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date && e.due_date < todayStr)
        .forEach(e => {
          if (e.client_id) clientesInadimplentes.add(e.client_id);
        });

      // Determinar nível de risco
      let nivelRisco: 'baixo' | 'medio' | 'alto' = 'baixo';
      if (riscoPercentual > 30 || clientesInadimplentes.size > 5) {
        nivelRisco = 'alto';
      } else if (riscoPercentual > 15 || clientesInadimplentes.size > 2) {
        nivelRisco = 'medio';
      }

      const risk: RiskMetrics = {
        risco_percentual: riscoPercentual,
        nivel_risco: nivelRisco,
        clientes_inadimplentes: clientesInadimplentes.size,
      };

      // ============================================
      // 6. PROJEÇÃO FINANCEIRA
      // ============================================
      
      // saldo_projetado = (recebido + a_receber) - (despesas_pagas + despesas_a_vencer)
      const saldoProjetado = (recebido + aReceber) - (despesasPagas + despesasAVencer);

      const projection: ProjectionMetrics = {
        saldo_projetado: saldoProjetado,
        recebiveis_futuros: aReceber,
        despesas_futuras: despesasAVencer,
      };

      // ============================================
      // 7. VENCIMENTOS CRÍTICOS
      // ============================================
      
      const allPendingItems: CriticalDueDate[] = [];

      // De schedules pendentes
      (pendingSchedules || []).forEach(s => {
        const dueDate = new Date(s.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - today.getTime();
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const clientData = (s.entries as any)?.clients;

        allPendingItems.push({
          id: (s.entries as any)?.id || s.entry_id,
          scheduleId: s.id,
          clientName: clientData?.name || 'Cliente não identificado',
          value: Number(s.amount),
          dueDate: s.due_date,
          daysUntilDue,
          isOverdue: daysUntilDue < 0,
        });
      });

      // De entries sem schedules
      entriesWithoutSchedules
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
            value: Number(e.value),
            dueDate: e.due_date!,
            daysUntilDue,
            isOverdue: daysUntilDue < 0,
          });
        });

      // Ordenar: vencidos primeiro, depois por proximidade
      const criticalDueDates = allPendingItems
        .sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return a.daysUntilDue - b.daysUntilDue;
        })
        .slice(0, 5);

      return {
        snapshot,
        chartData,
        distribution,
        risk,
        projection,
        criticalDueDates,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Valores padrão
  const defaultSnapshot: FinancialSnapshot = {
    recebido: 0,
    a_receber: 0,
    em_atraso: 0,
    despesas_pagas: 0,
    despesas_a_vencer: 0,
    despesas_em_atraso: 0,
    lucro_real: 0,
    total_entradas: 0,
    total_saidas: 0,
    total_atendimentos: 0,
    ticket_medio: 0,
  };

  return {
    snapshot: data?.snapshot || defaultSnapshot,
    chartData: data?.chartData || [],
    distribution: data?.distribution || { recebido: 0, a_receber: 0, em_atraso: 0 },
    risk: data?.risk || { risco_percentual: 0, nivel_risco: 'baixo', clientes_inadimplentes: 0 },
    projection: data?.projection || { saldo_projetado: 0, recebiveis_futuros: 0, despesas_futuras: 0 },
    criticalDueDates: data?.criticalDueDates || [],
    isLoading,
    error: error as Error | null,
    timeWindow,
    startDate,
    endDate,
  };
}
