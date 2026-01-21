import { useState } from 'react';
import { TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ProjectionData {
  receivables: number;
  expenses: number;
  balance: number;
}

interface FinancialProjectionProps {
  projection30: ProjectionData;
  projection60: ProjectionData;
  projection90: ProjectionData;
}

type Period = '30' | '60' | '90';

export default function FinancialProjection({
  projection30,
  projection60,
  projection90,
}: FinancialProjectionProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30');

  const projections: Record<Period, ProjectionData> = {
    '30': projection30,
    '60': projection60,
    '90': projection90,
  };

  const currentProjection = projections[selectedPeriod];
  const isPositiveBalance = currentProjection.balance >= 0;

  return (
    <SectionCard 
      title="Projeção Financeira" 
      icon={<TrendingUp size={18} className="text-primary" />}
      tooltip="Estimativa automática baseada nos vencimentos cadastrados e despesas recorrentes."
      footer="Esta projeção ajuda você a se planejar com antecedência e evitar surpresas no caixa."
    >
      <div className="space-y-4">
        {/* Period Selector */}
        <div className="flex gap-2">
          {(['30', '60', '90'] as Period[]).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                selectedPeriod === period
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}
            >
              {period} dias
            </button>
          ))}
        </div>

        {/* Projection Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <ArrowDownRight size={16} className="text-success" />
              <span className="text-sm text-muted-foreground">A receber</span>
            </div>
            <span className="text-base font-semibold text-success">
              {formatCurrency(currentProjection.receivables)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <ArrowUpRight size={16} className="text-expense" />
              <span className="text-sm text-muted-foreground">Despesas previstas</span>
            </div>
            <span className="text-base font-semibold text-expense">
              {formatCurrency(currentProjection.expenses)}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 bg-secondary/50 rounded-lg px-3 -mx-1">
            <div className="flex items-center gap-2">
              <Calendar size={16} className={isPositiveBalance ? 'text-success' : 'text-expense'} />
              <span className="text-sm font-medium text-foreground">Saldo projetado</span>
            </div>
            <span className={cn(
              'text-lg font-bold',
              isPositiveBalance ? 'text-success' : 'text-expense'
            )}>
              {formatCurrency(currentProjection.balance)}
            </span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
