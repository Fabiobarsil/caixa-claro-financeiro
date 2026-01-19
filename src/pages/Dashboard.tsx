import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import MetricCard from '@/components/MetricCard';
import SmallMetricCard from '@/components/SmallMetricCard';
import EntryListItem from '@/components/EntryListItem';
import PendingListItem from '@/components/PendingListItem';
import { useMockData } from '@/hooks/useMockData';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatMonthYear } from '@/lib/formatters';
import { 
  ArrowDownCircle, 
  Clock, 
  TrendingDown, 
  TrendingUp,
  Receipt,
  Target,
  ChevronDown,
  LogOut
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const months = [
  { value: '2024-01', label: 'Janeiro 2024' },
  { value: '2024-02', label: 'Fevereiro 2024' },
  { value: '2024-03', label: 'Março 2024' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { metrics, recentEntries, pendingEntries } = useMockData();
  const [selectedMonth, setSelectedMonth] = useState('2024-01');

  return (
    <AppLayout>
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Olá, {user?.name}</p>
            <h1 className="text-xl font-bold text-foreground">Resumo do mês</h1>
          </div>
          <button
            onClick={logout}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            aria-label="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Month Filter */}
        <div className="mb-6">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48 bg-card">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
            <button className="text-sm text-primary font-medium hover:underline">
              Ver todos
            </button>
          </div>
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <EntryListItem key={entry.id} entry={entry} />
            ))}
          </div>
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
                <PendingListItem key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
