import { CalendarCheck, Smile, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SectionCard from './SectionCard';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { CriticalDueDate } from '@/hooks/useFinancialSnapshot';

interface UpcomingDeadlinesProps {
  items: CriticalDueDate[];
}

export default function UpcomingDeadlines({ items }: UpcomingDeadlinesProps) {
  const navigate = useNavigate();

  // Only show future items (daysUntilDue >= 0 means today or future, but exclude overdue)
  // Show items due within next 7 days (today inclusive, not overdue)
  const upcomingItems = items
    .filter(i => !i.isOverdue && i.daysUntilDue >= 0 && i.daysUntilDue <= 7)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, 5);

  // Hide widget if empty
  if (upcomingItems.length === 0) return null;

  return (
    <SectionCard title="Próximos Prazos" subtitle="Próximos 7 dias">
      <div className="space-y-2">
        {upcomingItems.map((item) => (
          <button
            key={item.scheduleId || item.id}
            onClick={() => navigate('/lancamentos?status=a_vencer')}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
              'hover:bg-secondary/80 active:scale-[0.99]',
              item.daysUntilDue === 0 ? 'bg-warning/10' : 'bg-secondary'
            )}
          >
            <CalendarCheck 
              size={18} 
              className={item.daysUntilDue === 0 ? 'text-warning' : 'text-muted-foreground'} 
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.clientName}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(item.dueDate), "dd 'de' MMM", { locale: ptBR })}
                {item.daysUntilDue === 0 && ' — Hoje'}
                {item.daysUntilDue === 1 && ' — Amanhã'}
                {item.daysUntilDue > 1 && ` — em ${item.daysUntilDue} dias`}
              </p>
            </div>
            <span className="text-sm font-semibold text-foreground">
              {formatCurrency(item.value)}
            </span>
          </button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/lancamentos?status=a_vencer')}
      >
        Ver todos os lançamentos →
      </Button>
    </SectionCard>
  );
}
