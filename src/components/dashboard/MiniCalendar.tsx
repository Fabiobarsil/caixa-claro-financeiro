import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SectionCard from './SectionCard';
import { cn } from '@/lib/utils';

interface MiniCalendarProps {
  highlightDates?: string[];
  onDateClick?: (date: Date) => void;
}

export default function MiniCalendar({ highlightDates = [], onDateClick }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const highlightSet = new Set(highlightDates);

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const dayStr = format(day, 'yyyy-MM-dd');
      const isHighlighted = highlightSet.has(dayStr);
      const isToday = isSameDay(day, today);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const currentDay = day;

      days.push(
        <button
          key={dayStr}
          onClick={() => onDateClick?.(currentDay)}
          className={cn(
            'w-8 h-8 text-xs rounded-full transition-all',
            isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50',
            isToday && 'bg-primary text-primary-foreground font-semibold',
            isHighlighted && !isToday && 'bg-warning/20 text-warning font-medium',
            !isToday && !isHighlighted && 'hover:bg-secondary'
          )}
        >
          {format(day, 'd')}
        </button>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={day.toString()} className="grid grid-cols-7 gap-1 justify-items-center">
        {days}
      </div>
    );
    days = [];
  }

  return (
    <SectionCard 
      title="Calendário"
      action={
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 rounded hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={16} className="text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground w-24 text-center capitalize">
            {format(currentMonth, 'MMM yyyy', { locale: ptBR })}
          </span>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded hover:bg-secondary transition-colors"
          >
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 justify-items-center">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <span key={i} className="w-8 h-6 text-xs font-medium text-muted-foreground flex items-center justify-center">
              {d}
            </span>
          ))}
        </div>
        {/* Calendar days */}
        <div className="space-y-1">
          {rows}
        </div>
      </div>
    </SectionCard>
  );
}
