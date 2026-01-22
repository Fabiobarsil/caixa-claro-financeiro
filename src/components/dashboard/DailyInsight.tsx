import { Lightbulb, AlertCircle, TrendingDown, Wallet, Tag, Minus, CheckCircle } from 'lucide-react';
import SectionCard from './SectionCard';
import { cn } from '@/lib/utils';
import type { CashInsight, CashAlert } from '@/hooks/useCashIntelligence';

interface DailyInsightProps {
  activeMessage: { type: 'alert' | 'insight'; message: string } | null;
  insight: CashInsight | null;
  alert: CashAlert | null;
  totalEntries: number;
}

export default function DailyInsight({
  activeMessage,
  insight,
  alert,
  totalEntries,
}: DailyInsightProps) {
  // Educational mode for very new users
  const isEducationalMode = totalEntries < 3;

  // Get icon based on type
  const getIcon = () => {
    if (alert) {
      switch (alert.type) {
        case 'negative_balance':
          return <Wallet size={20} className="text-expense" />;
        case 'progressive_decline':
          return <TrendingDown size={20} className="text-expense" />;
        case 'spending_concentration':
          return <Tag size={20} className="text-warning" />;
        default:
          return <AlertCircle size={20} className="text-expense" />;
      }
    }
    if (insight) {
      switch (insight.type) {
        case 'excessive_spending':
          return <TrendingDown size={20} className="text-warning" />;
        case 'inactivity':
          return <Minus size={20} className="text-muted-foreground" />;
        case 'category_repetition':
          return <Tag size={20} className="text-primary" />;
        case 'stability':
          return <CheckCircle size={20} className="text-success" />;
        default:
          return <Lightbulb size={20} className="text-warning" />;
      }
    }
    return <Lightbulb size={20} className="text-primary" />;
  };

  // Get title based on type
  const getTitle = () => {
    if (alert) {
      switch (alert.type) {
        case 'negative_balance':
          return 'Alerta: Saldo negativo';
        case 'progressive_decline':
          return 'Alerta: Tendência de queda';
        case 'spending_concentration':
          return 'Alerta: Concentração de gastos';
        default:
          return 'Alerta';
      }
    }
    if (insight) {
      switch (insight.type) {
        case 'excessive_spending':
          return 'Observação do dia';
        case 'inactivity':
          return 'Sem movimentações';
        case 'category_repetition':
          return 'Padrão identificado';
        case 'stability':
          return 'Caixa estável';
        default:
          return 'Insight do dia';
      }
    }
    return 'Dica';
  };

  // Get styling based on type
  const getStyles = () => {
    if (alert) {
      if (alert.type === 'negative_balance' || alert.type === 'progressive_decline') {
        return {
          bgColor: 'bg-expense/10',
          borderColor: 'border-expense/20',
          titleColor: 'text-expense',
          iconBg: 'bg-expense/20',
        };
      }
      return {
        bgColor: 'bg-warning/10',
        borderColor: 'border-warning/20',
        titleColor: 'text-warning',
        iconBg: 'bg-warning/20',
      };
    }
    if (insight) {
      if (insight.type === 'stability') {
        return {
          bgColor: 'bg-success/10',
          borderColor: 'border-success/20',
          titleColor: 'text-success',
          iconBg: 'bg-success/20',
        };
      }
      if (insight.type === 'excessive_spending') {
        return {
          bgColor: 'bg-warning/10',
          borderColor: 'border-warning/20',
          titleColor: 'text-warning',
          iconBg: 'bg-warning/20',
        };
      }
      return {
        bgColor: 'bg-secondary',
        borderColor: 'border-border',
        titleColor: 'text-foreground',
        iconBg: 'bg-muted',
      };
    }
    return {
      bgColor: 'bg-primary/5',
      borderColor: 'border-primary/20',
      titleColor: 'text-primary',
      iconBg: 'bg-primary/20',
    };
  };

  // Educational content for new users
  const educationalMessage = {
    title: 'Dica para começar',
    message: 'Registre suas despesas e receitas regularmente. Quanto mais dados, mais precisos serão os insights sobre seu caixa.',
  };

  // Silence rule: no message if nothing relevant and not educational
  if (!activeMessage && !isEducationalMode) {
    return null;
  }

  const styles = getStyles();
  const displayMessage = isEducationalMode && !activeMessage
    ? educationalMessage.message
    : activeMessage?.message || '';
  const displayTitle = isEducationalMode && !activeMessage
    ? educationalMessage.title
    : getTitle();

  return (
    <SectionCard
      title="Insight do Dia"
      icon={<Lightbulb size={18} className="text-warning" />}
      tooltip="Análise diária baseada no seu comportamento financeiro. Máximo de 1 mensagem por dia."
    >
      <div className={cn(
        'rounded-xl p-4 border',
        styles.bgColor,
        styles.borderColor
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            styles.iconBg
          )}>
            {getIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={cn('text-sm font-semibold mb-1', styles.titleColor)}>
              {displayTitle}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {displayMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <p className="text-[10px] text-muted-foreground/60 text-center mt-3">
        {alert 
          ? 'Alertas têm prioridade sobre insights.' 
          : 'Silêncio também faz parte da análise.'}
      </p>
    </SectionCard>
  );
}
