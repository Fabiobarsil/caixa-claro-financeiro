import { Lightbulb, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
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
  concentrationWarning?: boolean;
  upcomingConcentration?: boolean;
}

export default function AutomaticInsight({
  insightData,
  overduePercentage,
  delinquentClientsCount,
  totalEntries = 0,
  concentrationWarning = false,
  upcomingConcentration = false,
}: AutomaticInsightProps) {
  const { overdueImpact, potentialRecovery, trend } = insightData;
  
  // Educational mode for new users
  const isEducationalMode = totalEntries < 5;
  // Analytical mode for established users
  const isAnalyticalMode = totalEntries >= 5;

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
  const TrendIcon = isAnalyticalMode ? BarChart3 : config.icon;

  // Generate dynamic insight message with consultant-like language
  const generateInsightMessage = () => {
    // Educational mode for new users (less than 5 entries)
    if (isEducationalMode) {
      return {
        title: 'Dica para começar',
        message: 'Registre seus serviços recorrentes para ter previsibilidade no caixa. Quanto mais dados, melhores serão os insights.',
        isEducational: true,
        isAnalytical: false,
      };
    }

    // Analytical mode - consultant-like insights
    
    // Check for concentration of receivables
    if (concentrationWarning) {
      return {
        title: 'Concentração de recebimentos',
        message: 'Seus recebimentos estão concentrados em poucos vencimentos. Considere parcelar para reduzir risco e melhorar a previsibilidade.',
        isEducational: false,
        isAnalytical: true,
      };
    }

    // Check for upcoming concentration
    if (upcomingConcentration) {
      return {
        title: 'Atenção aos próximos dias',
        message: 'Há concentração de vencimentos nos próximos dias. Acompanhe de perto para garantir o recebimento.',
        isEducational: false,
        isAnalytical: true,
      };
    }

    // All good - balanced distribution
    if (overdueImpact === 0 && delinquentClientsCount === 0) {
      return {
        title: 'Distribuição saudável',
        message: 'Sua distribuição financeira está equilibrada. Você não possui valores em atraso e seus vencimentos estão bem distribuídos.',
        isEducational: false,
        isAnalytical: true,
      };
    }

    // Negative trend with overdue
    if (trend === 'negative') {
      return {
        title: 'Ação recomendada',
        message: `Você tem ${formatCurrency(overdueImpact)} em atraso (${overduePercentage.toFixed(1)}% do total pendente). ${delinquentClientsCount > 0 ? `São ${delinquentClientsCount} cliente${delinquentClientsCount > 1 ? 's' : ''} que precisam de atenção.` : ''} Considere entrar em contato para regularizar.`,
        isEducational: false,
        isAnalytical: true,
      };
    }

    // Neutral - monitoring recommended
    if (trend === 'neutral') {
      return {
        title: 'Monitoramento ativo',
        message: `Há ${formatCurrency(overdueImpact)} pendente de regularização. Se todos os pagamentos ocorrerem conforme esperado, sua recuperação será de ${formatCurrency(potentialRecovery)}.`,
        isEducational: false,
        isAnalytical: true,
      };
    }

    // Positive trend
    return {
      title: 'Cenário favorável',
      message: `Seus indicadores estão saudáveis. Com apenas ${overduePercentage.toFixed(1)}% em atraso, a projeção de recuperação é favorável.`,
      isEducational: false,
      isAnalytical: true,
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
            insight.isAnalytical ? 'bg-primary/10' :
            trend === 'positive' ? 'bg-success/20' : 
            trend === 'negative' ? 'bg-expense/20' : 'bg-muted'
          )}>
            <TrendIcon size={20} className={
              insight.isEducational ? 'text-primary' : 
              insight.isAnalytical ? 'text-primary' : 
              config.color
            } />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={cn(
              'text-sm font-semibold mb-1', 
              insight.isEducational ? 'text-primary' : 
              insight.isAnalytical ? 'text-foreground' :
              config.color
            )}>
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

      {/* Risk assessment footnote */}
      {insight.isAnalytical && (
        <p className="text-[10px] text-muted-foreground/60 text-center mt-3">
          Avaliação baseada no comportamento financeiro atual.
        </p>
      )}
    </SectionCard>
  );
}
