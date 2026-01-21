import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, Calendar, ChevronRight } from 'lucide-react';
import SectionCard from './SectionCard';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CriticalDueDate {
  id: string;
  scheduleId?: string;
  clientName: string;
  value: number;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

interface CriticalDueDatesProps {
  items: CriticalDueDate[];
}

export default function CriticalDueDates({ items }: CriticalDueDatesProps) {
  const navigate = useNavigate();

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

  if (items.length === 0) {
    return (
      <SectionCard 
        title="Vencimentos Críticos" 
        icon={<Clock size={18} className="text-warning" />}
        tooltip="Próximos valores importantes que exigem atenção."
        subtitle="Antecipar ações aqui ajuda a evitar inadimplência"
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar size={32} className="text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum vencimento próximo
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Suas finanças estão em dia!
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard 
      title="Vencimentos Críticos" 
      icon={<Clock size={18} className="text-warning" />}
      tooltip="Próximos valores importantes que exigem atenção."
      subtitle="Antecipar ações aqui ajuda a evitar inadimplência"
    >
      <div className="space-y-2">
        {items.map((item, index) => {
          const label = getDueDateLabel(item.daysUntilDue, item.isOverdue);
          const formattedDate = format(parseISO(item.dueDate), "dd/MM", { locale: ptBR });

          return (
            <button
              key={item.scheduleId || item.id}
              onClick={() => navigate(`/lancamentos?highlight=${item.id}`)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                'hover:bg-secondary/80 active:scale-[0.99]',
                item.isOverdue ? 'bg-expense/5' : 'bg-secondary/50'
              )}
            >
              {/* Priority indicator */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                item.isOverdue 
                  ? 'bg-expense/20 text-expense' 
                  : 'bg-primary/20 text-primary'
              )}>
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.clientName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formattedDate}
                </p>
              </div>

              {/* Value */}
              <div className="text-right">
                <p className={cn(
                  'text-sm font-semibold',
                  item.isOverdue ? 'text-expense' : 'text-foreground'
                )}>
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
    </SectionCard>
  );
}
