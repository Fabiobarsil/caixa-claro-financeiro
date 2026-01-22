import { TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ProjectionMetrics, TimeWindow } from '@/hooks/useFinancialSnapshot';

interface FinancialProjectionProps {
  projection: ProjectionMetrics;
  timeWindow: TimeWindow;
  hasData?: boolean;
}

export default function FinancialProjection({
  projection,
  timeWindow,
  hasData = true,
}: FinancialProjectionProps) {
  const isPositiveBalance = projection.saldo_projetado >= 0;

  // Check if there's no data to show projection
  const noDataAvailable = !hasData && projection.recebiveis_futuros === 0 && projection.despesas_futuras === 0;

  return (
    <SectionCard 
      title={`Projeção Financeira | ${timeWindow} dias`}
      icon={<TrendingUp size={18} className="text-primary" />}
      tooltip="Projeção = (Recebido + A Receber) - (Despesas Pagas + Despesas a Vencer)"
      footer="Esta projeção ajuda você a se planejar com antecedência e evitar surpresas no caixa."
    >
      <div className="space-y-4">
        {/* No data message */}
        {noDataAvailable && (
          <div className="text-center py-4 bg-secondary/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              A projeção aparecerá automaticamente conforme você registrar vencimentos.
            </p>
          </div>
        )}

        {/* Projection Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <ArrowDownRight size={16} className="text-success" />
              <span className="text-sm text-muted-foreground">A receber (futuro)</span>
            </div>
            <span className="text-base font-semibold text-success">
              {formatCurrency(projection.recebiveis_futuros)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <ArrowUpRight size={16} className="text-expense" />
              <span className="text-sm text-muted-foreground">Despesas previstas</span>
            </div>
            <span className="text-base font-semibold text-expense">
              {formatCurrency(projection.despesas_futuras)}
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
              {formatCurrency(projection.saldo_projetado)}
            </span>
          </div>
        </div>

        {/* Clarification note */}
        <p className="text-xs text-muted-foreground/70 text-center">
          Projeção ≠ Lucro. Inclui valores futuros.
        </p>
      </div>
    </SectionCard>
  );
}
