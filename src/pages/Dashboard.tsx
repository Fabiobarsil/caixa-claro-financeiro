import { useState, useMemo } from 'react';
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
import { useDashboard } from '@/hooks/useDashboard';
import { useBIData, TimeWindow } from '@/hooks/useBIData';
import { useChartContext } from '@/hooks/useChartContext';
import { useProjections } from '@/hooks/useProjections';
import { useEntries } from '@/hooks/useEntries';
import { useUserStats } from '@/hooks/useUserStats';
import { useSmartState } from '@/hooks/useSmartState';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import TimeWindowSelector from '@/components/dashboard/TimeWindowSelector';
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [biTimeWindow, setBITimeWindow] = useState<TimeWindow>(90);
  
  // Single source of truth: BI data for cards AND charts
  const { metrics: biMetrics, chartData: biChartData, isLoading: biLoading } = useBIData(biTimeWindow);
  // Dashboard data for Status Rápido and other sections (still uses current month context)
  const { metrics: dashboardMetrics, recentEntries, pendingEntries, isLoading: dashboardLoading } = useDashboard();
  const { projections, isLoading: projectionsLoading } = useProjections();
  const { entries } = useEntries();
  const { stats } = useUserStats();
  const { smartState } = useSmartState();

  // Chart context for interactive filtering (unified BI data)
  const {
    distributionContext,
    setDistributionContext,
    evolutionContext,
    setEvolutionContext,
    activeContextLabel,
    resetContext,
    hasActiveContext,
    filteredMetrics,
  } = useChartContext({ 
    metrics: biMetrics, 
    chartData: biChartData 
  });

  // Check if user has any entries (for onboarding)
  const hasEntries = entries.length > 0;

  // Get due dates for calendar highlighting
  const dueDates = useMemo(() => {
    return pendingEntries
      .filter(e => e.due_date)
      .map(e => e.due_date as string);
  }, [pendingEntries]);

  const isFullyLoading = dashboardLoading || projectionsLoading || biLoading;

  // Check if Status Rápido has all zero values
  const statusAllZero = dashboardMetrics.upcomingValue === 0 && dashboardMetrics.overdueValue === 0 && biMetrics.received === 0;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Onboarding Welcome Modal - non-blocking, dismissable */}
        <OnboardingWelcome isAdmin={isAdmin} />

        {/* Milestone Toast - invisible, shows toasts when milestones are reached */}
        <MilestoneToast 
          totalEntries={stats.totalEntries}
          accountCreatedAt={stats.accountCreatedAt || undefined}
          hasFirstPayment={stats.hasFirstPayment}
        />

        {/* Time Window Selector + Data Timestamp */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Período:</span>
            <TimeWindowSelector value={biTimeWindow} onChange={setBITimeWindow} />
          </div>
          
          {/* Data Timestamp - Authority Element */}
          <DataTimestamp />
        </div>

        {/* Support Text */}
        <p className="text-sm text-muted-foreground mb-6">
          Tenha clareza sobre seu dinheiro hoje e previsibilidade para os próximos dias.
        </p>

        {isFullyLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto -mx-4 px-4 pb-6">
            {/* Smart State Banner - daily intelligence (only renders if smart_state exists) */}
            <SmartStateBanner smartState={smartState} />

            {/* Onboarding Checklist - shows progress for admins */}
            <OnboardingChecklist isAdmin={isAdmin} />

            {/* Onboarding Banner - shows only for new users without entries */}
            <OnboardingBanner hasEntries={hasEntries} />

            {/* Context Active Banner */}
            {hasActiveContext && (
              <div className="mb-4 flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    Filtro ativo: <strong>{activeContextLabel}</strong>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetContext}
                  className="h-7 px-2 text-xs hover:bg-primary/20"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
            )}

            {/* Section 1: KPI Cards */}
            <section className="mb-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Recebido"
                  value={hasActiveContext ? filteredMetrics.received : biMetrics.received}
                  icon={ArrowDownCircle}
                  variant="success"
                  tooltip={`Total de valores pagos nos últimos ${biTimeWindow} dias.`}
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : `Últimos ${biTimeWindow} dias`}
                />
                <KPICard
                  title="A Receber"
                  value={hasActiveContext ? filteredMetrics.pending : biMetrics.pending}
                  icon={Wallet}
                  variant="info"
                  onClick={!hasActiveContext ? () => navigate('/lancamentos?status=pendente_geral') : undefined}
                  tooltip={`Valores pendentes a partir dos últimos ${biTimeWindow} dias.`}
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : `Últimos ${biTimeWindow} dias`}
                />
                <KPICard
                  title="Despesas"
                  value={hasActiveContext ? filteredMetrics.expenses : biMetrics.expenses}
                  icon={TrendingDown}
                  variant="expense"
                  tooltip={`Total de despesas nos últimos ${biTimeWindow} dias.`}
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : `Últimos ${biTimeWindow} dias`}
                />
                <KPICard
                  title="Lucro Estimado"
                  value={hasActiveContext ? filteredMetrics.profit : biMetrics.profit}
                  icon={TrendingUp}
                  variant="neutral"
                  tooltip="Recebido menos despesas no período selecionado."
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : `Últimos ${biTimeWindow} dias`}
                />
              </div>
            </section>

            {/* Section 2: Status Rápido */}
            <section className="mb-6">
              <SectionCard 
                title="Status Rápido" 
                subtitle="Situação atual dos seus recebíveis"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <StatusIndicator
                    label="A vencer"
                    value={formatCurrency(dashboardMetrics.upcomingValue)}
                    icon={Clock}
                    variant="warning"
                    onClick={() => navigate('/lancamentos?status=a_vencer')}
                    tooltip="Valores com pagamento previsto dentro do prazo."
                  />
                  <StatusIndicator
                    label="Em atraso"
                    value={formatCurrency(dashboardMetrics.overdueValue)}
                    icon={AlertTriangle}
                    variant="danger"
                    onClick={() => navigate('/lancamentos?status=vencido')}
                    tooltip="Valores que já passaram do vencimento e ainda não foram pagos."
                  />
                  <StatusIndicator
                    label="Recebido"
                    value={formatCurrency(biMetrics.received)}
                    icon={CheckCircle}
                    variant="success"
                    tooltip={`Total recebido nos últimos ${biTimeWindow} dias.`}
                  />
                </div>
                {statusAllZero && (
                  <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t border-border">
                    Assim que você cadastrar lançamentos, este resumo mostrará a saúde do seu caixa.
                  </p>
                )}
              </SectionCard>
            </section>

            {/* Section 3: Projeção e Risco (BLOCO 3) */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FinancialProjection
                  projection30={projections.projection30}
                  projection60={projections.projection60}
                  projection90={projections.projection90}
                  hasData={hasEntries}
                />
                <FinancialRisk
                  overduePercentage={projections.overduePercentage}
                  delinquentClientsCount={projections.delinquentClientsCount}
                  riskLevel={projections.riskLevel}
                />
              </div>
            </section>

            {/* Section 4: Vencimentos Críticos */}
            <section className="mb-6">
              <CriticalDueDates items={projections.criticalDueDates} />
            </section>

            {/* Section 5: Próximos Prazos */}
            <section className="mb-6">
              <UpcomingDeadlines entries={[...pendingEntries, ...recentEntries]} />
            </section>

            {/* Section 6: Charts - Distribution & Evolution (BI Guiado) */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DistributionChart 
                  received={biMetrics.received}
                  expenses={biMetrics.expenses}
                  pending={biMetrics.pending}
                  activeContext={distributionContext}
                  onContextChange={setDistributionContext}
                  timeWindow={biTimeWindow}
                  onTimeWindowChange={setBITimeWindow}
                />
                <FinancialEvolutionChart 
                  data={biChartData}
                  activeContext={evolutionContext}
                  onContextChange={setEvolutionContext}
                  timeWindow={biTimeWindow}
                  onTimeWindowChange={setBITimeWindow}
                />
              </div>
            </section>

            {/* Section 7: Summary & Calendar */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title={`Resumo | últimos ${biTimeWindow} dias`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Total de atendimentos</span>
                      <span className="text-lg font-semibold text-foreground">{biMetrics.totalEntries}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Ticket médio</span>
                      <span className="text-lg font-semibold text-foreground">{formatCurrency(biMetrics.averageTicket)}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Próximos 30 dias</span>
                      <span className="text-lg font-semibold text-foreground">{formatCurrency(dashboardMetrics.globalNext30Days)}</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-muted-foreground">Total em atraso</span>
                      <span className="text-lg font-semibold text-expense">{formatCurrency(dashboardMetrics.globalOverdue)}</span>
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
