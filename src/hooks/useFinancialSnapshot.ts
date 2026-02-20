import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, eachDayOfInterval, parseISO, lastDayOfMonth } from 'date-fns';
import type { MonthPeriod } from '@/components/dashboard/TimeWindowSelector';

// ============================================
// MODELO FINANCEIRO CANÔNICO - v_financial_competencia
// ============================================

export type { MonthPeriod };

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

// Row shape returned by v_financial_competencia
interface ViewRow {
  account_id: string | null;
  competencia: string | null;
  valor: number | null;
  origem_id: string | null;
  master_id?: string | null;
  status: string | null;
  tipo: string | null;
  categoria: string | null;
  origem: string | null;
}

/**
 * Hook canônico — lê exclusivamente de v_financial_competencia.
 * Lucro = receitas − despesas (regime de competência, sem filtro por status).
 */
export function useFinancialSnapshot(monthPeriod: MonthPeriod): UseFinancialSnapshotReturn {
  const { user, accountId } = useAuth();

  const { startDate, endDate, todayStr, today, monthLabel } = useMemo(() => {
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
    queryKey: ['financial-snapshot-v2', monthPeriod.year, monthPeriod.month, accountId],
    queryFn: async () => {
      console.log('[FinancialSnapshot] Buscando v_financial_competencia:', { startDate, endDate, accountId });

      // Busca principal na view
      const { data: rows, error: rowsError } = await supabase
        .from('v_financial_competencia')
        .select('account_id, competencia, valor, origem_id, status, tipo, categoria, origem, master_id')
        .eq('account_id', accountId!)
        .gte('competencia', startDate)
        .lte('competencia', endDate);

      if (rowsError) throw rowsError;

      const allRows = (rows || []) as (ViewRow & { master_id?: string | null })[];

      // Buscar nomes dos clientes para as receitas pendentes (vencimentos críticos)
      const pendingReceitas = allRows.filter(r => r.tipo === 'receita' && r.status === 'pendente');
      const transactionIds = [...new Set(
        pendingReceitas.map(r => r.master_id || r.origem_id).filter(Boolean) as string[]
      )];

      let clientNameMap = new Map<string, string>();

      if (transactionIds.length > 0) {
        // Buscar via entry_schedules -> transactions -> clients
        const { data: scheduleData } = await supabase
          .from('entry_schedules')
          .select('id, entry_id, transactions!entry_schedules_transaction_id_fkey(id, client_id, clients!transactions_client_id_fkey(name))')
          .in('id', transactionIds);

        (scheduleData || []).forEach((s: any) => {
          const clientName = s.transactions?.clients?.name;
          if (clientName) clientNameMap.set(s.id, clientName);
        });

        // Para transactions diretas (single)
        const missingIds = transactionIds.filter(id => !clientNameMap.has(id));
        if (missingIds.length > 0) {
          const { data: txData } = await supabase
            .from('transactions')
            .select('id, clients!transactions_client_id_fkey(name)')
            .in('id', missingIds);

          (txData || []).forEach((tx: any) => {
            const clientName = tx.clients?.name;
            if (clientName) clientNameMap.set(tx.id, clientName);
          });
        }
      }

      console.log('[FinancialSnapshot] Linhas retornadas:', allRows.length);

      // ============================================
      // AGREGAÇÕES FINANCEIRAS
      // ============================================

      const receitas = allRows.filter(r => r.tipo === 'receita');
      const despesas = allRows.filter(r => r.tipo === 'despesa');

      // RECEBIDO — receitas pagas
      const recebido = receitas
        .filter(r => r.status === 'pago')
        .reduce((s, r) => s + Number(r.valor ?? 0), 0);

      // A_RECEBER — receitas pendentes com competência >= hoje
      const aReceber = receitas
        .filter(r => r.status === 'pendente' && r.competencia && r.competencia >= todayStr)
        .reduce((s, r) => s + Number(r.valor ?? 0), 0);

      // EM_ATRASO — receitas pendentes com competência < hoje
      const emAtraso = receitas
        .filter(r => r.status === 'pendente' && r.competencia && r.competencia < todayStr)
        .reduce((s, r) => s + Number(r.valor ?? 0), 0);

      // ATENDIMENTOS — receitas pagas (contagem)
      const totalAtendimentos = receitas.filter(r => r.status === 'pago').length;

      // DESPESAS — split por status
      const despesasPagas = despesas
        .filter(r => r.status === 'pago')
        .reduce((s, r) => s + Number(r.valor ?? 0), 0);

      const despesasAVencer = despesas
        .filter(r => r.status === 'pendente' && r.competencia && r.competencia >= todayStr)
        .reduce((s, r) => s + Number(r.valor ?? 0), 0);

      const despesasEmAtraso = despesas
        .filter(r => r.status === 'pendente' && r.competencia && r.competencia < todayStr)
        .reduce((s, r) => s + Number(r.valor ?? 0), 0);

      // LUCRO REAL — regime de competência, sem filtro por status
      const totalReceitas = receitas.reduce((s, r) => s + Number(r.valor ?? 0), 0);
      const totalDespesas = despesas.reduce((s, r) => s + Number(r.valor ?? 0), 0);
      const lucroReal = totalReceitas - totalDespesas;

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
      // DADOS PARA GRÁFICOS — acumulado diário
      // ============================================
      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate),
      });

      const dailyData = new Map<string, { recebido: number; a_receber: number; despesas: number }>();
      days.forEach(day => {
        dailyData.set(format(day, 'yyyy-MM-dd'), { recebido: 0, a_receber: 0, despesas: 0 });
      });

      allRows.forEach(r => {
        const dateKey = r.competencia;
        if (!dateKey) return;
        const point = dailyData.get(dateKey);
        if (!point) return;

        if (r.tipo === 'receita') {
          if (r.status === 'pago') point.recebido += Number(r.valor ?? 0);
          else point.a_receber += Number(r.valor ?? 0);
        } else if (r.tipo === 'despesa') {
          point.despesas += Number(r.valor ?? 0);
        }
      });

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

      // ============================================
      // DISTRIBUIÇÃO
      // ============================================
      const distribution: DistributionData = {
        recebido: snapshot.recebido,
        a_receber: snapshot.a_receber,
        em_atraso: snapshot.em_atraso,
      };

      // ============================================
      // DESPESAS POR CATEGORIA
      // ============================================
      const categoryMap = new Map<string, number>();
      despesas.forEach(r => {
        const cat = r.categoria || 'Outros';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(r.valor ?? 0));
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

      // Contar origens únicas em atraso (proxy para clientes inadimplentes)
      const origemInadimplentes = new Set<string>(
        receitas
          .filter(r => r.status === 'pendente' && r.competencia && r.competencia < todayStr && r.origem_id)
          .map(r => r.origem_id!)
      );

      let nivelRisco: 'baixo' | 'medio' | 'alto' = 'baixo';
      if (riscoPercentual > 30 || origemInadimplentes.size > 5) nivelRisco = 'alto';
      else if (riscoPercentual > 15 || origemInadimplentes.size > 2) nivelRisco = 'medio';

      const risk: RiskMetrics = {
        risco_percentual: riscoPercentual,
        nivel_risco: nivelRisco,
        clientes_inadimplentes: origemInadimplentes.size,
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
      // VENCIMENTOS CRÍTICOS — derivados da view com nomes reais
      // ============================================
      const criticalDueDates: CriticalDueDate[] = receitas
        .filter(r => r.status === 'pendente' && r.competencia)
        .map((r: any) => {
          const dueDate = new Date(r.competencia! + 'T00:00:00Z');
          const diffTime = dueDate.getTime() - today.getTime();
          const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const lookupId = r.master_id || r.origem_id;
          const clientName = (lookupId && clientNameMap.get(lookupId)) || 'Cliente';
          return {
            id: r.origem_id || r.competencia!,
            scheduleId: r.master_id || undefined,
            clientName,
            value: Number(r.valor ?? 0),
            dueDate: r.competencia!,
            daysUntilDue,
            isOverdue: daysUntilDue < 0,
          };
        })
        .sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return a.daysUntilDue - b.daysUntilDue;
        })
        .slice(0, 5);

      return { snapshot, chartData, distribution, expensesByCategory, risk, projection, criticalDueDates };
    },
    enabled: !!user && !!accountId,
    staleTime: 0,           // sem cache — dados sempre frescos
    refetchInterval: 30000, // atualiza automaticamente a cada 30s
  });

  // ============================================
  // DEFAULTS
  // ============================================
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
