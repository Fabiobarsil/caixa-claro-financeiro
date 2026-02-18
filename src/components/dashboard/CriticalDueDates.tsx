import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CriticalDueDate } from '@/hooks/useFinancialSnapshot';

interface CriticalDueDatesProps {
  items: CriticalDueDate[];
}

export default function CriticalDueDates({ items }: CriticalDueDatesProps) {
  const navigate = useNavigate();

  // Only show overdue items
  const overdueItems = items.filter(i => i.isOverdue);

  // Hide widget if no overdue items
  if (overdueItems.length === 0) return null;

  const getDueDateLabel = (daysUntilDue: number, isOverdue: boolean) => {
    if (isOverdue) {
      const days = Math.abs(daysUntilDue);
      return { text: `${days}d atraso`, variant: 'danger' as const };
    }
    if (daysUntilDue === 0) {
      return { text: 'Hoje', variant: 'warning' as const };
    }
    if (daysUntilDue === 1) {
      return { text: 'Amanhã', variant: 'warning' as const };
    }
    return { text: `${daysUntilDue}d`, variant: 'default' as const };
  };

  const variantStyles = {
    danger: 'bg-expense/10 text-expense border-expense/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    default: 'bg-secondary text-muted-foreground border-border',
  };

  return (
    <SectionCard 
      title="Vencimentos Críticos" 
      icon={<Clock size={18} className="text-warning" />}
      tooltip="Itens com vencimento passado que precisam de ação imediata."
      subtitle="Cobranças atrasadas que exigem atenção"
    >
      <div className="space-y-2">
        {overdueItems.map((item, index) => {
          const label = getDueDateLabel(item.daysUntilDue, item.isOverdue);
          const formattedDate = format(parseISO(item.dueDate), "dd/MM", { locale: ptBR });

          return (
            <button
              key={item.scheduleId || item.id}
              onClick={() => navigate('/cobrancas')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                'hover:bg-secondary/80 active:scale-[0.99]',
                'bg-expense/5'
              )}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-expense/20 text-expense">
                {index + 1}
              </div>

              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.clientName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formattedDate}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-expense">
                  {formatCurrency(item.value)}
                </p>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded border',
                  variantStyles[label.variant]
                )}>
                  {label.text}
                </span>
              </div>

              <ChevronRight size={16} className="text-muted-foreground/50" />
            </button>
          );
        })}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/cobrancas')}
      >
        Ver todas as cobranças →
      </Button>
    </SectionCard>
  );
}
