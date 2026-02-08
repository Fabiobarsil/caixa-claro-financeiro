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
import TimeWindowSelector from '@/components/dashboard/TimeWindowSelector';
import { useFinancialSnapshot, TimeWindow } from '@/hooks/useFinancialSnapshot';
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
const STORAGE_KEY = 'dashboard_period_days';
const DEFAULT_WINDOW: TimeWindow = 30;
const VALID_WINDOWS: TimeWindow[] = [15, 30, 90];

// Função para recuperar período do localStorage
function getStoredTimeWindow(): TimeWindow {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (VALID_WINDOWS.includes(parsed as TimeWindow)) {
        return parsed as TimeWindow;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return DEFAULT_WINDOW;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(getStoredTimeWindow);
  
  // Persistir período no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(timeWindow));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [timeWindow]);
  
  // ============================================
  // FONTE ÚNICA DA VERDADE: useFinancialSnapshot
  // ============================================
  const { 
    snapshot, 
    chartData, 
    distribution,
    risk, 
    projection, 
    criticalDueDates,
    isLoading: snapshotLoading 
  } = useFinancialSnapshot(timeWindow);
  
  // Dados auxiliares (não financeiros)
  const { recentEntries, pendingEntries, isLoading: dashboardLoading } = useDashboard();
  const { entries } = useEntries();
  const { stats } = useUserStats();
  const { smartState } = useSmartState();

  // Chart context for interactive filtering (usa snapshot canônico)
  const {
    distributionContext,
    setDistributionContext,
    evolutionContext,
    setEvolutionContext,
    activeContextLabel,
    resetContext,
    hasActiveContext,
    filteredSnapshot,
  } = useChartContext({ 
    snapshot, 
    chartData 
  });

  // Check if user has any entries (for onboarding)
  const hasEntries = entries.length > 0;

  // Get due dates for calendar highlighting
  const dueDates = useMemo(() => {
    return pendingEntries
      .filter(e => e.due_date)
      .map(e => e.due_date as string);
  }, [pendingEntries]);

  const isFullyLoading = dashboardLoading || snapshotLoading;

  // Check if Status Rápido has all zero values
  const statusAllZero = snapshot.a_receber === 0 && snapshot.em_atraso === 0 && snapshot.recebido === 0;

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

        {/* Header: Suporte + Período + Timestamp */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Tenha clareza sobre seu dinheiro hoje e previsibilidade para os próximos dias.
            </p>
            <div className="flex items-center gap-3">
              <TimeWindowSelector value={timeWindow} onChange={setTimeWindow} />
              <DataTimestamp />
            </div>
          </div>
        </div>

        {isFullyLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto -mx-4 px-4 pb-6">
            {/* Subscription Banner - shows trial status or upgrade prompt */}
            <SubscriptionBanner />

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

            {/* Section 1: KPI Cards - TODOS derivados do snapshot */}
            <section className="mb-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Recebido"
                  value={hasActiveContext ? filteredSnapshot.recebido : snapshot.recebido}
                  icon={ArrowDownCircle}
                  variant="success"
                  tooltip={`Total de entradas pagas nos últimos ${timeWindow} dias.`}
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : `${timeWindow}d`}
                />
                <KPICard
                  title="A Receber"
                  value={hasActiveContext ? filteredSnapshot.a_receber : snapshot.a_receber}
                  icon={Wallet}
                  variant="info"
                  onClick={!hasActiveContext ? () => navigate('/lancamentos?status=pendente_geral') : undefined}
                  tooltip="Entradas pendentes com vencimento futuro no período."
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : `${timeWindow}d`}
                />
                <KPICard
                  title="Despesas"
                  value={hasActiveContext ? filteredSnapshot.despesas_pagas : snapshot.despesas_pagas}
                  icon={TrendingDown}
                  variant="expense"
                  tooltip={`Total de despesas pagas nos últimos ${timeWindow} dias.`}
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : `${timeWindow}d`}
                />
                <KPICard
                  title="Lucro Real"
                  value={hasActiveContext ? filteredSnapshot.lucro_real : snapshot.lucro_real}
                  icon={TrendingUp}
                  variant="neutral"
                  tooltip="Recebido menos Despesas Pagas (sem valores futuros)."
                  subtitle={hasActiveContext ? `Filtrado: ${activeContextLabel}` : `${timeWindow}d`}
                />
              </div>
            </section>

            {/* Section 2: Status Rápido - derivado do snapshot */}
            <section className="mb-6">
              <SectionCard 
                title="Status Rápido" 
                subtitle="Situação atual dos seus recebíveis"
              >
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
                    tooltip={`Total recebido nos últimos ${timeWindow} dias.`}
                  />
                </div>
                {statusAllZero && (
                  <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t border-border">
                    Assim que você cadastrar lançamentos, este resumo mostrará a saúde do seu caixa.
                  </p>
                )}
              </SectionCard>
            </section>

            {/* Section 3: Projeção e Risco - derivados do snapshot */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FinancialProjection
                  projection={projection}
                  timeWindow={timeWindow}
                  hasData={hasEntries}
                />
                <FinancialRisk risk={risk} />
              </div>
            </section>

            {/* Section 4: Vencimentos Críticos - derivados do snapshot */}
            <section className="mb-6">
              <CriticalDueDates items={criticalDueDates} />
            </section>

            {/* Section 5: Próximos Prazos */}
            <section className="mb-6">
              <UpcomingDeadlines entries={[...pendingEntries, ...recentEntries]} />
            </section>

            {/* Section 6: Charts - Distribution & Evolution (BI Guiado) */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DistributionChart 
                  distribution={distribution}
                  activeContext={distributionContext}
                  onContextChange={setDistributionContext}
                  timeWindow={timeWindow}
                  onTimeWindowChange={setTimeWindow}
                />
                <FinancialEvolutionChart 
                  data={chartData}
                  activeContext={evolutionContext}
                  onContextChange={setEvolutionContext}
                  timeWindow={timeWindow}
                  onTimeWindowChange={setTimeWindow}
                />
              </div>
            </section>

            {/* Section 7: Summary & Calendar - derivados do snapshot */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title={`Resumo | ${timeWindow}d`}>
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
