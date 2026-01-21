import { Lightbulb, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface InsightData {
  overdueImpact: number;
  potentialRecovery: number;
  trend: 'positive' | 'negative' | 'neutral';
}

interface AutomaticInsightProps {
  insightData: InsightData;
  overduePercentage: number;
  delinquentClientsCount: number;
  totalEntries?: number;
}

export default function AutomaticInsight({
  insightData,
  overduePercentage,
  delinquentClientsCount,
  totalEntries = 0,
}: AutomaticInsightProps) {
  const { overdueImpact, potentialRecovery, trend } = insightData;
  
  // Educational mode for new users
  const isEducationalMode = totalEntries < 5;

  const trendConfig = {
    positive: {
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
    },
    negative: {
      icon: TrendingDown,
      color: 'text-expense',
      bgColor: 'bg-expense/10',
      borderColor: 'border-expense/20',
    },
    neutral: {
      icon: Minus,
      color: 'text-muted-foreground',
      bgColor: 'bg-secondary',
      borderColor: 'border-border',
    },
  };

  const config = trendConfig[trend];
  const TrendIcon = config.icon;

  // Generate dynamic insight message
  const generateInsightMessage = () => {
    // Educational mode for new users (less than 5 entries)
    if (isEducationalMode) {
      return {
        title: 'Dica para começar',
        message: 'Registre seus serviços recorrentes para ter previsibilidade no caixa. Quanto mais dados, melhores serão os insights.',
        isEducational: true,
      };
    }

    if (overdueImpact === 0 && delinquentClientsCount === 0) {
      return {
        title: 'Parabéns! Situação estável.',
        message: 'Você não possui valores em atraso. Continue acompanhando os vencimentos para manter suas finanças saudáveis.',
        isEducational: false,
      };
    }

    if (trend === 'negative') {
      return {
        title: 'Atenção necessária',
        message: `Você tem ${formatCurrency(overdueImpact)} em atraso (${overduePercentage.toFixed(1)}% do total pendente). ${delinquentClientsCount > 0 ? `São ${delinquentClientsCount} cliente${delinquentClientsCount > 1 ? 's' : ''} inadimplente${delinquentClientsCount > 1 ? 's' : ''}.` : ''} Considere entrar em contato para regularizar.`,
        isEducational: false,
      };
    }

    if (trend === 'neutral') {
      return {
        title: 'Monitoramento recomendado',
        message: `Há ${formatCurrency(overdueImpact)} pendente de regularização. Se todos os pagamentos ocorrerem conforme esperado, sua recuperação será de ${formatCurrency(potentialRecovery)}.`,
        isEducational: false,
      };
    }

    return {
      title: 'Cenário positivo',
      message: `Seus indicadores estão saudáveis. Com apenas ${overduePercentage.toFixed(1)}% em atraso, a projeção de recuperação é favorável.`,
      isEducational: false,
    };
  };

  const insight = generateInsightMessage();

  return (
    <SectionCard 
      title="Insight Automático" 
      icon={<Lightbulb size={18} className="text-warning" />}
      tooltip="Análise gerada automaticamente pelo sistema."
    >
      <div className={cn(
        'rounded-xl p-4 border',
        config.bgColor,
        config.borderColor
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            insight.isEducational ? 'bg-primary/20' :
            trend === 'positive' ? 'bg-success/20' : 
            trend === 'negative' ? 'bg-expense/20' : 'bg-muted'
          )}>
            <TrendIcon size={20} className={insight.isEducational ? 'text-primary' : config.color} />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={cn('text-sm font-semibold mb-1', insight.isEducational ? 'text-primary' : config.color)}>
              {insight.title}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insight.message}
            </p>
          </div>
        </div>

        {potentialRecovery > 0 && trend !== 'positive' && !insight.isEducational && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Potencial de recuperação:</span>
              <span className="font-semibold text-success">
                {formatCurrency(potentialRecovery)}
              </span>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
