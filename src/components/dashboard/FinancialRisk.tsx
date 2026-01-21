import { AlertTriangle, Users, TrendingDown } from 'lucide-react';
import SectionCard from './SectionCard';
import { cn } from '@/lib/utils';

interface FinancialRiskProps {
  overduePercentage: number;
  delinquentClientsCount: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export default function FinancialRisk({
  overduePercentage,
  delinquentClientsCount,
  riskLevel,
}: FinancialRiskProps) {
  const riskConfig = {
    low: {
      label: 'Baixo',
      emoji: '🟢',
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      statusMessage: 'Situação financeira saudável no momento.',
    },
    medium: {
      label: 'Moderado',
      emoji: '🟡',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
      statusMessage: 'Atenção a possíveis atrasos futuros.',
    },
    high: {
      label: 'Alto',
      emoji: '🔴',
      color: 'text-expense',
      bgColor: 'bg-expense/10',
      borderColor: 'border-expense/30',
      statusMessage: 'Existem sinais de risco que merecem ação imediata.',
    },
  };

  const config = riskConfig[riskLevel];

  return (
    <SectionCard 
      title="Risco Financeiro" 
      icon={<AlertTriangle size={18} className="text-warning" />}
      tooltip="Análise automática baseada em atrasos, inadimplência e histórico recente."
    >
      <div className="space-y-4">
        {/* Risk Level Badge with emoji scale */}
        <div className={cn(
          'flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2',
          config.bgColor,
          config.borderColor
        )}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.emoji}</span>
            <span className={cn('text-lg font-bold', config.color)}>
              Risco {config.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center px-3">
            {config.statusMessage}
          </p>
        </div>

        {/* Visual Risk Scale */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className={cn(
            'w-8 h-2 rounded-full transition-all',
            riskLevel === 'low' ? 'bg-success' : 'bg-success/30'
          )} />
          <div className={cn(
            'w-8 h-2 rounded-full transition-all',
            riskLevel === 'medium' ? 'bg-warning' : 'bg-warning/30'
          )} />
          <div className={cn(
            'w-8 h-2 rounded-full transition-all',
            riskLevel === 'high' ? 'bg-expense' : 'bg-expense/30'
          )} />
        </div>

        {/* Risk Indicators */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Em atraso</span>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              overduePercentage > 20 ? 'text-expense' : 
              overduePercentage > 10 ? 'text-warning' : 'text-foreground'
            )}>
              {overduePercentage.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">do total pendente</p>
          </div>

          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Inadimplentes</span>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              delinquentClientsCount > 3 ? 'text-expense' : 
              delinquentClientsCount > 1 ? 'text-warning' : 'text-foreground'
            )}>
              {delinquentClientsCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {delinquentClientsCount === 1 ? 'cliente' : 'clientes'}
            </p>
          </div>
        </div>

        {/* Assessment footnote */}
        <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
          Avaliação baseada no comportamento financeiro atual.
        </p>
      </div>
    </SectionCard>
  );
}
