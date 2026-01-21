import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import MetricCard from '@/components/MetricCard';
import SmallMetricCard from '@/components/SmallMetricCard';
import { useDashboard, DashboardEntry } from '@/hooks/useDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowDownCircle, 
  Clock, 
  TrendingDown, 
  TrendingUp,
  Receipt,
  Target,
  LogOut,
  Loader2,
  Package,
  Scissors
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';

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
  const { user, logout } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const months = useMemo(() => getMonthOptions(), []);
  
  const { metrics, recentEntries, pendingEntries, isLoading } = useDashboard(selectedMonth);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Olá, {user?.name}</p>
            <h1 className="text-xl font-bold text-foreground">Resumo do mês</h1>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            aria-label="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Month Filter */}
        <div className="mb-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48 bg-card capitalize">
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

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto -mx-4 px-4">
            {/* Main Metrics - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MetricCard
                title="Recebido"
                value={metrics.received}
                icon={ArrowDownCircle}
                variant="success"
              />
              <MetricCard
                title="A Receber"
                value={metrics.pending}
                icon={Clock}
                variant="warning"
              />
              <MetricCard
                title="Despesas"
                value={metrics.expenses}
                icon={TrendingDown}
                variant="expense"
              />
              <MetricCard
                title="Lucro Estimado"
                value={metrics.profit}
                icon={TrendingUp}
                variant="profit"
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <SmallMetricCard
                title="Ticket Médio"
                value={formatCurrency(metrics.averageTicket)}
                icon={Target}
              />
              <SmallMetricCard
                title="Atendimentos"
                value={metrics.totalEntries}
                icon={Receipt}
              />
            </div>

            {/* Recent Entries */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground">Últimos lançamentos</h2>
                <button 
                  onClick={() => navigate('/lancamentos')}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Ver todos
                </button>
              </div>
              {recentEntries.length === 0 ? (
                <div className="bg-card rounded-xl p-6 text-center text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum lançamento neste mês</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentEntries.map((entry) => (
                    <DashboardEntryItem key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </section>

            {/* Pending Entries */}
            {pendingEntries.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-foreground">
                    Pendências 
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-warning text-warning-foreground rounded-full">
                      {pendingEntries.length}
                    </span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {pendingEntries.map((entry) => (
                    <DashboardEntryItem key={entry.id} entry={entry} isPending />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DashboardEntryItem({ entry, isPending }: { entry: DashboardEntry; isPending?: boolean }) {
  return (
    <div className={cn(
      "bg-card rounded-xl p-3 flex items-center gap-3",
      isPending && "border-l-4 border-warning"
    )}>
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center',
        entry.item_type === 'servico' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
      )}>
        {entry.item_type === 'servico' ? <Scissors size={18} /> : <Package size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">
          {entry.client_name || 'Cliente'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {entry.item_name || 'Item'}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-foreground text-sm">
          R$ {entry.value.toFixed(2)}
        </p>
        <StatusBadge status={entry.status} size="sm" />
      </div>
    </div>
  );
}
