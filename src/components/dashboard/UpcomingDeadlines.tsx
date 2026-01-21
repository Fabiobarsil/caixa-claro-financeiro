import { CalendarCheck, Smile } from 'lucide-react';
import SectionCard from './SectionCard';
import { DashboardEntry } from '@/hooks/useDashboard';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UpcomingDeadlinesProps {
  entries: DashboardEntry[];
}

export default function UpcomingDeadlines({ entries }: UpcomingDeadlinesProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter entries due within 7 days
  const upcomingEntries = entries
    .filter(e => {
      if (e.status !== 'pendente' || !e.due_date) return false;
      const dueDate = parseISO(e.due_date);
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil >= 0 && daysUntil <= 7;
    })
    .sort((a, b) => {
      const dateA = parseISO(a.due_date!);
      const dateB = parseISO(b.due_date!);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  return (
    <SectionCard title="Próximos Prazos" subtitle="Próximos 7 dias">
      {upcomingEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
            <Smile className="h-6 w-6 text-success" />
          </div>
          <p className="text-sm font-medium text-foreground">Sem prazos para esta semana</p>
          <p className="text-xs text-muted-foreground mt-1">Você está em dia!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingEntries.map((entry) => {
            const dueDate = parseISO(entry.due_date!);
            const daysUntil = differenceInDays(dueDate, today);
            
            return (
              <div 
                key={entry.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl',
                  daysUntil === 0 ? 'bg-warning/10' : 'bg-secondary'
                )}
              >
                <CalendarCheck 
                  size={18} 
                  className={daysUntil === 0 ? 'text-warning' : 'text-muted-foreground'} 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.client_name || 'Cliente'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
                    {daysUntil === 0 && ' — Hoje'}
                    {daysUntil === 1 && ' — Amanhã'}
                    {daysUntil > 1 && ` — em ${daysUntil} dias`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  R$ {entry.value.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
