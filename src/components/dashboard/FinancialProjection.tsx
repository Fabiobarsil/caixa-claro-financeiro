import { TrendingUp, ArrowDownRight, ArrowUpRight, DollarSign } from 'lucide-react';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { FinancialSnapshot } from '@/hooks/useFinancialSnapshot';

interface FinancialProjectionProps {
  snapshot: FinancialSnapshot;
  monthLabel: string;
  hasData?: boolean;
}

export default function FinancialProjection({
  snapshot,
  monthLabel,
  hasData = true,
}: FinancialProjectionProps) {
  // Previsão de Fechamento = (Recebido + A Receber) - (Despesas Pagas + Despesas A Pagar)
  const totalReceitas = snapshot.recebido + snapshot.a_receber;
  const totalDespesas = snapshot.despesas_pagas + snapshot.despesas_a_vencer;
  const previsaoFechamento = totalReceitas - totalDespesas;
  const isPositive = previsaoFechamento >= 0;

  const noDataAvailable = !hasData && totalReceitas === 0 && totalDespesas === 0;

  return (
    <SectionCard 
      title={`Previsão de Fechamento | ${monthLabel}`}
      icon={<TrendingUp size={18} className="text-primary" />}
      tooltip="Previsão = (Recebido + A Receber) − (Despesas Pagas + Despesas A Pagar). Mostra quanto sobrará se tudo for quitado."
      footer="Estimativa de saldo ao final do mês selecionado."
    >
      <div className="space-y-4">
        {noDataAvailable && (
          <div className="text-center py-4 bg-secondary/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              A previsão aparecerá conforme você registrar lançamentos e despesas.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <ArrowDownRight size={16} className="text-success" />
              <span className="text-sm text-muted-foreground">Receitas previstas</span>
            </div>
            <span className="text-base font-semibold text-success">
              {formatCurrency(totalReceitas)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <ArrowUpRight size={16} className="text-expense" />
              <span className="text-sm text-muted-foreground">Despesas previstas</span>
            </div>
            <span className="text-base font-semibold text-expense">
              {formatCurrency(totalDespesas)}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 bg-secondary/50 rounded-lg px-3 -mx-1">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className={isPositive ? 'text-success' : 'text-expense'} />
              <span className="text-sm font-medium text-foreground">Saldo previsto</span>
            </div>
            <span className={cn(
              'text-lg font-bold',
              isPositive ? 'text-success' : 'text-expense'
            )}>
              {formatCurrency(previsaoFechamento)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70 text-center">
          Inclui valores já pagos e pendentes do mês.
        </p>
      </div>
    </SectionCard>
  );
}
