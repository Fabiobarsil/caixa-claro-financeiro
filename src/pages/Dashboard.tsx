import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import KPICard from '@/components/dashboard/KPICard';
import StatusIndicator from '@/components/dashboard/StatusIndicator';
import SectionCard from '@/components/dashboard/SectionCard';
import UpcomingDeadlines from '@/components/dashboard/UpcomingDeadlines';
import MiniCalendar from '@/components/dashboard/MiniCalendar';
import DistributionChart from '@/components/dashboard/DistributionChart';
import FinancialEvolutionChart from '@/components/dashboard/FinancialEvolutionChart';
import FinancialProjection from '@/components/dashboard/FinancialProjection';
import FinancialRisk from '@/components/dashboard/FinancialRisk';
import CriticalDueDates from '@/components/dashboard/CriticalDueDates';
import SmartStateBanner from '@/components/dashboard/SmartStateBanner';
import OnboardingBanner from '@/components/dashboard/OnboardingBanner';
import OnboardingWelcome from '@/components/dashboard/OnboardingWelcome';
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist';
import DataTimestamp from '@/components/dashboard/DataTimestamp';
import MilestoneToast from '@/components/dashboard/MilestoneToast';
import SubscriptionBanner from '@/components/subscription/SubscriptionBanner';
import MonthSelector from '@/components/dashboard/TimeWindowSelector';
import { useFinancialSnapshot, type MonthPeriod } from '@/hooks/useFinancialSnapshot';
import { useSemesterProjection } from '@/hooks/useSemesterProjection';
import { useChartContext } from '@/hooks/useChartContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useEntries } from '@/hooks/useEntries';
import { useUserStats } from '@/hooks/useUserStats';
import { useSmartState } from '@/hooks/useSmartState';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { 
  ArrowDownCircle, 
  Wallet,
  TrendingDown, 
  TrendingUp,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';

// Constantes para persistência
const STORAGE_KEY = 'dashboard_month_period';

function getStoredMonthPeriod(): MonthPeriod {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [monthPeriod, setMonthPeriod] = useState<MonthPeriod>(getStoredMonthPeriod);
  
  // Persistir período no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(monthPeriod));
    } catch {}
  }, [monthPeriod]);
  
  // ============================================
  // FONTE ÚNICA DA VERDADE: useFinancialSnapshot
  // ============================================
  const { 
    snapshot, 
    chartData, 
    distribution,
    expensesByCategory,
    risk, 
    projection, 
    criticalDueDates,
    isLoading: snapshotLoading,
    error: snapshotError,
    monthLabel,
  } = useFinancialSnapshot(monthPeriod);
  
  if (snapshotError) {
    console.error('[Dashboard] Snapshot error:', snapshotError);
  }
  
  // Dados auxiliares (não financeiros)
  const { recentEntries, pendingEntries, isLoading: dashboardLoading } = useDashboard();
  const { entries } = useEntries();
  const { stats } = useUserStats();
  const { smartState } = useSmartState();
  const { data: semesterData, isLoading: semesterLoading } = useSemesterProjection(monthPeriod);

  // Chart context for interactive filtering
  const {
    evolutionContext,
    setEvolutionContext,
    activeContextLabel,
    resetContext,
    hasActiveContext,
    filteredSnapshot,
  } = useChartContext({ snapshot, chartData });

  const hasEntries = entries.length > 0;

  const dueDates = useMemo(() => {
    return pendingEntries
      .filter(e => e.due_date)
      .map(e => e.due_date as string);
  }, [pendingEntries]);

  const isFullyLoading = dashboardLoading || snapshotLoading;
  const statusAllZero = snapshot.a_receber === 0 && snapshot.em_atraso === 0 && snapshot.recebido === 0;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <OnboardingWelcome isAdmin={isAdmin} />
        <MilestoneToast 
          totalEntries={stats.totalEntries}
          accountCreatedAt={stats.accountCreatedAt || undefined}
          hasFirstPayment={stats.hasFirstPayment}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <p className="text-sm text-muted-foreground">
            Tenha clareza sobre seu dinheiro hoje e previsibilidade para os próximos dias.
          </p>
          <DataTimestamp />
        </div>

        {isFullyLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto -mx-4 px-4 pb-6">
            <SubscriptionBanner />
            <SmartStateBanner smartState={smartState} />
            <OnboardingChecklist isAdmin={isAdmin} />
            <OnboardingBanner hasEntries={hasEntries} />

            {/* Month Selector */}
            <div className="mb-6 flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 shadow-sm">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Competência</span>
                <span className="text-xs text-muted-foreground">Selecione o mês para seu diagnóstico</span>
              </div>
              <MonthSelector value={monthPeriod} onChange={setMonthPeriod} />
            </div>

            {/* Context Active Banner */}
            {hasActiveContext && (
              <div className="mb-4 flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    Filtro ativo: <strong>{activeContextLabel}</strong>
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={resetContext} className="h-7 px-2 text-xs hover:bg-primary/20">
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
            )}

            {/* KPI Cards */}
            <section className="mb-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Recebido"
                  value={hasActiveContext ? filteredSnapshot.recebido : snapshot.recebido}
                  icon={ArrowDownCircle}
                  variant="success"
                  tooltip="Total de entradas pagas no mês."
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : monthLabel}
                />
                <KPICard
                  title="A Receber"
                  value={hasActiveContext ? filteredSnapshot.a_receber : snapshot.a_receber}
                  icon={Wallet}
                  variant="info"
                  onClick={!hasActiveContext ? () => navigate('/lancamentos?status=pendente_geral') : undefined}
                  tooltip="Entradas pendentes com vencimento futuro no mês."
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : monthLabel}
                />
                <KPICard
                  title="Despesas"
                  value={hasActiveContext ? filteredSnapshot.despesas_pagas : snapshot.despesas_pagas}
                  icon={TrendingDown}
                  variant="expense"
                  tooltip="Total de despesas do mês."
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : monthLabel}
                />
                <KPICard
                  title="Lucro Real"
                  value={hasActiveContext ? filteredSnapshot.lucro_real : snapshot.lucro_real}
                  icon={TrendingUp}
                  variant="neutral"
                  tooltip="Recebido menos Despesas Pagas do mês."
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : monthLabel}
                />
              </div>
            </section>

            {/* Status Rápido */}
            <section className="mb-6">
              <SectionCard title="Status Rápido" subtitle="Situação atual dos seus recebíveis">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <StatusIndicator
                    label="A vencer"
                    value={formatCurrency(snapshot.a_receber)}
                    icon={Clock}
                    variant="warning"
                    onClick={() => navigate('/lancamentos?status=a_vencer')}
                    tooltip="Valores com vencimento futuro (>= hoje)."
                  />
                  <StatusIndicator
                    label="Em atraso"
                    value={formatCurrency(snapshot.em_atraso)}
                    icon={AlertTriangle}
                    variant="danger"
                    onClick={() => navigate('/lancamentos?status=vencido')}
                    tooltip="Valores com vencimento passado (< hoje)."
                  />
                  <StatusIndicator
                    label="Recebido"
                    value={formatCurrency(snapshot.recebido)}
                    icon={CheckCircle}
                    variant="success"
                    tooltip="Total recebido no mês."
                  />
                </div>
                {statusAllZero && (
                  <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t border-border">
                    Assim que você cadastrar lançamentos, este resumo mostrará a saúde do seu caixa.
                  </p>
                )}
              </SectionCard>
            </section>

            {/* Projeção e Risco */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FinancialProjection
                  snapshot={snapshot}
                  monthLabel={monthLabel}
                  hasData={hasEntries}
                />
                <FinancialRisk risk={risk} />
              </div>
            </section>

            {/* Vencimentos Críticos */}
            <section className="mb-6">
              <CriticalDueDates items={criticalDueDates} />
            </section>

            {/* Próximos Prazos */}
            <section className="mb-6">
              <UpcomingDeadlines entries={[...pendingEntries, ...recentEntries]} />
            </section>

            {/* Charts */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DistributionChart 
                  expensesByCategory={expensesByCategory}
                  monthLabel={monthLabel}
                />
                <FinancialEvolutionChart 
                  data={chartData}
                  activeContext={evolutionContext}
                  onContextChange={setEvolutionContext}
                  monthLabel={monthLabel}
                  semesterData={semesterData || []}
                  semesterLoading={semesterLoading}
                />
              </div>
            </section>

            {/* Resumo & Calendar */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title={`Resumo | ${monthLabel}`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Total de atendimentos</span>
                      <span className="text-lg font-semibold text-foreground">{snapshot.total_atendimentos}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Ticket médio</span>
                      <span className="text-lg font-semibold text-foreground">{formatCurrency(snapshot.ticket_medio)}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Total entradas</span>
                      <span className="text-lg font-semibold text-foreground">{formatCurrency(snapshot.total_entradas)}</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-muted-foreground">Total saídas</span>
                      <span className="text-lg font-semibold text-expense">{formatCurrency(snapshot.total_saidas)}</span>
                    </div>
                  </div>
                </SectionCard>
                <MiniCalendar highlightDates={dueDates} />
              </div>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
