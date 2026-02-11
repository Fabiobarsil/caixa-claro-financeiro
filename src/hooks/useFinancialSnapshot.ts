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

// Janelas temporais disponíveis: 15, 30, 90 dias (default: 30)
// Preparado para futuro: 'ytd' | 'year' (não ativado)
export type TimeWindow = 15 | 30 | 90;

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
 * Inclui valores realizados (pagos) e pendentes (a receber).
 */
export interface ChartDataPoint {
  date: string;
  recebido: number;       // Acumulado de entradas pagas
  a_receber: number;      // Acumulado de valores pendentes (por data de vencimento)
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
  const { user, accountId } = useAuth();

  // Calcular intervalo de datas (SEMPRE em UTC para consistência com o banco)
  const { startDate, endDate, today, todayStr } = useMemo(() => {
    const now = new Date();
    // Usar toISOString para garantir UTC puro (format() do date-fns usa timezone local!)
    const todayUtc = now.toISOString().slice(0, 10); // '2026-02-10' em UTC
    const startUtc = subDays(now, timeWindow).toISOString().slice(0, 10);
    // today usado para cálculo de daysUntilDue - meia-noite UTC
    const todayMidnight = new Date(todayUtc + 'T00:00:00Z');
    
    return {
      startDate: startUtc,
      endDate: todayUtc,
      today: todayMidnight,
      todayStr: todayUtc,
    };
  }, [timeWindow]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['financial-snapshot', timeWindow, startDate, endDate, accountId],
    queryFn: async () => {
      try {
      // ============================================
      // 1. BUSCAR TOTAIS VIA RPC (fonte única de verdade)
      // ============================================
      
      console.log('[FinancialSnapshot] Query params:', { startDate, endDate, todayStr, timeWindow, accountId });

      // RPC backend-side: cálculo correto sem paginação
      const { data: rpcTotals, error: rpcError } = await supabase
        .rpc('get_dashboard_totals', { start_date: startDate, end_date: endDate });

      console.log('[FinancialSnapshot] rpcTotals:', { data: rpcTotals, error: rpcError });
      if (rpcError) throw rpcError;

      const rpcRecebido = Number((rpcTotals as any)?.recebido ?? 0);
      const rpcAReceber = Number((rpcTotals as any)?.a_receber ?? 0);

      // ============================================
      // 1b. BUSCAR DADOS BRUTOS para gráficos e métricas auxiliares
      // ============================================

      // Parcelas/schedules pagos no período (por data_pagamento) - para gráficos
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
          amount
        `)
        .eq('status', 'pago')
        .gte('paid_at', startDate)
        .lte('paid_at', endDate + 'T23:59:59.999Z');

      console.log('[FinancialSnapshot] paidSchedules:', { count: paidSchedules?.length, error: paidSchedulesError });
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
          transactions!inner (
            client_id,
            clients (
              id,
              name
            )
          )
        `)
        .eq('status', 'pendente')
        .gte('due_date', startDate);

      console.log('[FinancialSnapshot] pendingSchedules:', { count: pendingSchedules?.length, error: pendingSchedulesError });
      if (pendingSchedulesError) throw pendingSchedulesError;

      // Transactions sem schedules (para compatibilidade)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          client_id,
          amount,
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

      console.log('[FinancialSnapshot] transactions:', { count: transactionsData?.length, error: transactionsError });
      if (transactionsError) throw transactionsError;

      // Verificar quais transactions têm schedules
      const transactionIds = (transactionsData || []).map(e => e.id);
      const { data: schedulesForTransactions } = await supabase
        .from('entry_schedules')
        .select('entry_id')
        .in('entry_id', transactionIds.length > 0 ? transactionIds : ['']);

      const transactionIdsWithSchedules = new Set(
        (schedulesForTransactions || []).map(s => s.entry_id)
      );

      // Transactions sem schedules
      const transactionsWithoutSchedules = (transactionsData || []).filter(
        e => !transactionIdsWithSchedules.has(e.id)
      );

      console.log('[FinancialSnapshot] transactionsWithoutSchedules:', { 
        total: transactionsWithoutSchedules.length,
        paid: transactionsWithoutSchedules.filter(e => e.status === 'pago').length,
      });

      // Despesas: buscar TODAS as despesas da conta (sem filtro de data)
      // O usuário quer ver o total real de despesas cadastradas
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*');

      console.log('[FinancialSnapshot] expenses raw:', { 
        count: expensesData?.length, 
        total: (expensesData || []).reduce((s, e) => s + Number((e as any).value), 0),
        dates: (expensesData || []).map((e: any) => e.date),
        error: expensesError 
      });
      if (expensesError) throw expensesError;

      const expenses = (expensesData || []) as ExpenseRow[];

      // ============================================
      // 2. CALCULAR VALORES LOCALMENTE (entry_schedules + transactions)
      // ============================================
      // A RPC get_dashboard_totals não inclui entry_schedules, então
      // calculamos localmente a partir dos dados já buscados com filtros corretos.
      
      // RECEBIDO: schedules pagos no período + transactions pagas sem schedules
      let recebido = 0;
      (paidSchedules || []).forEach(s => {
        recebido += Number(s.amount);
      });
      transactionsWithoutSchedules
        .filter(e => e.status === 'pago')
        .forEach(e => {
          const paymentDate = e.payment_date || e.date;
          if (paymentDate >= startDate && paymentDate <= endDate) {
            recebido += Number(e.amount);
          }
        });

      // A_RECEBER: schedules pendentes com vencimento >= hoje + transactions pendentes
      let aReceber = 0;
      (pendingSchedules || [])
        .filter(s => s.due_date >= todayStr)
        .forEach(s => {
          aReceber += Number(s.amount);
        });
      transactionsWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date && e.due_date >= todayStr)
        .forEach(e => {
          aReceber += Number(e.amount);
        });

      // totalAtendimentos: contagem de schedules pagos + transactions pagas sem schedules
      let totalAtendimentos = (paidSchedules || []).length;
      transactionsWithoutSchedules
        .filter(e => e.status === 'pago')
        .forEach(e => {
          const paymentDate = e.payment_date || e.date;
          if (paymentDate >= startDate && paymentDate <= endDate) {
            totalAtendimentos++;
          }
        });

      // EM_ATRASO (pendentes com vencimento < hoje)
      let emAtraso = 0;
      (pendingSchedules || [])
        .filter(s => s.due_date < todayStr)
        .forEach(s => {
          emAtraso += Number(s.amount);
        });

      transactionsWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date && e.due_date < todayStr)
        .forEach(e => {
          emAtraso += Number(e.amount);
        });

      // DESPESAS_PAGAS
      const despesasPagas = expenses.reduce((sum, e) => sum + Number(e.value), 0);

      // DESPESAS_A_VENCER e DESPESAS_EM_ATRASO
      const despesasAVencer = 0;
      const despesasEmAtraso = 0;

      // ============================================
      // 3. CALCULAR DERIVADOS
      // ============================================
      
      const lucroReal = recebido - despesasPagas;
      const totalEntradas = recebido + aReceber + emAtraso;
      const totalSaidas = despesasPagas + despesasAVencer + despesasEmAtraso;
      const ticketMedio = totalAtendimentos > 0 ? recebido / totalAtendimentos : 0;

      console.log('[FinancialSnapshot] Local calc values:', { recebido, aReceber, emAtraso, despesasPagas, lucroReal, totalAtendimentos });

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
      
      // Gráfico de evolução: valores realizados (pagos) + a receber (por vencimento)
      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate),
      });

      const dailyData = new Map<string, { recebido: number; a_receber: number; despesas: number }>();
      
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        dailyData.set(dateStr, { recebido: 0, a_receber: 0, despesas: 0 });
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

      // Agregar schedules pendentes por data de vencimento
      // Se a due_date estiver fora do período, agregar no último dia do período
      const lastDayStr = endDate;
      (pendingSchedules || []).forEach(s => {
        const dueDate = s.due_date;
        // Se estiver dentro do período, usar a data de vencimento
        // Se estiver fora (futuro), agregar no último dia do gráfico
        const targetDate = (dueDate >= startDate && dueDate <= endDate) ? dueDate : lastDayStr;
        const point = dailyData.get(targetDate);
        if (point) {
          point.a_receber += Number(s.amount);
        }
      });

      // Agregar transactions sem schedules pagos
      transactionsWithoutSchedules
        .filter(e => e.status === 'pago')
        .forEach(e => {
          const paymentDate = e.payment_date || e.date;
          if (paymentDate >= startDate && paymentDate <= endDate) {
            const point = dailyData.get(paymentDate);
            if (point) {
              point.recebido += Number(e.amount);
            }
          }
        });

      // Agregar transactions sem schedules pendentes por data de vencimento
      transactionsWithoutSchedules
        .filter(e => e.status === 'pendente' && e.due_date)
        .forEach(e => {
          const dueDate = e.due_date!;
          const targetDate = (dueDate >= startDate && dueDate <= endDate) ? dueDate : lastDayStr;
          const point = dailyData.get(targetDate);
          if (point) {
            point.a_receber += Number(e.amount);
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
      let accAReceber = 0;
      let accDespesas = 0;

      Array.from(dailyData.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, values]) => {
          accRecebido += values.recebido;
          accAReceber += values.a_receber;
          accDespesas += values.despesas;
          chartData.push({
            date,
            recebido: accRecebido,
            a_receber: accAReceber,
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
          const clientId = (s.transactions as any)?.client_id;
          if (clientId) clientesInadimplentes.add(clientId);
        });

      transactionsWithoutSchedules
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

      // De transactions sem schedules
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

      // Ordenar: vencidos primeiro, depois por proximidade
      const criticalDueDates = allPendingItems
        .sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return a.daysUntilDue - b.daysUntilDue;
        })
        .slice(0, 5);

      console.log('[FinancialSnapshot] Final snapshot:', { recebido: snapshot.recebido, a_receber: snapshot.a_receber, despesas_pagas: snapshot.despesas_pagas, lucro_real: snapshot.lucro_real });

      return {
        snapshot,
        chartData,
        distribution,
        risk,
        projection,
        criticalDueDates,
      };
      } catch (err) {
        console.error('[FinancialSnapshot] ERRO na queryFn:', err);
        throw err;
      }
    },
    enabled: !!user && !!accountId,
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
