import { AlertTriangle, Users, TrendingDown } from 'lucide-react';
import SectionCard from './SectionCard';
import { cn } from '@/lib/utils';
import type { RiskMetrics } from '@/hooks/useFinancialSnapshot';

interface FinancialRiskProps {
  risk: RiskMetrics;
}

export default function FinancialRisk({ risk }: FinancialRiskProps) {
  const riskConfig = {
    baixo: {
      label: 'Baixo',
      emoji: '🟢',
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      statusMessage: 'Situação financeira saudável no momento.',
    },
    medio: {
      label: 'Moderado',
      emoji: '🟡',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
      statusMessage: 'Atenção a possíveis atrasos futuros.',
    },
    alto: {
      label: 'Alto',
      emoji: '🔴',
      color: 'text-expense',
      bgColor: 'bg-expense/10',
      borderColor: 'border-expense/30',
      statusMessage: 'Existem sinais de risco que merecem ação imediata.',
    },
  };

  const config = riskConfig[risk.nivel_risco];

  return (
    <SectionCard 
      title="Risco Financeiro" 
      icon={<AlertTriangle size={18} className="text-warning" />}
      tooltip="Risco = Em Atraso ÷ (A Receber + Em Atraso). Sem heurística subjetiva."
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
            risk.nivel_risco === 'baixo' ? 'bg-success' : 'bg-success/30'
          )} />
          <div className={cn(
            'w-8 h-2 rounded-full transition-all',
            risk.nivel_risco === 'medio' ? 'bg-warning' : 'bg-warning/30'
          )} />
          <div className={cn(
            'w-8 h-2 rounded-full transition-all',
            risk.nivel_risco === 'alto' ? 'bg-expense' : 'bg-expense/30'
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
              risk.risco_percentual > 30 ? 'text-expense' : 
              risk.risco_percentual > 15 ? 'text-warning' : 'text-foreground'
            )}>
              {risk.risco_percentual.toFixed(1)}%
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
              risk.clientes_inadimplentes > 5 ? 'text-expense' : 
              risk.clientes_inadimplentes > 2 ? 'text-warning' : 'text-foreground'
            )}>
              {risk.clientes_inadimplentes}
            </p>
            <p className="text-xs text-muted-foreground">
              {risk.clientes_inadimplentes === 1 ? 'cliente' : 'clientes'}
            </p>
          </div>
        </div>

        {/* Assessment footnote */}
        <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
          Fórmula: Em Atraso ÷ (A Receber + Em Atraso) × 100
        </p>
      </div>
    </SectionCard>
  );
}
