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
import AutomaticInsight from '@/components/dashboard/AutomaticInsight';
import { useDashboard } from '@/hooks/useDashboard';
import { useProjections } from '@/hooks/useProjections';
import { formatCurrency } from '@/lib/formatters';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  ArrowDownCircle, 
  Wallet,
  TrendingDown, 
  TrendingUp,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Generate last 6 months for selector
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const date = subMonths(now, i);
    options.push({
      value: format(date, 'yyyy-MM'),
      label: format(date, "MMMM yyyy", { locale: ptBR }),
    });
  }
  return options;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const months = useMemo(() => getMonthOptions(), []);
  
  const { metrics, recentEntries, pendingEntries, chartData, isLoading } = useDashboard(selectedMonth);
  const { projections, isLoading: projectionsLoading } = useProjections();

  // Get due dates for calendar highlighting
  const dueDates = useMemo(() => {
    return pendingEntries
      .filter(e => e.due_date)
      .map(e => e.due_date as string);
  }, [pendingEntries]);

  const isFullyLoading = isLoading || projectionsLoading;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Month Filter */}
        <div className="mb-6">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48 bg-card border-border capitalize shadow-sm">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value} className="capitalize">
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isFullyLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto -mx-4 px-4 pb-6">
            {/* Section 1: KPI Cards */}
            <section className="mb-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Recebido"
                  value={metrics.received}
                  icon={ArrowDownCircle}
                  variant="success"
                />
                <KPICard
                  title="A Receber (Geral)"
                  value={metrics.globalPending}
                  icon={Wallet}
                  variant="info"
                  onClick={() => navigate('/lancamentos?status=pendente_geral')}
                />
                <KPICard
                  title="Despesas"
                  value={metrics.expenses}
                  icon={TrendingDown}
                  variant="expense"
                />
                <KPICard
                  title="Lucro Estimado"
                  value={metrics.profit}
                  icon={TrendingUp}
                  variant="neutral"
                />
              </div>
            </section>

            {/* Section 2: Status Rápido */}
            <section className="mb-6">
              <SectionCard title="Status Rápido" subtitle="Situação dos seus recebíveis">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <StatusIndicator
                    label="A vencer"
                    value={formatCurrency(metrics.upcomingValue)}
                    icon={Clock}
                    variant="warning"
                    onClick={() => navigate('/lancamentos?status=a_vencer')}
                  />
                  <StatusIndicator
                    label="Em atraso"
                    value={formatCurrency(metrics.overdueValue)}
                    icon={AlertTriangle}
                    variant="danger"
                    onClick={() => navigate('/lancamentos?status=vencido')}
                  />
                  <StatusIndicator
                    label="Pagos no mês"
                    value={formatCurrency(metrics.received)}
                    icon={CheckCircle}
                    variant="success"
                  />
                </div>
              </SectionCard>
            </section>

            {/* Section 3: Projeção e Risco (BLOCO 3) */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FinancialProjection
                  projection30={projections.projection30}
                  projection60={projections.projection60}
                  projection90={projections.projection90}
                />
                <FinancialRisk
                  overduePercentage={projections.overduePercentage}
                  delinquentClientsCount={projections.delinquentClientsCount}
                  riskLevel={projections.riskLevel}
                />
              </div>
            </section>

            {/* Section 4: Vencimentos Críticos e Insight */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CriticalDueDates items={projections.criticalDueDates} />
                <AutomaticInsight
                  insightData={projections.insightData}
                  overduePercentage={projections.overduePercentage}
                  delinquentClientsCount={projections.delinquentClientsCount}
                />
              </div>
            </section>

            {/* Section 5: Próximos Prazos */}
            <section className="mb-6">
              <UpcomingDeadlines entries={[...pendingEntries, ...recentEntries]} />
            </section>

            {/* Section 6: Charts - Distribution & Evolution */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DistributionChart 
                  received={metrics.received}
                  expenses={metrics.expenses}
                  pending={metrics.pending}
                />
                <FinancialEvolutionChart data={chartData} />
              </div>
            </section>

            {/* Section 7: Summary & Calendar */}
            <section className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Resumo Mensal">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Total de atendimentos</span>
                      <span className="text-lg font-semibold text-foreground">{metrics.totalEntries}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Ticket médio</span>
                      <span className="text-lg font-semibold text-foreground">{formatCurrency(metrics.averageTicket)}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Próximos 30 dias</span>
                      <span className="text-lg font-semibold text-foreground">{formatCurrency(metrics.globalNext30Days)}</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-muted-foreground">Total em atraso</span>
                      <span className="text-lg font-semibold text-expense">{formatCurrency(metrics.globalOverdue)}</span>
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
