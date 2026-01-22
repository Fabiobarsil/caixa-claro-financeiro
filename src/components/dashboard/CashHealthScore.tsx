import { Activity, TrendingUp, Eye, AlertTriangle } from 'lucide-react';
import SectionCard from './SectionCard';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { CashHealthScore as CashHealthScoreType } from '@/hooks/useCashIntelligence';

interface CashHealthScoreProps {
  healthScore: CashHealthScoreType;
  learningPhase: 1 | 2 | 3;
  totalDaysActive: number;
}

export default function CashHealthScore({
  healthScore,
  learningPhase,
  totalDaysActive,
}: CashHealthScoreProps) {
  const { score, status, statusLabel } = healthScore;

  const statusConfig = {
    stable: {
      emoji: '🟢',
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      progressColor: 'bg-success',
      Icon: TrendingUp,
    },
    observation: {
      emoji: '🟡',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
      progressColor: 'bg-warning',
      Icon: Eye,
    },
    attention: {
      emoji: '🔴',
      color: 'text-expense',
      bgColor: 'bg-expense/10',
      borderColor: 'border-expense/30',
      progressColor: 'bg-expense',
      Icon: AlertTriangle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.Icon;

  // Phase labels
  const phaseLabels = {
    1: 'Início',
    2: 'Adaptação',
    3: 'Consolidação',
  };

  return (
    <SectionCard
      title="Saúde do Caixa"
      icon={<Activity size={18} className="text-primary" />}
      tooltip="Score calculado com base no comportamento financeiro recente: saldo, regularidade de registros e padrões de gastos."
    >
      <div className={cn(
        'rounded-xl p-4 border',
        config.bgColor,
        config.borderColor
      )}>
        {/* Score Display */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              status === 'stable' ? 'bg-success/20' :
              status === 'observation' ? 'bg-warning/20' : 'bg-expense/20'
            )}>
              <span className="text-2xl font-bold" aria-hidden="true">
                {config.emoji}
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className={cn('text-3xl font-bold', config.color)}>
                  {score}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <p className={cn('text-sm font-medium', config.color)}>
                {statusLabel}
              </p>
            </div>
          </div>
          <Icon size={24} className={config.color} />
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <Progress 
            value={score} 
            className="h-2 bg-muted"
            indicatorClassName={config.progressColor}
          />
        </div>

        {/* Phase Indicator */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Fase:</span>
            <span className="text-xs font-medium text-foreground">
              {phaseLabels[learningPhase]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Dias ativos:</span>
            <span className="text-xs font-medium text-foreground">
              {totalDaysActive}
            </span>
          </div>
        </div>
      </div>

      {/* Explanation footnote */}
      <p className="text-[10px] text-muted-foreground/60 text-center mt-3">
        Avaliação baseada em regularidade, equilíbrio e padrões de gastos.
      </p>
    </SectionCard>
  );
}
